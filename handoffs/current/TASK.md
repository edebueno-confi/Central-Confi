# TASK

- Task: ANALYTICS-CUSTOMER-SUCCESS-REACTIVE-OPERATION-CLOSURE-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: eeddbc2a6fa9bae6b83a7eddd1f927d6db2de2c8
- Implementation SHA: 2b8a8c3d (functional commit)

## Objetivo

Corrigir a reatividade da superfície Customer Success ao trocar a operação:
invalidar o snapshot visível antes da nova leitura, mostrar loading honesto,
descartar respostas de gerações anteriores e preservar o contrato existente de
`getCustomerSuccessKpisV2(groupCompany)`.

## Escopo allowlisted

- `apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx`
- `tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`

`REVIEW.md` será preservado pelo reviewer e não haverá alteração de produto
fora da superfície Customer Success.

## Critérios de aceitação

- nova operação limpa o snapshot anterior imediatamente;
- respostas de requests anteriores não podem publicar dados no novo recorte;
- erro da nova leitura não reaproveita dados antigos;
- teste determinístico cobre geração, invalidação e loading;
- não alterar RPC, migration, banco, RLS, secrets, remoto ou deploy.
