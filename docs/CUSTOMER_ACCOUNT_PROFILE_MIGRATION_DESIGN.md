# CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md

## Objetivo
Desenhar a migration da Fase 6.8 para materializar o perfil operacional do cliente B2B no Genius Support OS, sem criar banco nesta fase e sem inflar o domínio para um CRM genérico.

## Escopo deste design
- definir enums, tabelas, constraints, RLS, views e RPCs futuras
- fixar boundaries de leitura e escrita antes da materialização
- fixar guardrails de auditoria e segurança
- orientar a ordem de implementação da Fase 6.8

## Premissas
- `tenant_id` continua sendo a âncora operacional do cliente B2B
- o Customer Account Profile é domínio operacional de suporte/CS, não cadastro de shopper final
- backend continua sendo source of truth
- frontend nunca lerá tabelas-base desse domínio
- escrita administrativa continuará centralizada em RPCs auditadas
- nenhum segredo, credencial, token, endpoint sensível ou payload técnico sigiloso entra nesse domínio

## Enums propostos

### `customer_product_line`
Finalidade:
- classificar a linha principal de produto atendida pelo tenant

Valores iniciais propostos:
- `genius_returns`
- `after_sale`
- `hybrid`
- `other`

Observação:
- `hybrid` cobre o caso em que o mesmo tenant opera mais de uma linha com o mesmo perfil operacional
- se o portfólio por tenant crescer além desse resumo, a expansão futura deve nascer em entidade própria, não em `jsonb`

### `customer_operational_status`
Finalidade:
- representar a condição operacional atual do cliente

Valores iniciais propostos:
- `onboarding`
- `active`
- `limited`
- `suspended`
- `legacy`

### `customer_integration_type`
Finalidade:
- classificar a categoria operacional da integração

Valores iniciais propostos:
- `ecommerce_platform`
- `erp`
- `oms`
- `logistics_provider`
- `carrier`
- `gateway`
- `refund_provider`
- `custom_api`
- `other`

### `customer_integration_status`
Finalidade:
- mostrar o estado operacional resumido da integração

Valores iniciais propostos:
- `planned`
- `active`
- `degraded`
- `disabled`
- `deprecated`

### `customer_integration_environment`
Finalidade:
- resumir o ambiente em que a integração opera

Valores iniciais propostos:
- `production`
- `sandbox`
- `staging`
- `other`

### `customer_customization_risk_level`
Finalidade:
- sinalizar o impacto operacional de uma customização

Valores iniciais propostos:
- `low`
- `medium`
- `high`
- `critical`

### `customer_alert_severity`
Finalidade:
- priorizar alertas operacionais para suporte/CS

Valores iniciais propostos:
- `info`
- `warning`
- `high`
- `critical`

## Tabelas propostas

### `customer_account_profiles`
Finalidade:
- guardar o resumo operacional principal do cliente B2B

Colunas mínimas:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `product_line customer_product_line not null`
- `operational_status customer_operational_status not null`
- `account_tier text not null`
- `internal_notes text`
- `operational_flags jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by_user_id uuid not null references public.profiles(id)`
- `updated_by_user_id uuid references public.profiles(id)`

Decisões:
- um perfil principal por tenant no MVP
- `internal_notes` deve ser curta, governada e auditada
- `operational_flags` fica restrito a shape pequeno e conhecido

### `customer_account_integrations`
Finalidade:
- resumir a stack operacional do tenant em linhas auditáveis

Colunas mínimas:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `integration_type customer_integration_type not null`
- `provider text not null`
- `status customer_integration_status not null`
- `environment customer_integration_environment not null`
- `notes text`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by_user_id uuid not null references public.profiles(id)`
- `updated_by_user_id uuid references public.profiles(id)`

### `customer_account_features`
Finalidade:
- registrar módulos, capacidades e flags operacionais habilitadas

Colunas mínimas:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `feature_key text not null`
- `enabled boolean not null default false`
- `source text not null`
- `notes text`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by_user_id uuid not null references public.profiles(id)`
- `updated_by_user_id uuid references public.profiles(id)`

Observação:
- `feature_key` e `source` ficam como chaves controladas em aplicação/governança no primeiro corte, sem enum rígido

### `customer_account_customizations`
Finalidade:
- registrar exceções operacionais permanentes ou relevantes para a tratativa

Colunas mínimas:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `title text not null`
- `description text not null`
- `risk_level customer_customization_risk_level not null`
- `operational_note text`
- `status text not null`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by_user_id uuid not null references public.profiles(id)`
- `updated_by_user_id uuid references public.profiles(id)`

Observação:
- `status` pode nascer como texto controlado no MVP com domínio curto: `draft`, `active`, `deprecated`, `archived`

### `customer_account_alerts`
Finalidade:
- destacar avisos operacionais ativos que mudam a tratativa

Colunas mínimas:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `severity customer_alert_severity not null`
- `title text not null`
- `description text not null`
- `active boolean not null default true`
- `expires_at timestamptz`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`
- `created_by_user_id uuid not null references public.profiles(id)`
- `updated_by_user_id uuid references public.profiles(id)`

## Constraints propostas

### Constraints transversais
- `tenant_id` obrigatório em todas as tabelas
- `created_at` e `updated_at` obrigatórios em todas as tabelas
- `created_by_user_id` obrigatório nas criações
- `updated_by_user_id` obrigatório em updates backend-gerenciados
- `updated_at` e `updated_by_user_id` devem ser backend-managed
- `created_by_user_id` imutável após criação

### Constraints de unicidade
- `customer_account_profiles`
  - `unique (tenant_id)`
- `customer_account_integrations`
  - `unique (tenant_id, integration_type, provider, environment)`
- `customer_account_features`
  - `unique (tenant_id, feature_key)`
- `customer_account_customizations`
  - sem unicidade global por `title`; títulos podem repetir em tenants distintos
  - opcional futuro: `unique (tenant_id, title)` apenas se a curadoria mostrar valor real
- `customer_account_alerts`
  - sem unicidade por `title`, porque alertas podem ser renovados ou substituídos

### Checks de conteúdo
- todos os campos textuais centrais devem bloquear blank string via `nullif(btrim(...), '') is not null`
- `account_tier`, `provider`, `feature_key`, `source`, `title` e `description` não podem nascer vazios
- `expires_at` em alertas deve ser maior que `created_at` quando preenchido
- `operational_flags` deve ser objeto JSON, nunca array ou escalar

### `operational_flags` controlado
Shape inicial permitido:
- `high_touch_account`
- `custom_operational_flow`
- `financial_attention_required`
- `restricted_support_window`
- `integration_sensitive_account`

Regras:
- valores booleanos apenas
- sem chaves arbitrárias abertas pelo frontend
- validar shape em RPC futura com helper privado

### Bloqueio de dados sensíveis
Decisão de design:
- o bloqueio não deve depender só de `check` regex frágil
- a proteção deve combinar:
  - schema estreito sem colunas para segredo
  - tamanho limitado dos campos livres
  - validação obrigatória nas RPCs administrativas
  - testes pgTAP para payloads proibidos
  - auditoria sem ecoar valor sensível

Payloads que devem ser rejeitados:
- tokens
- senhas
- client secrets
- API keys
- refresh tokens
- bearer tokens
- endpoints internos sensíveis
- payloads de autenticação
- blobs técnicos longos copiados de integrações

## RLS e authz propostos

## Princípio
- nenhuma tabela-base será exposta diretamente a `anon` ou `authenticated`
- todas as tabelas nascem com RLS habilitado
- o frontend lê somente via views contratuais
- o frontend escreve somente via RPCs administrativas `SECURITY DEFINER`

### Tabelas-base
Grants esperados:
- `anon`: nenhum
- `authenticated`: nenhum `select`, `insert`, `update` ou `delete`
- `service_role`: operacional

Policies:
- políticas permissivas para app não são necessárias se as tabelas continuarem atrás de views/RPCs
- manter política deny-by-default
- caso alguma função futura use `security invoker`, ela deve depender de helpers privados explícitos

### Leitura administrativa
- `platform_admin`:
  - pode ler o contexto administrativo completo via `vw_admin_customer_account_profiles`
- `support_manager`:
  - não lê tabela-base
  - lê apenas o contexto operacional permitido por tenant via `vw_support_customer_account_context`
- `support_agent`:
  - mesma regra de `support_manager`, sempre dentro do tenant permitido

### Escrita administrativa
- `platform_admin`:
  - único papel garantido para criar e alterar profile, integrações, customizações, features e alertas no primeiro corte
- `support_manager`:
  - leitura operacional no MVP
  - sem escrita direta enquanto a governança de edição fina não estiver aprovada
- `support_agent`:
  - apenas leitura operacional

### Roles futuras de tenant e portal
- `tenant_admin`, `tenant_manager`, `tenant_requester` e `tenant_viewer` ficam fora do write path interno desta fase
- o futuro Portal B2B deve consumir somente `vw_customer_portal_account_context`
- qualquer role de cliente B2B deve receber apenas subconjunto explícito e seguro do domínio

## Views futuras

### `vw_support_customer_account_context`
Finalidade:
- resumir o contexto operacional útil ao ticket e à tela `/support/customers/:tenantId`

Deve expor:
- tenant e nome operacional
- `product_line`
- `operational_status`
- `account_tier`
- `operational_flags` seguros
- integrações principais resumidas
- features habilitadas relevantes
- customizações ativas de maior risco
- alertas ativos
- contatos operacionais úteis

Não deve expor:
- notas internas extensas
- histórico completo
- campos de auditoria completos
- qualquer payload proibido

Boundary:
- `platform_admin` vê tudo do tenant
- `support_manager` e `support_agent` veem apenas tenants permitidos por membership ativo

### `vw_admin_customer_account_profiles`
Finalidade:
- leitura administrativa consolidada para governança, revisão e manutenção

Deve expor:
- dados centrais do profile
- agregados de integrações, features, customizações e alertas
- `created_by`/`updated_by`
- timestamps
- flags operacionais

Não deve expor:
- segredos
- payloads livres extensos
- detalhes que o schema proibiu desde a origem

## RPCs futuras

### `rpc_admin_upsert_customer_account_profile`
- cria ou atualiza o profile principal do tenant
- valida enum, `account_tier`, `internal_notes` e `operational_flags`
- grava auditoria de create/update

### `rpc_admin_add_customer_integration`
- cria integração resumida por tenant
- valida `integration_type`, `provider`, `status`, `environment` e `notes`
- bloqueia duplicidade pela constraint contratual

### `rpc_admin_update_customer_integration`
- atualiza status, ambiente e nota operacional da integração
- não permite migrar integração para outro tenant
- exige auditoria before/after

### `rpc_admin_add_customer_customization`
- cria customização operacional
- valida `risk_level`, `status`, `title`, `description` e `operational_note`

### `rpc_admin_update_customer_customization`
- altera customização existente
- exige auditoria before/after
- não permite troca de `tenant_id`

### `rpc_admin_add_customer_account_alert`
- cria alerta ativo ou agendado
- valida `severity`, `title`, `description`, `expires_at`

### `rpc_admin_archive_customer_account_alert`
- desativa alerta ou arquiva logicamente
- não apaga fisicamente por padrão
- exige auditoria before/after

## Auditoria

### Mutações que geram audit log obrigatório
- create/update de `customer_account_profiles`
- create/update de `customer_account_integrations`
- create/update de `customer_account_features`
- create/update de `customer_account_customizations`
- create/archive de `customer_account_alerts`
- qualquer mudança em:
  - `product_line`
  - `operational_status`
  - `account_tier`
  - `operational_flags`
  - `risk_level`
  - `severity`
  - `active`

### Before/after esperado
Entram em `before`/`after` apenas campos contratuais seguros:
- ids
- `tenant_id`
- enums e status
- notas operacionais já validadas
- flags controladas
- `expires_at`
- `enabled`

Não entram:
- strings rejeitadas por validação
- payload original bloqueado por detector de segredo
- dados técnicos extensos

### Metadata de auditoria
Deve registrar:
- `actor_user_id`
- `tenant_id`
- `entity_type`
- `entity_id`
- `action`
- subconjunto pequeno de contexto operacional

Não deve registrar:
- segredos
- dumps de payload
- endpoints sensíveis
- texto bruto recusado por validação

## Segurança

### Proibições explícitas
- não armazenar tokens
- não armazenar senhas
- não armazenar chaves privadas
- não armazenar client secrets
- não armazenar endpoints internos sensíveis
- não armazenar payloads de autenticação
- não armazenar dumps de configuração de ERP, OMS, gateway ou carrier

### Estratégia de mitigação
- schema sem colunas para segredo
- validação RPC para texto proibido
- read models mínimos por superfície
- nenhum grant direto em tabela-base para o app
- portal B2B futuro recebe only-safe subset explícito

### Portal B2B futuro
Nunca deve ver:
- `internal_notes`
- alertas internos não compartilháveis
- customizações internas sensíveis
- riscos operacionais internos
- qualquer texto recusado pelo filtro de segurança

## Plano de testes pgTAP

### RLS e grants
- `authenticated` não lê `customer_account_profiles`
- `authenticated` não lê `customer_account_integrations`
- `authenticated` não lê `customer_account_features`
- `authenticated` não lê `customer_account_customizations`
- `authenticated` não lê `customer_account_alerts`
- grants corretos apenas em `vw_support_customer_account_context` e `vw_admin_customer_account_profiles`

### Cross-tenant
- `support_manager` não consegue ler contexto de tenant fora do membership permitido
- `support_agent` não consegue ler contexto de tenant fora do membership permitido
- `platform_admin` consegue ler todos os tenants apenas pela view administrativa

### Write path
- suporte lê, mas não escreve diretamente em tabela-base
- `platform_admin` escreve apenas por RPC
- DML direta por `authenticated` falha

### Segurança de conteúdo
- payload contendo `api_key`, `token`, `password`, `client_secret` ou `bearer` é rejeitado pela RPC
- `operational_flags` com shape inválido é rejeitado
- notas em branco são rejeitadas onde o campo for obrigatório

### Auditoria
- RPC de upsert profile gera audit log
- RPC de integração gera audit log
- RPC de customização gera audit log
- RPC de alerta gera audit log
- metadata auditada não ecoa segredo rejeitado

### Views
- `vw_support_customer_account_context` não depende de grant em tabela-base
- `vw_admin_customer_account_profiles` não depende de grant em tabela-base
- suporte enxerga subconjunto operacional
- admin enxerga resumo administrativo sem segredo

## Plano de implementação da Fase 6.8

### Ordem recomendada
1. criar enums
2. criar tabelas com FKs, uniques e checks
3. habilitar RLS e zerar grants de tabela-base para app
4. criar helpers privados de validação de texto seguro
5. criar views:
   - `vw_support_customer_account_context`
   - `vw_admin_customer_account_profiles`
6. criar RPCs administrativas
7. conectar auditoria nas RPCs
8. escrever pgTAP
9. atualizar `VIEW_RPC_CONTRACTS.md`, `PROJECT_STATE.md` e ledger
10. validar com typecheck, build, `supabase:verify` e CI

### Sequência de docs e validação
- primeiro materializar o contrato SQL e testes
- depois atualizar docs contratuais e de estado
- só então abrir a fase de UI do contexto enriquecido no Support Workspace

## Riscos restantes
- `account_tier`, `provider` e `source` ainda dependem de governança de catálogo sem virar enum rígido cedo demais
- o limite entre `internal_notes` úteis e observação livre demais precisa de validação forte nas RPCs
- se a Fase 6.8 tentar empurrar tudo para `vw_support_customer_360`, o domínio perderá clareza
- o portal B2B futuro precisará de superfície separada para não vazar contexto interno por conveniência

## Recomendação final
- materializar o domínio em tabelas dedicadas, ancoradas em `tenant_id`
- manter leitura do suporte curta e operacional
- manter escrita estritamente administrativa e auditada
- bloquear segredo por desenho de schema, validação de RPC e testes de contrato
- preservar o primeiro corte como contexto operacional do cliente B2B, não CRM comercial
