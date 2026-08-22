# IMPLEMENTATION

- Task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e
- Implementation: UNCOMMITTED_WORKTREE
- State: APPROVED

## Resultado

`AnalyticsCeoPage` passou a desviar antes de `getCeoSnapshot` quando há
operação selecionada. O recorte usa os read models operacionais de Comercial,
Customer Success e Suporte. O snapshot direto em operação usa estado
indisponível honesto e Financeiro continua fora dessa dimensão.

O modelo analítico repara mojibake conhecido na fronteira de leitura. A
migration `20260822220000_analytics_utf8_and_scope_guard_v1.sql` atualiza os
fallbacks conhecidos de `rpc_analytics_ceo_snapshot_legacy`,
`rpc_analytics_customer_success_kpis_v2` e `rpc_analytics_support_kpis_v2`, sem
reescrever dados de origem.

## Evidências

- testes relacionados 23/23 PASS;
- `npm run test:focused` 290/290 PASS;
- `npm run web:typecheck` PASS;
- `npm run web:build` PASS, 945 módulos;
- lint PASS, 0 erros;
- docs validate PASS, 0 bloqueios;
- review gates PASS, 0 regressões bloqueantes;
- `git diff --check` PASS.

## Limitações

Migration remota, deploy e QA autenticado não faziam parte da etapa local.
Revisão registrada em `REVIEW.md` como auto-revisão autorizada do Codex, não
independente do Sentinel.
