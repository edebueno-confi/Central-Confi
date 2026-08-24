# Preflight semântico das migrations locais — 2026-08-24

## Decisão

`NO_GO` global e `OWNER_DECISION_REQUIRED` para qualquer rebuild do banco
local principal. O registro histórico de `permission denied for schema
app_private` permanece abaixo como incidente da execução anterior. Na
execução vigente, o bootstrap descartável foi corrigido com role não-login,
ownership isolado e privilégios mínimos de runtime; o replay completo passou
snapshots e probes. O candidato continua separado da migration histórica e não
autoriza rebuild ou aprovação do banco principal.

As migrations não foram alteradas. O banco canônico
`supabase_db_genius-support-os` não recebeu reset, migration, SQL manual ou
escrita.

## Artefatos executados

- Preflight: `scripts/local-qa/semantic-migration-preflight.mjs`.
- Testes: `tests/scripts/migration-semantic-preflight.test.mjs`.
- Manifesto: `SEMANTIC_MIGRATION_MANIFEST`, versão `semantic-preflight-v1`.
- Benchmark: fixture sintética por `generate_series`, antes da primeira
  migration e depois da segunda migration no mesmo shadow; sem cópia de dados
  do banco canônico.
- Migrations avaliadas:
  - `20260822220000`, SHA-256 `2f510fe66073e8d45dc704f1f3f6101edc0b2d333f040c437b7de95f1e58563c`;
  - `20260823100000`, SHA-256 `3dd96ebef8648ca4ac6afc68bcc767f2afbe3f56b4bc82baf79c35ea2d36a8d7`.

## Preflight estático

As duas migrations passaram o manifesto e ficaram em
`PREFLIGHT_READY_FOR_SHADOW`; a classificação
`SEMANTICALLY_VERIFIED_IN_SHADOW` só foi publicada depois do replay final
`SHADOW_REPLAY_GO`. O manifesto exige:

- `EXECUTE` somente como `pg_get_functiondef(regprocedure)` seguido de
  transformação conhecida e `execute v_definition`;
- assinatura, alvo, âncoras, dependências e unicidade explícitos;
- comandos destrutivos e SQL dinâmico não reconhecido em `NO_GO`;
- comandos proibidos para o banco principal, incluindo `supabase db reset
  --local`, `supabase db push --local`, `supabase migration up --local`,
  `docker exec supabase_db_genius-support-os`, conexão em `127.0.0.1:54322`,
  `git reset`, `git clean` e `drop database`.

## Replay sombra

Resultado final: `SHADOW_REPLAY_GO` para as transformações semânticas.

Identidade observada:

- container: `confione_shadow_semantic_preflight_20260824_6648`;
- imagem: `public.ecr.aws/supabase/postgres:17.6.1.158`;
- container canônico explicitamente proibido: `supabase_db_genius-support-os`;
- `disposable: true`;
- o container foi removido com `docker rm --force` no `finally`; a verificação
  posterior não encontrou container com o prefixo shadow e manteve somente o
  container canônico ativo.

O replay aplicou as duas migrations em sequência sobre um PostgreSQL novo e
namespaced, com fixtures semânticas, fixture sintética escalada e RLS/policy
explícitas. A identidade foi verificada como distinta do container canônico. O
diff de catálogo foi exatamente a allowlist:

- `public.rpc_analytics_ceo_snapshot_legacy(date,date)`;
- `public.rpc_analytics_customer_success_kpis_v2()`;
- `public.rpc_analytics_support_kpis_v2(date,date,text,text)`;
- `public.rpc_analytics_timeseries(text,date,date,text)`;
- `public.rpc_analytics_timeseries_by_operation(text,date,date,text,text,text[])`;
- `app_private.set_analytics_pipeline_exclusion_scope(text[])`.

Nenhum objeto foi removido e o diff não excedeu a allowlist.

## Segurança e comportamento

Checks finais do replay: todos `true`.

- substituição dos dois literais UTF-8 nas três RPCs: corrigida, sem restante
  mojibake;
- exclusão simples: ticket `1`, deal `2`;
- exclusões múltiplas: ticket `1`, deal `1`;
- lista vazia: ticket `2`, deal `2`;
- outra operação: ticket `1`, deal `0`;
- operação inexistente: ticket `0`, deal `0`;
- Financeiro com operação: `unavailable_reason=operation_dimension_unavailable`;
- ACL: `anon_execute=false` nos alvos, `SECURITY DEFINER=true`,
  `search_path=` vazio;
- RLS/policy: RLS habilitado em `public.analytics_source_config` e policy
  `shadow_analytics_source_read` presente.

## Performance comparativa

O benchmark usou `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` com
`statement_timeout`, 1 warmup e 3 amostras por workload. O volume padrão foi de
5.000 tickets e 5.000 deals sintéticos, gerados por `generate_series`, com 100
pipelines sintéticos por tipo. A configuração pode ser ajustada por
`CONFIONE_SEMANTIC_PREFLIGHT_ROWS_PER_TABLE`,
`CONFIONE_SEMANTIC_PREFLIGHT_RUNS`,
`CONFIONE_SEMANTIC_PREFLIGHT_WARMUPS` e
`CONFIONE_SEMANTIC_PREFLIGHT_TIMEOUT_MS`. Os limites são volume `1000..100000`,
execuções `2..5`, warmups `0..2` e timeout `1000..30000 ms`.

A comparação ocorreu no mesmo shadow, com a mesma fixture e os mesmos
workloads, primeiro antes de qualquer migration e depois da segunda migration.
Além do RPC real, o join direto foi medido para observar a forma do plano. A
margem conservadora escolhida é 25% sobre a mediana de execução do servidor.
O custo estimado também não pode aumentar. A margem não é SLO de produção.
Plano divergente, custo maior, erro ou timeout falham sem margem.

| workload | before mediana ms | after mediana ms | limite after ms | plano | resultado |
| --- | ---: | ---: | ---: | --- | --- |
| `rpc_analytics_timeseries_all` | 2,988 | 4,857 | 3,735 | estável | **FAIL, regressão** |
| `rpc_analytics_timeseries_excluded` | 3,480 | 9,436 | 4,350 | estável | **FAIL, regressão** |
| `timeseries_join_all` | 2,453 | 2,200 | 3,066 | estável | PASS |
| `timeseries_join_excluded` | 4,889 | 4,177 | 6,111 | estável | PASS |

Todos os workloads terminaram sem timeout e `performance.comparable=true`, mas
`performance.passed=false` por regressão nas duas RPCs. O estado global permanece
`NO_GO` e nenhum rebuild pode ser proposto nesta etapa. A carga é sintética e
não prova capacidade, comportamento ou ausência de regressão no banco local
principal ou em produção.

## Incidentes do harness e correções

As primeiras tentativas foram fail-closed e não tocaram o banco principal:

1. o container descartável ainda estava no bootstrap quando o primeiro `psql`
   foi executado, retornando `FATAL: the database system is shutting down`;
2. o catálogo do shadow usou inicialmente `forcerowsecurity` em vez de
   `pg_class.relforcerowsecurity`.

O harness passou a aguardar o healthcheck `healthy`, usar `ON_ERROR_STOP=1` e
consultar as colunas corretas. O replay final passou; os incidentes ficam
registrados para evitar confundir falha transitória do harness com falha da
migration.

## Continuação: candidato otimizado no shadow — 2026-08-24

### Causa provável

O predicado introduzido pela migration histórica é avaliado dentro de cada
join. Para cada linha, ele chama `current_setting('app.analytics_excluded_pipeline_ids', true)` duas vezes e `string_to_array(...)` uma vez. A forma do plano externo permanece estável como `Result` para a RPC, mas o custo da expressão ocorre dentro da função e não aparece na árvore resumida do `EXPLAIN` externo. O join direto confirmou a separação: a mesma expressão isolada não apresentou a regressão comparativa das RPCs.

### Candidato separado

O harness aplicou, somente depois da migration histórica, um `CREATE OR REPLACE`
experimental de `public.rpc_analytics_timeseries` no mesmo shadow. O candidato:

- lê `current_setting` do grupo uma vez em `v_group_company`;
- lê e converte a lista uma vez em `v_excluded_pipeline_ids`;
- reutiliza os valores nos joins de tickets e deals;
- preserva `SECURITY DEFINER`, `search_path = ''`, assinatura, grants, escopo
  transacional e semântica de lista vazia;
- não altera `supabase/migrations/20260823100000...sql` nem é classificado como
  aprovação retroativa da migration histórica.

Evidência da função no catálogo do shadow:

| implementação | `current_setting` da exclusão | `string_to_array` | variáveis locais | predicados por array |
| --- | ---: | ---: | --- | ---: |
| histórica | 4 | 1 | nenhuma | 0 |
| candidata | 1 | 1 | `v_group_company`, `v_excluded_pipeline_ids` | 2 |

### Comparação tripla no mesmo shadow

Execução final: 5.000 tickets e 5.000 deals sintéticos, 100 pipelines por
tipo, 1 warmup, 3 amostras por workload, timeout de 5.000 ms e margem de 25%.
O container foi `confione_shadow_semantic_preflight_20260824_34712`, com a
imagem `public.ecr.aws/supabase/postgres:17.6.1.158`, distinto de
`supabase_db_genius-support-os` e removido no `finally`.

| workload | baseline | histórica | candidata | baseline -> candidata | histórica -> candidata |
| --- | ---: | ---: | ---: | --- | --- |
| `rpc_analytics_timeseries_all` | 6,704 ms | 8,820 ms | 4,971 ms | PASS | redução |
| `rpc_analytics_timeseries_excluded` | 5,452 ms | 14,607 ms | 5,349 ms | PASS | redução |
| `timeseries_join_all` | 3,126 ms | 3,187 ms | 3,185 ms | PASS | estável |
| `timeseries_join_excluded` | 6,863 ms | 6,229 ms | 6,764 ms | PASS | estável |

Todos os workloads terminaram sem timeout. Os quatro mantiveram a mesma forma
de plano e não aumentaram o custo estimado. A comparação baseline -> histórica
continua `BENCHMARK_REGRESSION` nas duas RPCs. A comparação histórica ->
candidata foi `OPTIMIZED_CANDIDATE_GO`, com redução estrita nas duas RPCs e
nenhuma regressão nos joins. O estado do shadow foi
`SHADOW_REPLAY_CANDIDATE_GO`; o estado global permaneceu `NO_GO` para não
confundir candidato experimental com aprovação da migration histórica.

### Função, catálogo, ACL/RLS e funcionalidade

- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` foi executado nas três etapas para
  as duas RPCs e os dois joins diretos.
- O diff histórico permaneceu limitado à allowlist. O diff adicional do
  candidato foi somente `public.rpc_analytics_timeseries(text,date,date,text)`.
- Antes e depois do candidato, `anon_execute=false`, `SECURITY DEFINER=true` e
  `search_path` vazio nos alvos. O candidato preservou os grants existentes.
- RLS permaneceu habilitado em `public.analytics_source_config` com a policy
  `shadow_analytics_source_read`.
- Os snapshots funcionalmente foram equivalentes (`candidateEquivalentToCurrent=true`):
  exclusão simples, múltipla, lista vazia, outra operação, operação inexistente
  e Financeiro indisponível passaram. UTF-8 e isolamento passaram na
  implementação histórica e no candidato.

### Decisão da continuação

O candidato é tecnicamente promissor e passou a comparação semântica e
comparativa no shadow, mas este relatório mantém `NO_GO` global porque a
migration histórica ainda reprova o benchmark e o candidato ainda não foi
promovido a migration de produto. A promoção exige revisão independente,
gates completos e decisão posterior; nenhum rebuild do banco local principal é
autorizado nesta etapa.

## Rechecagem dos findings F-SEM-001..003 — 2026-08-24

Timestamp local da rechecagem: `2026-08-24T14:55:02.9607690-03:00`.

### F-SEM-001 — contrato real do candidato

Resolvido no código e nos testes estáticos. `buildOptimizedTimeseriesCandidateSql`
recebe a definição completa da RPC canônica capturada por `pg_get_functiondef`
no shadow, preserva o corpo real e somente materializa
`v_excluded_pipeline_ids`. Não há corpo sintético de `ticket_count/deal_count`.
O teste determinístico verifica assinatura, `series`, `cohorts`, retorno de
indisponibilidade e a ausência desses campos sintéticos. A equivalência runtime
não é declarada como comprovada porque o replay desta rechecagem falhou antes
dos snapshots.

### F-SEM-002 — RLS e isolamento cross-tenant

Resolvido no desenho do gate, mas não comprovado runtime nesta execução. O
shadow usa dois contextos namespaced (`tenant-a/user-a` e `tenant-b/user-b`),
`FORCE ROW LEVEL SECURITY`, policies por `request.jwt.claim.tenant_id`, probe
direto de linhas visíveis e probe autenticado da RPC comparado ao recorte
direto. `assessCrossTenantEvidence` só retorna `proven=true` quando ambos os
probes passam. A regressão determinística mantém `proven=false` com somente
RLS/policy e sem equivalência RPC. Como o replay parou com
`permission denied for schema app_private`, o estado permanece `NO_GO` e o
isolamento servido continua **NÃO COMPROVADO**.

### F-SEM-003 — catálogo de segurança completo

Resolvido no parser/comparador. `catalogSql` e `diffCatalog` comparam, por
identidade, definição, owner/ACL, `SECURITY DEFINER`, `config/search_path`,
execução por `anon/authenticated/service_role`, RLS/force RLS e policies
(`roles`, comando, `qual` e `with_check`). A allowlist continua fail-closed
para objetos e campos fora do lote. O teste determinístico verifica mudanças
de definição, ACL/configuração, force RLS e policy.

### Comandos e resultados da rechecagem

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **15/15
  PASS**.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: **exit 0**;
  preflight estático PASS para as duas migrations, shadow `NOT_RUN`, estado
  global `NO_GO` por ausência deliberada da prova shadow.
- `npm run local:qa:migration-semantic-preflight`: **exit 0**; preflight
  estático PASS, replay descartável **NO_GO** por
  `permission denied for schema app_private`; nenhum snapshot, comparação de
  contrato ou prova cross-tenant foi promovido. O container não era o
  canônico e foi removido pelo `finally`.
- `git diff --check`: **PASS** nesta rechecagem antes da entrega.

O erro de schema é limitação de ambiente/harness a investigar em lote separado
ou por decisão do proprietário. Não houve migration, SQL manual, reset, repair,
escrita no banco principal, ação remota ou exposição de segredo.

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

### F-SEM-002 resolvido

O replay completo foi executado novamente em container descartável
`confione_shadow_semantic_preflight_20260824_32892`, com a imagem
`public.ecr.aws/supabase/postgres:17.6.1.158`. A identidade foi validada como
namespaced, distinta de `supabase_db_genius-support-os`, e não havia container
shadow remanescente após a execução.

Resultado do shadow: `SHADOW_REPLAY_CANDIDATE_GO`. A prova agora inclui:

- `completeContract=true` e `candidateEquivalentToCurrent=true`;
- `aclOk=true` e `currentAclOk=true`, com `anon_execute=false`, RPCs públicas
  executáveis somente por `authenticated/service_role` e helper `app_private`
  sem execução interativa;
- `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true` e `rlsOk=true`;
- snapshots e filtros executados nos contextos `tenant-a/user-a` e
  `tenant-b/user-b`, sem linhas do outro tenant;
- performance do candidato: `OPTIMIZED_CANDIDATE_GO`, comparável e aprovada
  no shadow.

O estado global segue `NO_GO` porque a comparação da migration histórica ainda
mantém a regressão de performance registrada anteriormente. Isso não autoriza
aplicar migration, rebuildar o banco principal ou promover o candidato a
migration de produto.

### F-SEM-004 resolvido

O teste específico foi reexecutado com a suíte atual e totalizou **15/15 PASS**.
A contagem anterior não reproduzível foi removida nesta seção e no handoff. O
teste focused completo deve ser reportado pela contagem do runner atual, sem
atribuir cobertura adicional ao teste específico.

Não houve migration, SQL manual, reset, repair, escrita no banco principal,
ação remota, secret, commit, push, merge ou deploy.

## Execução final do shadow após F-SEM-002 e F-SEM-004 — 2026-08-24

Timestamp local registrado após a execução: `2026-08-24T15:08:43.0724647-03:00`.

O replay completo foi repetido em container descartável
`confione_shadow_semantic_preflight_20260824_25372`, usando a imagem
`public.ecr.aws/supabase/postgres:17.6.1.158`. `targetVerified=true` e o alvo
foi confirmado como distinto de `supabase_db_genius-support-os`; o container
shadow não permaneceu após a execução.

Resultado reproduzível do comando
`node scripts/local-qa/semantic-migration-preflight.mjs`:

- `state=NO_GO`, preservando o bloqueio histórico;
- `shadowState=SHADOW_REPLAY_CANDIDATE_GO`;
- `completeContract=true`, `candidateEquivalentToCurrent=true`;
- `aclOk=true`, `currentAclOk=true`;
- `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true` e `rlsOk=true`;
- `performancePassed=true`, `performanceReason=OPTIMIZED_CANDIDATE_GO`;
- teste específico atual: `15/15 PASS`.

Esta execução comprova somente o candidato no shadow descartável. Não altera a
conclusão operacional: a migration histórica continua `NO_GO`, sem autorização
para rebuild, repair, migration local no banco principal ou qualquer ação
remota.

## F-SEM-005 — separação fail-closed do estado global

O resolvedor agora publica três estados distintos: `candidate_go`,
`historical_no_go` e `state`. A evidência histórica versionada em
`HISTORICAL_MIGRATION_GATE` mantém `historical_no_go` por regressão do baseline
(`2.988 -> 4.857 ms` e `3.480 -> 9.436 ms`). Portanto, mesmo quando o shadow
retorna `SHADOW_REPLAY_GO` com performance aprovada, `runPreflight` retorna
`state=NO_GO`, `candidateState=candidate_go` e
`historicalState=historical_no_go`. `migrationClassifications` permanece vazio
para não apresentar a migration histórica como liberada; a classificação do
candidato fica separada em `candidateMigrationClassifications`.

A regressão determinística simula shadow e performance aprovados e confirma
que o estado global continua `NO_GO`. O teste específico passou de 15/15 para
**16/16 PASS** após a inclusão dessa regressão. A contagem 15/15 permanece
somente como evidência histórica da rodada anterior.

O bloqueio histórico só pode ser removido por decisão do proprietário e nova
prova comparável do baseline. Não houve migration, SQL manual, reset, repair,
rebuild do banco principal, ação remota, secret, commit, push, merge ou deploy.

## Evidência vigente após a correção F-SEM-002/F-SEM-004 — 2026-08-24

Replay completo executado novamente em `confione_shadow_semantic_preflight_20260824_32544`,
com `public.ecr.aws/supabase/postgres:17.6.1.158`. A identidade foi validada
como descartável, namespaced e distinta de `supabase_db_genius-support-os`; o
container foi removido no `finally` e não restou shadow.

O bootstrap usa `analytics_owner` como role `NOLOGIN NOSUPERUSER NOCREATEDB
NOCREATEROLE NOINHERIT`, `app_private` com owner isolado e somente `USAGE` para
`authenticated`; a concessão ao `postgres` descartável serve apenas para
transferência de ownership. Não há `CREATE` concedido ao runtime.

Prova F-SEM-002 no replay completo:

- snapshots completos da RPC histórica e do candidato passaram para
  `tenant-a/user-a` e `tenant-b/user-b`, com `completeContract=true` e
  `candidateEquivalentToCurrent=true`;
- probes diretos autenticados tiveram `cross_tenant_ticket_count=0` e
  `cross_tenant_deal_count=0` nos dois contexts;
- `rlsPolicyPresent=true`, `rlsCrossTenantProven=true`,
  `authenticatedRpcTenantProven=true`, `crossTenantProven=true` e `rlsOk=true`;
- a RPC autenticada foi comparada ao recorte direto, inclusive na tentativa de
  operação cruzada, sem leitura de dados do outro tenant;
- `aclOk=true`, `currentAclOk=true`, `catalog.allowed=true` e
  `candidateAllowed=true`.

F-SEM-004 está corrigido na evidência vigente: o teste específico é **15/15
PASS**. Menções anteriores à contagem incorreta e ao finding permanecem como
histórico, sem serem usadas como resultado atual.

Gates finais registrados:

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

O replay do candidato terminou `SHADOW_REPLAY_CANDIDATE_GO` e
`OPTIMIZED_CANDIDATE_GO`. O estado global permanece `NO_GO` somente porque a
migration histórica continua com a regressão comparativa registrada e não pode
ser promovida ou aplicada ao banco principal.

## F-SEM-005 — evidência vigente fail-closed — 2026-08-24

O finding foi corrigido no harness. `runPreflight` agora expõe separadamente:

- `shadow.state`: resultado bruto do replay descartável;
- `candidate.state`: `candidate_go` ou `candidate_no_go` para o candidato;
- `historical.state`: `historical_no_go` enquanto a regressão do baseline estiver
  vigente;
- `globalState`/`state`: `NO_GO` quando `historical.state=historical_no_go`;
- `failClosed=true` e `historical.evidence` com os workloads e medições que
  sustentam o bloqueio.

A regressão determinística simula `shadow.state=SHADOW_REPLAY_GO` com
performance aprovada. O resultado confirmado é `candidate.state=candidate_go`,
`historical.state=historical_no_go`, `globalState=NO_GO` e `failClosed=true`.
O candidato não libera nem reclassifica a migration histórica.

Replay completo executado novamente pelo comando oficial
`npm run local:qa:migration-semantic-preflight`, exit 0. Nesta execução:

- shadow descartável: `confione_shadow_semantic_preflight_20260824_32164`,
  distinto do container canônico e removido ao final;
- `shadow.state=NO_GO` por `OPTIMIZED_CANDIDATE_REGRESSION` nesta amostra;
- `globalState=NO_GO`, `historical.state=historical_no_go` e
  `failClosed=true`;
- snapshots completos, equivalência, RLS cross-tenant e catálogo permaneceram
  aprovados antes do gate comparativo.

F-SEM-004 permanece coerente após a nova regressão: o teste específico atual é
**16/16 PASS**. As referências anteriores a 15/15 permanecem como histórico da
execução anterior, antes da asserção determinística de F-SEM-005.

## F-SEM-005 — evidência final da trava global — 2026-08-24

Timestamp local: `2026-08-24T15:17:18.9837848-03:00`.

O resolvedor passou a exigir `HISTORICAL_MIGRATION_GATE` com estado persistido
`historical_no_go`. `evaluateGlobalPreflightDecision` separa `candidate_go`,
`historical_no_go` e `state`; mesmo com shadow e performance aprovados, a
regressão determinística mantém `candidateState=candidate_go`,
`historicalState=historical_no_go` e `state=NO_GO`. A saída não apresenta a
migration histórica em `migrationClassifications`.

Validação final: `node --test tests/scripts/migration-semantic-preflight.test.mjs`
**16/16 PASS**; `npm run local:qa:migration-semantic-preflight -- --no-shadow`
retorna `NO_GO` com `failClosed=true`; `docs:validate`, `review:gates` e
`git diff --check` permanecem PASS. O replay completo descartável também não
desbloqueia a migration histórica. F-SEM-005 está respondido, mas qualquer
remoção do bloqueio exige decisão do proprietário e nova prova comparável do
baseline.

Gates amplos finais desta rodada: `npm run test:focused` **322/322 PASS**;
`npm run docs:validate` PASS; `npm run review:gates` PASS com 0 regressões
bloqueantes; `npm run quality:changed` aprovado com 0 findings; `npm run lint`
PASS com 0 erros e 158 warnings preexistentes; contracts/web typecheck e build
PASS; `git diff --check` PASS.

## Continuação 68 — remediação real da regressão histórica — 2026-08-24

Foi criada a migration versionada
`20260824190000_analytics_timeseries_scope_performance_remediation_v1.sql`.
Ela deriva a definição real de `public.rpc_analytics_timeseries` por
`pg_get_functiondef`, valida assinatura, âncoras e cardinalidade, materializa
`v_group_company` e `v_excluded_pipeline_ids` uma vez por chamada, substitui os
predicados repetidos e preserva contrato, `SECURITY DEFINER`, `search_path` vazio
e grants. As migrations históricas não foram alteradas.

O replay foi executado no shadow descartável
`confione_shadow_semantic_preflight_20260824_34520`, usando a imagem
`public.ecr.aws/supabase/postgres:17.6.1.158`. O container foi verificado como
distinto de `supabase_db_genius-support-os` e removido ao final.

Medianas da rodada, em milissegundos:

| workload | baseline | histórica | remediação | resultado |
|---|---:|---:|---:|---|
| `rpc_analytics_timeseries_all` | 6.341 | 7.778 | 5.592 | remediação reduz 28,1% contra histórica |
| `rpc_analytics_timeseries_excluded` | 5.965 | 10.411 | 6.011 | remediação reduz 42,3% contra histórica |
| `timeseries_join_all` | 3.218 | 5.238 | 3.257 | plano estável |
| `timeseries_join_excluded` | 5.577 | 7.222 | 6.085 | plano estável |

O resultado de performance foi `OPTIMIZED_CANDIDATE_GO`. A evidência lexical
comparou a implementação histórica com a remediação:

- histórica: `current_setting=4`, `string_to_array=2`, variáveis locais=0;
- remediação: `current_setting=1`, `string_to_array=1`, variáveis locais
  `v_group_company` e `v_excluded_pipeline_ids`, dois predicados variáveis;
- a equivalência funcional, contrato completo, ACL, `SECURITY DEFINER`,
  `search_path`, RLS/cross-tenant e RPC autenticada permaneceram aprovados.

O resultado global permanece deliberadamente `NO_GO`, com
`candidateState=candidate_go` e `historicalState=historical_no_go`. A remediação
é candidata aprovada somente no shadow; isso não autoriza aplicar migration,
reset, rebuild, repair ou SQL no banco local canônico ou remoto.
