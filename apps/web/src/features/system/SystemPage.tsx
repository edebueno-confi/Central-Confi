import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react';
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
import {
  formatDateTime,
  humanizeToken,
  stringifyJsonPreview,
} from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  AppButton,
  ContextSubsidebar,
  ContextSubsidebarSection,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  SummaryStrip,
  SummaryStripItem,
  TextInput,
  WorkspaceSplit,
} from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';

export function SystemPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [auditFeed, setAuditFeed] = useState<AdminAuditFeedRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [memberships, setMemberships] = useState<AdminTenantMembershipRow[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>('all');
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

  const distinctEntities = Array.from(
    new Set(auditFeed.map((entry) => entry.entity_table)),
  ).sort();

  const filteredFeed = auditFeed.filter((entry) => {
    if (entityFilter !== 'all' && entry.entity_table !== entityFilter) {
      return false;
    }

    if (!deferredQuery.trim()) {
      return true;
    }

    const haystack = [
      entry.actor_full_name ?? '',
      entry.actor_email ?? '',
      entry.tenant_display_name ?? '',
      entry.entity_table,
      entry.action,
      entry.entity_id ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
  const activeMemberships = memberships.filter((membership) => membership.status === 'active').length;
  const latestEventAt = auditFeed[0]?.occurred_at ?? null;

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
          description={
            pageMessage ??
            'Nao foi possivel carregar o feed administrativo desta area.'
          }
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System"
        description="Acompanhe os principais registros administrativos e abra detalhes de auditoria apenas quando precisar investigar uma mudanca."
      />

      <WorkspaceSplit
        layoutClassName="xl:grid-cols-[292px_minmax(0,1fr)]"
        sidebar={
          <ContextSubsidebar
            description="Filtros e contexto resumido da auditoria ficam fora do feed principal."
            title="Ferramentas do sistema"
          >
            <ContextSubsidebarSection description="Pulso operacional atual." title="Resumo">
              <SummaryStrip className="border-0 bg-transparent px-0 py-0 shadow-none">
                <SummaryStripItem helper="clientes em operacao" label="Tenants ativos" tone="positive" value={String(activeTenants)} />
                <SummaryStripItem helper="acessos operando" label="Memberships ativas" value={String(activeMemberships)} />
                <SummaryStripItem helper="janela atual" label="Eventos carregados" value={String(auditFeed.length)} />
                <SummaryStripItem helper={latestEventAt ? formatDateTime(latestEventAt) : 'sem atividade recente'} label="Ultima atividade" value={latestEventAt ? 'recente' : 'vazia'} />
              </SummaryStrip>
            </ContextSubsidebarSection>

            <ContextSubsidebarSection description="Recorte o feed antes de entrar na linha do tempo." title="Filtros">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[color:var(--color-ink)]">Area</span>
                <SelectInput
                  onChange={(event) => setEntityFilter(event.target.value)}
                  value={entityFilter}
                >
                  <option value="all">Todas as entidades</option>
                  {distinctEntities.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </SelectInput>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[color:var(--color-ink)]">Buscar</span>
                <TextInput
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por pessoa, cliente, acao ou area"
                  value={query}
                />
              </label>
              <AppButton className="min-h-11 w-full px-4" onClick={() => void loadSurface()}>
                Recarregar
              </AppButton>
            </ContextSubsidebarSection>
          </ContextSubsidebar>
        }
        main={
          <Panel
            title="Feed administrativo"
            description="Linha do tempo administrativa para entender quem mudou o que e quando."
          >
        {auditFeed.length === 0 ? (
          <EmptyState
            title="Nenhum evento administrativo"
            description="Ainda nao existem eventos de auditoria nesta superficie."
          />
        ) : filteredFeed.length === 0 ? (
          <EmptyState
            title="Nenhum evento bateu com o filtro"
            description="Ajuste o filtro de entidade ou o termo de busca."
          />
        ) : (
          <div className="space-y-4">
            {filteredFeed.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill>{humanizeToken(entry.action)}</StatusPill>
                      <StatusPill>{humanizeToken(entry.entity_table)}</StatusPill>
                      {entry.tenant_display_name ? (
                        <StatusPill tone="accent">{entry.tenant_display_name}</StatusPill>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                        {entry.actor_full_name ?? 'Ator nao resolvido'}
                      </h3>
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        {entry.actor_email ?? entry.actor_user_id ?? 'Sem email resolvido'}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[color:var(--color-muted)]">
                    {formatDateTime(entry.occurred_at)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[color:var(--color-muted)]">
                  <span className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1.5">
                    Area: {humanizeToken(entry.entity_table)}
                  </span>
                  <span className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1.5">
                    Escopo: {entry.tenant_display_name ?? 'Global'}
                  </span>
                </div>

                <details className="mt-4 rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-ink)]">
                  <summary className="cursor-pointer font-medium">
                    Auditoria e detalhes tecnicos
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                        <p>Origem interna: {entry.entity_schema}.{entry.entity_table}</p>
                        <p>Registro: {entry.entity_id ?? '—'}</p>
                      </div>
                      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                        <p>Slug do cliente: {entry.tenant_slug ?? '—'}</p>
                        <p>Metadata resumida: {stringifyJsonPreview(entry.metadata)}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <pre className="overflow-x-auto rounded-2xl bg-[color:var(--color-surface)] p-3 text-xs leading-6 text-[color:var(--color-muted)]">
                        {stringifyJsonPreview(entry.before_state)}
                      </pre>
                      <pre className="overflow-x-auto rounded-2xl bg-[color:var(--color-surface)] p-3 text-xs leading-6 text-[color:var(--color-muted)]">
                        {stringifyJsonPreview(entry.after_state)}
                      </pre>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
          </Panel>
        }
      />
    </div>
  );
}
