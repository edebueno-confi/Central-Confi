import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type {
  AnalyticsDataStatus,
  AnalyticsBlockState,
  AnalyticsSourceStatusPayload,
} from '@genius-support-os/contracts';
import { getAnalyticsSourceStatus, getCeoHistory, getCeoSnapshot, getCommercialKpisV2ForOverview, getCsSnapshotForOverview, getExecutiveKpisV2, getSupportKpisV2ForOverview, listAnalyticsSourceConfig } from "./analytics-api";
import {
  analyticsGlobalToBlockState,
  analyticsSourceToBlockState,
  DEFAULT_ANALYTICS_FILTERS,
  type AnalyticsFilters,
  type AnalyticsPageProps,
  type AnalyticsSourceConfig,
  type CeoHistory,
  type CeoSnapshot,
  type CsSnapshot,
} from "./analytics-model";
import { AnalyticsFilters as Filters } from "./AnalyticsFilters";
import { AnalyticsOperationScope } from "./AnalyticsOperationScope";
import {
  AnalyticsLoadingState,
  AnalyticsRetryAction,
  AnalyticsStateBadge,
  formatCountLabel,
} from "./analytics-ui";
import { resolveAnalyticsPeriod } from "./analytics-periods";
import {
  buildExecutiveExceptions,
  rankExecutivePipelines,
} from "./analytics-executive";
import { analyticsHref } from "./analytics-navigation";
import { AnalyticsBoardLimitations, AnalyticsKpiBoard, type BoardBand } from "./AnalyticsKpiBoard";
import { AnalyticsDataCoveragePanel, analyticsCoverageStatus, type AnalyticsCoverageItem } from './AnalyticsDataCoveragePanel';
import { AnalyticsTrendPanel } from './AnalyticsTrendPanel';
import { readKpi } from './analytics-kpi-contract.mjs';
import { buildExecutiveIntegrityLine, buildOperationKpisFromSettledLoads, buildOperationPeriodMetrics, buildUnavailableCeoSnapshot, buildUnavailableOperationKpiPayload, getOverviewQueueMetricDefinitions, mergeOperationKpiPayload } from './analytics-ceo-snapshot.mjs';

const STATUS_LABELS: Record<AnalyticsDataStatus, string> = {
  fresh: "Dados atualizados",
  stale: "Dados podem estar atrasados",
  partial: "Cobertura parcial",
  never_synced: "Sincronização ainda não realizada",
  empty: "Sem registros no recorte",
  zero: "Zero real no recorte",
  not_configured: "Fonte não configurada",
  syncing: "Sincronização em andamento",
  unavailable: "Fonte indisponível",
  failed: "Falha na sincronização",
  error: "Falha na sincronização",
  unavailable_source: "Fonte indisponível",
  unavailable_contract: "Contrato indisponível",
  unavailable_period: "Período indisponível",
};

type MetricDelta = {
  label: string;
  tone: "positive" | "negative" | "neutral";
} | null;

type OperationCurrentAvailability = {
  commercialPipeline: boolean;
  commercialDeals: boolean;
  supportOpen: boolean;
};

type OperationPeriodAvailability = {
  commercialWonDeals: boolean;
  commercialLostDeals: boolean;
  commercialWonRevenue: boolean;
  commercialConversion: boolean;
  supportCreated: boolean;
};
// O Resumo reusa os read models de cada area em vez de recalcular. Isso impede
// que a mesma metrica apareca com valores diferentes entre a visao geral e a
// tela da area, que e a falha classica de dashboards executivos.
const EXECUTIVE_BANDS: BoardBand[] = [
  {
    title: 'Agora',
    note: 'Posição na data de hoje, em todas as áreas.',
    items: [
      { key: 'mrr_total', kind: 'currency', note: 'Recorrência da base ativa' },
      { key: 'active_customers', kind: 'count', note: 'Clientes na carteira' },
      { key: 'open_pipeline_amount', kind: 'currency', note: 'Em negociação' },
      { key: 'open_backlog', kind: 'count', note: 'Atendimentos aguardando' },
    ],
  },
  {
    title: 'No período',
    note: 'Movimento dentro do recorte selecionado acima.',
    items: [
      { key: 'won_amount', kind: 'currency', note: 'Negócios ganhos' },
      { key: 'win_rate', kind: 'percent', note: 'Sobre o que foi encerrado' },
      { key: 'created_tickets', kind: 'count', note: 'Atendimentos abertos' },
      { key: 'received_amount', kind: 'currency', note: 'Entradas efetivas' },
    ],
  },
  {
    title: 'Atenção executiva',
    note: 'Riscos financeiros e de retenção que pedem decisão.',
    dense: true,
    items: [
      { key: 'overdue_receivables', kind: 'currency', note: 'Vencido e não recebido', alertWhenPositive: true },
      { key: 'mrr_overdue', kind: 'currency', note: 'Recorrência de clientes em atraso', alertWhenPositive: true },
      { key: 'nrr', kind: 'percent' },
    ],
  },
];

const OVERVIEW_QUEUE_METRICS = getOverviewQueueMetricDefinitions();

const EMPTY_OPERATION_SNAPSHOT: CsSnapshot = {
  kpis: { totalTickets: 0, openTickets: 0, closedTickets: 0, closedRate: 0 },
  byStatus: [],
  monthly: [],
  bySource: [],
  byPipeline: [],
  byOwner: [],
  latestTicketCreatedAt: null,
};

const EMPTY_OPERATION_KPIS = {
  period: {
    commercial: buildUnavailableOperationKpiPayload(),
    support: buildUnavailableOperationKpiPayload(),
    supportSnapshot: EMPTY_OPERATION_SNAPSHOT,
  },
  current: {
    commercial: buildUnavailableOperationKpiPayload(),
    support: buildUnavailableOperationKpiPayload(),
    supportSnapshot: EMPTY_OPERATION_SNAPSHOT,
  },
};

export function AnalyticsCeoPage({
  sharedPeriod,
  onSharedPeriodChange,
  sharedOperation,
  onSharedOperationChange,
  onRetry,
  isDashboardViewer = false,
  sourceStatus,
  canSyncSources = false,
  syncSources,
  syncBusy = false,
}: AnalyticsPageProps) {
  const period = sharedPeriod ?? resolveAnalyticsPeriod("month");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...DEFAULT_ANALYTICS_FILTERS,
    ...period,
  });
  const [result, setResult] = useState<{
    loading: boolean;
    data?: CeoSnapshot;
    history?: CeoHistory;
    sourceStatus?: AnalyticsSourceStatusPayload;
    error?: boolean;
  }>({ loading: true });
  const [refreshing, setRefreshing] = useState(false);
  const [executiveKpis, setExecutiveKpis] = useState<unknown>(null);
  const [operationKpis, setOperationKpis] = useState<{
    period: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
    current: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
  } | null>(null);
  // V-03: sem isto, uma falha de carregamento e uma ausência real de dimensão
  // ficam indistinguíveis na tela — as duas viravam onze cards "Indisponível".
  const [operationLoadFailed, setOperationLoadFailed] = useState(false);
  const [operationLoadPartial, setOperationLoadPartial] = useState(false);
  // Refazer a leitura com os mesmos filtros: o memo de filtros é estável por
  // valor, então sem este contador o efeito nunca voltaria a rodar.
  const [operationRetryToken, setOperationRetryToken] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [configuredPipelines, setConfiguredPipelines] = useState<AnalyticsSourceConfig[]>([]);
  const [groupCompany, setGroupCompany] = useState<string>(sharedOperation ?? '');
  const stableFilters = useMemo(
    () => ({
      from: filters.from,
      to: filters.to,
      ownerId: filters.ownerId,
      stageId: filters.stageId,
      priority: filters.priority,
    }),
    [filters.from, filters.to, filters.ownerId, filters.stageId, filters.priority],
  );
  useEffect(() => {
    if (sharedOperation !== undefined && sharedOperation !== groupCompany) {
      setGroupCompany(sharedOperation);
    }
  }, [groupCompany, sharedOperation]);

  const handleGroupCompanyChange = (value: string) => {
    setGroupCompany(value);
    onSharedOperationChange?.(value);
  };

  useEffect(() => {
    listAnalyticsSourceConfig()
      .then((configs) => setConfiguredPipelines(configs))
      .catch(() => setConfiguredPipelines([]));
  }, []);

  useEffect(
    () => setFilters((current) => ({ ...current, ...period })),
    [period.from, period.to],
  );
  useEffect(() => {
    let cancelled = false;
    setOperationKpis(null);
    setOperationLoadFailed(false);
    setOperationLoadPartial(false);
    if (groupCompany) setExecutiveKpis(null);
    setRefreshing(true);
    setResult((current) =>
      current.data
        ? { ...current, loading: false, error: undefined }
        : { loading: true },
    );

    // Um recorte operacional não deve chamar o snapshot executivo consolidado.
    // Além de não possuir a dimensão de operação para todos os indicadores,
    // essa RPC percorre duas janelas pesadas e era a origem dos timeouts/500
    // quando o usuário apenas queria After Sale, Confi ou Neotrust.
    if (groupCompany) {
      void (async () => {
        const liveSourceStatus = sourceStatus ?? await getAnalyticsSourceStatusSafe();
        if (cancelled) return;
        // SEN-F01: nunca reaproveitar `current.data` aqui. Se o usuário abriu o
        // consolidado antes de escolher a operação, aquele snapshot continuaria
        // vivo e todo campo sem dimensão operacional (dataQuality, product,
        // development) seria publicado como se fosse do recorte. A base sob
        // recorte é sempre a indisponível; só o que tem read model operacional
        // é preenchido depois, por `applyOperationScope`.
        setResult(() => ({
          loading: false,
          data: buildUnavailableCeoSnapshot(),
          sourceStatus: liveSourceStatus ?? sourceStatus,
        }));
        setRefreshing(false);
        const settledLoads = await Promise.allSettled([
          getCommercialKpisV2ForOverview(stableFilters, groupCompany),
          getSupportKpisV2ForOverview(stableFilters, groupCompany),
          getCsSnapshotForOverview(stableFilters, [], groupCompany),
        ]);
        if (!cancelled) {
          const operationLoad = buildOperationKpisFromSettledLoads(settledLoads);
          setOperationKpis(operationLoad.value);
          setOperationLoadFailed(operationLoad.failed);
          setOperationLoadPartial(operationLoad.failed && operationLoad.loaded);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // O histórico é derivado do mesmo snapshot executivo e não participa do
    // caminho crítico da abertura. Carregá-lo em paralelo fazia o banco
    // executar novamente duas leituras pesadas enquanto a visão principal
    // ainda estava indisponível. Uma falha histórica não deve apagar uma
    // visão executiva já carregada; o painel de tendência permanece vazio,
    // com o restante do cockpit utilizável.
    getCeoSnapshot(stableFilters)
      .then(async (data) => {
        // O status da fonte é complementar. Só é lido depois do snapshot para
        // evitar concorrência entre duas leituras que acessam o mesmo estado
        // de ingestão durante a abertura do painel.
        const liveSourceStatus = sourceStatus ?? await getAnalyticsSourceStatusSafe();
        if (cancelled) return;
        setResult({ loading: false, data, sourceStatus: liveSourceStatus ?? sourceStatus });
        setRefreshing(false);
        // Consultas secundárias entram em fila depois do snapshot principal.
        // O painel já está utilizável quando elas começam, e o Supabase não
        // recebe sete leituras pesadas concorrentes na abertura.
        void (async () => {
          let executiveLoaded = false;
          if (!groupCompany) {
            try {
              // Em um recorte operacional, Comercial, Suporte e Customer
              // Success já são carregados por seus read models específicos.
              // Repetir o resumo executivo global aqui acrescenta duas RPCs
              // pesadas por janela e não altera os valores que serão exibidos.
              const payload = await getExecutiveKpisV2(stableFilters);
              executiveLoaded = true;
              if (!cancelled) setExecutiveKpis(payload);
            } catch {
              if (!cancelled) setExecutiveKpis(null);
            }
          }
          if (cancelled) return;
          if (!executiveLoaded) return;
          try {
            const history = await getCeoHistory(stableFilters);
            if (!cancelled) setResult((current) => ({ ...current, history }));
          } catch {
            // Histórico é complementar. Sua falha não derruba o dashboard.
          }
        })();
      })
      .catch(() => {
        if (!cancelled) {
          setResult((current) => ({ ...current, loading: false, error: true }));
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stableFilters, groupCompany, sourceStatus, operationRetryToken]);

  if (result.loading && !result.data)
    return (
      <AnalyticsLoadingState
        title="O Gênio está alinhando os sinais das fontes"
        description="Ele está cruzando as leituras publicadas; o cockpit volta assim que houver um estado confiável."
      />
    );
  if (result.error || !result.data)
    return (
      <StatePanel
        title="Não foi possível carregar a visão executiva"
        description="Os indicadores estão indisponíveis no momento. Tente novamente."
        onRetry={onRetry}
      />
    );

  const operationScoped = Boolean(groupCompany);
  const operationViewKpis = operationScoped ? operationKpis ?? EMPTY_OPERATION_KPIS : operationKpis;
  const scopedExecutiveKpis = operationScoped
    ? maskUnscopedOperationKpis(mergeOperationKpis(executiveKpis, operationViewKpis ?? EMPTY_OPERATION_KPIS))
    : executiveKpis;
  const operationCurrentAvailability = operationScoped && operationKpis
    ? {
        commercialPipeline: isPublishedKpiAvailable(operationKpis.current.commercial, 'open_pipeline_amount'),
        commercialDeals: isPublishedKpiAvailable(operationKpis.current.commercial, 'open_deals'),
        supportOpen: isPublishedKpiAvailable(operationKpis.current.support, 'open_backlog'),
      }
    : operationScoped
      ? { commercialPipeline: false, commercialDeals: false, supportOpen: false }
      : { commercialPipeline: true, commercialDeals: true, supportOpen: true };
  const operationPeriodAvailability = operationScoped && operationKpis
    ? {
        commercialWonDeals: isPublishedKpiAvailable(operationKpis.period.commercial, 'won_deals'),
        commercialLostDeals: isPublishedKpiAvailable(operationKpis.period.commercial, 'lost_deals'),
        commercialWonRevenue: isPublishedKpiAvailable(operationKpis.period.commercial, 'won_amount'),
        commercialConversion: isPublishedKpiAvailable(operationKpis.period.commercial, 'win_rate'),
        supportCreated: isPublishedKpiAvailable(operationKpis.period.support, 'created_tickets'),
      }
    : operationScoped
      ? { commercialWonDeals: false, commercialLostDeals: false, commercialWonRevenue: false, commercialConversion: false, supportCreated: false }
      : { commercialWonDeals: true, commercialLostDeals: true, commercialWonRevenue: true, commercialConversion: true, supportCreated: true };
  const data = operationScoped
    ? applyOperationScope(result.data, operationViewKpis ?? EMPTY_OPERATION_KPIS)
    : result.data;
  const currentSourceStatus = result.sourceStatus ?? sourceStatus;
  const state = currentSourceStatus ? analyticsGlobalToBlockState(currentSourceStatus) : data.state;
  const exceptions = buildExecutiveExceptions(data, { operationScoped });
  const pipelines = rankExecutivePipelines(data.support.byPipeline);
  const snapshotUnavailable = [
    "empty",
    "never_synced",
    "syncing",
    "unavailable",
    "failed",
    "error",
    "not_configured",
  ].includes(state?.status ?? "unavailable");
  const hubspotUnavailable = currentSourceStatus ? !hasUsableSnapshot(currentSourceStatus.hubspot.status, currentSourceStatus.hubspot.lastSuccessAt, currentSourceStatus.hubspot.hasValidSnapshot) : snapshotUnavailable;
  const omieUnavailable = currentSourceStatus ? !hasUsableSnapshot(currentSourceStatus.omie.status, currentSourceStatus.omie.lastSuccessAt, currentSourceStatus.omie.hasValidSnapshot) : snapshotUnavailable;
  const history = result.history;
  const comparison =
    history && !hubspotUnavailable && !groupCompany
      ? {
          revenue: buildDelta(
            data.commercial.wonRevenue,
            history.previous.commercial.wonRevenue,
            "currency",
          ),
          deals: buildDelta(
            data.commercial.wonDeals,
            history.previous.commercial.wonDeals,
            "count",
          ),
          conversion:
            data.commercial.conversionRate === null ||
            history.previous.commercial.conversionRate === null
              ? null
              : buildPercentagePointDelta(
                  data.commercial.conversionRate,
                  history.previous.commercial.conversionRate,
                  data.commercial.wonDeals + data.commercial.lostDeals,
                  history.previous.commercial.wonDeals +
                    history.previous.commercial.lostDeals,
                ),
          tickets: buildDelta(
            data.support.createdTickets,
            history.previous.support.createdTickets,
            "count",
          ),
        }
      : { revenue: null, deals: null, conversion: null, tickets: null };
  const applyFilters = (next: AnalyticsFilters) => {
    setFilters(next);
    onSharedPeriodChange?.({ from: next.from, to: next.to });
    setMobileFiltersOpen(false);
  };
  const domainCards = buildDomainCards(
    data,
    hubspotUnavailable,
    omieUnavailable || operationScoped,
    currentSourceStatus,
    operationScoped,
    operationCurrentAvailability,
    operationPeriodAvailability,
  );

  return (
    <ExecutiveHdCanvas
      data={data}
      executiveKpis={scopedExecutiveKpis}
      state={state}
      filters={filters}
      domainCards={domainCards}
      exceptions={exceptions}
      pipelines={pipelines}
      comparison={comparison}
      unavailable={hubspotUnavailable}
      financeUnavailable={omieUnavailable || Boolean(groupCompany)}
      operationScoped={operationScoped}
      operationLoadFailed={operationLoadFailed}
      operationLoadPartial={operationLoadPartial}
      onRetryOperation={() => setOperationRetryToken((token) => token + 1)}
      operationCurrentAvailability={operationCurrentAvailability}
      operationPeriodAvailability={operationPeriodAvailability}
      refreshing={refreshing}
      mobileFiltersOpen={mobileFiltersOpen}
      setMobileFiltersOpen={setMobileFiltersOpen}
      applyFilters={applyFilters}
      isDashboardViewer={isDashboardViewer}
      canSyncSources={canSyncSources}
      syncSources={syncSources}
      syncBusy={syncBusy}
      configuredPipelines={configuredPipelines}
      groupCompany={groupCompany}
      onGroupCompanyChange={handleGroupCompanyChange}
      coverageItems={buildCoverageItems(data, hubspotUnavailable, omieUnavailable, currentSourceStatus)}
      canOpenGovernance={canSyncSources}
    />
  );
}

function publishedKpiValue(payload: unknown, key: string): number | null {
  const entry = readKpi(payload, key);
  return entry.value;
}

function isPublishedKpiAvailable(payload: unknown, key: string): boolean {
  const entry = readKpi(payload, key);
  return (entry.state === 'available' || entry.state === 'partial') && entry.value !== null;
}

function mergeOperationKpis(base: unknown, scoped: {
  period: { commercial: unknown; support: unknown };
  current: { commercial: unknown; support: unknown };
}): unknown {
  return mergeOperationKpiPayload(
    base,
    { commercial: scoped.period.commercial, support: scoped.period.support },
    { commercial: scoped.current.commercial, support: scoped.current.support },
  );
}

const UNSCOPED_OPERATION_KPI_KEYS = ['mrr_total', 'active_customers', 'received_amount', 'overdue_receivables', 'mrr_overdue', 'nrr'] as const;

// V-06: estas chaves não têm dimensão operacional publicada — é característica
// do dado, não falha de leitura. A versão anterior só reescrevia chaves que já
// existissem no payload base; quando o recorte operacional zera o payload
// executivo, elas sumiam e o contrato caía no motivo ausente, que hoje diz
// "não foi possível confirmar… atualize". Isso convida o usuário a insistir num
// número que nunca vai aparecer sob recorte. A máscara passa a garantir a
// entrada, exista ou não no payload de origem.
function maskUnscopedOperationKpis(payload: unknown): unknown {
  const base = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const rawKpis = base.kpis && typeof base.kpis === 'object' ? base.kpis as Record<string, unknown> : {};
  const maskedKeys = new Set<string>(UNSCOPED_OPERATION_KPI_KEYS);
  const kpis: Record<string, unknown> = Object.fromEntries(Object.entries(rawKpis).map(([key, entry]) => {
    if (!maskedKeys.has(key) || !entry || typeof entry !== 'object') return [key, entry];
    return [key, { ...(entry as Record<string, unknown>), state: 'unavailable', value: null, reason: 'operation_dimension_unavailable' }];
  }));
  for (const key of UNSCOPED_OPERATION_KPI_KEYS) {
    if (!kpis[key]) kpis[key] = { state: 'unavailable', value: null, reason: 'operation_dimension_unavailable' };
  }
  return { ...base, kpis };
}

function applyOperationScope(data: CeoSnapshot, scoped: {
  period: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
  current: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
}): CeoSnapshot {
  const periodCommercial = scoped.period.commercial;
  const currentCommercial = scoped.current.commercial;
  const periodSupport = scoped.period.support;
  const currentSupport = scoped.current.support;
  const periodSupportSnapshot = scoped.period.supportSnapshot ?? EMPTY_OPERATION_SNAPSHOT;
  const periodMetrics = buildOperationPeriodMetrics(periodCommercial, periodSupport);
  const commercial = {
    ...data.commercial,
    openPipelineValue: publishedKpiValue(currentCommercial, 'open_pipeline_amount') ?? 0,
    openDeals: publishedKpiValue(currentCommercial, 'open_deals') ?? 0,
    wonDeals: periodMetrics.commercial.wonDeals ?? 0,
    lostDeals: periodMetrics.commercial.lostDeals ?? 0,
    wonRevenue: periodMetrics.commercial.wonRevenue ?? 0,
    conversionRate: periodMetrics.commercial.conversionRate,
  };
  const support = {
    ...data.support,
    openTickets: publishedKpiValue(currentSupport, 'open_backlog') ?? 0,
    createdTickets: periodMetrics.support.createdTickets ?? 0,
    bySource: periodSupportSnapshot.bySource,
    byPipeline: periodSupportSnapshot.byPipeline,
    byOwner: periodSupportSnapshot.byOwner,
    latestTicketCreatedAt: periodSupportSnapshot.latestTicketCreatedAt,
  };
  return { ...data, commercial, support };
}

type DomainCard = {
  key: string;
  title: string;
  description: string;
  value: string;
  details: string;
  href: string;
  state: AnalyticsBlockState | undefined;
  tone: "blue" | "cyan" | "pink" | "green" | "muted";
};

function buildDomainCards(
  data: CeoSnapshot,
  hubspotUnavailable: boolean,
  omieUnavailable: boolean,
  sourceStatus?: AnalyticsSourceStatusPayload,
  operationScoped = false,
  operationCurrentAvailability: OperationCurrentAvailability = { commercialPipeline: true, commercialDeals: true, supportOpen: true },
  operationPeriodAvailability: OperationPeriodAvailability = { commercialWonDeals: true, commercialLostDeals: true, commercialWonRevenue: true, commercialConversion: true, supportCreated: true },
): DomainCard[] {
  const hubspotState = sourceStatus
    ? analyticsSourceToBlockState(sourceStatus.hubspot)
    : data.state;
  const omieState = sourceStatus
    ? analyticsSourceToBlockState(sourceStatus.omie)
    : data.state;

  return [
    {
      key: "commercial",
      title: "Comercial",
      description: "Pipeline e conversão",
      value: hubspotUnavailable
        || (operationScoped && (!operationCurrentAvailability.commercialPipeline || !operationCurrentAvailability.commercialDeals))
        ? "Indisponível"
        : formatCurrency(data.commercial.openPipelineValue),
      details: hubspotUnavailable
        || (operationScoped && (!operationCurrentAvailability.commercialPipeline || !operationCurrentAvailability.commercialDeals))
        ? "Dados comerciais indisponíveis"
        : `${formatCountLabel(data.commercial.openDeals, "negócio aberto", "negócios abertos")} · ${operationScoped ? "ciclo do recorte indisponível" : data.commercial.avgSalesCycleDays > 0 ? `${Math.round(data.commercial.avgSalesCycleDays).toLocaleString("pt-BR")} dias de ciclo` : "ciclo indisponível"}`,
      href: analyticsHref("commercial"),
      state: hubspotState,
      tone: "blue",
    },
    {
      key: "customer_success",
      title: "Customer Success",
      description: "Carteira e cobertura",
      value: "Indisponível",
      details: "Dados de carteira ainda não consolidados",
      href: analyticsHref("customer-success"),
      state: { ...data.customerSuccess.state, status: "unavailable", reason: "O denominador de cliente ativo ainda não foi confirmado." },
      tone: "pink",
    },
    {
      key: "support",
      title: "Suporte",
      description: OVERVIEW_QUEUE_METRICS.received.label,
      value: hubspotUnavailable
        || (operationScoped && !operationPeriodAvailability.supportCreated)
        ? "Indisponível"
        : formatCountLabel(data.support.createdTickets, "atendimento recebido", "atendimentos recebidos"),
      details: hubspotUnavailable
        || (operationScoped && !operationPeriodAvailability.supportCreated)
        ? "Dados de suporte indisponíveis"
        : `${OVERVIEW_QUEUE_METRICS.received.source} · ${operationScoped ? "recorte selecionado" : "período selecionado"}`,
      href: analyticsHref("support"),
      state: hubspotState,
      tone: "cyan",
    },
    {
      key: "finance",
      title: "Financeiro",
      description: "Fluxo e reconciliação",
      value: omieUnavailable
        ? "Indisponível"
        : formatCountLabel(
            data.finance.unmatchedTitles,
            "título sem correspondência",
            "títulos sem correspondência",
          ),
      details: omieUnavailable ? "Dados financeiros indisponíveis" : `${formatCurrency(data.finance.balance)} em posição atual`,
      href: analyticsHref("finance"),
      state: omieState,
      tone: "green",
    },
  ];
}

function ExecutiveHdCanvas({
  data,
  executiveKpis,
  state,
  filters,
  domainCards,
  exceptions,
  pipelines,
  comparison,
  unavailable,
  financeUnavailable,
  operationScoped,
  operationLoadFailed,
  operationLoadPartial,
  onRetryOperation,
  operationCurrentAvailability,
  operationPeriodAvailability,
  refreshing,
  mobileFiltersOpen,
  setMobileFiltersOpen,
  applyFilters,
  isDashboardViewer,
  canSyncSources,
  syncSources,
  syncBusy,
  configuredPipelines,
  groupCompany,
  onGroupCompanyChange,
  coverageItems,
  canOpenGovernance,
}: {
  data: CeoSnapshot;
  executiveKpis: unknown;
  state?: AnalyticsBlockState;
  filters: AnalyticsFilters;
  domainCards: DomainCard[];
  exceptions: ReturnType<typeof buildExecutiveExceptions>;
  pipelines: ReturnType<typeof rankExecutivePipelines>;
  comparison: {
    revenue: MetricDelta;
    deals: MetricDelta;
    conversion: MetricDelta;
    tickets: MetricDelta;
  };
  unavailable: boolean;
  financeUnavailable: boolean;
  operationScoped: boolean;
  operationLoadFailed: boolean;
  operationLoadPartial: boolean;
  onRetryOperation?: () => void;
  operationCurrentAvailability: OperationCurrentAvailability;
  operationPeriodAvailability: OperationPeriodAvailability;
  refreshing: boolean;
  mobileFiltersOpen: boolean;
  setMobileFiltersOpen: (value: boolean) => void;
  applyFilters: (next: AnalyticsFilters) => void;
  isDashboardViewer: boolean;
  canSyncSources: boolean;
  syncSources?: () => void;
  syncBusy: boolean;
  configuredPipelines: AnalyticsSourceConfig[];
  groupCompany: string;
  onGroupCompanyChange: (value: string) => void;
  coverageItems: AnalyticsCoverageItem[];
  canOpenGovernance: boolean;
}) {
  const periodLabel = formatPeriod(filters);
  const integrityLine = buildExecutiveIntegrityLine(data.dataQuality, operationScoped);
  const qualityExpected = state?.coverage.expected;
  const qualityReceived = state?.coverage.received;
  const qualityLabel =
    qualityExpected !== null &&
    qualityExpected !== undefined &&
    qualityReceived !== null &&
    qualityReceived !== undefined
      ? `${qualityReceived.toLocaleString("pt-BR")}/${qualityExpected.toLocaleString("pt-BR")} recebidos`
      : "Cobertura não informada";

  return (
    <div className="gso-hd-canvas gso-pilot-summary gso-executive-canvas gso-visual-v1-overview" data-testid="executive-dashboard">
      <section className="gso-hd-context gso-overview-context" aria-labelledby="executive-heading">
        <div className="gso-overview-context__source">
          <strong>Estado das fontes</strong>
          {state ? <AnalyticsStateBadge state={state} /> : null}
          <span>HubSpot para operação; OMIE para Financeiro.</span>
        </div>
        <div className="gso-overview-context__heading">
          <div className="gso-hd-title-row">
            <h2 id="executive-heading">Visão Geral</h2>
          </div>
          <p>
            Desempenho no período, posição atual e sinais que merecem contexto.
          </p>
        </div>
        <div className="gso-overview-context__action">
          {canSyncSources && syncSources ? (
            <button
              type="button"
              className="gso-hd-sync-action"
              disabled={syncBusy}
              onClick={syncSources}
              data-testid="overview-sync-sources"
            >
              {syncBusy ? "Atualizando…" : "Sincronizar bases"}
            </button>
          ) : null}
        </div>
      </section>

          <div className="gso-hd-filter-bar gso-hd-pulse" aria-label="Filtros da análise">
        <div className="gso-hd-filter-context">
          <span>Recorte</span>
          <strong>{periodLabel}</strong>
        </div>
        <button
          type="button"
          className="gso-hd-mobile-filter-button"
          aria-expanded={mobileFiltersOpen}
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          Filtros <span>{mobileFiltersOpen ? "−" : "+"}</span>
        </button>
        <div className={`gso-hd-filters ${mobileFiltersOpen ? "is-open" : ""}`}>
          <Filters
            value={filters}
            onApply={applyFilters}
            stageOptions={[]}
            extraFields={
              configuredPipelines.length > 0 ? (
                <AnalyticsOperationScope
                  storageKey="analytics-operation-scope"
                  value={groupCompany}
                  onChange={onGroupCompanyChange}
                  options={configuredPipelines.map((pipeline) => ({
                    value: pipeline.groupCompany,
                    source: pipeline.groupCompanySource,
                  }))}
                />
              ) : null
            }
          />
        </div>
      </div>

      {/* V-04: a versão anterior desta linha falava "server-side", "read models
          publicados" e "associação ticket-empresa" para um público executivo.
          O conteúdo é o mesmo; a linguagem é a de quem lê o painel. */}
      {groupCompany ? (
        <p className="gso-hd-inline-status" role="status">
          Operação <strong>{groupCompany}</strong>. Comercial e Suporte estão filtrados por
          ela. Customer Success só aparece quando o atendimento está ligado a uma empresa.
          Financeiro não é separado por operação: o valor consolidado fica na aba Financeiro.
        </p>
      ) : null}

      {/* V-01/V-03: falha de carregamento tem causa e ação próprias. Antes ela
          se disfarçava de onze indicadores "indisponíveis por limitação da
          origem", o que é uma afirmação que o painel não pode fazer. */}
      {operationScoped && operationLoadFailed ? (
        <p className="gso-hd-inline-status is-warning" role="alert">
          {operationLoadPartial
            ? <>Alguns indicadores da operação <strong>{groupCompany}</strong> não puderam ser carregados; os dados disponíveis continuam exibidos.</>
            : <>Não foi possível carregar os indicadores da operação <strong>{groupCompany}</strong>.</>}
          {' '}Isto é falha de leitura desta tela, não uma conclusão sobre os dados da origem.
          {onRetryOperation ? (
            <>
              {' '}
              <button type="button" className="gso-hd-inline-retry" onClick={onRetryOperation}>
                Tentar de novo
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {executiveKpis ? (
        <>
          <AnalyticsKpiBoard payload={executiveKpis} bands={EXECUTIVE_BANDS} />
          <AnalyticsBoardLimitations payload={executiveKpis} />
        </>
      ) : null}

      {refreshing ? (
        <p className="gso-hd-inline-status" role="status">
          Atualizando o período selecionado…
        </p>
      ) : null}
      {state?.status === "empty" ? (
        <p className="gso-hd-inline-status is-warning" role="status">
          Não há registros no período selecionado. O painel mantém a posição
          atual separada e não transforma ausência em zero.
        </p>
      ) : null}

      <section className="gso-hd-ribbon" aria-labelledby="performance-heading">
        <HdSectionHeading
          id="performance-heading"
          title="Desempenho no período"
          description="Sinais afetados pelo recorte selecionado."
        />
        <div className="gso-hd-metric-grid">
          <HdMetric
            label="Receita ganha"
            value={
              unavailable || (operationScoped && !operationPeriodAvailability.commercialWonRevenue)
                ? "Indisponível"
                : formatCurrency(data.commercial.wonRevenue)
            }
            detail={unavailable || (operationScoped && !operationPeriodAvailability.commercialWonRevenue)
              ? operationScoped && !operationPeriodAvailability.commercialWonDeals
                ? "Receita e negócios ganhos indisponíveis"
                : data.commercial.wonDeals > 0
                ? `${formatCountLabel(data.commercial.wonDeals, "negócio ganho", "negócios ganhos")}; valor não disponível`
                : "Valor da receita indisponível"
              : formatCountLabel(data.commercial.wonDeals, "negócio ganho", "negócios ganhos")}
            comparison={comparison.revenue?.label}
          />
          <HdMetric
            label="Negócios ganhos"
            value={
              unavailable || (operationScoped && !operationPeriodAvailability.commercialWonDeals)
                ? "Indisponível"
                : data.commercial.wonDeals.toLocaleString("pt-BR")
            }
            detail={unavailable || (operationScoped && (!operationPeriodAvailability.commercialWonDeals || !operationPeriodAvailability.commercialLostDeals))
              ? "Dados comerciais indisponíveis"
              : formatCountLabel(data.commercial.lostDeals, "negócio perdido", "negócios perdidos")}
            comparison={comparison.deals?.label}
          />
          <HdMetric
            label="Conversão"
            value={
              unavailable ||
              (operationScoped && !operationPeriodAvailability.commercialConversion) ||
              data.commercial.conversionRate === null ||
              data.commercial.wonDeals + data.commercial.lostDeals === 0
                ? "Indisponível"
                : formatPercent(data.commercial.conversionRate)
            }
            detail={unavailable || (operationScoped && !operationPeriodAvailability.commercialConversion) ? "Dados comerciais indisponíveis" : "Ganhos sobre ganhos e perdas"}
            comparison={comparison.conversion?.label}
          />
          <HdMetric
            label={OVERVIEW_QUEUE_METRICS.received.label}
            value={
              unavailable || (operationScoped && !operationPeriodAvailability.supportCreated)
                ? "Indisponível"
                : data.support.createdTickets.toLocaleString("pt-BR")
            }
            detail={unavailable || (operationScoped && !operationPeriodAvailability.supportCreated)
              ? "Contagem de tickets indisponível"
              : operationScoped
                ? "Encerramentos do recorte indisponíveis"
                : formatCountLabel(data.support.closedTickets, "ticket encerrado", "tickets encerrados")}
            comparison={comparison.tickets?.label}
          />
        </div>
      </section>

      <section
        className="gso-hd-current-strip"
        aria-labelledby="current-heading"
      >
        <HdSectionHeading
          id="current-heading"
          title="Posição atual"
          description="Posição atual, não afetada pelo período selecionado."
        />
        <div className="gso-hd-current-line">
          <HdMetric
            label="Saldo vencido"
            value={
              financeUnavailable
                ? "Indisponível"
                : formatCurrency(data.finance.overdueBalance)
            }
            detail={financeUnavailable
              ? "Dados financeiros indisponíveis"
              : formatCountLabel(data.finance.overdueTitles, "título vencido", "títulos vencidos")}
          />
          <HdMetric
            label="Clientes com alerta"
            value={
              financeUnavailable || unavailable
                ? "Indisponível"
                : data.financialAlerts.length.toLocaleString("pt-BR")
            }
            detail={financeUnavailable || unavailable ? "Reconciliação financeira indisponível" : "Inadimplência reconciliada"}
          />
          <HdMetric
            label={OVERVIEW_QUEUE_METRICS.current.label}
            value={
              unavailable || (operationScoped && !operationCurrentAvailability.supportOpen)
                ? "Indisponível"
                : data.support.openTickets.toLocaleString("pt-BR")
            }
            detail={unavailable || (operationScoped && !operationCurrentAvailability.supportOpen)
              ? "Contagem de tickets indisponível"
              : operationScoped
                ? "Prioridade do recorte indisponível"
                : formatCountLabel(data.support.highPriorityOpen, "alta prioridade aberta", "altas prioridades abertas")}
          />
        </div>
      </section>

      <section
        className="gso-hd-domain-matrix"
        aria-labelledby="domains-heading"
      >
        <HdSectionHeading
          id="domains-heading"
          title="Mapa das áreas"
          description="Cada indicador mostra sua fonte e o estado da última atualização válida."
        />
        <div className="gso-hd-domain-grid">
          {domainCards.map((card) => (
            <HdDomain key={card.key} card={card} />
          ))}
        </div>
      </section>

      <div className="gso-hd-lower-grid">
        <section
          className="gso-hd-integrity"
          aria-labelledby="integrity-heading"
          data-testid="overview-governance-coverage"
        >
          <HdSectionHeading
            id="integrity-heading"
            title="Governança e cobertura"
            description="Cobertura, reconciliação e responsáveis que afetam a confiança nos dados."
          />
          <div className="gso-hd-integrity-line">
            <div>
              <span className="gso-hd-integrity-value">{qualityLabel}</span>
              <small>Cobertura geral do contrato</small>
            </div>
            <div>
              <span className="gso-hd-integrity-value">{integrityLine.unmatchedFinanceTitles.value}</span>
              <small>{integrityLine.unmatchedFinanceTitles.label}</small>
            </div>
            <div>
              <span className="gso-hd-integrity-value">{integrityLine.supportUnassigned.value}</span>
              <small>{integrityLine.supportUnassigned.label}</small>
            </div>
          </div>
        </section>
        <section
          className="gso-hd-exceptions"
          aria-labelledby="exceptions-heading"
          data-testid="overview-operational-attention"
        >
          <HdSectionHeading
            id="exceptions-heading"
            title="Atenção operacional"
            description="Exceções determinísticas que pedem acompanhamento ou ação."
          />
          {exceptions.length ? (
            <div className="gso-hd-signal-list">
              {exceptions.slice(0, 3).map((item) =>
                isDashboardViewer ? (
                  <div key={item.key} className="gso-hd-signal">
                    <span>{item.domain}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                ) : (
                  <Link key={item.key} to={item.href} className="gso-hd-signal">
                    <span>{item.domain}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </Link>
                ),
              )}
            </div>
          ) : (
            <p className="gso-hd-muted-row">
              Nenhuma exceção determinística no recorte.
            </p>
          )}
        </section>
      </div>

      <section className="gso-hd-pipelines" aria-labelledby="pipelines-heading" data-testid="overview-operational-queue">
        <div className="gso-hd-section-heading-inline">
          <HdSectionHeading
            id="pipelines-heading"
            title="Fila operacional"
            description="Concentração de atendimentos por fila no período selecionado."
          />
          <span>
            {pipelines.length
              ? `${pipelines.length} encontrados`
              : "Sem atividade"}
          </span>
        </div>
        {pipelines.length ? (
          <div className="gso-hd-pipeline-table">
            <div className="gso-hd-pipeline-head">
              <span>Pipeline</span>
              <span>Domínio</span>
              <span>Volume</span>
            </div>
            {pipelines.slice(0, 5).map((pipeline) => (
              <Link
                key={pipeline.id}
                to={pipeline.href}
                className="gso-hd-pipeline-row"
              >
                <strong>{pipeline.label}</strong>
                <span>{pipeline.domain}</span>
                <b>{formatCountLabel(pipeline.count, "ticket", "tickets")} →</b>
              </Link>
            ))}
          </div>
        ) : (
          <p className="gso-hd-muted-row">
            Nenhum pipeline de Suporte com atividade no período selecionado.
          </p>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="trends-heading">
        <HdSectionHeading
          id="trends-heading"
          title="Evolução por domínio"
          description="Séries publicadas pelas fontes, com coorte, unidade e estado de cobertura explícitos."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <AnalyticsTrendPanel domain="commercial" groupCompany={groupCompany} />
          <AnalyticsTrendPanel domain="support" groupCompany={groupCompany} />
          <AnalyticsTrendPanel domain="finance" groupCompany={groupCompany} />
        </div>
      </section>

      <AnalyticsDataCoveragePanel items={coverageItems} canOpenGovernance={canOpenGovernance} />
    </div>
  );
}

function buildCoverageItems(
  data: CeoSnapshot,
  hubspotUnavailable: boolean,
  omieUnavailable: boolean,
  sourceStatus?: AnalyticsSourceStatusPayload,
): AnalyticsCoverageItem[] {
  const hubspotStatus = analyticsCoverageStatus(hubspotUnavailable ? 'unavailable' : sourceStatus?.hubspot.status ?? 'fresh');
  const omieStatus = analyticsCoverageStatus(omieUnavailable ? 'unavailable' : sourceStatus?.omie.status ?? 'fresh');
  return [
    { key: 'commercial', label: 'Comercial · funil, pipeline e responsáveis', source: 'HubSpot · Deals', status: hubspotStatus, detail: 'Negócios sincronizados e agregados por contratos comerciais publicados.' },
    { key: 'customer-success', label: 'Customer Success · carteira, MRR e sinais', source: data.customerSuccess.source, status: analyticsCoverageStatus(data.customerSuccess.state.status), detail: data.customerSuccess.healthAvailable > 0 ? 'Há sinais de carteira retornados pela fonte; health score não é inferido.' : 'Carteira publicada sem health score operacional confirmado.' },
    { key: 'support', label: 'Suporte · tickets, fila e tempos', source: 'HubSpot · Tickets', status: hubspotStatus, detail: 'Tickets permanecem separados de conversas e chat; os tempos só aparecem quando o campo foi observado.' },
    { key: 'finance', label: 'Financeiro · recebíveis, aging e conciliação', source: 'OMIE · Contas a Receber', status: omieStatus, detail: 'Somente títulos OMIE atuais entram no snapshot; planilhas não são fallback.' },
    { key: 'activities', label: 'Atividades · reuniões, tarefas, ligações e e-mails', source: 'HubSpot · Activities', status: 'unavailable', detail: 'Nenhum read model ou ingestão server-side validado para essas atividades; o painel não estima pendências.' },
    { key: 'conversations', label: 'Conversas e chat', source: 'HubSpot · Conversations', status: 'unavailable', detail: 'Threads e mensagens ainda não estão conectadas ao Analytics. source_type de ticket não prova a existência de um chat.' },
    { key: 'finance-scope', label: 'Pagar, centros de custo, projetos e contratos', source: 'OMIE · contratos ainda não publicados', status: 'unavailable', detail: 'A integração local publica recebíveis; não há contrato validado para ampliar este recorte.' },
  ];
}

function HdStatus({ state }: { state: AnalyticsBlockState }) {
  const lastValidLabel = (state.status === "failed" || state.status === "error") && state.lastSuccessfulSyncAt
    ? ` · dados válidos de ${new Date(state.lastSuccessfulSyncAt).toLocaleString("pt-BR")}`
    : "";
  return (
    <span className={`gso-hd-status ${statusTone(state.status)}`}>
      <i aria-hidden="true" />
      {shortStatus(state.status)}{lastValidLabel}
    </span>
  );
}
function HdMetric({
  label,
  value,
  detail,
  comparison,
}: {
  label: string;
  value: string;
  detail?: string;
  comparison?: string;
}) {
  return (
    <div className="gso-hd-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail ?? "Sem detalhe complementar"}</small>
      {comparison ? <em>{comparison}</em> : null}
    </div>
  );
}
function HdDomain({
  card,
}: {
  card: DomainCard;
}) {
  const body = (
    <>
      <div className="gso-hd-domain-top">
        <span
          className={`gso-hd-domain-mark ${card.tone}`}
          aria-hidden="true"
        />
        <HdStatus
          state={
            card.state ?? {
              status: "not_configured",
              source: card.details,
              asOf: null,
              lastSuccessfulSyncAt: null,
              syncRunId: null,
              coverage: { expected: null, received: null },
              reason: card.details,
            }
          }
        />
      </div>
      <h3>{card.title}</h3>
      <p>{card.description}</p>
      <strong>{card.value}</strong>
      <small>{card.details}</small>
      <span className="gso-hd-domain-link">Abrir domínio →</span>
    </>
  );
  return (
    <Link
      to={card.href}
      className={`gso-hd-domain ${card.tone === "muted" ? "is-muted" : ""}`}
    >
      {body}
    </Link>
  );
}
function HdSectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className="gso-hd-section-heading">
      <div>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
function StatePanel({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <section className="gso-hd-state-panel" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
      <AnalyticsRetryAction onRetry={onRetry} />
    </section>
  );
}
function statusTone(status?: AnalyticsDataStatus) {
  if (status === "fresh" || status === "zero") return "fresh";
  if (status === "stale" || status === "partial" || status === "syncing")
    return "warning";
  if (status === "error" || status === "failed" || status === "unavailable" || status === "never_synced") return "critical";
  return "muted";
}

function hasUsableSnapshot(status: AnalyticsSourceStatusPayload['globalStatus'], lastSuccessAt: string | null, hasValidSnapshot = false) {
  return Boolean(lastSuccessAt || hasValidSnapshot) && ['fresh', 'stale', 'partial', 'syncing', 'failed'].includes(status);
}

async function getAnalyticsSourceStatusSafe(): Promise<AnalyticsSourceStatusPayload | null> {
  try {
    return await getAnalyticsSourceStatus();
  } catch {
    return null;
  }
}
function shortStatus(status?: AnalyticsDataStatus) {
  return status ? STATUS_LABELS[status] : "Não conectado";
}
function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
function formatPeriod(filters: AnalyticsFilters) {
  return filters.from && filters.to
    ? `${formatDate(filters.from)} a ${formatDate(filters.to)}`
    : "Período padrão";
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}
function buildDelta(
  current: number,
  previous: number,
  kind: "currency" | "count",
): MetricDelta {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change > 0 ? "+" : "";
  const value =
    kind === "currency"
      ? `${sign}${change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
      : `${sign}${change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return {
    label: `${value} vs. período anterior`,
    tone: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
  };
}
function buildPercentagePointDelta(
  current: number,
  previous: number,
  currentDenominator: number,
  previousDenominator: number,
): MetricDelta {
  if (currentDenominator === 0 || previousDenominator === 0) return null;
  const change = (current - previous) * 100;
  const sign = change > 0 ? "+" : "";
  return {
    label: `${sign}${change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs. período anterior`,
    tone: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
  };
}
