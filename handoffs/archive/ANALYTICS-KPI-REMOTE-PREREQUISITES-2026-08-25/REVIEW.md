# REVIEW

- Task: ANALYTICS-KPI-REMOTE-PREREQUISITES-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- State: APPROVED, limitado ao candidato local e preflight estático

F-PREREQ-001 foi resolvido alinhando `kpi_ratio` à semântica vigente.
F-PREREQ-002 foi resolvido exigindo owner postgres, `SECURITY DEFINER`,
`search_path` vazio, grants somente para `authenticated`/`service_role` e
ausência de grant para `anon`.

Próximo passo permitido: shadow/preflight descartável controlado. Não autoriza
aplicação remota, SQL manual, reset, repair, rebuild, secrets, push, merge ou
deploy.
