# REVIEW

- Task: ANALYTICS-DASHBOARD-ACCESS-GATE-2026-08-24
- State: APPROVED
- Reviewer: Sentinel (Codex Independent Reviewer)
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 50d4040b
- Reviewed state: READY_FOR_REVIEW
- Implementation SHA: UNCOMMITTED_WORKTREE
- Veredito: APPROVED, limitado à coerência local entre menu, release surface e
  guard para `dashboard_viewer`.

## Funcionalidade implementada ou melhorada

O menu do primeiro release passou a publicar `/inicio` e `/admin/analytics` para
`dashboard_viewer` mesmo quando o `screen_key` ainda não foi materializado. O
guard já autorizava o mesmo papel para o Dashboard; a correção elimina a
divergência sem criar capability, contrato, grant, rota ou motor de autorização.

Ganho para o SaaS: usuários autorizados conseguem alcançar a funcionalidade
gerencial pelo produto, enquanto superfícies administrativas, conhecimento e
Central de Clientes continuam fora do menu e negadas pelo guard.

## Evidências da revisão

- `minimal-navigation.ts` aplica a exceção somente ao screen key `analytics`,
  depois de verificar publicação no release.
- `AdminConsoleShell.tsx` deriva `hasDashboardViewerAccess` exclusivamente do
  papel recebido pelo contexto de autenticação; não há inferência por e-mail,
  texto ou `localStorage`.
- `internal-route-access.ts` mantém `dashboard_viewer` restrito a
  `/admin/analytics` e suas subrotas publicadas.
- Usuário sem papel e sem grants continua recebendo somente `/inicio` e não
  abre o Dashboard.
- A allowlist real coincide com o handoff: um arquivo de navegação, dois testes,
  relatório e handoffs correntes. Não houve alteração em guard, router, manifest,
  backend, banco, migration, secret ou integração.

## Validações independentes

- Testes diretamente afetados: `node --test` nos dois testes allowlisted, 11/11
  PASS.
- Gates registrados no handoff: focused 323/323, web:typecheck PASS,
  web:build PASS, lint 0 erros/158 warnings legados, docs:validate PASS,
  review:gates PASS e `git diff --check` PASS.

## Limitações e decisão

QA browser autenticado, RPC servido, dados reais, RLS/cross-tenant, performance
em volume real e produção não foram comprovados. A alteração é uma correção de
coerência estática e não autoriza fixture de escrita, migration, ação remota,
secrets, push, merge ou deploy.

`APPROVED`. Forge pode executar somente `FINALIZE_LOCAL` seletivo, após conferir
novamente a allowlist e os gates finais. O ganho aprovado não representa prova de
funcionamento autenticado ponta a ponta nem promoção automática da superfície.

## Histórico preservado

- O veredito anterior permaneceu aprovado e arquivado em
  `handoffs/archive/REMOTE-SUPABASE-SECURITY-RLS-PERFORMANCE-AUDIT-2026-08-24/`.
