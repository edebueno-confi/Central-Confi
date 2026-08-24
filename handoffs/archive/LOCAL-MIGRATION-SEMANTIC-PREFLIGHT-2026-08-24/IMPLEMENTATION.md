# IMPLEMENTATION

- Task: LOCAL-MIGRATION-SEMANTIC-PREFLIGHT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 78d91b3230187cee11630ada1c34fcbcd639d025
- Implementation SHA: 31ee18fbe59d60e30a1680fe81e35fea0b775ad0

## Correção corrente após re-review Sentinel

- Escopo ativo: F-SEM-005 exclusivamente.
- F-SEM-001..004 permanecem resolvidos e preservados.
- O preflight deve separar `candidate_go`, `historical_no_go` e `global state`,
  com trava determinística que impeça `GO` global enquanto a regressão histórica
  do baseline estiver vigente.

### F-SEM-005 respondido

`HISTORICAL_MIGRATION_GATE` persiste a evidência versionada da regressão do
baseline e mantém `historical_no_go`. `evaluateGlobalPreflightDecision` expõe
`candidate_go` separadamente, mas força `state=NO_GO` enquanto o gate histórico
estiver vigente. A saída não preenche `migrationClassifications` para evitar
que a migration histórica pareça liberada; classificações do candidato ficam
em campo separado.

Regressão determinística: shadow/performance aprovados continuam resultando em
`candidateState=candidate_go`, `historicalState=historical_no_go` e
`state=NO_GO`. O teste específico atual é **16/16 PASS**; 15/15 é apenas a
contagem histórica anterior à regressão adicionada nesta rodada.

## Histórico preservado da correção anterior F-SEM-002/F-SEM-004

- Escopo daquela rodada: responder exclusivamente F-SEM-002 e F-SEM-004.
- F-SEM-001 e F-SEM-003 permanecem resolvidos e preservados.
- F-SEM-002: corrigir o bootstrap de privilégios mínimos e identidade isolada
  do shadow, executar replay completo e provar negação cross-tenant por probes
  diretos e RPC autenticada em dois contexts.
- F-SEM-004: corrigir a evidência ativa para 15/15 PASS, sem apagar o histórico
  do finding.
- Estado da migration histórica: permanece `NO_GO`; nenhum SQL sintético será
  promovido a migration de produto.
- Restrições preservadas: `REVIEW.md`, migrations de produto, container
  `supabase_db_genius-support-os` e banco local principal não serão alterados;
  não haverá reset, migration, SQL manual, secrets, remoto, commit, push, merge
  ou deploy.

## Pedido ao Forge

Implementar o preflight semântico e o replay sombra descritos em TASK.md.
Preservar o banco local principal e não executar reset, migration, SQL manual,
repair ou escrita nele nesta etapa. Qualquer artefato de shadow deve ser
descartável, namespaced e comprovadamente separado do container canônico.

## Evidência inicial

- Task 60 permanece `BLOCKED` por F-REPAIR-001.
- `20260822220000` usa `regprocedure`, `pg_get_functiondef`, `replace` e
  `EXECUTE` para três funções.
- `20260823100000` cria uma RPC estaticamente e reconstrói outra usando
  `pg_get_functiondef`, âncoras, `format` e `EXECUTE`.
- O parser lexical atual bloqueia SQL dinâmico não analisável, corretamente
  mantendo o gate fail-closed.
- Reset/reapply sem preflight repetiria a exceção e não seria solução.

## Evidência do preflight semântico e replay sombra — 2026-08-24

- Comando: `npm run local:qa:migration-semantic-preflight`.
- Resultado estático: `20260822220000` e `20260823100000` em
  `PREFLIGHT_READY_FOR_SHADOW`, sem classificação terminal antes do replay;
  `SEMANTICALLY_VERIFIED_IN_SHADOW` só foi atribuído após o shadow final
  `SHADOW_REPLAY_GO`. `EXECUTE` foi permitido somente no padrão declarado e
  as dependências não divergiram.
- Replay semântico final: checks funcionais e catálogo em `SHADOW_REPLAY_GO`;
  o estado global do shadow ficou `NO_GO` somente pelo gate comparativo de
  performance, em
  `confione_shadow_semantic_preflight_20260824_34168`, imagem
  `public.ecr.aws/supabase/postgres:17.6.1.158`, identidade explicitamente
  diferente de `supabase_db_genius-support-os`, descartável e removido ao
  final. A verificação posterior encontrou somente o container canônico ativo.
- Diff de catálogo limitado à allowlist: três RPCs UTF-8, a RPC temporal
  histórica, a nova RPC temporal de seis parâmetros e
  `app_private.set_analytics_pipeline_exclusion_scope(text[])`; nenhum objeto
  removido ou fora da allowlist.
- Checks funcionais: UTF-8 nas três RPCs; exclusão simples `ticket=1/deal=2`;
  múltipla `ticket=1/deal=1`; lista vazia `ticket=2/deal=2`; outra operação
  `ticket=1/deal=0`; operação inexistente `ticket=0/deal=0`; Financeiro
  `operation_dimension_unavailable`.
- Segurança: `anon_execute=false`, `SECURITY DEFINER=true`, `search_path=`
  vazio nos alvos; RLS habilitado e policy `shadow_analytics_source_read`
  presente no fixture.
- A medição mínima anterior foi superseded pela continuação abaixo e não é
  usada como aprovação de performance.
- Estado global: `NO_GO` e `OWNER_DECISION_REQUIRED`; não autorizar rebuild do
  banco local principal. Relatório completo:
  `docs/reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md`.
- Incidentes transitórios do harness registrados: bootstrap do PostgreSQL
  descartável ainda em andamento e coluna de catálogo corrigida de
  `forcerowsecurity` para `pg_class.relforcerowsecurity`. Nenhum incidente
  alcançou o container canônico.

## Gates finais — 2026-08-24

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **15/15
  PASS**.
- `npm run test:focused`: **PASS**, 321/321 testes em 49 arquivos focados;
  inclui o teste do preflight semântico.
- `npm run docs:validate`: **PASS**, 3 documentos válidos, 9 com alertas
  históricos, 0 bloqueados.
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `npm run quality:changed`: **PASS**, 0 findings, lint, contracts typecheck e
  web typecheck aprovados.
- `npm run lint`: **PASS**, 0 erros e 158 warnings preexistentes do frontend.
- `git diff --check`: **PASS**.

## Estado de entrega anterior à otimização

O lote permaneceu `NO_GO / OWNER_DECISION_REQUIRED` nessa etapa anterior porque
o benchmark comparativo detectou regressão no workload RPC. O replay sombra
semântico foi comprovado e o container foi removido; isso não autorizava rebuild
do banco local principal. `REVIEW.md` não foi alterado.

## Continuação: benchmark comparativo escalável — 2026-08-24

- O `STATUS.md` foi atualizado para `IMPLEMENTING` no início da continuação e
  voltou a `NO_GO` após o benchmark real falhar por regressão de tempo.
- A implementação permaneceu limitada ao script, ao teste focado, ao relatório
  e aos três handoffs permitidos. `REVIEW.md` não foi editado.

## Continuação: otimização semântica no shadow — entregue para revisão

- Estado: `READY_FOR_REVIEW`; próximo responsável `Sentinel`; Agent coordination
  `REVIEW_ACTIVE`.
- Limitação: o replay da rechecagem parou antes da prova runtime por
  `permission denied for schema app_private`; o estado permanece `NO_GO`.
- Esta etapa só foi entregue para revisão após o candidato passar a comparação
  completa e todos os gates serem executados com resultado aprovado.
- O candidato será mantido separado da migration histórica, sem alteração do
  container canônico, banco local principal ou migrations de produto.

## Evidência da otimização no shadow — 2026-08-24

- O replay triplo foi executado no mesmo shadow descartável
  `confione_shadow_semantic_preflight_20260824_34712`, imagem
  `public.ecr.aws/supabase/postgres:17.6.1.158`, distinto de
  `supabase_db_genius-support-os`; o container foi removido no `finally`.
- Configuração: 5.000 tickets e 5.000 deals sintéticos, 100 pipelines por tipo,
  1 warmup, 3 amostras e timeout de 5.000 ms.
- Medianas `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` no mesmo shadow:

  | workload | baseline | histórica | candidata |
  | --- | ---: | ---: | ---: |
  | `rpc_analytics_timeseries_all` | 6,704 ms | 8,820 ms | 4,971 ms |
  | `rpc_analytics_timeseries_excluded` | 5,452 ms | 14,607 ms | 5,349 ms |
  | `timeseries_join_all` | 3,126 ms | 3,187 ms | 3,185 ms |
  | `timeseries_join_excluded` | 6,863 ms | 6,229 ms | 6,764 ms |

- `baseline -> histórica`: `BENCHMARK_REGRESSION` nas duas RPCs, mantendo o
  bloqueio histórico.
- `baseline -> candidata`: comparável e aprovado na margem configurada, sem
  mudança de plano ou custo estimado.
- `histórica -> candidata`: `OPTIMIZED_CANDIDATE_GO`, redução estrita nas duas
  RPCs e nenhum workload com regressão de plano, custo ou timeout.
- Catálogo: diff histórico dentro da allowlist; diff adicional do candidato
  somente `public.rpc_analytics_timeseries(p_domain text, p_from date, p_to
  date, p_grain text)`.
- Função/catálogo: histórica teve 4 ocorrências de `current_setting` da lista e
  1 `string_to_array`; candidata teve 1 ocorrência de cada, as variáveis locais
  `v_group_company` e `v_excluded_pipeline_ids` e dois usos do array.
- Segurança: `anon_execute=false`, `SECURITY DEFINER=true`, `search_path` vazio,
  grants preservados, RLS e `shadow_analytics_source_read` presentes.
- Funcionalidade: snapshots da histórica e candidata equivalentes; exclusões,
  lista vazia, isolamento por operação, operação inexistente, Financeiro
  indisponível e UTF-8 passaram.

## Decisão técnica atual

O candidato passou a investigação comparativa no shadow e foi entregue para
revisão após os gates completos. A task continua globalmente `NO_GO` porque a
migration histórica permanece reprovada e nenhum candidato foi promovido a
migration de produto. Não alterar migrations nem rebuildar o banco local
principal antes da revisão independente.
- A fixture de benchmark é sintética e isolada: `generate_series` cria
  `rowsPerTable` tickets e `rowsPerTable` deals, com 100 pipelines sintéticos
  por tipo e `group_company='benchmark'`. Nenhum dado do banco canônico é
  lido, copiado ou usado como fonte de carga.
- Configuração padrão executada: `rowsPerTable=5000`, `runs=3`, `warmups=1`,
  `timeoutMs=5000`. Limites explícitos: volume `1000..100000`, execuções
  `2..5`, warmups `0..2` e timeout `1000..30000 ms`. Variáveis opcionais:
  `CONFIONE_SEMANTIC_PREFLIGHT_ROWS_PER_TABLE`,
  `CONFIONE_SEMANTIC_PREFLIGHT_RUNS`,
  `CONFIONE_SEMANTIC_PREFLIGHT_WARMUPS` e
  `CONFIONE_SEMANTIC_PREFLIGHT_TIMEOUT_MS`.
- O mesmo shadow namespaced foi usado para `before_migrations` e
  `after_migrations`. Cada workload executou `EXPLAIN (ANALYZE, BUFFERS,
  FORMAT JSON)`, com `statement_timeout`, medianas de três amostras e tempo
  de parede medido no runner. Foram cobertos o RPC real sem/com exclusão e o
  join direto equivalente sem/com exclusão, permitindo observar a forma do
  plano.
- Margem conservadora escolhida: 25% sobre a mediana de execução do servidor.
  Não é limiar de produção nem SLO. É somente tolerância explícita para ruído
  do shadow e o custo esperado da condição adicional; custo estimado maior ou
  plano divergente sempre falha, independentemente da margem.

### Evidência do benchmark real

| workload | before mediana ms | after mediana ms | limite after ms | plano | resultado |
| --- | ---: | ---: | ---: | --- | --- |
| `rpc_analytics_timeseries_all` | 2,988 | 4,857 | 3,735 | estável | **FAIL, regressão** |
| `rpc_analytics_timeseries_excluded` | 3,480 | 9,436 | 4,350 | estável | **FAIL, regressão** |
| `timeseries_join_all` | 2,453 | 2,200 | 3,066 | estável | PASS |
| `timeseries_join_excluded` | 4,889 | 4,177 | 6,111 | estável | PASS |

- Todos os workloads terminaram sem timeout e a identidade do shadow foi
  verificada como `confione_shadow_semantic_preflight_20260824_9748`, distinta
  de `supabase_db_genius-support-os`, com descarte no `finally`.
- O replay semântico, catálogo, ACL, `search_path`, `SECURITY DEFINER`, RLS,
  policies e isolamento continuaram passando. O benchmark é comparável, mas
  não passou: `performance.comparable=true`, `performance.passed=false`,
  `shadow.state=NO_GO` e decisão `OWNER_DECISION_REQUIRED`.
- A carga continua sintética e não prova comportamento, capacidade ou ausência
  de regressão no banco local principal ou em produção.

## Evidência obrigatória antes de READY_FOR_REVIEW

- comandos e resultados do preflight semântico;
- replay sombra e identidade do alvo;
- diff de catálogo antes/depois;
- ACL/RLS/propriedades de função/grants;
- testes funcionais e de isolamento;
- `EXPLAIN`/tempos comparativos;
- `npm run test:focused`, `npm run docs:validate`, `npm run review:gates` e
  `git diff --check`, quando aplicáveis;
- limitações explícitas e decisão sobre eventual rebuild principal.

## Gates da entrega para revisão — 2026-08-24

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: 15/15
  PASS.
- `npm run test:focused`: 321/321 PASS em 49 arquivos.
- `npm run docs:validate`: PASS, 3 documentos válidos, 9 alertas históricos,
  0 bloqueados.
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens do baseline
  resolvidos.
- `npm run quality:changed`: PASS, 0 findings.
- `npm run lint`: PASS, 0 erros e 158 warnings preexistentes do frontend.
- `npm run contracts:typecheck`: PASS.
- `npm run web:typecheck`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Entrega

- Estado: `READY_FOR_REVIEW`.
- Próximo responsável: `Sentinel`.
- Pedido: revisar independentemente o candidato, o critério comparativo, a
  equivalência funcional, catálogo, ACL/RLS e a separação da migration
  histórica antes de qualquer promoção.
- A migration histórica permanece `NO_GO`; o estado global não autoriza rebuild
  do banco local principal.

## Resposta aos findings F-SEM-001..003 — rechecagem 2026-08-24

- F-SEM-001: `buildOptimizedTimeseriesCandidateSql` deriva da definição completa
  de `public.rpc_analytics_timeseries` obtida por `pg_get_functiondef` no
  shadow. O candidato preserva o contrato real de domínio, séries, coortes,
  legendas e estados de indisponibilidade; não usa o corpo sintético anterior.
  O teste determinístico confirmou esses invariantes e a ausência de
  `ticket_count/deal_count`.
- F-SEM-002: o harness agora exige dois contextos tenant/user, FORCE RLS,
  policies condicionadas por `request.jwt.claim.tenant_id`, probe direto de
  linhas e equivalência entre a RPC autenticada e o recorte direto. A função
  só aceita isolamento comprovado quando os dois níveis passam. Nesta
  rechecagem, o replay descartável parou antes dos snapshots com
  `permission denied for schema app_private`; portanto RLS/cross-tenant servido
  permanece **NÃO COMPROVADO** e o gate permanece `NO_GO`.
- F-SEM-003: o catálogo compara definição, owner/ACL, `SECURITY DEFINER`,
  `config/search_path`, grants de `anon`, `authenticated` e `service_role`,
  RLS/force RLS e policies completas. A allowlist continua restritiva por
  identidade e tipo de objeto.

Timestamp local da rechecagem: `2026-08-24T14:55:02.9607690-03:00`.

### Gates desta correção

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **15/15
  PASS**.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: preflight
  estático PASS; shadow NOT_RUN; estado global NO_GO esperado.
- `npm run local:qa:migration-semantic-preflight`: preflight estático PASS;
  shadow descartável NO_GO por `permission denied for schema app_private` antes
  da prova semântica. O shadow foi removido e o container canônico não foi
  acessado.
- `git diff --check`: **PASS**.

Não houve migration, SQL manual, reset, repair, escrita no banco principal,
ação remota, secret, commit, push, merge ou deploy. A limitação do schema
`app_private` impede declarar o contrato runtime e o isolamento como PASS;
continua `OWNER_DECISION_REQUIRED` para qualquer rebuild.

### Gates amplos reexecutados após a correção

- `npm run test:focused`: **321/321 PASS** em 49 arquivos focados.
- `npm run docs:validate`: **PASS**, 3 documentos válidos, 9 alertas históricos,
  0 bloqueados.
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `npm run lint`: **PASS**, 0 erros e 158 warnings preexistentes.
- `npm run contracts:typecheck`: **PASS**.
- `npm run web:typecheck`: **PASS**.
- `npm run build`: **PASS**, 944 módulos transformados.

## Re-review de F-SEM-002 e F-SEM-004 — 2026-08-24

Timestamp local: `2026-08-24T15:04:08.2088972-03:00`.

- Replay completo: `SHADOW_REPLAY_CANDIDATE_GO` no container descartável
  `confione_shadow_semantic_preflight_20260824_32892`, distinto do container
  canônico e removido ao final.
- Provas runtime: `completeContract=true`,
  `candidateEquivalentToCurrent=true`, `aclOk=true`, `currentAclOk=true`,
  `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true` e `rlsOk=true`.
- Os dois contextos `tenant-a/user-a` e `tenant-b/user-b` foram executados com
  RLS forçado, policies por tenant, probe direto e probe autenticado da RPC.
- Performance do candidato: `OPTIMIZED_CANDIDATE_GO`, comparável e aprovada no
  shadow. O estado global continua `NO_GO` pela regressão da migration histórica
  frente ao baseline; isso não autoriza rebuild ou promoção.
- Teste específico atual: **15/15 PASS**. A contagem anterior não reproduzível
  foi removida e não é mais a evidência vigente.

Não houve migration, SQL manual, reset, repair, escrita no banco principal,
ação remota, secret, commit, push, merge ou deploy.

## Execução final do shadow após F-SEM-002 e F-SEM-004

Timestamp local: `2026-08-24T15:08:43.0724647-03:00`.

O comando `node scripts/local-qa/semantic-migration-preflight.mjs` foi
reexecutado em container descartável
`confione_shadow_semantic_preflight_20260824_25372`, com alvo verificado e
distinto de `supabase_db_genius-support-os`. O container foi removido ao final.
O resultado foi `state=NO_GO` global e
`shadowState=SHADOW_REPLAY_CANDIDATE_GO`, com:

- `completeContract=true` e `candidateEquivalentToCurrent=true`;
- `aclOk=true` e `currentAclOk=true`;
- `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true` e `rlsOk=true`;
- `performancePassed=true` e `performanceReason=OPTIMIZED_CANDIDATE_GO`;
- teste específico atual `15/15 PASS`.

O `NO_GO` global permanece por causa da regressão histórica frente ao baseline.
O shadow candidato não autoriza rebuild, repair, migration no banco principal ou
qualquer ação remota.

## Evidência vigente e transferência para review — 2026-08-24

Replay completo final executado após o ajuste do bootstrap em
`confione_shadow_semantic_preflight_20260824_32544`, com identidade namespaced,
descartável e distinta de `supabase_db_genius-support-os`. O container foi
removido ao final. O role `analytics_owner` é não-login, sem privilégios de
superusuário, criação de banco ou roles; `app_private` tem ownership isolado,
`authenticated` recebe somente `USAGE` e leitura da membership, e não há
`CREATE` concedido ao runtime.

F-SEM-002 está comprovado no replay:

- snapshots completos históricos e do candidato passaram para
  `tenant-a/user-a` e `tenant-b/user-b`;
- ambos os probes diretos retornaram `cross_tenant_ticket_count=0` e
  `cross_tenant_deal_count=0`;
- `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true`, `crossTenantProven=true` e `rlsOk=true`;
- a RPC autenticada e o filtro de operação foram comparados ao recorte direto,
  sem leitura cruzada;
- `aclOk=true`, `currentAclOk=true`, `catalog.allowed=true` e
  `candidateAllowed=true`.

F-SEM-004 está corrigido na evidência vigente: o teste específico terminou em
**15/15 PASS**. As referências anteriores à contagem incorreta permanecem no
histórico do documento, mas não são o resultado ativo.

Gates finais:

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **15/15
  PASS**;
- `npm run local:qa:migration-semantic-preflight`: exit 0, replay completo;
- `npm run test:focused`: **321/321 PASS**;
- `npm run docs:validate`: PASS;
- `npm run review:gates`: PASS, 0 regressões bloqueantes;
- `npm run quality:changed`: aprovado, 0 findings;
- `npm run lint`: PASS, 0 erros e 158 warnings preexistentes;
- `npm run contracts:typecheck`, `npm run web:typecheck` e `npm run build`:
  PASS;
- `git diff --check`: PASS.

O shadow do candidato terminou `SHADOW_REPLAY_CANDIDATE_GO` e
`OPTIMIZED_CANDIDATE_GO`. O lote permanece globalmente `NO_GO` somente pela
regressão comparativa histórica, sem autorização para migration, repair ou
rebuild do banco principal.

Transferência: `READY_FOR_REVIEW`, próximo responsável `Sentinel`,
`Agent coordination: REVIEW_ACTIVE`. Não editar `REVIEW.md` nesta correção.

## F-SEM-005 resolvido — evidência vigente — 2026-08-24

`evaluateGlobalPreflightDecision` e `runPreflight` agora separam explicitamente
`shadow`, `candidate`, `historical` e `globalState`. A trava versionada
`HISTORICAL_MIGRATION_GATE` mantém `historical.state=historical_no_go` enquanto
a regressão do baseline estiver vigente. Mesmo com `shadow.state=
SHADOW_REPLAY_GO` e performance aprovada, a decisão determinística é
`candidate.state=candidate_go`, `globalState=NO_GO` e `failClosed=true`.

Regressão determinística executada no teste específico confirmou essa
propriedade. O replay completo oficial também foi executado e terminou com
`globalState=NO_GO`, `historical.state=historical_no_go` e shadow `NO_GO` por
`OPTIMIZED_CANDIDATE_REGRESSION` nesta amostra. O container descartável foi
namespaced, removido ao final e distinto de `supabase_db_genius-support-os`.

F-SEM-004 permanece coerente após a nova asserção: o teste específico atual é
**16/16 PASS**. As contagens anteriores permanecem apenas como histórico.

Gates desta rodada: replay oficial exit 0, `node --test
tests/scripts/migration-semantic-preflight.test.mjs` **16/16 PASS** e
`git diff --check` PASS. O estado operacional segue `NO_GO`; nenhuma migration,
rebuild ou ação no banco principal é autorizada.

## F-SEM-005 — evidência final da trava global

Timestamp local: `2026-08-24T15:17:18.9837848-03:00`.

`HISTORICAL_MIGRATION_GATE` mantém `historical_no_go` com evidência versionada
da regressão do baseline. `evaluateGlobalPreflightDecision` separa
`candidate_go`, `historical_no_go` e `state`; shadow aprovado nunca retorna
`GO` global enquanto o gate histórico estiver vigente. A saída mantém
`migrationClassifications=[]` e expõe classificações do candidato em campo
separado.

Regressão determinística: shadow/performance aprovados resultam em
`candidateState=candidate_go`, `historicalState=historical_no_go` e
`state=NO_GO`. O teste específico atual é **16/16 PASS** e o preflight sem
shadow retorna `NO_GO` com `failClosed=true`. Não houve migration, SQL, reset,
repair, rebuild do banco principal ou ação externa.

Gates amplos finais: `npm run test:focused` **322/322 PASS**;
`npm run quality:changed` aprovado com 0 findings; `npm run lint` PASS com 0
erros; `npm run contracts:typecheck`, `npm run web:typecheck` e `npm run build`
PASS; `npm run docs:validate` PASS; `npm run review:gates` PASS com 0
regressões bloqueantes; `git diff --check` PASS.
