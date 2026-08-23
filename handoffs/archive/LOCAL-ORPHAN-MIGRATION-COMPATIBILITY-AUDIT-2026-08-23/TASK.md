# TASK

- Task: LOCAL-ORPHAN-MIGRATION-COMPATIBILITY-AUDIT-2026-08-23
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Approval: APPROVED para auditoria read-only local
- Base SHA: 2983768b099a74bd9b745652adb79a4491bf11ec
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Auditar a compatibilidade do conteúdo do blob Git inacessível
`6887a1b623d05b2fd0bb11cb0095f0e56161c236`, no tree
`2bcf8c993849b1b8b6163c7e630cbdad53a3263c`, com o schema e catálogo local
atuais.

## Escopo e allowlist

- leitura read-only via `git cat-file`;
- inspeção local read-only do schema, catálogo, grants, dependências e reload;
- `docs/reports/LOCAL_ORPHAN_MIGRATION_COMPATIBILITY_AUDIT_2026-08-23.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`.

## Fora de escopo

Não restaurar o blob, não criar arquivo versionado, não fazer repair, reset,
SQL manual de escrita, migration, alteração de banco, secrets, HubSpot/OMIE,
produção, push, merge ou deploy.

## Critérios

Classificar equivalência, divergência, dependências, riscos e necessidade de
OWNER_DECISION_REQUIRED. Manter NO-GO se a evidência não autorizar repair e
entregar READY_FOR_REVIEW ao Sentinel sem autodeclarar aprovação.
