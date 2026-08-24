import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessOptimizedCandidate,
  assessCrossTenantEvidence,
  applyTimeseriesTransform,
  applyUtf8Transform,
  buildSyntheticFixtureSql,
  buildShadowInitSql,
  compareBenchmarkStages,
  diffCatalog,
  evaluateCatalogAllowlist,
  extractFunctionIdentity,
  evaluateGlobalPreflightDecision,
  HISTORICAL_MIGRATION_GATE,
  loadCanonicalTimeseriesDefinition,
  loadRemediationMigration,
  maskSqlLiterals,
  preflightMigration,
  readBenchmarkConfig,
  runPreflight,
  SEMANTIC_MIGRATION_MANIFEST,
  validateDependencies,
} from '../../scripts/local-qa/semantic-migration-preflight.mjs';

const UTF8 = SEMANTIC_MIGRATION_MANIFEST.migrations['20260822220000'];
const OPERATION_SCOPE = SEMANTIC_MIGRATION_MANIFEST.migrations['20260821090000'];
const TIMESERIES = SEMANTIC_MIGRATION_MANIFEST.migrations['20260823100000'];
const REMEDIATION = SEMANTIC_MIGRATION_MANIFEST.migrations['20260824190000'];

function utf8Definition(target, body = "select jsonb_build_object('owner','Sem responsÃ¡vel','fallback','Sem responsavel')") {
  return `create or replace function ${target.qualifiedName}(${target.signature})
returns jsonb language sql security definer set search_path = '' as $$ ${body}; $$;`;
}

function timeseriesDefinition() {
  return `create or replace function public.rpc_analytics_timeseries(p_domain text, p_from date, p_to date, p_grain text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_contract jsonb;
begin
  perform 1 from public.hubspot_tickets t join public.analytics_source_config c
    on c.object_type = 'ticket' and c.hubspot_pipeline_id = t.pipeline_id;
  perform 1 from public.hubspot_deals d join public.analytics_source_config c
    on c.object_type = 'deal' and c.hubspot_pipeline_id = d.pipeline_id;
  return jsonb_build_object('series', '[]'::jsonb, 'cohorts', '[]'::jsonb, 'unavailable_reason', null);
end; $$;`;
}

test('replace de literais UTF-8 ocorre nas três RPCs e preserva o restante', () => {
  for (const target of UTF8.targets) {
    const source = utf8Definition(target);
    const result = applyUtf8Transform(source, target, UTF8.transformations);
    assert.equal(result.ok, true);
    assert.equal(result.replacements[0].count, 1);
    assert.equal(result.replacements[1].count, 1);
    assert.match(result.transformed, /Sem responsável/g);
    assert.doesNotMatch(result.transformed, /Sem responsÃ¡vel|Sem responsavel/);
    assert.match(result.transformed, /security definer set search_path = ''/);
  }
});

test('timeseries insere predicados ticket/deal e preserva o restante', () => {
  const source = timeseriesDefinition();
  const result = applyTimeseriesTransform(source);
  assert.equal(result.ok, true);
  assert.equal(result.anchors.length, 2);
  assert.match(result.transformed, /t\.pipeline_id <> all\(string_to_array/);
  assert.match(result.transformed, /d\.pipeline_id <> all\(string_to_array/);
  assert.match(result.transformed, /return jsonb_build_object\('series'/);
  assert.equal((result.transformed.match(/current_setting\('app\.analytics_excluded_pipeline_ids'/g) ?? []).length, 4);
});

test('migration candidata real declara guardas de escopo e preserva o contrato de segurança', () => {
  const migration = loadRemediationMigration();
  const result = preflightMigration({ version: '20260824190000', source: migration });
  assert.equal(result.state, 'PREFLIGHT_READY_FOR_SHADOW');
  assert.match(migration, /pg_get_functiondef\(/);
  assert.match(migration, /v_group_count <> 2/);
  assert.match(migration, /v_ticket_exclusion_count <> 1 or v_deal_exclusion_count <> 1/);
  assert.match(migration, /v_declare_count <> 1 or v_begin_count <> 1/);
  assert.match(migration, /with scope as \(/);
  assert.match(migration, /cross join scope scope_config/);
  assert.match(migration, /scope_config\.group_company is null or c\.group_company = scope_config\.group_company/);
  assert.match(migration, /scope_config\.excluded_pipeline_ids is null or %s\.pipeline_id <> all\(scope_config\.excluded_pipeline_ids\)/);
  assert.match(migration, /position\('search_path' in lower\(v_definition\)/);
  assert.match(migration, /revoke all on function public\.rpc_analytics_timeseries/);
  assert.match(migration, /grant execute on function public\.rpc_analytics_timeseries/);
  assert.doesNotMatch(migration, /create table|drop table|truncate|delete from/i);
});

test('migration candidata usa a definição real e não inventa um contrato reduzido', () => {
  const canonical = loadCanonicalTimeseriesDefinition();
  const candidateMigration = loadRemediationMigration();
  for (const marker of ['domain', 'support', 'commercial', 'finance', 'legend', 'cumulative_balance', 'history_insufficient', 'app_private.can_read_analytics']) {
    assert.ok(canonical.includes(marker), `marker ausente na definição canônica: ${marker}`);
  }
  assert.doesNotMatch(candidateMigration, /ticket_count|deal_count/);
  assert.match(candidateMigration, /pg_get_functiondef\(v_signature\)/);
  assert.notEqual(candidateMigration, canonical);
});

test('diff de catálogo conserva campos de função, RLS e policy', () => {
  const before = {
    functions: [{ identity: 'public.rpc(p_id uuid)', definition: 'before', acl: '{authenticated=X}', security_definer: true, config: '{search_path=}', anon_execute: false, authenticated_execute: true, service_role_execute: true }],
    function_security: [{ identity: 'public.rpc(p_id uuid)', owner: 'analytics_owner', acl: '{authenticated=X}', security_definer: true, config: '{search_path=}', anon_execute: false, authenticated_execute: true, service_role_execute: true }],
    rls: [{ table: 'public.source', rowsecurity: true, forcerowsecurity: false }],
    policies: [{ table: 'public.source', policy: 'tenant_read', permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: '(tenant_id = current_setting(\'app.tenant\'))', with_check: null }],
  };
  const after = {
    functions: [{ ...before.functions[0], definition: 'after', acl: '{authenticated=X,service_role=X}', config: '{search_path=public}', authenticated_execute: true }],
    function_security: [{ ...before.function_security[0], acl: '{authenticated=X,service_role=X}', config: '{search_path=public}' }],
    rls: [{ ...before.rls[0], forcerowsecurity: true }],
    policies: [{ ...before.policies[0], qual: '(tenant_id = current_setting(\'app.other_tenant\'))' }],
  };
  const changes = diffCatalog(before, after);
  assert.deepEqual(changes.find((change) => change.kind === 'functions')?.fields, ['definition']);
  assert.deepEqual(changes.find((change) => change.kind === 'function_security')?.fields, ['acl', 'config']);
  assert.deepEqual(changes.find((change) => change.kind === 'rls')?.fields, ['forcerowsecurity']);
  assert.deepEqual(changes.find((change) => change.kind === 'policies')?.fields, ['qual']);
});

test('allowlist estruturada rejeita componente ou identidade fora do escopo', () => {
  const result = evaluateCatalogAllowlist([
    { kind: 'policies', key: 'public.source:unexpected_policy', fields: ['qual'] },
    { kind: 'functions', key: 'public.unexpected()', fields: ['definition'] },
  ], { policies: [], functions: ['public.expected()'] });
  assert.equal(result.allowed, false);
  assert.equal(result.violations.length, 2);
});

test('RLS/policies diretas sem prova RPC autenticada permanecem bloqueadas', () => {
  const directOnly = assessCrossTenantEvidence({
    rlsPolicyPresent: true,
    tenantA: {
      cross_tenant_ticket_count: 0,
      cross_tenant_deal_count: 0,
      visible_tickets: ['ticket-keep'],
      visible_deals: ['deal-keep'],
    },
    tenantB: {
      cross_tenant_ticket_count: 0,
      cross_tenant_deal_count: 0,
      visible_tickets: ['tenant-b-ticket-row'],
      visible_deals: ['tenant-b-deal-row'],
    },
    snapshotA: {
      direct: { commercial: { series: [{ created: 2 }] } },
      operationCrossTenant: { domain: 'commercial', series: [{ created: 2 }] },
    },
    snapshotB: {
      direct: { commercial: { series: [{ created: 1 }] } },
      operationCrossTenant: { domain: 'commercial', series: [{ created: 0 }] },
    },
  });
  assert.equal(directOnly.directPolicyProven, true);
  assert.equal(directOnly.authenticatedRpcTenantProven, false);
  assert.equal(directOnly.proven, false);

  const proven = assessCrossTenantEvidence({
    rlsPolicyPresent: true,
    tenantA: {
      cross_tenant_ticket_count: 0,
      cross_tenant_deal_count: 0,
      visible_tickets: ['ticket-keep'],
      visible_deals: ['deal-keep'],
    },
    tenantB: {
      cross_tenant_ticket_count: 0,
      cross_tenant_deal_count: 0,
      visible_tickets: ['tenant-b-ticket-row'],
      visible_deals: ['tenant-b-deal-row'],
    },
    snapshotA: {
      direct: { commercial: { series: [{ created: 2 }] } },
      operationCrossTenant: { domain: 'commercial', series: [{ created: 0 }] },
    },
    snapshotB: {
      direct: { commercial: { series: [{ created: 1 }] } },
      operationCrossTenant: { domain: 'commercial', series: [{ created: 0 }] },
    },
  });
  assert.equal(proven.proven, true);
});

test('âncoras ausentes e duplicadas permanecem NO_GO', () => {
  const missing = applyTimeseriesTransform(timeseriesDefinition().replace("on c.object_type = 'deal' and c.hubspot_pipeline_id = d.pipeline_id", 'on c.object_type = \'deal\' and c.other = d.pipeline_id'));
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /ANCHOR_MISSING:deal-predicate/);
  const duplicated = applyTimeseriesTransform(timeseriesDefinition().replace("on c.object_type = 'ticket' and c.hubspot_pipeline_id = t.pipeline_id", "on c.object_type = 'ticket' and c.hubspot_pipeline_id = t.pipeline_id\n    on c.object_type = 'ticket' and c.hubspot_pipeline_id = t.pipeline_id"));
  assert.equal(duplicated.ok, false);
  assert.match(duplicated.reason, /ANCHOR_DUPLICATED:ticket-predicate/);
});

test('assinatura inesperada, EXECUTE não permitido e dependência inesperada bloqueiam', () => {
  const wrongSignature = applyTimeseriesTransform(timeseriesDefinition().replace('p_domain text', 'p_domain jsonb'));
  assert.equal(wrongSignature.ok, false);
  assert.match(wrongSignature.reason, /SIGNATURE_UNEXPECTED/);
  const dynamic = preflightMigration({ version: '20260823100000', source: 'do $$ begin execute \'drop table public.x\'; end $$;' });
  assert.equal(dynamic.state, 'NO_GO');
  assert.ok(dynamic.reasons.some((reason) => reason.includes('SOURCE_SHA256_UNEXPECTED')));
  assert.ok(dynamic.reasons.some((reason) => reason.includes('EXECUTE_NOT_ALLOWED')));
  const dependencies = validateDependencies('select public.rpc_analytics_timeseries(), app_private.unexpected_dependency()', {
    allowed: TIMESERIES.allowedDependencies,
    required: TIMESERIES.requiredDependencies,
  });
  assert.equal(dependencies.ok, false);
  assert.deepEqual(dependencies.unexpected, ['app_private.unexpected_dependency']);
});

test('sem sombra o estado é NO_GO e o manifesto proíbe comandos no canônico', async () => {
  const result = await runPreflight({ shadow: false });
  assert.equal(result.state, 'NO_GO');
  assert.equal(result.shadow.state, 'NOT_RUN');
  assert.ok(result.prohibitedMainDatabaseCommands.includes('docker exec supabase_db_genius-support-os'));
  assert.equal(SEMANTIC_MIGRATION_MANIFEST.shadow.disposable, true);
  assert.notEqual(SEMANTIC_MIGRATION_MANIFEST.shadow.namespacePrefix, 'supabase_db_genius-support-os');
  const shadowInit = buildShadowInitSql();
  assert.match(shadowInit, /create role analytics_owner nologin nosuperuser nocreatedb nocreaterole noinherit/);
  assert.match(shadowInit, /grant analytics_owner to postgres/);
  assert.match(shadowInit, /alter schema app_private owner to analytics_owner/);
  assert.match(shadowInit, /grant usage on schema app_private to authenticated/);
  assert.doesNotMatch(shadowInit, /grant usage, create on schema app_private/);
});

test('candidate_go não libera migration histórica: o estado global permanece historical_no_go', () => {
  const decision = evaluateGlobalPreflightDecision({
    staticOk: true,
    shadowResult: {
      state: 'SHADOW_REPLAY_GO',
      performance: { passed: true },
    },
  });
  assert.equal(HISTORICAL_MIGRATION_GATE.state, 'historical_no_go');
  assert.equal(decision.candidateState, 'candidate_go');
  assert.equal(decision.historicalState, 'historical_no_go');
  assert.equal(decision.globalState, 'NO_GO');
  assert.equal(decision.state, 'NO_GO');
  assert.equal(decision.shadowState, 'SHADOW_REPLAY_GO');
  assert.equal(decision.candidate.state, 'candidate_go');
  assert.equal(decision.historical.state, 'historical_no_go');
  assert.equal(decision.failClosed, true);
  assert.match(decision.decision, /historical_no_go/);
});

test('preflight real mantém migrations históricas e candidata prontas somente para shadow', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const [version, manifest] of Object.entries(SEMANTIC_MIGRATION_MANIFEST.migrations)) {
    const source = await readFile(new URL(`../../${manifest.file}`, import.meta.url), 'utf8');
    const result = preflightMigration({ version, source });
    assert.equal(result.state, 'PREFLIGHT_READY_FOR_SHADOW');
    assert.equal(result.classification, null);
    assert.deepEqual(result.reasons, []);
  }
});

test('remediação fail-closed quando assinatura, âncoras ou contagens divergem', () => {
  const source = loadRemediationMigration();
  const cases = [
    ['assinatura', "'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure", 'public.fake(text,date,date,text)'],
    ['âncora de operação', 'v_group_count <> 2', 'v_group_count <> 3'],
    ['escopo materializado', 'with scope as (', 'with scoped_config as ('],
    ['junção de escopo', 'cross join scope scope_config', 'cross join scope broken_scope'],
  ];
  for (const [label, oldValue, newValue] of cases) {
    const result = preflightMigration({
      version: '20260824190000',
      source: source.replace(oldValue, newValue),
    });
    assert.equal(result.state, 'NO_GO', label);
    assert.ok(result.reasons.length > 0, label);
  }
  assert.equal(OPERATION_SCOPE.dynamicTarget.qualifiedName, 'public.rpc_analytics_timeseries');
  assert.equal(REMEDIATION.dynamicTarget.signature, 'p_domain text, p_from date, p_to date, p_grain text');
});

test('mask lexical não promove EXECUTE em string, comentário aninhado ou E string escapada', () => {
  assert.equal(maskSqlLiterals("select 'execute create function public.fake()'" )?.includes('execute'), false);
  assert.equal(maskSqlLiterals('/* outer /* inner */ execute */ select 1')?.includes('execute'), false);
  assert.equal(maskSqlLiterals("select E'prefix\\\\\\' execute suffix'")?.includes('execute'), false);
  assert.equal(extractFunctionIdentity('create function public.fake(p_id uuid) returns void language sql as $$ select 1 $$;').signature, 'p_id uuid');
});

test('fixture de benchmark é sintética, escalável e tem limites explícitos', () => {
  const config = readBenchmarkConfig({});
  assert.equal(config.rowsPerTable, SEMANTIC_MIGRATION_MANIFEST.benchmark.limits.defaultRowsPerTable);
  assert.equal(config.runs, 5);
  assert.equal(config.warmups, 2);
  assert.equal(config.timeoutMs, 30_000);
  assert.equal(config.absoluteRegressionMarginMs, 2);
  assert.equal(config.costRegressionMarginPercent, 1);
  assert.equal(config.regressionMarginPercent, 25);
  const sql = buildSyntheticFixtureSql(1_000);
  assert.match(sql, /generate_series\(1, 1000\)/);
  assert.match(sql, /generate_series\(1, 100\)/);
  assert.match(sql, /bench-ticket-row/);
  assert.match(sql, /bench-deal-row/);
  assert.equal(SEMANTIC_MIGRATION_MANIFEST.benchmark.rpcRepeatCount, 4);
  assert.doesNotMatch(sql, /supabase_db_genius-support-os|service_role|postgresql:\/\//);
  assert.throws(() => buildSyntheticFixtureSql(999), /BENCHMARK_FIXTURE_VOLUME_INVALID/);
  assert.throws(() => readBenchmarkConfig({ CONFIONE_SEMANTIC_PREFLIGHT_ROWS_PER_TABLE: '100001' }), /BENCHMARK_CONFIG_OUT_OF_RANGE/);
});

function benchmarkStage(stage, executionMs, planShape = [{ nodeType: 'Function Scan', relation: null, index: null, joinType: null }]) {
  return {
    stage,
    ok: true,
    workloads: [
      {
        id: 'rpc_analytics_timeseries_all',
        ok: true,
        median: { planningMs: 0.1, executionMs, wallClockMs: executionMs + 1 },
        planShape,
      },
      {
        id: 'rpc_analytics_timeseries_excluded',
        ok: true,
        median: { planningMs: 0.1, executionMs, wallClockMs: executionMs + 1 },
        planShape,
      },
    ],
  };
}

function benchmarkStageWithUnchangedJoins(stage, rpcExecutionMs, joinExecutionMs) {
  const stageResult = benchmarkStage(stage, rpcExecutionMs);
  const joinWorkload = (id) => ({
    id,
    ok: true,
    median: { planningMs: 0.1, executionMs: joinExecutionMs, wallClockMs: joinExecutionMs + 1 },
    planShape: [{ nodeType: 'Hash Join', relation: null, index: null, joinType: 'Inner' }],
    totalCost: 10,
  });
  return { ...stageResult, workloads: [...stageResult.workloads, joinWorkload('timeseries_join_all'), joinWorkload('timeseries_join_excluded')] };
}

test('comparação before/after exige execução, plano estável e margem explícita', () => {
  const config = readBenchmarkConfig({});
  const before = benchmarkStage('before_migrations', 10);
  const after = benchmarkStage('after_migrations', 12.5);
  const passed = compareBenchmarkStages(before, after, config);
  assert.equal(passed.comparable, true);
  assert.equal(passed.passed, true);
  assert.equal(passed.marginPercent, 25);
  assert.equal(passed.criterion.includes('2 ms'), true);
  assert.equal(passed.criterion.includes('custo estimado <= before + 1%'), true);

  const planRegression = compareBenchmarkStages(
    before,
    benchmarkStage('after_migrations', 10, [{ nodeType: 'Seq Scan', relation: 'hubspot_tickets', index: null, joinType: null }]),
    config,
  );
  assert.equal(planRegression.passed, false);
  assert.equal(planRegression.reason, 'BENCHMARK_REGRESSION');

  const notExecuted = compareBenchmarkStages(before, { stage: 'after_migrations', ok: false, timeout: true }, config);
  assert.equal(notExecuted.comparable, false);
  assert.equal(notExecuted.passed, false);
  assert.equal(notExecuted.reason, 'BENCHMARK_NOT_COMPLETED');
});

test('candidato otimizado exige não regressão nas RPCs, uma redução observada e estabilidade nos joins', () => {
  const config = readBenchmarkConfig({});
  const current = benchmarkStageWithUnchangedJoins('after_migrations', 20, 20);
  const candidate = benchmarkStageWithUnchangedJoins('optimized_candidate', 15, 100);
  const passed = assessOptimizedCandidate(current, candidate, config);
  assert.equal(passed.comparable, true);
  assert.equal(passed.unchangedWorkloadsStable, true);
  assert.equal(passed.optimizedWorkloadsPassed, true);
  assert.equal(passed.atLeastOneRpcReduction, true);
  assert.equal(passed.strictRpcReduction, true);
  assert.equal(passed.passed, true);
  assert.equal(passed.reason, 'OPTIMIZED_CANDIDATE_GO');

  const notOptimized = assessOptimizedCandidate(current, benchmarkStageWithUnchangedJoins('optimized_candidate', 20, 20), config);
  assert.equal(notOptimized.strictRpcReduction, false);
  assert.equal(notOptimized.atLeastOneRpcReduction, false);
  assert.equal(notOptimized.passed, false);
  assert.equal(notOptimized.reason, 'OPTIMIZED_CANDIDATE_REGRESSION');

  const oneRpcCandidate = benchmarkStageWithUnchangedJoins('optimized_candidate', 15, 20);
  oneRpcCandidate.workloads[1].median.executionMs = 20;
  const oneRpcReduced = assessOptimizedCandidate(current, oneRpcCandidate, config);
  assert.equal(oneRpcReduced.strictRpcReduction, false);
  assert.equal(oneRpcReduced.atLeastOneRpcReduction, true);
  assert.equal(oneRpcReduced.optimizedWorkloadsPassed, true);
  assert.equal(oneRpcReduced.passed, true);

  const smallCostNoise = benchmarkStageWithUnchangedJoins('optimized_candidate', 15, 20);
  smallCostNoise.workloads[2].totalCost = 10.05;
  const costNoise = assessOptimizedCandidate(current, smallCostNoise, config);
  assert.equal(costNoise.unchangedWorkloadsStable, true);
  assert.equal(costNoise.passed, true);

  const materialCostRegression = benchmarkStageWithUnchangedJoins('optimized_candidate', 15, 20);
  materialCostRegression.workloads[2].totalCost = 10.2;
  const costRegression = assessOptimizedCandidate(current, materialCostRegression, config);
  assert.equal(costRegression.unchangedWorkloadsStable, false);
  assert.equal(costRegression.passed, false);
});
