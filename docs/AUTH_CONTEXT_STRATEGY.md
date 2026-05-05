# AUTH_CONTEXT_STRATEGY.md

## Objetivo
Garantir que cada usuário acesse apenas o que deve, conforme papel global, tenant e domínio operacional.

## Tipos de usuário
- Internal Admin
- Support Agent
- Support Manager
- Engineering Member
- Engineering Manager
- Customer Contact
- Viewer/Auditor

## Contexto obrigatório
Toda operação deve saber:
- usuário autenticado;
- tenant atual;
- papel do usuário naquele tenant;
- escopo permitido;
- ação solicitada.

## Regras
- Usuário interno pode operar múltiplos tenants conforme permissão.
- Contato cliente só acessa dados do próprio tenant.
- Engenharia não deve ver dados sensíveis do cliente sem necessidade operacional.
- Suporte não deve alterar status técnico final sem permissão.
- Admin não significa bypass irrestrito sem auditoria.
- `platform_admin` inicial não nasce por policy aberta; ele é bootstrapado uma única vez por função privada e conexão de banco privilegiada.
- `tenant_admin` e `tenant_manager` nunca podem atuar fora do próprio tenant.
- `tenant_manager` não pode se autopromover nem promover outro usuário para `tenant_admin`.
- Usuário autenticado comum não cria membership.
- `profiles` aceita apenas autoedição de campos seguros: `full_name`, `avatar_url`, `locale` e `timezone`.
- Alterações de `email`, `is_active`, papéis e metadados críticos acontecem por backend/Auth controlado, nunca por edição livre do cliente.

## Backend
Permissões devem ser validadas no banco/RPC/policy, nunca apenas no frontend.

## Estado da Fase 1.2
- Bootstrap do primeiro `platform_admin` implementado em `app_private.bootstrap_first_platform_admin(...)`.
- Verificação de status de bootstrap em `app_private.platform_admin_bootstrap_status()`.
- Fluxo operacional documentado em `supabase/bootstrap/README.md`.
- Hardening de `tenant_memberships` e `profiles` validado com pgTAP.
- Toda mutação administrativa de tenancy passa por `public.rpc_admin_*`, nunca por DML direto do app nas tabelas administrativas.
- `app_private.require_active_actor()` resolve o ator autenticado e bloqueia execução sem profile ativo.
- Funções `SECURITY DEFINER` usadas no control plane e na camada privada têm `SET search_path = ''` explícito.
- Helpers privados e triggers sem necessidade operacional exposta tiveram `EXECUTE` revogado de `public`, `anon` e `authenticated`.

## Matriz mínima vigente

### `platform_admin`
- Pode criar tenant.
- Pode alterar status de qualquer tenant.
- Pode adicionar e alterar memberships em qualquer tenant.
- Pode criar e atualizar contatos em qualquer tenant.

### `tenant_admin`
- Pode operar RPC administrativa apenas dentro do próprio tenant.
- Pode adicionar `tenant_manager`, `tenant_requester` e `tenant_viewer` no próprio tenant.
- Pode alterar role e status de memberships do próprio tenant, respeitando o escopo do vínculo.
- Pode criar e atualizar `tenant_contacts` do próprio tenant.

### `tenant_manager`
- Pode operar apenas dentro do próprio tenant.
- Pode gerenciar `tenant_requester` e `tenant_viewer`.
- Não pode criar `tenant_admin`.
- Não pode se autopromover.
- Não pode mover vínculo para outro `tenant_id`.

### Usuário autenticado comum
- Não pode usar RPC administrativa.
- Não pode criar membership.
- Mantém apenas leitura e autoedição segura do próprio `profile`, sob RLS e trigger de proteção.
