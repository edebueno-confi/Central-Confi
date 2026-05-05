# Admin Access Blueprint Spec

## Rota

`/admin/access`

## Objetivo

Criar a tela administrativa de governança de acesso, com gestão de usuários, papéis, tenants, permissões e convites.

A tela deve seguir a blueprint aprovada de Admin Access e o contrato visual do `GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`.

## Estrutura visual obrigatória

### 1. Sidebar Admin

Sidebar fixa, navy profunda, largura aproximada entre 240px e 260px.

Topo:
- Logo Genius.
- Texto `Genius Support OS`.

Seção:
- Label `ADMIN CONSOLE`.

Itens:
- `Tenants`
- `Knowledge`
- `Access`, ativo.
- `System`

Item ativo:
- Fundo azul/navy mais claro.
- Ícone à esquerda.
- Texto branco.
- Chevron discreto à direita, se aplicável.

Rodapé:
- Card do admin:
  - Avatar.
  - `Platform Admin`.
  - `platform_admin`.

### 2. Topbar

Altura compacta.

À esquerda:
- Pill `DEVELOPMENT`.
- Pill `PLATFORM_ADMIN`.

À direita:
- `Encerrar sessão`.

### 3. Header da página

Título:
`Access`

Subtítulo:
`Gerencie usuários, papéis, permissões e convites da plataforma.`

Ação primária no canto direito:
- Botão azul `+ Convidar usuário`.

### 4. Tabs

Abaixo do header.

Tabs:
- `Usuários`, ativo.
- `Papéis`.
- `Convites`.
- `Permissões`.

Tab ativa:
- Texto azul.
- Underline azul.

## Layout principal

Grid de 3 colunas:

- Coluna esquerda: filtros, largura aproximada 240px.
- Coluna central: lista/tabela, flexível.
- Coluna direita: detalhes do usuário, largura aproximada 320px.

## Coluna esquerda: filtros

Card com título `FILTROS`.

Conteúdo:
- Campo de busca com placeholder `Buscar usuários...`.
- Select `PAPEL`.
- Grupo `SITUAÇÃO` com checkboxes:
  - Todos
  - Ativo
  - Inativo
  - Bloqueado
- Select `TENANT`.
- Botão `Limpar filtros`.

Aparência:
- Card branco.
- Borda sutil.
- Radius médio.
- Inputs compactos.
- Checkboxes alinhados.

## Coluna central: usuários

Card/lista com título:
`Usuários (32)`

Tabela com colunas:
- `Usuário`
- `Papel`
- `Tenant`
- `Situação`
- `Último acesso`

Linhas:
- Densas.
- E-mail/nome do usuário visível.
- Papel curto: Agent, Admin, Service.
- Tenant visível.
- Status como pill:
  - `Ativo`, verde.
  - `Inativo`, vermelho claro ou cinza.
- Último acesso em data/hora curta.

Linha selecionada:
- Fundo azul muito claro.
- Borda sutil.

Rodapé:
- Contagem: `1-12 de 32 usuários`.
- Paginação.
- Select `12 por página`.

## Coluna direita: detalhes do usuário

Card com título:
`DETALHES DO USUÁRIO`

Centro do card:
- Avatar circular com iniciais, ex: `JS`.
- Nome, ex: `João Silva`.
- E-mail.
- Pill `Ativo`.

Metadados em lista:
- Papel.
- Tenant.
- Último acesso.
- MFA.

Seção `Ações`:
- Botão `Editar`.
- Botão `Resetar senha`.
- Botão destrutivo `Desativar`.

## Estados

### Nenhum usuário encontrado
- Manter layout.
- Centro exibe empty state no card.
- Mensagem: `Nenhum usuário encontrado`.
- Ação: `Limpar filtros`.

### Loading
- Skeleton na lista e detalhes.
- Sidebar/topbar mantidas.
- Nunca tela branca.

### Erro
- Card central com mensagem e retry.
- Não mostrar stack trace.

## Regras de segurança visual

- Ações destrutivas devem ter cor e borda vermelha.
- Reset de senha deve ser neutro, mas destacado o suficiente.
- Permissões e papéis devem ser explícitos.
- MFA deve aparecer como informação de segurança.

## Proibições

- Não alterar backend, schema, RPCs, contracts ou fixtures.
- Não expor Supabase, RPC, schema, views ou backend.
- Não esconder usuários sem tenant, usar `Indisponível`.
- Não criar permissões não existentes.
- Não transformar em tabela crua sem painel de detalhe.
- Não misturar Support Workspace com Admin Console.

## Critérios de aceite

- A tela deve lembrar claramente a blueprint de Admin Access.
- O layout deve ser 3 colunas.
- Usuário selecionado deve aparecer no painel direito.
- Tabs devem organizar o contexto de acesso.
- O botão `Convidar usuário` deve ficar no topo direito.
- A sidebar Admin deve ser consistente com Tenants e Knowledge.
