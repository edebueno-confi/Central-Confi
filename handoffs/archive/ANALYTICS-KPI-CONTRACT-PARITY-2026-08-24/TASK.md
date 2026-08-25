# TASK

- Task: ANALYTICS-KPI-CONTRACT-PARITY-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 543e8e27a09706b733434788523c467ccbe2f2cd
- Approval: APPROVED por promoção sequencial autorizada
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Reconciliar o contrato de filtros dos KPIs Analytics entre Visão Geral,
Comercial e Suporte, preservando a semântica honesta de Customer Success e
Financeiro. A mesma operação, período, exclusões de pipeline e dimensões
aplicáveis devem alcançar a camada de origem correspondente, sem fallback
consolidado para recortes operacionais.

## Critérios de aceite

1. Auditar as assinaturas e definições reais das RPCs e os consumidores.
2. Propagar somente parâmetros suportados ou preparar migration versionada
   candidata local, sem aplicá-la, quando o contrato executável exigir mudança.
3. Reconciliar query key, invalidação e carregamentos quando uma dimensão estiver
   omitida.
4. Adicionar regressões executáveis para parâmetros enviados e equivalência de
   recorte entre Visão Geral, Comercial e Suporte.
5. Manter Customer Success e Financeiro semanticamente honestos, inclusive
   indisponibilidade operacional quando não houver contrato real.
6. Preservar loading, empty, unavailable, partial e error sem inventar zeros ou
   reutilizar snapshot consolidado.
7. Executar testes focados, typecheck, build, lint, docs:validate,
   review:gates e git diff --check quando aplicáveis.

## Allowlist efetiva

- `apps/web/src/features/analytics/analytics-api.ts`
- `apps/web/src/features/analytics/analytics-model.ts`
- `apps/web/src/features/analytics/AnalyticsShell.tsx`
- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `tests/scripts/analytics-overview-honesty.test.mjs`
- `supabase/tests/126_analytics_kpi_contract_parity.sql`
- migration versionada candidata local, somente se o contrato RPC real não
  suportar os filtros e com preflight/teste sem aplicação no banco
- `docs/reports/ANALYTICS_KPI_CONTRACT_PARITY_2026-08-24.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md`

`apps/web/src/features/analytics/analytics-query-key.ts` foi auditado e já
continha todas as dimensões necessárias; não foi alterado.

## Fora de escopo

Banco local ou remoto, migrations aplicadas, SQL manual, reset, repair, seed,
fixtures adicionais, RLS, grants, RPCs fora de migration candidata, contratos
não relacionados, secrets, credenciais, HubSpot, OMIE, sync externo, produção,
push, merge, deploy e publicação.

## Estado da entrega

Correção de F-KPI-001 entregue em `READY_FOR_REVIEW`, com Owner Sentinel e
Agent coordination `REVIEW_ACTIVE`. A revisão independente do Sentinel é o
próximo passo. Não há aprovação autodeclarada nem alterações preexistentes
incluídas no lote.
