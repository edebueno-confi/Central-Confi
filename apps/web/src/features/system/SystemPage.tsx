import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import {
  listAdminAuditFeed,
  listAdminMemberships,
  listAdminTenants,
  type AdminAuditFeedRow,
  type AdminTenantMembershipRow,
  type AdminTenantsListItemRow,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';
import { formatDateTime, humanizeToken, stringifyJsonPreview } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  AppButton,
  GhostButton,
  InlineNotice,
  SelectInput,
  StatusPill,
  TextInput,
  cx,
} from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type SystemTab = 'health' | 'audit' | 'jobs' | 'security';
type SystemSeverity = 'ok' | 'attention' | 'critical';
type SystemPeriodFilter = '24h' | '7d' | '30d' | 'all';

function lower(value: string | null | undefined) {
  return String(value ?? '').toLowerCase();
}

function humanizeSystemService(entityTable: string) {
  return humanizeToken(entityTable).replaceAll('_', ' ');
}

function classifySystemSeverity(entry: AdminAuditFeedRow): SystemSeverity {
  const action = lower(entry.action);
  const entity = lower(entry.entity_table);
  const metadata = lower(stringifyJsonPreview(entry.metadata));

  if (
    action.includes('delete') ||
    action.includes('archive') ||
    action.includes('revoke') ||
    metadata.includes('error') ||
    metadata.includes('failed')
  ) {
    return 'critical';
  }

  if (
    action.includes('update') ||
    action.includes('review') ||
    action.includes('publish') ||
    action.includes('invite') ||
    entity.includes('membership') ||
    entity.includes('role')
  ) {
    return 'attention';
  }

  return 'ok';
}

function toneForSystemSeverity(severity: SystemSeverity) {
  if (severity === 'critical') {
    return 'critical' as const;
  }

  if (severity === 'attention') {
    return 'warning' as const;
  }

  return 'positive' as const;
}

function humanizeSystemSeverity(severity: SystemSeverity) {
  if (severity === 'critical') {
    return 'Critico';
  }

  if (severity === 'attention') {
    return 'Atencao';
  }

  return 'Estavel';
}

function buildSystemEventMessage(entry: AdminAuditFeedRow) {
  const actor = entry.actor_full_name ?? entry.actor_email ?? 'Operador interno';
  const service = humanizeSystemService(entry.entity_table);
  const action = humanizeToken(entry.action).replaceAll('_', ' ');
  const scope = entry.tenant_display_name ?? 'escopo global';

  return `${actor} registrou ${action.toLowerCase()} em ${service.toLowerCase()} dentro de ${scope}.`;
}

function buildSystemImpact(entry: AdminAuditFeedRow) {
  const severity = classifySystemSeverity(entry);

  if (severity === 'critical') {
    return 'Esse registro pede verificacao imediata porque altera acesso, arquivo ou mudanca sensivel na operacao.';
  }

  if (severity === 'attention') {
    return 'Esse evento merece acompanhamento porque muda configuracao, papel ou etapa editorial com impacto operacional.';
  }

  return 'Registro informativo para rastrear rotina administrativa e manter contexto do control plane.';
}

function buildSystemActions(entry: AdminAuditFeedRow) {
  const severity = classifySystemSeverity(entry);
  const isSecurity = matchesSecurityLens(entry);

  if (severity === 'critical') {
    return [
      'Conferir se a alteracao era esperada pela operacao.',
      'Revisar o impacto no tenant ou no escopo global antes de seguir.',
      'Registrar follow-up interno se houver risco de regressao.',
    ];
  }

  if (isSecurity) {
    return [
      'Validar o papel, status ou convite envolvido.',
      'Confirmar se o acesso refletiu o estado aprovado.',
      'Escalar apenas se houver incoerencia entre papel e uso esperado.',
    ];
  }

  return [
    'Manter o registro como trilha de auditoria.',
    'Cruzar com eventos relacionados se houver duvida de sequencia.',
    'Usar o feed para explicar a ultima mudanca operacional.',
  ];
}

function matchesSecurityLens(entry: AdminAuditFeedRow) {
  const entity = lower(entry.entity_table);
  const action = lower(entry.action);

  return (
    entity.includes('membership') ||
    entity.includes('role') ||
    entity.includes('access') ||
    action.includes('invite') ||
    action.includes('revoke')
  );
}

function matchesJobsLens(entry: AdminAuditFeedRow) {
  const action = lower(entry.action);

  return (
    action.includes('create') ||
    action.includes('update') ||
    action.includes('publish') ||
    action.includes('archive') ||
    action.includes('review')
  );
}

function withinPeriod(occurredAt: string, period: SystemPeriodFilter) {
  if (period === 'all') {
    return true;
  }

  const now = Date.now();
  const happenedAt = new Date(occurredAt).getTime();

  if (Number.isNaN(happenedAt)) {
    return false;
  }

  const diffHours = (now - happenedAt) / (1000 * 60 * 60);

  if (period === '24h') {
    return diffHours <= 24;
  }

  if (period === '7d') {
    return diffHours <= 24 * 7;
  }

  return diffHours <= 24 * 30;
}

function matchesTab(entry: AdminAuditFeedRow, activeTab: SystemTab) {
  if (activeTab === 'audit') {
    return true;
  }

  if (activeTab === 'security') {
    return matchesSecurityLens(entry);
  }

  if (activeTab === 'jobs') {
    return matchesJobsLens(entry);
  }

  return !matchesSecurityLens(entry) || classifySystemSeverity(entry) !== 'ok';
}

function SystemMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[1.85rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">{helper}</p>
    </div>
  );
}

function SystemSurfaceCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'rounded-[28px] border border-[color:var(--color-border)] bg-white/94 px-5 py-5 shadow-[0_16px_34px_rgba(16,30,74,0.08)]',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[1.04rem] font-semibold tracking-[-0.035em] text-[color:var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function SystemPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [auditFeed, setAuditFeed] = useState<AdminAuditFeedRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [memberships, setMemberships] = useState<AdminTenantMembershipRow[]>([]);
  const [activeTab, setActiveTab] = useState<SystemTab>('health');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | SystemSeverity>('all');
  const [periodFilter, setPeriodFilter] = useState<SystemPeriodFilter>('7d');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const loadSurface = useEffectEvent(async () => {
    try {
      const [tenantRows, membershipRows, auditRows] = await Promise.all([
        listAdminTenants(),
        listAdminMemberships(),
        listAdminAuditFeed(),
      ]);

      setBackendDenied(false);
      setTenants(tenantRows);
      setMemberships(membershipRows);
      setAuditFeed(auditRows);
      setPageMessage(null);
      setPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar a rastreabilidade administrativa oficial.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setTenants([]);
      setMemberships([]);
      setAuditFeed([]);
      setPageMessage(classified.message);
      setPhase(
        classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
      );
    }
  });

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }

    didBootstrapRef.current = true;
    void loadSurface();
  }, []);

  const distinctActions = useMemo(
    () => Array.from(new Set(auditFeed.map((entry) => entry.action))).sort(),
    [auditFeed],
  );
  const distinctServices = useMemo(
    () => Array.from(new Set(auditFeed.map((entry) => entry.entity_table))).sort(),
    [auditFeed],
  );

  const filteredFeed = useMemo(
    () =>
      auditFeed.filter((entry) => {
        if (!matchesTab(entry, activeTab)) {
          return false;
        }

        if (actionFilter !== 'all' && entry.action !== actionFilter) {
          return false;
        }

        if (serviceFilter !== 'all' && entry.entity_table !== serviceFilter) {
          return false;
        }

        if (severityFilter !== 'all' && classifySystemSeverity(entry) !== severityFilter) {
          return false;
        }

        if (!withinPeriod(entry.occurred_at, periodFilter)) {
          return false;
        }

        if (!deferredQuery.trim()) {
          return true;
        }

        const haystack = [
          entry.actor_full_name ?? '',
          entry.actor_email ?? '',
          entry.tenant_display_name ?? '',
          entry.tenant_slug ?? '',
          entry.entity_table,
          entry.action,
          buildSystemEventMessage(entry),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(deferredQuery.trim().toLowerCase());
      }),
    [activeTab, actionFilter, auditFeed, deferredQuery, periodFilter, serviceFilter, severityFilter],
  );

  useEffect(() => {
    if (filteredFeed.length === 0) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedEventId || !filteredFeed.some((entry) => entry.id === selectedEventId)) {
      setSelectedEventId(filteredFeed[0]?.id ?? null);
    }
  }, [filteredFeed, selectedEventId]);

  const selectedEntry =
    filteredFeed.find((entry) => entry.id === selectedEventId) ?? filteredFeed[0] ?? null;

  const relatedEntries = useMemo(() => {
    if (!selectedEntry) {
      return [] as AdminAuditFeedRow[];
    }

    return auditFeed
      .filter(
        (entry) =>
          entry.id !== selectedEntry.id &&
          (entry.entity_table === selectedEntry.entity_table ||
            (entry.tenant_id && entry.tenant_id === selectedEntry.tenant_id)),
      )
      .slice(0, 4);
  }, [auditFeed, selectedEntry]);

  const checksOkCount = auditFeed.filter(
    (entry) => classifySystemSeverity(entry) === 'ok',
  ).length;
  const alertCount = auditFeed.filter(
    (entry) => classifySystemSeverity(entry) === 'attention',
  ).length;
  const failureCount = auditFeed.filter(
    (entry) => classifySystemSeverity(entry) === 'critical',
  ).length;
  const recentCount = auditFeed.filter((entry) => withinPeriod(entry.occurred_at, '24h')).length;
  const activeTenantCount = tenants.filter((tenant) => tenant.status === 'active').length;
  const activeMembershipCount = memberships.filter(
    (membership) => membership.status === 'active',
  ).length;
  const suspendedTenantCount = tenants.filter((tenant) => tenant.status !== 'active').length;
  const selectedSeverity = selectedEntry ? classifySystemSeverity(selectedEntry) : 'ok';

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando estado do sistema" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="feed administrativo" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
        description={
          pageMessage ?? 'Nao foi possivel carregar o feed administrativo desta area.'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-[color:var(--color-border)] bg-white/95 px-6 py-6 shadow-[0_18px_40px_rgba(16,30,74,0.09)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-[2.18rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
              System
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted)]">
              Auditoria, saude do sistema e eventos operacionais em uma unica superficie de observabilidade administrativa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <GhostButton className="min-h-11 px-4" onClick={() => void loadSurface()}>
              Recarregar
            </GhostButton>
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 border-b border-[color:var(--color-border)] pb-2">
          {[
            { id: 'health', label: 'Saude' },
            { id: 'audit', label: 'Auditoria' },
            { id: 'jobs', label: 'Jobs' },
            { id: 'security', label: 'Seguranca' },
          ].map((tab) => (
            <button
              className={cx(
                'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'bg-[rgba(48,127,226,0.1)] text-[color:var(--color-brand-blue)] shadow-[inset_0_-2px_0_var(--color-brand-blue)]'
                  : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink)]',
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SystemTab)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SystemMetricCard helper="Eventos com leitura estavel." label="Checks verdes" value={String(checksOkCount)} />
          <SystemMetricCard helper="Itens que pedem atencao." label="Alertas" value={String(alertCount)} />
          <SystemMetricCard helper="Ocorrencias nas ultimas 24h." label="Eventos recentes" value={String(recentCount)} />
          <SystemMetricCard helper="Registros criticos no feed." label="Falhas" value={String(failureCount)} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[292px_minmax(0,1.24fr)_332px]">
        <aside className="space-y-5">
          <SystemSurfaceCard
            description="Use listas rapidas e filtros para recortar o feed sem inflar a area central."
            title="Monitoramento"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                {[
                  { id: 'health', label: 'Saude geral', helper: `${checksOkCount} checks estaveis` },
                  { id: 'audit', label: 'Auditoria', helper: `${auditFeed.length} eventos carregados` },
                  { id: 'jobs', label: 'Falhas recentes', helper: `${failureCount} itens criticos` },
                  { id: 'security', label: 'Seguranca', helper: `${activeMembershipCount} memberships ativas` },
                ].map((item) => (
                  <button
                    className={cx(
                      'flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition',
                      activeTab === item.id
                        ? 'border-[rgba(48,127,226,0.3)] bg-[rgba(48,127,226,0.08)]'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:bg-white',
                    )}
                    key={item.id}
                    onClick={() => setActiveTab(item.id as SystemTab)}
                    type="button"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--color-ink)]">{item.label}</p>
                      <p className="text-xs leading-5 text-[color:var(--color-muted)]">{item.helper}</p>
                    </div>
                    <span className="text-sm text-[color:var(--color-muted)]">›</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">Tipo</span>
                  <SelectInput onChange={(event) => setActionFilter(event.target.value)} value={actionFilter}>
                    <option value="all">Todos</option>
                    {distinctActions.map((action) => (
                      <option key={action} value={action}>
                        {humanizeToken(action).replaceAll('_', ' ')}
                      </option>
                    ))}
                  </SelectInput>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">Severidade</span>
                  <SelectInput
                    onChange={(event) =>
                      setSeverityFilter(event.target.value as 'all' | SystemSeverity)
                    }
                    value={severityFilter}
                  >
                    <option value="all">Todas</option>
                    <option value="ok">Estavel</option>
                    <option value="attention">Atencao</option>
                    <option value="critical">Critico</option>
                  </SelectInput>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">Periodo</span>
                  <SelectInput
                    onChange={(event) =>
                      setPeriodFilter(event.target.value as SystemPeriodFilter)
                    }
                    value={periodFilter}
                  >
                    <option value="24h">Ultimas 24h</option>
                    <option value="7d">Ultimos 7 dias</option>
                    <option value="30d">Ultimos 30 dias</option>
                    <option value="all">Todo o feed</option>
                  </SelectInput>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">Servico</span>
                  <SelectInput onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
                    <option value="all">Todos</option>
                    {distinctServices.map((service) => (
                      <option key={service} value={service}>
                        {humanizeSystemService(service)}
                      </option>
                    ))}
                  </SelectInput>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-ink)]">Buscar</span>
                  <TextInput
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por pessoa, cliente ou servico"
                    value={query}
                  />
                </label>

                <AppButton className="min-h-11 w-full px-4" onClick={() => void loadSurface()}>
                  Recarregar
                </AppButton>
              </div>
            </div>
          </SystemSurfaceCard>

          <SystemSurfaceCard
            description="Pulso atual da operacao administrativa."
            title="Checks rapidos"
          >
            <div className="space-y-3 text-sm leading-6 text-[color:var(--color-muted)]">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                <span>Tenants ativos</span>
                <span className="font-semibold text-[color:var(--color-ink)]">{activeTenantCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                <span>Tenants em atencao</span>
                <span className="font-semibold text-[color:var(--color-ink)]">{suspendedTenantCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
                <span>Memberships ativas</span>
                <span className="font-semibold text-[color:var(--color-ink)]">{activeMembershipCount}</span>
              </div>
            </div>
          </SystemSurfaceCard>
        </aside>

        <div className="space-y-5">
          <SystemSurfaceCard
            actions={
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                <span>{filteredFeed.length} itens visiveis</span>
              </div>
            }
            description="Checks e eventos administrativos para rastrear mudancas, alertas e contexto operacional do control plane."
            title="Eventos e checks"
          >
            {auditFeed.length === 0 ? (
              <EmptyState
                description="Ainda nao existem eventos de auditoria nesta superficie."
                title="Sem eventos administrativos"
              />
            ) : filteredFeed.length === 0 ? (
              <EmptyState
                description="Ajuste os filtros ou troque de aba para recuperar os registros esperados."
                title="Nenhum registro bateu com o recorte"
              />
            ) : (
              <div className="overflow-hidden rounded-[20px] border border-[color:var(--color-border)]">
                <div className="hidden grid-cols-[138px_112px_170px_minmax(0,1fr)_148px_122px] gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)] lg:grid">
                  <span>Tipo</span>
                  <span>Severidade</span>
                  <span>Servico</span>
                  <span>Mensagem</span>
                  <span>Timestamp</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-[color:var(--color-border)]">
                  {filteredFeed.map((entry) => {
                    const severity = classifySystemSeverity(entry);
                    const selected = entry.id === selectedEntry?.id;

                    return (
                      <button
                        className={cx(
                          'grid w-full gap-3 px-4 py-4 text-left transition lg:grid-cols-[138px_112px_170px_minmax(0,1fr)_148px_122px]',
                          selected
                            ? 'bg-[rgba(48,127,226,0.08)]'
                            : 'bg-white hover:bg-[color:var(--color-surface)]',
                        )}
                        key={entry.id}
                        onClick={() => setSelectedEventId(entry.id)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                            {humanizeToken(entry.action).replaceAll('_', ' ')}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <StatusPill tone={toneForSystemSeverity(severity)}>
                            {humanizeSystemSeverity(severity)}
                          </StatusPill>
                        </div>
                        <div className="min-w-0 text-sm text-[color:var(--color-muted)]">
                          {humanizeSystemService(entry.entity_table)}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm leading-6 text-[color:var(--color-ink)]">
                            {buildSystemEventMessage(entry)}
                          </p>
                        </div>
                        <div className="text-sm text-[color:var(--color-muted)]">
                          {formatDateTime(entry.occurred_at)}
                        </div>
                        <div className="text-sm font-medium text-[color:var(--color-ink)]">
                          {severity === 'ok'
                            ? 'Monitorado'
                            : severity === 'attention'
                              ? 'Em observacao'
                              : 'Escalar'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </SystemSurfaceCard>
        </div>

        <aside className="space-y-5">
          <SystemSurfaceCard
            description="Leitura curta do evento selecionado para decidir o proximo passo."
            title="Detalhe operacional"
          >
            {!selectedEntry ? (
              <InlineNotice>Nenhum evento ficou disponivel para abrir detalhes neste recorte.</InlineNotice>
            ) : (
              <div className="space-y-4">
                <section className="rounded-[24px] bg-[linear-gradient(180deg,#081d4a_0%,#102c6d_100%)] px-4 py-4 text-white shadow-[0_18px_34px_rgba(12,25,66,0.28)]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneForSystemSeverity(selectedSeverity)}>
                        {humanizeSystemSeverity(selectedSeverity)}
                      </StatusPill>
                      <StatusPill>{humanizeSystemService(selectedEntry.entity_table)}</StatusPill>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-[-0.04em]">
                        {humanizeToken(selectedEntry.action).replaceAll('_', ' ')}
                      </h3>
                      <p className="text-sm leading-6 text-white/78">
                        {buildSystemEventMessage(selectedEntry)}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm leading-6 text-white/78">
                      <p>Servico: {humanizeSystemService(selectedEntry.entity_table)}</p>
                      <p>Severidade: {humanizeSystemSeverity(selectedSeverity)}</p>
                      <p>Timestamp: {formatDateTime(selectedEntry.occurred_at)}</p>
                    </div>
                  </div>
                </section>

                <SystemSurfaceCard
                  className="border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-none"
                  description="Escopo afetado e ator envolvido."
                  title="Contexto"
                >
                  <div className="grid gap-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Cliente: {selectedEntry.tenant_display_name ?? 'Indisponível'}</p>
                    <p>Slug: {selectedEntry.tenant_slug ?? 'Indisponível'}</p>
                    <p>Operador: {selectedEntry.actor_full_name ?? selectedEntry.actor_email ?? 'Indisponível'}</p>
                  </div>
                </SystemSurfaceCard>

                <SystemSurfaceCard
                  className="border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-none"
                  description="Leitura objetiva para platform admin."
                  title="Impacto"
                >
                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                    {buildSystemImpact(selectedEntry)}
                  </p>
                </SystemSurfaceCard>

                <SystemSurfaceCard
                  className="border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-none"
                  description="Passos sugeridos usando apenas o contexto atual."
                  title="Acoes recomendadas"
                >
                  <ul className="space-y-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    {buildSystemActions(selectedEntry).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </SystemSurfaceCard>

                <SystemSurfaceCard
                  className="border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-none"
                  description="Registros proximos para fechar a leitura do evento."
                  title="Historico relacionado"
                >
                  {relatedEntries.length === 0 ? (
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      Indisponível.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {relatedEntries.map((entry) => (
                        <div
                          className="rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3"
                          key={entry.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                              {humanizeToken(entry.action).replaceAll('_', ' ')}
                            </p>
                            <StatusPill tone={toneForSystemSeverity(classifySystemSeverity(entry))}>
                              {humanizeSystemSeverity(classifySystemSeverity(entry))}
                            </StatusPill>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                            {formatDateTime(entry.occurred_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </SystemSurfaceCard>

                <details className="rounded-[22px] border border-[color:var(--color-border)] bg-white px-4 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                    Detalhes tecnicos
                  </summary>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Referencia interna: {selectedEntry.entity_id ?? 'Indisponível'}</p>
                    <p>Metadata resumida: {stringifyJsonPreview(selectedEntry.metadata)}</p>
                    <p>Antes: {stringifyJsonPreview(selectedEntry.before_state)}</p>
                    <p>Depois: {stringifyJsonPreview(selectedEntry.after_state)}</p>
                  </div>
                </details>
              </div>
            )}
          </SystemSurfaceCard>
        </aside>
      </div>
    </div>
  );
}
