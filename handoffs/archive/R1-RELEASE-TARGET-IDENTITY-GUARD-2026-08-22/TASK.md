# TASK

- Task: R1-RELEASE-TARGET-IDENTITY-GUARD-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: e48e4d89

## Objetivo

Impedir que o workflow de release aplique migrations no projeto Supabase errado
ou prossiga com secrets incompletos, e alinhar a documentação ao estado remoto
realmente comprovado.

## Allowlist

- `.github/workflows/supabase-release.yml`
- `docs/DEPLOYMENT_STRATEGY.md`
- `handoffs/current/*`
