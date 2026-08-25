# TASK

- Task: ANALYTICS-DASHBOARD-RUNTIME-MATRIX-GATE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 512e11d31c47437040e25b86abb1d9f968b773ae
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Provar em runtime local, de forma read-only, a cadeia de autorização e leitura
do Dashboard: usuário autorizado, usuário sem acesso, `dashboard_viewer`,
rotas, abas, filtros, parâmetros, loading, stale, erro e ausência de dados.

## Escopo allowlisted

- `scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`
- `tests/scripts/analytics-dashboard-runtime-matrix.test.mjs`
- `docs/reports/ANALYTICS_DASHBOARD_RUNTIME_MATRIX_GATE_2026-08-24.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`

## Critérios de aceite

1. Matriz cobre autorizado, não autorizado, `dashboard_viewer`, sessão stale,
   Visão Geral, Comercial, Customer Success, Suporte e Financeiro.
2. Matriz cobre Todas, operações publicadas, período, estágio/status,
   responsável, pipeline e troca rápida de filtros.
3. Parâmetros observados, respostas 4xx/5xx, console, loading e stale são
   registrados sem expor token, cookie ou segredo; loading/stale exigem
   transição observável antes de qualquer GO.
4. Falhas de contrato permanecem NO_GO, sem fallback que invente dados.
5. O gate é read-only: não faz login por senha, SQL, migration, reset, seed,
   escrita em banco, integração externa, push, merge ou deploy.

## Fora de escopo

Correção remota, alteração de migration/RPC/RLS, secrets, produção e release.
