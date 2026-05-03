# KNOWLEDGE_BASE_STRATEGY.md

## Objetivo
Criar a base editorial do Genius Support OS com versionamento, trilha de origem e governança suficiente para operar conteúdo interno primeiro e preparar documentação pública técnica para clientes B2B e usuários da plataforma, sem abrir Central Pública nesta fase.

## Princípio canônico atual
- `knowledge_space` é a unidade editorial e pública da plataforma.
- `tenant` continua como eixo operacional e de compatibilidade da KB atual.
- `organization` é a camada de governança acima dos spaces e tenants.

## Escopo atual
- Núcleo de domínio materializado em:
  - `knowledge_spaces`
  - `knowledge_space_domains`
  - `brand_settings`
  - `knowledge_categories`
  - `knowledge_articles`
  - `knowledge_article_revisions`
  - `knowledge_article_sources`
- Read models administrativos internos:
  - `vw_admin_knowledge_spaces`
  - `vw_admin_knowledge_categories`
  - `vw_admin_knowledge_articles_list`
  - `vw_admin_knowledge_article_detail`
  - `vw_admin_knowledge_categories_v2`
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`
- Read models públicos endurecidos:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- Busca pública textual mínima:
  - `rpc_public_search_knowledge_articles`
- Mutações editoriais administrativas:
  - `rpc_admin_create_knowledge_category`
  - `rpc_admin_create_knowledge_article_draft`
  - `rpc_admin_update_knowledge_article_draft`
  - `rpc_admin_submit_knowledge_article_for_review`
  - `rpc_admin_publish_knowledge_article`
  - `rpc_admin_archive_knowledge_article`
  - `rpc_admin_create_knowledge_category_v2`
  - `rpc_admin_create_knowledge_article_draft_v2`
  - `rpc_admin_update_knowledge_article_draft_v2`
  - `rpc_admin_submit_knowledge_article_for_review_v2`
  - `rpc_admin_publish_knowledge_article_v2`
  - `rpc_admin_archive_knowledge_article_v2`
- Pipeline legado local-only:
  - `scripts/knowledge/import-octadesk-drafts.mjs`

## Estado de transição multi-brand
- `knowledge_spaces`, `knowledge_space_domains` e `brand_settings` existem como fundação estrutural aditiva.
- O `knowledge_space` oficial atual é `genius` com `display_name = Genius Returns`.
- A `organization` oficial atual é `genius-group` com `display_name = Genius Group`.
- `knowledge_categories.knowledge_space_id` e `knowledge_articles.knowledge_space_id` existem, mas permanecem `nullable`.
- `knowledge_categories.tenant_id` e `knowledge_articles.tenant_id` continuam vigentes para compatibilidade.
- O corpus atual da Knowledge Base já foi associado ao `knowledge_space_id` oficial `genius`.
- As RPCs atuais da KB continuam funcionando sem `knowledge_space_id` e ainda podem criar conteúdo com esse campo nulo.
- As RPCs e views v2 já operam com `knowledge_space_id` explícito.
- O import legado Octadesk agora exige destino space-aware por `--space-slug` ou `--knowledge-space-id`.
- A curadoria administrativa mínima do frontend agora opera em `/admin/knowledge` consumindo apenas a superfície v2 space-aware.

## Regras estruturais novas
- `knowledge_spaces.slug` é único globalmente.
- Cada rota pública futura deve ser resolvida por `knowledge_space`.
- `knowledge_space_domains` reserva a combinação `(host, path_prefix)` por space.
- A unicidade futura de categorias e artigos por space já foi preparada por índices parciais em `knowledge_space_id`, sem remover as constraints atuais por `tenant_id`.
- A camada pública lê apenas views aprovadas e expõe somente spaces ativos com artigos `published` + `public`.
- A busca pública lê apenas o recorte `published` + `public` em spaces ativos e retorna somente metadados mínimos de resultado.

## Inventário legado atual
Origem oficial preservada:
- `raw_knowledge/octadesk_export/latest/articles/`

Resultado do inventário atual:
- `58` artigos detectados por `article.json`
- `3` categorias-raiz:
  - `Configurações` (`45`)
  - `Cadastros` (`8`)
  - `Erros comuns e soluções` (`5`)
- `1` grupo de duplicidade por `source_hash`
- múltiplos candidatos sensíveis/restritos ligados a integrações, permissões, segurança, estorno, PIX e Correios

Metadados brutos observados em `article.json`:
- `id`
- `articleId`
- `title`
- `url`
- `status`
- `categoryId`
- `categoryTitle`
- `categoryUrl`
- `sectionId`
- `sectionTitle`
- `sectionUrl`
- `permission`
- `plainText`
- `contentHtml`
- `articleDirRelative`
- `assets`

## Regras de ingestão legado
- `article.json` é metadado bruto.
- `content.txt` é a fonte textual principal.
- `content.raw.html` e `content.local.html` são apenas referência auxiliar.
- HTML legado nunca vira UI, layout ou corpo principal publicado.
- Todo conteúdo importado entra como `draft`.
- Toda origem importada deve preservar:
  - `source_path`
  - `source_hash`
- Em caso de dúvida editorial ou sensibilidade:
  - usar `visibility = restricted`
- Sem dúvida forte de sensibilidade:
  - usar `visibility = internal`
- Toda importação deve receber destino explícito por `knowledge_space`.
- Não inferir marca/documentação pública técnica automaticamente a partir do legado.

## Modelo editorial

### Visibility
- `public`
- `internal`
- `restricted`

### Status
- `draft`
- `review`
- `published`
- `archived`

### Regras de status
- `draft` é estado inicial obrigatório para importação legado.
- `review` representa revisão humana pendente.
- `published` existe no domínio, mas não implica documentação pública técnica exposta nesta fase.
- `archived` preserva histórico e rastreabilidade.

## Regras de publicação
- Não publicar automaticamente artigos legados.
- Não abrir Central de Ajuda pública nesta fase.
- Não misturar conteúdo público com playbook interno.
- Não indexar conteúdo em IA nesta fase.
- Não promover artigo para `published` sem trilha editorial e auditoria.
- `published` continua sendo estado editorial, não sinal de exposição pública ativa.
- Um `knowledge_space` futuro também precisará estar ativo antes de qualquer abertura pública.
- O contrato público de leitura já existe, mas ainda sem UI pública, busca ou roteamento ativo no frontend.
- O contrato público de leitura agora possui UI mínima em `/help` e busca textual simples, mas continua sem IA, chat, widget, portal B2B ou abertura pública de ticket.

## Superfície pública mínima
- Rotas ativas:
  - `/help`
  - `/help/:spaceSlug`
  - `/help/:spaceSlug/articles`
  - `/help/:spaceSlug/articles/:articleSlug`
- A leitura pública consome apenas:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- A renderização do detalhe usa exclusivamente `body_md` com Markdown seguro.
- A UI não depende de filtro no frontend para esconder conteúdo privado; o backend continua como source of truth.
- Branding detalhado por `brand_settings` ainda não é requisito do contrato público atual; a UI usa fallback seguro baseado nos metadados públicos já expostos.
- O resolver público agora projeta branding sanitizado mínimo de `brand_settings`, mantendo o frontend sem acesso direto à tabela base.
- Tokens de tema, SEO e contatos públicos passam por allowlist no backend e nova validação no frontend antes de afetar CSS, links ou metadata.
- A busca pública consulta exclusivamente `rpc_public_search_knowledge_articles`, com full-text search nativo do PostgreSQL sobre conteúdo publicado.

## Governança de revisão
- Todo artigo relevante deve gerar revisão em `knowledge_article_revisions`.
- Toda origem relevante deve ser preservada em `knowledge_article_sources`.
- Toda mutação administrativa deve gerar `audit.audit_logs`.
- Conteúdo legado precisa de curadoria humana antes de qualquer exposição pública.

## Pipeline de curadoria esperado
1. Inventariar todos os artigos legados.
2. Extrair título, categoria, subcategoria e conteúdo limpo.
3. Classificar cada artigo como:
   - `public`
   - `internal`
   - `restricted`
   - `obsoleto`
   - `duplicado`
4. Reescrever para o padrão editorial do Genius Support OS.
5. Manter estado inicial em `draft` ou `review`.
6. Preservar `source_path` e `source_hash`.
7. Exigir revisão humana antes de qualquer publicação.

## Próximos passos planejados
- Evoluir a curadoria administrativa space-aware sem romper os contratos atuais do Admin Console.
- Consumir a superfície pública apenas quando a UI da Central Pública for criada sobre as views endurecidas já aprovadas.
- Evoluir After Sale como segundo `knowledge_space` oficial apenas quando a operação estiver pronta.

## O que continua bloqueado
- documentação pública técnica
- frontend público sobre os read models públicos
- indexação em IA
- chat ou widget
- portal B2B do cliente
- abertura pública de ticket
- uso de HTML legado como frontend
- publicação automática
- mistura entre KB pública e playbooks internos

## Busca pública mínima
- A Central Pública agora possui busca textual simples em `/help/:spaceSlug`.
- O frontend consulta apenas `rpc_public_search_knowledge_articles`.
- A RPC busca por `title`, `summary` e `body_md` usando full-text search nativo do PostgreSQL.
- O retorno expõe somente:
  - `article_id`
  - `title`
  - `slug`
  - `summary`
  - `category_name`
  - `rank_score`
  - `updated_at`
- A busca não usa IA, embeddings, chat nem qualquer filtro de segurança no frontend.
- Queries vazias ou muito curtas retornam lista vazia controlada.
