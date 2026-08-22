# TASK

- Task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Codex (Reviewer mode)
- Review mode: OWNER_AUTHORIZED_SELF_REVIEW
- Coordinator: Codex
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e

## Objetivo

Corrigir o escopo operacional da Visão Geral e a integridade UTF-8,
preservando os contratos server-side existentes.

## Allowlist

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/analytics-ceo-snapshot.mjs`
- `apps/web/src/features/analytics/analytics-ceo-snapshot.d.mts`
- `apps/web/src/features/analytics/analytics-model.ts`
- `apps/web/src/lib/operational-copy.ts`
- `supabase/migrations/20260822220000_analytics_utf8_and_scope_guard_v1.sql`
- testes focados diretamente relacionados e estes quatro handoffs

## Aceite

1. Operação selecionada não chama o snapshot executivo consolidado.
2. Comercial, Customer Success e Suporte usam recorte operacional publicado.
3. Financeiro permanece fora da dimensão de operação.
4. Fallbacks não exibem mojibake ou `Sem responsavel`.
5. Testes, typecheck, build, documentação e gates passam.
