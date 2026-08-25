# IMPLEMENTATION

- Task: ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-2026-08-25
- Base SHA: 93d47a35
- Implementation SHA: UNCOMMITTED_WORKTREE
- Reviewer: Sentinel

## Evidência

Projeto remoto: `jzmmvfcmruasqmrdmbup` / ConfiOne / `ACTIVE_HEALTHY`.
Migration KPI candidata ausente. RPCs remotas mantinham quatro argumentos.

SELECT de catálogo confirmou `can_read_analytics()` com
`SECURITY DEFINER`, `search_path` vazio e grants esperados. As sete relações e
colunas exigidas existiam, mas quatro helpers referenciados pela migration
estavam ausentes. Resultado: `NO_GO/failClosed=true`;
`authenticated_smoke=NOT_PROVEN`; `remote_application=NOT_RUN`.

Gates: `docs:validate PASS`, `review:gates PASS`, `git diff --check PASS`.
Nenhuma escrita remota foi executada.
