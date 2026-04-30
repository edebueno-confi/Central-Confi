# Admin Console Minimum Design

Date: 2026-04-29
Status: Approved for implementation planning, not for coding yet
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

Sem views contratuais administrativas dedicadas neste momento.

O que existe hoje:
- `public.profiles` com RLS
- `public.user_global_roles` com RLS
- `public.tenants` com RLS
- `public.tenant_memberships` com RLS
- `public.tenant_contacts` com RLS
- `audit.audit_logs` com RLS

### Observação crítica

Para ticketing, a regra canônica já foi formalizada como leitura por views e
escrita por RPCs. Para o Admin Console, a escrita já segue essa regra, mas a
leitura ainda depende de tabelas com RLS e não de read models contratuais
dedicados.

## 8. Lacunas de backend

### Lacuna principal

Faltam contratos de leitura administrativos formais para frontend.

Hoje não existem, por exemplo:
- `vw_admin_tenants_list`
- `vw_admin_tenant_detail`
- `vw_admin_tenant_memberships`
- `vw_admin_audit_feed`

### Impacto

Sem esses contratos, existem dois caminhos:

1. consumir tabelas-base com RLS no frontend
2. bloquear a parte operacional do console até o backend expor read models administrativos

### Recomendação

Preferir o caminho 2.

Motivo:
- mantém consistência com a regra canônica de leitura contratual
- evita acoplamento prematuro do frontend ao schema base
- reduz refactor futuro quando os read models forem formalizados

### Exceção controlada

Se for necessário abrir o shell antes dos read models, a única parte aceitável
é:
- login
- sessão
- gate de acesso
- shell protegido
- telas com estados reais de bloqueio ou indisponibilidade

Sem inventar dados e sem simular produto.

## 9. Estratégia de auth/session/profile gate

### Ordem de resolução

1. validar sessão autenticada
2. carregar `profile` do usuário autenticado
3. validar `profile.is_active = true`
4. carregar `user_global_roles` do próprio usuário
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
- profile real
- role global real

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

Conectar Tenants somente se houver contrato de leitura aceitável.

Se a lacuna persistir:
- manter a rota funcional
- mostrar estado real de indisponibilidade contratual
- não inventar dados

### Etapa 4

Conectar mutações administrativas já existentes por RPC:
- criar tenant
- atualizar status
- criar/atualizar contato

### Etapa 5

Abrir Access / Memberships com o mesmo critério:
- só depois de contrato de leitura aceitável
- escrita via RPC existente

### Etapa 6

Abrir System / Audit como leitura rastreável mínima

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

## 12. Recomendação executiva

O frontend deve começar por:
- login
- gate
- shell

E deve tratar a leitura operacional de `Tenants`, `Access` e `System` como
dependente de contratos administrativos de leitura mais claros. As RPCs de
escrita já existem e estão prontas para o momento em que a camada de leitura
for formalizada.
