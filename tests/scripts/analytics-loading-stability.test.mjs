import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pages = await Promise.all([
  readFile('apps/web/src/features/analytics/AnalyticsCommercialPage.tsx', 'utf8'),
  readFile('apps/web/src/features/analytics/AnalyticsCsPage.tsx', 'utf8'),
  readFile('apps/web/src/features/analytics/AnalyticsFinancePage.tsx', 'utf8'),
]);

test('abas analíticas invalidam dados prontos durante nova atualização', () => {
  for (const source of pages) {
    assert.match(source, /setState\(createAnalyticsLoadingState\(\)\)/);
    assert.doesNotMatch(source, /setState\(\(current\) => current\.phase === 'ready'/);
  }
});

test('sincronização do período não cria estado novo quando as datas já estão alinhadas', () => {
  for (const source of pages) {
    assert.match(source, /current\.from === period\.from && current\.to === period\.to/);
  }
});
