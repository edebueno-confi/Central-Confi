# Support Queue Design Spec

## Tela

`/support/queue`

## Objetivo

Criar uma fila operacional para triagem, priorização e entrada rápida em tickets.

A tela deve funcionar como bancada de trabalho do suporte, não como dashboard genérico.

## Estrutura obrigatória

### Sidebar

- Navy profunda.
- Item ativo: `Fila`.
- Itens:
  - Fila
  - Tickets
  - Clientes
  - Knowledge
  - Admin

### Topbar

- Pills:
  - `DEVELOPMENT`
  - `AGENT WORKSPACE`
- Botão `Encerrar sessão`.

### Cabeçalho da página

Título: `Fila operacional`

Subtítulo curto explicando priorização e atendimento.

### Tabs

Usar tabs para troca de contexto:

- Fila dominante, ativo.
- Minhas filas.
- Não atribuídos.
- Urgentes.

### KPIs

Linha compacta de indicadores:
- Abertos
- Urgentes
- Não atribuídos
- Aguardando cliente

Não usar cards altos.

## Layout principal

Usar grid em 3 colunas.

### Coluna esquerda: triagem

Card `Triagem da fila`.

Deve conter:
- Texto curto de apoio.
- Listas rápidas:
  - Meus tickets
  - Não atribuídos
  - Urgentes
  - Aguardando cliente
- Filtros:
  - Status
  - Prioridade
  - Severidade
  - Cliente
  - Responsável
- Botão `Recarregar`.

### Centro: lista da fila

Card principal: `Fila dominante`.

Lista densa de tickets.

Cada item deve conter:
- Status pill.
- Título.
- Cliente.
- Responsável.
- Última atividade.
- Prioridade/severidade.
- Menu de ações.

Item selecionado:
- Fundo azul muito claro.
- Borda ou indicador lateral sutil.

### Rail direito: preview

Título: `Preview do ticket`.

Deve conter:
- Card navy do ticket selecionado.
- Status e prioridade.
- Título.
- Cliente.
- Responsável.
- Última atividade.
- CTA primário: `Atender ticket`.
- CTA secundário: `Ver cliente`.
- Card de prévia de atendimento.
- Card de cliente/contexto.

## Proibições

- Tela parecer relatório.
- Cards inflados.
- Lista com muito espaço vazio.
- Preview genérico sem ação.
- Duplicar header do shell.

## Critérios de aceite

- Fila parece ferramenta de triagem operacional.
- Preview lateral facilita decisão antes de abrir ticket.
- Tabs são usadas para contexto.
- Layout consistente com Ticket Workspace.
