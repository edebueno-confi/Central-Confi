import type { CeoSnapshot, CsSnapshot } from './analytics-model';

export function buildOverviewSnapshotQueryPlan<T extends object>(filters: T): { period: T; current: T };
export function buildUnavailableOperationKpiPayload(): { kpis: Record<string, { state: 'unavailable'; value: null; reason: string }> };
export function buildOperationKpisFromSettledLoads(settledLoads: readonly unknown[]): {
  failed: boolean;
  loaded: boolean;
  value: {
    period: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
    current: { commercial: unknown; support: unknown; supportSnapshot: CsSnapshot | null };
  };
};
export function buildUnavailableCeoSnapshot(): CeoSnapshot;
export function buildExecutiveIntegrityLine(
  dataQuality: CeoSnapshot['dataQuality'] | null | undefined,
  operationScoped: boolean,
): {
  unmatchedFinanceTitles: { value: string; label: string };
  supportUnassigned: { value: string; label: string };
};
export function buildOperationPeriodMetrics(periodCommercial: unknown, periodSupport: unknown): {
  commercial: { wonDeals: number | null; lostDeals: number | null; wonRevenue: number | null; conversionRate: number | null };
  support: { createdTickets: number | null };
};
export function getOverviewQueueMetricDefinitions(): {
  current: { key: 'open_backlog'; label: string; period: 'current'; source: 'support.open_backlog' };
  received: { key: 'created_tickets'; label: string; period: 'selected'; source: 'support.created_tickets' };
};
export function mergeExecutiveKpiPayload<T>(periodPayload: T, currentPayload: unknown): T;
export function mergeOperationKpiPayload<T>(basePayload: T, periodPayloads: unknown, currentPayloads: unknown): T;
export function composeCeoSnapshot<T>(periodSnapshot: T, currentSnapshot: unknown): T;
