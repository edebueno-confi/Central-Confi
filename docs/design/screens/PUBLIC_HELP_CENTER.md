# Public Help Center Design Spec

## Telas

`/help/genius`
`/help/genius/articles`
`/help/genius/articles/:slug`

## Objetivo

Criar uma Central de Ajuda pública para clientes B2B, com conteúdo aprovado, navegável e seguro.

Deve parecer produto de conhecimento público, não workspace interno.

## Estrutura visual

### Não usar sidebar navy

A Central Pública deve usar:
- Fundo claro.
- Coluna contextual clara à esquerda.
- Conteúdo central.
- Painel contextual à direita quando necessário.

### Coluna esquerda

Cards empilhados:
1. Brand card:
   - `Genius Returns`
   - Badge `PÚBLICO`
   - Descrição curta.
2. `Contato técnico`
   - E-mail de suporte.
   - Documentação oficial.
   - Status da plataforma.
   - Site institucional.
3. `Navegação`
   - Visão geral.
   - Todos os artigos.
   - Categorias.
4. `Últimos publicados`.

### Hero central

Conteúdo:
- Eyebrow `VISÃO GERAL`.
- Headline:
  - `Encontre rápido a orientação certa para operar a plataforma.`
- Texto informando que só há conteúdo público e aprovado.
- CTA primário: `Ver todos os artigos`.
- Pill: quantidade de artigos publicados.

### Tabs

Usar:
- Visão geral.
- Artigos.
- Categorias.

### Busca

Bloco `BUSCAR ARTIGO`.

Input grande:
- Placeholder com exemplos.
- Botão `Buscar`.

### Painel direito

Card `Como esta camada funciona`.

Explicar:
- Conteúdo público.
- Revisão antes de publicação.
- Sem material interno.

Quick links:
- E-mail de suporte.
- Documentação oficial.
- Status da plataforma.

## Seções inferiores

### Resultado da busca

Empty state útil:
- Explicar que o usuário deve digitar pelo menos 2 caracteres.
- Não parecer erro.

### Navegar por categoria

Cards:
- Primeiros passos.
- Configuração.
- Integrações.
- Transportadoras.

### Artigo em destaque

Card compacto com:
- Título.
- Resumo.
- Badge `PÚBLICO`.
- Data.

## Tela de artigo público

Deve conter:
- Coluna esquerda com navegação.
- Artigo central com leitura limpa.
- Título.
- Categoria.
- Data.
- Badge `PÚBLICO`.
- Conteúdo em blocos bem espaçados.
- Rail direito com índice do artigo e artigos relacionados.

## Proibições

- Expor termos internos.
- Expor Supabase, RPC, schema, backend, role global.
- Misturar conteúdo rascunho.
- Usar visual de Admin Console.
- Usar sidebar navy interna.

## Critérios de aceite

- Parece central pública.
- Mantém família visual Genius.
- Conteúdo fica legível.
- Busca e categorias são óbvias.
