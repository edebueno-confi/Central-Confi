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
import { formatDateTime } from '../../app/format';
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
  cx,
  Field,
  GhostButton,
  InlineNotice,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  SummaryStrip,
  SummaryStripItem,
  TextInput,
  WorkspaceSplit,
} from '../../components/ui';
import {
  MEMBERSHIP_STATUSES,
  TENANT_ROLES,
  type MembershipStatus,
  type TenantRole,
} from '../../contracts/admin-contracts';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type LookupPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';

interface AddMembershipFormState {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: MembershipStatus;
}

function emptyAddMembershipForm(): AddMembershipFormState {
  return {
    tenantId: '',
    userId: '',
    role: 'tenant_viewer',
    status: 'invited',
  };
}

function toneForMembershipStatus(status: MembershipStatus) {
  if (status === 'active') {
    return 'positive' as const;
  }

  if (status === 'invited') {
    return 'warning' as const;
  }

  return 'critical' as const;
}

function humanMembershipStatus(status: MembershipStatus) {
  return status === 'invited'
    ? 'Convite pendente'
    : status === 'active'
      ? 'Ativo'
      : 'Revogado';
}

export function AccessPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<AdminTenantMembershipRow[]>([]);
  const [tenants, setTenants] = useState<AdminTenantsListItemRow[]>([]);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
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
      setSelectedMembershipId((current) =>
        membershipRows.some((membership) => membership.id === current)
          ? current
          : membershipRows[0]?.id ?? null,
      );
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar memberships administrativos.',
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
    if (selectedTenantFilter !== 'all' && membership.tenant_id !== selectedTenantFilter) {
      return false;
    }

    if (!deferredQuery.trim()) {
      return true;
    }

    const haystack = [
      membership.tenant_display_name,
      membership.user_full_name ?? '',
      membership.user_email ?? '',
      membership.user_id,
      membership.role,
      membership.status,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const selectedMembership =
    filteredMemberships.find((membership) => membership.id === selectedMembershipId) ??
    memberships.find((membership) => membership.id === selectedMembershipId) ??
    null;

  useEffect(() => {
    if (!selectedMembership) {
      return;
    }

    setRoleDraft(selectedMembership.role);
    setStatusDraft(selectedMembership.status);
  }, [selectedMembership]);

  useEffect(() => {
    if (
      filteredMemberships.length > 0 &&
      !filteredMemberships.some((membership) => membership.id === selectedMembershipId)
    ) {
      setSelectedMembershipId(filteredMemberships[0].id);
      return;
    }

    if (filteredMemberships.length === 0 && selectedTenantFilter !== 'all') {
      setSelectedMembershipId(null);
    }
  }, [filteredMemberships, selectedMembershipId, selectedTenantFilter]);

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
      setAddMessage('Membership criado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao adicionar membership.');

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
      setUpdateMessage('Membership atualizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao atualizar membership.');

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

  async function handleLookupUsers() {
    const trimmed = lookupQuery.trim();

    if (!trimmed) {
      setLookupResults([]);
      setLookupPhase('idle');
      setLookupMessage('Informe nome ou email para consultar usuarios existentes.');
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
          ? 'Nenhum usuario existente bateu com essa busca.'
          : `${rows.length} usuario(s) encontrado(s).`,
      );
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao consultar usuarios existentes.');

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
      `Usuario selecionado: ${user.full_name ?? 'Sem nome'}${user.email ? ` (${user.email})` : ''}.`,
    );
  }

  const totalMemberships = memberships.length;
  const activeMemberships = memberships.filter((membership) => membership.status === 'active').length;
  const invitedMemberships = memberships.filter((membership) => membership.status === 'invited').length;
  const revokedMemberships = memberships.filter((membership) => membership.status === 'revoked').length;

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando memberships" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="lista de acessos por cliente" />;
  }

  if (phase === 'error') {
    return (
        <ErrorState
          description={
            pageMessage ??
            'Nao foi possivel carregar os acessos desta area.'
          }
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
        <PageHeader
          title="Access"
          description="Gerencie quem entra em cada cliente operacional, com foco em convite, funcao e continuidade segura de acesso."
        />

      <WorkspaceSplit
        layoutClassName="xl:grid-cols-[292px_minmax(0,1fr)]"
        sidebar={
          <ContextSubsidebar
            description="Tenant, filtros e indicadores ficam fora da area principal para deixar a gestao de acesso mais direta."
            title="Ferramentas de acesso"
          >
            <ContextSubsidebarSection description="Pulso atual da governanca de acesso." title="Resumo">
              <SummaryStrip className="border-0 bg-transparent px-0 py-0 shadow-none">
                <SummaryStripItem helper="base atual" label="Acessos" value={String(totalMemberships)} />
                <SummaryStripItem helper="operando hoje" label="Ativos" tone="positive" value={String(activeMemberships)} />
                <SummaryStripItem helper="aguardando aceite" label="Convidados" tone="warning" value={String(invitedMemberships)} />
                <SummaryStripItem helper="fora de operacao" label="Revogados" tone="critical" value={String(revokedMemberships)} />
              </SummaryStrip>
            </ContextSubsidebarSection>

            <ContextSubsidebarSection description="Recorte por cliente e busca operacional." title="Filtros">
              <Field label="Cliente">
                <SelectInput
                  onChange={(event) => setSelectedTenantFilter(event.target.value)}
                  value={selectedTenantFilter}
                >
                  <option value="all">Todos os clientes</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.display_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Buscar">
                <TextInput
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por cliente, nome, email ou funcao"
                  value={query}
                />
              </Field>
              <GhostButton className="min-h-11 w-full px-4" onClick={() => void loadSurface()}>
                Recarregar
              </GhostButton>
            </ContextSubsidebarSection>
          </ContextSubsidebar>
        }
        main={
          <div className="space-y-6">
          <Panel
            title="Acessos por cliente"
            description="Lista principal para localizar quem esta com acesso, em qual cliente e em qual funcao."
          >
            {memberships.length === 0 ? (
              <EmptyState
                title="Nenhum membership administrativo"
                description="Ainda nao existe acesso operacional visivel nesta area."
              />
            ) : filteredMemberships.length === 0 ? (
              <EmptyState
                title="Nenhum membership bateu com o filtro"
                description="Ajuste o tenant selecionado ou o termo de busca."
              />
            ) : (
              <div className="space-y-3">
                {filteredMemberships.map((membership) => {
                  const isSelected = membership.id === selectedMembershipId;

                  return (
                    <button
                      className={cx(
                        'flex w-full flex-col gap-3 rounded-[22px] border px-4 py-4 text-left transition',
                        isSelected
                          ? 'border-[rgba(48,127,226,0.42)] bg-[rgba(48,127,226,0.08)] shadow-[0_10px_24px_rgba(19,33,79,0.06)]'
                          : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.24)]',
                      )}
                      key={membership.id}
                      onClick={() => setSelectedMembershipId(membership.id)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={toneForMembershipStatus(membership.status)}>
                          {humanMembershipStatus(membership.status)}
                        </StatusPill>
                        <StatusPill>{membership.role}</StatusPill>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-[color:var(--color-ink)]">
                          {membership.user_full_name ?? 'Usuario sem nome'}
                        </p>
                        <p className="text-sm text-[color:var(--color-muted)]">
                          {membership.user_email ?? membership.user_id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
                        <span>Cliente: {membership.tenant_display_name}</span>
                        <span>Atualizado em {formatDateTime(membership.updated_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Adicionar acesso"
            description="Convide ou vincule uma pessoa a um cliente operacional sem tirar o foco da operacao."
          >
            <form className="space-y-4" onSubmit={handleAddMembership}>
              <InlineNotice tone="default">
                Procure primeiro por nome ou email. A entrada manual continua disponivel apenas como excecao.
              </InlineNotice>

              <Field label="Cliente">
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
                  <option value="">Selecione um cliente</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.display_name}
                  </option>
                ))}
                  </SelectInput>
              </Field>

              <div className="space-y-3 rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/75 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Field
                    label="Buscar usuario existente"
                    description="Consulte por nome ou email para preencher rapidamente o responsavel."
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
                      placeholder="ex.: ede.oliveira@confi.com.vc ou Eduardo"
                      value={lookupQuery}
                    />
                  </Field>
                  <div className="flex items-end">
                    <AppButton
                      disabled={lookupPhase === 'loading'}
                      onClick={() => void handleLookupUsers()}
                      type="button"
                    >
                      {lookupPhase === 'loading' ? 'Buscando...' : 'Buscar usuario'}
                    </AppButton>
                  </div>
                </div>

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

                {lookupPhase === 'contract-unavailable' ? (
                  <InlineNotice tone="warning">
                    A busca de usuarios ficou indisponivel neste ambiente. Use a entrada manual apenas se precisar concluir o acesso agora.
                  </InlineNotice>
                ) : null}

                {lookupResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                      Resultados oficiais
                    </p>
                    <div className="grid gap-2">
                      {lookupResults.map((user) => {
                        const isSelected = addForm.userId === user.user_id;

                        return (
                          <button
                            key={user.user_id}
                            className={`rounded-[20px] border px-4 py-3 text-left transition ${
                              isSelected
                                ? 'border-[color:var(--color-brand-blue)] bg-[rgba(48,127,226,0.08)]'
                                : 'border-[color:var(--color-border)] bg-white hover:border-[color:var(--color-brand-blue)]/40'
                            }`}
                            onClick={() => applyLookupSelection(user)}
                            type="button"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-1">
                                <p className="font-medium text-[color:var(--color-ink)]">
                                  {user.full_name ?? 'Usuario sem nome'}
                                </p>
                                <p className="text-xs text-[color:var(--color-muted)]">
                                  {user.email ?? user.user_id}
                                </p>
                              </div>
                              <StatusPill tone={user.is_active ? 'positive' : 'critical'}>
                                {user.is_active ? 'Ativo' : 'Inativo'}
                              </StatusPill>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <details className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                  Informacoes avancadas
                </summary>
                <div className="mt-3">
                  <Field
                    label="Identificador manual"
                    description="Use este campo apenas quando a pessoa nao aparecer na busca e voce ja souber o identificador interno correto."
                  >
                    <TextInput
                      onChange={(event) =>
                        setAddForm((current) => ({
                          ...current,
                          userId: event.target.value,
                        }))
                      }
                      placeholder="Cole o identificador interno, se necessario"
                      required
                      value={addForm.userId}
                    />
                  </Field>
                </div>
              </details>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role">
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
                        {role}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Status inicial">
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
                        {status}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              {addMessage ? (
                <InlineNotice tone={addMessage.includes('sucesso') ? 'default' : 'critical'}>
                  {addMessage}
                </InlineNotice>
              ) : null}

              <AppButton disabled={addSubmitting} type="submit">
                {addSubmitting ? 'Criando...' : 'Adicionar membership'}
              </AppButton>
            </form>
          </Panel>

          <Panel
            title="Membership selecionado"
            description="Ajuste a funcao e o estado do acesso sem perder o contexto do membro selecionado."
          >
            {!selectedMembership ? (
              <EmptyState
                title="Selecione um membership"
                description="A coluna lateral so permite alteracoes quando existe uma linha ativa na lista."
              />
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={toneForMembershipStatus(selectedMembership.status)}>
                      {humanMembershipStatus(selectedMembership.status)}
                    </StatusPill>
                    <StatusPill>{selectedMembership.role}</StatusPill>
                    {selectedMembership.user_is_active ? (
                      <StatusPill tone="positive">profile ativo</StatusPill>
                    ) : (
                      <StatusPill tone="critical">profile inativo</StatusPill>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                      {selectedMembership.user_full_name ?? 'Usuario sem nome'}
                    </h3>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      {selectedMembership.user_email ?? 'Email nao informado'}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)]">
                      Tenant: {selectedMembership.tenant_display_name}
                    </p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleUpdateMembership}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Role">
                      <SelectInput
                        onChange={(event) => setRoleDraft(event.target.value as TenantRole)}
                        value={roleDraft}
                      >
                        {TENANT_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    <Field label="Status">
                      <SelectInput
                        onChange={(event) =>
                          setStatusDraft(event.target.value as MembershipStatus)
                        }
                        value={statusDraft}
                      >
                        {MEMBERSHIP_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>

                  <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Convidado por: {selectedMembership.invited_by_full_name ?? '—'}</p>
                    <p>Criado: {formatDateTime(selectedMembership.created_at)}</p>
                    <p>Atualizado: {formatDateTime(selectedMembership.updated_at)}</p>
                  </div>

                  {updateMessage ? (
                    <InlineNotice
                      tone={updateMessage.includes('sucesso') ? 'default' : 'critical'}
                    >
                      {updateMessage}
                    </InlineNotice>
                  ) : null}

                  <AppButton disabled={updateSubmitting} type="submit">
                    {updateSubmitting ? 'Atualizando...' : 'Salvar membership'}
                  </AppButton>
                </form>
              </div>
            )}
          </Panel>
          </div>
        }
      />
    </div>
  );
}
