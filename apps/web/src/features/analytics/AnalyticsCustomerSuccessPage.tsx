import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyticsPageProps, AnalyticsPipelineInventory } from './analytics-model';
import { getAnalyticsPipelineInventory, getCustomerSuccessKpisV2 } from './analytics-api';
import { AnalyticsHdDomainFrame } from './AnalyticsHdDomainFrame';
import { AnalyticsLoadingState, AnalyticsRetryAction, ChartCard } from './analytics-ui';
import { MinimalState } from '../../components/minimal-states';
import { AnalyticsBoardLimitations, AnalyticsKpiBoard, type BoardBand } from './AnalyticsKpiBoard';
import { CustomerSuccessOwnerPerformanceChart } from './charts/OwnerPerformanceCharts';
import { toAnalyticsBlockState } from './analytics-kpi-contract.mjs';
import { AnalyticsOperationScope } from './AnalyticsOperationScope';
import { AnalyticsDomainTabs, type DomainTab } from './AnalyticsDomainTabs';

const CS_BANDS: BoardBand[] = [
  {
    title: 'Carteira hoje',
    note: 'Todos os indicadores desta aba são posição atual, por isso não há filtro de período.',
    items: [
      { key: 'active_customers', kind: 'count', note: 'Base ativa' },
      { key: 'mrr_total', kind: 'currency', note: 'Recorrência somada' },
      { key: 'arpa', kind: 'currency', note: 'Recorrência por cliente que a possui' },
      { key: 'mapping_coverage_percent', kind: 'percent', note: 'Parte da carteira que cruza com o financeiro' },
    ],
  },
  {
    title: 'Risco',
    note: 'Sinais exibidos separadamente; nenhum score composto é calculado.',
    items: [
      { key: 'overdue_customers', kind: 'count', note: 'Com título vencido', alertWhenPositive: true },
      { key: 'mrr_overdue', kind: 'currency', note: 'Recorrência exposta a inadimplência', alertWhenPositive: true },
      { key: 'customers_without_recent_activity', kind: 'count', note: 'Sem contato no prazo definido', alertWhenPositive: true },
      { key: 'mrr_without_recent_activity', kind: 'currency', note: 'Recorrência sem contato recente', alertWhenPositive: true },
    ],
  },
  {
    title: 'Relacionamento e retenção',
    dense: true,
    items: [
      { key: 'customers_with_open_tickets', kind: 'count', note: 'Com atendimento em aberto' },
      { key: 'mrr_with_critical_ticket', kind: 'currency', note: 'Recorrência com atendimento crítico', alertWhenPositive: true },
      { key: 'logo_churn_rate', kind: 'percent' },
      { key: 'nrr', kind: 'percent' },
    ],
  },
];

const TITLE = 'Customer Success';
const DESCRIPTION = 'Carteira ativa, receita recorrente e risco financeiro dos clientes.';
const SOURCE = 'HubSpot · OMIE';

interface OwnerRow {
  owner_id: string;
  owner_name: string;
  customers: number;
  mrr: number | null;
  overdue_customers: number;
  overdue_amount: number;
  customers_with_tickets: number;
  inactive_customers: number;
}

interface RiskRow {
  signal: string;
  signal_label: string;
  customers: number;
  mrr_at_risk: number | null;
}

interface OverdueRow {
  company_id: string;
  company_name: string;
  cs_owner_name: string | null;
  mrr: number | null;
  overdue_balance: number;
  overdue_titles: number;
  max_overdue_days: number | null;
  open_tickets?: number;
}

interface FinancialIdentity {
  identity_missing_overdue_titles?: number;
  identity_missing_overdue_balance?: number;
}

function rows<T>(payload: unknown, key: string): T[] {
  const data = payload as Record<string, unknown> | null;
  const value = data && typeof data === 'object' ? data[key] : null;
  return Array.isArray(value) ? (value as T[]) : [];
}

function currency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Indisponível';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function AnalyticsCustomerSuccessPage({ sharedOperation, onSharedOperationChange, onRetry }: AnalyticsPageProps) {
  const [result, setResult] = useState<{ loading: boolean; data?: unknown; error?: boolean }>({ loading: true });
  const [configuredPipelines, setConfiguredPipelines] = useState<AnalyticsPipelineInventory[]>([]);
  const [groupCompany, setGroupCompany] = useState(sharedOperation ?? '');
  const [subTab, setSubTab] = useState('posicao');
  const latestRequest = useRef(0);

  useEffect(() => {
    if (sharedOperation !== undefined && sharedOperation !== groupCompany) setGroupCompany(sharedOperation);
  }, [groupCompany, sharedOperation]);

  const handleGroupCompanyChange = (value: string) => {
    setGroupCompany(value);
    onSharedOperationChange?.(value);
  };

  const load = useCallback(() => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setResult({ loading: true });
    void Promise.all([
      getCustomerSuccessKpisV2(groupCompany || null),
      getAnalyticsPipelineInventory('ticket'),
    ])
      .then(([data, configs]) => {
        if (requestId !== latestRequest.current) return;
        const activeConfigs = configs.filter((config) => config.areaKeys.includes('customer_success') && config.mappingState === 'confirmed' && config.isActive && !config.isArchived);
        setConfiguredPipelines(activeConfigs);
        setResult({ loading: false, data });
      })
      .catch(() => {
        if (requestId === latestRequest.current) setResult({ loading: false, error: true });
      });
  }, [groupCompany]);

  useEffect(() => {
    load();
    return () => { latestRequest.current += 1; };
  }, [load]);

  if (result.loading) {
    return (
      <AnalyticsHdDomainFrame title={TITLE} description={DESCRIPTION} source={SOURCE}>
        <AnalyticsLoadingState title="Carregando Customer Success" description="Estamos preparando a leitura desta área." />
      </AnalyticsHdDomainFrame>
    );
  }

  if (result.error || !result.data) {
    return (
      <AnalyticsHdDomainFrame title={TITLE} description={DESCRIPTION} source={SOURCE}>
        <MinimalState
          tone="critical"
          title="Não foi possível carregar Customer Success"
          description="A leitura desta área está indisponível agora."
          actions={<AnalyticsRetryAction onRetry={onRetry ?? load} />}
        />
      </AnalyticsHdDomainFrame>
    );
  }

  const payload = result.data;
  const state = toAnalyticsBlockState(payload, SOURCE);


  const owners = rows<OwnerRow>(payload, 'by_owner');
  const ownersWithMrr = owners.filter((owner) => owner.mrr !== null);
  const risks = rows<RiskRow>(payload, 'risk_signals');
  const overdue = rows<OverdueRow>(payload, 'top_overdue_customers');
  const financialIdentity = ((payload as Record<string, unknown>).financial_identity ?? {}) as FinancialIdentity;
  const missingIdentityOverdueTitles = Number(financialIdentity.identity_missing_overdue_titles ?? 0);
  const missingIdentityOverdueBalance = Number(financialIdentity.identity_missing_overdue_balance ?? 0);
  const operationScope = ((payload as Record<string, unknown>).operation_scope ?? {}) as { state?: string; reason?: string; ticket_count?: number; associated_ticket_count?: number };

  return (
    <AnalyticsHdDomainFrame
      title={TITLE}
      description={DESCRIPTION}
      source={SOURCE}
      state={state}
      headerAside={configuredPipelines.length > 0 ? <AnalyticsOperationScope storageKey="analytics-operation-scope" value={groupCompany} onChange={handleGroupCompanyChange} options={configuredPipelines.flatMap((pipeline) => pipeline.groupCompanies.map((value) => ({ value, source: pipeline.groupCompanySource })))} /> : null}
    >
      {groupCompany && operationScope.state && operationScope.state !== 'available' ? <p role="status" className="mb-4 text-xs text-[color:var(--minimal-text-tertiary)]">Operação <strong>{groupCompany}</strong>: {operationScope.state === 'partial' ? 'a cobertura ticket-empresa é parcial' : 'a cobertura ticket-empresa está indisponível'} ({operationScope.reason ?? 'motivo não informado'}). {operationScope.ticket_count ?? 0} tickets, {operationScope.associated_ticket_count ?? 0} com associação válida. O backend não infere carteira por nome.</p> : null}
      <AnalyticsDomainTabs
        activeId={subTab}
        onChange={setSubTab}
        tabs={[
          {
            id: 'posicao',
            label: 'Posição',
            question: 'Qual é o estado atual da carteira e quais sinais exigem atenção neste recorte.',
            content: (
              <div className="space-y-4">
                <AnalyticsKpiBoard payload={payload} bands={CS_BANDS} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Performance da carteira por responsável"
          description="Carteira, MRR e sinais operacionais por pessoa. O gráfico usa somente MRR publicado pelo read model."
        >
          {owners.length === 0 ? (
            <p className="text-sm text-[color:var(--minimal-text-secondary)]">Nenhum cliente ativo na carteira.</p>
          ) : (
            <>
            {ownersWithMrr.length > 0 ? <CustomerSuccessOwnerPerformanceChart owners={ownersWithMrr.map((owner) => ({ name: owner.owner_name, customers: owner.customers, mrr: owner.mrr ?? 0, overdueCustomers: owner.overdue_customers, inactiveCustomers: owner.inactive_customers }))} /> : <MinimalState title="MRR por responsável indisponível" description="A carteira possui responsáveis, mas o read model não publicou MRR suficiente para traçar a comparação." />}
            <div className="mt-4 overflow-x-auto">
                <table className="gso-analytics-responsive-table w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)]">
                  <tr>
                    <th className="px-2 py-2 font-medium">Responsável</th>
                    <th className="px-2 py-2 text-right font-medium">Clientes</th>
                    <th className="px-2 py-2 text-right font-medium">Recorrência</th>
                    <th className="px-2 py-2 text-right font-medium">Em atraso</th>
                    <th className="px-2 py-2 text-right font-medium">Valor em atraso</th>
                    <th className="px-2 py-2 text-right font-medium">Atendimentos abertos</th>
                    <th className="px-2 py-2 text-right font-medium">Sem contato</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((row) => (
                    <tr className="border-b border-[color:var(--minimal-border)] last:border-0" key={row.owner_id}>
                      <td data-label="Responsável" className="px-2 py-2 font-medium text-[color:var(--minimal-text)]">{row.owner_name}</td>
                      <td data-label="Clientes" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.customers.toLocaleString('pt-BR')}</td>
                      <td data-label="Recorrência" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{currency(row.mrr)}</td>
                      <td data-label="Em atraso" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.overdue_customers.toLocaleString('pt-BR')}</td>
                      <td data-label="Valor em atraso" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{currency(row.overdue_amount)}</td>
                      <td data-label="Atendimentos abertos" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.customers_with_tickets.toLocaleString('pt-BR')}</td>
                      <td data-label="Sem contato" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.inactive_customers.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">Atribuição baseada no responsável de CS publicado no cadastro da empresa. Health score, churn, NRR/GRR e tarefas de relacionamento continuam indisponíveis quando o histórico ou a atividade não são publicados pela origem.</p>
            </>
          )}
        </ChartCard>

        <ChartCard
          title="Receita em risco"
          description="Sinais explícitos, exibidos separadamente. Nenhum score composto é calculado."
        >
          {risks.length === 0 ? (
            <p className="text-sm text-[color:var(--minimal-text-secondary)]">Nenhum sinal de risco identificado na carteira ativa.</p>
          ) : (
            <div className="divide-y divide-[color:var(--minimal-border)]">
              {risks.map((row) => (
                <div className="flex items-center justify-between gap-3 py-2 text-sm" key={row.signal}>
                  <span className="min-w-0">
                    <span className="block truncate text-[color:var(--minimal-text)]">{row.signal_label}</span>
                    <span className="block text-xs text-[color:var(--minimal-text-tertiary)]">{row.customers.toLocaleString('pt-BR')} cliente(s)</span>
                  </span>
                  <strong className="tabular-nums text-[color:var(--minimal-text)]">{currency(row.mrr_at_risk)}</strong>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Clientes com maior valor vencido"
        description="Cruzamento entre a carteira e os títulos vencidos, feito apenas por cadastro fiscal conferido."
      >
        {overdue.length === 0 && missingIdentityOverdueTitles > 0 ? (
          <p className="text-sm text-[color:var(--minimal-text-secondary)]">Não foi possível identificar os clientes com títulos vencidos: {missingIdentityOverdueTitles.toLocaleString('pt-BR')} títulos ({currency(missingIdentityOverdueBalance)}) chegaram do OMIE sem nome e CNPJ. A lista será preenchida quando a identidade financeira estiver disponível.</p>
        ) : overdue.length === 0 ? (
          <p className="text-sm text-[color:var(--minimal-text-secondary)]">Nenhum cliente ativo com título vencido.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="gso-analytics-responsive-table w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)]">
                <tr>
                  <th className="px-2 py-2 font-medium">Cliente</th>
                  <th className="px-2 py-2 font-medium">Responsável</th>
                  <th className="px-2 py-2 text-right font-medium">Recorrência</th>
                  <th className="px-2 py-2 text-right font-medium">Valor vencido</th>
                  <th className="px-2 py-2 text-right font-medium">Títulos</th>
                  <th className="px-2 py-2 text-right font-medium">Maior atraso</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((row) => (
                  <tr className="border-b border-[color:var(--minimal-border)] last:border-0" key={row.company_id}>
                    <td data-label="Cliente" className="px-2 py-2 font-medium text-[color:var(--minimal-text)]">{row.company_name}</td>
                    <td data-label="Responsável" className="px-2 py-2 text-[color:var(--minimal-text-secondary)]">{row.cs_owner_name ?? 'Sem responsável'}</td>
                    <td data-label="Recorrência" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{currency(row.mrr)}</td>
                    <td data-label="Valor vencido" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text)]">{currency(row.overdue_balance)}</td>
                    <td data-label="Títulos" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.overdue_titles.toLocaleString('pt-BR')}</td>
                    <td data-label="Maior atraso" className="px-2 py-2 text-right tabular-nums text-[color:var(--minimal-text-secondary)]">{row.max_overdue_days === null ? 'Indisponível' : `${row.max_overdue_days} dias`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <AnalyticsBoardLimitations payload={payload} />
              </div>
            ),
          },
          {
            id: 'evolucao',
            label: 'Evolução',
            question: 'Como a carteira mudou ao longo do tempo. O contrato temporal de Customer Success ainda não publica uma série para responder esta pergunta.',
            content: (
              <ChartCard title="Evolução da carteira" description="A evolução temporal depende de snapshots históricos e de um contrato de série publicado pelo backend.">
                <MinimalState title="Evolução indisponível" description="Customer Success publica a posição atual da carteira, mas ainda não publica série histórica de clientes, MRR, retenção ou risco. Nenhuma tendência é inferida a partir do snapshot atual." />
              </ChartCard>
            ),
          },
        ] as DomainTab[]}
      />
    </AnalyticsHdDomainFrame>
  );
}
