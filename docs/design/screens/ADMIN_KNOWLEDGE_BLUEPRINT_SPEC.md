# Admin Knowledge Blueprint Spec

## Rota

`/admin/knowledge`

## Objetivo

Criar a tela administrativa de gestão da base de conhecimento, com foco em operação editorial: listar, filtrar, revisar, publicar, editar, duplicar e arquivar artigos.

A tela deve seguir a blueprint aprovada de Admin Knowledge e o contrato visual do `GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`.

## Estrutura visual obrigatória

### 1. Sidebar Admin

Sidebar fixa, navy profunda, largura aproximada entre 240px e 260px.

Topo:
- Logo/ícone Genius.
- Texto `Genius Support OS`.

Seção:
- Label `ADMIN CONSOLE`.

Itens:
- `Tenants`
- `Knowledge`, ativo.
- `Access`
- `System`

Item ativo:
- Fundo azul/navy mais claro.
- Ícone à esquerda.
- Texto branco.
- Chevron discreto à direita quando aplicável.

Rodapé:
- Card do usuário admin.
- Avatar pequeno.
- Nome: `Platform Admin`.
- Identificador: `platform_admin`.

### 2. Topbar

Altura compacta, aproximadamente 64px.

À esquerda:
- Pill `DEVELOPMENT`.
- Pill `PLATFORM_ADMIN`.

À direita:
- Ação `Encerrar sessão`.

Não usar header grande duplicado.

### 3. Header da página

Título: `Knowledge`.

Subtítulo:
`Gerencie artigos, categorias e publicação na central de ajuda.`

Ação primária no canto direito:
- Botão azul `+ Novo artigo`.

### 4. Layout principal

Grid de 3 colunas:

- Coluna esquerda: filtros, largura aproximada 240px.
- Coluna central: lista de artigos, flexível.
- Coluna direita: pré-visualização, largura aproximada 320px.

Gap visual: 16px a 24px.

## Coluna esquerda: filtros

Card com título `FILTROS`.

Conteúdo obrigatório:
- Campo de busca com placeholder `Buscar artigos...`.
- Seção `STATUS`:
  - Todos
  - Publicado
  - Rascunho
  - Em revisão
  - Arquivado
- Contadores alinhados à direita.
- Seção `CATEGORIAS`:
  - Todos
  - Migração
  - Servidores
  - Aplicações
  - Banco de Dados
  - Redes
  - Link `+ Ver todas`
- Seção `AUTOR` com select.
- Seção `DATA` com select, ex: `Últimos 90 dias`.

Aparência:
- Card branco.
- Borda sutil.
- Radius entre 12px e 16px.
- Itens de filtro compactos.
- Item selecionado com fundo azul muito claro.

## Coluna central: artigos

Card principal com título `Artigos (128)`.

Topo do card:
- Título à esquerda.
- Select de ordenação à direita, ex: `Mais recentes`.

Tabela/lista densa com colunas:
- `TÍTULO`
- `CATEGORIA`
- `AUTOR`
- `DATA`
- `STATUS`

Linhas:
- Altura moderada, densa.
- Título do artigo em destaque.
- Categoria como pill.
- Status como pill:
  - `Publicado`, verde.
  - `Em revisão`, amarelo.
  - `Rascunho`, cinza.
- Data em formato curto.
- Autor visível.

Rodapé:
- Texto `Mostrando 1-8 de 128 artigos`.
- Paginação à direita.

## Coluna direita: pré-visualização

Card com título `PRÉ-VISUALIZAÇÃO`.

Conteúdo:
- Título do artigo selecionado, ex: `Checklist de pré-migração`.
- Badge de status `Publicado`.
- Metadados em linhas:
  - Categoria
  - Autor
  - Atualizado em
  - Leitura estimada
  - Visibilidade
  - Última publicação
  - Versão
- Descrição curta do artigo.
- Seção `AÇÕES`.

Botões:
- `Editar`, neutro.
- `Duplicar`, neutro.
- `Arquivar`, destrutivo com borda/vermelho.

## Estados

### Vazio
Quando não houver artigos:
- Manter layout de 3 colunas.
- Centro exibe empty state dentro do card.
- Mensagem: `Nenhum artigo encontrado`.
- Ação: `Criar novo artigo`.

### Loading
- Skeleton no card de filtros.
- Skeleton nas linhas da tabela.
- Skeleton na pré-visualização.
- Nunca renderizar texto solto.

### Erro
- Card central com mensagem objetiva.
- Ação de retry.
- Não quebrar shell.

## Proibições

- Não alterar backend, schema, RPCs, contracts ou fixtures.
- Não expor termos técnicos como Supabase, RPC, schema, views ou backend.
- Não usar dashboard genérico.
- Não inflar cards.
- Não criar ações que não existam no contrato.
- Não misturar Central Pública com Admin Knowledge.

## Critérios de aceite

- A tela deve lembrar claramente a blueprint de Admin Knowledge.
- O layout deve ser 3 colunas.
- O painel direito deve funcionar como preview editorial.
- A lista deve ser densa e operacional.
- O botão `Novo artigo` deve estar no topo direito.
- A sidebar Admin deve permanecer consistente com Admin Console.
