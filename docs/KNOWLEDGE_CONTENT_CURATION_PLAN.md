# KNOWLEDGE_CONTENT_CURATION_PLAN.md

## Objetivo
Definir o fluxo oficial de curadoria editorial do corpus legado da Knowledge Base para transformar material importado do Octadesk em documentação técnica B2B governada, sem publicar conteúdo automaticamente.

## Premissas
- o corpus legado e ponto de partida, nao fonte de verdade publica
- nenhum artigo legado nasce publicado
- toda decisao de visibilidade exige leitura humana
- HTML legado nao entra como corpo principal
- o estado padrao continua `draft`
- a plataforma e B2B tecnica; o texto nao deve assumir SAC ao shopper final

## Estado atual do pipeline
- o inventario legado continua preservado em `raw_knowledge/octadesk_export/latest/articles/`
- o importador oficial existe em `scripts/knowledge/import-octadesk-drafts.mjs`
- o importador exige destino explicito por `knowledge_space`
- o importador preserva `source_path` e `source_hash`
- o `supabase:verify` atual nao deixa corpus legado importado no banco local; a curadoria desta fase parte do inventario e do dry-run do import

## Classificacao editorial

### `public`
Usar quando o artigo:
- explica uso normal da plataforma para cliente B2B ou usuario autorizado
- nao expõe credenciais, contratos, endpoints, permissões sensiveis ou detalhes operacionais internos
- pode ser lido no Help Center publico sem risco de seguranca ou governanca
- nao depende de contexto interno do time Genius para ser entendido

### `internal`
Usar quando o artigo:
- ainda e util para suporte, CS ou operacao interna
- descreve parametrizacao administrativa, tratativa operacional ou linguagem antiga
- precisa de reescrita antes de qualquer exposicao publica
- nao contem segredo explicito, mas tambem nao esta pronto para leitura publica

### `restricted`
Usar quando o artigo:
- menciona credenciais, tokens, APIs, endpoints, payloads, OAuth ou contratos tecnicos
- aborda PIX, estorno, sellers, permissoes, BlockList, seguranca ou Correios com risco operacional
- contem troubleshooting que expoe erro interno, procedimento sensivel ou regra antifraude
- nao deve circular fora de perfis autorizados

## Classificacao adicional

### `duplicado`
Aplicar quando:
- dois ou mais artigos compartilham o mesmo `source_hash`
- a diferenca e apenas de titulo, ordem ou embalagem editorial
- existir um artigo canonico melhor para absorver o conteudo

### `obsoleto`
Aplicar quando:
- o fluxo descrito depende de UI antiga, naming legado ou processo nao vigente
- o artigo conflita com a premissa atual B2B tecnica do Genius Support OS
- o texto ficou redundante diante de outro artigo mais completo
- a instrucao descreve onboarding ou integracao que precisa ser revalidada com produto/engenharia antes de circular

## O que nunca deve ser publicado
- credenciais, tokens, segredos, chaves, payloads sensiveis ou exemplos reais
- rotas internas, endpoints nao publicos ou detalhes de contrato tecnico nao aprovados
- procedimentos de estorno, PIX, Correios ou sellers sem validacao de risco
- regras de seguranca, antifraude, BlockList ou parametrizacao sensivel
- troubleshooting que exponha erro interno, stack trace, bypass ou procedimento manual fragil
- artigos que ainda tratem shopper final como publico do produto
- conteudo em HTML legado sem reescrita editorial

## Padrao editorial B2B tecnico

### Tom
- direto
- operacional
- sem jargao desnecessario
- sem linguagem de SAC B2C
- orientado a usuarios de plataforma, suporte interno, CS e operacao tecnica

### Estrutura minima do artigo
1. contexto
2. quando usar
3. passos objetivos
4. validacao esperada
5. limites, excecoes ou riscos
6. links para artigos relacionados, quando houver

### Padrao de titulo
- verbo + objetivo + contexto
- evitar titulos vagos como `configurando parametrizacao geral`
- preferir titulos como:
  - `Como cadastrar motivos de troca e devolucao`
  - `Como reenviar um email ao cliente B2B`
  - `Como revisar produtos de uma solicitacao`

### Padrao de resumo
- 1 a 2 frases
- explicar o resultado da leitura
- nao repetir o titulo
- nao prometer comportamento nao implementado

### Padrao de resposta
- abrir com o resultado esperado
- listar passos em ordem real
- incluir criterio de sucesso
- citar pre-condicoes ou dependencia de permissao
- separar claramente o que e publico, interno ou restrito

## Fluxo editorial

### `draft`
- estado de entrada do legado
- permite limpeza, reestruturação e classificacao inicial
- nao pode ser publicado sem revisao humana

### `review`
- artigo reescrito e classificado
- pronto para verificacao funcional e de risco
- exige segunda leitura humana antes de `published`

### `published`
- apenas para artigos aprovados para a superficie publica ou interna prevista
- requer titulo, resumo, corpo em Markdown, categoria correta, visibilidade correta e rastreabilidade de fonte

## Checklist humano antes de publicar
- o artigo descreve funcionalidade implementada e validada?
- o publico esta correto para `public`, `internal` ou `restricted`?
- ha credencial, token, endpoint, payload ou dado sensivel no texto?
- o artigo usa linguagem B2B tecnica e nao SAC ao shopper final?
- o titulo esta claro e acionavel?
- o resumo explica o valor do artigo?
- o corpo esta em Markdown limpo e sem dependencia de HTML legado?
- existe conflito com outro artigo mais novo ou mais completo?
- o artigo precisa de aprovacao de produto, CS, suporte ou engenharia?
- `source_path` e `source_hash` permanecem preservados?

## Ordem recomendada de curadoria
1. eliminar duplicados por `source_hash`
2. separar restritos de alto risco
3. marcar candidatos obsoletos
4. reescrever candidatos publicos obvios
5. revisar configuracoes administrativas que devem ficar internas
6. so entao promover de `draft` para `review`

## Regra operacional desta fase
- nao publicar nada automaticamente
- nao reescrever o banco em lote
- nao classificar como `public` apenas por heuristica
- usar o relatorio de inventario desta fase como backlog editorial inicial

## Workflow operacional da fase 5.2
- a revisao artigo a artigo acontece em `/admin/knowledge`
- o operador deve priorizar:
  1. origem legado/manual
  2. `visibility`
  3. `status`
  4. duplicidade por `source_hash`
- a UI agora oferece checklist visual em duas camadas:
  - sinais objetivos atuais do artigo
  - confirmacoes humanas obrigatorias antes de `review` ou `published`
- o checklist desta fase nao grava aprovacao persistente; ele funciona como apoio de leitura e gate operacional

## Proposta minima segura para classificacao sugerida
- a classificacao sugerida do backlog ainda nao esta no contrato backend da curadoria
- nao usar parsing do markdown do backlog nem heuristica solta no frontend para preencher esse campo
- caminho recomendado:
  - projetar read model advisory versionado a partir do backlog controlado
  - manter advisory separado do artigo canonico
  - expor somente campos seguros de apoio editorial, nunca como source of truth publica

## Contrato advisory da fase 5.3
- o caminho recomendado da fase 5.2 foi materializado
- a camada persistente agora existe em `knowledge_article_review_advisories`
- a origem versionada do advisory fica em:
  - `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`
  - `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.json`
- o sync controlado local acontece por:
  - `npm run knowledge:curation:backlog`
  - `npm run knowledge:review:advisories:local -- --space-slug genius`
- regras do advisory:
  - advisory e apoio editorial, nao decisao automatica
  - nenhuma linha muda `body_md`, `status` ou `visibility` do artigo por efeito colateral
  - revisao humana existente nao deve ser sobrescrita pelo sync do backlog
  - a camada nao e exposta em views publicas
- persistencia humana agora disponivel:
  - `review_status`
  - `review_notes`
  - `human_confirmations`
  - `reviewed_by_user_id`
  - `reviewed_at`
- checklist editorial passa a operar em tres trilhas:
  1. sinais objetivos do artigo atual
  2. sinais advisory derivados do backlog
  3. confirmacoes humanas persistidas
- o publish continua dependendo de decisao humana explicita e separada do advisory
