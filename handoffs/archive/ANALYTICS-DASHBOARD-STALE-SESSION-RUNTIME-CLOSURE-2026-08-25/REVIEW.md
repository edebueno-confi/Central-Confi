# REVIEW

- Task: ANALYTICS-DASHBOARD-STALE-SESSION-RUNTIME-CLOSURE-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 73462fe00964f992a039a0de442eb7b838c80d43
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Resumo

A separação do `POST /auth/v1/token` 400 esperado para `stale_session` é
adequada em princípio: exige estado, transição stale, cinco rotas fechadas em
`/login`/`/access-denied`, método, endpoint e status específicos. O resultado
observado `RUNTIME_MATRIX_GO` também mantém as limitações de produção fora do
escopo.

## Finding

### F-STALE-001 — HIGH — diagnóstico de console 400 é classificado de forma ampla

`isExpectedStaleConsoleError` aceita qualquer diagnóstico que corresponda a
`Failed to load resource:.*400` quando `staleSessionRoutesClosed(item)` é
verdadeiro. O diagnóstico não é vinculado ao `POST /auth/v1/token` esperado,
nem ao endpoint/response que originou a falha. Assim, um 400 local não
relacionado ao refresh, ocorrido durante a persona stale depois das cinco
rotas fecharem, pode ser removido de `unexpectedDiagnostics` e não bloquear o
gate.

Isso contraria o critério de que qualquer outro erro deve manter `NO_GO`. A
execução informada não demonstrou um falso positivo, mas a condição é
verificável diretamente no predicado do harness.

Correção esperada: correlacionar o diagnóstico com uma resposta stale
allowlisted observada, preservando a condição exata de método, endpoint e
status, ou não isentar o diagnóstico de console sem evidência correlacionável.
Adicionar regressão para 400 de outro endpoint/diagnóstico durante stale e
confirmar que ele permanece bloqueante.

## Evidências reexecutadas

- teste específico: 7/7 PASS;
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`:
  PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

As evidências do lote registram `authorized` 5/5, `dashboard_viewer` 5/5,
`stale_session` 5/5 em `/login`, `expectedStaleAuthFailures=1`,
`contractFailures=0`, `stateCoverageFailures=0` e
`unexpectedDiagnostics=0`. Esses fatos permanecem limitados ao runtime local
observado e não anulam o finding estrutural.

## Limitações e decisão

RLS/cross-tenant servido, performance real, paridade numérica completa e
produção/remoto continuam não comprovados. Não houve alteração de produto,
banco, migration, secrets, push, merge ou deploy.

`CHANGES_REQUESTED`. Owner devolvido ao Forge para estreitar a correlação do
diagnóstico stale e cobrir o falso positivo com regressão determinística.

## Re-review de F-STALE-001

F-STALE-001 foi respondido de forma adequada. O helper allowlisted agora exige
que o diagnóstico sanitizado contenha `/auth/v1/token`, que exista exatamente
uma resposta observada `POST /auth/v1/token` 400, que exista exatamente um
diagnóstico e que as cinco rotas stale estejam fechadas. Diagnóstico genérico,
endpoint diferente, resposta ausente ou diagnóstico adicional permanece
inesperado. A regressão executável cobre esses casos.

## Novo finding

### F-STALE-002 — HIGH — múltiplos refreshes 400 ainda são aceitos

`isExpectedStaleAuthResponse` classifica cada resposta individual
`POST /auth/v1/token` 400 como esperada quando as cinco rotas estão fechadas.
`contractFailures` apenas exclui essas respostas e não há limite de
`expectedStaleAuthFailures` nem verificação de repetição. Portanto, duas ou
mais rejeições stale idênticas podem resultar em `contractFailures=0` e não
bloquear o gate, embora múltiplos refreshes possam indicar loop ou tempestade
de renovação.

A verificação independente reproduziu a condição no helper: duas respostas
com os mesmos método, endpoint e status são individualmente classificadas
como esperadas. O runtime informado observou uma resposta, mas isso não cobre
o caso de repetição.

Correção esperada: exigir exatamente uma resposta stale esperada por item, ou
definir um limite comprovado e uma detecção explícita de loop; adicionar
regressão com duas respostas `POST /auth/v1/token` 400 e confirmar
`NO_GO`/`failClosed=true`.

## Evidências da re-review

- teste específico: 8/8 PASS;
- `node --check` dos dois scripts: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

## Veredito atualizado

`CHANGES_REQUESTED`. F-STALE-001 está resolvido, mas F-STALE-002 bloqueia a
aceitação até que repetição de refresh stale seja fail-closed. Nenhum banco,
migration, alteração de autenticação, secret, push, merge ou deploy foi
executado.

## Re-review formal de F-STALE-002

O finding F-STALE-002 foi resolvido dentro da allowlist. O classificador conta
todas as respostas observadas `POST /auth/v1/token` 400 no mesmo item e só
considera a rejeição esperada quando há exatamente uma. Com duas ou mais
respostas, nenhuma é removida de `contractFailures`,
 `staleRefreshLoopDetected` fica verdadeiro e `runtimeNoGo`/`failClosed`
 permanecem bloqueantes. O diagnóstico de console também não é isento nesse
 cenário. A regressão determinística cobre duas respostas, confirma ambas
 como inesperadas e detecta o loop.

F-STALE-001 permanece resolvido: diagnóstico genérico, endpoint diferente,
 ausência da resposta ou diagnóstico adicional continuam inesperados.

## Evidências independentes do re-review

- teste específico: `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`, 8/8 PASS;
- `npm run test:focused`: 358/358 PASS;
- `node --check` dos dois scripts: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos;
- `git diff --check`: PASS.

A matriz browser não foi reexecutada para esta alteração determinística do
classificador. A execução anterior permanece `NO_GO`/`failClosed=true` pelo
diagnóstico genérico não correlacionável, sem promoção indevida a `GO`.

## Veredito vigente

`APPROVED`, limitado ao harness read-only, à classificação de refresh stale e
às regressões determinísticas desta task. Esta aprovação não comprova login,
dados/RPCs, RLS/cross-tenant servido, performance real ou produção/remoto, e
não autoriza alteração do comportamento de autenticação, migration, banco,
secrets, push, merge ou deploy. Owner devolvido ao Forge para continuidade
local autorizada.
