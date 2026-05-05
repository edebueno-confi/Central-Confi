# TICKET_KNOWLEDGE_LINKING_MIGRATION_DESIGN.md

## Objetivo
Desenhar tecnicamente a futura migration do dominio de vinculo ticket -> Knowledge Base antes de materializar banco. Esta fase fecha ordem de criacao, enum, tabela, constraints, helpers privados, views, RPCs, auditoria e plano pgTAP, sem aplicar qualquer alteracao de schema.

## Premissas
- ticket continua sendo a source of truth da tratativa
- artigo continua sendo a source of truth do conteudo
- o vinculo e assistivo, nunca automatizado
- o frontend nao le tabela-base
- a escrita futura deve ocorrer apenas por RPC
- o modelo precisa bloquear vazamento de artigos `internal` e `restricted`
- `sent_to_customer` precisa garantir artigo `public` e `published`

## Ordem recomendada da futura migration
1. criar enum `ticket_knowledge_link_type`
2. criar helper privado de validacao de conteudo sensivel em `note`
3. criar helpers privados de authz e integridade ticket/artigo
4. criar tabela `public.ticket_knowledge_links`
5. criar indices e uniqueness parcial de vinculo ativo
6. habilitar RLS e policies de deny-by-default
7. revogar acesso direto da tabela-base para `anon` e `authenticated`
8. criar views contratuais
9. criar RPCs `SECURITY DEFINER`
10. conceder `SELECT` apenas nas views e `EXECUTE` apenas nas RPCs
11. adicionar pgTAP estrutural e comportamental

## Enum futuro

### `ticket_knowledge_link_type`
Valores:
- `reference_internal`
- `sent_to_customer`
- `suggested_article`
- `documentation_gap`
- `needs_update`

## Tabela futura

### `public.ticket_knowledge_links`
Campos:
- `id uuid primary key default gen_random_uuid()`
- `tenant_id uuid not null references public.tenants(id)`
- `ticket_id uuid not null references public.tickets(id)`
- `article_id uuid null references public.knowledge_articles(id)`
- `link_type public.ticket_knowledge_link_type not null`
- `note text null`
- `created_by_user_id uuid not null references public.profiles(id)`
- `created_at timestamptz not null default timezone('utc', now())`
- `archived_at timestamptz null`
- `archived_by_user_id uuid null references public.profiles(id)`

## Colunas e responsabilidades

### `tenant_id`
- ancora o vinculo no tenant da tratativa
- simplifica authz, auditoria e filtros de suporte
- nao deve depender do frontend para ser coerente com `ticket_id`

### `ticket_id`
- aponta para o ticket em que o uso do artigo foi observado

### `article_id`
- aponta para o artigo quando houver alvo editorial existente
- permanece nulo apenas em `documentation_gap` e `suggested_article`

### `link_type`
- descreve a intencao operacional do vinculo

### `note`
- comentario humano curto
- nao deve armazenar segredo, payload tecnico sensivel nem snapshot do artigo

### `archived_at` e `archived_by_user_id`
- implementam archive logico
- o dominio nao deve permitir `delete` fisico como caminho do app

## Constraints futuras

### Obrigatoriedades basicas
- `tenant_id` obrigatorio
- `ticket_id` obrigatorio
- `link_type` obrigatorio
- `created_by_user_id` obrigatorio
- `created_at` obrigatorio

### Nulidade de `article_id`
Check recomendado:
- `article_id is not null` para:
  - `reference_internal`
  - `sent_to_customer`
  - `needs_update`
- `article_id is null or not null` permitido para:
  - `documentation_gap`
  - `suggested_article`

Em SQL, isso deve virar `check` explicito por `link_type`.

### Archive logico coerente
Checks recomendados:
- `archived_at is null and archived_by_user_id is null`
  ou
- `archived_at is not null and archived_by_user_id is not null`

### Nota controlada
- `note` opcional
- se existir, tamanho maximo controlado no banco
- validacao semantica de conteudo sensivel fica no helper privado e nas RPCs, nao em regex solta no frontend

### Unicidade parcial recomendada
Indice unico parcial para evitar duplicidade acidental de vinculo ativo:
- `unique (ticket_id, article_id, link_type)`
- `where archived_at is null and article_id is not null`

Observacao:
- nao aplicar essa unicidade a `documentation_gap` ou `suggested_article` sem `article_id`
- nao impedir que o mesmo ticket tenha mais de um tipo de vinculo sobre o mesmo artigo

## Integridade cross-entity

### Ticket e tenant
Regra:
- `ticket_id` deve pertencer ao mesmo `tenant_id`

Implementacao sugerida:
- helper privado retorna o ticket e valida tenant
- RPC popula `tenant_id` a partir do ticket, nao por confianca no input do app

### Artigo e tenant/space
Regra:
- quando `article_id` existir, o artigo precisa estar no mesmo tenant operacional do ticket ou em `knowledge_space` autorizado a esse tenant

Direcao do MVP:
- como o dominio atual ainda preserva compatibilidade entre `tenant_id` e `knowledge_space_id`, a validacao deve aceitar:
  - artigo com `tenant_id = tenant_id do ticket`
  - artigo em `knowledge_space` resolvido como permitido para esse tenant

Importante:
- a coerencia tenant/space deve ficar em helper privado; nao deve sobrar para a view ou para o frontend

### Elegibilidade para `sent_to_customer`
Regra:
- `sent_to_customer` exige artigo:
  - `visibility = public`
  - `status = published`

Bloqueios:
- `internal` e `restricted` nunca podem ser `sent_to_customer`
- `draft`, `review` e `archived` nunca podem ser `sent_to_customer`

### Referencia interna
Regra:
- `reference_internal` pode apontar para `public`, `internal` e `restricted`
- a view e a RPC futura ainda precisam respeitar leitura autorizada do caller

## Helpers privados futuros

Todos em `app_private`, `SECURITY DEFINER` apenas quando estritamente necessario, com `SET search_path = ''`.

### `app_private.can_manage_ticket_knowledge_links(p_ticket_id uuid)`
Finalidade:
- validar se o caller pode operar vinculos nesse ticket

Deve considerar:
- `platform_admin`
- `support_manager`
- `support_agent`
- membership ativo no tenant quando exigido pelo dominio de suporte

### `app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id uuid)`
Finalidade:
- carregar ticket com `tenant_id`
- falhar se o ticket nao existir

### `app_private.resolve_ticket_knowledge_link_article(p_article_id uuid)`
Finalidade:
- carregar artigo com:
  - `tenant_id`
  - `knowledge_space_id`
  - `visibility`
  - `status`
  - `slug`
  - `title`

### `app_private.validate_ticket_knowledge_article_access(p_ticket_id uuid, p_article_id uuid, p_link_type public.ticket_knowledge_link_type)`
Finalidade:
- impedir cross-tenant e cross-space nao autorizado
- validar visibilidade e status conforme `link_type`
- bloquear `sent_to_customer` indevido

### `app_private.assert_ticket_knowledge_note_safe(p_note text)`
Finalidade:
- bloquear tokens, senhas, chaves, payloads sensiveis, endpoints sensiveis e dump tecnico em `note`
- limitar comprimento e padronizar whitespace quando necessario

### `app_private.ticket_knowledge_link_audit_payload(...)`
Finalidade:
- construir payload enxuto de auditoria
- nunca incluir `body_md`, HTML ou metadados sensiveis do artigo

## RLS e authz futuros

### Tabela-base
- `enable row level security`
- `force row level security`

### Principio
- tabela-base fechada para o app
- frontend le apenas por views
- frontend escreve apenas por RPCs
- policies existem como camada de seguranca adicional, nao como contrato de uso do client

### Leitura base table
Mesmo com RLS, `authenticated` nao deve receber `SELECT` direto em `ticket_knowledge_links`.

### Escrita base table
`authenticated` nao deve receber `INSERT`, `UPDATE` ou `DELETE` direto.

### Papel de auditoria global
- `platform_admin` audita por `vw_support_ticket_knowledge_links` e futura view administrativa, nao por tabela-base no frontend

## Views futuras

### `vw_support_ticket_knowledge_links`
Finalidade:
- mostrar vinculos ativos de conhecimento no ticket

Campos sugeridos:
- `ticket_knowledge_link_id`
- `ticket_id`
- `link_type`
- `note`
- `created_at`
- `created_by_user_id`
- `created_by_full_name`
- `article_id`
- `article_title`
- `article_slug`
- `article_visibility`
- `article_status`
- `is_customer_send_allowed`

Regras:
- so retorna vinculos ativos (`archived_at is null`)
- so retorna artigos que o caller pode usar/ver no contexto interno
- nao expoe `tenant_id`, `knowledge_space_id`, `source_hash`, `source_path` nem corpo do artigo

### `vw_support_knowledge_article_picker`
Finalidade:
- busca operacional de artigos no fluxo do ticket

Campos sugeridos:
- `ticket_id`
- `article_id`
- `article_title`
- `article_slug`
- `article_summary`
- `category_name`
- `article_visibility`
- `article_status`
- `is_customer_send_allowed`

Regras:
- restringe universo ao tenant/space permitido do ticket
- expoe `internal` e `restricted` apenas a atores internos autorizados
- nao expoe detalhes editoriais brutos

### `vw_customer_portal_ticket_knowledge_links`
Finalidade futura:
- portal B2B so ve artigos realmente enviados ao cliente

Campos sugeridos:
- `ticket_id`
- `article_id`
- `article_title`
- `article_slug`
- `sent_at`

Regras:
- filtra apenas `link_type = sent_to_customer`
- filtra apenas artigo `public` + `published`
- nao expoe `note`, referencias internas ou backlog editorial

## RPCs futuras

Todas devem ser `SECURITY DEFINER`, `SET search_path = ''`, `EXECUTE` explicito para `authenticated`.

### `rpc_support_link_ticket_article`
Entrada sugerida:
- `p_ticket_id`
- `p_article_id`
- `p_link_type`
- `p_note`

Uso:
- cria `reference_internal`
- cria `sent_to_customer`
- pode aceitar `suggested_article` apenas quando `article_id` existir e isso nao ampliar demais o boundary

Checks obrigatorios:
- authz do ticket
- validade do artigo
- elegibilidade `public + published` para `sent_to_customer`
- bloqueio de conteudo sensivel em `note`
- bloqueio de duplicidade acidental ativa

### `rpc_support_archive_ticket_article_link`
Entrada sugerida:
- `p_ticket_knowledge_link_id`

Uso:
- aplica archive logico
- preenche `archived_at` e `archived_by_user_id`
- gera audit log

### `rpc_support_mark_documentation_gap`
Entrada sugerida:
- `p_ticket_id`
- `p_note`
- `p_article_id` opcional

Uso:
- cria `documentation_gap`

### `rpc_support_mark_article_needs_update`
Entrada sugerida:
- `p_ticket_id`
- `p_article_id`
- `p_note`

Uso:
- cria `needs_update`

## Auditoria futura

### Eventos obrigatorios
- criacao de vinculo
- archive logico de vinculo

### Tabela alvo
- `audit.audit_logs`

### Before/after minimo
Create:
- `tenant_id`
- `ticket_id`
- `article_id`
- `link_type`
- `note`

Archive:
- `archived_at`
- `archived_by_user_id`

### Conteudo proibido no audit
- corpo completo do artigo
- HTML do artigo
- JSON editorial bruto
- payloads sigilosos
- segredos

## Plano pgTAP futuro

### Grants e ACL
- `authenticated` sem `SELECT` direto em `ticket_knowledge_links`
- `authenticated` sem `INSERT`, `UPDATE`, `DELETE` direto em `ticket_knowledge_links`
- views futuras com `SELECT` explicito
- RPCs futuras com `EXECUTE` explicito

### RLS e cross-tenant
- suporte autorizado cria vinculo no proprio tenant
- usuario sem permissao nao cria
- tenant A nao vincula artigo do tenant B
- ticket de tenant A nao recebe artigo fora do tenant/space permitido

### Integridade editorial
- artigo `internal` e `restricted` bloqueados para `sent_to_customer`
- artigo `draft`, `review` e `archived` bloqueados para `sent_to_customer`
- artigo `public + published` permitido para `sent_to_customer`
- `reference_internal` permitido para artigo `internal` e `restricted` quando o caller for autorizado

### Archive logico
- archive nao apaga linha
- archive preenche `archived_at` e `archived_by_user_id`
- vinculo arquivado sai da view operacional ativa

### Auditoria
- create gera audit log
- archive gera audit log
- audit nao duplica corpo completo do artigo

### Surface contract
- frontend continua sem `SELECT` direto na tabela-base
- views nao vazam `tenant_id`, `source_hash`, `source_path`, `body_md` ou detalhes de seguranca

## Riscos restantes
- a validacao tenant/space pode ficar fragil se tentar depender de frontend ou de join solto na view
- `suggested_article` ainda pode pedir RPC dedicada futura se o fluxo editorial crescer
- `note` sem helper forte pode virar canal de vazamento tecnico
- o portal B2B futuro pode herdar referencia interna por conveniencia se nao existir view dedicada e restrita

## Plano da proxima fase

### Fase 6.15
Materializar:
- enum
- tabela
- helpers privados
- views
- RPCs
- pgTAP
- fixture local minima

### Ordem operacional recomendada
1. migration do enum e tabela
2. helpers privados de authz, integridade e `note`
3. RLS e ACL fechadas
4. views contratuais
5. RPCs
6. pgTAP
7. fixture local
8. docs e validacao

