# TASK

- Task: ANALYTICS-REACTIVE-FILTERS-KPI-LOOP-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Review verdict: aguardando re-review independente do Sentinel para F-REACTIVE-001
- Base SHA: 78aa952f

## Objetivo

Corrigir o ciclo infinito observado em `AnalyticsTrendPanel` e tornar o
recálculo do Dashboard reativo e consistente com os filtros aprovados. O
backend/read model continua sendo a fonte da verdade; o frontend apenas envia
o recorte atual e apresenta estados honestos.

## Critérios de aceitação

- Nenhum componente entra em `Maximum update depth exceeded` por arrays ou objetos default recriados em dependências de `useEffect`.
- A chave efetiva de consulta inclui período, operação, pipelines excluídos, owner, stage/status, prioridade e grain quando aplicáveis.
- Troca de filtro dispara nova consulta, cancela/ignora resposta anterior e não deixa dados antigos aparentarem ser do novo recorte.
- Visão Geral, Comercial, Customer Success/Suporte e suas tendências recalculam com o recorte por operação.
- “Todas” reconcilia as operações elegíveis; Financeiro permanece consolidado e mostra indisponibilidade quando uma operação é selecionada, sem atribuição inventada.
- Estados loading, empty, unavailable, partial e error permanecem distinguíveis.
- Remover `Aplicar` de filtros de seleção/operação e campos que possam ser reativos sem risco; manter `Limpar`, debounce para busca de cliente e validação de período. Não disparar consulta para intervalo inválido.
- Adicionar regressões determinísticas para o loop, a chave de consulta, filtros de operação e ausência de `Aplicar` onde aplicável.

## Fora de escopo

- alteração remota, migration, SQL de escrita, grant, policy, reset, rebuild, secrets, push, merge, deploy ou release;
- inventar dimensão de operação para OMIE/Financeiro;
- alterar contratos RPC sem comprovar necessidade no código/migration local e sem revisão independente;
- usar fallback consolidado para mascarar falha de um recorte operacional.

## Allowlist esperada

- `apps/web/src/features/analytics/AnalyticsTrendPanel.tsx`;
- `apps/web/src/features/analytics/AnalyticsFilters.tsx`;
- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`;
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`;
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`;
- `apps/web/src/features/analytics/analytics-query-key.ts`;
- `apps/web/src/features/analytics/analytics-reactive-state.mjs` e declaração `.d.mts`;
- migrations locais versionadas somente se uma incompatibilidade real de contrato for comprovada;
- `tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs` e
  `tests/scripts/analytics-loading-stability.test.mjs`;
- testes diretamente relacionados e `docs/reports/ANALYTICS_REACTIVE_FILTERS_KPI_LOOP_2026-08-24.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`;
- `handoffs/current/REVIEW.md` somente preservado pelo reviewer, fora da edição do executor.

## Dependências

- task 71 finalizada no commit `78aa952f`;
- auditorias local e remota permanecem read-only para este lote;
- revisão independente obrigatória do Sentinel antes da finalização local.
