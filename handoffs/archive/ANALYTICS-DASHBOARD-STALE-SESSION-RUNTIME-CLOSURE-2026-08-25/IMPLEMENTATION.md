# IMPLEMENTATION

- Task: ANALYTICS-DASHBOARD-STALE-SESSION-RUNTIME-CLOSURE-2026-08-25
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: FINALIZING
- Base SHA: 73462fe00964f992a039a0de442eb7b838c80d43
- Implementation SHA: UNCOMMITTED_WORKTREE

## Diagnóstico inicial

A matriz local com estado expirado reproduziu 5/5 redirecionamentos para login
sem loop. O único bloqueio foi um `POST /auth/v1/token` com HTTP 400 durante a
rejeição esperada do refresh stale, acompanhado pelo diagnóstico de recurso
rejeitado do navegador. A matriz atual trata qualquer 4xx/5xx como falha e não
separa esse caso esperado.

## Plano de execução

1. ajustar somente o harness para identificar a resposta de refresh stale no
   contexto da persona e das rotas redirecionadas;
2. manter qualquer falha não correspondente como bloqueadora;
3. adicionar regressões determinísticas e relatório;
4. reexecutar a matriz local com `authorized`, `dashboard_viewer` e
   `stale_session`.

## Implementação e validação

- `scripts/local-qa/analytics-dashboard-runtime-matrix.mjs` agora separa:
  - `expectedStaleAuthFailures`, somente para `stale_session` com storage state,
    transição stale observada, cinco rotas fechadas em `/login` ou
    `/access-denied`, método POST, endpoint local `/auth/v1/token` e status 400;
  - `contractFailures`, para qualquer outro 4xx/5xx;
  - `unexpectedDiagnostics`, que mantém erros de página, falhas de request,
    hosts externos e diagnósticos de console não correspondentes como bloqueio.
- O helper diretamente consumido em
  `scripts/local-qa/analytics-dashboard-runtime-matrix-logic.mjs` agora exige
  que o diagnóstico de console contenha `/auth/v1/token` e `400`, além da
  resposta stale observada; ele integra o gate allowlisted.
- A lógica de classificação foi extraída para
  `scripts/local-qa/analytics-dashboard-runtime-matrix-logic.mjs`. O console
  stale só é aceito quando há exatamente uma resposta POST 400 do refresh
  `/auth/v1/token`, exatamente um diagnóstico 400 e o diagnóstico avaliado é
  esse único evento sanitizado. 400 de outro endpoint, ausência da resposta ou
  diagnóstico adicional permanece bloqueante.
- A regressão determinística de
  `tests/scripts/analytics-dashboard-runtime-matrix.test.mjs` cobre a condição
  de cinco rotas, a separação entre refresh stale esperado e erro inesperado e
  a correlação do diagnóstico de console com o endpoint observado.
- Execução read-only local anterior ao estreitamento da isenção registrou
  `RUNTIME_MATRIX_GO`; essa evidência não é usada como aceite final.
- Gates da execução anterior à correção do finding: teste específico 7/7,
  `npm run test:focused` 357/357,
  `node --check` PASS, `npm run docs:validate` PASS com 0 bloqueios,
  `npm run review:gates` PASS com 0 regressões bloqueantes e 47 itens baseline
  resolvidos, `git diff --check` PASS.
- Não houve alteração de código de produto, RPC, migration, banco, segredo,
  ação remota, push, merge ou deploy.

## Resposta ao F-STALE-001

`isExpectedStaleConsoleError` foi estreitado. A isenção só ocorre quando a
persona stale tem as cinco rotas fechadas, o diagnóstico sanitizado contém
`/auth/v1/token` e o mesmo item possui uma resposta observada com
`method=POST`, `path=/auth/v1/token` e `status=400`. Um diagnóstico genérico
`Failed to load resource ... 400`, sem endpoint correlacionado, permanece em
`unexpectedDiagnostics` e mantém o gate em `NO_GO`.

Após a correção:

- teste específico `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`: 8/8 PASS;
- `npm run test:focused`: 358/358 PASS;
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos;
- `git diff --check`: PASS.

## Resposta ao F-STALE-002

`isExpectedStaleAuthResponse` agora conta as respostas stale observadas no
mesmo item antes de classificar a resposta recebida. A classificação esperada
só existe quando há exatamente uma resposta `POST /auth/v1/token` com status
400. Com duas respostas, ambas permanecem em `contractFailures`; portanto uma
repetição ou loop não pode ser mascarado. A regressão executável verifica as
duas respostas e confirma que o diagnóstico stale também não é isento.

Gates após a correção:

- teste específico `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`: 8/8 PASS;
- `npm run test:focused`: 358/358 PASS;
- `node --check` dos dois scripts: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos;
- `git diff --check`: PASS.

Não houve reexecução do browser nesta correção. A matriz mantém o resultado
anterior `NO_GO` quando o diagnóstico é genérico, e o novo limite permanece
fail-closed por teste determinístico.

- evidência da matriz read-only reexecutada antes do F-STALE-002: `NO_GO`, `failClosed=true`, authorized 5/5,
  dashboard_viewer 5/5, stale_session 5/5 em `/login`, unauthenticated 5/5 em
  `/login`, `expectedStaleAuthFailures=1`, `contractFailures=0`,
  `stateCoverageFailures=0` e um `unexpectedDiagnostics` de console genérico
  400. O bloqueio é intencional porque o navegador não forneceu endpoint
  correlacionável no diagnóstico.
- Não houve alteração de produto, RPC, migration, banco, segredo, ação remota,
  push, merge ou deploy nesta correção.
