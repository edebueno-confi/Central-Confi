# INTERNAL_UI_ACCEPTANCE_CHECKLIST.md

## Objetivo
Checklist obrigatorio para qualquer superficie interna nova ou refatorada do Genius Support OS.

## Comunicacao
- a tela explica o que o usuario faz ali
- a copy principal evita linguagem de banco, schema, view, RPC, RLS e contrato tecnico
- loading, vazio e erro orientam a proxima acao
- a linguagem esta curta, operacional e acionavel

## Informacao visivel
- o fluxo principal mostra apenas o essencial para decidir ou agir
- detalhes tecnicos ficam recolhidos em:
  - Detalhes tecnicos
  - Auditoria
  - Informacoes avancadas
- UUID, source_hash, tenant_id e nomes internos nao aparecem no fluxo principal

## Layout
- a tela opera com no maximo 2 zonas principais
- a maior area util pertence ao fluxo principal
- nao existe scroll horizontal
- nao existe texto vazando
- botoes principais sao confortaveis para clique
- a tela continua utilizavel em notebook
- se houver subsidebar, ela ajuda a limpar a area principal e nao vira coluna pesada

## Hierarquia
- existe uma acao principal evidente
- acoes secundarias foram rebaixadas
- cards nao competem todos com o mesmo peso
- badges e sinais aparecem apenas quando ajudam a decidir

## Shell interno
- sidebar pode recolher e expandir
- estado recolhido continua navegavel
- a sidebar liberou largura real para a area de trabalho
- a sidebar global nao carrega contexto detalhado da tela
- a subsidebar contextual concentra filtros, atalhos e contexto auxiliar do dominio

## Support
- fila domina a triagem
- conversa e composer ficam no eixo principal do ticket
- rail lateral nao compete com a tratativa
- historico tecnico fica sob demanda
- customer context e sintetico
- filtros e filas rapidas ficam na subsidebar, nao espalhados na area principal

## Knowledge
- a lista e a revisao usam bem a largura
- a revisao do artigo e o foco
- advisory e checklist nao ficam espremidos
- bloco tecnico da origem fica recolhido
- filtros editoriais ficam em subsidebar ou toolbar leve, nao esmagando a revisao

## Admin
- a toolbar deixa clara a operacao principal
- feed, lista ou detalhe nao parecem dashboard generico
- auditoria tecnica e detalhes internos ficam rebaixados
- filtros do dominio vivem na subsidebar quando isso melhora a largura util da lista ou detalhe

## Central Publica
- a leitura parece documentacao
- linguagem interna nao aparece ao leitor
- navegacao e busca conduzem para o proximo artigo
