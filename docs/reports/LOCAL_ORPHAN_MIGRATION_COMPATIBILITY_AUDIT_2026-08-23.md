# Auditoria de compatibilidade da migration órfã

**Task:** `LOCAL-ORPHAN-MIGRATION-COMPATIBILITY-AUDIT-2026-08-23`
**Base SHA:** `2983768b099a74bd9b745652adb79a4491bf11ec`
**Observação principal:** `2026-08-23T15:29:15.4477746-03:00`
**Escopo:** auditoria local read-only do blob Git inacessível, sem restore,
repair, SQL de escrita, migration, alteração de banco, secrets ou ação externa.

## Resultado executivo

**Compatibilidade parcial; NO-GO para restore ou repair. OWNER_DECISION_REQUIRED.**

O blob contém uma migration determinística, mas está em objeto Git inacessível e
não é uma fonte versionada alcançável. A leitura confirmou que os objetos-alvo
existem no schema local e que as dependências principais estão presentes. Porém,
há divergências relevantes entre o contrato de segurança do blob e o catálogo
local:

- o blob prescreve `search_path = ''` para a RPC; o local registra
  `search_path=public, pg_temp`;
- o blob revoga acesso de `anon` à view e à RPC; o local mantém `SELECT` na view
  e `EXECUTE` na RPC para `anon`;
- `security definer`, assinatura, retorno e `security_barrier` foram observados
  como compatíveis;
- o `notify pgrst, 'reload schema'` existe no conteúdo do blob, mas sua
  execução e efeito no schema cache local não são comprovados.

Não foi feita correção desses desvios. O conteúdo não foi restaurado ao
checkout, não foi executado e não autoriza `migration repair`.

## Proveniência e conteúdo auditado

- tree: `2bcf8c993849b1b8b6163c7e630cbdad53a3263c`;
- blob: `6887a1b623d05b2fd0bb11cb0095f0e56161c236`;
- arquivo lógico: `20260822130000_release_contract_drift_reconciliation_v1.sql`;
- view: `public.vw_admin_tenant_group_context`;
- RPC: `public.rpc_analytics_customer_success_kpis_by_operation(text)`;
- conteúdo lido exclusivamente com `git cat-file`.

Classificação de origem: conteúdo determinístico em objeto Git inacessível, sem
fonte versionada alcançável. Proveniência, causalidade com a linha registrada no
banco, autorização para restore/repair e compatibilidade de aplicação não estão
comprovadas.

## Matriz de compatibilidade

| Item | Blob | Schema local observado | Classificação | Risco/limitação |
| --- | --- | --- | --- | --- |
| View `vw_admin_tenant_group_context` | Cria view com `security_barrier=true` e predicado de actor platform admin | View existe; `security_barrier=true`; definição contém actor ativo, grupos ativos e rank 1 | Equivalência estrutural observada | Hash/causalidade de aplicação não comprovados |
| RPC `rpc_analytics_customer_success_kpis_by_operation(text)` | `returns jsonb`, `stable`, `security definer`, `search_path=''`, guard `can_read_analytics`, escopo e cobertura ticket-empresa | Assinatura, retorno, estabilidade, security definer e cláusulas centrais observadas; `search_path=public, pg_temp` | Equivalência parcial | `search_path` divergente altera a superfície de segurança |
| Grants da view | Revoga `public, anon, authenticated, service_role`; concede `authenticated, service_role` | `anon`, `authenticated` e `service_role` possuem SELECT | Divergência | Acesso anônimo local mais amplo que o contrato do blob |
| Grants da RPC | Revoga `public, anon`; concede `authenticated, service_role` | `anon`, `authenticated` e `service_role` possuem EXECUTE | Divergência | Execução anônima local mais ampla que o contrato do blob |
| Reload PostgREST | `notify pgrst, 'reload schema'` | Texto presente no blob; efeito de execução/cache não observado | Não comprovado | Não executar notify manual nesta task |
| Dependências da view | `profiles`, `customer_account_group_members`, `customer_account_groups`, `has_global_role` | Relações e função de contexto presentes; view local lista as mesmas relações centrais | Compatível no catálogo observado | Não prova definição idêntica ou comportamento autenticado |
| Dependências da RPC | `analytics_source_config`, `hubspot_tickets`, `analytics_hubspot_associations`, `vw_analytics_customer_financial_link`, `can_read_analytics`, `set_analytics_operation_scope`, `analytics_pipeline_operation_eligible` | Todos os objetos foram encontrados por catálogo; definição local contém as cláusulas de escopo/cobertura | Compatível no catálogo e parcial na definição | Não prova grants efetivos, RLS ponta a ponta ou execução funcional |

## Evidência read-only

Comandos utilizados, sem valores sensíveis:

- `git cat-file -t`, `git ls-tree` e `git cat-file -p` para tree/blob;
- `docker ps --format` para confirmar containers locais;
- `psql` read-only via container local para `pg_views`, `pg_proc`, `pg_class`,
  `pg_get_viewdef`, `pg_get_functiondef`, `to_regclass`, `to_regprocedure`,
  `has_table_privilege` e `has_function_privilege`;
- observação principal em `2026-08-23T15:29:15.4477746-03:00`.

Resultados sanitizados:

- view presente: `true`;
- RPC presente: `rpc_analytics_customer_success_kpis_by_operation(text)`;
- view: `security_barrier=true`;
- RPC: `security definer=true`, `returns=jsonb`, `volatility=stable`;
- privilégios locais: `anon=true`, `authenticated=true`,
  `service_role=true` para view SELECT e RPC EXECUTE;
- dependências catalogadas: presentes para relações, view e funções listadas.

## Gates finais

Executados em `2026-08-23T15:32:15.1862739-03:00` a
`2026-08-23T15:32:15.1862826-03:00`:

- `node --test tests/scripts/local-schema-parity.test.mjs`: **PASS 9/9**;
- `npm run local:qa:schema-parity`: **exit 1 esperado/fail-closed**, com 297
  arquivos contra 294 migrations aplicadas, quatro ausentes, a versão
  histórica `20260822130000` sem arquivo e bloqueios por `DO` com SQL dinâmico;
- `npm run docs:validate`: **PASS**, 0 bloqueios;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: **PASS**.

O gate de paridade falhou de forma acionável e não executou SQL. A falha
histórica e os bloqueios de aplicação permanecem separados dos gates
documentais aprovados. Não houve stage, pois este lote aguarda revisão
independente.

## Riscos e decisão pendente

1. **HIGH:** o catálogo local permite acesso anônimo que o blob explicitamente
   revoga. Não alterar neste lote.
2. **HIGH:** `search_path` local diverge do contrato do blob em função
   `security definer`. Não alterar neste lote.
3. **MEDIUM:** existência e definição estrutural não comprovam que o blob foi a
   origem aplicada no banco.
4. **MEDIUM:** reload de schema cache não foi executado nem comprovado.

`OWNER_DECISION_REQUIRED`: o proprietário deve decidir se o blob inacessível é
uma fonte autorizada e qual contrato de segurança deve prevalecer antes de
qualquer restore, repair ou migration. Até essa decisão, o NO-GO permanece e o
restante da análise não bloqueia a fila de forma permanente, apenas impede
qualquer escrita ou reconciliação deste objeto.

## Limitações

Não houve restore, repair, reset, SQL de escrita, migration local/remota,
alteração de grants/RLS, execução da RPC, QA autenticado, chamada HubSpot/OMIE,
produção, push, merge ou deploy. O resultado é uma auditoria de catálogo e
definições locais, não uma prova de paridade funcional ou de segurança em
produção.
