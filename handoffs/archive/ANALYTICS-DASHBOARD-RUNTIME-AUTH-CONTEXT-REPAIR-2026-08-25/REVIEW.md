# REVIEW

- Task: ANALYTICS-DASHBOARD-RUNTIME-AUTH-CONTEXT-REPAIR-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 7d15e9833c893bc926275f3e32513f1b4a8c16be
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Resumo

A correção adiciona o RPC
`/rest/v1/rpc/rpc_internal_actor_workspace_context` por correspondência exata
e preserva o resultado `NO_GO`/`failClosed=true` da matriz autenticada. As
RPCs de Comercial e Suporte continuam respondendo HTTP 404 no schema local, e
a ausência de `LOCAL_QA_STALE_STORAGE_STATE` também permanece corretamente
bloqueante. Não há evidência de que o contrato analítico ausente tenha sido
alterado ou mascarado.

## Evidências reexecutadas

- `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`:
  5/5 PASS;
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`:
  PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS;
- a allowlist funcional do diff ficou restrita ao script e teste do harness;
  relatório e handoffs documentam o resultado sem alterar produto, RPC,
  migration ou banco;
- a execução autenticada reportada percorreu 4 personas e 5 abas, mas
  permaneceu `NO_GO` por estado stale ausente e HTTP 404 nas RPCs
  `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation`, com 3 erros de console por
  persona autenticada correspondentes às respostas 404.

## Finding

### F-AUTHCTX-001 — HIGH — allowlist POST não restringe hostname local

No `isReadOnlyRequest`, o ramo de POST exige método POST e porta `54321`, mas
não exige `isLocalTarget(url)` antes de aceitar o caminho exato do novo RPC ou
os RPCs analíticos. Consequentemente, uma requisição para um hostname externo
na porta `54321` com um caminho allowlisted pode ser aceita pelo gate, apesar de
TASK/IMPLEMENTATION/relatório declararem que o alvo é somente
`127.0.0.1`/`localhost`. Como o novo RPC foi incluído nesse ramo, a extensão
torna a divergência material para o caminho recém-liberado.

Impacto: o gate pode deixar de ser uma barreira de rede local e registrar como
permitida uma chamada externa, contrariando o critério de não ampliar host e a
premissa de execução read-only local. A execução atual não observou host
externo, portanto o impacto não foi reproduzido em runtime, mas a condição é
demonstrável por inspeção do predicado.

Correção esperada: exigir `isLocalTarget(url)` no ramo POST antes de aceitar
qualquer caminho, mantendo a correspondência exata de
`rpc_internal_actor_workspace_context`; adicionar regressão determinística
para host externo com porta 54321 e para método/caminho não allowlisted.

## Limitações preservadas

Personas autenticadas completas, sessão stale, sucesso funcional dos filtros,
RLS/cross-tenant, paridade de RPCs, performance e produção continuam não
comprovados. Não houve migration, SQL manual, alteração de banco, reset,
secrets, push, merge, deploy ou ação externa.

## Decisão

`CHANGES_REQUESTED` foi resolvido. O lote está aprovado somente para o harness
local read-only. A aprovação não autoriza a migration ou a correção remota das
RPCs 404.

## Re-review da correção F-AUTHCTX-001

- O ramo POST agora exige `request.method() === 'POST'`,
  `isLocalTarget(url) === true` e porta `54321` antes de aceitar qualquer
  caminho.
- O RPC `rpc_internal_actor_workspace_context` continua em correspondência
  exata; a expressão analítica existente não foi ampliada para métodos ou
  hosts externos.
- A regressão determinística da barreira de hostname foi adicionada.

Validações independentes:

- teste específico: 6/6 PASS;
- `node --check`: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

## Veredito final

`APPROVED`, limitado à correção da allowlist e ao gate runtime local
read-only. A matriz continua `NO_GO`/`failClosed=true` por ausência do estado
stale e pelos HTTP 404 das RPCs de Comercial/Suporte. Personas autenticadas,
filtros funcionais, RLS/cross-tenant, performance e produção continuam não
comprovados. Não houve banco, migration, SQL, secrets, push, merge ou deploy.
