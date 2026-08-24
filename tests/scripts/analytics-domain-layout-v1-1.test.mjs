import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shell = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsShell.tsx', import.meta.url), 'utf8');
const filters = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsFilters.tsx', import.meta.url), 'utf8');
const domains = await readFile(new URL('../../apps/web/src/features/analytics/analytics-domains.ts', import.meta.url), 'utf8');
const waiting = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsUnavailablePages.tsx', import.meta.url), 'utf8');
const ceo = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsCeoPage.tsx', import.meta.url), 'utf8');
const frame = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsHdDomainFrame.tsx', import.meta.url), 'utf8');
const density = await readFile(new URL('../../apps/web/src/features/analytics/high-density.css', import.meta.url), 'utf8');
const commercial = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsCommercialPage.tsx', import.meta.url), 'utf8');
const finance = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsFinancePage.tsx', import.meta.url), 'utf8');
const ui = await readFile(new URL('../../apps/web/src/features/analytics/analytics-ui.tsx', import.meta.url), 'utf8');
const charts = await readFile(new URL('../../apps/web/src/features/analytics/charts/AnalyticsCharts.tsx', import.meta.url), 'utf8');

test('dashboard por domínio não renderiza container global nem filtro de domínio', () => {
  assert.doesNotMatch(shell, /gso-source-rail/);
  assert.doesNotMatch(filters, /Todos os domínios|Domínio em foco/);
  assert.match(ceo, /AnalyticsStateBadge/);
});

test('navegação publica Produto e Desenvolvimento em uma única aba de espera', () => {
  assert.match(domains, /key: 'product-development'[\s\S]*enabled: true/);
  assert.match(waiting, /Modo de espera por integração/);
  assert.match(waiting, /GitHub/);
  assert.doesNotMatch(waiting, /fetch\(|supabase|axios|XMLHttpRequest/);
});

test('KPIs e gráficos compactos possuem semântica de leitura', () => {
  assert.match(ui, /data-kpi-role=\{resolvedSemantic\}/);
  assert.match(ui, /gso-kpi-snapshot-marker/);
  assert.match(charts, /CompactSummary/);
  assert.match(charts, /CompactSummary/);
});

test('contexto executivo mantém o estado da leitura sem CTA de infraestrutura', () => {
  assert.match(ceo, /gso-overview-context__source/);
  assert.doesNotMatch(ceo, /overview-sync-sources|Sincronizar bases/);
  assert.match(frame, /AnalyticsExecutionMeta/);
  assert.match(commercial, /listHubspotSyncRuns/);
  assert.match(commercial, /provider="HubSpot"/);
  assert.match(finance, /listOmieSyncRuns/);
  assert.match(finance, /provider="OMIE"/);
});

test('header executivo usa a folha de alta densidade e quebra sem depender do shell generico', () => {
  assert.match(density, /\.gso-high-density-ui \.gso-overview-context \{[\s\S]*display: grid;/);
  assert.match(density, /\.gso-high-density-ui \.gso-overview-context__source \{/);
  assert.match(density, /\.gso-high-density-ui \.gso-overview-context__heading \{/);
  assert.doesNotMatch(density, /\.gso-high-density-ui \.gso-overview-context__action \{/);
  assert.match(density, /@media \(max-width: 760px\)[\s\S]*\.gso-high-density-ui \.gso-overview-context \{/);
  assert.match(density, /\.gso-high-density-ui \.gso-visual-v1-domain-frame \.gso-hd-domain-frame-header/);
});
