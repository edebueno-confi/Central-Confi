# IMPLEMENTATION

- Task: ANALYTICS-KPI-CONTRACT-PARITY-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 543e8e27a09706b733434788523c467ccbe2f2cd
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

## Resultado

O lote reconciliou a propagação de filtros entre Visão Geral, Comercial e
Suporte sem alterar o contrato de Customer Success nem inventar dimensão para
Financeiro. A correção do cliente está implementada e a mudança de banco está
somente em migration candidata versionada, não aplicada.

## Auditoria factual

- `rpc_analytics_commercial_kpis_v2` e
  `rpc_analytics_support_kpis_v2` eram funções legadas com quatro argumentos e
  não ofereciam estágio nem lista de exclusões.
- Os snapshots Comercial e Suporte já tinham contratos com estágio, exclusões
  e operação.
- `rpc_analytics_customer_success_kpis_by_operation(text)` publica somente a
  dimensão de operação e continua recebendo apenas `p_group_company`.
- Financeiro continua sem dimensão operacional publicada e mantém o estado de
  indisponibilidade quando uma operação é selecionada.
- `analytics-query-key.ts` já incluía período, operação, owner, estágio,
  prioridade, grain e exclusões normalizadas. Foi auditado e não precisou ser
  alterado.

## Implementação

- `analytics-api.ts` envia estágio e exclusões nos carregamentos de KPI V2 de
  Comercial e Suporte, inclusive período e posição da Visão Geral.
- `AnalyticsShell` centraliza exclusões já persistidas para Comercial e
  Suporte, sem criar uma nova fonte de dados ou uma nova regra de negócio.
- As abas e a Visão Geral usam a seleção por objeto correspondente. A Visão
  Geral não inventa um seletor próprio: consome as exclusões compartilhadas
  pelas abas e as propaga também para snapshots e séries.
- A migration candidata
  `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
  deriva os corpos reais V2, acrescenta os predicados de estágio, exclusão e
  elegibilidade canônica de operação dentro das CTEs e cria overloads de seis
  argumentos. Mantém wrappers legados, payload, `security definer`,
  `search_path = ''`, revogações e grants.
- `supabase/tests/126_analytics_kpi_contract_parity.sql` registra a cobertura
  pgTAP da candidata. Como a migration não foi aplicada, esse teste não foi
  executado contra o banco local e não é apresentado como PASS.

## Allowlist efetiva do lote

- `apps/web/src/features/analytics/analytics-api.ts`
- `apps/web/src/features/analytics/analytics-model.ts`
- `apps/web/src/features/analytics/AnalyticsShell.tsx`
- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `tests/scripts/analytics-overview-honesty.test.mjs`
- `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
- `supabase/tests/126_analytics_kpi_contract_parity.sql`
- `docs/reports/ANALYTICS_KPI_CONTRACT_PARITY_2026-08-24.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md`, preservado sem veredito inventado

Alterações preexistentes preservadas fora do lote: `docs/PROJECT_STATE.md`,
`docs/README.md`, `docs/engineering/OWNER_DECISIONS.md`, `handoffs/README.md`,
`package.json`, `scripts/run-focused-tests.mjs`,
`docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md`,
`docs/reports/LOCAL_MIGRATION_HISTORY_REPAIR_2026-08-23.md`,
`handoffs/after-sale-migration-claude/`, o archive histórico e a migration
`supabase/migrations/20260822130000_release_contract_drift_reconciliation_v1.sql`.
Nenhum deles deve entrar em stage seletivo desta task.

## Gates e evidências

Comandos executados após a implementação, sem aplicação de migration:

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs`: 10/10
  PASS, incluindo a elegibilidade server-side e o contexto `Todas`.
- testes diretamente afetados em conjunto: 29/29 PASS.
- `npm run test:focused`: 338/338 PASS, 51 arquivos, exit code 0.
- `npm run web:typecheck`: PASS, exit code 0.
- `npm run web:build`: PASS, 946 módulos, exit code 0.
- `npm run lint`: PASS, 0 erros e 158 warnings legados, exit code 0.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes; as duas regressões
  intermediárias de cobertura pgTAP foram resolvidas por
  `supabase/tests/126_analytics_kpi_contract_parity.sql`.
- `git diff --check`: PASS após a atualização dos handoffs e do relatório.

Checkpoint final de `review:gates`: `2026-08-25T00:31:23.705Z` UTC, exit code
0. `docs:validate` e `git diff --check` também foram repetidos após a correção
do finding e terminaram com exit code 0.

## Resposta ao finding F-KPI-001

Resolvido no escopo local. As CTEs `scoped` Comercial e Suporte agora aplicam
`app_private.analytics_pipeline_operation_eligible` com o pipeline, a área,
o tipo de objeto e `current_setting('app.analytics_group_company', true)`.
Assim, `Todas` usa contexto vazio, operação selecionada exige o vínculo
canônico e as exclusões continuam no mesmo corpo server-side. O wrapper não é
mais a única barreira. Regressão Node 10/10 e cobertura pgTAP de 16 asserções
foram adicionadas; a cobertura SQL não foi executada porque a migration segue
não aplicada.

## Fatos, hipóteses e limitações

Fato: o cliente agora envia as dimensões e o recorte é compartilhado entre as
superfícies permitidas.

Hipótese limitada: após preflight e aplicação autorizados, os overloads de
seis argumentos devem produzir o mesmo recorte, pois os predicados usam os
mesmos identificadores de pipeline e estágio dos snapshots.

Não comprovado: aplicação da candidata, resolução PostgREST dos overloads,
paridade numérica servida, RLS/cross-tenant, browser autenticado, produção,
performance real e integrações HubSpot/OMIE. O drift local conhecido permanece
sob gate fail-closed e não foi usado como prova de sucesso.

## Transferência

Estado transferido para `READY_FOR_REVIEW`, Owner Sentinel e
`Agent coordination=REVIEW_ACTIVE`. Sentinel deve revisar o diff seletivo, a
candidata não aplicada, a cobertura pgTAP registrada e os gates finais. Codex
foi notificado no handoff e no canal desta execução. Não houve commit, push,
merge, deploy, migration aplicada, escrita em banco ou ação externa.
