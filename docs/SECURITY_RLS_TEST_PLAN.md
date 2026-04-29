# SECURITY_RLS_TEST_PLAN.md

## Objetivo
Validar isolamento multi-tenant, permissões por papel e bloqueio de acesso indevido.

## Testes obrigatórios

### Isolamento por tenant
- Usuário do tenant A não lê tickets do tenant B.
- Contato do cliente não vê tickets de outro cliente.
- Anexos respeitam o mesmo escopo do ticket.
- `tenant_manager` não lê `tenant_contacts` de outro tenant.
- `tenant_admin` não cria membership fora do próprio tenant.
- `tenant_admin` não usa RPC administrativa fora do próprio tenant.
- `tenant_manager` não altera memberships fora do próprio tenant.

### Permissões internas
- Support Agent vê tickets atribuídos ou permitidos.
- Support Manager vê fila do tenant conforme escopo.
- Engineering Member vê work items permitidos.
- Customer Contact só cria e acompanha tickets do próprio tenant.
- `tenant_manager` não cria `platform_admin`.
- `tenant_manager` não se autopromove.
- Usuário comum não cria membership.

### Escrita
- Usuário sem permissão não altera status.
- Cliente não altera prioridade interna.
- Cliente não atribui responsável.
- Engenharia não altera mensagem pública sem regra explícita.
- `WITH CHECK` deve bloquear insert/update cross-tenant.
- `tenant_memberships.tenant_id` deve ser imutável em updates.
- `profiles` deve bloquear alteração direta de `email` e `is_active`.
- Tabelas administrativas não devem aceitar DML direto do app autenticado.
- RPC administrativa deve ser o único caminho de mutação para `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles`.

### Auditoria
- Criar ticket gera audit log.
- Alterar status gera ticket_event e audit log.
- Alterar responsável gera ticket_event e audit log.
- Criar work item gera audit log.
- `audit.audit_logs` não aceita `update`.
- `audit.audit_logs` não aceita `delete`.
- Bootstrap do primeiro `platform_admin` deve continuar auditável via `user_global_roles`.
- Toda RPC administrativa deve gerar `audit.audit_logs`.
- Toda função `SECURITY DEFINER` exposta deve ter `search_path` fixo e ACL explícita.

## Critério de aprovação
Nenhuma tela ou API operacional pode avançar sem testes mínimos de RLS passando.

## Cobertura atual da Fase 1.2
- `supabase/tests/001_phase1_identity_tenancy_rls.sql`
- `supabase/tests/002_phase1_1_hardening.sql`
- `supabase/tests/003_phase1_2_admin_control_plane.sql`
- `supabase/tests/004_phase1_2_function_audit.sql`

Validações já materializadas:
- sync `auth.users -> profiles`
- bootstrap único do primeiro `platform_admin`
- read negado cross-tenant
- write negado cross-tenant
- privilege escalation negado
- `WITH CHECK` validado em inserts e updates
- `audit.audit_logs` append-only validado
- RPC administrativa permitida para `platform_admin`
- RPC administrativa permitida para `tenant_admin` no próprio tenant
- RPC administrativa negada cross-tenant
- RPC administrativa negada para usuário comum
- auditoria estrutural de ACL e `SECURITY DEFINER` validada
