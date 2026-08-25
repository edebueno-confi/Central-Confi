# Aplicação remota da remediação de TRUNCATE

Estado: `OWNER_DECISION_REQUIRED`

## Alvo confirmado

- Projeto: `jzmmvfcmruasqmrdmbup`
- Nome: `ConfiOne`
- Estado: `ACTIVE_HEALTHY`
- Região: `us-east-1`
- PostgreSQL: `17.6.1.111`

## Preflight read-only

A migration `20260825093000_remote_authenticated_truncate_revoke_v1` não está
no histórico remoto. A ACL atual ainda concede `TRUNCATE` ao papel
`authenticated` em `public.profiles` e `public.tenants`, reproduzindo o finding
HIGH da auditoria remota.

A migration candidata foi revisada e finalizada localmente na task 90, commit
`0be04a71`. Ela contém somente:

```sql
revoke truncate on table public.profiles, public.tenants from authenticated;
```

## Plano de aplicação

Depois de APPROVED pelo Sentinel, a aplicação será feita uma única vez pela
ferramenta versionada de migration, com `project_id` explícito. Em seguida,
serão executadas apenas leituras para confirmar o histórico da migration e a
ausência dos dois grants `TRUNCATE`.

## Execução e pós-validação

A aplicação foi executada uma única vez após aprovação do Sentinel. O projeto
permaneceu `jzmmvfcmruasqmrdmbup`/ConfiOne. A ACL pós-aplicação retornou zero
linhas para `TRUNCATE` concedido a `authenticated` em `public.profiles` e
`public.tenants`.

O histórico remoto registrou a migration como
`20260825061858_remote_authenticated_truncate_revoke_v1`, enquanto a versão
local prevista era `20260825093000_remote_authenticated_truncate_revoke_v1`.
Essa divergência ocorreu na ferramenta de aplicação, que gerou o timestamp
remoto. Não houve retry, segunda migration, SQL manual ou tentativa de alterar
o histórico.

## OWNER_DECISION_REQUIRED

A correção efetiva do privilégio está confirmada, mas a proveniência da versão
não coincide com o arquivo local aprovado. É necessária decisão do proprietário
entre aceitar o registro remoto como equivalente semântico e documentar a
divergência, ou definir um procedimento formal de reconciliação. Não é seguro
criar uma segunda migration apenas para igualar o timestamp.

## Limitações e segurança

A task não cobre a migration de contratos KPI, RLS/cross-tenant funcional,
performance real ou deploy da aplicação. A escrita remota foi encerrada após a
única aplicação e não haverá nova tentativa sem decisão do proprietário.
