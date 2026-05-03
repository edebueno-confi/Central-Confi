# PROJECT_STATE.md

## Produto
Genius Support OS

## Objetivo
Construir uma plataforma interna para centralizar suporte B2B, base de conhecimento, tickets, comunicação entre suporte, CS, times técnicos e tecnologia, gestão de bugs, melhorias, SLAs, auditoria e IA operacional.

## Contexto operacional
A empresa opera o Genius Returns e o After Sale, SaaS B2B de automação de logística reversa para e-commerce. A operação atual sofre com suporte descentralizado, conhecimento espalhado, ausência de histórico confiável, demandas técnicas perdidas, baixa visibilidade para clientes B2B e dependência excessiva de pessoas específicas.

## Decisão central
O sistema deve ser construído como SaaS profissional desde o início, mesmo sendo inicialmente interno.

## Fonte de verdade documental

Documentos prioritários:
- `PRODUCT_VISION.md`
- `ARCHITECTURE_RULES.md`
- `DATA_MODEL_STRATEGY.md`
- `AUTH_CONTEXT_STRATEGY.md`
- `AUDIT_LOGGING_STRATEGY.md`
- `KNOWLEDGE_BASE_STRATEGY.md`
- `AI_GOVERNANCE.md`
- `ENVIRONMENT_VARIABLES.md`
- `DEPLOYMENT_STRATEGY.md`
- `BRANCHING_STRATEGY.md`
- `IMPLEMENTATION_PLAN.md`
- `REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`
- `SECURITY_RLS_TEST_PLAN.md`
- `VIEW_RPC_CONTRACTS.md`

Documentos históricos:
- `CLEANUP_REPORT.md`

## Princípios vigentes
- Backend é source of truth.
- Frontend apenas renderiza dados e envia comandos.
- Multi-tenant obrigatório desde o início.
- `organization` é governança, `tenant` é operação e `knowledge_space` é marca/help center público.
- Genius Support OS é uma plataforma de operação CX B2B técnica, não um SAC B2C.
- Permissões, auth, RLS, auditoria e logs são fundação, não etapa posterior.
- IA só pode responder com base oficial, versionada e citável.
- Tickets, suporte, cliente B2B, engenharia e conhecimento são domínios separados.
- Nenhum dado operacional relevante deve ser perdido.
- Documentação deve ser viva e versionada no repositório.

## Estado real do repositório em 2026-04-30

### Existe
- Repositório base com `apps/`, `packages/`, `supabase/`, `tests/`, `docs/` e `raw_knowledge/`.
- Frontend real do Admin Console mínimo implementado em `apps/web/` com `Vite`, `React`, `TypeScript`, `Tailwind`, `React Router` e `@supabase/supabase-js`.
- Template de ambiente versionado apenas como `.env.example`, sem valores reais.
- Blueprint histórico em `supabase/blueprints/001_foundation.sql`, marcado como não executável.
- Documentação estratégica oficial em `docs/`.
- Governança operacional de variáveis, branches e deploy documentada em `docs/ENVIRONMENT_VARIABLES.md`, `docs/DEPLOYMENT_STRATEGY.md` e `docs/BRANCHING_STRATEGY.md`.
- Projeto Supabase inicializado via CLI com `supabase/config.toml`.
- Portas locais do Supabase remapeadas para `55321-55327` para coexistir com outro stack local já em execução.
- Migration oficial `supabase/migrations/20260429210127_phase1_identity_tenancy.sql`.
- Migration oficial de hardening `supabase/migrations/20260429212721_phase1_1_hardening.sql`.
- Migration oficial de control plane e function hardening `supabase/migrations/20260429215122_phase1_2_admin_control_plane.sql`.
- Migration oficial de ticketing core e contratos backend `supabase/migrations/20260429225342_phase2_ticketing_core_backend_contracts.sql`.
- Migration oficial de read models administrativos `supabase/migrations/20260430024632_phase2_3_admin_read_models.sql`.
- Migration oficial do auth read model administrativo `supabase/migrations/20260430144642_phase3_1_admin_auth_context.sql`.
- Migration oficial do user lookup administrativo `supabase/migrations/20260430172140_phase3_2_admin_user_lookup.sql`.
- Migration oficial do núcleo de Knowledge Base e pipeline editorial interno `supabase/migrations/20260430182128_phase4_knowledge_base_core.sql`.
- Migration oficial da fundação multi-brand aditiva `supabase/migrations/20260430191513_phase4_2_multi_brand_foundation.sql`.
- Migration oficial de backfill e compatibilidade space-aware `supabase/migrations/20260430194826_phase4_3_backfill_space_aware_compatibility.sql`.
- Migration oficial dos read models públicos da Central de Ajuda `supabase/migrations/20260503004940_phase4_5_public_help_center_read_models.sql`.
- Teste local de banco em `supabase/tests/001_phase1_identity_tenancy_rls.sql`.
- Teste local de hardening em `supabase/tests/002_phase1_1_hardening.sql`.
- Teste local de control plane administrativo em `supabase/tests/003_phase1_2_admin_control_plane.sql`.
- Teste local de auditoria estrutural de functions em `supabase/tests/004_phase1_2_function_audit.sql`.
- Teste local de ticketing core em `supabase/tests/005_phase2_ticketing_core.sql`.
- Teste local de auditoria estrutural de views em `supabase/tests/006_phase2_1_view_security_audit.sql`.
- Teste local de read models administrativos em `supabase/tests/007_phase2_3_admin_read_models.sql`.
- Teste local de auth read model administrativo em `supabase/tests/008_phase3_1_admin_auth_context.sql`.
- Teste local de user lookup administrativo em `supabase/tests/009_phase3_2_admin_user_lookup.sql`.
- Teste local do núcleo de Knowledge Base em `supabase/tests/010_phase4_knowledge_base_core.sql`.
- Teste local da fundação multi-brand em `supabase/tests/011_phase4_2_multi_brand_foundation.sql`.
- Teste local de backfill e compatibilidade space-aware em `supabase/tests/012_phase4_3_space_aware_compatibility.sql`.
- Teste local dos read models públicos da Central de Ajuda em `supabase/tests/013_phase4_5_public_help_center_read_models.sql`.
- Seed separado em `supabase/seeds/` e desabilitado por padrão.
- Fluxo de bootstrap seguro do primeiro `platform_admin` em `supabase/bootstrap/`.
- Núcleo Fase 1 implementado com `profiles`, `user_global_roles`, `tenants`, `tenant_memberships`, `tenant_contacts` e `audit.audit_logs`.
- Triggers reais de `updated_at`, auditoria append-only e sync de `auth.users -> profiles`.
- Policies RLS reais para identidade, tenancy e leitura restrita de auditoria.
- Control plane administrativo mínimo materializado em RPCs seguras no schema `public`.
- `authenticated` não possui DML direto em `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles`; essas mutações passam por RPCs auditadas.
- Funções auditadas com `SECURITY DEFINER` endurecido, `search_path` explícito e ACLs revisadas.
- Núcleo operacional de tickets implementado localmente com `tickets`, `ticket_messages`, `ticket_events`, `ticket_assignments` e `ticket_attachments`.
- Views contratuais de leitura materializadas em `vw_tickets_list`, `vw_ticket_detail` e `vw_ticket_timeline`.
- Views contratuais administrativas materializadas em `vw_admin_tenants_list`, `vw_admin_tenant_detail`, `vw_admin_tenant_memberships` e `vw_admin_audit_feed`.
- View contratual de auth context materializada em `vw_admin_auth_context`.
- View contratual de user lookup administrativo materializada em `vw_admin_user_lookup`.
- Views contratuais administrativas de Knowledge Base materializadas em `vw_admin_knowledge_categories`, `vw_admin_knowledge_articles_list` e `vw_admin_knowledge_article_detail`.
- Views contratuais administrativas multi-brand materializadas em `vw_admin_organizations_list`, `vw_admin_organization_detail` e `vw_admin_knowledge_spaces`.
- Views contratuais administrativas v2 space-aware materializadas em `vw_admin_knowledge_categories_v2`, `vw_admin_knowledge_articles_list_v2` e `vw_admin_knowledge_article_detail_v2`.
- Views contratuais públicas endurecidas materializadas em `vw_public_knowledge_space_resolver`, `vw_public_knowledge_navigation`, `vw_public_knowledge_articles_list` e `vw_public_knowledge_article_detail`.
- RPCs contratuais de escrita materializadas em `rpc_create_ticket`, `rpc_update_ticket_status`, `rpc_assign_ticket`, `rpc_add_ticket_message`, `rpc_add_internal_ticket_note`, `rpc_close_ticket` e `rpc_reopen_ticket`.
- RPCs contratuais administrativas de Knowledge Base materializadas em `rpc_admin_create_knowledge_category`, `rpc_admin_create_knowledge_article_draft`, `rpc_admin_update_knowledge_article_draft`, `rpc_admin_submit_knowledge_article_for_review`, `rpc_admin_publish_knowledge_article` e `rpc_admin_archive_knowledge_article`.
- RPCs contratuais administrativas v2 space-aware materializadas em `rpc_admin_create_knowledge_category_v2`, `rpc_admin_create_knowledge_article_draft_v2`, `rpc_admin_update_knowledge_article_draft_v2`, `rpc_admin_submit_knowledge_article_for_review_v2`, `rpc_admin_publish_knowledge_article_v2` e `rpc_admin_archive_knowledge_article_v2`.
- `authenticated` não possui `SELECT`, `INSERT`, `UPDATE` nem `DELETE` direto nas tabelas base de ticketing; o app lê via views e escreve via RPCs.
- Pacote `packages/contracts` materializado com tipos TypeScript para views e RPCs de ticketing.
- Auditoria estrutural das views oficializada com `security_barrier = true`, filtros explícitos por caller e teste pgTAP dedicado.
- Admin Console mínimo agora possui read models contratuais próprios e bloqueia leitura dessas views para não-`platform_admin`.
- O gate do Admin Console agora resolve auth/profile/roles globais apenas por `vw_admin_auth_context`.
- O frontend do Admin Console não lê `profiles`, `user_global_roles`, `tenants`, `tenant_memberships`, `tenant_contacts` nem `audit.audit_logs` diretamente.
- `authenticated` não possui mais `SELECT` direto em `public.profiles`; o lookup global de usuários do Admin Console foi deslocado para `vw_admin_user_lookup`.
- O client browser do Supabase no Admin Console agora usa `storageKey` própria por ambiente para isolar sessão local e evitar contenção com tokens legados de outras execuções.
- O fluxo de auth do frontend foi endurecido para não resetar o gate em refresh de token/snapshot equivalente e para não disparar bootstrap em loop no `StrictMode`.
- Rotas mínimas materializadas em `/login`, `/admin`, `/admin/tenants`, `/admin/access`, `/admin/system` e `/access-denied`.
- Rotas mínimas materializadas em `/login`, `/admin`, `/admin/tenants`, `/admin/knowledge`, `/admin/access`, `/admin/system` e `/access-denied`.
- Rotas públicas mínimas materializadas em `/help`, `/help/:spaceSlug`, `/help/:spaceSlug/articles` e `/help/:spaceSlug/articles/:articleSlug`.
- Shell protegido materializado com `AuthBootstrap`, `AdminGate`, `AdminConsoleShell`, `AdminSidebar` e `AdminTopbar`.
- Leitura operacional do frontend já consome apenas `vw_admin_auth_context`, `vw_admin_tenants_list`, `vw_admin_tenant_detail`, `vw_admin_tenant_memberships` e `vw_admin_audit_feed`.
- A rota `/admin/knowledge` agora consome apenas `vw_admin_knowledge_spaces`, `vw_admin_knowledge_categories_v2`, `vw_admin_knowledge_articles_list_v2` e `vw_admin_knowledge_article_detail_v2`.
- A tela `Access` agora também consome `vw_admin_user_lookup` para resolver busca de usuários por nome/email antes das RPCs de membership.
- Escrita operacional do frontend já consome apenas `rpc_admin_create_tenant`, `rpc_admin_update_tenant_status`, `rpc_admin_add_tenant_member`, `rpc_admin_update_tenant_member_role`, `rpc_admin_update_tenant_member_status`, `rpc_admin_create_tenant_contact` e `rpc_admin_update_tenant_contact`.
- A rota `/admin/knowledge` agora escreve apenas por `rpc_admin_create_knowledge_category_v2`, `rpc_admin_create_knowledge_article_draft_v2`, `rpc_admin_update_knowledge_article_draft_v2`, `rpc_admin_submit_knowledge_article_for_review_v2`, `rpc_admin_publish_knowledge_article_v2` e `rpc_admin_archive_knowledge_article_v2`.
- Núcleo de Knowledge Base materializado localmente com `knowledge_categories`, `knowledge_articles`, `knowledge_article_revisions` e `knowledge_article_sources`.
- Fundação multi-brand materializada localmente com `organizations`, `organization_memberships`, `knowledge_spaces`, `knowledge_space_domains` e `brand_settings`.
- `tenants` agora aceita `organization_id` nullable para backfill futuro sem quebrar contratos atuais.
- `knowledge_categories` e `knowledge_articles` agora aceitam `knowledge_space_id` nullable para transição multi-brand sem remover `tenant_id`.
- A organization padrão `genius-group` e o knowledge space padrão `genius`/`Genius Returns` agora existem por migration aditiva.
- Knowledge Base possui versionamento editorial, trilha de origem (`source_path`, `source_hash`), auditoria de mutações e política de importação legado somente como draft.
- O app autenticado não possui `SELECT` direto nas tabelas base de Knowledge Base; a superfície administrativa futura lê apenas por `vw_admin_knowledge_*`.
- O app autenticado também não possui `SELECT` direto nas novas tabelas base de multi-brand; a superfície administrativa multi-brand lê apenas por `vw_admin_organizations_*` e `vw_admin_knowledge_spaces`.
- `anon` e `authenticated` não leem tabelas base da camada pública da KB; a futura Central Pública lê apenas pelas `vw_public_knowledge_*`.
- As RPCs atuais de Knowledge Base permanecem compatíveis e ainda podem criar conteúdo com `knowledge_space_id = null` enquanto a migração completa para a camada v2 não for concluída.
- O corpus atual da Knowledge Base já foi associado ao `knowledge_space` oficial `genius` por backfill aditivo.
- As RPCs e views v2 já operam por `knowledge_space_id` explícito sem alterar o frontend atual.
- O pipeline legado `scripts/knowledge/import-octadesk-drafts.mjs` já inventaria a exportação Octadesk, classifica visibilidade inicial conservadora, preserva `source_path`/`source_hash` e bloqueia uso remoto.
- O import legado agora exige `--space-slug` ou `--knowledge-space-id`, continua local-only e grava o conteúdo pela camada v2 space-aware.
- A importação legado não usa HTML como corpo principal e não publica artigos automaticamente.
- A camada pública da KB não expõe `source_path`, `source_hash`, `tenant_id`, autores internos nem HTML legado.
- A Central Pública mínima agora consome apenas `vw_public_knowledge_space_resolver`, `vw_public_knowledge_navigation`, `vw_public_knowledge_articles_list` e `vw_public_knowledge_article_detail`.
- A Central Pública mínima renderiza apenas `body_md` com Markdown seguro, sem `dangerouslySetInnerHTML` e sem depender de filtro de visibilidade no frontend.
- A identidade visual pública usa os dados públicos do `knowledge_space` e fallback seguro quando branding detalhado não estiver projetado nos read models públicos.
- O inventário atual da base legada em `raw_knowledge/octadesk_export/latest/articles/` identificou 58 artigos, 3 categorias-raiz, 1 grupo de duplicidade por `source_hash` e múltiplos candidatos sensíveis/restritos.
- Estados obrigatórios do frontend materializados: loading, vazio, erro, acesso negado, contrato indisponível e sessão expirada.
- Build do frontend agora usa code-splitting por rota.
- Fixture local de QA controlado materializado em `supabase/qa/create-local-admin-fixture.mjs`.
- QA headless local já validou:
  - login real com `platform_admin`;
  - gate resolvido por `vw_admin_auth_context`;
  - `/admin/tenants` com `vw_admin_tenants_list` e `vw_admin_tenant_detail`;
  - `/admin/access` com `vw_admin_tenant_memberships`;
  - `/admin/system` com `vw_admin_audit_feed`;
  - `/access-denied` para usuário autenticado sem role global.
- `npm run contracts:typecheck` validado com sucesso.
- `npm run supabase:verify` validado com sucesso.
- `npm run knowledge:verify:octadesk:space-aware` validado com sucesso.
- `npm run web:typecheck` validado com sucesso.
- `npm run web:build` validado com sucesso.
- `npm run supabase:wait:ready` agora respeita stacks locais em que `supabase_edge_runtime` esteja explicitamente parado, mantendo `REST + Postgres` como readiness obrigatória.
- Suite pgTAP atual validada com `Files=8`, `Tests=135`, `Result: PASS`.
- Suite pgTAP atual validada com `Files=10`, `Tests=177`, `Result: PASS`.
- Suite pgTAP atual validada com `Files=11`, `Tests=218`, `Result: PASS`.
- Suite pgTAP atual validada com `Files=12`, `Tests=256`, `Result: PASS`.
- Suite pgTAP atual validada com `Files=13`, `Tests=275`, `Result: PASS`.
- Pipeline CI para banco em `.github/workflows/supabase-db.yml`.
- A workflow `.github/workflows/supabase-db.yml` agora valida também `web:typecheck` e `web:build`.
- A workflow `.github/workflows/supabase-db.yml` agora valida também a compatibilidade do import Octadesk space-aware.
- CI remota validada no GitHub pela workflow `Supabase DB`, run `25139500960`, commit `85b3495`, branch `codex/phase1-2-admin-control-plane`, conclusão `success`.
- Runbook de deploy remoto criado em `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.
- Deploy remoto das 4 migrations oficiais concluído com sucesso no Supabase remoto.
- `supabase migration list` ficou alinhado entre diretório local e ambiente remoto após o push.
- Bootstrap remoto do primeiro `platform_admin` concluído com sucesso.
- `public.user_global_roles` validado no remoto com o `user_id` promovido e role `platform_admin`.
- `audit.audit_logs` validado no remoto para o evento de bootstrap do `platform_admin`.
- Segunda tentativa de bootstrap remoto bloqueada explicitamente por desenho.
- Nenhuma seed foi executada, nenhum frontend foi criado e nenhum `service_role` foi usado durante deploy e bootstrap remotos.
- Working tree local permaneceu limpa ao final da operação remota validada.
- Base bruta preservada em `raw_knowledge/octadesk_export/latest/`.

### Não existe ainda
- Publicação automática de artigos legados.
- Indexação de Knowledge Base em IA.
- After Sale como segundo `knowledge_space` oficial.
- Support Desk/frontend de tickets.
- Views/read models contratuais para engenharia.
- Busca pública na Central de Ajuda.
- Portal B2B do cliente.
- Abertura pública de ticket.
- Chat, widget ou IA na Central Pública.

## Situação por fase

- Fase 0: concluída.
  - Estrutura base existe.
  - Documentação oficial existe.
  - Blueprint existe.
  - Supabase oficial local foi inicializado.
- Fase 1: concluída localmente e aplicada com sucesso no ambiente remoto oficial.
  - Identity + Tenancy materializados em migration real.
  - RLS mínima validada com pgTAP.
  - Auditoria append-only validada localmente.
  - Hardening 1.1 entregue com anti-escalation, bootstrap seguro e CI de banco.
  - Hardening 1.2 entregue com control plane administrativo via RPC, DML direto revogado para o app nas tabelas administrativas e auditoria estrutural de funções.
  - Frontend continua bloqueado.
  - Deploy remoto concluído sem seed e sem `service_role`.
- Fase 2: ticketing core concluído localmente e aplicado no ambiente remoto.
  - Schema de tickets materializado por migration oficial.
  - Views contratuais e RPCs de ticketing materializadas.
  - Máquina de estados, diferenciação entre mensagens públicas e notas internas e auditoria automática validadas com pgTAP.
  - Leitura direta das tabelas-base de ticketing bloqueada para `authenticated`.
  - `supabase:verify` atual confirma `Files=6`, `Tests=93`, `Result: PASS`.
  - Consumo por frontend continua bloqueado.
- Fase 2.1: contratos tipados e auditoria de views concluídos no repositório.
  - `packages/contracts` descreve enums, DTOs de views e payloads/responses de RPCs.
  - A estratégia de segurança das views foi auditada e documentada.
  - A CI agora também valida `contracts:typecheck`.
  - O estado validado em CI remota mais recente está verde no commit `85b3495`.
- Fase 2.2: documentação sincronizada, deploy remoto e bootstrap admin concluídos.
  - `README.md`, `supabase/README.md` e `docs/IMPLEMENTATION_PLAN.md` foram alinhados ao estado real.
  - `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md` define pré-requisitos, secrets, validação, deploy, rollback e checklist pós-deploy.
  - Deploy remoto das 4 migrations concluído com migration list local/remoto alinhada.
  - Primeiro `platform_admin` criado e validado no remoto.
  - Segunda tentativa de bootstrap segue bloqueada por desenho.
- Fase 2.3: Admin Read Models concluída localmente.
  - Views contratuais administrativas foram materializadas para `Tenants`, `Tenant Detail`, `Memberships` e `Audit Feed`.
  - A leitura do Admin Console agora tem read models dedicados sem join manual de frontend nas tabelas administrativas.
  - `platform_admin` lê globalmente; `tenant_admin` e membros comuns recebem zero linhas.
  - A suíte `supabase/tests/007_phase2_3_admin_read_models.sql` cobre grants, acesso permitido, acesso negado e ausência de vazamento cross-tenant.
  - `supabase:verify` atual confirma `Files=7`, `Tests=120`, `Result: PASS`.
- Fase 3: Admin Console mínimo implementado localmente.
  - Login real, gate de `platform_admin`, shell protegido e rotas mínimas materializados em `apps/web`.
  - `Tenants`, `Access` e `System` consomem apenas views e RPCs contratuais.
  - O frontend aplica alinhamento institucional de marca Genius sem abrir Support Desk, Customer Portal ou IA operacional.
  - O bug crítico de login/loading foi resolvido no frontend sem alterar backend, contracts ou migrations.
  - O Admin Console mínimo já passou por QA local real com fixture controlado e usuário autenticado sem role.
- Fase 3.1: hardening frontend, auth read model e CI sync concluídos localmente.
  - `vw_admin_auth_context` resolve o gate autenticado sem leitura direta de `profiles` e `user_global_roles` no client.
  - `supabase/tests/008_phase3_1_admin_auth_context.sql` cobre grants, filtro por `auth.uid()`, self-only e preservação de `is_active`/roles.
  - A workflow de CI agora valida `contracts:typecheck`, `web:typecheck`, `web:build` e `supabase:verify`.
  - `supabase:verify` atual confirma `Files=8`, `Tests=135`, `Result: PASS`.
- Fase 3.2: Admin User Lookup Contract concluído localmente.
  - `vw_admin_user_lookup` materializa busca global de usuários existentes com campos mínimos para memberships.
  - `authenticated` não possui mais `SELECT` direto em `public.profiles`.
  - A tela `Access` resolve nome/email -> `user_id` pela view contratual e mantém fallback manual controlado.
  - `supabase/tests/009_phase3_2_admin_user_lookup.sql` cobre grants, `security_barrier`, acesso permitido, acesso negado e ausência de vazamento de colunas sensíveis.
  - `supabase:verify` atual confirma `Files=9`, `Tests=146`, `Result: PASS`.
- Fase 4: Knowledge Base Core + Legacy Import Pipeline concluída localmente.
  - Núcleo editorial materializado com categorias, artigos, revisões e fontes rastreáveis.
  - Views contratuais administrativas de Knowledge Base materializadas para lista, detalhe e categorias.
  - RPCs administrativas de criação, atualização, review, publicação e arquivamento materializadas.
  - Importação legado Octadesk implementada apenas como draft, local-only e sem uso de HTML como corpo principal.
  - Inventário legado atual registrou 58 artigos, 1 grupo de duplicidade por `source_hash` e visibilidade inicial conservadora (`internal`/`restricted`).
  - `supabase/tests/010_phase4_knowledge_base_core.sql` cobre grants, RLS, publicação autorizada, preservação de `source_hash` e auditoria.
  - `supabase:verify` atual confirma `Files=10`, `Tests=177`, `Result: PASS`.
- Fase 4.1: revisão arquitetural multi-brand concluída e aprovada como direção oficial.
  - `organization` foi oficializado como camada de governança.
  - `tenant` foi preservado como camada operacional.
  - `knowledge_space` foi oficializado como eixo de marca/documentação pública técnica.
  - A migração recomendada ficou definida como aditiva, com convivência temporária entre contratos legados e futuros contratos space-aware.
- Fase 4.2: Multi-Brand Foundation concluída localmente.
  - Estruturas novas materializadas com `organizations`, `organization_memberships`, `knowledge_spaces`, `knowledge_space_domains` e `brand_settings`.
  - `tenants.organization_id`, `knowledge_categories.knowledge_space_id` e `knowledge_articles.knowledge_space_id` foram adicionados como chaves de transição nullable.
  - Novas views administrativas `vw_admin_organizations_list`, `vw_admin_organization_detail` e `vw_admin_knowledge_spaces` foram materializadas sem alterar o frontend.
  - Constraints novas de slug e índices parciais por `knowledge_space_id` foram adicionados sem remover as constraints legadas por `tenant_id`.
  - O import legado Octadesk, os tickets, as views públicas e as RPCs v2 continuam intocados nesta fase.
  - `supabase/tests/011_phase4_2_multi_brand_foundation.sql` cobre grants, isolamento administrativo, compatibilidade das RPCs atuais e integridade multi-brand.
  - `supabase:verify` atual confirma `Files=11`, `Tests=218`, `Result: PASS`.
- Fase 4.3: Backfill + Space-Aware Compatibility concluída localmente.
  - A migration criou a organization padrão `genius-group` e o knowledge space padrão `genius`/`Genius Returns`, mantendo `owner_tenant_id = null`.
  - O corpus atual da Knowledge Base foi associado ao `knowledge_space` oficial por backfill aditivo, sem remover `tenant_id` nem as constraints antigas.
  - Views administrativas v2 `vw_admin_knowledge_categories_v2`, `vw_admin_knowledge_articles_list_v2` e `vw_admin_knowledge_article_detail_v2` foram materializadas.
  - RPCs administrativas v2 space-aware foram materializadas sem quebrar as RPCs antigas.
  - O import legado Octadesk agora exige destino explícito por space e continua sempre em `draft`, preservando `source_path` e `source_hash`.
  - `supabase/tests/012_phase4_3_space_aware_compatibility.sql` cobre bootstrap/backfill do space padrão, filtros v2 por space e compatibilidade contínua das views/RPCs antigas.
  - `supabase:verify` atual confirma `Files=12`, `Tests=256`, `Result: PASS`.
- Fase 4.4: Admin Knowledge Base UI Minimum concluída localmente.
  - A rota `/admin/knowledge` e a navegação `Knowledge` foram materializadas no Admin Console.
  - A UI administrativa mínima de curadoria agora oferece seletor de `knowledge_space`, filtros por `status` e `visibility`, lista space-aware de artigos, detalhe editorial, criação de categoria, criação/edição de draft e transições de `review`/`publish`/`archive`.
  - A leitura do frontend dessa superfície usa apenas `vw_admin_knowledge_spaces`, `vw_admin_knowledge_categories_v2`, `vw_admin_knowledge_articles_list_v2` e `vw_admin_knowledge_article_detail_v2`.
  - A escrita do frontend dessa superfície usa apenas as RPCs v2 space-aware da Knowledge Base.
  - Conteúdo importado do legado continua sob curadoria humana e não ganha publicação automática pela UI.
- Fase 4.5: Public Help Center Read Models + Routing Contract concluída localmente.
  - A camada pública de leitura da Knowledge Base foi materializada por `vw_public_knowledge_space_resolver`, `vw_public_knowledge_navigation`, `vw_public_knowledge_articles_list` e `vw_public_knowledge_article_detail`.
  - A superfície pública expõe apenas `knowledge_spaces` ativos e artigos `published` + `public`, sem drafts, review, archived, conteúdo internal/restricted ou spaces inativos.
  - O resolver público já suporta `space_slug` e preparação de domínio ativo por `knowledge_space_domains`, sem abrir a UI pública.
  - `anon` e `authenticated` recebem `SELECT` apenas nessas views públicas; tabelas base de multi-brand e `knowledge_*` continuam bloqueadas.
  - `supabase/tests/013_phase4_5_public_help_center_read_models.sql` cobre grants, ausência de vazamento sensível, resolução por slug, filtros públicos e bloqueio de base tables para `anon`.
- Fase 4.6: Public Help Center UI Minimum concluída localmente.
  - A Central Pública mínima de leitura foi materializada em `/help`, `/help/:spaceSlug`, `/help/:spaceSlug/articles` e `/help/:spaceSlug/articles/:articleSlug`.
  - O frontend público consome apenas `vw_public_knowledge_space_resolver`, `vw_public_knowledge_navigation`, `vw_public_knowledge_articles_list` e `vw_public_knowledge_article_detail`.
  - A UI pública cobre landing, navegação por categorias, lista de artigos, detalhe de artigo e estados de loading, vazio, erro e não encontrado.
  - O corpo do artigo é renderizado exclusivamente por `body_md` com Markdown seguro; HTML legado continua fora da superfície pública.
  - Branding público usa apenas dados já expostos pelos read models públicos, com fallback visual seguro quando `brand_settings` não estiver projetado nessa camada.

## Ajustes de auditoria concluídos
- Documentação redundante herdada removida da rota principal.
- Índice de `docs/` realinhado para a documentação oficial.
- Blueprint SQL alinhado com os termos e fases do produto.
- Estrutura do repositório consolidada em documento próprio.

## Bloqueios vigentes
- Não iniciar telas.
- Não iniciar telas de tickets antes dos contratos tipados do backend.
- Não tratar blueprint histórico como implementação pronta.
- Não ingerir `raw_knowledge` sem classificação de sensibilidade.
- Não publicar automaticamente artigos legados importados.
- Não usar HTML raspado do Octadesk como UI, layout ou corpo principal de artigo.
- Não indexar Knowledge Base em IA antes de classificação, revisão humana e governança explícita.
- Não permitir mutação administrativa por acesso direto às tabelas do control plane.
- Não permitir leitura direta do app nas tabelas base de ticketing.
- Não permitir leitura direta do app em `profiles` e `user_global_roles` para o gate do Admin Console.
- Não permitir leitura do Admin Console fora das views `vw_admin_*`.

## Próxima prioridade
Manter a Central Pública mínima restrita a leitura e preparar as próximas
camadas sem romper a separação entre curadoria administrativa, leitura pública
e IA. O próximo avanço recomendado é aprofundar a experiência pública com
busca, roteamento por domínio e governança editorial adicional, sem abrir chat,
portal B2B ou automações antes do contrato certo.
