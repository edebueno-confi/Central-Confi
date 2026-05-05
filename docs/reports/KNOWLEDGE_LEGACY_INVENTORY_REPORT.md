# KNOWLEDGE_LEGACY_INVENTORY_REPORT.md

## Objetivo
Registrar o inventario editorial inicial do corpus legado Octadesk para orientar a curadoria humana da Knowledge Base, sem publicar conteudo automaticamente.

## Metodo usado nesta fase
- leitura do inventario preservado em `raw_knowledge/octadesk_export/latest/articles/`
- dry-run do import oficial em `scripts/knowledge/import-octadesk-drafts.mjs --local --space-slug genius`
- classificacao heuristica conservadora por titulo, resumo, `source_hash` e sinais de sensibilidade
- verificacao do estado atual do banco local apos `supabase:verify`

## Estado atual no banco local
- artigos na KB local com `source_hash`: `0`
- drafts importados no banco local atual: `0`
- conclusao: o corpus legado segue preservado e auditavel na base bruta e no dry-run do import, mas nao esta materializado como lote curado no banco local apos o ciclo padrao de verify

## Total de artigos inventariados
- total do corpus legado: `58`

## Categorias-raiz
- `Configuracoes`: `45`
- `Cadastros`: `8`
- `Erros comuns e solucoes`: `5`

## Duplicidades por `source_hash`
- grupos duplicados: `1`
- artigos no grupo duplicado: `2`

Grupo duplicado identificado:
- `Como configurar as formas de Estorno`
- `Configurando as Formas de Estorno`
- hash compartilhado: `15d545dc72e4897cd2f0590e3eddb30259bc141269bbfce2538266f1bd0c4121`

## Triagem editorial preliminar
Observacao:
- os numeros abaixo sao candidatos heuristcos de curadoria, nao decisao editorial final
- o viés desta fase foi conservador: quando houve duvida entre publico e interno/restrito, o artigo foi empurrado para revisao mais fechada

### Candidatos a `public`
- contagem preliminar: `4`
- perfil: guias de uso mais claros, sem sinal evidente de segredo, contrato tecnico ou operacao sensivel

Exemplos:
- `Como alterar ou aprovar os produtos de uma solicitacao?`
- `Posso enviar uma notificacao de analise ao cliente?`
- `Reenviar um e-mail ao consumidor`
- `Regra por motivo`

### Candidatos a `internal`
- contagem preliminar: `35`
- perfil: configuracoes administrativas, operacao de backoffice, linguagem antiga ou conteudo que ainda precisa de reescrita para o contexto B2B atual

Exemplos:
- `Como cadastrar motivos para troca ou devolucao`
- `Como cadastrar os e-mails para notificacoes automaticas`
- `Como configurar o calculo do estorno`
- `Como configurar os textos do Front`
- `Configurando parametrizacao geral`
- `Como cadastrar Lojas Fisicas`

### Candidatos a `restricted`
- contagem preliminar: `19`
- perfil: integracoes, credenciais, permissoes, estorno, PIX, Correios, endpoints/API ou troubleshooting tecnico interno

Exemplos:
- `Como atualizar os dados de integracoes do e-commerce`
- `Erros na integracao do contrato do Correios`
- `Habilitar a API de Logistica Reversa do Correios`
- `Permissoes Shopify`
- `Permissoes TrayCorp`
- `Permissoes Vtex`
- `Como automatizar o pagamento de Estorno e Vale-Compra`
- `Como configurar o estorno automatico via pix`
- `Erro de autorizacao ao acessar pedidos na Vtex`

### Candidatos a `obsoleto`
- contagem preliminar: `4`
- perfil: duplicidade clara, naming legado, onboarding/integracao que precisa ser reconfirmado ou procedimento possivelmente superado

Exemplos:
- `Como atualizar os dados de integracoes do e-commerce`
- `Como configurar as formas de Estorno`
- `Configurando as Formas de Estorno`
- `Valor Manual para Estorno Automatico`

## Principais sinais de sensibilidade encontrados
- artigos com sinais de `integracoes`: `16`
- artigos com sinais de `credenciais`: `9`
- artigos com sinais de `endpoints/API`: `8`
- artigos com sinais de `Correios`: `8`
- artigos com sinais de `PIX`: `4`
- artigos com sinais de `estorno`: `21`

## Principais riscos editoriais
- o corpus ainda carrega linguagem herdada de operacao mais proxima de SAC/consumidor em alguns artigos
- varios artigos tratam de configuracao financeira e logistica com risco operacional alto
- integracoes com Shopify, VTEX, TrayCorp, Nuvemshop e Correios exigem revisao tecnica antes de qualquer exposicao
- existe pelo menos um grupo duplicado real por `source_hash`
- parte do conteudo ainda reflete UI e naming legados, o que aumenta chance de obsolescencia
- o banco local padrao de validacao continua sem o lote legado importado; a curadoria precisa seguir como pipeline documental e operacional, nao como suposto estado persistido atual

## Recomendacao operacional
1. separar primeiro os `restricted`
2. consolidar duplicados
3. marcar obsoletos
4. abrir backlog de reescrita dos `internal`
5. promover para `review` apenas os `public` claramente seguros e reescritos
