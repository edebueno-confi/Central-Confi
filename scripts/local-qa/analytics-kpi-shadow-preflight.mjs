import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATE_FILE = 'supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql';
const CANONICAL_CONTAINER = 'supabase_db_genius-support-os';
const SHADOW_IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.158';
const SHADOW_PREFIX = 'confione_shadow_kpi_contract_20260824_';
export const SHADOW_BOOTSTRAP_MARKER = 'PostgreSQL init process complete; ready for start up.';

export const KPI_SHADOW_MANIFEST = Object.freeze({
  task: 'ANALYTICS-KPI-CONTRACT-SHADOW-PREFLIGHT-2026-08-24',
  candidate: CANDIDATE_FILE,
  shadow: Object.freeze({
    disposable: true,
    namespacePrefix: SHADOW_PREFIX,
    image: SHADOW_IMAGE,
    canonicalContainer: CANONICAL_CONTAINER,
    copiesCanonicalData: false,
    readiness: Object.freeze({
      requiresBootstrapMarker: SHADOW_BOOTSTRAP_MARKER,
      requiresRunningContainer: true,
      requiresPostgresProbe: true,
    }),
  }),
  prohibited: Object.freeze([
    `docker exec ${CANONICAL_CONTAINER}`,
    'supabase db reset --local',
    'supabase migration up --local',
    'supabase db push --local',
    'git reset',
    'git clean',
  ]),
});

function count(source, pattern) {
  return (String(source).match(pattern) ?? []).length;
}

export function auditCandidate(source) {
  const text = String(source);
  const required = [
    'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])',
    'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])',
    'public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)',
    'public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)',
  ];
  const markers = {
    commercialOperationPredicate: text.includes("app_private.analytics_pipeline_operation_eligible(\n        'deal'")
      && text.includes("'commercial'\n      )"),
    supportOperationPredicate: text.includes("app_private.analytics_pipeline_operation_eligible(\n        'ticket'")
      && text.includes("'support'\n      )"),
    groupContext: text.includes("current_setting('app.analytics_group_company', true)"),
    stageFilter: count(text, /p_stage_id is null/g) >= 2,
    exclusionFilter: count(text, /pipeline_id = any\(p_excluded_pipeline_ids\)/g) >= 2,
    secureFunctions: count(text, /security definer/g) >= 4 && count(text, /set search_path = ''/g) >= 4,
    authenticatedGrants: count(text, /grant execute on function [^;]+ to authenticated, service_role/g) >= 4,
    reloadSchema: text.includes("notify pgrst, 'reload schema'"),
  };
  const signatures = Object.fromEntries(required.map((identity) => [identity, text.includes(identity.replaceAll(',', ', ')) || text.includes(identity)]));
  const staticOk = Object.values(markers).every(Boolean) && Object.values(signatures).every(Boolean);
  return {
    staticOk,
    candidate: CANDIDATE_FILE,
    sha256: createHash('sha256').update(text).digest('hex'),
    signatures,
    markers,
    customerSuccess: { state: 'NOT_IN_CANDIDATE', reason: 'a migration não altera a RPC de Customer Success' },
    finance: { state: 'NOT_IN_CANDIDATE', reason: 'a migration não cria dimensão operacional para Financeiro' },
  };
}

export function auditConsumers(root = ROOT) {
  const api = readFileSync(join(root, 'apps/web/src/features/analytics/analytics-api.ts'), 'utf8');
  const overview = readFileSync(join(root, 'apps/web/src/features/analytics/AnalyticsCeoPage.tsx'), 'utf8');
  return {
    commercialAndSupportApiSendOperation: count(api, /p_group_company: groupCompany/g) >= 4,
    commercialAndSupportApiSendStage: count(api, /p_stage_id: filters\.stageId \|\| null/g) >= 2,
    commercialAndSupportApiSendExclusions: count(api, /p_excluded_pipeline_ids: excludedPipelineIds/g) >= 4,
    overviewCallsShareOperationAndExclusions: overview.includes('getCommercialKpisV2ForOverview(stableFilters, groupCompany, commercialExcludedPipelineIds)')
      && overview.includes('getSupportKpisV2ForOverview(stableFilters, groupCompany, supportExcludedPipelineIds)'),
    financeOperationUnavailable: overview.includes('financeUnavailable={omieUnavailable || Boolean(groupCompany)}'),
    customerSuccessContractRemainsDistinct: api.includes('getCustomerSuccessKpisV2(groupCompany')
      && !api.includes('getCustomerSuccessKpisV2(filters, groupCompany, excludedPipelineIds'),
  };
}

function runDocker(args, input = '') {
  const result = spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').replace(/POSTGRES_PASSWORD=[^\s]+/g, 'POSTGRES_PASSWORD=[REDACTED]').trim();
    const spawnError = result.error instanceof Error ? ` spawn=${result.error.message}` : '';
    const status = result.status === null ? 'null' : String(result.status);
    const sanitizedDetail = (detail || 'sem saída').slice(0, 500);
    throw new Error(`DOCKER_FAILED:status=${status}:${sanitizedDetail}${spawnError}`);
  }
  return String(result.stdout || '').trim();
}

function psql(container, sql) {
  return runDocker([
    'exec', '-i', container, 'psql', '-At', '-X', '-q',
    '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
  ], `${String(sql).trim()}\n`);
}

function waitForPostgres(container) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const probe = spawnSync('docker', [
      'exec', container, 'psql', '-At', '-X', '-q', '-U', 'postgres', '-d', 'postgres', '-c', 'select 1',
    ], { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0 && probe.stdout.trim() === '1') return;
    const until = Date.now() + 500;
    while (Date.now() < until) {}
  }
  throw new Error('SHADOW_DATABASE_NOT_READY');
}

export function classifyShadowBootstrap({ containerStatus, logs, postgresReady }) {
  const status = String(containerStatus ?? '').trim();
  const markerSeen = String(logs ?? '').includes(SHADOW_BOOTSTRAP_MARKER);
  if (status !== 'running') {
    return { ready: false, reason: 'SHADOW_CONTAINER_NOT_RUNNING', markerSeen, postgresReady: Boolean(postgresReady) };
  }
  if (!markerSeen) {
    return { ready: false, reason: 'SHADOW_BOOTSTRAP_INCOMPLETE', markerSeen, postgresReady: Boolean(postgresReady) };
  }
  if (!postgresReady) {
    return { ready: false, reason: 'SHADOW_DATABASE_NOT_READY', markerSeen, postgresReady: false };
  }
  return { ready: true, reason: null, markerSeen: true, postgresReady: true };
}

function readShadowContainerStatus(container) {
  const state = spawnSync('docker', [
    'inspect', '--format', '{{.State.Status}}|{{.State.ExitCode}}|{{.State.Error}}', container,
  ], { encoding: 'utf8', windowsHide: true });
  if (state.status !== 0) {
    const detail = String(state.stderr || state.stdout || '').replace(/POSTGRES_PASSWORD=[^\s]+/g, 'POSTGRES_PASSWORD=[REDACTED]').trim();
    throw new Error(`SHADOW_CONTAINER_INSPECT_FAILED:${detail.slice(0, 300) || 'sem saída'}`);
  }
  return state.stdout.trim();
}

function readShadowContainerLogs(container) {
  const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (logs.status !== 0) {
    const detail = String(logs.stderr || logs.stdout || '').replace(/POSTGRES_PASSWORD=[^\s]+/g, 'POSTGRES_PASSWORD=[REDACTED]').trim();
    throw new Error(`SHADOW_LOGS_UNAVAILABLE:${detail.slice(0, 300) || 'sem saída'}`);
  }
  return String(logs.stdout || '') + String(logs.stderr || '');
}

export function waitForShadowBootstrap(container) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = readShadowContainerStatus(container);
    const [containerStatus] = state.split('|');
    if (containerStatus !== 'running') {
      throw new Error(`SHADOW_BOOTSTRAP_NOT_RUNNING:${state}`);
    }
    const logs = readShadowContainerLogs(container);
    const markerSeen = logs.includes(SHADOW_BOOTSTRAP_MARKER);
    if (markerSeen) {
      waitForPostgres(container);
      return { ready: true, attempts: attempt + 1, markerSeen: true, postgresReady: true };
    }
    const until = Date.now() + 500;
    while (Date.now() < until) {}
  }
  throw new Error('SHADOW_BOOTSTRAP_NOT_COMPLETE');
}

export function verifyShadowIdentity(container) {
  return Boolean(
    container
      && container.startsWith(SHADOW_PREFIX)
      && container !== CANONICAL_CONTAINER
      && !container.includes('genius-support-os'),
  );
}

export const SHADOW_INIT_SQL = `
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
do $$ begin create role analytics_owner nologin nosuperuser nocreatedb nocreaterole noinherit; exception when duplicate_object then null; end $$;
grant analytics_owner to postgres;
create schema app_private;
alter schema app_private owner to analytics_owner;
create table public.analytics_source_config(
  tenant_id text not null, object_type text not null, hubspot_pipeline_id text not null,
  group_company text, label text, hubspot_pipeline_label text,
  is_active boolean not null default true, is_archived boolean not null default false
);
create table public.analytics_kpi_settings(
  id boolean primary key default true, calculation_version text, backlog_aging_hours integer[]
);
create table public.analytics_kpi_daily_snapshot(metric_key text, snapshot_date date);
create table public.hubspot_owners(owner_id text primary key, full_name text);
create table public.hubspot_pipeline_stages(
  tenant_id text not null, object_type text not null, pipeline_id text not null,
  stage_id text not null, label text, display_order integer, metadata jsonb default '{}'::jsonb,
  is_won boolean not null default false, is_closed boolean not null default false
);
create table public.hubspot_deals(
  tenant_id text not null, deal_id text primary key, owner_id text, amount_home numeric(14,2),
  hs_created_at timestamptz, hs_closed_at timestamptz, pipeline_id text not null,
  dealstage text not null, synced_at timestamptz
);
create table public.hubspot_tickets(
  tenant_id text not null, ticket_id text primary key, pipeline_id text not null,
  pipeline_stage text, owner_id text, source_type text, priority text,
  hs_created_at timestamptz, hs_closed_at timestamptz,
  time_to_first_response_sla_status text, time_to_close_sla_status text,
  metadata jsonb default '{}'::jsonb, synced_at timestamptz
);
create table app_private.analytics_memberships(tenant_id text not null, user_id text not null, active boolean default true);
alter table public.analytics_source_config enable row level security;
alter table public.analytics_kpi_settings enable row level security;
alter table public.analytics_kpi_daily_snapshot enable row level security;
alter table public.hubspot_owners enable row level security;
alter table public.hubspot_pipeline_stages enable row level security;
alter table public.hubspot_deals enable row level security;
alter table public.hubspot_tickets enable row level security;
alter table app_private.analytics_memberships enable row level security;
create policy shadow_source_read on public.analytics_source_config for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_settings_read on public.analytics_kpi_settings for select to authenticated, analytics_owner using (true);
create policy shadow_snapshot_read on public.analytics_kpi_daily_snapshot for select to authenticated, analytics_owner using (true);
create policy shadow_owners_read on public.hubspot_owners for select to authenticated, analytics_owner using (true);
create policy shadow_stages_read on public.hubspot_pipeline_stages for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_deals_read on public.hubspot_deals for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_tickets_read on public.hubspot_tickets for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_membership_read on app_private.analytics_memberships for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
grant usage on schema public, app_private to authenticated, analytics_owner;
grant select on all tables in schema public to authenticated, analytics_owner;
grant select on app_private.analytics_memberships to authenticated, analytics_owner;
create or replace function app_private.can_read_analytics()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from app_private.analytics_memberships m
    where m.tenant_id = current_setting('request.jwt.claim.tenant_id', true)
      and m.user_id = current_setting('request.jwt.claim.sub', true) and m.active);
$$;
create or replace function app_private.kpi_ratio(p_num numeric, p_den numeric)
returns numeric language sql immutable set search_path = '' as $$ select case when p_den is null or p_den = 0 then null else round((p_num / p_den)::numeric, 4) end; $$;
create or replace function app_private.kpi_entry(p_value numeric, p_basis text, p_state text default 'available', p_reason text default null)
returns jsonb language sql immutable set search_path = '' as $$ select jsonb_build_object('value', p_value, 'basis', p_basis, 'state', p_state, 'reason', p_reason); $$;
create or replace function app_private.analytics_pipeline_operation_eligible(p_object_type text, p_pipeline_id text, p_group_company text, p_area text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.analytics_source_config c
    where c.object_type = p_object_type and c.hubspot_pipeline_id = p_pipeline_id
      and c.is_active and not coalesce(c.is_archived, false)
      and (nullif(p_group_company, '') is null or c.group_company = p_group_company));
$$;
create or replace function app_private.set_analytics_operation_scope(p_group_company text)
returns void language plpgsql security definer set search_path = '' as $$
begin perform set_config('app.analytics_group_company', coalesce(p_group_company, ''), true); end;
$$;
alter function app_private.can_read_analytics() owner to analytics_owner;
alter function app_private.kpi_ratio(numeric,numeric) owner to analytics_owner;
alter function app_private.kpi_entry(numeric,text,text,text) owner to analytics_owner;
alter function app_private.analytics_pipeline_operation_eligible(text,text,text,text) owner to analytics_owner;
alter function app_private.set_analytics_operation_scope(text) owner to analytics_owner;
grant execute on function app_private.can_read_analytics() to authenticated, analytics_owner;
grant execute on function app_private.kpi_ratio(numeric,numeric) to authenticated, analytics_owner;
grant execute on function app_private.kpi_entry(numeric,text,text,text) to authenticated, analytics_owner;
grant execute on function app_private.analytics_pipeline_operation_eligible(text,text,text,text) to authenticated, analytics_owner;
grant execute on function app_private.set_analytics_operation_scope(text) to authenticated, analytics_owner;
insert into app_private.analytics_memberships values ('tenant-a','user-a',true),('tenant-b','user-b',true);
insert into public.analytics_kpi_settings values (true,'kpi_shadow_v1',array[4,24,72,168]);
insert into public.analytics_kpi_daily_snapshot values ('support_backlog_open',date '2026-08-01');
insert into public.hubspot_owners values ('owner-a','Owner A');
insert into public.analytics_source_config(tenant_id,object_type,hubspot_pipeline_id,group_company,label,hubspot_pipeline_label) values
 ('tenant-a','deal','deal-commercial-keep','commercial','Commercial Keep','Commercial Keep'),
 ('tenant-a','deal','deal-commercial-drop','commercial','Commercial Drop','Commercial Drop'),
 ('tenant-a','ticket','ticket-support-keep','support','Support Keep','Support Keep'),
 ('tenant-a','ticket','ticket-support-drop','support','Support Drop','Support Drop'),
 ('tenant-a','ticket','ticket-other','other','Other','Other');
insert into public.hubspot_pipeline_stages(tenant_id,object_type,pipeline_id,stage_id,label,display_order,metadata,is_won,is_closed) values
 ('tenant-a','deal','deal-commercial-keep','open','Open',1,'{"probability":"0.5"}',false,false),
 ('tenant-a','deal','deal-commercial-drop','open','Open',1,'{"probability":"0.5"}',false,false),
 ('tenant-a','ticket','ticket-support-keep','open','Open',1,'{"ticketState":"OPEN"}',false,false),
 ('tenant-a','ticket','ticket-support-drop','open','Open',1,'{"ticketState":"OPEN"}',false,false),
 ('tenant-a','ticket','ticket-other','open','Open',1,'{"ticketState":"OPEN"}',false,false);
insert into public.hubspot_deals(tenant_id,deal_id,owner_id,amount_home,hs_created_at,pipeline_id,dealstage) values
 ('tenant-a','deal-keep','owner-a',100,date '2026-08-01','deal-commercial-keep','open'),
 ('tenant-a','deal-drop','owner-a',200,date '2026-08-01','deal-commercial-drop','open');
insert into public.hubspot_tickets(tenant_id,ticket_id,pipeline_id,pipeline_stage,owner_id,source_type,priority,hs_created_at,metadata) values
 ('tenant-a','ticket-keep','ticket-support-keep','open','owner-a','email','high',date '2026-08-01','{"ticketState":"OPEN"}'),
 ('tenant-a','ticket-drop','ticket-support-drop','open','owner-a','email','high',date '2026-08-01','{"ticketState":"OPEN"}'),
 ('tenant-a','ticket-other-row','ticket-other','open','owner-a','email','high',date '2026-08-01','{"ticketState":"OPEN"}');
`;

const SHADOW_FIXTURE_SQL = `
set role postgres;
insert into public.analytics_source_config(tenant_id,object_type,hubspot_pipeline_id,group_company,is_active,is_archived)
values ('tenant-a','deal','deal-archived','commercial',false,false);
`;

function readCallJson(output) {
  const lines = String(output).split(/\r?\n/).filter(Boolean);
  return lines.length ? JSON.parse(lines.at(-1)) : null;
}

function checkShadowContracts(container) {
  const catalog = readCallJson(psql(container, `
select json_build_object(
  'commercial', to_regprocedure('public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)') is not null,
  'support', to_regprocedure('public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)') is not null,
  'filteredCommercial', to_regprocedure('public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])') is not null,
  'filteredSupport', to_regprocedure('public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])') is not null,
  'commercialSecurity', (select prosecdef from pg_proc where oid = to_regprocedure('public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)')),
  'supportSecurity', (select prosecdef from pg_proc where oid = to_regprocedure('public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)')),
  'commercialConfig', (select proconfig from pg_proc where oid = to_regprocedure('public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)')),
  'supportConfig', (select proconfig from pg_proc where oid = to_regprocedure('public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)')),
  'anonCommercial', has_function_privilege('anon','public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)','execute'),
  'anonSupport', has_function_privilege('anon','public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)','execute')
)`));
  const calls = readCallJson(psql(container, `
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
  const expected = calls && catalog && calls.commercialSelected === 2 && calls.commercialExcluded === 1
    && calls.supportSelected === 2 && calls.supportExcluded === 1 && calls.allCommercial === 2 && calls.allSupport === 3;
  return { catalog, calls, expected, postgrest: { state: 'NOT_PROVEN', reason: 'nenhum serviço PostgREST foi criado dentro do shadow deste lote' } };
}

export async function runShadowPreflight({ root = ROOT, image = SHADOW_IMAGE } = {}) {
  if (image !== SHADOW_IMAGE) throw new Error('SHADOW_IMAGE_INVALID');
  const candidate = readFileSync(join(root, CANDIDATE_FILE), 'utf8');
  const audit = auditCandidate(candidate);
  const name = `${SHADOW_PREFIX}${process.pid}`;
  const identity = verifyShadowIdentity(name);
  const imageAvailable = spawnSync('docker', ['image', 'inspect', image], { encoding: 'utf8', windowsHide: true }).status === 0;
  let container = null;
  const result = {
    state: 'NO_GO',
    failClosed: true,
    targetIdentity: { container: name, image, canonicalContainer: CANONICAL_CONTAINER, disposable: true, verified: identity, imageAvailable },
    staticAudit: audit,
    consumerAudit: auditConsumers(root),
    bootstrap: { state: 'NOT_RUN' },
    migration: { applied: false, result: 'NOT_RUN' },
    directSql: { state: 'NOT_RUN' },
    postgrest: { state: 'NOT_PROVEN', reason: 'nenhum PostgREST shadow foi provisionado' },
    limitations: ['RLS/cross-tenant servido', 'performance real', 'browser autenticado', 'integrações externas', 'produção'],
  };
  if (!identity) { result.reason = 'SHADOW_IDENTITY_INVALID'; return result; }
  if (!imageAvailable) { result.reason = 'SHADOW_IMAGE_NOT_AVAILABLE_NO_PULL'; return result; }
  try {
    runDocker(['run', '--detach', '--rm', '--name', name,
      '--label', 'com.confione.scope=analytics-kpi-contract-shadow',
      '--label', `com.confione.canonical-container=${CANONICAL_CONTAINER}`,
      '--env', 'POSTGRES_PASSWORD=shadow-only', image]);
    container = name;
    result.bootstrap = waitForShadowBootstrap(container);
    psql(container, SHADOW_INIT_SQL);
    psql(container, SHADOW_FIXTURE_SQL);
    result.migration = { applied: true, result: 'SHADOW_ONLY' };
    psql(container, candidate);
    result.directSql = checkShadowContracts(container);
    result.postgrest = result.directSql.postgrest;
    result.state = result.staticAudit.staticOk && result.directSql.expected && result.postgrest.state === 'PROVEN'
      ? 'SHADOW_REPLAY_GO'
      : 'NO_GO';
    result.reason = result.state === 'NO_GO' ? 'POSTGREST_RESOLUTION_NOT_PROVEN' : null;
  } catch (error) {
    result.reason = error instanceof Error ? error.message : String(error);
    result.migration = { applied: false, result: 'SHADOW_APPLY_FAILED' };
  } finally {
    if (container) {
      try { runDocker(['rm', '--force', container]); } catch { /* cleanup best effort */ }
    }
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const candidate = readFileSync(join(ROOT, CANDIDATE_FILE), 'utf8');
  const report = await runShadowPreflight();
  console.log(JSON.stringify({ ...report, generatedAt: new Date().toISOString(), candidate: auditCandidate(candidate) }, null, 2));
  process.exitCode = report.state === 'SHADOW_REPLAY_GO' ? 0 : 1;
}
