# TASK

- Task: ANALYTICS-DASHBOARD-RUNTIME-AUTH-CONTEXT-REPAIR-2026-08-25
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 7d15e9833c893bc926275f3e32513f1b4a8c16be
- Approval: APPROVED for local gate/test/report only

## Objetivo

Permitir no gate runtime somente o RPC read-only
`rpc_internal_actor_workspace_context`, usado pelo frontend para carregar a
autorização efetiva antes das abas do Dashboard. Reexecutar a matriz local
autenticada sem ampliar métodos, hosts ou escopo.

## Allowlist

- `scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`
- `tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`
- `docs/reports/ANALYTICS_DASHBOARD_RUNTIME_AUTH_CONTEXT_REPAIR_2026-08-25.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md`

## Fora de escopo

Produto, RPC, migration, banco canônico/remoto, SQL manual, reset, seed,
secrets, integrações externas, push, merge, deploy e release.

## Aceite

1. O RPC de contexto passa somente por correspondência exata.
2. Métodos de escrita e RPCs fora da allowlist continuam bloqueados.
3. Teste específico, focused, docs/review gates e diff-check passam.
4. A matriz autenticada registra evidência sanitizada ou permanece fail-closed
   quando faltar cobertura.

## Resultado da execução

- A matriz autenticada exercitou 4 personas e 5 abas por persona.
- `unauthenticated` e `stale_session` redirecionaram as 5 abas para `/login`.
- `authorized` e `dashboard_viewer` chegaram às 5 abas sem redirecionamento,
  com 39 interações de filtro por persona.
- O gate permaneceu `NO_GO` e `failClosed=true` porque faltou
  `LOCAL_QA_STALE_STORAGE_STATE` e as RPCs candidatas de Comercial/Suporte
  responderam HTTP 404 no schema local atual:
  `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation`.
- Não houve request failure; foram observados 3 erros de console por persona
  autenticada, coerentes com as falhas de contrato 404.
- O resultado confirma que a correção da allowlist do contexto foi necessária,
  mas não desbloqueia o contrato RPC ausente. Migration candidata, banco e
  remoto permanecem fora do escopo.

## Correção solicitada pelo Sentinel

- F-AUTHCTX-001: o ramo POST agora exige `isLocalTarget(url)` além da porta
  54321, impedindo que um hostname externo seja aceito por coincidir com uma
  rota allowlisted.
- Regressão determinística adicionada para preservar essa barreira.
