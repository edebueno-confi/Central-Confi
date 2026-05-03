# DOCUMENTATION_LEDGER.md

## Objetivo
Registrar, por fase aprovada, o rastro documental minimo necessario para sustentar auditoria interna, continuidade de execucao e geracao futura da FAQ oficial da plataforma.

## Estrutura do ledger
Cada registro deve informar:
- fase
- commit
- branch
- data
- resumo funcional
- docs alterados
- views/RPCs afetadas
- telas afetadas
- riscos restantes
- impacto na FAQ futura

## Registros

### Fase 4.7 - Public Help Center Branding Contract
- fase: `4.7`
- commit: `68a44ea`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: branding publico sanitizado passou a ser exposto no resolver e aplicado com validacao no frontend da Central Publica.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PRODUCT_VISION.md`
- views/RPCs afetadas:
  - `vw_public_knowledge_space_resolver`
- telas afetadas:
  - `/help`
  - `/help/:spaceSlug`
  - `/help/:spaceSlug/articles`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - `seo_defaults.imageUrl` ainda sem consumo pleno no frontend naquele momento
  - busca, IA, chat e portal B2B continuavam bloqueados
- impacto na FAQ futura:
  - habilita responder como a marca publica da Central e derivada sem expor `brand_settings` bruto

### Fase 4.9 - Public Help Center Search Contract
- fase: `4.9`
- commit: `7323421`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: busca publica textual minima entregue com RPC segura e UX basica na Central Publica.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
- views/RPCs afetadas:
  - `rpc_public_search_knowledge_articles`
- telas afetadas:
  - `/help/:spaceSlug`
- riscos restantes:
  - busca ainda sem sinônimos, curadoria editorial de ranking ou IA
  - sem roteamento publico dedicado por dominio
- impacto na FAQ futura:
  - habilita perguntas futuras sobre como localizar artigos publicados dentro de um knowledge space ativo

### Fase 4.9.1 - Public Help Center UX Readability Polish + Documentation Ledger Strategy
- fase: `4.9.1`
- commit: `3b76961`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: polish visual da Central Publica para leitura B2B tecnica e criacao da estrategia oficial de FAQ/ledger documental da plataforma.
- docs alterados:
  - `docs/PLATFORM_FAQ_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido em `vw_public_knowledge_space_resolver`
  - consumo mantido em `vw_public_knowledge_navigation`
  - consumo mantido em `vw_public_knowledge_articles_list`
  - consumo mantido em `vw_public_knowledge_article_detail`
  - consumo mantido em `rpc_public_search_knowledge_articles`
- telas afetadas:
  - `/help`
  - `/help/:spaceSlug`
  - `/help/:spaceSlug/articles`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - a FAQ oficial ainda nao foi escrita; so a estrategia e o ledger foram formalizados
- impacto na FAQ futura:
  - define o metodo oficial para transformar funcionalidade validada em pergunta/resposta rastreavel
  - cria trilha minima para responder por ambiente, perfil autorizado e fonte documental

### Fase 5.0 - Knowledge Content Curation Pipeline
- fase: `5.0`
- commit: `4e7f0a6`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: auditoria do corpus legado, definicao do plano editorial de curadoria e consolidacao do inventario oficial sem publicar conteudo automaticamente.
- docs alterados:
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - uso documental do dry-run de `scripts/knowledge/import-octadesk-drafts.mjs`
- telas afetadas:
  - nenhuma
- riscos restantes:
  - a curadoria continua dependente de leitura humana artigo a artigo
  - o banco local padrao segue sem o lote legado importado apos `supabase:verify`
  - a classificacao desta fase e conservadora e heuristica, nao decisao editorial final
- impacto na FAQ futura:
  - define a regra de que conhecimento oficial so nasce de conteudo validado e curado
  - separa o que pode virar FAQ publica do que deve permanecer interno ou restrito

### Fase 5.1 - Legacy Knowledge Import Backlog + Controlled Draft Ingestion
- fase: `5.1`
- commit: `d3239ec`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: backlog versionado de curadoria legado criado, import Octadesk validado em dry-run e apply local controlado, e `/admin/knowledge` ajustado para evidenciar origem e hash do legado.
- docs alterados:
  - `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido em `vw_admin_knowledge_spaces`
  - consumo mantido em `vw_admin_knowledge_categories_v2`
  - consumo mantido em `vw_admin_knowledge_articles_list_v2`
  - consumo mantido em `vw_admin_knowledge_article_detail_v2`
  - uso operacional mantido em `rpc_admin_create_knowledge_article_draft_v2`
  - uso operacional mantido em `rpc_admin_update_knowledge_article_draft_v2`
- telas afetadas:
  - `/admin/knowledge`
- riscos restantes:
  - o lote legado aplicado localmente nao persiste apos `supabase:verify`
  - a classificacao do backlog continua heuristica e depende de revisao humana artigo a artigo
  - todos os artigos legado continuam em `draft`, sem publicacao automatica
- impacto na FAQ futura:
  - cria backlog rastreavel para separar o que pode virar documentacao publica, playbook interno ou conteudo restrito
  - formaliza de onde deve sair a futura FAQ operacional baseada no corpus legado curado
