# Public Article Blueprint Spec

## Rota

`/help/genius/articles/:slug`

## Objetivo

Criar a tela pública de leitura de artigo da Central de Ajuda, com navegação clara, leitura confortável, índice lateral e artigos relacionados.

A tela deve seguir a blueprint aprovada de Artigo Público e o contrato visual do `GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`.

## Estrutura visual obrigatória

### 1. Header público

Não usar sidebar navy.

Topbar horizontal clara, altura aproximada entre 64px e 72px.

À esquerda:
- Logo/ícone Genius.
- Texto `Genius Support OS`.

Centro:
- Link `Início`.
- Link `Todos os artigos`.
- Menu `Categorias`.

Direita:
- Campo de busca compacto.
- Placeholder: `Buscar artigos...`.
- Hint visual: `Ctrl K`.

### 2. Breadcrumb

Logo abaixo da topbar.

Exemplo:
`Central de ajuda > Migração > Checklist de pré-migração`

Aparência:
- Texto pequeno.
- Ícones discretos.
- Separadores sutis.
- Altura compacta.

### 3. Layout principal

Grid de 3 colunas:

- Coluna esquerda: índice do artigo, largura aproximada 300px.
- Coluna central: conteúdo do artigo, largura confortável de leitura.
- Coluna direita: artigos relacionados e feedback, largura aproximada 320px.

Fundo:
- Claro.
- Sem sidebar escura.
- Cards brancos com bordas sutis.

## Coluna esquerda

### Card `NESTE ARTIGO`

Lista numerada de seções:
1. Visão geral, ativo.
2. Validações iniciais.
3. Infraestrutura.
4. Aplicações e serviços.
5. Banco de dados.
6. Segurança.
7. Backup.
8. Comunicação.
9. Checklist final.

Item ativo:
- Fundo azul muito claro.
- Barra vertical azul à esquerda.
- Texto azul.

### Card `Precisa de mais ajuda?`

Texto:
`Abra um ticket com nosso time de suporte.`

CTA:
- Botão azul `Abrir ticket`.

## Conteúdo central

Card ou área limpa de leitura.

Topo:
- Pill de categoria, ex: `Migração`.
- Título grande:
  `Checklist de pré-migração`
- Metadados:
  - `Atualizado em 12/05/2026`
  - `5 min de leitura`

Bloco informativo:
- Fundo azul claro.
- Ícone de informação.
- Texto:
  `Este checklist ajuda a garantir que todos os pontos críticos sejam validados antes de iniciar uma migração de ambiente.`

Conteúdo:
- Seções numeradas.
- Títulos fortes.
- Parágrafos curtos.
- Bullets.
- Espaçamento confortável.
- Foco total na leitura.

Exemplo de seções:
- `1. Visão geral`
- `2. Validações iniciais`
- `3. Infraestrutura`
- `4. Aplicações e serviços`

Rodapé:
- Footer simples:
  `© 2026 Genius Support OS. Todos os direitos reservados.`

## Coluna direita

### Card `ARTIGOS RELACIONADOS`

Lista de links:
- Ícone de documento.
- Título do artigo relacionado.
- Separador entre itens.

Exemplos:
- `Como validar a integridade após migração`
- `Rollback de migração: quando e como`
- `Boas práticas de migração de banco de dados`
- `Erro de autenticação no pós-migração`

### Card `ESTE ARTIGO FOI ÚTIL?`

Dois botões:
- Like.
- Dislike.

Botões quadrados, discretos, com borda.

## Estados

### Artigo não encontrado
- Manter header público.
- Card central com título `Artigo não encontrado`.
- Texto de orientação.
- CTA `Voltar para a central`.

### Loading
- Header visível.
- Skeleton no índice.
- Skeleton no artigo.
- Skeleton em relacionados.
- Nunca exibir tela branca.

### Sem relacionados
- Card direito mostra:
  `Nenhum artigo relacionado disponível.`

## Proibições

- Não usar sidebar Admin.
- Não usar sidebar Support Workspace.
- Não expor conteúdo interno.
- Não expor termos como Supabase, RPC, schema, backend ou role.
- Não mostrar rascunhos.
- Não criar visual de dashboard administrativo.
- Não alterar backend, schema, RPCs, contracts ou fixtures.

## Critérios de aceite

- A tela deve parecer uma central pública profissional.
- A leitura deve ser limpa e confortável.
- O índice esquerdo deve orientar a navegação.
- Os artigos relacionados devem estar no rail direito.
- O header público deve diferenciar claramente essa tela dos workspaces internos.
