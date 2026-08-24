# REVIEW

## Veredito

**CHANGES_REQUESTED**

- Task: `LOCAL-MIGRATION-SEMANTIC-PREFLIGHT-2026-08-24`
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `78d91b3230187cee11630ada1c34fcbcd639d025`
- Estado revisado: `READY_FOR_REVIEW`
- Owner devolvido: Forge
- Escopo: candidato otimizado e preflight/replay sombra; a migration histórica e o banco local principal permanecem `NO_GO`.

## Findings

### F-SEM-001 — HIGH — candidato não preserva o contrato real da RPC

Evidência local: `scripts/local-qa/semantic-migration-preflight.mjs:339-364` cria um corpo sintético para `public.rpc_analytics_timeseries` que retorna somente `ticket_count` e `deal_count`. A fonte executável real em `supabase/migrations/20260807250000_analytics_timeseries_v1.sql:29-229` retorna séries por domínio, coortes, período, legenda e estados de indisponibilidade; a migration histórica apenas injeta os predicados nos joins. O shadow inicial também usa a mesma função sintética em `scripts/local-qa/semantic-migration-preflight.mjs:537-551`.

Impacto: `candidateEquivalentToCurrent` compara duas implementações do fixture sintético, não o contrato real consumido pelo SaaS. Um candidato com a forma atual poderia eliminar métricas e quebrar `AnalyticsTrendPanel` mesmo passando os checks registrados.

Correção esperada: construir o candidato a partir da definição real da RPC no shadow, preservar o corpo completo, retorno, domínios, coortes, timezone, autorização e dependências, e comparar snapshots completos e representativos antes/depois. Não promover este SQL sintético a migration de produto.

### F-SEM-002 — HIGH — isolamento RLS/cross-tenant não foi comprovado

Evidência local: o fixture cria `shadow_analytics_source_read ... using (true)` em `scripts/local-qa/semantic-migration-preflight.mjs:523`; `rlsOk` apenas verifica a existência de RLS e do nome da policy em `:934-935`. Não há tenants, memberships, claims ou tentativas autenticadas de leitura cruzada. Os checks de operação usam apenas `group_company` e contagens do fixture.

Impacto: presença de RLS e de uma policy permissiva não demonstra isolamento entre tenants nem impede que um contexto autenticado veja dados fora do escopo. O critério de isolamento da TASK permanece não comprovado.

Correção esperada: adicionar fixture com pelo menos dois tenants/contexts, executar leituras com roles/claims representativos e afirmar negação de acesso cruzado e isolamento entre operações; ou reclassificar o gate como não comprovado e manter `NO_GO`.

### F-SEM-003 — MEDIUM — diff de catálogo não cobre ACL, RLS e policies

Evidência local: `catalogSql` coleta funções, RLS e policies (`:692-703`), mas `diffCatalog` compara somente `before.functions` e `after.functions` (`:707-719`). `catalogAllowed` e `candidateCatalogAllowed` também aceitam apenas identidades de funções (`:957-968`). ACL/grants, configuração de `search_path`, RLS e policies não são comparados como diff allowlisted entre estados.

Impacto: uma alteração fora da allowlist em policy, ACL ou propriedade de tabela poderia passar pelo critério de catálogo; os checks finais dos alvos não substituem reconciliação de mudanças.

Correção esperada: comparar cada componente coletado antes/depois, com allowlist explícita para alterações esperadas e falha para qualquer mudança não autorizada. Manter o check de `anon_execute=false`, `SECURITY DEFINER` e `search_path` com valor vazio, não apenas presença textual.

## Evidências e gates

- Validação independente: `node --test tests/scripts/migration-semantic-preflight.test.mjs` = 11/11 PASS.
- Validação independente: `npm run local:qa:migration-semantic-preflight -- --no-shadow` = `NO_GO`, preflight estático pronto somente para shadow, shadow não executado e decisão `OWNER_DECISION_REQUIRED`.
- `git diff --check` = PASS.
- Gates declarados pelo Forge: `test:focused` 317/317, `docs:validate` PASS, `review:gates` PASS, `quality:changed` PASS, lint/typecheck/build PASS. Foram aceitos como evidência do handoff, não como reexecução independente nesta revisão.
- O replay e o benchmark full-shadow foram lidos no relatório/IMPLEMENTATION, mas não foram repetidos nesta revisão para evitar nova escrita, ainda que descartável, sem necessidade após os bloqueios determinísticos acima.

## Limites e decisão operacional

O benchmark sintético, a equivalência declarada e os checks atuais não autorizam rebuild do banco local principal. A migration histórica continua `NO_GO` pela regressão comparativa já registrada. Não houve migration, SQL manual, reset, rollback, repair, escrita no banco, ação remota, secrets, push, merge ou deploy.

Próximo responsável: Forge. Corrigir F-SEM-001 a F-SEM-003 e devolver `READY_FOR_REVIEW`, preservando o histórico deste veredito.

## Re-review independente — 2026-08-24

**Veredito: CHANGES_REQUESTED**

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `78d91b3230187cee11630ada1c34fcbcd639d025`
- Estado revisado: `READY_FOR_REVIEW`
- F-SEM-001: **RESOLVIDO**. O candidato agora deriva a definição completa via
  `pg_get_functiondef`, preserva séries, coortes, indisponibilidade e rejeita
  fonte reduzida; o teste determinístico confirma esses invariantes.
- F-SEM-003: **RESOLVIDO**. O diff agora cobre definição, owner/ACL,
  propriedades de segurança, grants, tabelas, RLS, `FORCE RLS` e policies com
  allowlist estruturada.

### F-SEM-002 permanece aberto — HIGH

O replay atual falhou antes dos snapshots com `permission denied for schema
app_private` (`docs/reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md:228-254`).
Embora o harness agora contenha dois tenants/users, `FORCE RLS`, policies por
`request.jwt.claim.tenant_id`, probe direto e probe da RPC autenticada, nenhum
desses checks runtime foi comprovado nesta execução. O próprio gate permanece
`NO_GO` e `authenticatedRpcTenantProven=false` por ausência de prova.

Correção esperada: tornar o shadow executável com as permissões mínimas
necessárias, sem tocar o banco principal, e reexecutar o replay completo,
incluindo snapshots, probes diretos e RPC autenticada para os dois tenants.
Se a execução continuar indisponível, manter o candidato como não comprovado e
`NO_GO`.

### F-SEM-004 — MEDIUM — contagem do teste registrada incorretamente

O handoff e o relatório declaram `13/13`, mas a execução independente de
`node --test tests/scripts/migration-semantic-preflight.test.mjs` encontrou 15
testes e `15/15 PASS`. Corrigir a contagem em IMPLEMENTATION/relatório antes de
nova decisão, para manter a evidência auditável.

## Evidências da re-review

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **15/15
  PASS**.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: preflight
  estático PASS, shadow `NOT_RUN`, resultado global `NO_GO` esperado.
- Replay full-shadow reportado pelo Forge: `NO_GO` por permission denied em
  `app_private` antes dos snapshots; container descartável removido e o
  canônico não tocado.
- `git diff --check`: **PASS**.
- Os gates amplos declarados pelo Forge permanecem evidência do handoff; não
  foram todos reexecutados nesta rodada.

## Limite operacional

O candidato pode continuar em desenvolvimento local, mas não está aprovado
para promoção, rebuild do banco principal, migration, SQL manual, reset,
rollback, remoto, produção, push, merge ou deploy. Próximo responsável: Forge.

## Re-review independente — 2026-08-24 — resposta final recebida

**Veredito: CHANGES_REQUESTED**

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `78d91b3230187cee11630ada1c34fcbcd639d025`
- Estado revisado: `READY_FOR_REVIEW`
- F-SEM-002: **RESOLVIDO no shadow descartável**. O replay reportado e a
  reexecução independente comprovaram contrato completo, equivalência do
  candidato, ACL, `SECURITY DEFINER`, `search_path` vazio, dois tenants,
  `FORCE RLS`, probe direto e RPC autenticada sem leitura cruzada.
- F-SEM-004: **RESOLVIDO**. A evidência vigente é 15/15 PASS.

### F-SEM-005 — HIGH — estado global não está fail-closed para a migration histórica

Evidência independente: `npm run local:qa:migration-semantic-preflight` foi
executado no shadow descartável namespaced, distinto do container canônico e
removido ao final. O resultado atual retornou `state=GO` e
`shadow.state=SHADOW_REPLAY_GO`, enquanto o handoff e o relatório determinam
que a migration histórica continua globalmente `NO_GO` por regressão frente ao
baseline.

Evidência no código: `scripts/local-qa/semantic-migration-preflight.mjs:1319-1346`
define o estado global como `GO` quando o replay atual e a performance do
shadow passam. Não há uma trava persistente que preserve o `NO_GO` histórico
nem uma comparação obrigatória contra o resultado histórico reprovado. Como a
medição é sintética e variável, execuções podem alternar entre `GO` e `NO_GO`.

Impacto: uma execução posterior pode classificar as duas migrations como
`SEMANTICALLY_VERIFIED_IN_SHADOW` e emitir `GO`, contradizendo a decisão
operacional vigente e permitindo que um consumidor trate a migration histórica
como liberada. O texto “GO somente para etapa separada” não substitui um gate
de estado fail-closed.

Correção esperada: separar explicitamente `candidate_go` de `historical_no_go`,
persistir ou exigir a evidência histórica de regressão, e impedir que
`runPreflight` retorne `GO` global enquanto a migration histórica estiver
reprovada ou enquanto o baseline não for reproduzido de forma determinística.
Adicionar regressão que simule performance histórica aprovada e confirme que o
estado global ainda permanece `NO_GO` para a migration histórica.

## Evidências desta re-review

- Replay independente no shadow: executado com sucesso, sem tocar o container
  canônico; o candidato passou contrato, equivalência, ACL/RLS e performance.
- Teste específico: 15/15 PASS.
- Preflight sem shadow: `NO_GO` esperado e fail-closed.
- Preflight completo: **retornou `GO`**, evidenciando F-SEM-005.
- `git diff --check`: PASS.

## Decisão operacional

O candidato está tecnicamente aprovado somente no shadow descartável, mas o
lote não pode ser formalmente aprovado enquanto o estado global permitir
classificar a migration histórica como `GO`. Não autorizar migration, SQL,
reset, repair, rebuild do banco principal, remoto, secrets, push, merge ou
deploy. Próximo responsável: Forge.

## Re-review independente final — 2026-08-24

**Veredito: APPROVED, com escopo limitado ao candidato/preflight**

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `78d91b3230187cee11630ada1c34fcbcd639d025`
- Estado revisado: `READY_FOR_REVIEW`
- F-SEM-001, F-SEM-002, F-SEM-003, F-SEM-004 e F-SEM-005: **RESOLVIDOS** no escopo documentado.

### Evidências independentes

- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **16/16 PASS**.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: **NO_GO**, com `candidateState=candidate_no_go`, `historicalState=historical_no_go`, `globalState=NO_GO`, `failClosed=true` e `migrationClassifications=[]`.
- Replay shadow descartável independente: `shadowState=SHADOW_REPLAY_CANDIDATE_GO`, `candidateState=candidate_go`, `historicalState=historical_no_go`, `state/globalState=NO_GO`, `failClosed=true`, performance `OPTIMIZED_CANDIDATE_GO`. O alvo foi namespaced, distinto de `supabase_db_genius-support-os`, e removido ao final.
- A implementação separa `shadow`, `candidate`, `historical` e `globalState`; `HISTORICAL_MIGRATION_GATE` mantém a regressão histórica versionada. A regressão determinística confirma que performance aprovada do candidato não produz `GO` global.
- Gates declarados e reconciliados no handoff: `test:focused` **322/322 PASS**, docs:validate PASS, review:gates PASS, lint PASS com 0 erros, contracts/web typecheck PASS, build PASS com 944 módulos e `git diff --check`/cached diff-check PASS.

### Limite do veredito

Este APPROVED autoriza somente a finalização local seletiva do lote de parser/preflight, testes, relatório e handoffs, após conferência de allowlist e diff. Não autoriza migration histórica ou principal, SQL manual, reset, repair, rebuild do banco principal, ação remota, secrets, push, merge, deploy ou release. A migration histórica permanece `historical_no_go`; o estado operacional global permanece `NO_GO` e `OWNER_DECISION_REQUIRED`.

Próximo responsável: Forge para `FINALIZE_LOCAL` seletivo, sem promoção automática de implementação.
