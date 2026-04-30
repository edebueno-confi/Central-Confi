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
          : `${rows.length} usuario(s) encontrados no contrato oficial.`,
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
      `Usuario selecionado: ${user.full_name ?? 'Sem nome'} (${user.email ?? user.user_id}).`,
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
    return <ContractUnavailableState contractName="vw_admin_tenant_memberships" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={
          pageMessage ??
          'O Admin Console nao conseguiu materializar a leitura oficial de memberships.'
        }
        action={<AppButton onClick={() => void loadSurface()}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access"
        description="Governanca minima de memberships para quem opera tenants no ecossistema Genius. A leitura vem da view global oficial e as mutacoes continuam restritas as RPCs administrativas aprovadas."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard helper="Leitura oficial da view global." label="Memberships" value={String(totalMemberships)} />
        <MetricCard helper="Usuarios ativos em tenants." label="Ativos" value={String(activeMemberships)} />
        <MetricCard helper="Convites pendentes." label="Convidados" value={String(invitedMemberships)} />
        <MetricCard helper="Acessos revogados." label="Revogados" value={String(revokedMemberships)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
        <div className="space-y-6">
          <Panel
            title="Memberships por tenant"
            description="A listagem ja chega com tenant, profile e metadata resolvidos no backend, sem join manual no frontend."
            actions={
              <>
                <SelectInput
                  onChange={(event) => setSelectedTenantFilter(event.target.value)}
                  value={selectedTenantFilter}
                >
                  <option value="all">Todos os tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.display_name}
                    </option>
                  ))}
                </SelectInput>
                <TextInput
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por tenant, email, role ou user id"
                  value={query}
                />
                <GhostButton onClick={() => void loadSurface()}>Recarregar</GhostButton>
              </>
            }
          >
            {memberships.length === 0 ? (
              <EmptyState
                title="Nenhum membership administrativo"
                description="O backend ainda nao retornou memberships nesta view."
              />
            ) : filteredMemberships.length === 0 ? (
              <EmptyState
                title="Nenhum membership bateu com o filtro"
                description="Ajuste o tenant selecionado ou o termo de busca."
              />
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[color:var(--color-surface)] text-[color:var(--color-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Membro</th>
                        <th className="px-4 py-3 font-medium">Tenant</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMemberships.map((membership) => {
                        const isSelected = membership.id === selectedMembershipId;

                        return (
                          <tr
                            key={membership.id}
                            className={isSelected ? 'bg-[rgba(48,127,226,0.08)]' : 'bg-white'}
                          >
                            <td className="px-4 py-3">
                              <button
                                className="flex w-full flex-col items-start gap-1 rounded-2xl text-left outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/25"
                                onClick={() => setSelectedMembershipId(membership.id)}
                                type="button"
                              >
                                <span className="font-medium text-[color:var(--color-ink)]">
                                  {membership.user_full_name ?? 'Usuario sem nome'}
                                </span>
                                <span className="text-xs text-[color:var(--color-muted)]">
                                  {membership.user_email ?? membership.user_id}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-muted)]">
                              {membership.tenant_display_name}
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-ink)]">
                              {membership.role}
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill tone={toneForMembershipStatus(membership.status)}>
                                {humanMembershipStatus(membership.status)}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-3 text-[color:var(--color-muted)]">
                              {formatDateTime(membership.updated_at)}
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
            title="Adicionar membro"
            description="O lookup oficial usa `vw_admin_user_lookup` para localizar usuarios existentes por nome ou email antes de acionar as RPCs de membership."
          >
            <form className="space-y-4" onSubmit={handleAddMembership}>
              <InlineNotice tone="default">
                A busca usa apenas o contrato administrativo aprovado. O fallback manual
                continua disponivel quando voce ja possui o `user_id` real.
              </InlineNotice>

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

              <div className="space-y-3 rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/75 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Field
                    label="Buscar usuario existente"
                    description="Consulte por email ou nome. O backend retorna apenas user_id, nome, email, status e created_at."
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
                    O ambiente atual ainda nao expôs `vw_admin_user_lookup`. O fluxo
                    continua com fallback manual controlado por `user_id`.
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

              <Field
                label="User id selecionado"
                description="Campo manual mantido como fallback controlado. A RPC continua recebendo apenas o UUID final aprovado."
              >
                <TextInput
                  onChange={(event) =>
                    setAddForm((current) => ({
                      ...current,
                      userId: event.target.value,
                    }))
                  }
                  placeholder="00000000-0000-0000-0000-000000000000"
                  required
                  value={addForm.userId}
                />
              </Field>

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
            description="Role e status continuam sendo alterados somente pelas RPCs aprovadas para a operacao Genius."
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
                      {selectedMembership.user_email ?? selectedMembership.user_id}
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
      </div>
    </div>
  );
}
