# IMPLEMENTATION

- Task: LOCAL-SYNC-REPLAY-FOUNDATION-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: da271d9e5579d8687edfb692a4d6e90e5d457062
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE
- Allowlist: fixtures/replay em `supabase/qa` ou `scripts/local-qa`, testes em
  `tests/scripts`, script npm se necessário, relatório e quatro handoffs

## Contexto

O preflight local foi finalizado com o gate fail-closed. A próxima lacuna é
permitir replay local reproduzível para validar filtros e integrações sem
chamadas externas. Esta task não altera migrations nem contratos.

## Execução

Execução concluída dentro da allowlist: fixtures namespaced, replay local,
testes e documentação. Nenhuma chamada externa, secret, migration, reset,
rollback ou SQL destrutivo foi executado.

## Resposta ao finding F-SYNC-001

`runSqlBatch` agora usa exclusivamente o container local canônico
`supabase_db_genius-support-os`. O valor opcional de `LOCAL_QA_DB_CONTAINER`
é validado antes do `docker exec`; ausente ou igual ao identificador canônico
é aceito, e qualquer override divergente lança
`LOCAL_QA_DB_CONTAINER_INVALID`. Assim, a variável não pode redirecionar a
escrita para outro container local.

Foi adicionada regressão determinística para o valor ausente, o valor
canônico e um container divergente. Conforme solicitado pelo reviewer, nenhum
replay foi executado novamente após essa correção, pois o replay escreve no
banco local.

## Evidências

- Usuários QA locais já existentes foram lidos por contrato em `profiles` e
  `auth.users`; nenhum usuário, senha, role global ou credencial foi criado.
- O replay foi executado duas vezes contra `127.0.0.1:54321`, com o banco local
  em `127.0.0.1:54322`. A cardinalidade final foi 2 tenants, 3 memberships,
  2 empresas, 1 deal, 1 ticket e 1 payload OMIE.
- `qa-local-commercial` e `qa-local-cs` foram confirmados inativos. Os
  wrappers server-side reportaram ambos como inelegíveis e não exibiram os
  payloads namespaced nos snapshots por operação.
- O replay usa somente `INSERT ... ON CONFLICT DO UPDATE`, sem `DELETE`,
  `TRUNCATE`, `DROP`, migration ou promoção de snapshot.
- O payload OMIE usa `local-sync-replay-20260824-omie`, não
  `omie_receivables_api`, preservando o snapshot operacional existente.

## Evidência histórica anterior ao finding

- `node --test tests/scripts/local-sync-replay.test.mjs`: PASS 5/5, incluindo a
  rejeição de override divergente.
- `npm run local:qa:sync-replay`: PASS em duas execuções consecutivas.
- `npm run test:focused`: PASS 306/306.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens baseline
  resolvidos.
- `git diff --check`: PASS.

## Gates finais após a correção

Reexecutados após a correção, sem novo replay:

- `node --test tests/scripts/local-sync-replay.test.mjs`: PASS 5/5.
- `npm run test:focused`: PASS 306/306.
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas documentais.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos.
- `git diff --check`: PASS.

## Limitações e transferência

O lote não comprova integração externa HubSpot/OMIE, scheduler, produção,
performance, browser autenticado, RLS/cross-tenant servido ou promoção de
snapshot. Os pipelines da fixture permanecem inativos por segurança, então o
teste comprova exclusão server-side de uma fonte local não publicada, não uma
operação publicada de teste. O REVIEW.md foi preservado sem edição pelo
executor.

Transferência formal: Sentinel deve revisar independentemente este lote e
confirmar a correção do controle de alvo, a allowlist, a idempotência e as
limitações antes de qualquer finalização local.
