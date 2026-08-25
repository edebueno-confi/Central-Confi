# TASK

- Task: ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-2026-08-25
- Base SHA: 93d47a35
- Final state: APPROVED, limited to documentary preflight
- Reviewer: Sentinel

## Escopo

Validar com segurança a aplicação remota do contrato KPI de seis argumentos.

## Resultado

O preflight remoto somente leitura encontrou as relações e colunas necessárias,
mas os helpers `app_private.analytics_pipeline_operation_eligible`,
`app_private.kpi_entry`, `app_private.kpi_ratio` e
`app_private.set_analytics_operation_scope` não existem no projeto remoto.
Consequentemente, a aplicação KPI ficou bloqueada em `NO_GO/failClosed=true`.

Não houve aplicação remota, SQL manual, retry, reset, repair, secrets, push,
merge ou deploy.
