import {
  type FormEvent,
  type ReactNode,
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
  ContextSubsidebar,
  ContextSubsidebarSection,
  Field,
  GhostButton,
  InlineNotice,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  SummaryStrip,
  TextInput,
  TextareaInput,
  WorkspaceSplit,
  cx,
} from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';
import { classifyAdminError } from '../admin/admin-errors';
import {
  addInternalTicketNote,
  addTicketMessage,
  archiveSupportTicketArticleLink,
  assignTicket,
  closeTicket,
  getSupportCustomerAccountContext,
  getSupportCustomer360,
  getSupportCustomerRecentEvents,
  getSupportCustomerRecentTickets,
  getSupportTicketDetail,
  getSupportTicketKnowledgeLinks,
  getSupportTicketTimelineRecent,
  linkSupportTicketArticle,
  listSupportAssignableAgents,
  listSupportKnowledgeArticlePicker,
  listSupportCustomers360,
  markSupportArticleNeedsUpdate,
  markSupportDocumentationGap,
  listSupportTicketsQueue,
  reopenTicket,
  updateTicketStatus,
} from './support-api';
import {
  TICKET_PRIORITIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type KnowledgeArticleStatus,
  type KnowledgeArticleVisibility,
  type SupportAssignableAgent,
  type SupportCustomerAccountAlert,
  type SupportCustomerAccountContext,
  type SupportCustomerAccountCustomization,
  type SupportCustomerAccountFeature,
  type SupportCustomerAccountIntegration,
  type SupportCustomer360,
  type SupportCustomer360Contact,
  type SupportCustomerRecentEventsWindow,
  type SupportCustomerRecentTicketsWindow,
  type SupportCustomer360RecentEvent,
  type SupportCustomer360RecentTicket,
  type SupportKnowledgeArticlePickerItem,
  type SupportTicketDetail,
  type SupportTicketKnowledgeLink,
  type SupportTicketQueueItem,
  type SupportTicketTimelineItem,
  type SupportTicketTimelineRecentWindow,
  type TicketKnowledgeLinkType,
  type TicketPriority,
  type TicketSeverity,
  type TicketStatus,
  type TicketStatusUpdateTarget,
  type Uuid,
} from '../../contracts/support-contracts';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type AgentsPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type KnowledgePhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
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

function humanizeVisibility(value: string) {
  return value === 'internal' ? 'Nota interna' : 'Resposta publica';
}

function humanizeStatus(status: TicketStatus) {
  return humanizeToken(status).replaceAll('_', ' ');
}

function humanizeCustomerValue(value: string) {
  return humanizeToken(value).replaceAll('_', ' ');
}

function humanizeKnowledgeVisibility(visibility: KnowledgeArticleVisibility) {
  if (visibility === 'public') {
    return 'Publico';
  }

  if (visibility === 'internal') {
    return 'Interno';
  }

  return 'Restrito';
}

function humanizeKnowledgeStatus(status: KnowledgeArticleStatus) {
  if (status === 'draft') {
    return 'Rascunho';
  }

  if (status === 'review') {
    return 'Em revisao';
  }

  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'archived') {
    return 'Arquivado';
  }

  return humanizeToken(status).replaceAll('_', ' ');
}

function LoadingBlock({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'animate-pulse rounded-[18px] bg-[linear-gradient(90deg,rgba(226,232,240,0.9),rgba(241,245,249,0.95),rgba(226,232,240,0.9))]',
        className,
      )}
    />
  );
}

function SupportQueueLoadingScaffold() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title="Fila operacional"
        description="A fila continua ocupando a area principal enquanto o contexto operacional termina de sincronizar."
      />

      <WorkspaceSplit
        layoutClassName="xl:grid-cols-[292px_minmax(0,1fr)]"
        sidebar={
          <ContextSubsidebar
            description="Filtros e filas rapidas seguem reservados na lateral para a triagem nao perder a estrutura."
            title="Triagem da fila"
          >
            <ContextSubsidebarSection
              description="As ferramentas da fila aparecem no mesmo lugar assim que os dados forem liberados."
              title="Carregando filtros"
            >
              <div className="space-y-3">
                <LoadingBlock className="h-16" />
                <LoadingBlock className="h-16" />
                <LoadingBlock className="h-16" />
                <LoadingBlock className="h-16" />
              </div>
            </ContextSubsidebarSection>
          </ContextSubsidebar>
        }
        main={
          <div className="space-y-4">
            <SummaryStrip>
              <LoadingBlock className="h-[76px] min-w-[160px] flex-1" />
              <LoadingBlock className="h-[76px] min-w-[160px] flex-1" />
              <LoadingBlock className="h-[76px] min-w-[160px] flex-1" />
              <LoadingBlock className="h-[76px] min-w-[160px] flex-1" />
            </SummaryStrip>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.28fr)]">
              <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
                <div className="mb-4 space-y-2">
                  <LoadingBlock className="h-6 w-40" />
                  <LoadingBlock className="h-4 w-80 max-w-full" />
                </div>
                <div className="space-y-3">
                  <LoadingBlock className="h-44" />
                  <LoadingBlock className="h-44" />
                  <LoadingBlock className="h-44" />
                </div>
              </section>

              <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(19,33,79,0.08)] xl:sticky xl:top-4">
                <div className="mb-4 space-y-2">
                  <LoadingBlock className="h-6 w-36" />
                  <LoadingBlock className="h-4 w-52 max-w-full" />
                </div>
                <LoadingBlock className="h-[420px]" />
              </section>
            </div>
          </div>
        }
      />
    </div>
  );
}

function SupportTicketLoadingScaffold() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-[28px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_16px_30px_rgba(19,33,79,0.08)]">
        <div className="flex flex-wrap items-center gap-3">
          <LoadingBlock className="h-9 w-40 rounded-full" />
          <LoadingBlock className="h-9 w-24 rounded-full" />
          <LoadingBlock className="h-6 w-40" />
        </div>
        <LoadingBlock className="h-12 w-[720px] max-w-full" />
        <div className="grid gap-3 border-t border-[color:var(--color-border)] pt-4 lg:grid-cols-4">
          <LoadingBlock className="h-14" />
          <LoadingBlock className="h-14" />
          <LoadingBlock className="h-14" />
          <LoadingBlock className="h-14" />
        </div>
        <div className="flex flex-wrap gap-6 border-t border-[color:var(--color-border)] pt-4">
          <LoadingBlock className="h-6 w-24" />
          <LoadingBlock className="h-6 w-32" />
          <LoadingBlock className="h-6 w-32" />
          <LoadingBlock className="h-6 w-28" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.74fr)_minmax(318px,0.26fr)]">
        <section className="overflow-hidden rounded-[28px] border border-[color:var(--color-border)] bg-white shadow-[0_16px_30px_rgba(19,33,79,0.08)]">
          <div className="px-5 py-4">
            <div className="flex justify-center">
              <LoadingBlock className="h-7 w-20 rounded-full" />
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <LoadingBlock className="h-11 w-11 rounded-full" />
                <LoadingBlock className="h-24 flex-1" />
              </div>
              <div className="flex justify-end gap-3">
                <LoadingBlock className="h-24 w-[78%]" />
                <LoadingBlock className="h-11 w-11 rounded-full" />
              </div>
              <div className="flex items-start gap-3">
                <LoadingBlock className="h-11 w-11 rounded-full" />
                <LoadingBlock className="h-28 w-[82%]" />
              </div>
            </div>
          </div>

          <div className="border-t border-[color:var(--color-border)] px-5 py-5">
            <div className="mb-4 flex gap-4">
              <LoadingBlock className="h-7 w-32" />
              <LoadingBlock className="h-7 w-28" />
            </div>
            <LoadingBlock className="h-48 rounded-[26px]" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <LoadingBlock className="h-10 w-10 rounded-full" />
                <LoadingBlock className="h-10 w-10 rounded-full" />
                <LoadingBlock className="h-10 w-10 rounded-full" />
              </div>
              <LoadingBlock className="h-12 w-80 max-w-full rounded-full" />
              <LoadingBlock className="h-12 w-40 rounded-full" />
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <LoadingBlock className="h-[340px] rounded-[24px]" />
          <LoadingBlock className="h-[180px] rounded-[24px]" />
          <LoadingBlock className="h-[180px] rounded-[24px]" />
        </aside>
      </div>
    </div>
  );
}

function humanizeTicketEventLabel(eventType: SupportTicketTimelineItem['eventType']) {
  switch (eventType) {
    case 'ticket_created':
      return 'Ticket criado';
    case 'assigned':
      return 'Responsavel atualizado';
    case 'status_changed':
      return 'Status atualizado';
    case 'message_added':
      return 'Mensagem registrada';
    case 'internal_note_added':
      return 'Nota interna registrada';
    case 'resolved':
      return 'Ticket resolvido';
    case 'cancelled':
      return 'Ticket cancelado';
    default:
      return humanizeToken(eventType ?? 'evento').replaceAll('_', ' ');
  }
}

function humanizeKnowledgeLinkType(linkType: TicketKnowledgeLinkType) {
  switch (linkType) {
    case 'reference_internal':
      return 'Referencia interna';
    case 'sent_to_customer':
      return 'Link enviado ao cliente';
    case 'documentation_gap':
      return 'Lacuna de documentacao';
    case 'needs_update':
      return 'Precisa revisao';
    case 'suggested_article':
      return 'Artigo sugerido';
    default:
      return humanizeToken(linkType).replaceAll('_', ' ');
  }
}

function toneForKnowledgeLinkType(linkType: TicketKnowledgeLinkType) {
  if (linkType === 'sent_to_customer') {
    return 'positive' as const;
  }

  if (linkType === 'documentation_gap' || linkType === 'needs_update') {
    return 'warning' as const;
  }

  if (linkType === 'suggested_article') {
    return 'accent' as const;
  }

  return 'default' as const;
}

function toneForAlertSeverity(severity: SupportCustomerAccountAlert['severity']) {
  if (severity === 'critical') {
    return 'critical' as const;
  }

  if (severity === 'high' || severity === 'warning') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function toneForCustomizationRisk(
  riskLevel: SupportCustomerAccountCustomization['riskLevel'],
) {
  if (riskLevel === 'critical') {
    return 'critical' as const;
  }

  if (riskLevel === 'high' || riskLevel === 'medium') {
    return 'warning' as const;
  }

  return 'default' as const;
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
  return `${agent.fullName} · ${humanizeSupportRole(agent.role)}`;
}

function formatAssignedAgentSummary(agent: SupportAssignableAgent | null) {
  if (!agent) {
    return null;
  }

  return agent.fullName;
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

function emptyTicketKnowledgeLinks(): SupportTicketKnowledgeLink[] {
  return [];
}

function emptyKnowledgeArticlePicker(): SupportKnowledgeArticlePickerItem[] {
  return [];
}

function buildStatusChoices(currentStatus: TicketStatus) {
  const available = TICKET_STATUSES.filter(
    (status): status is TicketStatusUpdateTarget =>
      status !== 'closed' && status !== currentStatus,
  );

  if (currentStatus === 'closed') {
    return available;
  }

  return [currentStatus as TicketStatusUpdateTarget, ...available];
}

function friendlyTicketStatusErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid ticket status transition') ||
    normalized.includes('status transition')
  ) {
    return 'Nao foi possivel alterar o status. Verifique a etapa atual do ticket e tente novamente.';
  }

  return message;
}

function summarizeTimelineEvent(entry: SupportTicketTimelineItem) {
  if (entry.entryType === 'message') {
    return entry.body ?? '';
  }

  const metadata = readTimelineMetadata(entry);
  const statusValue = readTimelineMetadataString(entry, 'status');
  const assignedToUserId = readTimelineMetadataString(entry, 'assigned_to_user_id');
  const note = readTimelineMetadataString(entry, 'note');

  if (entry.eventType === 'status_changed' && statusValue) {
    return `Status movido para ${humanizeStatus(statusValue as TicketStatus)}.`;
  }

  if (entry.eventType === 'assigned') {
    if (entry.actorFullName) {
      return `${entry.actorFullName} atualizou a responsavel do ticket.`;
    }

    if (assignedToUserId) {
      return 'Responsavel do ticket atualizado.';
    }
  }

  if (entry.eventType === 'ticket_created') {
    return 'Ticket aberto na fila de atendimento.';
  }

  if (entry.eventType === 'message_added') {
    return 'Mensagem registrada no ticket.';
  }

  if (entry.eventType === 'internal_note_added') {
    return 'Nota interna registrada na tratativa.';
  }

  if (entry.eventType === 'resolved') {
    return 'Ticket marcado como resolvido.';
  }

  if (entry.eventType === 'cancelled') {
    return 'Ticket cancelado.';
  }

  if (note) {
    return note;
  }

  const metadataSummary =
    metadata
      ? Object.entries(metadata)
          .map(([key, value]) => `${humanizeToken(key)}: ${String(value)}`)
          .join(' · ')
      : '';

  return metadataSummary || humanizeTicketEventLabel(entry.eventType);
}

type ConversationLane = 'customer' | 'agent' | 'internal';

type ConversationAttachment = {
  name: string;
  sizeLabel: string | null;
};

function initialsFromLabel(value: string | null | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');

  return normalized || 'GS';
}

function readTimelineMetadata(entry: SupportTicketTimelineItem) {
  if (!entry.metadata || typeof entry.metadata !== 'object' || Array.isArray(entry.metadata)) {
    return null;
  }

  return entry.metadata;
}

function readTimelineMetadataString(
  entry: SupportTicketTimelineItem,
  ...keys: string[]
) {
  const metadata = readTimelineMetadata(entry);
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveConversationLane(
  entry: SupportTicketTimelineItem,
  requesterName?: string | null,
): ConversationLane {
  const metadataLane = readTimelineMetadataString(
    entry,
    'conversation_lane',
    'conversationLane',
    'lane',
  );

  if (metadataLane === 'customer' || metadataLane === 'agent' || metadataLane === 'internal') {
    return metadataLane;
  }

  if (entry.visibility === 'internal') {
    return 'internal';
  }

  const actorName = `${entry.actorFullName ?? ''} ${entry.actorEmail ?? ''}`.toLowerCase();
  const requesterToken = String(requesterName ?? '').trim().toLowerCase();
  if (requesterToken && actorName.includes(requesterToken)) {
    return 'customer';
  }

  return entry.actorUserId ? 'agent' : 'customer';
}

function resolveConversationAuthor(
  entry: SupportTicketTimelineItem,
  requesterName?: string | null,
) {
  const metadataAuthor = readTimelineMetadataString(
    entry,
    'conversation_author',
    'conversationAuthor',
    'author_label',
  );

  if (metadataAuthor) {
    return metadataAuthor;
  }

  if (entry.visibility === 'internal') {
    return entry.actorFullName ?? entry.actorEmail ?? 'Equipe interna';
  }

  if (entry.actorUserId) {
    return entry.actorFullName ?? entry.actorEmail ?? 'Agente Genius';
  }

  return entry.actorFullName ?? entry.actorEmail ?? requesterName ?? 'Cliente';
}

function resolveConversationAttachment(
  entry: SupportTicketTimelineItem,
): ConversationAttachment | null {
  const attachmentName = readTimelineMetadataString(
    entry,
    'attachment_name',
    'attachmentName',
    'attachment_label',
  );

  if (!attachmentName) {
    return null;
  }

  const sizeLabel =
    readTimelineMetadataString(entry, 'attachment_size_label', 'attachmentSizeLabel') ??
    (() => {
      const metadata = readTimelineMetadata(entry);
      if (!metadata) {
        return null;
      }

      const sizeKb = metadata.attachment_size_kb ?? metadata.attachmentSizeKb;
      if (typeof sizeKb === 'number' && Number.isFinite(sizeKb)) {
        return `${sizeKb} KB`;
      }

      return null;
    })();

  return {
    name: attachmentName,
    sizeLabel,
  };
}

function buildConversationDividerLabel(entries: SupportTicketTimelineItem[]) {
  if (entries.length === 0) {
    return null;
  }

  const latest = new Date(entries[entries.length - 1].occurredAt);
  const now = new Date();
  const sameDay =
    latest.getFullYear() === now.getFullYear() &&
    latest.getMonth() === now.getMonth() &&
    latest.getDate() === now.getDate();

  if (sameDay) {
    return 'Hoje';
  }

  return latest.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function ConversationEntry({
  entry,
  requesterName,
}: {
  entry: SupportTicketTimelineItem;
  requesterName?: string | null;
}) {
  const summary = summarizeTimelineEvent(entry);
  const lane = resolveConversationLane(entry, requesterName);
  const author = resolveConversationAuthor(entry, requesterName);
  const attachment = resolveConversationAttachment(entry);
  const label =
    lane === 'internal'
      ? 'Nota interna'
      : lane === 'agent'
        ? 'Agente'
        : 'Cliente';
  const timestamp = formatDateTime(entry.occurredAt);
  const avatar = initialsFromLabel(author);

  if (lane === 'internal') {
    return (
      <article className="mx-auto max-w-[92%] rounded-[15px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,248,227,0.98),rgba(255,241,206,0.94))] px-3 py-2 shadow-[0_6px_14px_rgba(180,120,34,0.05)]">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <StatusPill tone="warning">{label}</StatusPill>
          <p className="font-semibold text-[color:var(--color-ink)]">{author}</p>
          <span className="ml-auto text-[color:var(--color-muted)]">{timestamp}</span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.3rem] text-[color:var(--color-ink)]">
          {summary}
        </p>
      </article>
    );
  }

  return (
    <div
      className={cx(
        'flex items-end gap-2.5',
        lane === 'agent' ? 'justify-end' : 'justify-start',
      )}
    >
      {lane === 'customer' ? (
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f05b93,#ee3f77)] text-[13px] font-semibold text-white shadow-[0_6px_14px_rgba(240,91,147,0.2)]">
          {avatar}
        </div>
      ) : null}

      <div
        className={cx(
          'min-w-0 max-w-[min(88%,43rem)] space-y-0.5',
          lane === 'agent' && 'items-end',
        )}
      >
        <div
          className={cx(
            'flex flex-wrap items-center gap-1.5 px-1 text-[10px]',
            lane === 'agent' ? 'justify-end' : 'justify-start',
          )}
        >
          <p className="font-semibold text-[color:var(--color-ink)]">{author}</p>
          <span className="text-[color:var(--color-muted)]">{label}</span>
          <span className="text-[color:var(--color-muted)]">{timestamp}</span>
        </div>
        <article
          className={cx(
            'min-w-0 rounded-[15px] border px-3 py-2 shadow-[0_6px_14px_rgba(19,33,79,0.05)]',
            lane === 'agent'
              ? 'border-[rgba(48,127,226,0.24)] bg-[linear-gradient(180deg,rgba(243,248,255,0.98),rgba(236,244,255,0.92))]'
              : 'border-[color:var(--color-border)] bg-white',
          )}
        >
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-[12.5px] leading-[1.3rem] text-[color:var(--color-ink)]">
              {summary}
            </p>
            {attachment ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[11px] border border-[color:var(--color-border)] bg-white/86 px-3 py-1.5 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[color:var(--color-ink)]">
                    {attachment.name}
                  </p>
                </div>
                {attachment.sizeLabel ? (
                  <span className="shrink-0 text-xs text-[color:var(--color-muted)]">
                    {attachment.sizeLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>
      </div>

      {lane === 'agent' ? (
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1f5dcf,#377ef7)] text-[13px] font-semibold text-white shadow-[0_6px_14px_rgba(55,126,247,0.18)]">
          {avatar}
        </div>
      ) : null}
    </div>
  );
}

function TechnicalTimelineRow({
  entry,
}: {
  entry: SupportTicketTimelineItem;
}) {
  const summary = summarizeTimelineEvent(entry);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={entry.visibility === 'internal' ? 'critical' : 'default'}>
            {entry.eventType ? humanizeToken(entry.eventType) : 'evento'}
          </StatusPill>
          <p className="text-xs text-[color:var(--color-muted)]">
            {entry.actorFullName ?? entry.actorEmail ?? 'Ator nao resolvido'}
          </p>
        </div>
        <p className="text-sm leading-6 text-[color:var(--color-ink)]">{summary}</p>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">{formatDateTime(entry.occurredAt)}</p>
    </div>
  );
}

function SupportConversation({
  window,
  requesterName,
}: {
  window: SupportTicketTimelineRecentWindow;
  requesterName?: string | null;
}) {
  const entries = window.entries;
  const conversationEntries = entries.filter((entry) => entry.entryType === 'message');
  const eventEntries = entries.filter((entry) => entry.entryType === 'event');
  const dividerLabel = buildConversationDividerLabel(conversationEntries);

  if (conversationEntries.length === 0 && eventEntries.length === 0) {
    return (
      <EmptyState
        title="Conversa vazia"
        description="Este ticket ainda nao recebeu mensagens, notas internas nem eventos adicionais."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {dividerLabel ? (
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            {dividerLabel}
          </span>
        </div>
      ) : null}
      {conversationEntries.length === 0 ? (
        <EmptyState
          title="Sem conversa recente"
          description="A janela atual ainda nao trouxe respostas publicas nem notas internas para este ticket."
        />
      ) : (
        <div className="space-y-1">
          {conversationEntries.map((entry) => (
            <ConversationEntry
              entry={entry}
              key={entry.timelineEntryId}
              requesterName={requesterName}
            />
          ))}
        </div>
      )}

      {window.hasMore ? (
        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
          Historico anterior recolhido para manter a leitura rapida.
        </p>
      ) : null}
    </div>
  );
}

function SupportRecentActivity({
  window,
}: {
  window: SupportTicketTimelineRecentWindow;
}) {
  const entries = window.entries.filter((entry) => entry.entryType === 'event').slice(0, 2);

  if (entries.length === 0) {
    return (
      <p className="text-[12px] leading-5 text-[color:var(--color-muted)]">
        Nenhuma mudanca recente apareceu fora da conversa principal.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          className="rounded-[13px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
          key={entry.timelineEntryId}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-brand-blue)]" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[12px] font-medium leading-4 text-[color:var(--color-ink)]">
                {summarizeTimelineEvent(entry)}
              </p>
              <p className="text-[10.5px] leading-4 text-[color:var(--color-muted)]">
                {formatDateTime(entry.occurredAt)} · {entry.actorFullName ?? entry.actorEmail ?? 'Equipe Genius'}
              </p>
            </div>
          </div>
        </div>
      ))}

      {window.hasMore ? (
        <p className="text-[10.5px] leading-4 text-[color:var(--color-muted)]">
          O restante do historico fica recolhido para manter a tratativa leve.
        </p>
      ) : null}
    </div>
  );
}

function SupportTechnicalHistory({
  window,
}: {
  window: SupportTicketTimelineRecentWindow;
}) {
  const eventEntries = window.entries.filter((entry) => entry.entryType === 'event');

  if (eventEntries.length === 0) {
    return (
      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
        Nenhum registro adicional apareceu fora da conversa principal.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-5 text-[color:var(--color-muted)]">
        Mostrando {eventEntries.length} registro(s) de apoio dentro de {window.totalAvailableCount} itens recentes.
      </p>
      {eventEntries.map((entry) => (
        <TechnicalTimelineRow key={entry.timelineEntryId} entry={entry} />
      ))}
    </div>
  );
}

function SupportKnowledgeLinkCard({
  link,
  disabled,
  onArchive,
}: {
  link: SupportTicketKnowledgeLink;
  disabled: boolean;
  onArchive: (linkId: Uuid) => void;
}) {
  const title =
    link.articleTitle ??
    (link.linkType === 'documentation_gap'
      ? 'Lacuna registrada sem artigo'
      : 'Vinculo sem artigo associado');

  return (
    <article className="rounded-[13px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={toneForKnowledgeLinkType(link.linkType)}>
              {humanizeKnowledgeLinkType(link.linkType)}
            </StatusPill>
            {link.articleVisibility ? (
              <StatusPill>{humanizeKnowledgeVisibility(link.articleVisibility)}</StatusPill>
            ) : null}
            {link.articleStatus ? (
              <StatusPill>{humanizeKnowledgeStatus(link.articleStatus)}</StatusPill>
            ) : null}
          </div>
          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold text-[color:var(--color-ink)]">{title}</p>
            <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
              Registrado por {link.createdByFullName ?? 'Operador nao identificado'} em{' '}
              {formatDateTime(link.createdAt)}
            </p>
          </div>
          {link.note ? (
            <p className="line-clamp-2 text-[12px] leading-5 text-[color:var(--color-muted)]">
              {link.note}
            </p>
          ) : null}
        </div>
        <GhostButton
          className="min-h-8 rounded-full px-2.5 text-[13px]"
          disabled={disabled}
          onClick={() => onArchive(link.ticketKnowledgeLinkId)}
          type="button"
        >
          Arquivar
        </GhostButton>
      </div>
    </article>
  );
}

function SupportKnowledgePickerCard({
  article,
  disabled,
  onLinkInternal,
  onNeedsUpdate,
  onSendToCustomer,
}: {
  article: SupportKnowledgeArticlePickerItem;
  disabled: boolean;
  onLinkInternal: (articleId: Uuid) => void;
  onNeedsUpdate: (articleId: Uuid) => void;
  onSendToCustomer: (articleId: Uuid) => void;
}) {
  return (
    <article className="rounded-[13px] border border-[color:var(--color-border)] bg-white px-3 py-2.5">
      <div className="space-y-1.5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill>{humanizeKnowledgeVisibility(article.articleVisibility)}</StatusPill>
            <StatusPill>{humanizeKnowledgeStatus(article.articleStatus)}</StatusPill>
            {article.categoryName ? <StatusPill tone="accent">{article.categoryName}</StatusPill> : null}
          </div>
          <div className="space-y-0.5">
            <p className="text-[13px] font-semibold text-[color:var(--color-ink)]">
              {article.articleTitle}
            </p>
            <p className="line-clamp-2 text-[13px] leading-5 text-[color:var(--color-muted)]">
              {article.articleSummary?.trim() || 'Resumo ainda nao informado para este artigo.'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
            {article.isCustomerSendAllowed
              ? 'Este artigo pode ser usado como link publico ao cliente.'
              : 'Este artigo fica restrito ao uso interno do time.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <GhostButton
              className="min-h-9 px-2.5 text-[13px]"
              disabled={disabled}
              onClick={() => onLinkInternal(article.articleId)}
              type="button"
            >
              Referencia interna
            </GhostButton>
            {article.isCustomerSendAllowed ? (
              <AppButton
                className="min-h-9 px-3"
                disabled={disabled}
                onClick={() => onSendToCustomer(article.articleId)}
                type="button"
              >
                Marcar como link ao cliente
              </AppButton>
            ) : null}
            <GhostButton
              className="min-h-9 px-2.5 text-[13px]"
              disabled={disabled}
              onClick={() => onNeedsUpdate(article.articleId)}
              type="button"
            >
              Precisa revisao
            </GhostButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function SupportKnowledgePanel({
  articles,
  links,
  loading,
  noteDraft,
  onArchive,
  onLinkInternal,
  onMarkGap,
  onNeedsUpdate,
  onNoteChange,
  onSearchChange,
  onSendToCustomer,
  phase,
  search,
  message,
}: {
  articles: SupportKnowledgeArticlePickerItem[];
  links: SupportTicketKnowledgeLink[];
  loading: boolean;
  noteDraft: string;
  onArchive: (linkId: Uuid) => void;
  onLinkInternal: (articleId: Uuid) => void;
  onMarkGap: () => void;
  onNeedsUpdate: (articleId: Uuid) => void;
  onNoteChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSendToCustomer: (articleId: Uuid) => void;
  phase: KnowledgePhase;
  search: string;
  message: string | null;
}) {
  const visibleLinks = links.slice(0, 2);
  const hiddenLinksCount = Math.max(links.length - visibleLinks.length, 0);
  const visibleArticles = articles.slice(0, 2);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
          Conhecimento
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            Conteudo relacionado ao ticket
          </h3>
          <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
            {links.length === 0
              ? 'Nenhum vinculo ativo'
              : `${links.length} vinculo(s) acompanhando esta tratativa`}
          </p>
        </div>
      </div>

      {phase === 'contract-unavailable' ? (
        <InlineNotice tone="warning">
          {message ?? 'O painel de conhecimento ainda nao ficou disponivel para esta tratativa.'}
        </InlineNotice>
      ) : phase === 'error' ? (
        <InlineNotice tone="critical">
          {message ?? 'Nao foi possivel carregar o conhecimento relacionado deste ticket.'}
        </InlineNotice>
      ) : phase === 'loading' ? (
        <LoadingState
          title="Carregando conhecimento"
          description="Estamos preparando os vinculos e os artigos disponiveis para este ticket."
        />
      ) : (
        <>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.94fr)_minmax(260px,0.82fr)]">
            <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
                  Vinculos ativos
                </h4>
                <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                  {links.length === 0
                    ? 'Nenhum artigo ligado'
                    : `${links.length} referencia(s) em acompanhamento`}
                </p>
              </div>
              {links.length === 0 ? (
                <InlineNotice>
                  Nenhum artigo foi relacionado a este ticket ainda.
                </InlineNotice>
              ) : (
                <div className="space-y-1.5">
                  {visibleLinks.map((link) => (
                    <SupportKnowledgeLinkCard
                      disabled={loading}
                      key={link.ticketKnowledgeLinkId}
                      link={link}
                      onArchive={onArchive}
                    />
                  ))}
                  {hiddenLinksCount > 0 ? (
                    <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                      Mais {hiddenLinksCount} vinculo(s) seguem no historico deste ticket.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
              <div className="space-y-1">
                <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
                  Buscar e vincular
                </h4>
                <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                  Relacione artigos internos ou marque lacunas para a proxima tratativa.
                </p>
              </div>

              <TextInput
                className="min-h-10"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar artigo por titulo, resumo ou categoria"
                value={search}
              />

              <TextareaInput
                className="min-h-[84px]"
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Observacao curta opcional para o proximo operador."
                value={noteDraft}
              />

              <GhostButton
                className="min-h-9 px-3 text-[13px]"
                disabled={loading}
                onClick={onMarkGap}
                type="button"
              >
                Marcar lacuna de documentacao
              </GhostButton>
            </div>
          </div>

          <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
                Sugestoes disponiveis
              </h4>
              <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                {articles.length === 0 ? 'Sem resultados para o filtro atual' : `${articles.length} artigo(s) encontrados`}
              </p>
            </div>

            {articles.length === 0 ? (
              <InlineNotice tone="warning">
                Nenhum artigo permitido apareceu para este filtro.
              </InlineNotice>
            ) : (
              <div className="grid gap-2 xl:grid-cols-2">
                {visibleArticles.map((article) => (
                  <SupportKnowledgePickerCard
                    article={article}
                    disabled={loading}
                    key={article.articleId}
                    onLinkInternal={onLinkInternal}
                    onNeedsUpdate={onNeedsUpdate}
                    onSendToCustomer={onSendToCustomer}
                  />
                ))}
              </div>
            )}

            {articles.length > visibleArticles.length ? (
              <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                Ajuste a busca para abrir outros artigos desta base.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function SupportHelpPanel({
  articles,
  links,
}: {
  articles: SupportKnowledgeArticlePickerItem[];
  links: SupportTicketKnowledgeLink[];
}) {
  const publicArticles = articles.filter((article) => article.isCustomerSendAllowed).slice(0, 3);
  const publicLinks = links
    .filter(
      (link) =>
        link.linkType === 'sent_to_customer' ||
        (link.articleVisibility != null && link.articleVisibility !== 'internal'),
    )
    .slice(0, 3);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
          Central de ajuda
        </p>
        <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
          Conteudo publico sugerido para esta tratativa
        </h3>
        <p className="text-[12px] leading-5 text-[color:var(--color-muted)]">
          Use este painel para validar se ja existe material publico pronto antes de responder o cliente.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(260px,0.8fr)]">
        <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
              Artigos prontos para cliente
            </h4>
            <Link
              className="text-[12px] font-semibold text-[color:var(--color-brand-blue)]"
              to="/help/genius"
            >
              Abrir central
            </Link>
          </div>

          {publicArticles.length === 0 ? (
            <EmptyState
              title="Nenhum artigo publico sugerido"
              description="Quando um conteudo puder ser compartilhado com o cliente, ele aparecera aqui."
            />
          ) : (
            <div className="space-y-2">
              {publicArticles.map((article) => (
                <article
                  className="rounded-[14px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2.5"
                  key={article.articleId}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill>{humanizeKnowledgeVisibility(article.articleVisibility)}</StatusPill>
                    <StatusPill>{humanizeKnowledgeStatus(article.articleStatus)}</StatusPill>
                    {article.categoryName ? <StatusPill tone="accent">{article.categoryName}</StatusPill> : null}
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-[color:var(--color-ink)]">
                    {article.articleTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[color:var(--color-muted)]">
                    {article.articleSummary?.trim() || 'Resumo ainda nao informado para este artigo.'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
          <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
            Conteudos ja relacionados
          </h4>
          {publicLinks.length === 0 ? (
            <InlineNotice>
              Ainda nao existe conteudo publico marcado para este ticket.
            </InlineNotice>
          ) : (
            <div className="space-y-1.5">
              {publicLinks.map((link) => (
                <div
                  className="rounded-[14px] border border-[color:var(--color-border)] bg-white px-3 py-2"
                  key={link.ticketKnowledgeLinkId}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill tone={toneForKnowledgeLinkType(link.linkType)}>
                      {humanizeKnowledgeLinkType(link.linkType)}
                    </StatusPill>
                    {link.articleVisibility ? (
                      <StatusPill>{humanizeKnowledgeVisibility(link.articleVisibility)}</StatusPill>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-[color:var(--color-ink)]">
                    {link.articleTitle ?? 'Conteudo publico relacionado'}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[color:var(--color-muted)]">
                    Vinculado em {formatDateTime(link.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[14px] border border-dashed border-[rgba(48,127,226,0.28)] bg-white/72 px-3 py-2.5">
            <p className="text-[12px] leading-5 text-[color:var(--color-muted)]">
              Quando nao houver conteudo pronto, siga pela resposta publica normal e deixe a lacuna registrada na aba Conhecimento.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupportMoreActionsPanel({
  closeReason,
  canClose,
  canReopen,
  canUpdateStatus,
  onCloseReasonChange,
  onCloseSubmit,
  onReopenReasonChange,
  onReopenSubmit,
  onStatusNoteChange,
  onStatusSubmit,
  reopenReason,
  statusNote,
  submitting,
  window,
}: {
  closeReason: string;
  canClose: boolean;
  canReopen: boolean;
  canUpdateStatus: boolean;
  onCloseReasonChange: (value: string) => void;
  onCloseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReopenReasonChange: (value: string) => void;
  onReopenSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusNoteChange: (value: string) => void;
  onStatusSubmit: (event: FormEvent<HTMLFormElement>) => void;
  reopenReason: string;
  statusNote: string;
  submitting: boolean;
  window: SupportTicketTimelineRecentWindow;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
          Mais acoes
        </p>
        <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
          Movimentos secundarios da tratativa
        </h3>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(260px,0.8fr)]">
        <div className="space-y-3">
          <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
            <form className="space-y-2.5" onSubmit={onStatusSubmit}>
              <Field
                label="Atualizar com observacao"
                description="Use quando a mudanca de andamento precisa registrar o contexto operacional."
              >
                <TextareaInput
                  className="min-h-[96px]"
                  onChange={(event) => onStatusNoteChange(event.target.value)}
                  placeholder="Descreva o proximo passo ou o motivo da mudanca."
                  value={statusNote}
                />
              </Field>
              <AppButton
                className="min-h-10 rounded-[14px] px-4.5"
                disabled={submitting || !canUpdateStatus}
                type="submit"
              >
                {submitting ? 'Atualizando...' : 'Salvar status com observacao'}
              </AppButton>
            </form>
          </section>

          {(canClose || canReopen) ? (
            <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
              <div className="space-y-3">
                {canClose ? (
                  <form className="space-y-2.5" onSubmit={onCloseSubmit}>
                    <Field label="Motivo do fechamento">
                      <TextareaInput
                        className="min-h-[96px]"
                        onChange={(event) => onCloseReasonChange(event.target.value)}
                        placeholder="Obrigatorio para encerrar."
                        value={closeReason}
                      />
                    </Field>
                    <AppButton
                      className="min-h-10 rounded-[14px] bg-[linear-gradient(135deg,#8b1e3f,#c3365e)] px-4.5"
                      disabled={submitting || closeReason.trim().length === 0}
                      type="submit"
                    >
                      {submitting ? 'Fechando...' : 'Fechar ticket'}
                    </AppButton>
                  </form>
                ) : null}

                {canReopen ? (
                  <form className="space-y-2.5 border-t border-[color:var(--color-border)] pt-3" onSubmit={onReopenSubmit}>
                    <Field label="Motivo da reabertura">
                      <TextareaInput
                        className="min-h-[84px]"
                        onChange={(event) => onReopenReasonChange(event.target.value)}
                        placeholder="Opcional para reabrir."
                        value={reopenReason}
                      />
                    </Field>
                    <GhostButton className="min-h-10 w-full px-4" disabled={submitting} type="submit">
                      {submitting ? 'Reabrindo...' : 'Reabrir ticket'}
                    </GhostButton>
                  </form>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <section className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-[color:var(--color-ink)]">
              Historico de apoio
            </h4>
            <SupportTechnicalHistory window={window} />
          </div>
        </section>
      </div>
    </section>
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
        'rounded-[20px] border p-4 transition',
        isSelected
          ? 'border-[rgba(48,127,226,0.46)] bg-[rgba(48,127,226,0.08)] shadow-[0_10px_22px_rgba(19,33,79,0.08)]'
          : 'border-[color:var(--color-border)] bg-white hover:border-[rgba(48,127,226,0.24)] hover:bg-[rgba(255,255,255,0.98)]',
      )}
    >
      <button
        className="block w-full min-w-0 text-left"
        onClick={onSelect}
        type="button"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill tone={toneForTicketStatus(ticket.status)}>
            {humanizeStatus(ticket.status)}
          </StatusPill>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
            {humanizeToken(ticket.priority)} · {humanizeToken(ticket.severity)}
          </p>
        </div>

        <div className="mt-3 min-w-0 space-y-2">
          <h3 className="line-clamp-2 max-w-full text-lg font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {ticket.title}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
            <span>Cliente: {ticketTenantLabel(ticket)}</span>
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
    (ticket ? ticketTenantLabel(ticket) : 'Cliente nao resolvido');
  const assigned =
    detail?.assignedToFullName ?? ticket?.assignedToFullName ?? 'Nao atribuido';
  const lastActivity = formatDateTime(
    detail?.lastMessageAt ?? detail?.updatedAt ?? ticket?.lastMessageAt ?? ticket?.updatedAt ?? null,
  );
  const tenantId = detail?.tenantId ?? ticket?.tenantId ?? null;
  const ticketId = detail?.id ?? ticket?.id ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-[rgba(48,127,226,0.22)] bg-[linear-gradient(180deg,rgba(17,28,66,1),rgba(24,42,97,0.98))] px-5 py-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={toneForTicketStatus(detail?.status ?? ticket?.status ?? 'new')}>
            {humanizeStatus((detail?.status ?? ticket?.status ?? 'new') as TicketStatus)}
          </StatusPill>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/66">
            {humanizeToken(detail?.priority ?? ticket?.priority ?? 'normal')} ·{' '}
            {humanizeToken(detail?.severity ?? ticket?.severity ?? 'low')}
          </span>
        </div>

        <div className="mt-4 min-w-0 space-y-2">
          <h3 className="line-clamp-3 text-[1.45rem] font-semibold tracking-[-0.05em]">{title}</h3>
          <div className="space-y-1 text-sm text-white/72">
            <p>Cliente B2B: {tenant}</p>
            <p>Responsavel: {assigned}</p>
            <p>Ultima atividade: {lastActivity}</p>
          </div>
        </div>

        {ticketId ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[color:var(--color-brand-navy)]"
              to={`/support/tickets/${ticketId}`}
            >
              Atender ticket
            </Link>
            {tenantId ? (
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/22 px-5 py-2 text-sm font-semibold text-white"
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
  embedded = false,
}: {
  filters: QueueFilters;
  tenantOptions: Array<{ id: string; label: string }>;
  assigneeOptions: Array<{ id: string; label: string }>;
  onChange: (next: QueueFilters) => void;
  onRefresh: () => void;
  embedded?: boolean;
}) {
  const content = (
    <>
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

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-1">
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

        <Field label="Cliente">
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      {content}
    </div>
  );
}

function SupportCustomerRail({
  accountContext,
  customer,
  recentTicketsWindow,
  recentEventsWindow,
  compact = false,
}: {
  accountContext: SupportCustomerAccountContext | null;
  customer: SupportCustomer360 | null;
  recentTicketsWindow: SupportCustomerRecentTicketsWindow;
  recentEventsWindow: SupportCustomerRecentEventsWindow;
  compact?: boolean;
}) {
  if (!customer) {
    return (
        <EmptyState
          title="Contexto do cliente indisponivel"
          description="O contexto deste cliente ainda nao ficou disponivel para a tratativa."
        />
    );
  }

  const contacts = customer.activeContacts.slice(0, compact ? 2 : 4);
  const recentTickets = recentTicketsWindow.tickets.slice(0, compact ? 3 : recentTicketsWindow.tickets.length);
  const recentEvents = recentEventsWindow.events.slice(0, compact ? 2 : recentEventsWindow.events.length);
  const primaryContact = primaryContactFromCustomer(customer);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>{customer.tenantStatus}</StatusPill>
              <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
            </div>
            <h3 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
              {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
            </h3>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              {customer.activeContactsCount} contatos ativos · {customer.openTicketCount} tickets abertos
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
            to={`/support/customers/${customer.tenantId}`}
          >
            Abrir cliente
          </Link>
        </div>

        <SupportAccountContextCompact accountContext={accountContext} customer={customer} />

        <details className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
            Atividade recente e contato
          </summary>
          <div className="mt-3 space-y-3">
            {primaryContact ? (
              <div className="rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[color:var(--color-ink)]">{primaryContact.fullName}</p>
                  {primaryContact.isPrimary ? <StatusPill tone="accent">principal</StatusPill> : null}
                </div>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">{primaryContact.email}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Tickets recentes
              </p>
              {recentTickets.length === 0 ? (
                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                    Nenhum ticket recente apareceu por aqui.
                  </p>
              ) : (
                <div className="space-y-2">
                  {recentTickets.map((ticket) => (
                    <SupportRecentTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Eventos recentes
              </p>
              {recentEvents.length === 0 ? (
                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                    Nenhum evento recente apareceu por aqui.
                  </p>
              ) : (
                recentEvents.map((event) => (
                  <SupportRecentEventCard
                    event={event}
                    key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`}
                  />
                ))
              )}
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>{customer.tenantStatus}</StatusPill>
              <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
            </div>
            <h3 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
              {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
            </h3>
          </div>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
            to={`/support/customers/${customer.tenantId}`}
          >
            Ver contexto
          </Link>
        </div>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
          {customer.tenantLegalName ?? 'Razao social nao resolvida'}
        </p>
      </div>

      <div className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <SupportAccountContextCompact accountContext={accountContext} customer={customer} />
      </div>

      <div className="space-y-2 rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Tickets recentes</h4>
            <p className="text-xs leading-5 text-[color:var(--color-muted)]">
              Mostrando {recentTickets.length} de {recentTicketsWindow.totalAvailableCount} tickets recentes.
            </p>
        </div>
        {recentTickets.length === 0 ? (
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            Nenhum ticket recente apareceu por aqui.
          </p>
        ) : (
          recentTickets.map((ticket) => <SupportRecentTicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>

      <details className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
          Contatos e eventos recentes
        </summary>
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">Contatos ativos</h4>
            {contacts.length === 0 ? (
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Nenhum contato ativo disponivel no momento.
              </p>
            ) : (
              contacts.map((contact) => <SupportContactCard key={contact.id} contact={contact} />)
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs leading-5 text-[color:var(--color-muted)]">
              Mostrando {recentEvents.length} de {recentEventsWindow.totalAvailableCount} registros recentes.
            </p>
            {recentEvents.length === 0 ? (
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Nenhum evento recente apareceu por aqui.
              </p>
            ) : (
              recentEvents.map((event) => (
                <SupportRecentEventCard key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`} event={event} />
              ))
            )}
          </div>
        </div>
      </details>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
      className="block rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 transition hover:bg-white"
      to={`/support/tickets/${ticket.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill tone={toneForTicketStatus(ticket.status)}>{humanizeStatus(ticket.status)}</StatusPill>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          {humanizeToken(ticket.priority)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 font-medium text-[color:var(--color-ink)]">{ticket.title}</p>
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
      className="block rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3 transition hover:bg-white"
      to={`/support/tickets/${event.ticketId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill tone={event.visibility === 'internal' ? 'critical' : 'accent'}>{humanizeVisibility(event.visibility)}</StatusPill>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
          {humanizeToken(event.eventType)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 font-medium text-[color:var(--color-ink)]">{event.ticketTitle}</p>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        {formatDateTime(event.occurredAt)}
      </p>
    </Link>
  );
}

function primaryContactFromCustomer(customer: SupportCustomer360) {
  return customer.activeContacts.find((contact) => contact.isPrimary) ?? customer.activeContacts[0] ?? null;
}

function primaryPlatformFromContext(accountContext: SupportCustomerAccountContext | null) {
  return (
    accountContext?.integrations.find(
      (integration) => integration.integrationType === 'ecommerce_platform',
    ) ?? null
  );
}

function visibleOperationalIntegrations(accountContext: SupportCustomerAccountContext | null, limit: number) {
  if (!accountContext) {
    return [];
  }

  return accountContext.integrations
    .filter((integration) => integration.integrationType !== 'ecommerce_platform')
    .slice(0, limit);
}

function visibleRiskCustomizations(accountContext: SupportCustomerAccountContext | null, limit: number) {
  if (!accountContext) {
    return [];
  }

  return accountContext.activeCustomizations
    .filter((customization) => customization.riskLevel === 'high' || customization.riskLevel === 'critical')
    .slice(0, limit);
}

function visibleFeatureSlice(accountContext: SupportCustomerAccountContext | null, limit: number) {
  if (!accountContext) {
    return [];
  }

  return accountContext.enabledFeatures.slice(0, limit);
}

function visibleAlertSlice(accountContext: SupportCustomerAccountContext | null, limit: number) {
  if (!accountContext) {
    return [];
  }

  return accountContext.activeAlerts.slice(0, limit);
}

function SupportAccountContextCompact({
  accountContext,
  customer,
}: {
  accountContext: SupportCustomerAccountContext | null;
  customer: SupportCustomer360;
}) {
  if (!accountContext || !accountContext.profileId) {
    return (
      <InlineNotice tone="warning">
        Perfil operacional ainda nao cadastrado para este cliente. O suporte segue com contatos e tickets recentes, mas sem stack enriquecido.
      </InlineNotice>
    );
  }

  const primaryPlatform = primaryPlatformFromContext(accountContext);
  const integrations = visibleOperationalIntegrations(accountContext, 3);
  const features = visibleFeatureSlice(accountContext, 4);
  const alerts = visibleAlertSlice(accountContext, 2);
  const riskyCustomizations = visibleRiskCustomizations(accountContext, 2);
  const primaryContact = primaryContactFromCustomer(customer);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {accountContext.productLine ? (
          <StatusPill tone="accent">{humanizeCustomerValue(accountContext.productLine)}</StatusPill>
        ) : null}
        {accountContext.operationalStatus ? (
          <StatusPill tone={accountContext.operationalStatus === 'active' ? 'positive' : 'warning'}>
            {humanizeCustomerValue(accountContext.operationalStatus)}
          </StatusPill>
        ) : null}
        {accountContext.accountTier ? <StatusPill>{accountContext.accountTier}</StatusPill> : null}
      </div>

      <div className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
        <dl className="grid gap-3 text-sm leading-6 text-[color:var(--color-muted)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <dt className="font-medium text-[color:var(--color-ink)]">Plataforma</dt>
            <dd className="text-right">
              {primaryPlatform ? primaryPlatform.provider : 'Plataforma nao registrada'}
            </dd>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
            <dt className="font-medium text-[color:var(--color-ink)]">Integracoes</dt>
            <dd className="text-right">
              {integrations.length > 0
                ? integrations.map((integration) => integration.provider).join(' · ')
                : 'Sem integracoes principais'}
            </dd>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
            <dt className="font-medium text-[color:var(--color-ink)]">Contato operacional</dt>
            <dd className="text-right">
              {primaryContact ? `${primaryContact.fullName} · ${primaryContact.email}` : 'Nao resolvido'}
            </dd>
          </div>
        </dl>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <InlineNotice key={alert.id} tone={toneForAlertSeverity(alert.severity)}>
              <span className="font-semibold">{alert.title}</span>
              {`: ${alert.description}`}
            </InlineNotice>
          ))}
        </div>
      ) : null}

      {features.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
            Features ativas
          </p>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <StatusPill key={feature.featureKey}>{humanizeCustomerValue(feature.featureKey)}</StatusPill>
            ))}
          </div>
        </div>
      ) : null}

      {riskyCustomizations.length > 0 ? (
        <div className="space-y-2 rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
            Customizacoes com risco
          </p>
          <div className="space-y-2">
            {riskyCustomizations.map((customization) => (
              <div key={customization.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[color:var(--color-ink)]">
                    {customization.title}
                  </p>
                  <StatusPill tone={toneForCustomizationRisk(customization.riskLevel)}>
                    {humanizeCustomerValue(customization.riskLevel)}
                  </StatusPill>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-[color:var(--color-muted)]">
                  {customization.operationalNote ?? customization.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <details className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
          Detalhes operacionais recolhidos
        </summary>
        <div className="mt-3 space-y-3">
          {accountContext.integrations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Integracoes registradas
              </p>
              <div className="space-y-2">
                {accountContext.integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="rounded-[16px] bg-[color:var(--color-surface)] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[color:var(--color-ink)]">
                        {integration.provider}
                      </p>
                      <StatusPill>{humanizeCustomerValue(integration.integrationType)}</StatusPill>
                      <StatusPill tone={integration.status === 'active' ? 'positive' : 'warning'}>
                        {humanizeCustomerValue(integration.status)}
                      </StatusPill>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                      Ambiente: {humanizeCustomerValue(integration.environment)}
                      {integration.notes ? ` · ${integration.notes}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {accountContext.internalNotes ? (
            <div className="space-y-1 rounded-[16px] bg-[color:var(--color-surface)] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Observacao interna
              </p>
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                {accountContext.internalNotes}
              </p>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function SupportTicketCustomerSnapshot({
  accountContext,
  customer,
}: {
  accountContext: SupportCustomerAccountContext | null;
  customer: SupportCustomer360 | null;
}) {
  if (!customer) {
    return (
      <InlineNotice tone="warning">
        O contexto resumido do cliente ainda nao ficou disponivel para esta tratativa.
      </InlineNotice>
    );
  }

  const primaryContact = primaryContactFromCustomer(customer);

  if (!accountContext || !accountContext.profileId) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
              {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
            </p>
            <p className="text-[12px] leading-5 text-[color:var(--color-muted)]">
              {primaryContact ? `${primaryContact.fullName} · ${primaryContact.email}` : 'Contato principal nao resolvido'}
            </p>
          </div>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-[13px] font-semibold text-[color:var(--color-brand-blue)]"
            to={`/support/customers/${customer.tenantId}`}
          >
            Ver detalhes do cliente
          </Link>
        </div>
        <InlineNotice tone="warning">
          Perfil operacional ainda nao cadastrado. A tratativa segue com o contato principal e o historico recente do cliente.
        </InlineNotice>
      </div>
    );
  }

  const primaryPlatform = primaryPlatformFromContext(accountContext);

  return (
    <div className="space-y-1.5">
      <div className="space-y-1">
        <div className="min-w-0 space-y-1">
          <p className="text-[13px] font-semibold text-[color:var(--color-ink)]">
            {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
          </p>
          <div className="flex flex-wrap gap-1">
            {accountContext.productLine ? (
              <StatusPill tone="accent">{humanizeCustomerValue(accountContext.productLine)}</StatusPill>
            ) : null}
            {accountContext.operationalStatus ? (
              <StatusPill tone={accountContext.operationalStatus === 'active' ? 'positive' : 'warning'}>
                {humanizeCustomerValue(accountContext.operationalStatus)}
              </StatusPill>
            ) : null}
            {accountContext.accountTier ? <StatusPill>{accountContext.accountTier}</StatusPill> : null}
          </div>
        </div>
        <Link
          className="inline-flex min-h-7.5 w-full items-center justify-center rounded-full border border-[rgba(48,127,226,0.26)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--color-brand-blue)]"
          to={`/support/customers/${customer.tenantId}`}
        >
          Ver detalhes do cliente
        </Link>
      </div>

      <div className="rounded-[14px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-2">
        <dl className="grid gap-0.5 text-[11px] leading-5 text-[color:var(--color-muted)]">
          <div className="flex items-start justify-between gap-3">
            <dt className="font-medium text-[color:var(--color-ink)]">Plataforma</dt>
            <dd className="text-right">
              {primaryPlatform ? primaryPlatform.provider : 'Nao registrada'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-0.5">
            <dt className="font-medium text-[color:var(--color-ink)]">Produto</dt>
            <dd className="text-right">
              {accountContext.productLine ? humanizeCustomerValue(accountContext.productLine) : 'Nao resolvido'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-0.5">
            <dt className="font-medium text-[color:var(--color-ink)]">Porte / tier</dt>
            <dd className="text-right">
              {accountContext.accountTier ?? 'Nao resolvido'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-0.5">
            <dt className="font-medium text-[color:var(--color-ink)]">Contato principal</dt>
            <dd className="text-right">
              {primaryContact ? primaryContact.fullName : 'Nao resolvido'}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-[color:var(--color-border)] pt-0.5">
            <dt className="font-medium text-[color:var(--color-ink)]">E-mail</dt>
            <dd className="text-right break-all">
              {primaryContact?.email ?? 'Nao resolvido'}
            </dd>
          </div>
        </dl>
      </div>

    </div>
  );
}

function SupportAccountContextOverview({
  accountContext,
  customer,
}: {
  accountContext: SupportCustomerAccountContext | null;
  customer: SupportCustomer360;
}) {
  if (!accountContext || !accountContext.profileId) {
    return (
      <InlineNotice tone="warning">
        Este cliente ainda nao tem um perfil operacional enriquecido. O suporte pode seguir com contatos e tickets recentes, mas sem stack consolidado.
      </InlineNotice>
    );
  }

  const primaryPlatform = primaryPlatformFromContext(accountContext);
  const primaryContact = primaryContactFromCustomer(customer);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="accent">{humanizeCustomerValue(accountContext.productLine ?? 'other')}</StatusPill>
        {accountContext.operationalStatus ? (
          <StatusPill tone={accountContext.operationalStatus === 'active' ? 'positive' : 'warning'}>
            {humanizeCustomerValue(accountContext.operationalStatus)}
          </StatusPill>
        ) : null}
        {accountContext.accountTier ? <StatusPill>{accountContext.accountTier}</StatusPill> : null}
      </div>

      {accountContext.activeAlerts.length > 0 ? (
        <div className="space-y-2">
          {accountContext.activeAlerts.map((alert) => (
            <InlineNotice key={alert.id} tone={toneForAlertSeverity(alert.severity)}>
              <span className="font-semibold">{alert.title}</span>
              {`: ${alert.description}`}
            </InlineNotice>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-4 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
              Plataforma e stack
            </p>
            <p className="text-sm font-medium text-[color:var(--color-ink)]">
              {primaryPlatform ? primaryPlatform.provider : 'Plataforma nao registrada'}
            </p>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              {primaryPlatform
                ? `Ambiente ${humanizeCustomerValue(primaryPlatform.environment)} · ${humanizeCustomerValue(primaryPlatform.status)}`
                : 'Sem ambiente de e-commerce consolidado no perfil.'}
            </p>
          </div>

          <div className="space-y-2">
            {accountContext.integrations.length === 0 ? (
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Nenhuma integracao registrada no perfil.
              </p>
            ) : (
              accountContext.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[color:var(--color-ink)]">
                      {integration.provider}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill>{humanizeCustomerValue(integration.integrationType)}</StatusPill>
                      <StatusPill tone={integration.status === 'active' ? 'positive' : 'warning'}>
                        {humanizeCustomerValue(integration.status)}
                      </StatusPill>
                    </div>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                    Ambiente {humanizeCustomerValue(integration.environment)}
                    {integration.notes ? ` · ${integration.notes}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
              Features, risco e contato
            </p>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              Somente o que altera a resposta operacional do suporte.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {accountContext.enabledFeatures.length === 0 ? (
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Nenhuma feature ativa registrada.
              </p>
            ) : (
              accountContext.enabledFeatures.map((feature) => (
                <StatusPill key={feature.featureKey}>{humanizeCustomerValue(feature.featureKey)}</StatusPill>
              ))
            )}
          </div>

          {accountContext.activeCustomizations.length > 0 ? (
            <div className="space-y-2">
              {accountContext.activeCustomizations.map((customization) => (
                <div
                  key={customization.id}
                  className="rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[color:var(--color-ink)]">
                      {customization.title}
                    </p>
                    <StatusPill tone={toneForCustomizationRisk(customization.riskLevel)}>
                      {humanizeCustomerValue(customization.riskLevel)}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                    {customization.operationalNote ?? customization.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {primaryContact ? (
            <div className="rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Contato principal
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--color-ink)]">
                {primaryContact.fullName}
              </p>
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                {primaryContact.email}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <details className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
          Observacoes internas e flags controladas
        </summary>
        <div className="mt-3 space-y-3">
          {accountContext.internalNotes ? (
            <div className="rounded-[16px] bg-[color:var(--color-surface)] px-3 py-3">
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                {accountContext.internalNotes}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              Nenhuma observacao interna controlada registrada.
            </p>
          )}
          <div className="rounded-[16px] bg-[color:var(--color-surface)] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
              Flags operacionais
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-[color:var(--color-muted)]">
              {stringifyJsonPreview(accountContext.operationalFlags)}
            </pre>
          </div>
        </div>
      </details>
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
  const [timelineWindow, setTimelineWindow] = useState<SupportTicketTimelineRecentWindow>(
    emptyTimelineWindow(),
  );
  const [customer, setCustomer] = useState<SupportCustomer360 | null>(null);
  const [customerAccountContext, setCustomerAccountContext] =
    useState<SupportCustomerAccountContext | null>(null);
  const [customerRecentTickets, setCustomerRecentTickets] =
    useState<SupportCustomerRecentTicketsWindow>(emptyCustomerRecentTicketsWindow());
  const [customerRecentEvents, setCustomerRecentEvents] =
    useState<SupportCustomerRecentEventsWindow>(emptyCustomerRecentEventsWindow());
  const [knowledgeLinks, setKnowledgeLinks] =
    useState<SupportTicketKnowledgeLink[]>(emptyTicketKnowledgeLinks());
  const [knowledgeArticlePicker, setKnowledgeArticlePicker] =
    useState<SupportKnowledgeArticlePickerItem[]>(emptyKnowledgeArticlePicker());
  const [knowledgePhase, setKnowledgePhase] = useState<KnowledgePhase>('idle');
  const [knowledgeMessage, setKnowledgeMessage] = useState<string | null>(null);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [knowledgeNoteDraft, setKnowledgeNoteDraft] = useState('');
  const [knowledgeSubmitting, setKnowledgeSubmitting] = useState(false);
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
  const [ticketToolbarTab, setTicketToolbarTab] = useState<
    'conversation' | 'knowledge' | 'help' | 'more'
  >('conversation');
  const threadScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingThreadScrollRef = useRef<'idle' | 'latest'>('idle');

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

  const loadDetail = useEffectEvent(
    async (
      ticketId: string,
      options?: {
        preserveSurfaceState?: boolean;
      },
    ) => {
    setDetailPhase('loading');
    setDetailMessage(null);
    setAgentsPhase('loading');
    setAgentsMessage(null);
    setKnowledgePhase('loading');
    setKnowledgeMessage(null);

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
        setKnowledgeLinks(emptyTicketKnowledgeLinks());
        setKnowledgeArticlePicker(emptyKnowledgeArticlePicker());
        setKnowledgePhase('idle');
        setDetailPhase('error');
        setDetailMessage('O ticket solicitado nao apareceu na leitura operacional disponivel.');
        return;
      }

      const [customerRow, customerAccountRow, recentTicketsWindow, recentEventsWindow] = await Promise.all([
        getSupportCustomer360(detail.tenantId),
        getSupportCustomerAccountContext(detail.tenantId),
        getSupportCustomerRecentTickets(detail.tenantId),
        getSupportCustomerRecentEvents(detail.tenantId),
      ]);
      setTicketDetail(detail);
      setTimelineWindow(timelineRecent);
      setCustomer(customerRow);
      setCustomerAccountContext(customerAccountRow);
      setCustomerRecentTickets(recentTicketsWindow);
      setCustomerRecentEvents(recentEventsWindow);
      setDetailPhase('ready');
      setStatusDraft(detail.status === 'closed' ? 'triage' : detail.status);
      setAssignDraft(detail.assignedToUserId ?? '');
      if (!options?.preserveSurfaceState) {
        setTicketToolbarTab('conversation');
      }
      setComposerMode((currentMode) => {
        if (options?.preserveSurfaceState) {
          if (currentMode === 'internal' && detail.canAddInternalNote) {
            return 'internal';
          }

          if (currentMode === 'public' && detail.canAddMessage) {
            return 'public';
          }
        }

        return detail.canAddMessage ? 'public' : detail.canAddInternalNote ? 'internal' : 'public';
      });
      setKnowledgeSearch('');
      setKnowledgeNoteDraft('');

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

      try {
        const [ticketKnowledgeLinks, articlePickerRows] = await Promise.all([
          getSupportTicketKnowledgeLinks(detail.id),
          listSupportKnowledgeArticlePicker(detail.id),
        ]);
        setKnowledgeLinks(ticketKnowledgeLinks);
        setKnowledgeArticlePicker(articlePickerRows);
        setKnowledgePhase('ready');
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Falha ao carregar o painel de conhecimento relacionado.',
        );

        if (classified.kind === 'session-expired') {
          markSessionExpired();
          return;
        }

        setKnowledgeLinks(emptyTicketKnowledgeLinks());
        setKnowledgeArticlePicker(emptyKnowledgeArticlePicker());
        setKnowledgeMessage(classified.message);
        setKnowledgePhase(
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
      setCustomerAccountContext(null);
      setCustomerRecentTickets(emptyCustomerRecentTicketsWindow());
      setCustomerRecentEvents(emptyCustomerRecentEventsWindow());
      setKnowledgeLinks(emptyTicketKnowledgeLinks());
      setKnowledgeArticlePicker(emptyKnowledgeArticlePicker());
      setKnowledgePhase('idle');
      setKnowledgeMessage(null);
      setAssignableAgents([]);
      setAgentsPhase('idle');
      setDetailMessage(classified.message);
      setDetailPhase(
        classified.kind === 'contract-unavailable' ? 'contract-unavailable' : 'error',
      );
    }
    },
  );

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
      setCustomerAccountContext(null);
      setCustomerRecentTickets(emptyCustomerRecentTicketsWindow());
      setCustomerRecentEvents(emptyCustomerRecentEventsWindow());
      setKnowledgeLinks(emptyTicketKnowledgeLinks());
      setKnowledgeArticlePicker(emptyKnowledgeArticlePicker());
      setKnowledgePhase('idle');
      setKnowledgeMessage(null);
      setAssignableAgents([]);
      setAgentsPhase('idle');
      setAgentsMessage(null);
      return;
    }

    void loadDetail(selectedTicketId);
  }, [selectedTicketId]);

  useEffect(() => {
    setDetailNotice(null);
    pendingThreadScrollRef.current = 'idle';
  }, [selectedTicketId]);

  useEffect(() => {
    if (ticketToolbarTab !== 'conversation' || pendingThreadScrollRef.current !== 'latest') {
      return;
    }

    const syncThreadScroll = () => {
        const threadNode = threadScrollContainerRef.current;

        if (!threadNode) {
          return;
        }

        threadNode.scrollTop = threadNode.scrollHeight;
    };

    const frame = window.requestAnimationFrame(syncThreadScroll);
    const retries = [90, 220, 420].map((delay) =>
      window.setTimeout(() => {
        syncThreadScroll();
        if (delay === 420) {
          pendingThreadScrollRef.current = 'idle';
        }
      }, delay),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      for (const retry of retries) {
        window.clearTimeout(retry);
      }
    };
  }, [detailNotice, ticketToolbarTab, timelineWindow]);

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
  const filteredKnowledgeArticles = useMemo(() => {
    const term = knowledgeSearch.trim().toLocaleLowerCase('pt-BR');

    if (term.length === 0) {
      return knowledgeArticlePicker.slice(0, 6);
    }

    return knowledgeArticlePicker
      .filter((article) => {
        const haystack = [
          article.articleTitle,
          article.articleSummary ?? '',
          article.categoryName ?? '',
        ]
          .join(' ')
          .toLocaleLowerCase('pt-BR');

        return haystack.includes(term);
      })
      .slice(0, 8);
  }, [knowledgeArticlePicker, knowledgeSearch]);
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

  async function refreshDetail(
    ticketId: string,
    options: {
      preserveSurfaceState?: boolean;
    } = { preserveSurfaceState: true },
  ) {
    await Promise.all([loadQueue(ticketId), loadDetail(ticketId, options)]);
  }

  function optionalKnowledgeNote() {
    const trimmed = knowledgeNoteDraft.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async function handleArchiveKnowledgeLink(linkId: Uuid) {
    if (!ticketDetail) {
      return;
    }

    setKnowledgeSubmitting(true);
    setDetailNotice(null);

    try {
      await archiveSupportTicketArticleLink({
        ticketKnowledgeLinkId: linkId,
      });
      await refreshDetail(ticketDetail.id);
      applySuccess('Vinculo de conhecimento arquivado com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao arquivar o vinculo de conhecimento.',
      );
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setKnowledgeSubmitting(false);
    }
  }

  async function handleLinkKnowledgeArticle(
    articleId: Uuid,
    linkType: Extract<TicketKnowledgeLinkType, 'reference_internal' | 'sent_to_customer'>,
  ) {
    if (!ticketDetail) {
      return;
    }

    setKnowledgeSubmitting(true);
    setDetailNotice(null);

    try {
      await linkSupportTicketArticle({
        ticketId: ticketDetail.id,
        articleId,
        linkType,
        note: optionalKnowledgeNote(),
      });
      await refreshDetail(ticketDetail.id);
      applySuccess(
        linkType === 'sent_to_customer'
          ? 'Link publico relacionado ao ticket com sucesso.'
          : 'Referencia interna relacionada ao ticket com sucesso.',
      );
    } catch (error) {
      const classified = classifyAdminError(
        error,
        linkType === 'sent_to_customer'
          ? 'Falha ao registrar o link publico para o cliente.'
          : 'Falha ao relacionar a referencia interna.',
      );
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setKnowledgeSubmitting(false);
    }
  }

  async function handleMarkDocumentationGap() {
    if (!ticketDetail) {
      return;
    }

    setKnowledgeSubmitting(true);
    setDetailNotice(null);

    try {
      await markSupportDocumentationGap({
        ticketId: ticketDetail.id,
        note: optionalKnowledgeNote(),
      });
      await refreshDetail(ticketDetail.id);
      applySuccess('Lacuna de documentacao registrada com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao registrar a lacuna de documentacao.',
      );
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setKnowledgeSubmitting(false);
    }
  }

  async function handleMarkKnowledgeNeedsUpdate(articleId: Uuid) {
    if (!ticketDetail) {
      return;
    }

    setKnowledgeSubmitting(true);
    setDetailNotice(null);

    try {
      await markSupportArticleNeedsUpdate({
        ticketId: ticketDetail.id,
        articleId,
        note: optionalKnowledgeNote(),
      });
      await refreshDetail(ticketDetail.id);
      applySuccess('Artigo marcado para revisao com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao marcar que o artigo precisa de revisao.',
      );
      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }
      applyFailure(classified.message);
    } finally {
      setKnowledgeSubmitting(false);
    }
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
      applyFailure(friendlyTicketStatusErrorMessage(classified.message));
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

      pendingThreadScrollRef.current = 'latest';
      await refreshDetail(ticketDetail.id);
    } catch (error) {
      pendingThreadScrollRef.current = 'idle';
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
    return focusTicketId ? <SupportTicketLoadingScaffold /> : <SupportQueueLoadingScaffold />;
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="fila operacional de tickets" />;
  }

  if (phase === 'error') {
    return (
        <ErrorState
          description={pageMessage ?? 'A fila operacional nao ficou disponivel neste ambiente.'}
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
  const knowledgeBusy = knowledgeSubmitting;
  const selectedQueueTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  const previewTicket = ticketDetail ?? null;
  const queueShortcuts = [
    {
      key: 'mine',
      label: 'Meus tickets',
      helper: 'fila pessoal',
      active:
        filters.assignedToUserId !== 'all' &&
        currentUserAssignableAgent?.userId != null &&
        filters.assignedToUserId === currentUserAssignableAgent.userId,
      apply: () =>
        setFilters({
          ...filters,
          assignedToUserId: currentUserAssignableAgent?.userId ?? 'all',
        }),
      disabled: !currentUserAssignableAgent?.userId,
    },
    {
      key: 'unassigned',
      label: 'Nao atribuidos',
      helper: 'pedem dono',
      active: filters.assignedToUserId === 'unassigned',
      apply: () => setFilters({ ...filters, assignedToUserId: 'unassigned' }),
      disabled: false,
    },
    {
      key: 'urgent',
      label: 'Urgentes',
      helper: 'alta prioridade',
      active: filters.priority === 'urgent' || filters.severity === 'critical',
      apply: () =>
        setFilters({ ...filters, priority: 'urgent', severity: 'all' }),
      disabled: false,
    },
    {
      key: 'waiting-customer',
      label: 'Aguardando cliente',
      helper: 'retorno externo',
      active: filters.status === 'waiting_customer',
      apply: () => setFilters({ ...filters, status: 'waiting_customer' }),
      disabled: false,
    },
  ] as const;
  const requesterLabel =
    ticketDetail?.requesterContactFullName ??
    ticketDetail?.requesterContactEmail ??
    'Cliente B2B';
  const currentAssignedLabel =
    formatAssignedAgentSummary(currentAssignedAgent) ??
    ticketDetail?.assignedToFullName ??
    'Sem responsavel definido';
  const publicKnowledgeSuggestions = filteredKnowledgeArticles.filter((article) => article.isCustomerSendAllowed);
  const knowledgePreviewLinks = knowledgeLinks.slice(0, 2);

  function openConversationSurface() {
    setTicketToolbarTab('conversation');
  }

  function openKnowledgeSurface() {
    setTicketToolbarTab('knowledge');
  }

  function openAdvancedSurface() {
    setTicketToolbarTab('more');
  }

  return (
    <div
      className={cx(
        variant === 'tickets'
          ? 'flex h-full min-h-0 flex-col gap-2.5 overflow-hidden'
          : 'space-y-5',
      )}
    >
      {variant === 'queue' ? (
        <section className="rounded-[26px] border border-[color:var(--color-border)] bg-white/95 px-5 py-5 shadow-[0_16px_30px_rgba(19,33,79,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="accent">Fila</StatusPill>
            <StatusPill>Suporte diario</StatusPill>
          </div>
          <div className="mt-3 space-y-1">
            <h1 className="text-[1.9rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
              Fila operacional
            </h1>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              Subsidebar para triagem, lista dominante no centro e preview curto para decidir o proximo atendimento.
            </p>
          </div>
        </section>
      ) : null}

      {variant === 'queue' ? (
        <WorkspaceSplit
          layoutClassName="xl:grid-cols-[292px_minmax(0,1fr)]"
          sidebar={
            <ContextSubsidebar
              description="Filtros, filas rapidas e atalhos ficam aqui para deixar a lista principal livre para a triagem."
              title="Triagem da fila"
            >
              <ContextSubsidebarSection
                description="Recortes operacionais para chegar mais rapido ao proximo ticket."
                title="Filas rapidas"
              >
                <div className="grid gap-2">
                  {queueShortcuts.map((shortcut) => (
                    <button
                      className={cx(
                        'flex min-h-12 items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition',
                        shortcut.active
                          ? 'border-[rgba(48,127,226,0.42)] bg-[rgba(48,127,226,0.08)] text-[color:var(--color-brand-blue)]'
                          : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] hover:border-[rgba(48,127,226,0.28)] hover:bg-white',
                        shortcut.disabled && 'cursor-not-allowed opacity-50',
                      )}
                      disabled={shortcut.disabled}
                      key={shortcut.key}
                      onClick={shortcut.apply}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{shortcut.label}</span>
                        <span className="block text-xs text-[color:var(--color-muted)]">
                          {shortcut.helper}
                        </span>
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                        abrir
                      </span>
                    </button>
                  ))}
                </div>
              </ContextSubsidebarSection>

              <ContextSubsidebarSection
                description="Ajuste o recorte sem ocupar a area de trabalho principal."
                title="Filtros"
              >
                <SupportQueueToolbar
                  assigneeOptions={assigneeOptions}
                  embedded
                  filters={filters}
                  onChange={setFilters}
                  onRefresh={() => void loadQueue(focusTicketId ?? null)}
                  tenantOptions={tenantOptions}
                />
              </ContextSubsidebarSection>
            </ContextSubsidebar>
          }
          main={
            <div className="space-y-4">
              <SupportSummaryStrip
                highAttention={highAttention}
                totalOpen={totalOpen}
                unassigned={unassigned}
                waitingCustomer={waitingCustomer}
              />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.28fr)]">
                <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
                  <div className="mb-4 space-y-1">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                      Fila dominante
                    </h2>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      A fila continua no centro da decisao. O preview lateral so confirma o contexto antes da tratativa.
                    </p>
                  </div>
                  {tickets.length === 0 ? (
                    <EmptyState
                      title="Sem tickets para esta combinacao de filtros"
                      description="Nenhum ticket apareceu com esse recorte. Ajuste os filtros ou recarregue a fila."
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
                </section>

                <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(19,33,79,0.08)] xl:sticky xl:top-4">
                  <div className="mb-4 space-y-1">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                      Preview do ticket
                    </h2>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      Leitura curta antes de abrir o atendimento completo.
                    </p>
                  </div>
                  {detailPhase === 'loading' ? (
                    <LoadingState
                      title="Carregando previa"
                      description="Estamos preparando a previa do ticket selecionado."
                    />
                  ) : detailPhase === 'contract-unavailable' ? (
                    <ContractUnavailableState contractName="previa operacional do ticket" />
                  ) : detailPhase === 'error' ? (
                    <ErrorState description={detailMessage ?? 'A previa do ticket nao ficou disponivel.'} />
                  ) : (
                    <SupportTicketPreview customer={customer} detail={previewTicket} ticket={selectedQueueTicket} />
                  )}
                </section>
              </div>
            </div>
          }
        />
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
          description="Estamos preparando a conversa, o contexto do cliente e a operacao do ticket."
        />
      ) : detailPhase === 'contract-unavailable' ? (
        <ContractUnavailableState contractName="detalhe do ticket, conversa recente e contexto do cliente" />
      ) : detailPhase === 'error' || !ticketDetail || !selectedTicketSummary ? (
        focusTicketId ? (
          <section className="rounded-[28px] border border-[color:var(--color-border)] bg-white/95 px-6 py-6 shadow-[0_18px_34px_rgba(19,33,79,0.08)]">
            <EmptyState
              title="Ticket nao encontrado"
              description={detailMessage ?? 'O ticket solicitado nao apareceu na leitura operacional disponivel.'}
              action={
                <Link to="/support/queue">
                  <AppButton>Voltar para a fila</AppButton>
                </Link>
              }
            />
          </section>
        ) : (
          <ErrorState
            description={detailMessage ?? 'O painel operacional do ticket nao ficou disponivel.'}
          />
        )
      ) : (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden xl:flex-row">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <section className="shrink-0 overflow-hidden rounded-[20px] border border-[rgba(22,42,93,0.1)] bg-white shadow-[0_10px_20px_rgba(19,33,79,0.06)]">
              <div className="px-4 py-3 sm:px-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>
                      {humanizeStatus(ticketDetail.status)}
                    </StatusPill>
                    <StatusPill tone={toneForPriority(ticketDetail.priority)}>
                      {humanizeToken(ticketDetail.priority)}
                    </StatusPill>
                    <StatusPill tone={toneForSeverity(ticketDetail.severity)}>
                      {humanizeToken(ticketDetail.severity)}
                    </StatusPill>
                    <span className="text-[12px] font-semibold text-[color:var(--color-ink)]">
                      #{ticketDetail.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-[color:var(--color-muted)]">
                      Criado em {formatDateTime(ticketDetail.createdAt)}
                    </span>
                  </div>

                  <h3 className="max-w-4xl truncate text-[0.98rem] font-semibold tracking-[-0.03em] leading-tight text-[color:var(--color-ink)]">
                    {ticketDetail.title}
                  </h3>

                  <div className="grid gap-2 border-t border-[color:var(--color-border)] pt-2 text-[11px] md:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Cliente
                      </p>
                      <p className="truncate font-semibold leading-4 text-[color:var(--color-ink)]">
                        {ticketDetail.tenantDisplayName ?? ticketDetail.tenantLegalName ?? ticketDetail.tenantSlug}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Solicitante
                      </p>
                      <p className="truncate font-semibold leading-4 text-[color:var(--color-ink)]">
                        {requesterLabel}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Responsavel
                      </p>
                      <p className="truncate font-semibold leading-4 text-[color:var(--color-ink)]">
                        {currentAssignedLabel}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Ultima atualizacao
                      </p>
                      <p className="truncate font-semibold leading-4 text-[color:var(--color-ink)]">
                        {formatDateTime(ticketDetail.lastMessageAt ?? ticketDetail.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[color:var(--color-border)] px-4 sm:px-5">
                <div className="flex items-center gap-3 overflow-x-auto">
                  <button
                    className={cx(
                      'inline-flex min-h-7.5 shrink-0 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                      ticketToolbarTab === 'conversation'
                        ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                        : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                    )}
                    onClick={openConversationSurface}
                    type="button"
                  >
                    Conversar
                  </button>
                  <button
                    className={cx(
                      'inline-flex min-h-7.5 shrink-0 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                      ticketToolbarTab === 'knowledge'
                        ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                        : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                    )}
                    onClick={openKnowledgeSurface}
                    type="button"
                  >
                    Conhecimento
                  </button>
                  <button
                    className={cx(
                      'inline-flex min-h-7.5 shrink-0 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                      ticketToolbarTab === 'help'
                        ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                        : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                    )}
                    onClick={() => setTicketToolbarTab('help')}
                    type="button"
                  >
                    Central de ajuda
                  </button>
                  <button
                    className={cx(
                      'inline-flex min-h-7.5 shrink-0 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                      ticketToolbarTab === 'more'
                        ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                        : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                    )}
                    onClick={openAdvancedSurface}
                    type="button"
                  >
                    Mais acoes
                  </button>
                </div>
              </div>
            </section>

            {detailNotice ? (
              <div
                className={cx(
                  'rounded-[14px] border px-3 py-2 text-[12px] leading-5 shadow-[0_6px_12px_rgba(19,33,79,0.05)]',
                  detailNoticeTone === 'critical'
                    ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger-ink)]'
                    : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-muted)]',
                )}
              >
                {detailNotice}
              </div>
            ) : null}

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[color:var(--color-border)] bg-white shadow-[0_10px_20px_rgba(19,33,79,0.06)]">
              {ticketToolbarTab === 'conversation' ? (
                <>
                  <div
                    className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5"
                    data-ticket-thread-scroll
                    ref={threadScrollContainerRef}
                  >
                    <SupportConversation requesterName={requesterLabel} window={timelineWindow} />
                  </div>

                  <div
                    className="shrink-0 border-t border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(247,250,255,0.96),rgba(255,255,255,1))] px-4 py-3 sm:px-5"
                    data-ticket-composer
                  >
                    <form className="space-y-1.5" onSubmit={handleSubmitComposer}>
                      <div className="flex flex-wrap gap-4 border-b border-[color:var(--color-border)]">
                        <button
                          className={cx(
                            'inline-flex min-h-7.5 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                            composerMode === 'public'
                              ? 'border-[color:var(--color-brand-blue)] text-[color:var(--color-brand-blue)]'
                              : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                          )}
                          disabled={!canUsePublicComposer}
                          onClick={() => setComposerMode('public')}
                          type="button"
                        >
                          Resposta publica
                        </button>
                        <button
                          className={cx(
                            'inline-flex min-h-7.5 items-center border-b-2 px-1 text-[12px] font-semibold transition',
                            composerMode === 'internal'
                              ? 'border-[color:var(--color-danger-ink)] text-[color:var(--color-danger-ink)]'
                              : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]',
                          )}
                          disabled={!canUseInternalComposer}
                          onClick={() => setComposerMode('internal')}
                          type="button"
                        >
                          Nota interna
                        </button>
                      </div>
                      <div
                        className={cx(
                          'rounded-[16px] border px-3.5 py-2.5 shadow-[0_8px_18px_rgba(19,33,79,0.04)] transition-colors',
                          composerMode === 'internal'
                            ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,248,227,0.98),rgba(255,243,214,0.95))]'
                            : 'border-[color:var(--color-border)] bg-white',
                        )}
                      >
                        <TextareaInput
                          className={cx(
                            'h-[142px] min-h-[142px] w-full resize-none overflow-hidden border-0 !bg-transparent px-0 py-0 text-[13px] leading-[1.35rem] shadow-none focus:border-transparent focus:ring-0',
                            composerMode === 'internal' && 'placeholder:text-[rgba(125,92,13,0.68)]',
                          )}
                          onChange={(event) =>
                            composerMode === 'public'
                              ? setMessageDraft(event.target.value)
                              : setNoteDraft(event.target.value)
                          }
                          placeholder={
                            composerMode === 'public'
                              ? 'Digite sua resposta publica para o cliente...'
                              : 'Registre a nota interna da tratativa...'
                          }
                          value={composerDraft}
                        />
                        <div
                          className={cx(
                            'mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2',
                            composerMode === 'internal'
                              ? 'border-amber-200/90'
                              : 'border-[color:var(--color-border)]',
                          )}
                        >
                          <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                            {composerMode === 'public'
                              ? 'A resposta sera enviada para o cliente.'
                              : 'A nota ficara visivel apenas para a equipe interna.'}
                          </p>
                          <AppButton
                            className={
                              composerMode === 'internal'
                                ? 'min-h-8.5 rounded-[12px] px-4.5 text-[12px] bg-[linear-gradient(135deg,#7c2648,#b63f76)]'
                                : 'min-h-8.5 rounded-[12px] px-4.5 text-[12px]'
                            }
                            disabled={composerDisabled}
                            type="submit"
                          >
                            {submitting
                              ? composerMode === 'public'
                                ? 'Enviando...'
                                : 'Salvando...'
                              : composerMode === 'public'
                                ? 'Enviar resposta'
                                : 'Salvar nota interna'}
                          </AppButton>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
                  {ticketToolbarTab === 'knowledge' ? (
                    <SupportKnowledgePanel
                      articles={filteredKnowledgeArticles}
                      links={knowledgeLinks}
                      loading={knowledgeBusy}
                      message={knowledgeMessage}
                      noteDraft={knowledgeNoteDraft}
                      onArchive={(linkId) => void handleArchiveKnowledgeLink(linkId)}
                      onLinkInternal={(articleId) =>
                        void handleLinkKnowledgeArticle(articleId, 'reference_internal')
                      }
                      onMarkGap={() => void handleMarkDocumentationGap()}
                      onNeedsUpdate={(articleId) => void handleMarkKnowledgeNeedsUpdate(articleId)}
                      onNoteChange={setKnowledgeNoteDraft}
                      onSearchChange={setKnowledgeSearch}
                      onSendToCustomer={(articleId) =>
                        void handleLinkKnowledgeArticle(articleId, 'sent_to_customer')
                      }
                      phase={knowledgePhase}
                      search={knowledgeSearch}
                    />
                  ) : ticketToolbarTab === 'help' ? (
                    <SupportHelpPanel articles={filteredKnowledgeArticles} links={knowledgeLinks} />
                  ) : (
                    <SupportMoreActionsPanel
                      canClose={ticketDetail.canClose}
                      canReopen={ticketDetail.canReopen}
                      canUpdateStatus={ticketDetail.canUpdateStatus}
                      closeReason={closeReason}
                      onCloseReasonChange={setCloseReason}
                      onCloseSubmit={handleClose}
                      onReopenReasonChange={setReopenReason}
                      onReopenSubmit={handleReopen}
                      onStatusNoteChange={setStatusNote}
                      onStatusSubmit={handleUpdateStatus}
                      reopenReason={reopenReason}
                      statusNote={statusNote}
                      submitting={submitting}
                      window={timelineWindow}
                    />
                  )}
                </div>
              )}
            </section>
          </div>

          <aside
            className="min-h-0 space-y-3 overflow-y-auto pr-1 xl:w-[352px] xl:shrink-0"
            data-ticket-rail
          >
            <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[0_8px_16px_rgba(19,33,79,0.06)]">
              <h4 className="text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                Cliente
              </h4>
              <div className="mt-1.5">
                <SupportTicketCustomerSnapshot
                  accountContext={customerAccountContext}
                  customer={customer}
                />
              </div>
            </section>

            <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[0_8px_16px_rgba(19,33,79,0.06)]">
              <div className="space-y-1.5">
                <h4 className="text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                  Acoes do ticket
                </h4>

                {agentsPhase === 'contract-unavailable' ? (
                  <InlineNotice tone="critical">
                    {agentsMessage ?? 'A lista de agentes nao ficou disponivel para esta tratativa.'}
                  </InlineNotice>
                ) : agentsPhase === 'error' ? (
                  <InlineNotice tone="critical">
                    {agentsMessage ?? 'Nao foi possivel carregar o diretorio de agentes atribuiveis.'}
                  </InlineNotice>
                ) : agentsPhase === 'loading' ? (
                  <p className="text-[12px] leading-5 text-[color:var(--color-muted)]">
                    Carregando agentes disponiveis...
                  </p>
                ) : assignableAgents.length === 0 ? (
                  <InlineNotice tone="warning">
                    Nenhum agente ativo ficou disponivel para este cliente.
                  </InlineNotice>
                ) : (
                  <form className="space-y-2" onSubmit={handleAssign}>
                    <Field label="Responsavel">
                      <SelectInput
                        className="h-8.5 rounded-[12px] px-3 text-[11.5px] font-medium"
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
                    <AppButton
                      className="min-h-8.5 w-full rounded-[12px] px-4 text-[12px]"
                      disabled={submitting || !ticketDetail.canAssign}
                      type="submit"
                    >
                      {submitting ? 'Salvando...' : 'Salvar alteracoes'}
                    </AppButton>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <GhostButton
                        className="min-h-8 rounded-[12px] px-2 text-[11px]"
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
                        className="min-h-8 rounded-[12px] px-2 text-[11px]"
                        disabled={submitting || !ticketDetail.canAssign || !ticketDetail.assignedToUserId}
                        onClick={() => void runAssignment(null)}
                        type="button"
                      >
                        Desatribuir
                      </GhostButton>
                    </div>
                  </form>
                )}

                <form className="space-y-2 border-t border-[color:var(--color-border)] pt-2" onSubmit={handleUpdateStatus}>
                  <Field label="Status">
                    <SelectInput
                      className="h-8.5 rounded-[12px] px-3 text-[12px]"
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
                  <AppButton
                    className="min-h-8.5 w-full rounded-[12px] px-4 text-[12px]"
                    disabled={submitting || !ticketDetail.canUpdateStatus}
                    type="submit"
                  >
                    {submitting ? 'Atualizando...' : 'Salvar andamento'}
                  </AppButton>
                </form>
              </div>
            </section>

            <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[0_8px_16px_rgba(19,33,79,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                  Conhecimento relacionado
                </h4>
                <GhostButton className="min-h-7.5 px-2 text-[10px]" onClick={openKnowledgeSurface}>
                  Abrir aba
                </GhostButton>
              </div>
              <div className="mt-1.5 space-y-1.5">
                {knowledgePhase === 'loading' ? (
                  <p className="text-[11px] leading-5 text-[color:var(--color-muted)]">
                    Carregando vinculos...
                  </p>
                ) : knowledgePhase === 'contract-unavailable' || knowledgePhase === 'error' ? (
                  <InlineNotice tone={knowledgePhase === 'error' ? 'critical' : 'warning'}>
                    {knowledgeMessage ?? 'O painel de conhecimento nao ficou disponivel para este ticket.'}
                  </InlineNotice>
                ) : knowledgePreviewLinks.length === 0 ? (
                  <InlineNotice>
                    Nenhum artigo relacionado ainda.
                  </InlineNotice>
                ) : (
                  knowledgePreviewLinks.slice(0, 1).map((link) => (
                    <div
                      className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2.5 py-2"
                      key={link.ticketKnowledgeLinkId}
                    >
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusPill tone={toneForKnowledgeLinkType(link.linkType)}>
                          {humanizeKnowledgeLinkType(link.linkType)}
                        </StatusPill>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-4.5 text-[color:var(--color-ink)]">
                        {link.articleTitle ?? 'Vinculo sem titulo visivel'}
                      </p>
                    </div>
                  ))
                )}
                <p className="text-[10px] leading-5 text-[color:var(--color-muted)]">
                  {publicKnowledgeSuggestions.length > 0
                    ? `${publicKnowledgeSuggestions.length} sugestao(oes) publicas disponiveis.`
                    : 'Nenhuma sugestao publica pronta no momento.'}
                </p>
              </div>
            </section>

            <section className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[0_8px_16px_rgba(19,33,79,0.06)]">
              <h4 className="text-[13px] font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                Atividade recente
              </h4>
              <div className="mt-1.5">
                <SupportRecentActivity window={timelineWindow} />
              </div>
            </section>
          </aside>
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

function readCountFromJson(counts: Record<string, unknown>, key: string) {
  const value = counts[key];

  return typeof value === 'number' ? value : 0;
}

function displayCustomerValue(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return 'Indisponível';
  }

  return value;
}

function resolveSupportCustomerOwner(
  customer: SupportCustomer360,
  recentTicketsWindow: SupportCustomerRecentTicketsWindow,
) {
  return (
    recentTicketsWindow.tickets.find((ticket) => ticket.assignedToFullName)?.assignedToFullName ??
    primaryContactFromCustomer(customer)?.fullName ??
    null
  );
}

function resolveLatestCustomerActivity(
  customer: SupportCustomer360,
  recentTicketsWindow: SupportCustomerRecentTicketsWindow,
  recentEventsWindow: SupportCustomerRecentEventsWindow,
) {
  const candidates = [
    customer.tenantUpdatedAt,
    recentTicketsWindow.tickets[0]?.updatedAt ?? null,
    recentEventsWindow.events[0]?.occurredAt ?? null,
  ].filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function resolveCustomerRiskProfile(accountContext: SupportCustomerAccountContext | null) {
  if (!accountContext || !accountContext.profileId) {
    return {
      label: 'Sem contexto',
      tone: 'default' as const,
      healthLabel: 'Contexto em aberto',
      accentClassName: 'bg-slate-200',
    };
  }

  const criticalAlerts = accountContext.activeAlerts.filter(
    (alert) => alert.severity === 'critical' || alert.severity === 'high',
  ).length;
  const riskyCustomizations = accountContext.activeCustomizations.filter(
    (customization) =>
      customization.riskLevel === 'critical' || customization.riskLevel === 'high',
  ).length;

  if (criticalAlerts > 0 || riskyCustomizations > 1) {
    return {
      label: 'Risco alto',
      tone: 'critical' as const,
      healthLabel: 'Atencao imediata',
      accentClassName: 'bg-rose-500',
    };
  }

  if (accountContext.operationalStatus === 'limited' || accountContext.activeAlerts.length > 0) {
    return {
      label: 'Em atencao',
      tone: 'warning' as const,
      healthLabel: 'Monitoramento ativo',
      accentClassName: 'bg-amber-500',
    };
  }

  return {
    label: 'Operacao estavel',
    tone: 'positive' as const,
    healthLabel: 'Saude controlada',
    accentClassName: 'bg-emerald-500',
  };
}

function resolveMigrationCard(accountContext: SupportCustomerAccountContext | null) {
  if (!accountContext || !accountContext.profileId) {
    return {
      phase: 'Indisponível',
      accentTone: 'default' as const,
      steps: [
        { label: 'Descoberta', state: 'pending' as const },
        { label: 'Planejamento', state: 'pending' as const },
        { label: 'Execucao', state: 'pending' as const },
        { label: 'Validacao', state: 'pending' as const },
      ],
    };
  }

  if (accountContext.operationalStatus === 'onboarding') {
    return {
      phase: 'Em migracao',
      accentTone: 'warning' as const,
      steps: [
        { label: 'Descoberta', state: 'done' as const },
        { label: 'Planejamento', state: 'active' as const },
        { label: 'Execucao', state: 'pending' as const },
        { label: 'Validacao', state: 'pending' as const },
      ],
    };
  }

  if (accountContext.operationalStatus === 'limited') {
    return {
      phase: 'Execucao',
      accentTone: 'warning' as const,
      steps: [
        { label: 'Descoberta', state: 'done' as const },
        { label: 'Planejamento', state: 'done' as const },
        { label: 'Execucao', state: 'active' as const },
        { label: 'Validacao', state: 'pending' as const },
      ],
    };
  }

  return {
    phase: 'Operacao ativa',
    accentTone: 'positive' as const,
    steps: [
      { label: 'Descoberta', state: 'done' as const },
      { label: 'Planejamento', state: 'done' as const },
      { label: 'Execucao', state: 'done' as const },
      { label: 'Validacao', state: 'active' as const },
    ],
  };
}

function SupportCustomerDetailCard({
  title,
  description,
  children,
  className,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      className={cx(
        'rounded-[26px] border border-[color:var(--color-border)] bg-white/94 px-5 py-5 shadow-[0_16px_34px_rgba(16,30,74,0.08)]',
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[1.04rem] font-semibold tracking-[-0.035em] text-[color:var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function SupportCustomerMetricTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">{helper}</p>
      ) : null}
    </div>
  );
}

export function SupportCustomersPage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [customers, setCustomers] = useState<SupportCustomer360[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<Uuid | null>(null);
  const [query, setQuery] = useState('');

  const loadCustomers = useEffectEvent(async (preferredTenantId?: Uuid | null) => {
    try {
      const data = await listSupportCustomers360();
      setBackendDenied(false);
      setCustomers(data);
      setPhase('ready');
      setMessage(null);

      const nextSelectedTenantId =
        preferredTenantId ??
        (data.some((customer) => customer.tenantId === selectedTenantId)
          ? selectedTenantId
          : null) ??
        data[0]?.tenantId ??
        null;

      setSelectedTenantId(nextSelectedTenantId);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o hub de clientes do suporte.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setCustomers([]);
      setSelectedTenantId(null);
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
    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

    if (normalizedQuery.length === 0) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.tenantDisplayName,
        customer.tenantLegalName,
        customer.tenantSlug,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedQuery),
    );
  }, [customers, query]);

  const selectedCustomer =
    customers.find((customer) => customer.tenantId === selectedTenantId) ??
    filteredCustomers[0] ??
    null;
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((customer) => customer.tenantStatus === 'active').length;
  const openTickets = customers.reduce((sum, customer) => sum + customer.openTicketCount, 0);
  const activeContacts = customers.reduce((sum, customer) => sum + customer.activeContactsCount, 0);

  useEffect(() => {
    if (!selectedCustomer && filteredCustomers[0]) {
      setSelectedTenantId(filteredCustomers[0].tenantId);
    }
  }, [filteredCustomers, selectedCustomer]);

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (phase === 'loading') {
    return (
      <div className="space-y-5">
        <section className="rounded-[26px] border border-[color:var(--color-border)] bg-white/95 px-5 py-5 shadow-[0_16px_30px_rgba(19,33,79,0.08)]">
          <div className="h-6 w-44 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-10 w-[420px] max-w-full animate-pulse rounded-[22px] bg-slate-200" />
        </section>
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <LoadingBlock className="h-[520px] rounded-[26px]" />
          <LoadingBlock className="h-[520px] rounded-[26px]" />
        </div>
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="hub de clientes do suporte" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={message ?? 'Nao foi possivel carregar a carteira de clientes desta area.'}
        action={<AppButton onClick={() => void loadCustomers(selectedTenantId)}>Tentar novamente</AppButton>}
      />
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        title="Nenhum cliente disponivel"
        description="Ainda nao existe conta operacional disponivel para esta area do suporte."
      />
    );
  }

  const previewLabel =
    selectedCustomer?.tenantDisplayName ??
    selectedCustomer?.tenantLegalName ??
    selectedCustomer?.tenantSlug ??
    'Indisponível';
  const previewWaiting =
    selectedCustomer
      ? readCountFromJson(selectedCustomer.ticketStatusCounts as Record<string, unknown>, 'waiting_customer') +
        readCountFromJson(selectedCustomer.ticketStatusCounts as Record<string, unknown>, 'waiting_support') +
        readCountFromJson(selectedCustomer.ticketStatusCounts as Record<string, unknown>, 'waiting_engineering')
      : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-[color:var(--color-border)] bg-white/95 px-5 py-5 shadow-[0_16px_30px_rgba(19,33,79,0.08)]">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">Clientes</StatusPill>
          <StatusPill>Hub operacional</StatusPill>
        </div>
        <div className="mt-3 space-y-1">
          <h1 className="text-[1.9rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
            Carteira de clientes
          </h1>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            Use esta tela para localizar a conta certa antes de abrir o detalhe completo ou voltar para a fila.
          </p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <SupportCustomerDetailCard
            description="Busca e recortes rapidos para chegar ao cliente certo."
            title="Encontrar cliente"
          >
            <div className="space-y-3">
              <TextInput
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou slug"
                value={query}
              />
              <GhostButton className="min-h-11 w-full px-4" onClick={() => void loadCustomers(selectedTenantId)}>
                Recarregar lista
              </GhostButton>
            </div>
          </SupportCustomerDetailCard>

          <SupportCustomerDetailCard
            description="Pulso rapido da carteira carregada agora."
            title="Resumo da carteira"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SupportCustomerMetricTile helper="contas na leitura atual" label="Clientes" value={String(totalCustomers)} />
              <SupportCustomerMetricTile helper="contas em operacao ativa" label="Ativos" value={String(activeCustomers)} />
              <SupportCustomerMetricTile helper="itens ainda em aberto" label="Tickets abertos" value={String(openTickets)} />
              <SupportCustomerMetricTile helper="pessoas prontas para contato" label="Contatos ativos" value={String(activeContacts)} />
            </div>
          </SupportCustomerDetailCard>

          <SupportCustomerDetailCard
            description="Contas mais recentes dentro do recorte atual."
            title="Clientes carregados"
          >
            <div className="space-y-2">
              {filteredCustomers.length === 0 ? (
                <InlineNotice>Nenhum cliente apareceu com este termo.</InlineNotice>
              ) : (
                filteredCustomers.slice(0, 8).map((customer) => {
                  const selected = customer.tenantId === selectedCustomer?.tenantId;
                  const label =
                    customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug;

                  return (
                    <button
                      className={cx(
                        'w-full rounded-[18px] border px-4 py-3 text-left transition',
                        selected
                          ? 'border-[rgba(48,127,226,0.34)] bg-[rgba(48,127,226,0.08)]'
                          : 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] hover:border-[rgba(48,127,226,0.22)] hover:bg-white',
                      )}
                      key={customer.tenantId}
                      onClick={() => setSelectedTenantId(customer.tenantId)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--color-ink)]">
                          {label}
                        </p>
                        <StatusPill tone={customer.tenantStatus === 'active' ? 'positive' : 'warning'}>
                          {humanizeCustomerValue(customer.tenantStatus)}
                        </StatusPill>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                        {customer.openTicketCount} ticket(s) aberto(s) · {customer.activeContactsCount} contato(s) ativo(s)
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </SupportCustomerDetailCard>
        </aside>

        <div className="space-y-5">
          {selectedCustomer ? (
            <>
              <section className="rounded-[30px] border border-[color:var(--color-border)] bg-white/95 px-6 py-6 shadow-[0_18px_40px_rgba(16,30,74,0.09)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={selectedCustomer.tenantStatus === 'active' ? 'positive' : 'warning'}>
                        {humanizeCustomerValue(selectedCustomer.tenantStatus)}
                      </StatusPill>
                      <StatusPill>{displayCustomerValue(selectedCustomer.tenantSlug)}</StatusPill>
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-[2rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
                        {previewLabel}
                      </h2>
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        Resumo rapido antes de abrir o detalhe completo do cliente.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to={`/support/customers/${selectedCustomer.tenantId}`}>
                      <AppButton>Abrir detalhe do cliente</AppButton>
                    </Link>
                    <Link to="/support/queue">
                      <GhostButton>Voltar para a fila</GhostButton>
                    </Link>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_318px]">
                <div className="space-y-5">
                  <SupportCustomerDetailCard
                    description="Indicadores que ajudam a decidir qual conta precisa de prioridade agora."
                    title="Resumo operacional"
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SupportCustomerMetricTile helper="itens ativos nesta conta" label="Tickets abertos" value={String(selectedCustomer.openTicketCount)} />
                      <SupportCustomerMetricTile helper="historico acumulado" label="Total de tickets" value={String(selectedCustomer.totalTicketCount)} />
                      <SupportCustomerMetricTile helper="pessoas aptas para contato" label="Contatos ativos" value={String(selectedCustomer.activeContactsCount)} />
                      <SupportCustomerMetricTile helper="itens aguardando retorno" label="Em espera" value={String(previewWaiting)} />
                    </div>
                  </SupportCustomerDetailCard>

                  <SupportCustomerDetailCard
                    description="Leitura curta para comparar as contas sem sair desta tela."
                    title="Visao rapida da conta"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Nome operacional
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--color-ink)]">
                          {displayCustomerValue(selectedCustomer.tenantDisplayName)}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Razao social
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--color-ink)]">
                          {displayCustomerValue(selectedCustomer.tenantLegalName)}
                        </p>
                      </div>
                    </div>
                  </SupportCustomerDetailCard>
                </div>

                <aside className="space-y-5">
                  <SupportCustomerDetailCard
                    className="px-4 py-4"
                    description="Atalhos uteis para continuar a operacao."
                    title="Proximos passos"
                  >
                    <div className="space-y-2">
                      <Link
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#1e63ff,#2e7cf5)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(18,81,213,0.35)]"
                        to={`/support/customers/${selectedCustomer.tenantId}`}
                      >
                        Ver perfil completo
                      </Link>
                      <Link
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-[16px] border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
                        to="/support/queue"
                      >
                        Abrir fila operacional
                      </Link>
                    </div>
                  </SupportCustomerDetailCard>

                  <SupportCustomerDetailCard
                    className="px-4 py-4"
                    description="Leitura do status atual sem ocupar a area principal."
                    title="Sinais da conta"
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={selectedCustomer.tenantStatus === 'active' ? 'positive' : 'warning'}>
                        {humanizeCustomerValue(selectedCustomer.tenantStatus)}
                      </StatusPill>
                      <StatusPill>{displayCustomerValue(selectedCustomer.tenantSlug)}</StatusPill>
                      <StatusPill>{String(selectedCustomer.totalTicketCount)} historico</StatusPill>
                    </div>
                  </SupportCustomerDetailCard>

                  <SupportCustomerDetailCard
                    className="px-4 py-4"
                    description="Ultimos dados conhecidos deste cadastro."
                    title="Atualizacao"
                  >
                    <div className="space-y-2 text-sm leading-6 text-[color:var(--color-muted)]">
                      <p>Criado em {formatDateTime(selectedCustomer.tenantCreatedAt)}</p>
                      <p>Atualizado em {formatDateTime(selectedCustomer.tenantUpdatedAt)}</p>
                    </div>
                  </SupportCustomerDetailCard>
                </aside>
              </div>
            </>
          ) : (
            <EmptyState
              title="Nenhum cliente selecionado"
              description="Escolha uma conta da lista para abrir o resumo operacional."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function SupportCustomerPage() {
  const { markSessionExpired } = useAuthContext();
  const { tenantId } = useParams();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<SupportCustomer360 | null>(null);
  const [accountContext, setAccountContext] =
    useState<SupportCustomerAccountContext | null>(null);
  const [recentTicketsWindow, setRecentTicketsWindow] =
    useState<SupportCustomerRecentTicketsWindow>(emptyCustomerRecentTicketsWindow());
  const [recentEventsWindow, setRecentEventsWindow] =
    useState<SupportCustomerRecentEventsWindow>(emptyCustomerRecentEventsWindow());

  const loadCustomer = useEffectEvent(async () => {
    if (!tenantId) {
      setCustomer(null);
      setAccountContext(null);
      setRecentTicketsWindow(emptyCustomerRecentTicketsWindow());
      setRecentEventsWindow(emptyCustomerRecentEventsWindow());
      setPhase('error');
      setMessage('Cliente ausente na rota desta tela.');
      return;
    }

    try {
      const [detail, context, recentTickets, recentEvents] = await Promise.all([
        getSupportCustomer360(tenantId),
        getSupportCustomerAccountContext(tenantId),
        getSupportCustomerRecentTickets(tenantId),
        getSupportCustomerRecentEvents(tenantId),
      ]);

      setBackendDenied(false);
      setCustomer(detail);
      setAccountContext(context);
      setRecentTicketsWindow(recentTickets);
      setRecentEventsWindow(recentEvents);
      setMessage(null);
      setPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o contexto do cliente.',
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
      setAccountContext(null);
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
    return (
      <div className="space-y-5">
        <div className="space-y-3 rounded-[28px] border border-[color:var(--color-border)] bg-white/94 px-6 py-6 shadow-[0_16px_34px_rgba(16,30,74,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="accent">Clientes</StatusPill>
            <StatusPill>Resumo</StatusPill>
          </div>
          <div className="space-y-2">
            <LoadingBlock className="h-7 w-56" />
            <LoadingBlock className="h-4 w-[420px] max-w-full" />
          </div>
          <LoadingBlock className="h-20 rounded-[22px]" />
          <div className="flex flex-wrap gap-3">
            <LoadingBlock className="h-11 w-24 rounded-full" />
            <LoadingBlock className="h-11 w-24 rounded-full" />
            <LoadingBlock className="h-11 w-24 rounded-full" />
            <LoadingBlock className="h-11 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[294px_minmax(0,1.28fr)_318px]">
          <div className="space-y-5">
            <LoadingBlock className="h-[318px] rounded-[26px]" />
            <LoadingBlock className="h-[190px] rounded-[26px]" />
            <LoadingBlock className="h-[172px] rounded-[26px]" />
          </div>
          <div className="space-y-5">
            <LoadingBlock className="h-[184px] rounded-[26px]" />
            <LoadingBlock className="h-[272px] rounded-[26px]" />
            <LoadingBlock className="h-[286px] rounded-[26px]" />
          </div>
          <div className="space-y-5">
            <LoadingBlock className="h-[178px] rounded-[26px]" />
            <LoadingBlock className="h-[224px] rounded-[26px]" />
            <LoadingBlock className="h-[204px] rounded-[26px]" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="resumo operacional do cliente" />;
  }

  if (phase === 'error') {
    return (
      <ErrorState
        description={message ?? 'O contexto deste cliente nao ficou disponivel neste ambiente.'}
        action={<AppButton onClick={() => void loadCustomer()}>Tentar novamente</AppButton>}
      />
    );
  }

  if (!customer) {
    return (
      <EmptyState
        title="Cliente nao encontrado"
        description="O cliente solicitado nao apareceu na leitura operacional disponivel."
      />
    );
  }

  const primaryContact = primaryContactFromCustomer(customer);
  const primaryPlatform = primaryPlatformFromContext(accountContext);
  const ownerName = resolveSupportCustomerOwner(customer, recentTicketsWindow);
  const latestActivity = resolveLatestCustomerActivity(
    customer,
    recentTicketsWindow,
    recentEventsWindow,
  );
  const riskProfile = resolveCustomerRiskProfile(accountContext);
  const migrationCard = resolveMigrationCard(accountContext);
  const openWaitingCount =
    readCountFromJson(customer.ticketStatusCounts as Record<string, unknown>, 'waiting_customer') +
    readCountFromJson(customer.ticketStatusCounts as Record<string, unknown>, 'waiting_support') +
    readCountFromJson(customer.ticketStatusCounts as Record<string, unknown>, 'waiting_engineering');
  const criticalSignals =
    accountContext?.activeAlerts.filter(
      (alert) => alert.severity === 'critical' || alert.severity === 'high',
    ).length ?? 0;
  const highRiskCustomizations = visibleRiskCustomizations(accountContext, 3);
  const visibleFeatures = visibleFeatureSlice(accountContext, 5);
  const visibleAlerts = visibleAlertSlice(accountContext, 3);
  const visibleIntegrations = visibleOperationalIntegrations(accountContext, 4);
  const customerLabel =
    customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug;
  const customerTabs = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'contatos', label: 'Contatos' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'migracao', label: 'Migracao' },
    { id: 'saude', label: 'Saude' },
    { id: 'atividade', label: 'Atividade' },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-[color:var(--color-border)] bg-white/95 px-6 py-6 shadow-[0_18px_40px_rgba(16,30,74,0.09)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="accent">Clientes</StatusPill>
              <StatusPill>{displayCustomerValue(accountContext?.productLine ? humanizeCustomerValue(accountContext.productLine) : null)}</StatusPill>
              <StatusPill tone={riskProfile.tone}>{riskProfile.label}</StatusPill>
            </div>
            <div className="space-y-1">
              <h1 className="text-[2.25rem] font-semibold tracking-[-0.06em] text-[color:var(--color-ink)]">
                {customerLabel}
              </h1>
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Contexto operacional completo da conta, contatos, tickets e sinais de saude.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <GhostButton className="min-h-11 px-4" onClick={() => window.history.back()}>
              Voltar
            </GhostButton>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
              to="/support/queue"
            >
              Abrir fila
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Slug', value: displayCustomerValue(customer.tenantSlug) },
              {
                label: 'Produto',
                value: displayCustomerValue(
                  accountContext?.productLine ? humanizeCustomerValue(accountContext.productLine) : null,
                ),
              },
              {
                label: 'Plataforma',
                value: displayCustomerValue(primaryPlatform?.provider ?? null),
              },
              {
                label: 'Plano',
                value: displayCustomerValue(accountContext?.accountTier),
              },
              {
                label: 'Responsavel',
                value: displayCustomerValue(ownerName),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3"
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--color-ink)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 border-b border-[color:var(--color-border)] pb-2">
          {customerTabs.map((tab) => (
            <a
              className={cx(
                'inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition',
                tab.id === 'resumo'
                  ? 'bg-[rgba(48,127,226,0.1)] text-[color:var(--color-brand-blue)] shadow-[inset_0_-2px_0_var(--color-brand-blue)]'
                  : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-ink)]',
              )}
              href={`#${tab.id}`}
              key={tab.id}
            >
              {tab.label}
            </a>
          ))}
        </nav>
      </section>

      <div className="grid gap-5 xl:grid-cols-[294px_minmax(0,1.28fr)_318px]">
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#071942_0%,#0b235b_58%,#103071_100%)] px-4 py-5 text-white shadow-[0_22px_42px_rgba(8,22,61,0.28)]">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/92 text-lg font-semibold text-[color:var(--color-brand-blue)]">
                    {customerLabel
                      .split(' ')
                      .slice(0, 2)
                      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
                      .join('')}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-[1.55rem] font-semibold tracking-[-0.05em]">{customerLabel}</h2>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={customer.tenantStatus === 'active' ? 'positive' : 'warning'}>
                        {displayCustomerValue(humanizeCustomerValue(customer.tenantStatus))}
                      </StatusPill>
                      <StatusPill tone={migrationCard.accentTone}>{migrationCard.phase}</StatusPill>
                    </div>
                  </div>
                </div>
              </div>

              <StatusPill tone={riskProfile.tone}>{riskProfile.label}</StatusPill>

              <dl className="space-y-3 text-sm">
                {[
                  {
                    label: 'Plataforma',
                    value: displayCustomerValue(primaryPlatform?.provider ?? null),
                  },
                  {
                    label: 'Produto',
                    value: displayCustomerValue(
                      accountContext?.productLine ? humanizeCustomerValue(accountContext.productLine) : null,
                    ),
                  },
                  {
                    label: 'Responsavel',
                    value: displayCustomerValue(ownerName),
                  },
                  {
                    label: 'Ultima atividade',
                    value: latestActivity ? formatDateTime(latestActivity) : 'Indisponível',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                  >
                    <dt className="text-white/68">{item.label}</dt>
                    <dd className="text-right font-medium text-white">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-2 pt-1">
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#1e63ff,#2e7cf5)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(18,81,213,0.35)]"
                  to="/support/queue"
                >
                  Abrir tickets
                </Link>
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[16px] border border-white/18 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/8"
                  onClick={() => window.history.back()}
                  type="button"
                >
                  Voltar para a conta anterior
                </button>
              </div>
            </div>
          </section>

          <SupportCustomerDetailCard
            className="px-4 py-4"
            description="Contato operacional mais confiavel para continuar a tratativa."
            title="Contato principal"
          >
            {primaryContact ? (
              <div className="space-y-3">
                <div className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                  <p className="font-semibold text-[color:var(--color-ink)]">{primaryContact.fullName}</p>
                  <p className="mt-1 break-all text-sm text-[color:var(--color-muted)]">
                    {displayCustomerValue(primaryContact.email)}
                  </p>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-[color:var(--color-muted)]">
                  <p>
                    Vinculo principal: {primaryContact.isPrimary ? 'Sim' : 'Indisponível'}
                  </p>
                  <p>Usuario vinculado: {primaryContact.linkedUserId ? 'Ativo' : 'Indisponível'}</p>
                </div>
              </div>
            ) : (
              <InlineNotice tone="warning">
                Nenhum contato principal foi resolvido para esta conta.
              </InlineNotice>
            )}
          </SupportCustomerDetailCard>

          <SupportCustomerDetailCard
            className="px-4 py-4"
            description="Tags uteis para lembrar o stack e o contexto da conta."
            title="Sinais da conta"
          >
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="positive">
                {displayCustomerValue(primaryPlatform?.provider ?? null)}
              </StatusPill>
              <StatusPill tone="accent">
                {displayCustomerValue(
                  accountContext?.productLine ? humanizeCustomerValue(accountContext.productLine) : null,
                )}
              </StatusPill>
              <StatusPill>
                {displayCustomerValue(accountContext?.accountTier)}
              </StatusPill>
              <StatusPill tone={migrationCard.accentTone}>{migrationCard.phase}</StatusPill>
            </div>
          </SupportCustomerDetailCard>
        </aside>

        <div className="space-y-5">
          <div id="resumo">
            <SupportCustomerDetailCard
              title="Resumo operacional"
              description="Os indicadores que mais ajudam o suporte e o CS a decidir o proximo passo."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SupportCustomerMetricTile
                  helper="Tickets ativos neste tenant."
                  label="Tickets abertos"
                  value={String(customer.openTicketCount)}
                />
                <SupportCustomerMetricTile
                  helper="Itens aguardando retorno ou acao."
                  label="Em espera"
                  value={String(openWaitingCount)}
                />
                <SupportCustomerMetricTile
                  helper="Contatos ativos na leitura atual."
                  label="Contatos ativos"
                  value={String(customer.activeContactsCount)}
                />
                <SupportCustomerMetricTile
                  helper="Alertas criticos e sinais fortes de risco."
                  label="Sinais criticos"
                  value={String(criticalSignals)}
                />
              </div>
            </SupportCustomerDetailCard>
          </div>

          <div id="tickets">
            <SupportCustomerDetailCard
              actions={
                <Link
                  className="text-sm font-semibold text-[color:var(--color-brand-blue)]"
                  to="/support/queue"
                >
                  Ver fila
                </Link>
              }
              description={`Mostrando ${recentTicketsWindow.tickets.length} de ${recentTicketsWindow.totalAvailableCount} tickets recentes.`}
              title="Tickets recentes"
            >
              {recentTicketsWindow.tickets.length === 0 ? (
                <InlineNotice>Nenhum ticket recente apareceu para esta conta.</InlineNotice>
              ) : (
                <div className="overflow-hidden rounded-[20px] border border-[color:var(--color-border)]">
                  <div className="hidden grid-cols-[122px_minmax(0,1.35fr)_minmax(140px,0.9fr)_148px] gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)] md:grid">
                    <span>Status</span>
                    <span>Ticket</span>
                    <span>Responsavel</span>
                    <span>Atualizacao</span>
                  </div>
                  <div className="divide-y divide-[color:var(--color-border)]">
                    {recentTicketsWindow.tickets.map((ticket) => (
                      <Link
                        className="grid gap-3 px-4 py-4 transition hover:bg-[color:var(--color-surface)] md:grid-cols-[122px_minmax(0,1.35fr)_minmax(140px,0.9fr)_148px]"
                        key={ticket.id}
                        to={`/support/tickets/${ticket.id}`}
                      >
                        <div className="min-w-0">
                          <StatusPill tone={toneForTicketStatus(ticket.status)}>
                            {humanizeStatus(ticket.status)}
                          </StatusPill>
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="line-clamp-2 text-sm font-semibold text-[color:var(--color-ink)]">
                            {ticket.title}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                            {humanizeToken(ticket.priority)} · {humanizeToken(ticket.severity)}
                          </p>
                        </div>
                        <div className="min-w-0 text-sm text-[color:var(--color-muted)]">
                          {displayCustomerValue(ticket.assignedToFullName)}
                        </div>
                        <div className="text-sm text-[color:var(--color-muted)]">
                          {formatDateTime(ticket.updatedAt)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </SupportCustomerDetailCard>
          </div>

          <SupportCustomerDetailCard
            description={`Mostrando ${recentEventsWindow.events.length} de ${recentEventsWindow.totalAvailableCount} registros recentes.`}
            title="Timeline operacional"
          >
            {recentEventsWindow.events.length === 0 ? (
              <InlineNotice>Nenhuma atividade operacional recente ficou disponivel.</InlineNotice>
            ) : (
              <div className="space-y-4" id="atividade">
                {recentEventsWindow.events.map((event, index) => (
                  <div className="grid gap-3 md:grid-cols-[28px_minmax(0,1fr)_164px]" key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`}>
                    <div className="relative flex justify-center">
                      <span className="mt-2 inline-flex h-3.5 w-3.5 rounded-full bg-[color:var(--color-brand-blue)]" />
                      {index < recentEventsWindow.events.length - 1 ? (
                        <span className="absolute top-5 h-[calc(100%+0.5rem)] w-px bg-[rgba(48,127,226,0.28)]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                          {humanizeToken(event.eventType)}
                        </p>
                        <StatusPill tone={event.visibility === 'internal' ? 'warning' : 'accent'}>
                          {humanizeVisibility(event.visibility)}
                        </StatusPill>
                      </div>
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        {event.ticketTitle}
                      </p>
                    </div>
                    <div className="text-sm text-[color:var(--color-muted)]">
                      {formatDateTime(event.occurredAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SupportCustomerDetailCard>
        </div>

        <aside className="space-y-5">
          <SupportCustomerDetailCard
            className="px-4 py-4"
            description="Leitura curta da conta para decidir se a tratativa pede atencao extra."
            title="Saude da conta"
          >
            <div className="space-y-4" id="saude">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--color-ink)]">Saude geral</p>
                <StatusPill tone={riskProfile.tone}>{riskProfile.healthLabel}</StatusPill>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cx(
                    'h-full rounded-full',
                    riskProfile.accentClassName,
                    riskProfile.tone === 'positive' && 'w-[28%]',
                    riskProfile.tone === 'warning' && 'w-[64%]',
                    riskProfile.tone === 'critical' && 'w-[82%]',
                    riskProfile.tone === 'default' && 'w-[44%]',
                  )}
                />
              </div>
              <div className="space-y-2 text-sm leading-6 text-[color:var(--color-muted)]">
                <p>{visibleAlerts.length} alerta(s) ativo(s) na leitura operacional.</p>
                <p>{highRiskCustomizations.length} customizacao(oes) com atencao operacional.</p>
                <p>{customer.openTicketCount} ticket(s) ainda em aberto para esta conta.</p>
              </div>
            </div>
          </SupportCustomerDetailCard>

          <SupportCustomerDetailCard
            className="px-4 py-4"
            description="Passos e sinais que mostram o momento operacional da conta."
            title="Migracao"
          >
            <div className="space-y-4" id="migracao">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--color-ink)]">Fase atual</p>
                <StatusPill tone={migrationCard.accentTone}>{migrationCard.phase}</StatusPill>
              </div>
              <div className="space-y-3">
                {migrationCard.steps.map((step) => (
                  <div className="flex items-center gap-3" key={step.label}>
                    <span
                      className={cx(
                        'inline-flex h-4 w-4 rounded-full border',
                        step.state === 'done' && 'border-emerald-500 bg-emerald-500',
                        step.state === 'active' && 'border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]',
                        step.state === 'pending' && 'border-slate-300 bg-white',
                      )}
                    />
                    <p
                      className={cx(
                        'text-sm',
                        step.state === 'pending'
                          ? 'text-[color:var(--color-muted)]'
                          : 'font-medium text-[color:var(--color-ink)]',
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 text-sm leading-6 text-[color:var(--color-muted)]">
                <p>Integracoes operacionais: {visibleIntegrations.length}</p>
                <p>Features ativas: {visibleFeatures.length}</p>
                <p>Ultima consolidacao: {latestActivity ? formatDateTime(latestActivity) : 'Indisponível'}</p>
              </div>
            </div>
          </SupportCustomerDetailCard>

          <SupportCustomerDetailCard
            className="px-4 py-4"
            description="Tickets, contatos e sinais que ajudam a seguir a conta sem trocar de tela."
            title="Contexto complementar"
          >
            <div className="space-y-4">
              <div className="space-y-2" id="contatos">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                  Contatos ativos
                </p>
                {customer.activeContacts.length === 0 ? (
                  <p className="text-sm leading-6 text-[color:var(--color-muted)]">Indisponível</p>
                ) : (
                  customer.activeContacts.slice(0, 3).map((contact) => (
                    <div
                      className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-3"
                      key={contact.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[color:var(--color-ink)]">
                          {contact.fullName}
                        </p>
                        {contact.isPrimary ? <StatusPill tone="accent">principal</StatusPill> : null}
                      </div>
                      <p className="mt-1 break-all text-sm text-[color:var(--color-muted)]">
                        {displayCustomerValue(contact.email)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                  Sinais da conta
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleFeatures.length > 0 ? (
                    visibleFeatures.map((feature) => (
                      <StatusPill key={feature.featureKey}>
                        {humanizeCustomerValue(feature.featureKey)}
                      </StatusPill>
                    ))
                  ) : (
                    <StatusPill>Indisponível</StatusPill>
                  )}
                  {visibleIntegrations.map((integration) => (
                    <StatusPill key={integration.id}>{integration.provider}</StatusPill>
                  ))}
                </div>
              </div>
            </div>
          </SupportCustomerDetailCard>
        </aside>
      </div>
    </div>
  );
}
