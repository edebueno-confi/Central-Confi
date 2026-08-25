# REVIEW

- Task: ANALYTICS-KPI-CONTRACT-LOCAL-APPLICATION-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 815e6a4f0bde49b84041dc370f543b6c00b08db2
- Estado revisado: READY_FOR_REVIEW
- Implementation SHA: UNCOMMITTED_WORKTREE
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Escopo e decisão

A aplicação foi revisada como operação exclusivamente local, no container
Supabase canônico, usando a migration candidata
`20260824210000_analytics_kpi_contract_parity_v1.sql`. A migration cria os
overloads de seis argumentos de Comercial e Suporte, preserva o contrato
legado de quatro/cinco argumentos conforme os testes, mantém
`SECURITY DEFINER`, `search_path=''`, elegibilidade server-side e grants
restritos a `authenticated`/`service_role`.

`APPROVED`, limitado à aplicação e validação local do contrato. Esta decisão
não aprova aplicação remota, produção, correção do histórico, migration,
deploy, push, merge, secrets ou qualquer ação externa.

## Evidências independentes

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs tests/scripts/analytics-kpi-legacy-contract-compatibility.test.mjs`:
  14/14 PASS;
- `npm run local:qa:verify`: PASS, com users=5, tenants=3, tickets=18,
  deals=3, receivables=6, schedules_off=1 e isolamento
  client_membership=1/client_other_memberships=0/fake_omie_rows=0;
- `npm exec -- supabase migration list --local`: migration candidata presente
  no histórico local; o relatório registra 300/300 e catálogo das assinaturas
  de seis argumentos;
- `npm run local:qa:schema-parity`: exit 1 esperado/fail-closed, 300/300,
  sem migration ausente, preservando duas exceções históricas sem preflight e
  objetos sem origem já documentados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

## Limitações preservadas

A matriz autenticada comprovou `authorized` e `dashboard_viewer` em 5/5 abas,
sem 404, erros de console/page ou request failures. `stale_session` continua
sem storage state, portanto o resultado global permanece `NO_GO`/`failClosed=true`.
RLS/cross-tenant servido, paridade numérica completa, performance real e
produção/remoto continuam não comprovados. O `NO_GO` do schema parity histórico
permanece bloqueante e não foi mascarado.

## Veredito final

`APPROVED`, com Owner devolvido ao Forge para eventual `FINALIZE_LOCAL`
seletivo. O ganho para o SaaS é remover o 404 local das consultas de KPIs de
Comercial/Suporte sem inventar aprovação de produção ou de segurança de dados.
