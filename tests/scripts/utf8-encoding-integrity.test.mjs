import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { repairOperationalMojibake, sanitizeOperationalVisibleText } from '../../apps/web/src/lib/operational-copy.ts';

const sharedResponse = await readFile(new URL('../../supabase/functions/_shared/ticket-evidence.ts', import.meta.url), 'utf8');
const htmlExport = await readFile(new URL('../../apps/web/src/features/analytics/analytics-export.ts', import.meta.url), 'utf8');
const csvExport = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsCustomerDebt.tsx', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../../apps/web/index.html', import.meta.url), 'utf8');
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

// SEN-F03: a versão anterior destes testes apenas inspecionava o texto-fonte
// (`assert.match(operationalCopy, /TextDecoder\(...\)/)`), então passava mesmo
// que a função nunca fosse chamada ou estivesse errada. Agora exercitamos o
// comportamento.
test('repairOperationalMojibake recupera texto corrompido em UTF-8', () => {
  assert.equal(repairOperationalMojibake('Sem responsÃ¡vel'), 'Sem responsável');
  assert.equal(repairOperationalMojibake('OperaÃ§Ã£o'), 'Operação');
  assert.equal(repairOperationalMojibake('IntegraÃ§Ãµes'), 'Integrações');
  assert.equal(repairOperationalMojibake('AtenÃ§Ã£o'), 'Atenção');
});

test('repairOperationalMojibake preserva acentuação já íntegra', () => {
  for (const intact of ['instância', 'Câmara Municipal', 'ângulo', 'Atenção', 'âncora ótima', 'Café & ação', 'Sem responsável']) {
    assert.equal(repairOperationalMojibake(intact), intact, `não pode alterar ${intact}`);
  }
});

test('repairOperationalMojibake é seguro para vazio, nulo e texto sem marcador', () => {
  assert.equal(repairOperationalMojibake(null), '');
  assert.equal(repairOperationalMojibake(undefined), '');
  assert.equal(repairOperationalMojibake(''), '');
  assert.equal(repairOperationalMojibake('Sem responsavel'), 'Sem responsavel');
});

test('sanitizeOperationalVisibleText devolve fallback acentuado e repara a entrada', () => {
  assert.equal(sanitizeOperationalVisibleText(null), 'Indisponível');
  assert.equal(sanitizeOperationalVisibleText('OperaÃ§Ã£o'), 'Operação');
  assert.doesNotMatch(sanitizeOperationalVisibleText(null), /Indisponivel/);
});

test('o modelo de analytics aplica o reparo em todo texto normalizado', () => {
  assert.match(analyticsModel, /repairOperationalMojibake\(String\(value\)\)/);
});

// A eficácia real da migration só é observável no banco, e este ambiente não
// tem rota até ele — ver "Limitações" no REVIEW. O que dá para garantir aqui é
// que o arquivo não destrói a função nem grava o literal corrompido de volta.
test('a migration troca literais sem recriar a função do zero', () => {
  assert.match(utf8Migration, /pg_get_functiondef/);
  assert.match(utf8Migration, /replace\(v_definition, 'Sem responsavel', 'Sem responsável'\)/);
  assert.doesNotMatch(utf8Migration, /drop\s+function/i);
  assert.doesNotMatch(utf8Migration, /'Sem responsÃ¡vel'\s*\)/);
  assert.match(utf8Migration, /rpc_analytics_customer_success_kpis_v2/);
  assert.match(utf8Migration, /rpc_analytics_ceo_snapshot_legacy/);
});
