# TICKET_KNOWLEDGE_PUBLIC_LINK_CONTRACT_REVIEW.md

## Objetivo
Revisar o contrato minimo e seguro para permitir que o suporte copie ou envie um link publico de artigo ao cliente B2B a partir do ticket, sem montar rota publica no frontend de forma fragil e sem abrir risco de exposicao de conteudo `internal` ou `restricted`.

## Escopo desta fase
- auditar os contratos atuais relacionados ao fluxo ticket -> Knowledge Base
- descrever a lacuna tecnica do contrato atual
- avaliar opcoes de contrato futuro
- recomendar o menor contrato seguro
- preparar a fase materializavel seguinte

## Contratos auditados

### `vw_support_knowledge_article_picker`
Estado atual:
- lista artigos permitidos para o fluxo do ticket
- projeta:
  - `ticket_id`
  - `article_id`
  - `article_title`
  - `article_slug`
  - `article_summary`
  - `category_name`
  - `article_visibility`
  - `article_status`
  - `is_customer_send_allowed`

Leitura tecnica:
- o picker ja resolve a elegibilidade basica de `sent_to_customer`
- o picker nao expoe:
  - `knowledge_space_slug`
  - `route_path_prefix`
  - `public_article_path`
  - `reason_if_blocked`
- o frontend sabe se o artigo pode ser enviado, mas nao recebe a rota publica confiavel para esse envio

### `vw_public_knowledge_space_resolver`
Estado atual:
- resolve `knowledge_space` publico ativo
- projeta:
  - `knowledge_space_slug`
  - `route_kind`
  - `route_host`
  - `route_path_prefix`
  - branding minimo

Leitura tecnica:
- a view conhece o prefixo canonico do help center por `knowledge_space`
- ela opera no eixo publico do `space`, nao no eixo operacional do ticket
- o suporte nao consome essa view no fluxo atual do ticket

### `vw_public_knowledge_article_detail`
Estado atual:
- resolve o detalhe publico do artigo publicado
- projeta:
  - `knowledge_space_slug`
  - `slug`
  - `title`
  - `summary`
  - `body_md`
  - timestamps publicos

Leitura tecnica:
- a view confirma o shape publico final do artigo
- ela nao serve como picker operacional do suporte
- exigir que o frontend combine manualmente esta view com o resolver abriria composicao fragil e duplicacao de regra

### `rpc_support_link_ticket_article`
Estado atual:
- registra o vinculo auditavel
- garante:
  - `sent_to_customer` apenas para artigo `public` + `published`
  - bloqueio de `internal` e `restricted` para envio ao cliente
  - bloqueio de cross-tenant/cross-space

Leitura tecnica:
- a RPC garante elegibilidade de escrita
- ela nao devolve uma URL publica para uso operacional no frontend
- a UI atual pode marcar `sent_to_customer`, mas ainda nao possui contrato suficiente para copiar o link publico com seguranca

## Lacuna tecnica confirmada
O contrato atual responde "pode enviar?" mas ainda nao responde "qual URL publica segura devo usar?".

Hoje o frontend teria de:
1. assumir que a rota publica e sempre `/help/:spaceSlug/articles/:articleSlug`
2. descobrir `spaceSlug` por fora do picker
3. combinar manualmente regras de:
   - `knowledge_space` ativo
   - artigo `public`
   - artigo `published`
   - rota canonica do `space`

Isso e inadequado por tres motivos:
- desloca a decisao de permissao para a UI
- duplica logica que ja existe no backend publico
- abre risco de rota montada de forma incompleta, especialmente quando o `knowledge_space` tiver dominio proprio ou `path_prefix` canonico

## Requisitos do contrato futuro
- o backend deve dizer explicitamente se o artigo pode ou nao virar link ao cliente
- o backend deve devolver a rota publica segura pronta para uso quando permitida
- o contrato nao deve expor UUID, nomes de views/RPCs, schema ou metadata tecnica
- `internal` e `restricted` nunca podem gerar link publico
- `draft`, `review` e `archived` nunca podem gerar link publico
- o contrato deve respeitar `knowledge_space` ativo e a resolucao publica oficial
- o frontend nao deve concatenar rota usando heuristica solta

## Opcoes avaliadas

### Opcao A - Expandir `vw_support_knowledge_article_picker`
Adicionar ao picker atual:
- `knowledge_space_slug`
- `public_article_path`
- `can_send_to_customer`
- `reason_if_blocked`

Vantagens:
- menor numero de artefatos novos
- aproveita a superficie que a UI de suporte ja consome
- reduz o custo de rollout no frontend

Desvantagens:
- mistura duas responsabilidades no mesmo read model:
  - descobrir artigos utilizaveis no ticket
  - resolver rota publica segura para envio ao cliente
- aumenta a superficie do picker inclusive para artigos usados apenas como referencia interna
- tende a carregar detalhes de rota publica mesmo quando o agente so quer vincular internamente

### Opcao B - Criar `vw_support_knowledge_public_link_candidates`
Nova view contratual, derivada do picker e da camada publica, projetando apenas candidatos a link publico seguro.

Campos recomendados:
- `ticket_id`
- `article_id`
- `article_title`
- `article_summary`
- `knowledge_space_slug`
- `article_slug`
- `article_visibility`
- `article_status`
- `public_article_path`
- `can_send_to_customer`
- `reason_if_blocked`

Vantagens:
- separa claramente:
  - picker geral do ticket
  - contrato de envio publico ao cliente
- mantem o fluxo interno simples
- deixa o boundary de seguranca mais auditavel
- permite reuso futuro em:
  - copy de link publico no suporte
  - exibicao futura segura no portal B2B

Desvantagens:
- adiciona mais uma view
- exige pequena evolucao contratual no frontend futuro

### Opcao C - Criar `rpc_support_get_public_article_link`
RPC de leitura para resolver a URL publica segura de um artigo no contexto do ticket.

Retorno minimo:
- `article_id`
- `article_title`
- `can_send_to_customer`
- `public_article_path`
- `reason_if_blocked`

Vantagens:
- contrato altamente explicito
- backend pode consolidar validacao transacional antes de devolver o link

Desvantagens:
- adiciona RPC de leitura onde uma view contratual costuma ser suficiente
- aumenta a necessidade de manuseio de erro interativo no frontend
- e maior contrato do que o problema exige nesta etapa

## Contrato recomendado
Recomendacao: **Opcao B, criar `vw_support_knowledge_public_link_candidates`**.

Justificativa:
- e o menor contrato seguro que resolve a lacuna sem inflar o picker geral
- preserva o principio do produto:
  - leitura por read model contratual
  - permissao decidida no backend
  - frontend sem composicao fragil de rotas
- separa bem o uso interno do uso de envio ao cliente
- permite evolucao futura do help center por `knowledge_space` e dominio proprio sem reescrever a UI do suporte

## Shape recomendado do contrato

### Campos minimos
- `ticket_id`
- `article_id`
- `knowledge_space_slug`
- `article_slug`
- `article_title`
- `article_visibility`
- `article_status`
- `public_article_path`
- `can_send_to_customer`
- `reason_if_blocked`

### Semantica dos campos
- `public_article_path`
  - caminho publico pronto para uso pela UI
  - exemplo atual: `/help/genius/articles/como-configurar-regra-por-motivo`
  - nao deve exigir concatenacao manual no frontend
- `can_send_to_customer`
  - boolean decidido no backend
  - `true` apenas para artigo `public` + `published` em `knowledge_space` ativo
- `reason_if_blocked`
  - mensagem curta e operacional para explicar bloqueio
  - exemplos:
    - `Artigo ainda nao publicado`
    - `Artigo visivel apenas internamente`
    - `Knowledge space publico inativo`

## Regras de seguranca e elegibilidade
- apenas artigos `public` + `published` podem ter `can_send_to_customer = true`
- `internal` e `restricted` sempre retornam `can_send_to_customer = false`
- `draft`, `review` e `archived` sempre retornam `can_send_to_customer = false`
- `public_article_path` so deve ser preenchido quando `can_send_to_customer = true`
- a view deve usar a resolucao oficial do `knowledge_space` publico ativo
- o contrato nao deve expor:
  - `tenant_id`
  - `knowledge_space_id`
  - UUIDs auxiliares de rota
  - nomes de helper, view ou RPC
  - host interno, origem privada ou path tecnico de banco

## Impacto esperado

### Em RLS e authz
- nenhum relaxamento de ACL em tabela-base
- o novo read model continua lendo apenas artigos que o suporte ja pode ver
- a parte publica do contrato projeta somente o subconjunto seguro para envio ao cliente

### Em views
- `vw_support_knowledge_article_picker` continua existindo para busca geral e referencia interna
- `vw_support_knowledge_public_link_candidates` fica especializada em envio ao cliente
- `vw_public_knowledge_space_resolver` e `vw_public_knowledge_article_detail` continuam como source of truth do roteamento publico, mas sem serem compostas na UI do suporte

### Em RPCs
- nenhuma RPC nova e obrigatoria para a proxima fase se a view dedicada for adotada
- `rpc_support_link_ticket_article` continua sendo a escrita oficial para `sent_to_customer`
- uma RPC de leitura so faria sentido se a rota publica futura exigisse logica runtime impossivel de projetar com seguranca por view

### Em UI
- o ticket pode ganhar um CTA claro:
  - `Copiar link publico`
- o estado do CTA vem do backend:
  - habilitado quando `can_send_to_customer = true`
  - bloqueado com motivo curto quando `false`
- a UI continua sem montar URL publica por heuristica

## Plano de implementacao futura

### Fase seguinte recomendada
1. criar a view `vw_support_knowledge_public_link_candidates`
2. tipar o contrato em `packages/contracts`
3. consumir a nova view no painel `Conhecimento relacionado`
4. habilitar o CTA `Copiar link publico`
5. manter `sent_to_customer` como evento auditavel independente da copia do link

### Testes pgTAP futuros
- `authenticated` continua sem `SELECT` direto em tabelas base de KB ou ticket -> KB
- a nova view nao retorna linha enviavel para artigo `internal`
- a nova view nao retorna linha enviavel para artigo `restricted`
- a nova view nao retorna linha enviavel para artigo `draft`
- a nova view nao retorna linha enviavel para artigo `review`
- a nova view nao retorna linha enviavel para artigo `archived`
- a nova view retorna `public_article_path` apenas para `public` + `published` em `knowledge_space` ativo
- cross-tenant e cross-space continuam bloqueados
- o portal futuro continua vendo apenas `sent_to_customer` seguro, nunca referencia interna

## Riscos restantes
- se o roteamento publico evoluir para host customizado por dominio, o contrato pode precisar incluir um campo adicional de URL canonica completa; isso nao e necessario neste primeiro corte
- `reason_if_blocked` precisa manter linguagem operacional e nao vazar estado interno demais
- o frontend ainda precisara decidir se o CTA copia caminho relativo ou URL absoluta; essa escolha fica para a fase de implementacao, nao para esta review

## Conclusao
O gap atual nao e de permissao de envio, mas de resolucao segura da rota publica. O menor contrato seguro e criar uma view dedicada para candidatos a link publico, deixando o picker atual focado em selecao geral de artigos e mantendo a decisao de elegibilidade e de rota no backend.
