import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  AppButton,
  cx,
  Field,
  GhostButton,
  InlineNotice,
  SelectInput,
  StatusPill,
  TextInput,
} from '../../components/ui';
import {
  MEMBERSHIP_STATUSES,
  TENANT_ROLES,
  type MembershipStatus,
  type TenantRole,
} from '../../contracts/admin-contracts';
import {
  addTenantMember,
  listAdminMemberships,
  listAdminTenants,
  lookupAdminUsers,
  updateTenantMemberRole,
  updateTenantMemberStatus,
  type AdminTenantMembershipRow,
  type AdminTenantsListItemRow,
  type AdminUserLookupRow,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type LookupPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type AccessTab = 'users' | 'roles' | 'invites' | 'permissions';
type UserSituation = 'active' | 'inactive' | 'blocked';
type RailMode = 'detail' | 'invite';

interface AddMembershipFormState {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: MembershipStatus;
}

interface RoleSummary {
  key: TenantRole;
  label: string;
  helper: string;
  total: number;
  active: number;
  invited: number;
  blocked: number;
  tenants: string[];
}

interface PermissionSummary {
  key: TenantRole;
  label: string;
  scope: string;
  highlights: string[];
  total: number;
  active: number;
  invited: number;
  blocked: number;
}

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const TABS: Array<{ key: AccessTab; label: string }> = [
  { key: 'users', label: 'Usuários' },
  { key: 'roles', label: 'Papéis' },
  { key: 'invites', label: 'Convites' },
  { key: 'permissions', label: 'Permissões' },
];
const SITUATION_FILTERS: Array<{ key: UserSituation; label: string }> = [
  { key: 'active', label: 'Ativo' },
  { key: 'inactive', label: 'Inativo' },
  { key: 'blocked', label: 'Bloqueado' },
];

function emptyAddMembershipForm(): AddMembershipFormState {
  return {
    tenantId: '',
    userId: '',
    role: 'tenant_viewer',
    status: 'invited',
  };
}

function tenantRoleLabel(role: TenantRole) {
  switch (role) {
    case 'tenant_admin':
      return 'Admin';
    case 'tenant_manager':
      return 'Responsável';
    case 'tenant_requester':
      return 'Solicitante';
    case 'tenant_viewer':
      return 'Leitor';
    default:
      return 'Indisponível';
  }
}

function tenantRoleHelper(role: TenantRole) {
  switch (role) {
    case 'tenant_admin':
      return 'Coordena acessos e a operação do cliente.';
    case 'tenant_manager':
      return 'Opera o cliente no dia a dia e acompanha a fila.';
    case 'tenant_requester':
      return 'Abre demandas e acompanha o retorno.';
    case 'tenant_viewer':
      return 'Consulta contexto e histórico sem operar mudanças.';
    default:
      return 'Indisponível';
  }
}

function membershipSituation(membership: AdminTenantMembershipRow): UserSituation {
  if (membership.status === 'revoked' || !membership.user_is_active) {
    return 'blocked';
  }

  if (membership.status === 'invited') {
    return 'inactive';
  }

  return 'active';
}

function situationLabel(situation: UserSituation) {
  if (situation === 'active') {
    return 'Ativo';
  }

  if (situation === 'inactive') {
    return 'Inativo';
  }

  return 'Bloqueado';
}

function toneForSituation(situation: UserSituation) {
  if (situation === 'active') {
    return 'positive' as const;
  }

  if (situation === 'inactive') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

function membershipStateLabel(membership: AdminTenantMembershipRow) {
  if (membership.status === 'invited') {
    return 'Convite pendente';
  }

  if (membership.status === 'revoked' || !membership.user_is_active) {
    return 'Bloqueado';
  }

  return 'Ativo';
}

function membershipStateTone(membership: AdminTenantMembershipRow) {
  if (membership.status === 'invited') {
    return 'warning' as const;
  }

  if (membership.status === 'revoked' || !membership.user_is_active) {
    return 'critical' as const;
  }

  return 'positive' as const;
}

function membershipStatusLabel(status: MembershipStatus) {
  if (status === 'active') {
    return 'Ativo';
  }

  if (status === 'revoked') {
    return 'Bloqueado';
  }

  return 'Convite pendente';
}

function formatOptionalDate(value: string | null) {
  return value ? formatDateTime(value) : 'Indisponível';
}

function getDisplayName(membership: AdminTenantMembershipRow) {
  return membership.user_full_name?.trim() || 'Indisponível';
}

function getDisplayEmail(membership: AdminTenantMembershipRow) {
  return membership.user_email?.trim() || 'Indisponível';
}

function getInitials(fullName: string | null, email: string | null) {
  const base = fullName?.trim() || email?.trim() || 'Indisponível';
  const parts = base
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'IN';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function roleHighlights(role: TenantRole) {
  switch (role) {
    case 'tenant_admin':
      return [
        'Coordena acessos e ajustes do cliente.',
        'Pode orientar solicitantes e responsáveis do cliente.',
        'Mantém visão operacional completa da conta.',
      ];
    case 'tenant_manager':
      return [
        'Opera a conta no dia a dia.',
        'Acompanha tickets, contexto e continuidade do atendimento.',
        'Não assume a governança plena de acesso.',
      ];
    case 'tenant_requester':
      return [
        'Abre demandas e responde tratativas.',
        'Mantém o histórico de solicitações do time.',
        'Não altera a governança do cliente.',
      ];
    case 'tenant_viewer':
      return [
        'Consulta contexto e histórico.',
        'Acompanha a operação sem executar mudanças.',
        'Uso recomendado para leitura supervisionada.',
      ];
    default:
      return ['Indisponível'];
  }
}

function buildRoleSummaries(memberships: AdminTenantMembershipRow[]) {
  return TENANT_ROLES.map((role) => {
    const rows = memberships.filter((membership) => membership.role === role);
    const tenantNames = Array.from(
      new Set(rows.map((membership) => membership.tenant_display_name || 'Indisponível')),
    );

    return {
      key: role,
      label: tenantRoleLabel(role),
      helper: tenantRoleHelper(role),
      total: rows.length,
      active: rows.filter((membership) => membershipSituation(membership) === 'active').length,
      invited: rows.filter((membership) => membership.status === 'invited').length,
      blocked: rows.filter((membership) => membershipSituation(membership) === 'blocked').length,
      tenants: tenantNames,
    } satisfies RoleSummary;
  });
}

function buildPermissionSummaries(roleSummaries: RoleSummary[]) {
  return roleSummaries.map((summary) => ({
    key: summary.key,
    label: summary.label,
    scope: tenantRoleHelper(summary.key),
    highlights: roleHighlights(summary.key),
    total: summary.total,
    active: summary.active,
    invited: summary.invited,
    blocked: summary.blocked,
  })) satisfies PermissionSummary[];
}

export function AccessPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<AdminTenantMembershipRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [activeTab, setActiveTab] = useState<AccessTab>('users');
  const [railMode, setRailMode] = useState<RailMode>('detail');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedSituations, setSelectedSituations] = useState<UserSituation[]>([
    'active',
    'inactive',
    'blocked',
  ]);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<TenantRole | null>(null);
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
  const [addForm, setAddForm] = useState<AddMembershipFormState>(emptyAddMembershipForm);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<TenantRole>('tenant_viewer');
  const [statusDraft, setStatusDraft] = useState<MembershipStatus>('invited');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<AdminUserLookupRow[]>([]);
  const [lookupPhase, setLookupPhase] = useState<LookupPhase>('idle');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const loadSurface = useEffectEvent(async () => {
    try {
      const [tenantRows, membershipRows] = await Promise.all([
        listAdminTenants(),
        listAdminMemberships(),
      ]);

      setBackendDenied(false);
      setTenants(tenantRows);
      setMemberships(membershipRows);
      setPhase('ready');
      setPageMessage(null);
      setAddForm((current) => ({
        ...current,
        tenantId: current.tenantId || tenantRows[0]?.id || '',
      }));
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar os acessos administrativos.',
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
      setSelectedMembershipId(null);
      setSelectedRoleKey(null);
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

  const filteredMemberships = memberships.filter((membership) => {
    const situation = membershipSituation(membership);

    if (selectedTenantFilter !== 'all' && membership.tenant_id !== selectedTenantFilter) {
      return false;
    }

    if (selectedRoleFilter !== 'all' && membership.role !== selectedRoleFilter) {
      return false;
    }

    if (!selectedSituations.includes(situation)) {
      return false;
    }

    if (!deferredQuery.trim()) {
      return true;
    }

    const haystack = [
      getDisplayName(membership),
      getDisplayEmail(membership),
      membership.tenant_display_name,
      tenantRoleLabel(membership.role),
      membershipStateLabel(membership),
      membership.user_id,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const roleSummaries = buildRoleSummaries(filteredMemberships);
  const permissionSummaries = buildPermissionSummaries(roleSummaries);
  const inviteMemberships = filteredMemberships.filter(
    (membership) => membership.status === 'invited',
  );

  const selectedMembership =
    filteredMemberships.find((membership) => membership.id === selectedMembershipId) ??
    memberships.find((membership) => membership.id === selectedMembershipId) ??
    null;
  const selectedRoleSummary =
    roleSummaries.find((summary) => summary.key === selectedRoleKey) ?? null;
  const selectedPermissionSummary =
    permissionSummaries.find((summary) => summary.key === selectedRoleKey) ?? null;

  useEffect(() => {
    if (!selectedMembership) {
      return;
    }

    setRoleDraft(selectedMembership.role);
    setStatusDraft(selectedMembership.status);
  }, [selectedMembership]);

  useEffect(() => {
    setPageIndex(1);
  }, [activeTab, selectedTenantFilter, selectedRoleFilter, selectedSituations, deferredQuery, pageSize]);

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'invites') {
      const targetRows = activeTab === 'users' ? filteredMemberships : inviteMemberships;

      if (targetRows.length === 0) {
        setSelectedMembershipId(null);
        return;
      }

      if (!targetRows.some((membership) => membership.id === selectedMembershipId)) {
        setSelectedMembershipId(targetRows[0].id);
      }

      return;
    }

    const targetRows = activeTab === 'roles' ? roleSummaries : permissionSummaries;

    if (targetRows.length === 0) {
      setSelectedRoleKey(null);
      return;
    }

    if (!targetRows.some((row) => row.key === selectedRoleKey)) {
      setSelectedRoleKey(targetRows[0].key);
    }
  }, [
    activeTab,
    filteredMemberships,
    inviteMemberships,
    permissionSummaries,
    roleSummaries,
    selectedMembershipId,
    selectedRoleKey,
  ]);

  function resetFilters() {
    setQuery('');
    setSelectedTenantFilter('all');
    setSelectedRoleFilter('all');
    setSelectedSituations(['active', 'inactive', 'blocked']);
  }

  function toggleSituation(situation: UserSituation) {
    setSelectedSituations((current) => {
      if (current.includes(situation)) {
        const next = current.filter((value) => value !== situation);
        return next.length === 0 ? current : next;
      }

      return [...current, situation];
    });
  }

  async function handleLookupUsers() {
    const trimmed = lookupQuery.trim();

    if (!trimmed) {
      setLookupResults([]);
      setLookupPhase('idle');
      setLookupMessage('Informe nome ou email para localizar uma pessoa existente.');
      return;
    }

    setLookupPhase('loading');
    setLookupMessage(null);

    try {
      const rows = await lookupAdminUsers(trimmed);
      setLookupResults(rows);
      setLookupPhase('ready');
      setLookupMessage(
        rows.length === 0
          ? 'Nenhum usuário existente corresponde a esta busca.'
          : `${rows.length} usuário(s) encontrado(s).`,
      );
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao consultar usuários existentes.');

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setLookupResults([]);
      setLookupMessage(classified.message);
      setLookupPhase(
        classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
      );
    }
  }

  function applyLookupSelection(user: AdminUserLookupRow) {
    setAddForm((current) => ({
      ...current,
      userId: user.user_id,
    }));
    setLookupMessage(
      `Usuário selecionado: ${user.full_name ?? 'Indisponível'}${user.email ? ` (${user.email})` : ''}.`,
    );
  }

  async function handleAddMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddSubmitting(true);
    setAddMessage(null);

    try {
      const created = await addTenantMember({
        p_tenant_id: addForm.tenantId,
        p_user_id: addForm.userId.trim(),
        p_role: addForm.role,
        p_status: addForm.status,
      });

      setAddForm((current) => ({
        ...emptyAddMembershipForm(),
        tenantId: current.tenantId,
      }));
      setLookupQuery('');
      setLookupResults([]);
      setLookupPhase('idle');
      setLookupMessage(null);
      await loadSurface();
      setSelectedMembershipId(created.id);
      setActiveTab('users');
      setRailMode('detail');
      setAddMessage('Convite registrado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao registrar o convite.');

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setAddMessage(classified.message);
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleUpdateMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedMembership) {
      return;
    }

    setUpdateSubmitting(true);
    setUpdateMessage(null);

    try {
      await updateTenantMemberRole({
        p_membership_id: selectedMembership.id,
        p_role: roleDraft,
      });
      await updateTenantMemberStatus({
        p_membership_id: selectedMembership.id,
        p_status: statusDraft,
      });
      await loadSurface();
      setSelectedMembershipId(selectedMembership.id);
      setUpdateMessage('Acesso atualizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao atualizar o acesso.');

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setUpdateMessage(classified.message);
    } finally {
      setUpdateSubmitting(false);
    }
  }

  const paginationRows =
    activeTab === 'users'
      ? filteredMemberships
      : activeTab === 'roles'
        ? roleSummaries
        : activeTab === 'invites'
          ? inviteMemberships
          : permissionSummaries;
  const totalRows = paginationRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages);
  const startIndex = totalRows === 0 ? 0 : (safePageIndex - 1) * pageSize;
  const endIndex = Math.min(totalRows, startIndex + pageSize);
  const pagedRows = paginationRows.slice(startIndex, endIndex);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, safePageIndex - 2),
    Math.max(3, safePageIndex + 1),
  );

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando governança de acesso" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="gestão de acessos" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={pageMessage ?? 'Não foi possível carregar a tela de acesso.'}
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--color-border)] pb-5">
        <div className="space-y-1">
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
            Acesso
          </h1>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            Gerencie usuários, papéis, permissões e convites da plataforma.
          </p>
        </div>

        <AppButton className="min-h-11 gap-2 px-5" onClick={() => setRailMode('invite')}>
          + Convidar usuário
        </AppButton>
      </header>

      <div className="border-b border-[color:var(--color-border)]">
        <div className="flex flex-wrap gap-5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={cx(
                'border-b-2 px-1 pb-3 text-sm font-semibold transition',
                activeTab === tab.key
                  ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                  : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
              )}
              onClick={() => {
                setActiveTab(tab.key);
                setRailMode('detail');
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white p-4 shadow-[var(--shadow-panel)]">
          <div className="space-y-5">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Filtros
              </p>
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Refine a base principal sem tirar o foco da gestão de acessos.
              </p>
            </div>

            <Field label="Buscar">
              <TextInput
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar usuários..."
                value={query}
              />
            </Field>

            <Field label="Papel">
              <SelectInput
                onChange={(event) => setSelectedRoleFilter(event.target.value)}
                value={selectedRoleFilter}
              >
                <option value="all">Todos</option>
                {TENANT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {tenantRoleLabel(role)}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[color:var(--color-ink)]">Situação</p>
              <label className="flex items-center gap-3 text-sm text-[color:var(--color-ink)]">
                <input
                  checked={selectedSituations.length === SITUATION_FILTERS.length}
                  className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-brand-blue)]"
                  onChange={() =>
                    setSelectedSituations(
                      selectedSituations.length === SITUATION_FILTERS.length
                        ? ['active']
                        : ['active', 'inactive', 'blocked'],
                    )
                  }
                  type="checkbox"
                />
                Todos
              </label>
              {SITUATION_FILTERS.map((item) => (
                <label
                  className="flex items-center gap-3 text-sm text-[color:var(--color-ink)]"
                  key={item.key}
                >
                  <input
                    checked={selectedSituations.includes(item.key)}
                    className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-brand-blue)]"
                    onChange={() => toggleSituation(item.key)}
                    type="checkbox"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            <Field label="Tenant">
              <SelectInput
                onChange={(event) => setSelectedTenantFilter(event.target.value)}
                value={selectedTenantFilter}
              >
                <option value="all">Todos</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.display_name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <GhostButton className="min-h-11 w-full" onClick={resetFilters}>
              Limpar filtros
            </GhostButton>
          </div>
        </section>

        <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-panel)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div>
              <h2 className="text-[1.55rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                {activeTab === 'users'
                  ? `Usuários (${filteredMemberships.length})`
                  : activeTab === 'roles'
                    ? `Papéis (${roleSummaries.length})`
                    : activeTab === 'invites'
                      ? `Convites (${inviteMemberships.length})`
                      : `Permissões (${permissionSummaries.length})`}
              </h2>
            </div>

            <SelectInput
              className="w-[150px]"
              onChange={(event) => setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
              value={String(pageSize)}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} por pagina
                </option>
              ))}
            </SelectInput>
          </header>

          {totalRows === 0 ? (
            <div className="p-6">
              <EmptyState
                title={
                  activeTab === 'users'
                    ? 'Nenhum usuário encontrado'
                    : activeTab === 'roles'
                      ? 'Nenhum papel encontrado'
                      : activeTab === 'invites'
                        ? 'Nenhum convite encontrado'
                        : 'Nenhuma permissão encontrada'
                }
                description="Ajuste os filtros atuais para recuperar a visao completa."
                action={<GhostButton onClick={resetFilters}>Limpar filtros</GhostButton>}
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)] text-[0.72rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                      {activeTab === 'users' ? (
                        <>
                          <th className="px-4 py-3 font-semibold">Usuário</th>
                          <th className="px-4 py-3 font-semibold">Papel</th>
                          <th className="px-4 py-3 font-semibold">Tenant</th>
                          <th className="px-4 py-3 font-semibold">Situação</th>
                          <th className="px-4 py-3 font-semibold">Último acesso</th>
                        </>
                      ) : activeTab === 'roles' ? (
                        <>
                          <th className="px-4 py-3 font-semibold">Papel</th>
                          <th className="px-4 py-3 font-semibold">Usuários</th>
                          <th className="px-4 py-3 font-semibold">Ativos</th>
                          <th className="px-4 py-3 font-semibold">Convites</th>
                          <th className="px-4 py-3 font-semibold">Bloqueados</th>
                        </>
                      ) : activeTab === 'invites' ? (
                        <>
                          <th className="px-4 py-3 font-semibold">Usuário</th>
                          <th className="px-4 py-3 font-semibold">Tenant</th>
                          <th className="px-4 py-3 font-semibold">Situação</th>
                          <th className="px-4 py-3 font-semibold">Convite</th>
                          <th className="px-4 py-3 font-semibold">Convidado por</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 font-semibold">Papel</th>
                          <th className="px-4 py-3 font-semibold">Escopo</th>
                          <th className="px-4 py-3 font-semibold">Usuários</th>
                          <th className="px-4 py-3 font-semibold">Situação</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'users'
                      ? (pagedRows as AdminTenantMembershipRow[]).map((membership) => {
                          const isSelected = membership.id === selectedMembershipId;

                          return (
                            <tr
                              className={cx(
                                'cursor-pointer border-b border-[color:var(--color-border)] text-sm transition last:border-b-0',
                                isSelected
                                  ? 'bg-[rgba(48,127,226,0.09)]'
                                  : 'hover:bg-[rgba(20,31,71,0.035)]',
                              )}
                              key={membership.id}
                              onClick={() => {
                                setSelectedMembershipId(membership.id);
                                setRailMode('detail');
                              }}
                            >
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <p className="font-semibold text-[color:var(--color-ink)]">
                                    {getDisplayName(membership)}
                                  </p>
                                  <p className="text-[color:var(--color-muted)]">
                                    {getDisplayEmail(membership)}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                {tenantRoleLabel(membership.role)}
                              </td>
                              <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                {membership.tenant_display_name || 'Indisponível'}
                              </td>
                              <td className="px-4 py-3">
                                <StatusPill tone={membershipStateTone(membership)}>
                                  {membershipStateLabel(membership)}
                                </StatusPill>
                              </td>
                              <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                {formatOptionalDate(membership.updated_at)}
                              </td>
                            </tr>
                          );
                        })
                      : activeTab === 'roles'
                        ? (pagedRows as RoleSummary[]).map((summary) => {
                            const isSelected = summary.key === selectedRoleKey;

                            return (
                              <tr
                                className={cx(
                                  'cursor-pointer border-b border-[color:var(--color-border)] text-sm transition last:border-b-0',
                                  isSelected
                                    ? 'bg-[rgba(48,127,226,0.09)]'
                                    : 'hover:bg-[rgba(20,31,71,0.035)]',
                                )}
                                key={summary.key}
                                onClick={() => setSelectedRoleKey(summary.key)}
                              >
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-[color:var(--color-ink)]">
                                      {summary.label}
                                    </p>
                                    <p className="text-[color:var(--color-muted)]">
                                      {summary.helper}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[color:var(--color-ink)]">{summary.total}</td>
                                <td className="px-4 py-3 text-[color:var(--color-ink)]">{summary.active}</td>
                                <td className="px-4 py-3 text-[color:var(--color-ink)]">{summary.invited}</td>
                                <td className="px-4 py-3 text-[color:var(--color-ink)]">{summary.blocked}</td>
                              </tr>
                            );
                          })
                        : activeTab === 'invites'
                          ? (pagedRows as AdminTenantMembershipRow[]).map((membership) => {
                              const isSelected = membership.id === selectedMembershipId;

                              return (
                                <tr
                                  className={cx(
                                    'cursor-pointer border-b border-[color:var(--color-border)] text-sm transition last:border-b-0',
                                    isSelected
                                      ? 'bg-[rgba(48,127,226,0.09)]'
                                      : 'hover:bg-[rgba(20,31,71,0.035)]',
                                  )}
                                  key={membership.id}
                                  onClick={() => {
                                    setSelectedMembershipId(membership.id);
                                    setRailMode('detail');
                                  }}
                                >
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-[color:var(--color-ink)]">
                                        {getDisplayName(membership)}
                                      </p>
                                      <p className="text-[color:var(--color-muted)]">
                                        {getDisplayEmail(membership)}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                {membership.tenant_display_name || 'Indisponível'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <StatusPill tone={membershipStateTone(membership)}>
                                      {membershipStateLabel(membership)}
                                    </StatusPill>
                                  </td>
                                  <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                    {formatOptionalDate(membership.created_at)}
                                  </td>
                                  <td className="px-4 py-3 text-[color:var(--color-ink)]">
                                {membership.invited_by_full_name || 'Indisponível'}
                                  </td>
                                </tr>
                              );
                            })
                          : (pagedRows as PermissionSummary[]).map((permission) => {
                              const isSelected = permission.key === selectedRoleKey;

                              return (
                                <tr
                                  className={cx(
                                    'cursor-pointer border-b border-[color:var(--color-border)] text-sm transition last:border-b-0',
                                    isSelected
                                      ? 'bg-[rgba(48,127,226,0.09)]'
                                      : 'hover:bg-[rgba(20,31,71,0.035)]',
                                  )}
                                  key={permission.key}
                                  onClick={() => setSelectedRoleKey(permission.key)}
                                >
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-[color:var(--color-ink)]">
                                        {permission.label}
                                      </p>
                                      <p className="text-[color:var(--color-muted)]">
                                        {permission.scope}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-[color:var(--color-ink)]">
                          {permission.highlights[0] || 'Indisponível'}
                                  </td>
                                  <td className="px-4 py-3 text-[color:var(--color-ink)]">{permission.total}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      <StatusPill tone="positive">{permission.active} ativos</StatusPill>
                                      <StatusPill tone="warning">{permission.invited} convites</StatusPill>
                                      <StatusPill tone="critical">{permission.blocked} bloqueados</StatusPill>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                  </tbody>
                </table>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] px-5 py-4 text-sm text-[color:var(--color-muted)]">
                <p>
                  {totalRows === 0 ? 0 : startIndex + 1}-{endIndex} de {totalRows}{' '}
                  {activeTab === 'roles' ? 'papéis' : activeTab === 'permissions' ? 'permissões' : 'usuários'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] disabled:opacity-40"
                    disabled={safePageIndex === 1}
                    onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    {'<'}
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      className={cx(
                        'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition',
                        page === safePageIndex
                          ? 'border-[color:var(--color-brand-blue)] bg-[rgba(48,127,226,0.08)] text-[color:var(--color-brand-blue)]'
                          : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)]',
                      )}
                      key={page}
                      onClick={() => setPageIndex(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] disabled:opacity-40"
                    disabled={safePageIndex === totalPages}
                    onClick={() => setPageIndex((current) => Math.min(totalPages, current + 1))}
                    type="button"
                  >
                    {'>'}
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>

        <aside className="rounded-[24px] border border-[color:var(--color-border)] bg-white p-4 shadow-[var(--shadow-panel)]">
          {railMode === 'invite' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                    Convidar usuário
                  </p>
                  <h2 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                    Novo acesso
                  </h2>
                </div>
                <GhostButton className="min-h-10 px-3" onClick={() => setRailMode('detail')}>
                  Fechar
                </GhostButton>
              </div>

              <form className="space-y-4" onSubmit={handleAddMembership}>
                <Field
                  label="Buscar usuário existente"
                  description="Consulte por nome ou e-mail para preencher o convite com segurança."
                >
                  <TextInput
                    onChange={(event) => {
                      setLookupQuery(event.target.value);
                      if (lookupPhase !== 'idle') {
                        setLookupPhase('idle');
                      }
                      if (lookupMessage) {
                        setLookupMessage(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleLookupUsers();
                      }
                    }}
                    placeholder="Buscar por nome ou email"
                    value={lookupQuery}
                  />
                </Field>

                <GhostButton className="min-h-11 w-full" onClick={() => void handleLookupUsers()}>
                  {lookupPhase === 'loading' ? 'Buscando...' : 'Buscar usuário'}
                </GhostButton>

                {lookupMessage ? (
                  <InlineNotice
                    tone={
                      lookupPhase === 'error'
                        ? 'critical'
                        : lookupPhase === 'contract-unavailable'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {lookupMessage}
                  </InlineNotice>
                ) : null}

                {lookupResults.length > 0 ? (
                  <div className="space-y-2">
                    {lookupResults.map((user) => {
                      const isSelected = addForm.userId === user.user_id;

                      return (
                        <button
                          key={user.user_id}
                          className={cx(
                            'w-full rounded-[18px] border px-4 py-3 text-left transition',
                            isSelected
                              ? 'border-[color:var(--color-brand-blue)] bg-[rgba(48,127,226,0.08)]'
                              : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.35)]',
                          )}
                          onClick={() => applyLookupSelection(user)}
                          type="button"
                        >
                          <p className="font-medium text-[color:var(--color-ink)]">
                            {user.full_name ?? 'Indisponível'}
                          </p>
                          <p className="text-sm text-[color:var(--color-muted)]">
                            {user.email ?? 'Indisponível'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <Field label="Tenant">
                  <SelectInput
                    onChange={(event) =>
                      setAddForm((current) => ({
                        ...current,
                        tenantId: event.target.value,
                      }))
                    }
                    required
                    value={addForm.tenantId}
                  >
                    <option value="">Selecione um tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.display_name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Papel">
                  <SelectInput
                    onChange={(event) =>
                      setAddForm((current) => ({
                        ...current,
                        role: event.target.value as TenantRole,
                      }))
                    }
                    value={addForm.role}
                  >
                    {TENANT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {tenantRoleLabel(role)}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <details className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                    Opcoes avancadas
                  </summary>
                  <div className="mt-3 space-y-4">
                    <Field label="Situação inicial">
                      <SelectInput
                        onChange={(event) =>
                          setAddForm((current) => ({
                            ...current,
                            status: event.target.value as MembershipStatus,
                          }))
                        }
                        value={addForm.status}
                      >
                        {MEMBERSHIP_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {membershipStatusLabel(status)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field
                      label="Identificador manual"
                      description="Use apenas quando a pessoa não aparecer na busca."
                    >
                      <TextInput
                        onChange={(event) =>
                          setAddForm((current) => ({
                            ...current,
                            userId: event.target.value,
                          }))
                        }
                        placeholder="Cole o identificador interno se precisar"
                        required
                        value={addForm.userId}
                      />
                    </Field>
                  </div>
                </details>

                {addMessage ? (
                  <InlineNotice tone={addMessage.includes('sucesso') ? 'default' : 'critical'}>
                    {addMessage}
                  </InlineNotice>
                ) : null}

                <AppButton className="min-h-11 w-full" disabled={addSubmitting} type="submit">
                  {addSubmitting ? 'Enviando...' : 'Enviar convite'}
                </AppButton>
              </form>
            </div>
          ) : activeTab === 'roles' ? (
            <div className="space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Detalhes do papel
              </p>
              {!selectedRoleSummary ? (
                <EmptyState
                  title="Selecione um papel"
                  description="Escolha um papel na lista para abrir o contexto operacional."
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-5 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-blue),var(--color-brand-navy))] text-2xl font-semibold text-white">
                      {selectedRoleSummary.label.slice(0, 1)}
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                        {selectedRoleSummary.label}
                      </h2>
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        {selectedRoleSummary.helper}
                      </p>
                    </div>
                  </div>

                  <dl className="space-y-4 text-sm">
                    <div className="border-t border-[color:var(--color-border)] pt-4">
                      <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Usuários
                      </dt>
                      <dd className="mt-1 text-[color:var(--color-ink)]">{selectedRoleSummary.total}</dd>
                    </div>
                    <div className="border-t border-[color:var(--color-border)] pt-4">
                      <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Ativos
                      </dt>
                      <dd className="mt-1 text-[color:var(--color-ink)]">{selectedRoleSummary.active}</dd>
                    </div>
                    <div className="border-t border-[color:var(--color-border)] pt-4">
                      <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Convites
                      </dt>
                      <dd className="mt-1 text-[color:var(--color-ink)]">{selectedRoleSummary.invited}</dd>
                    </div>
                    <div className="border-t border-[color:var(--color-border)] pt-4">
                      <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Bloqueados
                      </dt>
                      <dd className="mt-1 text-[color:var(--color-ink)]">{selectedRoleSummary.blocked}</dd>
                    </div>
                  </dl>

                  <details className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4" open>
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                      Clientes com esse papel
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedRoleSummary.tenants.length > 0 ? (
                        selectedRoleSummary.tenants.map((tenant) => (
                          <StatusPill key={tenant}>{tenant || 'Indisponível'}</StatusPill>
                        ))
                      ) : (
                        <p className="text-sm text-[color:var(--color-muted)]">Indisponível</p>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ) : activeTab === 'permissions' ? (
            <div className="space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Detalhes da permissão
              </p>
              {!selectedPermissionSummary ? (
                <EmptyState
                  title="Selecione um papel"
                  description="Escolha um papel na tabela para abrir o escopo de uso."
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-5 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-blue),var(--color-brand-navy))] text-2xl font-semibold text-white">
                      {selectedPermissionSummary.label.slice(0, 1)}
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                        {selectedPermissionSummary.label}
                      </h2>
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        {selectedPermissionSummary.scope}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedPermissionSummary.highlights.map((highlight) => (
                      <div
                        className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-ink)]"
                        key={highlight}
                      >
                        {highlight}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="positive">{selectedPermissionSummary.active} ativos</StatusPill>
                    <StatusPill tone="warning">{selectedPermissionSummary.invited} convites</StatusPill>
                    <StatusPill tone="critical">{selectedPermissionSummary.blocked} bloqueados</StatusPill>
                  </div>
                </div>
              )}
            </div>
          ) : !selectedMembership ? (
            <EmptyState
              title="Selecione um usuário"
              description="Escolha uma linha da base principal para abrir o detalhe do acesso."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Detalhes do usuário
              </p>

              <div className="flex flex-col items-center gap-3 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-5 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-blue),var(--color-brand-navy))] text-2xl font-semibold text-white">
                  {getInitials(selectedMembership.user_full_name, selectedMembership.user_email)}
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                    {getDisplayName(selectedMembership)}
                  </h2>
                  <p className="text-sm text-[color:var(--color-muted)]">
                    {getDisplayEmail(selectedMembership)}
                  </p>
                </div>
                <StatusPill tone={membershipStateTone(selectedMembership)}>
                  {membershipStateLabel(selectedMembership)}
                </StatusPill>
              </div>

              <dl className="space-y-4 text-sm">
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                    Papel
                  </dt>
                  <dd className="mt-1 text-[color:var(--color-ink)]">
                    {tenantRoleLabel(selectedMembership.role)}
                  </dd>
                </div>
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                    Tenant
                  </dt>
                  <dd className="mt-1 text-[color:var(--color-ink)]">
                    {selectedMembership.tenant_display_name || 'Indisponível'}
                  </dd>
                </div>
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                    Último acesso
                  </dt>
                  <dd className="mt-1 text-[color:var(--color-ink)]">
                    {formatOptionalDate(selectedMembership.updated_at)}
                  </dd>
                </div>
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                    MFA
                  </dt>
                  <dd className="mt-1 text-[color:var(--color-ink)]">Indisponível</dd>
                </div>
              </dl>

              <form className="space-y-4 border-t border-[color:var(--color-border)] pt-4" onSubmit={handleUpdateMembership}>
                <p className="text-sm font-semibold text-[color:var(--color-ink)]">Ações</p>
                <Field label="Papel">
                  <SelectInput
                    onChange={(event) => setRoleDraft(event.target.value as TenantRole)}
                    value={roleDraft}
                  >
                    {TENANT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {tenantRoleLabel(role)}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Situação">
                  <SelectInput
                    onChange={(event) => setStatusDraft(event.target.value as MembershipStatus)}
                    value={statusDraft}
                  >
                    {MEMBERSHIP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {membershipStatusLabel(status)}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                {updateMessage ? (
                  <InlineNotice tone={updateMessage.includes('sucesso') ? 'default' : 'critical'}>
                    {updateMessage}
                  </InlineNotice>
                ) : null}

                <AppButton className="min-h-11 w-full" disabled={updateSubmitting} type="submit">
                  {updateSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </AppButton>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
