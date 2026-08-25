import type { AnalyticsBlockState, AnalyticsDataStatus, AnalyticsExecutionStatus, AnalyticsSourceStatus, AnalyticsSourceState, AnalyticsSourceStatusPayload } from '@genius-support-os/contracts';
import { createAnalyticsBlockState, parseAnalyticsNumber } from './analytics-state.ts';
import { repairOperationalMojibake } from '../../lib/operational-copy';

// Tipos e mapeadores do modulo Analytics/Dashboard Gerencial.
// As views retornam numeric como string (PostgREST), entao normalizamos aqui.

function toNumber(value: unknown): number {
  return parseAnalyticsNumber(value) ?? 0;
}

function toNullableNumber(value: unknown): number | null {
  return parseAnalyticsNumber(value);
}

function normalizePercentage(value: unknown): number {
  const parsed = toNumber(value);
  const ratio = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, ratio));
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : repairOperationalMojibake(String(value));
}

export interface CommercialKpis {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  wonRevenue: number;
  /** Fração local para formatPercent; a API entrega pontos percentuais (0 a 100). */
  conversionRate: number | null;
  avgTicket: number;
}

export interface CommercialFunnelStage {
  stageId: string;
  label: string;
  displayOrder: number;
  isWon: boolean;
  isClosed: boolean;
  dealCount: number;
  stageRevenue: number;
}

export interface CommercialByOwner {
  ownerId: string | null;
  ownerName: string;
  dealCount: number;
  wonCount: number;
  wonRevenue: number;
}

export interface CommercialKpiOwner {
  ownerId: string | null;
  ownerName: string;
  openDeals: number;
  openAmount: number;
  wonDeals: number;
  lostDeals: number;
  wonAmount: number;
  winRate: number | null;
  medianCycleDays: number | null;
}

export interface CommercialClosedWin {
  dealId: string;
  dealName: string;
  ownerName: string;
  closedOn: string;
  amountHome: number;
}

export interface CommercialKpiDetails {
  byOwner: CommercialKpiOwner[];
  closedWins: CommercialClosedWin[];
}

export interface CommercialByPipeline {
  pipelineId: string;
  label: string;
  dealCount: number;
  wonCount: number;
  wonRevenue: number;
}

export interface CommercialMonthlyPoint {
  monthStart: string;
  createdCount: number;
  wonCount: number;
  wonRevenue: number;
}

export interface CsKpis {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  closedRate: number;
}

export interface CsByStatus {
  stageId: string;
  label: string;
  displayOrder: number;
  isClosed: boolean;
  ticketCount: number;
  pipelineBreakdown?: CsPipelineBreakdown[];
}

export interface CsPipelineBreakdown {
  pipelineId: string;
  pipelineLabel: string;
  ticketCount: number;
}

export interface CsMonthlyPoint {
  monthStart: string;
  createdCount: number;
  closedCount: number;
}

export interface CsSourcePoint {
  label: string;
  ticketCount: number;
}

export interface CsPipelinePoint {
  pipelineId: string;
  label: string;
  ticketCount: number;
  sourceSummary?: CsSourcePoint[];
}

export interface CsOwnerPoint {
  ownerId: string | null;
  ownerName: string;
  ticketCount: number;
  pipelineBreakdown?: CsPipelineBreakdown[];
}

export interface SyncRun {
  id: string;
  domainKey: string | null;
  status: 'queued' | 'running' | 'success' | 'succeeded' | 'partial' | 'error' | 'failed' | 'abandoned' | 'cancelled';
  startedAt: string;
  finishedAt: string | null;
  dealsSynced: number;
  ticketsSynced: number;
  ownersSynced: number;
  stagesSynced: number;
  companiesSynced: number;
  errorMessage: string | null;
  correlationId: string | null;
  sourceTotal: number | null;
  sourceState: string | null;
  sourcePaginationComplete: boolean;
  heartbeatAt: string | null;
  recordsNormalized: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsPromoted: number;
  pipelinesTotal: number;
  pipelinesCompleted: number;
  errorCode: string | null;
  requestCount: number | null;
  requestRetryCount: number | null;
  rateLimitCount: number | null;
  providerErrorCount: number | null;
  failedRequestCount: number | null;
  requestDurationMs: number | null;
  requestAverageDurationMs: number | null;
  requestSuccessRatePercent: number | null;
  lastRequestAt: string | null;
}

export interface AnalyticsFilters {
  from: string;
  to: string;
  ownerId: string;
  stageId: string;
  priority: string;
}

export interface CommercialSnapshot {
  kpis: CommercialKpis;
  funnel: CommercialFunnelStage[];
  byPipeline: CommercialByPipeline[];
  byOwner: CommercialByOwner[];
  monthly: CommercialMonthlyPoint[];
  state?: AnalyticsBlockState;
}

export interface CsSnapshot {
  kpis: CsKpis;
  byStatus: CsByStatus[];
  monthly: CsMonthlyPoint[];
  bySource: CsSourcePoint[];
  byPipeline: CsPipelinePoint[];
  byOwner: CsOwnerPoint[];
  latestTicketCreatedAt: string | null;
  state?: AnalyticsBlockState;
}

export interface CustomerSuccessKpis {
  companiesTotal: number;
  clientStatusFilled: number;
  contractStatusFilled: number;
  withoutOwner: number;
  mrrFilled: number;
}

export interface CustomerSuccessBreakdown {
  key: string;
  companyCount: number;
}

export interface CustomerSuccessOwner {
  ownerId: string | null;
  ownerName: string;
  companyCount: number;
}

export interface CustomerSuccessCompany {
  companyId: string;
  companyName: string;
  clientStatus: string | null;
  contractStatus: string | null;
  csOwnerId: string | null;
  csOwnerName: string;
  syncedAt: string | null;
}

export interface CustomerSuccessSnapshot {
  kpis: CustomerSuccessKpis;
  byOwner: CustomerSuccessOwner[];
  byClientStatus: CustomerSuccessBreakdown[];
  byContractStatus: CustomerSuccessBreakdown[];
  companies: CustomerSuccessCompany[];
  source: string;
  limitations: string[];
  state?: AnalyticsBlockState;
}

export interface FinanceKpis {
  totalTitles: number;
  netAmount: number;
  receivedAmount: number;
  balance: number;
  overdueTitles: number;
  overdueBalance: number;
  receivedRate: number;
  openTitles: number;
  openBalance: number;
  overdueRate: number;
  avgDaysOverdue: number;
  due30: number;
  due60: number;
  due90: number;
}

export interface FinanceBreakdown {
  key: string;
  titles: number;
  balance: number;
}

export interface FinanceDebtor {
  client: string;
  taxId: string | null;
  titles: number;
  balance: number;
}

export interface FinanceMonthlyPoint {
  month: string;
  titles: number;
  balance: number;
}

export interface FinanceCsBucket {
  key: string;
  titles: number;
  balance: number;
  overdueBalance: number;
}

export interface FinanceUnmatchedCompany {
  client: string;
  taxId: string | null;
  titles: number;
  balance: number;
  overdueBalance: number;
  nameMatches: number;
}

export interface FinanceIdentityIssue {
  omieClientCode: string;
  titles: number;
  balance: number;
  overdueBalance: number;
}

export interface FinanceSnapshot {
  /** Somente OMIE API pode ser publicado no snapshot do Dashboard. */
  source: 'api' | 'none';
  kpis: FinanceKpis;
  byStatus: FinanceBreakdown[];
  byAging: FinanceBreakdown[];
  agingDays: FinanceBreakdown[];
  monthly: FinanceMonthlyPoint[];
  projection: FinanceMonthlyPoint[];
  byCategory: FinanceBreakdown[];
  topDebtors: FinanceDebtor[];
  csReconciliation: {
    matchedBalance: number;
    unmatchedBalance: number;
    identityMissingBalance: number;
    identityIncompleteBalance: number;
    noHubspotCompanyBalance: number;
    byClientStatus: FinanceCsBucket[];
    unmatchedCompanies: FinanceUnmatchedCompany[];
    identityIssues: FinanceIdentityIssue[];
  };
  state?: AnalyticsBlockState;
}

export interface FinanceSourceStatus {
  api: { provider: string; resource: string; configured: boolean; lastSyncAt: string | null; lastStatus: string | null; metrics: string[] };
}

export type DashboardSourceStatus = AnalyticsSourceState;

export function mapAnalyticsSourceStatus(value: unknown): AnalyticsSourceStatusPayload {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const valid: AnalyticsSourceStatus[] = ['never_synced', 'syncing', 'fresh', 'stale', 'partial', 'failed', 'unavailable'];
  const executions: AnalyticsExecutionStatus[] = ['queued', 'running', 'succeeded', 'failed', 'partial', 'cancelled', 'timed_out', 'abandoned'];
  const map = (key: string, label: string): DashboardSourceStatus => {
    const row = (data[key] && typeof data[key] === 'object' ? data[key] : {}) as Record<string, unknown>;
    const status = toText(row.status);
    return {
      key,
      label,
      status: (valid.includes(status as AnalyticsSourceStatus) ? status : 'unavailable') as AnalyticsSourceStatus,
      lastAttemptAt: row.lastAttemptAt ? toText(row.lastAttemptAt) : null,
      lastSuccessAt: row.lastSuccessAt ? toText(row.lastSuccessAt) : null,
      durationMs: row.durationMs == null ? null : toNumber(row.durationMs),
      processedCount: row.processedCount == null ? null : toNumber(row.processedCount),
      error: row.error ? toText(row.error) : null,
      freshnessMinutes: row.freshnessMinutes == null ? null : toNumber(row.freshnessMinutes),
      runId: row.runId ? toText(row.runId) : null,
      origin: toText(row.origin) || key,
      currentRunId: row.currentRunId ? toText(row.currentRunId) : row.runId ? toText(row.runId) : null,
      currentRunStatus: executions.includes(toText(row.currentRunStatus) as AnalyticsExecutionStatus) ? toText(row.currentRunStatus) as AnalyticsExecutionStatus : null,
      publishedSourceStatus: (valid.includes(toText(row.publishedSourceStatus) as AnalyticsSourceStatus) ? toText(row.publishedSourceStatus) : (valid.includes(status as AnalyticsSourceStatus) ? status : 'unavailable')) as AnalyticsSourceStatus,
      lastFailureAt: row.lastFailureAt ? toText(row.lastFailureAt) : null,
      rejectedCount: row.rejectedCount == null ? null : toNumber(row.rejectedCount),
      sanitizedError: row.sanitizedError ? toText(row.sanitizedError) : row.error ? toText(row.error) : null,
      hasValidSnapshot: row.hasValidSnapshot === true,
    };
  };
  const globalStatus = toText(data.globalStatus);
  return {
    hubspot: map('hubspot', 'HubSpot'),
    omie: map('omie', 'OMIE'),
    globalStatus: (valid.includes(globalStatus as AnalyticsSourceStatus) ? globalStatus : 'unavailable') as AnalyticsSourceStatus,
  };
}

export function analyticsSourceToBlockState(source: AnalyticsSourceState): AnalyticsBlockState {
  return {
    status: source.status,
    source: source.label,
    asOf: source.lastSuccessAt,
    lastSuccessfulSyncAt: source.lastSuccessAt,
    syncRunId: source.runId,
    coverage: { expected: null, received: source.processedCount },
    reason: source.error,
  };
}

export function analyticsGlobalToBlockState(payload: AnalyticsSourceStatusPayload): AnalyticsBlockState {
  const lastSuccessAt = [payload.hubspot.lastSuccessAt, payload.omie.lastSuccessAt].filter(Boolean).sort().at(-1) ?? null;
  const reason = payload.globalStatus === 'failed'
    ? [payload.hubspot.error, payload.omie.error].filter(Boolean).join(' ')
    : null;
  return {
    status: payload.globalStatus,
    source: 'HubSpot + OMIE',
    asOf: lastSuccessAt,
    lastSuccessfulSyncAt: lastSuccessAt,
    syncRunId: null,
    coverage: { expected: null, received: null },
    reason: reason || null,
  };
}

export interface OmieSyncRun {
  id: string;
  sourceKey: string;
  status: 'processing' | 'completed' | 'partial' | 'failed' | 'empty' | 'abandoned';
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  correlationId: string | null;
  requestCount: number | null;
  requestRetryCount: number | null;
  rateLimitCount: number | null;
  providerErrorCount: number | null;
  failedRequestCount: number | null;
  requestDurationMs: number | null;
  requestAverageDurationMs: number | null;
  requestSuccessRatePercent: number | null;
  lastRequestAt: string | null;
  enrichmentCacheSource: 'cache' | 'api' | 'stale_cache' | 'api_partial' | 'unavailable' | null;
  enrichmentCacheAgeSeconds: number | null;
  enrichmentCacheRows: number | null;
}

export interface CeoSnapshot {
  commercial: { totalDeals: number; openDeals: number; wonDeals: number; lostDeals: number; openPipelineValue: number; wonRevenue: number; conversionRate: number | null; avgTicket: number; avgSalesCycleDays: number; unassignedDeals: number };
  customerSuccess: { activeCustomers: number; assignedCustomers: number; customersWithoutOwner: number; healthAvailable: number; riskCustomers: number; source: string; state: AnalyticsBlockState };
  support: { totalTickets: number; createdTickets: number; openTickets: number; closedTickets: number; closedRate: number; highPriorityOpen: number; firstResponseSlaTracked: number; closeSlaTracked: number; sourceFilled: number; bySource: CsSourcePoint[]; byPipeline: CsPipelinePoint[]; byOwner: CsOwnerPoint[]; latestTicketCreatedAt: string | null };
  finance: { titles: number; netAmount: number; balance: number; overdueTitles: number; overdueBalance: number; matchedTitles: number; unmatchedTitles: number };
  product: { status: AnalyticsDataStatus; source: string; reason: string };
  development: { status: AnalyticsDataStatus; source: string; reason: string };
  financialAlerts: FinancialAlert[];
  dataQuality: { financeTitles: number; matchedFinanceTitles: number; unmatchedFinanceTitles: number; ambiguousFinanceTitles: number; resolvedGroupTitles: number; supportUnassigned: number; supportWithoutSource: number; financeSourceAt: string | null; hubspotSourceAt: string | null };
  state?: AnalyticsBlockState;
}

export interface CeoHistory {
  currentFrom: string;
  currentTo: string;
  previousFrom: string;
  previousTo: string;
  current: CeoSnapshot;
  previous: CeoSnapshot;
}

export interface FinancialAlert {
  alertKey: string;
  companyId: string | null;
  companyName: string;
  sourceClientName: string;
  csOwnerId: string | null;
  csOwnerName: string;
  mrr: number;
  clientStatus: string;
  contractStatus: string;
  overdueBalance: number;
  overdueTitles: number;
  maxDaysOverdue: number;
  oldestDueDate: string | null;
  matchConfidence: number;
  matchMethod: string;
  candidateCount: number;
}

export interface AmbiguousCompanyCandidate {
  companyId: string;
  companyName: string;
  domain: string;
  contractStatus: string;
  clientStatus: string;
  csOwnerId: string | null;
  csOwnerName: string;
  matchMethod: string;
}

export interface AmbiguousOverdueTitle {
  financeId: string;
  sourceClientName: string;
  sourceTaxId: string;
  documentNumber: string;
  balance: number;
  dueDate: string | null;
  issuedDate: string | null;
  candidateCount: number;
  candidates: AmbiguousCompanyCandidate[];
}

export interface ReconciliationQualityCandidate extends AmbiguousCompanyCandidate {
  taxId: string;
}

export interface ReconciliationQualityRow {
  financeId: string;
  sourceClientName: string;
  sourceTaxId: string;
  documentNumber: string;
  balance: number;
  dueDate: string | null;
  issuedDate: string | null;
  candidateCount: number;
  matchStatus: 'matched' | 'unmatched' | 'ambiguous';
  candidates: ReconciliationQualityCandidate[];
}

export interface ReconciliationQualitySummary {
  rowsTotal: number;
  groupsTotal?: number;
  titlesTotal?: number;
  matchedTitles: number;
  unmatchedTitles: number;
  ambiguousTitles: number;
  matchedGroups?: number;
  unmatchedGroups?: number;
  ambiguousGroups?: number;
}

export interface ReconciliationQualityGroup {
  groupKey: string;
  sourceClientName: string;
  sourceTaxId: string;
  titleCount: number;
  totalBalance: number;
  oldestDueDate: string | null;
  latestDueDate: string | null;
  candidateCount: number;
  matchStatus: ReconciliationQualityRow['matchStatus'];
  matchedTitles: number;
  unmatchedTitles: number;
  ambiguousTitles: number;
  resolutionType: 'economic_group' | null;
  resolutionLabel: string | null;
  resolutionMasterCompanyId: string | null;
  resolutionMemberCompanyIds: string[];
  resolutionNote: string | null;
  candidates: ReconciliationQualityCandidate[];
  titles: ReconciliationQualityRow[];
}

export interface ReconciliationQualityResult {
  summary: ReconciliationQualitySummary;
  rows: ReconciliationQualityRow[];
  groups: ReconciliationQualityGroup[];
}

export interface AnalyticsSourceConfig {
  id: string;
  domainKey: 'commercial' | 'cs' | 'unclassified';
  objectType: 'deal' | 'ticket';
  pipelineId: string;
  hubspotLabel: string | null;
  alias: string | null;
  label: string;
  isActive: boolean;
  areaKey: 'commercial' | 'customer_success' | 'support' | 'chat' | 'a_classificar';
  classificationSource: 'legacy' | 'admin' | 'confirmed' | 'pending';
  groupCompany: string;
  groupCompanySource: 'pending' | 'suggested' | 'confirmed';
  isArchived: boolean;
  discoveryStatus: 'pending' | 'active' | 'archived';
  lastDiscoveredAt: string | null;
}

export interface AnalyticsPipelineInventory {
  pipelineId: string;
  objectType: 'deal' | 'ticket';
  domainKeys: string[];
  areaKeys: string[];
  groupCompanies: string[];
  groupCompanySource: 'pending' | 'suggested' | 'confirmed';
  mappingState: 'inactive' | 'ambiguous' | 'suggested' | 'unclassified' | 'confirmed';
  isActive: boolean;
  isArchived: boolean;
}

export interface AnalyticsSyncHistoryRow {
  runId: string | null;
  cycleId: string;
  rowKind: 'cycle' | 'step';
  sourceKey: 'hubspot' | 'omie' | null;
  sourceLabel: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  processedCount: number;
  errorMessage: string | null;
  correlationId: string | null;
  triggerKind: 'manual' | 'automatic' | 'diagnostic';
  currentStep: string | null;
}

export interface AnalyticsSharedPeriod {
  from: string;
  to: string;
}

export interface AnalyticsSharedPipelineExclusions {
  commercial: string[];
  support: string[];
}

export interface AnalyticsPageProps {
  sharedPeriod?: AnalyticsSharedPeriod;
  onSharedPeriodChange?: (period: AnalyticsSharedPeriod) => void;
  /** Recorte de operação compartilhado entre todas as abas do Dashboard. */
  sharedOperation?: string;
  onSharedOperationChange?: (operation: string) => void;
  /** Exclusões temporárias compartilhadas por objeto entre as abas e a Visão Geral. */
  sharedExcludedPipelineIds?: AnalyticsSharedPipelineExclusions;
  onSharedExcludedPipelineIdsChange?: (next: AnalyticsSharedPipelineExclusions) => void;
  onRetry?: () => void;
  isDashboardViewer?: boolean;
  sourceStatus?: AnalyticsSourceStatusPayload;
  canSyncSources?: boolean;
  syncSources?: () => void;
  syncBusy?: boolean;
}

export const EMPTY_COMMERCIAL_KPIS: CommercialKpis = {
  totalDeals: 0,
  openDeals: 0,
  wonDeals: 0,
  lostDeals: 0,
  wonRevenue: 0,
  conversionRate: null,
  avgTicket: 0,
};

export const EMPTY_CS_KPIS: CsKpis = {
  totalTickets: 0,
  openTickets: 0,
  closedTickets: 0,
  closedRate: 0,
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  from: '',
  to: '',
  ownerId: '',
  stageId: '',
  priority: '',
};

export function mapCommercialSnapshot(value: unknown): CommercialSnapshot {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = (key: string) => (Array.isArray(data[key]) ? data[key] : []) as Record<string, unknown>[];
  const rawKpis = (data.kpis && typeof data.kpis === 'object' ? data.kpis : {}) as Record<string, unknown>;
  const received = toNumber(rawKpis.total_deals);
  return {
    kpis: mapCommercialKpis(rawKpis),
    funnel: rows('funnel').map(mapCommercialFunnel),
    byPipeline: rows('by_pipeline').map(mapCommercialByPipeline),
    byOwner: rows('by_owner').map(mapCommercialByOwner),
    monthly: rows('monthly').map(mapCommercialMonthly),
    state: createSnapshotState(data, 'HubSpot / Deals', received),
  };
}

export function mapCsSnapshot(value: unknown): CsSnapshot {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = (key: string) => (Array.isArray(data[key]) ? data[key] : []) as Record<string, unknown>[];
  const rawKpis = (data.kpis && typeof data.kpis === 'object' ? data.kpis : {}) as Record<string, unknown>;
  return {
    kpis: mapCsKpis(rawKpis),
    byStatus: rows('by_status').map(mapCsByStatus),
    monthly: rows('monthly').map(mapCsMonthly),
    bySource: rows('by_source').map((row) => ({ label: toText(row.label) || 'Sem fonte', ticketCount: toNumber(row.ticket_count) })),
    byPipeline: rows('by_pipeline').map((row) => ({ pipelineId: toText(row.pipeline_id), label: toText(row.label) || 'Pipeline sem nome', ticketCount: toNumber(row.ticket_count), sourceSummary: Array.isArray(row.source_summary) ? row.source_summary.map((source) => { const item = (source && typeof source === 'object' ? source : {}) as Record<string, unknown>; return { label: toText(item.label) || 'Sem fonte', ticketCount: toNumber(item.ticket_count) }; }) : [] })),
    byOwner: rows('by_owner').map((row) => ({ ownerId: row.owner_id ? toText(row.owner_id) : null, ownerName: toText(row.owner_name) || 'Sem responsavel', ticketCount: toNumber(row.ticket_count), pipelineBreakdown: mapCsPipelineBreakdown(row.pipeline_breakdown) })),
    latestTicketCreatedAt: data.latest_ticket_created_at ? toText(data.latest_ticket_created_at) : null,
    state: createSnapshotState(data, 'HubSpot / Tickets', toNumber(rawKpis.total_tickets)),
  };
}

export function mapCustomerSuccessSnapshot(value: unknown): CustomerSuccessSnapshot {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = (key: string) => (Array.isArray(data[key]) ? data[key] : []) as Record<string, unknown>[];
  const rawKpis = (data.kpis && typeof data.kpis === 'object' ? data.kpis : {}) as Record<string, unknown>;
  const companies = rows('companies').map((row) => ({
    companyId: toText(row.company_id),
    companyName: toText(row.company_name) || 'Empresa sem nome',
    clientStatus: row.client_status ? toText(row.client_status) : null,
    contractStatus: row.contract_status ? toText(row.contract_status) : null,
    csOwnerId: row.cs_owner_id ? toText(row.cs_owner_id) : null,
    csOwnerName: toText(row.cs_owner_name) || 'Sem responsável',
    syncedAt: row.synced_at ? toText(row.synced_at) : null,
  }));
  const breakdown = (key: string) => rows(key).map((row) => ({ key: toText(row.key) || 'Indisponível', companyCount: toNumber(row.company_count) }));
  return {
    kpis: { companiesTotal: toNumber(rawKpis.companies_total), clientStatusFilled: toNumber(rawKpis.client_status_filled), contractStatusFilled: toNumber(rawKpis.contract_status_filled), withoutOwner: toNumber(rawKpis.without_owner), mrrFilled: toNumber(rawKpis.mrr_filled) },
    byOwner: rows('by_owner').map((row) => ({ ownerId: row.owner_id ? toText(row.owner_id) : null, ownerName: toText(row.owner_name) || 'Sem responsável', companyCount: toNumber(row.company_count) })),
    byClientStatus: breakdown('by_client_status'),
    byContractStatus: breakdown('by_contract_status'),
    companies,
    source: toText(data.source) || 'HubSpot',
    limitations: Array.isArray(data.limitations) ? data.limitations.map(toText).filter(Boolean) : [],
    state: createSnapshotState(data, toText(data.source) || 'HubSpot', toNumber(rawKpis.companies_total), true),
  };
}

export function mapFinanceSnapshot(value: unknown): FinanceSnapshot {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = (key: string) => (Array.isArray(data[key]) ? data[key] : []) as Record<string, unknown>[];
  const recon = (data.cs_reconciliation && typeof data.cs_reconciliation === 'object' ? data.cs_reconciliation : {}) as Record<string, unknown>;
  const reconRows = (Array.isArray(recon.by_client_status) ? recon.by_client_status : []) as Record<string, unknown>[];
  const reconExceptions = (data.reconciliation_exceptions && typeof data.reconciliation_exceptions === 'object' ? data.reconciliation_exceptions : {}) as Record<string, unknown>;
  const unmatchedCompanies = (Array.isArray(reconExceptions.unmatched_companies) ? reconExceptions.unmatched_companies : []) as Record<string, unknown>[];
  const identityIssues = (Array.isArray(reconExceptions.identity_issues) ? reconExceptions.identity_issues : []) as Record<string, unknown>[];
  const sourceValue: FinanceSnapshot['source'] = data.source === 'api' ? 'api' : 'none';
  const rawKpis = (data.kpis && typeof data.kpis === 'object' ? data.kpis : {}) as Record<string, unknown>;
  return {
    source: sourceValue,
    kpis: mapFinanceKpis(rawKpis),
    byStatus: rows('by_status').map((row) => mapFinanceBreakdown(row, 'status')),
    byAging: rows('by_aging').map((row) => mapFinanceBreakdown(row, 'bucket')),
    agingDays: rows('aging_days').map((row) => mapFinanceBreakdown(row, 'bucket')),
    monthly: rows('monthly').map((row) => ({ month: toText(row.month), titles: toNumber(row.titles), balance: toNumber(row.balance) })),
    projection: rows('projection').map((row) => ({ month: toText(row.month), titles: toNumber(row.titles), balance: toNumber(row.balance) })),
    byCategory: rows('by_category').map((row) => mapFinanceBreakdown(row, 'key')),
    topDebtors: rows('top_debtors').map((row) => ({ client: toText(row.client) || 'Indisponível', taxId: toText(row.tax_id) || null, titles: toNumber(row.titles), balance: toNumber(row.balance) })),
    csReconciliation: {
      matchedBalance: toNumber(recon.matched_balance),
      unmatchedBalance: toNumber(recon.unmatched_balance),
      identityMissingBalance: toNumber(recon.identity_missing_balance),
      identityIncompleteBalance: toNumber(recon.identity_incomplete_balance),
      noHubspotCompanyBalance: toNumber(recon.no_hubspot_company_balance),
      byClientStatus: reconRows.map((row) => ({ key: toText(row.key) || 'Indisponível', titles: toNumber(row.titles), balance: toNumber(row.balance), overdueBalance: toNumber(row.overdue_balance) })),
      unmatchedCompanies: unmatchedCompanies.map((row) => ({ client: toText(row.client) || 'Empresa sem nome', taxId: row.tax_id ? toText(row.tax_id) : null, titles: toNumber(row.titles), balance: toNumber(row.balance), overdueBalance: toNumber(row.overdue_balance), nameMatches: toNumber(row.name_matches) })),
      identityIssues: identityIssues.map((row) => ({ omieClientCode: toText(row.omie_client_code) || 'Sem código OMIE', titles: toNumber(row.titles), balance: toNumber(row.balance), overdueBalance: toNumber(row.overdue_balance) })),
    },
    state: createSnapshotState(data, sourceValue === 'none' ? 'OMIE indisponível' : 'OMIE API', toNumber(rawKpis.total_titles), sourceValue !== 'none'),
  };
}

export function mapFinanceSourceStatus(value: unknown): FinanceSourceStatus {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const api = (data.api && typeof data.api === 'object' ? data.api : {}) as Record<string, unknown>;
  return {
    api: { provider: toText(api.provider) || 'Omie', resource: toText(api.resource) || 'Contas a Receber', configured: Boolean(api.configured), lastSyncAt: api.last_sync_at ? toText(api.last_sync_at) : null, lastStatus: api.last_status ? toText(api.last_status) : null, metrics: Array.isArray(api.metrics) ? api.metrics.map(toText).filter(Boolean) : [] },
  };
}

export function mapOmieSyncRun(row: Record<string, unknown>): OmieSyncRun {
  return {
    id: toText(row.id),
    sourceKey: toText(row.source_key) || 'omie_receivables_api',
    status: (toText(row.status) || 'failed') as OmieSyncRun['status'],
    totalRows: toNumber(row.total_rows),
    acceptedRows: toNumber(row.accepted_rows),
    rejectedRows: toNumber(row.rejected_rows),
    startedAt: toText(row.started_at),
    finishedAt: row.finished_at ? toText(row.finished_at) : null,
    errorMessage: row.error_message ? toText(row.error_message) : null,
    correlationId: row.correlation_id ? toText(row.correlation_id) : null,
    requestCount: row.request_count == null ? null : toNumber(row.request_count),
    requestRetryCount: row.request_retry_count == null ? null : toNumber(row.request_retry_count),
    rateLimitCount: row.rate_limit_count == null ? null : toNumber(row.rate_limit_count),
    providerErrorCount: row.provider_error_count == null ? null : toNumber(row.provider_error_count),
    failedRequestCount: row.failed_request_count == null ? null : toNumber(row.failed_request_count),
    requestDurationMs: row.request_duration_ms == null ? null : toNumber(row.request_duration_ms),
    requestAverageDurationMs: row.request_average_duration_ms == null ? null : toNumber(row.request_average_duration_ms),
    requestSuccessRatePercent: row.request_success_rate_percent == null ? null : toNumber(row.request_success_rate_percent),
    lastRequestAt: row.last_request_at ? toText(row.last_request_at) : null,
    enrichmentCacheSource: row.enrichment_cache_source ? toText(row.enrichment_cache_source) as OmieSyncRun['enrichmentCacheSource'] : null,
    enrichmentCacheAgeSeconds: row.enrichment_cache_age_seconds == null ? null : toNumber(row.enrichment_cache_age_seconds),
    enrichmentCacheRows: row.enrichment_cache_rows == null ? null : toNumber(row.enrichment_cache_rows),
  };
}

export function mapCeoSnapshot(value: unknown): CeoSnapshot {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const section = (key: string) => (data[key] && typeof data[key] === 'object' ? data[key] : {}) as Record<string, unknown>;
  const c = section('commercial'); const cs = section('customer_success'); const s = section('support'); const f = section('finance');
  const product = section('product'); const development = section('development');
  const financialAlerts = Array.isArray(data.financial_alerts) ? data.financial_alerts : [];
  const quality = section('data_quality');
  const received = toNumber(c.total_deals) + toNumber(s.total_tickets) + toNumber(f.titles);
  const conversionRate = toNullableNumber(c.conversion_rate);
  return {
    commercial: { totalDeals: toNumber(c.total_deals), openDeals: toNumber(c.open_deals), wonDeals: toNumber(c.won_deals), lostDeals: toNumber(c.lost_deals), openPipelineValue: toNumber(c.open_pipeline_value), wonRevenue: toNumber(c.won_revenue), conversionRate: conversionRate === null ? null : conversionRate / 100, avgTicket: toNumber(c.avg_ticket), avgSalesCycleDays: toNumber(c.avg_sales_cycle_days), unassignedDeals: toNumber(c.unassigned_deals) },
    customerSuccess: {
      activeCustomers: toNumber(cs.active_customers),
      assignedCustomers: toNumber(cs.assigned_customers),
      customersWithoutOwner: toNumber(cs.customers_without_owner),
      healthAvailable: toNumber(cs.health_available),
      riskCustomers: toNumber(cs.risk_customers),
      source: toText(cs.source) || 'Carteira CS',
      state: createSnapshotState(cs, toText(cs.source) || 'Carteira CS', toNumber(cs.active_customers), true),
    },
    support: { totalTickets: toNumber(s.total_tickets), createdTickets: toNumber(s.created_tickets || s.total_tickets), openTickets: toNumber(s.open_tickets), closedTickets: toNumber(s.closed_tickets), closedRate: toNumber(s.closed_rate), highPriorityOpen: toNumber(s.high_priority_open), firstResponseSlaTracked: toNumber(s.first_response_sla_tracked), closeSlaTracked: toNumber(s.close_sla_tracked), sourceFilled: toNumber(s.source_filled), bySource: Array.isArray(s.by_source) ? s.by_source.map((row) => { const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>; return { label: toText(item.label) || 'Sem fonte', ticketCount: toNumber(item.ticket_count) }; }) : [], byPipeline: Array.isArray(s.by_pipeline) ? s.by_pipeline.map((row) => { const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>; return { pipelineId: toText(item.pipeline_id), label: toText(item.label) || 'Pipeline sem nome', ticketCount: toNumber(item.ticket_count) }; }) : [], byOwner: Array.isArray(s.by_owner) ? s.by_owner.map((row) => { const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>; return { ownerId: item.owner_id ? toText(item.owner_id) : null, ownerName: toText(item.owner_name) || 'Sem responsavel', ticketCount: toNumber(item.ticket_count) }; }) : [], latestTicketCreatedAt: s.latest_ticket_created_at ? toText(s.latest_ticket_created_at) : null },
    finance: { titles: toNumber(f.titles), netAmount: toNumber(f.net_amount), balance: toNumber(f.balance), overdueTitles: toNumber(f.overdue_titles), overdueBalance: toNumber(f.overdue_balance), matchedTitles: toNumber(f.matched_titles), unmatchedTitles: toNumber(f.unmatched_titles) },
    product: { status: (toText(product.status) || 'not_configured') as AnalyticsDataStatus, source: toText(product.source) || 'Fonte ainda não conectada', reason: toText(product.reason) || 'Ainda não existe uma fonte confiável conectada para Produto.' },
    development: { status: (toText(development.status) || 'not_configured') as AnalyticsDataStatus, source: toText(development.source) || 'Fonte ainda não conectada', reason: toText(development.reason) || 'Ainda não existe uma fonte confiável conectada para Desenvolvimento.' },
    financialAlerts: financialAlerts.map((row) => { const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>; return { alertKey: toText(item.alert_key), companyId: item.company_id ? toText(item.company_id) : null, companyName: toText(item.company_name) || 'Cliente não reconciliado', sourceClientName: toText(item.source_client_name), csOwnerId: item.cs_owner_id ? toText(item.cs_owner_id) : null, csOwnerName: toText(item.cs_owner_name), mrr: toNumber(item.mrr), clientStatus: toText(item.client_status), contractStatus: toText(item.contract_status), overdueBalance: toNumber(item.overdue_balance), overdueTitles: toNumber(item.overdue_titles), maxDaysOverdue: toNumber(item.max_days_overdue), oldestDueDate: item.oldest_due_date ? toText(item.oldest_due_date) : null, matchConfidence: toNumber(item.match_confidence), matchMethod: toText(item.match_method), candidateCount: toNumber(item.candidate_count) }; }),
    dataQuality: { financeTitles: toNumber(quality.finance_titles), matchedFinanceTitles: toNumber(quality.matched_finance_titles), unmatchedFinanceTitles: toNumber(quality.unmatched_finance_titles), ambiguousFinanceTitles: toNumber(quality.ambiguous_finance_titles), resolvedGroupTitles: toNumber(quality.resolved_group_titles), supportUnassigned: toNumber(quality.support_unassigned), supportWithoutSource: toNumber(quality.support_without_source), financeSourceAt: quality.finance_source_at ? toText(quality.finance_source_at) : null, hubspotSourceAt: quality.hubspot_source_at ? toText(quality.hubspot_source_at) : null },
    state: createSnapshotState(data, 'HubSpot + OMIE', received),
  };
}

function createSnapshotState(data: Record<string, unknown>, source: string, received: number, sourceConfigured = true): AnalyticsBlockState {
  const status = data.status;
  const validStatus = typeof status === 'string' && ['fresh', 'stale', 'partial', 'never_synced', 'empty', 'zero', 'not_configured', 'syncing', 'unavailable', 'failed', 'error'].includes(status);
  const lastSuccessfulSyncAt = typeof data.last_successful_sync_at === 'string'
    ? data.last_successful_sync_at
    : typeof data.synced_at === 'string' ? data.synced_at : null;
  const state = createAnalyticsBlockState({
    source,
    sourceConfigured,
    queried: true,
    received,
    expected: typeof data.expected_count === 'number' ? data.expected_count : null,
    lastSuccessfulSyncAt,
    staleAfterMinutes: typeof data.stale_after_minutes === 'number' ? data.stale_after_minutes : null,
    partial: data.partial === true,
    unavailable: data.unavailable === true,
    error: data.error === true,
    reason: typeof data.reason === 'string' ? data.reason : null,
  });
  const syncRunId = typeof data.sync_run_id === 'string' ? data.sync_run_id : null;
  return {
    ...(validStatus ? { ...state, status: status as AnalyticsDataStatus } : state),
    syncRunId,
  };
}

export function mapCeoHistory(value: unknown): CeoHistory {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    currentFrom: toText(data.current_from),
    currentTo: toText(data.current_to),
    previousFrom: toText(data.previous_from),
    previousTo: toText(data.previous_to),
    current: mapCeoSnapshot(data.current),
    previous: mapCeoSnapshot(data.previous),
  };
}

export function mapReconciliationQuality(value: unknown): ReconciliationQualityResult {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const summary = (data.summary && typeof data.summary === 'object' ? data.summary : {}) as Record<string, unknown>;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const mapCandidate = (candidate: unknown): ReconciliationQualityCandidate => { const entry = (candidate && typeof candidate === 'object' ? candidate : {}) as Record<string, unknown>; return { companyId: toText(entry.company_id), companyName: toText(entry.company_name), domain: toText(entry.domain), taxId: toText(entry.tax_id), contractStatus: toText(entry.contract_status), clientStatus: toText(entry.client_status), csOwnerId: entry.cs_owner_id ? toText(entry.cs_owner_id) : null, csOwnerName: toText(entry.cs_owner_name), matchMethod: toText(entry.match_method) }; };
  const mapRow = (row: unknown): ReconciliationQualityRow => {
      const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const candidates = Array.isArray(item.candidates) ? item.candidates : [];
      return {
        financeId: toText(item.finance_id), sourceClientName: toText(item.source_client_name), sourceTaxId: toText(item.source_tax_id), documentNumber: toText(item.document_number), balance: toNumber(item.balance), dueDate: item.due_date ? toText(item.due_date) : null, issuedDate: item.issued_date ? toText(item.issued_date) : null, candidateCount: toNumber(item.candidate_count), matchStatus: (toText(item.match_status) || 'unmatched') as ReconciliationQualityRow['matchStatus'],
        candidates: candidates.map(mapCandidate),
      };
    };
  const groups = Array.isArray(data.groups) ? data.groups.map((group) => { const item = (group && typeof group === 'object' ? group : {}) as Record<string, unknown>; const candidates = Array.isArray(item.candidates) ? item.candidates : []; const titles = Array.isArray(item.titles) ? item.titles : []; const memberIds = Array.isArray(item.resolution_member_company_ids) ? item.resolution_member_company_ids.map(toText).filter(Boolean) : []; return { groupKey: toText(item.group_key), sourceClientName: toText(item.source_client_name), sourceTaxId: toText(item.source_tax_id), titleCount: toNumber(item.title_count), totalBalance: toNumber(item.total_balance), oldestDueDate: item.oldest_due_date ? toText(item.oldest_due_date) : null, latestDueDate: item.latest_due_date ? toText(item.latest_due_date) : null, candidateCount: toNumber(item.candidate_count), matchStatus: (toText(item.match_status) || 'unmatched') as ReconciliationQualityRow['matchStatus'], matchedTitles: toNumber(item.matched_titles), unmatchedTitles: toNumber(item.unmatched_titles), ambiguousTitles: toNumber(item.ambiguous_titles), resolutionType: item.resolution_type ? toText(item.resolution_type) as 'economic_group' : null, resolutionLabel: item.resolution_label ? toText(item.resolution_label) : null, resolutionMasterCompanyId: item.resolution_master_company_id ? toText(item.resolution_master_company_id) : null, resolutionMemberCompanyIds: memberIds, resolutionNote: item.resolution_note ? toText(item.resolution_note) : null, candidates: candidates.map(mapCandidate), titles: titles.map(mapRow) }; }) : [];
  return {
    summary: { rowsTotal: toNumber(summary.groups_total ?? summary.rows_total), groupsTotal: toNumber(summary.groups_total), titlesTotal: toNumber(summary.titles_total ?? summary.rows_total), matchedTitles: toNumber(summary.matched_titles), unmatchedTitles: toNumber(summary.unmatched_titles), ambiguousTitles: toNumber(summary.ambiguous_titles), matchedGroups: toNumber(summary.matched_groups), unmatchedGroups: toNumber(summary.unmatched_groups), ambiguousGroups: toNumber(summary.ambiguous_groups) },
    rows: rows.map(mapRow),
    groups,
  };
}

export function mapAnalyticsSourceConfig(row: Record<string, unknown>): AnalyticsSourceConfig {
  const pipelineId = toText(row.hubspot_pipeline_id);
  const hubspotLabel = row.hubspot_pipeline_label ? toText(row.hubspot_pipeline_label) : null;
  const label = row.label ? toText(row.label) : null;
  const alias = row.has_alias === true
    ? (row.alias ? toText(row.alias) : label)
    : (label && hubspotLabel && label !== hubspotLabel ? label : null);
  const areaKey = toText(row.area_key) as AnalyticsSourceConfig['areaKey'];
  const discoveryStatus = toText(row.discovery_status) as AnalyticsSourceConfig['discoveryStatus'];
  return {
    id: toText(row.id),
    domainKey: toText(row.domain_key) as AnalyticsSourceConfig['domainKey'],
    objectType: toText(row.object_type) as AnalyticsSourceConfig['objectType'],
    pipelineId,
    hubspotLabel,
    alias,
    label: label || hubspotLabel || pipelineId,
    isActive: Boolean(row.is_active),
    areaKey: ['commercial', 'customer_success', 'support', 'chat', 'a_classificar'].includes(areaKey) ? areaKey : 'a_classificar',
    classificationSource: (['legacy', 'admin', 'confirmed', 'pending'].includes(toText(row.classification_source)) ? toText(row.classification_source) : 'pending') as AnalyticsSourceConfig['classificationSource'],
    groupCompany: toText(row.group_company) || 'a_definir',
    groupCompanySource: (['pending', 'suggested', 'confirmed'].includes(toText(row.group_company_source)) ? toText(row.group_company_source) : 'pending') as AnalyticsSourceConfig['groupCompanySource'],
    isArchived: Boolean(row.is_archived),
    discoveryStatus: ['pending', 'active', 'archived'].includes(discoveryStatus) ? discoveryStatus : 'pending',
    lastDiscoveredAt: row.last_discovered_at ? toText(row.last_discovered_at) : null,
  };
}

export function mapAnalyticsPipelineInventory(row: Record<string, unknown>): AnalyticsPipelineInventory {
  const objectType = toText(row.object_type);
  const source = toText(row.group_company_source);
  const mappingState = toText(row.mapping_state);
  const values = (value: unknown) => Array.isArray(value) ? value.map(toText).filter(Boolean) : [];
  return {
    pipelineId: toText(row.pipeline_id),
    objectType: objectType === 'deal' ? 'deal' : 'ticket',
    domainKeys: values(row.domain_keys),
    areaKeys: values(row.area_keys),
    groupCompanies: values(row.group_companies),
    groupCompanySource: (['pending', 'suggested', 'confirmed'].includes(source) ? source : 'pending') as AnalyticsPipelineInventory['groupCompanySource'],
    mappingState: (['inactive', 'ambiguous', 'suggested', 'unclassified', 'confirmed'].includes(mappingState) ? mappingState : 'unclassified') as AnalyticsPipelineInventory['mappingState'],
    isActive: row.is_active === true,
    isArchived: row.is_archived === true,
  };
}

export function mapAnalyticsSyncHistory(row: Record<string, unknown>): AnalyticsSyncHistoryRow {
  return {
    runId: row.run_id ? toText(row.run_id) : null,
    cycleId: toText(row.cycle_id) || toText(row.correlation_id),
    rowKind: toText(row.row_kind) === 'step' ? 'step' : 'cycle',
    sourceKey: ['hubspot', 'omie'].includes(toText(row.source_key)) ? toText(row.source_key) as 'hubspot' | 'omie' : null,
    sourceLabel: toText(row.source_label) || 'Ciclo de atualização',
    status: toText(row.status) || 'unknown',
    startedAt: toText(row.started_at),
    finishedAt: row.finished_at ? toText(row.finished_at) : null,
    durationMs: toNumber(row.duration_ms),
    processedCount: toNumber(row.processed_count),
    errorMessage: row.error_message ? toText(row.error_message) : null,
    correlationId: row.correlation_id ? toText(row.correlation_id) : null,
    triggerKind: (['manual', 'automatic', 'diagnostic'].includes(toText(row.trigger_kind)) ? toText(row.trigger_kind) : 'automatic') as AnalyticsSyncHistoryRow['triggerKind'],
    currentStep: row.current_step ? toText(row.current_step) : null,
  };
}

export function mapAmbiguousOverdueTitles(value: unknown): AmbiguousOverdueTitle[] {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = Array.isArray(data.titles) ? data.titles : [];
  return rows.map((row) => {
    const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
    const candidates = Array.isArray(item.candidates) ? item.candidates : [];
    return {
      financeId: toText(item.finance_id),
      sourceClientName: toText(item.source_client_name),
      sourceTaxId: toText(item.source_tax_id),
      documentNumber: toText(item.document_number),
      balance: toNumber(item.balance),
      dueDate: item.due_date ? toText(item.due_date) : null,
      issuedDate: item.issued_date ? toText(item.issued_date) : null,
      candidateCount: toNumber(item.candidate_count),
      candidates: candidates.map((candidate) => {
        const entry = (candidate && typeof candidate === 'object' ? candidate : {}) as Record<string, unknown>;
        return { companyId: toText(entry.company_id), companyName: toText(entry.company_name), domain: toText(entry.domain), contractStatus: toText(entry.contract_status), clientStatus: toText(entry.client_status), csOwnerId: entry.cs_owner_id ? toText(entry.cs_owner_id) : null, csOwnerName: toText(entry.cs_owner_name), matchMethod: toText(entry.match_method) };
      }),
    };
  });
}

export function mapFinanceKpis(row: Record<string, unknown> | null): FinanceKpis {
  if (!row) return { totalTitles: 0, netAmount: 0, receivedAmount: 0, balance: 0, overdueTitles: 0, overdueBalance: 0, receivedRate: 0, openTitles: 0, openBalance: 0, overdueRate: 0, avgDaysOverdue: 0, due30: 0, due60: 0, due90: 0 };
  return {
    totalTitles: toNumber(row.total_titles),
    netAmount: toNumber(row.net_amount),
    receivedAmount: toNumber(row.received_amount),
    balance: toNumber(row.balance),
    overdueTitles: toNumber(row.overdue_titles),
    overdueBalance: toNumber(row.overdue_balance),
    receivedRate: normalizePercentage(row.received_rate),
    openTitles: toNumber(row.open_titles),
    openBalance: toNumber(row.open_balance),
    overdueRate: normalizePercentage(row.overdue_rate),
    avgDaysOverdue: toNumber(row.avg_days_overdue),
    due30: toNumber(row.due_30),
    due60: toNumber(row.due_60),
    due90: toNumber(row.due_90),
  };
}

function mapFinanceBreakdown(row: Record<string, unknown>, key: string): FinanceBreakdown {
  return { key: toText(row[key]) || 'Indisponível', titles: toNumber(row.titles), balance: toNumber(row.balance) };
}

export function mapCommercialKpis(row: Record<string, unknown> | null): CommercialKpis {
  if (!row) return EMPTY_COMMERCIAL_KPIS;
  const conversionRate = toNullableNumber(row.conversion_rate);
  return {
    totalDeals: toNumber(row.total_deals),
    openDeals: toNumber(row.open_deals),
    wonDeals: toNumber(row.won_deals),
    lostDeals: toNumber(row.lost_deals),
    wonRevenue: toNumber(row.won_revenue),
    conversionRate: conversionRate === null ? null : conversionRate / 100,
    avgTicket: toNumber(row.avg_ticket),
  };
}

export function mapCommercialKpiDetails(value: unknown): CommercialKpiDetails {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const rows = (key: string) => (Array.isArray(data[key]) ? data[key] : []) as Record<string, unknown>[];
  return {
    byOwner: rows('by_owner').map((row) => ({
      ownerId: row.owner_id ? toText(row.owner_id) : null,
      ownerName: toText(row.owner_name) || 'Sem responsável',
      openDeals: toNumber(row.open_deals),
      openAmount: toNumber(row.open_amount),
      wonDeals: toNumber(row.won_deals),
      lostDeals: toNumber(row.lost_deals),
      wonAmount: toNumber(row.won_amount),
      winRate: toNullableNumber(row.win_rate),
      medianCycleDays: toNullableNumber(row.median_cycle_days),
    })),
    closedWins: rows('closed_wins').map((row) => ({
      dealId: toText(row.deal_id),
      dealName: toText(row.deal_name) || 'Negócio sem nome',
      ownerName: toText(row.owner_name) || 'Sem responsável',
      closedOn: toText(row.closed_on),
      amountHome: toNumber(row.amount_home),
    })),
  };
}

export function mapCommercialFunnel(row: Record<string, unknown>): CommercialFunnelStage {
  return {
    stageId: toText(row.stage_id),
    label: toText(row.label),
    displayOrder: toNumber(row.display_order),
    isWon: Boolean(row.is_won),
    isClosed: Boolean(row.is_closed),
    dealCount: toNumber(row.deal_count),
    stageRevenue: toNumber(row.stage_revenue),
  };
}

export function mapCommercialByOwner(row: Record<string, unknown>): CommercialByOwner {
  return {
    ownerId: row.owner_id ? toText(row.owner_id) : null,
    ownerName: toText(row.owner_name) || 'Sem responsavel',
    dealCount: toNumber(row.deal_count),
    wonCount: toNumber(row.won_count),
    wonRevenue: toNumber(row.won_revenue),
  };
}

export function mapCommercialByPipeline(row: Record<string, unknown>): CommercialByPipeline {
  return {
    pipelineId: toText(row.pipeline_id),
    label: toText(row.label) || 'Pipeline sem nome',
    dealCount: toNumber(row.deal_count),
    wonCount: toNumber(row.won_count),
    wonRevenue: toNumber(row.won_revenue),
  };
}

export function mapCommercialMonthly(row: Record<string, unknown>): CommercialMonthlyPoint {
  return {
    monthStart: toText(row.month_start),
    createdCount: toNumber(row.created_count),
    wonCount: toNumber(row.won_count),
    wonRevenue: toNumber(row.won_revenue),
  };
}

export function mapCsKpis(row: Record<string, unknown> | null): CsKpis {
  if (!row) return EMPTY_CS_KPIS;
  return {
    totalTickets: toNumber(row.total_tickets),
    openTickets: toNumber(row.open_tickets),
    closedTickets: toNumber(row.closed_tickets),
    closedRate: toNumber(row.closed_rate),
  };
}

export function mapCsByStatus(row: Record<string, unknown>): CsByStatus {
  return {
    stageId: toText(row.stage_id),
    label: toText(row.label),
    displayOrder: toNumber(row.display_order),
    isClosed: Boolean(row.is_closed),
    ticketCount: toNumber(row.ticket_count),
    pipelineBreakdown: mapCsPipelineBreakdown(row.pipeline_breakdown),
  };
}

function mapCsPipelineBreakdown(value: unknown): CsPipelineBreakdown[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
    return { pipelineId: toText(item.pipeline_id), pipelineLabel: toText(item.pipeline_label) || 'Pipeline sem nome', ticketCount: toNumber(item.ticket_count) };
  });
}

export function mapCsMonthly(row: Record<string, unknown>): CsMonthlyPoint {
  return {
    monthStart: toText(row.month_start),
    createdCount: toNumber(row.created_count),
    closedCount: toNumber(row.closed_count),
  };
}

export function mapSyncRun(row: Record<string, unknown> | null): SyncRun | null {
  if (!row) return null;
  return {
    id: toText(row.id),
    domainKey: row.domain_key ? toText(row.domain_key) : null,
    status: (toText(row.status) || 'running') as SyncRun['status'],
    startedAt: toText(row.started_at),
    finishedAt: row.finished_at ? toText(row.finished_at) : null,
    dealsSynced: toNumber(row.deals_synced),
    ticketsSynced: toNumber(row.tickets_synced),
    ownersSynced: toNumber(row.owners_synced),
    stagesSynced: toNumber(row.stages_synced),
    companiesSynced: toNumber(row.companies_synced),
    errorMessage: row.error_message ? toText(row.error_message) : null,
    correlationId: row.correlation_id ? toText(row.correlation_id) : null,
    sourceTotal: row.source_total === null || row.source_total === undefined ? null : toNumber(row.source_total),
    sourceState: row.source_state ? toText(row.source_state) : null,
    sourcePaginationComplete: row.source_pagination_complete === true,
    heartbeatAt: row.heartbeat_at ? toText(row.heartbeat_at) : null,
    recordsNormalized: toNumber(row.records_normalized),
    recordsAccepted: toNumber(row.records_accepted),
    recordsRejected: toNumber(row.records_rejected),
    recordsPromoted: toNumber(row.records_promoted),
    pipelinesTotal: toNumber(row.pipelines_total),
    pipelinesCompleted: toNumber(row.pipelines_completed),
    errorCode: row.error_code ? toText(row.error_code) : null,
    requestCount: row.request_count == null ? null : toNumber(row.request_count),
    requestRetryCount: row.request_retry_count == null ? null : toNumber(row.request_retry_count),
    rateLimitCount: row.rate_limit_count == null ? null : toNumber(row.rate_limit_count),
    providerErrorCount: row.provider_error_count == null ? null : toNumber(row.provider_error_count),
    failedRequestCount: row.failed_request_count == null ? null : toNumber(row.failed_request_count),
    requestDurationMs: row.request_duration_ms == null ? null : toNumber(row.request_duration_ms),
    requestAverageDurationMs: row.request_average_duration_ms == null ? null : toNumber(row.request_average_duration_ms),
    requestSuccessRatePercent: row.request_success_rate_percent == null ? null : toNumber(row.request_success_rate_percent),
    lastRequestAt: row.last_request_at ? toText(row.last_request_at) : null,
  };
}

// Formatadores de apresentacao (pt-BR).
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(ratio);
}

export function formatCommercialConversionRate(value: number | null): string {
  return value === null ? 'Indisponível' : formatPercent(value);
}

/** O read model de KPI entrega win_rate em pontos percentuais, não em fração. */
export function formatCommercialWinRate(value: number | null): string {
  return value === null
    ? 'Indisponível'
    : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatMonthLabel(monthStart: string): string {
  if (!monthStart) return '';
  const date = new Date(monthStart);
  if (Number.isNaN(date.getTime())) return monthStart;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
}
