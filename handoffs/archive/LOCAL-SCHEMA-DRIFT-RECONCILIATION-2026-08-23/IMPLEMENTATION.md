# IMPLEMENTATION

- Task: LOCAL-SCHEMA-DRIFT-RECONCILIATION-2026-08-23
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: 9f3b7b43eef8ea00138d6a9220febd7ba6c6c261
- Implementation: UNCOMMITTED_WORKTREE antes do FINALIZE_LOCAL

## Entrega

Foi criado o gate `local:qa:schema-parity`, com preflight do alvo local,
comparação de 297 arquivos de migration contra 294 versões aplicadas,
identificação da órfã `20260822130000`, quatro migrations ausentes do histórico,
assinaturas dos objetos conhecidos e evidência separada de `versionPresent` e
`originVerified`.

O preflight bloqueia corpos `DO` com SQL destrutivo ou qualquer `EXECUTE`,
inclusive concatenação dinâmica, mas preserva corpos de funções persistentes
que não rodam durante o apply. As migrations `20260822190000` e
`20260822200000` passaram; `20260822220000` e `20260823100000` foram bloqueadas
fail-closed. Nenhuma migration foi executada.

## Gates

- teste focused: 9/9 PASS;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `git diff --check`: PASS;
- `git diff --cached --check`: PASS em stage seletivo simulado;
- gate local: falha esperada e acionável, sem secrets ou dados pessoais;
- `supabase migration up --local --yes`: bloqueado antes do apply por
  `LegacyMigrationMissingLocalError`.

## Findings respondidos

- F-SCHEMA-001: gates e evidências foram atualizados com horários reais;
- F-SCHEMA-002: parser e regressões distinguem função persistente de `DO`;
- F-SCHEMA-003: presença de versão não é prova de origem;
- F-SCHEMA-004: arquivos preexistentes foram excluídos do stage.

## Restrições

Não houve reset, repair, SQL manual, migration, sync, chamada externa,
produção, alteração de secrets, push, merge, deploy ou publicação.
