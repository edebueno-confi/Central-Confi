# TASK

- Task: ANALYTICS-FILTER-SEMANTICS-CLOSURE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: aa32a7816ad34e6f6b1ece0582a94621da575d64
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Fechar a última exceção conhecida da reatividade dos filtros do Dashboard:
Financeiro ainda usava `draft` separado. A aba passou a exibir o mesmo estado
que alimenta a consulta, mantendo somente debounce para busca textual.

## Escopo allowlisted

- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`
- `tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`
- `docs/reports/ANALYTICS_FILTER_SEMANTICS_CLOSURE_2026-08-24.md`
- handoffs correntes

## Critérios de aceite

Financeiro sem `draft`/`setDraft`/Aplicar; filtros controlados; debounce de
cliente; intervalo inválido sem consulta; loading e cancelamento contra stale;
chave semântica com as dimensões publicadas; gates locais verdes.

## Fora de escopo

RPC, view, migration, policy, RLS, contrato backend, integração, permissão,
banco, secret, push, merge, deploy e release.
