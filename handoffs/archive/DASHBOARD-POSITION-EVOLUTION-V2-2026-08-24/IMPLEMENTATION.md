# IMPLEMENTATION

- Task: DASHBOARD-POSITION-EVOLUTION-V2-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Base SHA: 84fd21729a69d327c18e3520cbfb1fbe3173620b
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE
- Allowlist: `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`,
  `apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx`,
  `tests/scripts/dashboard-position-evolution-v2.test.mjs` e os três handoffs
  correntes de execução. `REVIEW.md` é preservado pelo reviewer.
- Auditoria inicial: Comercial, Suporte e Financeiro já têm as sub-abas e usam
  `rpc_analytics_timeseries_by_operation`/`rpc_analytics_timeseries` conforme
  os contratos existentes. Customer Success publica snapshot atual via
  `rpc_analytics_customer_success_kpis_v2` e não possui RPC de série temporal
  publicado; sua Evolução será estado explícito indisponível, sem endpoint ou
  zero sintético.
- Decisões de implementação: a comparação comercial existente será exibida na
  aba Evolução, junto da série temporal; Customer Success terá Posição e uma
  Evolução honesta sem série contratada. Filtros e fontes backend não serão
  alterados.
- Alterações realizadas: Comercial moveu a comparação de períodos para
  Evolução; Customer Success passou a reutilizar `AnalyticsDomainTabs` com
  Posição e Evolução. A Evolução de Customer Success permanece indisponível por
  ausência de RPC/read model temporal publicado, sem série sintética.
- Suporte e Financeiro: auditados sem alteração. Suporte mantém série com
  filtro de operação e exclusão server-side; Financeiro mantém série
  consolidada, sem dimensão operacional inventada.
- Evidência de teste: `node --test
  tests/scripts/dashboard-position-evolution-v2.test.mjs` PASS 5/5;
  `npm run test:focused` PASS 306/306 em 48 arquivos.
- Gates finais: `npm run web:typecheck` PASS; `npm run web:build` PASS com 944
  módulos; `npm run lint` PASS com 0 erros e 158 warnings legados;
  `npm run docs:validate` PASS com 0 bloqueios; `npm run review:gates` PASS
  com 0 regressões bloqueantes; `git diff --check` PASS.
- Implementation SHA: UNCOMMITTED_WORKTREE. Não houve commit, push, merge,
  deploy, banco, migration, integração externa ou publicação.
- Limitações: não houve QA visual autenticado, validação em produção, RLS
  servido, integração HubSpot/OMIE ou medição de performance real. O estado
  indisponível de Customer Success é uma limitação contratual observada, não
  uma falha mascarada.
- Limitações iniciais: QA visual autenticado, produção, RLS servido,
  integrações externas e performance real não estão comprovados.
- Restrições: não alterar banco, migrations, RPCs, views, RLS, grants,
  contratos, secrets ou integrações externas.
