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
- As cinco views administrativas são views PostgreSQL padrão no schema `public`.
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
- `tenant_admin` e membros comuns recebem zero linhas nas quatro views.
- O feed de auditoria mantém contexto de tenant para eventos administrativos relevantes sem depender de lógica no frontend.
- As suítes `supabase/tests/007_phase2_3_admin_read_models.sql` e `supabase/tests/008_phase3_1_admin_auth_context.sql` quebram se as views forem removidas, se os grants forem alterados ou se os filtros explícitos desaparecerem.

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
- O app autenticado lê o Admin Console apenas por:
  - `vw_admin_auth_context`
  - `vw_admin_tenants_list`
  - `vw_admin_tenant_detail`
  - `vw_admin_tenant_memberships`
  - `vw_admin_audit_feed`
- O app autenticado escreve tickets apenas por:
  - `rpc_create_ticket`
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`

## Próximos contratos planejados
- Views e RPCs de knowledge base.
- Views e RPCs de intake para engenharia.
- Contrato explícito de busca global de usuários, se o Admin Console precisar substituir entrada manual de `user_id` em memberships e vínculos de contato.

## Proibições
- Frontend fazendo join direto em tabelas de domínio.
- Frontend lendo `public.tickets` ou tabelas-filhas diretamente.
- Frontend lendo `profiles` ou `user_global_roles` diretamente para resolver o gate do Admin Console.
- Frontend lendo `tenants`, `tenant_memberships`, `tenant_contacts` ou `audit.audit_logs` diretamente para o Admin Console.
- Frontend decidindo visibilidade de nota interna.
- Escrita direta em tabelas críticas sem RPC.
- Uso do blueprint histórico como contrato executável.
