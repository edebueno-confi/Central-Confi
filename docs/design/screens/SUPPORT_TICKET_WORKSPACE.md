# Support Ticket Workspace Design Spec

## Tela

`/support/tickets/:ticketId`

## Objetivo

Transformar a tratativa de ticket em uma estação operacional de atendimento B2B, com foco em conversa, contexto, resposta e ações rápidas.

Esta tela não deve parecer dashboard administrativo nem lista de cards.

## Referência visual

Blueprint aprovada: Ticket Workspace.

O PNG é referência visual complementar. Este spec é o contrato textual obrigatório.

## Estrutura obrigatória

### Sidebar

- Navy profunda.
- Largura compacta.
- Logo Genius Support Workspace no topo.
- Itens:
  - Fila
  - Tickets, ativo
  - Clientes
  - Knowledge
  - Admin
- Card do usuário no rodapé.

### Topbar

- Altura baixa.
- Pills à esquerda:
  - `DEVELOPMENT`
  - `AGENT WORKSPACE`
- Botão `Encerrar sessão` à direita.
- Não duplicar cabeçalhos.

### Header do ticket

Deve ser compacto.

Conteúdo:
- Status pill.
- Prioridade/severidade.
- ID curto.
- Título do ticket.
- Linha única de metadados:
  - Cliente
  - Solicitante
  - Responsável
  - Última atualização

Proibido:
- Header alto.
- Card gigante.
- Bloco com excesso de respiro vertical.

### Tabs

Usar tabs para troca de contexto:

- Conversar, ativo.
- Conhecimento.
- Central de ajuda.
- Mais ações.

A tab ativa deve usar underline azul discreto.

### Thread central

A thread é o centro da tela.

Regras:
- Mensagens do cliente à esquerda.
- Mensagens do agente à direita.
- Bubbles compactas.
- Timestamps discretos.
- Avatares pequenos.
- Separador de data sutil.
- Nota interna dentro do fluxo, com visual próprio.

Nota interna:
- Fundo âmbar claro.
- Label `NOTA INTERNA`.
- Deve parecer parte da operação, não card solto.

Proibido:
- Lista espaçada de mensagens.
- Cards administrativos empilhados.
- Espaço vazio excessivo.

### Composer

Deve ficar integrado ao rodapé da thread.

Conteúdo:
- Alternância `Resposta pública` e `Nota interna`.
- Área de texto.
- Ícones pequenos para anexos, formatação e menção.
- Seletor de visibilidade.
- Botão primário `Enviar resposta`.

Proibido:
- Composer como card gigante separado.
- Composer fora do fluxo da conversa.

### Rail direito

Largura compacta.

Seções obrigatórias:
1. Ações do ticket.
2. Cliente.
3. Conhecimento relacionado.
4. Atividade recente.

Card `Cliente`:
- Único local permitido para CTA de cliente.
- CTA: `Ver detalhes do cliente`.

Proibido:
- `Abrir ERP`.
- `Abrir cliente` na toolbar superior.
- Rail largo ou verboso.

## Densidade

- Alta densidade útil.
- Pouco respiro vertical.
- Cards com altura controlada.
- Layout deve parecer ferramenta de trabalho.

## Critérios de aceite

- A primeira impressão lembra claramente a blueprint.
- Thread parece conversa operacional real.
- Header não domina a página.
- Composer integrado.
- Rail direito compacto.
- Nenhum backend/schema/RPC/contract/fixture alterado.
