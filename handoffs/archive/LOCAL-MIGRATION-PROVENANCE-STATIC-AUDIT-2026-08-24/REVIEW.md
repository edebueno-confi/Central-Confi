# REVIEW

- Task ID: `LOCAL-MIGRATION-PROVENANCE-STATIC-AUDIT-2026-08-24`
- Reviewer: Sentinel
- Review mode: `SENTINEL_REQUIRED`
- Veredito: `CHANGES_REQUESTED`
- Base SHA revisada: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`

## Findings

### HIGH — F-PROV-001 — `verifyMigrationOrigin` ainda aceita declaração dentro de SQL dinâmico

Evidência reproduzida read-only contra
`scripts/local-qa/assert-local-schema-parity.mjs`:

- `v := 'public.fake_dynamic(text)'::regprocedure;` retorna `false`;
- `v := pg_get_functiondef('public.fake_dynamic(text)'::regprocedure);` retorna
  `false`;
- um bloco `DO` com `execute 'create or replace function public.fake_dynamic(...)'`
  retorna `true`;
- uma variável `v_definition := 'create or replace function public.fake_dynamic(...)'`
  seguida de `execute v_definition` também retorna `true`.

Os dois últimos casos não contêm uma declaração estática executável no arquivo.
Isso contradiz o critério de aceitar somente origem estática determinística e
permite que SQL dinâmico seja classificado como `VERIFIED_ORIGIN`. O gate de
schema continua `ok: false` no ambiente atual, mas o parser permanece
permissivo para futuras migrations e o defeito é de segurança da classificação.

Correção esperada:

1. aceitar somente uma declaração `CREATE FUNCTION`/`CREATE TABLE` estrutural
   fora de literais SQL, corpos dollar-quoted e construções `DO`/`EXECUTE`;
2. manter `regprocedure`, `pg_get_functiondef`, `format` e qualquer SQL
   reconstruído como não comprovação;
3. adicionar regressões determinísticas para `execute 'create function ...'` e
   para uma string/variável dollar-quoted contendo a declaração, ambas com
   resultado `false`;
4. preservar o comportamento positivo de declaração estática, `create or
   replace`, formatação e `default`.

### MEDIUM — F-PROV-002 — contagem do teste específico não corresponde à execução

O `IMPLEMENTATION.md` e o relatório registram
`node --test tests/scripts/local-schema-parity.test.mjs: 15/15 PASS`, mas a
execução independente atual encontrou 14 testes e retornou `14/14 PASS`.
O arquivo contém 14 chamadas `test(...)`. A evidência deve ser corrigida para o
resultado real após a correção de F-PROV-001 e todos os gates devem ser
registrados novamente sem arredondamento ou contagem histórica.

## Validações independentes

- `node --test tests/scripts/local-schema-parity.test.mjs`: `14/14 PASS`;
- `npm run test:focused`: `306/306 PASS`;
- `npm run docs:validate`: `PASS`, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: `PASS`, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `npm run local:qa:schema-parity`: `exit 1` esperado, read-only e fail-closed;
  `filesystemCount=298`, `appliedCount=298`, duas exceções históricas sem
  preflight comprovado, quatro objetos sem origem e `ok=false`;
- `git diff --check`: `PASS`.

## Escopo e limitações preservados

Os dados confirmam a distinção entre `versionPresent`, `originVerified` e
`verificationBasis`, além das classificações `VERIFIED_ORIGIN`,
`EXECUTABLE_OBJECT_WITHOUT_ORIGIN` e
`HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`. As migrations
`20260822220000` e `20260823100000` permanecem bloqueadas. Não houve escrita no
banco, SQL manual, reset, rollback, repair, migration, secret, chamada externa,
push, merge, deploy ou produção.

O lote não está aprovado para finalização local. Forge deve corrigir os dois
findings, atualizar `IMPLEMENTATION.md` e o relatório com contagens reais e
devolver a task para nova revisão independente do Sentinel.

## Re-review independente — 2026-08-24

- Revisor: Sentinel (Codex Independent Reviewer)
- Base SHA: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`
- Estado revisado: `READY_FOR_REVIEW`
- F-PROV-002: RESOLVIDO. A contagem atual do arquivo é 14 testes e a execução
  independente confirmou 14/14 PASS.
- F-PROV-001: os contraexemplos de string `EXECUTE`, variável dollar-quoted,
  `regprocedure` e `pg_get_functiondef` agora retornam `false`, conforme
  esperado.

### HIGH — F-PROV-003 — comentário de bloco aninhado permite falso positivo

Evidência reproduzida read-only em
`scripts/local-qa/assert-local-schema-parity.mjs`: o mascaramento de comentário
de bloco usa `source.indexOf('*/', index + 2)` em vez de controlar profundidade.
Um contraexemplo PostgreSQL com comentário aninhado:

```sql
/* outer comment
  /* nested comment */
  create function public.fake_nested(p_id uuid) returns void language sql as $$ select 1 $$;
*/
```

retornou `true` para `verifyMigrationOrigin`, embora não exista declaração
executável estática e o resultado esperado seja `false`. A declaração falsa
fica entre o fechamento do comentário interno e o fechamento do comentário
externo, portanto a busca estrutural pode classificá-la como origem verificada.

Isso viola o critério de que declarações dentro de comentários não são prova e
mantém risco de falsa confiança em futuras migrations. O gate atual continua
`ok=false`, mas o parser reutilizável permanece permissivo nesse contraexemplo.

Correção esperada: implementar mascaramento com profundidade para comentários
`/* ... */`, retornar sem prova em comentário não fechado ou ambíguo e adicionar
regressão determinística para o caso aninhado, preservando os testes positivos e
os bloqueios de SQL dinâmico.

### Validações da re-review

- `node --test tests/scripts/local-schema-parity.test.mjs`: 14/14 PASS;
- `npm run local:qa:schema-parity`: exit 1 esperado/fail-closed, 298/298,
  duas exceções históricas sem preflight e quatro objetos sem origem;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

### Veredito da re-review

`CHANGES_REQUESTED`. F-PROV-002 está resolvido, mas F-PROV-003 impede a
aprovação e a finalização local. O gate deve continuar fail-closed. Não houve
escrita no banco, SQL manual, migration, reset, rollback, repair, secrets,
chamada externa, push, merge, deploy ou produção.

## Re-review independente — correção F-PROV-003

- Revisor: Sentinel (Codex Independent Reviewer)
- Base SHA: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`
- F-PROV-003: RESOLVIDO. O parser agora controla a profundidade de comentários
  `/* ... */`, retorna sem prova para comentário não fechado e a regressão
  determinística passa.
- F-PROV-002: RESOLVIDO. A contagem atual e a execução independente confirmam
  15/15 PASS.

### HIGH — F-PROV-004 — string E com aspas escapadas permite falso positivo

Evidência reproduzida read-only contra `maskSqlLiterals` em
`scripts/local-qa/assert-local-schema-parity.mjs`: o scanner de strings trata
aspas duplicadas `''`, mas não trata a barra invertida usada em strings
PostgreSQL `E'...'`.

Este contraexemplo contém a declaração apenas dentro de uma string:

```sql
select E'prefix\\' create function public.fake_escape(p_id uuid)
returns void language sql as $$ select 1 $$\\' suffix';
```

`verifyMigrationOrigin` retornou `true`, embora o resultado esperado seja
`false`. A primeira aspas escapada é interpretada como fechamento, a declaração
fica exposta à regex e a segunda aspas escapada permite que o restante pareça
lexicamente balanceado.

Isso viola o critério de mascarar strings SQL antes da busca estrutural e pode
classificar uma migration futura como origem comprovada sem declaração
executável estática. O gate atual continua `ok=false`, mas a proteção lexical
permanece incompleta.

Correção esperada: reconhecer escapes de barra invertida em strings `E'...'`
ou aplicar comportamento conservador equivalente para evitar qualquer texto
interno exposto; adicionar regressões para aspas escapadas simples e múltiplas,
preservando strings SQL válidas, comentários aninhados e SQL dinâmico como não
prova.

### Validações desta re-review

- `node --test tests/scripts/local-schema-parity.test.mjs`: 15/15 PASS;
- `npm run local:qa:schema-parity`: exit 1 esperado/fail-closed, 298/298,
  duas exceções históricas e quatro objetos sem origem;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

### Veredito desta re-review

`CHANGES_REQUESTED`. F-PROV-003 está resolvido e F-PROV-002 está corrigido,
mas F-PROV-004 impede aprovação e finalização local. O gate deve continuar
fail-closed. Não houve escrita no banco, SQL manual, migration, reset, rollback,
repair, secrets, chamada externa, push, merge, deploy ou produção.

## Re-review independente — correção F-PROV-004

- Revisor: Sentinel (Codex Independent Reviewer)
- Base SHA: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`
- F-PROV-004: RESOLVIDO. As sondas atuais com sequências de 2 e 4 barras em
  string `E'...'` retornaram `false`; uma declaração estática legítima retornou
  `true`.

### MEDIUM — F-PROV-002 — contagem 16/16 não corresponde à execução atual

O `IMPLEMENTATION.md`, o relatório e a delegação registram 16/16, mas a
execução independente atual de
`node --test tests/scripts/local-schema-parity.test.mjs` listou 15 testes e
retornou **15/15 PASS**. A contagem de declarações `test(...)` no arquivo também
é 15. Isso é uma inconsistência de evidência e deve ser corrigido para o valor
real, sem alterar o teste apenas para atingir uma contagem declarada.

Correção esperada: atualizar `IMPLEMENTATION.md` e o relatório para 15/15,
confirmar novamente os gates e devolver o lote para revisão. F-PROV-003 e
F-PROV-004 devem permanecer registrados como resolvidos.

### Validações desta re-review

- `node --test tests/scripts/local-schema-parity.test.mjs`: **15/15 PASS**;
- sondas F-PROV-004: 2 barras `false`, 4 barras `false`, declaração estática
  `true`;
- `npm run local:qa:schema-parity`: exit 1 esperado/fail-closed, 298/298,
  duas exceções históricas e quatro objetos sem origem;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

### Veredito vigente

`CHANGES_REQUESTED`. F-PROV-004 está resolvido, mas F-PROV-002 precisa de
correção documental da contagem real antes da aprovação e finalização local.
O gate continua fail-closed. Não houve banco, migration, SQL manual, reset,
rollback, repair, secrets, produção, push, merge ou deploy.

## Re-revisão final independente — 2026-08-24

- Revisor: Sentinel (Codex Independent Reviewer)
- Review mode: `SENTINEL_REQUIRED`
- Base SHA revisada: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`
- Estado recebido: `READY_FOR_REVIEW`
- Implementation SHA: `UNCOMMITTED_WORKTREE`

### F-PROV-003 — RESOLVIDO

`maskSqlLiterals` agora controla a profundidade dos comentários PostgreSQL
`/* ... */`. Cada abertura interna incrementa `depth` e cada fechamento reduz
o nível; a declaração somente é exposta após o fechamento do comentário
externo. Quando o comentário permanece aberto, o parser retorna ausência de
prova (`null` internamente, `false` em `verifyMigrationOrigin`).

Reproduções read-only:

- comentário aninhado fechado contendo `CREATE FUNCTION`: `false`;
- comentário aninhado não fechado contendo `CREATE FUNCTION`: `false`;
- `EXECUTE` com declaração em string SQL: `false`;
- declaração estática estrutural equivalente: `true`.

As regressões determinísticas correspondentes estão presentes em
`tests/scripts/local-schema-parity.test.mjs` e passaram.

### F-PROV-001 e F-PROV-002

- F-PROV-001: resolvido e preservado. Strings de `EXECUTE`, variável
  dollar-quoted, `regprocedure` e `pg_get_functiondef` não são consideradas
  origem estática.
- F-PROV-002: resolvido. A execução atual contém 15 testes e confirmou
  `15/15 PASS`.

### Validações independentes

- `node --test tests/scripts/local-schema-parity.test.mjs`: **15/15 PASS**;
- `npm run test:focused`: **306/306 PASS**;
- `npm run local:qa:schema-parity`: **exit 1 esperado**, fail-closed,
  `filesystemCount=298`, `appliedCount=298`, sem migrations ausentes ou
  somente no histórico, duas exceções históricas sem prova de preflight,
  quatro objetos `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` e `ok=false`;
- `npm run docs:validate`: **PASS**, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: **PASS**;
- sondas direcionadas read-only para comentários aninhados, comentário não
  fechado, SQL dinâmico e declaração estática: **PASS**.

### Allowlist e contaminação

O lote revisado está limitado a:

- `scripts/local-qa/assert-local-schema-parity.mjs`;
- `tests/scripts/local-schema-parity.test.mjs`;
- `docs/reports/LOCAL_MIGRATION_PROVENANCE_STATIC_AUDIT_2026-08-24.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md`.

Não há arquivos staged. O worktree possui alterações preexistentes fora da
allowlist, incluindo documentação, handoffs arquivados e uma migration não
relacionada; elas permanecem fora do lote e não foram incorporadas. Não foi
detectada contaminação do lote revisado.

### Limitações e decisão de segurança

As migrations `20260822220000` e `20260823100000` continuam classificadas como
`HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`. Quatro objetos ainda
permanecem sem origem comprovada. O gate local continua `ok=false` por desenho.
Esta aprovação não transforma exceção histórica em aprovação técnica e não
autoriza repair, SQL manual, migration, reset, rollback, escrita no banco,
secrets, produção, push, merge, deploy ou release.

### Veredito final

`APPROVED` para **finalização local seletiva** da task, limitada à allowlist
acima e condicionada à validação final de contaminação pelo Forge. O finding
F-PROV-003 está resolvido, F-PROV-001 e F-PROV-002 permanecem resolvidos e o
gate fail-closed foi preservado.

## Veredito independente vigente — Sentinel

A seção de aprovação acima foi contradita por uma sonda independente
reproduzível executada nesta revisão. Ela não é removida para preservar o
histórico, mas não pode prevalecer sobre a evidência atual.

### HIGH — F-PROV-004 — string E com aspas escapadas permite falso positivo

Em `maskSqlLiterals`, o scanner de string trata aspas duplicadas `''`, mas não
trata escapes de barra invertida em strings PostgreSQL `E'...'`. O caso:

```sql
select E'prefix\\' create function public.fake_escape(p_id uuid)
returns void language sql as $$ select 1 $$\\' suffix';
```

fez `verifyMigrationOrigin` retornar `true`, embora a declaração exista apenas
dentro de uma string e o resultado esperado seja `false`. A primeira aspas
escapada é tomada como fechamento, expondo a declaração à regex; a segunda
permite que o restante pareça balanceado.

Correção esperada: reconhecer escapes de barra invertida em `E'...'` ou adotar
tratamento conservador equivalente, adicionar regressões para uma e múltiplas
aspas escapadas e confirmar que strings, comentários aninhados e SQL dinâmico
continuam sem prova.

### Validação vigente

- teste específico: 15/15 PASS;
- sonda read-only de `E'...'` escapada: **falha**, retornou `true` em cenário
  que exige `false`;
- `local:qa:schema-parity`: exit 1 esperado/fail-closed, 298/298, duas
  exceções históricas e quatro objetos sem origem;
- `docs:validate`, `review:gates` e `git diff --check`: PASS.

### Decisão vigente

`CHANGES_REQUESTED`. F-PROV-003, F-PROV-002 e os casos originais de F-PROV-001
estão resolvidos, mas F-PROV-004 impede aprovação e finalização local. Owner:
Forge. Não houve escrita no banco, migration, SQL manual, reset, rollback,
repair, secrets, produção, push, merge, deploy ou release.

## Re-revisão independente — correção F-PROV-004 — 2026-08-24

- Revisor: Sentinel (Codex Independent Reviewer)
- Review mode: `SENTINEL_REQUIRED`
- Base SHA revisada: `27ca9d8636c9a93ba50b9714291eb1910d3207f6`
- Estado recebido: `READY_FOR_REVIEW`
- Implementation SHA: `UNCOMMITTED_WORKTREE`

### Sondas direcionadas reproduzidas

As sondas foram executadas read-only contra o parser atual em
`scripts/local-qa/assert-local-schema-parity.mjs`:

| Caso | Resultado observado | Resultado esperado |
|---|---:|---:|
| `EXECUTE` com `CREATE FUNCTION` em string | `false` | `false` |
| variável dollar-quoted com declaração falsa | `false` | `false` |
| ocorrência `regprocedure` | `false` | `false` |
| `pg_get_functiondef` dentro de `DO` | `false` | `false` |
| declaração estrutural estática legítima | `true` | `true` |
| comentário PostgreSQL aninhado fechado | `false` | `false` |
| comentário PostgreSQL aninhado não fechado | `false` | `false` |
| string PostgreSQL `E'...'` com 2 barras antes da aspa | `false` | `false` |
| string PostgreSQL `E'...'` com 4 barras antes da aspa | `false` | `false` |

F-PROV-001, F-PROV-003 e F-PROV-004 estão resolvidos nas sondas
reproduzidas. A declaração estática continua sendo reconhecida, enquanto
texto em SQL dinâmico, comentários e strings não é promovido a prova de
origem.

### Validações independentes

- `node --test tests/scripts/local-schema-parity.test.mjs`: **15/15 PASS**;
  o arquivo atual contém 15 chamadas `test(...)` e a execução listou 15
  testes, sem divergência de contagem;
- `npm run test:focused`: **306/306 PASS** em 48 arquivos;
- `npm run local:qa:schema-parity`: **exit 1 esperado**, fail-closed,
  `filesystemCount=298`, `appliedCount=298`, sem migrations ausentes ou
  somente no histórico, duas exceções históricas
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`, quatro objetos
  `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` e `ok=false`;
- `npm run docs:validate`: **PASS**, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: **PASS**.

### Allowlist e contaminação

Allowlist revisada:

- `scripts/local-qa/assert-local-schema-parity.mjs`;
- `tests/scripts/local-schema-parity.test.mjs`;
- `docs/reports/LOCAL_MIGRATION_PROVENANCE_STATIC_AUDIT_2026-08-24.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md`.

Não há arquivos staged. Os únicos diffs rastreados fora da allowlist são
`docs/PROJECT_STATE.md`, `docs/README.md`,
`docs/engineering/OWNER_DECISIONS.md` e `handoffs/README.md`, todos
alterações preexistentes preservadas e não incorporadas ao lote. Os arquivos
não rastreados fora da allowlist também permaneceram fora do lote. Não foi
detectada contaminação da implementação revisada.

### Limitações e decisão de segurança

As migrations `20260822220000` e `20260823100000` continuam classificadas como
`HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`. Quatro objetos ainda
permanecem sem origem comprovada. O gate local continua `ok=false` por desenho.
Esta revisão não transforma exceção histórica em aprovação técnica e não
autoriza repair, SQL manual, migration, reset, rollback, escrita no banco,
secrets, produção, push, merge, deploy ou release.

### Veredito independente vigente

`APPROVED` para **finalização local seletiva** pelo Forge, limitada à allowlist
acima, após validação final de escopo e contaminação. F-PROV-001, F-PROV-002,
F-PROV-003 e F-PROV-004 estão resolvidos. O gate fail-closed e as duas
exceções históricas permanecem preservados.
