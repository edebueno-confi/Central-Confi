import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import {
  createTenant,
  createTenantContact,
  getAdminTenantDetail,
  listAdminTenants,
  updateTenantContact,
  updateTenantStatus,
  type AdminTenantContactViewRow,
  type AdminTenantDetailRow,
  type AdminTenantsListItemRow,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';
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
  MetricCard,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
} from '../../components/ui';
import {
  TENANT_STATUSES,
  type AdminTenantContactRecordRow,
  type TenantStatus,
} from '../../contracts/admin-contracts';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';

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

export function TenantsPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('idle');
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [tenantDetail, setTenantDetail] = useState<AdminTenantDetailRow | null>(null);
  const [query, setQuery] = useState('');
  const [showCreateTenant, setShowCreateTenant] = useState(false);
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

  const loadTenants = useEffectEvent(async (preferredTenantId?: string | null) => {
    if (phase === 'loading') {
      setPageMessage(null);
    }

    try {
      const data = await listAdminTenants();
      setBackendDenied(false);
      setTenants(data);
      setPhase('ready');
      setPageMessage(null);

      const preservedTenantId =
        preferredTenantId ??
        (data.some((tenant) => tenant.id === selectedTenantId) ? selectedTenantId : null);

      setSelectedTenantId(preservedTenantId ?? data[0]?.id ?? null);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar a superficie oficial de tenants.',
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
        setDetailMessage('O backend nao retornou detalhe para o tenant selecionado.');
        return;
      }

      setTenantDetail(detail);
      setDetailPhase('ready');
      setStatusDraft(detail.status);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o detalhe contratual do tenant.',
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
    void loadTenants();
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
      await loadTenants(created.id);
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao criar tenant.');

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
      await loadTenants(selectedTenantId);
      await loadTenantDetail(selectedTenantId);
      setStatusMessage('Status atualizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao atualizar o status do tenant.');

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
      await loadTenants(selectedTenantId);
      await loadTenantDetail(selectedTenantId);
      setEditingContactId(null);
      setContactForm(emptyContactForm());
      setContactMessage('Contato sincronizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao sincronizar contato do tenant.');

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

  const filteredTenants = tenants.filter((tenant) => {
    if (!deferredQuery.trim()) {
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

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const selectedTenantSummary =
    tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;
  const suspendedTenants = tenants.filter((tenant) => tenant.status === 'suspended').length;
  const totalContacts = tenants.reduce(
    (sum, tenant) => sum + tenant.active_contact_count,
    0,
  );

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando tenants" />;
  }

  if (phase === 'contract-unavailable') {
    return (
      <ContractUnavailableState contractName="vw_admin_tenants_list / vw_admin_tenant_detail" />
    );
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={
          pageMessage ?? 'O Admin Console nao conseguiu materializar a leitura de tenants.'
        }
        action={<AppButton onClick={() => void loadTenants()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Superficie principal do control plane Genius. A lista concentra clientes B2B, status operacional e contatos da operacao, enquanto o contexto lateral mostra apenas o detalhe contratual do tenant selecionado."
        action={
          <AppButton onClick={() => setShowCreateTenant((current) => !current)}>
            {showCreateTenant ? 'Fechar criacao' : 'Criar tenant'}
          </AppButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard helper="Leitura oficial em vw_admin_tenants_list." label="Tenants" value={String(totalTenants)} />
        <MetricCard helper="Status operacional ativo." label="Ativos" value={String(activeTenants)} />
        <MetricCard helper="Pontos que exigem atencao." label="Suspensos" value={String(suspendedTenants)} />
        <MetricCard helper="Contatos ativos da operacao." label="Contatos ativos" value={String(totalContacts)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] 2xl:grid-cols-[minmax(0,1.14fr)_minmax(480px,0.86fr)]">
        <div className="space-y-6">
          {showCreateTenant ? (
            <Panel
              title="Criar tenant"
              description="A criacao continua exclusivamente pela RPC administrativa oficial."
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
                    placeholder="genius-return-br"
                    required
                    value={tenantForm.slug}
                  />
                </Field>
                <Field label="Regiao de dados">
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
                <Field label="Razao social">
                  <TextInput
                    onChange={(event) =>
                      setTenantForm((current) => ({
                        ...current,
                        legalName: event.target.value,
                      }))
                    }
                    placeholder="Genius Return Tecnologia Ltda"
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
                    placeholder="Genius Return"
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
                    {tenantFormSubmitting ? 'Criando...' : 'Criar tenant'}
                  </AppButton>
                  <GhostButton
                    disabled={tenantFormSubmitting}
                    onClick={() => {
                      setTenantForm(emptyTenantForm());
                      setTenantFormMessage(null);
                    }}
                  >
                    Limpar
                  </GhostButton>
                </div>
              </form>
            </Panel>
          ) : null}

          <Panel
            title="Base de tenants"
            description="Lista global oficial do SaaS. Status, nomes operacionais e contato primario chegam apenas pelas views administrativas."
            actions={
              <>
                <TextInput
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome, slug ou contato primario"
                  value={query}
                />
                <GhostButton onClick={() => void loadTenants(selectedTenantId)}>
                  Recarregar
                </GhostButton>
              </>
            }
          >
            {tenants.length === 0 ? (
              <EmptyState
                title="Nenhum tenant cadastrado"
                description="O backend ainda nao retornou tenants nesta superficie administrativa."
              />
            ) : filteredTenants.length === 0 ? (
              <EmptyState
                title="Nenhum tenant bateu com o filtro"
                description="Ajuste o termo de busca para recuperar um tenant ja existente."
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[color:var(--color-surface)] text-[color:var(--color-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tenant</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Memberships</th>
                        <th className="px-4 py-3 font-medium">Contato primario</th>
                        <th className="px-4 py-3 font-medium">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((tenant) => {
                        const isSelected = tenant.id === selectedTenantId;

                        return (
                          <tr
                            key={tenant.id}
                            className={isSelected ? 'bg-[rgba(48,127,226,0.08)]' : 'bg-white'}
                          >
                            <td className="px-4 py-3">
                              <button
                                className="flex w-full flex-col items-start gap-1 rounded-2xl text-left outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/25"
                                onClick={() => setSelectedTenantId(tenant.id)}
                                type="button"
                              >
                                <span className="font-medium text-[color:var(--color-ink)]">
                                  {tenant.display_name}
                                </span>
                                <span className="text-xs text-[color:var(--color-muted)]">
                                  {tenant.slug} · {tenant.legal_name}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill tone={toneForTenantStatus(tenant.status)}>
                                {tenant.status}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-ink)]">
                              {tenant.active_membership_count}/{tenant.membership_count}
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-muted)]">
                              {tenant.primary_contact_full_name ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-muted)]">
                              {formatDateTime(tenant.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Tenant selecionado"
            description="Contexto lateral essencial do tenant ativo para governanca de pos-venda."
          >
            {detailPhase === 'idle' ? (
              <EmptyState
                title="Selecione um tenant"
                description="O painel lateral so abre contexto quando existe uma linha selecionada."
              />
            ) : detailPhase === 'loading' ? (
              <LoadingState
                description="Carregando o detalhe contratual deste tenant."
                title="Lendo contexto lateral"
              />
            ) : detailPhase === 'contract-unavailable' ? (
              <ContractUnavailableState contractName="vw_admin_tenant_detail" />
            ) : detailPhase === 'error' || !tenantDetail || !selectedTenantSummary ? (
              <ErrorState
                description={detailMessage ?? 'O detalhe do tenant nao ficou disponivel.'}
              />
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={toneForTenantStatus(tenantDetail.status)}>
                      {tenantDetail.status}
                    </StatusPill>
                    <StatusPill>{tenantDetail.data_region}</StatusPill>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                      {tenantDetail.display_name}
                    </h3>
                    <p className="text-sm text-[color:var(--color-muted)]">
                      {tenantDetail.legal_name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                      {tenantDetail.slug}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <MetricCard label="Memberships ativas" value={String(tenantDetail.active_membership_count)} />
                  <MetricCard label="Contatos ativos" value={String(tenantDetail.active_contact_count)} />
                </div>

                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm leading-6 text-[color:var(--color-muted)]">
                  <p>
                    Criado: {formatDateTime(tenantDetail.created_at)}
                  </p>
                  <p>
                    Atualizado: {formatDateTime(tenantDetail.updated_at)}
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleUpdateStatus}>
                  <Field label="Atualizar status operacional">
                    <SelectInput
                      onChange={(event) => setStatusDraft(event.target.value as TenantStatus)}
                      value={statusDraft}
                    >
                      {TENANT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  {statusMessage ? (
                    <InlineNotice
                      tone={
                        statusMessage.includes('sucesso') ? 'default' : 'critical'
                      }
                    >
                      {statusMessage}
                    </InlineNotice>
                  ) : null}

                  <AppButton disabled={statusSubmitting} type="submit">
                    {statusSubmitting ? 'Atualizando...' : 'Salvar status'}
                  </AppButton>
                </form>
              </div>
            )}
          </Panel>

          <Panel
            title="Contatos vinculados"
            description="Contatos de operacao e acompanhamento. Criacao e atualizacao continuam restritas as RPCs administrativas."
          >
            {!tenantDetail ? (
              <EmptyState
                title="Sem tenant selecionado"
                description="O formulario de contatos depende do tenant ativo."
              />
            ) : (
              <div className="space-y-5">
                {tenantDetail.contacts.length === 0 ? (
                  <EmptyState
                    title="Nenhum contato vinculado"
                    description="Adicione o primeiro contato oficial deste tenant."
                  />
                ) : (
                  <div className="space-y-3">
                    {tenantDetail.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-[color:var(--color-ink)]">
                                {contact.full_name}
                              </p>
                              {contact.is_primary ? (
                                <StatusPill tone="accent">primary</StatusPill>
                              ) : null}
                              {contact.is_active ? (
                                <StatusPill tone="positive">active</StatusPill>
                              ) : (
                                <StatusPill tone="critical">inactive</StatusPill>
                              )}
                            </div>
                            <p className="text-sm text-[color:var(--color-muted)]">
                              {contact.email ?? 'Sem email'} · {contact.phone ?? 'Sem telefone'}
                            </p>
                            <p className="text-xs text-[color:var(--color-muted)]">
                              Usuario vinculado: {contact.linked_user_id ?? 'nao vinculado'}
                            </p>
                          </div>

                          <GhostButton
                            onClick={() => {
                              setEditingContactId(contact.id);
                              setContactForm(buildContactForm(contact));
                              setContactMessage(null);
                            }}
                          >
                            Editar
                          </GhostButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSaveContact}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
                      {editingContactId ? 'Atualizar contato' : 'Novo contato'}
                    </h3>
                    {editingContactId ? (
                      <GhostButton
                        onClick={() => {
                          setEditingContactId(null);
                          setContactForm(emptyContactForm());
                          setContactMessage(null);
                        }}
                      >
                        Criar novo
                      </GhostButton>
                    ) : null}
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
                      value={contactForm.jobTitle}
                    />
                  </Field>

                  <Field
                    description="Sem contrato de busca global de usuarios nesta fase. Informe o UUID real quando houver vinculo."
                    label="Linked user id"
                  >
                    <TextInput
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          linkedUserId: event.target.value,
                        }))
                      }
                      placeholder="00000000-0000-0000-0000-000000000000"
                      value={contactForm.linkedUserId}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-ink)]">
                      <input
                        checked={contactForm.isPrimary}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            isPrimary: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Contato primario
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-ink)]">
                      <input
                        checked={contactForm.isActive}
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
                      tone={
                        contactMessage.includes('sucesso') ? 'default' : 'critical'
                      }
                    >
                      {contactMessage}
                    </InlineNotice>
                  ) : null}

                  <AppButton disabled={contactSubmitting} type="submit">
                    {contactSubmitting ? 'Sincronizando...' : editingContactId ? 'Salvar contato' : 'Criar contato'}
                  </AppButton>
                </form>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
