# TASK

- Task: REMOTE-SUPABASE-TRUNCATE-PRIVILEGE-REMEDIATION-2026-08-25
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: FINALIZE_LOCAL
- Base SHA: 76855c61
- Implementation SHA: UNCOMMITTED_WORKTREE

## Objetivo

Corrigir, de forma versionada e fail-closed, o finding HIGH da auditoria remota que concede `TRUNCATE` ao papel `authenticated` em `public.profiles` e `public.tenants`. O lote prepara a migration e seus gates; não executa escrita remota nesta etapa.

## Escopo allowlisted

- `supabase/migrations/20260825093000_remote_authenticated_truncate_revoke_v1.sql`
- `tests/scripts/remote-supabase-security-truncate-revoke.test.mjs`
- `docs/reports/REMOTE_SUPABASE_TRUNCATE_PRIVILEGE_REMEDIATION_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md`

Não houve alteração de produto, frontend, RPC de KPI, RLS de dados, secret, migration remota, SQL de escrita, push, merge ou deploy.
