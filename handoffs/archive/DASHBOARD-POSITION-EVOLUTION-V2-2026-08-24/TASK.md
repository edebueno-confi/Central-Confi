# TASK

- Task: DASHBOARD-POSITION-EVOLUTION-V2-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 84fd21729a69d327c18e3520cbfb1fbe3173620b
- Approval: APPROVED
- Priority: P1

## Objetivo

Consolidar as sub-abas existentes `Posição` e `Evolução` nas superfícies de
Comercial, Customer Success, Suporte e Financeiro, melhorando os gráficos para
responder perguntas temporais claras sem repetir os KPIs de posição.

## Escopo

- Auditar o comportamento atual antes de editar, reutilizando
  `AnalyticsDomainTabs`, contratos e componentes de séries existentes.
- Evolução deve priorizar séries temporais, comparação de períodos, tendência e
  performance ao longo do tempo; Posição deve permanecer focada no estado atual
  e no recorte selecionado.
- Preservar filtros de operação/área em todas as leituras aplicáveis e declarar
  coorte de data, unidade, fonte, cobertura e estado de indisponibilidade quando
  essas informações existirem no contrato.
- Manter Financeiro consolidado quando não houver dimensão operacional contratada.
- Tratar ausência de contrato, cobertura parcial ou histórico insuficiente como
  estado honesto; não criar zeros sintéticos, regras no frontend, mocks ou
  fallback consolidado.
- Adicionar ou ajustar testes diretamente relacionados às quatro superfícies.

## Allowlist definida após auditoria

- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx`
- `tests/scripts/dashboard-position-evolution-v2.test.mjs`
- `handoffs/current/TASK.md`, `handoffs/current/IMPLEMENTATION.md` e
  `handoffs/current/STATUS.md`

`AnalyticsCsPage.tsx`, `AnalyticsFinancePage.tsx`, `AnalyticsTrendPanel.tsx`,
contratos, APIs e migrations foram auditados e permanecem fora do diff porque
já preservam o comportamento contratado. `REVIEW.md` permanece preservado pelo
reviewer.

## Fora de escopo

Migrations, SQL, views, RPCs, RLS, grants, contratos backend, integrações
HubSpot/OMIE, secrets, banco local/remoto, sincronização externa, release surface,
push, merge, deploy e publicação.

## Aceite

Testes focused diretamente relacionados, typecheck, build, lint, docs/review
gates e `git diff --check` devem passar. A entrega deve registrar allowlist,
limitações e evidência real em `IMPLEMENTATION.md`, preservando `REVIEW.md` para
revisão independente do Sentinel.

## Transferência

Implementação concluída dentro da allowlist. Handoff transferido ao Sentinel
para revisão independente; nenhuma aprovação foi autodeclarada.
