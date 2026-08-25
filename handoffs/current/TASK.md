# TASK

- Task: REMOTE-SUPABASE-TRUNCATE-PRIVILEGE-APPLICATION-2026-08-25
- State: BLOCKED
- Owner: OWNER_DECISION_REQUIRED
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: BLOCKED
- Base SHA: 0be04a71
- Implementation SHA: UNCOMMITTED_WORKTREE

## Resultado

A migration foi aplicada uma única vez no projeto remoto reconfirmado. A ACL
foi corrigida: não há mais `TRUNCATE` para `authenticated` em
`public.profiles` ou `public.tenants`.

## Bloqueio

O histórico remoto registrou `20260825061858_remote_authenticated_truncate_revoke_v1`,
mas o arquivo local aprovado era `20260825093000_remote_authenticated_truncate_revoke_v1`.
O protocolo exige interromper sem retry e registrar `OWNER_DECISION_REQUIRED`.

Não executar segunda migration, SQL manual, reset, repair ou alteração do
histórico sem decisão explícita do proprietário.
