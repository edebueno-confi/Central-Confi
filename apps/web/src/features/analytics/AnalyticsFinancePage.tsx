import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MinimalState } from '../../components/minimal-states';
import { getFinanceSnapshot, getFinanceSourceStatus, listOmieSyncRuns } from './analytics-api';
import { AnalyticsLoadingState, ChartCard, KpiCard, MetricInfo } from './analytics-ui';
import { analyticsSourceToBlockState, formatCurrencyBRL, formatMonthLabel, formatPercent, type AnalyticsFilters, DEFAULT_ANALYTICS_FILTERS, type AnalyticsPageProps, type FinanceBreakdown, type FinanceSnapshot, type FinanceSourceStatus } from './analytics-model';
import { ANALYTICS_PERIOD_OPTIONS, resolveAnalyticsPeriod, type AnalyticsPeriodPreset } from './analytics-periods';
import { AnalyticsExecutionMeta, AnalyticsHdDomainFrame } from './AnalyticsHdDomainFrame';
import { AnalyticsDomainTabs } from './AnalyticsDomainTabs';
import { AnalyticsTrendPanel } from './AnalyticsTrendPanel';
import { buildAnalyticsQueryKey } from './analytics-query-key';
import { createAnalyticsLoadingState } from './analytics-reactive-state.mjs';

type FinanceFilters = AnalyticsFilters & { clientQuery: string };

const STATUS_OPTIONS = ['RECEBIDO', 'ATRASADO', 'VENCE HOJE', 'A VENCER', 'CANCELADO'];
const AGING_OPTIONS: [string, string][] = [
  ['atrasado', 'Vencido'], ['vence_hoje', 'Vence hoje'], ['a_vencer', 'A vencer'], ['recebido', 'Recebido'], ['cancelado', 'Cancelado'],
];

function titleCase(value: string): string {
  return value.toLowerCase().replace(/(^|\s|\/)([a-zà-ú])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

// Tag colorida para conduzir o olhar ao dado crítico.
function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'positive' | 'warning' | 'critical' | 'info' }) {
  const map: Record<string, string> = {
    neutral: 'border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text-secondary)]',
    positive: 'border-[color:var(--minimal-action)] bg-[color:var(--minimal-surface)] text-[color:var(--minimal-action)]',
    warning: 'border-[color:var(--minimal-warning-border)] bg-[color:var(--minimal-warning-surface)] text-[color:var(--minimal-warning-text)]',
    critical: 'border-[color:var(--minimal-danger-border)] bg-[color:var(--minimal-danger-surface)] text-[color:var(--minimal-danger-text)]',
    info: 'border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface)] text-[color:var(--minimal-text)]',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>{label}</span>;
}

function agingTone(bucket: string): 'positive' | 'warning' | 'critical' | 'neutral' {
  if (/90\+/.test(bucket)) return 'critical';
  if (/61-90|31-60/.test(bucket)) return 'warning';
  if (/1-30/.test(bucket)) return 'warning';
  if (/vencer/i.test(bucket)) return 'positive';
  return 'neutral';
}

function HistoryLink() {
  return <Link to="/admin/settings?section=analytics&panel=history" className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-1.5 text-sm font-medium text-[color:var(--minimal-text)]">Ver histórico</Link>;
}

function FinanceSourceLinks() {
  return <div className="flex flex-wrap items-center gap-2"><Link to="/admin/settings?section=analytics&panel=omie" className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-1.5 text-sm font-medium text-[color:var(--minimal-text)]">Gerenciar OMIE</Link><HistoryLink /></div>;
}

function BreakdownTable({ rows, valueHeader, labelHeader, humanize, toneFor }: { rows: FinanceBreakdown[]; valueHeader: string; labelHeader: string; humanize?: boolean; toneFor?: (key: string) => 'positive' | 'warning' | 'critical' | 'neutral' }) {
  const total = rows.reduce((sum, row) => sum + row.balance, 0);
  if (rows.length === 0) return <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem dados neste recorte.</p>;
  return <div className="overflow-x-auto">
    <table className="gso-analytics-responsive-table w-full min-w-[420px] text-sm">
      <thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]">
        <th className="py-2">{labelHeader}</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">{valueHeader}</th><th className="py-2 text-right">% da carteira</th>
      </tr></thead>
      <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-[color:var(--minimal-border)] last:border-0">
        <td data-label="Títulos" className="py-2">{toneFor ? <Tag label={humanize ? titleCase(row.key) : row.key} tone={toneFor(row.key)} /> : <span className="text-[color:var(--minimal-text)]">{humanize ? titleCase(row.key) : row.key}</span>}</td>
        <td data-label="% da carteira" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td>
        <td data-label="Títulos" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-text)]">{formatCurrencyBRL(row.balance)}</td>
        <td data-label="% da carteira" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-tertiary)]">{total > 0 ? formatPercent(row.balance / total) : '—'}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function AnalyticsFinancePage({ sharedPeriod, onSharedPeriodChange, sharedOperation, onSharedOperationChange, sourceStatus: unifiedSourceStatus }: AnalyticsPageProps) {
  const period = sharedPeriod ?? resolveAnalyticsPeriod('month');
  const [filters, setFilters] = useState<FinanceFilters>({ ...DEFAULT_ANALYTICS_FILTERS, ...period, clientQuery: '' });
  const [draft, setDraft] = useState(filters);
  const [state, setState] = useState<{ phase: 'loading' } | { phase: 'ready'; snapshot: FinanceSnapshot } | { phase: 'error'; message: string }>({ phase: 'loading' });
  const [financeSourceStatus, setFinanceSourceStatus] = useState<FinanceSourceStatus | null>(null);
  const [latestOmieRun, setLatestOmieRun] = useState<import('./analytics-model').OmieSyncRun | null>(null);
  const [preset, setPreset] = useState<AnalyticsPeriodPreset | ''>('month');
  const [showReconciliationDetails, setShowReconciliationDetails] = useState(false);
  const [subTab, setSubTab] = useState('posicao');
  const [validation, setValidation] = useState<string | null>(null);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryKey = buildAnalyticsQueryKey({
    domain: 'finance',
    period: filters,
    operation: sharedOperation,
    ownerId: filters.ownerId,
    stageId: filters.stageId,
    priority: filters.priority,
    grain: 'position',
    search: filters.clientQuery,
  });

  useEffect(() => () => {
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
  }, []);

  useEffect(() => {
    setFilters((current) => current.from === period.from && current.to === period.to ? current : { ...current, ...period });
    setDraft((current) => current.from === period.from && current.to === period.to ? current : { ...current, ...period });
  }, [period.from, period.to]);

  useEffect(() => {
    let cancelled = false;
    setState(createAnalyticsLoadingState());
    if (sharedOperation) {
      setState({ phase: 'error', message: 'O Financeiro ainda não publica dimensão de operação.' });
      return () => { cancelled = true; };
    }
    getFinanceSnapshot(filters, filters.clientQuery)
      .then((snapshot) => { if (!cancelled) setState({ phase: 'ready', snapshot }); })
      .catch((error) => { if (!cancelled) setState({ phase: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar o financeiro.' }); });
    return () => { cancelled = true; };
    // queryKey contém período, operação, situação, aging e busca do cliente.
    // A dependência semântica evita consultas duplicadas por nova referência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  useEffect(() => { getFinanceSourceStatus().then(setFinanceSourceStatus).catch(() => setFinanceSourceStatus(null)); }, []);
  useEffect(() => { listOmieSyncRuns().then((runs) => setLatestOmieRun(runs[0] ?? null)).catch(() => setLatestOmieRun(null)); }, []);

  const updateDraft = (patch: Partial<FinanceFilters>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (next.from && next.to && next.from > next.to) {
      setValidation('A data inicial precisa ser anterior ou igual à data final.');
      return;
    }
    setValidation(null);
    if ('clientQuery' in patch) {
      if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
      clientSearchTimer.current = setTimeout(() => {
        setFilters((current) => ({ ...current, clientQuery: next.clientQuery }));
      }, 300);
      return;
    }
    setFilters(next);
    if ('from' in patch || 'to' in patch) onSharedPeriodChange?.({ from: next.from, to: next.to });
  };
  const applyPreset = (nextPreset: AnalyticsPeriodPreset) => {
    setPreset(nextPreset);
    const next = { ...draft, ...resolveAnalyticsPeriod(nextPreset) };
    setDraft(next); setFilters(next); setValidation(null);
    onSharedPeriodChange?.(resolveAnalyticsPeriod(nextPreset));
  };

  if (sharedOperation) return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber"><MinimalState title={`Financeiro consolidado fora do recorte ${sharedOperation}`} description="A fonte OMIE ainda não publica a operação associada a cada título. Para evitar atribuição incorreta, o consolidado fica oculto enquanto uma operação estiver selecionada." actions={<button type="button" className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-2 text-sm font-medium text-[color:var(--minimal-text)]" onClick={() => onSharedOperationChange?.('')}>Ver Financeiro consolidado</button>} /></AnalyticsHdDomainFrame>;
  if (state.phase === 'loading') return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber"><AnalyticsLoadingState title="Carregando financeiro" description="O Gênio está consultando as Contas a Receber do OMIE." /></AnalyticsHdDomainFrame>;
  if (state.phase === 'error') return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber"><MinimalState tone="critical" title="Não foi possível carregar" description="Os indicadores financeiros estão indisponíveis no momento. Consulte o Histórico para ver o motivo." actions={<HistoryLink />} /></AnalyticsHdDomainFrame>;
  const { snapshot } = state;
  const { kpis } = snapshot;
  const dataState = unifiedSourceStatus ? analyticsSourceToBlockState(unifiedSourceStatus.omie) : snapshot.state;
  const lastSuccessAt = unifiedSourceStatus?.omie.lastSuccessAt ?? snapshot.state?.lastSuccessfulSyncAt ?? null;
  const sourceLabel = dataState?.status === 'failed' || dataState?.status === 'error'
    ? lastSuccessAt ? `Últimos dados válidos em ${new Date(lastSuccessAt).toLocaleString('pt-BR')}` : 'Atualização não registrada'
    : lastSuccessAt ? `Dados atualizados em ${new Date(lastSuccessAt).toLocaleString('pt-BR')}` : 'Atualização não registrada';
  const financeSourceMeta = <div className="gso-finance-source-meta" aria-label={sourceLabel}>
    <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-1">
      <Link to="/admin/settings?section=analytics&panel=omie">Gerenciar OMIE</Link>
    </div>
    <AnalyticsExecutionMeta provider="OMIE" run={latestOmieRun} />
    {!financeSourceStatus?.api.configured ? <p>Configure a credencial OMIE em Configurações → Integrações. O histórico fica em Configurações → Histórico.</p> : null}
  </div>;
  if ((dataState?.status === 'error' || dataState?.status === 'failed' || dataState?.status === 'unavailable' || dataState?.status === 'unavailable_source') && !dataState.lastSuccessfulSyncAt) return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber" state={dataState}><MinimalState tone="critical" title="Dados financeiros ainda não disponíveis" description="A última atualização do OMIE não foi concluída. Consulte o Histórico para ver o motivo." actions={<HistoryLink />} /></AnalyticsHdDomainFrame>;
  if (dataState?.status === 'not_configured') return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber" state={dataState}><MinimalState title="Fonte financeira não configurada" description="Configure a integração OMIE para consultar estes indicadores. Planilhas não são consideradas fonte financeira." actions={<FinanceSourceLinks />} /></AnalyticsHdDomainFrame>;
  if (snapshot.source !== 'api') return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber" state={dataState}><MinimalState tone="critical" title="Dados OMIE indisponíveis" description="O Financeiro publica somente dados de uma sincronização OMIE válida. A fonte disponível não é uma leitura OMIE confirmada; configure o OMIE e consulte o Histórico para acompanhar a execução." actions={<FinanceSourceLinks />} /></AnalyticsHdDomainFrame>;
  const controlClass = 'mt-1 block w-full rounded-lg border border-[color:var(--minimal-border-strong)] bg-transparent px-2 py-1.5 text-sm text-[color:var(--minimal-text)]';

  return <AnalyticsHdDomainFrame title="Financeiro" description="Recebíveis, aging e posição financeira atual." source="OMIE · Contas a Receber" state={dataState} headerAside={financeSourceMeta}>
    <div className="gso-hd-domain-surface gso-pilot-finance space-y-5">
    {/* Filtros */}
    <section className="rounded-xl border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface)] p-4">
      <div className="grid gap-3 md:grid-cols-8">
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">Período<select value={preset} onChange={(e) => applyPreset(e.target.value as AnalyticsPeriodPreset)} className={controlClass}><option value="">Personalizado</option>{ANALYTICS_PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">De<input type="date" value={draft.from} onChange={(e) => updateDraft({ from: e.target.value })} className={controlClass} /></label>
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">Até<input type="date" value={draft.to} onChange={(e) => updateDraft({ to: e.target.value })} className={controlClass} /></label>
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">Situação<select value={draft.stageId} onChange={(e) => updateDraft({ stageId: e.target.value })} className={controlClass}><option value="">Todas</option>{STATUS_OPTIONS.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">Aging<select value={draft.priority} onChange={(e) => updateDraft({ priority: e.target.value })} className={controlClass}><option value="">Todos</option>{AGING_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-[color:var(--minimal-text-secondary)]">Cliente<input value={draft.clientQuery} onChange={(e) => updateDraft({ clientQuery: e.target.value })} placeholder="Nome ou CNPJ" className={controlClass} /></label>
        <div className="flex items-end gap-2 md:col-span-2"><button type="button" onClick={() => { const next = { ...DEFAULT_ANALYTICS_FILTERS, ...resolveAnalyticsPeriod('month'), clientQuery: '' }; if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current); setPreset('month'); setDraft(next); setFilters(next); setValidation(null); onSharedPeriodChange?.({ from: next.from, to: next.to }); }} className="h-9 rounded-lg border border-[color:var(--minimal-border-strong)] px-3 text-sm text-[color:var(--minimal-text)]">Limpar</button></div>
      </div>
      {validation ? <p role="alert" className="mt-2 text-xs text-[color:var(--minimal-danger-text)]">{validation}</p> : null}
    </section>

    {dataState?.status === 'empty' ? <MinimalState title="Nenhum dado financeiro" description="A consulta funcionou, mas não há registros neste recorte. Experimente ampliar o período." /> : <AnalyticsDomainTabs activeId={subTab} onChange={setSubTab} tabs={[
      {
        id: 'posicao',
        label: 'Posição',
        question: 'Quanto há a receber hoje, quanto está vencido e como a carteira se distribui.',
        content: <div className="space-y-5">
      {/* KPIs agrupados por leitura operacional */}
      <div className="gso-finance-kpi-groups">
      <section className="gso-finance-kpi-group" aria-labelledby="finance-position-heading">
      <h3 id="finance-position-heading">Posição e risco</h3>
      <div className="gso-pilot-kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Saldo em aberto" value={formatCurrencyBRL(kpis.openBalance)} hint={`${kpis.openTitles.toLocaleString('pt-BR')} títulos a receber`} />
        <KpiCard label="Vencido" value={formatCurrencyBRL(kpis.overdueBalance)} hint={`${formatPercent(kpis.overdueRate)} da carteira · ${kpis.overdueTitles.toLocaleString('pt-BR')} títulos`} tone="critical" />
        <KpiCard label="A vencer em 30 dias" value={formatCurrencyBRL(kpis.due30)} hint="Previsão de entrada no mês" tone="warning" />
        <KpiCard label="Atraso médio" value={`${kpis.avgDaysOverdue.toLocaleString('pt-BR')} dias`} hint="Média ponderada dos vencidos" tone={kpis.avgDaysOverdue > 60 ? 'critical' : 'warning'} />
      </div>
      </section>
      <section className="gso-finance-kpi-group" aria-labelledby="finance-period-heading">
      <h3 id="finance-period-heading">Movimentação e previsão</h3>
      <div className="gso-pilot-kpi-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Recebido no período" value={formatCurrencyBRL(kpis.receivedAmount)} hint={`${formatPercent(kpis.receivedRate)} do valor faturado`} />
        <KpiCard label="A vencer em 60 dias" value={formatCurrencyBRL(kpis.due60)} hint="Acumulado até 60 dias" />
        <KpiCard label="A vencer em 90 dias" value={formatCurrencyBRL(kpis.due90)} hint="Acumulado até 90 dias" />
        <KpiCard label="Faturado (período)" value={formatCurrencyBRL(kpis.netAmount)} hint={`${kpis.totalTitles.toLocaleString('pt-BR')} títulos no recorte`} />
      </div>
      </section>
      </div>

      <ChartCard title="Performance financeira por responsável" description="A dimensão de responsável não está publicada no contrato atual de recebíveis do OMIE.">
        <MinimalState title="Dimensão por pessoa indisponível" description="O read model financeiro atual expõe títulos, vencimentos, recebimentos, categorias e clientes, mas não publica responsável, cobrador ou centro de responsabilidade por título. Nenhuma atribuição é inferida no frontend." />
      </ChartCard>

      {/* Previsibilidade + Aging por faixa */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Previsibilidade de recebíveis" description="Quanto deve entrar em cada mês, considerando o vencimento dos títulos ainda em aberto.">
          {snapshot.projection.length === 0 ? <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem recebíveis futuros no horizonte.</p> : <div className="overflow-x-auto"><table className="gso-analytics-responsive-table w-full min-w-[420px] text-sm"><thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]"><th className="py-2">Mês previsto</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">Valor a receber</th></tr></thead><tbody>{snapshot.projection.map((row) => <tr key={row.month} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Mês previsto" className="py-2 text-[color:var(--minimal-text)]">{formatMonthLabel(row.month)}</td><td data-label="Títulos" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td><td data-label="Valor a receber" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-action)]">{formatCurrencyBRL(row.balance)}</td></tr>)}</tbody></table></div>}
        </ChartCard>
        <ChartCard title="Inadimplência por faixa de atraso" description="Quanto está vencido, agrupado por tempo de atraso. Quanto mais longa a faixa, menor a chance de recuperar.">
          <BreakdownTable rows={snapshot.agingDays} labelHeader="Faixa" valueHeader="Saldo" humanize={false} toneFor={agingTone} />
        </ChartCard>
      </div>

      {/* Maiores devedores + cruzamento CS */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Maiores devedores" description="Clientes com maior valor a receber, identificados pelo cadastro fiscal.">
          {snapshot.topDebtors.length === 0 ? <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem devedores em aberto.</p> : <div className="overflow-x-auto"><table className="gso-analytics-responsive-table w-full min-w-[480px] text-sm"><thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]"><th className="py-2">Cliente</th><th className="py-2">CNPJ/CPF</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">Saldo em aberto</th></tr></thead><tbody>{snapshot.topDebtors.map((row, index) => <tr key={`${row.client}-${index}`} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Cliente" className="py-2 text-[color:var(--minimal-text)]">{row.client}</td><td data-label="CNPJ/CPF" className="py-2 tabular-nums text-[color:var(--minimal-text-tertiary)]">{row.taxId ?? '—'}</td><td data-label="Títulos" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td><td data-label="Saldo em aberto" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-text)]">{formatCurrencyBRL(row.balance)}</td></tr>)}</tbody></table></div>}
        </ChartCard>
        <ChartCard title="Carteira cruzada com o financeiro" description="Valores em aberto ligados aos clientes. O cruzamento usa apenas o cadastro fiscal conferido; semelhança de nome serve de pista, nunca de confirmação.">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] p-3">
            <div><p className="text-xs font-semibold text-[color:var(--minimal-text)]">Pendências de conciliação</p><p className="mt-1 text-[11px] leading-4 text-[color:var(--minimal-text-secondary)]">Identidade ausente e empresa não encontrada exigem revisão na Governança; o painel financeiro não aplica vínculo automaticamente.</p></div>
            <Link to="/admin/settings/dashboard-sources" className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-1.5 text-xs font-medium text-[color:var(--minimal-text)]">Abrir Governança</Link>
            <div className="flex flex-wrap gap-2 text-[11px]"><Tag label={`Sem empresa: ${snapshot.csReconciliation.unmatchedCompanies.length.toLocaleString('pt-BR')}`} tone={snapshot.csReconciliation.unmatchedCompanies.length > 0 ? 'warning' : 'neutral'} /><Tag label={`Identidade pendente: ${snapshot.csReconciliation.identityIssues.length.toLocaleString('pt-BR')}`} tone={snapshot.csReconciliation.identityIssues.length > 0 ? 'warning' : 'neutral'} /></div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tag label={`Reconciliado: ${formatCurrencyBRL(snapshot.csReconciliation.matchedBalance)}`} tone="positive" />
            <MetricInfo text="Saldo em aberto de títulos cujo CNPJ foi encontrado no cadastro de empresas do HubSpot." />
            <Tag label={`Identidade OMIE indisponível: ${formatCurrencyBRL(snapshot.csReconciliation.identityMissingBalance + snapshot.csReconciliation.identityIncompleteBalance)}`} tone={snapshot.csReconciliation.identityMissingBalance + snapshot.csReconciliation.identityIncompleteBalance > 0 ? 'warning' : 'neutral'} />
            <MetricInfo text="Títulos que não trazem identificação suficiente do cliente para consultar o HubSpot." />
            <Tag label={`Sem empresa no HubSpot: ${formatCurrencyBRL(snapshot.csReconciliation.noHubspotCompanyBalance)}`} tone={snapshot.csReconciliation.noHubspotCompanyBalance > 0 ? 'warning' : 'neutral'} />
            <MetricInfo text="Saldo de empresas OMIE identificadas cujo CNPJ não existe no cadastro de empresas do HubSpot." />
          </div>
          {snapshot.csReconciliation.byClientStatus.length === 0 ? <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Sem cruzamento disponível.</p> : <div className="overflow-x-auto"><table className="gso-analytics-responsive-table w-full min-w-[440px] text-sm"><thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]"><th className="py-2">Status do cliente (CS)</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">Saldo</th><th className="py-2 text-right">Vencido</th></tr></thead><tbody>{snapshot.csReconciliation.byClientStatus.map((row) => <tr key={row.key} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Situação do cliente" className="py-2 text-[color:var(--minimal-text)]">{row.key}</td><td data-label="Títulos" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td><td data-label="Saldo" className="py-2 text-right tabular-nums text-[color:var(--minimal-text)]">{formatCurrencyBRL(row.balance)}</td><td data-label="Vencido" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-danger-text)]">{formatCurrencyBRL(row.overdueBalance)}</td></tr>)}</tbody></table></div>}
          <p className="mt-3 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]"><strong>Identidade OMIE indisponível</strong>: o título não traz nome e CNPJ do cliente, portanto ainda não é possível afirmar se a empresa existe no HubSpot. <strong>Sem status CS</strong>: empresa existe no HubSpot, mas sem status de cliente preenchido. <strong>Sem empresa no HubSpot</strong>: CNPJ identificado no OMIE e não localizado no HubSpot.</p>
          <div className="mt-3">
            <button type="button" onClick={() => setShowReconciliationDetails((current) => !current)} className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-1.5 text-xs font-medium text-[color:var(--minimal-text)] hover:bg-[color:var(--minimal-surface-muted)]">{showReconciliationDetails ? 'Ocultar pendências de conciliação' : 'Ver pendências de conciliação'}</button>
          </div>
          {showReconciliationDetails ? <div className="mt-3 space-y-4">
            <div>
              <p className="mb-2 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">Empresas OMIE identificadas por CNPJ, mas ainda sem cadastro correspondente no HubSpot.</p>
              {snapshot.csReconciliation.unmatchedCompanies.length === 0 ? <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Nenhuma empresa identificada sem cadastro no HubSpot neste recorte.</p> : <div className="overflow-x-auto"><table className="gso-analytics-responsive-table w-full min-w-[560px] text-sm"><thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]"><th className="py-2">Empresa (OMIE)</th><th className="py-2">CNPJ</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">Saldo</th><th className="py-2 text-right">Vencido</th><th className="py-2">Motivo</th></tr></thead><tbody>{snapshot.csReconciliation.unmatchedCompanies.map((row, index) => <tr key={`${row.taxId ?? row.client}-${index}`} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Empresa" className="py-2 text-[color:var(--minimal-text)]">{row.client}</td><td data-label="CNPJ" className="py-2 tabular-nums text-[color:var(--minimal-text-tertiary)]">{row.taxId ?? '—'}</td><td data-label="Títulos" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td><td data-label="Saldo" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-text)]">{formatCurrencyBRL(row.balance)}</td><td data-label="Vencido" className="py-2 text-right tabular-nums text-[color:var(--minimal-danger-text)]">{formatCurrencyBRL(row.overdueBalance)}</td><td data-label="Motivo" className="py-2">{row.nameMatches > 0 ? <Tag label="Nome parecido no HubSpot" tone="warning" /> : <Tag label="Não encontrada" tone="neutral" />}</td></tr>)}</tbody></table></div>}
            </div>
            <div>
              <p className="mb-2 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">Títulos que chegaram sem nome ou CNPJ do cliente. A listagem usa o código do cliente OMIE para permitir a investigação, sem atribuir uma empresa inexistente.</p>
              {snapshot.csReconciliation.identityIssues.length === 0 ? <p className="text-xs text-[color:var(--minimal-text-tertiary)]">Nenhuma pendência de identidade OMIE neste recorte.</p> : <div className="overflow-x-auto"><table className="gso-analytics-responsive-table w-full min-w-[480px] text-sm"><thead><tr className="border-b border-[color:var(--minimal-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--minimal-text-tertiary)]"><th className="py-2">Código do cliente OMIE</th><th className="py-2 text-right">Títulos</th><th className="py-2 text-right">Saldo</th><th className="py-2 text-right">Vencido</th></tr></thead><tbody>{snapshot.csReconciliation.identityIssues.map((row) => <tr key={row.omieClientCode} className="border-b border-[color:var(--minimal-border)] last:border-0"><td data-label="Código do cliente OMIE" className="py-2 text-[color:var(--minimal-text)]">{row.omieClientCode}</td><td data-label="Títulos" className="py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.titles.toLocaleString('pt-BR')}</td><td data-label="Saldo" className="py-2 text-right tabular-nums font-medium text-[color:var(--minimal-text)]">{formatCurrencyBRL(row.balance)}</td><td data-label="Vencido" className="py-2 text-right tabular-nums text-[color:var(--minimal-danger-text)]">{formatCurrencyBRL(row.overdueBalance)}</td></tr>)}</tbody></table></div>}
            </div>
          </div> : null}
        </ChartCard>
      </div>

      {/* Situação + Categoria */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Por situação do título" description="Como cada situação compõe o total a receber no recorte.">
          <BreakdownTable rows={snapshot.byStatus} labelHeader="Situação" valueHeader="Saldo" humanize toneFor={(key) => /atras|vencid/i.test(key) ? 'critical' : /receb/i.test(key) ? 'positive' : /vence/i.test(key) ? 'warning' : 'neutral'} />
        </ChartCard>
        <ChartCard title="Por categoria financeira" description="Valor a receber distribuído entre as categorias do plano financeiro.">
          <BreakdownTable rows={snapshot.byCategory} labelHeader="Categoria" valueHeader="Saldo em aberto" />
        </ChartCard>
      </div>

        </div>,
      },
      {
        id: 'evolucao',
        label: 'Evolução',
        // A tabela de saldo por mês que vivia aqui saiu: ela misturava emissão e
        // vencimento na mesma coluna e não dizia qual das duas posicionava a
        // linha. A série declara a coorte de cada medida.
        question: 'Como o recebimento se comportou ao longo do tempo, contra o que estava previsto.',
        content: <AnalyticsTrendPanel domain="finance" />,
      },
    ]} />}
    </div>
  </AnalyticsHdDomainFrame>;
}
