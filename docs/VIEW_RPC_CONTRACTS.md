# VIEW_RPC_CONTRACTS.md

## Regra canônica
- Leitura do app deve passar por views/read models contratuais.
- Escrita do app deve passar por RPCs transacionais.
- O app autenticado não deve ler nem escrever diretamente nas tabelas base de ticketing.

## Estado executável atual

Fase 1.2:
- RPCs administrativas de tenancy e identidade continuam vigentes.

Fase 2:
- Ticketing core já possui views de leitura e RPCs de escrita materializadas em migration oficial.
- `authenticated` não possui `SELECT`, `INSERT`, `UPDATE` nem `DELETE` direto em `tickets`, `ticket_messages`, `ticket_events`, `ticket_assignments` e `ticket_attachments`.
- As views de tickets aplicam filtro explícito por caller via `auth.uid()` e helpers em `app_private`.

Fase 2.1:
- Os contratos tipados de ticketing foram materializados em `packages/contracts`.
- A auditoria estrutural das views foi formalizada em pgTAP.

Fase 2.3:
- O Admin Console agora possui views contratuais dedicadas para leitura administrativa.
- `platform_admin` lê a superfície administrativa global apenas por:
  - `vw_admin_tenants_list`
  - `vw_admin_tenant_detail`
  - `vw_admin_tenant_memberships`
  - `vw_admin_audit_feed`
- A escrita administrativa continua restrita às RPCs já materializadas na Fase 1.2.

Fase 3.1:
- O gate autenticado do Admin Console agora possui read model contratual próprio.
- O frontend consome o contexto do usuário autenticado apenas por:
  - `vw_admin_auth_context`
- O frontend do Admin Console não lê mais `profiles` nem `user_global_roles` diretamente.
- O client browser usa `storageKey` isolada por ambiente e o gate não volta para `idle` em refresh de token equivalente.
- A QA local real já confirmou as superfícies:
  - `/admin/tenants` -> `vw_admin_tenants_list` + `vw_admin_tenant_detail`
  - `/admin/access` -> `vw_admin_tenant_memberships`
  - `/admin/system` -> `vw_admin_audit_feed`
  - `/access-denied` -> bloqueio sem vazamento para usuário autenticado sem `platform_admin`

Fase 3.2:
- O Admin Console agora possui contrato explícito de lookup global de usuários existentes para memberships.
- O frontend administrativo consome a busca de usuários apenas por:
  - `vw_admin_user_lookup`
- `authenticated` não possui mais `SELECT` direto em `public.profiles`.
- A tela `Access` usa nome/email -> `user_id` pela view contratual e mantém fallback manual controlado apenas quando necessário.

Fase 4:
- Knowledge Base agora possui núcleo editorial real com views internas contratuais e RPCs administrativas próprias.
- O frontend administrativo futuro deve consumir a superfície de leitura apenas por:
  - `vw_admin_knowledge_categories`
  - `vw_admin_knowledge_articles_list`
  - `vw_admin_knowledge_article_detail`
- A escrita editorial deve passar apenas por:
  - `rpc_admin_create_knowledge_category`
  - `rpc_admin_create_knowledge_article_draft`
  - `rpc_admin_update_knowledge_article_draft`
  - `rpc_admin_submit_knowledge_article_for_review`
  - `rpc_admin_publish_knowledge_article`
  - `rpc_admin_archive_knowledge_article`
- A importação Octadesk só cria drafts locais, preserva `source_path`/`source_hash` e nunca usa HTML como corpo principal.

Fase 4.2:
- A fundação multi-brand foi materializada de forma 100% aditiva no backend.
- O Admin Console agora possui read models administrativos novos para governança e marcas:
  - `vw_admin_organizations_list`
  - `vw_admin_organization_detail`
  - `vw_admin_knowledge_spaces`
- `knowledge_categories` e `knowledge_articles` agora aceitam `knowledge_space_id` nullable, mantendo `tenant_id` e os contratos atuais intactos.
- Não existem ainda RPCs v2 space-aware, views públicas de help center nem mudança de comportamento no frontend.
- As RPCs atuais de Knowledge Base continuam sendo a única superfície de escrita editorial exposta nesta fase.

Fase 4.3:
- O corpus atual da Knowledge Base foi associado ao `knowledge_space` oficial `genius`.
- O backend agora possui camada v2 space-aware para leitura e escrita editorial, sem quebrar a superfície legada.
- O import Octadesk agora exige destino explícito por `knowledge_space`.
- As views e RPCs antigas continuam disponíveis para compatibilidade e o frontend atual não foi alterado.

Fase 4.4:
- O Admin Console agora possui a rota `/admin/knowledge` como superfície mínima de curadoria editorial.
- O frontend dessa rota lê apenas:
  - `vw_admin_knowledge_spaces`
  - `vw_admin_knowledge_categories_v2`
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`
- O frontend dessa rota escreve apenas:
  - `rpc_admin_create_knowledge_category_v2`
  - `rpc_admin_create_knowledge_article_draft_v2`
  - `rpc_admin_update_knowledge_article_draft_v2`
  - `rpc_admin_submit_knowledge_article_for_review_v2`
  - `rpc_admin_publish_knowledge_article_v2`
  - `rpc_admin_archive_knowledge_article_v2`
- Nenhuma tabela base de Knowledge Base, multi-brand ou import legado e consumida diretamente pelo frontend.

Fase 4.5:
- A Central de Ajuda pública continua sem UI, mas agora possui contratos oficiais de leitura endurecidos.
- `anon` e `authenticated` leem a superfície pública apenas por:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- Essas views expõem somente `knowledge_spaces` ativos, categorias públicas e artigos `published` + `public`.
- Nenhuma tabela base de multi-brand ou Knowledge Base fica exposta para `anon`.

Fase 4.6:
- A Central de Ajuda pública mínima agora existe como UI de leitura em `/help` e rotas filhas por `spaceSlug`.
- O frontend público lê apenas:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- O frontend público não escreve em nenhuma RPC nesta fase.
- O detalhe público renderiza apenas `body_md` com Markdown seguro; HTML legado segue fora do contrato.

Fase 4.7:
- O resolver público agora também transporta branding público sanitizado para a Central de Ajuda.
- `anon` e `authenticated` continuam lendo branding apenas por:
  - `vw_public_knowledge_space_resolver`
- Campos públicos permitidos no resolver:
  - `brand_name`
  - `logo_asset_url`
  - `theme_tokens` sanitizado por allowlist
  - `seo_defaults` sanitizado por allowlist
  - `support_contacts` sanitizado por allowlist
- O frontend público continua sem escrever em RPCs e valida novamente os valores antes de aplicar CSS, meta tags ou links.

Fase 4.9:
- A Central Pública agora possui contrato oficial de busca textual simples.
- O frontend público consulta busca apenas por:
  - `rpc_public_search_knowledge_articles`
- A RPC pública retorna apenas metadados mínimos de resultado (`article_id`, `title`, `slug`, `summary`, `category_name`, `rank_score`, `updated_at`) e nunca expõe `body_md` completo.
- A busca continua sem IA, embeddings, chat, portal B2B ou abertura pública de ticket.

Fase 5.3:
- A curadoria editorial agora possui contrato backend advisory persistente e separado do artigo canonico.
- O backlog legado passa a alimentar `knowledge_article_review_advisories` por `source_hash` e `source_path`, sem alterar `body_md`, `status` ou `visibility` automaticamente.
- O Admin Console autenticado le apenas `vw_admin_knowledge_article_review_advisories` para sinais de apoio editorial persistidos.
- A escrita administrativa dessa camada acontece apenas por:
  - `rpc_admin_update_knowledge_article_review_status`
  - `rpc_admin_mark_knowledge_article_reviewed`
- O advisory continua sendo apoio de revisao humana, nunca decisao automatica de publish.

Fase 6.1:
- O Support Workspace agora possui read models contratuais proprios e mais restritos que o ticketing core generico.
- O frontend futuro de suporte deve ler apenas:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_customer_360`
- A escrita continua nas RPCs de ticketing ja existentes:
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`
- A revisao de authz desta fase fechou o workspace como superficie interna de suporte:
  - `platform_admin` tem acesso global;
  - `support_agent` e `support_manager` precisam de membership ativo no tenant;
  - membros comuns do tenant nao entram no workspace;
  - engenharia continua operando pelo ticketing core e fica fora destes read models, ate existir workspace/contrato proprio.

Fase 6.3:
- O Support Workspace agora possui um diretório contratual de agentes atribuiveis para remover a dependencia operacional de `user_id` manual no fluxo principal.
- O frontend de suporte passa a ler tambem:
  - `vw_support_assignable_agents`
- A atribuição continua escrita apenas por:
  - `rpc_assign_ticket`
- O diretório de agentes segue o mesmo boundary operacional da atribuição:
  - lista apenas `platform_admin`, `support_manager` e `support_agent` ativos;
  - exige membership ativo no tenant quando aplicavel;
  - nao expande acesso cross-tenant nem abre `SELECT` direto nas tabelas base.

Fase 6.4:
- O Support Workspace agora possui guardrails contratuais de volume para timeline e customer context.
- O frontend de suporte passa a ler tambem:
  - `vw_support_ticket_timeline_recent`
  - `vw_support_customer_recent_tickets`
  - `vw_support_customer_recent_events`
- Regras:
  - a timeline inicial do ticket carrega apenas a janela recente com `recent_limit`, `total_available_count` e `has_more`;
  - o customer context operacional passa a consumir recortes recentes separados para tickets e eventos;
  - a primeira tela deixa de depender de historico infinito ou arrays longas no payload principal.

Fase 6.8:
- O backend do Customer Account Profile agora foi materializado como dominio proprio, separado de ticketing, KB e portal.
- O app autenticado continua sem qualquer leitura direta em tabela-base desse dominio.
- A leitura contratual disponivel passa a existir por:
  - `vw_support_customer_account_context`
  - `vw_admin_customer_account_profiles`
- A escrita administrativa passa a existir apenas por:
  - `rpc_admin_upsert_customer_account_profile`
  - `rpc_admin_add_customer_integration`
  - `rpc_admin_update_customer_integration`
  - `rpc_admin_add_customer_customization`
  - `rpc_admin_update_customer_customization`
  - `rpc_admin_add_customer_account_alert`
  - `rpc_admin_archive_customer_account_alert`
- Regras:
  - `tenant_id` e obrigatorio em todas as tabelas;
  - suporte e CS internos leem apenas o contexto operacional autorizado por tenant;
  - `platform_admin` continua sendo o write actor garantido do primeiro corte;
  - o dominio bloqueia tokens, senhas, chaves, payloads sigilosos e endpoints sensiveis antes de persistir ou auditar.

## Views contratuais vigentes

### `vw_tickets_list`
- Finalidade: lista operacional de tickets por tenant.
- Retorna: identidade do ticket, tenant, requester, título, origem, status, prioridade, severidade, autor, assignee quando permitido, timestamps principais, contadores visíveis de mensagens e flags de permissão.
- Regras:
  - só retorna tickets de tenants acessíveis ao caller;
  - só expõe `assigned_to_*` quando o caller pode ver conteúdo interno;
  - `internal_message_count` fica zerado para perfis sem acesso interno;
  - `last_message_at` considera apenas mensagens visíveis ao caller.
  - usa `security_barrier = true`.

### `vw_ticket_detail`
- Finalidade: read model detalhado de um ticket.
- Retorna: dados completos do ticket, requester contact, motivo de fechamento, contadores visíveis de mensagens e anexos, assignee quando permitido e flags de permissão.
- Regras:
  - só retorna tickets de tenants acessíveis ao caller;
  - requester contact é carregado do mesmo tenant do ticket;
  - anexos e mensagens internas só entram nas contagens quando o caller pode ver conteúdo interno.
  - usa `security_barrier = true`.

### `vw_ticket_timeline`
- Finalidade: timeline unificada de mensagens e eventos de ticket.
- Retorna: `message` e `event` em um shape único com `timeline_entry_id`, `entry_type`, `visibility`, `occurred_at`, `actor_user_id`, `message_id`, `event_id`, `event_type`, `assignment_id`, `body` e `metadata`.
- Regras:
  - mensagens públicas e eventos públicos ficam visíveis para membros do tenant;
  - mensagens internas e eventos internos só ficam visíveis para perfis com permissão interna;
  - timeline não depende de `SELECT` direto nas tabelas base.
  - usa `security_barrier = true`.

## Views contratuais administrativas

### `vw_admin_auth_context`
- Finalidade: read model do contexto autenticado do Admin Console.
- Retorna: `id`, `full_name`, `email`, `avatar_url`, `is_active` e `roles` como array de `user_global_roles.role`.
- Regras:
  - retorna no máximo uma linha;
  - filtra explicitamente por `auth.uid()`;
  - não expõe contexto de outro usuário autenticado;
  - permite ao frontend resolver sessão, profile ativo e role global sem `SELECT` direto em `profiles` e `user_global_roles`;
  - usa `security_barrier = true`.

### `vw_admin_tenants_list`
- Finalidade: lista global de tenants do Admin Console.
- Retorna: identidade do tenant, nomes operacionais, status, região, timestamps, actor de criação/atualização, contadores agregados de memberships e contatos e resumo do contato primário.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não depende de seleção direta do frontend nas tabelas `tenants`, `tenant_memberships` e `tenant_contacts`;
  - agrega contagens no backend para manter a home de `Tenants` operacional e estável;
  - usa `security_barrier = true`.

### `vw_admin_user_lookup`
- Finalidade: lookup global de usuários existentes para o fluxo administrativo de memberships.
- Retorna: `user_id`, `full_name`, `email`, `is_active` e `created_at`.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não expõe `avatar_url`, `locale`, `timezone`, `updated_at` nem metadados de autoria;
  - não depende de leitura direta do frontend em `public.profiles`;
  - usa `security_barrier = true`.

### `vw_admin_organizations_list`
- Finalidade: lista administrativa global de organizations.
- Retorna: identidade da organization, nomes legais e operacionais, status, timestamps, autoria resolvida e contadores agregados de tenants, memberships e knowledge spaces.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não depende de leitura direta do frontend em `organizations`, `organization_memberships` ou `knowledge_spaces`;
  - agrega contagens no backend para manter a governança multi-brand operacional sem joins no client;
  - usa `security_barrier = true`.

### `vw_admin_organization_detail`
- Finalidade: read model detalhado de uma organization para contexto administrativo de governança.
- Retorna: metadados completos da organization, contadores agregados e payloads `jsonb` de `tenants`, `knowledge_spaces` e `organization_memberships`.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não vaza detalhe organizacional para `tenant_admin`, `tenant_manager` ou membros comuns;
  - mantém o payload agregado no backend para evitar leitura direta do frontend nas tabelas base novas;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_spaces`
- Finalidade: lista administrativa global de knowledge spaces.
- Retorna: identidade do space, organization, tenant dono quando houver, branding principal, domínio primário, locale, status e contadores agregados de categorias e artigos.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não depende de leitura direta do frontend em `knowledge_spaces`, `knowledge_space_domains`, `brand_settings`, `knowledge_categories` ou `knowledge_articles`;
  - preserva o eixo oficial `knowledge_space` como unidade editorial/publica sem alterar as RPCs atuais da KB;
  - usa `security_barrier = true`.

### `vw_admin_tenant_detail`
- Finalidade: read model detalhado de um tenant para contexto lateral ou tela dedicada.
- Retorna: metadados completos do tenant, contadores de memberships, contadores de contatos e `contacts` agregados em `jsonb` com payload legível do contato e do usuário vinculado.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não vaza detalhe administrativo para `tenant_admin`, `tenant_manager` ou membros comuns;
  - mantém os contatos como payload contratual único para evitar join de frontend em tabelas base;
  - usa `security_barrier = true`.

### `vw_admin_tenant_memberships`
- Finalidade: read model global de memberships por tenant.
- Retorna: identidade do membership, tenant associado, status do tenant, `user_id`, nome, email, avatar, `is_active`, role e status do membership, além do convidante quando existir.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - bloqueia inclusive leitura do próprio tenant para atores que não sejam `platform_admin`;
  - evita que o frontend faça join manual entre `tenant_memberships`, `tenants` e `profiles`;
  - usa `security_barrier = true`.

### `vw_admin_audit_feed`
- Finalidade: feed administrativo mínimo de rastreabilidade.
- Retorna: identidade do log, horário, ator, tenant resolvido, tabela/entidade afetada, ação, `before_state`, `after_state` e `metadata`.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - restringe o feed às entidades administrativas:
    - `profiles`
    - `user_global_roles`
    - `tenants`
    - `tenant_memberships`
    - `tenant_contacts`
  - resolve contexto de tenant também para eventos da própria tabela `tenants` usando `entity_id`;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_categories`
- Finalidade: lista administrativa de categorias da Knowledge Base.
- Retorna: identidade da categoria, escopo de tenant, relação com categoria pai, visibilidade, metadados editoriais básicos e contadores agregados de artigos por status.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - não depende de leitura direta do frontend em `knowledge_categories` nem `knowledge_articles`;
  - mantém contadores agregados no backend para evitar joins editoriais no client;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_articles_list`
- Finalidade: lista administrativa de artigos da Knowledge Base.
- Retorna: identidade do artigo, tenant/categoria, `visibility`, `status`, metadados editoriais, `source_path`, `source_hash`, revisão atual e contagem de revisões.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - expõe apenas trilha editorial aprovada para operação administrativa;
  - não depende de leitura direta do frontend em `knowledge_articles`, `knowledge_article_revisions` ou `knowledge_article_sources`;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_article_detail`
- Finalidade: detalhe administrativo de artigo com histórico editorial e trilha de origem.
- Retorna: payload completo do artigo, `body_md`, `source_path`, `source_hash`, revisões agregadas e fontes agregadas em `jsonb`.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - preserva rastreabilidade de importação legado e versionamento editorial no backend;
  - não expõe HTML legado como contrato de frontend;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_categories_v2`
- Finalidade: lista administrativa space-aware de categorias da Knowledge Base.
- Retorna: contexto de `organization`, `knowledge_space`, tenant legado quando existir, relação com categoria pai, visibilidade e contadores editoriais por status.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - expõe apenas categorias com `knowledge_space_id` não nulo;
  - não depende de leitura direta do frontend em `knowledge_categories` ou `knowledge_articles`;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_articles_list_v2`
- Finalidade: lista administrativa space-aware de artigos da Knowledge Base.
- Retorna: contexto de `organization`, `knowledge_space`, tenant legado quando existir, categoria, visibilidade, status, trilha de origem e estatísticas de revisão.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - expõe apenas artigos com `knowledge_space_id` não nulo;
  - é a lista contratual principal para a futura camada editorial multi-brand;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_article_detail_v2`
- Finalidade: detalhe administrativo space-aware de artigo.
- Retorna: payload completo do artigo com `organization`, `knowledge_space`, tenant legado quando existir, `body_md`, revisões e fontes agregadas.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - expõe apenas artigos com `knowledge_space_id` não nulo;
  - preserva rastreabilidade de backfill e importação legado por `source_path` e `source_hash`;
  - usa `security_barrier = true`.

### `vw_admin_knowledge_article_review_advisories`
- Finalidade: read model administrativo persistente de apoio editorial para revisao da Knowledge Base.
- Retorna: artigo, `knowledge_space`, trilha de origem (`source_path`, `source_hash`), `suggested_visibility`, `suggested_classification`, `classification_reason`, `duplicate_group_key`, `duplicate_group_article_count`, `risk_flags`, `human_confirmations`, `review_status`, `review_notes` e trilha de autoria/revisao.
- Regras:
  - retorna linhas apenas para `platform_admin` com `profile.is_active = true`;
  - expõe apenas advisories associados a artigos da KB administrativa;
  - não altera nem substitui o dado editorial canonico de `knowledge_articles`;
  - não fica exposta para `anon` nem para surfaces publicas;
  - usa `security_barrier = true`.

### `vw_support_tickets_queue`
- Finalidade: fila operacional do Support Workspace interno B2B.
- Retorna: metadados do ticket, contexto do tenant, requester resolvido, flags de permissao herdadas do core e sinais operacionais (`is_unassigned`, `is_waiting_customer`, `is_waiting_support`, `is_waiting_engineering`).
- Regras:
  - retorna linhas apenas para `platform_admin` ou `support_agent`/`support_manager` com membership ativo no tenant;
  - nao expande acesso para membros comuns nem para engenharia nesta fase;
  - nao depende de `SELECT` direto do frontend em `tickets`, `tenants` ou `tenant_contacts`;
  - usa `security_barrier = true`.

### `vw_support_ticket_detail`
- Finalidade: detalhe contratual do ticket dentro do Support Workspace.
- Retorna: payload detalhado do ticket, requester, contexto do tenant e flags operacionais do caller.
- Regras:
  - reaproveita o `vw_ticket_detail` como base canônica;
  - preserva separacao entre comunicacao publica e conteudo interno;
  - nao vaza tickets de outros tenants nem abre acesso para perfis fora do workspace;
  - usa `security_barrier = true`.

### `vw_support_ticket_timeline`
- Finalidade: timeline unificada do Support Workspace com contexto enriquecido de tenant e ator.
- Retorna: mensagens e eventos do ticket, com `actor_full_name` e `actor_email` quando houver profile associado.
- Regras:
  - mostra mensagens publicas e notas internas somente para callers do workspace autorizados;
  - membros comuns do tenant continuam sem acesso a esta superficie;
  - timeline segue sem depender de `SELECT` direto nas tabelas base;
  - usa `security_barrier = true`.

### `vw_support_ticket_timeline_recent`
- Finalidade: janela recente da timeline do ticket para a primeira carga operacional.
- Retorna: o mesmo shape da timeline de suporte, acrescido de `recent_rank`, `total_available_count`, `recent_limit` e `has_more`.
- Regras:
  - limita a primeira carga a 25 registros mais recentes por ticket;
  - preserva a separacao entre resposta publica, nota interna e eventos de sistema;
  - nao expande acesso cross-tenant;
  - usa `security_barrier = true`.

### `vw_support_customer_360`
- Finalidade: read model minimo de visao 360 do cliente B2B para suporte interno.
- Retorna: tenant, preview resumido de contatos ativos, tickets recentes, contagem de tickets por status e eventos recentes relevantes.
- Regras:
  - expõe apenas tenants acessiveis ao workspace de suporte;
  - nao inclui SLA, metricas complexas, CRM generico nem vazamento cross-tenant;
  - agrega contagens e preview resumido no backend para evitar joins do frontend em tabelas base;
  - usa `security_barrier = true`.

### `vw_support_customer_recent_tickets`
- Finalidade: recorte operacional dos tickets recentes do tenant.
- Retorna: ticket, status, prioridade, severidade, responsavel, `updated_at` e metadados de janela (`recent_rank`, `total_available_count`, `recent_limit`, `has_more`).
- Regras:
  - limita a primeira carga a 6 tickets por tenant;
  - nao expande acesso cross-tenant;
  - usa `security_barrier = true`.

### `vw_support_customer_recent_events`
- Finalidade: recorte operacional dos eventos e mensagens recentes do tenant.
- Retorna: `ticket_id`, `ticket_title`, `event_type`, `visibility`, `occurred_at`, ator resolvido, resumo textual e metadados de janela (`recent_rank`, `total_available_count`, `recent_limit`, `has_more`).
- Regras:
  - limita a primeira carga a 8 registros recentes por tenant;
  - preserva notas internas apenas para roles autorizadas pelo workspace;
  - nao expande acesso cross-tenant;
  - usa `security_barrier = true`.

### `vw_support_assignable_agents`
- Finalidade: diretório seguro de agentes atribuiveis para o Support Workspace.
- Retorna: `user_id`, `full_name`, `email`, `tenant_id`, `tenant_name`, `role`, `membership_status`, `is_active`.
- Regras:
  - lista apenas perfis ativos com membership ativo no tenant;
  - limita os papeis a `platform_admin`, `support_manager` e `support_agent`;
  - respeita o mesmo contrato de autorizacao operacional usado por `rpc_assign_ticket`;
  - nao expõe usuarios de outros tenants nem dados sensiveis adicionais;
  - usa `security_barrier = true`.

### `vw_public_knowledge_space_resolver`
- Finalidade: resolver público dos `knowledge_spaces` ativos para a futura Central de Ajuda.
- Retorna: `knowledge_space` ativo, branding público sanitizado, locale, organization e chaves de roteamento por `space_slug` e domínio ativo quando existir.
- Regras:
  - expõe apenas `knowledge_spaces` com `status = active` e `organizations` ativas;
  - gera rota fallback por slug em `/help/:space_slug`;
  - expõe domínio apenas quando `knowledge_space_domains.status = active`;
  - não expõe `owner_tenant_id`, settings internos, JSON bruto não sanitizado nem tabelas base;
  - usa `security_barrier = true`.

### `vw_public_knowledge_navigation`
- Finalidade: navegação pública da Knowledge Base por `knowledge_space`.
- Retorna: categorias públicas, relação pai/filho, contadores de artigos públicos no subtree e lista resumida dos artigos públicos diretos da categoria.
- Regras:
  - expõe apenas categorias `public` em `knowledge_spaces` ativos;
  - só considera artigos `published` + `public`;
  - não retorna categorias internas nem categorias de spaces inativos;
  - não expõe corpo do artigo, trilha de origem nem metadados editoriais internos;
  - usa `security_barrier = true`.

### `vw_public_knowledge_articles_list`
- Finalidade: lista pública de artigos da futura Central de Ajuda.
- Retorna: `knowledge_space`, categoria pública quando existir, título, slug, summary e timestamps públicos.
- Regras:
  - expõe apenas artigos `published` + `public`;
  - bloqueia artigos em categorias não públicas, quando categorizados;
  - não expõe `source_path`, `source_hash`, autores internos nem `tenant_id`;
  - usa `security_barrier = true`.

### `vw_public_knowledge_article_detail`
- Finalidade: detalhe público de artigo da futura Central de Ajuda.
- Retorna: contexto do `knowledge_space`, categoria pública quando existir, título, slug, summary, `body_md` e timestamps públicos.
- Regras:
  - expõe apenas artigos `published` + `public`;
  - mantém Markdown como corpo oficial; HTML legado continua fora do contrato;
  - não expõe rastreabilidade editorial interna nem trilha de importação legado;
  - usa `security_barrier = true`.

## RPC pública vigente

### `rpc_public_search_knowledge_articles`
- Finalidade: busca textual simples da Central de Ajuda pública por `knowledge_space`.
- Entrada:
  - `p_space_slug`
  - `p_query`
  - `p_limit` com default `10`
- Retorna: `article_id`, `title`, `slug`, `summary`, `category_name`, `rank_score` e `updated_at`.
- Regras:
  - considera apenas `knowledge_spaces` ativos em `organizations` ativas;
  - considera apenas artigos `published` + `public`;
  - bloqueia artigos em categoria não pública, quando categorizados;
  - não expõe `body_md`, `source_path`, `source_hash`, `tenant_id` nem metadados editoriais internos;
  - usa busca textual simples em PostgreSQL com `websearch_to_tsquery('portuguese', ...)`;
  - query vazia ou curta retorna lista vazia controlada;
  - `p_limit` é limitado no backend para evitar abuso.

## Auditoria das views oficiais

### Configuração atual
- As três views oficiais são views PostgreSQL padrão no schema `public`.
- Elas não usam `security_invoker = true`.
- Elas usam `security_barrier = true`.

### Justificativa
- Em Postgres e Supabase, `security_invoker = true` faria o caller precisar de permissão direta nas tabelas base.
- Isso conflita com a regra do produto de não expor `SELECT` direto do app autenticado em `tickets` e tabelas-filhas.
- Por isso, a estratégia atual não depende da RLS implícita das tabelas base durante a leitura das views.
- O isolamento é imposto explicitamente dentro da própria definição das views com:
  - `app_private.is_active_tenant_member(...)`
  - `app_private.can_view_internal_ticket_content(...)`
- O hardening complementar é:
  - `security_barrier = true` nas views;
  - `SELECT` revogado das tabelas base para `authenticated`;
  - pgTAP estrutural para ACL, filtros e visibilidade.

### Conclusão da auditoria
- Não foi encontrado vazamento cross-tenant nas views oficiais.
- Não foi encontrado vazamento de nota interna para perfil externo.
- As views não dependem de grant implícito inseguro nas tabelas base.
- Qualquer alteração futura em grants ou remoção dos filtros explícitos quebra a suíte pgTAP.

## Auditoria das views administrativas

### Configuração atual
- As views administrativas atuais são views PostgreSQL padrão no schema `public`.
- Elas não usam `security_invoker = true`.
- Elas usam `security_barrier = true`.

### Justificativa
- O frontend administrativo continua proibido de depender de join em tabelas base.
- A estratégia atual replica o padrão endurecido do ticketing:
  - filtro explícito no próprio read model;
  - `auth.uid()` explícito para contexto autenticado;
  - `platform_admin` ativo como condição de leitura nas views operacionais;
  - grants concedidos na view, não como permissão semântica do frontend nas tabelas base.
- Nenhuma policy nova foi criada para esta fase porque o isolamento do app é imposto pelas próprias views contratuais.

### Conclusão da auditoria
- `platform_admin` lê globalmente a superfície administrativa aprovada.
- Qualquer usuário autenticado lê apenas o próprio `vw_admin_auth_context`.
- `tenant_admin` e membros comuns recebem zero linhas nas views administrativas globais, incluindo a fundação multi-brand.
- O feed de auditoria mantém contexto de tenant para eventos administrativos relevantes sem depender de lógica no frontend.
- `authenticated` não mantém `SELECT` direto em `public.profiles`; a busca de usuários do Admin Console foi deslocada para `vw_admin_user_lookup`.
- As suítes `supabase/tests/007_phase2_3_admin_read_models.sql`, `supabase/tests/008_phase3_1_admin_auth_context.sql`, `supabase/tests/009_phase3_2_admin_user_lookup.sql`, `supabase/tests/011_phase4_2_multi_brand_foundation.sql` e `supabase/tests/012_phase4_3_space_aware_compatibility.sql` quebram se as views forem removidas, se os grants forem alterados ou se os filtros explícitos desaparecerem.

## RPCs administrativas vigentes

### `rpc_admin_create_tenant`
- Escopo: `platform_admin`
- Retorno: `public.tenants`

### `rpc_admin_update_tenant_status`
- Escopo: `platform_admin`
- Retorno: `public.tenants`

### `rpc_admin_add_tenant_member`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` dentro do limite permitido
- Retorno: `public.tenant_memberships`

### `rpc_admin_update_tenant_member_role`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` dentro do limite permitido
- Retorno: `public.tenant_memberships`

### `rpc_admin_update_tenant_member_status`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` dentro do limite permitido
- Retorno: `public.tenant_memberships`

### `rpc_admin_create_tenant_contact`
- Escopo: `platform_admin`, `tenant_admin` e `tenant_manager` no próprio tenant
- Retorno: `public.tenant_contacts`

### `rpc_admin_update_tenant_contact`
- Escopo: `platform_admin`, `tenant_admin` e `tenant_manager` no próprio tenant
- Retorno: `public.tenant_contacts`

## RPCs de Knowledge Base vigentes

### `rpc_admin_create_knowledge_category`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_categories`
- Regras:
  - cria ou reconcilia categoria pelo escopo (`tenant_id`, `parent_category_id`, `slug`);
  - valida tenant/categoria pai quando aplicável;
  - gera auditoria.

### `rpc_admin_create_knowledge_article_draft`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - cria artigo sempre em `draft`;
  - captura primeira revisão automaticamente;
  - registra `source_path` e `source_hash` quando houver origem legada;
  - gera auditoria e trilha de fonte.

### `rpc_admin_update_knowledge_article_draft`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - só permite mutação em `draft` ou `review`;
  - bloqueia edição de artigo `published` ou `archived` fora de fluxo editorial futuro explícito;
  - incrementa revisão, preserva trilha de origem e gera auditoria.

### `rpc_admin_submit_knowledge_article_for_review`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige artigo em `draft`;
  - move para `review`;
  - cria revisão auditável.

### `rpc_admin_publish_knowledge_article`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige artigo em `review`;
  - move para `published`;
  - cria revisão auditável;
  - continua sem Help Center público nesta fase.

### `rpc_admin_archive_knowledge_article`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - bloqueia segunda tentativa de arquivamento;
  - cria revisão auditável;
  - preserva trilha de origem.

### `rpc_admin_create_knowledge_category_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_categories`
- Regras:
  - exige `knowledge_space_id` explícito;
  - reconcilia categoria por (`knowledge_space_id`, `parent_category_id`, `slug`);
  - preserva `tenant_id` legado quando aplicável.

### `rpc_admin_create_knowledge_article_draft_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige `knowledge_space_id` explícito;
  - cria artigo sempre em `draft`;
  - preserva `source_path` e `source_hash`;
  - cria revisão e trilha de fonte automaticamente.

### `rpc_admin_update_knowledge_article_draft_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige `knowledge_space_id` explícito;
  - só permite mutação em `draft` ou `review`;
  - bloqueia mover artigo para outro space por esta RPC.

### `rpc_admin_submit_knowledge_article_for_review_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige `knowledge_space_id` explícito;
  - valida o space do artigo antes da transição para `review`.

### `rpc_admin_publish_knowledge_article_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige `knowledge_space_id` explícito;
  - valida o space do artigo antes da publicação;
  - continua sem abrir Help Center público nesta fase.

### `rpc_admin_archive_knowledge_article_v2`
- Escopo: `platform_admin`
- Retorno: `public.knowledge_articles`
- Regras:
  - exige `knowledge_space_id` explícito;
  - valida o space do artigo antes do arquivamento;
  - preserva a trilha editorial.

### `rpc_admin_update_knowledge_article_review_status`
- Escopo: `platform_admin`
- Retorno: linha de `public.knowledge_article_review_advisories`
- Regras:
  - atualiza apenas o advisory persistente do artigo;
  - aceita `review_status`, `human_confirmations` e `review_notes`;
  - valida `human_confirmations` como objeto JSON;
  - não altera `status`, `visibility` nem `body_md` do artigo;
  - gera trilha de auditoria obrigatoria.

### `rpc_admin_mark_knowledge_article_reviewed`
- Escopo: `platform_admin`
- Retorno: linha de `public.knowledge_article_review_advisories`
- Regras:
  - marca o advisory como `reviewed` e persiste `reviewed_by_user_id`/`reviewed_at`;
  - aceita `human_confirmations` e `review_notes`;
  - não publica artigo nem promove mudanca automatica em `knowledge_articles`;
  - gera trilha de auditoria obrigatoria.

## RPCs de ticketing vigentes

### `rpc_create_ticket`
- Escopo: `platform_admin`, suporte/engenharia internos com membership ativo e perfis externos permitidos no próprio tenant (`tenant_admin`, `tenant_manager`, `tenant_requester`)
- Entrada: `tenant_id`, `title`, `description`, `source`, `priority`, `severity`, `requester_contact_id?`
- Retorno: linha completa de `public.tickets`
- Regras:
  - valida tenant do caller;
  - valida `requester_contact_id` no mesmo tenant;
  - cria `ticket_created` em `ticket_events`;
  - gera `audit.audit_logs`.

### `rpc_update_ticket_status`
- Escopo: `platform_admin` e operadores internos autorizados no tenant
- Entrada: `ticket_id`, `status`, `note?`
- Retorno: linha completa de `public.tickets`
- Regras:
  - valida máquina de estados;
  - bloqueia `closed` por esta RPC;
  - bloqueia reopen por esta RPC;
  - gera evento automático e auditoria.

### `rpc_assign_ticket`
- Escopo: `platform_admin` e operadores internos autorizados no tenant
- Entrada: `ticket_id`, `assigned_to_user_id?`
- Retorno: linha completa de `public.tickets`
- Regras:
  - alvo precisa ser operador interno ativo no mesmo tenant;
  - gera histórico append-only em `ticket_assignments`;
  - gera evento interno `assigned` ou `unassigned`;
  - gera auditoria.

### `rpc_add_ticket_message`
- Escopo: membros autorizados a interagir com tickets no próprio tenant
- Entrada: `ticket_id`, `body`
- Retorno: linha completa de `public.ticket_messages`
- Regras:
  - grava mensagem com `visibility = customer`;
  - bloqueia tickets `closed` e `cancelled`;
  - gera evento `message_added`;
  - gera auditoria.

### `rpc_add_internal_ticket_note`
- Escopo: `platform_admin` e operadores internos autorizados no tenant
- Entrada: `ticket_id`, `body`
- Retorno: linha completa de `public.ticket_messages`
- Regras:
  - grava mensagem com `visibility = internal`;
  - gera evento `internal_note_added`;
  - gera auditoria.

### `rpc_close_ticket`
- Escopo: `platform_admin` e operadores internos autorizados no tenant
- Entrada: `ticket_id`, `close_reason`
- Retorno: linha completa de `public.tickets`
- Regras:
  - exige ticket previamente `resolved`;
  - exige motivo;
  - gera evento `closed`;
  - gera auditoria.

### `rpc_reopen_ticket`
- Escopo: `platform_admin` e operadores internos autorizados no tenant
- Entrada: `ticket_id`, `reopen_reason?`
- Retorno: linha completa de `public.tickets`
- Regras:
  - só reabre tickets `resolved` ou `closed`;
  - retorna ticket para `waiting_support`;
  - gera evento `reopened`;
  - gera auditoria.

## Regras de exposição

- Todas as RPCs expostas são `SECURITY DEFINER` com `SET search_path = ''`.
- `EXECUTE` é concedido explicitamente apenas para `authenticated`.
- Helpers privados ficam em `app_private` e não são expostos como contrato de app.
- O app autenticado lê tickets apenas por:
  - `vw_tickets_list`
  - `vw_ticket_detail`
  - `vw_ticket_timeline`
- O app autenticado lê o Support Workspace apenas por:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_ticket_timeline_recent`
  - `vw_support_customer_360`
  - `vw_support_customer_account_context`
  - `vw_support_customer_recent_tickets`
  - `vw_support_customer_recent_events`
  - `vw_support_assignable_agents`
- O app autenticado lê o Admin Console apenas por:
  - `vw_admin_auth_context`
  - `vw_admin_tenants_list`
  - `vw_admin_tenant_detail`
  - `vw_admin_tenant_memberships`
  - `vw_admin_audit_feed`
  - `vw_admin_user_lookup`
  - `vw_admin_organizations_list`
  - `vw_admin_organization_detail`
  - `vw_admin_knowledge_spaces`
  - `vw_admin_knowledge_categories`
  - `vw_admin_knowledge_articles_list`
  - `vw_admin_knowledge_article_detail`
  - `vw_admin_knowledge_categories_v2`
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`
  - `vw_admin_knowledge_article_review_advisories`
  - `vw_admin_customer_account_profiles`
- O app público/autenticado lê a Central de Ajuda futura apenas por:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- O app público/autenticado consulta busca da Central de Ajuda apenas por:
  - `rpc_public_search_knowledge_articles`
- O app autenticado escreve tickets apenas por:
  - `rpc_create_ticket`
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`
- O app autenticado escreve Knowledge Base apenas por:
  - `rpc_admin_create_knowledge_category`
  - `rpc_admin_create_knowledge_article_draft`
  - `rpc_admin_update_knowledge_article_draft`
  - `rpc_admin_submit_knowledge_article_for_review`
  - `rpc_admin_publish_knowledge_article`
  - `rpc_admin_archive_knowledge_article`
  - `rpc_admin_create_knowledge_category_v2`
  - `rpc_admin_create_knowledge_article_draft_v2`
  - `rpc_admin_update_knowledge_article_draft_v2`
  - `rpc_admin_submit_knowledge_article_for_review_v2`
  - `rpc_admin_publish_knowledge_article_v2`
  - `rpc_admin_archive_knowledge_article_v2`
  - `rpc_admin_update_knowledge_article_review_status`
  - `rpc_admin_mark_knowledge_article_reviewed`
- O app autenticado escreve o Customer Account Profile apenas por:
  - `rpc_admin_upsert_customer_account_profile`
  - `rpc_admin_add_customer_integration`
  - `rpc_admin_update_customer_integration`
  - `rpc_admin_add_customer_customization`
  - `rpc_admin_update_customer_customization`
  - `rpc_admin_add_customer_account_alert`
  - `rpc_admin_archive_customer_account_alert`

## Fase 6.2 - Support Workspace UI Minimum

### Rotas materializadas
- `/support`
- `/support/tickets`
- `/support/tickets/:ticketId`
- `/support/customers/:tenantId`
- `/support/queue`

### Leitura consumida pelo frontend
- `vw_support_tickets_queue`
- `vw_support_ticket_detail`
- `vw_support_ticket_timeline_recent`
- `vw_support_customer_360`
- `vw_support_customer_recent_tickets`
- `vw_support_customer_recent_events`

### Escrita consumida pelo frontend
- `rpc_update_ticket_status`
- `rpc_assign_ticket`
- `rpc_add_ticket_message`
- `rpc_add_internal_ticket_note`
- `rpc_close_ticket`
- `rpc_reopen_ticket`

### Boundary mantido
- a UI do workspace nao le tabelas base de ticketing
- a UI nao cria mutacoes novas fora das RPCs ja aprovadas
- a UI continua interna e B2B, sem qualquer capacidade de atendimento a shopper final

## Fase 6.3 - Support Workspace Agent Directory + Assignment UX

### Leitura consumida pelo frontend
- `vw_support_assignable_agents`

### Escrita consumida pelo frontend
- `rpc_assign_ticket`

### Boundary mantido
- a atribuicao principal deixa de depender de digitação manual de UUID
- o seletor mostra apenas operadores ativos e atribuiveis pelo contrato do backend
- `Atribuir a mim` e `Desatribuir` continuam usando somente `rpc_assign_ticket`
- o `user_id` tecnico permanece apenas como fallback recolhido para excecao operacional

## Próximos contratos planejados
- Views e RPCs de intake para engenharia.
- Roteamento frontend por domínio/`space_slug` sobre os contratos já materializados.
- Branding público projetado explicitamente por read model quando `brand_settings` precisar sair do fallback seguro atual.

## Proibições
- Frontend fazendo join direto em tabelas de domínio.
- Frontend lendo `public.tickets` ou tabelas-filhas diretamente.
- Frontend lendo `profiles` ou `user_global_roles` diretamente para resolver o gate do Admin Console.
- Frontend lendo `tenants`, `tenant_memberships`, `tenant_contacts` ou `audit.audit_logs` diretamente para o Admin Console.
- Frontend lendo `organizations`, `organization_memberships`, `knowledge_spaces`, `knowledge_space_domains` ou `brand_settings` diretamente.
- Frontend lendo tabelas base de Knowledge Base (`knowledge_*`) diretamente.
- `anon` lendo tabelas base de multi-brand ou Knowledge Base diretamente.
- Frontend decidindo visibilidade de nota interna.
- Frontend usando HTML legado de Octadesk como corpo/UI de artigo.
- Escrita direta em tabelas críticas sem RPC.
- Uso do blueprint histórico como contrato executável.
