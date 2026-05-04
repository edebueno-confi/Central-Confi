export type Uuid = string;
export type IsoTimestamp = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export const TICKET_STATUSES = [
  'new',
  'triage',
  'waiting_customer',
  'waiting_support',
  'waiting_engineering',
  'in_progress',
  'resolved',
  'closed',
  'cancelled',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TicketSeverity = (typeof TICKET_SEVERITIES)[number];

export const TICKET_SOURCES = [
  'portal',
  'email',
  'chat',
  'phone',
  'api',
  'internal',
] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const TICKET_MESSAGE_VISIBILITIES = ['internal', 'customer'] as const;
export type TicketMessageVisibility = (typeof TICKET_MESSAGE_VISIBILITIES)[number];

export const TICKET_EVENT_TYPES = [
  'ticket_created',
  'status_changed',
  'priority_changed',
  'assigned',
  'unassigned',
  'message_added',
  'internal_note_added',
  'attachment_added',
  'escalated_to_engineering',
  'linked_to_work_item',
  'resolved',
  'closed',
  'reopened',
  'cancelled',
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_TIMELINE_ENTRY_TYPES = ['message', 'event'] as const;
export type TicketTimelineEntryType = (typeof TICKET_TIMELINE_ENTRY_TYPES)[number];

export type TicketStatusUpdateTarget = Exclude<TicketStatus, 'closed'>;

export interface TicketRecord {
  id: Uuid;
  tenantId: Uuid;
  requesterContactId: Uuid | null;
  title: string;
  description: string;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  closeReason: string | null;
  createdByUserId: Uuid;
  assignedToUserId: Uuid | null;
  resolvedAt: IsoTimestamp | null;
  closedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  updatedByUserId: Uuid | null;
}

export interface TicketMessageRecord {
  id: Uuid;
  tenantId: Uuid;
  ticketId: Uuid;
  visibility: TicketMessageVisibility;
  body: string;
  createdByUserId: Uuid;
  metadata: JsonObject;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface TicketViewPermissionFlags {
  canViewInternal: boolean;
  canAddMessage: boolean;
  canUpdateStatus: boolean;
  canAddInternalNote: boolean;
  canAssign: boolean;
  canClose: boolean;
  canReopen: boolean;
}

export interface TicketListItem extends TicketViewPermissionFlags {
  id: Uuid;
  tenantId: Uuid;
  requesterContactId: Uuid | null;
  title: string;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  createdByUserId: Uuid;
  createdByFullName: string | null;
  assignedToUserId: Uuid | null;
  assignedToFullName: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  resolvedAt: IsoTimestamp | null;
  closedAt: IsoTimestamp | null;
  lastMessageAt: IsoTimestamp | null;
  customerMessageCount: number;
  internalMessageCount: number;
}

export interface TicketDetail extends TicketViewPermissionFlags {
  id: Uuid;
  tenantId: Uuid;
  requesterContactId: Uuid | null;
  requesterContactFullName: string | null;
  requesterContactEmail: string | null;
  title: string;
  description: string;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  closeReason: string | null;
  createdByUserId: Uuid;
  createdByFullName: string | null;
  assignedToUserId: Uuid | null;
  assignedToFullName: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  resolvedAt: IsoTimestamp | null;
  closedAt: IsoTimestamp | null;
  lastMessageAt: IsoTimestamp | null;
  customerMessageCount: number;
  internalMessageCount: number;
  customerAttachmentCount: number;
  internalAttachmentCount: number;
}

export interface TicketTimelineMessageItem {
  ticketId: Uuid;
  tenantId: Uuid;
  timelineEntryId: Uuid;
  entryType: 'message';
  visibility: TicketMessageVisibility;
  occurredAt: IsoTimestamp;
  actorUserId: Uuid | null;
  messageId: Uuid;
  eventId: null;
  eventType: null;
  assignmentId: null;
  body: string;
  metadata: JsonObject;
}

export interface TicketTimelineEventItem {
  ticketId: Uuid;
  tenantId: Uuid;
  timelineEntryId: Uuid;
  entryType: 'event';
  visibility: TicketMessageVisibility;
  occurredAt: IsoTimestamp;
  actorUserId: Uuid | null;
  messageId: Uuid | null;
  eventId: Uuid;
  eventType: TicketEventType;
  assignmentId: Uuid | null;
  body: null;
  metadata: JsonObject;
}

export type TicketTimelineItem = TicketTimelineMessageItem | TicketTimelineEventItem;

export interface SupportTicketQueueItem extends TicketViewPermissionFlags {
  id: Uuid;
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  tenantLegalName: string | null;
  requesterContactId: Uuid | null;
  requesterContactFullName: string | null;
  requesterContactEmail: string | null;
  title: string;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  createdByUserId: Uuid;
  createdByFullName: string | null;
  assignedToUserId: Uuid | null;
  assignedToFullName: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  resolvedAt: IsoTimestamp | null;
  closedAt: IsoTimestamp | null;
  lastMessageAt: IsoTimestamp | null;
  customerMessageCount: number;
  internalMessageCount: number;
  isUnassigned: boolean;
  isWaitingCustomer: boolean;
  isWaitingSupport: boolean;
  isWaitingEngineering: boolean;
}

export interface SupportTicketDetail extends TicketViewPermissionFlags {
  id: Uuid;
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  tenantLegalName: string | null;
  tenantStatus: string;
  requesterContactId: Uuid | null;
  requesterContactFullName: string | null;
  requesterContactEmail: string | null;
  title: string;
  description: string;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  closeReason: string | null;
  createdByUserId: Uuid;
  createdByFullName: string | null;
  assignedToUserId: Uuid | null;
  assignedToFullName: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  resolvedAt: IsoTimestamp | null;
  closedAt: IsoTimestamp | null;
  lastMessageAt: IsoTimestamp | null;
  customerMessageCount: number;
  internalMessageCount: number;
  customerAttachmentCount: number;
  internalAttachmentCount: number;
}

export interface SupportTicketTimelineMessageItem {
  ticketId: Uuid;
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  timelineEntryId: Uuid;
  entryType: 'message';
  visibility: TicketMessageVisibility;
  occurredAt: IsoTimestamp;
  actorUserId: Uuid | null;
  actorFullName: string | null;
  actorEmail: string | null;
  messageId: Uuid;
  eventId: null;
  eventType: null;
  assignmentId: null;
  body: string;
  metadata: JsonObject;
}

export interface SupportTicketTimelineEventItem {
  ticketId: Uuid;
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  timelineEntryId: Uuid;
  entryType: 'event';
  visibility: TicketMessageVisibility;
  occurredAt: IsoTimestamp;
  actorUserId: Uuid | null;
  actorFullName: string | null;
  actorEmail: string | null;
  messageId: Uuid | null;
  eventId: Uuid;
  eventType: TicketEventType;
  assignmentId: Uuid | null;
  body: null;
  metadata: JsonObject;
}

export type SupportTicketTimelineItem =
  | SupportTicketTimelineMessageItem
  | SupportTicketTimelineEventItem;

export interface SupportCustomer360Contact {
  id: Uuid;
  fullName: string;
  email: string;
  isPrimary: boolean;
  linkedUserId: Uuid | null;
  createdAt: IsoTimestamp;
}

export interface SupportCustomer360RecentTicket {
  id: Uuid;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  assignedToUserId: Uuid | null;
  assignedToFullName: string | null;
  updatedAt: IsoTimestamp;
}

export interface SupportCustomer360RecentEvent {
  ticketId: Uuid;
  ticketTitle: string;
  eventType: TicketEventType;
  visibility: TicketMessageVisibility;
  occurredAt: IsoTimestamp;
  actorUserId: Uuid | null;
}

export interface SupportCustomer360 {
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  tenantLegalName: string | null;
  tenantStatus: string;
  tenantCreatedAt: IsoTimestamp;
  tenantUpdatedAt: IsoTimestamp;
  activeContactsCount: number;
  totalTicketCount: number;
  openTicketCount: number;
  ticketStatusCounts: JsonObject;
  activeContacts: SupportCustomer360Contact[];
  recentTickets: SupportCustomer360RecentTicket[];
  recentEvents: SupportCustomer360RecentEvent[];
}

export interface SupportRecentWindowMeta {
  totalAvailableCount: number;
  recentLimit: number;
  hasMore: boolean;
}

export interface SupportTicketTimelineRecentWindow extends SupportRecentWindowMeta {
  entries: SupportTicketTimelineItem[];
}

export interface SupportCustomerRecentTicketsWindow extends SupportRecentWindowMeta {
  tickets: SupportCustomer360RecentTicket[];
}

export interface SupportCustomerRecentEventsWindow extends SupportRecentWindowMeta {
  events: SupportCustomer360RecentEvent[];
}

export interface SupportAssignableAgent {
  userId: Uuid;
  fullName: string;
  email: string;
  tenantId: Uuid;
  tenantName: string;
  role: 'platform_admin' | 'support_agent' | 'support_manager';
  membershipStatus: 'active';
  isActive: boolean;
}

export type CustomerProductLine =
  | 'genius_returns'
  | 'after_sale'
  | 'hybrid'
  | 'other';

export type CustomerOperationalStatus =
  | 'onboarding'
  | 'active'
  | 'limited'
  | 'suspended'
  | 'legacy';

export type CustomerIntegrationType =
  | 'ecommerce_platform'
  | 'erp'
  | 'oms'
  | 'logistics_provider'
  | 'carrier'
  | 'gateway'
  | 'refund_provider'
  | 'custom_api'
  | 'other';

export type CustomerIntegrationStatus =
  | 'planned'
  | 'active'
  | 'degraded'
  | 'disabled'
  | 'deprecated';

export type CustomerIntegrationEnvironment =
  | 'production'
  | 'sandbox'
  | 'staging'
  | 'other';

export type CustomerCustomizationRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CustomerAlertSeverity = 'info' | 'warning' | 'high' | 'critical';

export interface SupportCustomerAccountIntegration {
  id: Uuid;
  integrationType: CustomerIntegrationType;
  provider: string;
  status: CustomerIntegrationStatus;
  environment: CustomerIntegrationEnvironment;
  notes: string | null;
}

export interface SupportCustomerAccountFeature {
  featureKey: string;
  enabled: boolean;
  source: string;
  notes: string | null;
}

export interface SupportCustomerAccountCustomization {
  id: Uuid;
  title: string;
  description: string;
  riskLevel: CustomerCustomizationRiskLevel;
  operationalNote: string | null;
  status: string;
}

export interface SupportCustomerAccountAlert {
  id: Uuid;
  severity: CustomerAlertSeverity;
  title: string;
  description: string;
  expiresAt: IsoTimestamp | null;
}

export interface SupportCustomerAccountContext {
  tenantId: Uuid;
  tenantSlug: string;
  tenantDisplayName: string | null;
  tenantLegalName: string | null;
  tenantStatus: string;
  profileId: Uuid | null;
  productLine: CustomerProductLine | null;
  operationalStatus: CustomerOperationalStatus | null;
  accountTier: string | null;
  internalNotes: string | null;
  operationalFlags: JsonObject;
  activeContactsCount: number;
  totalTicketCount: number;
  openTicketCount: number;
  ticketStatusCounts: JsonObject;
  activeContacts: SupportCustomer360Contact[];
  integrations: SupportCustomerAccountIntegration[];
  enabledFeatures: SupportCustomerAccountFeature[];
  activeCustomizations: SupportCustomerAccountCustomization[];
  activeAlerts: SupportCustomerAccountAlert[];
}

export interface RpcCreateTicketPayload {
  tenantId: Uuid;
  title: string;
  description: string;
  source: TicketSource;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  requesterContactId?: Uuid | null;
}
export type RpcCreateTicketResponse = TicketRecord;

export interface RpcUpdateTicketStatusPayload {
  ticketId: Uuid;
  status: TicketStatusUpdateTarget;
  note?: string | null;
}
export type RpcUpdateTicketStatusResponse = TicketRecord;

export interface RpcAssignTicketPayload {
  ticketId: Uuid;
  assignedToUserId?: Uuid | null;
}
export type RpcAssignTicketResponse = TicketRecord;

export interface RpcAddTicketMessagePayload {
  ticketId: Uuid;
  body: string;
}
export type RpcAddTicketMessageResponse = TicketMessageRecord;

export interface RpcAddInternalTicketNotePayload {
  ticketId: Uuid;
  body: string;
}
export type RpcAddInternalTicketNoteResponse = TicketMessageRecord;

export interface RpcCloseTicketPayload {
  ticketId: Uuid;
  closeReason: string;
}
export type RpcCloseTicketResponse = TicketRecord;

export interface RpcReopenTicketPayload {
  ticketId: Uuid;
  reopenReason?: string | null;
}
export type RpcReopenTicketResponse = TicketRecord;
