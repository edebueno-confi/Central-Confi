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
  MetricCard,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
  TextareaInput,
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

function humanizeVisibility(value: string) {
  return value === 'internal' ? 'Nota interna' : 'Resposta publica';
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
    return entry.body;
  }

  const note =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? Object.entries(entry.metadata)
          .map(([key, value]) => `${humanizeToken(key)}: ${String(value)}`)
          .join(' · ')
      : '';

  return note || humanizeToken(entry.eventType);
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
        <article
          key={entry.timelineEntryId}
          className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={entry.visibility === 'internal' ? 'critical' : 'accent'}>
                  {humanizeVisibility(entry.visibility)}
                </StatusPill>
                <StatusPill>{entry.entryType === 'message' ? 'mensagem' : humanizeToken(entry.eventType)}</StatusPill>
              </div>
              <div>
                <p className="font-medium text-[color:var(--color-ink)]">
                  {entry.actorFullName ?? entry.actorEmail ?? 'Ator nao resolvido'}
                </p>
                <p className="text-xs text-[color:var(--color-muted)]">
                  {formatDateTime(entry.occurredAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-6 text-[color:var(--color-ink)]">
            {entry.entryType === 'message' ? (
              <p className="whitespace-pre-wrap">{entry.body}</p>
            ) : (
              <div className="space-y-2">
                <p>{humanizeToken(entry.eventType)}</p>
                {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                  <p className="text-xs text-[color:var(--color-muted)]">
                    {stringifyJsonPreview(entry.metadata)}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function SupportCustomerSummary({
  customer,
}: {
  customer: SupportCustomer360 | null;
}) {
  if (!customer) {
    return (
      <EmptyState
        title="Customer 360 indisponivel"
        description="O ticket ainda nao conseguiu resolver o contexto minimo do tenant nesta superficie."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill>{customer.tenantStatus}</StatusPill>
          <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
          </h3>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            {customer.tenantLegalName ?? 'Razao social nao resolvida'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Contatos ativos" value={String(customer.activeContactsCount)} />
        <MetricCard label="Tickets totais" value={String(customer.totalTicketCount)} />
        <MetricCard label="Tickets abertos" value={String(customer.openTicketCount)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
            Contatos ativos
          </h4>
          <div className="mt-3 space-y-3">
            {customer.activeContacts.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted)]">
                Nenhum contato ativo retornado pelo contrato.
              </p>
            ) : (
              customer.activeContacts.map((contact) => (
                <div key={contact.id} className="rounded-[18px] bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[color:var(--color-ink)]">{contact.fullName}</p>
                    {contact.isPrimary ? <StatusPill tone="accent">primary</StatusPill> : null}
                  </div>
                  <p className="text-sm text-[color:var(--color-muted)]">{contact.email}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
              Tickets recentes
            </h4>
            <Link
              className="text-sm font-medium text-[color:var(--color-brand-blue)]"
              to={`/support/customers/${customer.tenantId}`}
            >
              Abrir 360 completo
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {customer.recentTickets.length === 0 ? (
              <p className="text-sm text-[color:var(--color-muted)]">
                Nenhum ticket recente retornado para este tenant.
              </p>
            ) : (
              customer.recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  className="block rounded-[18px] bg-white px-4 py-3 transition hover:border-[color:var(--color-brand-blue)]/30"
                  to={`/support/tickets/${ticket.id}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[color:var(--color-ink)]">{ticket.title}</p>
                    <StatusPill tone={toneForTicketStatus(ticket.status)}>{ticket.status}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                    Atualizado em {formatDateTime(ticket.updatedAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
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

  const tenantOptions = useMemo(() => {
    const items = new Map<string, { id: string; label: string }>();

    for (const ticket of tickets) {
      if (!items.has(ticket.tenantId)) {
        items.set(ticket.tenantId, {
          id: ticket.tenantId,
          label:
            ticket.tenantDisplayName ??
            ticket.tenantLegalName ??
            ticket.tenantSlug,
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
    if (variant === 'queue') {
      return;
    }

    void navigate(`/support/tickets/${ticketId}`);
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

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await addTicketMessage({
        ticketId: ticketDetail.id,
        body: messageDraft.trim(),
      });
      setMessageDraft('');
      await refreshDetail(ticketDetail.id);
      applySuccess('Resposta publica adicionada com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao adicionar a resposta publica.');
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ticketDetail) {
      return;
    }

    setSubmitting(true);
    setDetailNotice(null);

    try {
      await addInternalTicketNote({
        ticketId: ticketDetail.id,
        body: noteDraft.trim(),
      });
      setNoteDraft('');
      await refreshDetail(ticketDetail.id);
      applySuccess('Nota interna adicionada com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(error, 'Falha ao adicionar a nota interna.');
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
    return <LoadingState title="Carregando fila de suporte" />;
  }

  if (phase === 'contract-unavailable') {
    return (
      <ContractUnavailableState contractName="vw_support_tickets_queue" />
    );
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={
          pageMessage ?? 'O Support Workspace nao conseguiu materializar a fila oficial.'
        }
        action={<AppButton onClick={() => void loadQueue(selectedTicketId)}>Tentar novamente</AppButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support Workspace"
        title={variant === 'queue' ? 'Queue' : 'Tickets'}
        description={
          variant === 'queue'
            ? 'Fila interna dominante para triagem, resposta tecnico-operacional e contexto do cliente B2B sem depender de tabelas-base.'
            : 'Superficie minima de tickets para suporte e CS interno, sustentada pelos read models oficiais da camada de suporte.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard helper="Tickets ainda em operacao." label="Abertos" value={String(totalOpen)} />
        <MetricCard helper="Pontos aguardando retorno do cliente." label="Waiting customer" value={String(waitingCustomer)} />
        <MetricCard helper="Urgente ou severidade critica." label="Alta atencao" value={String(highAttention)} />
        <MetricCard helper="Sem operador responsavel." label="Nao atribuidos" value={String(unassigned)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)] 2xl:grid-cols-[minmax(0,1.12fr)_minmax(520px,0.88fr)]">
        <div className="space-y-6">
          <Panel
            title="Fila oficial de tickets"
            description="A listagem concentra tenant, requester, atribuicao e waiting states ja resolvidos no backend. Os filtros abaixo nao fazem join nem seguranca no frontend."
            actions={
              <GhostButton onClick={() => void loadQueue(selectedTicketId)}>
                Recarregar
              </GhostButton>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Status">
                <SelectInput
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as QueueFilters['status'],
                    }))
                  }
                  value={filters.status}
                >
                  <option value="all">Todos</option>
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Prioridade">
                <SelectInput
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      priority: event.target.value as QueueFilters['priority'],
                    }))
                  }
                  value={filters.priority}
                >
                  <option value="all">Todas</option>
                  {TICKET_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Severidade">
                <SelectInput
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      severity: event.target.value as QueueFilters['severity'],
                    }))
                  }
                  value={filters.severity}
                >
                  <option value="all">Todas</option>
                  {TICKET_SEVERITIES.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Tenant">
                <SelectInput
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      tenantId: event.target.value as QueueFilters['tenantId'],
                    }))
                  }
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
                    setFilters((current) => ({
                      ...current,
                      assignedToUserId: event.target.value as QueueFilters['assignedToUserId'],
                    }))
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

            <div className="mt-5 space-y-3">
              {tickets.length === 0 ? (
                <EmptyState
                  title="Fila vazia"
                  description="Nenhum ticket retornou para os filtros atuais nesta camada de suporte."
                />
              ) : (
                tickets.map((ticket) => {
                  const isSelected = ticket.id === selectedTicketId;
                  return (
                    <article
                      key={ticket.id}
                      className={`rounded-[24px] border p-4 transition ${
                        isSelected
                          ? 'border-[color:var(--color-brand-blue)] bg-[rgba(48,127,226,0.08)]'
                          : 'border-[color:var(--color-border)] bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => handleSelectTicket(ticket.id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={toneForTicketStatus(ticket.status)}>{ticket.status}</StatusPill>
                            <StatusPill tone={toneForPriority(ticket.priority)}>{ticket.priority}</StatusPill>
                            <StatusPill tone={toneForSeverity(ticket.severity)}>{ticket.severity}</StatusPill>
                            {ticket.isUnassigned ? <StatusPill tone="warning">unassigned</StatusPill> : null}
                          </div>
                          <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                            {ticket.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                            {ticket.tenantDisplayName ?? ticket.tenantLegalName ?? ticket.tenantSlug} · {ticket.requesterContactFullName ?? 'Sem requester resolvido'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[color:var(--color-muted)]">
                            <span>Atualizado: {formatDateTime(ticket.updatedAt)}</span>
                            <span>Responsavel: {ticket.assignedToFullName ?? 'Nao atribuido'}</span>
                            <span>Publicas: {ticket.customerMessageCount}</span>
                            <span>Internas: {ticket.internalMessageCount}</span>
                          </div>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <GhostButton onClick={() => void navigate(`/support/tickets/${ticket.id}`)}>
                            Abrir ticket
                          </GhostButton>
                          <GhostButton onClick={() => void navigate(`/support/customers/${ticket.tenantId}`)}>
                            Ver cliente
                          </GhostButton>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Detalhe operacional"
            description="Resumo do ticket ativo com contexto minimo para atendimento, atribuicao e transicoes de status."
          >
            {detailPhase === 'idle' ? (
              <EmptyState
                title="Selecione um ticket"
                description="O detalhe lateral so abre contexto quando existe um ticket ativo na fila."
              />
            ) : detailPhase === 'loading' ? (
              <LoadingState
                title="Carregando detalhe do ticket"
                description="O frontend esta aguardando o detalhe oficial, a timeline e o customer 360 deste ticket."
              />
            ) : detailPhase === 'contract-unavailable' ? (
              <ContractUnavailableState contractName="vw_support_ticket_detail / vw_support_ticket_timeline / vw_support_customer_360" />
            ) : detailPhase === 'error' || !ticketDetail || !selectedTicketSummary ? (
              <ErrorState
                description={detailMessage ?? 'O detalhe operacional do ticket nao ficou disponivel.'}
              />
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>{ticketDetail.status}</StatusPill>
                    <StatusPill tone={toneForPriority(ticketDetail.priority)}>{ticketDetail.priority}</StatusPill>
                    <StatusPill tone={toneForSeverity(ticketDetail.severity)}>{ticketDetail.severity}</StatusPill>
                    <StatusPill>{ticketDetail.source}</StatusPill>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                      {ticketDetail.title}
                    </h3>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      {ticketDetail.description}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm leading-6 text-[color:var(--color-muted)]">
                    <p>Tenant: {ticketDetail.tenantDisplayName ?? ticketDetail.tenantLegalName ?? ticketDetail.tenantSlug}</p>
                    <p>Requester: {ticketDetail.requesterContactFullName ?? 'Sem requester resolvido'} · {ticketDetail.requesterContactEmail ?? 'Sem email'}</p>
                    <p>Responsavel: {ticketDetail.assignedToFullName ?? 'Nao atribuido'}</p>
                    <p>Ultima atividade: {formatDateTime(ticketDetail.lastMessageAt ?? ticketDetail.updatedAt)}</p>
                  </div>
                </div>

                {detailNotice ? (
                  <InlineNotice tone={detailNoticeTone}>
                    {detailNotice}
                  </InlineNotice>
                ) : null}

                <div className="grid gap-4">
                  <Panel
                    className="border-dashed bg-[color:var(--color-surface)]/72"
                    title="Atribuicao e status"
                    description="Operacoes contratuais do ticket sem workflow engine adicional."
                  >
                    <div className="space-y-4">
                      <form className="space-y-3" onSubmit={handleAssign}>
                        <Field
                          label="Responsavel (user_id)"
                          description="Sem diretório dedicado nesta fase. Use o UUID real do operador quando necessário ou atribua a si mesmo."
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
                        <Field label="Alterar status">
                          <SelectInput
                            onChange={(event) =>
                              setStatusDraft(event.target.value as TicketStatusUpdateTarget)
                            }
                            value={statusDraft}
                          >
                            {buildStatusChoices(ticketDetail.status).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </SelectInput>
                        </Field>
                        <Field
                          label="Nota de transicao"
                          description="Opcional. O backend registra a transicao como evento."
                        >
                          <TextareaInput
                            onChange={(event) => setStatusNote(event.target.value)}
                            placeholder="Contexto da transicao para o time interno."
                            value={statusNote}
                          />
                        </Field>
                        <AppButton disabled={submitting || !ticketDetail.canUpdateStatus} type="submit">
                          {submitting ? 'Atualizando...' : 'Salvar status'}
                        </AppButton>
                      </form>

                      {ticketDetail.canClose ? (
                        <form className="space-y-3" onSubmit={handleClose}>
                          <Field label="Fechar ticket">
                            <TextareaInput
                              onChange={(event) => setCloseReason(event.target.value)}
                              placeholder="Motivo obrigatorio para fechamento."
                              value={closeReason}
                            />
                          </Field>
                          <AppButton
                            className="bg-[linear-gradient(135deg,#8b1e3f,#c3365e)]"
                            disabled={submitting || closeReason.trim().length === 0}
                            type="submit"
                          >
                            {submitting ? 'Fechando...' : 'Fechar ticket'}
                          </AppButton>
                        </form>
                      ) : null}

                      {ticketDetail.canReopen ? (
                        <form className="space-y-3" onSubmit={handleReopen}>
                          <Field label="Reabrir ticket">
                            <TextareaInput
                              onChange={(event) => setReopenReason(event.target.value)}
                              placeholder="Contexto opcional para reabertura."
                              value={reopenReason}
                            />
                          </Field>
                          <GhostButton disabled={submitting} type="submit">
                            {submitting ? 'Reabrindo...' : 'Reabrir ticket'}
                          </GhostButton>
                        </form>
                      ) : null}
                    </div>
                  </Panel>

                  <Panel
                    className="border-dashed bg-[color:var(--color-surface)]/72"
                    title="Comunicacao"
                    description="Composer separado entre resposta publica e nota interna, sem chat nem automacao."
                  >
                    <div className="space-y-4">
                      <form className="space-y-3" onSubmit={handleReply}>
                        <Field label="Resposta publica">
                          <TextareaInput
                            onChange={(event) => setMessageDraft(event.target.value)}
                            placeholder="Resposta visivel ao cliente B2B."
                            value={messageDraft}
                          />
                        </Field>
                        <AppButton
                          disabled={submitting || messageDraft.trim().length === 0 || !ticketDetail.canAddMessage}
                          type="submit"
                        >
                          {submitting ? 'Enviando...' : 'Adicionar resposta'}
                        </AppButton>
                      </form>

                      <form className="space-y-3" onSubmit={handleAddNote}>
                        <Field label="Nota interna">
                          <TextareaInput
                            onChange={(event) => setNoteDraft(event.target.value)}
                            placeholder="Contexto interno para suporte, CS e engenharia."
                            value={noteDraft}
                          />
                        </Field>
                        <GhostButton
                          disabled={submitting || noteDraft.trim().length === 0 || !ticketDetail.canAddInternalNote}
                          type="submit"
                        >
                          {submitting ? 'Salvando...' : 'Adicionar nota interna'}
                        </GhostButton>
                      </form>
                    </div>
                  </Panel>
                </div>

                <Panel
                  className="border-dashed bg-[color:var(--color-surface)]/72"
                  title="Timeline"
                  description="Historico integral do ticket dentro da camada oficial de suporte."
                >
                  <SupportTimeline entries={timeline} />
                </Panel>

                <Panel
                  className="border-dashed bg-[color:var(--color-surface)]/72"
                  title="Cliente B2B"
                  description="Snapshot minimo do tenant para reduzir troca de contexto durante o atendimento."
                >
                  <SupportCustomerSummary customer={customer} />
                </Panel>
              </div>
            )}
          </Panel>
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
    return <LoadingState title="Carregando customer 360" />;
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support Workspace"
        title="Customer 360"
        description="Visao minima do cliente B2B para suporte interno: contatos ativos, tickets recentes, status operacional e eventos relevantes."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.84fr)]">
        <div className="space-y-6">
          <Panel
            title="Contexto do cliente"
            description="Read model minimo aprovado para suporte. Sem joins manuais no frontend e sem metricas complexas."
          >
            <SupportCustomerSummary customer={customer} />
          </Panel>

          <Panel
            title="Eventos recentes"
            description="Ultimos eventos relevantes agregados para o tenant atual."
          >
            {customer.recentEvents.length === 0 ? (
              <EmptyState
                title="Sem eventos recentes"
                description="O backend nao retornou eventos recentes para este tenant."
              />
            ) : (
              <div className="space-y-3">
                {customer.recentEvents.map((event) => (
                  <article
                    key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`}
                    className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill>{humanizeToken(event.eventType)}</StatusPill>
                      <StatusPill tone={event.visibility === 'internal' ? 'critical' : 'accent'}>
                        {humanizeVisibility(event.visibility)}
                      </StatusPill>
                    </div>
                    <p className="mt-3 font-medium text-[color:var(--color-ink)]">
                      {event.ticketTitle}
                    </p>
                    <p className="text-sm text-[color:var(--color-muted)]">
                      {formatDateTime(event.occurredAt)}
                    </p>
                    <div className="mt-3">
                      <Link
                        className="text-sm font-medium text-[color:var(--color-brand-blue)]"
                        to={`/support/tickets/${event.ticketId}`}
                      >
                        Abrir ticket
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Outros clientes acessiveis"
            description="Lista lateral minima para trocar de tenant sem sair do workspace."
          >
            <div className="space-y-3">
              {customers.map((row) => {
                const isSelected = row.tenantId === customer.tenantId;
                return (
                  <Link
                    key={row.tenantId}
                    className={`block rounded-[22px] border px-4 py-3 transition ${
                      isSelected
                        ? 'border-[color:var(--color-brand-blue)] bg-[rgba(48,127,226,0.08)]'
                        : 'border-[color:var(--color-border)] bg-white'
                    }`}
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
      </div>
    </div>
  );
}
