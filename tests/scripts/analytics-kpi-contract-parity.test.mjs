import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');
const api = await read('apps/web/src/features/analytics/analytics-api.ts');
const overview = await read('apps/web/src/features/analytics/AnalyticsCeoPage.tsx');
const commercial = await read('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx');
const support = await read('apps/web/src/features/analytics/AnalyticsCsPage.tsx');
const shell = await read('apps/web/src/features/analytics/AnalyticsShell.tsx');
const model = await read('apps/web/src/features/analytics/analytics-model.ts');
const finance = await read('apps/web/src/features/analytics/AnalyticsFinancePage.tsx');
const candidate = await read('supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql');
const operationGovernance = await read('supabase/migrations/20260822073000_analytics_pipeline_operation_governance_findings_v1.sql');

function candidateFunctionBlock(name) {
  return candidate.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))?.[0] ?? '';
}

function functionBlock(source, name) {
  return source.match(new RegExp(`export async function ${name}[\\s\\S]*?\\n}\\n`))?.[0] ?? '';
}

test('Comercial V2 publica estágio e exclusões no recorte normal e no comparativo', () => {
  const adapter = api.match(/function commercialKpiRpcArgs[\s\S]*?\n}\n/)?.[0] ?? '';
  assert.notEqual(adapter, '', 'adaptador comercial precisa existir');
  assert.match(adapter, /p_stage_id:/);
  assert.match(adapter, /p_excluded_pipeline_ids: excludedPipelineIds/);
  for (const name of ['getCommercialKpisV2', 'getCommercialKpisV2ForOverview']) {
    const block = functionBlock(api, name);
    assert.notEqual(block, '', `${name} precisa existir`);
    assert.match(block, /commercialKpiRpcArgs\(/);
  }
});

test('Suporte V2 publica estágio, prioridade e exclusões no recorte normal e no comparativo', () => {
  const adapter = api.match(/function supportKpiRpcArgs[\s\S]*?\n}\n/)?.[0] ?? '';
  assert.notEqual(adapter, '', 'adaptador de suporte precisa existir');
  assert.match(adapter, /p_stage_id:/);
  assert.match(adapter, /p_priority:/);
  assert.match(adapter, /p_excluded_pipeline_ids: excludedPipelineIds/);
  for (const name of ['getSupportKpisV2', 'getSupportKpisV2ForOverview']) {
    const block = functionBlock(api, name);
    assert.notEqual(block, '', `${name} precisa existir`);
    assert.match(block, /supportKpiRpcArgs\(/);
  }
});

test('a Visão Geral usa as mesmas exclusões por objeto que as abas', () => {
  assert.match(model, /AnalyticsSharedPipelineExclusions/);
  assert.match(shell, /analytics-commercial-pipelines/);
  assert.match(shell, /analytics-cs-pipelines/);
  assert.match(overview, /getCommercialKpisV2ForOverview\(stableFilters, groupCompany, commercialExcludedPipelineIds\)/);
  assert.match(overview, /getSupportKpisV2ForOverview\(stableFilters, groupCompany, supportExcludedPipelineIds\)/);
  assert.match(overview, /getCsSnapshotForOverview\(stableFilters, supportExcludedPipelineIds, groupCompany\)/);
  assert.doesNotMatch(overview, /<AnalyticsTrendPanel/);
  assert.doesNotMatch(overview, /Evolução por domínio/);
  assert.match(commercial, /getCommercialKpisV2\(filters, groupCompany \|\| null, excludedPipelineIds\)/);
  assert.match(support, /getSupportKpisV2\(filters, groupCompany \|\| null, excludedPipelineIds\)/);
});

test('a Visão Geral não duplica KPIs nem séries das abas de domínio', () => {
  assert.match(overview, /AnalyticsKpiBoard/);
  assert.match(overview, /Mapa das áreas/);
  assert.match(overview, /Atenção operacional/);
  assert.doesNotMatch(overview, /Desempenho no período/);
  assert.doesNotMatch(overview, /Posição atual, não afetada pelo período selecionado/);
});

test('a chave e a invalidação permanecem sensíveis às exclusões', () => {
  assert.match(overview, /commercialExcludedPipelineIds/);
  assert.match(overview, /supportExcludedPipelineIds/);
  assert.match(commercial, /excludedPipelineIds,/);
  assert.match(support, /excludedPipelineIds,/);
});

test('Customer Success não recebe dimensões que sua origem não publica', () => {
  const block = functionBlock(api, 'getCustomerSuccessKpisV2');
  assert.match(block, /p_group_company: groupCompany/);
  assert.doesNotMatch(block, /p_stage_id|p_excluded_pipeline_ids|p_from|p_to/);
});

test('Financeiro continua indisponível quando uma operação é selecionada', () => {
  assert.match(finance, /Financeiro consolidado fora do recorte/);
  assert.match(finance, /não publica dimensão de operação/);
  assert.doesNotMatch(finance, /getFinanceSnapshot\(filters, filters\.clientQuery\).*sharedOperation/);
});

test('migration candidata adiciona contrato de seis argumentos sem substituir o legado', () => {
  assert.match(candidate, /rpc_analytics_commercial_kpis_v2_filtered\(/);
  assert.match(candidate, /rpc_analytics_support_kpis_v2_filtered\(/);
  assert.match(candidate, /rpc_analytics_commercial_kpis_by_operation\(\n  p_from date,\n  p_to date,\n  p_owner_id text,\n  p_stage_id text,\n  p_excluded_pipeline_ids text\[\],\n  p_group_company text\n\)/);
  assert.match(candidate, /rpc_analytics_support_kpis_by_operation\(\n  p_from date,\n  p_to date,\n  p_stage_id text,\n  p_priority text,\n  p_excluded_pipeline_ids text\[\],\n  p_group_company text\n\)/);
  assert.match(candidate, /p_stage_id is null or d\.dealstage = p_stage_id/);
  assert.match(candidate, /p_stage_id is null or t\.pipeline_stage = p_stage_id/);
  assert.match(candidate, /not coalesce\(d\.pipeline_id = any\(p_excluded_pipeline_ids\), false\)/);
  assert.match(candidate, /not coalesce\(t\.pipeline_id = any\(p_excluded_pipeline_ids\), false\)/);
});

test('operação selecionada e Todas usam elegibilidade canônica dentro das CTEs', () => {
  const commercial = candidateFunctionBlock('rpc_analytics_commercial_kpis_v2_filtered');
  const support = candidateFunctionBlock('rpc_analytics_support_kpis_v2_filtered');
  assert.notEqual(commercial, '', 'bloco comercial candidato precisa existir');
  assert.notEqual(support, '', 'bloco de suporte candidato precisa existir');
  assert.match(commercial, /app_private\.analytics_pipeline_operation_eligible\([\s\S]*?'deal'[\s\S]*?current_setting\('app\.analytics_group_company', true\)[\s\S]*?'commercial'/);
  assert.match(support, /app_private\.analytics_pipeline_operation_eligible\([\s\S]*?'ticket'[\s\S]*?current_setting\('app\.analytics_group_company', true\)[\s\S]*?'support'/);
  assert.match(operationGovernance, /nullif\(btrim\(p_group_company\), ''\) is null/, 'Todas permanece representada pelo contexto vazio');
  assert.match(candidate, /set_analytics_operation_scope\(p_group_company\)/, 'o wrapper define o contexto operacional');
});

test('elegibilidade canônica mantém exclusões sem misturar operações', () => {
  for (const name of ['rpc_analytics_commercial_kpis_v2_filtered', 'rpc_analytics_support_kpis_v2_filtered']) {
    const block = candidateFunctionBlock(name);
    assert.match(block, /p_excluded_pipeline_ids/);
    assert.match(block, /analytics_pipeline_operation_eligible/);
    assert.match(block, /current_setting\('app\.analytics_group_company', true\)/);
  }
  assert.match(candidate, /set_analytics_operation_scope\(p_group_company\)/g);
});

test('migration candidata preserva segurança e não usa SQL dinâmico', () => {
  assert.match(candidate, /security definer/);
  assert.match(candidate, /set search_path = ''/);
  assert.match(candidate, /revoke all on function public\.rpc_analytics_commercial_kpis_by_operation\(date, date, text, text, text\[\], text\) from public, anon/);
  assert.match(candidate, /grant execute on function public\.rpc_analytics_support_kpis_by_operation\(date, date, text, text, text\[\], text\) to authenticated, service_role/);
  assert.doesNotMatch(candidate, /\bDO\b/);
  assert.doesNotMatch(candidate, /\bEXECUTE\b/);
});
