# Reconciliação de Preflight de Migrations Locais — 2026-08-24

## Resultado executivo

O gate local foi ampliado para distinguir três estados que não podem ser
confundidos: preflight do parser aprovado, migration aplicada como exceção
histórica sem preflight comprovado e migration ainda bloqueada. O resultado
continua fail-closed: a exceção histórica não altera `ok=false`, não remove o
finding `MIGRATION_PREFLIGHT_BLOCKED` e não autoriza nova escrita no banco.

Os objetos executáveis também passaram a expor classificação explícita:
`VERIFIED_ORIGIN`, `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` ou
`VERSION_NOT_PRESENT`. A presença da versão no histórico continua separada da
proveniência da definição observada.

## Escopo e allowlist

- `scripts/local-qa/assert-local-schema-parity.mjs`;
- `tests/scripts/local-schema-parity.test.mjs`;
- este relatório;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`.

Não foram alteradas migrations versionadas, SQL, banco, fixtures, grants,
secrets, integrações, produção ou serviços externos. `REVIEW.md` permanece
preservado como artefato do reviewer e não recebeu veredito inventado.

## Implementação do gate

### Migrations

`HISTORICAL_EXCEPTION_MIGRATIONS` identifica somente
`20260822220000` e `20260823100000`, cuja exceção histórica local foi aceita
por OD-017. Quando a versão está aplicada e o parser bloqueia a migration, o
resultado registra:

- `safe=false`;
- `preflightProven=false`;
- `historicalException=true`;
- `classification=HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`;
- finding obrigatório `MIGRATION_PREFLIGHT_BLOCKED`.

Uma migration analisável pelo parser recebe
`classification=PREFLIGHT_PARSER_PASS`; isso descreve somente a camada de
segurança estática implementada pelo gate e não substitui validação de
dependências ou compatibilidade funcional.

### Objetos executáveis

O resultado mantém `versionPresent` e `originVerified` independentes. A
classificação pública do gate é:

- `VERIFIED_ORIGIN`: versão presente e declaração compatível encontrada na
  migration local, com base de verificação registrada;
- `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`: objeto observado sem origem verificada;
- `VERSION_NOT_PRESENT`: objeto observado sem a versão aplicada.

Oito objetos permanecem `EXECUTABLE_OBJECT_WITHOUT_ORIGIN` no ambiente local.
Isso é um bloqueio de proveniência, não uma inferência de que o objeto veio de
alguma migration.

## Evidência local read-only

Na execução do gate, o alvo foi validado como Supabase local, com API em
`127.0.0.1:54321` e banco em `127.0.0.1:54322`. O resultado observado foi:

- filesystem: `298` versões;
- histórico aplicado: `298` versões;
- migrations ausentes: nenhuma;
- migrations somente históricas: nenhuma;
- `20260822220000`: aplicada, mas
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`;
- `20260823100000`: aplicada, mas
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`;
- objetos sem origem verificada: `8`;
- saída do gate: `exit 1`, esperado e fail-closed.

Essa execução apenas leu o estado local. Não aplicou migration, não executou
SQL manual, não fez reset, rollback, repair, seed ou alteração de dados.

## Testes e gates

Resultados reais após a implementação:

- `node --test tests/scripts/local-schema-parity.test.mjs`,
  `2026-08-24T00:55:33-03:00`: **11/11 PASS**;
- `npm run test:focused`, `2026-08-24T00:55:33-03:00`: **306/306 PASS**;
- `npm run local:qa:schema-parity`, `2026-08-24T00:55:33-03:00`:
  **exit 1 esperado/fail-closed**, `298/298`, sem ausentes ou somente
  históricas, duas classificações
  `HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF` e oito objetos
  `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`;
- `npm run docs:validate`, `2026-08-24T00:55:33-03:00`: **PASS**, 0
  bloqueios e 9 alertas históricos;
- `npm run review:gates`, `2026-08-24T00:55:33-03:00`: **PASS**, 0
  regressões bloqueantes e 47 itens do baseline resolvidos;
- `git diff --check`, `2026-08-24T00:55:33-03:00`: **PASS**.

O gate de schema continuar falhando é requisito de segurança enquanto houver
preflight não comprovado ou objeto executável sem origem verificada.

## Limitações e próximos passos

- a exceção histórica aceita por OD-017 é local e não equivale a aprovação
  técnica das migrations;
- a suíte DB ampla permanece fora deste lote, pois há inconsistências de ACL,
  RLS e fixtures sem causalidade isolada;
- nenhuma conclusão sobre Supabase remoto, produção, HubSpot ou OMIE é feita;
- novo apply, reset, rollback, repair ou ajuste no banco exige autorização
  separada e não faz parte desta task.
