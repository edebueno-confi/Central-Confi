# DATA_MODEL_STRATEGY.md

## Estratégia
Modelar o banco por domínios e por eixo de responsabilidade, com isolamento explícito, auditoria append-only e contratos claros de leitura/escrita.

## Princípio canônico atual
- `organization` = governança.
- `tenant` = operação.
- `knowledge_space` = marca / help center público.

Esse princípio evita colapsar conta operacional, marca e superfície pública em uma única entidade.

## Eixos de modelagem

### Governança
- `profiles`
- `user_global_roles`
- `organizations`
- `organization_memberships`

Responsabilidade:
- governança institucional;
- administração global;
- futura delegação editorial por organização.

### Operação
- `tenants`
- `tenant_memberships`
- `tenant_contacts`
- `tickets`
- `ticket_messages`
- `ticket_events`
- `ticket_assignments`
- `ticket_attachments`

Responsabilidade:
- isolamento operacional por conta/cliente;
- execução de suporte;
- histórico de atendimento.

Expansão futura aprovada em revisão documental:
- `customer_account_profiles`
- `customer_account_integrations`
- `customer_account_features`
- `customer_account_customizations`
- `customer_account_alerts`

Responsabilidade futura:
- contexto operacional persistente do cliente B2B;
- resumo de produto, plano, stack e customizações;
- alertas operacionais para suporte e CS;
- suporte ao futuro portal B2B sem virar CRM genérico.

### Conteúdo e superfície pública
- `knowledge_spaces`
- `knowledge_space_domains`
- `brand_settings`
- `knowledge_categories`
- `knowledge_articles`
- `knowledge_article_revisions`
- `knowledge_article_sources`

Responsabilidade:
- identidade editorial;
- branding;
- resolução futura de domínio/rota pública;
- versionamento e rastreabilidade da base de conhecimento.

### Auditoria e expansões futuras
- `audit.audit_logs`
- futuras entidades de engenharia
- futuras entidades de IA (`ai_sources`, `ai_chunks` ou equivalentes)

Responsabilidade:
- rastreabilidade transversal;
- acoplamento controlado de features futuras ao dado oficial.

## Relações canônicas
1. Uma `organization` pode conter múltiplos `tenants`.
2. Uma `organization` pode conter múltiplos `knowledge_spaces`.
3. Um `knowledge_space` pode apontar opcionalmente para um `owner_tenant_id`.
4. `tickets` continuam pertencendo a exatamente um `tenant`.
5. `knowledge_categories` e `knowledge_articles` caminham para escopo por `knowledge_space`, sem remover a compatibilidade atual com `tenant`.
6. `knowledge_article_revisions` e `knowledge_article_sources` continuam filhos do artigo.

## Estado de transição da Fase 4.3
- `tenants.organization_id` existe e nasce `nullable`.
- `knowledge_categories.knowledge_space_id` e `knowledge_articles.knowledge_space_id` já existem e o corpus atual foi backfilled para o space oficial `genius`.
- `organizations` agora nasce com a organization padrão `genius-group`.
- `knowledge_spaces` agora nasce com o space padrão `genius`/`Genius Returns`.
- `tenant_id` permanece nas entidades atuais de Knowledge Base para compatibilidade.
- As RPCs antigas ainda podem criar linhas com `knowledge_space_id = null` por compatibilidade.
- As RPCs e views v2 já operam com `knowledge_space_id` explícito.
- Não houve remoção de constraints legadas nesta fase.

## Regras de escopo por domínio

### Tabelas de governança
- Preferem `organization_id` como chave de agrupamento.
- Não devem depender de `tenant_id` para existir.

### Tabelas operacionais
- Preferem `tenant_id` como chave de isolamento.
- Devem continuar independentes de `knowledge_space` até existir necessidade operacional real.
- O futuro Customer Account Profile também deve nascer ancorado em `tenant_id`.
- Contrato resumido, stack, features, customizações e alertas pertencem ao eixo operacional do cliente B2B, não ao ticket e não ao `knowledge_space`.

### Tabelas editoriais e públicas
- Devem convergir para `knowledge_space_id` como escopo autoritativo.
- Enquanto houver convivência com legado, podem carregar `tenant_id` e `knowledge_space_id` simultaneamente.

## Regras de unicidade atuais
- `organizations.slug` é único globalmente.
- `knowledge_spaces.slug` é único globalmente.
- `knowledge_space_domains` é único por `(host, path_prefix)`.
- `knowledge_categories` já possui índice único parcial futuro por `(knowledge_space_id, parent_category_id, slug)` quando `knowledge_space_id is not null`.
- `knowledge_articles` já possui índice único parcial futuro por `(knowledge_space_id, slug)` quando `knowledge_space_id is not null`.
- As constraints legadas por `tenant_id` permanecem em vigor até a fase de backfill.

## Campos estruturais esperados
Nem toda tabela operacional precisa ter `tenant_id`; o campo de escopo correto depende do eixo do domínio.

Campos-base esperados quando aplicável:
- `id`
- chave de escopo (`organization_id`, `tenant_id` ou `knowledge_space_id`)
- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

## Guardrails aprovados para Customer Account Profile
- não armazenar segredos, tokens, credenciais ou payloads sensíveis de integração
- usar tabelas dedicadas para integrações, features, customizações e alertas
- permitir `jsonb` apenas para flags operacionais pequenas e controladas
- evitar modelo genérico de CRM comercial
- separar claramente o que é:
  - cadastro do cliente
  - contrato/plano
  - stack e integrações
  - customizações
  - alertas

## Desenho pré-migration da Fase 6.7
- o desenho técnico da migration agora está consolidado em `CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md`
- os enums fortes previstos ficam limitados a:
  - `customer_product_line`
  - `customer_operational_status`
  - `customer_integration_type`
  - `customer_integration_status`
  - `customer_integration_environment`
  - `customer_customization_risk_level`
  - `customer_alert_severity`
- `feature_key`, `source`, `provider` e `account_tier` permanecem como chaves controladas no primeiro corte, evitando rigidez prematura
- nenhuma tabela-base desse domínio deve ser lida diretamente pelo app; suporte e administração leem apenas por views contratuais futuras
- a escrita prevista para a Fase 6.8 continua exclusivamente em RPCs administrativas auditadas
- o bloqueio de dados sensíveis não deve depender de regex solta no frontend: ele nasce da combinação de schema estreito, validação de RPC e testes pgTAP

## Histórico
Nunca sobrescrever histórico relevante.

Regras:
- mudanças de status, atribuição, publicação e revisão devem preservar trilha histórica;
- ticketing usa eventos append-only;
- Knowledge Base usa revisões append-only;
- mutações administrativas relevantes devem gerar `audit.audit_logs`.

## Exclusão
Preferir status, arquivamento ou desativação lógica.

Regras:
- não apagar fisicamente dados operacionais sem política explícita;
- `knowledge_space` e `organization` devem preferir `status` antes de remoção;
- exclusão física só é aceitável quando não comprometer rastreabilidade e contratos.
