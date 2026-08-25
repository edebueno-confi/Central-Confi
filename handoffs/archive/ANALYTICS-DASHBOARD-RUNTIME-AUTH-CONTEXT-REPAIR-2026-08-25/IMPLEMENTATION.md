# IMPLEMENTATION

- Task: ANALYTICS-DASHBOARD-RUNTIME-AUTH-CONTEXT-REPAIR-2026-08-25
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 7d15e9833c893bc926275f3e32513f1b4a8c16be
- Implementation SHA: UNCOMMITTED_WORKTREE

## Implementação

O gate permite agora somente o caminho exato
`/rest/v1/rpc/rpc_internal_actor_workspace_context` como POST read-only de
contexto de autorização, preservando a allowlist analítica, o alvo local e o
fail-closed.

## Evidência autenticada final

- A matriz exercitou 4 personas e 5 abas por persona.
- `unauthenticated` e `stale_session` redirecionaram as 5 abas para `/login`.
- `authorized` e `dashboard_viewer` chegaram às 5 abas sem redirecionamento,
  com 39 interações de filtro por persona.
- O gate terminou em `NO_GO`, `failClosed=true`, pela ausência de
  `LOCAL_QA_STALE_STORAGE_STATE` e por HTTP 404 nas RPCs
  `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation`.
- Não houve request failure. Foram registrados 3 erros de console em cada
  persona autenticada, correspondentes às falhas 404 de contrato.
- O RPC `rpc_internal_actor_workspace_context` passou pela allowlist exata,
  permitindo que a matriz avançasse até as chamadas analíticas.

## Gates

- `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`: 6/6 PASS
- `npm run test:focused`: 355/355 PASS
- `npm run docs:validate`: PASS, 0 bloqueios
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens baseline resolvidos
- `git diff --check`: PASS
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`: PASS
- Typecheck, build e lint permanecem PASS conforme os gates anteriores; não houve
  alteração de produto TypeScript neste lote.

## Ação esperada

Sentinel deve revisar o diff, a correspondência exata do RPC, os gates e o
resultado `NO_GO`. Não há autorização para qualquer ação remota ou alteração
de banco.

## Correção F-AUTHCTX-001

O ramo POST passou a exigir `isLocalTarget(url)` além da porta 54321. Isso
mantém todos os POSTs allowlisted restritos a `127.0.0.1` ou `localhost`.
Foi adicionada regressão determinística para impedir regressão dessa barreira.

## Gates após a correção

- `node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`: 5/5 PASS
- `node --check scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`: PASS
- `npm run docs:validate`: PASS, 0 bloqueios
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens baseline resolvidos
- `git diff --check`: PASS
- `npm run test:focused`: 356/356 PASS na execução do lote; a regressão está
  incluída no teste focused.

O resultado da matriz permanece `NO_GO`/`failClosed=true`; as RPCs analíticas
404 e a ausência do storage state stale continuam limitações honestas.
