import { toAppError } from '../../app/errors';
import { requireSupabaseBrowserClient } from '../../app/supabase-browser';
import type {
  AdminAuthContextRow,
  AdminGateProfileRow,
  PlatformRole,
} from '../../contracts/admin-contracts';

export interface AdminActorContext {
  profile: AdminGateProfileRow;
  roles: PlatformRole[];
  is_platform_admin: boolean;
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabaseBrowserClient();

  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw toAppError(error, 'Falha ao autenticar.');
  }
}

export async function signOutAdminSession() {
  const client = requireSupabaseBrowserClient();

  const { error } = await client.auth.signOut();

  if (error) {
    throw toAppError(error, 'Falha ao encerrar a sessao.');
  }
}

export async function fetchAdminActorContext() {
  const client = requireSupabaseBrowserClient();

  const { data, error } = await client
    .from('vw_admin_auth_context')
    .select('*')
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o contexto autenticado do Admin Console.');
  }

  const authContext = data as AdminAuthContextRow | null;

  if (!authContext) {
    return {
      status: 'denied' as const,
      reason: 'missing-profile' as const,
    };
  }

  if (!authContext.is_active) {
    return {
      status: 'denied' as const,
      reason: 'inactive-profile' as const,
    };
  }

  const typedProfile: AdminGateProfileRow = {
    id: authContext.id,
    full_name: authContext.full_name,
    email: authContext.email,
    avatar_url: authContext.avatar_url,
    is_active: authContext.is_active,
  };
  const typedRoles = authContext.roles ?? [];
  const isPlatformAdmin = typedRoles.includes('platform_admin');

  if (!isPlatformAdmin) {
    return {
      status: 'denied' as const,
      reason: 'missing-platform-admin' as const,
      profile: typedProfile,
      roles: typedRoles,
    };
  }

  return {
    status: 'ready' as const,
    actor: {
      profile: typedProfile,
      roles: typedRoles,
      is_platform_admin: true,
    } satisfies AdminActorContext,
  };
}
