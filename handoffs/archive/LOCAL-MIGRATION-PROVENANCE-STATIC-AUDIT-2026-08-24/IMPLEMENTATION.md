# IMPLEMENTATION

- Task ID: LOCAL-MIGRATION-PROVENANCE-STATIC-AUDIT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 27ca9d8636c9a93ba50b9714291eb1910d3207f6
- Implementation SHA: 1099ff25
- Allowlist inicial: `scripts/local-qa/assert-local-schema-parity.mjs`,
  `tests/scripts/local-schema-parity.test.mjs`,
  `docs/reports/LOCAL_MIGRATION_PROVENANCE_STATIC_AUDIT_2026-08-24.md` e os
  quatro handoffs correntes.

## Pedido ao Forge

Executar uma auditoria estática e read-only da proveniência da task 60. O lote
deve manter o gate fail-closed e só pode relaxar uma classificação quando a
prova for determinística, local e coberta por regressão. Se a origem ou a
segurança não puder ser comprovada, preservar o bloqueio explícito.

## Implementação concluída

- F-PROV-001 resolvido: `verifyMigrationOrigin` agora exige declaração
  estrutural explícita de `create function` ou `create table`, com schema,
  nome e assinatura compatíveis, depois de mascarar comentários, strings SQL,
  identificadores quoted e corpos dollar-quoted. Assim, declarações dentro de
  `DO`, `EXECUTE`, `format`, `pg_get_functiondef`, `regprocedure` ou SQL
  reconstruído não são consideradas prova.
- A comparação tolera formatação SQL e remove somente `default` de parâmetros.
- Ocorrências em `regprocedure`, `pg_get_functiondef` e SQL dinâmico não são
  tratadas como prova de origem.
- Regressões determinísticas cobrem `EXECUTE` com string contendo `CREATE
  FUNCTION`, variável dollar-quoted contendo a declaração, declaração estática
  de tabela, `create or replace`, formatação e `default`.
- O gate continua bloqueando as migrations `20260822220000` e
  `20260823100000`, pois seus blocos `DO` dependem de `EXECUTE` sobre definições
  obtidas do catálogo.
- F-PROV-003 resolvido: `maskSqlLiterals` agora percorre comentários `/* ... */`
  com profundidade, em vez de usar somente o primeiro `*/`. Comentário não
  fechado continua sem prova, e a regressão cobre comentário aninhado fechado
  e não fechado.
- F-PROV-004 resolvido: strings PostgreSQL com prefixo `E/e` agora consomem
  sequências completas de barras invertidas antes de procurar a aspa de
  fechamento. A leitura é deliberadamente conservadora para que combinações
  ambíguas de múltiplas barras e aspas não exponham `CREATE FUNCTION` interno
  à prova estrutural. A regressão cobre duas e quatro barras consecutivas.
- Cinco objetos originalmente sem origem passaram a `VERIFIED_ORIGIN` por
  declaração estática determinística; quatro permanecem bloqueados, incluindo
  `rpc_analytics_customer_success_kpis_v2`, corrigido de um falso positivo.
- Relatório produzido em
  `docs/reports/LOCAL_MIGRATION_PROVENANCE_STATIC_AUDIT_2026-08-24.md`.

## Evidência de entrada

- A task 60 registrou duas migrations aplicadas localmente sem prova de
  preflight compatível.
- A task 61 já distinguiu duas exceções históricas sem preflight comprovado e
  oito objetos executáveis sem origem.
- OD-017 aceita a exceção histórica somente no banco local e não autoriza nova
  escrita, repair, reset, rollback ou migration.

## Gates esperados

- `node --test tests/scripts/local-schema-parity.test.mjs`
- `npm run test:focused`
- `npm run docs:validate`
- `npm run review:gates`
- `git diff --check`

## Evidência executada

- F-PROV-002 resolvido: `node --test tests/scripts/local-schema-parity.test.mjs`:
  **15/15 PASS** após as regressões de F-PROV-003 e F-PROV-004.
- `npm run local:qa:schema-parity`: **exit 1 esperado/fail-closed**, com
  298/298 versões, duas exceções históricas sem prova de preflight e quatro
  objetos sem origem após a auditoria. A consulta foi somente leitura.
- Nenhum comando de escrita no banco ou de migration foi executado.
- Nenhum SQL manual, reset, rollback, repair, secret, chamada externa, push,
  merge, deploy ou release foi executado.

## Gates finais

- Reexecução final após F-PROV-004 em `2026-08-24T14:33:29-03:00`.
- `npm run test:focused`: **306/306 PASS**.
- `npm run docs:validate`: **PASS**, 0 bloqueios e 9 alertas históricos.
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `git diff --check`: **PASS**.

## Retorno aos findings do Sentinel

- F-PROV-001: corrigido com mascaramento lexical conservador antes da busca
  estrutural. SQL dinâmico e corpos dollar-quoted ficam fora da superfície
  analisável; na dúvida ou com literal não fechado, o parser retorna sem prova.
- F-PROV-002: contagem corrigida para o resultado reproduzível de
  **15/15 PASS** após a regressão de F-PROV-004 incorporada ao teste de
  comentários aninhados.
- F-PROV-003: resolvido com mascaramento por profundidade de comentários de
  bloco PostgreSQL. A declaração falsa dentro de comentário aninhado e o
  comentário não fechado retornam `false`; controles positivos e SQL dinâmico
  continuam preservados.
- F-PROV-004: resolvido com consumo seguro de sequências de barras em strings
  `E/e'...'`. A sonda com duas e quatro barras antes de aspas e `CREATE
  FUNCTION` interno retorna `false`; o gate continua fail-closed.

O lote está sendo devolvido como `READY_FOR_REVIEW` para nova revisão
independente do Sentinel.
