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
  ContextSubsidebar,
  ContextSubsidebarSection,
  Field,
  GhostButton,
  InlineNotice,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
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

  return `${agent.fullName} · ${humanizeSupportRole(agent.role)}`;
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

function ConversationEntry({
  entry,
}: {
  entry: SupportTicketTimelineItem;
}) {
  const summary = summarizeTimelineEvent(entry);
  const isInternal = entry.visibility === 'internal';

  return (
    <article
      className={cx(
        'rounded-[20px] border px-4 py-4 shadow-[0_10px_22px_rgba(19,33,79,0.04)]',
        isInternal
          ? 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)]/62'
          : 'border-[rgba(48,127,226,0.18)] bg-[rgba(48,127,226,0.06)]',
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={isInternal ? 'critical' : 'accent'}>
                {humanizeVisibility(entry.visibility)}
              </StatusPill>
              <p className="text-xs font-medium text-[color:var(--color-muted)]">
                {entry.actorFullName ?? entry.actorEmail ?? 'Ator nao resolvido'}
              </p>
            </div>
            <p className="text-xs text-[color:var(--color-muted)]">
              {formatDateTime(entry.occurredAt)}
            </p>
          </div>
        </div>

        <div className="text-[15px] leading-7 text-[color:var(--color-ink)]">
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      </div>
    </article>
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
        {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
          <p className="text-xs leading-5 text-[color:var(--color-muted)]">
            {stringifyJsonPreview(entry.metadata)}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">{formatDateTime(entry.occurredAt)}</p>
    </div>
  );
}

function SupportConversation({
  window,
}: {
  window: SupportTicketTimelineRecentWindow;
}) {
  const entries = window.entries;
  const conversationEntries = entries.filter((entry) => entry.entryType === 'message');
  const eventEntries = entries.filter((entry) => entry.entryType === 'event');

  if (conversationEntries.length === 0 && eventEntries.length === 0) {
    return (
      <EmptyState
        title="Conversa vazia"
        description="Este ticket ainda nao recebeu mensagens, notas internas nem eventos adicionais."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--color-muted)]">
        Mostrando {conversationEntries.length} interacoes recentes da conversa.
        {window.hasMore
          ? ' O restante do historico fica recolhido para nao pesar a tratativa.'
          : eventEntries.length > 0
            ? ` ${eventEntries.length} registro(s) de apoio seguem no historico tecnico.`
            : ''}
      </div>

      {conversationEntries.length === 0 ? (
        <EmptyState
          title="Sem conversa recente"
          description="A janela atual ainda nao trouxe respostas publicas nem notas internas para este ticket."
        />
      ) : (
        <div className="space-y-3">
          {conversationEntries.map((entry) => (
            <ConversationEntry key={entry.timelineEntryId} entry={entry} />
          ))}
        </div>
      )}

      <details className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
          Historico tecnico e eventos de sistema
        </summary>
        <div className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
          {eventEntries.length === 0
            ? 'Nenhum registro extra apareceu nesta janela.'
            : `Mostrando ${eventEntries.length} registro(s) de apoio dentro de ${window.totalAvailableCount} itens recentes.`}
        </div>
        {eventEntries.length === 0 ? null : (
          <div className="mt-3 space-y-2">
            {eventEntries.map((entry) => (
              <TechnicalTimelineRow key={entry.timelineEntryId} entry={entry} />
            ))}
          </div>
        )}
      </details>
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
        Nenhum registro tecnico adicional apareceu nesta janela recente.
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
    <article className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
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
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
            <p className="text-xs leading-5 text-[color:var(--color-muted)]">
              Registrado por {link.createdByFullName ?? 'Operador nao identificado'} em{' '}
              {formatDateTime(link.createdAt)}
            </p>
          </div>
          {link.note ? (
            <p className="line-clamp-3 text-sm leading-6 text-[color:var(--color-muted)]">
              {link.note}
            </p>
          ) : null}
        </div>
        <GhostButton
          className="min-h-10 px-3 text-sm"
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
    <article className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-4">
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill>{humanizeKnowledgeVisibility(article.articleVisibility)}</StatusPill>
            <StatusPill>{humanizeKnowledgeStatus(article.articleStatus)}</StatusPill>
            {article.categoryName ? <StatusPill tone="accent">{article.categoryName}</StatusPill> : null}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">
              {article.articleTitle}
            </p>
            <p className="line-clamp-3 text-sm leading-6 text-[color:var(--color-muted)]">
              {article.articleSummary?.trim() || 'Resumo ainda nao informado para este artigo.'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs leading-5 text-[color:var(--color-muted)]">
            {article.isCustomerSendAllowed
              ? 'Este artigo pode ser usado como link publico ao cliente.'
              : 'Este artigo fica restrito ao uso interno do time.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <GhostButton
              className="min-h-10 px-3 text-sm"
              disabled={disabled}
              onClick={() => onLinkInternal(article.articleId)}
              type="button"
            >
              Referencia interna
            </GhostButton>
            {article.isCustomerSendAllowed ? (
              <AppButton
                className="min-h-10 px-4"
                disabled={disabled}
                onClick={() => onSendToCustomer(article.articleId)}
                type="button"
              >
                Marcar como link ao cliente
              </AppButton>
            ) : null}
            <GhostButton
              className="min-h-10 px-3 text-sm"
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
  return (
    <details className="rounded-[20px] border border-[color:var(--color-border)] bg-white px-4 py-4 shadow-[0_14px_28px_rgba(19,33,79,0.08)]" open>
      <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
        Conhecimento relacionado
      </summary>
      <div className="mt-3 space-y-4">
        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
          Use artigos da base como apoio da resposta sem tirar o foco da conversa.
        </p>

        {phase === 'contract-unavailable' ? (
          <InlineNotice tone="warning">
            {message ?? 'O contrato de conhecimento ainda nao ficou disponivel neste ambiente.'}
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
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Vinculos ativos
                </h4>
                <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                  {links.length === 0
                    ? 'Nenhum vinculo aberto'
                    : `${links.length} vinculo(s) em acompanhamento`}
                </p>
              </div>
              {links.length === 0 ? (
                <InlineNotice>
                  Nenhum artigo foi relacionado a este ticket ainda. Use a busca abaixo ou registre uma lacuna.
                </InlineNotice>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <SupportKnowledgeLinkCard
                      disabled={loading}
                      key={link.ticketKnowledgeLinkId}
                      link={link}
                      onArchive={onArchive}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-[color:var(--color-border)] pt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Buscar artigo de apoio
                </h4>
                <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                  A busca usa apenas os artigos permitidos para este ticket. O fluxo ao cliente fica restrito ao que e publico e publicado.
                </p>
              </div>

              <Field
                label="Buscar por titulo, resumo ou categoria"
                description="Os detalhes tecnicos do artigo continuam fora desta tela."
              >
                <TextInput
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Ex.: webhook ERP, correios, regra por motivo"
                  value={search}
                />
              </Field>

              <Field
                label="Observacao opcional"
                description="Use quando o vinculo precisa de um contexto curto para o proximo operador."
              >
                <TextareaInput
                  onChange={(event) => onNoteChange(event.target.value)}
                  placeholder="Ex.: artigo usado para orientar checklist do cliente ou documentar uma lacuna."
                  value={noteDraft}
                />
              </Field>

              <div className="rounded-[18px] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      Sem artigo aderente?
                    </p>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      Registre a lacuna para a base evoluir sem transformar o ticket em backlog editorial.
                    </p>
                  </div>
                  <AppButton
                    className="min-h-11 px-5"
                    disabled={loading}
                    onClick={onMarkGap}
                    type="button"
                  >
                    Marcar lacuna de documentacao
                  </AppButton>
                </div>
              </div>

              {articles.length === 0 ? (
                <InlineNotice tone="warning">
                  Nenhum artigo permitido apareceu para este filtro. Tente outro termo ou registre a lacuna diretamente.
                </InlineNotice>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                    Mostrando {articles.length} artigo(s) permitidos para este ticket.
                  </p>
                  <div className="space-y-2">
                    {articles.map((article) => (
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
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </details>
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
  const [ticketRailOpen, setTicketRailOpen] = useState(true);

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
      setDetailMessage('Nao foi possivel abrir o detalhe do ticket selecionado.');
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
      setStatusDraft(buildStatusChoices(detail.status)[0] ?? 'triage');
      setAssignDraft(detail.assignedToUserId ?? '');
      setComposerMode(detail.canAddMessage ? 'public' : detail.canAddInternalNote ? 'internal' : 'public');
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

  async function refreshDetail(ticketId: string) {
    await Promise.all([loadQueue(ticketId), loadDetail(ticketId)]);
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title={variant === 'queue' ? 'Fila operacional' : 'Ticket workspace'}
        description={
          variant === 'queue'
            ? 'Sidebar global para navegar, subsidebar para triagem e area principal para decidir o proximo atendimento.'
            : 'Sidebar global para navegar, subsidebar para operar o ticket e area principal reservada para conversa e resposta.'
        }
      />

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
        <ErrorState
          description={detailMessage ?? 'O painel operacional do ticket nao ficou disponivel.'}
        />
      ) : (
        <div className="space-y-5">
          <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(19,33,79,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>{humanizeStatus(ticketDetail.status)}</StatusPill>
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                      {humanizeToken(ticketDetail.priority)} · {humanizeToken(ticketDetail.severity)}
                    </span>
                </div>
                <div className="space-y-2">
                  <h3 className="max-w-5xl text-[1.9rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                    {ticketDetail.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--color-muted)]">
                    <span>Cliente: {ticketDetail.tenantDisplayName ?? ticketDetail.tenantLegalName ?? ticketDetail.tenantSlug}</span>
                    <span>Solicitante: {ticketDetail.requesterContactFullName ?? 'Contato nao identificado'}</span>
                    <span>
                      Responsavel:{' '}
                      {formatAssignedAgentSummary(currentAssignedAgent)
                        ?? ticketDetail.assignedToFullName
                        ?? 'Nao atribuido'}
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

              <div className="flex flex-wrap gap-2">
                <GhostButton
                  className="min-h-11 px-4"
                  onClick={() => navigate('/support/queue')}
                >
                  Voltar para fila
                </GhostButton>
                <GhostButton
                  className="min-h-11 px-4"
                  onClick={() => setTicketRailOpen((current) => !current)}
                >
                  {ticketRailOpen ? 'Recolher contexto lateral' : 'Mostrar contexto lateral'}
                </GhostButton>
              </div>
            </div>
          </section>

          {detailNotice ? <InlineNotice tone={detailNoticeTone}>{detailNotice}</InlineNotice> : null}

          {ticketRailOpen ? (
            <WorkspaceSplit
              layoutClassName="xl:grid-cols-[300px_minmax(0,1fr)]"
              sidebar={
                <ContextSubsidebar
                  description="Operacao essencial, contexto do cliente e conhecimento de apoio ficam fora da conversa principal."
                  title="Ferramentas do ticket"
                >
                  <ContextSubsidebarSection
                    description="Status atual, prioridade e dono do ticket."
                    title="Operacao"
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={toneForTicketStatus(ticketDetail.status)}>{humanizeStatus(ticketDetail.status)}</StatusPill>
                      <StatusPill tone={toneForPriority(ticketDetail.priority)}>{ticketDetail.priority}</StatusPill>
                      <StatusPill tone={toneForSeverity(ticketDetail.severity)}>{ticketDetail.severity}</StatusPill>
                    </div>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      {formatAssignedAgentSummary(currentAssignedAgent)
                        ?? ticketDetail.assignedToFullName
                        ?? 'Ticket sem agente atribuido no momento.'}
                    </p>
                  </ContextSubsidebarSection>

                  <ContextSubsidebarSection
                    description="Atribuicao segura para manter a tratativa com responsavel claro."
                    title="Responsavel"
                  >
                    {agentsPhase === 'contract-unavailable' ? (
                      <InlineNotice tone="critical">
                        {agentsMessage ?? 'A lista de agentes nao ficou disponivel neste ambiente.'}
                      </InlineNotice>
                    ) : agentsPhase === 'error' ? (
                      <InlineNotice tone="critical">
                        {agentsMessage ?? 'Nao foi possivel carregar o diretorio de agentes atribuiveis.'}
                      </InlineNotice>
                    ) : agentsPhase === 'loading' ? (
                      <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                        Carregando agentes disponiveis para este cliente...
                      </p>
                    ) : assignableAgents.length === 0 ? (
                      <InlineNotice tone="warning">
                        Nenhum agente ativo ficou disponivel para este cliente. Use o fallback manual apenas se necessario.
                      </InlineNotice>
                    ) : (
                      <form className="space-y-3" onSubmit={handleAssign}>
                        <Field label="Selecionar agente">
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
                        <AppButton
                          className="min-h-12 w-full px-5"
                          disabled={submitting || !ticketDetail.canAssign}
                          type="submit"
                        >
                          {submitting ? 'Salvando...' : 'Salvar responsavel'}
                        </AppButton>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <GhostButton
                            className="min-h-11 px-4"
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
                            className="min-h-11 px-4"
                            disabled={submitting || !ticketDetail.canAssign || !ticketDetail.assignedToUserId}
                            onClick={() => void runAssignment(null)}
                            type="button"
                          >
                            Desatribuir
                          </GhostButton>
                        </div>
                      </form>
                    )}
                  </ContextSubsidebarSection>

                  <ContextSubsidebarSection
                    description="Mova o ticket sem tirar a conversa do foco principal."
                    title="Status"
                  >
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
                      <Field label="Nota da transicao">
                        <TextareaInput
                          onChange={(event) => setStatusNote(event.target.value)}
                          placeholder="Opcional. Explique a mudanca para o proximo operador."
                          value={statusNote}
                        />
                      </Field>
                      <AppButton
                        className="min-h-12 w-full px-5"
                        disabled={submitting || !ticketDetail.canUpdateStatus}
                        type="submit"
                      >
                        {submitting ? 'Atualizando...' : 'Salvar status'}
                      </AppButton>
                    </form>
                  </ContextSubsidebarSection>

                  <ContextSubsidebarSection
                    description="Stack, alertas e contatos uteis para responder sem abrir outra tela."
                    title="Cliente B2B"
                  >
                    <SupportCustomerRail
                      accountContext={customerAccountContext}
                      compact
                      customer={customer}
                      recentEventsWindow={customerRecentEvents}
                      recentTicketsWindow={customerRecentTickets}
                    />
                  </ContextSubsidebarSection>

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

                  <ContextSubsidebarSection
                    collapsible
                    description="Fallback manual, historico tecnico e acoes de excecao ficam fora da primeira camada."
                    title="Historico tecnico e avancado"
                  >
                    <form className="space-y-3" onSubmit={handleAssign}>
                      <Field
                        label="Responsavel manual"
                        description="Use apenas em excecoes. O fluxo principal de atribuicao deve continuar no seletor acima."
                      >
                        <TextInput
                          onChange={(event) => setAssignDraft(event.target.value)}
                          placeholder="Cole o identificador manual apenas em excecao"
                          value={assignDraft}
                        />
                      </Field>
                      <AppButton
                        className="min-h-11 w-full px-5"
                        disabled={submitting || !ticketDetail.canAssign}
                        type="submit"
                      >
                        {submitting ? 'Salvando...' : 'Salvar responsavel'}
                      </AppButton>
                    </form>

                    {ticketDetail.canClose || ticketDetail.canReopen ? (
                      <div className="space-y-4 border-t border-[color:var(--color-border)] pt-4">
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
                              className="min-h-11 w-full bg-[linear-gradient(135deg,#8b1e3f,#c3365e)] px-5"
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
                            <GhostButton className="min-h-11 w-full px-4" disabled={submitting} type="submit">
                              {submitting ? 'Reabrindo...' : 'Reabrir ticket'}
                            </GhostButton>
                          </form>
                        ) : null}
                      </div>
                    ) : null}

                    <details className="rounded-[18px] border border-[color:var(--color-border)] bg-white px-4 py-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                        Historico tecnico recente
                      </summary>
                      <div className="mt-3 space-y-2">
                        <SupportTechnicalHistory window={timelineWindow} />
                      </div>
                    </details>
                  </ContextSubsidebarSection>
                </ContextSubsidebar>
              }
              main={
                <Panel
                  className="bg-white"
                  title="Conversa em andamento"
                  description="A conversa fica no centro da tratativa. Resposta publica e nota interna usam o mesmo fluxo, sem desviar para formularios tecnicos."
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
                        ? 'Modo resposta publica: a devolutiva abaixo sera visivel ao cliente B2B.'
                        : 'Modo nota interna: este registro fica restrito ao time interno autorizado.'}
                    </InlineNotice>

                    <form className="space-y-4" onSubmit={handleSubmitComposer}>
                      <Field
                        label={composerMode === 'public' ? 'Responder cliente' : 'Registrar nota interna'}
                      >
                        <TextareaInput
                          onChange={(event) =>
                            composerMode === 'public'
                              ? setMessageDraft(event.target.value)
                              : setNoteDraft(event.target.value)
                          }
                          placeholder={
                            composerMode === 'public'
                              ? 'Escreva a devolutiva tecnico-operacional ao cliente B2B.'
                              : 'Registre contexto interno, proximo passo, handoff ou observacao de suporte.'
                          }
                          value={composerDraft}
                        />
                      </Field>
                      <AppButton
                        className={
                          composerMode === 'internal'
                            ? 'min-h-12 px-6 bg-[linear-gradient(135deg,#7c2648,#b63f76)]'
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

                    <div className="border-t border-[color:var(--color-border)] pt-4">
                      <div className="mb-3 space-y-1">
                        <h4 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                          Conversa recente
                        </h4>
                        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                          Mensagens e notas internas ficam no fluxo principal. O historico tecnico e os eventos repetitivos ficam sob demanda na lateral.
                        </p>
                      </div>
                      <SupportConversation window={timelineWindow} />
                    </div>
                  </div>
                </Panel>
              }
            />
          ) : (
            <Panel
              className="bg-white"
              title="Conversa em andamento"
              description="Reabra o contexto lateral quando precisar ajustar status, responsavel ou consultar o cliente."
            >
              <div className="space-y-4">
                <InlineNotice>
                  O contexto lateral esta recolhido. A conversa continua ocupando toda a largura util.
                </InlineNotice>
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
                <form className="space-y-4" onSubmit={handleSubmitComposer}>
                  <Field label={composerMode === 'public' ? 'Responder cliente' : 'Registrar nota interna'}>
                    <TextareaInput
                      onChange={(event) =>
                        composerMode === 'public'
                          ? setMessageDraft(event.target.value)
                          : setNoteDraft(event.target.value)
                      }
                      placeholder={
                        composerMode === 'public'
                          ? 'Escreva a devolutiva tecnico-operacional ao cliente B2B.'
                          : 'Registre contexto interno, proximo passo, handoff ou observacao de suporte.'
                      }
                      value={composerDraft}
                    />
                  </Field>
                  <AppButton
                    className={
                      composerMode === 'internal'
                        ? 'min-h-12 px-6 bg-[linear-gradient(135deg,#7c2648,#b63f76)]'
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
                <div className="border-t border-[color:var(--color-border)] pt-4">
                  <div className="mb-3 space-y-1">
                    <h4 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                      Conversa recente
                    </h4>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      Reabra o contexto lateral apenas quando precisar consultar operacao, cliente ou conhecimento.
                    </p>
                  </div>
                  <SupportConversation window={timelineWindow} />
                </div>
              </div>
            </Panel>
          )}
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
  const [accountContext, setAccountContext] =
    useState<SupportCustomerAccountContext | null>(null);
  const [customers, setCustomers] = useState<SupportCustomer360[]>([]);
  const [recentTicketsWindow, setRecentTicketsWindow] =
    useState<SupportCustomerRecentTicketsWindow>(emptyCustomerRecentTicketsWindow());
  const [recentEventsWindow, setRecentEventsWindow] =
    useState<SupportCustomerRecentEventsWindow>(emptyCustomerRecentEventsWindow());

  const loadCustomer = useEffectEvent(async () => {
    if (!tenantId) {
      setCustomer(null);
      setAccountContext(null);
      setCustomers([]);
      setRecentTicketsWindow(emptyCustomerRecentTicketsWindow());
      setRecentEventsWindow(emptyCustomerRecentEventsWindow());
      setPhase('error');
      setMessage('Cliente ausente na rota desta tela.');
      return;
    }

    try {
      const [detail, context, rows, recentTickets, recentEvents] = await Promise.all([
        getSupportCustomer360(tenantId),
        getSupportCustomerAccountContext(tenantId),
        listSupportCustomers360(),
        getSupportCustomerRecentTickets(tenantId),
        getSupportCustomerRecentEvents(tenantId),
      ]);

      setBackendDenied(false);
      setCustomer(detail);
      setAccountContext(context);
      setCustomers(rows);
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
    return <LoadingState title="Carregando contexto do cliente" />;
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Support Workspace"
        title="Contexto do cliente"
        description="Sidebar global para navegar, subsidebar para trocar de cliente e atalhos, area principal para o contexto operacional real."
      />

      <WorkspaceSplit
        layoutClassName="xl:grid-cols-[292px_minmax(0,1fr)]"
        sidebar={
          <ContextSubsidebar
            description="Clientes acessiveis e atalhos de navegacao ficam aqui para nao roubar espaco do contexto principal."
            title="Ferramentas do cliente"
          >
            <ContextSubsidebarSection
              description="Troque de cliente sem sair do workspace de suporte."
              title="Outros clientes acessiveis"
            >
              <div className="space-y-3">
                {customers.map((row) => {
                  const isSelected = row.tenantId === customer.tenantId;
                  return (
                    <Link
                      className={cx(
                        'block rounded-[18px] border px-4 py-3 transition',
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
            </ContextSubsidebarSection>

            <ContextSubsidebarSection
              description="Atalhos uteis para voltar rapidamente ao fluxo de atendimento."
              title="Atalhos"
            >
              <GhostButton className="min-h-11 w-full px-4" onClick={() => window.history.back()}>
                Voltar
              </GhostButton>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
                to="/support/queue"
              >
                Abrir fila
              </Link>
            </ContextSubsidebarSection>
          </ContextSubsidebar>
        }
        main={
          <div className="space-y-5">
            <Panel
              title="Resumo operacional do cliente"
              description="Visao rapida do cliente atendido, com foco em continuidade de suporte e retorno rapido ao ticket."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-[22px] border border-[color:var(--color-border)] bg-white px-4 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill>{customer.tenantStatus}</StatusPill>
                      <StatusPill tone="accent">{customer.tenantSlug}</StatusPill>
                      {accountContext?.productLine ? (
                        <StatusPill>{humanizeCustomerValue(accountContext.productLine)}</StatusPill>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                      {customer.tenantDisplayName ?? customer.tenantLegalName ?? customer.tenantSlug}
                    </h3>
                    <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                      {customer.tenantLegalName ?? 'Razao social nao resolvida'}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-blue)]"
                    to="/support/queue"
                  >
                    Voltar para fila
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      label: 'Abertos',
                      value: String(customer.openTicketCount),
                    },
                    {
                      label: 'Contatos',
                      value: String(customer.activeContactsCount),
                    },
                    {
                      label: 'Tickets totais',
                      value: String(customer.totalTicketCount),
                    },
                  ].map((item) => (
                    <div
                      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2"
                      key={item.label}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel
              title="Produto, stack e tickets recentes"
              description="Contexto operacional do perfil do cliente e retorno rapido para tickets deste mesmo cliente."
            >
            <div className="space-y-5">
              <SupportAccountContextOverview
                accountContext={accountContext}
                customer={customer}
              />

              <div className="border-t border-[color:var(--color-border)] pt-4">
                <div className="mb-3 space-y-1">
                  <h3 className="text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
                    Tickets recentes
                  </h3>
                  <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                    Mostrando {recentTicketsWindow.tickets.length} de {recentTicketsWindow.totalAvailableCount} tickets recentes.
                  </p>
                </div>
                {recentTicketsWindow.tickets.length === 0 ? (
                  <EmptyState
                    title="Sem tickets recentes"
                    description="Nenhum ticket recente apareceu para este cliente."
                  />
                ) : (
                  <div className="space-y-2">
                    {recentTicketsWindow.tickets.map((ticket) => (
                      <SupportRecentTicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Panel
            title="Contatos ativos"
            description="Somente os contatos que ajudam a continuar o atendimento atual."
          >
            {customer.activeContacts.length === 0 ? (
              <EmptyState
                title="Sem contatos ativos"
                description="Nenhum contato ativo ficou disponivel para este cliente."
              />
            ) : (
              <div className="space-y-2">
                {customer.activeContacts.map((contact) => (
                  <SupportContactCard contact={contact} key={contact.id} />
                ))}
              </div>
            )}
          </Panel>

          <details className="rounded-[22px] border border-[color:var(--color-border)] bg-white px-5 py-4">
            <summary className="cursor-pointer text-base font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
              Eventos recentes e detalhes extras
            </summary>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
              Mostrando {recentEventsWindow.events.length} de {recentEventsWindow.totalAvailableCount} registros recentes.
            </p>
            <div className="mt-3 space-y-2">
                {recentEventsWindow.events.length === 0 ? (
                <EmptyState
                  title="Sem eventos recentes"
                  description="Nenhum evento recente apareceu para este cliente."
                />
              ) : (
                recentEventsWindow.events.map((event) => (
                  <SupportRecentEventCard
                    event={event}
                    key={`${event.ticketId}-${event.occurredAt}-${event.eventType}`}
                  />
                ))
              )}
            </div>
          </details>
          </div>
        }
      />
    </div>
  );
}
