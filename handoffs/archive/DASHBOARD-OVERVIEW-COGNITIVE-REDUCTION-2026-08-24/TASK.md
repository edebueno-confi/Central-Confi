# TASK

- Task: DASHBOARD-OVERVIEW-COGNITIVE-REDUCTION-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: ee47abb90502ec000e4d9fc184430bf24efa76de
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Reduzir o peso cognitivo do Dashboard Gerencial, começando pela Visão Geral e
pela remoção de placeholders que ocupam espaço sem acrescentar leitura
operacional. A Visão Geral deve funcionar como apanhado curto das áreas, usando
o quadro de KPIs existente, mapa de áreas e atenção operacional. Evolução
temporal permanece nas abas de domínio que possuem contrato real.

## Escopo allowlisted

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx`
- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`
- `scripts/local-qa/analytics-kpi-shadow-preflight.mjs`
- testes focused diretamente afetados pela estrutura do Dashboard
- `docs/reports/DASHBOARD_OVERVIEW_COGNITIVE_REDUCTION_2026-08-24.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`

## Fora de escopo

Nenhuma RPC, view, migration, policy, RLS, contrato backend, integração,
permissão, banco local/canônico/remoto, secret, shell global, navegação global,
push, merge, deploy ou release.

## Critérios de aceite

1. Visão Geral não repete blocos de desempenho/posição já publicados no
   `AnalyticsKpiBoard`.
2. Visão Geral não renderiza painéis temporais duplicados; Comercial, Suporte e
   Financeiro continuam com Evolução nas próprias abas e Customer Success
   continua declarando indisponibilidade sem fabricar série.
3. Placeholders de atividades/chat não ocupam o fluxo principal das abas; as
   limitações continuam honestas no quadro de limitações ou no contrato da aba.
4. Filtros reativos, escopo por operação, estados honestos e botão Aplicar
   inexistente permanecem preservados.
5. Testes focused, typecheck, build, lint, documentação, review gates e diff
   check devem passar; o navegador local deve confirmar a hierarquia reduzida.
