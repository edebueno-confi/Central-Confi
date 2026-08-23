# TASK

- Task: LOCAL-SCHEMA-DRIFT-RECONCILIATION-2026-08-23
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Approval: APPROVED somente para FINALIZE_LOCAL seletivo
- Base SHA: 9f3b7b43eef8ea00138d6a9220febd7ba6c6c261

## Objetivo

Criar uma verificação reproduzível para impedir validação ou publicação contra
um Supabase local incompatível, sem resetar ou reparar o histórico nesta task.

## Allowlist efetiva

- `scripts/local-qa/assert-local-schema-parity.mjs`
- `tests/scripts/local-schema-parity.test.mjs`
- `package.json`, somente o script `local:qa:schema-parity`
- `docs/reports/LOCAL_SCHEMA_DRIFT_RECONCILIATION_2026-08-23.md`
- os quatro handoffs arquivados desta task

`docs/README.md`, `docs/PROJECT_STATE.md`, `handoffs/README.md`, o plano local
e alterações não separáveis de outras frentes ficaram fora do stage e do
commit.

## Resultado e limites

O gate deve falhar de forma acionável para migrations ausentes do histórico,
histórico órfão, assinatura divergente, origem não comprovada e preflight
destrutivo. Não autoriza repair, migration local/remota, sync, alteração de
banco, secrets, produção, push, merge, deploy ou publicação.
