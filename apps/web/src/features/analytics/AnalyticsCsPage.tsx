import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MinimalState } from '../../components/minimal-states';
import { getCsSnapshot, getSupportKpisV2, getSupportQueueHealth, getSupportStageBreakdown, listAnalyticsSourceConfig } from './analytics-api';
import {
  type AnalyticsPageProps,
  type CsByStatus,
  type CsKpis,
  type CsMonthlyPoint,
  type CsSourcePoint,
  type CsPipelinePoint,
  type CsOwnerPoint,
  type CsPipelineBreakdown,
  type CsSnapshot,
  type AnalyticsFilters,
  DEFAULT_ANALYTICS_FILTERS,
  type AnalyticsSourceConfig,
} from './analytics-model';
import { AnalyticsLoadingState, AnalyticsRetryAction, ChartCard, MetricInfo } from './analytics-ui';
import { AnalyticsFilters as AnalyticsFiltersBar } from './AnalyticsFilters';
import { AnalyticsPipelineCombobox } from './AnalyticsPipelineCombobox';
import { AnalyticsOperationScope } from './AnalyticsOperationScope';
import { resolveAnalyticsPeriod } from './analytics-periods';
import { SupportStageChart, TicketStatusChart } from './charts/AnalyticsCharts';
import { SupportOwnerPerformanceChart, type SupportOwnerPerformanceRow } from './charts/OwnerPerformanceCharts';
import type { AnalyticsBlockState } from '@genius-support-os/contracts';
import { AnalyticsHdDomainFrame } from './AnalyticsHdDomainFrame';
import { AnalyticsBoardLimitations, AnalyticsKpiBoard, type BoardBand } from './AnalyticsKpiBoard';
import { AnalyticsDomainTabs, type DomainTab } from './AnalyticsDomainTabs';
import { AnalyticsTrendPanel } from './AnalyticsTrendPanel';
import { readStageBreakdown } from './analytics-stage-breakdown.mjs';
import { AnalyticsQueueHealth } from './AnalyticsQueueHealth';
import { hasCompatibleAnalyticsStage, readAnalyticsStageScope, selectedAnalyticsPipelineIds } from './analytics-stage-scope.mjs';

// Resolucao, tempo de resolucao e primeira resposta passaram a existir depois
// que a ingestao foi corrigida para pedir os campos que a conta realmente
// preenche. Reabertura continua dependendo do historico de etapa, ainda nao
// ingerido, e por isso aparece como aguardando historico.
// O detalhe tecnico da correcao esta no relatorio do ciclo, nao aqui: nomes de
// propriedade nao pertencem a camada de apresentacao.
const SUPPORT_BANDS: BoardBand[] = [
  {
    title: 'Agora',
    note: 'Quem está esperando neste momento.',
    items: [
      { key: 'open_backlog', kind: 'count', note: 'Aguardando atendimento nas filas de trabalho' },
      { key: 'median_backlog_age_days', kind: 'days', note: 'Há quanto tempo espera quem está na fila' },
      { key: 'stagnant_in_queue', kind: 'count', note: 'Dentro da fila, mas sem movimento há meses' },
    ],
  },
  {
    // O passivo tem faixa própria, e não um cartão ao lado da fila. Lado a lado,
    // o leitor soma mentalmente os dois e volta ao número que confundia.
    title: 'Fora da fila',
    note: 'Caixas de entrada que ninguém trabalha. Continuam contadas, separadas do que está em atendimento.',
    dense: true,
    items: [
      { key: 'dormant_backlog', kind: 'count', note: 'Registros parados fora das filas de trabalho' },
    ],
  },
  {
    title: 'No período',
    note: 'Movimento dentro do recorte selecionado acima.',
    items: [
      { key: 'created_tickets', kind: 'count', note: 'Entraram' },
      { key: 'resolved_tickets', kind: 'count', note: 'Encerrados' },
      { key: 'median_time_to_resolution_days', kind: 'days', note: 'Da abertura ao encerramento' },
      { key: 'median_first_response_hours', kind: 'days', note: 'Até o cliente receber o primeiro retorno' },
    ],
  },
  {
    title: 'Apoio',
    dense: true,
    items: [
      { key: 'p90_time_to_resolution_days', kind: 'days', note: 'Nove em cada dez resolvidos abaixo deste tempo' },
      // Sem este número, a mediana de resolução parece excelente sem que se
      // saiba quanto dela vem de fechamento automático na entrada.
      { key: 'instant_resolutions', kind: 'count', note: 'Entram no cálculo do tempo de resolução' },
      { key: 'reopen_rate', kind: 'percent', note: 'Resolvidos que precisaram voltar' },
    ],
  },
];

type State =
  | { phase: 'loading' }
  | { phase: 'ready'; kpis: CsKpis; byStatus: CsByStatus[]; monthly: CsMonthlyPoint[]; bySource: CsSourcePoint[]; byPipeline: CsPipelinePoint[]; byOwner: CsOwnerPoint[]; latestTicketCreatedAt: string | null; state?: AnalyticsBlockState }
  | { phase: 'error'; message: string };

type PipelineFilterOption = AnalyticsSourceConfig & Pick<CsPipelinePoint, 'ticketCount' | 'sourceSummary'>;

export function AnalyticsCsPage({ sharedPeriod, onSharedPeriodChange, sharedOperation, onSharedOperationChange, onRetry }: AnalyticsPageProps) {
  const [state, setState] = useState<State>({ phase: 'loading' });
  // Referência estável: sem o memo, `resolveAnalyticsPeriod` devolve um objeto
  // novo a cada render e a dependência do Effect precisaria ser desmembrada em
  // `period.from` e `period.to`, o que esconde a dependência real.
  const period = useMemo(
    () => sharedPeriod ?? resolveAnalyticsPeriod('month'),
    [sharedPeriod],
  );
  const [filters, setFilters] = useState<AnalyticsFilters>({ ...DEFAULT_ANALYTICS_FILTERS, ...period });
  const [configuredPipelines, setConfiguredPipelines] = useState<AnalyticsSourceConfig[]>([]);
  const [excludedPipelineIds, setExcludedPipelineIds] = useState<string[]>([]);
  const [groupCompany, setGroupCompany] = useState(sharedOperation ?? '');
  const [kpiPayload, setKpiPayload] = useState<unknown>(null);
  const [stagePayload, setStagePayload] = useState<unknown>(null);
  const [queuePayload, setQueuePayload] = useState<unknown>(null);
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
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    setState((current) => current.phase === 'ready' ? current : { phase: 'loading' });

    void getSupportKpisV2(filters, groupCompany || null)
      .then((payload) => { if (!cancelled) setKpiPayload(payload); })
      .catch(() => { if (!cancelled) setKpiPayload(null); });

    // A distribuição por etapa não recebe o recorte de data: ela responde "quem
    // está na fila agora", e filtrar por período faria a barra contar apenas
    // parte de quem espera.
    void getSupportStageBreakdown(null, groupCompany || null)
      .then((payload) => { if (!cancelled) setStagePayload(payload); })
      .catch(() => { if (!cancelled) setStagePayload(null); });

    void getSupportQueueHealth(groupCompany || null)
      .then((payload) => { if (!cancelled) setQueuePayload(payload); })
      .catch(() => { if (!cancelled) setQueuePayload(null); });

    Promise.all([getCsSnapshot(filters, excludedPipelineIds, groupCompany || null), listAnalyticsSourceConfig()])
      .then(([snapshot, configs]) => {
        if (!cancelled) {
          const activeConfigs = configs.filter((config) => config.domainKey === 'cs' && config.objectType === 'ticket' && config.isActive);
          const labeledSnapshot = applyConfiguredPipelineLabels(snapshot, activeConfigs);
          setConfiguredPipelines(activeConfigs);
          setState({ phase: 'ready', ...labeledSnapshot });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message:
              error instanceof Error ? error.message : 'Falha ao carregar os dados de suporte.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, excludedPipelineIds, groupCompany]);

  if (state.phase === 'loading') {
    return <AnalyticsHdDomainFrame title="Suporte" description="Fila, tempo de resposta e distribuição dos atendimentos." source="HubSpot"><AnalyticsLoadingState title="Carregando suporte" description="O Gênio está reunindo os atendimentos do período." /></AnalyticsHdDomainFrame>;
  }

  if (state.phase === 'error') {
    return <AnalyticsHdDomainFrame title="Suporte" description="Fila, tempo de resposta e distribuição dos atendimentos." source="HubSpot"><MinimalState tone="critical" title="Não foi possível carregar" description="Os indicadores de suporte estão indisponíveis no momento." actions={<AnalyticsRetryAction onRetry={onRetry} />} /></AnalyticsHdDomainFrame>;
  }

  const { byStatus, bySource, byPipeline, byOwner, latestTicketCreatedAt, state: dataState } = state;
  const supportOwnerPerformance = readSupportOwnerPerformance(kpiPayload);
  const stages = readStageBreakdown(stagePayload);
  const selectedPipelineIds = selectedAnalyticsPipelineIds(configuredPipelines, groupCompany, excludedPipelineIds);
  const stageScope = readAnalyticsStageScope(byStatus, selectedPipelineIds);
  const stageOptions = stageScope.options;
  const priorityOptions = [{ value: 'HIGH', label: 'Alta' }, { value: 'MEDIUM', label: 'Média' }, { value: 'LOW', label: 'Baixa' }];
  const pipelineOptions: PipelineFilterOption[] = configuredPipelines.map((pipeline) => {
    const observed = byPipeline.find((item) => item.pipelineId === pipeline.pipelineId);
    return { ...pipeline, ticketCount: observed?.ticketCount ?? 0, sourceSummary: observed?.sourceSummary ?? [] };
  });

  const subTabs: DomainTab[] = [
    {
      id: 'posicao',
      label: 'Posição',
      question: 'Como está a fila agora e o que se moveu no recorte selecionado.',
      content: (
        <div className="space-y-4">
          {kpiPayload ? (
            <>
              <AnalyticsKpiBoard payload={kpiPayload} bands={SUPPORT_BANDS} />
              <AnalyticsBoardLimitations payload={kpiPayload} />
            </>
          ) : null}
          {/* A saúde da fila vem logo depois dos indicadores e antes da
              distribuição por etapa: ela qualifica o número que acabou de ser
              lido, e qualificação atrasada não conserta leitura já feita. */}
          {dataState?.status !== 'empty' && queuePayload ? (
            <AnalyticsQueueHealth payload={queuePayload} />
          ) : null}
          {/* A lista de "clientes sem resposta" saiu da tela.
              Ela tratava como dívida um conjunto em que dois terços estavam em
              etapas de espera legítima — "Aguardando Cliente", "Pendente N2" —
              e metade das empresas já tinha voltado a abrir chamado depois.
              Publicar aquilo levaria a cobrar o time por uma dívida que não
              existe no tamanho anunciado. O read model continua no banco; volta
              quando distinguir espera de abandono. */}
          {dataState?.status !== 'empty' ? (
            <ChartCard
              title="Atendimentos / Service desk · fila por etapa"
              description="O painel de atendimentos concentra a fila operacional. Etapas cruzadas entre pipelines aparecem somadas; o tooltip abre a composição por pipeline."
            >
              {stages.available ? (
                <>
                  <SupportStageChart rows={stages.rows} />
                  <p className="mt-3 border-t border-[color:var(--minimal-border)] pt-2 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">
                    {/* Esta frase existe porque a origem tem etapas com nome de
                        conclusão configuradas como abertas, e a fila as conta.
                        O painel não corrige isso adivinhando pelo nome — seria
                        inventar uma regra de negócio na tela. Ele diz de onde
                        vem a classificação, para que a contradição fique
                        visível e possa ser corrigida onde nasce. */}
                    Um atendimento conta como fila enquanto a etapa em que ele está estiver marcada como aberta na
                    origem. Etapa com nome de conclusão que apareça aqui indica configuração a revisar no HubSpot.
                  </p>
                  {stages.notice ? (
                    <p className="mt-1 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">
                      {stages.notice}
                    </p>
                  ) : null}
                </>
              ) : byStatus.length > 0 ? (
                // O modelo antigo continua como reserva enquanto o cruzamento
                // não devolve linha: melhor uma leitura menos consolidada do que
                // nenhuma leitura.
                <TicketStatusChart data={byStatus} />
              ) : (
                <MinimalState title="Sem etapas" description="Execute uma sincronização para carregar as etapas dos pipelines." />
              )}
            </ChartCard>
          ) : null}
          {kpiPayload ? <ChartCard title="Performance do suporte por responsável" description="Fila atual e movimento do período atribuídos ao responsável nativo do atendimento no HubSpot.">
            {supportOwnerPerformance.length ? <>
              <SupportOwnerPerformanceChart owners={supportOwnerPerformance} />
              <div className="mt-4 overflow-x-auto">
                <table className="gso-analytics-responsive-table w-full min-w-[660px] text-xs text-left">
                  <thead className="border-b border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)]"><tr><th className="px-2 py-2 font-medium">Responsável</th><th className="px-2 py-2 text-right font-medium">Em aberto</th><th className="px-2 py-2 text-right font-medium">Entraram</th><th className="px-2 py-2 text-right font-medium">Resolvidos</th><th className="px-2 py-2 text-right font-medium">Mediana até resolução</th></tr></thead>
                  <tbody>{supportOwnerPerformance.map((owner) => <tr key={owner.key} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Responsável" className="px-2 py-2 font-medium text-[color:var(--minimal-text)]">{owner.name}</td><td data-label="Em aberto" className="px-2 py-2 text-right tabular-nums">{owner.openTickets.toLocaleString('pt-BR')}</td><td data-label="Entraram" className="px-2 py-2 text-right tabular-nums">{owner.createdTickets.toLocaleString('pt-BR')}</td><td data-label="Resolvidos" className="px-2 py-2 text-right tabular-nums">{owner.resolvedTickets.toLocaleString('pt-BR')}</td><td data-label="Mediana até resolução" className="px-2 py-2 text-right tabular-nums">{owner.medianResolutionDays === null ? 'Indisponível' : `${owner.medianResolutionDays.toLocaleString('pt-BR')} dias`}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">A mediana por pessoa segue a mesma cobertura do tempo de resolução publicado pelo read model. Tarefas, reuniões, ligações e e-mails não são inferidos de atendimentos.</p>
            </> : <MinimalState title="Sem performance por responsável" description="O período não publicou atendimentos atribuídos com movimento suficiente para separar a equipe." />}
          </ChartCard> : null}
          <ChartCard title="Tarefas e atividades de suporte" description="A fila de atendimentos não é tratada como uma segunda lista de tarefas.">
            <MinimalState title="Atividades indisponíveis" description="O contrato atual publica atendimentos e suas métricas de fila, mas não tarefas, reuniões, ligações ou e-mails. A experiência de chat também permanece fora do read model confirmado." />
          </ChartCard>
          {dataState?.status !== 'empty' ? <ChartCard title="Origem, pipeline e responsável" description={`O recorte reúne os pipelines ativos de CS / Suporte. Último atendimento registrado: ${latestTicketCreatedAt ? new Date(latestTicketCreatedAt).toLocaleString('pt-BR') : 'indisponível'}.`}>
            <div className="grid gap-4 lg:grid-cols-3"><Breakdown title="Por origem" rows={bySource.map((row) => ({ label: row.label, value: row.ticketCount }))} /><Breakdown title="Por pipeline" rows={byPipeline.map((row) => ({ label: row.label, value: row.ticketCount }))} /><Breakdown title="Por responsável" rows={byOwner.slice(0, 8).map((row) => ({ label: row.ownerName, value: row.ticketCount }))} /></div>
            <OwnerPipelineNote owners={byOwner.slice(0, 8)} />
          </ChartCard> : null}
          <ChartCard title="Chat / Conversas" description="Painel separado para não misturar conversas com atendimentos enquanto a fonte real ainda não está conectada.">
            <MinimalState title="Chat indisponível" description="A fonte de conversas ainda não possui read model confirmado neste ambiente. O painel fica separado e nenhum atendimento é contado como chat por aproximação." />
          </ChartCard>
        </div>
      ),
    },
    {
      id: 'evolucao',
      label: 'Evolução',
      question: 'Como a fila se comportou ao longo do tempo: se o time está ganhando ou perdendo terreno.',
      content: <AnalyticsTrendPanel domain="support" groupCompany={groupCompany} excludedPipelineIds={excludedPipelineIds} />,
    },
  ];

  return (
    <AnalyticsHdDomainFrame title="Suporte" description="Fila, tempo de resposta e distribuição dos atendimentos." source="HubSpot" state={dataState}>
    <div className="gso-hd-domain-surface space-y-5">
      <AnalyticsFiltersBar value={filters} onApply={(next) => { setFilters(next); onSharedPeriodChange?.({ from: next.from, to: next.to }); }} stageOptions={stageOptions} priorityOptions={priorityOptions} stageLabel="Status" extraFields={pipelineOptions.length > 0 ? <><AnalyticsOperationScope storageKey="analytics-operation-scope" value={groupCompany} onChange={(value) => { handleGroupCompanyChange(value); setFilters((current) => ({ ...current, stageId: '' })); }} options={configuredPipelines.map((pipeline) => ({ value: pipeline.groupCompany, source: pipeline.groupCompanySource }))} /><AnalyticsPipelineCombobox inline operation={groupCompany} storageKey="analytics-cs-pipelines" pipelines={pipelineOptions.map((pipeline) => ({ ...pipeline, count: pipeline.ticketCount, groupCompany: configuredPipelines.find((config) => config.pipelineId === pipeline.pipelineId)?.groupCompany ?? null }))} excludedPipelineIds={excludedPipelineIds} onChange={(next) => { setExcludedPipelineIds(next); setFilters((current) => hasCompatibleAnalyticsStage(byStatus, selectedAnalyticsPipelineIds(configuredPipelines, groupCompany, next), current.stageId) ? current : { ...current, stageId: '' }); }} /></> : null} />
      {stageScope.notice ? <p role="status" className="text-xs text-[color:var(--minimal-text-tertiary)]">{stageScope.notice}</p> : null}
      {dataState?.status === 'empty' ? <MinimalState title="Nenhum dado neste recorte" description="Ajuste os filtros ou execute uma sincronização concluída para consultar o histórico." /> : null}
      <AnalyticsDomainTabs tabs={subTabs} activeId={subTab} onChange={setSubTab} />
    </div>
    </AnalyticsHdDomainFrame>
  );
}

function readSupportOwnerPerformance(value: unknown): SupportOwnerPerformanceRow[] {
  const payload = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawRows = Array.isArray(payload.by_owner) ? payload.by_owner : [];
  return rawRows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row, index) => ({
      key: typeof row.owner_id === 'string' && row.owner_id.trim() ? `owner:${row.owner_id}` : `unassigned:${index}`,
      name: typeof row.owner_name === 'string' && row.owner_name.trim() ? row.owner_name : 'Sem responsável',
      openTickets: numericValue(row.open_tickets),
      createdTickets: numericValue(row.created_tickets),
      resolvedTickets: numericValue(row.resolved_tickets),
      medianResolutionDays: nullableNumericValue(row.median_resolution_days),
    }))
    .filter((row) => row.openTickets > 0 || row.createdTickets > 0 || row.resolvedTickets > 0);
}

function numericValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyConfiguredPipelineLabels(snapshot: CsSnapshot, configs: AnalyticsSourceConfig[]): CsSnapshot {
  const labels = new Map(configs.map((config) => [config.pipelineId, config.label]));
  const label = (pipelineId: string, current: string) => current || labels.get(pipelineId) || pipelineId;
  const breakdown = (rows?: CsPipelineBreakdown[]) => rows?.map((row) => ({ ...row, pipelineLabel: label(row.pipelineId, row.pipelineLabel) }));
  return {
    ...snapshot,
    byPipeline: snapshot.byPipeline.map((row) => ({ ...row, label: label(row.pipelineId, row.label) })),
    byStatus: snapshot.byStatus.map((row) => ({ ...row, pipelineBreakdown: breakdown(row.pipelineBreakdown) })),
    byOwner: snapshot.byOwner.map((row) => ({ ...row, pipelineBreakdown: breakdown(row.pipelineBreakdown) })),
  };
}

function PipelineScopeFilter({ pipelines, excludedPipelineIds, onChange }: { pipelines: PipelineFilterOption[]; excludedPipelineIds: string[]; onChange: (next: string[]) => void }) {
  const toggle = (pipelineId: string) => {
    onChange(excludedPipelineIds.includes(pipelineId) ? excludedPipelineIds.filter((id) => id !== pipelineId) : [...excludedPipelineIds, pipelineId]);
  };
  return <ChartCard title="Pipelines incluídos no recorte" description="Todos começam selecionados. Desmarque um pipeline para recalcular somente o atendimento desejado; a configuração persistida permanece intacta.">
    <div className="flex flex-wrap gap-2">
      {pipelines.map((pipeline) => {
        const included = !excludedPipelineIds.includes(pipeline.pipelineId);
        return <label key={pipeline.id} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${included ? 'border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text)]' : 'border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)]'}`}>
          <input type="checkbox" checked={included} onChange={() => toggle(pipeline.pipelineId)} className="accent-[color:var(--minimal-text)]" />
          <span className="min-w-0"><span className="block truncate font-medium" title={pipeline.label}>{pipeline.label}</span><span className="block truncate text-[10px] opacity-60" title={pipeline.hubspotLabel || undefined}>HubSpot: {pipeline.hubspotLabel || 'nome ainda não sincronizado'}</span></span>
          <span className="shrink-0 font-mono text-[10px] opacity-60">{pipeline.pipelineId}</span>
          <MetricInfo ariaLabel={`Origem do pipeline ${pipeline.label}`} content={<PipelineOriginHint pipeline={pipeline} />} />
        </label>;
      })}
      {excludedPipelineIds.length > 0 ? <button type="button" onClick={() => onChange([])} className="rounded-md border border-[color:var(--minimal-border-strong)] px-3 py-2 text-xs font-medium text-[color:var(--minimal-text)] hover:bg-[color:var(--minimal-surface-muted)]">Incluir todos</button> : null}
    </div>
    <p className="mt-3 text-xs text-[color:var(--minimal-text-tertiary)]">{excludedPipelineIds.length ? `${excludedPipelineIds.length} pipeline(s) excluído(s) temporariamente deste recorte.` : 'O recorte atual considera todos os pipelines CS / Suporte ativos.'}</p>
  </ChartCard>;
}

function PipelineOriginHint({ pipeline }: { pipeline: PipelineFilterOption }) {
  const sources = pipeline.sourceSummary ?? [];
  const total = pipeline.ticketCount;
  const missing = sources.find((source) => source.label.toLowerCase() === 'sem fonte')?.ticketCount ?? 0;
  const known = sources.filter((source) => source.label.toLowerCase() !== 'sem fonte');
  const knownTotal = known.reduce((sum, source) => sum + source.ticketCount, 0);
  const confidence = !sources.length || !known.length ? 'Indisponível' : missing ? 'Parcial' : 'Observada';

  return <div className="space-y-3 text-left">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]">Origem do pipeline</p>
      <p className="mt-1 font-semibold text-[color:var(--minimal-text)]">{pipeline.label}</p>
      <p className="mt-1 text-[11px] text-[color:var(--minimal-text-secondary)]">HubSpot: {pipeline.hubspotLabel || 'nome ainda não sincronizado'}</p>
      <p className="mt-0.5 font-mono text-[11px] text-[color:var(--minimal-text-tertiary)]">ID {pipeline.pipelineId}</p>
    </div>

    <InfoRow label="Evidência usada">
      Origem do ticket informada pelo HubSpot, no recorte atual.
    </InfoRow>

    <InfoRow label={`Distribuição observada · ${total.toLocaleString('pt-BR')} ticket(s)`}>
      {known.length ? <ul className="space-y-1">
        {known.slice(0, 5).map((source) => <li key={source.label} className="flex items-center justify-between gap-3"><span>{formatTicketSource(source.label)}</span><span className="font-semibold tabular-nums text-[color:var(--minimal-text)]">{source.ticketCount.toLocaleString('pt-BR')} <span className="font-normal text-[color:var(--minimal-text-tertiary)]">({formatShare(source.ticketCount, total)})</span></span></li>)}
        {known.length > 5 ? <li className="text-[color:var(--minimal-text-tertiary)]">+ {known.length - 5} outras classificações.</li> : null}
      </ul> : <span>Nenhum ticket veio com a origem preenchida.</span>}
    </InfoRow>

    <InfoRow label="Cobertura da evidência">
      <span className={confidence === 'Observada' ? 'font-semibold text-[color:var(--minimal-action)]' : 'font-semibold text-[color:var(--minimal-warning-text)]'}>{confidence}</span>{' · '}{knownTotal.toLocaleString('pt-BR')} ticket(s) classificados{missing ? `; ${missing.toLocaleString('pt-BR')} sem origem preenchida` : ''}.
    </InfoRow>

    <InfoRow label="O que ainda não é possível afirmar">
      <span>O painel não recebeu o identificador do widget, formulário, URL do site, inbox ou número de WhatsApp. Portanto, <strong>Chat/widget</strong>, <strong>Formulário</strong> e <strong>WhatsApp</strong> são canais observados, não uma prova do ponto de entrada específico.</span>
    </InfoRow>
  </div>;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="border-t border-[color:var(--minimal-border)] pt-2 first:border-0 first:pt-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]">{label}</p><div className="text-[11px] leading-4 text-[color:var(--minimal-text-secondary)]">{children}</div></div>;
}

function formatShare(value: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatTicketSource(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CHAT') return 'Chat/widget';
  if (normalized === 'FORM') return 'Formulário';
  if (normalized === 'EMAIL') return 'E-mail';
  if (normalized === 'PHONE') return 'Telefone';
  if (normalized === 'WHTASAPP' || normalized === 'WHATSAPP') return 'WhatsApp';
  if (normalized === 'BOT') return 'Bot';
  return value;
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  return <div><h4 className="mb-2 text-xs font-semibold text-[color:var(--minimal-text)]">{title}</h4><div className="space-y-1.5">{rows.length ? rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-md bg-[color:var(--minimal-surface-muted)] px-2.5 py-2 text-xs"><span className="truncate text-[color:var(--minimal-text-secondary)]" title={row.label}>{row.label}</span><span className="font-semibold tabular-nums text-[color:var(--minimal-text)]">{row.value.toLocaleString('pt-BR')}</span></div>) : <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem dados.</p>}</div></div>;
}

function OwnerPipelineNote({ owners }: { owners: CsOwnerPoint[] }) {
  return <div className="mt-4 rounded-md border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] p-3">
    <div className="flex items-center gap-1.5"><h4 className="text-xs font-semibold text-[color:var(--minimal-text)]">Detalhamento dos responsáveis por pipeline</h4><MetricInfo ariaLabel="Como os responsáveis são consolidados" text="Responsáveis com o mesmo nome são consolidados no total. Esta lista mostra em quais pipelines cada responsável aparece e quantos atendimentos foram encontrados em cada um." /></div>
    <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{owners.length ? owners.map((owner) => <div key={`${owner.ownerId ?? 'none'}-${owner.ownerName}`} className="rounded-md border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface)] px-2.5 py-2 text-[11px]"><div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-[color:var(--minimal-text)]" title={owner.ownerName}>{owner.ownerName}</span><span className="font-semibold tabular-nums text-[color:var(--minimal-text)]">{owner.ticketCount.toLocaleString('pt-BR')}</span></div><p className="mt-1 text-[color:var(--minimal-text-tertiary)]">{formatPipelineBreakdown(owner.pipelineBreakdown) || 'Pipeline indisponível'}</p></div>) : <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem dados.</p>}</div>
  </div>;
}

function formatPipelineBreakdown(rows?: CsPipelineBreakdown[]): string {
  if (!rows?.length) return '';
  return rows.map((row) => `${row.pipelineLabel}: ${row.ticketCount.toLocaleString('pt-BR')}`).join(' · ');
}
