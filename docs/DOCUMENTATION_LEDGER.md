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
- commit: `a registrar no commit final da fase`
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
  - o ledger desta fase precisa receber o hash final quando houver commit da entrega
- impacto na FAQ futura:
  - define o metodo oficial para transformar funcionalidade validada em pergunta/resposta rastreavel
  - cria trilha minima para responder por ambiente, perfil autorizado e fonte documental
