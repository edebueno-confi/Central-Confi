import type { IsoTimestamp, JsonValue, Uuid } from '@genius-support-os/contracts';

export const TENANT_STATUSES = ['active', 'suspended', 'archived'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const MEMBERSHIP_STATUSES = ['invited', 'active', 'revoked'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const TENANT_ROLES = [
  'tenant_admin',
  'tenant_manager',
  'tenant_requester',
  'tenant_viewer',
] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const PLATFORM_ROLES = [
  'platform_admin',
  'support_agent',
  'support_manager',
  'engineering_member',
  'engineering_manager',
  'knowledge_manager',
  'audit_reviewer',
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export interface AdminGateProfileRow {
  id: Uuid;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface AdminAuthContextRow extends AdminGateProfileRow {
  roles: PlatformRole[];
}

export interface AdminTenantRecordRow {
  id: Uuid;
  slug: string;
  legal_name: string;
  display_name: string;
  status: TenantStatus;
  data_region: string;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminTenantContactRecordRow {
  id: Uuid;
  tenant_id: Uuid;
  linked_user_id: Uuid | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminTenantMembershipRecordRow {
  id: Uuid;
  tenant_id: Uuid;
  user_id: Uuid;
  role: TenantRole;
  status: MembershipStatus;
  invited_by_user_id: Uuid | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminTenantContactViewRow {
  id: Uuid;
  linked_user_id: Uuid | null;
  linked_user_full_name: string | null;
  linked_user_email: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface AdminTenantsListItemRow extends AdminTenantRecordRow {
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  membership_count: number;
  active_membership_count: number;
  invited_membership_count: number;
  revoked_membership_count: number;
  contact_count: number;
  active_contact_count: number;
  primary_contact_id: Uuid | null;
  primary_contact_linked_user_id: Uuid | null;
  primary_contact_full_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  primary_contact_job_title: string | null;
}

export interface AdminTenantDetailRow extends AdminTenantRecordRow {
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  membership_count: number;
  active_membership_count: number;
  invited_membership_count: number;
  revoked_membership_count: number;
  contact_count: number;
  active_contact_count: number;
  contacts: AdminTenantContactViewRow[];
}

export interface AdminTenantMembershipRow {
  id: Uuid;
  tenant_id: Uuid;
  tenant_slug: string;
  tenant_display_name: string;
  tenant_status: TenantStatus;
  user_id: Uuid;
  user_full_name: string | null;
  user_email: string | null;
  user_avatar_url: string | null;
  user_is_active: boolean;
  role: TenantRole;
  status: MembershipStatus;
  invited_by_user_id: Uuid | null;
  invited_by_full_name: string | null;
  invited_by_email: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminUserLookupRow {
  user_id: Uuid;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: IsoTimestamp;
}

export interface AdminAuditFeedRow {
  id: Uuid;
  occurred_at: IsoTimestamp;
  actor_user_id: Uuid | null;
  actor_full_name: string | null;
  actor_email: string | null;
  tenant_id: Uuid | null;
  tenant_slug: string | null;
  tenant_display_name: string | null;
  entity_schema: string;
  entity_table: string;
  entity_id: Uuid | null;
  action: string;
  before_state: JsonValue | null;
  after_state: JsonValue | null;
  metadata: JsonValue | null;
}

export interface RpcAdminCreateTenantPayload {
  p_slug: string;
  p_legal_name: string;
  p_display_name: string;
  p_data_region?: string;
}

export type RpcAdminCreateTenantResponse = AdminTenantRecordRow;

export interface RpcAdminUpdateTenantStatusPayload {
  p_tenant_id: Uuid;
  p_status: TenantStatus;
}

export type RpcAdminUpdateTenantStatusResponse = AdminTenantRecordRow;

export interface RpcAdminAddTenantMemberPayload {
  p_tenant_id: Uuid;
  p_user_id: Uuid;
  p_role: TenantRole;
  p_status?: MembershipStatus;
}

export type RpcAdminAddTenantMemberResponse = AdminTenantMembershipRecordRow;

export interface RpcAdminUpdateTenantMemberRolePayload {
  p_membership_id: Uuid;
  p_role: TenantRole;
}

export type RpcAdminUpdateTenantMemberRoleResponse = AdminTenantMembershipRecordRow;

export interface RpcAdminUpdateTenantMemberStatusPayload {
  p_membership_id: Uuid;
  p_status: MembershipStatus;
}

export type RpcAdminUpdateTenantMemberStatusResponse = AdminTenantMembershipRecordRow;

export interface RpcAdminCreateTenantContactPayload {
  p_tenant_id: Uuid;
  p_full_name: string;
  p_email?: string | null;
  p_phone?: string | null;
  p_job_title?: string | null;
  p_is_primary?: boolean;
  p_is_active?: boolean;
  p_linked_user_id?: Uuid | null;
}

export type RpcAdminCreateTenantContactResponse = AdminTenantContactRecordRow;

export interface RpcAdminUpdateTenantContactPayload {
  p_contact_id: Uuid;
  p_full_name: string;
  p_email?: string | null;
  p_phone?: string | null;
  p_job_title?: string | null;
  p_is_primary?: boolean;
  p_is_active?: boolean;
  p_linked_user_id?: Uuid | null;
}

export type RpcAdminUpdateTenantContactResponse = AdminTenantContactRecordRow;
