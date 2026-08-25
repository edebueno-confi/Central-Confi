# TASK

- Task: ANALYTICS-DASHBOARD-FILTER-RUNTIME-PROOF-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: 869ea70198856535e112801ea86808d501e4abc8
- Implementation SHA: e8dc9d92

## Finalização local

- Veredito: APPROVED pelo Sentinel, limitado ao harness, regressões e prova
  local read-only.
- Finalize: FINALIZE_LOCAL seletivo concluído; commit SHA registrado no
  checkpoint de implementação.
- Sem alteração de produto, RPC, migration, banco, remoto, secrets, push,
  merge ou deploy.

## Objetivo

Provar em runtime autenticado local que o Dashboard recalcula a leitura após
trocas de operação e filtros, sem reutilizar dados antigos ou mascarar falhas.

## Escopo allowlisted

- scripts/local-qa/analytics-dashboard-filter-runtime.mjs
- scripts/local-qa/analytics-dashboard-filter-runtime-assertions.mjs
- tests/scripts/analytics-dashboard-filter-runtime.test.mjs
- docs/reports/ANALYTICS_DASHBOARD_FILTER_RUNTIME_PROOF_2026-08-25.md
- handoffs/current/*

## Critérios de aceitação

- Exercitar Visão Geral, Comercial, Customer Success, Suporte e Financeiro.
- Exercitar Todas e cada operação publicada pelas fixtures locais.
- Exercitar período, filtros específicos da área, pipelines e granularidade
  quando disponíveis.
- Registrar somente requests locais read-only e validar parâmetros RPC sem
  expor tokens, cookies ou secrets.
- Confirmar que cada alteração válida dispara nova leitura e que operação,
  período, estágio/status, responsável, prioridade e pipelines excluídos são
  enviados somente quando suportados pelo contrato.
- Registrar loading/invalidação e manter falhas de rede, console, page,
  respostas 4xx/5xx e rotas indevidas como bloqueadores.
- Incluir admin e dashboard_viewer; nenhuma ação administrativa ou escrita.
- Não alterar código de produto, RPC, migration, banco ou integração externa.

## Fora de escopo

Banco remoto, produção, secrets, migration, reset, rebuild, deploy, push,
merge, alteração de permissões ou alteração do comportamento de autenticação.
