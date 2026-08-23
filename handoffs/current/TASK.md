# TASK

- Task: ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23
- State: READY_FOR_IMPLEMENTATION
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Sentinel
- Base SHA: (preencher com o HEAD no início da implementação)
- Origem: regra do proprietário registrada em 2026-08-23; fila item 56

## Objetivo

Fazer os gráficos de evolução respeitarem os mesmos filtros que já governam os
indicadores: operação **e** área (pipelines). Existem pipelines e tickets que
não podem entrar na conta, o usuário já os exclui, e hoje essa exclusão não
alcança os gráficos.

## Defeito confirmado por leitura de código

- `AnalyticsTrendPanel` aceita apenas `domain` e `groupCompany`, e chama
  `getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`.
- `AnalyticsCommercialPage` e `AnalyticsCsPage` mantêm `excludedPipelineIds`,
  aplicam a exclusão aos KPIs e renderizam `AnalyticsTrendPanel` na mesma tela —
  o gráfico continua contando o pipeline que o número já excluiu.
- `rpc_analytics_timeseries_by_operation(p_domain, p_from, p_to, p_grain,
  p_group_company)` não tem parâmetro de exclusão. **O backend precisa mudar.**

## Bloqueio de autorização

Esta task exige migration remota. Pela `OD-015` e pela `OD-016`, cada aplicação
remota exige decisão do proprietário **registrada antes da execução**. Implemente
e valide localmente; **não aplique a migration remota** sem essa decisão.

## Allowlist proposta

- `apps/web/src/features/analytics/AnalyticsTrendPanel.tsx`
- `apps/web/src/features/analytics/analytics-api.ts`
- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`
- nova migration em `supabase/migrations/`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- novos testes em `tests/scripts/`
- estes quatro handoffs

## Fora de escopo

- aplicar migration remota, merge, deploy;
- alterar HubSpot, OMIE, secrets ou configuração remota;
- redesenhar os gráficos; a task é de correção de recorte, não visual.

## Armadilha conhecida

`tests/scripts/analytics-dashboard-domains-integrations.test.mjs` hoje **fixa a
chamada defeituosa**:

```
assert.match(trendPanel, /getAnalyticsTimeseries\(domain, grain, undefined, groupCompany\)/);
```

Essa asserção congela o defeito e precisa ser **invertida** junto com a correção,
não apagada. O mesmo padrão foi tratado no ciclo 2 desta task anterior e está
descrito no REVIEW arquivado.

## Critérios de aceite

1. A exclusão de pipelines aplicada pelo usuário chega ao gráfico de todas as
   telas que a oferecem, e o gráfico recalcula com ela.
2. Operação e área compõem: selecionar operação e excluir pipeline produz série
   coerente com os KPIs da mesma tela e do mesmo período.
3. Onde a série não pode ser recortada, o painel diz isso explicitamente e não
   exibe número consolidado sob rótulo de recorte.
4. Existe regressão automatizada que **falha** sem a correção. Testes de leitura
   de texto-fonte só valem quando a asserção morre com o defeito aplicado —
   verifique com sonda de mutação, como nos ciclos 2 e 3.
5. Typecheck, lint, build, testes focados, docs validate e diff check passam.

## Contexto entregue pelo Sentinel

A task anterior (`R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22`) está APPROVED e
arquivada em `handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/`. Leia
o REVIEW arquivado antes de começar: ele traz os quatro ciclos, as evidências de
banco e de navegador autenticado, e as asserções de teste que foram substituídas
e declaradas ao proprietário.
