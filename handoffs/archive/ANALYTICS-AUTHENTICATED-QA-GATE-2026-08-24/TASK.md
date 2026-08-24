# TASK

- Task: ANALYTICS-AUTHENTICATED-QA-GATE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 98dcbd3f55b3f5b4ac37bd45f3f43c599f8e1109
- Approval: APPROVED
- Priority: P0

## Objetivo

Validar de forma read-only o fluxo Analytics no ambiente local autenticado,
incluindo renderização, console, rede, RPCs, filtros por operação, estados de
fonte, sub-abas Posição/Evolução e responsividade.

## Escopo

- Usar somente o ambiente local e sessão já disponível; não solicitar, expor ou
  criar credenciais, secrets, tokens ou cookies.
- Cobrir Visão Geral, Comercial, Customer Success, Suporte e Financeiro, com
  recortes `Todas` e operações disponíveis quando a sessão e os dados permitirem.
- Registrar requests/responses por status, erros de console, falhas de runtime,
  estados de indisponibilidade, filtros aplicados e coerência entre posição e
  evolução.
- Exercitar viewports desktop e mobile sem mutações de dados.
- Se autenticação, dados locais ou contrato impedirem uma parte do teste,
  registrar `NÃO COMPROVADO` com evidência, sem transformar a lacuna em PASS.

## Fora de escopo

Produção, deploy, publicação, push, merge, migrations, SQL, banco remoto,
HubSpot, OMIE, sincronização externa, leitura ou alteração de secrets e qualquer
escrita operacional fora do navegador local.

## Aceite

Relatório reproduzível com rotas, viewport, estado de sessão, console, rede,
RPCs, filtros, estados e limitações. Testes auxiliares, docs:validate,
review:gates e `git diff --check` devem passar quando aplicáveis. A entrega deve
ser submetida ao Sentinel para revisão independente.
