import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverviewSnapshotQueryPlan,
  buildOperationKpisFromSettledLoads,
  buildOperationPeriodMetrics,
  buildUnavailableCeoSnapshot,
  buildExecutiveIntegrityLine,
  getOverviewQueueMetricDefinitions,
  buildUnavailableOperationKpiPayload,
  composeCeoSnapshot,
  mergeExecutiveKpiPayload,
  mergeOperationKpiPayload,
} from '../../apps/web/src/features/analytics/analytics-ceo-snapshot.mjs';

test('separa consulta histórica e posição atual sem perder dimensões', () => {
  const filters = { from: '2026-01-01', to: '2026-01-31', ownerId: 'owner-a', stageId: '', priority: 'high', groupCompany: 'operation-a' };
  const plan = buildOverviewSnapshotQueryPlan(filters);

  assert.deepEqual(plan.period, filters);
  assert.deepEqual(plan.current, { ...filters, from: '', to: '' });
  assert.deepEqual(filters, { from: '2026-01-01', to: '2026-01-31', ownerId: 'owner-a', stageId: '', priority: 'high', groupCompany: 'operation-a' });
});

test('preserva domínios operacionais bem-sucedidos quando uma leitura secundária falha', () => {
  const result = buildOperationKpisFromSettledLoads([
    { status: 'fulfilled', value: { period: { kpis: { won_amount: { value: 499 } } }, current: { kpis: { open_pipeline_amount: { value: 743080 } } } } },
    { status: 'fulfilled', value: { period: { kpis: { created_tickets: { value: 281 } } }, current: { kpis: { open_backlog: { value: 2794 } } } } },
    { status: 'rejected', reason: new Error('snapshot ausente') },
  ]);

  assert.equal(result.failed, true);
  assert.equal(result.loaded, true);
  assert.equal(result.value.period.commercial.kpis.won_amount.value, 499);
  assert.equal(result.value.current.support.kpis.open_backlog.value, 2794);
  assert.equal(result.value.period.supportSnapshot, null);
});

test('mantém todos os domínios indisponíveis quando nenhuma leitura operacional conclui', () => {
  const result = buildOperationKpisFromSettledLoads([
    { status: 'rejected', reason: new Error('comercial') },
    { status: 'rejected', reason: new Error('suporte') },
    { status: 'rejected', reason: new Error('customer success') },
  ]);

  assert.equal(result.failed, true);
  assert.equal(result.loaded, false);
  assert.equal(result.value.period.commercial, null);
  assert.equal(result.value.current.support, null);
});

test('mescla KPIs atuais no bloco Agora e preserva fluxo no bloco No período', () => {
  const period = {
    meta: { period_from: '2026-01-01' },
    kpis: {
      mrr_total: { value: 90 },
      open_pipeline_amount: { value: 100 },
      open_backlog: { value: 3 },
      won_amount: { value: 40 },
      received_amount: { value: 25 },
    },
  };
  const current = {
    kpis: {
      mrr_total: { value: 120 },
      open_pipeline_amount: { value: 250 },
      open_backlog: { value: 8 },
      overdue_receivables: { value: 15 },
    },
  };

  const merged = mergeExecutiveKpiPayload(period, current);
  assert.deepEqual(merged.kpis.mrr_total, { value: 120 });
  assert.deepEqual(merged.kpis.open_pipeline_amount, { value: 250 });
  assert.deepEqual(merged.kpis.open_backlog, { value: 8 });
  assert.deepEqual(merged.kpis.overdue_receivables, { value: 15 });
  assert.deepEqual(merged.kpis.won_amount, { value: 40 });
  assert.deepEqual(merged.kpis.received_amount, { value: 25 });
  assert.deepEqual(period.kpis.mrr_total, { value: 90 });
});

test('mantém fluxo histórico e usa posição atual no snapshot composto', () => {
  const period = {
    state: { status: 'empty' },
    commercial: { openDeals: 2, openPipelineValue: 100, wonDeals: 4, wonRevenue: 80 },
    support: { openTickets: 3, highPriorityOpen: 1, createdTickets: 5 },
    finance: { balance: 10 },
    financialAlerts: [{ alertKey: 'period' }],
  };
  const current = {
    commercial: { openDeals: 9, openPipelineValue: 450, wonDeals: 99 },
    support: { openTickets: 7, highPriorityOpen: 4, createdTickets: 88 },
    finance: { balance: 30 },
    financialAlerts: [{ alertKey: 'current' }],
  };

  const merged = composeCeoSnapshot(period, current);
  assert.equal(merged.state.status, 'empty');
  assert.equal(merged.commercial.openDeals, 9);
  assert.equal(merged.commercial.openPipelineValue, 450);
  assert.equal(merged.commercial.wonDeals, 4);
  assert.equal(merged.support.openTickets, 7);
  assert.equal(merged.support.createdTickets, 5);
  assert.equal(merged.finance.balance, 30);
  assert.deepEqual(merged.financialAlerts, [{ alertKey: 'current' }]);
});

test('mantém a posição operacional sem período e o movimento da operação no período', () => {
  const base = {
    kpis: {
      open_pipeline_amount: { value: 10 },
      open_backlog: { value: 2 },
      won_amount: { value: 5 },
      created_tickets: { value: 1 },
    },
  };
  const period = {
    commercial: {
      kpis: {
        open_pipeline_amount: { value: 20 },
        won_amount: { value: 80 },
        win_rate: { value: 40 },
      },
    },
    support: { kpis: { open_backlog: { value: 9 }, created_tickets: { value: 12 } } },
  };
  const current = {
    commercial: {
      kpis: {
        open_pipeline_amount: { state: 'available', value: 200 },
        open_deals: { state: 'unavailable', value: null, reason: 'no_current_operation_snapshot' },
      },
    },
    support: { kpis: { open_backlog: { state: 'unavailable', value: null, reason: 'no_current_operation_snapshot' } } },
  };

  const merged = mergeOperationKpiPayload(base, period, current);
  assert.deepEqual(merged.kpis.open_pipeline_amount, { state: 'available', value: 200 });
  assert.deepEqual(merged.kpis.open_deals, { state: 'unavailable', value: null, reason: 'no_current_operation_snapshot' });
  assert.deepEqual(merged.kpis.open_backlog, { state: 'unavailable', value: null, reason: 'no_current_operation_snapshot' });
  assert.deepEqual(merged.kpis.won_amount, { value: 80 });
  assert.deepEqual(merged.kpis.win_rate, { value: 40 });
  assert.deepEqual(merged.kpis.created_tickets, { value: 12 });
});

test('representa ausência operacional sem reaproveitar o consolidado', () => {
  const unavailable = buildUnavailableOperationKpiPayload();
  const merged = mergeOperationKpiPayload(
    { kpis: { open_pipeline_amount: { state: 'available', value: 999 }, open_backlog: { state: 'available', value: 77 } } },
    { commercial: unavailable, support: unavailable },
    { commercial: unavailable, support: unavailable },
  );

  assert.deepEqual(merged.kpis.open_pipeline_amount, { state: 'unavailable', value: null, reason: 'operation_load_unavailable' });
  assert.deepEqual(merged.kpis.open_backlog, { state: 'unavailable', value: null, reason: 'operation_load_unavailable' });
});

test('cria base honesta quando a Visão Geral abre diretamente em uma operação', () => {
  const snapshot = buildUnavailableCeoSnapshot();

  assert.equal(snapshot.state.status, 'unavailable');
  assert.equal(snapshot.state.reasonCode, 'operation_dimension_unavailable');
  assert.deepEqual(snapshot.support.byOwner, []);
  assert.equal(snapshot.product.status, 'unavailable');
  assert.equal(snapshot.development.status, 'unavailable');
});

// SEN-F01: a linha de "Governança e cobertura" não tem dimensão operacional e
// não é reescrita por `applyOperationScope`. Sob recorte ela precisa recusar-se
// a publicar número, seja o consolidado herdado, seja o zero da base indisponível.
test('a linha de governança não publica número consolidado sob recorte operacional', () => {
  const consolidado = { unmatchedFinanceTitles: 1234, supportUnassigned: 57 };

  const semRecorte = buildExecutiveIntegrityLine(consolidado, false);
  assert.equal(semRecorte.unmatchedFinanceTitles.value, (1234).toLocaleString('pt-BR'));
  assert.equal(semRecorte.supportUnassigned.value, '57');
  assert.equal(semRecorte.unmatchedFinanceTitles.label, 'Títulos sem correspondência');

  const comRecorte = buildExecutiveIntegrityLine(consolidado, true);
  assert.equal(comRecorte.unmatchedFinanceTitles.value, 'Indisponível');
  assert.equal(comRecorte.supportUnassigned.value, 'Indisponível');
  assert.match(comRecorte.unmatchedFinanceTitles.label, /recorte/i);
  assert.match(comRecorte.supportUnassigned.label, /recorte/i);
});

test('o zero da base indisponível nunca é publicado como fato sob recorte', () => {
  const { dataQuality } = buildUnavailableCeoSnapshot();
  const linha = buildExecutiveIntegrityLine(dataQuality, true);

  assert.equal(linha.unmatchedFinanceTitles.value, 'Indisponível');
  assert.equal(linha.supportUnassigned.value, 'Indisponível');
  assert.notEqual(linha.unmatchedFinanceTitles.value, '0');
  assert.notEqual(linha.supportUnassigned.value, '0');
});

test('a linha de governança tolera dataQuality ausente sem inventar zero', () => {
  const linha = buildExecutiveIntegrityLine(null, false);

  assert.equal(linha.unmatchedFinanceTitles.value, 'Indisponível');
  assert.equal(linha.supportUnassigned.value, 'Indisponível');
});

// SEN-F02: `state.reason` é publicado direto no card de exceção do executivo,
// então não pode ser um identificador de máquina.
test('o motivo publicado da base indisponível é frase, não token', () => {
  const { reason } = buildUnavailableCeoSnapshot().state;

  assert.equal(typeof reason, 'string');
  assert.doesNotMatch(reason, /^[a-z0-9]+(_[a-z0-9]+)+$/, 'reason não pode ser snake_case de máquina');
  assert.ok(reason.includes(' '), 'reason precisa ser legível para o usuário final');
});

test('não usa o consolidado quando o movimento operacional está ausente', () => {
  const metrics = buildOperationPeriodMetrics(
    {
      kpis: {
        won_deals: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' },
        lost_deals: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' },
        won_amount: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' },
        win_rate: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' },
      },
    },
    { kpis: { created_tickets: { state: 'unavailable', value: null, reason: 'operation_load_unavailable' } } },
  );

  assert.deepEqual(metrics, {
    commercial: { wonDeals: null, lostDeals: null, wonRevenue: null, conversionRate: null },
    support: { createdTickets: null },
  });
});

test('diferencia posição corrente de volume recebido no período', () => {
  const definitions = getOverviewQueueMetricDefinitions();

  assert.notEqual(definitions.current.key, definitions.received.key);
  assert.notEqual(definitions.current.label, definitions.received.label);
  assert.equal(definitions.current.period, 'current');
  assert.equal(definitions.received.period, 'selected');
  assert.equal(definitions.current.source, 'support.open_backlog');
  assert.equal(definitions.received.source, 'support.created_tickets');
});
