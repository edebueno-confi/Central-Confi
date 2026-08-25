import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHADOW_INIT_SQL, SHADOW_BOOTSTRAP_MARKER } from './analytics-kpi-shadow-preflight.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const HELPER_CANDIDATE = 'supabase/migrations/20260825123000_analytics_kpi_remote_prerequisites_v1.sql';
export const CONTRACT_CANDIDATE = 'supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql';
export const CANONICAL_CONTAINER = 'supabase_db_genius-support-os';
export const SHADOW_IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.158';
export const SHADOW_PREFIX = 'confione_shadow_kpi_prerequisites_20260825_';

export const SHADOW_MANIFEST = Object.freeze({
  task: 'ANALYTICS-KPI-REMOTE-PREREQUISITES-SHADOW-PREFLIGHT-2026-08-25',
  disposable: true,
  copiesCanonicalData: false,
  canonicalContainer: CANONICAL_CONTAINER,
  prohibited: Object.freeze([
    `docker exec ${CANONICAL_CONTAINER}`,
    'supabase db reset --local',
    'supabase migration up --local',
    'supabase db push --local',
  ]),
});

function runDocker(args, input = '') {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', windowsHide: true, maxBuffer: 12 * 1024 * 1024 });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').replace(/POSTGRES_PASSWORD=[^\s]+/g, 'POSTGRES_PASSWORD=[REDACTED]').trim();
    throw new Error(`DOCKER_FAILED:${String(detail || 'sem saída').slice(0, 500)}`);
  }
  return String(result.stdout || '').trim();
}

function psql(container, sql) {
  return runDocker(['exec', '-i', container, 'psql', '-At', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], `${String(sql).trim()}\n`);
}

function readJson(output) {
  const line = String(output).split(/\r?\n/).filter(Boolean).at(-1);
  return line ? JSON.parse(line) : null;
}

function waitForShadow(container) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = spawnSync('docker', ['inspect', '--format', '{{.State.Status}}', container], { encoding: 'utf8', windowsHide: true });
    const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8', windowsHide: true });
    if (state.status === 0 && state.stdout.trim() === 'running' && `${logs.stdout}\n${logs.stderr}`.includes(SHADOW_BOOTSTRAP_MARKER)) {
      const probe = spawnSync('docker', ['exec', container, 'psql', '-At', '-X', '-q', '-U', 'postgres', '-d', 'postgres', '-c', 'select 1'], { encoding: 'utf8', windowsHide: true });
      if (probe.status === 0 && probe.stdout.trim() === '1') return { ready: true, attempts: attempt + 1 };
    }
    const until = Date.now() + 500;
    while (Date.now() < until) {}
  }
  throw new Error('SHADOW_BOOTSTRAP_NOT_COMPLETE');
}

export function verifyShadowIdentity(container) {
  return Boolean(container && container.startsWith(SHADOW_PREFIX) && container !== CANONICAL_CONTAINER && !container.includes('genius-support-os'));
}

export function auditCandidates(root = ROOT) {
  const helper = readFileSync(join(root, HELPER_CANDIDATE), 'utf8');
  const contract = readFileSync(join(root, CONTRACT_CANDIDATE), 'utf8');
  const helperMarkers = {
    canReadPreflight: helper.includes("pg_get_userbyid(p.proowner) = 'postgres'") && helper.includes("search_path=\"\"") && helper.includes("has_function_privilege('service_role', p.oid, 'EXECUTE')"),
    invalidRatioNull: helper.includes('p_numerator is null') && helper.includes('p_numerator > p_denominator'),
    operationEligibility: helper.includes("group_company_source = 'confirmed'") && helper.includes("a.area_key <> 'a_classificar'"),
    noClientGrants: (helper.match(/revoke all on function/g) ?? []).length >= 4,
  };
  const contractMarkers = {
    operationWrappers: contract.includes('p_group_company text') && contract.includes("perform app_private.set_analytics_operation_scope(p_group_company)"),
    helperCalls: contract.includes('app_private.kpi_entry') && contract.includes('app_private.kpi_ratio') && contract.includes('app_private.analytics_pipeline_operation_eligible'),
    reloadSchema: contract.includes("notify pgrst, 'reload schema'") || contract.includes('notify pgrst'),
  };
  return {
    helperSha256: createHash('sha256').update(helper).digest('hex'),
    contractSha256: createHash('sha256').update(contract).digest('hex'),
    helperMarkers,
    contractMarkers,
    staticOk: Object.values(helperMarkers).every(Boolean) && Object.values(contractMarkers).every(Boolean),
  };
}

const SHADOW_PREPARE_SQL = `
alter table public.analytics_source_config add column if not exists area_key text;
alter table public.analytics_source_config add column if not exists group_company_source text;
update public.analytics_source_config
set area_key = case when object_type = 'deal' then 'commercial' when object_type = 'ticket' then 'support' else 'other' end,
    group_company_source = 'confirmed';
create or replace function app_private.can_read_analytics()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.analytics_memberships m
    where m.tenant_id = current_setting('request.jwt.claim.tenant_id', true)
      and m.user_id = current_setting('request.jwt.claim.sub', true)
      and m.active
  );
$$;
alter function app_private.can_read_analytics() owner to postgres;
revoke all on function app_private.can_read_analytics() from public, anon, authenticated, service_role;
grant execute on function app_private.can_read_analytics() to authenticated, service_role;
drop function if exists app_private.kpi_entry(numeric,text,text,text);
drop function if exists app_private.kpi_ratio(numeric,numeric);
drop function if exists app_private.set_analytics_operation_scope(text);
drop function if exists app_private.analytics_pipeline_operation_eligible(text,text,text,text);
`;

function shadowProbe(container) {
  const catalog = readJson(psql(container, `
select json_build_object(
  'kpiEntry', to_regprocedure('app_private.kpi_entry(numeric,text,text,text)') is not null,
  'kpiRatio', to_regprocedure('app_private.kpi_ratio(numeric,numeric)') is not null,
  'operationEligible', to_regprocedure('app_private.analytics_pipeline_operation_eligible(text,text,text,text)') is not null,
  'setScope', to_regprocedure('app_private.set_analytics_operation_scope(text)') is not null,
  'commercial', to_regprocedure('public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)') is not null,
  'support', to_regprocedure('public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)') is not null,
  'anonCommercial', has_function_privilege('anon','public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)','execute'),
  'anonSupport', has_function_privilege('anon','public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)','execute'),
  'helperAnon', has_function_privilege('anon','app_private.kpi_ratio(numeric,numeric)','execute')
)`));
  const semantics = readJson(psql(container, `
select json_build_object(
  'ratioValid', app_private.kpi_ratio(1, 4),
  'ratioNullNumerator', app_private.kpi_ratio(null, 4),
  'ratioInvalidUniverse', app_private.kpi_ratio(5, 4),
  'entryUnavailable', app_private.kpi_entry(null, 'test')
)`));
  const calls = readJson(psql(container, `
begin;
set role authenticated;
select set_config('request.jwt.claim.tenant_id','tenant-a',true);
select set_config('request.jwt.claim.sub','user-a',true);
select json_build_object(
  'commercialSelected', (public.rpc_analytics_commercial_kpis_by_operation(date '2026-08-01',date '2026-08-31',null,'open',array[]::text[],'commercial')->'kpis'->'open_deals'->>'value')::numeric,
  'commercialExcluded', (public.rpc_analytics_commercial_kpis_by_operation(date '2026-08-01',date '2026-08-31',null,'open',array['deal-commercial-keep']::text[],'commercial')->'kpis'->'open_deals'->>'value')::numeric,
  'supportSelected', (public.rpc_analytics_support_kpis_by_operation(date '2026-08-01',date '2026-08-31','open','high',array[]::text[],'support')->'kpis'->'open_backlog'->>'value')::numeric,
  'supportExcluded', (public.rpc_analytics_support_kpis_by_operation(date '2026-08-01',date '2026-08-31','open','high',array['ticket-support-keep']::text[],'support')->'kpis'->'open_backlog'->>'value')::numeric,
  'allCommercial', (public.rpc_analytics_commercial_kpis_by_operation(date '2026-08-01',date '2026-08-31',null,'open',array[]::text[],null)->'kpis'->'open_deals'->>'value')::numeric,
  'allSupport', (public.rpc_analytics_support_kpis_by_operation(date '2026-08-01',date '2026-08-31','open','high',array[]::text[],null)->'kpis'->'open_backlog'->>'value')::numeric
);
rollback;`));
  const expected = Boolean(catalog && semantics && calls
    && catalog.kpiEntry && catalog.kpiRatio && catalog.operationEligible && catalog.setScope
    && catalog.commercial && catalog.support && !catalog.anonCommercial && !catalog.anonSupport && !catalog.helperAnon
    && semantics.ratioValid === 25 && semantics.ratioNullNumerator === null && semantics.ratioInvalidUniverse === null
    && semantics.entryUnavailable?.state === 'unavailable'
    && calls.commercialSelected === 2 && calls.commercialExcluded === 1
    && calls.supportSelected === 2 && calls.supportExcluded === 1
    && calls.allCommercial === 2 && calls.allSupport === 3);
  return { catalog, semantics, calls, expected, postgrest: { state: 'NOT_PROVEN', reason: 'shadow não provisiona PostgREST' } };
}

export async function runShadowPreflight({ root = ROOT, image = SHADOW_IMAGE } = {}) {
  const audit = auditCandidates(root);
  const name = `${SHADOW_PREFIX}${process.pid}`;
  const result = { state: 'NO_GO', failClosed: true, target: { container: name, image, canonicalContainer: CANONICAL_CONTAINER, verified: verifyShadowIdentity(name), disposable: true }, staticAudit: audit, bootstrap: { state: 'NOT_RUN' }, migrations: [], directSql: { state: 'NOT_RUN' }, postgrest: { state: 'NOT_PROVEN' } };
  if (!result.target.verified) { result.reason = 'SHADOW_IDENTITY_INVALID'; return result; }
  if (spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8', windowsHide: true }).status !== 0) { result.reason = 'SHADOW_IMAGE_NOT_AVAILABLE_NO_PULL'; return result; }
  let container = null;
  try {
    runDocker(['run', '--detach', '--rm', '--name', name, '--label', 'com.confione.scope=analytics-kpi-prerequisites-shadow', '--label', `com.confione.canonical-container=${CANONICAL_CONTAINER}`, '--env', 'POSTGRES_PASSWORD=shadow-only', image]);
    container = name;
    result.bootstrap = await waitForShadow(container);
    psql(container, SHADOW_INIT_SQL);
    psql(container, SHADOW_PREPARE_SQL);
    psql(container, readFileSync(join(root, HELPER_CANDIDATE), 'utf8'));
    result.migrations.push({ file: HELPER_CANDIDATE, result: 'SHADOW_ONLY' });
    psql(container, readFileSync(join(root, CONTRACT_CANDIDATE), 'utf8'));
    result.migrations.push({ file: CONTRACT_CANDIDATE, result: 'SHADOW_ONLY' });
    result.directSql = shadowProbe(container);
    result.state = result.staticAudit.staticOk && result.directSql.expected ? 'SHADOW_REPLAY_GO' : 'NO_GO';
    result.reason = result.state === 'NO_GO' ? 'SHADOW_CONTRACT_PROBE_FAILED' : null;
  } catch (error) {
    result.reason = error instanceof Error ? error.message : String(error);
    result.migrations.push({ result: 'SHADOW_APPLY_FAILED' });
  } finally {
    if (container) { try { runDocker(['rm', '--force', container]); } catch { /* cleanup best effort */ } }
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const report = await runShadowPreflight();
  console.log(JSON.stringify({ ...report, generatedAt: new Date().toISOString() }, null, 2));
  process.exitCode = report.state === 'SHADOW_REPLAY_GO' ? 0 : 1;
}
