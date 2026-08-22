# TASK

- Task: R1-PRODUCTION-PERFORMANCE-AND-ACCESS-UI-CONTINUATION-2026-08-22
- State: IMPLEMENTING
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: 4406ba01

## Objetivo

Reduzir a pressão de leitura do Dashboard e preservar a correção visual do
modal de acessos, mantendo os contratos backend, estados honestos e a
separação entre evidência local e produção.

## Allowlist

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/analytics-api.ts`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `handoffs/current/*`

## Fora de escopo

Nenhuma migration, RLS, RPC, view, secret, chamada externa, produção, deploy,
push, merge ou alteração dos artefatos After Sale.

## Critérios de aceite

- Snapshot, status de fonte e leituras por operação não concorrem entre janelas
  pesadas durante a abertura do painel.
- Regressão automatizada impede retorno a `Promise.all` nesses caminhos.
- Typecheck, build, testes focados, lint, QA browser local e gates documentais
  passam, preservando limitações remotas explícitas.
