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
  getSupportTicketDetail,
  listSupportCustomers360,
  listSupportTicketTimeline,
  listSupportTicketsQueue,
  reopenTicket,
  updateTicketStatus,
} from './support-api';
import {
  TICKET_PRIORITIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type SupportCustomer360,
  type SupportCustomer360Contact,
  type SupportCustomer360RecentEvent,
  type SupportCustomer360RecentTicket,
  type SupportTicketDetail,
  type SupportTicketQueueItem,
  type SupportTicketTimelineItem,
  type TicketPriority,
  type TicketSeverity,
  type TicketStatus,
  type TicketStatusUpdateTarget,
  type Uuid,
} from '../../contracts/support-contracts';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
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

  return (
    <article
      className={cx(
        'rounded-[24px] border p-4 shadow-[0_14px_30px_rgba(19,33,79,0.08)]',
        tones.card,
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cx('mt-1 h-16 w-1 shrink-0 rounded-full', tones.rail)} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={entry.visibility === 'internal' ? 'critical' : 'accent'}>
                  {humanizeVisibility(entry.visibility)}
                </StatusPill>
                <StatusPill>
                  {entry.entryType === 'message'
                    ? 'mensagem'
                    : humanizeToken(entry.eventType ?? 'evento')}
                </StatusPill>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-[color:var(--color-ink)]">
                  {entry.actorFullName ?? entry.actorEmail ?? 'Ator nao resolvido'}
                </p>
                <p className="text-xs text-[color:var(--color-muted)]">
                  {formatDateTime(entry.occurredAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/70 bg-white/92 px-4 py-3 text-sm leading-6 text-[color:var(--color-ink)]">
            {entry.entryType === 'message' ? (
              <p className="whitespace-pre-wrap">{summary}</p>
            ) : (
              <div className="space-y-2">
                <p className="font-medium text-[color:var(--color-ink)]">
                  {humanizeToken(entry.eventType ?? 'evento')}
                </p>
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
  entries,
}: {
  entries: SupportTicketTimelineItem[];
}) {
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
        'rounded-[26px] border p-4 shadow-[0_18px_36px_rgba(19,33,79,0.08)] transition',
        isSelected
          ? 'border-[rgba(48,127,226,0.52)] bg-[rgba(48,127,226,0.09)]'
          : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.24)] hover:bg-[rgba(255,255,255,0.98)]',
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={onSelect}
          type="button"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={toneForTicketStatus(ticket.status)}>{humanizeStatus(ticket.status)}</StatusPill>
            <StatusPill tone={toneForPriority(ticket.priority)}>{ticket.priority}</StatusPill>
            <StatusPill tone={toneForSeverity(ticket.severity)}>{ticket.severity}</StatusPill>
            {ticket.isUnassigned ? <StatusPill tone="warning">Nao atribuido</StatusPill> : null}
          </div>

          <div className="mt-3 space-y-2">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
              {ticket.title}
            </h3>
            <TicketMetaLine ticket={ticket} />
          </div>
        </button>

        <div className="flex flex-wrap items-start gap-2 xl:justify-end">
          <GhostButton onClick={onSelect}>Atender ticket</GhostButton>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white/92 px-4 py-2 text-sm font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
            to={`/support/customers/${ticket.tenantId}`}
          >
            Ver cliente
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs leading-5 text-[color:var(--color-muted)]">
        <span>{ticket.customerMessageCount} respostas publicas</span>
        <span>{ticket.internalMessageCount} notas internas</span>
        <span>Origem: {ticket.source}</span>
      </div>
    </article>
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
  compact = false,
}: {
  customer: SupportCustomer360 | null;
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
  const recentTickets = customer.recentTickets.slice(0, compact ? 3 : 5);
  const recentEvents = customer.recentEvents.slice(0, compact ? 2 : 4);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[rgba(19,33,79,0.96)] p-4 text-white shadow-[0_18px_36px_rgba(19,33,79,0.18)]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill>{customer.tenantStatus}</StatusPill>
          <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="text-lg font-semibold tracking-[-0.03em]">
            {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
          </h3>
          <p className="text-sm text-white/72">
            {customer.tenantLegalName ?? 'Razao social nao resolvida'}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/12 bg-white/8 px-3 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/58">
              Contatos
            </p>
            <p className="mt-2 text-2xl font-semibold">{customer.activeContactsCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/12 bg-white/8 px-3 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/58">
              Abertos
            </p>
            <p className="mt-2 text-2xl font-semibold">{customer.openTicketCount}</p>
          </div>
          <div className="rounded-[18px] border border-white/12 bg-white/8 px-3 py-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/58">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold">{customer.totalTicketCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-white p-4 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            Contatos ativos
          </h4>
          <Link
            className="text-sm font-medium text-[color:var(--color-brand-blue)]"
            to={`/support/customers/${customer.tenantId}`}
          >
            Abrir 360
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Nenhum contato ativo retornado pelo contrato.
            </p>
          ) : (
            contacts.map((contact) => (
              <SupportContactCard key={contact.id} contact={contact} />
            ))
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-[color:var(--color-border)] bg-white p-4 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
          Tickets recentes
        </h4>
        <div className="mt-3 space-y-2">
          {recentTickets.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted)]">
              Nenhum ticket recente retornado para este tenant.
            </p>
          ) : (
            recentTickets.map((ticket) => (
              <SupportRecentTicketCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </div>
      </div>

      {compact ? null : (
        <div className="rounded-[22px] border border-[color:var(--color-border)] bg-white p-4 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            Eventos recentes
          </h4>
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
        </div>
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
    <div className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
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
      className="block rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 transition hover:border-[rgba(48,127,226,0.28)] hover:bg-white"
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
      className="block rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 transition hover:border-[rgba(48,127,226,0.28)] hover:bg-white"
      to={`/support/tickets/${event.ticketId}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill>{humanizeToken(event.eventType)}</StatusPill>
        <StatusPill tone={event.visibility === 'internal' ? 'critical' : 'accent'}>
          {humanizeVisibility(event.visibility)}
        </StatusPill>
      </div>
      <p className="mt-2 font-medium text-[color:var(--color-ink)]">{event.ticketTitle}</p>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        {formatDateTime(event.occurredAt)}
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
  const [timeline, setTimeline] = useState<SupportTicketTimelineItem[]>([]);
  const [customer, setCustomer] = useState<SupportCustomer360 | null>(null);
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

    try {
      const [detail, timelineRows] = await Promise.all([
        getSupportTicketDetail(ticketId),
        listSupportTicketTimeline(ticketId),
      ]);

      setBackendDenied(false);

      if (!detail) {
        setTicketDetail(null);
        setTimeline([]);
        setCustomer(null);
        setDetailPhase('error');
        setDetailMessage('O backend nao retornou detalhe para o ticket selecionado.');
        return;
      }

      const customerRow = await getSupportCustomer360(detail.tenantId);
      setTicketDetail(detail);
      setTimeline(timelineRows);
      setCustomer(customerRow);
      setDetailPhase('ready');
      setStatusDraft(buildStatusChoices(detail.status)[0] ?? 'triage');
      setAssignDraft(detail.assignedToUserId ?? '');
      setComposerMode(detail.canAddMessage ? 'public' : detail.canAddInternalNote ? 'internal' : 'public');
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
      setTimeline([]);
      setCustomer(null);
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
      setTimeline([]);
      setCustomer(null);
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

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await assignTicket({
        ticketId: ticketDetail.id,
        assignedToUserId: assignDraft.trim() || null,
      });
      await refreshDetail(ticketDetail.id);
      applySuccess(assignDraft.trim() ? 'Responsavel atualizado com sucesso.' : 'Ticket desatribuido com sucesso.');
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title={variant === 'queue' ? 'Fila operacional' : 'Cockpit de tickets'}
        description={
          variant === 'queue'
            ? 'Triagem, prioridade e contexto do cliente organizados para definir o proximo atendimento sem virar dashboard generico.'
            : 'Fila viva, atendimento do ticket selecionado, timeline e contexto do cliente B2B na mesma superficie operacional.'
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CompactCounter
          helper="Tickets ainda em operacao."
          label="Abertos"
          tone={totalOpen > 0 ? 'positive' : 'default'}
          value={String(totalOpen)}
        />
        <CompactCounter
          helper="Pontos aguardando retorno do cliente."
          label="Waiting customer"
          tone={waitingCustomer > 0 ? 'warning' : 'default'}
          value={String(waitingCustomer)}
        />
        <CompactCounter
          helper="Urgente ou severidade critica."
          label="Alta atencao"
          tone={highAttention > 0 ? 'critical' : 'default'}
          value={String(highAttention)}
        />
        <CompactCounter
          helper="Sem operador responsavel."
          label="Nao atribuidos"
          tone={unassigned > 0 ? 'warning' : 'default'}
          value={String(unassigned)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(390px,0.92fr)_minmax(0,1.08fr)] 2xl:grid-cols-[minmax(420px,0.86fr)_minmax(0,1.14fr)]">
        <div className="space-y-4">
          <SupportQueueToolbar
            assigneeOptions={assigneeOptions}
            filters={filters}
            onChange={setFilters}
            onRefresh={() => void loadQueue(focusTicketId ?? null)}
            tenantOptions={tenantOptions}
          />

          <Panel
            title="Fila viva de tickets"
            description="Selecione o ticket que entra em tratativa agora. A listagem prioriza sinais de urgencia, contexto e ultima atividade."
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
        </div>

        <div className="space-y-4">
          {detailPhase === 'idle' ? (
            <Panel
              title="Nenhum ticket em tratativa"
              description="Selecione um ticket da fila para abrir o cockpit de atendimento."
            >
              <EmptyState
                title="Sem ticket selecionado"
                description="A fila continua disponivel na coluna principal. Quando um ticket for escolhido, o painel de atendimento aparece aqui."
              />
            </Panel>
          ) : detailPhase === 'loading' ? (
            <LoadingState
              title="Montando cockpit do ticket"
              description="O frontend esta resolvendo detalhe, timeline e contexto do cliente para abrir a tratativa."
            />
          ) : detailPhase === 'contract-unavailable' ? (
            <ContractUnavailableState contractName="vw_support_ticket_detail / vw_support_ticket_timeline / vw_support_customer_360" />
          ) : detailPhase === 'error' || !ticketDetail || !selectedTicketSummary ? (
            <ErrorState
              description={detailMessage ?? 'O painel operacional do ticket nao ficou disponivel.'}
            />
          ) : (
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <Panel
                  title="Ticket em tratativa"
                  description="Centro do atendimento com contexto minimo para responder, registrar nota interna, atribuir e mover status."
                >
                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-[rgba(48,127,226,0.18)] bg-[linear-gradient(145deg,rgba(18,31,75,0.98),rgba(36,73,160,0.96))] p-5 text-white shadow-[0_22px_48px_rgba(18,31,75,0.22)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>{humanizeStatus(ticketDetail.status)}</StatusPill>
                        <StatusPill tone={toneForPriority(ticketDetail.priority)}>{ticketDetail.priority}</StatusPill>
                        <StatusPill tone={toneForSeverity(ticketDetail.severity)}>{ticketDetail.severity}</StatusPill>
                        {ticketDetail.assignedToUserId ? null : <StatusPill tone="warning">Nao atribuido</StatusPill>}
                      </div>

                      <div className="mt-4 space-y-2">
                        <h3 className="text-[1.8rem] font-semibold tracking-[-0.05em]">
                          {ticketDetail.title}
                        </h3>
                        <p className="max-w-4xl text-sm leading-6 text-white/78">
                          {ticketDetail.description}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/58">
                            Cliente B2B
                          </p>
                          <p className="mt-2 font-medium">
                            {ticketDetail.tenantDisplayName ?? ticketDetail.tenantLegalName ?? ticketDetail.tenantSlug}
                          </p>
                          <p className="mt-1 text-sm text-white/68">
                            {ticketDetail.requesterContactFullName ?? 'Sem requester resolvido'} · {ticketDetail.requesterContactEmail ?? 'Sem email'}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/58">
                            Continuo operacional
                          </p>
                          <p className="mt-2 font-medium">
                            Responsavel: {ticketDetail.assignedToFullName ?? 'Nao atribuido'}
                          </p>
                          <p className="mt-1 text-sm text-white/68">
                            Ultima atividade em {formatDateTime(ticketDetail.lastMessageAt ?? ticketDetail.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {detailNotice ? (
                      <InlineNotice tone={detailNoticeTone}>
                        {detailNotice}
                      </InlineNotice>
                    ) : null}

                    <Panel
                      className="bg-white"
                      title="Acoes operacionais"
                      description="Atribuicao e mudanca de status agrupadas como parte do fluxo normal da tratativa."
                    >
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                        <form className="space-y-3" onSubmit={handleAssign}>
                          <Field
                            label="Responsavel do ticket"
                            description="UUID tecnico do operador interno. Nesta fase ainda nao existe diretório dedicado nesta superficie."
                          >
                            <TextInput
                              onChange={(event) => setAssignDraft(event.target.value)}
                              placeholder="00000000-0000-0000-0000-000000000000"
                              value={assignDraft}
                            />
                          </Field>
                          <div className="flex flex-wrap gap-2">
                            <AppButton disabled={submitting || !ticketDetail.canAssign} type="submit">
                              {submitting ? 'Salvando...' : 'Salvar responsavel'}
                            </AppButton>
                            <GhostButton
                              disabled={submitting || !ticketDetail.canAssign || !user?.id}
                              onClick={() => setAssignDraft(user?.id ?? '')}
                            >
                              Atribuir a mim
                            </GhostButton>
                            <GhostButton
                              disabled={submitting || !ticketDetail.canAssign}
                              onClick={() => setAssignDraft('')}
                            >
                              Desatribuir
                            </GhostButton>
                          </div>
                        </form>

                        <form className="space-y-3" onSubmit={handleUpdateStatus}>
                          <Field label="Mover status">
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
                          <Field
                            label="Contexto da transicao"
                            description="Opcional. O backend registra esta mudanca como evento do ticket."
                          >
                            <TextareaInput
                              onChange={(event) => setStatusNote(event.target.value)}
                              placeholder="Explique o motivo da mudanca para quem assume ou revisa o ticket depois."
                              value={statusNote}
                            />
                          </Field>
                          <AppButton disabled={submitting || !ticketDetail.canUpdateStatus} type="submit">
                            {submitting ? 'Atualizando...' : 'Salvar status'}
                          </AppButton>
                        </form>
                      </div>

                      {ticketDetail.canClose || ticketDetail.canReopen ? (
                        <div className="mt-5 grid gap-4 xl:grid-cols-2">
                          {ticketDetail.canClose ? (
                            <form
                              className="rounded-[20px] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)]/58 p-4"
                              onSubmit={handleClose}
                            >
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-medium text-[color:var(--color-ink)]">
                                    Encerrar ticket
                                  </h4>
                                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                                    Acao de excecao. Use apenas quando o retorno final ao cliente B2B ja estiver consolidado.
                                  </p>
                                </div>
                                <TextareaInput
                                  onChange={(event) => setCloseReason(event.target.value)}
                                  placeholder="Motivo obrigatorio para fechamento."
                                  value={closeReason}
                                />
                                <AppButton
                                  className="bg-[linear-gradient(135deg,#8b1e3f,#c3365e)]"
                                  disabled={submitting || closeReason.trim().length === 0}
                                  type="submit"
                                >
                                  {submitting ? 'Fechando...' : 'Fechar ticket'}
                                </AppButton>
                              </div>
                            </form>
                          ) : null}

                          {ticketDetail.canReopen ? (
                            <form
                              className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                              onSubmit={handleReopen}
                            >
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-medium text-[color:var(--color-ink)]">
                                    Reabrir ticket
                                  </h4>
                                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                                    Use quando a demanda voltar a exigir tratativa ativa do suporte.
                                  </p>
                                </div>
                                <TextareaInput
                                  onChange={(event) => setReopenReason(event.target.value)}
                                  placeholder="Contexto opcional para reabertura."
                                  value={reopenReason}
                                />
                                <GhostButton disabled={submitting} type="submit">
                                  {submitting ? 'Reabrindo...' : 'Reabrir ticket'}
                                </GhostButton>
                              </div>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </Panel>

                    <Panel
                      className="bg-white"
                      title="Resposta e nota interna"
                      description="Composer unico com destino explicito para evitar troca acidental entre resposta publica e contexto interno."
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={cx(
                              'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
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
                              'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
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
                            ? 'Tudo o que for enviado aqui fica visivel para o cliente B2B.'
                            : 'Tudo o que for enviado aqui fica restrito ao time interno de suporte, CS e engenharia autorizada.'}
                        </InlineNotice>

                        <form className="space-y-3" onSubmit={handleSubmitComposer}>
                          <Field
                            label={composerMode === 'public' ? 'Resposta publica' : 'Nota interna'}
                            description={
                              composerMode === 'public'
                                ? 'Fale como devolutiva tecnico-operacional para o cliente B2B.'
                                : 'Registre contexto interno para continuidade da tratativa.'
                            }
                          >
                            <TextareaInput
                              onChange={(event) =>
                                composerMode === 'public'
                                  ? setMessageDraft(event.target.value)
                                  : setNoteDraft(event.target.value)
                              }
                              placeholder={
                                composerMode === 'public'
                                  ? 'Descreva a resposta que o cliente B2B vai receber agora.'
                                  : 'Registre investigacao, contexto interno ou handoff para a operacao.'
                              }
                              value={composerDraft}
                            />
                          </Field>
                          <div className="flex flex-wrap gap-2">
                            <AppButton
                              className={
                                composerMode === 'internal'
                                  ? 'bg-[linear-gradient(135deg,#7c2648,#b63f76)]'
                                  : undefined
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
                            {composerMode === 'public' && !canUsePublicComposer ? (
                              <GhostButton disabled>Sem permissao para resposta publica</GhostButton>
                            ) : null}
                            {composerMode === 'internal' && !canUseInternalComposer ? (
                              <GhostButton disabled>Sem permissao para nota interna</GhostButton>
                            ) : null}
                          </div>
                        </form>
                      </div>
                    </Panel>

                    <Panel
                      className="bg-white"
                      title="Timeline operacional"
                      description="Trilha continua do ticket com respostas publicas, notas internas e eventos de status."
                    >
                      <SupportTimeline entries={timeline} />
                    </Panel>

                    <div className="2xl:hidden">
                      <Panel
                        className="bg-white"
                        title="Contexto do cliente"
                        description="Snapshot compacto do tenant para apoiar a tratativa sem roubar foco do atendimento."
                      >
                        <SupportCustomerRail compact customer={customer} />
                      </Panel>
                    </div>
                  </div>
                </Panel>
              </div>

              <aside className="hidden space-y-5 2xl:block">
                <div className="2xl:sticky 2xl:top-4">
                  <Panel
                    className="bg-white"
                    title="Contexto do cliente"
                    description="Rail compacto do tenant para reduzir troca de contexto durante a operacao."
                  >
                    <SupportCustomerRail compact customer={customer} />
                  </Panel>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
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

  const loadCustomer = useEffectEvent(async () => {
    if (!tenantId) {
      setCustomer(null);
      setCustomers([]);
      setPhase('error');
      setMessage('Tenant ausente na rota do customer 360.');
      return;
    }

    try {
      const [detail, rows] = await Promise.all([
        getSupportCustomer360(tenantId),
        listSupportCustomers360(),
      ]);

      setBackendDenied(false);
      setCustomer(detail);
      setCustomers(rows);
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
    return <ContractUnavailableState contractName="vw_support_customer_360" />;
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
            <SupportCustomerRail customer={customer} />
          </Panel>

          <Panel
            title="Eventos recentes do tenant"
            description="Ultimos movimentos relevantes para reentrar rapidamente no contexto do atendimento."
          >
            {customer.recentEvents.length === 0 ? (
              <EmptyState
                title="Sem eventos recentes"
                description="O backend nao retornou eventos recentes para este tenant."
              />
            ) : (
              <div className="space-y-2">
                {customer.recentEvents.map((event) => (
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
