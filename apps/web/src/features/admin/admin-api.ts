import { toAppError } from '../../app/errors';
import { requireSupabaseBrowserClient } from '../../app/supabase-browser';
import type {
  AdminAuditFeedRow,
  AdminTenantContactRecordRow,
  AdminTenantContactViewRow,
  AdminTenantDetailRow,
  AdminTenantMembershipRecordRow,
  AdminTenantMembershipRow,
  AdminTenantRecordRow,
  AdminTenantsListItemRow,
  RpcAdminAddTenantMemberPayload,
  RpcAdminAddTenantMemberResponse,
  RpcAdminCreateTenantContactPayload,
  RpcAdminCreateTenantContactResponse,
  RpcAdminCreateTenantPayload,
  RpcAdminCreateTenantResponse,
  RpcAdminUpdateTenantContactPayload,
  RpcAdminUpdateTenantContactResponse,
  RpcAdminUpdateTenantMemberRolePayload,
  RpcAdminUpdateTenantMemberRoleResponse,
  RpcAdminUpdateTenantMemberStatusPayload,
  RpcAdminUpdateTenantMemberStatusResponse,
  RpcAdminUpdateTenantStatusPayload,
  RpcAdminUpdateTenantStatusResponse,
} from '../../contracts/admin-contracts';

function requireClient() {
  return requireSupabaseBrowserClient();
}

export async function listAdminTenants() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenants_list')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error, 'Falha ao carregar a lista de tenants.');
  }

  return (data ?? []) as AdminTenantsListItemRow[];
}

export async function getAdminTenantDetail(tenantId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenant_detail')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o detalhe do tenant.');
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as AdminTenantDetailRow),
    contacts: Array.isArray(data.contacts) ? (data.contacts as AdminTenantDetailRow['contacts']) : [],
  } satisfies AdminTenantDetailRow;
}

export async function listAdminMemberships() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenant_memberships')
    .select('*')
    .order('tenant_display_name', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar memberships administrativos.');
  }

  return (data ?? []) as AdminTenantMembershipRow[];
}

export async function listAdminAuditFeed(limit = 120) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_audit_feed')
    .select('*')
    .limit(limit)
    .order('occurred_at', { ascending: false });

  if (error) {
    throw toAppError(error, 'Falha ao carregar o feed de auditoria.');
  }

  return (data ?? []) as AdminAuditFeedRow[];
}

export async function createTenant(payload: RpcAdminCreateTenantPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_create_tenant', payload);

  if (error) {
    throw toAppError(error, 'Falha ao criar tenant.');
  }

  return data as RpcAdminCreateTenantResponse;
}

export async function updateTenantStatus(payload: RpcAdminUpdateTenantStatusPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_update_tenant_status', payload);

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o status do tenant.');
  }

  return data as RpcAdminUpdateTenantStatusResponse;
}

export async function addTenantMember(payload: RpcAdminAddTenantMemberPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_add_tenant_member', payload);

  if (error) {
    throw toAppError(error, 'Falha ao adicionar membership.');
  }

  return data as RpcAdminAddTenantMemberResponse;
}

export async function updateTenantMemberRole(
  payload: RpcAdminUpdateTenantMemberRolePayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_member_role',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar a role do membership.');
  }

  return data as RpcAdminUpdateTenantMemberRoleResponse;
}

export async function updateTenantMemberStatus(
  payload: RpcAdminUpdateTenantMemberStatusPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_member_status',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o status do membership.');
  }

  return data as RpcAdminUpdateTenantMemberStatusResponse;
}

export async function createTenantContact(
  payload: RpcAdminCreateTenantContactPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_create_tenant_contact',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao criar contato do tenant.');
  }

  return data as RpcAdminCreateTenantContactResponse;
}

export async function updateTenantContact(
  payload: RpcAdminUpdateTenantContactPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_contact',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar contato do tenant.');
  }

  return data as RpcAdminUpdateTenantContactResponse;
}

export type {
  AdminAuditFeedRow,
  AdminTenantContactRecordRow,
  AdminTenantContactViewRow,
  AdminTenantDetailRow,
  AdminTenantMembershipRecordRow,
  AdminTenantMembershipRow,
  AdminTenantRecordRow,
  AdminTenantsListItemRow,
};
