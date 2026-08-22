import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { formatDateTime } from '../../app/format';
import { ErrorState, LoadingState } from '../../components/states';
import { UiBadge } from '../settings/ui/UiBadge';
import { UiButton } from '../settings/ui/UiButton';
import { UiCard } from '../settings/ui/UiCard';
import { UiCardHeader } from '../settings/ui/UiCardHeader';
import { UiDetailList } from '../settings/ui/UiDetailList';
import { UiEmptyState } from '../settings/ui/UiEmptyState';
import { UiField } from '../settings/ui/UiField';
import { UiHintBand } from '../settings/ui/UiHintBand';
import { UiMetric } from '../settings/ui/UiMetric';
import { UiMetricRow } from '../settings/ui/UiMetricRow';
import { UiPage } from '../settings/ui/UiPage';
import { UiPageHeader } from '../settings/ui/UiPageHeader';
import { UiSearchField } from '../settings/ui/UiSearchField';
import { UiTable } from '../settings/ui/UiTable';
import { UiToolbar } from '../settings/ui/UiToolbar';
import '../settings/settings-ui.css';
import {
  createAdminInternalAccessArea,
  deleteAdminInternalAccessArea,
  createAdminInternalFunction,
  createAdminInternalUser,
  createAdminAccessProfile,
  getAdminInternalAccessUser,
  listAdminAccessCapabilities,
  listAdminAccessProfileCapabilities,
  listAdminAccessProfiles,
  listAdminInternalAccessAreas,
  listAdminInternalAccessUsers,
  listAdminInternalMembershipScreenGrants,
  listAdminInternalScreenCatalog,
  listAdminInternalAccessProfileScreenGrants,
  listAdminInternalFunctions,
  listAdminInternalOverrides,
  removeAdminInternalOverride,
  resetAdminInternalUserPassword,
  setAdminInternalUserStatus,
  updateAdminInternalAccessArea,
  updateAdminInternalAccessAssignment,
  updateAdminInternalFunction,
  updateAdminAccessProfile,
  replaceAdminAccessProfileCapabilities,
  replaceInternalMembershipScreens,
  replaceAdminInternalAccessProfileScreens,
  upsertAdminInternalOverride,
} from '../admin/admin-api';
import type {
  AdminInternalAccessAreaRow,
  AdminInternalAccessUserDetail,
  AdminInternalAccessUserRow,
  AdminInternalFunctionRow,
  AdminInternalOverrideRow,
  AdminInternalProfileRow,
  AdminInternalMembershipScreenGrantRow,
  AdminInternalScreenCatalogRow,
} from '../../contracts/admin-contracts';
import { classifyAdminError } from '../admin/admin-errors';
import { useAuthContext } from '../auth/auth-context';

type Tab = 'users' | 'structure' | 'permissions';
type LoadPhase = 'loading' | 'ready' | 'error' | 'denied';
type Tone = 'positive' | 'warning' | 'critical';
type ActionConfirmation = { title: string; impact: string };

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'users', label: 'Usuários' },
  { key: 'structure', label: 'Estrutura' },
  { key: 'permissions', label: 'Perfis' },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  inactive: 'Inativo',
  pending: 'Pendente',
  sent: 'Enviado',
  accepted: 'Aceito',
  expired: 'Expirado',
  revoked: 'Revogado',
  failed: 'Falhou',
};

// Rotulos dos dominios de capability (public.internal_capabilities.domain).
const DOMAIN_LABELS: Record<string, string> = {
  access: 'Usuários e acessos',
  administration: 'Administração do sistema',
  analytics: 'Dashboard gerencial',
  knowledge: 'Central de conhecimento',
  settings: 'Configurações',
  workspace: 'Espaço de trabalho',
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function statusTone(status: string) {
  if (status === 'active' || status === 'accepted') return 'success' as const;
  if (status === 'pending' || status === 'sent') return 'warning' as const;
  if (status === 'suspended' || status === 'revoked' || status === 'failed') return 'danger' as const;
  return 'neutral' as const;
}

function isTab(value: string | null): value is Tab {
  return value === 'users' || value === 'structure' || value === 'permissions';
}

function firstOrMatchingArea(user: AdminInternalAccessUserRow, areaKey?: string) {
  return user.areas.find((area) => !areaKey || String(area.area_key ?? '') === areaKey) ?? user.areas[0] ?? {};
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function InternalControlPlanePage() {
  const { markSessionExpired } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [message, setMessage] = useState<{ text: string; tone?: Tone } | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const candidate = searchParams.get('tab');
    return isTab(candidate) ? candidate : 'users';
  });

  useEffect(() => {
    const candidate = searchParams.get('tab');
    if (isTab(candidate)) setTab(candidate);
  }, [searchParams]);

  const selectTab = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const [users, setUsers] = useState<AdminInternalAccessUserRow[]>([]);
  const [areas, setAreas] = useState<AdminInternalAccessAreaRow[]>([]);
  const [functions, setFunctions] = useState<AdminInternalFunctionRow[]>([]);
  const [profiles, setProfiles] = useState<AdminInternalProfileRow[]>([]);
  const [capabilities, setCapabilities] = useState<Array<{ capability_key: string; display_name: string; description: string | null; domain: string; is_active: boolean }>>([]);
  const [profileCapabilities, setProfileCapabilities] = useState<Array<{ access_profile_id: string; capability_key: string }>>([]);
  const [overrides, setOverrides] = useState<AdminInternalOverrideRow[]>([]);
  const [screenCatalog, setScreenCatalog] = useState<AdminInternalScreenCatalogRow[]>([]);
  const [screenGrants, setScreenGrants] = useState<AdminInternalMembershipScreenGrantRow[]>([]);
  const [profileScreenGrants, setProfileScreenGrants] = useState<Array<{ access_profile_id: string; screen_key: AdminInternalScreenCatalogRow['screen_key'] }>>([]);
  const [query, setQuery] = useState('');
  const [userAreaFilter, setUserAreaFilter] = useState('');
  const [userFunctionFilter, setUserFunctionFilter] = useState('');
  const [userProfileFilter, setUserProfileFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminInternalAccessUserRow | null>(null);
  const [detail, setDetail] = useState<AdminInternalAccessUserDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', areaKey: '', functionId: '', profileId: '' });
  const [createErrors, setCreateErrors] = useState<{ fullName?: string; email?: string; areaKey?: string }>({});
  const [areaForm, setAreaForm] = useState({ areaKey: '', displayName: '', description: '' });
  const [functionForm, setFunctionForm] = useState({ areaKey: '', name: '', description: '', profileId: '' });
  const [assignment, setAssignment] = useState({ areaKey: '', functionId: '', profileId: '' });
  const [overrideForm, setOverrideForm] = useState({ capabilityKey: '', effect: 'allow' as 'allow' | 'deny', justification: '' });
  const [profileForm, setProfileForm] = useState({ name: '', description: '' });
  const [createRequest, setCreateRequest] = useState<{ target: 'area' | 'profile'; nonce: number } | null>(null);
  // Credencial de exibição única. Vive só na memória desta tela, sai da memória
  // quando o administrador fecha o aviso e nunca é gravada em lugar nenhum.
  const [issuedCredential, setIssuedCredential] = useState<{ label: string; password: string } | null>(null);

  async function load() {
    setPhase('loading');
    try {
      const [nextUsers, nextAreas, nextFunctions, nextProfiles, nextCapabilities, nextProfileCapabilities, nextOverrides, nextScreens, nextGrants, nextProfileGrants] = await Promise.all([
        listAdminInternalAccessUsers(), listAdminInternalAccessAreas(), listAdminInternalFunctions(), listAdminAccessProfiles(), listAdminAccessCapabilities(), listAdminAccessProfileCapabilities(), listAdminInternalOverrides(), listAdminInternalScreenCatalog(), listAdminInternalMembershipScreenGrants(), listAdminInternalAccessProfileScreenGrants(),
      ]);
      setUsers(nextUsers); setAreas(nextAreas); setFunctions(nextFunctions); setProfiles(nextProfiles); setCapabilities(nextCapabilities); setProfileCapabilities(nextProfileCapabilities); setOverrides(nextOverrides); setScreenCatalog(nextScreens); setScreenGrants(nextGrants); setProfileScreenGrants(nextProfileGrants);
      setCreateForm((current) => ({ ...current, areaKey: current.areaKey || nextAreas.find((area) => area.is_active)?.area_key || '' }));
      setFunctionForm((current) => ({ ...current, areaKey: current.areaKey || nextAreas[0]?.area_key || '' }));
      setPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(error, 'Não foi possível carregar a gestão de acessos.');
      if (classified.kind === 'session-expired') { markSessionExpired(); return; }
      setPhase(classified.kind === 'permission-denied' ? 'denied' : 'error');
      setMessage({ text: classified.message, tone: 'critical' });
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const textMatches = !normalized || `${user.full_name ?? ''} ${user.email ?? ''} ${user.platform_roles.join(' ')} ${user.access_status}`.toLowerCase().includes(normalized);
      // Sem filtro de estrutura a lista mostra o read model inteiro. Antes o
      // `some()` exigia pelo menos um vínculo, então quem ainda não tinha área
      // sumia da tela mesmo constando no read model e nos indicadores.
      const hasStructureFilter = Boolean(userAreaFilter || userFunctionFilter || userProfileFilter);
      const areaMatches = !hasStructureFilter || user.areas.some((area) =>
        (!userAreaFilter || String(area.area_key ?? '') === userAreaFilter) &&
        (!userFunctionFilter || String(area.function_id ?? '') === userFunctionFilter) &&
        (!userProfileFilter || String(area.access_profile_id ?? '') === userProfileFilter),
      );
      return textMatches && areaMatches && (!userStatusFilter || user.access_status === userStatusFilter);
    });
  }, [query, users, userAreaFilter, userFunctionFilter, userProfileFilter, userStatusFilter]);

  async function runAction(action: () => Promise<unknown>, success: string, confirmation?: ActionConfirmation) {
    if (confirmation && !window.confirm(`${confirmation.title}\n\n${confirmation.impact}\n\nConfirma esta ação?`)) return;
    setBusy(true); setMessage(null);
    try { await action(); setMessage({ text: success, tone: 'positive' }); await load(); }
    catch (error) { const classified = classifyAdminError(error, 'Não foi possível concluir a ação.'); setMessage({ text: classified.message, tone: 'critical' }); }
    finally { setBusy(false); }
  }

  /**
   * Redefinição administrativa: a senha é gerada no servidor e volta uma única
   * vez. A tela apenas mostra o valor recebido — não gera, não guarda e não
   * repete a consulta.
   */
  async function resetPassword(user: AdminInternalAccessUserRow) {
    if (!window.confirm(`Redefinir a senha de ${user.full_name || user.email || 'este usuário'}?\n\nA senha atual será substituída. O novo valor será exibido uma única vez e a pessoa deverá trocá-lo no próximo acesso.`)) return;
    setBusy(true); setMessage(null); setIssuedCredential(null);
    try {
      const result = await resetAdminInternalUserPassword(user.user_id);
      if (result?.temporaryPassword) {
        setIssuedCredential({ label: user.email || user.full_name || user.user_id, password: result.temporaryPassword });
      }
      setMessage({ text: 'Senha redefinida. O valor aparece uma única vez abaixo e a troca será exigida no próximo acesso.', tone: 'positive' });
    } catch (error) {
      const classified = classifyAdminError(error, 'Não foi possível redefinir a senha.');
      setMessage({ text: classified.message, tone: 'critical' });
    } finally {
      setBusy(false);
    }
  }

  async function openUser(user: AdminInternalAccessUserRow) {
    setSelectedUser(user); setAssignment({ areaKey: String((user.areas[0]?.area_key as string | undefined) ?? ''), functionId: String((user.areas[0]?.function_id as string | undefined) ?? ''), profileId: String((user.areas[0]?.access_profile_id as string | undefined) ?? '') });
    try { setDetail(await getAdminInternalAccessUser(user.user_id)); } catch { setDetail(null); }
  }

  function startCreate() {
    setCreateErrors({});
    setCreating(true);
    selectTab('users');
  }

  /**
   * Criação direta: valida no cliente apenas o que é formato, e deixa a regra de
   * autorização, unicidade e provisionamento para o comando do servidor.
   */
  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: { fullName?: string; email?: string; areaKey?: string } = {};
    if (!createForm.fullName.trim()) nextErrors.fullName = 'Informe o nome completo da pessoa.';
    if (!isValidEmail(createForm.email)) nextErrors.email = 'Informe um e-mail válido, no formato nome@dominio.com.';
    if (!createForm.areaKey) nextErrors.areaKey = 'Escolha a área que dará contexto ao acesso.';
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!window.confirm(`Criar acesso interno para ${createForm.fullName.trim()}?\n\nA conta será provisionada no servidor com a área, função e perfil informados. A credencial temporária será exibida uma única vez.`)) return;

    setBusy(true); setMessage(null);
    try {
      const result = await createAdminInternalUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim().toLowerCase(),
        areaKey: createForm.areaKey,
        functionId: createForm.functionId || null,
        accessProfileId: createForm.profileId || null,
      });
      if (result?.temporaryPassword) {
        setIssuedCredential({
          label: createForm.email.trim().toLowerCase(),
          password: result.temporaryPassword,
        });
      }
      setMessage({
        text: result?.alreadyExisted
          ? 'Este e-mail já tinha conta na plataforma. O acesso interno foi atualizado com a área, a função e o perfil informados. A senha atual não foi alterada.'
          : 'Usuário criado. A senha temporária aparece uma única vez abaixo: copie e repasse pelo seu canal.',
        tone: result?.alreadyExisted ? 'warning' : 'positive',
      });
      setCreating(false);
      setCreateForm((current) => ({ ...current, fullName: '', email: '', functionId: '', profileId: '' }));
      await load();
    } catch (error) {
      const classified = classifyAdminError(error, 'Não foi possível criar o usuário interno.');
      setMessage({ text: classified.message, tone: 'critical' });
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'loading') return <LoadingState title="Preparando acessos e áreas" description="Estamos organizando usuários, equipes e permissões." />;
  if (phase === 'denied') return <ErrorState title="Acesso não autorizado" description="Sua conta não pode administrar os acessos internos." />;
  if (phase === 'error') {
    return (
      <div className="gso-ui">
        <ErrorState
          description={message?.text ?? 'Não foi possível carregar esta área agora.'}
          action={<UiButton icon="refresh" onClick={() => void load()}>Tentar novamente</UiButton>}
        />
      </div>
    );
  }

  const activeUsers = users.filter((user) => user.access_status === 'active').length;
  const suspendedUsers = users.filter((user) => user.access_status === 'suspended').length;
  // O read model não expõe último login real (`last_access_at` é o carimbo de
  // atualização do contexto/perfil), então a tela não afirma "primeiro acesso".
  // O indicador abaixo usa um dado que o backend realmente entrega: quantas
  // identidades internas ainda estão sem vínculo de área.
  const withoutArea = users.filter((user) => user.areas.length === 0).length;
  const activeAreas = areas.filter((area) => area.is_active).length;
  const ctaLabel = tab === 'structure'
      ? 'Criar área'
      : tab === 'permissions'
        ? 'Criar perfil'
        : 'Criar usuário';

  return (
    <div className="gso-ui gso-ui-shell gso-po-v2-access">
      <div className="gso-ui-shell-chrome">
        <UiPageHeader
          actions={ctaLabel ? (
            <UiButton
              icon="plus"
              onClick={() => {
                if (tab === 'structure') {
                  setCreateRequest((current) => ({ target: 'area', nonce: (current?.nonce ?? 0) + 1 }));
                } else if (tab === 'permissions') {
                  setCreateRequest((current) => ({ target: 'profile', nonce: (current?.nonce ?? 0) + 1 }));
                } else if (tab === 'users') {
                  startCreate();
                }
              }}
              variant="primary"
            >
              {ctaLabel}
            </UiButton>
          ) : null}
          description="Gerencie usuários, estrutura organizacional, perfis e permissões da plataforma."
          title="Usuários e acessos"
          titleId="access-title"
        />
        <nav aria-label="Seções de acessos" className="gso-ui-tabs">
          {tabs.map((item) => (
            <button
              aria-current={tab === item.key ? 'page' : undefined}
              className="gso-ui-tab"
              key={item.key}
              onClick={() => selectTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="gso-ui-shell-body">
        <UiPage className="gso-ui-page--fill">
          {message ? (
            <p
              className={message.tone === 'critical' ? 'gso-ui-alert gso-ui-alert--error' : 'gso-ui-alert gso-ui-alert--success'}
              role={message.tone === 'critical' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          ) : null}

          {tab === 'users' ? (
            <>
              {issuedCredential ? (
                <OneTimeCredentialCard
                  credential={issuedCredential}
                  onDismiss={() => setIssuedCredential(null)}
                />
              ) : null}
              {creating ? (
                <CreateUserCard
                  areas={areas}
                  busy={busy}
                  errors={createErrors}
                  form={createForm}
                  functions={functions}
                  onCancel={() => { setCreating(false); setCreateErrors({}); }}
                  onSubmit={submitCreate}
                  profiles={profiles}
                  setForm={setCreateForm}
                />
              ) : null}
              <UsersPanel
                areas={areas}
                assignment={assignment}
                busy={busy}
                capabilities={capabilities}
                detail={detail}
                filters={{ area: userAreaFilter, functionId: userFunctionFilter, profile: userProfileFilter, status: userStatusFilter }}
                functions={functions}
                onAction={runAction}
                onCreate={startCreate}
                onResetPassword={resetPassword}
                onSelect={openUser}
                overrideForm={overrideForm}
                overrides={overrides.filter((item) => item.user_id === selectedUser?.user_id)}
                profiles={profiles}
                query={query}
                selectedUser={selectedUser}
                setAssignment={setAssignment}
                setFilters={{ setArea: setUserAreaFilter, setFunctionId: setUserFunctionFilter, setProfile: setUserProfileFilter, setStatus: setUserStatusFilter }}
                setOverrideForm={setOverrideForm}
                setQuery={setQuery}
                users={filteredUsers}
              />
            </>
          ) : null}

          {tab === 'structure' ? (
            <StructurePanel
              areaForm={areaForm}
              areas={areas}
              busy={busy}
              createRequest={createRequest?.target === 'area' ? createRequest.nonce : 0}
              onCreateRequestHandled={() => setCreateRequest(null)}
              functionForm={functionForm}
              functions={functions}
              onCreateArea={() => void runAction(() => createAdminInternalAccessArea(areaForm), 'Área criada.', { title: 'Criar área organizacional?', impact: 'A área ficará disponível para novos vínculos de acesso.' })}
              onCreateFunction={() => void runAction(() => createAdminInternalFunction({ areaKey: functionForm.areaKey, name: functionForm.name, description: functionForm.description, defaultAccessProfileId: functionForm.profileId || null }), 'Função criada.', { title: 'Criar função?', impact: 'A função ficará disponível para atribuições dentro da área escolhida.' })}
              onUpdateArea={(areaKey, form) => void runAction(() => updateAdminInternalAccessArea({ areaKey, displayName: form.displayName, description: form.description, isActive: form.isActive, managerUserId: form.managerUserId }), 'Área atualizada.', { title: 'Salvar alterações da área?', impact: 'O nome e a descrição da área serão atualizados; vínculos e histórico serão preservados.' })}
              onToggleArea={(area) => void runAction(() => updateAdminInternalAccessArea({ areaKey: area.area_key, displayName: area.display_name, description: area.description ?? '', isActive: !area.is_active, managerUserId: area.manager_user_id }), area.is_active ? 'Área desativada.' : 'Área reativada.', { title: area.is_active ? 'Desativar área?' : 'Reativar área?', impact: area.is_active ? 'Os vínculos e o histórico serão preservados; a área deixará de aparecer como opção padrão para novos acessos.' : 'A área voltará a aparecer como opção para novos acessos.' })}
              onDeleteArea={(area) => void runAction(() => deleteAdminInternalAccessArea(area.area_key), 'Área excluída permanentemente.', { title: `Excluir permanentemente ${area.display_name}?`, impact: 'Esta ação remove a área do catálogo. Só é permitida quando não existem vínculos, funções, convites ou referências legadas.' })}
              onToggleFunction={(item) => void runAction(() => updateAdminInternalFunction({ functionId: item.function_id, name: item.name, description: item.description ?? '', defaultAccessProfileId: item.default_access_profile_id, isActive: !item.is_active }), item.is_active ? 'Função desativada.' : 'Função reativada.', { title: item.is_active ? 'Desativar função?' : 'Reativar função?', impact: 'A alteração será auditada e afeta novas atribuições nessa área.' })}
              onUpdateFunction={(input) => void runAction(() => updateAdminInternalFunction(input), 'Função atualizada.', { title: 'Salvar alterações da função?', impact: 'A alteração será auditada e afeta novas atribuições nessa área.' })}
              onAssignUser={(input) => void runAction(() => updateAdminInternalAccessAssignment(input), 'Usuário vinculado à área.', { title: 'Vincular usuário à área?', impact: 'O usuário passará a ter a área, a função e o perfil selecionados como contexto de acesso.' })}
              onOpenProfiles={() => {
                selectTab('permissions');
                setCreateRequest((current) => ({ target: 'profile', nonce: (current?.nonce ?? 0) + 1 }));
              }}
              profiles={profiles}
              setAreaForm={setAreaForm}
              setFunctionForm={setFunctionForm}
              users={users}
            />
          ) : null}

          {tab === 'permissions' ? (
            <>
              <PermissionsCapabilityPanel
                areas={areas}
                busy={busy}
                capabilities={capabilities}
                onCreate={() => void runAction(() => createAdminAccessProfile(profileForm), 'Perfil criado.', { title: 'Criar perfil?', impact: 'O perfil será criado sem permissões até que sua composição seja salva.' })}
                onSaveCapabilities={(profileId, keys) => void runAction(() => replaceAdminAccessProfileCapabilities(profileId, keys), 'Permissões do perfil atualizadas.', { title: 'Salvar permissões do perfil?', impact: 'As pessoas vinculadas a este perfil poderão ter suas permissões efetivas alteradas.' })}
                onToggle={(profile) => void runAction(() => updateAdminAccessProfile({ profileId: profile.access_profile_id, name: profile.name, description: profile.description ?? '', isActive: !profile.is_active }), profile.is_active ? 'Perfil desativado.' : 'Perfil reativado.', { title: profile.is_active ? 'Desativar perfil?' : 'Reativar perfil?', impact: 'A alteração afeta os acessos efetivos das pessoas vinculadas ao perfil.' })}
                profileCapabilities={profileCapabilities}
                createRequest={createRequest?.target === 'profile' ? createRequest.nonce : 0}
                onCreateRequestHandled={() => setCreateRequest(null)}
                onUpdateProfile={(input) => void runAction(() => updateAdminAccessProfile(input), 'Perfil atualizado.', { title: 'Salvar dados do perfil?', impact: 'Nome, descrição e status serão atualizados no contrato real de acesso.' })}
                onAssignUser={(input) => void runAction(() => updateAdminInternalAccessAssignment(input), 'Usuário vinculado ao perfil.', { title: 'Vincular usuário ao perfil?', impact: 'O vínculo altera o acesso efetivo do usuário na área selecionada.' })}
                profileForm={profileForm}
                profiles={profiles}
                setProfileForm={setProfileForm}
                functions={functions}
                users={users}
              />
              <div className="gso-access-grants-grid">
                <ProfileScreenAccessPanel
                  busy={busy}
                  catalog={screenCatalog}
                  grants={profileScreenGrants}
                  onSave={(profileId, keys) => void runAction(async () => { await replaceAdminInternalAccessProfileScreens(profileId, keys); setProfileScreenGrants(await listAdminInternalAccessProfileScreenGrants()); }, 'Telas do perfil atualizadas.', { title: 'Salvar telas do perfil?', impact: 'As telas liberadas para as pessoas vinculadas a este perfil serão alteradas.' })}
                  profiles={profiles}
                />
                <ScreenAccessPanel
                  busy={busy}
                  catalog={screenCatalog}
                  grants={screenGrants}
                  onSave={(membershipId, keys) => void runAction(async () => { await replaceInternalMembershipScreens({ membershipId, screenKeys: keys }); setScreenGrants(await listAdminInternalMembershipScreenGrants()); }, 'Telas da área atualizadas.', { title: 'Salvar telas do vínculo?', impact: 'As telas disponíveis para o colaborador e a área selecionados serão alteradas.' })}
                  users={users}
                />
              </div>
            </>
          ) : null}

        </UiPage>
      </div>
    </div>
  );
}

function AccessEditorModal({
  children,
  description,
  initialFocus,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  description: string;
  initialFocus: string;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const onCloseRef = useRef(onClose);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    lastActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>(initialFocus)?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[data-access-editor-modal="true"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      lastActiveElementRef.current?.focus();
    };
  }, [initialFocus, open]);

  if (!open) return null;

  return (
    <div className="gso-access-modal-layer">
      <button aria-label="Fechar edição" className="gso-access-modal-scrim" onClick={onClose} type="button" />
      <section aria-describedby="access-editor-description" aria-labelledby="access-editor-title" aria-modal="true" className="gso-access-modal" data-access-editor-modal="true" role="dialog" tabIndex={-1}>
        <header className="gso-access-modal-header">
          <div>
            <p className="gso-access-modal-kicker">Controle de acesso</p>
            <h2 id="access-editor-title">{title}</h2>
            <p id="access-editor-description">{description}</p>
          </div>
          <button aria-label="Fechar edição" className="gso-access-modal-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="gso-access-modal-body"><div className="gso-access-modal-content">{children}</div></div>
      </section>
    </div>
  );
}

/**
 * Exibição única da senha temporária emitida pelo servidor.
 *
 * A senha chega pela resposta da operação e vive apenas no estado desta tela.
 * Não é gravada em `localStorage`, não vai para a URL, não é reconsultável e
 * some da memória quando o administrador fecha o aviso. Se ele perder o valor,
 * o caminho é redefinir de novo — não existe recuperação.
 */
function OneTimeCredentialCard({
  credential,
  onDismiss,
}: {
  credential: { label: string; password: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <UiCard labelledBy="one-time-credential-title">
      <UiCardHeader
        actions={<UiButton compact icon="x" onClick={onDismiss} variant="ghost">Fechar</UiButton>}
        description={`Credencial de ${credential.label}. Este valor aparece uma única vez e não pode ser consultado depois. Copie e repasse pelo seu canal.`}
        icon="key"
        title="Senha temporária — exibição única"
        titleId="one-time-credential-title"
        tone="warning"
      />
      <div className="gso-ui-card-body">
        <p className="gso-ui-code" data-testid="one-time-credential-value">{credential.password}</p>
        <div className="gso-ui-actions">
          <UiButton
            icon="check"
            onClick={() => {
              void navigator.clipboard?.writeText(credential.password).then(() => setCopied(true)).catch(() => setCopied(false));
            }}
            variant="primary"
          >
            {copied ? 'Copiado' : 'Copiar senha'}
          </UiButton>
        </div>
        <p className="gso-ui-note">
          A pessoa é obrigada a trocar esta senha no primeiro acesso, antes de usar qualquer tela.
        </p>
      </div>
    </UiCard>
  );
}

/**
 * Formulário de criação direta. O administrador não digita senha: quem gera é o
 * servidor, e o valor volta uma única vez na resposta da criação.
 */
function CreateUserCard(props: {
  areas: AdminInternalAccessAreaRow[];
  busy: boolean;
  errors: { fullName?: string; email?: string; areaKey?: string };
  form: { fullName: string; email: string; areaKey: string; functionId: string; profileId: string };
  functions: AdminInternalFunctionRow[];
  onCancel: () => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  profiles: AdminInternalProfileRow[];
  setForm: React.Dispatch<React.SetStateAction<{ fullName: string; email: string; areaKey: string; functionId: string; profileId: string }>>;
}) {
  const { areas, busy, errors, form, functions, onCancel, onSubmit, profiles, setForm } = props;
  const areaFunctions = functions.filter((item) => item.is_active && item.area_key === form.areaKey);

  return (
    <UiCard labelledBy="create-user-title">
      <UiCardHeader
        description="A conta, a senha inicial e o vínculo interno são provisionados no servidor. A senha aparece uma única vez depois de criar."
        icon="plus"
        title="Criar usuário"
        titleId="create-user-title"
        tone="primary"
      />
      <form className="gso-ui-card-body" onSubmit={(event) => void onSubmit(event)}>
        <div className="gso-ui-grid">
          <UiField error={errors.fullName} errorId="create-user-name-error" label="Nome completo">
            <input
              aria-describedby={errors.fullName ? 'create-user-name-error' : undefined}
              aria-invalid={errors.fullName ? true : undefined}
              autoComplete="off"
              className="gso-ui-control"
              disabled={busy}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder="Maria Souza"
              value={form.fullName}
            />
          </UiField>
          <UiField error={errors.email} errorId="create-user-email-error" label="E-mail corporativo">
            <input
              aria-describedby={errors.email ? 'create-user-email-error' : undefined}
              aria-invalid={errors.email ? true : undefined}
              autoComplete="off"
              className="gso-ui-control"
              disabled={busy}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="maria.souza@empresa.com"
              type="email"
              value={form.email}
            />
          </UiField>
          <UiField error={errors.areaKey} errorId="create-user-area-error" label="Área">
            <select
              aria-describedby={errors.areaKey ? 'create-user-area-error' : undefined}
              aria-invalid={errors.areaKey ? true : undefined}
              className="gso-ui-control gso-ui-select"
              disabled={busy}
              onChange={(event) => setForm((current) => ({ ...current, areaKey: event.target.value, functionId: '' }))}
              value={form.areaKey}
            >
              <option value="">Selecione uma área</option>
              {areas.filter((area) => area.is_active).map((area) => (
                <option key={area.area_key} value={area.area_key}>{area.display_name}</option>
              ))}
            </select>
          </UiField>
          <UiField hint="Opcional. A função pode sugerir o perfil padrão da área." label="Função">
            <select
              className="gso-ui-control gso-ui-select"
              disabled={busy || !form.areaKey}
              onChange={(event) => setForm((current) => ({ ...current, functionId: event.target.value }))}
              value={form.functionId}
            >
              <option value="">Sem função</option>
              {areaFunctions.map((item) => <option key={item.function_id} value={item.function_id}>{item.name}</option>)}
            </select>
          </UiField>
          <UiField hint="As permissões efetivas são calculadas pelo backend a partir do perfil e da área." label="Perfil de acesso" wide>
            <select
              className="gso-ui-control gso-ui-select"
              disabled={busy}
              onChange={(event) => setForm((current) => ({ ...current, profileId: event.target.value }))}
              value={form.profileId}
            >
              <option value="">Personalizado (sem perfil)</option>
              {profiles.filter((profile) => profile.is_active).map((profile) => (
                <option key={profile.access_profile_id} value={profile.access_profile_id}>{profile.name}</option>
              ))}
            </select>
          </UiField>
        </div>
        <p className="gso-ui-note">
          O servidor gera uma senha temporária forte e a exibe uma única vez após a criação. Repasse pelo seu canal: a pessoa
          será obrigada a trocá-la no primeiro acesso.
        </p>
        <div className="gso-ui-actions">
          <UiButton disabled={busy} icon="check" type="submit" variant="primary">
            {busy ? 'Criando…' : 'Criar usuário'}
          </UiButton>
          <UiButton disabled={busy} onClick={onCancel} variant="ghost">Cancelar</UiButton>
        </div>
      </form>
    </UiCard>
  );
}

function UsersPanel(props: {
  areas: AdminInternalAccessAreaRow[];
  assignment: { areaKey: string; functionId: string; profileId: string };
  busy: boolean;
  capabilities: Array<{ capability_key: string; display_name: string; description: string | null; domain: string; is_active: boolean }>;
  detail: AdminInternalAccessUserDetail | null;
  filters: { area: string; functionId: string; profile: string; status: string };
  functions: AdminInternalFunctionRow[];
  onAction: (action: () => Promise<unknown>, success: string, confirmation?: ActionConfirmation) => Promise<void>;
  onCreate: () => void;
  onResetPassword: (user: AdminInternalAccessUserRow) => Promise<void>;
  onSelect: (user: AdminInternalAccessUserRow) => void;
  overrideForm: { capabilityKey: string; effect: 'allow' | 'deny'; justification: string };
  overrides: AdminInternalOverrideRow[];
  profiles: AdminInternalProfileRow[];
  query: string;
  selectedUser: AdminInternalAccessUserRow | null;
  setAssignment: React.Dispatch<React.SetStateAction<{ areaKey: string; functionId: string; profileId: string }>>;
  setFilters: { setArea: (value: string) => void; setFunctionId: (value: string) => void; setProfile: (value: string) => void; setStatus: (value: string) => void };
  setOverrideForm: React.Dispatch<React.SetStateAction<{ capabilityKey: string; effect: 'allow' | 'deny'; justification: string }>>;
  setQuery: (value: string) => void;
  users: AdminInternalAccessUserRow[];
}) {
  const { areas, assignment, busy, capabilities, detail, filters, functions, onAction, onCreate, onResetPassword, onSelect, overrideForm, overrides, profiles, query, selectedUser, setAssignment, setFilters, setOverrideForm, setQuery, users } = props;
  const visibleFunctions = functions.filter((item) => !assignment.areaKey || item.area_key === assignment.areaKey);
  const effectivePermissions = detail?.effective_permissions ?? [];
  const effectiveCapabilities = detail ? effectivePermissions.length : null;
  const [detailOpen, setDetailOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);

  function closeDetail() {
    setDetailOpen(false);
    window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  }

  useEffect(() => {
    if (!detailOpen) return;

    const focusable = () => Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    const focusFirst = () => focusable()[0]?.focus();
    const frame = window.requestAnimationFrame(focusFirst);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [detailOpen]);

  return (
    <>
      {/* Esta faixa exibia numeros inventados: "9" gestores, "6" convidados e "3"
          acessos pendentes eram literais, e os dois primeiros caiam em `|| 27` e
          `|| 4` quando a lista vinha vazia. As variacoes ("+3 este mes",
          "2 aguardando aprovacao") tambem eram fixas — nao existe serie historica
          por tras delas. Ficam apenas os valores derivaveis da lista real. */}
      <UiMetricRow label="Resumo de usuários internos">
        <UiMetric icon="users" label="Usuários ativos" tone="primary" value={users.filter((u) => u.access_status === 'active').length} />
        <UiMetric icon="shield" label="Administradores" tone="neutral" value={users.filter((u) => u.platform_roles.includes('platform_admin')).length} />
        {/* O contrato so expoe active | suspended | inactive: nao existe estado
            "pendente" para acesso interno. */}
        <UiMetric icon="alert" label="Acessos suspensos ou inativos" tone="danger" value={users.filter((u) => u.access_status !== 'active').length} />
      </UiMetricRow>
      <div className="gso-ui-split gso-ui-split--wide-detail gso-ui-grow mt-4">
        <UiCard flush label="Usuários internos">
        <UiToolbar label="Filtros da lista de usuários">
          <div className="gso-ui-toolbar-field gso-ui-toolbar-field--wide">
            <UiSearchField aria-label="Buscar usuário" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou papel" value={query} />
          </div>
          <div className="gso-ui-toolbar-field">
            <select aria-label="Filtrar por área" className="gso-ui-control gso-ui-select" onChange={(event) => setFilters.setArea(event.target.value)} value={filters.area}>
              <option value="">Todas as áreas</option>
              {areas.map((area) => <option key={area.area_key} value={area.area_key}>{area.display_name}</option>)}
            </select>
          </div>
          <div className="gso-ui-toolbar-field">
            <select aria-label="Filtrar por função" className="gso-ui-control gso-ui-select" onChange={(event) => setFilters.setFunctionId(event.target.value)} value={filters.functionId}>
              <option value="">Todas as funções</option>
              {functions.map((item) => <option key={item.function_id} value={item.function_id}>{item.name}</option>)}
            </select>
          </div>
          <div className="gso-ui-toolbar-field">
            <select aria-label="Filtrar por perfil" className="gso-ui-control gso-ui-select" onChange={(event) => setFilters.setProfile(event.target.value)} value={filters.profile}>
              <option value="">Todos os perfis</option>
              {profiles.map((profile) => <option key={profile.access_profile_id} value={profile.access_profile_id}>{profile.name}</option>)}
            </select>
          </div>
          <div className="gso-ui-toolbar-field">
            <select aria-label="Filtrar por status" className="gso-ui-control gso-ui-select" onChange={(event) => setFilters.setStatus(event.target.value)} value={filters.status}>
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </UiToolbar>
          <UiTable label="Usuários internos">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">Área</th>
                <th scope="col">Função</th>
                <th scope="col">Perfil</th>
                <th scope="col">Status</th>
                {/* O backend entrega o carimbo de atualização do contexto, não o
                    último login. O rótulo diz exatamente isso. */}
                <th scope="col">Contexto atualizado</th>
                <th className="gso-ui-table-actions--head" scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const area = user.areas[0] ?? {};
                const selected = selectedUser?.user_id === user.user_id;
                return (
                  <tr className={selected ? 'is-selected' : undefined} key={user.user_id}>
                    <td>
                      <button className="gso-ui-rowselect" onClick={(event) => { drawerTriggerRef.current = event.currentTarget; onSelect(user); setDetailOpen(true); }} type="button">
                        {user.full_name || 'Sem nome'}
                      </button>
                      <small>{user.email || 'Indisponível'}</small>
                    </td>
                    <td>{String(area.area_label ?? 'Sem área')}</td>
                    <td>{String(area.function_name ?? 'Sem função')}</td>
                    <td>{String(area.access_profile_name ?? 'Personalizado')}</td>
                    <td><UiBadge dot tone={statusTone(user.access_status)}>{statusLabel(user.access_status)}</UiBadge></td>
                    <td className="gso-ui-table-numeric">{user.last_access_at ? formatDateTime(user.last_access_at) : 'Indisponível'}</td>
                    <td>
                      <div className="gso-ui-table-actions">
                        <UiButton
                          compact
                          disabled={busy}
                          icon="key"
                          onClick={() => void onResetPassword(user)}
                          variant="secondary"
                        >
                          Redefinir senha
                        </UiButton>
                        <UiButton
                          compact
                          disabled={busy}
                          onClick={() => void onAction(() => setAdminInternalUserStatus(user.user_id, user.access_status !== 'active'), user.access_status === 'active' ? 'Usuário suspenso.' : 'Usuário reativado.', { title: user.access_status === 'active' ? 'Suspender usuário?' : 'Reativar usuário?', impact: user.access_status === 'active' ? 'O acesso interno será bloqueado e os vínculos serão preservados para auditoria.' : 'O contexto interno e os vínculos não arquivados voltarão a ficar ativos.' })}
                          variant="ghost"
                        >
                          {user.access_status === 'active' ? 'Suspender' : 'Reativar'}
                        </UiButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </UiTable>
          {users.length === 0 ? (
            <UiEmptyState
              action={<UiButton icon="plus" onClick={onCreate} variant="primary">Criar usuário</UiButton>}
              description="Somente identidades com contexto interno aparecem aqui. Quando um colaborador tiver esse contexto, ele aparecerá nesta lista."
              icon="users"
              title="Nenhum usuário interno"
            />
          ) : null}
        </UiCard>

        {detailOpen ? <button aria-label="Fechar detalhe do usuário" className="gso-ui-access-drawer-scrim" onClick={closeDetail} type="button" /> : null}
        <aside aria-label="Detalhe do usuário" aria-modal={detailOpen} className="gso-ui-aside gso-ui-access-drawer" data-open={detailOpen} ref={drawerRef} role={detailOpen ? 'dialog' : undefined}>
          {selectedUser ? (
            <UiCard labelledBy="access-detail-title">
              <UiCardHeader
                actions={
                  <>
                    <UiBadge dot tone={statusTone(selectedUser.access_status)}>{statusLabel(selectedUser.access_status)}</UiBadge>
                    <UiButton aria-label="Fechar detalhe" compact onClick={closeDetail} variant="ghost">Fechar</UiButton>
                  </>
                }
                description={selectedUser.email || 'E-mail indisponível'}
                icon="users"
                title={selectedUser.full_name || 'Usuário interno'}
                titleId="access-detail-title"
              />
              <div className="gso-ui-aside-body">
                <div className="gso-ui-card-body">
                  <UiDetailList
                    items={[
                      { icon: 'shield', label: 'Capacidades efetivas', value: effectiveCapabilities === null ? 'Indisponível' : `${effectiveCapabilities} liberadas pelo backend` },
                      { icon: 'key', label: 'Overrides auditáveis', value: `${selectedUser.override_count}` },
                      { icon: 'clock', label: 'Contexto atualizado', value: selectedUser.last_access_at ? formatDateTime(selectedUser.last_access_at) : 'Indisponível' },
                    ]}
                  />
                </div>
                <div className="gso-ui-card-body border-t border-[color:var(--gso-border)]">
                  <UiCardHeader
                    description="Calculadas pelo backend a partir de papel global, perfil de área e exceções auditáveis. Editar a tela não concede permissão por si só."
                    icon="shield"
                    title="Permissões efetivas"
                    tone="warning"
                  />
                  {effectivePermissions.length === 0 ? (
                    <p className="gso-ui-note mt-3">Nenhuma permissão efetiva disponível para este usuário.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {effectivePermissions.map((permission) => (
                        <li className="rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] p-2" key={permission.capability_key}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <strong className="block text-xs text-[color:var(--gso-text-primary)]">{permission.display_name}</strong>
                              <span className="block text-[11px] text-[color:var(--gso-text-secondary)]">{DOMAIN_LABELS[permission.domain] ?? permission.domain} · {permission.capability_key}</span>
                            </div>
                            <UiBadge tone={permission.effective_effect === 'allow' ? 'success' : 'danger'}>
                              {permission.effective_effect === 'allow' ? 'Permitida' : 'Bloqueada'}
                            </UiBadge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[color:var(--gso-text-secondary)]">
                            <span>Origem: {permission.origin}</span>
                            <span>· Escopo: {permission.scope}</span>
                            {permission.scope_areas.length > 0 ? <span>· {permission.scope_areas.join(', ')}</span> : null}
                          </div>
                          {permission.sources.length > 0 ? <p className="mt-1 text-[11px] text-[color:var(--gso-text-secondary)]">Fontes: {permission.sources.join(' | ')}</p> : null}
                          {permission.has_conflict ? <p className="mt-1 text-[11px] font-semibold text-[color:var(--gso-danger)]">Conflito detectado: há concessão e bloqueio para esta capability; o bloqueio efetivo prevalece.</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="gso-ui-card-body">
                  <UiField label="Área">
                    <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignment((current) => ({ ...current, areaKey: event.target.value, functionId: '' }))} value={assignment.areaKey}>
                      {areas.filter((area) => area.is_active).map((area) => <option key={area.area_key} value={area.area_key}>{area.display_name}</option>)}
                    </select>
                  </UiField>
                  <UiField label="Função">
                    <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignment((current) => ({ ...current, functionId: event.target.value }))} value={assignment.functionId}>
                      <option value="">Sem função</option>
                      {visibleFunctions.map((item) => <option key={item.function_id} value={item.function_id}>{item.name}</option>)}
                    </select>
                  </UiField>
                  <UiField label="Perfil">
                    <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignment((current) => ({ ...current, profileId: event.target.value }))} value={assignment.profileId}>
                      <option value="">Personalizado</option>
                      {profiles.filter((profile) => profile.is_active).map((profile) => <option key={profile.access_profile_id} value={profile.access_profile_id}>{profile.name}</option>)}
                    </select>
                  </UiField>
                  <div className="gso-ui-actions">
                    <UiButton
                      disabled={busy || !assignment.areaKey}
                      icon="check"
                      onClick={() => void onAction(() => updateAdminInternalAccessAssignment({ userId: selectedUser.user_id, areaKey: assignment.areaKey, functionId: assignment.functionId || null, accessProfileId: assignment.profileId || null }), 'Atribuição atualizada.', { title: 'Salvar atribuição?', impact: 'A área, a função e o perfil efetivos deste usuário serão alterados e auditados.' })}
                      variant="primary"
                    >
                      Salvar atribuição
                    </UiButton>
                  </div>
                </div>
                <div className="gso-ui-card-body">
                  <UiCardHeader
                    description="Exceções individuais exigem justificativa e ficam auditadas."
                    icon="key"
                    title="Overrides"
                    tone="warning"
                  />
                  {overrides.length === 0 ? (
                    <p className="gso-ui-note">Nenhum override individual.</p>
                  ) : (
                    <ul className="gso-ui-facts">
                      {overrides.map((item) => (
                        <li key={item.override_id}>
                          {item.capability_name} · {item.effect === 'allow' ? 'conceder' : 'bloquear'}
                          {' '}
                          <UiButton compact onClick={() => void onAction(() => removeAdminInternalOverride(item.override_id), 'Override removido.', { title: 'Remover exceção de permissão?', impact: 'A permissão efetiva voltará a ser calculada sem esta exceção individual.' })} variant="ghost">
                            Remover
                          </UiButton>
                        </li>
                      ))}
                    </ul>
                  )}
                  <UiField label="Capacidade">
                    <select className="gso-ui-control gso-ui-select" onChange={(event) => setOverrideForm((current) => ({ ...current, capabilityKey: event.target.value }))} value={overrideForm.capabilityKey}>
                      <option value="">Selecione uma capacidade</option>
                      {capabilities.map((capability) => <option key={capability.capability_key} value={capability.capability_key}>{capability.display_name} · {capability.domain}</option>)}
                    </select>
                  </UiField>
                  <UiField label="Efeito">
                    <select className="gso-ui-control gso-ui-select" onChange={(event) => setOverrideForm((current) => ({ ...current, effect: event.target.value as 'allow' | 'deny' }))} value={overrideForm.effect}>
                      <option value="allow">Conceder</option>
                      <option value="deny">Bloquear</option>
                    </select>
                  </UiField>
                  <UiField label="Justificativa">
                    <textarea className="gso-ui-control" onChange={(event) => setOverrideForm((current) => ({ ...current, justification: event.target.value }))} rows={3} value={overrideForm.justification} />
                  </UiField>
                  <div className="gso-ui-actions">
                    <UiButton
                      disabled={busy || !overrideForm.capabilityKey || !overrideForm.justification}
                      onClick={() => void onAction(() => upsertAdminInternalOverride({ userId: selectedUser.user_id, capabilityKey: overrideForm.capabilityKey, effect: overrideForm.effect, justification: overrideForm.justification }), 'Override salvo.', { title: 'Salvar exceção de permissão?', impact: 'A permissão selecionada será concedida ou bloqueada individualmente, com justificativa e auditoria.' })}
                    >
                      Salvar override
                    </UiButton>
                  </div>
                </div>
              </div>
            </UiCard>
          ) : (
            <UiCard label="Detalhe do usuário">
              <UiEmptyState
                description="Abra um registro na lista para editar área, função, perfil e overrides auditáveis."
                icon="list"
                title="Selecione um usuário"
              />
            </UiCard>
          )}
        </aside>
      </div>
    </>
  );
}

function StructurePanel(props: {
  areaForm: { areaKey: string; displayName: string; description: string };
  areas: AdminInternalAccessAreaRow[];
  busy: boolean;
  createRequest: number;
  onCreateRequestHandled: () => void;
  functionForm: { areaKey: string; name: string; description: string; profileId: string };
  functions: AdminInternalFunctionRow[];
  onCreateArea: () => void;
  onCreateFunction: () => void;
  onUpdateFunction: (input: { functionId: string; name: string; description: string; defaultAccessProfileId: string | null; isActive: boolean }) => void;
  onDeleteArea: (area: AdminInternalAccessAreaRow) => void;
  onUpdateArea: (areaKey: string, form: { displayName: string; description: string; isActive: boolean; managerUserId: string | null }) => void;
  onToggleArea: (area: AdminInternalAccessAreaRow) => void;
  onToggleFunction: (item: AdminInternalFunctionRow) => void;
  onAssignUser: (input: { userId: string; areaKey: string; functionId?: string | null; accessProfileId?: string | null }) => void;
  onOpenProfiles: () => void;
  profiles: AdminInternalProfileRow[];
  setAreaForm: React.Dispatch<React.SetStateAction<{ areaKey: string; displayName: string; description: string }>>;
  setFunctionForm: React.Dispatch<React.SetStateAction<{ areaKey: string; name: string; description: string; profileId: string }>>;
  users: AdminInternalAccessUserRow[];
}) {
  const { areaForm, areas, busy, createRequest, functionForm, functions, onCreateArea, onCreateFunction, onDeleteArea, onUpdateArea, onUpdateFunction, onToggleArea, onToggleFunction, onAssignUser, onCreateRequestHandled, onOpenProfiles, profiles, setAreaForm, setFunctionForm, users } = props;
  const [selectedAreaKey, setSelectedAreaKey] = useState<string>(areas[0]?.area_key ?? '');
  const [areaSearch, setAreaSearch] = useState('');
  const [areaStatusFilter, setAreaStatusFilter] = useState<'active' | 'all'>('active');
  const [structureTab, setStructureTab] = useState<'overview' | 'functions' | 'users'>('overview');
  const [editingAreaKey, setEditingAreaKey] = useState<string | null>(null);
  const [areaEditorOpen, setAreaEditorOpen] = useState(false);
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignFunctionId, setAssignFunctionId] = useState('');
  const [assignProfileId, setAssignProfileId] = useState('');

  // Nao existe area "Customer Success" fabricada como fallback: sem areas no
  // contrato, o painel de detalhe entra em estado vazio explicito.
  const selectedArea = areas.find((a) => a.area_key === selectedAreaKey) ?? areas[0] ?? null;

  const areaFunctions = functions.filter((f) => f.area_key === (selectedArea?.area_key ?? selectedAreaKey));

  useEffect(() => {
    if (!createRequest) return;
    setEditingAreaKey(null);
    setAreaForm({ areaKey: '', displayName: '', description: '' });
    setAreaEditorOpen(true);
    onCreateRequestHandled();
  }, [createRequest, onCreateRequestHandled, setAreaForm]);

  // Colaboradores realmente vinculados a area selecionada.
  const areaUsers = !selectedArea
    ? []
    : users.filter((user) => user.areas.some((area) => String(area.area_key ?? '') === selectedArea.area_key));

  const filteredAreas = areas.filter((a) =>
    (areaStatusFilter === 'all' || a.is_active)
    && (!areaSearch.trim() || a.display_name.toLowerCase().includes(areaSearch.trim().toLowerCase())),
  );

  function beginEditArea(area: AdminInternalAccessAreaRow) {
    setEditingAreaKey(area.area_key);
    setAreaForm({ areaKey: area.area_key, displayName: area.display_name, description: area.description ?? '' });
    setAreaEditorOpen(true);
  }

  function submitAreaForm() {
    if (!editingAreaKey) {
      onCreateArea();
      return;
    }
    const area = areas.find((item) => item.area_key === editingAreaKey);
    if (!area) return;
    onUpdateArea(editingAreaKey, {
      displayName: areaForm.displayName.trim(),
      description: areaForm.description.trim(),
      isActive: area.is_active,
      managerUserId: area.manager_user_id,
    });
    setEditingAreaKey(null);
    setAreaEditorOpen(false);
  }

  function assignUserToArea() {
    if (!assignUserId || !selectedArea) return;
    onAssignUser({ userId: assignUserId, areaKey: selectedArea.area_key, functionId: assignFunctionId || null, accessProfileId: assignProfileId || null });
    setAssignUserId('');
    setAssignFunctionId('');
    setAssignProfileId('');
  }

  function beginEditFunction(item: AdminInternalFunctionRow) {
    setEditingFunctionId(item.function_id);
    setFunctionForm({ areaKey: item.area_key, name: item.name, description: item.description ?? '', profileId: item.default_access_profile_id ?? '' });
    setStructureTab('functions');
  }

  function submitFunctionForm() {
    if (editingFunctionId) {
      onUpdateFunction({ functionId: editingFunctionId, name: functionForm.name.trim(), description: functionForm.description.trim(), defaultAccessProfileId: functionForm.profileId || null, isActive: functions.find((item) => item.function_id === editingFunctionId)?.is_active ?? true });
      setEditingFunctionId(null);
      return;
    }
    onCreateFunction();
  }

  return (
    <div className="space-y-4">
      {/* "87" vinculados, "2" sem estrutura e "5" pendencias eram literais, e os
          dois primeiros indicadores caiam em `|| 8` e `|| 24`. Ficam apenas os
          valores contados das listas reais. */}
      <UiMetricRow label="Resumo da estrutura organizacional">
        <UiMetric icon="layers" label="Áreas ativas" tone="primary" value={areas.filter((a) => a.is_active).length} />
        <UiMetric icon="list" label="Funções cadastradas" tone="neutral" value={functions.length} />
        <UiMetric icon="users" label="Usuários vinculados" tone="neutral" value={users.filter((u) => u.areas.length > 0).length} />
        <UiMetric icon="users" label="Usuários sem estrutura" tone="neutral" value={users.filter((u) => u.areas.length === 0).length} />
      </UiMetricRow>

      <div className="gso-ui-split gso-ui-split--wide-detail gso-ui-grow">
        <UiCard flush label="Áreas da organização">
          <UiToolbar label="Filtros de áreas">
            <div className="gso-ui-toolbar-field gso-ui-toolbar-field--wide">
              <UiSearchField aria-label="Buscar área" onChange={(event) => setAreaSearch(event.target.value)} placeholder="Buscar área" value={areaSearch} />
            </div>
            <div className="gso-ui-toolbar-field">
              <select aria-label="Status da área" className="gso-ui-control gso-ui-select" onChange={(event) => setAreaStatusFilter(event.target.value as 'active' | 'all')} value={areaStatusFilter}>
                <option value="active">Ativas por padrão</option>
                <option value="all">Mostrar também inativas</option>
              </select>
            </div>
          </UiToolbar>

          <div aria-label="Lista de áreas" className="gso-access-list" role="list">
            {filteredAreas.map((area) => {
              const isSelected = area.area_key === selectedAreaKey;
              return (
                <div className={`gso-access-list-row${isSelected ? ' is-selected' : ''}`} key={area.area_key} role="listitem">
                  <button className="gso-access-list-primary" onClick={() => setSelectedAreaKey(area.area_key)} type="button">
                    <span className="gso-access-list-icon">◆</span>
                    <span className="gso-access-list-copy">
                      <strong>{area.display_name}</strong>
                      <small>{area.manager_name || 'Responsável indisponível'}</small>
                    </span>
                  </button>
                  <div className="gso-access-list-meta" aria-label={`Resumo de ${area.display_name}`}>
                    <span>{typeof area.active_function_count === 'number' ? area.active_function_count : '—'} funções</span>
                    <span>{typeof area.active_user_count === 'number' ? area.active_user_count : '—'} usuários</span>
                    <span>{typeof area.dependency_count === 'number' ? area.dependency_count : '—'} refs.</span>
                  </div>
                  <UiBadge dot tone={area.is_active ? 'success' : 'neutral'}>{area.is_active ? 'Ativa' : 'Inativa'}</UiBadge>
                  <div className="gso-access-list-actions">
                    <UiButton compact disabled={busy} onClick={() => beginEditArea(area)} variant="ghost">Editar</UiButton>
                    <UiButton compact disabled={busy} onClick={() => onToggleArea(area)} variant="ghost">{area.is_active ? 'Desativar' : 'Ativar'}</UiButton>
                    {area.can_delete ? <UiButton compact disabled={busy} onClick={() => onDeleteArea(area)} variant="danger">Excluir</UiButton> : null}
                  </div>
                </div>
              );
            })}
            {filteredAreas.length === 0 ? <p className="gso-ui-note gso-access-list-empty">Nenhuma área corresponde aos filtros atuais.</p> : null}
          </div>

        </UiCard>

        {/* Master-Detail Side Panel para Área Selecionada */}
        <aside className="gso-ui-aside">
          {!selectedArea ? (
            <UiCard label="Detalhe da área">
              <div className="gso-ui-card-body">
                <p className="gso-ui-note">Nenhuma área organizacional disponível para exibir.</p>
              </div>
            </UiCard>
          ) : (
          <UiCard labelledBy="area-detail-title">
            <div className="p-4 border-b border-[color:var(--gso-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--gso-action-blue)] text-white text-base">
                  ◆
                </span>
                <div>
                  <h3 id="area-detail-title" className="text-base font-semibold text-[color:var(--gso-text-primary)] leading-tight">
                    {selectedArea.display_name}
                  </h3>
                  <p className="text-xs text-[color:var(--gso-text-secondary)]">Responsável pela área: {selectedArea.manager_name || 'Indisponível'}</p>
                </div>
              </div>
              <UiBadge dot tone={selectedArea.is_active ? 'success' : 'neutral'}>{selectedArea.is_active ? 'Ativa' : 'Inativa'}</UiBadge>
            </div>

            <div className="flex items-center gap-6 px-4 py-3 border-b border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] text-xs">
              <div>
                <strong className="block text-sm font-semibold text-[color:var(--gso-text-primary)]">{typeof selectedArea.active_function_count === 'number' ? selectedArea.active_function_count : 'Indisponível'}</strong>
                <span className="text-[11px] text-[color:var(--gso-text-secondary)]">Funções</span>
              </div>
              <div>
                <strong className="block text-sm font-semibold text-[color:var(--gso-text-primary)]">{typeof selectedArea.active_user_count === 'number' ? selectedArea.active_user_count : 'Indisponível'}</strong>
                <span className="text-[11px] text-[color:var(--gso-text-secondary)]">Usuários vinculados</span>
              </div>
              <div>
                <strong className="block text-sm font-semibold text-[color:var(--gso-text-primary)]">{typeof selectedArea.dependency_count === 'number' ? selectedArea.dependency_count : 'Indisponível'}</strong>
                <span className="text-[11px] text-[color:var(--gso-text-secondary)]">Referências preservadas</span>
              </div>
            </div>

            <div className="flex border-b border-[color:var(--gso-border)] px-4">
              {[
                ['overview', 'Visão geral'],
                ['functions', 'Funções'],
                ['users', 'Usuários'],
              ].map(([key, label]) => (
                <button
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${structureTab === key ? 'border-[color:var(--gso-action-blue)] text-[color:var(--gso-action-blue)]' : 'border-transparent text-[color:var(--gso-text-secondary)] hover:text-[color:var(--gso-text-primary)]'}`}
                  key={key}
                  onClick={() => setStructureTab(key as typeof structureTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 text-xs">
              {structureTab === 'overview' ? (
                <>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Informações da área</h4>
                    {/* A descricao caia num texto generico sobre carteira de clientes
                        quando a area nao tinha descricao — o que fazia toda area sem
                        descricao parecer ser de Customer Success. E as datas eram
                        literais: a view nao expoe criacao nem atualizacao. */}
                    <p className="text-[color:var(--gso-text-secondary)] leading-relaxed">
                      {selectedArea.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[color:var(--gso-border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Funções da área ({areaFunctions.length})</h4>
                      <button className="text-[11px] font-semibold text-[color:var(--gso-action-blue)] hover:underline" onClick={() => setStructureTab('functions')} type="button">+ Criar função</button>
                    </div>
                    {/* Havia aqui um array de fallback com funcoes de Customer Success
                        (Gestor de CS, Analista de CS, CSM, Assistente de CS). Qualquer
                        area sem funcoes cadastradas — inclusive Comercial, Financeiro e
                        Engenharia — exibia essa lista como se fosse sua. Estado vazio
                        honesto no lugar. */}
                    <div className="space-y-1.5">
                      {areaFunctions.length === 0 ? (
                        <p className="text-[11px] text-[color:var(--gso-text-secondary)]">Nenhuma função cadastrada nesta área.</p>
                      ) : areaFunctions.map((fn, idx) => (
                        <div className="p-2 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] flex items-center justify-between" key={fn.function_id || idx}>
                          <div>
                            <strong className="font-semibold text-[color:var(--gso-text-primary)]">{fn.name}</strong>
                            <p className="text-[11px] text-[color:var(--gso-text-secondary)]">{fn.default_access_profile_name ?? 'Sem perfil padrão'}</p>
                          </div>
                          <span className="font-mono text-[11px] text-[color:var(--gso-text-secondary)]">Indisponível no contrato de funções</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[color:var(--gso-border)] space-y-2">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Ações rápidas</h4>
                    <div className="grid gap-2">
                      <button className="p-2 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] text-left hover:bg-[color:var(--gso-surface-1)] transition-colors font-medium text-[color:var(--gso-text-primary)]" onClick={() => beginEditArea(selectedArea)} type="button">✎ Editar área</button>
                      <button className="p-2 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] text-left hover:bg-[color:var(--gso-surface-1)] transition-colors font-medium text-[color:var(--gso-text-primary)]" onClick={() => setStructureTab('functions')} type="button">＋ Adicionar função</button>
                      <button className="p-2 rounded-lg border border-[color:var(--gso-danger)]/30 bg-[color:var(--gso-danger)]/10 text-left text-[color:var(--gso-danger)] hover:bg-[color:var(--gso-danger)]/20 transition-colors font-medium" onClick={() => onToggleArea(selectedArea)} type="button">{selectedArea.is_active ? '⏸ Desativar área' : '▶ Reativar área'}</button>
                    </div>
                  </div>
                </>
              ) : structureTab === 'functions' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Gestão de Funções</h4>
                  </div>
                  <form className="space-y-3 p-3 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)]" onSubmit={(event) => { event.preventDefault(); submitFunctionForm(); }}>
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="font-semibold text-[color:var(--gso-text-primary)]">{editingFunctionId ? 'Editar função' : 'Nova função'}</h5>
                      {editingFunctionId ? <UiButton compact onClick={() => setEditingFunctionId(null)} type="button" variant="ghost">Cancelar</UiButton> : null}
                    </div>
                    <UiField label="Nome da função">
                      <input className="gso-ui-control" onChange={(event) => setFunctionForm((current) => ({ ...current, areaKey: selectedArea.area_key, name: event.target.value }))} required value={functionForm.name} />
                    </UiField>
                    <UiField label="Perfil padrão">
                      <select className="gso-ui-control gso-ui-select" onChange={(event) => setFunctionForm((current) => ({ ...current, profileId: event.target.value }))} value={functionForm.profileId}>
                        <option value="">Sem perfil padrão</option>
                        {profiles.map((p) => <option key={p.access_profile_id} value={p.access_profile_id}>{p.name}</option>)}
                      </select>
                      <button className="gso-ui-linkbutton mt-1 text-left" onClick={onOpenProfiles} type="button">Criar ou editar perfil</button>
                    </UiField>
                    <UiButton compact disabled={busy} icon={editingFunctionId ? 'check' : 'plus'} type="submit" variant="primary">{editingFunctionId ? 'Salvar função' : 'Criar função nesta área'}</UiButton>
                  </form>
                  <div className="space-y-2">
                    <h5 className="font-semibold text-[color:var(--gso-text-primary)]">Funções desta área</h5>
                    {areaFunctions.length === 0 ? <p className="gso-ui-note">Nenhuma função cadastrada nesta área.</p> : areaFunctions.map((item) => (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--gso-border)] p-2" key={item.function_id}>
                        <div className="min-w-0">
                          <strong className="block truncate text-[color:var(--gso-text-primary)]">{item.name}</strong>
                          <span className="text-[11px] text-[color:var(--gso-text-secondary)]">{item.default_access_profile_name || 'Sem perfil padrão'}</span>
                        </div>
                        <div className="gso-ui-table-actions shrink-0">
                          <UiButton compact disabled={busy} onClick={() => beginEditFunction(item)} variant="ghost">Editar</UiButton>
                          <UiButton compact disabled={busy} onClick={() => onToggleFunction(item)} variant="ghost">{item.is_active ? 'Inativar' : 'Ativar'}</UiButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Usuários vinculados à área</h4>
                  <p className="text-[11px] text-[color:var(--gso-text-secondary)]">Colaboradores associados a {selectedArea.display_name}.</p>
                  <div className="rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] p-3 space-y-3">
                    <h5 className="font-semibold text-[color:var(--gso-text-primary)]">Adicionar usuário à área</h5>
                    <div className="gso-ui-grid">
                      <UiField label="Usuário">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignUserId(event.target.value)} value={assignUserId}>
                          <option value="">Selecione um usuário</option>
                          {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.full_name || user.email || 'Colaborador'}</option>)}
                        </select>
                      </UiField>
                      <UiField label="Função">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignFunctionId(event.target.value)} value={assignFunctionId}>
                          <option value="">Sem função</option>
                          {areaFunctions.filter((item) => item.is_active).map((item) => <option key={item.function_id} value={item.function_id}>{item.name}</option>)}
                        </select>
                      </UiField>
                      <UiField label="Perfil">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignProfileId(event.target.value)} value={assignProfileId}>
                          <option value="">Personalizado</option>
                          {profiles.filter((profile) => profile.is_active).map((profile) => <option key={profile.access_profile_id} value={profile.access_profile_id}>{profile.name}</option>)}
                        </select>
                      </UiField>
                    </div>
                    <UiButton compact disabled={busy || !assignUserId} icon="plus" onClick={assignUserToArea} variant="primary">Vincular usuário</UiButton>
                  </div>
                  {/* Lista real vinda de vw_admin_internal_access_users. A versao
                      anterior repetia tres pessoas fixas de CS em qualquer area. */}
                  {areaUsers.length === 0 ? (
                    <p className="gso-ui-note">Nenhum colaborador vinculado a esta área.</p>
                  ) : (
                    <div className="divide-y divide-[color:var(--gso-border)]">
                      {areaUsers.map((user) => {
                        const membership = user.areas.find((area) => String(area.area_key ?? '') === selectedArea.area_key) ?? {};
                        const functionName = String(membership.function_name ?? '') || 'Sem função';
                        const profileName = String(membership.access_profile_name ?? '') || 'Sem perfil';
                        return (
                          <div className="py-2 flex items-center justify-between" key={user.user_id}>
                            <div>
                              <strong className="block font-medium text-[color:var(--gso-text-primary)]">{user.full_name || user.email || 'Colaborador'}</strong>
                              <span className="text-[11px] text-[color:var(--gso-text-secondary)]">{functionName} · {profileName}</span>
                            </div>
                            <UiBadge dot tone={statusTone(user.access_status)}>{statusLabel(user.access_status)}</UiBadge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </UiCard>
          )}
        </aside>
      </div>
      <AccessEditorModal
        description={editingAreaKey ? 'Atualize os dados da área selecionada sem perder o contexto da lista.' : 'Crie a área e depois atribua funções e colaboradores a ela.'}
        initialFocus="#area-editor-name"
        onClose={() => { setAreaEditorOpen(false); setEditingAreaKey(null); }}
        open={areaEditorOpen}
        title={editingAreaKey ? `Editar área: ${selectedArea?.display_name ?? areaForm.displayName}` : 'Criar área'}
      >
        <form className="gso-access-modal-form" id="area-editor-form" onSubmit={(event) => { event.preventDefault(); submitAreaForm(); }}>
          <div className="gso-ui-grid">
            <UiField hint="Chave única em letras minúsculas." label="Chave">
              <input autoComplete="off" disabled={Boolean(editingAreaKey)} id="new-area-key" name="areaKey" className="gso-ui-control" onChange={(event) => setAreaForm((current) => ({ ...current, areaKey: event.target.value }))} pattern="[a-z0-9_]+" placeholder="ex: customer_success" required value={areaForm.areaKey} />
            </UiField>
            <UiField label="Nome de exibição">
              <input autoComplete="off" id="area-editor-name" name="displayName" className="gso-ui-control" onChange={(event) => setAreaForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="ex: Customer Success" required value={areaForm.displayName} />
            </UiField>
            <UiField label="Descrição" wide>
              <textarea autoComplete="off" name="description" className="gso-ui-control" onChange={(event) => setAreaForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição dos objetivos da área" rows={3} value={areaForm.description} />
            </UiField>
          </div>
          <div className="gso-ui-actions">
            <UiButton disabled={busy} icon={editingAreaKey ? 'check' : 'plus'} type="submit" variant="primary">{editingAreaKey ? 'Salvar alterações' : 'Criar área'}</UiButton>
            <UiButton disabled={busy} onClick={() => { setAreaEditorOpen(false); setEditingAreaKey(null); }} type="button" variant="ghost">Cancelar</UiButton>
          </div>
        </form>
      </AccessEditorModal>
    </div>
  );
}

function PermissionsCapabilityPanel(props: {
  areas: AdminInternalAccessAreaRow[];
  busy: boolean;
  createRequest: number;
  onCreateRequestHandled: () => void;
  capabilities: Array<{ capability_key: string; display_name: string; description: string | null; domain: string; is_active: boolean }>;
  onCreate: () => void;
  onSaveCapabilities: (profileId: string, keys: string[]) => void;
  onToggle: (profile: AdminInternalProfileRow) => void;
  onUpdateProfile: (input: { profileId: string; name: string; description: string; isActive: boolean }) => void;
  onAssignUser: (input: { userId: string; areaKey: string; functionId?: string | null; accessProfileId?: string | null }) => void;
  profileCapabilities: Array<{ access_profile_id: string; capability_key: string }>;
  profileForm: { name: string; description: string };
  profiles: AdminInternalProfileRow[];
  setProfileForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
  functions: AdminInternalFunctionRow[];
  users: AdminInternalAccessUserRow[];
}) {
  const { areas, busy, capabilities, createRequest, functions, onAssignUser, onCreate, onCreateRequestHandled, onSaveCapabilities, onToggle, onUpdateProfile, profileCapabilities, profileForm, profiles, setProfileForm, users } = props;
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.access_profile_id ?? '');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileTypeFilter, setProfileTypeFilter] = useState('');
  const [profileDetailTab, setProfileDetailTab] = useState<'overview' | 'permissions' | 'users'>('overview');
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({ name: '', description: '' });
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [assignmentAreaKey, setAssignmentAreaKey] = useState('');
  const [assignmentFunctionId, setAssignmentFunctionId] = useState('');
  // Nao existe perfil "Gestor de CS" fabricado como fallback: quando o contrato
  // nao retorna perfis, o painel de detalhe entra em estado vazio explicito.
  const selectedProfile = profiles.find((p) => p.access_profile_id === selectedProfileId) ?? profiles[0] ?? null;

  useEffect(() => {
    if (!createRequest) return;
    setProfileForm({ name: '', description: '' });
    setProfileEditorOpen(true);
    onCreateRequestHandled();
  }, [createRequest, onCreateRequestHandled, setProfileForm]);

  useEffect(() => {
    if (!profiles.some((profile) => profile.access_profile_id === selectedProfileId)) setSelectedProfileId(profiles[0]?.access_profile_id ?? '');
  }, [profiles, selectedProfileId]);
  useEffect(() => {
    setSelectedKeys(profileCapabilities.filter((item) => item.access_profile_id === selectedProfileId).map((item) => item.capability_key));
  }, [profileCapabilities, selectedProfileId]);
  useEffect(() => {
    setProfileEditForm({ name: selectedProfile?.name ?? '', description: selectedProfile?.description ?? '' });
  }, [selectedProfileId, selectedProfile?.description, selectedProfile?.name]);
  useEffect(() => {
    if (!areas.some((area) => area.area_key === assignmentAreaKey)) setAssignmentAreaKey(areas.find((area) => area.is_active)?.area_key ?? areas[0]?.area_key ?? '');
  }, [areas, assignmentAreaKey]);

  const toggleCapability = (key: string) => setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const viewCapabilities = capabilities.filter((capability) => capability.capability_key.endsWith('.view'));
  const actionCapabilities = capabilities.filter((capability) => !capability.capability_key.endsWith('.view'));

  // Nivel de acesso por dominio, derivado do catalogo de capabilities e das
  // capabilities efetivamente atribuidas ao perfil selecionado.
  const profileModuleAccess = Array.from(
    capabilities.reduce<Map<string, { granted: number; grantedAction: number }>>((acc, capability) => {
      const entry = acc.get(capability.domain) ?? { granted: 0, grantedAction: 0 };
      if (selectedKeys.includes(capability.capability_key)) {
        entry.granted += 1;
        if (!capability.capability_key.endsWith('.view')) entry.grantedAction += 1;
      }
      acc.set(capability.domain, entry);
      return acc;
    }, new Map()),
  )
    .map(([domain, entry]) => ({
      domain,
      label: DOMAIN_LABELS[domain] ?? domain,
      status: entry.grantedAction > 0 ? 'Permitido' : entry.granted > 0 ? 'Somente leitura' : 'Bloqueado',
      tone: (entry.grantedAction > 0 ? 'success' : entry.granted > 0 ? 'neutral' : 'danger') as 'success' | 'neutral' | 'danger',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  // Colaboradores realmente vinculados ao perfil selecionado, via areas.
  const profileUsers = users
    .filter((user) => user.areas.some((area) => String(area.access_profile_id ?? '') === selectedProfileId))
    .map((user) => ({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      status: user.access_status as string,
    }));
  const assignmentFunctions = functions.filter((item) => item.area_key === assignmentAreaKey && item.is_active);
  const activeUsers = users.filter((user) => user.access_status !== 'inactive');
  const submitProfileEdit = () => {
    if (!selectedProfile || !profileEditForm.name.trim()) return;
    onUpdateProfile({ profileId: selectedProfile.access_profile_id, name: profileEditForm.name.trim(), description: profileEditForm.description.trim(), isActive: selectedProfile.is_active });
    setProfileEditOpen(false);
  };
  const submitProfileCreate = () => {
    onCreate();
    setProfileEditorOpen(false);
  };
  const submitProfileAssignment = () => {
    if (!selectedProfileId || !assignmentUserId || !assignmentAreaKey) return;
    onAssignUser({ userId: assignmentUserId, areaKey: assignmentAreaKey, functionId: assignmentFunctionId || null, accessProfileId: selectedProfileId });
    setAssignmentUserId('');
    setAssignmentFunctionId('');
  };

  const capabilityOption = (capability: (typeof capabilities)[number]) => (
    <label className="gso-ui-toggle flex items-center justify-between py-1.5 px-2 rounded hover:bg-[color:var(--gso-surface-2)]" key={capability.capability_key}>
      <span className="text-xs text-[color:var(--gso-text-primary)]">
        {capability.display_name}
        {capability.description ? <small className="block text-[11px] text-[color:var(--gso-text-secondary)]">{capability.description}</small> : null}
      </span>
      <input checked={selectedKeys.includes(capability.capability_key)} onChange={() => toggleCapability(capability.capability_key)} type="checkbox" />
    </label>
  );

  const filteredProfiles = profiles.filter((p) => {
    const textMatch = !profileSearch.trim() || p.name.toLowerCase().includes(profileSearch.trim().toLowerCase());
    const typeMatch = !profileTypeFilter || (profileTypeFilter === 'system' ? p.is_system : !p.is_system);
    return textMatch && typeMatch;
  });

  return (
    <div className="space-y-4">
      {/* "2" em revisao e "87" vinculados eram literais; os tres primeiros caiam
          em `|| 12`, `|| 4` e `|| 8`. Nao existe estado "em revisao" no contrato
          de perfis, entao o indicador sai em vez de exibir um numero inventado. */}
      <UiMetricRow label="Resumo de perfis de acesso">
        <UiMetric icon="shield" label="Perfis ativos" tone="primary" value={profiles.filter((p) => p.is_active).length} />
        <UiMetric icon="check" label="Padrão" tone="neutral" value={profiles.filter((p) => p.is_system).length} />
        <UiMetric icon="users" label="Customizados" tone="neutral" value={profiles.filter((p) => !p.is_system).length} />
      </UiMetricRow>

      <div className="gso-ui-split gso-ui-split--wide-detail gso-ui-grow">
        <UiCard flush label="Perfis e permissões">
          <UiToolbar label="Filtros de perfis">
            <div className="gso-ui-toolbar-field gso-ui-toolbar-field--wide">
              <UiSearchField aria-label="Buscar perfil" onChange={(event) => setProfileSearch(event.target.value)} placeholder="Buscar perfil" value={profileSearch} />
            </div>
            <div className="gso-ui-toolbar-field">
              <select aria-label="Tipo de perfil" className="gso-ui-control gso-ui-select" onChange={(event) => setProfileTypeFilter(event.target.value)} value={profileTypeFilter}>
                <option value="">Todos os tipos</option>
                <option value="system">Padrão</option>
                <option value="custom">Customizado</option>
              </select>
            </div>
          </UiToolbar>

          <div aria-label="Lista de perfis" className="gso-access-list" role="list">
            {filteredProfiles.map((profile) => {
              const isSelected = profile.access_profile_id === selectedProfileId;
              return (
                <div className={`gso-access-list-row${isSelected ? ' is-selected' : ''}`} key={profile.access_profile_id} role="listitem">
                  <button className="gso-access-list-primary" onClick={() => setSelectedProfileId(profile.access_profile_id)} type="button">
                    <span className="gso-access-list-icon gso-access-list-icon--shield">◆</span>
                    <span className="gso-access-list-copy">
                      <strong>{profile.name}</strong>
                      <small>{profile.is_system ? 'Perfil padrão do sistema' : 'Perfil personalizado'}</small>
                    </span>
                  </button>
                  <div className="gso-access-list-meta" aria-label={`Resumo de ${profile.name}`}>
                    <span>{typeof profile.user_count === 'number' ? profile.user_count : '—'} usuários</span>
                    <span>{typeof profile.capability_count === 'number' ? profile.capability_count : '—'} permissões</span>
                  </div>
                  <UiBadge dot tone={profile.is_active ? 'success' : 'neutral'}>{profile.is_active ? 'Ativo' : 'Inativo'}</UiBadge>
                  <div className="gso-access-list-actions">
                    {!profile.is_system ? <UiButton compact disabled={busy} onClick={() => onToggle(profile)} variant="ghost">{profile.is_active ? 'Desativar' : 'Ativar'}</UiButton> : <span className="gso-access-list-system">Sistema</span>}
                  </div>
                </div>
              );
            })}
            {filteredProfiles.length === 0 ? <p className="gso-ui-note gso-access-list-empty">Nenhum perfil corresponde aos filtros atuais.</p> : null}
          </div>

        </UiCard>

        {/* Master-Detail Side Panel para Perfil Selecionado */}
        <aside className="gso-ui-aside">
          {!selectedProfile ? (
            <UiCard label="Detalhe do perfil">
              <div className="gso-ui-card-body">
                <p className="gso-ui-note">Nenhum perfil de acesso disponível para exibir.</p>
              </div>
            </UiCard>
          ) : (
          <UiCard labelledBy="profile-detail-title">
            <div className="p-4 border-b border-[color:var(--gso-border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--gso-action-blue)] text-white text-base">
                  🛡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="profile-detail-title" className="text-base font-semibold text-[color:var(--gso-text-primary)] leading-tight">
                      {selectedProfile.name}
                    </h3>
                    <UiBadge tone={selectedProfile.is_system ? 'neutral' : 'accent'}>{selectedProfile.is_system ? 'Padrão' : 'Customizado'}</UiBadge>
                  </div>
                  <p className="text-xs text-[color:var(--gso-text-secondary)] mt-0.5">{selectedProfile.description || 'Perfil para atribuição de acessos.'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 px-4 py-3 border-b border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] text-xs">
              <div>
                <strong className="block text-sm font-semibold text-[color:var(--gso-text-primary)]">{typeof selectedProfile.user_count === 'number' ? selectedProfile.user_count : 'Indisponível'}</strong>
                <span className="text-[11px] text-[color:var(--gso-text-secondary)]">Usuários</span>
              </div>
              <div>
                <strong className="block text-sm font-semibold text-[color:var(--gso-text-primary)]">{typeof selectedProfile.capability_count === 'number' ? selectedProfile.capability_count : 'Indisponível'}</strong>
                <span className="text-[11px] text-[color:var(--gso-text-secondary)]">Regras de acesso</span>
              </div>
            </div>

            <div className="flex border-b border-[color:var(--gso-border)] px-4">
              {[
                ['overview', 'Visão geral'],
                ['permissions', 'Permissões'],
                ['users', 'Usuários vinculados'],
              ].map(([key, label]) => (
                <button
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${profileDetailTab === key ? 'border-[color:var(--gso-action-blue)] text-[color:var(--gso-action-blue)]' : 'border-transparent text-[color:var(--gso-text-secondary)] hover:text-[color:var(--gso-text-primary)]'}`}
                  key={key}
                  onClick={() => setProfileDetailTab(key as typeof profileDetailTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4 text-xs">
              {profileDetailTab === 'overview' ? (
                <>
                  <div className="space-y-3 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Dados do perfil</h4>
                        <p className="text-[11px] text-[color:var(--gso-text-secondary)]">Nome e finalidade do perfil selecionado.</p>
                      </div>
                      {!selectedProfile.is_system ? <UiButton compact disabled={busy} onClick={() => setProfileEditOpen(true)} variant="secondary">Editar dados</UiButton> : null}
                    </div>
                    <div className="gso-access-summary-block">
                      <strong>{selectedProfile.name}</strong>
                      <p>{selectedProfile.description || 'Sem descrição cadastrada.'}</p>
                    </div>
                    {selectedProfile.is_system ? <p className="gso-ui-note">Perfis padrão não podem ter metadados editados.</p> : null}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Módulos e níveis de acesso</h4>
                    {/* Derivado das capabilities reais do perfil. A lista fixa
                        anterior mostrava os mesmos 7 modulos com o mesmo status
                        para qualquer perfil selecionado. */}
                    {profileModuleAccess.length === 0 ? (
                      <p className="gso-ui-note">Nenhuma permissão atribuída a este perfil.</p>
                    ) : (
                      <div className="divide-y divide-[color:var(--gso-border)] text-xs">
                        {profileModuleAccess.map((module) => (
                          <div className="py-2 flex items-center justify-between" key={module.domain}>
                            <span className="font-medium text-[color:var(--gso-text-primary)]">{module.label}</span>
                            <UiBadge tone={module.tone}>{module.status}</UiBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[color:var(--gso-border)] space-y-2">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Ações rápidas</h4>
                    <div className="grid gap-2">
                      <button className="p-2 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] text-left hover:bg-[color:var(--gso-surface-1)] transition-colors font-medium text-[color:var(--gso-text-primary)]" onClick={() => setProfileDetailTab('permissions')} type="button">⚡ Ajustar permissões</button>
                      {!selectedProfile.is_system ? (
                        <button className="p-2 rounded-lg border border-[color:var(--gso-danger)]/30 bg-[color:var(--gso-danger)]/10 text-left text-[color:var(--gso-danger)] hover:bg-[color:var(--gso-danger)]/20 transition-colors font-medium" onClick={() => onToggle(selectedProfile)} type="button">🗑 Desativar perfil</button>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : profileDetailTab === 'permissions' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Matriz de Permissões ({selectedKeys.length})</h4>
                    <UiButton compact disabled={busy} icon="check" onClick={() => onSaveCapabilities(selectedProfileId, selectedKeys)} variant="primary">
                      Salvar
                    </UiButton>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                    <div className="space-y-1">
                      <h5 className="font-semibold text-[11px] text-[color:var(--gso-text-secondary)] uppercase tracking-wider">Visualização / Telas</h5>
                      {viewCapabilities.map(capabilityOption)}
                    </div>
                    <div className="space-y-1 pt-2 border-t border-[color:var(--gso-border)]">
                      <h5 className="font-semibold text-[11px] text-[color:var(--gso-text-secondary)] uppercase tracking-wider">Ações & Operações</h5>
                      {actionCapabilities.map(capabilityOption)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[color:var(--gso-text-primary)]">Usuários com o perfil {selectedProfile.name}</h4>
                  <div className="space-y-3 rounded-lg border border-[color:var(--gso-border)] bg-[color:var(--gso-surface-2)] p-3">
                    <div>
                      <h5 className="font-semibold text-[color:var(--gso-text-primary)]">Vincular usuário a este perfil</h5>
                      <p className="text-[11px] text-[color:var(--gso-text-secondary)]">O perfil é aplicado dentro da área escolhida.</p>
                    </div>
                    <div className="gso-ui-grid">
                      <UiField label="Usuário">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignmentUserId(event.target.value)} value={assignmentUserId}>
                          <option value="">Selecione um usuário</option>
                          {activeUsers.map((user) => <option key={user.user_id} value={user.user_id}>{user.full_name || user.email || 'Colaborador'}</option>)}
                        </select>
                      </UiField>
                      <UiField label="Área">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => { setAssignmentAreaKey(event.target.value); setAssignmentFunctionId(''); }} value={assignmentAreaKey}>
                          {areas.filter((area) => area.is_active).map((area) => <option key={area.area_key} value={area.area_key}>{area.display_name}</option>)}
                        </select>
                      </UiField>
                      <UiField label="Função (opcional)">
                        <select className="gso-ui-control gso-ui-select" onChange={(event) => setAssignmentFunctionId(event.target.value)} value={assignmentFunctionId}>
                          <option value="">Sem função específica</option>
                          {assignmentFunctions.map((item) => <option key={item.function_id} value={item.function_id}>{item.name}</option>)}
                        </select>
                      </UiField>
                    </div>
                    <UiButton compact disabled={busy || !assignmentUserId || !assignmentAreaKey} onClick={submitProfileAssignment} variant="primary">Vincular usuário</UiButton>
                  </div>
                  {/* Lista real derivada dos vinculos de area. A versao anterior
                      exibia tres pessoas fixas para qualquer perfil. */}
                  {profileUsers.length === 0 ? (
                    <p className="gso-ui-note">Nenhum colaborador vinculado a este perfil.</p>
                  ) : (
                    <div className="divide-y divide-[color:var(--gso-border)]">
                      {profileUsers.map((user) => (
                        <div className="py-2 flex items-center justify-between" key={user.user_id}>
                          <div>
                            <strong className="block font-medium text-[color:var(--gso-text-primary)]">{user.full_name || 'Colaborador'}</strong>
                            <span className="text-[11px] text-[color:var(--gso-text-secondary)]">{user.email || 'Indisponível'}</span>
                          </div>
                          <UiBadge dot tone={statusTone(user.status)}>{statusLabel(user.status)}</UiBadge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </UiCard>
          )}
        </aside>
      </div>
      <AccessEditorModal
        description="Crie um perfil personalizado para reutilizar uma composição de permissões e telas."
        initialFocus="#profile-editor-name"
        onClose={() => setProfileEditorOpen(false)}
        open={profileEditorOpen}
        title="Criar perfil personalizado"
      >
        <form className="gso-access-modal-form" onSubmit={(event) => { event.preventDefault(); submitProfileCreate(); }}>
          <div className="gso-ui-grid">
            <UiField label="Nome do perfil">
              <input autoComplete="off" id="profile-editor-name" name="profileName" className="gso-ui-control" onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="ex: Financeiro Restrito" required value={profileForm.name} />
            </UiField>
            <UiField label="Descrição" wide>
              <textarea autoComplete="off" name="description" className="gso-ui-control" onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição das responsabilidades do perfil" rows={3} value={profileForm.description} />
            </UiField>
          </div>
          <div className="gso-ui-actions">
            <UiButton disabled={busy || !profileForm.name.trim()} icon="plus" type="submit" variant="primary">Criar perfil</UiButton>
            <UiButton disabled={busy} onClick={() => setProfileEditorOpen(false)} type="button" variant="ghost">Cancelar</UiButton>
          </div>
        </form>
      </AccessEditorModal>
      <AccessEditorModal
        description="Altere os metadados do perfil sem misturar edição com a leitura de permissões."
        initialFocus="#profile-edit-name"
        onClose={() => setProfileEditOpen(false)}
        open={profileEditOpen}
        title={`Editar perfil: ${selectedProfile?.name ?? ''}`}
      >
        <form className="gso-access-modal-form" onSubmit={(event) => { event.preventDefault(); submitProfileEdit(); }}>
          <div className="gso-ui-grid">
            <UiField label="Nome do perfil">
              <input autoComplete="off" id="profile-edit-name" name="profileName" className="gso-ui-control" onChange={(event) => setProfileEditForm((current) => ({ ...current, name: event.target.value }))} required value={profileEditForm.name} />
            </UiField>
            <UiField label="Descrição" wide>
              <textarea autoComplete="off" name="description" className="gso-ui-control" onChange={(event) => setProfileEditForm((current) => ({ ...current, description: event.target.value }))} rows={3} value={profileEditForm.description} />
            </UiField>
          </div>
          <div className="gso-ui-actions">
            <UiButton disabled={busy || !profileEditForm.name.trim()} icon="check" type="submit" variant="primary">Salvar alterações</UiButton>
            <UiButton disabled={busy} onClick={() => setProfileEditOpen(false)} type="button" variant="ghost">Cancelar</UiButton>
          </div>
        </form>
      </AccessEditorModal>
    </div>
  );
}

function ProfileScreenAccessPanel(props: {
  busy: boolean;
  catalog: AdminInternalScreenCatalogRow[];
  grants: Array<{ access_profile_id: string; screen_key: AdminInternalScreenCatalogRow['screen_key'] }>;
  onSave: (profileId: string, keys: AdminInternalScreenCatalogRow['screen_key'][]) => void;
  profiles: AdminInternalProfileRow[];
}) {
  const { busy, catalog, grants, onSave, profiles } = props;
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.access_profile_id ?? '');
  const [keys, setKeys] = useState<AdminInternalScreenCatalogRow['screen_key'][]>([]);

  useEffect(() => { setKeys(grants.filter((grant) => grant.access_profile_id === selectedProfileId).map((grant) => grant.screen_key)); }, [grants, selectedProfileId]);
  useEffect(() => { if (!profiles.some((profile) => profile.access_profile_id === selectedProfileId)) setSelectedProfileId(profiles[0]?.access_profile_id ?? ''); }, [profiles, selectedProfileId]);

  return (
    <UiCard labelledBy="profile-screens-title">
      <UiCardHeader
        description="Defina quais telas entram no perfil selecionado."
        icon="layers"
        title="Telas do perfil"
        titleId="profile-screens-title"
      />
      <div className="gso-ui-card-body">
        <UiField label="Perfil">
          <select className="gso-ui-control gso-ui-select" onChange={(event) => setSelectedProfileId(event.target.value)} value={selectedProfileId}>
            {profiles.map((profile) => <option key={profile.access_profile_id} value={profile.access_profile_id}>{profile.name}</option>)}
          </select>
        </UiField>
      </div>
      <div className="gso-ui-card-body">
        <div className="gso-ui-groups gso-ui-groups--compact">
          {catalog.map((screen) => (
            <label className="gso-ui-toggle" key={screen.screen_key}>
              <span>{screen.display_name}</span>
              <input
                checked={keys.includes(screen.screen_key)}
                disabled={busy || !selectedProfileId}
                onChange={() => setKeys((current) => current.includes(screen.screen_key) ? current.filter((key) => key !== screen.screen_key) : [...current, screen.screen_key])}
                type="checkbox"
              />
            </label>
          ))}
        </div>
        <div className="gso-ui-actions">
          <UiButton disabled={busy || !selectedProfileId} icon="check" onClick={() => onSave(selectedProfileId, keys)} variant="primary">Salvar telas do perfil</UiButton>
        </div>
      </div>
    </UiCard>
  );
}

function ScreenAccessPanel(props: {
  busy: boolean;
  catalog: AdminInternalScreenCatalogRow[];
  grants: AdminInternalMembershipScreenGrantRow[];
  onSave: (membershipId: string, keys: AdminInternalScreenCatalogRow['screen_key'][]) => void;
  users: AdminInternalAccessUserRow[];
}) {
  const { busy, catalog, grants, onSave, users } = props;
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.user_id ?? '');
  const selectedUser = users.find((user) => user.user_id === selectedUserId) ?? users[0] ?? null;
  const [selectedAreaKey, setSelectedAreaKey] = useState(String(users[0]?.areas[0]?.area_key ?? ''));
  const selectedArea: Record<string, unknown> = selectedUser ? firstOrMatchingArea(selectedUser, selectedAreaKey) : {};
  const membershipId = String(selectedArea.membership_id ?? '');
  const grantedKeys = grants.filter((grant) => grant.membership_id === membershipId).map((grant) => grant.screen_key);
  const [keys, setKeys] = useState<AdminInternalScreenCatalogRow['screen_key'][]>(grantedKeys);

  useEffect(() => setKeys(grantedKeys), [membershipId, grants]);
  useEffect(() => {
    if (!users.some((user) => user.user_id === selectedUserId)) setSelectedUserId(users[0]?.user_id ?? '');
  }, [selectedUserId, users]);
  useEffect(() => {
    const firstArea = selectedUser?.areas[0];
    if (!selectedUser?.areas.some((area) => String(area.area_key ?? '') === selectedAreaKey)) {
      setSelectedAreaKey(String(firstArea?.area_key ?? ''));
    }
  }, [selectedAreaKey, selectedUser]);

  const grouped = catalog.reduce<Record<string, AdminInternalScreenCatalogRow[]>>((groups, screen) => { (groups[screen.category] ??= []).push(screen); return groups; }, {});

  return (
    <UiCard labelledBy="member-screens-title">
      <UiCardHeader
        description="Ajuste a visibilidade deste colaborador sem abrir outra tela."
        icon="users"
        title="Telas liberadas por colaborador"
        titleId="member-screens-title"
      />
      <div className="gso-ui-card-body">
        <div className="gso-ui-grid">
          <UiField label="Colaborador">
            <select className="gso-ui-control gso-ui-select" onChange={(event) => setSelectedUserId(event.target.value)} value={selectedUser?.user_id ?? ''}>
              {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.full_name || user.email || 'Colaborador'}</option>)}
            </select>
          </UiField>
          {selectedUser && selectedUser.areas.length > 1 ? (
            <UiField label="Área">
              <select className="gso-ui-control gso-ui-select" onChange={(event) => setSelectedAreaKey(event.target.value)} value={selectedAreaKey}>
                {selectedUser.areas.map((area) => <option key={String(area.membership_id)} value={String(area.area_key ?? '')}>{String(area.area_label ?? 'Área')}</option>)}
              </select>
            </UiField>
          ) : null}
        </div>
        <p className="gso-ui-note">{membershipId ? 'Selecione as telas desta área.' : 'Este colaborador ainda não possui uma área atribuída.'}</p>
      </div>
      {Object.entries(grouped).map(([category, screens]) => (
        <fieldset className="gso-ui-card-body" key={category}>
          <legend className="gso-ui-field-label">
            {category === 'workspace' ? 'Espaço de trabalho' : category === 'intelligence' ? 'Visão gerencial' : 'Administração'}
          </legend>
          <div className="gso-ui-groups gso-ui-groups--compact">
            {screens.map((screen) => (
              <label className="gso-ui-toggle" key={screen.screen_key}>
                <span>{screen.display_name}</span>
                <input
                  checked={keys.includes(screen.screen_key)}
                  disabled={!membershipId || busy}
                  onChange={() => setKeys((current) => current.includes(screen.screen_key) ? current.filter((key) => key !== screen.screen_key) : [...current, screen.screen_key])}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="gso-ui-card-body">
        <div className="gso-ui-actions">
          <UiButton disabled={!membershipId || busy} icon="check" onClick={() => onSave(membershipId, keys)} variant="primary">Salvar telas deste colaborador</UiButton>
        </div>
      </div>
    </UiCard>
  );
}
