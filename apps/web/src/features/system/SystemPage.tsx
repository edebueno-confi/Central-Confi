import { useDeferredValue, useEffect, useEffectEvent, useState } from 'react';
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
  MetricCard,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
} from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';

export function SystemPage() {
  const { markSessionExpired } = useAuthContext();
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
    void loadSurface();
  }, [loadSurface]);

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
    return <ContractUnavailableState contractName="vw_admin_audit_feed" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={
          pageMessage ??
          'O Admin Console nao conseguiu materializar o feed oficial de auditoria.'
        }
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System"
        description="Estado minimo do backbone operacional Genius e rastreabilidade administrativa oficial. Sem dashboard executivo e sem joins fora das views aprovadas."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard helper="Superficie ativa do SaaS." label="Tenants ativos" value={String(activeTenants)} />
        <MetricCard helper="Memberships em operacao." label="Memberships ativos" value={String(activeMemberships)} />
        <MetricCard helper="Eventos carregados do feed oficial." label="Eventos" value={String(auditFeed.length)} />
        <MetricCard helper={latestEventAt ? formatDateTime(latestEventAt) : 'Sem eventos'} label="Ultimo evento" value={latestEventAt ? 'Online' : 'Vazio'} />
      </div>

      <Panel
        title="Feed administrativo"
        description="Feed oficial de auditoria para entidades administrativas aprovadas no backbone da operacao."
        actions={
          <>
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
            <TextInput
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ator, tenant, tabela ou entity_id"
              value={query}
            />
            <AppButton onClick={() => void loadSurface()}>Recarregar</AppButton>
          </>
        }
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
                      <StatusPill>{entry.entity_table}</StatusPill>
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

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Schema: {entry.entity_schema}</p>
                    <p>Tabela: {entry.entity_table}</p>
                    <p>Entity id: {entry.entity_id ?? '—'}</p>
                  </div>

                  <div className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Tenant: {entry.tenant_display_name ?? 'Global'}</p>
                    <p>Slug: {entry.tenant_slug ?? '—'}</p>
                    <p>Metadata: {stringifyJsonPreview(entry.metadata)}</p>
                  </div>
                </div>

                <details className="mt-4 rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-ink)]">
                  <summary className="cursor-pointer font-medium">
                    Before / after state
                  </summary>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <pre className="overflow-x-auto rounded-2xl bg-[color:var(--color-surface)] p-3 text-xs leading-6 text-[color:var(--color-muted)]">
                      {stringifyJsonPreview(entry.before_state)}
                    </pre>
                    <pre className="overflow-x-auto rounded-2xl bg-[color:var(--color-surface)] p-3 text-xs leading-6 text-[color:var(--color-muted)]">
                      {stringifyJsonPreview(entry.after_state)}
                    </pre>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
