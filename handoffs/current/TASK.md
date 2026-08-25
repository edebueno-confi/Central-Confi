# TASK

- Task: REMOTE-SUPABASE-TRUNCATE-PRIVILEGE-REMEDIATION-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: 76855c61
- Implementation SHA: UNCOMMITTED_WORKTREE

## Objetivo

Corrigir, de forma versionada e fail-closed, o finding HIGH da auditoria remota
que concede `TRUNCATE` ao papel `authenticated` em `public.profiles` e
`public.tenants`. O lote prepara a migration e seus gates; não executa escrita
remota nesta etapa.

## Escopo allowlisted

- `supabase/migrations/20260825093000_remote_authenticated_truncate_revoke_v1.sql`
- `tests/scripts/remote-supabase-security-truncate-revoke.test.mjs`
- `docs/reports/REMOTE_SUPABASE_TRUNCATE_PRIVILEGE_REMEDIATION_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md`

Não haverá alteração de produto, frontend, RPC de KPI, RLS de dados, secret ou
integração externa. A migration remota não será aplicada antes de APPROVED.

## Critérios de aceitação

- migration contém somente `REVOKE TRUNCATE` dos dois objetos e do papel
  `authenticated`;
- teste determinístico impede grant amplo, DDL destrutivo e DML no lote;
- relatório registra identidade remota, evidência read-only e limitação;
- preflight local passa e o lote é entregue a Sentinel como READY_FOR_REVIEW;
- nenhuma migration, SQL de escrita, grant/policy remoto, secret, push, merge ou
  deploy é executado nesta etapa.

Entrega finalizada localmente. O lote foi aprovado pelo Sentinel, arquivado e
normalizado para `IDLE`. A aplicação remota permanece fora desta task.
