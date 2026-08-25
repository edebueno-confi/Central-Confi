# Analytics Dashboard: fechamento do estado stale no runtime

## Resultado

O gate runtime agora separa a rejeição esperada de refresh de uma sessão
expirada das falhas reais. Um `POST /auth/v1/token` com HTTP 400 só é aceito
como evidência esperada quando pertence à persona `stale_session`, existe
storage state, as cinco abas foram exercitadas e todas terminaram em
`/login` ou `/access-denied`. Um diagnóstico de console só é classificado
como esperado quando o texto sanitizado contém `/auth/v1/token` e o mesmo item
possui essa resposta POST 400 observada. O texto genérico
`Failed to load resource ... 400`, sem endpoint correlacionado, permanece
inesperado e bloqueia o gate.

Qualquer outro 4xx/5xx, erro de console/page, falha de rede, host externo,
loop ou rota inesperada mantém `NO_GO` e `failClosed=true`.

## Evidência observada

Antes do fechamento do harness, um estado local com access token expirado e
refresh token inválido produziu:

- `stale_session`: 5/5 abas em `/login`;
- nenhuma rota em `/access-denied` indevidamente;
- nenhuma falha de request ou erro de página;
- um `POST /auth/v1/token` 400, correspondente à rejeição do refresh stale;
- um diagnóstico de recurso rejeitado associado a essa resposta.

Isso confirma o comportamento esperado da aplicação: sessão inválida não fica
em loop nem recebe falso acesso negado. O 400 é uma consequência controlada
da rejeição do token, não uma resposta de KPI ou RPC do Dashboard.

## Resposta ao F-STALE-001

O finding foi respondido sem ampliar a isenção de console. A correlação exige
que o próprio diagnóstico sanitizado contenha `/auth/v1/token` e que o mesmo
item possua a resposta observada `POST /auth/v1/token` com status 400. Como o
diagnóstico real observado foi genérico, ele permaneceu em
`unexpectedDiagnostics` e manteve o gate em `NO_GO`.

## Validação do harness

- `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`: 8/8
  PASS, incluindo regressão para diagnóstico genérico, endpoint diferente,
  ausência da resposta e diagnóstico adicional;
- a nova decisão exige cinco rotas fechadas antes de aceitar o refresh stale;
- falhas não correspondentes permanecem em `unexpectedDiagnostics` e bloqueiam
  o gate;
- a execução read-only registrada antes do F-STALE-002 retornou `NO_GO` e `failClosed=true`,
  como esperado para o diagnóstico genérico sem endpoint: `authorized` 5/5,
  `dashboard_viewer` 5/5, `stale_session` 5/5 em `/login` e
  `unauthenticated` 5/5 em `/login`; `expectedStaleAuthFailures=1`,
  `contractFailures=0`, `stateCoverageFailures=0` e um único diagnóstico
  inesperado de console 400;
- `npm run test:focused`: 358/358 PASS;
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS;
- não houve alteração de código de produto, RPC, migration, banco remoto,
  secrets, push, merge ou deploy.

## Resposta ao F-STALE-002

O classificador agora conta as respostas stale 400 observadas no item antes de
aceitá-las. Exatamente uma resposta `POST /auth/v1/token` 400 pode ser
registrada em `expectedStaleAuthFailures`. Com duas respostas, ambas ficam em
`contractFailures` e o gate permanece `NO_GO`/`failClosed=true`; o diagnóstico
de console também não é isento. A regressão determinística cobre esse caso de
repetição/possível loop.

Após a correção, o teste específico permaneceu em 8/8 e o focused em 358/358;
os dois `node --check`, `docs:validate`, `review:gates` e `git diff --check`
passaram. O browser não foi reexecutado neste ajuste; a evidência anterior de
`NO_GO` para diagnóstico genérico permanece documentada.

## Limitações

O runtime autenticado continua sendo local. RLS/cross-tenant servido,
performance com volume real, paridade numérica completa e produção/remoto não
foram promovidos por este lote.
