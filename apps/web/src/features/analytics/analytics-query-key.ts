/**
 * Chave determinística para leituras do Analytics.
 *
 * A chave representa somente dimensões que o contrato atual publica. Ela é
 * usada como dependência de efeitos para que uma nova referência de array ou
 * objeto, sem mudança semântica, não dispare uma consulta adicional.
 */
export function normalizeAnalyticsPipelineIds(values: readonly string[] = []): string[] {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))].sort();
}

export function buildAnalyticsQueryKey({
  domain,
  period = {},
  operation = '',
  excludedPipelineIds = [],
  ownerId = '',
  stageId = '',
  priority = '',
  grain = '',
  search = '',
}: {
  domain?: string | null;
  period?: { from?: string | null; to?: string | null };
  operation?: string | null;
  excludedPipelineIds?: readonly string[];
  ownerId?: string | null;
  stageId?: string | null;
  priority?: string | null;
  grain?: string | null;
  search?: string | null;
} = {}): string {
  return JSON.stringify({
    domain: domain ?? '',
    period: { from: period.from ?? '', to: period.to ?? '' },
    operation: operation ?? '',
    excludedPipelineIds: normalizeAnalyticsPipelineIds(excludedPipelineIds),
    ownerId: ownerId ?? '',
    stageId: stageId ?? '',
    priority: priority ?? '',
    grain: grain ?? '',
    search: search ?? '',
  });
}
