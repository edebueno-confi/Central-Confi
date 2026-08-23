# IMPLEMENTATION

- Task: LOCAL-ORPHAN-MIGRATION-COMPATIBILITY-AUDIT-2026-08-23
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: 2983768b099a74bd9b745652adb79a4491bf11ec
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

## Abertura

Os quatro handoffs foram criados antes da auditoria. A análise será somente
read-only e não alterará o blob, o checkout, o banco ou as migrations.

## Allowlist

Relatório `docs/reports/LOCAL_ORPHAN_MIGRATION_COMPATIBILITY_AUDIT_2026-08-23.md`
e os quatro handoffs correntes. Alterações preexistentes permanecem fora do
lote.

## Auditoria concluída

Observação local principal: `2026-08-23T15:29:15.4477746-03:00`, com
containers locais observados e consultas sem valores sensíveis. O conteúdo foi
lido somente com `git cat-file` a partir do tree inacessível
`2bcf8c993849b1b8b6163c7e630cbdad53a3263c` e blob
`6887a1b623d05b2fd0bb11cb0095f0e56161c236`.

Fatos observados no catálogo local:

- `public.vw_admin_tenant_group_context` existe e mantém
  `security_barrier=true`; a definição local contém o contexto de actor ativo,
  grupos ativos e ranking esperado.
- `public.rpc_analytics_customer_success_kpis_by_operation(text)` existe com
  assinatura, `jsonb`, volatilidade `stable`, `security definer` e cláusulas
  centrais de escopo/cobertura compatíveis com o blob.
- As dependências principais de view/RPC foram encontradas no catálogo,
  incluindo relações de perfis/grupos, view financeira, guard de analytics,
  escopo de operação e elegibilidade de pipeline.

Divergências observadas:

- O blob define `search_path = ''` na RPC; o catálogo local registra
  `public, pg_temp`.
- O blob revoga acesso de `anon` à view e à RPC; o catálogo local informa
  `anon=true` para `SELECT` na view e `EXECUTE` na RPC.
- O blob contém `notify pgrst, 'reload schema'`; a presença textual foi
  observada, mas execução e efeito no schema cache não foram comprovados.
- A presença dos objetos e a semelhança estrutural não provam que o blob foi a
  origem aplicada, nem demonstram causalidade, compatibilidade de execução ou
  autorização para repair. A dependência por `pg_depend` da função não foi
  suficiente para provar todas as referências dinâmicas; a classificação usa
  definição e catálogo, não inferência de aplicação.

## Allowlist e fora do lote

Allowlist efetiva: `docs/reports/LOCAL_ORPHAN_MIGRATION_COMPATIBILITY_AUDIT_2026-08-23.md`
e `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`.
`REVIEW.md` foi preservado para o Sentinel. Nenhum outro arquivo foi editado
por este lote; alterações preexistentes permanecem fora do stage.

## Gates e evidências

Executados em `2026-08-23T15:32:15.1862739-03:00` a
`2026-08-23T15:32:15.1862826-03:00`, com saída sanitizada:

- `node --test tests/scripts/local-schema-parity.test.mjs`: **PASS 9/9**.
- `npm run local:qa:schema-parity`: **exit 1 esperado/fail-closed**. O gate
  reproduziu 297 arquivos contra 294 migrations aplicadas, quatro migrations
  ausentes, a versão histórica sem arquivo `20260822130000`, objetos sem
  origem comprovada e bloqueio de duas migrations por `DO` com SQL dinâmico.
  Nenhum SQL foi executado.
- `npm run docs:validate`: **PASS**, 0 bloqueios; alertas documentais do
  baseline foram mantidos.
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens de
  baseline resolvidos.
- `git diff --check`: **PASS**.

O estágio não foi criado, pois o lote ainda aguarda revisão independente. A
lista final esperada para eventual stage é somente a allowlist acima.

## Decisão e limitações

`OWNER_DECISION_REQUIRED`: o proprietário precisa decidir se o blob
inacessível é fonte autorizada e qual contrato de segurança deve prevalecer
antes de qualquer restore, repair ou migration. O NO-GO permanece. Não houve
restore, repair, reset, SQL de escrita, migration local/remota, alteração de
grants/RLS, execução da RPC, QA autenticado, chamada HubSpot/OMIE, produção,
push, merge ou deploy.
