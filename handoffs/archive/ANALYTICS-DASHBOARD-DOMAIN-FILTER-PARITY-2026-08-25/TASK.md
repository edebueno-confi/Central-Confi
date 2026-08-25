# TASK

Task: ANALYTICS-DASHBOARD-DOMAIN-FILTER-PARITY-2026-08-25
State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: daa6731f
Implementation SHA: a4556d06

## Objetivo

Garantir que os filtros do Dashboard representem o mesmo recorte de dados em
Visão Geral, Comercial, Suporte, Customer Success e Financeiro, sem snapshots
antigos, fallback consolidado ou KPI artificialmente zerado.

## Prioridade de produto

Comercial é a superfície principal. O funil, KPIs e gráficos devem respeitar
período, operação, pipeline, etapa, exclusões e responsável quando publicados
pelo contrato. O período selecionado deve alterar a coorte do funil e de todos
os indicadores compatíveis.

## Escopo

- auditar Comercial e manter filtros reativos com payloads completos;
- garantir limpeza/loading/descarte de resposta obsoleta em cada troca;
- validar Todas e After Sale sem misturar operações;
- auditar Suporte e Customer Success e habilitar somente dimensões realmente
  publicadas pelo backend;
- investigar por que clientes em atraso/recorrência não aparecem em Customer
  Success, registrando origem, cobertura e limitações sem criar fallback;
- auditar Financeiro read-only e documentar se a fonte é exclusivamente After
  Sale; nenhuma mudança de contrato sem prova de dimensão operacional;
- compactar combos apenas se necessário, preservando teclado e valor exato;
- adicionar regressões para período, operação, pipeline, etapas publicadas,
  limpeza de snapshot e respostas obsoletas;
- atualizar a Central de Ajuda somente com campos, fórmulas e contratos
  comprovados.

## Fora de escopo

Migration, SQL, banco remoto, alteração de RLS/ACL, HubSpot write, criação de
propriedade customizada, secrets, deploy, push, merge, dados fictícios e
Evolução de Customer Success sem série temporal real.

## Allowlist do lote

- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsOperationScope.tsx`
- `apps/web/src/features/analytics/AnalyticsPipelineCombobox.tsx`
- `tests/scripts/analytics-dashboard-domain-filter-parity.test.mjs`
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`
- `docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`

`handoffs/current/REVIEW.md` foi preservado para o Sentinel. Alterações
preexistentes em `docs/PROJECT_STATE.md`, `docs/README.md`,
`docs/ROADMAP_BUILDOUT_V3.md`, `docs/engineering/OWNER_DECISIONS.md`,
`docs/reports/REMOTE_SUPABASE_TRUNCATE_PRIVILEGE_APPLICATION_2026-08-25.md`,
`handoffs/README.md`, `package.json`, `scripts/run-focused-tests.mjs`,
`docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md`,
`docs/reports/LOCAL_MIGRATION_HISTORY_REPAIR_2026-08-23.md`, os arquivos
arquivados de outras tasks e `supabase/migrations/20260822130000...sql`
permanecem fora do lote e não devem ser staged.

## Aceite

- testes provam payload e recálculo por período/operação/pipeline nas superfícies
  com contrato;
- dados sem cobertura aparecem como `unavailable`/`partial`, nunca como zero;
- `test:focused`, typecheck, build, lint, docs:validate, review:gates e
  `git diff --check` passam;
- handoff READY_FOR_REVIEW completo, allowlist explícita e limitações honestas.
