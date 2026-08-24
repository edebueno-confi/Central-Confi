# TASK

- Task: ANALYTICS-AUTHENTICATED-RUNTIME-QA-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: ea328cac

## Objetivo

Executar QA local read-only do Dashboard após as correções de acesso e filtros,
verificando browser, console, rede, RPCs, estados e troca rápida de filtros.

## Critérios

- Verificar Overview, Comercial, CS/Suporte e Financeiro, incluindo trocas de operação, período e filtros disponíveis.
- Confirmar nova consulta por troca, sem loop, resposta obsoleta ou snapshot antigo visível.
- Registrar status HTTP, RPCs, console, request failures e limitações.
- Usar somente perfis/sessões locais já disponíveis; não criar fixture, senha, token ou cookie novo.
- Se autenticação não estiver disponível, registrar `NÃO COMPROVADO` sem mascarar 401/503.

## Fora de escopo

- alteração remota, migration, SQL, grant, policy, reset, rebuild, secrets, push, merge, deploy, produção ou criação de credenciais;
- alteração de código, salvo novo defeito determinístico aberto como lote separado.

## Entrega

- Relatório produzido em `docs/reports/ANALYTICS_AUTHENTICATED_RUNTIME_QA_2026-08-24.md`.
- QA autenticado bloqueado por `JWT issued at future` no ambiente local; cobertura interna permanece `NÃO COMPROVADO`.
- Não houve alteração de código, banco, migration, secrets, integrações, produção ou ação externa.
