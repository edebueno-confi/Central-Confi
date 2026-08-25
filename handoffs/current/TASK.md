# TASK

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-SHADOW-PREFLIGHT-2026-08-25`

State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: ecf919f2

## Objetivo

Validar, em um PostgreSQL descartável e namespaced, a migration de helpers
`20260825123000_analytics_kpi_remote_prerequisites_v1.sql` junto com a
migration de contrato KPI `20260824210000_analytics_kpi_contract_parity_v1.sql`.

## Escopo allowlisted

- `scripts/local-qa/analytics-kpi-remote-prerequisites-shadow-preflight.mjs`
- `tests/scripts/analytics-kpi-remote-prerequisites-shadow-preflight.test.mjs`
- `docs/reports/ANALYTICS_KPI_REMOTE_PREREQUISITES_SHADOW_PREFLIGHT_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`
- `handoffs/README.md` somente a linha 94 da fila canônica

## Fora de escopo

- banco local canônico `supabase_db_genius-support-os`;
- projeto Supabase remoto `jzmmvfcmruasqmrdmbup`;
- PostgREST remoto ou browser autenticado;
- SQL manual fora do shadow;
- reset, repair, rebuild, secrets, push, merge, deploy ou release.

## Critérios de aceite

1. O alvo é verificado como namespaced, descartável e diferente do container
   canônico antes de qualquer SQL.
2. O shadow inicia com as relações mínimas, `can_read_analytics()` seguro e
   sem os quatro helpers; as duas migrations candidatas são aplicadas somente
   no shadow.
3. O preflight comprova existência, semântica, segurança e ausência de grants
   indevidos dos helpers, além dos wrappers KPI de operação.
4. Smoke SQL read-only sob role `authenticated` comprova operação selecionada,
   exclusão de pipeline e comportamento `Todas`; o retorno do shadow sem
   PostgREST permanece documentado como não equivalente ao remoto.
5. Falha, alvo inválido ou shadow indisponível resulta em `NO_GO` e
   `failClosed=true`, com limpeza best-effort sem tocar o canônico.

O lote foi aprovado pelo Sentinel e arquivado no pacote correspondente.
