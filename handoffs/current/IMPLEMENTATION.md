# IMPLEMENTATION

- Task: REMOTE-SUPABASE-TRUNCATE-PRIVILEGE-REMEDIATION-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: 76855c61
- Implementation SHA: UNCOMMITTED_WORKTREE

## Diagnóstico

O projeto remoto `jzmmvfcmruasqmrdmbup` foi confirmado como ConfiOne,
`ACTIVE_HEALTHY`, região `us-east-1`, PostgreSQL `17.6.1.111`. A consulta
read-only confirmou `TRUNCATE` concedido a `authenticated` em
`public.profiles` e `public.tenants`. As RPCs remotas de Comercial e Suporte
também usam assinaturas históricas de quatro argumentos; isso será tratado em
task posterior, depois deste bloqueio.

## Correção

- migration candidate isola a revogação mínima de `TRUNCATE` para as duas
  tabelas e o papel identificado;
- teste estático rejeita `GRANT`, DML, `DROP`, `ALTER` e objetos fora do escopo;
- relatório separa o candidato local da aplicação remota futura.

## Evidência e gates

- Teste específico: 1/1 PASS.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 baseline resolvidos.
- `git diff --check`: PASS.

## Sondagem runtime read-only

Identidade remota e signatures foram consultadas por SQL SELECT read-only. Não
houve aplicação de migration, alteração de grant/policy, SQL de escrita,
secret, push, merge ou deploy.

## Entrega

State=IDLE após FINALIZE_LOCAL. O lote aprovado foi arquivado em
`handoffs/archive/REMOTE-SUPABASE-TRUNCATE-PRIVILEGE-REMEDIATION-2026-08-25/`.
Qualquer aplicação remota será uma ação posterior, separada, com aprovação
própria.

Sem aplicação remota nesta etapa.
