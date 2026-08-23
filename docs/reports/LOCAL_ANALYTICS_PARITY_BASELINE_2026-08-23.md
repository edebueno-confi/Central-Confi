# Baseline de Paridade Local de Analytics

- Task: LOCAL-PARITY-MIGRATION-BASELINE-2026-08-23
- Data: 2026-08-23
- Base SHA: 22a60a0ed73dbdd8e865ff1c39ed39def3fe6003
- Modo: auditoria local read-only
- Veredito: inconsistente com ressalvas; não conclusivo para produção

## Resumo executivo

O Supabase local possui banco, REST, Auth, Kong, Storage, Realtime e Studio
ativos. O banco contém dados operacionais e RPCs analíticos suficientes para
inspeção, mas o baseline não é reproduzível: não há fixtures versionadas
completas, não há memberships de tenant e o histórico de migrations não
corresponde integralmente aos arquivos do checkout.

A cadeia de código das Edge Functions HubSpot/OMIE existe. Em uma observação
anterior, cujo horário não foi registrado, o Edge Runtime não apareceu no
docker ps. Na rechecagem formal de 2026-08-23T13:49:13.3138785-03:00 ele estava
ativo por seis minutos. A função local analytics-sequential-sync respondeu 401
em 2026-08-23T13:49:56.4302271-03:00 sem autenticação. Isso comprova somente
processo/reachability e barreira HTTP, não execução funcional, replay ou sync.
Nenhuma chamada a HubSpot, OMIE ou outro provedor foi realizada.

## Git e escopo

- Diretório: C:/Projetos/ConfiOne.
- Branch: codex/performance-reconciliation-20260822.
- HEAD: 22a60a0ed73dbdd8e865ff1c39ed39def3fe6003.
- Allowlist efetiva do lote: este relatório e
  handoffs/current/TASK.md, IMPLEMENTATION.md e STATUS.md. REVIEW.md foi
  preservado pelo reviewer e não foi editado pelo executor.
- Preexistentes antes deste lote, alterados por Codex e preservados fora de
  qualquer commit do lote: docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md,
  docs/README.md, docs/PROJECT_STATE.md e handoffs/README.md.
- Portanto, a afirmação correta é que os preexistentes foram preservados e
  separados; não é correto afirmar que nenhum arquivo fora da allowlist foi
  alterado no worktree global.

## Migrations e schema

### Fatos

- supabase/migrations contém 297 arquivos.
- supabase_migrations.schema_migrations contém 294 versões.
- A última versão registrada foi 20260822130000.
- Existem arquivos posteriores: 20260822190000, 20260822200000,
  20260822220000 e 20260823100000.
- O schema local expõe rpc_analytics_timeseries_by_operation com assinaturas
  de cinco e seis argumentos, embora a versão de exclusão de pipeline não esteja
  registrada entre as migrations aplicadas até 20260822130000.

### Classificação

- Fato: contagem, versão máxima e assinaturas acima.
- Hipótese de drift: a assinatura de seis argumentos pode ter sido aplicada
  manualmente ou por execução isolada, sem reconciliação no histórico.
- Não comprovado: paridade do schema com um ambiente remoto ou produção.
- Risco: aplicar migrations sem preflight pode duplicar objetos ou ocultar drift.

### Matriz objeto a objeto

Observação do banco: 2026-08-23 16:49:14.353099+00. O comando foi SELECT sobre
pg_proc, supabase_migrations.schema_migrations e funções de privilégio. As
quatro migrations abaixo estavam no filesystem, mas não no histórico local
porque a versão máxima registrada era 20260822130000.

| Fonte no filesystem | Objeto | Histórico local | Assinatura/estado observado | security definer e search_path | Grants observados | Classificação |
| --- | --- | --- | --- | --- | --- | --- |
| 20260822190000_omie_promotion_skip_metadata_only_updates.sql | public.rpc_service_promote_omie_snapshot | NÃO, versão posterior | (uuid), presente | true; public, pg_temp | anon=true, authenticated=true, service_role=true | Fato de presença; origem aplicada não comprovada |
| 20260822200000_access_02_provisioning_e2e_v1.sql | public.internal_organizational_screen_defaults | NÃO, versão posterior | tabela presente; assinatura não aplicável | RLS/grants de tabela não foram reconsultados nesta matriz | NÃO COMPROVADO | Lacuna de grant/RLS |
| 20260822200000_access_02_provisioning_e2e_v1.sql | public.rpc_admin_update_internal_access_assignment | NÃO, versão posterior | uuid, text, uuid, uuid | true; public, pg_temp | anon=true, authenticated=true, service_role=true | Fato de catálogo; acesso efetivo não comprovado |
| 20260822200000_access_02_provisioning_e2e_v1.sql | public.rpc_admin_assign_internal_access_profile | NÃO, versão posterior | uuid, uuid | true; public, pg_temp | anon=true, authenticated=true, service_role=true | Fato de catálogo; acesso efetivo não comprovado |
| 20260822220000_analytics_utf8_and_scope_guard_v1.sql | public.rpc_analytics_ceo_snapshot_legacy | NÃO, versão posterior | date, date | true; public, pg_temp | anon=true, authenticated=true, service_role=true | Fato de presença; origem da definição não reconciliada |
| 20260822220000_analytics_utf8_and_scope_guard_v1.sql | public.rpc_analytics_customer_success_kpis_v2 | NÃO, versão posterior | () | true; public, pg_temp | anon=true, authenticated=true, service_role=true | Fato de presença; origem da definição não reconciliada |
| 20260822220000_analytics_utf8_and_scope_guard_v1.sql | public.rpc_analytics_support_kpis_v2 | NÃO, versão posterior | date, date, text, text | true; public, pg_temp, work_mem=16MB | anon=true, authenticated=true, service_role=true | Fato de presença; origem da definição não reconciliada |
| 20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql | app_private.set_analytics_pipeline_exclusion_scope | NÃO, versão posterior | text[] | true; search_path vazio | anon=false, authenticated=false, service_role=false | Fato de catálogo; execução interna não exercitada |
| 20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql | public.rpc_analytics_timeseries_by_operation | NÃO, versão posterior | 5 args e 6 args, incluindo text[] | true; public, pg_temp | anon=false, authenticated=true, service_role=true | Fato de assinatura/grant; origem da versão 6 é hipótese de drift |

Para todos os rows, security definer, proconfig e grants vêm do catálogo local;
não foram inferidos de documentos. A presença no schema não prova que a
migration de origem foi aplicada, nem que RLS/tenant impede acesso indevido.
As migrations 20260822190000, 20260822200000, 20260822220000 e 20260823100000
foram classificadas como filesystem-only no histórico local.

## RPC, grants e search_path

- As funções analíticas inspecionadas têm search_path explícito public, pg_temp.
- O search_path da sessão administrativa foi $user, public, extensions.
- O catálogo local mostra EXECUTE para anon e authenticated em parte dos RPCs.
- O catálogo local mostra leitura para anon e escrita para authenticated em
  analytics_source_config, hubspot_deals, hubspot_tickets e hubspot_companies.
- Isto é somente catálogo local e não prova acesso efetivo após RLS.
- Fato: configuração e grants registrados localmente.
- Lacuna: RLS, contexto tenant e comportamento por perfil não foram exercitados.
- Risco P0: revisar grants/RLS antes de usar este banco como baseline de segurança.

## Banco, REST, Auth e runtime

- Em 2026-08-23T13:49:13.3138785-03:00, docker ps mostrou Edge Runtime ativo
  por seis minutos e banco, REST, Auth, Kong e Studio ativos.
- Em 2026-08-23T13:49:56.4302271-03:00, GET local em REST respondeu 200 com
  OpenAPI, Auth settings respondeu 200 e analytics-sequential-sync respondeu
  401 sem autenticação.
- OPTIONS/GET 200 e GET 401 são somente reachability/barreira HTTP; não são
  prova de sync funcional, persistência ou integração externa.
- supabase status tentou atualizar telemetria local e falhou com EPERM. Não aplicou
  migration nem alterou o repositório, por isso docker ps e GETs foram as fontes
  consideradas para o estado runtime.
- As funções de sync não foram chamadas porque podem iniciar escritas locais ou
  chamadas externas.

Classificação final: processo Edge Runtime observado na janela acima; execução
funcional da função não comprovada; sync reproduzível não comprovado; replay
local não comprovado; chamada externa não realizada e não comprovada. O plano
contém uma observação anterior sem timestamp que não deve prevalecer sobre a
rechecagem datada nem ser usada como prova histórica precisa.

## Dados locais e fixtures

Consultas SELECT retornaram:

- 11 usuários em auth.users;
- 11 perfis;
- 2 tenants;
- 0 tenant_memberships;
- 10.436 empresas;
- 2.141 deals;
- 49.414 tickets;
- 38 configurações de pipeline, 32 ativas, 22 confirmadas e 16 não confirmadas;
- 3 execuções HubSpot;
- 1 execução OMIE.

supabase/seeds contém somente README.md. Não há seed determinístico versionado
para reproduzir usuários, memberships, clientes, pipelines e associações.

Ticket→empresa não foi declarado completo: faltam inventário separado e fixture
controlada. Dados presentes no banco não foram tratados como fixture reproduzível.

## HubSpot, OMIE e scheduler

A cadeia HubSpot existe em orchestrator dispatcher/worker, CS dispatcher/worker,
associações, histórico e módulos compartilhados. A cadeia OMIE existe em
omie-sync, _shared/omie.ts e _shared/omie-sync-service.ts.

O código referencia HUBSPOT_PRIVATE_APP_TOKEN, OMIE_CREDENTIALS e
ANALYTICS_SYNC_SECRET. Somente nomes foram inspecionados. O scheduler local tem
jobs ativos para snapshot diário, associações diárias, driver do orquestrador a
cada dois minutos e reaper a cada cinco minutos.

Fato: código, nomes e jobs existem. Hipótese: scheduler pode executar jobs sem
Edge Runtime funcional, produzindo estados incompletos ou stale. Não comprovado:
credenciais válidas, paginação completa, persistência de cada etapa e reconciliação
com provedores.

## Riscos e prioridades

### P0

1. Reconciliar migrations do filesystem, histórico e schema sem reset.
2. Revisar grants, RLS e search_path com persona autenticada e tenant controlado.
3. Não considerar HTTP 200, RPC existente ou 401 da função como prova de sync.

### P1

1. Criar fixtures locais de usuários, tenants, memberships, pipelines e associações.
2. Criar replay idempotente sem chamadas externas para HubSpot e OMIE.
3. Provar cobertura de pipeline e ticket→empresa nos read models.
4. Reconciliar scheduler, Edge Runtime e estados de sync_runs.

### P2

1. Automatizar a matriz filesystem/schema/RPC/grants.
2. Medir frescor, contagens e estados de erro com dataset controlado.
3. Separar runtime ativo, replay local e integração externa nos smoke tests.

## Critérios de prova local

A próxima task deve demonstrar migrations reconciliadas, fixture sanitizada com
dois tenants e memberships, pipelines confirmados/sugeridos/ambíguos, tickets
associados e não associados, replay idempotente com sync_run, paginação e erro,
RPCs com Todas versus operação, RLS/tenant por persona e ausência de chamadas
externas.

## Comandos e gates

- docker ps: executado, sem alteração.
- docker exec psql: consultas SELECT somente.
- Invoke-WebRequest: GET local somente.
- validate-governance-skill.mjs: PASS.
- npm run docs:validate: PASS, 3 válidos, 9 alertas históricos, 0 bloqueados.
- git diff --check: PASS.
