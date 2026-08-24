# TASK

- Task ID: REMOTE-SUPABASE-SECURITY-RLS-PERFORMANCE-AUDIT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Coordinator: Codex Orchestrator
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: fff087acc0bfc102117901ffd565dc4e8acc93b5
- Implementation SHA: UNCOMMITTED_WORKTREE
- Project ref: jzmmvfcmruasqmrdmbup
- Allowlist:
  - docs/reports/REMOTE_SUPABASE_SECURITY_RLS_PERFORMANCE_AUDIT_2026-08-24.md
  - docs/README.md
  - docs/DOCUMENTATION_LEDGER.md
  - docs/PROJECT_STATE.md
  - handoffs/README.md
  - handoffs/current/TASK.md
  - handoffs/current/IMPLEMENTATION.md
  - handoffs/current/REVIEW.md
  - handoffs/current/STATUS.md
- Objetivo: auditar remotamente segurança, RLS, privilégios e performance em
  modo somente leitura.
- Fora de escopo: qualquer correção remota, migration, SQL de escrita,
  alteração de grant/policy, reset, repair, secrets, push, merge ou deploy.
- Critérios de aceite: relatório reproduzível com identidade, migrations,
  RLS/policies/grants, funções críticas, advisors, limitações e backlog de
  correções sem aplicar alterações.
- Correção deste lote: reconciliar o finding de `TRUNCATE`, registrar método,
  janela e inventário read-only reproduzível e atualizar `PROJECT_STATE.md`;
  nenhuma consulta remota nova ou correção remota faz parte desta correção.
