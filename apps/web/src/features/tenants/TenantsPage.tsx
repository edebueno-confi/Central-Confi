import {
  type FormEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, Navigate } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  AppButton,
  Field,
  GhostButton,
  InlineNotice,
  SelectInput,
  StatusPill,
  TextInput,
  TextareaInput,
  cx,
} from '../../components/ui';
import type {
  AdminAuditFeedRow,
  AdminTenantContactRecordRow,
  AdminTenantContactViewRow,
  AdminTenantDetailRow,
  AdminTenantMembershipRow,
  AdminTenantsListItemRow,
  TenantStatus,
} from '../../contracts/admin-contracts';
import { TENANT_STATUSES } from '../../contracts/admin-contracts';
import { useAuthContext } from '../auth/auth-context';
import {
  createTenant,
  createTenantContact,
  getAdminTenantDetail,
  listAdminAuditFeed,
  listAdminMemberships,
  listAdminTenants,
  updateTenantContact,
  updateTenantStatus,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type TenantTab = 'summary' | 'members' | 'status' | 'activity';
type TenantUpdatedFilter = 'all' | '24h' | '7d' | '30d';
type TenantMembershipFilter = 'all' | 'active' | 'invited' | 'none';
type TenantSort = 'updated' | 'name';

interface TenantFormState {
  slug: string;
  legalName: string;
  displayName: string;
  dataRegion: string;
}

interface ContactFormState {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  linkedUserId: string;
  isPrimary: boolean;
  isActive: boolean;
}

function emptyTenantForm(): TenantFormState {
  return {
    slug: '',
    legalName: '',
    displayName: '',
    dataRegion: 'sa-east-1',
  };
}

function emptyContactForm(): ContactFormState {
  return {
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    linkedUserId: '',
    isPrimary: false,
    isActive: true,
  };
}

function buildContactForm(contact: AdminTenantContactViewRow): ContactFormState {
  return {
    fullName: contact.full_name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    jobTitle: contact.job_title ?? '',
    linkedUserId: contact.linked_user_id ?? '',
    isPrimary: contact.is_primary,
    isActive: contact.is_active,
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toneForTenantStatus(status: TenantStatus) {
  if (status === 'active') {
    return 'positive' as const;
  }

  if (status === 'suspended') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

function labelForTenantStatus(status: TenantStatus) {
  if (status === 'active') {
    return 'Ativo';
  }

  if (status === 'suspended') {
    return 'Suspenso';
  }

  return 'Arquivado';
}

function membershipPillTone(activeMembershipCount: number, membershipCount: number) {
  if (membershipCount === 0) {
    return 'critical' as const;
  }

  if (activeMembershipCount === membershipCount) {
    return 'default' as const;
  }

  return 'warning' as const;
}

function initialsFromName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'CL';
}

function withinUpdatedWindow(isoTimestamp: string, filter: TenantUpdatedFilter) {
  if (filter === 'all') {
    return true;
  }

  const now = Date.now();
  const timestamp = new Date(isoTimestamp).getTime();
  const age = now - timestamp;

  if (Number.isNaN(age)) {
    return false;
  }

  if (filter === '24h') {
    return age <= 24 * 60 * 60 * 1000;
  }

  if (filter === '7d') {
    return age <= 7 * 24 * 60 * 60 * 1000;
  }

  return age <= 30 * 24 * 60 * 60 * 1000;
}

function classifyActivityTone(entry: AdminAuditFeedRow) {
  if (entry.action === 'delete') {
    return 'critical' as const;
  }

  if (entry.action === 'update') {
    return 'warning' as const;
  }

  return 'positive' as const;
}

function activityLabel(entry: AdminAuditFeedRow) {
  if (entry.entity_table === 'tenants') {
    if (entry.action === 'insert') {
      return 'Cliente criado';
    }

    if (entry.action === 'update') {
      return 'Dados do cliente atualizados';
    }

    return 'Cliente removido';
  }

  if (entry.entity_table === 'tenant_contacts') {
    if (entry.action === 'insert') {
      return 'Contato vinculado';
    }

    if (entry.action === 'update') {
      return 'Contato atualizado';
    }

    return 'Contato removido';
  }

  if (entry.action === 'insert') {
    return 'Membership criada';
  }

  if (entry.action === 'update') {
    return 'Membership atualizada';
  }

  return 'Membership removida';
}

function activityDescription(entry: AdminAuditFeedRow) {
  return entry.actor_full_name ?? entry.actor_email ?? 'Operação administrativa';
}

function TenantMetricTile({
  label,
  helper,
  value,
  tone = 'default',
}: {
  label: string;
  helper: string;
  value: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}) {
  return (
    <div
      className={cx(
        'rounded-[16px] border px-2.5 py-1.5',
        tone === 'positive' && 'border-emerald-200 bg-emerald-50/80',
        tone === 'warning' && 'border-amber-200 bg-amber-50/80',
        tone === 'critical' && 'border-rose-200 bg-rose-50/80',
        tone === 'default' && 'border-[color:var(--color-border)] bg-white',
      )}
    >
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-1.5">
        <p className="text-[0.92rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
          {value}
        </p>
        <p className="max-w-[6.25rem] text-right text-[0.56rem] leading-[0.88rem] text-[color:var(--color-muted)]">
          {helper}
        </p>
      </div>
    </div>
  );
}

function TenantRailInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 border-b border-[color:var(--color-border)] py-2.5 last:border-b-0">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </span>
      <span className="text-sm text-[color:var(--color-ink)]">{value}</span>
    </div>
  );
}

function TenantModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,15,35,0.34)] px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[860px] rounded-[28px] border border-[color:var(--color-border)] bg-white p-5 shadow-[0_28px_70px_rgba(14,29,72,0.24)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
              {title}
            </h2>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">{description}</p>
          </div>
          <GhostButton className="min-h-10 px-4" onClick={onClose} type="button">
            Fechar
          </GhostButton>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function TenantsPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const didPrefillCreateRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [memberships, setMemberships] = useState<AdminTenantMembershipRow[]>([]);
  const [auditFeed, setAuditFeed] = useState<AdminAuditFeedRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('idle');
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<AdminTenantDetailRow | null>(null);
  const [activeTab, setActiveTab] = useState<TenantTab>('summary');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');
  const [membershipFilter, setMembershipFilter] = useState<TenantMembershipFilter>('all');
  const [updatedFilter, setUpdatedFilter] = useState<TenantUpdatedFilter>('all');
  const [sortOrder, setSortOrder] = useState<TenantSort>('updated');
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  const [tenantForm, setTenantForm] = useState<TenantFormState>(emptyTenantForm);
  const [tenantFormMessage, setTenantFormMessage] = useState<string | null>(null);
  const [tenantFormSubmitting, setTenantFormSubmitting] = useState(false);
  const [statusDraft, setStatusDraft] = useState<TenantStatus>('active');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const loadSurface = useEffectEvent(async (preferredTenantId?: string | null) => {
    if (phase === 'loading') {
      setPageMessage(null);
    }

    try {
      const [tenantRows, membershipRows, auditRows] = await Promise.all([
        listAdminTenants(),
        listAdminMemberships(),
        listAdminAuditFeed(160),
      ]);

      setBackendDenied(false);
      setTenants(tenantRows);
      setMemberships(membershipRows);
      setAuditFeed(auditRows);
      setPhase('ready');
      setPageMessage(null);

      const preservedTenantId =
        preferredTenantId ??
        (tenantRows.some((tenant) => tenant.id === selectedTenantId) ? selectedTenantId : null);

      setSelectedTenantId(preservedTenantId ?? tenantRows[0]?.id ?? null);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Não foi possível carregar a base administrativa de clientes.',
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
      setSelectedTenantId(null);
      setPageMessage(classified.message);
      setPhase(
        classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
      );
    }
  });

  const loadTenantDetail = useEffectEvent(async (tenantId: string) => {
    setDetailPhase('loading');
    setDetailMessage(null);

    try {
      const detail = await getAdminTenantDetail(tenantId);
      setBackendDenied(false);

      if (!detail) {
        setTenantDetail(null);
        setDetailPhase('error');
        setDetailMessage('Não foi possível abrir o cliente selecionado.');
        return;
      }

      setTenantDetail(detail);
      setDetailPhase('ready');
      setStatusDraft(detail.status);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Não foi possível carregar o contexto do cliente selecionado.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setTenantDetail(null);
      setDetailMessage(classified.message);
      setDetailPhase(
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

  useEffect(() => {
    if (!selectedTenantId) {
      setTenantDetail(null);
      setDetailPhase('idle');
      setDetailMessage(null);
      return;
    }

    void loadTenantDetail(selectedTenantId);
  }, [selectedTenantId]);

  useEffect(() => {
    setEditingContactId(null);
    setContactForm(emptyContactForm());
    setContactMessage(null);
  }, [selectedTenantId]);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const next = tenants.filter((tenant) => {
      if (statusFilter !== 'all' && tenant.status !== statusFilter) {
        return false;
      }

      if (membershipFilter === 'active' && tenant.active_membership_count === 0) {
        return false;
      }

      if (membershipFilter === 'invited' && tenant.invited_membership_count === 0) {
        return false;
      }

      if (membershipFilter === 'none' && tenant.membership_count > 0) {
        return false;
      }

      if (!withinUpdatedWindow(tenant.updated_at, updatedFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        tenant.display_name,
        tenant.legal_name,
        tenant.slug,
        tenant.primary_contact_full_name ?? '',
        tenant.primary_contact_email ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    next.sort((left, right) => {
      if (sortOrder === 'name') {
        return left.display_name.localeCompare(right.display_name, 'pt-BR');
      }

      return (
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
    });

    return next;
  }, [deferredQuery, membershipFilter, sortOrder, statusFilter, tenants, updatedFilter]);

  useEffect(() => {
    if (filteredTenants.length === 0) {
      setSelectedTenantId(null);
      return;
    }

    if (!selectedTenantId || !filteredTenants.some((tenant) => tenant.id === selectedTenantId)) {
      setSelectedTenantId(filteredTenants[0]?.id ?? null);
    }
  }, [filteredTenants, selectedTenantId]);

  useEffect(() => {
    if (showCreateTenant || didPrefillCreateRef.current || !tenants.some((tenant) => tenant.slug === 'qa-local-tenant')) {
      return;
    }

    didPrefillCreateRef.current = true;
  }, [showCreateTenant, tenants]);

  const selectedTenantSummary =
    tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
  const selectedTenantMemberships = memberships.filter(
    (membership) => membership.tenant_id === selectedTenantId,
  );
  const selectedTenantActivity = auditFeed
    .filter(
      (entry) =>
        entry.tenant_id === selectedTenantId ||
        (entry.entity_table === 'tenants' && entry.entity_id === selectedTenantId),
    )
    .slice(0, 8);

  const primaryContact =
    tenantDetail?.contacts.find((contact) => contact.is_primary) ??
    tenantDetail?.contacts[0] ??
    null;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
  const suspendedTenants = tenants.filter((tenant) => tenant.status === 'suspended').length;
  const totalContacts = tenants.reduce(
    (sum, tenant) => sum + tenant.active_contact_count,
    0,
  );

  async function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTenantFormSubmitting(true);
    setTenantFormMessage(null);

    try {
      const created = await createTenant({
        p_slug: tenantForm.slug.trim(),
        p_legal_name: tenantForm.legalName.trim(),
        p_display_name: tenantForm.displayName.trim(),
        p_data_region: tenantForm.dataRegion.trim() || 'sa-east-1',
      });

      setShowCreateTenant(false);
      setTenantForm(emptyTenantForm());
      await loadSurface(created.id);
      await loadTenantDetail(created.id);
    } catch (error) {
      const classified = classifyAdminError(error, 'Não foi possível criar o cliente.');

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setTenantFormMessage(classified.message);
    } finally {
      setTenantFormSubmitting(false);
    }
  }

  async function handleUpdateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTenantId) {
      return;
    }

    setStatusSubmitting(true);
    setStatusMessage(null);

    try {
      await updateTenantStatus({
        p_tenant_id: selectedTenantId,
        p_status: statusDraft,
      });
      await loadSurface(selectedTenantId);
      await loadTenantDetail(selectedTenantId);
      setStatusMessage('Status operacional atualizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Não foi possível atualizar o status do cliente.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setStatusMessage(classified.message);
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleSaveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTenantId) {
      return;
    }

    setContactSubmitting(true);
    setContactMessage(null);

    try {
      let savedRecord: AdminTenantContactRecordRow;

      if (editingContactId) {
        savedRecord = await updateTenantContact({
          p_contact_id: editingContactId,
          p_full_name: contactForm.fullName.trim(),
          p_email: normalizeOptionalText(contactForm.email),
          p_phone: normalizeOptionalText(contactForm.phone),
          p_job_title: normalizeOptionalText(contactForm.jobTitle),
          p_is_primary: contactForm.isPrimary,
          p_is_active: contactForm.isActive,
          p_linked_user_id: normalizeOptionalText(contactForm.linkedUserId),
        });
      } else {
        savedRecord = await createTenantContact({
          p_tenant_id: selectedTenantId,
          p_full_name: contactForm.fullName.trim(),
          p_email: normalizeOptionalText(contactForm.email),
          p_phone: normalizeOptionalText(contactForm.phone),
          p_job_title: normalizeOptionalText(contactForm.jobTitle),
          p_is_primary: contactForm.isPrimary,
          p_is_active: contactForm.isActive,
          p_linked_user_id: normalizeOptionalText(contactForm.linkedUserId),
        });
      }

      setEditingContactId(savedRecord.id);
      await loadSurface(selectedTenantId);
      await loadTenantDetail(selectedTenantId);
      setEditingContactId(null);
      setContactForm(emptyContactForm());
      setContactMessage('Contato sincronizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Não foi possível sincronizar o contato do cliente.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setContactMessage(classified.message);
    } finally {
      setContactSubmitting(false);
    }
  }

  function resetFilters() {
    setQuery('');
    setStatusFilter('all');
    setMembershipFilter('all');
    setUpdatedFilter('all');
    setSortOrder('updated');
  }

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando clientes B2B" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="base administrativa de clientes" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
        description={
          pageMessage ?? 'Não foi possível carregar a base administrativa de clientes.'
        }
      />
    );
  }

  return (
    <div className="space-y-3 xl:flex xl:h-[calc(100dvh-2rem)] xl:flex-col xl:overflow-hidden">
      <section className="rounded-[30px] border border-[color:var(--color-border)] bg-white/96 px-6 py-4 shadow-[0_18px_40px_rgba(16,30,74,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[1.92rem] font-semibold tracking-[-0.055em] text-[color:var(--color-ink)]">
              Clientes B2B
            </h1>
            <p className="max-w-3xl text-[0.92rem] leading-5 text-[color:var(--color-muted)]">
              Revise status e contexto de cada cliente.
            </p>
          </div>

          <AppButton
            className="min-h-9 gap-2 rounded-full px-5 text-[0.92rem]"
            onClick={() => setShowCreateTenant((current) => !current)}
          >
            + Novo cliente
          </AppButton>
        </div>
      </section>

      <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[292px_minmax(0,1fr)_424px] 2xl:grid-cols-[300px_minmax(0,1fr)_436px]">
        <aside className="space-y-4 xl:min-h-0">
          <section className="rounded-[28px] border border-[color:var(--color-border)] bg-white/96 p-3 shadow-[0_16px_34px_rgba(16,30,74,0.08)] xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
            <div className="space-y-2 xl:flex xl:h-full xl:flex-col">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Ferramentas
              </p>

              <div className="space-y-1.5 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2.5">
                <p className="text-[0.84rem] font-semibold text-[color:var(--color-ink)]">Resumo da base</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <TenantMetricTile helper="base atual" label="Clientes" value={String(totalTenants)} />
                  <TenantMetricTile
                    helper="em operação"
                    label="Ativos"
                    tone="positive"
                    value={String(activeTenants)}
                  />
                  <TenantMetricTile
                    helper="pedem atenção"
                    label="Suspensos"
                    tone="warning"
                    value={String(suspendedTenants)}
                  />
                  <TenantMetricTile
                    helper="prontos para contato"
                    label="Contatos"
                    value={String(totalContacts)}
                  />
                </div>
              </div>

              <div className="space-y-1.5 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2.5">
                <p className="text-[0.84rem] font-semibold text-[color:var(--color-ink)]">Ações rápidas</p>
                <div className="grid gap-1.5">
                  <AppButton
                    className="min-h-8 justify-start px-3.5 text-[0.78rem]"
                    onClick={() => setShowCreateTenant(true)}
                  >
                    Criar cliente
                  </AppButton>
                  <GhostButton className="min-h-8 justify-start px-3.5 text-[0.78rem]" onClick={() => void loadSurface(selectedTenantId)}>
                    Atualizar lista
                  </GhostButton>
                  {selectedTenantId ? (
                    <Link
                      className="inline-flex min-h-8 items-center justify-start rounded-full border border-[color:var(--color-border)] bg-white px-3.5 text-[0.78rem] font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                      to={`/support/customers/${selectedTenantId}`}
                    >
                      Abrir contexto
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2.5 xl:flex-1">
                <p className="text-[0.84rem] font-semibold text-[color:var(--color-ink)]">Filtros</p>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-1">
                    <label className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                      Status
                    </label>
                    <SelectInput
                      className="min-h-8 text-[0.78rem]"
                      onChange={(event) =>
                        setStatusFilter(event.target.value as 'all' | TenantStatus)
                      }
                      value={statusFilter}
                    >
                      <option value="all">Todos</option>
                      {TENANT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelForTenantStatus(status)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                      Memberships
                    </label>
                    <SelectInput
                      className="min-h-8 text-[0.78rem]"
                      onChange={(event) =>
                        setMembershipFilter(event.target.value as TenantMembershipFilter)
                      }
                      value={membershipFilter}
                    >
                      <option value="all">Todas</option>
                      <option value="active">Com memberships ativas</option>
                      <option value="invited">Com convites pendentes</option>
                      <option value="none">Sem memberships</option>
                    </SelectInput>
                  </div>

                  <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                    <label className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                      Última atualização
                    </label>
                    <SelectInput
                      className="min-h-8 text-[0.78rem]"
                      onChange={(event) =>
                        setUpdatedFilter(event.target.value as TenantUpdatedFilter)
                      }
                      value={updatedFilter}
                    >
                      <option value="all">Todas</option>
                      <option value="24h">Últimas 24 horas</option>
                      <option value="7d">Últimos 7 dias</option>
                      <option value="30d">Últimos 30 dias</option>
                    </SelectInput>
                  </div>
                </div>

                <GhostButton className="min-h-8 w-full text-[0.78rem]" onClick={resetFilters}>
                  Limpar filtros
                </GhostButton>
              </div>
            </div>
          </section>
        </aside>

        <section className="min-w-0 rounded-[28px] border border-[color:var(--color-border)] bg-white/96 shadow-[0_16px_34px_rgba(16,30,74,0.08)] xl:flex xl:h-full xl:flex-col xl:overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-3.5">
            <div className="space-y-1">
              <h2 className="text-[1.48rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                Base de clientes
              </h2>
              <p className="text-[0.92rem] text-[color:var(--color-muted)]">
                {filteredTenants.length} cliente(s) no recorte atual
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                className="min-h-9 w-[288px] text-[0.92rem]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar cliente, slug ou contato"
                value={query}
              />
              <SelectInput
                className="min-h-9 w-[184px] text-[0.92rem]"
                onChange={(event) => setSortOrder(event.target.value as TenantSort)}
                value={sortOrder}
              >
                <option value="updated">Mais recentes</option>
                <option value="name">Ordem alfabética</option>
              </SelectInput>
            </div>
          </header>

          <div className="space-y-3 p-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            {tenants.length === 0 ? (
              <EmptyState
                description="Ainda não existe cliente operacional nesta área."
                title="Nenhum cliente cadastrado"
              />
            ) : filteredTenants.length === 0 ? (
              <EmptyState
                action={<GhostButton onClick={resetFilters}>Limpar filtros</GhostButton>}
                description="Ajuste o recorte atual para recuperar a base."
                title="Nenhum cliente encontrado"
              />
            ) : (
              <>
                <div className="space-y-2.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                  {filteredTenants.map((tenant) => {
                    const isSelected = tenant.id === selectedTenantId;

                    return (
                      <button
                        className={cx(
                          'w-full rounded-[22px] border px-4 py-3.5 text-left transition',
                          isSelected
                            ? 'border-[rgba(48,127,226,0.42)] bg-[rgba(48,127,226,0.08)] shadow-[0_14px_30px_rgba(19,33,79,0.08)]'
                            : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.26)]',
                        )}
                        key={tenant.id}
                        onClick={() => setSelectedTenantId(tenant.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill tone={toneForTenantStatus(tenant.status)}>
                                {labelForTenantStatus(tenant.status)}
                              </StatusPill>
                              <StatusPill
                                tone={membershipPillTone(
                                  tenant.active_membership_count,
                                  tenant.membership_count,
                                )}
                              >
                                {tenant.active_membership_count}/{tenant.membership_count} memberships
                              </StatusPill>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[0.98rem] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                                {tenant.display_name}
                              </p>
                              <p className="text-[0.84rem] text-[color:var(--color-muted)]">
                                {tenant.slug} · {tenant.legal_name}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] leading-5 text-[color:var(--color-muted)]">
                              <span>
                                Grupo: Indisponível
                              </span>
                              <span>
                                Contato principal:{' '}
                                {tenant.primary_contact_full_name ?? 'Indisponível'}
                              </span>
                              <span>Plano: Indisponível</span>
                              <span>
                                Atualizado em {formatDateTime(tenant.updated_at)}
                              </span>
                            </div>
                          </div>

                          <span className="text-[1.25rem] text-[color:var(--color-muted)]">⋮</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-3 text-[0.88rem] text-[color:var(--color-muted)]">
                  <span>
                    Exibindo 1-{filteredTenants.length} de {filteredTenants.length} cliente(s)
                  </span>
                </footer>
              </>
            )}
          </div>
        </section>

        <aside className="min-w-0 rounded-[28px] border border-[color:var(--color-border)] bg-white/96 p-3.5 shadow-[0_16px_34px_rgba(16,30,74,0.08)] xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
          <div className="space-y-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
                Cliente selecionado
              </p>
              <h2 className="text-[1rem] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                Contexto operacional
              </h2>
            </div>

            {detailPhase === 'idle' ? (
              <EmptyState
                description="Selecione uma linha da base principal para abrir o contexto do cliente."
                title="Nenhum cliente selecionado"
              />
            ) : detailPhase === 'loading' ? (
              <LoadingState
                description="Carregando o contexto detalhado do cliente."
                title="Abrindo cliente"
              />
            ) : detailPhase === 'contract-unavailable' ? (
              <ContractUnavailableState contractName="detalhe do cliente" />
            ) : detailPhase === 'error' || !tenantDetail || !selectedTenantSummary ? (
              <ErrorState
                description={detailMessage ?? 'O contexto do cliente não ficou disponível.'}
              />
            ) : (
              <div className="space-y-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
                <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white p-3.5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(48,127,226,0.08)] text-[1.12rem] font-semibold text-[color:var(--color-brand-blue)]">
                      {initialsFromName(tenantDetail.display_name)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={toneForTenantStatus(tenantDetail.status)}>
                          {labelForTenantStatus(tenantDetail.status)}
                        </StatusPill>
                        <StatusPill>
                          {tenantDetail.active_membership_count}/{tenantDetail.membership_count} memberships
                        </StatusPill>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[0.98rem] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                          {tenantDetail.display_name}
                        </h3>
                        <p className="text-[0.86rem] leading-5 text-[color:var(--color-muted)]">
                          {tenantDetail.slug} · {tenantDetail.legal_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-2.5">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Contato principal
                      </p>
                      <p className="text-[0.92rem] font-medium text-[color:var(--color-ink)]">
                        {primaryContact?.full_name ?? 'Indisponível'}
                      </p>
                    </div>

                    {primaryContact?.email ? (
                      <a
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 text-[0.88rem] font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                        href={`mailto:${primaryContact.email}`}
                      >
                        Ver contato
                      </a>
                    ) : (
                      <span className="text-sm text-[color:var(--color-muted)]">Sem email</span>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2 border-b border-[color:var(--color-border)] pb-2.5">
                    {[
                      { id: 'summary', label: 'Resumo' },
                      { id: 'members', label: 'Membros' },
                      { id: 'status', label: 'Status' },
                      { id: 'activity', label: 'Atividade' },
                    ].map((tab) => (
                      <button
                        className={cx(
                          'border-b-2 px-1 pb-2 text-[0.92rem] font-semibold transition',
                          activeTab === tab.id
                            ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                            : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                        )}
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TenantTab)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3.5 space-y-3">
                    {activeTab === 'summary' ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <TenantMetricTile
                            helper="vínculos ativos"
                            label="Memberships"
                            value={String(tenantDetail.active_membership_count)}
                          />
                          <TenantMetricTile
                            helper="pontos de contato"
                            label="Contatos ativos"
                            value={String(tenantDetail.active_contact_count)}
                          />
                          <TenantMetricTile helper="não contratado" label="SLA críticos" value="0" />
                          <TenantMetricTile helper="sem leitura dedicada" label="Incidentes" value="0" />
                        </div>

                        <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5">
                          <p className="mb-1.5 text-[0.92rem] font-semibold text-[color:var(--color-ink)]">
                            Informações do cliente
                          </p>
                          <TenantRailInfoRow label="Grupo" value="Indisponível" />
                          <TenantRailInfoRow label="Slug" value={tenantDetail.slug} />
                          <TenantRailInfoRow label="Empresa" value={tenantDetail.legal_name} />
                          <TenantRailInfoRow label="Plano" value="Indisponível" />
                          <TenantRailInfoRow label="Produto" value="Indisponível" />
                          <TenantRailInfoRow
                            label="Atualizado"
                            value={formatDateTime(tenantDetail.updated_at)}
                          />
                        </div>

                        <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5">
                          <p className="mb-1.5 text-[0.92rem] font-semibold text-[color:var(--color-ink)]">
                            Ações rápidas
                          </p>
                          <div className="grid gap-1.5">
                            <Link
                              className="inline-flex min-h-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-navy),var(--color-brand-blue))] px-4 text-[0.88rem] font-medium text-white shadow-[0_12px_30px_rgba(20,31,71,0.22)]"
                              to={`/support/customers/${tenantDetail.id}`}
                            >
                              Abrir contexto operacional
                            </Link>
                            <button
                              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 text-[0.88rem] font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                              onClick={() => setActiveTab('members')}
                              type="button"
                            >
                              Gerenciar memberships
                            </button>
                            <button
                              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 text-[0.88rem] font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                              onClick={() => setShowContactManager(true)}
                              type="button"
                            >
                              Gerenciar contatos
                            </button>
                            <button
                              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 text-[0.88rem] font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                              onClick={() => setActiveTab('activity')}
                              type="button"
                            >
                              Ver atividade do cliente
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[0.92rem] font-semibold text-[color:var(--color-ink)]">
                              Contatos vinculados
                            </p>
                            <GhostButton
                              className="min-h-9 px-3 text-xs"
                              onClick={() => setShowContactManager(true)}
                              type="button"
                            >
                              Gerenciar
                            </GhostButton>
                          </div>

                          <div className="mt-3 space-y-2.5">
                            {tenantDetail.contacts.length === 0 ? (
                              <InlineNotice>Nenhum contato oficial vinculado.</InlineNotice>
                            ) : (
                              tenantDetail.contacts.slice(0, 2).map((contact) => (
                                <div
                                  className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-3 py-3"
                                  key={contact.id}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[0.92rem] font-medium text-[color:var(--color-ink)]">
                                      {contact.full_name}
                                    </span>
                                    {contact.is_primary ? (
                                      <StatusPill tone="accent">Principal</StatusPill>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-[0.88rem] text-[color:var(--color-muted)]">
                                    {contact.email ?? 'Sem email'} · {contact.phone ?? 'Sem telefone'}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {activeTab === 'members' ? (
                      <div className="space-y-3">
                        {selectedTenantMemberships.length === 0 ? (
                          <EmptyState
                            description="Nenhuma membership foi vinculada a este cliente."
                            title="Sem memberships"
                          />
                        ) : (
                          selectedTenantMemberships.map((membership) => (
                            <div
                              className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3"
                              key={membership.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.92rem] font-semibold text-[color:var(--color-ink)]">
                                  {membership.user_full_name ?? 'Usuário sem nome'}
                                </span>
                                <StatusPill>
                                  {membership.role.replace('tenant_', '').replace('_', ' ')}
                                </StatusPill>
                                <StatusPill
                                  tone={
                                    membership.status === 'active'
                                      ? 'positive'
                                      : membership.status === 'invited'
                                        ? 'warning'
                                        : 'critical'
                                  }
                                >
                                  {membership.status === 'active'
                                    ? 'Ativo'
                                    : membership.status === 'invited'
                                      ? 'Convidado'
                                      : 'Revogado'}
                                </StatusPill>
                              </div>
                              <p className="mt-1 text-[0.88rem] text-[color:var(--color-muted)]">
                                {membership.user_email ?? 'Sem email'} · Atualizado em{' '}
                                {formatDateTime(membership.updated_at)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}

                    {activeTab === 'status' ? (
                      <div className="space-y-4">
                        <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
                          <p className="mb-3 text-sm font-semibold text-[color:var(--color-ink)]">
                            Ajustar status operacional
                          </p>

                          <form className="space-y-3" onSubmit={handleUpdateStatus}>
                            <Field label="Status atual">
                              <SelectInput
                                onChange={(event) =>
                                  setStatusDraft(event.target.value as TenantStatus)
                                }
                                value={statusDraft}
                              >
                                {TENANT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {labelForTenantStatus(status)}
                                  </option>
                                ))}
                              </SelectInput>
                            </Field>

                            {statusMessage ? (
                              <InlineNotice
                                tone={statusMessage.includes('sucesso') ? 'positive' : 'critical'}
                              >
                                {statusMessage}
                              </InlineNotice>
                            ) : null}

                            <AppButton className="min-h-10" disabled={statusSubmitting} type="submit">
                              {statusSubmitting ? 'Salvando...' : 'Salvar status'}
                            </AppButton>
                          </form>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <TenantMetricTile
                            helper="com vínculo ativo"
                            label="Membros"
                            value={String(tenantDetail.active_membership_count)}
                          />
                          <TenantMetricTile
                            helper="contatos em operação"
                            label="Contatos"
                            value={String(tenantDetail.active_contact_count)}
                          />
                        </div>
                      </div>
                    ) : null}

                    {activeTab === 'activity' ? (
                      <div className="space-y-3">
                        {selectedTenantActivity.length === 0 ? (
                          <EmptyState
                            description="Ainda não existem eventos administrativos vinculados a este cliente."
                            title="Sem atividade recente"
                          />
                        ) : (
                          selectedTenantActivity.map((entry) => (
                            <div
                              className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3"
                              key={entry.id}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill tone={classifyActivityTone(entry)}>
                                  {activityLabel(entry)}
                                </StatusPill>
                                <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                                  {entry.entity_table}
                                </span>
                              </div>
                              <p className="mt-2 text-[0.92rem] font-medium text-[color:var(--color-ink)]">
                                {activityDescription(entry)}
                              </p>
                              <p className="mt-1 text-[0.88rem] text-[color:var(--color-muted)]">
                                {formatDateTime(entry.occurred_at)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showCreateTenant ? (
        <TenantModal
          description="Abra uma nova conta operacional com identificação, razão social e região de dados."
          onClose={() => setShowCreateTenant(false)}
          title="Novo cliente"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateTenant}>
            <Field label="Slug">
              <TextInput
                onChange={(event) =>
                  setTenantForm((current) => ({
                    ...current,
                    slug: event.target.value.toLowerCase(),
                  }))
                }
                placeholder="grupo-reserva"
                required
                value={tenantForm.slug}
              />
            </Field>

            <Field label="Região de dados">
              <TextInput
                onChange={(event) =>
                  setTenantForm((current) => ({
                    ...current,
                    dataRegion: event.target.value,
                  }))
                }
                placeholder="sa-east-1"
                required
                value={tenantForm.dataRegion}
              />
            </Field>

            <Field label="Razão social">
              <TextInput
                onChange={(event) =>
                  setTenantForm((current) => ({
                    ...current,
                    legalName: event.target.value,
                  }))
                }
                placeholder="Reserva Mini S.A."
                required
                value={tenantForm.legalName}
              />
            </Field>

            <Field label="Nome operacional">
              <TextInput
                onChange={(event) =>
                  setTenantForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Reserva"
                required
                value={tenantForm.displayName}
              />
            </Field>

            <div className="md:col-span-2">
              {tenantFormMessage ? (
                <InlineNotice tone="critical">{tenantFormMessage}</InlineNotice>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <AppButton disabled={tenantFormSubmitting} type="submit">
                {tenantFormSubmitting ? 'Criando...' : 'Criar cliente'}
              </AppButton>
              <GhostButton
                disabled={tenantFormSubmitting}
                onClick={() => {
                  setTenantForm(emptyTenantForm());
                  setTenantFormMessage(null);
                }}
                type="button"
              >
                Limpar
              </GhostButton>
            </div>
          </form>
        </TenantModal>
      ) : null}

      {showContactManager && tenantDetail ? (
        <TenantModal
          description="Revise e atualize os pontos de contato oficiais deste cliente sem reduzir a área útil do cockpit."
          onClose={() => setShowContactManager(false)}
          title="Contatos vinculados"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="space-y-3">
              {tenantDetail.contacts.length === 0 ? (
                <InlineNotice>Nenhum contato oficial vinculado.</InlineNotice>
              ) : (
                tenantDetail.contacts.map((contact) => (
                  <button
                    className={cx(
                      'w-full rounded-[18px] border px-4 py-3 text-left transition',
                      editingContactId === contact.id
                        ? 'border-[rgba(48,127,226,0.3)] bg-[rgba(48,127,226,0.08)]'
                        : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[rgba(48,127,226,0.26)]',
                    )}
                    key={contact.id}
                    onClick={() => {
                      setEditingContactId(contact.id);
                      setContactForm(buildContactForm(contact));
                      setContactMessage(null);
                    }}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[color:var(--color-ink)]">
                        {contact.full_name}
                      </span>
                      {contact.is_primary ? <StatusPill tone="accent">Principal</StatusPill> : null}
                      <StatusPill tone={contact.is_active ? 'positive' : 'critical'}>
                        {contact.is_active ? 'Ativo' : 'Inativo'}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                      {contact.email ?? 'Sem email'} · {contact.phone ?? 'Sem telefone'}
                    </p>
                    {contact.job_title ? (
                      <p className="mt-1 text-[0.88rem] text-[color:var(--color-muted)]">
                        {contact.job_title}
                      </p>
                    ) : null}
                  </button>
                ))
              )}
            </div>

            <form className="space-y-3" onSubmit={handleSaveContact}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
                  {editingContactId ? 'Atualizar contato' : 'Novo contato'}
                </h3>
                <GhostButton
                  className="min-h-9 px-3 text-xs"
                  onClick={() => {
                    setEditingContactId(null);
                    setContactForm(emptyContactForm());
                    setContactMessage(null);
                  }}
                  type="button"
                >
                  Limpar seleção
                </GhostButton>
              </div>

              <Field label="Nome completo">
                <TextInput
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  required
                  value={contactForm.fullName}
                />
              </Field>

              <Field label="Email">
                <TextInput
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="contato@cliente.com"
                  type="email"
                  value={contactForm.email}
                />
              </Field>

              <Field label="Telefone">
                <TextInput
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+55 11 99999-9999"
                  value={contactForm.phone}
                />
              </Field>

              <Field label="Cargo">
                <TextInput
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      jobTitle: event.target.value,
                    }))
                  }
                  placeholder="Operações"
                  value={contactForm.jobTitle}
                />
              </Field>

              <Field label="Vínculo interno">
                <TextInput
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      linkedUserId: event.target.value,
                    }))
                  }
                  placeholder="UUID do perfil, se existir"
                  value={contactForm.linkedUserId}
                />
              </Field>

              <div className="grid gap-2 text-sm text-[color:var(--color-ink)]">
                <label className="flex items-center gap-3">
                  <input
                    checked={contactForm.isPrimary}
                    className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-brand-blue)]"
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        isPrimary: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Contato principal
                </label>
                <label className="flex items-center gap-3">
                  <input
                    checked={contactForm.isActive}
                    className="h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-brand-blue)]"
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Contato ativo
                </label>
              </div>

              {contactMessage ? (
                <InlineNotice
                  tone={contactMessage.includes('sucesso') ? 'positive' : 'critical'}
                >
                  {contactMessage}
                </InlineNotice>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <AppButton disabled={contactSubmitting} type="submit">
                  {contactSubmitting ? 'Salvando...' : 'Salvar contato'}
                </AppButton>
                <GhostButton onClick={() => setShowContactManager(false)} type="button">
                  Concluir
                </GhostButton>
              </div>
            </form>
          </div>
        </TenantModal>
      ) : null}
    </div>
  );
}
