import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOverviewSnapshotQueryPlan,
  buildOperationPeriodMetrics,
  buildUnavailableCeoSnapshot,
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
  assert.equal(snapshot.state.reason, 'operation_dimension_unavailable');
  assert.equal(snapshot.finance.balance, 0);
  assert.deepEqual(snapshot.support.byOwner, []);
  assert.equal(snapshot.product.status, 'unavailable');
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
