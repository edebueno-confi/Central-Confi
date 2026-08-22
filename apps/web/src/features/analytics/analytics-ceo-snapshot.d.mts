import type { CeoSnapshot } from './analytics-model';

export function buildOverviewSnapshotQueryPlan<T extends object>(filters: T): { period: T; current: T };
export function buildUnavailableOperationKpiPayload(): { kpis: Record<string, { state: 'unavailable'; value: null; reason: string }> };
export function buildUnavailableCeoSnapshot(): CeoSnapshot;
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
