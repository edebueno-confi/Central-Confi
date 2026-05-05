# Admin Knowledge Design Spec

## Tela

`/admin/knowledge`

## Objetivo

Permitir gestão interna da base de conhecimento: artigos, categorias, revisão, publicação e vínculo com Central Pública.

Deve ser uma tela editorial-operacional, não uma lista genérica.

## Estrutura

### Sidebar Admin

Itens:
- Tenants.
- Knowledge, ativo.
- Access.
- System.

### Topbar

Pills:
- `DEVELOPMENT`
- `PLATFORM_ADMIN`

### Cabeçalho

Título: `Knowledge`.

Subtítulo:
- Gestão de artigos, categorias, revisão e publicação.

### Tabs

Usar:
- Artigos, ativo.
- Categorias.
- Revisão.
- Publicados.

### KPIs

Compactos:
- Rascunhos.
- Em revisão.
- Publicados.
- Públicos.

## Layout principal

Grid em 3 colunas.

### Coluna esquerda: filtros editoriais

Card `Gestão editorial`.

Conteúdo:
- Listas rápidas:
  - Meus rascunhos.
  - Em revisão.
  - Publicados.
  - Públicos.
- Filtros:
  - Status.
  - Categoria.
  - Visibilidade.
  - Autor.
- Botão `Novo artigo`.

### Centro: artigos

Lista densa de artigos.

Cada linha:
- Título.
- Categoria.
- Status editorial.
- Visibilidade.
- Autor.
- Última atualização.
- Menu kebab.

Status:
- DRAFT.
- REVIEW.
- PUBLISHED.
- PUBLIC.

Linha selecionada com destaque azul claro.

### Rail direito: artigo selecionado

Título: `Preview do artigo`.

Conteúdo:
- Card navy com título.
- Status.
- Visibilidade.
- Categoria.
- Autor.
- Última atualização.
- CTAs:
  - `Editar artigo`.
  - `Abrir público`, apenas quando publicado e público.
- Cards:
  - Checklist editorial.
  - Histórico recente.
  - Vínculos com tickets.

## Proibições

- Publicar sem indicar revisão.
- Misturar artigo interno e público sem visibilidade.
- Expor rascunho na Central Pública.
- Tela parecer tabela administrativa seca.

## Critérios de aceite

- Fluxo editorial claro.
- Publicação pública é explícita.
- Diferença entre interno e público fica evidente.
