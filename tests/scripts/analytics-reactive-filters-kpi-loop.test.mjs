import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const reactiveState = await import('../../apps/web/src/features/analytics/analytics-reactive-state.mjs');

const trendPanel = fs.readFileSync('apps/web/src/features/analytics/AnalyticsTrendPanel.tsx', 'utf8');
const filters = fs.readFileSync('apps/web/src/features/analytics/AnalyticsFilters.tsx', 'utf8');
const finance = fs.readFileSync('apps/web/src/features/analytics/AnalyticsFinancePage.tsx', 'utf8');
const commercial = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx', 'utf8');
const support = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCsPage.tsx', 'utf8');
const queryKeySource = fs.readFileSync('apps/web/src/features/analytics/analytics-query-key.ts', 'utf8');

test('TrendPanel estabiliza o default e ignora respostas fora da geração atual', () => {
  assert.match(trendPanel, /const EMPTY_EXCLUDED_PIPELINE_IDS: string\[\] = \[\];/);
  assert.match(trendPanel, /excludedPipelineIds = EMPTY_EXCLUDED_PIPELINE_IDS/);
  assert.match(trendPanel, /latestRequest = useRef\(0\)/);
  assert.match(trendPanel, /requestId !== latestRequest\.current/);
  assert.match(trendPanel, /setPayload\(null\)/);
});

test('a chave inclui dimensões de recorte e normaliza a ordem dos pipelines', () => {
  assert.match(queryKeySource, /period: \{ from: period\.from/);
  for (const field of ['operation', 'excludedPipelineIds', 'ownerId', 'stageId', 'priority', 'grain']) {
    assert.match(queryKeySource, new RegExp(`${field}:`));
  }
  assert.match(queryKeySource, /new Set\(values\.filter/);
  assert.match(commercial, /buildAnalyticsQueryKey/);
  assert.match(support, /buildAnalyticsQueryKey/);
  assert.match(finance, /buildAnalyticsQueryKey/);
});

test('filtros comuns são reativos e preservam validação sem Aplicar', () => {
  assert.match(filters, /const update = \(key: keyof AnalyticsFilters, next: string\)/);
  assert.match(filters, /emit\(nextDraft\)/);
  assert.doesNotMatch(filters, />Aplicar</);
  assert.match(filters, /A data inicial precisa ser anterior ou igual à data final/);
  assert.match(filters, />Limpar</);
});

test('Financeiro mantém operação indisponível e debounce de busca', () => {
  assert.match(finance, /Financeiro consolidado fora do recorte/);
  assert.match(finance, /clientSearchTimer/);
  assert.match(finance, /setTimeout\(\(\) =>/);
  assert.doesNotMatch(finance, />Aplicar</);
});

test('cada superfície invalida o estado visível antes de iniciar a nova geração', () => {
  assert.deepEqual(reactiveState.createAnalyticsLoadingState(), { phase: 'loading' });

  for (const source of [commercial, support, finance]) {
    assert.match(source, /setState\(createAnalyticsLoadingState\(\)\)/);
    assert.doesNotMatch(source, /setState\(\(current\) => current\.phase === 'ready'/);
  }

  assert.match(commercial, /setKpiPayload\(null\)/);
  assert.match(commercial, /setPreviousKpiPayload\(null\)/);
  assert.match(support, /setKpiPayload\(null\)/);
  assert.match(support, /setStagePayload\(null\)/);
  assert.match(support, /setQueuePayload\(null\)/);
  assert.match(finance, /setState\(createAnalyticsLoadingState\(\)\)/);
});
