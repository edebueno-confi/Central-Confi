export const LEGACY_FUNCTIONS = Object.freeze([
  'public.rpc_analytics_commercial_kpis_v2(date,date,text,text)',
  'public.rpc_analytics_support_kpis_v2(date,date,text,text)',
]);

export const TARGET_FUNCTIONS = Object.freeze([
  'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])',
  'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])',
  'public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)',
  'public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)',
]);

const ALL_FUNCTIONS = [...LEGACY_FUNCTIONS, ...TARGET_FUNCTIONS];

/**
 * Consulta read-only para executar imediatamente antes da migration remota.
 * A ferramenta MCP deve receber o texto inteiro e considerar qualquer estado
 * divergente como NO_GO antes de chamar apply_migration.
 */
export function buildImmediateContractPreflightQuery() {
  const values = ALL_FUNCTIONS
    .map((signature) => `('${signature}', '${LEGACY_FUNCTIONS.includes(signature) ? 'legacy' : 'target'}')`)
    .join(',\n    ');

  return `with expected(signature, kind) as (values\n    ${values}\n  ), catalog as (\n    select\n      e.signature,\n      e.kind,\n      p.oid,\n      r.rolname as owner,\n      coalesce(p.prosecdef, false) as security_definer,\n      coalesce((select value from unnest(coalesce(p.proconfig, '{}'::text[])) as config(value) where value like 'search_path=%' limit 1), '') as search_path,\n      case when p.oid is null then null else md5(pg_get_functiondef(p.oid)) end as definition_fingerprint,\n      case when p.oid is null then false else has_function_privilege('anon', p.oid, 'execute') end as anon_execute,\n      case when p.oid is null then false else has_function_privilege('authenticated', p.oid, 'execute') end as authenticated_execute,\n      case when p.oid is null then false else has_function_privilege('service_role', p.oid, 'execute') end as service_role_execute\n    from expected e\n    left join pg_proc p on p.oid = to_regprocedure(e.signature)\n    left join pg_roles r on r.oid = p.proowner\n  )\nselect jsonb_build_object(\n  'functions', coalesce((select jsonb_agg(to_jsonb(c) order by c.kind, c.signature) from catalog c), '[]'::jsonb),\n  'legacy_present', (select count(*) from catalog where kind = 'legacy' and oid is not null),\n  'target_present', (select count(*) from catalog where kind = 'target' and oid is not null),\n  'legacy_expected', ${LEGACY_FUNCTIONS.length},\n  'target_expected', ${TARGET_FUNCTIONS.length},\n  'legacy_security_ok', not exists (select 1 from catalog where kind = 'legacy' and (oid is null or owner <> 'postgres' or not security_definer or search_path <> 'search_path=""' or definition_fingerprint is null or anon_execute or not authenticated_execute or not service_role_execute)),\n  'targets_absent', not exists (select 1 from catalog where kind = 'target' and oid is not null)\n) as immediate_preflight;`;
}

export function evaluateImmediateContractPreflight(result) {
  const value = result?.immediate_preflight ?? result ?? {};
  const rows = Array.isArray(value.functions) ? value.functions : [];
  const bySignature = new Map(rows.map((row) => [row?.signature, row]));
  const legacyRows = LEGACY_FUNCTIONS.map((signature) => bySignature.get(signature));
  const targetRows = TARGET_FUNCTIONS.map((signature) => bySignature.get(signature));
  const legacyPresent = legacyRows.every((row) => row?.oid !== null && row?.oid !== undefined);
  const targetsAbsent = targetRows.every((row) => row?.oid === null || row?.oid === undefined);
  const securityOk = legacyRows.every((row) => (
    row?.owner === 'postgres'
    && row?.security_definer === true
    && row?.search_path === 'search_path=""'
    && typeof row?.definition_fingerprint === 'string'
    && row.definition_fingerprint.length > 0
    && row?.anon_execute === false
    && row?.authenticated_execute === true
    && row?.service_role_execute === true
  ));
  const state = legacyPresent && targetsAbsent && securityOk ? 'GO' : 'NO_GO';
  return {
    state,
    failClosed: state !== 'GO',
    legacyPresent,
    targetsAbsent,
    securityOk,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  process.stdout.write(`${buildImmediateContractPreflightQuery()}\n`);
}
