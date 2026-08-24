import { useEffect, useState } from 'react';
import { MinimalState } from '../../components/minimal-states';
import { getCommercialKpisV2, getCommercialSnapshot, listAnalyticsSourceConfig, listHubspotSyncRuns } from './analytics-api';
import {
  formatCurrencyBRL,
  formatCommercialWinRate,
  type CommercialByOwner,
  type CommercialFunnelStage,
  type CommercialKpis,
  type CommercialMonthlyPoint,
  type CommercialByPipeline,
  type CommercialSnapshot,
  type AnalyticsFilters,
  type AnalyticsPageProps,
  type AnalyticsSourceConfig,
  DEFAULT_ANALYTICS_FILTERS,
  analyticsSourceToBlockState,
  mapCommercialKpiDetails,
} from './analytics-model';
import { AnalyticsLoadingState, AnalyticsRetryAction, ChartCard, MetricInfo } from './analytics-ui';
import { AnalyticsFilters as AnalyticsFiltersBar } from './AnalyticsFilters';
import { AnalyticsPipelineCombobox } from './AnalyticsPipelineCombobox';
import { AnalyticsOperationScope } from './AnalyticsOperationScope';
import { resolveAnalyticsPeriod } from './analytics-periods';
import type { AnalyticsBlockState } from '@genius-support-os/contracts';
import { CommercialFunnelChart } from './charts/AnalyticsCharts';
import { CommercialOwnerPerformanceChart } from './charts/OwnerPerformanceCharts';
import { AnalyticsExecutionMeta, AnalyticsHdDomainFrame } from './AnalyticsHdDomainFrame';
import { AnalyticsBoardLimitations, AnalyticsKpiBoard, type BoardBand } from './AnalyticsKpiBoard';
import { AnalyticsDomainTabs, type DomainTab } from './AnalyticsDomainTabs';
import { AnalyticsTrendPanel } from './AnalyticsTrendPanel';
import { AnalyticsCommercialComparison } from './AnalyticsCommercialComparison';
import { resolvePreviousComparablePeriod } from './analytics-commercial-comparison.mjs';
import { buildCommercialStageQueryPlan, composeCommercialStageView, hasCompatibleAnalyticsStage, selectedAnalyticsPipelineIds } from './analytics-stage-scope.mjs';
import { buildAnalyticsQueryKey } from './analytics-query-key';
import { createAnalyticsLoadingState } from './analytics-reactive-state.mjs';

// Indicadores com coorte declarada, publicados pelo read model de KPI.
// Pipeline e posicao na data de corte; criados usam data de criacao; ganhos,
// win rate, ticket e ciclo usam data de fechamento. Misturar as tres coortes
// sob o mesmo filtro foi o erro que a versao anterior cometia em silencio.
const COMMERCIAL_BANDS: BoardBand[] = [
  {
    title: 'Agora',
    note: 'Posição na data de hoje; não muda com o período selecionado.',
    items: [
      { key: 'open_pipeline_amount', kind: 'currency', note: 'Soma dos negócios ainda em aberto' },
      { key: 'weighted_pipeline_amount', kind: 'currency', note: 'Ajustado pela chance de fechar de cada etapa' },
    ],
  },
  {
    title: 'No período',
    note: 'Movimento dentro do recorte selecionado acima.',
    items: [
      { key: 'won_amount', kind: 'currency', note: 'Negócios ganhos' },
      { key: 'win_rate', kind: 'percent', note: 'Ganhos sobre tudo que foi encerrado' },
      { key: 'created_deals', kind: 'count', note: 'Novos negócios iniciados' },
      { key: 'median_sales_cycle_days', kind: 'days', note: 'Da abertura até o ganho' },
    ],
  },
  {
    title: 'Apoio',
    dense: true,
    items: [
      { key: 'median_deal_amount', kind: 'currency', note: 'Valor típico; resiste a negócio atípico' },
      { key: 'avg_deal_amount', kind: 'currency', note: 'Complemento do valor típico' },
    ],
  },
];

type State =
  | { phase: 'loading' }
  | {
      phase: 'ready';
      kpis: CommercialKpis;
      funnel: CommercialFunnelStage[];
      byPipeline: CommercialByPipeline[];
      byOwner: CommercialByOwner[];
      monthly: CommercialMonthlyPoint[];
      stageCatalogFunnel: CommercialFunnelStage[];
      state?: AnalyticsBlockState;
    }
  | { phase: 'error'; message: string };

export function AnalyticsCommercialPage({ sharedPeriod, onSharedPeriodChange, sharedOperation, onSharedOperationChange, onRetry, sourceStatus }: AnalyticsPageProps) {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const period = sharedPeriod ?? resolveAnalyticsPeriod('month');
  const [filters, setFilters] = useState<AnalyticsFilters>({ ...DEFAULT_ANALYTICS_FILTERS, ...period });
  const [configuredPipelines, setConfiguredPipelines] = useState<AnalyticsSourceConfig[]>([]);
  const [excludedPipelineIds, setExcludedPipelineIds] = useState<string[]>([]);
  const [groupCompany, setGroupCompany] = useState(sharedOperation ?? '');
  const queryKey = buildAnalyticsQueryKey({
    domain: 'commercial',
    period: filters,
    operation: groupCompany,
    excludedPipelineIds,
    ownerId: filters.ownerId,
    stageId: filters.stageId,
    priority: filters.priority,
    grain: 'position',
  });
  const [latestHubspotRun, setLatestHubspotRun] = useState<import('./analytics-model').SyncRun | null>(null);
  const [kpiPayload, setKpiPayload] = useState<unknown>(null);
  const [previousKpiPayload, setPreviousKpiPayload] = useState<unknown>(null);
  const [comparisonPhase, setComparisonPhase] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [subTab, setSubTab] = useState('posicao');

  useEffect(() => {
    if (sharedOperation !== undefined && sharedOperation !== groupCompany) setGroupCompany(sharedOperation);
  }, [groupCompany, sharedOperation]);

  const handleGroupCompanyChange = (value: string) => {
    setGroupCompany(value);
    onSharedOperationChange?.(value);
  };

  useEffect(() => {
    setFilters((current) => current.from === period.from && current.to === period.to ? current : { ...current, ...period });
  }, [period.from, period.to]);

  useEffect(() => {
    let cancelled = false;
    setState(createAnalyticsLoadingState());
    setKpiPayload(null);
    setPreviousKpiPayload(null);
    setComparisonPhase('loading');

    void getCommercialKpisV2(filters, groupCompany || null)
      .then((payload) => { if (!cancelled) setKpiPayload(payload); })
      .catch(() => { if (!cancelled) setKpiPayload(null); });

    const previousPeriod = resolvePreviousComparablePeriod(filters);
    if (!previousPeriod) {
      setComparisonPhase('unavailable');
    } else {
      setComparisonPhase('loading');
      void getCommercialKpisV2({ ...filters, ...previousPeriod }, groupCompany || null)
        .then((payload) => {
          if (cancelled) return;
          setPreviousKpiPayload(payload);
          setComparisonPhase('ready');
        })
        .catch(() => {
          if (!cancelled) setComparisonPhase('error');
        });
    }

    const queryPlan = buildCommercialStageQueryPlan(filters, excludedPipelineIds, groupCompany || null);
    Promise.all([
      getCommercialSnapshot(queryPlan.data.filters, queryPlan.data.excludedPipelineIds, queryPlan.data.groupCompany),
      queryPlan.catalog ? getCommercialSnapshot(queryPlan.catalog.filters, queryPlan.catalog.excludedPipelineIds, queryPlan.catalog.groupCompany) : Promise.resolve(null),
      listAnalyticsSourceConfig(),
      listHubspotSyncRuns(),
    ])
      .then(([snapshot, stageCatalog, configs, runs]) => {
        if (!cancelled) {
          const activeConfigs = configs.filter((config) => config.domainKey === 'commercial' && config.objectType === 'deal' && config.isActive);
          setConfiguredPipelines(activeConfigs);
          setLatestHubspotRun(runs[0] ?? null);
          const mappedSnapshot = applyConfiguredPipelineLabels(snapshot, activeConfigs);
          setState({ phase: 'ready', ...mappedSnapshot, stageCatalogFunnel: stageCatalog?.funnel ?? mappedSnapshot.funnel });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message:
              error instanceof Error ? error.message : 'Falha ao carregar os dados comerciais.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // queryKey contém todas as dimensões semânticas usadas por esta leitura;
    // referências novas de filtros não devem disparar uma segunda consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (state.phase === 'loading') {
    return <AnalyticsHdDomainFrame title="Comercial" description="Receita, pipeline e conversão para decisão comercial." source="HubSpot · Deals"><AnalyticsLoadingState title="Carregando comercial" description="O Gênio está consultando os negócios sincronizados do HubSpot." /></AnalyticsHdDomainFrame>;
  }

  if (state.phase === 'error') {
    return <AnalyticsHdDomainFrame title="Comercial" description="Receita, pipeline e conversão para decisão comercial." source="HubSpot · Deals"><MinimalState tone="critical" title="Não foi possível carregar" description="Os indicadores comerciais estão indisponíveis no momento." actions={<AnalyticsRetryAction onRetry={onRetry} />} /></AnalyticsHdDomainFrame>;
  }

  const { funnel, byPipeline, byOwner } = state;
  const commercialKpiDetails = mapCommercialKpiDetails(kpiPayload);
  const ownersWithPeriodActivity = commercialKpiDetails.byOwner.filter((owner) => owner.openDeals > 0 || owner.wonDeals > 0 || owner.lostDeals > 0);
  const selectedPipelineIds = selectedAnalyticsPipelineIds(configuredPipelines, groupCompany, excludedPipelineIds);
  const stageView = composeCommercialStageView({ funnel, state: state.state }, { funnel: state.stageCatalogFunnel }, selectedPipelineIds);
  const dataState = stageView.dataState;
  const displayState = sourceStatus ? analyticsSourceToBlockState(sourceStatus.hubspot) : dataState;
  const stageScope = stageView.stageScope;
  const stageOptions = stageScope.options;
  const ownerOptions = byOwner.filter((owner) => owner.ownerId).map((owner) => ({ value: owner.ownerId as string, label: owner.ownerName }));
  const pipelineOptions = configuredPipelines.map((pipeline) => {
    const observed = byPipeline.find((item) => item.pipelineId === pipeline.pipelineId);
    return { ...pipeline, dealCount: observed?.dealCount ?? 0 };
  });

  const subTabs: DomainTab[] = [
    {
      id: 'posicao',
      label: 'Posição',
      question: 'Onde estão os negócios agora e o que foi encerrado no recorte selecionado.',
      content: (
        <div className="space-y-4">
          {kpiPayload ? (
            <>
              <AnalyticsKpiBoard payload={kpiPayload} bands={COMMERCIAL_BANDS} />
              <AnalyticsBoardLimitations payload={kpiPayload} />
            </>
          ) : null}
          {dataState?.status !== 'empty' ? (
            <ChartCard title="Funil por estágio" description="Quantidade de negócios em cada estágio do funil comercial.">
              {funnel.length > 0 ? (
                <CommercialFunnelChart data={funnel} />
              ) : (
                <MinimalState title="Sem estágios" description="Execute uma sincronização para carregar os estágios do funil." />
              )}
            </ChartCard>
          ) : null}
          {dataState?.status !== 'empty' ? <ChartCard title="Performance comercial por responsável" description="Volume por pessoa: carteira aberta agora e negócios encerrados no período.">
            {ownersWithPeriodActivity.length > 0 ? (
              <>
              <CommercialOwnerPerformanceChart owners={ownersWithPeriodActivity} />
              <div className="mt-4 overflow-x-auto">
                <table className="gso-analytics-responsive-table w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]">
                      <th className="py-2 pr-4">Responsável</th>
                      <th className="py-2 pr-4 text-right">Abertos agora</th>
                      <th className="py-2 pr-4 text-right">Pipeline aberto</th>
                      <th className="py-2 pr-4 text-right">Ganhos no período</th>
                      <th className="py-2 pr-4 text-right">Perdidos</th>
                      <th className="py-2 pr-4 text-right">Conversão</th>
                      <th className="py-2 pr-4 text-right">Ciclo mediano</th>
                      <th className="py-2 text-right">Receita ganha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownersWithPeriodActivity.map((owner) => (
                      <tr
                        key={owner.ownerId ?? owner.ownerName}
                        className="border-b border-[color:var(--minimal-border)] last:border-0"
                      >
                        <td data-label="Responsável" className="py-2 pr-4 text-[color:var(--minimal-text)]">{owner.ownerName}</td>
                        <td data-label="Abertos agora" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text)]">
                          {owner.openDeals.toLocaleString('pt-BR')}
                        </td>
                        <td data-label="Pipeline aberto" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">
                          {formatCurrencyBRL(owner.openAmount)}
                        </td>
                        <td data-label="Ganhos no período" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text)]">
                          {owner.wonDeals.toLocaleString('pt-BR')}
                        </td>
                        <td data-label="Perdidos" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">
                          {owner.lostDeals.toLocaleString('pt-BR')}
                        </td>
                        <td data-label="Conversao" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">
                          {formatOwnerRate(owner.winRate)}
                        </td>
                        <td data-label="Ciclo mediano" className="py-2 pr-4 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">
                          {owner.medianCycleDays === null ? 'Indisponivel' : `${owner.medianCycleDays.toLocaleString('pt-BR')} dias`}
                        </td>
                        <td data-label="Receita ganha" className="py-2 text-right tabular-nums text-[color:var(--minimal-text)]">
                          {formatCurrencyBRL(owner.wonAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">Esses números são agregados pelo responsável nativo do negócio no HubSpot. Conversão e ciclo só aparecem quando a coorte de fechamentos possui base suficiente; tarefas, reuniões, ligações e e-mails ainda não têm read model publicado neste ambiente.</p>
              </>
            ) : (
              <MinimalState title="Sem responsáveis" description="Nenhum negócio aberto ou ganho foi atribuído no recorte." />
            )}
          </ChartCard> : null}
          <ChartCard title="Tarefas e atividades comerciais" description="Ações pendentes por pessoa ainda dependem de uma ingestão de atividades validada no backend.">
            <MinimalState title="Atividades indisponíveis" description="O dashboard ainda não publica tarefas, reuniões, ligações ou e-mails do HubSpot como read model. Nenhuma pendência é estimada a partir de negócios ou atendimentos." />
          </ChartCard>
          {kpiPayload ? <ChartCard title="Ganhos no período" description="Negócios efetivamente fechados como ganho no intervalo selecionado.">
            {commercialKpiDetails.closedWins.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="gso-analytics-responsive-table w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]">
                      <th className="py-2 pr-4">Negócio</th>
                      <th className="py-2 pr-4">Responsável</th>
                      <th className="py-2 pr-4">Data de ganho</th>
                      <th className="py-2 text-right">Receita ganha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commercialKpiDetails.closedWins.map((deal) => (
                      <tr key={deal.dealId} className="border-b border-[color:var(--minimal-border)] last:border-0">
                        <td data-label="Negócio" className="py-2 pr-4 text-[color:var(--minimal-text)]">{deal.dealName}</td>
                        <td data-label="Responsável" className="py-2 pr-4 text-[color:var(--minimal-text)]">{deal.ownerName}</td>
                        <td data-label="Data de ganho" className="py-2 pr-4 tabular-nums text-[color:var(--minimal-text)]">{formatCommercialCloseDate(deal.closedOn)}</td>
                        <td data-label="Receita ganha" className="py-2 text-right tabular-nums text-[color:var(--minimal-text)]">{formatCurrencyBRL(deal.amountHome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <MinimalState title="Nenhum ganho no período" description="Não houve negócio fechado como ganho no intervalo selecionado." />
            )}
          </ChartCard> : null}
        </div>
      ),
    },
    {
      id: 'evolucao',
      label: 'Evolução',
      question: 'Como ganhos, perdas e taxa de conversão se comportaram ao longo do tempo.',
      content: (
        <div className="space-y-4">
          {kpiPayload ? (
            <AnalyticsCommercialComparison
              currentPayload={kpiPayload}
              previousPayload={previousKpiPayload}
              currentPeriod={filters}
              previousPeriod={resolvePreviousComparablePeriod(filters)}
              phase={comparisonPhase}
            />
          ) : null}
          <AnalyticsTrendPanel domain="commercial" groupCompany={groupCompany} excludedPipelineIds={excludedPipelineIds} />
        </div>
      ),
    },
  ];

  return (
    <AnalyticsHdDomainFrame title="Comercial" description="Receita, pipeline e conversão para decisão comercial." source="HubSpot · Deals" state={displayState} headerAside={<AnalyticsExecutionMeta provider="HubSpot" run={latestHubspotRun} />}>
    <div className="gso-hd-domain-surface gso-pilot-commercial space-y-5">
      <AnalyticsFiltersBar value={filters} onApply={(next) => { setFilters(next); onSharedPeriodChange?.({ from: next.from, to: next.to }); }} stageOptions={stageOptions} ownerOptions={ownerOptions} extraFields={pipelineOptions.length > 0 ? <><AnalyticsOperationScope storageKey="analytics-operation-scope" value={groupCompany} onChange={(value) => { handleGroupCompanyChange(value); setFilters((current) => ({ ...current, stageId: '' })); }} options={configuredPipelines.map((pipeline) => ({ value: pipeline.groupCompany, source: pipeline.groupCompanySource }))} /><AnalyticsPipelineCombobox inline operation={groupCompany} storageKey="analytics-commercial-pipelines" pipelines={pipelineOptions.map((pipeline) => ({ ...pipeline, count: pipeline.dealCount, groupCompany: configuredPipelines.find((config) => config.pipelineId === pipeline.pipelineId)?.groupCompany ?? null }))} excludedPipelineIds={excludedPipelineIds} onChange={(next) => { setExcludedPipelineIds(next); setFilters((current) => hasCompatibleAnalyticsStage(state.stageCatalogFunnel, selectedAnalyticsPipelineIds(configuredPipelines, groupCompany, next), current.stageId) ? current : { ...current, stageId: '' }); }} /></> : null} />
      {stageScope.notice ? <p role="status" className="text-xs text-[color:var(--minimal-text-tertiary)]">{stageScope.notice}</p> : null}
      {dataState?.status === 'empty' ? (
        <MinimalState title="Nenhum dado neste recorte" description="Ajuste os filtros ou execute uma sincronização concluída para consultar o histórico." />
      ) : null}
      <AnalyticsDomainTabs tabs={subTabs} activeId={subTab} onChange={setSubTab} />
    </div>
    </AnalyticsHdDomainFrame>
  );
}

function formatCommercialCloseDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : 'Data não informada';
}

function formatOwnerRate(value: number | null): string {
  return formatCommercialWinRate(value);
}

function applyConfiguredPipelineLabels(snapshot: CommercialSnapshot, configs: AnalyticsSourceConfig[]): CommercialSnapshot {
  const labels = new Map(configs.map((config) => [config.pipelineId, config.label]));
  return {
    ...snapshot,
    byPipeline: snapshot.byPipeline.map((pipeline) => ({
      ...pipeline,
      label: labels.get(pipeline.pipelineId) || pipeline.label,
    })),
  };
}

function CommercialPipelineScopeFilter({
  pipelines,
  excludedPipelineIds,
  onChange,
}: {
  pipelines: Array<AnalyticsSourceConfig & { dealCount: number }>;
  excludedPipelineIds: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (pipelineId: string) => {
    onChange(excludedPipelineIds.includes(pipelineId)
      ? excludedPipelineIds.filter((id) => id !== pipelineId)
      : [...excludedPipelineIds, pipelineId]);
  };

  return <ChartCard title="Pipelines incluídos no recorte" description="Todos os pipelines comerciais ativos começam selecionados. Desmarque um para analisar somente os negócios desejados; a configuração persistida não é alterada.">
    <div className="flex flex-wrap gap-2">
      {pipelines.map((pipeline) => {
        const included = !excludedPipelineIds.includes(pipeline.pipelineId);
        return <label key={pipeline.id} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${included ? 'border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text)]' : 'border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)]'}`}>
          <input type="checkbox" checked={included} onChange={() => toggle(pipeline.pipelineId)} className="accent-[color:var(--minimal-text)]" />
          <span className="min-w-0"><span className="block truncate font-medium" title={pipeline.label}>{pipeline.label}</span><span className="block truncate text-[10px] opacity-60" title={pipeline.hubspotLabel || undefined}>HubSpot: {pipeline.hubspotLabel || 'nome ainda não sincronizado'}</span></span>
          <span className="shrink-0 font-mono text-[10px] opacity-60">{pipeline.pipelineId}</span>
          <span className="shrink-0 tabular-nums opacity-70">{pipeline.dealCount.toLocaleString('pt-BR')}</span>
          <MetricInfo ariaLabel={`Origem do pipeline ${pipeline.label}`} content={<div className="space-y-2 text-left"><p className="font-semibold">Origem do pipeline</p><p>Objeto: Deal (Comercial).</p><p>Nome oficial: {pipeline.hubspotLabel || 'aguardando sincronização'}.</p><p>Alias exibido no painel: {pipeline.alias || 'usa o nome oficial do HubSpot'}.</p><p>ID imutável: {pipeline.pipelineId}.</p></div>} />
        </label>;
      })}
      {excludedPipelineIds.length > 0 ? <button type="button" onClick={() => onChange([])} className="rounded-md border border-[color:var(--minimal-border-strong)] px-3 py-2 text-xs font-medium text-[color:var(--minimal-text)] hover:bg-[color:var(--minimal-surface-muted)]">Incluir todos</button> : null}
    </div>
    <p className="mt-3 text-xs text-[color:var(--minimal-text-tertiary)]">{excludedPipelineIds.length ? `${excludedPipelineIds.length} pipeline(s) excluído(s) somente deste recorte.` : 'O recorte atual considera todos os pipelines comerciais ativos configurados.'}</p>
  </ChartCard>;
}
