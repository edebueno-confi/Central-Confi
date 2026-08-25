# Analytics Dashboard Authorization Runtime Closure

**Data:** 2026-08-25
**Estado:** READY_FOR_REVIEW, aguardando re-review independente
**Task:** `ANALYTICS-DASHBOARD-AUTHORIZATION-RUNTIME-CLOSURE-2026-08-25`

## Objetivo

Validar a decisão de acesso do Dashboard em runtime local para não autenticado,
`platform_admin`, `dashboard_viewer`, `customer_user` e, quando um storage state
stale pré-existente estiver disponível, sessão stale.

Este relatório não substitui a prova de filtros da task 87. Ele cobre somente
guard, redirect, abas e ausência de acesso indevido.

## Segurança do ensaio

- alvo web fixo em `127.0.0.1:4173`;
- Supabase local verificado em `127.0.0.1:54321`;
- configuração QA lida somente em memória;
- nenhum token, cookie, senha ou payload sensível é publicado;
- nenhum cenário de edição, sincronização, exportação ou escrita é executado;
- requests POST allowlisted aceitos somente no Supabase local `:54321`; o mesmo
  pathname em `:4173` é bloqueado;
- host externo que não seja fonte estática Google, método de escrita, falha de
  rede, erro de console/page e resposta inesperada mantêm o resultado `NO_GO`.

## Evidência observada

Execução de `node scripts/local-qa/analytics-dashboard-authorization-runtime.mjs`:

- 40 rotas funcionais, cobrindo `platform_admin`, `dashboard_viewer` e
  `customer_user` em desktop e mobile, mais 10 rotas não autenticadas;
- admin e `dashboard_viewer` chegaram às cinco abas com pathname/query e aba
  ativa exatos, sem overflow;
- `customer_user` foi redirecionado para `/inicio` em todas as cinco abas e nos
  dois viewports;
- a navegação observada de `customer_user` continha somente `Meu espaço` e
  `Minha área`; links administrativos, botões de grupo e rótulos de
  administração são bloqueadores quando presentes;
- a sessão não autenticada preservou `redirectTo` exato em 10 casos;
- 0 falhas de rota, 0 erros de console/page, 0 request failures, 0 respostas
  inesperadas, 0 requests de escrita e 0 hosts externos não permitidos;
- configuração QA presente para as três personas autenticadas;
- stale state ausente, logo `stateMissing=["stale_session"]` e resultado
  global `NO_GO`/`failClosed=true`.

O harness pós-correção terminou com `NO_GO`, `failClosed=true`,
`stateMissing=["stale_session"]`, `failures=[]`, `writeRequests=[]`,
`unexpectedResponses=[]` e `externalRequests=[]`. A execução observou as
dimensões locais disponíveis, mas não transforma a ausência do stale state em
aprovação.

## Resposta aos findings F-AUTH-001..003

- **F-AUTH-001:** `isAllowedReadOnlyRequest` recebe a porta observada e rejeita
  qualquer POST allowlisted fora de `127.0.0.1:54321`. A regressão cobre o
  mesmo endpoint em `:54321` e `:4173`.
- **F-AUTH-002:** console errors, page errors e request failures entram nas
  falhas de cada rota não autenticada e stale, além da agregação global. Uma
  cobertura stale fornecida que não fecha todas as rotas também gera falha.
- **F-AUTH-003:** para `customer_user`, o harness coleta links e botões da
  navegação principal e bloqueia qualquer rota `/admin` ou rótulo
  administrativo. A regressão cobre link administrativo, botão de
  administração e navegação legítima de `Meu espaço`.

## Critério de interpretação

`AUTHORIZATION_RUNTIME_GO` significa apenas que o guard local se comportou
conforme os cenários executados. `NO_GO` pode significar falha observada ou
dimensão não fornecida, como storage state stale ausente. Em ambos os casos,
RLS/cross-tenant servido, equivalência numérica, performance real, Supabase
remoto, produção e deploy continuam `NÃO COMPROVADOS`.

## Validações executadas

- `node --test tests/scripts/analytics-dashboard-authorization-runtime.test.mjs`:
  10/10 PASS;
- `node --check` dos dois scripts: PASS;
- execução do gate local read-only: `NO_GO` esperado, `failClosed=true`, stale
  não comprovado, `failures=[]`;
- `git diff --check`: PASS.

Gates amplos anteriores do lote permanecem registrados em
`IMPLEMENTATION.md`; não foram reclassificados como nova evidência desta
correção determinística.
