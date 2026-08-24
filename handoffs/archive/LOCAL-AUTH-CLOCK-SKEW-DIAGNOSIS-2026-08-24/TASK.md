# TASK

- Task: LOCAL-AUTH-CLOCK-SKEW-DIAGNOSIS-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: b1518eb

## Objetivo

Diagnosticar a divergência temporal que impede o login local com `JWT issued at future` e tentar recuperação local não destrutiva para permitir QA autenticado.

## Critérios

- Comparar horário UTC do host e dos containers locais relevantes sem expor segredos.
- Identificar se a divergência é do host, Docker ou serviço de autenticação.
- Aplicar somente recuperação local não destrutiva e reversível, se necessária, sem reset, migration, seed ou perda de dados.
- Reexecutar apenas o login/QA read-only após a correção e registrar o resultado.
- Se a recuperação exigir ação fora desse escopo, registrar OWNER_DECISION_REQUIRED e preservar o estado.

## Fora de escopo

- banco remoto, produção, secrets, push, merge, deploy, reset, clean, migration ou escrita externa;
- alterar lógica de autenticação do produto para mascarar erro de relógio.

Nenhuma task ativa em `handoffs/current/`. O último lote foi arquivado após
aprovação independente do Sentinel.

## Entrega

- Relatório produzido em `docs/reports/LOCAL_AUTH_CLOCK_SKEW_DIAGNOSIS_2026-08-24.md`.
- Host e containers locais estavam alinhados; login 5/5 e browser read-only passaram após nova sessão.
- A causa histórica de `JWT issued at future` permanece não confirmada.
- Não houve escrita, reset, migration, seed, secret, alteração de produto ou ação remota.
