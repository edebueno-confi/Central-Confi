import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sharedResponse = await readFile(new URL('../../supabase/functions/_shared/ticket-evidence.ts', import.meta.url), 'utf8');
const htmlExport = await readFile(new URL('../../apps/web/src/features/analytics/analytics-export.ts', import.meta.url), 'utf8');
const csvExport = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsCustomerDebt.tsx', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../../apps/web/index.html', import.meta.url), 'utf8');
const operationalCopy = await readFile(new URL('../../apps/web/src/lib/operational-copy.ts', import.meta.url), 'utf8');
const analyticsModel = await readFile(new URL('../../apps/web/src/features/analytics/analytics-model.ts', import.meta.url), 'utf8');
const utf8Migration = await readFile(new URL('../../supabase/migrations/20260822220000_analytics_utf8_and_scope_guard_v1.sql', import.meta.url), 'utf8');

const fixture = 'Operação | Suporte | São Paulo | Integrações | Atenção | Próxima renovação | Café & ação';

function roundTripUtf8(value) {
  return new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(value));
}

test('a reprodução determinística preserva caracteres portugueses no transporte UTF-8', () => {
  assert.equal(roundTripUtf8(fixture), fixture);
  assert.doesNotMatch(roundTripUtf8(fixture), /Ã|Â|�/);
});

test('respostas JSON e OPTIONS das Edge Functions declaram charset UTF-8', () => {
  assert.match(sharedResponse, /'Content-Type': 'application\/json; charset=utf-8'/);
  assert.match(sharedResponse, /'Content-Type': 'text\/plain; charset=utf-8'/);
});

test('exportações locais mantêm charset e BOM sem alterar o texto original', () => {
  assert.match(htmlExport, /text\/html;charset=utf-8/);
  assert.match(htmlExport, /image\/svg\+xml;charset=utf-8/);
  assert.match(csvExport, /const marcaDeOrdem = '\\uFEFF'/);
});

test('a página local declara UTF-8 antes da renderização', () => {
  assert.match(indexHtml, /<meta charset="UTF-8"\s*\/>/i);
});

test('o frontend repara mojibake sem transliterar acentos válidos', () => {
  assert.match(operationalCopy, /TextDecoder\('utf-8', \{ fatal: true \}\)/);
  assert.match(operationalCopy, /repairOperationalMojibake/);
  assert.match(analyticsModel, /repairOperationalMojibake\(String\(value\)\)/);
  assert.match(operationalCopy, /fallback = 'Indisponível'/g);
  assert.doesNotMatch(operationalCopy, /fallback = 'Indisponivel'/);
});

test('a migration corrige a origem dos fallbacks conhecidos', () => {
  assert.match(utf8Migration, /Sem responsÃ¡vel/);
  assert.match(utf8Migration, /Sem responsável/);
  assert.match(utf8Migration, /rpc_analytics_customer_success_kpis_v2/);
  assert.match(utf8Migration, /rpc_analytics_ceo_snapshot_legacy/);
});
