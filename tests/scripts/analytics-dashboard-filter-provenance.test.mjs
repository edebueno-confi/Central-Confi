import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const commercial = fs.readFileSync(path.join(root, 'apps/web/src/features/analytics/AnalyticsCommercialPage.tsx'), 'utf8');
const overview = fs.readFileSync(path.join(root, 'apps/web/src/features/analytics/AnalyticsCeoPage.tsx'), 'utf8');

test('Comercial diferencia posição atual de movimento no período', () => {
  assert.match(commercial, /Funil atual por estágio/);
  assert.match(commercial, /O período altera os indicadores de movimento/);
});

test('Visão Geral não promove métricas sem dimensão operacional', () => {
  assert.match(overview, /UNSCOPED_OPERATION_KPI_KEYS/);
  assert.match(overview, /operation_dimension_unavailable/);
});

test('Visão Geral invalida a leitura antes de consultar uma nova operação', () => {
  assert.match(overview, /setOperationKpis\(null\)/);
  assert.match(overview, /getCommercialKpisV2ForOverview/);
  assert.match(overview, /getSupportKpisV2ForOverview/);
});
