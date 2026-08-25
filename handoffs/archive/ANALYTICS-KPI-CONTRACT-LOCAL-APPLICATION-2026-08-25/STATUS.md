# STATUS

- Task: ANALYTICS-KPI-CONTRACT-LOCAL-APPLICATION-2026-08-25
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 815e6a4f0bde49b84041dc370f543b6c00b08db2
- Implementation SHA: UNCOMMITTED_WORKTREE

Migration candidata aplicada somente no Supabase local canônico, sem reset,
rebuild, SQL manual ou remoto. As RPCs de seis argumentos de Comercial e
Suporte existem após a aplicação; testes de contrato 14/14, focused 356/356,
`local:qa:verify` e gates documentais passaram. A matriz autenticada alcançou
5/5 abas para `authorized` e `dashboard_viewer` sem 404, erros de console,
erros de página ou falhas de rede. O gate permanece `NO_GO/failClosed=true`
pela ausência de estado `stale_session` e pelas exceções históricas do schema
parity. Ação esperada: revisão independente do Sentinel, sem finalização
automática.
