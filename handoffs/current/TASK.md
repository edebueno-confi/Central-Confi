# TASK

- Task: ANALYTICS-DASHBOARD-AUTHORIZATION-RUNTIME-CLOSURE-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: 09dc2278653c311f03cd94ebc41f03501d37eea4
- Implementation SHA: FINALIZE_LOCAL_PENDING_SHA

## Finalização local

Veredito APPROVED pelo Sentinel. FINALIZE_LOCAL seletivo em andamento, limitado
ao harness, teste, relatório e handoffs allowlisted. Sem produto, banco,
migration, secrets, remoto, push, merge ou deploy.

## Origem e não duplicação

A fila canônica estava IDLE após a task 87. O gate de filtros comprovou
`platform_admin` e `dashboard_viewer`, mas o runtime matrix existente ainda
retorna `NO_GO` porque não recebe storage states para as personas autenticadas.
Esta task fecha somente a dimensão de autorização e negação, sem repetir
filtros, KPIs, RPC payloads ou stale helper já aprovados.

## Objetivo

Provar em runtime local read-only que:

- sessão não autenticada é redirecionada para `/login` com `redirectTo` correto;
- `platform_admin` e `dashboard_viewer` chegam às cinco abas do Dashboard com
  rota e aba ativa exatas;
- `customer_user` não acessa o Dashboard nem ganha navegação administrativa;
- requests externos, métodos de escrita, falhas de rede, erros de console/page,
  respostas inesperadas e rotas divergentes bloqueiam o resultado;
- storage state stale existente é coberto sem mascarar falha; se não existir,
  o relatório mantém `NÃO COMPROVADO` e `NO_GO`.

## Escopo allowlisted

- `scripts/local-qa/analytics-dashboard-authorization-runtime.mjs`
- `scripts/local-qa/analytics-dashboard-authorization-runtime-logic.mjs`
- `tests/scripts/analytics-dashboard-authorization-runtime.test.mjs`
- `docs/reports/ANALYTICS_DASHBOARD_AUTHORIZATION_RUNTIME_CLOSURE_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`

`handoffs/current/REVIEW.md` será preservado pelo reviewer.

## Critérios de aceitação

- alvo fixo em `127.0.0.1:4173`, Supabase apenas em `127.0.0.1:54321`;
- configuração QA existente carregada sem persistir valores sensíveis;
- matriz cobre cinco abas, quatro personas e dois viewports quando aplicável;
- rota/query/aba ativa e redirect são comparados exatamente;
- `customer_user` deve permanecer fora de `/admin/analytics`;
- cenário stale somente com state previamente fornecido, sem gerar state por
  senha ou tocar banco;
- regressões determinísticas cobrem rota indevida, aba divergente, persona
  sem permissão e request de escrita;
- relatório separa `GO` local de limitações de RLS/cross-tenant servido,
  equivalência numérica, performance real, remoto e produção.

## Fora de escopo

Produto, RPC, migration, schema, RLS/policies, banco, reset, fixtures,
secrets, login manual, requests externos, produção, push, merge e deploy.
