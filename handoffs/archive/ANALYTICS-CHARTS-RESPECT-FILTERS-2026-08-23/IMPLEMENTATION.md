# IMPLEMENTATION
- Task: ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23
- State: APPROVED
- Base SHA: 313cc15bdb5d32362cca4f26cbff26a091b76496
- Implementation SHA: UNCOMMITTED_WORKTREE

A exclusão de pipelines foi propagada do Comercial/CS ao gráfico e ao RPC, com predicado server-side para deals/tickets e overload de seis argumentos preservando o wrapper histórico de cinco. Teste focused 10/10, mutação 2/2, typecheck PASS, lint PASS com 158 warnings legados, focused 304/304, build 945 módulos, docs:validate PASS e diff-check PASS. Migration remota não aplicada; QA autenticado desta task e agregadores DB locais históricos permanecem limitações.
