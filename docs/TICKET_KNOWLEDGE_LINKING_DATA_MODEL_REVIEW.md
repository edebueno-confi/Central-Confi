# TICKET_KNOWLEDGE_LINKING_DATA_MODEL_REVIEW.md

## Objetivo
Definir o modelo minimo implementavel para o dominio de vinculo entre tickets e artigos da Knowledge Base, antes de qualquer migration. O foco desta fase e revisar integridade, boundary de permissao, superficie contratual futura e riscos de modelagem, sem materializar banco ou UI.

## Escopo do MVP
O MVP cobre apenas o registro auditavel do vinculo assistivo entre:
- um ticket existente
- um artigo existente quando aplicavel
- um tipo explicito de uso editorial/operacional

Fica fora do MVP:
- recomendacao automatica
- IA
- automacao editorial
- publicacao automatica
- portal B2B
- edicao de artigo a partir do ticket
- qualquer impacto automatico em status do ticket ou status editorial

## Entidade principal

### `ticket_knowledge_links`
Entidade canonica do dominio.

Campos minimos propostos:
- `id`
- `tenant_id`
- `ticket_id`
- `article_id`
- `link_type`
- `note`
- `created_by_user_id`
- `created_at`
- `archived_at`
- `archived_by_user_id`

## Responsabilidade de cada campo

### Identidade
- `id`: identidade tecnica do vinculo

### Isolamento operacional
- `tenant_id`: ancora o vinculo no mesmo tenant da tratativa e simplifica authz, auditoria e filtros de suporte

### Relacao com ticket e artigo
- `ticket_id`: ticket em que o uso do artigo foi observado
- `article_id`: artigo relacionado quando ja existir; pode ser nulo apenas nos tipos que representam lacuna ou sugestao sem alvo editorial materializado

### Intencao de uso
- `link_type`: motivo operacional do vinculo

### Contexto humano
- `note`: comentario curto e controlado do agente, nunca snapshot do artigo nem payload tecnico sensivel

### Trilhas de autoria e ciclo de vida
- `created_by_user_id`: ator que criou o vinculo
- `created_at`: momento da criacao
- `archived_at`: marca opcional de arquivamento logico
- `archived_by_user_id`: ator que arquivou o vinculo, quando aplicavel

## Enum proposto

### `ticket_knowledge_link_type`
Valores:
- `reference_internal`
- `sent_to_customer`
- `suggested_article`
- `documentation_gap`
- `needs_update`

## Leitura de cada tipo

### `reference_internal`
- artigo usado como referencia interna durante a tratativa
- aceita artigo `public`, `internal` ou `restricted`, desde que o ator tenha permissao de leitura

### `sent_to_customer`
- confirma que o agente enviou ao cliente um artigo publico
- exige artigo `public` e `published`
- nao aceita artigo `internal`, `restricted`, `draft`, `review` ou `archived`

### `suggested_article`
- registra que o ticket gerou sugestao de novo artigo ou rascunho futuro
- `article_id` pode ser nulo no MVP

### `documentation_gap`
- registra que nao existe artigo suficiente para o caso
- `article_id` pode ser nulo no MVP

### `needs_update`
- registra que existe artigo relacionado, mas inadequado, incompleto ou desatualizado
- `article_id` deve existir

## Regras de integridade

### Obrigatoriedades basicas
- `tenant_id` obrigatorio
- `ticket_id` obrigatorio
- `link_type` obrigatorio
- `created_by_user_id` obrigatorio
- `created_at` obrigatorio

### Regras de nulidade
- `article_id` obrigatorio para:
  - `reference_internal`
  - `sent_to_customer`
  - `needs_update`
- `article_id` opcional para:
  - `suggested_article`
  - `documentation_gap`

### Integridade de tenant
- o `ticket_id` deve pertencer ao mesmo `tenant_id` do vinculo
- quando `article_id` existir, o artigo deve pertencer ao mesmo tenant operacional do ticket ou ao mesmo `knowledge_space` autorizado que resolva esse tenant
- o modelo nao deve permitir vinculo cruzado entre ticket de um tenant e artigo de outro tenant/space nao autorizado

### Integridade editorial
- artigo `internal` ou `restricted` nunca pode ser marcado como `sent_to_customer`
- artigo em `draft`, `review` ou `archived` nunca pode ser marcado como `sent_to_customer`
- `sent_to_customer` exige combinacao:
  - `visibility = public`
  - `status = published`
- `reference_internal` pode apontar para `internal` e `restricted` apenas para atores internos autorizados
- `needs_update` pode apontar para artigo de qualquer visibilidade, porque a observacao e interna

### Integridade de arquivamento
- `archived_at` e `archived_by_user_id` devem nascer juntos
- vinculo arquivado sai da superficie operacional principal, mas permanece auditavel

## Unicidade recomendada
- nao criar unicidade global por `ticket_id + article_id + link_type`
- permitir mais de um vinculo do mesmo artigo no mesmo ticket quando o motivo de uso for diferente
- impedir apenas duplicidade acidental identica enquanto o vinculo estiver ativo, por exemplo:
  - mesmo `ticket_id`
  - mesmo `article_id`
  - mesmo `link_type`
  - `archived_at is null`

## O que deve virar coluna, enum ou regra

### Colunas obrigatorias
- todos os campos minimos acima

### Enum obrigatorio
- `ticket_knowledge_link_type`

### O que nao precisa existir no MVP
- `sent_at`
- `customer_visible_at`
- `resolution_outcome`
- `article_snapshot_md`
- `article_title_snapshot`
- `space_slug` denormalizado na tabela
- `visibility_snapshot`
- `status_snapshot`

Esses dados devem ser resolvidos pelo contrato de leitura a partir do artigo canonico, nao duplicados no vinculo.

## Dados sensiveis bloqueados
- corpo completo do artigo
- HTML do artigo
- tokens
- senhas
- chaves
- credenciais
- endpoints internos sensiveis
- payloads sigilosos de integracao
- stack traces longos
- nomes de views/RPCs ou detalhes de RLS no `note`

O `note` deve ser curto, operacional e sujeito a validacao de conteudo sensivel antes de persistir.

## Authz e RLS propostos

### Leitura
- `platform_admin` pode auditar globalmente
- `support_manager` e `support_agent` leem apenas vinculos do tenant em que possuem acesso operacional
- leitura do frontend deve ocorrer apenas por views contratuais, nunca por tabela-base

### Escrita
- suporte/CS autorizado pode criar vinculos permitidos no proprio tenant
- arquivamento deve seguir a mesma authz do tenant do ticket
- cliente B2B futuro nao le tabela-base nem view interna

### Regra futura do portal B2B
- cliente B2B so pode ver vinculos `sent_to_customer`
- mesmo assim, apenas quando o artigo for `public` e `published`
- `reference_internal`, `documentation_gap`, `suggested_article` e `needs_update` nunca vao para a superficie externa

## Views futuras propostas

### `vw_support_ticket_knowledge_links`
Finalidade:
- listar os vinculos ativos do ticket dentro do Support Workspace

Deve expor:
- titulo do artigo quando existir
- `link_type`
- nota resumida
- ator
- horario
- indicadores minimos de visibilidade operacional
- acoes futuras permitidas, como abrir artigo e copiar link publico quando aplicavel

Nao deve expor:
- `tenant_id`
- detalhes de RLS
- metadados tecnicos de banco
- corpo completo do artigo

### `vw_support_knowledge_article_picker`
Finalidade:
- alimentar a busca de artigos dentro do fluxo do ticket

Deve expor:
- `article_id`
- titulo
- summary curta
- categoria
- `visibility`
- `status`
- sinal de elegibilidade para `sent_to_customer`

Nao deve expor:
- `source_hash`
- `source_path`
- trilha editorial completa
- conteudo sensivel bruto

### `vw_customer_portal_ticket_knowledge_links`
Finalidade futura:
- exibir ao cliente apenas links publicos realmente enviados

Deve expor somente:
- artigo publico publicado
- titulo
- slug/url publica
- data do envio

## RPCs futuras propostas

### `rpc_support_link_ticket_article`
Uso:
- criar `reference_internal` ou `sent_to_customer` com `article_id`

### `rpc_support_archive_ticket_article_link`
Uso:
- arquivar logicamente um vinculo existente

### `rpc_support_mark_documentation_gap`
Uso:
- criar vinculo `documentation_gap`, com ou sem `article_id`

### `rpc_support_mark_article_needs_update`
Uso:
- criar vinculo `needs_update` contra artigo existente

Observacao:
- `suggested_article` pode nascer por `rpc_support_link_ticket_article` com modo explicito ou por RPC dedicada futura, mas o MVP ainda pode mante-lo dentro do mesmo boundary de escrita sem ampliar demais a superficie.

## Auditoria proposta

### Eventos auditaveis obrigatorios
- criacao de vinculo
- arquivamento de vinculo

### Before/after minimo
- `ticket_id`
- `article_id`
- `link_type`
- `note`
- `archived_at`
- `archived_by_user_id`

### O que nunca entra no audit
- `body_md`
- `content_html`
- snapshots completos do artigo
- payload confidencial
- segredo mascarado ou nao mascarado

## Impacto UI previsto

### Painel
- `Conhecimento relacionado`

### Acoes candidatas
- buscar artigo
- vincular como referencia interna
- copiar link publico
- marcar lacuna documental
- marcar artigo como desatualizado

### Regras de UX
- o painel deve ficar recolhivel
- nao pode competir com conversa e composer
- so mostra o essencial para decisao
- detalhes editoriais e tecnicos ficam escondidos

## Principais riscos de modelagem
- vazamento de artigo `restricted` ou `internal` para fluxo de envio ao cliente
- vinculo cruzado entre tenants ou spaces incompativeis
- transformar o vinculo em comentario solto sem integridade editorial
- duplicar corpo do artigo no ticket
- misturar backlog editorial com tratativa ativa de forma barulhenta
- abrir permissao ampla demais para suporte editar ou "corrigir" o artigo via ticket

## Decisoes do review
- existe uma unica entidade MVP: `ticket_knowledge_links`
- o vinculo e append-only com arquivamento logico, nao update livre
- `sent_to_customer` depende de artigo `public + published`
- `documentation_gap` e `suggested_article` podem existir sem `article_id`
- a superficie do app deve continuar baseada em views + RPCs
- cliente futuro nunca le as tabelas ou views internas do suporte

## Plano da proxima fase

### Fase 6.14
Desenhar:
- migration
- enum
- constraints
- helpers privados
- views
- RPCs
- pgTAP
- fixture local
- UI minima futura apenas como impacto, nao implementacao

### Ordem recomendada
1. migration design
2. teste de authz/RLS planejado
3. backend materializado
4. UI assistiva minima no ticket
