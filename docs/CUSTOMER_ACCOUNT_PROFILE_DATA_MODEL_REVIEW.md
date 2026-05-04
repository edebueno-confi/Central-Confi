# CUSTOMER_ACCOUNT_PROFILE_DATA_MODEL_REVIEW.md

## Objetivo
Definir o modelo mínimo implementável para o perfil operacional do cliente B2B no Genius Support OS, sem criar migration nesta fase e sem expandir o produto para um CRM genérico.

## Escopo desta revisão
- traduzir `CUSTOMER_ACCOUNT_PROFILE_SPEC.md` para entidades mínimas de MVP
- decidir o que deve nascer como tabela dedicada
- decidir o que pode virar enum ou chave controlada
- decidir o que pode ser `jsonb` e o que deve ser proibido no MVP
- mapear o que pode aparecer no Support Workspace e no futuro Portal B2B
- propor contracts futuros de leitura e escrita sem implementá-los agora

## Premissas de modelagem
- `tenant` continua sendo a âncora operacional do cliente
- o perfil operacional do cliente é um domínio adjacente ao ticket, não um subcampo do ticket
- o domínio não substitui contrato comercial completo nem catálogo de integrações secreto
- não armazenar credenciais, tokens, segredos, endpoints sensíveis nem payloads de configuração detalhada
- suporte precisa de contexto suficiente para responder melhor; não precisa ver todos os dados de implantação

## Proposta de entidades mínimas

### 1. `customer_account_profiles`
Finalidade:
- guardar o resumo operacional estável do cliente B2B
- servir como ponto de entrada para o Support Workspace e para a governança administrativa

Campos mínimos propostos:
- `id`
- `tenant_id`
- `product_line`
- `operational_status`
- `account_tier`
- `internal_notes`
- `operational_flags`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Decisões de modelagem:
- `tenant_id`: FK obrigatória, `unique`, porque o MVP assume um perfil operacional principal por tenant
- `product_line`: enum controlado ou chave enum-like
- `operational_status`: enum controlado
- `account_tier`: enum controlado ou string controlada, dependendo da volatilidade do catálogo comercial
- `internal_notes`: texto curto governado, não campo livre ilimitado
- `operational_flags`: `jsonb` controlado com shape pequeno e validável

O que entra em `operational_flags` no MVP:
- `high_touch_account`
- `custom_operational_flow`
- `financial_attention_required`
- `restricted_support_window`
- `integration_sensitive_account`

O que não deve entrar:
- blobs arbitrários
- settings profundos
- payloads comerciais grandes
- secrets

### 2. `customer_account_integrations`
Finalidade:
- resumir a stack do cliente em nível operacional

Campos mínimos propostos:
- `id`
- `tenant_id`
- `integration_type`
- `provider`
- `status`
- `environment`
- `notes`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Decisões de modelagem:
- tabela dedicada, porque um tenant pode ter múltiplas integrações por tipo
- `integration_type`: enum controlado
- `provider`: texto controlado ou enum expansível
- `status`: enum controlado
- `environment`: enum curto (`production`, `sandbox`, `staging`, `other`)
- `notes`: texto operacional curto

O que não deve existir no MVP:
- `sensitive_metadata` livre
- segredos
- chaves de API
- tokens OAuth
- URLs internas confidenciais
- configurações técnicas detalhadas de baixo nível

Se algum dia houver necessidade de metadado adicional:
- usar tabela/cofre separado
- nunca acoplar segredos ao perfil operacional

### 3. `customer_account_features`
Finalidade:
- registrar módulos e capacidades habilitados de forma operacional

Campos mínimos propostos:
- `id`
- `tenant_id`
- `feature_key`
- `enabled`
- `source`
- `notes`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Decisões de modelagem:
- tabela dedicada, porque habilitação por feature é naturalmente N por tenant
- `feature_key`: chave controlada, não enum rígido de banco no primeiro corte
- `enabled`: boolean
- `source`: enum curto (`contract`, `pilot`, `ops_override`, `migration`, `other`)
- `notes`: texto curto opcional

Por que não guardar isso em `jsonb` dentro do profile:
- o suporte precisará filtrar, auditar e comparar features habilitadas
- features tendem a crescer e pedem granularidade

### 4. `customer_account_customizations`
Finalidade:
- registrar exceções operacionais e customizações relevantes para suporte/CS

Campos mínimos propostos:
- `id`
- `tenant_id`
- `title`
- `description`
- `risk_level`
- `operational_note`
- `status`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Decisões de modelagem:
- tabela dedicada, porque customizações têm ciclo próprio e pluralidade natural
- `risk_level`: enum controlado
- `status`: enum curto (`active`, `draft`, `deprecated`, `archived`)
- `title` e `description`: textos legíveis para suporte
- `operational_note`: campo adicional mais curto para guidance de atendimento

O que não deve entrar:
- código
- payload técnico extenso
- cópia de contrato
- segredos

### 5. `customer_account_alerts`
Finalidade:
- destacar avisos operacionais temporários ou permanentes que devem mudar a tratativa

Campos mínimos propostos:
- `id`
- `tenant_id`
- `severity`
- `title`
- `description`
- `active`
- `expires_at`
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Decisões de modelagem:
- tabela dedicada, porque alerta é objeto operacional próprio, temporal e auditável
- `severity`: enum controlado
- `active`: boolean
- `expires_at`: opcional, para alertas temporários

Por que não colocar em `operational_flags`:
- alerta tem texto, severidade, ciclo e expiração
- suporte precisa diferenciar flag estrutural de alerta operacional ativo

## O que precisa ser tabela
Deve nascer como tabela dedicada no MVP:
- `customer_account_profiles`
- `customer_account_integrations`
- `customer_account_features`
- `customer_account_customizations`
- `customer_account_alerts`

Motivos:
- cardinalidade natural de 1:N em integrações, features, customizações e alertas
- necessidade de auditoria clara
- necessidade de leitura resumida em views futuras
- necessidade de arquivamento ou status próprios

## O que pode ser enum
Candidatos fortes a enum de banco:
- `product_line`
- `operational_status`
- `integration_type`
- `status` de integração
- `environment`
- `risk_level`
- `severity`

Observação:
- `account_tier` e `provider` são mais voláteis e podem começar como texto controlado por aplicação/governança em vez de enum rígido de banco
- `feature_key` deve começar como chave controlada, não enum, para não travar a evolução de módulos

## O que pode ser `jsonb` controlado
No MVP, apenas:
- `operational_flags` em `customer_account_profiles`

Regras:
- shape pequeno
- chaves conhecidas
- sem arbitragem livre pelo frontend
- validação de objeto em RPC futura

Tudo o mais deve evitar `jsonb` no MVP porque:
- piora leitura contratual
- esconde estrutura
- dificulta auditoria
- incentiva virar “CRM saco de gatos”

## O que não deve existir no MVP
- entidade genérica de “contas comerciais”
- funil comercial
- oportunidade
- receita
- histórico de relacionamento amplo
- atividades estilo CRM genérico
- segredos e credenciais
- dump de configuração técnica
- catálogo genérico de documentos sem governança
- modelagem de shopper final

## Dados sensíveis bloqueados
Nunca devem ser armazenados no perfil operacional:
- API keys
- tokens
- segredos OAuth
- endpoints internos sensíveis
- credenciais de ERP, gateway, transportadora ou OMS
- payloads de autenticação
- dados financeiros sigilosos além do estritamente operacional

Podem existir apenas como referência resumida:
- nome do provider
- status da integração
- ambiente
- nota operacional de alto nível

## O que pode aparecer no Support Workspace
No ticket e no customer context futuro, pode aparecer:
- nome comercial e razão social resumida
- produto ativo
- status operacional
- plano/tier resumido
- features habilitadas relevantes
- stack principal resumida
- customizações relevantes
- alertas ativos
- contatos por finalidade

Deve ficar recolhido ou resumido:
- notas internas extensas
- lista longa de integrações
- histórico de customizações antigas

## O que pode aparecer no futuro Portal B2B
Pode aparecer, sob contrato próprio:
- produto ativo
- features habilitadas relevantes
- stack pública relevante em alto nível
- contatos mantidos pelo próprio cliente
- alertas compartilháveis com o cliente

Não deve aparecer:
- notas internas
- riscos internos
- restrições de atendimento internas
- alertas internos
- customizações sensíveis
- qualquer detalhe técnico sensível de integração

## Dados que exigem auditoria obrigatória
Devem gerar trilha auditável obrigatória:
- criação e edição do `customer_account_profile`
- mudança de `product_line`
- mudança de `operational_status`
- mudança de `account_tier`
- criação e edição de integrações
- criação e edição de customizações
- criação, ativação, desativação e expiração de alertas
- mudança de feature habilitada

## Leitura futura proposta

### `vw_support_customer_account_context`
Finalidade:
- read model enxuto para suporte dentro do workspace

Deve trazer:
- resumo do profile
- contatos relevantes
- features principais
- integrações principais
- customizações ativas de alto impacto
- alertas ativos

Não deve trazer:
- listas infinitas
- detalhes sensíveis
- todo o histórico administrativo

### `vw_admin_customer_account_profiles`
Finalidade:
- leitura administrativa consolidada para governança e manutenção do perfil

Deve trazer:
- todos os campos do profile
- resumos agregados de integrações, features, customizações e alertas
- estado de auditoria e atualização

### `vw_customer_portal_account_context`
Finalidade:
- leitura futura para o próprio cliente B2B

Deve trazer:
- subconjunto explícito e seguro do contexto
- nada interno
- nada sensível

## RPCs futuras propostas
- `rpc_admin_upsert_customer_account_profile`
- `rpc_admin_add_customer_integration`
- `rpc_admin_update_customer_integration`
- `rpc_admin_add_customer_customization`
- `rpc_admin_update_customer_customization`
- `rpc_admin_add_customer_account_alert`
- `rpc_admin_archive_customer_account_alert`

Complementos recomendados, se o desenho avançar:
- `rpc_admin_set_customer_feature_flag`
- `rpc_admin_remove_customer_integration`

## Riscos de modelagem
- misturar contrato, stack e observações livres no mesmo registro
- usar `jsonb` demais e perder estrutura
- transformar suporte em CRM comercial
- colocar segredo técnico no perfil por conveniência
- despejar o perfil inteiro em `vw_support_customer_360`
- permitir edição ampla por suporte sem governança

## Plano faseado de implementação

### Fase 6.6
- aprovar este review
- fechar corte mínimo do modelo

### Fase 6.7
- desenhar migration mínima
- definir enums reais, FKs, unicidades e auditoria

### Fase 6.8
- materializar backend:
  - tabelas
  - views
  - RPCs
  - pgTAP

### Fase 6.9
- expor resumo do perfil no Support Workspace
- evoluir `/support/customers/:tenantId`

### Fase 6.10
- avaliar superfície controlada para portal B2B

## Recomendação técnica final
- modelar o perfil operacional do cliente como domínio próprio, ancorado em `tenant_id`
- manter somente um profile principal por tenant no MVP
- tratar integrações, features, customizações e alertas como tabelas separadas
- permitir apenas `jsonb` pequeno e controlado para flags operacionais
- bloquear segredos e configuração sensível fora desse domínio
- manter o primeiro read model de suporte curto, sintético e orientado à tratativa
