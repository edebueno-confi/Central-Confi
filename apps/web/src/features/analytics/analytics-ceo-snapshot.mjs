const CURRENT_EXECUTIVE_KPI_KEYS = [
  'mrr_total',
  'active_customers',
  'open_pipeline_amount',
  'open_backlog',
  'overdue_receivables',
  'mrr_overdue',
  'nrr',
];

const CURRENT_OPERATION_KPI_KEYS = ['open_pipeline_amount', 'open_deals', 'open_backlog'];
const PERIOD_OPERATION_KPI_KEYS = [
  'won_deals',
  'lost_deals',
  'won_amount',
  'win_rate',
  'created_tickets',
  'resolved_tickets',
];

export function buildUnavailableOperationKpiPayload() {
  const kpis = {};
  for (const key of [...CURRENT_OPERATION_KPI_KEYS, ...PERIOD_OPERATION_KPI_KEYS]) {
    kpis[key] = { state: 'unavailable', value: null, reason: 'operation_load_unavailable' };
  }
  return { kpis };
}

// Cada domínio da Visão Geral tem um contrato próprio. Um erro em Customer
// Success, por exemplo, não pode apagar Comercial e Suporte quando as leituras
// desses domínios foram concluídas. Este normalizador mantém a falha explícita
// e preserva os resultados que chegaram.
export function buildOperationKpisFromSettledLoads(settledLoads = []) {
  const loads = Array.isArray(settledLoads) ? settledLoads : [];
  const read = (result, key) => result?.status === 'fulfilled' && result.value && typeof result.value === 'object'
    ? result.value[key] ?? null
    : null;
  const failed = loads.some((result) => result?.status === 'rejected');
  const loaded = loads.some((result) => result?.status === 'fulfilled');

  return {
    failed,
    loaded,
    value: {
      period: {
        commercial: read(loads[0], 'period'),
        support: read(loads[1], 'period'),
        supportSnapshot: read(loads[2], 'period'),
      },
      current: {
        commercial: read(loads[0], 'current'),
        support: read(loads[1], 'current'),
        supportSnapshot: read(loads[2], 'current'),
      },
    },
  };
}

export function buildUnavailableCeoSnapshot() {
  const state = {
    status: 'unavailable',
    source: 'Recorte operacional',
    asOf: null,
    lastSuccessfulSyncAt: null,
    syncRunId: null,
    coverage: { expected: null, received: null },
    // `reason` é publicado direto na UI (analytics-executive.ts monta o card de
    // exceção com ele), então precisa ser frase. O identificador de máquina fica
    // em `reasonCode` para quem precisa comparar programaticamente.
    reason: 'A operação selecionada não possui dimensão publicada para esta leitura.',
    reasonCode: 'operation_dimension_unavailable',
  };

  return {
    commercial: {
      totalDeals: 0,
      openDeals: 0,
      wonDeals: 0,
      lostDeals: 0,
      openPipelineValue: 0,
      wonRevenue: 0,
      conversionRate: null,
      avgTicket: 0,
      avgSalesCycleDays: 0,
      unassignedDeals: 0,
    },
    customerSuccess: {
      activeCustomers: 0,
      assignedCustomers: 0,
      customersWithoutOwner: 0,
      healthAvailable: 0,
      riskCustomers: 0,
      source: 'Recorte operacional',
      state: { ...state },
    },
    support: {
      totalTickets: 0,
      createdTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      closedRate: 0,
      highPriorityOpen: 0,
      firstResponseSlaTracked: 0,
      closeSlaTracked: 0,
      sourceFilled: 0,
      bySource: [],
      byPipeline: [],
      byOwner: [],
      latestTicketCreatedAt: null,
    },
    finance: {
      titles: 0,
      netAmount: 0,
      balance: 0,
      overdueTitles: 0,
      overdueBalance: 0,
      matchedTitles: 0,
      unmatchedTitles: 0,
    },
    product: {
      status: 'unavailable',
      source: 'Recorte operacional',
      reason: 'Produto não possui dimensão operacional publicada.',
    },
    development: {
      status: 'unavailable',
      source: 'Recorte operacional',
      reason: 'Desenvolvimento não possui dimensão operacional publicada.',
    },
    financialAlerts: [],
    dataQuality: {
      financeTitles: 0,
      matchedFinanceTitles: 0,
      unmatchedFinanceTitles: 0,
      ambiguousFinanceTitles: 0,
      resolvedGroupTitles: 0,
      supportUnassigned: 0,
      supportWithoutSource: 0,
      financeSourceAt: null,
      hubspotSourceAt: null,
    },
    state: { ...state },
  };
}

function readPublishedOperationKpi(payload, key) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const kpis = source.kpis && typeof source.kpis === 'object' ? source.kpis : {};
  const entry = kpis[key];
  if (!entry || typeof entry !== 'object') return null;
  const state = entry.state;
  if (state && state !== 'available' && state !== 'partial') return null;
  return typeof entry.value === 'number' && Number.isFinite(entry.value) ? entry.value : null;
}

export function buildOperationPeriodMetrics(periodCommercial, periodSupport) {
  const winRate = readPublishedOperationKpi(periodCommercial, 'win_rate');
  return {
    commercial: {
      wonDeals: readPublishedOperationKpi(periodCommercial, 'won_deals'),
      lostDeals: readPublishedOperationKpi(periodCommercial, 'lost_deals'),
      wonRevenue: readPublishedOperationKpi(periodCommercial, 'won_amount'),
      conversionRate: winRate === null ? null : winRate / 100,
    },
    support: {
      createdTickets: readPublishedOperationKpi(periodSupport, 'created_tickets'),
    },
  };
}

export function getOverviewQueueMetricDefinitions() {
  return {
    current: {
      key: 'open_backlog',
      label: 'Tickets em aberto agora',
      period: 'current',
      source: 'support.open_backlog',
    },
    received: {
      key: 'created_tickets',
      label: 'Atendimentos recebidos no período',
      period: 'selected',
      source: 'support.created_tickets',
    },
  };
}

export function buildOverviewSnapshotQueryPlan(filters) {
  const base = filters && typeof filters === 'object' ? filters : {};
  return {
    period: { ...base },
    current: { ...base, from: '', to: '' },
  };
}

export function mergeExecutiveKpiPayload(periodPayload, currentPayload) {
  const period = periodPayload && typeof periodPayload === 'object' ? periodPayload : {};
  const current = currentPayload && typeof currentPayload === 'object' ? currentPayload : {};
  const periodKpis = period.kpis && typeof period.kpis === 'object' ? period.kpis : {};
  const currentKpis = current.kpis && typeof current.kpis === 'object' ? current.kpis : {};
  const kpis = { ...periodKpis };
  for (const key of CURRENT_EXECUTIVE_KPI_KEYS) {
    if (Object.prototype.hasOwnProperty.call(currentKpis, key)) kpis[key] = currentKpis[key];
  }
  return { ...period, kpis };
}

function copyKpiKeys(target, payload, keys) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const sourceKpis = source.kpis && typeof source.kpis === 'object' ? source.kpis : {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(sourceKpis, key)) target[key] = sourceKpis[key];
  }
}

export function mergeOperationKpiPayload(basePayload, periodPayloads, currentPayloads) {
  const base = basePayload && typeof basePayload === 'object' ? basePayload : {};
  const period = periodPayloads && typeof periodPayloads === 'object' ? periodPayloads : {};
  const current = currentPayloads && typeof currentPayloads === 'object' ? currentPayloads : {};
  const baseKpis = base.kpis && typeof base.kpis === 'object' ? base.kpis : {};
  const kpis = { ...baseKpis };
  copyKpiKeys(kpis, current.commercial, CURRENT_OPERATION_KPI_KEYS);
  copyKpiKeys(kpis, current.support, ['open_backlog']);
  copyKpiKeys(kpis, period.commercial, PERIOD_OPERATION_KPI_KEYS.slice(0, 4));
  copyKpiKeys(kpis, period.support, PERIOD_OPERATION_KPI_KEYS.slice(4));
  return { ...base, kpis };
}

function preferCurrent(periodValue, currentValue) {
  return currentValue === undefined ? periodValue : currentValue;
}

export function composeCeoSnapshot(periodSnapshot, currentSnapshot) {
  const period = periodSnapshot && typeof periodSnapshot === 'object' ? periodSnapshot : {};
  const current = currentSnapshot && typeof currentSnapshot === 'object' ? currentSnapshot : {};
  const periodCommercial = period.commercial && typeof period.commercial === 'object' ? period.commercial : {};
  const currentCommercial = current.commercial && typeof current.commercial === 'object' ? current.commercial : {};
  const periodSupport = period.support && typeof period.support === 'object' ? period.support : {};
  const currentSupport = current.support && typeof current.support === 'object' ? current.support : {};

  return {
    ...period,
    commercial: {
      ...periodCommercial,
      openDeals: preferCurrent(periodCommercial.openDeals, currentCommercial.openDeals),
      openPipelineValue: preferCurrent(periodCommercial.openPipelineValue, currentCommercial.openPipelineValue),
    },
    support: {
      ...periodSupport,
      openTickets: preferCurrent(periodSupport.openTickets, currentSupport.openTickets),
      highPriorityOpen: preferCurrent(periodSupport.highPriorityOpen, currentSupport.highPriorityOpen),
    },
    customerSuccess: current.customerSuccess ?? period.customerSuccess,
    finance: current.finance ?? period.finance,
    financialAlerts: current.financialAlerts ?? period.financialAlerts,
    dataQuality: current.dataQuality ?? period.dataQuality,
    product: current.product ?? period.product,
    development: current.development ?? period.development,
  };
}

// SEN-F01: `dataQuality` não possui dimensão operacional publicada e não é
// reescrito por `applyOperationScope`. Publicá-lo sob recorte exibiria o número
// consolidado — ou um zero inventado, quando a Visão Geral abre direto na
// operação — como se fosse do recorte. A decisão vive aqui, em módulo puro,
// para que a regressão consiga falhar sem renderizar React.
export function buildExecutiveIntegrityLine(dataQuality, operationScoped) {
  if (operationScoped) {
    return {
      unmatchedFinanceTitles: { value: 'Indisponível', label: 'Reconciliação do recorte indisponível' },
      supportUnassigned: { value: 'Indisponível', label: 'Responsáveis do recorte indisponíveis' },
    };
  }

  const source = dataQuality && typeof dataQuality === 'object' ? dataQuality : {};
  const unmatched = Number.isFinite(source.unmatchedFinanceTitles) ? source.unmatchedFinanceTitles : null;
  const unassigned = Number.isFinite(source.supportUnassigned) ? source.supportUnassigned : null;

  return {
    unmatchedFinanceTitles: {
      value: unmatched === null ? 'Indisponível' : unmatched.toLocaleString('pt-BR'),
      label: 'Títulos sem correspondência',
    },
    supportUnassigned: {
      value: unassigned === null ? 'Indisponível' : unassigned.toLocaleString('pt-BR'),
      label: 'Tickets sem responsável',
    },
  };
}
