import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const coverage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsDataCoveragePanel.tsx', 'utf8');
const executive = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCeoPage.tsx', 'utf8');
const shell = fs.readFileSync('apps/web/src/features/analytics/AnalyticsShell.tsx', 'utf8');
const domains = fs.readFileSync('apps/web/src/features/analytics/analytics-domains.ts', 'utf8');
const commercialPage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx', 'utf8');
const supportPage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCsPage.tsx', 'utf8');
const customerSuccessPage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx', 'utf8');
const unavailablePages = fs.readFileSync('apps/web/src/features/analytics/AnalyticsUnavailablePages.tsx', 'utf8');
const financePage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsFinancePage.tsx', 'utf8');
const trendPanel = fs.readFileSync('apps/web/src/features/analytics/AnalyticsTrendPanel.tsx', 'utf8');
const analyticsApi = fs.readFileSync('apps/web/src/features/analytics/analytics-api.ts', 'utf8');
const operationScope = fs.readFileSync('apps/web/src/features/analytics/AnalyticsOperationScope.tsx', 'utf8');
const operationGovernanceMigration = fs.readFileSync('supabase/migrations/20260822073000_analytics_pipeline_operation_governance_findings_v1.sql', 'utf8');
const timeseriesScopeMigration = fs.readFileSync('supabase/migrations/20260821090000_analytics_timeseries_operation_scope_v1.sql', 'utf8');
const timeseriesPipelineExclusionMigration = fs.readFileSync('supabase/migrations/20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql', 'utf8');

test('visão executiva resume as áreas e deixa evolução nas abas de domínio', () => {
  assert.doesNotMatch(executive, /<AnalyticsTrendPanel/);
  assert.doesNotMatch(executive, /Evolução por domínio/);
  assert.match(commercialPage, /<AnalyticsTrendPanel domain="commercial"/);
  assert.match(supportPage, /<AnalyticsTrendPanel domain="support"/);
  assert.match(financePage, /<AnalyticsTrendPanel domain="finance"/);
  assert.match(executive, /AnalyticsKpiBoard/);
  assert.match(executive, /Mapa das áreas/);
  assert.match(executive, /Atenção operacional/);
});

test('cobertura distingue contrato publicado de lacuna de integração', () => {
  assert.match(coverage, /Publicado/);
  assert.match(coverage, /Cobertura parcial/);
  assert.match(coverage, /Indisponível/);
  assert.doesNotMatch(executive, /Atividades · reuniões, tarefas, ligações e e-mails/);
  assert.doesNotMatch(executive, /Conversas e chat/);
  assert.doesNotMatch(executive, /Pagar, centros de custo, projetos e contratos/);
  assert.doesNotMatch(executive, /meetingss*=s*0|taskss*=s*0|conversationss*=s*0/);
});

test('governança permanece uma ação controlada fora dos domínios de leitura', () => {
  assert.match(shell, /to="\/admin\/settings\/dashboard-sources"/);
  assert.match(shell, /Governança de dados/);
  assert.match(coverage, /Revisar governança de dados/);
  assert.match(domains, /conversas ainda não conectadas/);
});

test('domínios exibem análises úteis sem reservar espaço para fontes ausentes', () => {
  assert.match(commercialPage, /Performance comercial por responsável/);
  assert.match(commercialPage, /CommercialOwnerPerformanceChart/);
  assert.doesNotMatch(commercialPage, /Tarefas e atividades comerciais/);
  assert.match(customerSuccessPage, /Performance da carteira por responsável/);
  assert.match(customerSuccessPage, /customers_with_tickets/);
  assert.match(supportPage, /Performance do suporte por responsável/);
  assert.doesNotMatch(supportPage, /Chat \/ Conversas/);
  assert.doesNotMatch(supportPage, /Tarefas e atividades de suporte/);
  assert.doesNotMatch(customerSuccessPage, /Tarefas e atividades de Customer Success/);
  assert.doesNotMatch(financePage, /Performance financeira por responsável/);
});

test('performance de suporte usa identidade estável e não nome duplicável como chave React', () => {
  assert.match(supportPage, /key=\{owner\.key\}/);
  assert.match(supportPage, /key: typeof row\.owner_id === 'string'/);
  assert.match(supportPage, /`unassigned:\$\{index\}`/);
  assert.doesNotMatch(supportPage, /<tr key=\{owner\.name\}/);
});

test('escopo de operação é espelhado nos read models HubSpot e limita domínios sem dimensão publicada', () => {
  assert.match(executive, /const stableFilters = useMemo\(/);
  assert.match(executive, /getCommercialKpisV2ForOverview\(stableFilters, groupCompany, commercialExcludedPipelineIds\)/);
  assert.match(executive, /getSupportKpisV2ForOverview\(stableFilters, groupCompany, supportExcludedPipelineIds\)/);
  assert.match(executive, /getCsSnapshotForOverview\(stableFilters, supportExcludedPipelineIds, groupCompany\)/);
  assert.match(executive, /applyOperationScope/);
  // V-04: esta asserção fixava a redação antiga, que falava "server-side" e
  // "read models publicados" para um público executivo. O que precisa continuar
  // verdadeiro é a declaração — Financeiro não é recortado por operação — e não
  // o texto exato. A âncora é o parágrafo do recorte, então a asserção falha se
  // a declaração sumir do lugar onde o leitor a procura.
  const escopoOperacional = executive.slice(
    executive.indexOf('Operação <strong>{groupCompany}</strong>'),
    executive.indexOf('Operação <strong>{groupCompany}</strong>') + 600,
  );
  assert.match(escopoOperacional, /Financeiro/);
  assert.match(escopoOperacional, /não é separado por operação/);
  assert.doesNotMatch(escopoOperacional, /server-side/i);
  assert.doesNotMatch(escopoOperacional, /read models/i);
  assert.match(executive, /maskUnscopedOperationKpis/);
  assert.match(financePage, /Financeiro consolidado fora do recorte/);
  assert.match(financePage, /Abrir Governança/);
  assert.doesNotMatch(executive, /<AnalyticsTrendPanel/);
  assert.match(commercialPage, /<AnalyticsTrendPanel domain="commercial" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\} \/>/);
  assert.match(supportPage, /<AnalyticsTrendPanel domain="support" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\} \/>/);
  assert.match(trendPanel, /getAnalyticsTimeseries\(domain, grain, undefined, groupCompany, effectiveExcludedPipelineIds\)/);
  assert.match(analyticsApi, /rpc_analytics_timeseries_by_operation/);
  assert.match(analyticsApi, /p_excluded_pipeline_ids: excludedPipelineIds/);
  assert.match(commercialPage, /<AnalyticsTrendPanel domain="commercial" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\} \/>/);
  assert.match(supportPage, /<AnalyticsTrendPanel domain="support" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\} \/>/);
  assert.match(trendPanel, /excludedPipelineIds = EMPTY_EXCLUDED_PIPELINE_IDS/);
  assert.match(timeseriesPipelineExclusionMigration, /set_analytics_pipeline_exclusion_scope/);
  assert.match(timeseriesPipelineExclusionMigration, /p_excluded_pipeline_ids text\[\]/);
  assert.match(timeseriesPipelineExclusionMigration, /pipeline_id <> all\(string_to_array/);
  assert.match(timeseriesScopeMigration, /operation_dimension_unavailable/);
});

test('leituras executivas de período e posição não concorrem no banco', () => {
  for (const functionName of ['getExecutiveKpisV2', 'getCeoSnapshot', 'getCommercialKpisV2ForOverview', 'getSupportKpisV2ForOverview', 'getCsSnapshotForOverview']) {
    const functionBlock = analyticsApi.match(new RegExp(`export async function ${functionName}[\\s\\S]*?\\n}\\n`))?.[0] ?? '';
    assert.notEqual(functionBlock, '', `${functionName} precisa existir`);
    assert.match(functionBlock, /const periodResponse = await client\.rpc/);
    assert.match(functionBlock, /const currentResponse = await client\.rpc/);
    assert.doesNotMatch(functionBlock, /Promise\.all/);
  }
  assert.doesNotMatch(executive, /Promise\.all\(\[getCeoSnapshot/);
  assert.match(executive, /if \(!groupCompany\)/);
  assert.match(executive, /if \(!executiveLoaded\) return;/);
  assert.doesNotMatch(executive, /Promise\.all\(\[\s*getCommercialKpisV2ForOverview/);
});

// SEN-F03: a versão anterior comparava posições de `indexOf` e fixava o literal
// `data: current.data ?? buildUnavailableCeoSnapshot`, ou seja, congelava o
// defeito em vez de detectá-lo, e continuava passando se o `return` do guard
// fosse apagado. Agora exigimos que a branch operacional realmente interrompa o
// efeito antes da chamada consolidada.
test('operação selecionada não dispara o snapshot executivo consolidado', () => {
  const operationBranch = executive.indexOf('if (groupCompany) {');
  const consolidatedSnapshot = executive.indexOf('getCeoSnapshot(stableFilters)');

  assert.ok(operationBranch >= 0, 'a branch operacional precisa existir');
  assert.ok(consolidatedSnapshot > operationBranch, 'o snapshot consolidado deve ficar depois do guard operacional');

  const guardBody = executive.slice(operationBranch, consolidatedSnapshot);
  assert.match(guardBody, /\n\s{6}return \(\) => \{/, 'a branch operacional precisa retornar antes do snapshot consolidado');
  assert.doesNotMatch(guardBody, /getCeoSnapshot\(/, 'a branch operacional não pode chamar o snapshot consolidado');
});

// SEN-F01: sob recorte, a base do snapshot precisa ser sempre a indisponível.
// Reaproveitar `current.data` mantinha vivo o consolidado carregado antes da
// seleção da operação, e todo campo sem dimensão operacional era publicado como
// se fosse do recorte.
test('recorte operacional não reaproveita o snapshot consolidado já carregado', () => {
  assert.match(executive, /data: buildUnavailableCeoSnapshot\(\)/);
  assert.doesNotMatch(executive, /current\.data \?\? buildUnavailableCeoSnapshot/);
});

test('Customer Success usa inventário confirmado, RPC server-side e cobertura explícita', () => {
  assert.match(customerSuccessPage, /sharedOperation/);
  assert.match(customerSuccessPage, /getAnalyticsPipelineInventory/);
  assert.match(customerSuccessPage, /AnalyticsOperationScope/);
  assert.match(customerSuccessPage, /ticket-empresa/);
  assert.match(customerSuccessPage, /getCustomerSuccessKpisV2\(groupCompany \|\| null\)/);
  assert.match(analyticsApi, /rpc_analytics_customer_success_kpis_by_operation/);
  assert.match(analyticsApi, /rpc_analytics_pipeline_inventory/);
  assert.match(operationScope, /source === 'confirmed'/);
  assert.match(operationGovernanceMigration, /analytics_pipeline_operation_eligible/);
  assert.match(operationGovernanceMigration, /ticket_company_association_missing/);
  assert.match(operationGovernanceMigration, /ticket_company_association_partial/);
  assert.match(unavailablePages, /sem dimensão publicada/);
  assert.doesNotMatch(unavailablePages, /getAnalytics|fetch\(/);
});
