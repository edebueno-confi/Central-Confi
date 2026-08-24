# TASK

- Task: LOCAL-MIGRATION-SEMANTIC-PREFLIGHT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Review scope: candidato otimizado, preflight semântico e evidências do shadow; migration histórica permanece NO_GO
- Resume condition: Sentinel revisar a separação `candidate_go`/`historical_no_go`, a regressão determinística e os gates; sem aprovação não promover migration
- Approval: APPROVED por OD-020 e instrução explícita do proprietário em 2026-08-24
- Base SHA: 78d91b3230187cee11630ada1c34fcbcd639d025

## Correção corrente após re-review Sentinel

- Correção corrente desta rodada: F-SEM-005 exclusivamente.
- F-SEM-001..004 permanecem resolvidos e preservados.
- O estado global nunca pode ser `GO` enquanto a decisão histórica vigente for
  `historical_no_go`, ainda que `shadow.state=SHADOW_REPLAY_GO`.

## Histórico preservado da correção anterior F-SEM-002/F-SEM-004

- Findings obrigatórios naquela rodada: F-SEM-002 e F-SEM-004.
- F-SEM-001 e F-SEM-003 permanecem resolvidos e preservados.
- Implementação: ajustar o harness descartável com privilégios mínimos e
  identidade explicitamente isolada, executar o replay completo com snapshots,
  probes diretos e RPC autenticada para tenant-a/tenant-b, e corrigir a
  evidência ativa para 15/15 PASS sem apagar o histórico do finding.
- Restrições: não editar `REVIEW.md`, migrations de produto, container
  `supabase_db_genius-support-os`, banco local principal, secrets ou ambiente
  remoto; não executar reset, migration, SQL manual, commit, push, merge ou
  deploy.

## Objetivo

Resolver tecnicamente o bloqueio da task 60 sem converter exceção histórica em
aprovação retroativa. Implementar preflight semântico para as migrations
`20260822220000` e `20260823100000`, provar as transformações dinâmicas em
ambiente local descartável e preparar rebuild local somente se todos os gates
forem `GO`.

## Escopo permitido

- manifesto de transformações semânticas permitidas;
- parser/preflight read-only e testes determinísticos;
- harness de replay sombra local descartável, sem tocar o banco local principal;
- diff de catálogo, ACL, `search_path`, `SECURITY DEFINER`, grants, RLS e policies;
- testes funcionais da assinatura de seis parâmetros, exclusões, Financeiro,
  operação inexistente e isolamento entre tenants/operações;
- baseline e comparação de performance com `EXPLAIN` e tempos locais;
- relatório e handoffs correntes da task.

## Fora de escopo nesta etapa

- reset/rebuild do banco local principal antes de shadow `GO`;
- migration, SQL manual ou repair no banco local principal;
- qualquer ambiente remoto, produção, secrets, HubSpot, OMIE, push, merge,
  deploy ou release.

## Critérios objetivos de conclusão

1. O preflight classifica apenas transformações conhecidas como `STATIC_SAFE` ou
   `SEMANTICALLY_VERIFIED_IN_SHADOW`; SQL dinâmico não reconhecido permanece
   `NO_GO`.
2. Replay sombra reproduz as duas migrations em sequência e gera diff de
   catálogo limitado à allowlist.
3. ACL/RLS, `search_path`, `SECURITY DEFINER`, grants e ausência de `anon`
   execute são comprovados.
4. Testes cobrem a nova assinatura de seis parâmetros, lista vazia, uma e várias
   exclusões, operação inexistente, Financeiro indisponível e isolamento.
5. Performance registra `EXPLAIN` e tempos comparativos sem regressão relevante
   ou timeout.
6. Somente após os critérios 1 a 5, Forge poderá propor rebuild local principal
   em etapa separada e com evidência reproduzível.
7. Sentinel revisa independentemente antes de qualquer finalização.

## Continuação autorizada: benchmark comparativo escalável

- A medição não comparável do shadow mínimo foi substituída por fixture
  sintética gerada por `generate_series`, configurável por ambiente e limitada
  por volume, execuções, warmups e timeout.
- O benchmark roda no mesmo container shadow, antes da primeira migration e
  depois da segunda migration, com os mesmos workloads e a mesma fixture.
- O critério conservador é mediana `after` até 25% acima da mediana `before`,
  sem aumento de custo estimado nem mudança na forma do plano. Timeout, erro,
  identidade ambígua, plano divergente ou critério não demonstrado mantém
  `NO_GO`. A margem não é SLO de produção e não transforma carga sintética em
  prova de produção.
- Resultado observado em 2026-08-24: 5.000 tickets e 5.000 deals sintéticos,
  3 amostras e 1 warmup por workload, timeout de 5.000 ms. Os joins diretos
  passaram, mas as RPCs tiveram regressão de `2,988 -> 4,857 ms` e
  `3,480 -> 9,436 ms`; o estado permanece `NO_GO`.

## Continuação autorizada: otimização semântica no shadow

- Estado de coordenação: `READY_FOR_REVIEW`, Owner `Sentinel`, Agent
  coordination `REVIEW_ACTIVE`.
- A otimização foi encerrada para revisão independente; o replay que não pôde
  provar o contrato runtime permanece `NO_GO`.
- O candidato deve permanecer separado da migration histórica e ser avaliado
  no mesmo shadow, com baseline, implementação atual e candidato otimizado.
- A otimização deve calcular a variável/array de exclusões uma vez, ou usar
  equivalente semântico, preservando isolamento entre tenants/operações e
  comportamento fail-closed.
- Não alterar o container canônico, o banco local principal ou migrations de
  produto. A entrega corrente é somente para revisão independente e não autoriza
  promoção da migration histórica.
- Se o candidato falhar em semântica, segurança, funcionalidade, plano,
  performance ou gates, retornar a `NO_GO` e registrar a causa e a resume
  condition explícita.
- O critério específico do candidato é comparação `implementação atual ->
  candidato`: redução estrita nas duas RPCs e nenhuma regressão de plano, custo,
  timeout ou join. A comparação `baseline -> implementação atual` continua
  sendo registrada para manter o bloqueio histórico; baseline e candidato
  também devem ser comparados no mesmo shadow.

## Estado após implementação

- Candidato otimizado: `SHADOW_REPLAY_CANDIDATE_GO` e pronto para revisão.
- Migration histórica: permanece `NO_GO` por regressão comparativa nas RPCs.
- Gates completos executados antes desta entrega: teste focado, docs validate,
  review gates, quality changed, lint, contracts typecheck, web typecheck,
  build e `git diff --check`.
- Próximo responsável: Sentinel. Não promover a migration, não rebuildar o
  banco local principal e não editar `REVIEW.md` durante esta etapa.

## Entrega vigente após F-SEM-002/F-SEM-004

- Replay completo concluído em shadow descartável namespaced, com identidade
  distinta de `supabase_db_genius-support-os`; snapshots completos, probes
  diretos e RPC autenticada passaram para `tenant-a/user-a` e `tenant-b/user-b`.
- F-SEM-002: `cross_tenant_ticket_count=0`, `cross_tenant_deal_count=0`,
  `rlsCrossTenantProven=true`, `authenticatedRpcTenantProven=true` e
  `crossTenantProven=true`.
- F-SEM-004: teste específico atual **15/15 PASS**; histórico anterior do
  finding foi preservado, sem usar contagem obsoleta como evidência vigente.
- Gates finais registrados em `IMPLEMENTATION.md`; candidato separado terminou
  `SHADOW_REPLAY_CANDIDATE_GO`, enquanto a migration histórica permanece
  `NO_GO` por regressão comparativa histórica.
- Estado de entrega: `READY_FOR_REVIEW`; próximo responsável `Sentinel`;
  `Agent coordination: REVIEW_ACTIVE`.

## Entrega vigente após F-SEM-005

- `runPreflight` separa `shadow.state`, `candidate.state`,
  `historical.state=historical_no_go` e `globalState=NO_GO`.
- A regressão determinística prova que `SHADOW_REPLAY_GO` com performance
  aprovada não pode produzir `GO` global enquanto a regressão histórica estiver
  vigente.
- Teste específico atual: **16/16 PASS**; referências 15/15 permanecem como
  histórico anterior à nova asserção.
- Replay oficial concluído, gates registrados em `IMPLEMENTATION.md` e entrega
  em `READY_FOR_REVIEW` para o Sentinel. F-SEM-001..004 permanecem resolvidos.
