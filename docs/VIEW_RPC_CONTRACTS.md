# VIEW_RPC_CONTRACTS.md

## Regra
Leituras devem preferir views/read models. Escritas devem preferir RPCs/commands transacionais.

## Estado executável atual

Ainda não existem views/read models oficiais expostas para UI. A Fase 1.2 entregou
apenas o control plane administrativo mínimo de tenancy e identidade.

## RPCs administrativas vigentes

### `rpc_admin_create_tenant`
- Escopo: `platform_admin`
- Função: criar tenant com `slug`, `legal_name`, `display_name` e `data_region`
- Retorno: linha completa de `public.tenants`

### `rpc_admin_update_tenant_status`
- Escopo: `platform_admin`
- Função: alterar `status` de tenant existente
- Retorno: linha completa de `public.tenants`

### `rpc_admin_add_tenant_member`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` dentro do próprio limite de role
- Função: criar membership em tenant existente
- Retorno: linha completa de `public.tenant_memberships`

### `rpc_admin_update_tenant_member_role`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` apenas dentro do escopo permitido
- Função: alterar role de membership existente sem permitir troca de `tenant_id` ou `user_id`
- Retorno: linha completa de `public.tenant_memberships`

### `rpc_admin_update_tenant_member_status`
- Escopo: `platform_admin`, `tenant_admin` no próprio tenant e `tenant_manager` apenas dentro do escopo permitido
- Função: alterar status de membership existente
- Retorno: linha completa de `public.tenant_memberships`

### `rpc_admin_create_tenant_contact`
- Escopo: `platform_admin`, `tenant_admin` e `tenant_manager` no próprio tenant
- Função: criar contato operacional do tenant
- Retorno: linha completa de `public.tenant_contacts`

### `rpc_admin_update_tenant_contact`
- Escopo: `platform_admin`, `tenant_admin` e `tenant_manager` no próprio tenant
- Função: atualizar contato operacional sem permitir troca de tenant
- Retorno: linha completa de `public.tenant_contacts`

## Regras de exposição

- Todas as RPCs administrativas são `SECURITY DEFINER` com `SET search_path = ''`.
- `EXECUTE` foi concedido explicitamente apenas para `authenticated`.
- Helpers privados ficam em `app_private` e não são expostos ao app.
- `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles` não aceitam DML direto de `authenticated`.
- Toda mutação administrativa deve gerar `audit.audit_logs`.

## Views iniciais propostas para Fase 2+
- vw_support_ticket_list
- vw_support_ticket_detail
- vw_ticket_timeline
- vw_customer_portal_ticket_list
- vw_customer_portal_ticket_detail
- vw_customer_360
- vw_knowledge_article_list
- vw_knowledge_article_detail
- vw_engineering_work_item_list
- vw_engineering_work_item_detail

## RPCs propostas para Fase 2+
- rpc_create_ticket
- rpc_add_ticket_message
- rpc_change_ticket_status
- rpc_assign_ticket
- rpc_update_ticket_priority
- rpc_create_knowledge_article
- rpc_publish_knowledge_article_revision
- rpc_create_engineering_work_item_from_ticket
- rpc_link_ticket_to_work_item
- rpc_update_work_item_status

## Proibições
- Frontend fazendo joins operacionais complexos.
- Frontend calculando SLA.
- Frontend decidindo visibilidade.
- Escrita direta em tabelas críticas sem RPC.
- Uso do blueprint histórico como contrato executável.

## Contrato de resposta
Toda view voltada a UI deve retornar dados prontos para renderização, incluindo labels, status legível, timestamps e flags de permissão quando aplicável.
