# TASK

- Task: ANALYTICS-DASHBOARD-STALE-SESSION-RUNTIME-CLOSURE-2026-08-25
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: FINALIZING
- Base SHA: 73462fe00964f992a039a0de442eb7b838c80d43

## Objetivo

Fechar a cobertura `stale_session` da matriz runtime do Dashboard sem mascarar
falhas reais. Uma sessão expirada pode provocar a rejeição esperada do refresh
em `/auth/v1/token`; isso deve ser distinguido de erro funcional somente quando
as cinco abas redirecionarem para `/login` ou `/access-denied` sem loop.

## Escopo allowlisted

- `scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`
- `scripts/local-qa/analytics-dashboard-runtime-matrix-logic.mjs`
- `tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`
- `docs/reports/ANALYTICS_DASHBOARD_STALE_SESSION_RUNTIME_CLOSURE_2026-08-25.md`
- `handoffs/current/*`

## Critérios de aceitação

- `stale_session` presente e exercitado nas cinco abas.
- Rejeição esperada do refresh stale é registrada separadamente, sem virar
  falso sucesso silencioso.
- Qualquer outro 4xx/5xx, erro de console/page, request failure, host externo,
  loop ou rota indevida mantém `NO_GO`/`failClosed=true`.
- `authorized` e `dashboard_viewer` continuam 5/5 sem 4xx/5xx.
- Regressões determinísticas cobrem refresh stale esperado e refresh/erro
  inesperado.
- Nenhum código de produto, RPC, migration, banco ou integração externa é
  alterado.

## Fora de escopo

Banco remoto, produção, secrets, migration, reset, rebuild, deploy, push,
merge, alteração de permissões ou alteração do comportamento de autenticação.
