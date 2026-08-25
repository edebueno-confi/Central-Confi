# TASK

- Task: ANALYTICS-FILTERS-CONTROLLED-REACTIVE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: a95c36b3bc27cc2bdac60e95f3fc3159989e02c3
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Eliminar o estado `draft` do componente comum de filtros do Analytics. Cada
alteração válida deve atualizar imediatamente o valor controlado pelo pai e
disparar o recálculo já existente, sem botão Aplicar e sem estado intermediário.

## Escopo allowlisted

- `apps/web/src/features/analytics/AnalyticsFilters.tsx`;
- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`;
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`;
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`;
- `tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md`;
- atualização seletiva da linha desta task em `handoffs/README.md`.

## Fora de escopo

Financeiro permanece fora do componente comum: seu estado local é usado apenas
para debounce do campo Cliente. Não alterar RPCs, migrations, banco, RLS,
permissões, contratos remotos, integrações, secrets, push, merge ou deploy.

## Critérios de aceite

1. `AnalyticsFilters` recebe valor controlado e callback `onChange`, sem
   `draft`, `setDraft`, `onApply` ou botão Aplicar.
2. Período, datas, responsável, estágio, prioridade e Limpar atualizam o pai
   imediatamente; intervalo inválido não dispara consulta.
3. Comercial, Suporte e Visão Geral continuam usando a chave semântica de
   consulta e invalidando respostas antigas.
4. Regressões determinísticas cobrem a ausência de draft e a interface
   controlada; gates relevantes passam.

Nenhuma task ativa. A fila canônica permanece como fonte da próxima promoção
sequencial autorizada.
