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

export const KNOWLEDGE_VISIBILITIES = ['public', 'internal', 'restricted'] as const;
export type KnowledgeVisibility = (typeof KNOWLEDGE_VISIBILITIES)[number];

export const KNOWLEDGE_ARTICLE_STATUSES = [
  'draft',
  'review',
  'published',
  'archived',
] as const;
export type KnowledgeArticleStatus = (typeof KNOWLEDGE_ARTICLE_STATUSES)[number];

export const KNOWLEDGE_ADVISORY_CLASSIFICATIONS = [
  'public',
  'internal',
  'restricted',
  'obsolete',
  'duplicate',
] as const;
export type KnowledgeAdvisoryClassification =
  (typeof KNOWLEDGE_ADVISORY_CLASSIFICATIONS)[number];

export const KNOWLEDGE_ARTICLE_REVIEW_STATUSES = [
  'pending',
  'in_review',
  'needs_changes',
  'ready_for_review',
  'ready_for_publish',
  'reviewed',
] as const;
export type KnowledgeArticleReviewStatus =
  (typeof KNOWLEDGE_ARTICLE_REVIEW_STATUSES)[number];

export const KNOWLEDGE_SPACE_STATUSES = ['draft', 'active', 'archived'] as const;
export type KnowledgeSpaceStatus = (typeof KNOWLEDGE_SPACE_STATUSES)[number];

export interface AdminKnowledgeSpaceRow {
  id: Uuid;
  organization_id: Uuid;
  organization_slug: string;
  organization_display_name: string;
  owner_tenant_id: Uuid | null;
  owner_tenant_slug: string | null;
  owner_tenant_display_name: string | null;
  slug: string;
  display_name: string;
  status: KnowledgeSpaceStatus;
  is_primary: boolean;
  default_locale: string;
  primary_domain_host: string | null;
  primary_domain_path_prefix: string | null;
  primary_domain_status: string | null;
  brand_name: string | null;
  logo_asset_url: string | null;
  category_count: number;
  article_count: number;
  published_article_count: number;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  created_by_full_name: string | null;
  updated_by_user_id: Uuid | null;
  updated_by_full_name: string | null;
}

export interface AdminKnowledgeCategoryRecordRow {
  id: Uuid;
  tenant_id: Uuid | null;
  knowledge_space_id: Uuid | null;
  parent_category_id: Uuid | null;
  visibility: KnowledgeVisibility;
  name: string;
  slug: string;
  description: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminKnowledgeCategoryV2Row {
  id: Uuid;
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  knowledge_space_status: KnowledgeSpaceStatus;
  organization_id: Uuid;
  organization_slug: string;
  organization_display_name: string;
  owner_tenant_id: Uuid | null;
  owner_tenant_slug: string | null;
  owner_tenant_display_name: string | null;
  tenant_id: Uuid | null;
  tenant_slug: string | null;
  tenant_display_name: string | null;
  parent_category_id: Uuid | null;
  parent_slug: string | null;
  parent_name: string | null;
  visibility: KnowledgeVisibility;
  name: string;
  slug: string;
  description: string | null;
  article_count: number;
  draft_count: number;
  review_count: number;
  published_count: number;
  archived_count: number;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
}

export interface AdminKnowledgeArticleRecordRow {
  id: Uuid;
  tenant_id: Uuid | null;
  knowledge_space_id: Uuid | null;
  category_id: Uuid | null;
  visibility: KnowledgeVisibility;
  status: KnowledgeArticleStatus;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  source_path: string | null;
  source_hash: string | null;
  current_revision_number: number;
  submitted_for_review_at: IsoTimestamp | null;
  published_at: IsoTimestamp | null;
  archived_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminKnowledgeArticleListItemV2Row {
  id: Uuid;
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  knowledge_space_status: KnowledgeSpaceStatus;
  organization_id: Uuid;
  organization_slug: string;
  organization_display_name: string;
  owner_tenant_id: Uuid | null;
  owner_tenant_slug: string | null;
  owner_tenant_display_name: string | null;
  tenant_id: Uuid | null;
  tenant_slug: string | null;
  tenant_display_name: string | null;
  category_id: Uuid | null;
  category_name: string | null;
  category_slug: string | null;
  visibility: KnowledgeVisibility;
  status: KnowledgeArticleStatus;
  title: string;
  slug: string;
  summary: string | null;
  source_path: string | null;
  source_hash: string | null;
  public_article_path: string | null;
  current_revision_number: number;
  revision_count: number;
  latest_revision_at: IsoTimestamp | null;
  submitted_for_review_at: IsoTimestamp | null;
  published_at: IsoTimestamp | null;
  archived_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  has_editorial_draft: boolean;
  editorial_draft_updated_at: IsoTimestamp | null;
}

export interface AdminKnowledgeArticleRevisionRow {
  id: Uuid;
  revision_number: number;
  status_snapshot: KnowledgeArticleStatus;
  visibility: KnowledgeVisibility;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  source_path: string | null;
  source_hash: string | null;
  change_note: string | null;
  created_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
}

export interface AdminKnowledgeArticleSourceRow {
  id: Uuid;
  revision_id: Uuid | null;
  source_kind: string;
  source_path: string;
  source_hash: string;
  source_title: string | null;
  source_metadata: JsonValue | null;
  created_at: IsoTimestamp;
}

export interface AdminKnowledgeArticleEditorialDraftRow {
  id: Uuid;
  article_id: Uuid;
  knowledge_space_id: Uuid;
  tenant_id: Uuid | null;
  category_id: Uuid | null;
  visibility: KnowledgeVisibility;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  source_path: string | null;
  source_hash: string | null;
  based_on_revision_number: number;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
}

export interface AdminKnowledgeArticleDetailV2Row {
  id: Uuid;
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  knowledge_space_status: KnowledgeSpaceStatus;
  organization_id: Uuid;
  organization_slug: string;
  organization_display_name: string;
  owner_tenant_id: Uuid | null;
  owner_tenant_slug: string | null;
  owner_tenant_display_name: string | null;
  tenant_id: Uuid | null;
  tenant_slug: string | null;
  tenant_display_name: string | null;
  category_id: Uuid | null;
  category_name: string | null;
  category_slug: string | null;
  visibility: KnowledgeVisibility;
  status: KnowledgeArticleStatus;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  source_path: string | null;
  source_hash: string | null;
  public_article_path: string | null;
  current_revision_number: number;
  submitted_for_review_at: IsoTimestamp | null;
  published_at: IsoTimestamp | null;
  archived_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  revisions: AdminKnowledgeArticleRevisionRow[];
  sources: AdminKnowledgeArticleSourceRow[];
  editorial_draft: AdminKnowledgeArticleEditorialDraftRow | null;
}

export interface KnowledgeReviewHumanConfirmations {
  title_reviewed?: boolean;
  summary_reviewed?: boolean;
  body_reviewed?: boolean;
  category_reviewed?: boolean;
  visibility_reviewed?: boolean;
  no_sensitive_data_exposed?: boolean;
  ready_for_review?: boolean;
  ready_for_publish?: boolean;
}

export interface AdminKnowledgeArticleReviewAdvisoryRecordRow {
  id: Uuid;
  article_id: Uuid;
  source_hash: string | null;
  suggested_visibility: KnowledgeVisibility;
  suggested_classification: KnowledgeAdvisoryClassification;
  classification_reason: string;
  duplicate_group_key: string | null;
  risk_flags: JsonValue;
  human_confirmations: JsonValue;
  review_status: KnowledgeArticleReviewStatus;
  review_notes: string | null;
  reviewed_by_user_id: Uuid | null;
  reviewed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  created_by_user_id: Uuid | null;
  updated_by_user_id: Uuid | null;
}

export interface AdminKnowledgeArticleReviewAdvisoryRow
  extends AdminKnowledgeArticleReviewAdvisoryRecordRow {
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  source_path: string | null;
  article_visibility: KnowledgeVisibility;
  article_status: KnowledgeArticleStatus;
  article_title: string;
  article_slug: string;
  article_summary: string | null;
  article_updated_at: IsoTimestamp;
  category_id: Uuid | null;
  category_name: string | null;
  category_slug: string | null;
  duplicate_group_article_count: number;
  reviewed_by_full_name: string | null;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
}

export interface RpcAdminCreateKnowledgeCategoryV2Payload {
  p_name: string;
  p_slug: string;
  p_description?: string | null;
  p_visibility?: KnowledgeVisibility;
  p_parent_category_id?: Uuid | null;
  p_knowledge_space_id: Uuid;
  p_tenant_id?: Uuid | null;
}

export type RpcAdminCreateKnowledgeCategoryV2Response =
  AdminKnowledgeCategoryRecordRow;

export interface RpcAdminCreateKnowledgeArticleDraftV2Payload {
  p_title: string;
  p_slug: string;
  p_summary?: string | null;
  p_body_md?: string;
  p_category_id?: Uuid | null;
  p_visibility?: KnowledgeVisibility;
  p_knowledge_space_id: Uuid;
  p_tenant_id?: Uuid | null;
  p_source_path?: string | null;
  p_source_hash?: string | null;
}

export type RpcAdminCreateKnowledgeArticleDraftV2Response =
  AdminKnowledgeArticleRecordRow;

export interface RpcAdminUpdateKnowledgeArticleDraftV2Payload {
  p_article_id: Uuid;
  p_knowledge_space_id: Uuid;
  p_title: string;
  p_slug: string;
  p_summary?: string | null;
  p_body_md?: string;
  p_category_id?: Uuid | null;
  p_visibility?: KnowledgeVisibility;
  p_source_path?: string | null;
  p_source_hash?: string | null;
}

export type RpcAdminUpdateKnowledgeArticleDraftV2Response =
  AdminKnowledgeArticleRecordRow;

export interface RpcAdminArticleSpaceActionV2Payload {
  p_article_id: Uuid;
  p_knowledge_space_id: Uuid;
}

export type RpcAdminSubmitKnowledgeArticleForReviewV2Response =
  AdminKnowledgeArticleRecordRow;
export type RpcAdminPublishKnowledgeArticleV2Response =
  AdminKnowledgeArticleRecordRow;
export type RpcAdminArchiveKnowledgeArticleV2Response =
  AdminKnowledgeArticleRecordRow;

export type RpcAdminBeginKnowledgeArticleEditorialRevisionV2Response =
  AdminKnowledgeArticleEditorialDraftRow;

export interface RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Payload {
  p_article_id: Uuid;
  p_knowledge_space_id: Uuid;
  p_title: string;
  p_slug: string;
  p_summary?: string | null;
  p_body_md?: string;
  p_category_id?: Uuid | null;
  p_visibility?: KnowledgeVisibility;
  p_source_path?: string | null;
  p_source_hash?: string | null;
}

export type RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Response =
  AdminKnowledgeArticleEditorialDraftRow;

export type RpcAdminPublishKnowledgeArticleEditorialRevisionV2Response =
  AdminKnowledgeArticleRecordRow;

export type RpcAdminDiscardKnowledgeArticleEditorialRevisionV2Response =
  AdminKnowledgeArticleEditorialDraftRow;

export interface RpcAdminUpdateKnowledgeArticleReviewStatusPayload {
  p_article_id: Uuid;
  p_review_status: KnowledgeArticleReviewStatus;
  p_human_confirmations?: KnowledgeReviewHumanConfirmations | null;
  p_review_notes?: string | null;
}

export type RpcAdminUpdateKnowledgeArticleReviewStatusResponse =
  AdminKnowledgeArticleReviewAdvisoryRecordRow;

export interface RpcAdminMarkKnowledgeArticleReviewedPayload {
  p_article_id: Uuid;
  p_human_confirmations?: KnowledgeReviewHumanConfirmations | null;
  p_review_notes?: string | null;
}

export type RpcAdminMarkKnowledgeArticleReviewedResponse =
  AdminKnowledgeArticleReviewAdvisoryRecordRow;
