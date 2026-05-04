import { toAppError } from '../../app/errors';
import { requireSupabaseBrowserClient } from '../../app/supabase-browser';
import type {
  RpcAddInternalTicketNotePayload,
  RpcAddInternalTicketNoteResponse,
  RpcAddTicketMessagePayload,
  RpcAddTicketMessageResponse,
  RpcAssignTicketPayload,
  RpcAssignTicketResponse,
  RpcCloseTicketPayload,
  RpcCloseTicketResponse,
  RpcCreateTicketPayload,
  RpcCreateTicketResponse,
  RpcReopenTicketPayload,
  RpcReopenTicketResponse,
  RpcUpdateTicketStatusPayload,
  RpcUpdateTicketStatusResponse,
  SupportCustomer360,
  SupportTicketDetail,
  SupportTicketQueueItem,
  SupportTicketTimelineItem,
  TicketPriority,
  TicketSeverity,
  TicketStatus,
  Uuid,
  JsonObject,
} from '../../contracts/support-contracts';

function requireClient() {
  return requireSupabaseBrowserClient();
}

function mapPermissionFlags(row: Record<string, unknown>) {
  return {
    canViewInternal: Boolean(row.can_view_internal),
    canAddMessage: Boolean(row.can_add_message),
    canUpdateStatus: Boolean(row.can_update_status),
    canAddInternalNote: Boolean(row.can_add_internal_note),
    canAssign: Boolean(row.can_assign),
    canClose: Boolean(row.can_close),
    canReopen: Boolean(row.can_reopen),
  };
}

function mapQueueItem(row: Record<string, unknown>): SupportTicketQueueItem {
  return {
    ...mapPermissionFlags(row),
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantSlug: String(row.tenant_slug),
    tenantDisplayName: (row.tenant_display_name as string | null) ?? null,
    tenantLegalName: (row.tenant_legal_name as string | null) ?? null,
    requesterContactId: (row.requester_contact_id as string | null) ?? null,
    requesterContactFullName: (row.requester_contact_full_name as string | null) ?? null,
    requesterContactEmail: (row.requester_contact_email as string | null) ?? null,
    title: String(row.title),
    source: row.source as SupportTicketQueueItem['source'],
    status: row.status as SupportTicketQueueItem['status'],
    priority: row.priority as SupportTicketQueueItem['priority'],
    severity: row.severity as SupportTicketQueueItem['severity'],
    createdByUserId: String(row.created_by_user_id),
    createdByFullName: (row.created_by_full_name as string | null) ?? null,
    assignedToUserId: (row.assigned_to_user_id as string | null) ?? null,
    assignedToFullName: (row.assigned_to_full_name as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: (row.resolved_at as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    customerMessageCount: Number(row.customer_message_count ?? 0),
    internalMessageCount: Number(row.internal_message_count ?? 0),
    isUnassigned: Boolean(row.is_unassigned),
    isWaitingCustomer: Boolean(row.is_waiting_customer),
    isWaitingSupport: Boolean(row.is_waiting_support),
    isWaitingEngineering: Boolean(row.is_waiting_engineering),
  };
}

function mapTicketDetail(row: Record<string, unknown>): SupportTicketDetail {
  return {
    ...mapPermissionFlags(row),
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantSlug: String(row.tenant_slug),
    tenantDisplayName: (row.tenant_display_name as string | null) ?? null,
    tenantLegalName: (row.tenant_legal_name as string | null) ?? null,
    tenantStatus: String(row.tenant_status),
    requesterContactId: (row.requester_contact_id as string | null) ?? null,
    requesterContactFullName: (row.requester_contact_full_name as string | null) ?? null,
    requesterContactEmail: (row.requester_contact_email as string | null) ?? null,
    title: String(row.title),
    description: String(row.description),
    source: row.source as SupportTicketDetail['source'],
    status: row.status as SupportTicketDetail['status'],
    priority: row.priority as SupportTicketDetail['priority'],
    severity: row.severity as SupportTicketDetail['severity'],
    closeReason: (row.close_reason as string | null) ?? null,
    createdByUserId: String(row.created_by_user_id),
    createdByFullName: (row.created_by_full_name as string | null) ?? null,
    assignedToUserId: (row.assigned_to_user_id as string | null) ?? null,
    assignedToFullName: (row.assigned_to_full_name as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: (row.resolved_at as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    lastMessageAt: (row.last_message_at as string | null) ?? null,
    customerMessageCount: Number(row.customer_message_count ?? 0),
    internalMessageCount: Number(row.internal_message_count ?? 0),
    customerAttachmentCount: Number(row.customer_attachment_count ?? 0),
    internalAttachmentCount: Number(row.internal_attachment_count ?? 0),
  };
}

function mapTimelineItem(row: Record<string, unknown>): SupportTicketTimelineItem {
  const base = {
    ticketId: String(row.ticket_id),
    tenantId: String(row.tenant_id),
    tenantSlug: String(row.tenant_slug),
    tenantDisplayName: (row.tenant_display_name as string | null) ?? null,
    timelineEntryId: String(row.timeline_entry_id),
    entryType: row.entry_type as SupportTicketTimelineItem['entryType'],
    visibility: row.visibility as SupportTicketTimelineItem['visibility'],
    occurredAt: String(row.occurred_at),
    actorUserId: (row.actor_user_id as string | null) ?? null,
    actorFullName: (row.actor_full_name as string | null) ?? null,
    actorEmail: (row.actor_email as string | null) ?? null,
    messageId: (row.message_id as string | null) ?? null,
    eventId: (row.event_id as string | null) ?? null,
    eventType: (row.event_type as SupportTicketTimelineItem['eventType']) ?? null,
    assignmentId: (row.assignment_id as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as JsonObject)
        : ({} as JsonObject),
  };

  return base as SupportTicketTimelineItem;
}

function mapCustomerContact(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    isPrimary: Boolean(row.is_primary),
    linkedUserId: (row.linked_user_id as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapRecentTicket(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as SupportCustomer360['recentTickets'][number]['status'],
    priority: row.priority as SupportCustomer360['recentTickets'][number]['priority'],
    severity: row.severity as SupportCustomer360['recentTickets'][number]['severity'],
    assignedToUserId: (row.assigned_to_user_id as string | null) ?? null,
    assignedToFullName: (row.assigned_to_full_name as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

function mapRecentEvent(row: Record<string, unknown>) {
  return {
    ticketId: String(row.ticket_id),
    ticketTitle: String(row.ticket_title),
    eventType: row.event_type as SupportCustomer360['recentEvents'][number]['eventType'],
    visibility: row.visibility as SupportCustomer360['recentEvents'][number]['visibility'],
    occurredAt: String(row.occurred_at),
    actorUserId: (row.actor_user_id as string | null) ?? null,
  };
}

function mapCustomer360(row: Record<string, unknown>): SupportCustomer360 {
  const activeContacts = Array.isArray(row.active_contacts)
    ? row.active_contacts.map((item) => mapCustomerContact(item as Record<string, unknown>))
    : [];
  const recentTickets = Array.isArray(row.recent_tickets)
    ? row.recent_tickets.map((item) => mapRecentTicket(item as Record<string, unknown>))
    : [];
  const recentEvents = Array.isArray(row.recent_events)
    ? row.recent_events.map((item) => mapRecentEvent(item as Record<string, unknown>))
    : [];

  return {
    tenantId: String(row.tenant_id),
    tenantSlug: String(row.tenant_slug),
    tenantDisplayName: (row.tenant_display_name as string | null) ?? null,
    tenantLegalName: (row.tenant_legal_name as string | null) ?? null,
    tenantStatus: String(row.tenant_status),
    tenantCreatedAt: String(row.tenant_created_at),
    tenantUpdatedAt: String(row.tenant_updated_at),
    activeContactsCount: Number(row.active_contacts_count ?? 0),
    totalTicketCount: Number(row.total_ticket_count ?? 0),
    openTicketCount: Number(row.open_ticket_count ?? 0),
    ticketStatusCounts:
      row.ticket_status_counts && typeof row.ticket_status_counts === 'object'
        ? (row.ticket_status_counts as JsonObject)
        : ({} as JsonObject),
    activeContacts,
    recentTickets,
    recentEvents,
  };
}

interface ListSupportTicketsQueueOptions {
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  severity?: TicketSeverity | 'all';
  tenantId?: Uuid | 'all';
  assignedToUserId?: Uuid | 'all' | 'unassigned';
}

export async function listSupportTicketsQueue(
  options: ListSupportTicketsQueueOptions = {},
) {
  const client = requireClient();
  let query = client
    .from('vw_support_tickets_queue')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.priority && options.priority !== 'all') {
    query = query.eq('priority', options.priority);
  }

  if (options.severity && options.severity !== 'all') {
    query = query.eq('severity', options.severity);
  }

  if (options.tenantId && options.tenantId !== 'all') {
    query = query.eq('tenant_id', options.tenantId);
  }

  if (options.assignedToUserId === 'unassigned') {
    query = query.is('assigned_to_user_id', null);
  } else if (options.assignedToUserId && options.assignedToUserId !== 'all') {
    query = query.eq('assigned_to_user_id', options.assignedToUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw toAppError(error, 'Falha ao carregar a fila oficial do Support Workspace.');
  }

  return (data ?? []).map((row) => mapQueueItem(row as Record<string, unknown>));
}

export async function getSupportTicketDetail(ticketId: Uuid) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_support_ticket_detail')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o detalhe do ticket.');
  }

  return data ? mapTicketDetail(data as Record<string, unknown>) : null;
}

export async function listSupportTicketTimeline(ticketId: Uuid) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_support_ticket_timeline')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('occurred_at', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar a timeline do ticket.');
  }

  return (data ?? []).map((row) => mapTimelineItem(row as Record<string, unknown>));
}

export async function listSupportCustomers360() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_support_customer_360')
    .select('*')
    .order('tenant_display_name', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar a visao 360 dos clientes.');
  }

  return (data ?? []).map((row) => mapCustomer360(row as Record<string, unknown>));
}

export async function getSupportCustomer360(tenantId: Uuid) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_support_customer_360')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o customer 360 do tenant.');
  }

  return data ? mapCustomer360(data as Record<string, unknown>) : null;
}

export async function createTicket(payload: RpcCreateTicketPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_create_ticket', {
    p_tenant_id: payload.tenantId,
    p_title: payload.title,
    p_description: payload.description,
    p_source: payload.source,
    p_priority: payload.priority,
    p_severity: payload.severity,
    p_requester_contact_id: payload.requesterContactId ?? null,
  });

  if (error) {
    throw toAppError(error, 'Falha ao criar ticket.');
  }

  return data as RpcCreateTicketResponse;
}

export async function updateTicketStatus(payload: RpcUpdateTicketStatusPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_update_ticket_status', {
    p_ticket_id: payload.ticketId,
    p_status: payload.status,
    p_note: payload.note ?? null,
  });

  if (error) {
    throw toAppError(error, 'Falha ao alterar o status do ticket.');
  }

  return data as RpcUpdateTicketStatusResponse;
}

export async function assignTicket(payload: RpcAssignTicketPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_assign_ticket', {
    p_ticket_id: payload.ticketId,
    p_assigned_to_user_id: payload.assignedToUserId ?? null,
  });

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o responsavel do ticket.');
  }

  return data as RpcAssignTicketResponse;
}

export async function addTicketMessage(payload: RpcAddTicketMessagePayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_add_ticket_message', {
    p_ticket_id: payload.ticketId,
    p_body: payload.body,
  });

  if (error) {
    throw toAppError(error, 'Falha ao adicionar a resposta publica do ticket.');
  }

  return data as RpcAddTicketMessageResponse;
}

export async function addInternalTicketNote(
  payload: RpcAddInternalTicketNotePayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_add_internal_ticket_note', {
    p_ticket_id: payload.ticketId,
    p_body: payload.body,
  });

  if (error) {
    throw toAppError(error, 'Falha ao adicionar a nota interna do ticket.');
  }

  return data as RpcAddInternalTicketNoteResponse;
}

export async function closeTicket(payload: RpcCloseTicketPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_close_ticket', {
    p_ticket_id: payload.ticketId,
    p_close_reason: payload.closeReason,
  });

  if (error) {
    throw toAppError(error, 'Falha ao fechar o ticket.');
  }

  return data as RpcCloseTicketResponse;
}

export async function reopenTicket(payload: RpcReopenTicketPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_reopen_ticket', {
    p_ticket_id: payload.ticketId,
    p_reopen_reason: payload.reopenReason ?? null,
  });

  if (error) {
    throw toAppError(error, 'Falha ao reabrir o ticket.');
  }

  return data as RpcReopenTicketResponse;
}
