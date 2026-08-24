import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCeoPage.tsx', 'utf8');
const domains = fs.readFileSync('apps/web/src/features/analytics/analytics-domains.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260727233034_dashboard_02_executive_integrated_contract_v1.sql', 'utf8');
const contract = fs.readFileSync('packages/contracts/src/analytics.ts', 'utf8');

test('MVP-UX-02 mantém áreas executivas e une Produto/Desenvolvimento', () => {
  for (const key of ['commercial', 'customer_success', 'support', 'finance', 'product-development']) assert.match(domains, new RegExp(`key: '${key}'`));
  assert.match(page, /Customer Success/);
  assert.doesNotMatch(page, /Fila operacional|Governança e cobertura/);
});

test('Produto e Desenvolvimento permanecem fora da superfície publicada', () => {
  assert.match(migration, /'product'.*'not_configured'/s);
  assert.match(migration, /'development'.*'not_configured'/s);
  assert.doesNotMatch(page, /Produto|Desenvolvimento/);
});

test('contrato de estado diferencia zero real de vazio', () => {
  assert.match(contract, /'zero'/);
  assert.match(migration, /customer_success/);
  assert.match(migration, /support_unassigned/);
});

test('migration executiva é forward-only e não destrutiva', () => {
  assert.doesNotMatch(migration, /\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i);
  assert.match(migration, /create or replace function public\.rpc_analytics_ceo_snapshot/);
  assert.match(migration, /grant execute on function public\.rpc_analytics_ceo_snapshot/);
});
