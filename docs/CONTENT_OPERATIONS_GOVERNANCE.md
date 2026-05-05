# CONTENT_OPERATIONS_GOVERNANCE.md

## Objetivo
Definir a governanca operacional do conteudo da Knowledge Base e da Central Publica do Genius Support OS, com clareza de papeis, fluxo editorial e rastreabilidade documental.

## Premissas
- o Genius Support OS e uma plataforma CX B2B tecnica
- conteudo oficial so nasce de funcionalidade implementada, validada e documentada
- curadoria e publicacao sao atos humanos e auditaveis
- advisory editorial ajuda a revisar, mas nao decide sozinho
- a camada publica deve expor apenas o que estiver seguro para cliente B2B e usuario autorizado

## Papeis envolvidos
### `platform_admin`
- opera a estrutura administrativa global
- garante que o fluxo use apenas views e RPCs aprovadas
- valida readiness operacional do `knowledge_space`

### suporte interno
- identifica lacunas recorrentes de documentacao
- propõe candidatos a artigo e revisoes de clareza
- valida se o passo a passo resolve duvidas reais de operacao

### CS
- valida se o conteudo faz sentido para cliente B2B
- ajuda a revisar tom, clareza e contexto operacional
- aponta quando um artigo ainda esta tecnico demais para o publico alvo externo

### engenharia e produto
- valida exatidao tecnica
- revisa risco de exposicao de detalhes internos, endpoints e operacoes sensiveis
- confirma quando o comportamento descrito esta alinhado ao produto entregue

## Fluxo editorial canonico
1. `draft`
2. `review`
3. `published`
4. `archived`

### `draft`
- entrada padrao do legado e de novos rascunhos
- aceita reescrita editorial, classificacao e reorganizacao de categoria

### `review`
- leitura humana principal concluida
- aguardando confirmacao final de risco, clareza e aderencia ao produto

### `published`
- artigo aprovado para a superficie correspondente
- exige decisao humana explicita

### `archived`
- artigo retirado de circulacao sem perder rastreabilidade
- usado para rollback, obsolescencia ou erro de classificacao

## Responsabilidade por etapa
### Draft
- suporte e CS podem propor ajustes editoriais
- engenharia/produto entram quando houver duvida tecnica

### Review
- suporte e CS revisam clareza operacional
- engenharia/produto revisam risco tecnico e aderencia funcional
- `platform_admin` garante trilha e contrato corretos

### Publish
- exige responsavel humano identificavel
- depende de checklist editorial e checklist publico concluidos
- nao pode ser decidido so pelo advisory

### Archive
- responsavel humano registra motivo
- reavaliar se o advisory precisa ser ajustado

## Criterios de publicacao
- funcionalidade implementada e validada
- `suggested_classification = public` ou justificativa humana equivalente documentada
- sem `risk_flags` bloqueantes
- titulo, resumo e `body_md` revisados
- categoria publica coerente
- `knowledge_space` apto a exposicao
- validacao da Central Publica e busca quando aplicavel

## Criterios de nao publicacao
- artigo `restricted`
- artigo `internal`
- artigo `obsolete`
- artigo `duplicate`
- conteudo com segredo ou informacao sensivel
- conteudo ainda dependente de correcao de produto
- conteudo sem review humano suficiente

## Revisao periodica recomendada
- revisar artigos `published` de forma recorrente quando:
  - o fluxo do produto mudar
  - houver incidente ou bug relacionado
  - suporte e CS identificarem duvida recorrente
  - engenharia sinalizar desatualizacao tecnica

Cadencia sugerida:
- revisao leve por lote pequeno em ciclos operacionais regulares
- revisao extraordinaria sempre que contrato, UI ou comportamento mudar

## Uso do advisory editorial
- advisory e camada de apoio persistente
- serve para:
  - sugerir classificacao
  - destacar `risk_flags`
  - materializar duplicidade
  - registrar `review_status`
  - persistir confirmacoes humanas
- advisory nao deve:
  - publicar automaticamente
  - alterar `visibility`
  - alterar `status`
  - reescrever `body_md`

## Relacao com o `DOCUMENTATION_LEDGER.md`
Toda fase ou mudanca relevante de baseline deve registrar:
- fase ou iniciativa
- commit
- branch
- docs alterados
- contratos e telas afetados
- riscos restantes
- impacto na FAQ futura

Mudancas que pedem registro no ledger:
- novo contrato de KB ou camada publica
- alteracao relevante no fluxo editorial
- lote de publicacao que mude baseline documental oficial
- novo runbook, governanca ou politica operacional

## Relacao com a futura FAQ da plataforma
- a FAQ nao nasce diretamente do legado bruto
- a FAQ deve se apoiar em:
  - artigo curado
  - fluxo validado
  - docs oficiais
  - ledger atualizado
- artigos `published` e governados sao a principal materia-prima da futura FAQ tecnica B2B

## Regras para suporte e CS
- nao prometer artigo publico sem validacao editorial
- nao usar workaround oral como se fosse fonte oficial
- abrir demanda de curadoria quando a duvida se repetir
- sinalizar quando um artigo publicado nao refletir mais a operacao real

## Regras para engenharia e produto
- revisar qualquer artigo com risco tecnico elevado
- bloquear publish de conteudo com detalhes internos nao aprovados
- atualizar a documentacao quando uma entrega mudar o comportamento real

## Regras para auditoria e rastreabilidade
- manter `source_path` e `source_hash` no legado curado
- preservar `knowledge_article_revisions`
- manter `review_status`, `review_notes` e confirmacoes humanas quando aplicavel
- nunca tratar publish como acao silenciosa sem dono

## O que esta fora de escopo desta governanca
- IA escrevendo ou publicando artigo sozinha
- publish em massa
- portal B2B
- ticket publico
- chat ou widget
- deploy remoto automatizado
