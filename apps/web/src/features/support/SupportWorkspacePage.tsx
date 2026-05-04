import {
  type FormEvent,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  formatDateTime,
  humanizeToken,
  stringifyJsonPreview,
} from '../../app/format';
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
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
  TextareaInput,
  cx,
} from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';
import { classifyAdminError } from '../admin/admin-errors';
import {
  addInternalTicketNote,
  addTicketMessage,
  assignTicket,
  closeTicket,
  getSupportCustomer360,
  getSupportCustomerRecentEvents,
  getSupportCustomerRecentTickets,
  getSupportTicketDetail,
  getSupportTicketTimelineRecent,
  listSupportAssignableAgents,
  listSupportCustomers360,
  listSupportTicketsQueue,
  reopenTicket,
  updateTicketStatus,
} from './support-api';
import {
  TICKET_PRIORITIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type SupportAssignableAgent,
  type SupportCustomer360,
  type SupportCustomer360Contact,
  type SupportCustomerRecentEventsWindow,
  type SupportCustomerRecentTicketsWindow,
  type SupportCustomer360RecentEvent,
  type SupportCustomer360RecentTicket,
  type SupportTicketDetail,
  type SupportTicketQueueItem,
  type SupportTicketTimelineItem,
  type SupportTicketTimelineRecentWindow,
  type TicketPriority,
  type TicketSeverity,
  type TicketStatus,
  type TicketStatusUpdateTarget,
  type Uuid,
} from '../../contracts/support-contracts';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type AgentsPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type WorkspaceVariant = 'queue' | 'tickets';
type ComposerMode = 'public' | 'internal';

interface QueueFilters {
  status: TicketStatus | 'all';
  priority: TicketPriority | 'all';
  severity: TicketSeverity | 'all';
  tenantId: Uuid | 'all';
  assignedToUserId: Uuid | 'all' | 'unassigned';
}

function toneForTicketStatus(status: TicketStatus) {
  if (status === 'resolved' || status === 'closed') {
    return 'positive' as const;
  }

  if (status === 'cancelled') {
    return 'critical' as const;
  }

  if (status === 'waiting_customer' || status === 'waiting_engineering') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function toneForPriority(priority: TicketPriority) {
  if (priority === 'urgent') {
    return 'critical' as const;
  }

  if (priority === 'high') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function toneForSeverity(severity: TicketSeverity) {
  if (severity === 'critical') {
    return 'critical' as const;
  }

  if (severity === 'high') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function toneForTimelineEntry(entry: SupportTicketTimelineItem) {
  if (entry.visibility === 'internal') {
    return {
      card: 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)]/65',
      rail: 'bg-[color:var(--color-danger-ink)]',
    };
  }

  if (entry.entryType === 'message') {
    return {
      card: 'border-[rgba(48,127,226,0.2)] bg-[rgba(48,127,226,0.08)]',
      rail: 'bg-[color:var(--color-brand-blue)]',
    };
  }

  return {
    card: 'border-[color:var(--color-border)] bg-[color:var(--color-surface)]',
    rail: 'bg-[color:var(--color-brand-navy)]',
  };
}

function humanizeVisibility(value: string) {
  return value === 'internal' ? 'Nota interna' : 'Resposta publica';
}

function humanizeStatus(status: TicketStatus) {
  return humanizeToken(status).replaceAll('_', ' ');
}

function humanizeSupportRole(role: SupportAssignableAgent['role']) {
  if (role === 'platform_admin') {
    return 'Platform admin';
  }

  if (role === 'support_manager') {
    return 'Support manager';
  }

  return 'Support agent';
}

function formatAssignableAgentLabel(agent: SupportAssignableAgent) {
  return `${agent.fullName} · ${humanizeSupportRole(agent.role)} · ${agent.email}`;
}

function ticketTenantLabel(ticket: Pick<SupportTicketQueueItem, 'tenantDisplayName' | 'tenantLegalName' | 'tenantSlug'>) {
  return ticket.tenantDisplayName ?? ticket.tenantLegalName ?? ticket.tenantSlug;
}

function emptyFilters(): QueueFilters {
  return {
    status: 'all',
    priority: 'all',
    severity: 'all',
    tenantId: 'all',
    assignedToUserId: 'all',
  };
}

function emptyTimelineWindow(): SupportTicketTimelineRecentWindow {
  return {
    entries: [],
    totalAvailableCount: 0,
    recentLimit: 25,
    hasMore: false,
  };
}

function emptyCustomerRecentTicketsWindow(): SupportCustomerRecentTicketsWindow {
  return {
    tickets: [],
    totalAvailableCount: 0,
    recentLimit: 6,
    hasMore: false,
  };
}

function emptyCustomerRecentEventsWindow(): SupportCustomerRecentEventsWindow {
  return {
    events: [],
    totalAvailableCount: 0,
    recentLimit: 8,
    hasMore: false,
  };
}

function buildStatusChoices(currentStatus: TicketStatus) {
  return TICKET_STATUSES.filter(
    (status): status is TicketStatusUpdateTarget =>
      status !== 'closed' && status !== currentStatus,
  );
}

function summarizeTimelineEvent(entry: SupportTicketTimelineItem) {
  if (entry.entryType === 'message') {
    return entry.body ?? '';
  }

  const note =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? Object.entries(entry.metadata)
          .map(([key, value]) => `${humanizeToken(key)}: ${String(value)}`)
          .join(' · ')
      : '';

  return note || humanizeToken(entry.eventType ?? 'evento');
}

function TimelineEntry({
  entry,
}: {
  entry: SupportTicketTimelineItem;
}) {
  const tones = toneForTimelineEntry(entry);
  const summary = summarizeTimelineEvent(entry);
  const entryLabel =
    entry.entryType === 'message'
      ? humanizeVisibility(entry.visibility)
      : `${humanizeVisibility(entry.visibility)} · ${humanizeToken(entry.eventType ?? 'evento')}`;

  return (
    <article
      className={cx(
        'rounded-[20px] border p-4 shadow-[0_10px_22px_rgba(19,33,79,0.06)]',
        tones.card,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx('mt-1 h-12 w-1 shrink-0 rounded-full', tones.rail)} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                {entryLabel}
              </p>
              <p className="font-medium text-[color:var(--color-ink)]">
                {entry.actorFullName ?? entry.actorEmail ?? 'Ator nao resolvido'}
              </p>
            </div>
            <p className="text-xs text-[color:var(--color-muted)]">
              {formatDateTime(entry.occurredAt)}
            </p>
          </div>

          <div className="text-sm leading-6 text-[color:var(--color-ink)]">
            {entry.entryType === 'message' ? (
              <p className="whitespace-pre-wrap">{summary}</p>
            ) : (
              <div className="space-y-1">
                <p className="whitespace-pre-wrap">{summary}</p>
                {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                  <p className="text-xs text-[color:var(--color-muted)]">
                    {stringifyJsonPreview(entry.metadata)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SupportTimeline({
  window,
}: {
  window: SupportTicketTimelineRecentWindow;
}) {
  const entries = window.entries;

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Timeline vazia"
        description="Este ticket ainda nao recebeu mensagens, notas internas nem eventos adicionais."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
        Mostrando {entries.length} de {window.totalAvailableCount} registros recentes.
        {window.hasMore ? ' O historico completo fica fora da primeira carga operacional desta tela.' : ''}
      </div>
      {entries.map((entry) => (
        <TimelineEntry key={entry.timelineEntryId} entry={entry} />
      ))}
    </div>
  );
}

function CompactCounter({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: 'default' | 'warning' | 'critical' | 'positive';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-surface)]/72'
      : tone === 'critical'
        ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)]/72'
        : tone === 'positive'
          ? 'border-[color:var(--color-success-border)] bg-[color:var(--color-success-surface)]/72'
          : 'border-[color:var(--color-border)] bg-white/90';

  return (
    <div className={cx('rounded-[20px] border px-4 py-3', toneClass)}>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
          {value}
        </p>
        {helper ? (
          <p className="max-w-[180px] text-right text-xs leading-5 text-[color:var(--color-muted)]">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TicketMetaLine({
  ticket,
}: {
  ticket: SupportTicketQueueItem;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs leading-5 text-[color:var(--color-muted)]">
      <span>Tenant: {ticketTenantLabel(ticket)}</span>
      <span>Requester: {ticket.requesterContactFullName ?? 'Sem requester'}</span>
      <span>Responsavel: {ticket.assignedToFullName ?? 'Nao atribuido'}</span>
      <span>Ultima atividade: {formatDateTime(ticket.lastMessageAt ?? ticket.updatedAt)}</span>
    </div>
  );
}

function SupportQueueItem({
  ticket,
  isSelected,
  onSelect,
}: {
  ticket: SupportTicketQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={cx(
        'rounded-[22px] border p-4 transition',
        isSelected
          ? 'border-[rgba(48,127,226,0.46)] bg-[rgba(48,127,226,0.08)] shadow-[0_14px_28px_rgba(19,33,79,0.08)]'
          : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.24)] hover:bg-[rgba(255,255,255,0.98)]',
      )}
    >
      <button
        className="block w-full min-w-0 text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={toneForTicketStatus(ticket.status)}>{humanizeStatus(ticket.status)}</StatusPill>
          <StatusPill tone={toneForPriority(ticket.priority)}>{ticket.priority}</StatusPill>
          <StatusPill tone={toneForSeverity(ticket.severity)}>{ticket.severity}</StatusPill>
        </div>

        <div className="mt-3 space-y-2">
          <h3 className="max-w-full text-lg font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {ticket.title}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
            <span>Tenant: {ticketTenantLabel(ticket)}</span>
            <span>Responsavel: {ticket.assignedToFullName ?? 'Nao atribuido'}</span>
            <span>Ultima atividade: {formatDateTime(ticket.lastMessageAt ?? ticket.updatedAt)}</span>
          </div>
        </div>
      </button>
    </article>
  );
}

function SupportSummaryStrip({
  totalOpen,
  waitingCustomer,
  highAttention,
  unassigned,
}: {
  totalOpen: number;
  waitingCustomer: number;
  highAttention: number;
  unassigned: number;
}) {
  const items = [
    { label: 'Abertos', value: totalOpen },
    { label: 'Urgentes', value: highAttention },
    { label: 'Nao atribuidos', value: unassigned },
    { label: 'Aguardando cliente', value: waitingCustomer },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[color:var(--color-border)] bg-white/88 px-3 py-3">
      {items.map((item) => (
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
          key={item.label}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
            {item.label}
          </span>
          <span className="text-sm font-semibold text-[color:var(--color-ink)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function SupportTicketPreview({
  ticket,
  detail,
  customer,
}: {
  ticket: SupportTicketQueueItem | null;
  detail: SupportTicketDetail | null;
  customer: SupportCustomer360 | null;
}) {
  if (!ticket && !detail) {
    return (
      <EmptyState
        title="Nenhum ticket em foco"
        description="Selecione um ticket da fila para abrir a previa operacional."
      />
    );
  }

  const title = detail?.title ?? ticket?.title ?? 'Ticket sem titulo';
  const tenant =
    detail?.tenantDisplayName ??
    detail?.tenantLegalName ??
    detail?.tenantSlug ??
    (ticket ? ticketTenantLabel(ticket) : 'Tenant nao resolvido');
  const assigned =
    detail?.assignedToFullName ?? ticket?.assignedToFullName ?? 'Nao atribuido';
  const lastActivity = formatDateTime(
    detail?.lastMessageAt ?? detail?.updatedAt ?? ticket?.lastMessageAt ?? ticket?.updatedAt ?? null,
  );
  const tenantId = detail?.tenantId ?? ticket?.tenantId ?? null;
  const ticketId = detail?.id ?? ticket?.id ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-brand-navy)] px-5 py-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={toneForTicketStatus(detail?.status ?? ticket?.status ?? 'new')}>
            {humanizeStatus((detail?.status ?? ticket?.status ?? 'new') as TicketStatus)}
          </StatusPill>
          <StatusPill tone={toneForPriority(detail?.priority ?? ticket?.priority ?? 'normal')}>
            {detail?.priority ?? ticket?.priority ?? 'normal'}
          </StatusPill>
          <StatusPill tone={toneForSeverity(detail?.severity ?? ticket?.severity ?? 'low')}>
            {detail?.severity ?? ticket?.severity ?? 'low'}
          </StatusPill>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-[1.45rem] font-semibold tracking-[-0.05em]">{title}</h3>
          <div className="space-y-1 text-sm text-white/72">
            <p>Cliente B2B: {tenant}</p>
            <p>Responsavel: {assigned}</p>
            <p>Ultima atividade: {lastActivity}</p>
          </div>
        </div>

        {ticketId ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[color:var(--color-brand-navy)]"
              to={`/support/tickets/${ticketId}`}
            >
              Atender ticket
            </Link>
            {tenantId ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/22 px-5 py-2 text-sm font-semibold text-white"
                to={`/support/customers/${tenantId}`}
              >
                Ver cliente
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4 text-sm leading-6 text-[color:var(--color-muted)]">
        <p className="font-medium text-[color:var(--color-ink)]">Previa de atendimento</p>
        <p className="mt-2">
          {detail?.description?.trim() ||
            'Abra o ticket para responder, registrar nota interna ou ajustar status e atribuicao.'}
        </p>
        {customer ? (
          <div className="mt-4 border-t border-[color:var(--color-border)] pt-3 text-sm">
            <p>Contato principal: {customer.activeContacts[0]?.fullName ?? 'Nao resolvido'}</p>
            <p>Tickets abertos deste cliente: {customer.openTicketCount}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SupportQueueToolbar({
  filters,
  tenantOptions,
  assigneeOptions,
  onChange,
  onRefresh,
}: {
  filters: QueueFilters;
  tenantOptions: Array<{ id: string; label: string }>;
  assigneeOptions: Array<{ id: string; label: string }>;
  onChange: (next: QueueFilters) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.92)] p-4 shadow-[0_16px_32px_rgba(19,33,79,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            Triagem operacional
          </p>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            Filtros de fila para definir proximo atendimento sem virar dashboard.
          </p>
        </div>
        <GhostButton onClick={onRefresh}>Recarregar</GhostButton>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Status">
          <SelectInput
            onChange={(event) => onChange({ ...filters, status: event.target.value as QueueFilters['status'] })}
            value={filters.status}
          >
            <option value="all">Todos</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanizeStatus(status)}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Prioridade">
          <SelectInput
            onChange={(event) =>
              onChange({ ...filters, priority: event.target.value as QueueFilters['priority'] })
            }
            value={filters.priority}
          >
            <option value="all">Todas</option>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {humanizeToken(priority)}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Severidade">
          <SelectInput
            onChange={(event) =>
              onChange({ ...filters, severity: event.target.value as QueueFilters['severity'] })
            }
            value={filters.severity}
          >
            <option value="all">Todas</option>
            {TICKET_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {humanizeToken(severity)}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Tenant">
          <SelectInput
            onChange={(event) => onChange({ ...filters, tenantId: event.target.value as QueueFilters['tenantId'] })}
            value={filters.tenantId}
          >
            <option value="all">Todos</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Responsavel">
          <SelectInput
            onChange={(event) =>
              onChange({
                ...filters,
                assignedToUserId: event.target.value as QueueFilters['assignedToUserId'],
              })
            }
            value={filters.assignedToUserId}
          >
            <option value="all">Todos</option>
            <option value="unassigned">Nao atribuidos</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
    </div>
  );
}

function SupportCustomerRail({
  customer,
  recentTicketsWindow,
  recentEventsWindow,
  compact = false,
}: {
  customer: SupportCustomer360 | null;
  recentTicketsWindow: SupportCustomerRecentTicketsWindow;
  recentEventsWindow: SupportCustomerRecentEventsWindow;
  compact?: boolean;
}) {
  if (!customer) {
    return (
      <EmptyState
        title="Contexto do cliente indisponivel"
        description="O suporte ainda nao recebeu o tenant operacional deste ticket."
      />
    );
  }

  const contacts = customer.activeContacts.slice(0, compact ? 2 : 4);
  const recentTickets = recentTicketsWindow.tickets.slice(0, compact ? 3 : recentTicketsWindow.tickets.length);
  const recentEvents = recentEventsWindow.events.slice(0, compact ? 2 : recentEventsWindow.events.length);

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill>{customer.tenantStatus}</StatusPill>
          <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
          </h3>
          <p className="text-sm text-[color:var(--color-muted)]">
            {customer.tenantLegalName ?? 'Razao social nao resolvida'}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
          <span>{customer.activeContactsCount} contatos</span>
          <span>{customer.openTicketCount} abertos</span>
          <span>{customer.totalTicketCount} no total</span>
        </div>
      </div>

      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Contatos ativos</h4>
          <Link
            className="text-sm font-medium text-[color:var(--color-brand-blue)]"
            to={`/support/customers/${customer.tenantId}`}
          >
            Abrir contexto completo
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Nenhum contato ativo retornado pelo contrato.
            </p>
          ) : (
            contacts.map((contact) => <SupportContactCard key={contact.id} contact={contact} />)
          )}
        </div>
      </div>

      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Tickets recentes</h4>
        <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
          Mostrando {recentTickets.length} de {recentTicketsWindow.totalAvailableCount} tickets recentes.
        </p>
        <div className="mt-3 space-y-2">
          {recentTickets.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Nenhum ticket recente retornado para este tenant.
            </p>
          ) : (
            recentTickets.map((ticket) => <SupportRecentTicketCard key={ticket.id} ticket={ticket} />)
          )}
        </div>
      </div>

      {compact ? null : (
        <details className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
            Eventos recentes
          </summary>
          <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
            Mostrando {recentEvents.length} de {recentEventsWindow.totalAvailableCount} registros recentes.
          </p>
          <div className="mt-3 space-y-2">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted)]">
                O backend nao retornou eventos recentes para este tenant.
              </p>
            ) : (
              recentEvents.map((event) => (
                <SupportRecentEventCard key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`} event={event} />
              ))
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function SupportContactCard({
  contact,
}: {
  contact: SupportCustomer360Contact;
}) {
  return (
    <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-[color:var(--color-ink)]">{contact.fullName}</p>
        {contact.isPrimary ? <StatusPill tone="accent">principal</StatusPill> : null}
      </div>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">{contact.email}</p>
    </div>
  );
}

function SupportRecentTicketCard({
  ticket,
}: {
  ticket: SupportCustomer360RecentTicket;
}) {
  return (
    <Link
      className="block rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 transition hover:border-[rgba(48,127,226,0.28)] hover:bg-white"
      to={`/support/tickets/${ticket.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={toneForTicketStatus(ticket.status)}>{humanizeStatus(ticket.status)}</StatusPill>
        <StatusPill tone={toneForPriority(ticket.priority)}>{ticket.priority}</StatusPill>
      </div>
      <p className="mt-2 font-medium text-[color:var(--color-ink)]">{ticket.title}</p>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        Atualizado em {formatDateTime(ticket.updatedAt)}
      </p>
    </Link>
  );
}

function SupportRecentEventCard({
  event,
}: {
  event: SupportCustomer360RecentEvent;
}) {
  return (
    <Link
      className="block rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 transition hover:border-[rgba(48,127,226,0.28)] hover:bg-white"
      to={`/support/tickets/${event.ticketId}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={event.visibility === 'internal' ? 'critical' : 'accent'}>{humanizeVisibility(event.visibility)}</StatusPill>
      </div>
      <p className="mt-2 font-medium text-[color:var(--color-ink)]">{event.ticketTitle}</p>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        {humanizeToken(event.eventType)} · {formatDateTime(event.occurredAt)}
      </p>
    </Link>
  );
}

function SupportWorkspaceView({
  variant,
  focusTicketId,
}: {
  variant: WorkspaceVariant;
  focusTicketId?: string | null;
}) {
  const navigate = useNavigate();
  const { user, markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketQueueItem[]>([]);
  const [filters, setFilters] = useState<QueueFilters>(emptyFilters);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(focusTicketId ?? null);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('idle');
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [timelineWindow, setTimelineWindow] = useState<SupportTicketTimelineRecentWindow>(
    emptyTimelineWindow(),
  );
  const [customer, setCustomer] = useState<SupportCustomer360 | null>(null);
  const [customerRecentTickets, setCustomerRecentTickets] =
    useState<SupportCustomerRecentTicketsWindow>(emptyCustomerRecentTicketsWindow());
  const [customerRecentEvents, setCustomerRecentEvents] =
    useState<SupportCustomerRecentEventsWindow>(emptyCustomerRecentEventsWindow());
  const [assignableAgents, setAssignableAgents] = useState<SupportAssignableAgent[]>([]);
  const [agentsPhase, setAgentsPhase] = useState<AgentsPhase>('idle');
  const [agentsMessage, setAgentsMessage] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<TicketStatusUpdateTarget>('triage');
  const [statusNote, setStatusNote] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>('public');
  const [assignDraft, setAssignDraft] = useState('');
  const [detailNotice, setDetailNotice] = useState<string | null>(null);
  const [detailNoticeTone, setDetailNoticeTone] = useState<'default' | 'critical'>('default');
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = useEffectEvent(async (preferredTicketId?: string | null) => {
    try {
      const data = await listSupportTicketsQueue(filters);
      setBackendDenied(false);
      setTickets(data);
      setPhase('ready');
      setPageMessage(null);
      setSelectedTicketId((current) => {
        const nextSelected =
          preferredTicketId ??
          focusTicketId ??
          (data.some((ticket) => ticket.id === current) ? current : null) ??
          data[0]?.id ??
          null;
        return nextSelected;
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar a fila oficial do Support Workspace.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setTickets([]);
      setSelectedTicketId(null);
      setPageMessage(classified.message);
      setPhase(
        classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
      );
    }
  });

  const loadDetail = useEffectEvent(async (ticketId: string) => {
    setDetailPhase('loading');
    setDetailMessage(null);
    setAgentsPhase('loading');
    setAgentsMessage(null);

    try {
      const [detail, timelineRecent] = await Promise.all([
        getSupportTicketDetail(ticketId),
        getSupportTicketTimelineRecent(ticketId),
      ]);

      setBackendDenied(false);

      if (!detail) {
        setTicketDetail(null);
        setTimelineWindow(emptyTimelineWindow());
        setCustomer(null);
        setCustomerRecentTickets(emptyCustomerRecentTicketsWindow());
        setCustomerRecentEvents(emptyCustomerRecentEventsWindow());
        setDetailPhase('error');
        setDetailMessage('O backend nao retornou detalhe para o ticket selecionado.');
        return;
      }

      const [customerRow, recentTicketsWindow, recentEventsWindow] = await Promise.all([
        getSupportCustomer360(detail.tenantId),
        getSupportCustomerRecentTickets(detail.tenantId),
        getSupportCustomerRecentEvents(detail.tenantId),
      ]);
      setTicketDetail(detail);
      setTimelineWindow(timelineRecent);
      setCustomer(customerRow);
      setCustomerRecentTickets(recentTicketsWindow);
      setCustomerRecentEvents(recentEventsWindow);
      setDetailPhase('ready');
      setStatusDraft(buildStatusChoices(detail.status)[0] ?? 'triage');
      setAssignDraft(detail.assignedToUserId ?? '');
      setComposerMode(detail.canAddMessage ? 'public' : detail.canAddInternalNote ? 'internal' : 'public');

      try {
        const agentRows = await listSupportAssignableAgents(detail.tenantId);
        setAssignableAgents(agentRows);
        setAgentsPhase('ready');
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Falha ao carregar o diretorio de agentes atribuiveis.',
        );

        if (classified.kind === 'session-expired') {
          markSessionExpired();
          return;
        }

        setAssignableAgents([]);
        setAgentsMessage(classified.message);
        setAgentsPhase(
          classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
        );
      }
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o contexto do ticket de suporte.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setTicketDetail(null);
      setTimelineWindow(emptyTimelineWindow());
      setCustomer(null);
      setCustomerRecentTickets(emptyCustomerRecentTicketsWindow());
      setCustomerRecentEvents(emptyCustomerRecentEventsWindow());
      setAssignableAgents([]);
      setAgentsPhase('idle');
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
    void loadQueue(focusTicketId ?? null);
  }, []);

  useEffect(() => {
    void loadQueue(focusTicketId ?? null);
  }, [
    filters.assignedToUserId,
    filters.priority,
    filters.severity,
    filters.status,
    filters.tenantId,
    focusTicketId,
  ]);

  useEffect(() => {
    if (!selectedTicketId) {
      setDetailPhase('idle');
      setTicketDetail(null);
      setTimelineWindow(emptyTimelineWindow());
      setCustomer(null);
      setCustomerRecentTickets(emptyCustomerRecentTicketsWindow());
      setCustomerRecentEvents(emptyCustomerRecentEventsWindow());
      setAssignableAgents([]);
      setAgentsPhase('idle');
      setAgentsMessage(null);
      return;
    }

    void loadDetail(selectedTicketId);
  }, [selectedTicketId]);

  useEffect(() => {
    setDetailNotice(null);
  }, [selectedTicketId]);

  const tenantOptions = useMemo(() => {
    const items = new Map<string, { id: string; label: string }>();

    for (const ticket of tickets) {
      if (!items.has(ticket.tenantId)) {
        items.set(ticket.tenantId, {
          id: ticket.tenantId,
          label: ticketTenantLabel(ticket),
        });
      }
    }

    return Array.from(items.values()).sort((left, right) =>
      left.label.localeCompare(right.label, 'pt-BR'),
    );
  }, [tickets]);

  const assigneeOptions = useMemo(() => {
    const items = new Map<string, { id: string; label: string }>();

    for (const ticket of tickets) {
      if (ticket.assignedToUserId && !items.has(ticket.assignedToUserId)) {
        items.set(ticket.assignedToUserId, {
          id: ticket.assignedToUserId,
          label: ticket.assignedToFullName ?? ticket.assignedToUserId,
        });
      }
    }

    return Array.from(items.values()).sort((left, right) =>
      left.label.localeCompare(right.label, 'pt-BR'),
    );
  }, [tickets]);

  const selectedTicketSummary =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  const currentAssignedAgent =
    ticketDetail?.assignedToUserId
      ? assignableAgents.find((agent) => agent.userId === ticketDetail.assignedToUserId) ?? null
      : null;
  const currentUserAssignableAgent =
    user?.id ? assignableAgents.find((agent) => agent.userId === user.id) ?? null : null;
  const totalOpen = tickets.filter(
    (ticket) =>
      ticket.status !== 'resolved' &&
      ticket.status !== 'closed' &&
      ticket.status !== 'cancelled',
  ).length;
  const waitingCustomer = tickets.filter((ticket) => ticket.isWaitingCustomer).length;
  const highAttention = tickets.filter(
    (ticket) => ticket.priority === 'urgent' || ticket.severity === 'critical',
  ).length;
  const unassigned = tickets.filter((ticket) => ticket.isUnassigned).length;

  function handleSelectTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    if (variant === 'tickets') {
      void navigate(`/support/tickets/${ticketId}`);
    }
  }

  function applySuccess(message: string) {
    setDetailNotice(message);
    setDetailNoticeTone('default');
  }

  function applyFailure(message: string) {
    setDetailNotice(message);
    setDetailNoticeTone('critical');
  }

  async function runAssignment(targetUserId: string | null) {
    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await assignTicket({
        ticketId: ticketDetail.id,
        assignedToUserId: targetUserId,
      });
      await refreshDetail(ticketDetail.id);
      applySuccess(targetUserId ? 'Responsavel atualizado com sucesso.' : 'Ticket desatribuido com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao atualizar o responsavel.');
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshDetail(ticketId: string) {
    await Promise.all([loadQueue(ticketId), loadDetail(ticketId)]);
  }

  async function handleUpdateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await updateTicketStatus({
        ticketId: ticketDetail.id,
        status: statusDraft,
        note: statusNote.trim() || null,
      });
      setStatusNote('');
      await refreshDetail(ticketDetail.id);
      applySuccess('Status atualizado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao atualizar o status do ticket.');
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAssignment(assignDraft.trim() || null);
  }

  async function handleSubmitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    const draft = composerMode === 'public' ? messageDraft : noteDraft;
    const body = draft.trim();

    if (body.length === 0) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      if (composerMode === 'public') {
        await addTicketMessage({
          ticketId: ticketDetail.id,
          body,
        });
        setMessageDraft('');
        applySuccess('Resposta publica adicionada com sucesso.');
      } else {
        await addInternalTicketNote({
          ticketId: ticketDetail.id,
          body,
        });
        setNoteDraft('');
        applySuccess('Nota interna adicionada com sucesso.');
      }

      await refreshDetail(ticketDetail.id);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        composerMode === 'public'
          ? 'Falha ao adicionar a resposta publica.'
          : 'Falha ao adicionar a nota interna.',
      );
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await closeTicket({
        ticketId: ticketDetail.id,
        closeReason: closeReason.trim(),
      });
      setCloseReason('');
      await refreshDetail(ticketDetail.id);
      applySuccess('Ticket fechado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao fechar o ticket.');
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await reopenTicket({
        ticketId: ticketDetail.id,
        reopenReason: reopenReason.trim() || null,
      });
      setReopenReason('');
      await refreshDetail(ticketDetail.id);
      applySuccess('Ticket reaberto com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao reabrir o ticket.');
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando fila operacional" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="vw_support_tickets_queue" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={pageMessage ?? 'A fila oficial do Support Workspace nao ficou disponivel.'}
        action={<AppButton onClick={() => void loadQueue(focusTicketId ?? null)}>Tentar novamente</AppButton>}
      />
    );
  }

  const composerDraft = composerMode === 'public' ? messageDraft : noteDraft;
  const composerDisabled =
    submitting ||
    composerDraft.trim().length === 0 ||
    (composerMode === 'public'
      ? !ticketDetail?.canAddMessage
      : !ticketDetail?.canAddInternalNote);

  const canUsePublicComposer = ticketDetail?.canAddMessage ?? false;
  const canUseInternalComposer = ticketDetail?.canAddInternalNote ?? false;
  const selectedQueueTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  const previewTicket = ticketDetail ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title={variant === 'queue' ? 'Fila operacional' : 'Cockpit de tickets'}
        description={
          variant === 'queue'
            ? 'Triagem enxuta para decidir rapidamente qual ticket entra em atendimento.'
            : 'Tratativa do ticket em fluxo continuo: resposta, nota interna, status, timeline e contexto do cliente.'
        }
      />

      {variant === 'queue' ? (
        <div className="space-y-4">
          <SupportQueueToolbar
            assigneeOptions={assigneeOptions}
            filters={filters}
            onChange={setFilters}
            onRefresh={() => void loadQueue(focusTicketId ?? null)}
            tenantOptions={tenantOptions}
          />

          <SupportSummaryStrip
            highAttention={highAttention}
            totalOpen={totalOpen}
            unassigned={unassigned}
            waitingCustomer={waitingCustomer}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.7fr)_minmax(320px,0.3fr)]">
            <Panel
              className="bg-white"
              title="Fila de tickets"
              description="Lista dominante para triagem. Cada item mostra apenas o necessario para decidir o proximo atendimento."
            >
              {tickets.length === 0 ? (
                <EmptyState
                  title="Sem tickets para esta combinacao de filtros"
                  description="A fila oficial nao retornou tickets neste recorte. Ajuste filtros ou reidrate a fixture local."
                />
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <SupportQueueItem
                      isSelected={ticket.id === selectedTicketId}
                      key={ticket.id}
                      onSelect={() => handleSelectTicket(ticket.id)}
                      ticket={ticket}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              className="bg-white xl:sticky xl:top-4"
              title="Ticket selecionado"
              description="Previa curta antes de abrir a tratativa completa."
            >
              {detailPhase === 'loading' ? (
                <LoadingState
                  title="Carregando previa"
                  description="O frontend esta resolvendo detalhe e contexto minimo do ticket selecionado."
                />
              ) : detailPhase === 'contract-unavailable' ? (
                <ContractUnavailableState contractName="vw_support_ticket_detail / vw_support_customer_360" />
              ) : detailPhase === 'error' ? (
                <ErrorState description={detailMessage ?? 'A previa do ticket nao ficou disponivel.'} />
              ) : (
                <SupportTicketPreview customer={customer} detail={previewTicket} ticket={selectedQueueTicket} />
              )}
            </Panel>
          </div>
        </div>
      ) : detailPhase === 'idle' ? (
        <Panel
          className="bg-white"
          title="Nenhum ticket em tratativa"
          description="Abra um ticket pela fila para entrar no fluxo de atendimento."
        >
          <EmptyState
            title="Sem ticket selecionado"
            description="Use a fila operacional para escolher o ticket que sera tratado agora."
          />
        </Panel>
      ) : detailPhase === 'loading' ? (
        <LoadingState
          title="Montando tratativa"
          description="O frontend esta resolvendo detalhe, timeline e contexto do cliente."
        />
      ) : detailPhase === 'contract-unavailable' ? (
        <ContractUnavailableState contractName="vw_support_ticket_detail / vw_support_ticket_timeline_recent / vw_support_customer_360" />
      ) : detailPhase === 'error' || !ticketDetail || !selectedTicketSummary ? (
        <ErrorState
          description={detailMessage ?? 'O painel operacional do ticket nao ficou disponivel.'}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-[22px] border border-[color:var(--color-border)] bg-white px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>{humanizeStatus(ticketDetail.status)}</StatusPill>
              <StatusPill tone={toneForPriority(ticketDetail.priority)}>{ticketDetail.priority}</StatusPill>
              <StatusPill tone={toneForSeverity(ticketDetail.severity)}>{ticketDetail.severity}</StatusPill>
            </div>
            <div className="mt-3 space-y-2">
              <h3 className="text-[1.9rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                {ticketDetail.title}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
                <span>Tenant: {ticketDetail.tenantDisplayName ?? ticketDetail.tenantLegalName ?? ticketDetail.tenantSlug}</span>
                <span>Requester: {ticketDetail.requesterContactFullName ?? 'Sem requester resolvido'}</span>
                <span>
                  Responsavel:{' '}
                  {currentAssignedAgent
                    ? `${currentAssignedAgent.fullName} · ${currentAssignedAgent.email}`
                    : ticketDetail.assignedToFullName ?? 'Nao atribuido'}
                </span>
                <span>Ultima atividade: {formatDateTime(ticketDetail.lastMessageAt ?? ticketDetail.updatedAt)}</span>
              </div>
              {ticketDetail.description?.trim() ? (
                <p className="max-w-4xl text-sm leading-6 text-[color:var(--color-muted)]">
                  {ticketDetail.description}
                </p>
              ) : null}
            </div>
          </div>

          {detailNotice ? <InlineNotice tone={detailNoticeTone}>{detailNotice}</InlineNotice> : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.68fr)_minmax(300px,0.32fr)]">
            <div className="space-y-5">
              <Panel
                className="bg-white"
                title="Resposta e nota interna"
                description="Composer principal da tratativa. A troca entre publico e interno fica explicita e central."
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={cx(
                        'inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition',
                        composerMode === 'public'
                          ? 'border-[rgba(48,127,226,0.28)] bg-[rgba(48,127,226,0.1)] text-[color:var(--color-brand-blue)]'
                          : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-muted)]',
                      )}
                      disabled={!canUsePublicComposer}
                      onClick={() => setComposerMode('public')}
                      type="button"
                    >
                      Resposta publica
                    </button>
                    <button
                      className={cx(
                        'inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition',
                        composerMode === 'internal'
                          ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger-ink)]'
                          : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-muted)]',
                      )}
                      disabled={!canUseInternalComposer}
                      onClick={() => setComposerMode('internal')}
                      type="button"
                    >
                      Nota interna
                    </button>
                  </div>

                  <InlineNotice tone={composerMode === 'public' ? 'default' : 'critical'}>
                    {composerMode === 'public'
                      ? 'A mensagem abaixo sera visivel para o cliente B2B.'
                      : 'A mensagem abaixo fica restrita ao time interno autorizado.'}
                  </InlineNotice>

                  <form className="space-y-4" onSubmit={handleSubmitComposer}>
                    <Field
                      label={composerMode === 'public' ? 'Resposta publica' : 'Nota interna'}
                    >
                      <TextareaInput
                        onChange={(event) =>
                          composerMode === 'public'
                            ? setMessageDraft(event.target.value)
                            : setNoteDraft(event.target.value)
                        }
                        placeholder={
                          composerMode === 'public'
                            ? 'Escreva a devolutiva tecnico-operacional para o cliente.'
                            : 'Registre contexto interno, proximo passo ou handoff.'
                        }
                        value={composerDraft}
                      />
                    </Field>
                    <AppButton
                      className={
                        composerMode === 'internal'
                          ? 'min-h-12 bg-[linear-gradient(135deg,#7c2648,#b63f76)] px-6'
                          : 'min-h-12 px-6'
                      }
                      disabled={composerDisabled}
                      type="submit"
                    >
                      {submitting
                        ? 'Salvando...'
                        : composerMode === 'public'
                          ? 'Enviar resposta publica'
                          : 'Registrar nota interna'}
                    </AppButton>
                  </form>
                </div>
              </Panel>

              <Panel
                className="bg-white"
                title="Timeline operacional"
                description="Leitura cronologica da tratativa com mensagens publicas, notas internas e eventos de sistema."
              >
                <SupportTimeline window={timelineWindow} />
              </Panel>
            </div>

            <aside className="space-y-5">
              <Panel
                className="bg-white xl:sticky xl:top-4"
                title="Rail operacional"
                description="Status, atribuicao e contexto compacto do cliente sem competir com a tratativa."
              >
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                          Responsavel atual
                        </p>
                        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                          {currentAssignedAgent
                            ? `${currentAssignedAgent.fullName} · ${currentAssignedAgent.email}`
                            : ticketDetail.assignedToFullName
                              ? ticketDetail.assignedToFullName
                              : 'Ticket sem agente atribuido no momento.'}
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {agentsPhase === 'contract-unavailable' ? (
                          <InlineNotice tone="critical">
                            {agentsMessage ?? 'A view vw_support_assignable_agents nao ficou disponivel neste ambiente.'}
                          </InlineNotice>
                        ) : agentsPhase === 'error' ? (
                          <InlineNotice tone="critical">
                            {agentsMessage ?? 'Nao foi possivel carregar o diretorio de agentes atribuiveis.'}
                          </InlineNotice>
                        ) : agentsPhase === 'loading' ? (
                          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                            Carregando agentes atribuiveis deste tenant...
                          </p>
                        ) : assignableAgents.length === 0 ? (
                          <InlineNotice tone="warning">
                            Nenhum agente operacional ativo ficou disponivel para este tenant. Use o fallback tecnico apenas se necessario.
                          </InlineNotice>
                        ) : (
                          <form className="space-y-3" onSubmit={handleAssign}>
                            <Field
                              label="Selecionar agente"
                              description="Diretorio seguro filtrado pelo mesmo contrato de autorizacao usado em rpc_assign_ticket."
                            >
                              <SelectInput
                                onChange={(event) => setAssignDraft(event.target.value)}
                                value={assignDraft}
                              >
                                <option value="">Sem responsavel</option>
                                {assignableAgents.map((agent) => (
                                  <option key={`${agent.tenantId}:${agent.userId}`} value={agent.userId}>
                                    {formatAssignableAgentLabel(agent)}
                                  </option>
                                ))}
                              </SelectInput>
                            </Field>
                            <div className="flex flex-wrap gap-2">
                              <AppButton
                                className="min-h-11 px-5"
                                disabled={submitting || !ticketDetail.canAssign}
                                type="submit"
                              >
                                {submitting ? 'Salvando...' : 'Salvar responsavel'}
                              </AppButton>
                              <GhostButton
                                disabled={
                                  submitting ||
                                  !ticketDetail.canAssign ||
                                  !currentUserAssignableAgent
                                }
                                onClick={() =>
                                  void runAssignment(currentUserAssignableAgent?.userId ?? null)
                                }
                                type="button"
                              >
                                Atribuir a mim
                              </GhostButton>
                              <GhostButton
                                disabled={submitting || !ticketDetail.canAssign || !ticketDetail.assignedToUserId}
                                onClick={() => void runAssignment(null)}
                                type="button"
                              >
                                Desatribuir
                              </GhostButton>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>

                    <form className="space-y-3" onSubmit={handleUpdateStatus}>
                      <Field label="Status">
                        <SelectInput
                          onChange={(event) =>
                            setStatusDraft(event.target.value as TicketStatusUpdateTarget)
                          }
                          value={statusDraft}
                        >
                          {buildStatusChoices(ticketDetail.status).map((status) => (
                            <option key={status} value={status}>
                              {humanizeStatus(status)}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>
                      <Field label="Nota da transicao">
                        <TextareaInput
                          onChange={(event) => setStatusNote(event.target.value)}
                          placeholder="Opcional. Explique a transicao para o proximo operador."
                          value={statusNote}
                        />
                      </Field>
                      <AppButton className="min-h-11 px-5" disabled={submitting || !ticketDetail.canUpdateStatus} type="submit">
                        {submitting ? 'Atualizando...' : 'Salvar status'}
                      </AppButton>
                    </form>

                    <details className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                        Atribuicao avancada
                      </summary>
                      <form className="mt-3 space-y-3" onSubmit={handleAssign}>
                        <Field
                          label="user_id do responsavel"
                          description="Fallback tecnico para casos excepcionais. O fluxo principal de atribuicao deve usar o seletor acima."
                        >
                          <TextInput
                            onChange={(event) => setAssignDraft(event.target.value)}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            value={assignDraft}
                          />
                        </Field>
                        <AppButton className="min-h-11 px-5" disabled={submitting || !ticketDetail.canAssign} type="submit">
                          {submitting ? 'Salvando...' : 'Salvar responsavel'}
                        </AppButton>
                      </form>
                    </details>

                    {ticketDetail.canClose || ticketDetail.canReopen ? (
                      <details className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                          Acoes de excecao
                        </summary>
                        <div className="mt-3 space-y-4">
                          {ticketDetail.canClose ? (
                            <form className="space-y-3" onSubmit={handleClose}>
                              <Field label="Motivo do fechamento">
                                <TextareaInput
                                  onChange={(event) => setCloseReason(event.target.value)}
                                  placeholder="Obrigatorio para encerrar."
                                  value={closeReason}
                                />
                              </Field>
                              <AppButton
                                className="min-h-11 bg-[linear-gradient(135deg,#8b1e3f,#c3365e)] px-5"
                                disabled={submitting || closeReason.trim().length === 0}
                                type="submit"
                              >
                                {submitting ? 'Fechando...' : 'Fechar ticket'}
                              </AppButton>
                            </form>
                          ) : null}

                          {ticketDetail.canReopen ? (
                            <form className="space-y-3" onSubmit={handleReopen}>
                              <Field label="Motivo da reabertura">
                                <TextareaInput
                                  onChange={(event) => setReopenReason(event.target.value)}
                                  placeholder="Opcional para reabrir."
                                  value={reopenReason}
                                />
                              </Field>
                              <GhostButton disabled={submitting} type="submit">
                                {submitting ? 'Reabrindo...' : 'Reabrir ticket'}
                              </GhostButton>
                            </form>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>

                  <SupportCustomerRail
                    compact
                    customer={customer}
                    recentEventsWindow={customerRecentEvents}
                    recentTicketsWindow={customerRecentTickets}
                  />
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

export function SupportQueuePage() {
  return <SupportWorkspaceView variant="queue" />;
}

export function SupportTicketsPage() {
  return <SupportWorkspaceView variant="tickets" />;
}

export function SupportTicketPage() {
  const { ticketId } = useParams();

  return <SupportWorkspaceView focusTicketId={ticketId ?? null} variant="tickets" />;
}

export function SupportCustomerPage() {
  const { markSessionExpired } = useAuthContext();
  const { tenantId } = useParams();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<SupportCustomer360 | null>(null);
  const [customers, setCustomers] = useState<SupportCustomer360[]>([]);
  const [recentTicketsWindow, setRecentTicketsWindow] =
    useState<SupportCustomerRecentTicketsWindow>(emptyCustomerRecentTicketsWindow());
  const [recentEventsWindow, setRecentEventsWindow] =
    useState<SupportCustomerRecentEventsWindow>(emptyCustomerRecentEventsWindow());

  const loadCustomer = useEffectEvent(async () => {
    if (!tenantId) {
      setCustomer(null);
      setCustomers([]);
      setRecentTicketsWindow(emptyCustomerRecentTicketsWindow());
      setRecentEventsWindow(emptyCustomerRecentEventsWindow());
      setPhase('error');
      setMessage('Tenant ausente na rota do customer 360.');
      return;
    }

    try {
      const [detail, rows, recentTickets, recentEvents] = await Promise.all([
        getSupportCustomer360(tenantId),
        listSupportCustomers360(),
        getSupportCustomerRecentTickets(tenantId),
        getSupportCustomerRecentEvents(tenantId),
      ]);

      setBackendDenied(false);
      setCustomer(detail);
      setCustomers(rows);
      setRecentTicketsWindow(recentTickets);
      setRecentEventsWindow(recentEvents);
      setMessage(null);
      setPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o customer 360 do tenant.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setCustomer(null);
      setCustomers([]);
      setRecentTicketsWindow(emptyCustomerRecentTicketsWindow());
      setRecentEventsWindow(emptyCustomerRecentEventsWindow());
      setMessage(classified.message);
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
    void loadCustomer();
  }, []);

  useEffect(() => {
    void loadCustomer();
  }, [tenantId]);

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return <LoadingState title="Carregando customer context" />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="vw_support_customer_360 / vw_support_customer_recent_tickets / vw_support_customer_recent_events" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={message ?? 'O customer 360 nao ficou disponivel neste ambiente.'}
        action={<AppButton onClick={() => void loadCustomer()}>Tentar novamente</AppButton>}
      />
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title="Tenant nao encontrado"
        description="O tenant solicitado nao apareceu na camada oficial de support customer 360."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title="Customer context"
        description="Resumo operacional do cliente B2B para continuidade da tratativa, com contatos ativos, tickets recentes e eventos relevantes."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Panel
            title="Resumo operacional do tenant"
            description="Contexto suficiente para entender o cliente atendido sem transformar a superficie em CRM."
          >
            <SupportCustomerRail
              compact
              customer={customer}
              recentEventsWindow={recentEventsWindow}
              recentTicketsWindow={recentTicketsWindow}
            />
          </Panel>

          <Panel
            title="Eventos recentes do tenant"
            description="Ultimos movimentos relevantes para reentrar rapidamente no contexto do atendimento."
          >
            <div className="mb-3 text-xs leading-5 text-[color:var(--color-muted)]">
              Mostrando {recentEventsWindow.events.length} de {recentEventsWindow.totalAvailableCount} registros recentes.
            </div>
            {recentEventsWindow.events.length === 0 ? (
              <EmptyState
                title="Sem eventos recentes"
                description="O backend nao retornou eventos recentes para este tenant."
              />
            ) : (
              <div className="space-y-2">
                {recentEventsWindow.events.map((event) => (
                  <SupportRecentEventCard
                    event={event}
                    key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-5">
          <div className="xl:sticky xl:top-4">
            <Panel
              title="Outros clientes acessiveis"
              description="Navegacao utilitaria para trocar de tenant sem sair do workspace."
            >
              <div className="space-y-3">
                {customers.map((row) => {
                  const isSelected = row.tenantId === customer.tenantId;
                  return (
                    <Link
                      className={cx(
                        'block rounded-[22px] border px-4 py-3 transition',
                        isSelected
                          ? 'border-[rgba(48,127,226,0.42)] bg-[rgba(48,127,226,0.08)]'
                          : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.28)] hover:bg-[color:var(--color-surface)]',
                      )}
                      key={row.tenantId}
                      to={`/support/customers/${row.tenantId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[color:var(--color-ink)]">
                          {row.tenantDisplayName ?? row.tenantLegalName ?? row.tenantSlug}
                        </p>
                        <StatusPill>{row.tenantStatus}</StatusPill>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                        {row.activeContactsCount} contatos ativos · {row.openTicketCount} tickets abertos
                      </p>
                    </Link>
                  );
                })}
              </div>
            </Panel>
          </div>
        </aside>
      </div>
    </div>
  );
}
