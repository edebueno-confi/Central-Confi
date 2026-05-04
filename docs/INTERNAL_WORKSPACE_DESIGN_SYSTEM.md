# INTERNAL_WORKSPACE_DESIGN_SYSTEM.md

## Objetivo
Fixar a direção de UX para superfícies internas operacionais do Genius Support OS, começando pelo Support Workspace.

## Regra principal
- o dominio define a composicao da tela
- tokens, cores, tipografia e primitives podem ser compartilhados
- shell, densidade, foco visual e ordem de blocos nao podem ser herdados por conveniencia

## Shell interno
- sidebar colapsavel por padrao operacional
- largura expandida suficiente para rotulo e largura recolhida suficiente para icone e navegacao rapida
- sessao atual compacta, sem cards textuais longos
- topbar curta com titulo da rota, contexto e acoes principais
- em notebook, o shell precisa preservar largura util real para o workspace
- em mobile, a navegacao do shell vira faixa horizontal simples

## Density
- superficies operacionais devem usar densidade media
- listas podem ficar mais densas que areas de decisao
- formularios tecnicos, eventos de sistema e metadados devem ser recolhidos por padrao
- cada tela deve operar com no maximo 2 zonas principais

## Botoes
- acoes principais: altura minima de 48px
- acoes secundarias: altura minima de 44px
- botoes principais devem ficar no fluxo onde a decisao acontece
- acoes de excecao ficam recolhidas ou rebaixadas

## Badges
- badges existem para decisao e prioridade, nao para decoracao
- no fluxo principal, mostrar no maximo 2 ou 3 sinais simultaneos
- severidade, prioridade, status e alerta ativo podem usar destaque
- metadados secundarios devem virar texto compacto

## Rails
- o rail lateral serve operacao essencial, nao contexto exaustivo
- deve conter apenas o que acelera a decisao atual
- detalhes extensos ficam em accordion ou detalhes recolhidos
- o rail pode ser recolhido quando a conversa ou lista precisam de largura total

## Drawers e accordions
- drawers servem apoio temporario e nao devem substituir a pagina principal
- accordions guardam:
  - historico tecnico
  - eventos repetitivos
  - observacoes internas longas
  - fallback tecnico
  - acoes de excecao

## Toolbar operacional
- toolbar fica no topo da superficie principal
- filtros mostram apenas o necessario para triagem
- a acao de recarregar e utilitaria
- metricas devem ser compactas e em linha

## Desktop e notebook
- desktop largo: lista dominante + rail utilitario
- notebook: duas zonas claras, sem colunas estreitas demais
- nenhuma tela pode desperdiçar largura deixando o fluxo principal comprimido
- zero scroll horizontal em workspaces operacionais

## Aplicacao inicial no Support Workspace
- `/support/queue`: fila dominante e preview leve
- `/support/tickets/:ticketId`: conversa e composer no centro; operacao no rail
- `/support/customers/:tenantId`: contexto do cliente em leitura operacional curta, sem virar CRM pesado

## Nao objetivos
- nao virar dashboard executivo
- nao virar CRM comercial generico
- nao substituir contratos backend por heuristica visual
