# TASK

- Task ID: R1-DASHBOARD-RPC-CALL-RESILIENCE-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Agent coordination: REVIEW_ACTIVE
- Hold owner: none
- Hold reason: none
- Hold scope: none
- Hold started: none
- Resume condition: revisão independente concluída
- Base SHA: d5744b93b0d345811ea9416e25c43358e4bac920

## Objetivo

Reduzir chamadas redundantes do Dashboard quando há filtro de operação e evitar
uma chamada histórica complementar depois que a leitura executiva principal
falhou. A correção não altera contratos, métricas, RPCs, migrations, permissões
ou integrações externas.

## Allowlist

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `handoffs/current/*`

## Fora de escopo

- Aplicar migrations ou alterar Supabase remoto.
- Alterar RPCs, views, RLS, integrações, secrets ou dados externos.
- Mascarar erro de contrato como sucesso.

## Critérios de aceite

1. Com operação selecionada, não chamar `getExecutiveKpisV2` global.
2. Com operação selecionada, preservar as leituras específicas de Comercial,
   Suporte e Customer Success.
3. Não chamar `getCeoHistory` se `getExecutiveKpisV2` falhar.
4. Manter estados de indisponibilidade honestos e passar o teste de regressão.
