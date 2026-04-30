# KNOWLEDGE_BASE_STRATEGY.md

## Objetivo
Criar a base editorial do Genius Support OS com versionamento, trilha de origem e governança suficiente para operar conteúdo interno primeiro, sem abrir Central de Ajuda pública nesta fase.

## Escopo atual
- Núcleo de domínio materializado em:
  - `knowledge_categories`
  - `knowledge_articles`
  - `knowledge_article_revisions`
  - `knowledge_article_sources`
- Read models administrativos internos:
  - `vw_admin_knowledge_categories`
  - `vw_admin_knowledge_articles_list`
  - `vw_admin_knowledge_article_detail`
- Mutações editoriais administrativas:
  - `rpc_admin_create_knowledge_category`
  - `rpc_admin_create_knowledge_article_draft`
  - `rpc_admin_update_knowledge_article_draft`
  - `rpc_admin_submit_knowledge_article_for_review`
  - `rpc_admin_publish_knowledge_article`
  - `rpc_admin_archive_knowledge_article`
- Pipeline legado local-only:
  - `scripts/knowledge/import-octadesk-drafts.mjs`

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
- `published` existe no domínio, mas não implica Help Center público nesta fase.
- `archived` preserva histórico e rastreabilidade.

## Regras de publicação
- Não publicar automaticamente artigos legados.
- Não abrir Central de Ajuda pública nesta fase.
- Não misturar conteúdo público com playbook interno.
- Não indexar conteúdo em IA nesta fase.
- Não promover artigo para `published` sem trilha editorial e auditoria.

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

## O que continua bloqueado
- Help Center público
- Central de Ajuda pública
- indexação em IA
- uso de HTML legado como frontend
- publicação automática
- mistura entre KB pública e playbooks internos
