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
  - `scripts/knowledge/generate-curation-backlog.mjs`

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
- O `supabase:verify` atual não mantém o lote legado importado no banco local; a curadoria desta fase parte do corpus bruto preservado e do dry-run oficial do import.
- A curadoria operacional agora também conta com backlog versionado em `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md` e com apply local controlado para popular drafts no Admin Console quando necessário.

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
- O fluxo oficial de validação do import é:
  - `npm run knowledge:import:octadesk:local -- --space-slug genius`
  - `npm run knowledge:import:octadesk:local -- --space-slug genius --apply --actor-user-id <uuid>`
- O `apply` local continua proibido fora do ambiente local controlado e nunca promove artigos para `review` ou `published`.
- Não inferir marca/documentação pública técnica automaticamente a partir do legado.
- O plano e o relatório de curadoria desta fase ficam em:
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md`
  - `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`

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
- A experiência pública agora passou por polish de legibilidade e hierarquia visual para parecer documentação técnica B2B, não shell administrativo.
- O acabamento visual continua sem alterar escopo funcional da busca nem abrir portal, ticket público, chat ou IA.

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

## Curadoria editorial da fase 5.0
- O corpus legado atual soma `58` artigos inventariados.
- A triagem conservadora inicial apontou:
  - `4` candidatos a `public`
  - `35` candidatos a `internal`
  - `19` candidatos a `restricted`
  - `4` candidatos a `obsoleto`
- Existe `1` grupo real de duplicidade por `source_hash`.
- O estado atual do banco local, após `supabase:verify`, segue com `0` artigos legado importados e `0` drafts com `source_hash`.
- O plano editorial oficial agora está documentado em `KNOWLEDGE_CONTENT_CURATION_PLAN.md`.
- O relatório operacional de inventário agora está documentado em `reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md`.

## Curadoria operacional da fase 5.1
- O backlog versionado oficial agora está documentado em `reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`.
- A classificação operacional atual do backlog ficou em:
  - `4` sugeridos como `public`
  - `34` sugeridos como `internal`
  - `16` sugeridos como `restricted`
  - `2` sugeridos como `obsolete`
  - `2` sugeridos como `duplicate`
- O import legado foi validado em `dry-run` e em `apply` local controlado no `knowledge_space` `genius`.
- O `apply` local gerou `58` drafts legado; como o ambiente validado já possuía `1` artigo adicional no mesmo space, o total observado na UI administrativa ficou em `59` drafts.
- A superfície `/admin/knowledge` agora exibe origem legado/manual, hash curto na listagem e `source_path`/`source_hash` no detalhe para apoiar revisão humana.
- Nenhum artigo legado foi publicado nesta fase.

## Revisao editorial da fase 5.2
- A rota `/admin/knowledge` agora tambem oferece:
  - filtro por origem legado/manual
  - filtro por `status`
  - filtro por `visibility`
  - filtro por duplicidade de `source_hash`
  - destaque visual para artigos `internal` e `restricted`
  - checklist editorial visual com sinais objetivos e confirmacoes humanas obrigatorias
- O checklist desta fase nao persiste estado proprio e nao reescreve o backend; ele apenas organiza a revisao humana a partir do contrato v2 atual.
- A classificacao sugerida do backlog ainda nao esta projetada nas views v2 nem nas RPCs v2.
- Proposta minima segura antes de expor essa classificacao na UI:
  - criar um read model advisory versionado, derivado do backlog controlado
  - manter esse advisory separado do dado editorial canonico do artigo
  - evitar heuristica solta ou parsing de markdown no frontend
- Nenhum artigo legado continua sendo publicado automaticamente.

## Advisory persistente da fase 5.3
- A curadoria editorial agora possui uma camada advisory persistente em `knowledge_article_review_advisories`, separada do artigo canonico.
- O backlog versionado passa a gerar tambem `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.json` como entrada segura para backfill advisory.
- O sync local controlado dessa camada acontece por `scripts/knowledge/sync-review-advisories.mjs` e pelo comando `npm run knowledge:review:advisories:local`.
- O advisory persiste apenas sinais de apoio editorial:
  - `suggested_visibility`
  - `suggested_classification`
  - `classification_reason`
  - `duplicate_group_key`
  - `risk_flags`
  - `review_status`
  - `human_confirmations`
  - `review_notes`
- O advisory nao publica artigo, nao altera `body_md`, nao muda `status` nem `visibility` automaticamente.
- A rota `/admin/knowledge` agora consome `vw_admin_knowledge_article_review_advisories` para:
  - mostrar classificacao sugerida vinda do backend
  - exibir flags de risco
  - destacar grupos duplicados por `duplicate_group_key`
  - persistir `review_status` e confirmacoes humanas
- No ambiente validado desta fase:
  - `58` artigos legado importados localmente receberam advisory
  - `58` advisories ficaram em `pending`
  - distribuicao atual: `4 public`, `34 internal`, `16 restricted`, `2 obsolete`, `2 duplicate`
  - `1` grupo de duplicidade ficou materializado
- O checklist visual da fase 5.2 continua existindo, mas agora ficou claramente separado entre:
  - sinais objetivos do artigo atual
  - sinais advisory vindos do backend
  - confirmacoes humanas persistidas
- Nenhuma heuristica de backlog foi promovida a source of truth publica; o advisory segue como apoio editorial autenticado.

## QA editorial da fase 5.4
- O fluxo editorial completo foi validado localmente com:
  - `supabase db reset`
  - fixture `platform_admin`
  - import controlado de `58` drafts legado
  - sync advisory dos `58` artigos no `knowledge_space` `genius`
- A superficie `/admin/knowledge` agora tambem oferece filtro por `suggested_classification`, permitindo revisar apenas candidatos `public` vindos do advisory persistente.
- Nesta fase, apenas `2` artigos candidatos foram levados ate publish controlado:
  - `Como reenviar um e-mail de uma solicitacao`
  - `Como configurar regra por motivo`
- Ambos passaram por:
  1. revisao humana simulada de titulo, resumo, corpo em Markdown e categoria
  2. confirmacao persistida no advisory
  3. promote para `review`
  4. publish explicito e individual
- Nenhum artigo `restricted`, `internal`, `obsolete` ou `duplicate` foi publicado.
- A validacao tambem confirmou um pre-requisito operacional da camada publica:
  - artigos `published` + `public` so aparecem na Central Publica quando o `knowledge_space` estiver `active`
  - com o space `genius` ainda em `draft`, os read models publicos bloquearam corretamente toda exposicao
  - apos ativacao operacional local do space, a Central Publica e a busca passaram a expor apenas os `2` artigos curados
- Esse publish de fase 5.4 continua sendo validacao local controlada; ele nao altera o baseline persistente do banco apos novo `supabase:verify`.

## Próximos passos planejados
- Evoluir a curadoria administrativa space-aware sem romper os contratos atuais do Admin Console.
- Consumir a superfície pública apenas quando a UI da Central Pública for criada sobre as views endurecidas já aprovadas.
- Evoluir After Sale como segundo `knowledge_space` oficial apenas quando a operação estiver pronta.
- Usar `PLATFORM_FAQ_STRATEGY.md` e `DOCUMENTATION_LEDGER.md` como trilha oficial para transformar funcionalidades já validadas em FAQ pública ou interna.

## O que continua bloqueado
- publicacao automatica ou em massa do legado
- indexação em IA
- chat ou widget
- portal B2B do cliente
- abertura pública de ticket
- uso de HTML legado como frontend
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

## Estratégia de FAQ da plataforma
- A FAQ futura do Genius Support OS não deve nascer de interpretação manual do time.
- Cada resposta futura deve derivar de fase aprovada, documentação oficial, contratos reais e telas já validadas.
- O ledger documental deve registrar commit, branch, docs, superfícies afetadas e impacto em FAQ por fase.
- Enquanto não houver artigo, contrato ou tela validada, a FAQ correspondente continua bloqueada.
