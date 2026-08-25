# Analytics KPI Contract Parity

**Task:** `ANALYTICS-KPI-CONTRACT-PARITY-2026-08-24`
**Base SHA:** `543e8e27a09706b733434788523c467ccbe2f2cd`
**Observação inicial:** `2026-08-24T21:13:54.6359898-03:00`
**Estado da implementação:** `UNCOMMITTED_WORKTREE`

## Resultado executivo

Foi confirmada uma divergência entre o contrato publicado pelos consumidores
Analytics e as RPCs versionadas. Os snapshots Comercial e Suporte já recebem
estágio e exclusões de pipeline, mas os wrappers de KPI V2 aceitavam somente um
pipeline legado e os consumidores não enviavam as dimensões necessárias.

O lote corrige a propagação no cliente, compartilha as exclusões por objeto
entre abas e Visão Geral e adiciona uma migration candidata estática para o
contrato de seis argumentos. Após o finding F-KPI-001, as CTEs candidatas
também passaram a aplicar a elegibilidade canônica usando o contexto de
operação. A candidata não foi aplicada no banco local nem remoto. Portanto, a
integração executável da nova assinatura permanece
`NÃO COMPROVADA` até preflight e aplicação autorizados em ambiente compatível.

## Auditoria factual

Fontes lidas: `apps/web/src/features/analytics/analytics-api.ts`,
`AnalyticsCeoPage.tsx`, `AnalyticsCommercialPage.tsx`, `AnalyticsCsPage.tsx`,
`AnalyticsShell.tsx`, `analytics-query-key.ts`, `analytics-model.ts` e as
migrations `20260807130000_analytics_kpi_read_models_v1.sql`,
`20260808290000_analytics_operation_scope_v1.sql` e
`20260822073000_analytics_pipeline_operation_governance_findings_v1.sql`.

| Camada | Contrato observado antes do lote | Divergência | Resposta |
|---|---|---|---|
| Comercial snapshot | `date,date,text,text,text[],text`; já recebia `p_stage_id` e `p_excluded_pipeline_ids` | sem divergência neste caminho | preservado |
| Suporte snapshot | `date,date,text,text,text[],text`; já recebia estágio, prioridade e exclusões | sem divergência neste caminho | preservado |
| Comercial KPI V2 | core legado `date,date,text,text`, com `p_pipeline_id` | não havia estágio nem lista de exclusões | candidata `v2_filtered` e wrapper de seis argumentos |
| Suporte KPI V2 | core legado `date,date,text,text`, com `p_pipeline_id` e prioridade | não havia estágio nem lista de exclusões | candidata `v2_filtered` e wrapper de seis argumentos |
| Customer Success por operação | `rpc_analytics_customer_success_kpis_by_operation(text)` | origem publica somente operação | cliente permanece somente com `p_group_company` |
| Financeiro | RPC sem dimensão operacional publicada | não é possível atribuir operação | UI mantém indisponibilidade operacional |

A versão antiga dos wrappers de quatro argumentos não foi removida. A migration
candidata adiciona overloads de seis argumentos sem defaults no wrapper, evitando
ambiguidade de resolução para chamadas legadas.

## Correção implementada

1. `analytics-api.ts` envia `p_stage_id` e `p_excluded_pipeline_ids` nos
   carregamentos normais e comparativos de Comercial e Suporte.
2. `AnalyticsShell` mantém exclusões separadas por objeto, inicializadas apenas
   a partir dos filtros temporários já persistidos em `sessionStorage`.
3. Comercial, Suporte e Visão Geral reutilizam a mesma seleção por objeto. A
   Visão Geral passa as exclusões correspondentes para KPI, snapshot de Suporte
   e séries; não há fallback consolidado para operação.
4. `analytics-query-key.ts` já incluía exclusões normalizadas, período,
   operação, owner, estágio, prioridade e grain; não foi alterado. A Visão Geral
   invalida por valor das listas compartilhadas nas dependências do efeito.
5. Customer Success e Financeiro não receberam dimensões inventadas.
6. `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
   copia as definições reais V2 e aplica dentro de cada CTE `scoped` o mesmo
   `app_private.analytics_pipeline_operation_eligible` usado pelo contrato
   canônico, com `current_setting('app.analytics_group_company', true)`, além
   de estágio e exclusões. O wrapper continua somente configurando o contexto.
   Preserva payload, `security definer`, `search_path = ''`, revogações e
   grants. O arquivo é candidato e não foi executado.

## Testes e evidências

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs`: 10/10 PASS,
  incluindo a elegibilidade server-side nas duas CTEs e o contexto `Todas`.
- Regressões diretamente afetadas, em conjunto: 29/29 PASS, incluindo
  `analytics-dashboard-domains-integrations.test.mjs`,
  `analytics-kpi-surfaces.test.mjs` e
  `analytics-reactive-filters-kpi-loop.test.mjs`; a regressão de honestidade da
  Visão Geral também foi atualizada e passou no focused.
- `npm run web:typecheck`: PASS.
- A migration candidata foi inspecionada estaticamente. Não houve aplicação,
  SQL manual, reset, repair ou escrita no banco.

## Fatos, hipóteses e limitações

**Fatos:** os contratos legados não continham a lista de exclusões nem estágio
nos wrappers de KPI V2; os consumidores agora constroem e propagam esses
parâmetros; a query key existente já representava essas dimensões; as duas
CTEs candidatas aplicam a elegibilidade canônica no mesmo corpo que estágio e
exclusões, usando o contexto configurado por `p_group_company`.

**Hipótese de integração:** após preflight e aplicação da candidata em um
ambiente compatível, os novos wrappers devem produzir o mesmo recorte porque o
predicado `scoped` usa os mesmos identificadores de pipeline e estágio já
usados pelos snapshots.

**Não comprovado:** execução da nova migration, resolução PostgREST da
assinatura overload, paridade numérica em banco servido, RLS/cross-tenant,
browser autenticado, produção, performance real e integrações HubSpot/OMIE.
O drift local conhecido permanece sob gate fail-closed, portanto não foi usado
como prova de aplicação ou de sucesso funcional.

## Allowlist e alterações preexistentes

Allowlist efetiva deste lote:

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
- `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
- este relatório e os quatro handoffs correntes

`docs/PROJECT_STATE.md`, `docs/README.md`,
`docs/engineering/OWNER_DECISIONS.md`, `handoffs/README.md`, `package.json`,
`scripts/run-focused-tests.mjs`, `docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md`,
`docs/reports/LOCAL_MIGRATION_HISTORY_REPAIR_2026-08-23.md`, o diretório
`handoffs/after-sale-migration-claude/`, o archive histórico e a migration
`20260822130000_release_contract_drift_reconciliation_v1.sql` já estavam
alterados ou não rastreados antes deste lote. Permanecem preexistentes, fora da
allowlist e fora de qualquer stage seletivo desta task.

## Gates finais

Os gates foram executados após a correção de F-KPI-001. A execução anterior de
`review:gates` encontrou duas regressões novas de cobertura pgTAP para as RPCs
candidatas; o arquivo `supabase/tests/126_analytics_kpi_contract_parity.sql`
já registra essa cobertura.

- focused: 338/338 PASS.
- web:typecheck: PASS.
- web:build: PASS, 946 módulos.
- lint: PASS, 0 erros e 158 warnings legados.
- docs:validate: PASS, 0 bloqueios.
- git diff --check: PASS após o fechamento documental.
- review:gates: PASS, 0 regressões bloqueantes; a cobertura pgTAP das duas RPCs
  candidatas foi reconhecida sem alterar o baseline.

Execução final dos gates: `review:gates` em `2026-08-25T00:31:23.705Z` (UTC),
com exit code 0; `docs:validate` e `git diff --check` também terminaram com
exit code 0 no mesmo checkpoint local após a correção do finding.
Nenhuma migration foi aplicada.

## Resposta ao finding F-KPI-001

Resolvido no escopo local. O predicado server-side foi adicionado às CTEs
`scoped` Comercial e Suporte, a regressão Node passou 10/10 e o pgTAP registra
a definição, o contexto de operação, a dependência canônica e as exclusões.
O finding e o REVIEW.md do Sentinel foram preservados. A aplicação da migration
candidata depende de preflight separado, identidade do alvo e autorização
operacional; não está autorizada por este lote.
