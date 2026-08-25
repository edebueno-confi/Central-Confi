# Remediação candidata de privilégio TRUNCATE remoto

Estado: `CANDIDATE_READY_FOR_REVIEW`
Projeto: `jzmmvfcmruasqmrdmbup` (`ConfiOne`)
Identidade observada: `ACTIVE_HEALTHY`, `us-east-1`, PostgreSQL `17.6.1.111`
Data da leitura: `2026-08-25`

## Achado de origem

A auditoria read-only anterior confirmou `TRUNCATE` concedido ao papel
`authenticated` em `public.profiles` e `public.tenants`. RLS não substitui o
privilégio de relação para `TRUNCATE`. Esse finding HIGH bloqueia correções
remotas subsequentes até ser revogado ou justificado explicitamente.

## Candidato

`supabase/migrations/20260825093000_remote_authenticated_truncate_revoke_v1.sql`
contém somente:

```sql
revoke truncate on table public.profiles, public.tenants from authenticated;
```

O teste determinístico verifica o alvo e rejeita `GRANT`, DML, `DROP`, `ALTER`
e referências a outros objetos.

## Limites

Este lote não aplicou migration, não executou SQL de escrita e não alterou o
projeto remoto. A aplicação só poderá ocorrer após APPROVED do Sentinel,
validação da allowlist e confirmação da identidade do projeto. Depois da
aplicação, será necessária uma consulta read-only de ACL para confirmar a
revogação antes de qualquer task de contrato de KPI.

As RPCs remotas de Comercial e Suporte ainda foram observadas com quatro
argumentos, enquanto o contrato avançado local usa seis. Essa divergência fica
fora deste lote e será tratada separadamente após o bloqueio HIGH.
