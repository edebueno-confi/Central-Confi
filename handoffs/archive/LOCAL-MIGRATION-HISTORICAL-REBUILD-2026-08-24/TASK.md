# TASK

- Task: LOCAL-MIGRATION-HISTORICAL-REBUILD-2026-08-24
- Parent: LOCAL-MIGRATION-HISTORY-REPAIR-2026-08-23 (task 60)
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Approval: APPROVED por OD-020 e instrução explícita do proprietário nesta conversa
- Base SHA: 6e4ed7ff7b23b62c75a6aecae0ab4337808a089d
- Agent coordination: REVIEW_ACTIVE
- Hold: encerrado após reaplicação autorizada das fixtures locais
- Scope lock: banco local `supabase_db_genius-support-os`; nenhum agente deve iniciar outra task
- Resume condition: re-review independente do Sentinel; não finalizar antes de APPROVED

## Allowlist do lote

- `scripts/local-qa/reset.mjs`
- `scripts/local-qa/assert-local-schema-parity.mjs`
- `scripts/local-qa/semantic-migration-preflight.mjs`
- `tests/scripts/local-schema-parity.test.mjs`
- `tests/scripts/migration-semantic-preflight.test.mjs`
- `supabase/migrations/20260824190000_analytics_timeseries_scope_performance_remediation_v1.sql`
- `docs/reports/LOCAL_MIGRATION_HISTORY_REBUILD_2026-08-24.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`

## Alterações preexistentes preservadas fora da allowlist

Estas alterações estavam no worktree antes do lote corrente e não pertencem à
task 60/rebuild. Foram preservadas, não foram stageadas e não podem entrar no
commit desta task:

- `docs/PROJECT_STATE.md`
- `docs/README.md`
- `docs/engineering/OWNER_DECISIONS.md`
- `handoffs/README.md`
- `package.json`
- `scripts/run-focused-tests.mjs`
- `docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md`
- `docs/reports/LOCAL_MIGRATION_HISTORY_REPAIR_2026-08-23.md`
- `handoffs/after-sale-migration-claude/genius-uvline/`
- `handoffs/archive/LOCAL-MIGRATION-HISTORY-REPAIR-2026-08-23/`
- `supabase/migrations/20260822130000_release_contract_drift_reconciliation_v1.sql`

## Objetivo

Recriar o banco Supabase local a partir do checkout atual de migrations,
incluindo a migration de remediação aprovada, reaplicar fixtures locais
reprodutíveis e validar que a task 60 deixa de bloquear o ambiente local.

## Escopo autorizado

- backup/inventário somente do banco local;
- confirmar identidade `supabase_db_genius-support-os` e `genius-support-os`;
- executar o reset/rebuild local com `ALLOW_LOCAL_DB_RESET=true`;
- reaplicar fixtures exclusivamente locais por `local:qa:hydrate`;
- validar migrations, schema, contratos, RLS, isolamento, performance e gates.

## Fora de escopo

Supabase remoto, produção, secrets, HubSpot, OMIE, escrita externa, push,
merge, deploy, release surface e qualquer container diferente do canônico.

## Critérios de aceitação

1. Backup/inventário local reproduzível registrado antes do reset.
2. Reset aplica todas as migrations do checkout sem falha e inclui
   `20260824190000`.
3. `local:qa:verify`, schema parity e o preflight semântico passam no escopo
   do candidato; qualquer trava histórica residual fica explicitamente
   separada como `historical_no_go`.
4. Schema parity, contratos, RLS/isolamento e performance são revalidados.
5. Sentinel revisa independentemente antes da finalização local.
