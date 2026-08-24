# Local Migration Provenance Static Audit — 2026-08-24

## Resultado executivo

Foi concluída uma auditoria estática e read-only da proveniência das migrations
`20260822220000` e `20260823100000` e dos objetos executáveis que o gate local
aponta como sem origem comprovada.

O parser foi corrigido para reconhecer somente declarações estruturais
explícitas de `create function` ou `create table` fora de comentários, strings
SQL, identificadores quoted e corpos dollar-quoted, tolerando formatação SQL e
valores `default` de parâmetros. A correção também removeu falsos positivos: a
mera ocorrência de um nome em uma string `regprocedure`, em SQL dinâmico de
`EXECUTE` ou em variável dollar-quoted não é tratada como declaração de origem.
Comentários de bloco são mascarados com controle de profundidade, e comentário
aninhado não fechado ou ambíguo não produz prova de origem.
Strings PostgreSQL com prefixo `E/e` também respeitam escapes por barra
invertida; múltiplas aspas escapadas não expõem o SQL interno à regex estrutural.

O resultado permanece fail-closed:

- `20260822220000` continua
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`;
- `20260823100000` continua
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`;
- o gate local continua `ok: false`;
- cinco declarações antes não reconhecidas agora têm origem estática
  determinística comprovada;
- quatro objetos continuam `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`, incluindo um
  falso positivo anterior que foi corretamente rebaixado para bloqueio.

Nenhuma migration foi executada. Não houve SQL manual, repair, reset, rollback,
escrita no banco, chamada externa, leitura de secrets, push, merge, deploy ou
release.

## Regra de prova aplicada

`versionPresent` sozinho não prova origem. A origem só é marcada como verificada
quando a versão está presente e o arquivo versionado contém uma declaração
estática explícita do objeto esperado, com schema, nome e assinatura
compatíveis.

O reconhecimento ignora somente diferenças não semânticas comprovadas:

- espaços e quebras de linha;
- `create or replace`;
- expressão `default` em parâmetro, sem alterar a assinatura esperada.

O parser não considera como origem:

- nome dentro de `pg_get_functiondef`;
- nome dentro de string `regprocedure`;
- `CREATE FUNCTION` dentro de string executada por `DO` com `EXECUTE`;
- `CREATE FUNCTION` dentro de variável dollar-quoted executada depois por
  `EXECUTE`;
- `CREATE FUNCTION` dentro de comentário de bloco PostgreSQL aninhado;
- `CREATE FUNCTION` dentro de string PostgreSQL `E'...'` com múltiplas aspas
  escapadas por barra invertida;
- função apenas consultada ou reconstruída por `DO` com `EXECUTE`;
- uma assinatura de cinco parâmetros quando o arquivo declara seis.

Comentários de bloco PostgreSQL são mascarados com profundidade: `/*` interno
incrementa o nível e `*/` reduz o nível. Comentário não fechado ou ambíguo não
produz prova de origem.

## Migrations auditadas

### `20260822220000_analytics_utf8_and_scope_guard_v1.sql`

Evidência estática encontrada:

- bloco `DO` iterando três `regprocedure`;
- leitura de definições com `pg_get_functiondef`;
- substituição de literais por `replace`;
- reaplicação da definição resultante com `execute v_definition`;
- comentário explícito sobre `rpc_analytics_customer_success_kpis_v2`, sem
  declaração `create function` dessa RPC no arquivo.

Limitação: a definição efetivamente executada depende do catálogo do banco e
não é um texto estático completamente conhecido no preflight. O parser não
prova que a definição reconstruída seja segura. A migration permanece
`MIGRATION_PREFLIGHT_BLOCKED` e, como já constava aplicada localmente sem prova
de preflight, é reportada como
`HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`.

### `20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql`

Evidência estática encontrada:

- declaração explícita de `app_private.set_analytics_pipeline_exclusion_scope`;
- declaração explícita de `public.rpc_analytics_timeseries_by_operation` com
  seis parâmetros;
- bloco `DO` que consulta `public.rpc_analytics_timeseries` com
  `pg_get_functiondef`;
- construção de novos trechos com `format` e reaplicação por `execute`.

As declarações explícitas comprovam a origem dos objetos correspondentes, mas
não comprovam a segurança da migration inteira. O bloco dinâmico continua sem
prova estática suficiente. A migration permanece
`HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`.

## Objetos originalmente bloqueados

| Objeto | Migration esperada | Evidência estática | Classificação após auditoria |
|---|---|---|---|
| `default_internal_screen_keys` | `20260822200000` | `create or replace function app_private.default_internal_screen_keys(text,text)` | `VERIFIED_ORIGIN` |
| `rpc_admin_update_internal_access_assignment` | `20260822200000` | declaração explícita com quatro parâmetros | `VERIFIED_ORIGIN` |
| `rpc_admin_assign_internal_access_profile` | `20260822200000` | declaração explícita com dois parâmetros | `VERIFIED_ORIGIN` |
| `rpc_analytics_ceo_snapshot_legacy` | `20260822220000` | somente `regprocedure` e `pg_get_functiondef` dentro de `DO` | `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` |
| `rpc_analytics_support_kpis_v2` | `20260822220000` | somente `regprocedure` e `pg_get_functiondef` dentro de `DO` | `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` |
| `set_analytics_pipeline_exclusion_scope` | `20260823100000` | declaração explícita; `default` ignorado apenas na comparação da assinatura | `VERIFIED_ORIGIN` |
| `rpc_analytics_timeseries_by_operation_5` | `20260823100000` | migration declara seis parâmetros; a assinatura de cinco só é consultada no `DO` | `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` |
| `rpc_analytics_timeseries_by_operation_6` | `20260823100000` | declaração explícita com seis parâmetros | `VERIFIED_ORIGIN` |

## Falso positivo corrigido

`rpc_analytics_customer_success_kpis_v2` aparecia como `VERIFIED_ORIGIN` porque
o parser anterior procurava apenas o texto
`public.rpc_analytics_customer_success_kpis_v2()` e encontrava a string
`regprocedure` dentro do bloco `DO`.

O objeto não possui declaração explícita no arquivo. Após a correção, é
classificado como `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`. Essa mudança reduz a
permissividade do gate e não libera nenhum objeto sem prova.

## Alterações do lote

- `scripts/local-qa/assert-local-schema-parity.mjs`
  - reconhecimento estrutural de declarações de tabela e função;
  - comparação determinística de assinaturas;
  - rejeição de ocorrências em strings e SQL dinâmico como prova de origem.
- `tests/scripts/local-schema-parity.test.mjs`
  - regressão para formatação e `default`;
  - regressão para nome em `pg_get_functiondef` e `regprocedure`;
  - regressão para `CREATE FUNCTION` dentro de `EXECUTE` string;
  - regressão para `CREATE FUNCTION` dentro de variável dollar-quoted;
  - regressão para declaração estática de tabela;
  - regressão para diferenciar assinaturas de cinco e seis parâmetros;
  - regressão para comentário de bloco aninhado e comentário não fechado;
  - regressão para múltiplas aspas escapadas em string PostgreSQL `E'...'`.

## Validações

- Reexecução final dos gates após a correção de F-PROV-004 em
  `2026-08-24T11:35:20-03:00`.
- `node --test tests/scripts/local-schema-parity.test.mjs`: **15/15 PASS**;
- `npm run local:qa:schema-parity`: **exit 1 esperado/fail-closed**;
  `filesystemCount=298`, `appliedCount=298`, sem migrations ausentes ou
  somente históricas, duas exceções históricas sem preflight comprovado e
  quatro objetos sem origem após a auditoria;
- `npm run test:focused`: **306/306 PASS**;
- `npm run docs:validate`: **PASS**, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens de
  baseline resolvidos;
- `git diff --check`: **PASS**.

F-PROV-003 foi resolvido: o contraexemplo com declaração falsa entre o
fechamento de comentário interno e externo retorna `false`, e comentário
aninhado não fechado também retorna `false`. F-PROV-004 foi resolvido:
sequências de duas e quatro barras antes de aspas em string `E'...'` são
consumidas conservadoramente, e o contraexemplo com `CREATE FUNCTION` interno
retorna `false`.
Os bloqueios de SQL dinâmico e as classificações históricas permanecem
inalterados.

## Limitações preservadas

- Não há prova retroativa de que as duas migrations históricas foram aplicadas
  após preflight compatível.
- Não há prova de origem para os quatro objetos classificados como
  `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`.
- O parser não tenta analisar a semântica completa de SQL gerado por catálogo,
  `format` ou `EXECUTE`.
- O banco local foi consultado somente pelo gate read-only; não foi alterado.
- Não há conclusão sobre Supabase remoto, produção, RLS servido, integrações
  HubSpot/OMIE ou performance.

## Entrega

Este lote está sendo entregue como `READY_FOR_REVIEW` ao Sentinel. A aprovação,
se ocorrer, deverá ser limitada à finalização local seletiva dos arquivos da
allowlist. Não autoriza repair, migration, SQL manual, reset, rollback, escrita
remota, secrets, push, merge, deploy ou release.
