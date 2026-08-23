# TASK

- Task: LOCAL-PARITY-MIGRATION-BASELINE-2026-08-23
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Approval: APPROVED pela fila; não equivale à aprovação do lote
- Base SHA: 22a60a0ed73dbdd8e865ff1c39ed39def3fe6003
- Implementation: UNCOMMITTED_WORKTREE

## Escopo e allowlist efetiva

Auditoria local read-only de migrations, schema/RPCs, grants/search_path,
scheduler, REST/Auth/Edge Runtime, funções de integração, dados e limitações
de replay.

Arquivos do lote:

- docs/reports/LOCAL_ANALYTICS_PARITY_BASELINE_2026-08-23.md
- handoffs/current/TASK.md
- handoffs/current/IMPLEMENTATION.md
- handoffs/current/STATUS.md

handoffs/current/REVIEW.md é preservado pelo reviewer e não deve ser alterado
pelo executor.

Os seguintes arquivos foram alterados antes do início deste lote por Codex e
são preexistentes: docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md,
docs/README.md, docs/PROJECT_STATE.md e handoffs/README.md. Eles permanecem
fora da allowlist e não podem entrar em commit deste lote.

## Restrições

Não aplicar migration local/remota, não alterar banco, fixtures, código,
configuração executável, secrets ou integrações. Não executar sync, chamadas
HubSpot/OMIE, produção, push, merge ou deploy.

## Entrega

O relatório contém matriz de migrations/RPCs/grants/search_path, timestamps de
observação, fatos, hipóteses, lacunas, riscos e critérios de prova. Gates
documentais devem ser repetidos antes do re-review.
