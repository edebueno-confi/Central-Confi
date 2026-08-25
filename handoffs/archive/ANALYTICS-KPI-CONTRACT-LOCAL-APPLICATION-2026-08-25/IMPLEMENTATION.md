# IMPLEMENTATION

- Task: ANALYTICS-KPI-CONTRACT-LOCAL-APPLICATION-2026-08-25
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 815e6a4f0bde49b84041dc370f543b6c00b08db2
- Implementation SHA: UNCOMMITTED_WORKTREE

## Resultado

A migration candidata foi aplicada somente no Supabase local canônico, pelo
comando oficial `npm exec -- supabase migration up --local`:

`20260824210000_analytics_kpi_contract_parity_v1.sql`

Não houve reset, rebuild, SQL manual, acesso remoto, migration remota,
secrets, push, merge ou deploy. A consulta de catálogo confirmou as duas
assinaturas de seis argumentos:

- `rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)`
- `rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)`

## Validações

- Testes de contrato de paridade e compatibilidade legada: 14/14 PASS.
- `npm run test:focused`: 356/356 PASS.
- `npm run local:qa:verify`: PASS após reaplicação da fixture oficial, com
  users=5, tenants=3, tickets=18, deals=3, hubspot_tickets=3,
  receivables=6, roles=4, schedules_off=1,
  client_membership=1, client_other_memberships=0 e fake_omie_rows=0.
- Matriz runtime autenticada local, cinco abas, personas `authorized` e
  `dashboard_viewer`: ambas alcançaram 5/5 rotas, 0 respostas 4xx/5xx,
  0 console errors, 0 page errors e 0 request failures. O gate final foi
  `NO_GO/failClosed=true` somente pela ausência de `stale_session` storage
  state; essa cobertura permanece não comprovada.
- `npm run local:qa:schema-parity`: exit 1 esperado/fail-closed. A paridade
  de histórico está em 300/300, sem migrations ausentes, mas permanecem as
  duas exceções históricas sem preflight comprovado e objetos executáveis sem
  origem já documentados. A migration nova não criou novo finding.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos.
- `git diff --check`: PASS.

## Limitações e risco residual

- O runtime local comprovou alcance funcional sem os 404 das RPCs de Comercial
  e Suporte, mas ainda não comprova RLS/cross-tenant servido, equivalência
  numérica completa, performance com volume real ou produção/remoto.
- `NO_GO` do schema parity é histórico e permanece intencionalmente
  fail-closed. Não deve ser tratado como autorização para reparar ou migrar o
  banco principal/remoto.
- A divergência inicial de `schedules_off=0` era drift da fixture local. Foi
  corrigida com `npm run local:qa:hydrate`, sem reset, e o verificador passou.
