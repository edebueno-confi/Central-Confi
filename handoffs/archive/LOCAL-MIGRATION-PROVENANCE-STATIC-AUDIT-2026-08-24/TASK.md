# TASK

- Task ID: LOCAL-MIGRATION-PROVENANCE-STATIC-AUDIT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 27ca9d8636c9a93ba50b9714291eb1910d3207f6
- Approval: APPROVED por delegação operacional explícita do proprietário nesta conversa.

## Objetivo

Resolver a pendência técnica da task `LOCAL-MIGRATION-HISTORY-REPAIR-2026-08-23`
por evidência read-only, sem tentar criar prova retroativa por meio de repair ou
nova escrita no banco local.

## Escopo permitido

- Auditar as migrations `20260822220000` e `20260823100000`, classificadas como
  `MIGRATION_PREFLIGHT_BLOCKED`.
- Auditar os oito objetos classificados como
  `EXECUTABLE_OBJECT_WITHOUT_ORIGIN`.
- Melhorar, somente se necessário e de forma conservadora, o parser em
  `scripts/local-qa/assert-local-schema-parity.mjs`.
- Adicionar regressões determinísticas em
  `tests/scripts/local-schema-parity.test.mjs`.
- Produzir o relatório
  `docs/reports/LOCAL_MIGRATION_PROVENANCE_STATIC_AUDIT_2026-08-24.md`.
- Atualizar somente os handoffs correntes e os artefatos permitidos acima.

## Critérios de aceitação

1. O inventário distingue origem comprovada, objeto executável sem origem e
   migration histórica aplicada sem prova de preflight.
2. Qualquer classificação de segurança dinâmica exige evidência estática
   determinística; na dúvida, o gate permanece bloqueado.
3. Os dois bloqueios históricos e os oito objetos são explicados por arquivo,
   objeto, evidência e limitação, sem inventar origem.
4. Os testes cobrem os casos aprovados e os contraexemplos que devem continuar
   bloqueados.
5. O relatório registra que não houve escrita no banco, SQL manual, reset,
   rollback, repair, migration, chamada externa, secrets ou release.
6. O lote é entregue a `READY_FOR_REVIEW` para revisão independente do
   Sentinel. Não finalizar sem veredito formal.

## Fora do escopo

- Qualquer escrita no Supabase local ou remoto.
- SQL manual, `migration repair`, `migration up`, reset, rollback ou reapply.
- Alterações de migration, schema, RLS, RPC, grants, secrets ou integrações.
- Push, merge, deploy, produção ou release surface.
