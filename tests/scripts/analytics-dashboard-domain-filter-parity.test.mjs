import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');
const api = await read('apps/web/src/features/analytics/analytics-api.ts');
const commercial = await read('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx');
const support = await read('apps/web/src/features/analytics/AnalyticsCsPage.tsx');
const customerSuccess = await read('apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx');
const finance = await read('apps/web/src/features/analytics/AnalyticsFinancePage.tsx');
const help = await read('docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md');
const operationScope = await read('apps/web/src/features/analytics/AnalyticsOperationScope.tsx');
const pipelineCombobox = await read('apps/web/src/features/analytics/AnalyticsPipelineCombobox.tsx');

test('Comercial invalida coorte e estado antes de recarregar o recorte completo', () => {
  assert.match(commercial, /buildAnalyticsQueryKey\([\s\S]*excludedPipelineIds,[\s\S]*stageId: filters\.stageId/);
  assert.match(commercial, /setState\(createAnalyticsLoadingState\(\)\)/);
  assert.match(commercial, /setKpiPayload\(null\)/);
  assert.match(commercial, /setPreviousKpiPayload\(null\)/);
  assert.match(commercial, /getCommercialKpisV2\(\{ \.\.\.filters, \.\.\.previousPeriod \}, groupCompany \|\| null, excludedPipelineIds\)/);
  assert.match(commercial, /if \(!cancelled\) setKpiPayload\(payload\)/);
});

test('Suporte não exibe read models auxiliares sem etapa ou exclusões do recorte', () => {
  assert.match(api, /p_stage_id: filters\.stageId \|\| null/);
  assert.match(api, /p_excluded_pipeline_ids: excludedPipelineIds/);
  assert.match(support, /const unsupportedPositionFilter = Boolean\(filters\.stageId\) \|\| excludedPipelineIds\.length > 0/);
  assert.match(support, /if \(!filters\.stageId && excludedPipelineIds\.length === 0\)/);
  assert.match(support, /!unsupportedPositionFilter && queuePayload/);
  assert.match(support, /!unsupportedPositionFilter \? \(/);
  assert.match(support, /Detalhes indisponíveis neste recorte/);
});

test('troca de operação, etapa e exclusão limpa as leituras auxiliares de Suporte', () => {
  assert.match(support, /setKpiPayload\(null\)/);
  assert.match(support, /setStagePayload\(null\)/);
  assert.match(support, /setQueuePayload\(null\)/);
  assert.match(support, /let cancelled = false/);
  assert.match(support, /if \(!cancelled\) setKpiPayload\(payload\)/);
  assert.match(support, /if \(!cancelled\) setStagePayload\(payload\)/);
  assert.match(support, /if \(!cancelled\) setQueuePayload\(payload\)/);
});

test('Customer Success permanece limitado à dimensão de operação publicada', () => {
  assert.match(api, /rpc_analytics_customer_success_kpis_by_operation/);
  assert.match(api, /p_group_company: groupCompany/);
  assert.doesNotMatch(customerSuccess, /getCustomerSuccessKpisV2\([^)]*filters/);
  assert.match(customerSuccess, /Evolução indisponível/);
  assert.match(customerSuccess, /Nenhuma tendência é inferida/);
});

test('Financeiro não transforma operação comercial em dimensão financeira', () => {
  assert.match(finance, /Financeiro consolidado fora do recorte/);
  assert.match(finance, /não publica dimensão de operação/);
  assert.match(finance, /setState\(createAnalyticsLoadingState\(\)\)/);
  assert.doesNotMatch(finance, /getFinanceSnapshot\([^)]*sharedOperation/);
});

test('Central de Ajuda registra o contrato de posição sem inventar dimensões', () => {
  assert.match(help, /read models auxiliares/);
  assert.match(help, /não\s+recebem filtros de período, etapa ou exclusões/);
  assert.match(help, /não publica\s+uma série temporal/);
  assert.match(help, /dimensão financeira explícita/);
});

test('filtros inline reservam mais espaço para pipelines e evitam duplicação de nomes', () => {
  assert.match(operationScope, /inline = false/);
  assert.match(operationScope, /inline \? 'min-w-\[8rem\] max-w-\[11rem\] flex-1 basis-36'/);
  assert.match(pipelineCombobox, /inline \? 'relative min-w-\[14rem\] max-w-\[22rem\] flex-\[1\.5\] basis-56'/);
  assert.match(pipelineCombobox, /hasDistinctOfficialName/);
  assert.match(pipelineCombobox, /hasDistinctOfficialName\(pipeline\) \? <span/);
  assert.match(pipelineCombobox, /aria-controls=/);
  assert.match(pipelineCombobox, /role="listbox"/);
});
