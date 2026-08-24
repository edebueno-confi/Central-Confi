# TASK

- ID: 68
- Task: LOCAL-MIGRATION-HISTORICAL-REGRESSION-REMEDIATION-2026-08-24
- State: READY_FOR_REVIEW
- Priority: P0
- Approval: APPROVED
- Approval source: continuação explícita do proprietário em 2026-08-24
- Owner: Sentinel
- Reviewer active: Sentinel
- Coordinator: Codex Orchestrator
- Base SHA: c70e995247962b9a24410e8d9d027d00b729e3b7

## Objetivo

Implementar a remediação real da regressão histórica de
`public.rpc_analytics_timeseries` por uma nova migration versionada posterior,
sem alterar migrations históricas ou o banco principal. O preflight deve aplicar
essa migration real no shadow, medir `baseline -> histórica` e `histórica ->
remediação`, e manter `historical_no_go` separado de `candidate_go`.

## Allowlist

- `supabase/migrations/20260824190000_analytics_timeseries_scope_performance_remediation_v1.sql`
- `scripts/local-qa/semantic-migration-preflight.mjs`
- `tests/scripts/migration-semantic-preflight.test.mjs`
- `docs/reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md`
- `docs/PROJECT_STATE.md`
- `docs/README.md`
- `handoffs/README.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`

## Critérios de aceite

1. Migration real derivada por `pg_get_functiondef`, assinatura/âncoras/
   contagens fail-closed, `v_group_company` e
   `v_excluded_pipeline_ids` materializados uma vez, contrato completo,
   `SECURITY DEFINER`, `search_path` vazio e grants preservados.
2. Shadow aplica a cadeia histórica relevante e a migration candidata real;
   nenhum SQL sintético substitui a migration candidata.
3. Regressões determinísticas cobrem assinatura, declarações, substituições,
   ausência de avaliação de `current_setting`/`string_to_array` por linha,
   contrato e divergências fail-closed.
4. Replay shadow, catálogo, ACL/RLS/cross-tenant, equivalência funcional e
   benchmarks comparativos executados. `historical_no_go` permanece bloqueado.
5. Testes focused, docs/review gates e diff-check executados; sem commit,
   push, merge, deploy, secrets ou escrita no banco principal.

## Fora de escopo

- aplicar migration em Supabase local canônico ou remoto;
- editar migrations `20260821090000` ou `20260823100000`;
- liberar o histórico ou transformar `globalState` em `GO`;
- editar `handoffs/current/REVIEW.md`;
- iniciar outra task.
