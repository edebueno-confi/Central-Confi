# TICKET_KNOWLEDGE_LINKING_SPEC.md

## Objetivo
Especificar como tickets do Genius Support OS poderao se relacionar com artigos da Knowledge Base para apoiar suporte e CS durante a tratativa, sem IA, sem automacao e sem alterar o fluxo canonico de tickets ou o fluxo canonico editorial.

## Premissas de produto
- o Genius Support OS atende clientes B2B de SaaS de logistica reversa
- ticket continua sendo a source of truth da tratativa
- Knowledge Base continua sendo a source of truth do conteudo
- o vinculo entre ticket e artigo deve apoiar resposta, contexto e melhoria editorial, sem confundir suporte com publicacao
- nenhum vinculo pode vazar conteudo `restricted` ou `internal` para cliente B2B

## Problema operacional
Hoje o agente consegue responder o ticket, consultar contexto do cliente e registrar conversa, mas ainda nao possui um contrato claro para:
- registrar qual artigo ajudou na resposta
- marcar que um artigo publico foi enviado ao cliente
- sinalizar que a documentacao esta incompleta ou defasada
- transformar recorrencia de tickets em backlog editorial verificavel

Sem esse contrato, o conhecimento continua disperso entre memoria informal, conversa de ticket e backlog editorial manual.

## Casos de uso

### 1. Agente procura artigo enquanto responde ticket
- o agente abre o ticket e precisa localizar rapidamente um artigo relevante
- a busca acontece no fluxo de resposta, sem sair para uma tela editorial completa
- o artigo serve como apoio interno ou como fonte de link publico

### 2. Agente vincula artigo ao ticket
- o agente registra que determinado artigo foi usado como referencia na tratativa
- o vinculo preserva contexto operacional sem alterar o ticket nem o artigo

### 3. Agente usa artigo como referencia interna
- o artigo pode ser `internal` ou `restricted`
- o vinculo existe apenas para o time interno autorizado
- o cliente nunca recebe esse artigo como devolutiva

### 4. Agente envia link de artigo publico ao cliente B2B
- o agente usa um artigo `public` como complemento da resposta
- o ticket registra que o link foi efetivamente enviado
- isso ajuda suporte, CS e futura analise de FAQ sem depender de memoria do agente

### 5. Agente identifica lacuna de documentacao a partir do ticket
- o suporte percebe que nao existe artigo cobrindo o problema
- o ticket precisa marcar essa ausencia sem abrir artigo automaticamente

### 6. Agente sugere criacao ou atualizacao de artigo
- o suporte identifica conteudo desatualizado, incompleto ou valido apenas parcialmente
- o sistema registra essa sugestao com trilha auditavel

## Tipos de vinculo

### `reference_internal`
- indica que o artigo foi usado como referencia interna durante a tratativa
- pode apontar para artigo `public`, `internal` ou `restricted`
- nao implica envio ao cliente

### `sent_to_customer`
- indica que um link publico foi enviado ao cliente B2B
- so pode apontar para artigo `public`
- o registro e importante para contexto do ticket e analise futura de eficacia da documentacao

### `suggested_article`
- indica que o ticket sugere criacao de artigo novo
- pode existir com ou sem `article_id`, dependendo se o alvo ja esta rascunhado
- serve como backlog de conteudo, nao como publicacao

### `documentation_gap`
- indica ausencia de documentacao util para o caso
- aponta para lacuna, nao para artigo existente obrigatoriamente
- deve permitir `note` com contexto curto do gap

### `needs_update`
- indica que existe artigo relacionado, mas ele precisa de revisao
- o artigo continua sendo source of truth do conteudo
- o ticket apenas registra a necessidade observada no suporte

## Regras de negocio
- o vinculo nao altera status do ticket automaticamente
- o vinculo nao cria, nao publica e nao arquiva artigo
- o vinculo nao muda `visibility` nem `status` editorial do artigo
- `restricted` e `internal` nunca podem ser enviados ao cliente
- apenas artigo `public` pode gerar `sent_to_customer`
- o link nao substitui a resposta do agente; ele apenas a apoia
- a conversa do ticket continua sendo o registro principal da tratativa
- o artigo continua sendo a fonte oficial do conteudo reutilizavel

## Fonte de verdade e boundary

### Ticket
Pertence ao ticket:
- decisao de enviar ou nao um artigo
- contexto da tratativa
- nota do agente sobre por que o artigo foi usado
- marca de lacuna ou necessidade de atualizacao

### Knowledge Base
Pertence a Knowledge Base:
- conteudo do artigo
- status editorial
- visibilidade
- publicacao
- revisao
- trilha de origem

### Vínculo
Pertence ao vinculo:
- relacao entre o ticket e o artigo
- tipo de uso
- nota curta opcional
- ator que criou a relacao
- momento em que a relacao foi criada

## Impacto futuro em dados

### Tabela candidata
`ticket_knowledge_links`

### Campos minimos propostos
- `id`
- `tenant_id`
- `ticket_id`
- `article_id`
- `link_type`
- `note`
- `created_by_user_id`
- `created_at`

### Regras minimas esperadas
- `tenant_id` obrigatorio
- `ticket_id` obrigatorio
- `link_type` obrigatorio
- `created_by_user_id` obrigatorio
- `created_at` obrigatorio
- `article_id` pode ser obrigatorio ou opcional conforme o `link_type`
- `sent_to_customer` exige `article_id` de artigo `public`
- `documentation_gap` e `suggested_article` podem admitir `article_id` nulo quando a lacuna ainda nao virou draft
- audit obrigatorio para create e eventual archive logical do vinculo

### Unicidade recomendada
- evitar unicidade global artificial por ticket + article + link_type
- permitir que o mesmo artigo seja referenciado mais de uma vez em tratativas diferentes
- permitir mais de um registro no mesmo ticket quando a natureza do uso for diferente:
  - `reference_internal`
  - `sent_to_customer`
  - `needs_update`

## Sensibilidade e seguranca
- `note` nao deve aceitar segredo, token, senha, chave, endpoint sensivel ou payload tecnico sigiloso
- o vinculo nao deve carregar snapshot do conteudo do artigo
- o sistema nao deve duplicar `body_md` dentro do ticket
- o futuro portal B2B so pode ver links publicos explicitamente enviados, nunca referencia interna
- o frontend nao deve exibir `article_id`, `tenant_id`, `UUID`, nomes de view/RPC ou regras de seguranca no fluxo principal

## Permissoes

### Suporte e CS
- podem vincular artigos autorizados ao ticket quando tiverem acesso ao tenant
- podem registrar `reference_internal`, `documentation_gap` e `needs_update`
- podem registrar `sent_to_customer` apenas para artigo `public`

### Artigos `restricted` e `internal`
- aparecem apenas como referencia interna para roles autorizadas
- nunca devem virar acao de envio ao cliente

### Artigos `public`
- podem ser usados como referencia interna
- podem ser marcados como enviados ao cliente

### Cliente B2B futuro
- ve no maximo o link publico enviado
- nao ve notas internas nem raciocinio operacional do suporte

## Impacto futuro em UI

### No ticket
Painel candidato:
- `Conhecimento relacionado`

### Acoes principais
- buscar artigo no fluxo de resposta
- vincular artigo como referencia interna
- copiar link publico
- marcar lacuna de documentacao
- sugerir atualizacao de artigo

### Composicao recomendada
- o painel deve viver na toolbar operacional ou no rail, sem competir com conversa e composer
- o fluxo principal continua:
  1. entender o ticket
  2. responder
  3. usar conhecimento quando ajudar
- detalhes do artigo, trilha editorial e metadados tecnicos ficam recolhidos

### No ticket, mostrar apenas o essencial
- titulo do artigo
- visibilidade operacional compreensivel
- tipo do vinculo
- quem vinculou
- quando vinculou
- acao util:
  - abrir artigo
  - copiar link publico, quando permitido

## Impacto futuro no Support Workspace
- o workspace passa a ter uma ponte controlada entre conversa e conteudo reutilizavel
- o rail operacional do ticket ganha contexto de conhecimento sem virar painel editorial
- a tratativa passa a registrar quando uma resposta foi apoiada por artigo publico ou por playbook interno autorizado
- a ausencia de artigo deixa de ser observacao solta e passa a virar backlog rastreavel

## Impacto futuro na Knowledge Base
- tickets passam a alimentar backlog editorial verificavel
- a KB passa a receber sinais reais de uso e de gap operacional
- a estrategia editorial futura pode priorizar:
  - artigos enviados com frequencia ao cliente
  - lacunas recorrentes
  - artigos marcados como `needs_update`

## Impacto futuro no Customer Portal B2B
- o portal nao deve herdar vinculos internos por conveniencia
- apenas links publicos realmente enviados ao cliente podem aparecer futuramente como referencia contextual
- mesmo assim, isso exigira read model proprio do portal

## Impacto futuro em auditoria
Mutacoes que devem gerar audit log:
- criacao de vinculo
- remocao logica ou arquivamento de vinculo, se esse fluxo existir
- mudanca de `link_type`, se o sistema permitir edicao futura

### Before/after recomendado
- `ticket_id`
- `article_id`
- `link_type`
- `note`
- `created_by_user_id`

### O que nunca deve entrar em metadata
- segredo
- token
- payload confidencial
- corpo completo de artigo
- endpoint sensivel

## O que fica fora do MVP
- recomendacao automatica de artigo
- IA
- embeddings
- ranking semantico
- chat
- automacao de publicacao
- criacao automatica de draft
- mudanca automatica de status do ticket
- mudanca automatica de status editorial
- portal B2B

## Lacunas atuais
- nao existe tabela de vinculo
- nao existe read model especifico de artigos relacionados ao ticket
- nao existe busca de artigos embutida no fluxo do ticket
- nao existe acao auditada para registrar gap ou `needs_update`
- a KB e o suporte continuam sem ponte contratual persistente

## Proposta faseada de implementacao

### Fase 6.12
- especificacao do dominio e das regras

### Fase 6.13
- revisao de modelo minimo do vinculo ticket -> KB
- definicao de constraints, enums e boundary de permissao

### Fase 6.14
- design tecnico de migration, views, RPCs e pgTAP

### Fase 6.15
- backend minimo materializado:
  - tabela de vinculo
  - read models de leitura
  - RPCs de escrita
  - auditoria

### Fase 6.16
- UI assistiva no Support Workspace
- painel `Conhecimento relacionado`
- copia de link publico e marca de lacuna no fluxo do ticket

## Decisoes explicitas desta spec
- o vinculo e assistivo, nao automatizado
- o ticket nao vira editor de artigo
- a KB nao vira extensao do ticket
- o cliente futuro nunca recebe conteudo `internal` ou `restricted`
- qualquer expansao futura precisa continuar obedecendo o contrato de UI operacional e o boundary de backend como source of truth
