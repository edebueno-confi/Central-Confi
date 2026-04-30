# Admin Console Minimum Design

Date: 2026-04-29
Status: Implemented locally through Phase 3.2 hardening, local QA and user lookup contract
Scope: Frontend mínimo logado para `platform_admin`

## 1. Objetivo

Preparar o primeiro frontend logado do Genius Support OS como um `Admin Console`
mínimo, centrado em control plane de tenants, sem abrir Support Desk, Customer
Portal, IA operacional ativa ou qualquer feature fora do contrato atual do
backend.

## 2. Decisões aprovadas

- Ator inicial único: `platform_admin` global
- Prioridade operacional após login: `Tenants`
- Direção visual:
  - shell híbrido `A+B`
  - home de `Tenants` no formato `AB1`
  - marca Genius presente
  - operação primeiro
  - mascote contido
  - sem IA ativa no MVP
- Regra de produto:
  - o Admin Console mínimo é um control plane de tenants, não um help desk
- Hardening validado:
  - o gate não entra mais em loop após login
  - refresh de token não reseta o shell para loading infinito
  - o client browser usa storage key isolada por ambiente
  - o lookup global de usuários agora vem de contrato próprio, sem leitura direta de `profiles`

## 3. Fora de escopo

- `tenant_admin`
- `support agent`
- inbox de tickets
- Support Desk
- Customer Portal
- help center pública
- IA operacional ativa
- dashboard executivo complexo
- novos contratos, migrations ou mudanças de backend nesta etapa

## 4. Mapa de rotas

### Rotas públicas mínimas

- `/login`
  - entrada autenticada
  - sem mock de sessão

### Rotas protegidas

- `/admin`
  - redireciona para `/admin/tenants`
- `/admin/tenants`
  - tela principal do console
- `/admin/tenants/:tenantId`
  - opcional no MVP 1
  - pode nascer depois da versão com contexto lateral
- `/admin/access`
  - memberships por tenant
- `/admin/system`
  - estado mínimo e auditoria
- `/access-denied`
  - sessão válida, mas sem role global suficiente

## 5. Componentes do shell

### App shell

- `AuthBootstrap`
  - resolve sessão
  - resolve profile
  - resolve role global
- `AdminGate`
  - bloqueia acesso se não existir `platform_admin`
- `AdminConsoleShell`
  - compõe sidebar, topbar e content area
- `AdminSidebar`
  - `Tenants`
  - `Access`
  - `System`
- `AdminTopbar`
  - contexto do usuário autenticado
  - ambiente
  - ação primária da tela
- `AccessDeniedState`
  - sem vazar dados
- `LoadingState`
  - carregamento real, sem mock
- `EmptyState`
  - com marca Genius e mascote contido apenas quando ajudar

### Shell visual aprovado

- Sidebar fixa e simples
- Área central dominada pela lista operacional
- Coluna lateral apenas com contexto essencial
- Nada de cards decorativos competindo com a tabela principal

## 6. Contrato de dados necessário por tela

### `/login`

Necessita:
- sessão autenticada real

### `AuthBootstrap` / `AdminGate`

Necessita:
- sessão atual
- `profile` do usuário autenticado
- roles globais do usuário autenticado

Shape mínimo esperado:
- `profile.id`
- `profile.full_name`
- `profile.email`
- `profile.avatar_url`
- `profile.is_active`
- `user_global_roles[].role`

### `/admin/tenants`

Necessita:
- lista de tenants
- status do tenant
- nomes operacionais
- região
- timestamps principais
- contexto lateral do tenant selecionado
- contatos vinculados do tenant selecionado
- ações de criar tenant e atualizar status

Shape mínimo esperado para lista:
- `tenant.id`
- `tenant.slug`
- `tenant.legal_name`
- `tenant.display_name`
- `tenant.status`
- `tenant.data_region`
- `tenant.created_at`
- `tenant.updated_at`

Shape mínimo esperado para contatos:
- `contact.id`
- `contact.tenant_id`
- `contact.linked_user_id`
- `contact.full_name`
- `contact.email`
- `contact.phone`
- `contact.job_title`
- `contact.is_primary`
- `contact.is_active`

### `/admin/access`

Necessita:
- memberships por tenant
- busca global de usuários existentes por nome/email
- dados legíveis do membro
- role
- status
- ações de adicionar membro, alterar role e alterar status

Shape mínimo esperado:
- `membership.id`
- `membership.tenant_id`
- `membership.user_id`
- `membership.role`
- `membership.status`
- `membership.created_at`
- `membership.updated_at`
- dados de profile associados para exibição:
  - `profile.full_name`
  - `profile.email`
  - `profile.is_active`

Shape mínimo esperado para lookup:
- `user_id`
- `full_name`
- `email`
- `is_active`
- `created_at`

### `/admin/system`

Necessita:
- feed mínimo de auditoria administrativa
- metadados suficientes para rastreabilidade

Shape mínimo esperado:
- `audit.id`
- `audit.occurred_at`
- `audit.actor_user_id`
- `audit.entity_schema`
- `audit.entity_table`
- `audit.entity_id`
- `audit.action`
- `audit.metadata`

## 7. Views e RPCs existentes que podem ser consumidas

### Escrita pronta hoje

- `public.rpc_admin_create_tenant`
- `public.rpc_admin_update_tenant_status`
- `public.rpc_admin_add_tenant_member`
- `public.rpc_admin_update_tenant_member_role`
- `public.rpc_admin_update_tenant_member_status`
- `public.rpc_admin_create_tenant_contact`
- `public.rpc_admin_update_tenant_contact`

### Leitura pronta hoje no backend

Views administrativas oficiais:
- `public.vw_admin_auth_context`
- `public.vw_admin_tenants_list`
- `public.vw_admin_tenant_detail`
- `public.vw_admin_tenant_memberships`
- `public.vw_admin_audit_feed`
- `public.vw_admin_user_lookup`

### Observação crítica

Para o Admin Console, a leitura operacional principal agora já segue a regra
canônica de views contratuais, incluindo o gate de auth/contexto. A escrita
segue por RPCs.

## 8. Lacunas de backend

### Estado resolvido

O gate de auth/profile/global roles foi resolvido em Fase 3.1 por
`public.vw_admin_auth_context`.

### Lacuna restante

Ainda não existe contrato explícito para:
- busca orientada a tenant/estado de usuários além do lookup global mínimo;
- vínculo de contatos com usuário com UX mais rica que o fallback manual controlado.

### Observação

Não existe mais justificativa para o frontend de `Tenants`, `Access` ou
`System` consumir `tenants`, `tenant_memberships`, `tenant_contacts`,
`audit.audit_logs`, `profiles` ou `user_global_roles` diretamente.

## 9. Estratégia de auth/session/profile gate

### Ordem de resolução

1. validar sessão autenticada
2. carregar `vw_admin_auth_context`
3. validar `profile.is_active = true`
4. ler `roles[]` do próprio usuário autenticado
5. verificar existência de role `platform_admin`
6. permitir ou negar entrada no shell

### Regras

- se não houver sessão: redirecionar para `/login`
- se houver sessão mas não houver `profile` ativo: negar acesso
- se houver sessão e `profile`, mas sem `platform_admin`: mostrar `/access-denied`
- a tela de acesso negado não pode vazar tenants, memberships ou eventos

### Resultado esperado

O primeiro frontend valida:
- auth real
- profile real por `vw_admin_auth_context`
- role global real por `vw_admin_auth_context`
- sem loop de renderização no `StrictMode`
- sem chamadas de bootstrap duplicadas por mount
- sem reset espúrio do gate em eventos equivalentes de auth

Antes de tocar em qualquer operação de tenant.

## 10. Plano de implementação em etapas

### Etapa 0

Preparar arquitetura frontend sem integração operacional:
- estrutura de rotas
- shell protegido
- estados de loading/erro/negado

### Etapa 1

Implementar auth/session/profile gate:
- login
- bootstrap de sessão
- leitura de profile
- validação de `platform_admin`

### Etapa 2

Implementar shell visual aprovado:
- sidebar
- topbar
- área principal
- coluna lateral contextual

### Etapa 3

Conectar `Tenants` via:
- `vw_admin_tenants_list`
- `vw_admin_tenant_detail`

### Etapa 4

Conectar mutações administrativas já existentes por RPC:
- criar tenant
- atualizar status
- criar/atualizar contato

### Etapa 5

Abrir `Access / Memberships` via:
- leitura em `vw_admin_tenant_memberships`
- escrita via RPC existente

### Etapa 6

Abrir `System / Audit` via:
- leitura em `vw_admin_audit_feed`

### Etapa concluída localmente

- login real validado com fixture local de `platform_admin`
- `AuthBootstrap` e `AdminGate` validados com `vw_admin_auth_context`
- `/admin/tenants` validado com `vw_admin_tenants_list` e `vw_admin_tenant_detail`
- `/admin/access` validado com `vw_admin_tenant_memberships`
- `/admin/system` validado com `vw_admin_audit_feed`
- `/access-denied` validado para usuário autenticado sem role global

## 11. Riscos de UX e arquitetura

### UX

- transformar a home em dashboard abstrato em vez de tela operacional
- colocar auditoria cedo demais e poluir a leitura principal
- usar mascote no centro da tela densa
- confundir Admin Console com Support Desk

### Arquitetura

- consumir tabelas-base administrativas direto no frontend por conveniência
- deixar a validação de `platform_admin` só no cliente
- modelar navegação além do contrato existente
- abrir telas de tickets antes da hora
- manter entrada manual de `user_id` por tempo demais, sem contrato formal de busca global de usuários

## 12. Recomendação executiva

O frontend deve começar por:
- login
- gate
- shell

As telas operacionais de `Tenants`, `Access` e `System` já têm contratos
backend suficientes para começar. O ponto que continua exigindo disciplina é
manter o console restrito a views/RPCs contratuais e não abrir lookup ad hoc de
usuários ou módulos fora do escopo aprovado.
