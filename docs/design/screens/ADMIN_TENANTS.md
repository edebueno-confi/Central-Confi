# Admin Tenants Design Spec

## Tela

`/admin/tenants`

## Objetivo

Control plane para platform_admin gerenciar tenants, status, memberships e contexto operacional de clientes B2B.

Não deve parecer cadastro simples.

## Estrutura obrigatória

### Sidebar Admin

Navy profunda, adaptada ao Admin Console.

Itens:
- Tenants, ativo.
- Knowledge.
- Access.
- System.

Brand:
- `GENIUS Admin Console`.

Rodapé:
- Card do operador admin.

### Topbar

Pills:
- `DEVELOPMENT`
- `PLATFORM_ADMIN`

Ações:
- `Recolher menu`
- `Encerrar sessão`

### Cabeçalho

Título: `Tenants`.

Subtítulo:
- Explicar base operacional de clientes B2B, status e contexto.

## Layout principal

Grid em 3 colunas.

### Coluna esquerda: ferramentas

Card `Ferramentas de tenants`.

Conteúdo:
- Resumo da base.
- Métricas:
  - Tenants.
  - Ativos.
  - Suspensos.
  - Contatos ativos.
- Ações rápidas:
  - Criar tenant.
  - Importar tenants.
  - Exportar relatório.
  - Configurações da base.
- Filtros:
  - Status.
  - Membership.
  - Última atualização.
- Botão `Limpar filtros`.

### Centro: base de tenants

Card/lista `Base de tenants`.

Elementos:
- Busca por tenant, slug ou contato.
- Ordenação.
- Contador de resultados.

Cada linha:
- Status pill.
- Membership count.
- Nome do tenant.
- Slug.
- Nome legal.
- Contato principal.
- Última atualização.
- Menu kebab.

Linha selecionada:
- Destaque azul claro.
- Indicador de seleção.

### Rail direito: tenant selecionado

Título: `Tenant selecionado`.

Card principal:
- Avatar/monograma.
- Nome.
- Slug.
- Empresa.
- Status.
- Memberships.
- Contato principal.
- CTA `Ver contato`.

Tabs:
- Resumo.
- Membros.
- Status.
- Atividade.

Resumo:
- Memberships.
- Contatos ativos.
- SLA críticos.
- Incidentes abertos.
- Informações do tenant.
- Saúde e risco.
- Ações rápidas:
  - Abrir contexto operacional.
  - Gerenciar memberships.
  - Ver tickets do tenant.
- Última atividade.

## Proibições

- Layout de tabela crua sem contexto.
- Misturar Admin Console com Support Workspace.
- Mostrar ações não suportadas por contrato.
- Cards muito altos.

## Critérios de aceite

- Parece control plane B2B.
- Tenant selecionado tem contexto suficiente.
- Sidebar Admin é distinta, mas da mesma família visual.
