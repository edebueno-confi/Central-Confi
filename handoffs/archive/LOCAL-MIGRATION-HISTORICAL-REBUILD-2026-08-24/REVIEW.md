# REVIEW

- State: APPROVED
- Reviewer active: Sentinel
- Current task: LOCAL-MIGRATION-HISTORICAL-REBUILD-2026-08-24
- Review mode: SENTINEL_REQUIRED
- Veredito da task corrente: APPROVED por Sentinel; F-REBUILD-001 resolvido.
- Veredito do lote anterior: APPROVED, arquivado em
  `handoffs/archive/LOCAL-MIGRATION-PREFLIGHT-RECONCILIATION-2026-08-24/`.

O veredito anterior foi preservado; nenhum finding foi removido ou suavizado.

## Revisão independente — LOCAL-MIGRATION-HISTORICAL-REBUILD-2026-08-24

**Veredito: CHANGES_REQUESTED**

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `6e4ed7ff7b23b62c75a6aecae0ab4337808a089d`
- Estado revisado: `READY_FOR_REVIEW`
- Próximo responsável: Forge

### F-REBUILD-001 — HIGH — `local:qa:verify` não reproduz o resultado declarado

O handoff e o relatório declaram `local:qa:verify PASS`, com 3 tenants e 18
tickets. A execução independente no estado atual falhou duas vezes com:

```text
LOCAL_QA_VERIFY_FAILED: {"deals":3,"hubspot_tickets":3,"receivables":6,
"roles":4,"schedules_off":1,"tenants":0,"tickets":0,"users":5}
```

Isso comprova que o container canônico está acessível e que parte das fixtures
permanece presente, mas os tenants e tickets operacionais exigidos pelo gate
não estão disponíveis no estado atual. Portanto, o critério de validação de
fixtures, fluxo operacional e isolamento não está satisfeito, mesmo com
`local:qa:schema-parity` retornando 299/299 e proof válido.

Correção esperada: diagnosticar e, somente dentro da autorização local já
registrada, reaplicar as fixtures necessárias no container canônico, executar
novamente `npm run local:qa:verify` até obter as contagens esperadas, revalidar
isolamento e atualizar o relatório/handoff. Não mascarar a falha com alteração
do teste, redução das contagens ou classificação documental.

### Evidências independentes

- `node --test tests/scripts/local-schema-parity.test.mjs`: **17/17 PASS**.
- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: **17/17 PASS**.
- `npm run local:qa:schema-parity`: **PASS**, proof válido, 299/299, sem
  ausentes/extras e sem findings.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: **NO_GO**,
  `historical_no_go` e `failClosed=true`.
- `npm run local:qa:verify`: **FAIL**, reproduzido duas vezes; tenants/tickets
  observados em 0/0 contra 3/18 esperados.
- `git diff --check`: **PASS**.

### Limites e segurança

Não executei reset, hydrate, SQL manual, migration, repair, rollback ou
qualquer escrita no banco durante a revisão. O proof e os hashes do backup
foram preservados como evidência histórica, mas não substituem a validação
funcional falha no estado atual. O replay shadow e o `historical_no_go`
permanecem separados e não autorizam qualquer ação remota ou promoção.

## Re-review independente — 2026-08-24

**Veredito: APPROVED, limitado ao rebuild local autorizado**

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `6e4ed7ff7b23b62c75a6aecae0ab4337808a089d`
- Estado revisado: `READY_FOR_REVIEW`
- F-REBUILD-001: **RESOLVIDO**. As fixtures foram reaplicadas somente no
  container canônico local, sem novo reset ou migration.

### Evidências independentes

- `npm run local:qa:verify`: **PASS**, reproduzido após a correção com
  `users=5`, `tenants=3`, `tickets=18`, `deals=3`, `hubspot_tickets=3`,
  `receivables=6`, `schedules_off=1`, `roles=4`.
- Isolamento: `client_membership=1`, `client_other_memberships=0` e
  `fake_omie_rows=0`.
- `npm run local:qa:schema-parity`: **PASS**, proof válido, 299/299,
  ausentes 0, extras 0 e findings 0.
- Testes específicos: schema parity **17/17 PASS** e semantic preflight
  **17/17 PASS**.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: **NO_GO**,
  `historical_no_go` e `failClosed=true`, preservando a trava histórica.
- `git diff --check`: **PASS**.

### Limite do veredito

Este APPROVED autoriza somente a finalização local seletiva do rebuild,
fixtures, scripts, migration candidata, testes, relatório e handoffs, após
conferência de allowlist e diff. Não autoriza migration histórica ou remota,
SQL manual, reset adicional, repair, rebuild adicional, secrets, push, merge,
deploy ou release. `historical_no_go`, `globalState=NO_GO` e
`OWNER_DECISION_REQUIRED` permanecem vigentes para qualquer promoção.

Próximo responsável: Forge para `FINALIZE_LOCAL` seletivo.
