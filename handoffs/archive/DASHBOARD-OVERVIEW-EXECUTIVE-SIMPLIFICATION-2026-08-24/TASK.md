# TASK

- Task: DASHBOARD-OVERVIEW-EXECUTIVE-SIMPLIFICATION-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Base SHA: 3dad2df4e9078762dc0fc6fe6d19664134c6a9c3
- Agent coordination: REVIEW_ACTIVE
- Resume condition: revisão independente do Sentinel
- Approval: APPROVED por autorização persistente do proprietário para execução sequencial local

## Objetivo

Transformar a Visão Geral em um resumo executivo curto e acionável, sem misturar
diagnóstico técnico de governança, cobertura ou fila operacional com a leitura
gerencial.

## Escopo permitido

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`;
- `apps/web/src/features/analytics/high-density.css`;
- testes focused diretamente relacionados à Visão Geral;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`.

## Requisitos

1. Remover da Visão Geral fila operacional, governança de cobertura, mapa
   técnico de fontes e textos longos de infraestrutura.
2. Preservar filtros de período e operação, estados honestos e recortes reais.
3. Manter resumos de Comercial, Customer Success, Suporte e Financeiro, deixando
   explícito que Financeiro permanece consolidado quando aplicável.
4. Reescrever o copy para responder o que está acontecendo e o que exige
   atenção, sem explicar a implementação interna.
5. Preservar o contexto `Como interpretar`, origem, fórmula e limitações já
   disponíveis; não inventar fonte ou cálculo.
6. Não alterar contratos, RPCs, migrations, RLS, integrações ou regra de
   negócio no frontend.

## Fora de escopo

Não executar replay adicional, migration, SQL, reset, alteração de banco,
secrets, chamadas externas, produção, push, merge, deploy ou release surface.

## Critérios de aceite

- typecheck, build, lint e testes focused aplicáveis passam;
- a Visão Geral renderiza com estados loading, erro, vazio e indisponível;
- filtros existentes continuam preservados e não há fallback consolidado
  indevido;
- a hierarquia executiva reduz rolagem e elimina os blocos técnicos definidos;
- `git diff --check` PASS;
- allowlist revisada e entrega formal para revisão independente do Sentinel.

## Entrega

Implementation SHA: UNCOMMITTED_WORKTREE. REVIEW.md foi preservado para a
revisão independente e não contém veredito do executor.
