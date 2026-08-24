# Auditoria remota Supabase: segurança, RLS e performance — 2026-08-24

## Veredito executivo

O projeto remoto foi identificado corretamente e está `ACTIVE_HEALTHY`. A
auditoria não encontrou evidência de que o remoto reproduza a exceção histórica
da task 60. O histórico remoto é diferente do local e não foi alterado.

A auditoria encontrou riscos independentes que exigem backlog próprio antes de
qualquer correção: views `SECURITY DEFINER`, funções executáveis por papéis,
grants diretos amplos, políticas RLS permissivas múltiplas e otimizações de RLS.
Nenhuma dessas ocorrências foi corrigida nesta task.

## Identidade do alvo

- Projeto: `ConfiOne`.
- Project ref: `jzmmvfcmruasqmrdmbup`.
- Região: `us-east-1`.
- Status: `ACTIVE_HEALTHY`.
- PostgreSQL: `17.6.1.111`.
- Banco: `postgres`.
- Acesso utilizado: consultas e advisors somente leitura.

Não foram lidos ou persistidos tokens, cookies, JWTs, senhas ou secrets.

## Registro temporal, método e consultas

- Início da coleta documental: `2026-08-24T22:22:55.140Z` (UTC).
- Fim da janela documental registrada: `2026-08-24T22:29:32.114Z` (UTC).
  Esse fim corresponde ao fechamento da evidência no checkout, não a uma nova
  chamada remota nesta correção.
- A identidade foi conferida por `supabase_get_project(project_id)`.
- O histórico foi consultado por `supabase_list_migrations(project_id)` e por
  consultas `SELECT` em `supabase_migrations.schema_migrations`, incluindo
  contagem, maior versão e busca por padrões de nome/version.
- O catálogo foi obtido por `supabase_list_tables(project_id, schemas=["public"],
  verbose=false)`.
- Os sinais de segurança e performance foram obtidos por
  `supabase_get_advisors(project_id, type="security")` e
  `supabase_get_advisors(project_id, type="performance")`.
- A estrutura foi inventariada por `supabase_execute_sql` com consultas
  somente leitura sobre `pg_class`/`pg_namespace` (RLS e FORCE RLS),
  `pg_policies` (policies e grupos permissivos),
  `information_schema.role_table_grants` (ACLs diretas), `pg_proc`
  (owner, `prosecdef`, `proconfig` e ACL das RPCs) e
  `to_regclass('pg_stat_statements')`.
- Todas as operações foram metadados ou `SELECT`; não foram executados
  `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `GRANT`, `REVOKE`,
  migration, reset, repair ou qualquer chamada de escrita.

## Inventário reproduzível por objeto

- Histórico: `310` migrations, máximo `20260822234701`; a busca de padrões
  retornou somente `version=20260822183706`,
  `name=20260821090000_analytics_timeseries_operation_scope_v1`.
- Cobertura RLS: `153/153` tabelas públicas com RLS, `4/153` com FORCE RLS e
  `178` policies.
- `public.profiles`: `authenticated` possui `DELETE`, `INSERT`, `REFERENCES`,
  `TRIGGER`, `TRUNCATE` e `UPDATE`.
- `public.tenants`: `authenticated` possui `REFERENCES`, `SELECT`,
  `TRIGGER` e `TRUNCATE`.
- Policies de `profiles`: `profiles_select_self_or_platform_admin` (SELECT)
  e `profiles_update_self_safe_fields_only` (UPDATE); RLS habilitado e FORCE
  RLS desabilitado.
- Policies de `tenants`: policies de SELECT, INSERT, UPDATE e DELETE com
  condições de plataforma/tenant; RLS habilitado e FORCE RLS desabilitado.
- RPCs: `public.rpc_analytics_timeseries` e
  `public.rpc_analytics_timeseries_by_operation`, owner `postgres`,
  `SECURITY DEFINER`, executáveis por `authenticated` e `service_role`;
  a primeira expõe `search_path=""` e `statement_timeout=15s`, e a segunda
  expõe `search_path=""` sem timeout observado.
- Advisors: segurança `162 ERROR`, `284 WARN`, `19 INFO`; performance
  `5 auth_rls_initplan`, `26 multiple_permissive_policies` em WARN e
  `380 INFO`.
- `pg_stat_statements`: relação não disponível nos caminhos consultados.

### Inventário nominal dos conjuntos agregados

A janela read-only foi reaberta para responder F-REMOTE-002. O fechamento desta
coleta nominal foi registrado em `2026-08-24T22:30:52.693Z` (UTC).
Nenhum dado foi alterado.

#### Views `security_definer_view` (162 objetos, severity `ERROR`)

A lista foi extraída do retorno de `supabase_get_advisors(project_id,
type="security")`, filtrando `name=security_definer_view` e
`metadata.schema=public`:

```text
public.vw_admin_access_areas  public.vw_admin_access_functions  public.vw_admin_access_internal_users
public.vw_admin_access_invites  public.vw_admin_access_memberships  public.vw_admin_access_user_detail
public.vw_admin_access_users  public.vw_admin_analytics_pipeline_catalog_v2  public.vw_admin_analytics_sync_history_v1
public.vw_admin_analytics_sync_history_v2  public.vw_admin_audit_feed  public.vw_admin_auth_context
public.vw_admin_commercial_product_detail  public.vw_admin_commercial_product_plans  public.vw_admin_commercial_products
public.vw_admin_communication_channel_readiness  public.vw_admin_communication_delivery_summary  public.vw_admin_customer_account_alerts
public.vw_admin_customer_account_customizations  public.vw_admin_customer_account_features  public.vw_admin_customer_account_group_detail
public.vw_admin_customer_account_groups_list  public.vw_admin_customer_account_integrations  public.vw_admin_customer_account_profile_detail
public.vw_admin_customer_account_profiles  public.vw_admin_customer_inventory_observations  public.vw_admin_customer_migration_kanban
public.vw_admin_customer_operations_directory  public.vw_admin_customer_portal_access_overview  public.vw_admin_customer_portal_article_candidates
public.vw_admin_customer_portal_tenant_access  public.vw_admin_customer_portal_ticket_candidates  public.vw_admin_customer_portal_user_detail
public.vw_admin_customer_portal_users  public.vw_admin_customer_product_feature_entitlements  public.vw_admin_customer_product_internal_owners
public.vw_admin_customer_product_subscription_detail  public.vw_admin_customer_product_subscriptions  public.vw_admin_internal_access_profile_screen_grants
public.vw_admin_internal_access_profiles  public.vw_admin_internal_action_target_areas  public.vw_admin_internal_area_memberships
public.vw_admin_internal_areas  public.vw_admin_internal_collaborators  public.vw_admin_internal_invites
public.vw_admin_internal_membership_screen_grants  public.vw_admin_internal_screen_catalog  public.vw_admin_knowledge_article_assets
public.vw_admin_knowledge_article_detail  public.vw_admin_knowledge_article_detail_v2  public.vw_admin_knowledge_article_review_advisories
public.vw_admin_knowledge_articles_list  public.vw_admin_knowledge_articles_list_v2  public.vw_admin_knowledge_categories
public.vw_admin_knowledge_categories_v2  public.vw_admin_knowledge_entitlement_detail  public.vw_admin_knowledge_entitlements
public.vw_admin_knowledge_space_support_contacts  public.vw_admin_knowledge_spaces  public.vw_admin_organization_detail
public.vw_admin_organizations_list  public.vw_admin_product_area_ownerships  public.vw_admin_system_audit_events
public.vw_admin_system_health_checks  public.vw_admin_system_operational_summary  public.vw_admin_tenant_detail
public.vw_admin_tenant_group_context  public.vw_admin_tenant_memberships  public.vw_admin_tenants_list
public.vw_admin_ticket_channel_definitions  public.vw_admin_ticket_knowledge_links  public.vw_admin_ticket_sla_policies
public.vw_admin_user_lookup  public.vw_ai_action_policies  public.vw_ai_context_source_policies
public.vw_ai_customer_account_context_readiness  public.vw_ai_knowledge_context_readiness  public.vw_ai_operational_context_readiness
public.vw_ai_support_ticket_context_readiness  public.vw_ai_usage_audit_events  public.vw_analytics_commercial_by_owner
public.vw_analytics_commercial_funnel  public.vw_analytics_commercial_kpis  public.vw_analytics_commercial_monthly
public.vw_analytics_cs_by_status  public.vw_analytics_cs_kpis  public.vw_analytics_cs_monthly
public.vw_analytics_cs_sync_progress  public.vw_analytics_dashboard_pipeline_catalog  public.vw_analytics_dashboard_sync_status
public.vw_analytics_finance_sync_runs_read  public.vw_analytics_hubspot_sync_progress  public.vw_analytics_integration_schedule_read
public.vw_analytics_spreadsheet_import_runs_read  public.vw_analytics_sync_request_metrics_read  public.vw_analytics_ticket_resolution
public.vw_cs_customer_portfolio  public.vw_customer_portal_active_tenant_context  public.vw_customer_portal_auth_context
public.vw_customer_portal_available_tenants  public.vw_customer_portal_knowledge_article_detail  public.vw_customer_portal_knowledge_articles
public.vw_customer_portal_profile_context  public.vw_customer_portal_ticket_attachments  public.vw_customer_portal_ticket_collaboration_state
public.vw_customer_portal_ticket_delivery_state  public.vw_customer_portal_ticket_detail  public.vw_customer_portal_ticket_knowledge_links
public.vw_customer_portal_ticket_list  public.vw_customer_portal_ticket_timeline  public.vw_engineering_work_item_detail
public.vw_engineering_work_item_ticket_links  public.vw_engineering_work_item_updates  public.vw_engineering_work_items_queue
public.vw_internal_action_area_auth_context  public.vw_internal_action_detail_by_area  public.vw_internal_action_queue_by_area
public.vw_internal_action_timeline_by_area  public.vw_internal_actor_capability_context  public.vw_internal_actor_workspace_context
public.vw_internal_area_landing_context  public.vw_internal_document_detail  public.vw_internal_documents_catalog
public.vw_public_knowledge_article_assets  public.vw_public_knowledge_article_detail  public.vw_public_knowledge_articles_list
public.vw_public_knowledge_navigation  public.vw_public_knowledge_space_resolver  public.vw_support_assignable_agents
public.vw_support_customer_360  public.vw_support_customer_account_context  public.vw_support_customer_detail
public.vw_support_customer_product_context  public.vw_support_customer_recent_events  public.vw_support_customer_recent_tickets
public.vw_support_customers_list  public.vw_support_internal_action_detail  public.vw_support_internal_action_target_areas
public.vw_support_internal_action_timeline  public.vw_support_knowledge_article_picker  public.vw_support_knowledge_public_link_candidates
public.vw_support_tenant_communication_capabilities  public.vw_support_ticket_attachments  public.vw_support_ticket_channel_context
public.vw_support_ticket_channel_readiness  public.vw_support_ticket_classification_options  public.vw_support_ticket_communication_capabilities
public.vw_support_ticket_delivery_capabilities  public.vw_support_ticket_detail  public.vw_support_ticket_engineering_links
public.vw_support_ticket_intake_contacts  public.vw_support_ticket_intake_tenants  public.vw_support_ticket_internal_actions
public.vw_support_ticket_knowledge_links  public.vw_support_ticket_message_deliveries  public.vw_support_ticket_sla_context
public.vw_support_ticket_timeline  public.vw_support_ticket_timeline_recent  public.vw_support_tickets_queue
public.vw_ticket_detail  public.vw_ticket_timeline  public.vw_tickets_list
```

#### Grants diretos de `anon` (5 objetos)

- `public.vw_public_knowledge_article_assets`: `SELECT`
- `public.vw_public_knowledge_article_detail`: `SELECT`
- `public.vw_public_knowledge_articles_list`: `SELECT`
- `public.vw_public_knowledge_navigation`: `SELECT`
- `public.vw_public_knowledge_space_resolver`: `SELECT`

#### Grupos de múltiplas policies permissivas (4 grupos)

- `public.conversation_types`, role `authenticated`, command `SELECT`: `conversation_types_select_platform_admin`, `conversation_types_select_support`
- `public.customer_segment_assignments`, role `authenticated`, command `SELECT`: `customer_segment_assignments_select_cs`, `customer_segment_assignments_select_operational`
- `public.customer_segments`, role `authenticated`, command `SELECT`: `customer_segments_select_cs`, `customer_segments_select_operational`
- `public.priority_levels`, role `authenticated`, command `SELECT`: `priority_levels_select_platform_admin`, `priority_levels_select_support`

Os inventários acima são identificadores de objeto e privilégio, não prova de
exploração. Cada view precisa de revisão de contrato, owner, ACL,
`SECURITY DEFINER`, `search_path`, tenant guard e consumidores.
Cada grupo de policy precisa de revisão de sobreposição e impacto no plano.

## Histórico de migrations

- Migrations registradas: `310`.
- Maior versão registrada: `20260822234701`.
- A consulta por nomes relacionados à task 60 encontrou apenas
  `20260821090000_analytics_timeseries_operation_scope_v1`, registrado no
  remoto sob a versão `20260822183706`.
- Não foram encontradas no resultado as migrations locais
  `20260822220000`, `20260823100000` ou `20260824190000`, nem os nomes de
  rebuild/preflight usados no fluxo local.

Conclusão: o remoto não é uma cópia do histórico local da task 60. Isso reduz
o risco de equivalência direta, mas não substitui uma auditoria funcional dos
contratos nem prova ausência de outros problemas.

## RLS, policies e privilégios

Consulta estrutural remota:

- tabelas públicas: `153`;
- tabelas públicas com RLS: `153`;
- tabelas públicas com `FORCE RLS`: `4`;
- policies públicas: `178`;
- grupos com múltiplas policies permissivas para o mesmo papel/ação: `4`;
- grants diretos de tabela para `authenticated`: `605`;
- grants diretos de tabela para `anon`: `5`.

Finding prioritário de least privilege:

- **HIGH F-REMOTE-001:** `authenticated` possui `TRUNCATE` em
  `public.profiles` e `public.tenants`. `TRUNCATE` é privilégio de tabela,
  não é filtrado por policies RLS comuns e pode remover todas as linhas da
  tabela. O grant deve ser tratado como bloqueador de release até que o
  least privilege seja revisado em task versionada. Os demais grants
  observados permanecem inventariados para análise separada;
- RLS está habilitado nessas tabelas, mas `FORCE RLS` não está habilitado;
- as policies observadas em `profiles` restringem SELECT/UPDATE, e as de
  `tenants` cobrem SELECT/INSERT/UPDATE/DELETE; isso não reduz o risco do
  privilégio de `TRUNCATE`.

Isso é um finding de revisão de segurança, não uma prova de exploração ou
vazamento. Nenhum teste de escrita foi executado.

## Funções analíticas críticas

As funções remotas abaixo existem em `public` como `SECURITY DEFINER`:

- `rpc_analytics_timeseries`;
- `rpc_analytics_timeseries_by_operation`.

Ambas são de propriedade de `postgres`, concedem `EXECUTE` a
`authenticated`/`service_role` e usam `search_path` vazio. A primeira possui
`statement_timeout=15s`; a segunda não expõe timeout na configuração observada.

Esse desenho pode ser válido, mas exige revisão do corpo completo, validação de
`auth.uid()`/tenant, ACL e teste cross-tenant com dois contextos antes de
qualquer alteração.

## Advisors Supabase

### Segurança

- total: `465` avisos;
- `ERROR`: `162`, todos classificados como `security_definer_view`;
- `WARN`: `284`, incluindo `authenticated_security_definer_function_executable`
  (`268`) e `anon_security_definer_function_executable` (`14`);
- `INFO`: `19`, incluindo tabelas com RLS sem policy e proteção de senha
  exposta.

### Performance

- total: `411` avisos;
- `WARN`: `31`, sendo `5` de `auth_rls_initplan` e `26` de
  `multiple_permissive_policies`;
- `INFO`: `380`, principalmente foreign keys sem índice de cobertura.

Os advisors são sinais para triagem. Não autorizam correção automática e não
demonstram, isoladamente, impacto funcional ou exploração.

## Limitações

- Não foi executada sessão autenticada de usuário real.
- Não foi feito probe cross-tenant com JWTs ou tenants reais.
- Não foi executado `EXPLAIN ANALYZE` em workload de produção.
- `pg_stat_statements` não estava disponível no caminho consultado, portanto
  não há ranking de queries reais neste relatório.
- Não houve migration, SQL de escrita, alteração de grant/policy, reset,
  repair, secret, push, merge, deploy ou ação externa.

## Validações da correção documental

- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos.
- Auditoria de governança documental `...run-documentation-audit.mjs changed`:
  PASS, 0 bloqueadores; divergências históricas preservadas.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline
  resolvidos.
- `git diff --check`: PASS.

## Próxima ação recomendada

Criar correções versionadas separadas, priorizadas nesta ordem:

1. revisar `SECURITY DEFINER` views/functions e seus grants;
2. validar least privilege de `profiles`, `tenants` e demais tabelas base;
3. provar RLS/cross-tenant com dois contextos autenticados;
4. corrigir policies permissivas e `auth_rls_initplan` onde houver impacto;
5. validar índices e performance com plano e workload representativo.

Cada correção deve passar por shadow/preflight, revisão independente e
aprovação antes de qualquer aplicação remota.
