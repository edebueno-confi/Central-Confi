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

## Views contratuais vigentes

### `vw_tickets_list`
- Finalidade: lista operacional de tickets por tenant.
- Retorna: identidade do ticket, tenant, requester, título, origem, status, prioridade, severidade, autor, assignee quando permitido, timestamps principais, contadores visíveis de mensagens e flags de permissão.
- Regras:
  - só retorna tickets de tenants acessíveis ao caller;
  - só expõe `assigned_to_*` quando o caller pode ver conteúdo interno;
  - `internal_message_count` fica zerado para perfis sem acesso interno;
  - `last_message_at` considera apenas mensagens visíveis ao caller.

### `vw_ticket_detail`
- Finalidade: read model detalhado de um ticket.
- Retorna: dados completos do ticket, requester contact, motivo de fechamento, contadores visíveis de mensagens e anexos, assignee quando permitido e flags de permissão.
- Regras:
  - só retorna tickets de tenants acessíveis ao caller;
  - requester contact é carregado do mesmo tenant do ticket;
  - anexos e mensagens internas só entram nas contagens quando o caller pode ver conteúdo interno.

### `vw_ticket_timeline`
- Finalidade: timeline unificada de mensagens e eventos de ticket.
- Retorna: `message` e `event` em um shape único com `timeline_entry_id`, `entry_type`, `visibility`, `occurred_at`, `actor_user_id`, `message_id`, `event_id`, `event_type`, `assignment_id`, `body` e `metadata`.
- Regras:
  - mensagens públicas e eventos públicos ficam visíveis para membros do tenant;
  - mensagens internas e eventos internos só ficam visíveis para perfis com permissão interna;
  - timeline não depende de `SELECT` direto nas tabelas base.

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
- O app autenticado escreve tickets apenas por:
  - `rpc_create_ticket`
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`

## Próximos contratos planejados
- Contratos tipados em `packages/contracts/` espelhando as views e RPCs vigentes.
- Views e RPCs de knowledge base.
- Views e RPCs de intake para engenharia.

## Proibições
- Frontend fazendo join direto em tabelas de domínio.
- Frontend lendo `public.tickets` ou tabelas-filhas diretamente.
- Frontend decidindo visibilidade de nota interna.
- Escrita direta em tabelas críticas sem RPC.
- Uso do blueprint histórico como contrato executável.
