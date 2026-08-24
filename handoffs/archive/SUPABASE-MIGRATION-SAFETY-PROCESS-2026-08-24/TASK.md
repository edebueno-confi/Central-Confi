# TASK

- Task ID: SUPABASE-MIGRATION-SAFETY-PROCESS-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Coordinator: Codex Orchestrator
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: f9800c43f74f0de0ad1efc3b4982da752b997860
- Allowlist:
  - docs/engineering/SUPABASE_MIGRATION_SAFETY_PROCESS_V1.md
  - docs/README.md
  - docs/PROJECT_STATE.md
  - docs/DOCUMENTATION_LEDGER.md
  - handoffs/README.md
  - handoffs/current/TASK.md
  - handoffs/current/IMPLEMENTATION.md
  - handoffs/current/STATUS.md
  - handoffs/current/REVIEW.md
- Objetivo: documentar o processo fail-closed para impedir repetição do erro
  histórico da task 60, preservando a trilha de auditoria.
- Fora de escopo: banco local/remoto, SQL, migration, reset, repair, secrets,
  integrações, push, merge, deploy e release.
- Critérios de aceite: processo cobre identidade, backup/PITR, parity,
  proveniência, preflight semântico, shadow, ACL/RLS/cross-tenant,
  performance/locks, pós-validação e separação entre `candidate_go` e
  `historical_no_go`; índice, ledger e checkpoint refletem o documento.
