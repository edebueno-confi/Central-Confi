import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';

import {
  describeKpiBasis,
  describeKpiLimitation,
  describeKpiState,
  formatKpiValue,
  readKpi,
  readKpiMeta,
  summarizeWarnings,
  toAnalyticsBlockState,
} from '../../apps/web/src/features/analytics/analytics-kpi-contract.mjs';

const csPageSource = await readFile(
  new URL('../../apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx', import.meta.url),
  'utf8',
);
const contractSource = await readFile(
  new URL('../../apps/web/src/features/analytics/analytics-kpi-contract.mjs', import.meta.url),
  'utf8',
);
const foundationMigration = await readFile(
  new URL('../../supabase/migrations/20260807120000_analytics_kpi_foundation_v1.sql', import.meta.url),
  'utf8',
);
const readModelMigration = await readFile(
  new URL('../../supabase/migrations/20260807130000_analytics_kpi_read_models_v1.sql', import.meta.url),
  'utf8',
);

const payload = {
  meta: {
    source: 'hubspot+omie',
    freshness_at: '2026-08-07T03:11:41.526994+00:00',
    coverage_percent: 56.25,
    is_partial: true,
    warning_codes: ['missing_hubspot_omie_mapping', 'associations_missing', 'associations_missing'],
  },
  kpis: {
    active_customers: { state: 'available', value: 320, basis: 'company_status_now', reason: null },
    mrr_total: { state: 'partial', value: 335849.1, basis: 'company_recurring_revenue_now', reason: 'mrr_partial_coverage' },
    win_rate: { state: 'unavailable', value: null, basis: 'deal_closed_at', reason: 'no_closed_deals_in_period' },
    nrr: { state: 'awaiting_history', value: null, basis: 'customer_status_transition', reason: 'history_insufficient' },
  },
};

test('ausência de fonte nunca é apresentada como zero', () => {
  assert.equal(formatKpiValue(readKpi(payload, 'win_rate'), 'percent'), 'Indisponível');
  assert.equal(formatKpiValue(readKpi(payload, 'nrr'), 'percent'), 'Aguardando histórico');
  assert.equal(formatKpiValue(readKpi(payload, 'inexistente'), 'count'), 'Indisponível');
  // Zero real permanece zero: o contrato distingue ausência de valor nulo.
  const realZero = { kpis: { x: { state: 'available', value: 0, basis: 'ticket_created_at' } } };
  assert.equal(formatKpiValue(readKpi(realZero, 'x'), 'count'), '0');
});

test('valor sem número não pode ser publicado como disponível', () => {
  const inconsistent = { kpis: { x: { state: 'available', value: null, basis: 'deal_closed_at' } } };
  assert.equal(readKpi(inconsistent, 'x').state, 'unavailable');
  const malformed = { kpis: { x: 'não é um objeto' } };
  assert.equal(readKpi(malformed, 'x').state, 'unavailable');
  assert.equal(readKpi(null, 'x').state, 'unavailable');
});

test('formatação usa a unidade correta de cada indicador', () => {
  const entry = (value) => ({ state: 'available', value, basis: null, reason: null });
  // O separador entre simbolo e valor em pt-BR e espaco nao separavel (U+00A0).
  const nbsp = String.fromCharCode(0x00a0);
  assert.equal(formatKpiValue(entry(335849.1), 'currency').split(nbsp).join(' '), 'R$ 335.849');
  assert.equal(formatKpiValue(entry(12.12), 'percent'), '12,1%');
  assert.equal(formatKpiValue(entry(8.5), 'days'), '8,5 dias');
  assert.equal(formatKpiValue(entry(1), 'days'), '1 dia');
  assert.equal(formatKpiValue(entry(2841), 'count'), '2.841');
});

test('limitações são traduzidas para linguagem gerencial, sem código técnico', () => {
  const mrr = describeKpiLimitation(readKpi(payload, 'mrr_total'));
  assert.match(mrr, /clientes ativos/);
  assert.doesNotMatch(mrr, /mrr_partial_coverage/);

  const nrr = describeKpiLimitation(readKpi(payload, 'nrr'));
  assert.match(nrr, /histórico/);
  assert.doesNotMatch(nrr, /history_insufficient/);

  // Indicador íntegro não recebe frase de limitação.
  assert.equal(describeKpiLimitation(readKpi(payload, 'active_customers')), '');
});

test('código de motivo desconhecido não vaza para a interface', () => {
  const unknown = { kpis: { x: { state: 'unavailable', value: null, basis: null, reason: 'hs_internal_prop_missing' } } };
  const message = describeKpiLimitation(readKpi(unknown, 'x'));
  assert.doesNotMatch(message, /hs_internal_prop_missing/);
  assert.match(message, /ressalva/i);
});

// V-01: a frase anterior — "limitação de origem registrada pela equipe
// responsável" — era exibida quando o indicador simplesmente não tinha sido
// carregado. Afirmava um fato que o painel não conhece, culpava uma equipe e
// não dava ação nenhuma ao leitor.
test('o painel não inventa limitação de origem quando o indicador não veio', () => {
  const message = describeKpiLimitation(readKpi({ kpis: {} }, 'open_pipeline_amount'));

  assert.doesNotMatch(message, /limitação de origem/i);
  assert.doesNotMatch(message, /equipe responsável/i);
  assert.match(message, /não foi possível confirmar/i);
  assert.match(message, /atualize/i);
});

// V-02: este código era emitido pelo próprio frontend e não tinha tradução,
// então caía no aviso genérico e virava "limitação de origem".
test('falha de carregamento da operação é declarada como falha, não como limitação', () => {
  const payload = { kpis: { open_pipeline_amount: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' } } };
  const message = describeKpiLimitation(readKpi(payload, 'open_pipeline_amount'));

  assert.doesNotMatch(message, /limitação de origem/i);
  assert.doesNotMatch(message, /operation_load_unavailable/);
  assert.match(message, /não foi possível carregar/i);
  assert.match(message, /operação selecionada/i);
});

// As duas causas não podem colapsar numa frase só: ausência real de dimensão
// é característica do dado; falha de leitura é transitória e tem ação.
test('ausência de dimensão operacional continua distinguível de falha de leitura', () => {
  const semDimensao = describeKpiLimitation(readKpi(
    { kpis: { mrr_total: { state: 'unavailable', value: null, reason: 'operation_dimension_unavailable' } } },
    'mrr_total',
  ));
  const falhaDeLeitura = describeKpiLimitation(readKpi(
    { kpis: { mrr_total: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' } } },
    'mrr_total',
  ));

  assert.match(semDimensao, /dimensão publicada/i);
  assert.notEqual(semDimensao, falhaDeLeitura);
});

test('cada indicador declara a coorte de data usada', () => {
  assert.match(describeKpiBasis(readKpi(payload, 'active_customers')), /data de hoje/);
  assert.match(describeKpiBasis(readKpi(payload, 'win_rate')), /encerramento da negociação/);
  assert.equal(describeKpiBasis({ basis: null }), '');
});

test('selo de estado distingue parcial, indisponível e aguardando histórico', () => {
  assert.equal(describeKpiState(readKpi(payload, 'active_customers')), '');
  assert.equal(describeKpiState(readKpi(payload, 'mrr_total')), 'Dados parciais');
  assert.equal(describeKpiState(readKpi(payload, 'win_rate')), 'Indisponível');
  assert.equal(describeKpiState(readKpi(payload, 'nrr')), 'Aguardando histórico');
});

test('avisos são deduplicados e traduzidos', () => {
  const warnings = summarizeWarnings(payload);
  assert.equal(warnings.length, 2);
  for (const warning of warnings) {
    assert.doesNotMatch(warning, /_/);
  }
});

test('metadados de confiabilidade são lidos sem expor nomes internos', () => {
  const meta = readKpiMeta(payload);
  assert.equal(meta.coveragePercent, 56.25);
  assert.equal(meta.isPartial, true);
  assert.equal(meta.freshnessAt, '2026-08-07T03:11:41.526994+00:00');
  assert.deepEqual(readKpiMeta(null).warnings, []);
});

test('estado do bloco reflete cobertura parcial', () => {
  assert.equal(toAnalyticsBlockState(payload, 'HubSpot').status, 'partial');
  assert.equal(toAnalyticsBlockState({}, 'HubSpot').status, 'unavailable');
  const clean = { meta: { warning_codes: [], is_partial: false }, kpis: { a: { state: 'available', value: 1 } } };
  assert.equal(toAnalyticsBlockState(clean, 'HubSpot').status, 'fresh');
});

test('a tela de carteira não expõe nome de propriedade, endpoint ou identificador técnico', () => {
  const forbidden = [
    'aftersale___mrr',
    'status_do_cliente___aftersale',
    'status_do_contrato',
    'cs_owner___aftersale',
    'hubspot_owner_id',
    'hs_pipeline',
    'ListarContasReceber',
    'app.omie.com.br',
    'Edge Function',
    'service_role',
  ];
  for (const term of forbidden) {
    assert.equal(csPageSource.includes(term), false, `a tela não pode conter "${term}"`);
    assert.equal(contractSource.includes(term), false, `o contrato de apresentação não pode conter "${term}"`);
  }
});

test('a fonte de MRR e a regra de cliente ativo são configuração, não constante no frontend', () => {
  assert.match(foundationMigration, /analytics_kpi_settings/);
  assert.match(foundationMigration, /'OMIE_CONTRACTS', 'HUBSPOT_RECURRING_REVENUE', 'UNRESOLVED'/);
  // O frontend não decide a regra: ele apenas renderiza o que o backend resolveu.
  assert.equal(csPageSource.includes('UNRESOLVED'), false);
  assert.equal(csPageSource.includes("=== 'Cliente'"), false);
});

test('a ligação HubSpot ↔ OMIE usa apenas cadastro fiscal normalizado', () => {
  assert.match(foundationMigration, /regexp_replace\(coalesce\(c\.tax_id, ''\), '\[\^0-9\]', '', 'g'\)/);
  const linkSection = foundationMigration.slice(
    foundationMigration.indexOf('vw_analytics_customer_financial_link'),
  );
  // Nenhum match por nome, domínio ou e-mail dentro da view de ligação.
  assert.equal(/on\s+a\.company_name\s*=/.test(linkSection), false);
  assert.equal(/on\s+.*\.domain\s*=/.test(linkSection), false);
});

test('os read models declaram os bloqueios reais da conta', () => {
  for (const code of [
    'ticket_close_date_missing',
    'ticket_first_response_missing',
    'associations_missing',
    'activity_dates_missing',
    'history_insufficient',
  ]) {
    assert.match(readModelMigration, new RegExp(code), `o read model precisa declarar ${code}`);
  }
});

test('nenhum read model é exposto a usuário anônimo', () => {
  const grants = readModelMigration.match(/grant execute on function[^;]+;/g) ?? [];
  assert.ok(grants.length >= 4);
  for (const grant of grants) {
    assert.equal(/\banon\b/.test(grant), false, `grant não pode incluir anon: ${grant}`);
  }
});

test('todo motivo publicado pelo backend tem tradução própria', () => {
  // O QA visual pegou "Este indicador tem uma limitação de origem registrada
  // pela equipe responsável" na tela: um motivo novo tinha sido publicado pelo
  // read model sem entrada no contrato, e caiu no texto genérico. A frase não
  // dizia nada a quem lia nem a quem poderia resolver.
  //
  // A varredura olha apenas blocos `case ... end as reason`, que é onde os read
  // models de KPI decidem o motivo. Uma regex mais larga pegaria qualquer
  // literal do arquivo e o teste viraria ruído.
  const motivos = new Set();
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const arquivo of readdirSync(dir)) {
    if (!arquivo.endsWith('.sql')) continue;
    const sql = readFileSync(new URL(arquivo, dir), 'utf8');
    for (const bloco of sql.matchAll(/case\s+when[\s\S]{0,900}?end as reason/g)) {
      for (const literal of bloco[0].matchAll(/then\s+'([a-z][a-z0-9_]{6,})'/g)) {
        motivos.add(literal[1]);
      }
    }
  }

  // `unavailable`, `partial` e `awaiting_history` são estados, não motivos: eles
  // aparecem no mesmo `case` e precisam sair. Os de autorização pertencem ao
  // contexto de acesso, que tem o próprio vocabulário.
  const ESTADOS = new Set(['unavailable', 'partial', 'available', 'awaiting_history']);
  const ACESSO = new Set([
    'profile_missing', 'profile_inactive', 'membership_revoked',
    'returns_portal_disabled', 'no_active_tenant',
  ]);
  for (const nome of [...motivos]) {
    if (ESTADOS.has(nome) || ACESSO.has(nome)) motivos.delete(nome);
  }

  assert.ok(motivos.size >= 5, 'a varredura precisa encontrar motivos reais');

  const generico = describeKpiLimitation({ state: 'partial', reason: '__inexistente__' });
  const semTraducao = [...motivos].filter(
    (motivo) => describeKpiLimitation({ state: 'partial', reason: motivo }) === generico,
  );

  assert.deepEqual(semTraducao, [], `motivos sem frase própria: ${semTraducao.join(', ')}`);
});
