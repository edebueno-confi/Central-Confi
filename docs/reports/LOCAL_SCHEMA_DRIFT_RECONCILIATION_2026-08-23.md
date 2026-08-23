# Reconciliação de drift do schema local

**Task:** `LOCAL-SCHEMA-DRIFT-RECONCILIATION-2026-08-23`
**Data da observação:** 23/08/2026
**Escopo:** somente Supabase local, sem reset, sem migration remota e sem chamadas HubSpot/OMIE.

## Resultado

**NO-GO local para aplicar as quatro migrations pendentes e declarar paridade.**

O alvo local foi confirmado, mas o CLI bloqueou a aplicação antes de executar
qualquer migration porque a tabela local de histórico contém a versão
`20260822130000` sem arquivo correspondente em `supabase/migrations`. Não foi
feito `migration repair`, aplicação manual de SQL, reset ou alteração do
histórico. A aplicação das quatro migrations permanece pendente.

## Allowlist e separação do worktree

Arquivos deste lote:

- `scripts/local-qa/assert-local-schema-parity.mjs`
- `tests/scripts/local-schema-parity.test.mjs`
- `package.json`, somente o script `local:qa:schema-parity`
- este relatório
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`

`handoffs/current/REVIEW.md` foi preservado para o Sentinel. Alterações
preexistentes em `docs/PROJECT_STATE.md`, `docs/README.md`, `handoffs/README.md`
e em `docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md` foram
mantidas fora do lote. Em especial, `docs/README.md` está explicitamente fora
da allowlist efetiva e não pode entrar no stage ou commit deste lote.

Stage seletivo esperado, somente após aprovação independente:

- `scripts/local-qa/assert-local-schema-parity.mjs`
- `tests/scripts/local-schema-parity.test.mjs`
- `package.json`
- `docs/reports/LOCAL_SCHEMA_DRIFT_RECONCILIATION_2026-08-23.md`
- quatro handoffs arquivados da task

Neste ciclo de correção, nenhum stage ou commit foi feito.

## Evidências reproduzidas

### Preflight do alvo

Em `2026-08-23T14:33:59.5125932-03:00`, o comando local
`docker ps --format '{{.Names}}|{{.Status}}|{{.Ports}}'` confirmou o banco
`supabase_db_genius-support-os` saudável e as portas locais `127.0.0.1:54322`
para PostgreSQL e `127.0.0.1:54321` para o gateway local. Também havia
containers locais de REST, Auth, Kong e Edge Runtime. Nenhum valor de ambiente,
token ou credencial foi lido ou impresso.

O gate `npm run local:qa:schema-parity` confirmou `target=supabase-local`,
`filesystemCount=297` e `appliedCount=294`.

### Drift de migrations

Migrations presentes no filesystem e ausentes de
`supabase_migrations.schema_migrations`:

- `20260822190000`
- `20260822200000`
- `20260822220000`
- `20260823100000`

Migration registrada no histórico sem arquivo versionado:

- `20260822130000`

Essa combinação é incompatível com o fluxo normal do Supabase CLI. O comando
executado em `2026-08-23T14:34:09.8153552-03:00` foi:

```text
npm exec -- supabase migration up --local --yes
```

Resultado sanitizado: `LegacyMigrationMissingLocalError`, informando que uma
versão do histórico não existe no diretório local. O CLI parou antes do apply.
O texto do erro sugeriu `migration repair` ou `db pull`; nenhuma dessas ações
foi executada porque alteraria o histórico ou dependeria de uma decisão de
reconciliação fora deste lote.

### Preflight de segurança das quatro migrations

O gate inspecionou os quatro arquivos sem executá-los. O detector bloqueia
`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` top-level e `ALTER TABLE ...
DROP`. Corpos dollar-quoted de funções persistentes são retirados porque seu
SQL só roda quando a função é chamada. Blocos `DO` são tratados de forma
diferente: seu corpo roda durante o apply, portanto `DELETE`, operações de
drop, `TRUNCATE` e `EXECUTE` dinâmico não analisável são bloqueados. `DROP
POLICY` idempotente não é classificado como remoção de tabela/coluna.

Resultado: `20260822190000` e `20260822200000` passaram o preflight. As
migrations `20260822220000` e `20260823100000` foram bloqueadas de forma
estruturada por conterem blocos `DO` com `EXECUTE` dinâmico não analisável. Isso
é um **NO-GO de segurança**, não uma falha técnica do detector. Nenhuma das
quatro migrations foi executada. O resultado não substitui revisão de
permissões, RLS ou execução controlada após a reconciliação do histórico.

### Schema e RPCs

O gate encontrou os objetos-alvo no schema local e não encontrou divergência de
assinatura para o conjunto conhecido, incluindo as variantes de séries de 5 e
6 argumentos. O resultado separa `versionPresent` de `originVerified`: a
presença de uma versão no histórico nunca é suficiente sozinha. `originVerified`
só pode ser true quando a versão está presente e o arquivo local da migration
contém a declaração esperada do objeto e assinatura; hash e causalidade de
execução ainda não são comprovados. Como as quatro versões de origem estão
ausentes do histórico, a origem de cada objeto permanece **NÃO COMPROVADA** e o
gate emite `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`.

Findings emitidos pelo gate:

- `MIGRATION_MISSING_FROM_HISTORY` para as quatro migrations pendentes;
- `MIGRATION_HISTORY_WITHOUT_FILE` para `20260822130000`;
- `MIGRATION_PREFLIGHT_BLOCKED` para migrations com `DO` e SQL dinâmico não
  analisável;
- `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` para os objetos executáveis cuja migration
  de origem não está no histórico local.

## Antes e depois

| Verificação | Antes do comando de apply | Depois |
|---|---|---|
| Arquivos de migration | 297 | 297 |
| Versões no histórico local | 294 | 294 |
| Quatro migrations do lote aplicadas | Não comprovado | Não aplicadas pelo CLI |
| Histórico órfão `20260822130000` | Presente | Presente |
| Reset/reparo/manual SQL | Não executado | Não executado |
| Gate de paridade | Falha acionável | Falha acionável, sem mudança de estado |

## Validações

- `node --test tests/scripts/local-schema-parity.test.mjs`, em
  `2026-08-23T14:47:51.7266743-03:00`: baseline anterior **7/7 PASS**; após as
  regressões novas, execução atual **9/9 PASS**.
- preflight estático das quatro migrations, em
  `2026-08-23T14:47:52.0687382-03:00`: **PASS para duas migrations**; duas
  foram bloqueadas pelo fail-closed de `DO` dinâmico. Os quatro arquivos não
  foram alterados e nenhum SQL foi executado.
- `npm run local:qa:schema-parity`, em `2026-08-23T14:47:52.0687382-03:00`:
  **falha esperada e acionável** com findings de drift, preflight bloqueado e
  origem não comprovada, sem segredo no output.
- `npm exec -- supabase migration up --local --yes`: bloqueado pelo drift
  histórico antes do apply; nenhuma migration executada.
- `npm run docs:validate`, em `2026-08-23T14:49:10.4043351-03:00`: **PASS**,
  0 bloqueados; 9 alertas históricos separados de bloqueios.
- `git diff --check`, em `2026-08-23T14:49:11.5771995-03:00`: **PASS**.
- `git diff --cached --check`, em `2026-08-23T14:50:40.8350478-03:00`: **PASS**
  com stage seletivo; nenhum commit foi criado e os arquivos preexistentes
  permaneceram fora do stage.
- `web:typecheck`: não aplicável; não houve alteração de frontend.

## Fatos, hipóteses e limitações

- **Fato:** o banco e as portas observadas são locais e o banco está saudável.
- **Fato:** quatro arquivos de migration não estão no histórico local.
- **Fato:** `20260822130000` está no histórico, mas não está no checkout.
- **Fato:** o CLI recusou prosseguir antes de executar o apply.
- **Fato:** os objetos-alvo existem e suas assinaturas conhecidas não divergiram
  no snapshot lido pelo gate.
- **Limitação:** a origem efetiva desses objetos não pode ser provada enquanto
  o histórico estiver inconsistente.
- **Limitação:** mesmo com versão presente, `originVerified` exige a declaração
  esperada no arquivo local; isso não prova hash de aplicação ou causalidade
  histórica do objeto no banco.
- **Bloqueio de segurança:** o preflight não permite aplicar as migrations que
  contêm `DO` com `EXECUTE` dinâmico, ainda que o objetivo aparente seja apenas
  regravar definições existentes.
- **Hipótese:** parte dos objetos pode ter sido criada por aplicação isolada
  anterior ou por um checkout diferente; isso não é tratado como prova de
  paridade.
- **Não comprovado:** paridade pós-migration, grants/RLS autenticados,
  scheduler, replay de sync, dados de HubSpot/OMIE e comportamento de produção.

## Próximo passo seguro

O proprietário deve decidir como restaurar ou reconciliar o arquivo ausente
`20260822130000` com o histórico local, preservando o conteúdo correto e a
proveniência. Depois dessa decisão, repetir o preflight e usar o fluxo normal do
CLI para as quatro migrations. Até lá, o gate deve permanecer bloqueando
replay, filtros e validações do Dashboard que dependam desses objetos.
