import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const commercial = read('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx');
const customerSuccess = read('apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx');
const support = read('apps/web/src/features/analytics/AnalyticsCsPage.tsx');
const finance = read('apps/web/src/features/analytics/AnalyticsFinancePage.tsx');
const trendPanel = read('apps/web/src/features/analytics/AnalyticsTrendPanel.tsx');
const timeseriesContract = read('apps/web/src/features/analytics/analytics-timeseries-contract.mjs');
const analyticsApi = read('apps/web/src/features/analytics/analytics-api.ts');

test('as quatro superfícies separam Posição e Evolução', () => {
  for (const [name, source] of Object.entries({ commercial, customerSuccess, support, finance })) {
    assert.match(source, /AnalyticsDomainTabs/, `${name} precisa reutilizar as sub-abas canônicas`);
    assert.match(source, /id: 'posicao'/, `${name} precisa preservar a aba de posição`);
    assert.match(source, /id: 'evolucao'/, `${name} precisa expor a aba de evolução`);
  }
});

test('Evolução comercial concentra comparação e série sem repetir o quadro de posição', () => {
  const evolution = commercial.indexOf("id: 'evolucao'");
  const comparison = commercial.indexOf('AnalyticsCommercialComparison', evolution);
  const position = commercial.indexOf("id: 'posicao'");

  assert.ok(position >= 0 && evolution > position);
  assert.ok(comparison > evolution, 'a comparação temporal deve ficar na aba Evolução');
  assert.match(commercial.slice(evolution), /AnalyticsTrendPanel domain="commercial"/);
});

test('Customer Success não inventa série temporal sem contrato publicado', () => {
  assert.match(customerSuccess, /Evolução indisponível/);
  assert.match(customerSuccess, /não publica série histórica/);
  assert.doesNotMatch(customerSuccess, /AnalyticsTrendPanel domain="customer_success"/);
});

test('as séries existentes preservam fonte backend e recorte operacional', () => {
  assert.match(support, /AnalyticsTrendPanel domain="support" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\}/);
  assert.match(commercial, /AnalyticsTrendPanel domain="commercial" groupCompany=\{groupCompany\} excludedPipelineIds=\{excludedPipelineIds\}/);
  assert.match(finance, /AnalyticsTrendPanel domain="finance"/);
  assert.match(trendPanel, /getAnalyticsTimeseries\(domain, grain, undefined, groupCompany, excludedPipelineIds\)/);
  assert.match(analyticsApi, /rpc_analytics_timeseries_by_operation/);
  assert.match(analyticsApi, /p_excluded_pipeline_ids: excludedPipelineIds/);
});

test('posição mantém snapshot atual e evolução não fabrica série ou zero', () => {
  assert.match(customerSuccess, /Carteira hoje/);
  assert.match(customerSuccess, /snapshot atual/);
  assert.match(timeseriesContract, /history_insufficient/);
  assert.doesNotMatch(customerSuccess, /buildUnavailable|Array\.from\(|generate_series/);
});
