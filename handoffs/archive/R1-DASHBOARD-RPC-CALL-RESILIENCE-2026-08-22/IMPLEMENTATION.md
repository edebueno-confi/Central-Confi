# IMPLEMENTATION

- Task ID: R1-DASHBOARD-RPC-CALL-RESILIENCE-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: d5744b93b0d345811ea9416e25c43358e4bac920
- Implementation SHA: UNCOMMITTED_WORKTREE

## Alteração

Em recorte por operação, a página não dispara mais o resumo executivo global,
pois os read models de Comercial, Suporte e Customer Success são carregados
separadamente. O histórico executivo só é consultado após sucesso do resumo
executivo principal. Isso reduz chamadas duplicadas e evita uma segunda falha
complementar quando a primeira leitura já está indisponível.

## Limites

Esta alteração não corrige a ausência remota de `vw_admin_tenant_group_context`
nem de `rpc_analytics_customer_success_kpis_by_operation`, e não substitui a
aplicação das migrations no projeto Supabase correto.

## Validações

- `node --test tests/scripts/analytics-dashboard-domains-integrations.test.mjs`: PASS, 7/7.
- `npm run web:typecheck`: PASS.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 baseline resolvidos.
- `git diff --check`: PASS.
- Nenhuma migration, RPC, secret, integração externa ou produção foi alterada.
