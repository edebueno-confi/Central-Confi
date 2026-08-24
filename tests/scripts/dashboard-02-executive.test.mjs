import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCeoPage.tsx', 'utf8');
const executive = fs.readFileSync('apps/web/src/features/analytics/analytics-executive.ts', 'utf8');
const shell = fs.readFileSync('apps/web/src/features/analytics/AnalyticsShell.tsx', 'utf8');

test('visão executiva separa desempenho de posição atual', () => {
  assert.match(page, /Desempenho no período/);
  assert.match(page, /Posição atual, não afetada pelo período selecionado/);
  assert.match(page, /Mapa das áreas/);
  assert.doesNotMatch(page, /Decida com o contexto certo/);
});

test('ranking de pipelines é determinístico e limitado a cinco', () => {
  assert.match(executive, /sort\(\(left, right\) => right\.ticketCount - left\.ticketCount/);
  assert.match(executive, /slice\(0, limit\)/);
  assert.match(executive, /limit = 5/);
  assert.doesNotMatch(page, /Fila operacional/);
  assert.match(page, /Atenção executiva/);
  assert.doesNotMatch(page, /Governança e cobertura/);
});

test('exceções distinguem qualidade de dados e risco operacional', () => {
  assert.match(executive, /Dados e integrações/);
  assert.match(executive, /Tickets de alta prioridade em aberto/);
  assert.doesNotMatch(page, /status: 'partial'/);
  assert.match(page, /Atenção operacional/);
});

test('visão integrada separa as áreas publicadas e preserva fontes indisponíveis', () => {
  for (const label of ['Comercial', 'Customer Success', 'Suporte', 'Financeiro']) assert.match(page, new RegExp(label));
  assert.match(page, /Fonte indisponível/);
  assert.match(page, /customer_success/);
  assert.doesNotMatch(page, /CS \/ Suporte/);
});

test('dashboard_viewer recebe somente conteúdo autorizado', () => {
  assert.match(shell, /const visibleDomains = DOMAINS/);
  assert.match(shell, /visibleDomains\.map/);
  assert.doesNotMatch(shell, /DOMAINS\.filter\(\(domain\) => domain\.key === 'ceo'\)/);
  assert.match(shell, /Visualizador gerencial/);
  assert.match(page, /isDashboardViewer\s*\?/);
  assert.match(shell, /isPlatformAdmin\s*\?/);
  assert.doesNotMatch(shell, /isDashboardViewer\s*\?[^\n]*Exportar/);
  assert.doesNotMatch(page, /href=.*analytics\/pipelines/);
});

test('rotas internas usam React Router e não links HTML diretos', () => {
  assert.match(page, /from ["']react-router["']/);
  assert.match(page, /<Link[\s\S]*?\bto=/);
  assert.doesNotMatch(page, /<a key=/);
});

test('comparação temporal só aparece quando há base válida', () => {
  assert.match(page, /previous\.commercial/);
  assert.match(page, /previousDenominator === 0/);
  assert.match(page, /comparison\.revenue/);
  assert.doesNotMatch(page, /Comparação temporal disponível para o mesmo recorte/);
});
