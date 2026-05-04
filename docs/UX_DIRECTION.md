# UX_DIRECTION.md

## Premissa global
- cada dominio do Genius Support OS deve responder a operacao real do usuario que o utiliza
- layout, hierarquia, densidade de informacao e interacao nao podem ser herdados por conveniencia de uma superficie para outra
- tokens visuais, primitives e consistencia de marca podem ser compartilhados
- a composicao de tela deve ser determinada pelo dominio, nao por reaproveitamento de shell generico

## Regra operacional
- Admin Console e uma superficie administrativa
- Knowledge Base Admin e uma superficie editorial
- Central Publica e uma superficie de leitura/documentacao B2B
- Support Workspace e uma superficie de tratativa operacional de tickets B2B
- futuros workspaces devem nascer da mesma logica: o dominio define a UX

## O que pode ser compartilhado
- tipografia base
- escala de espacamento
- tokens de cor
- primitives de formulario e painel
- estados vazios, loading e erro quando forem neutros

## O que nao deve ser compartilhado por inercia
- layout principal de pagina
- hierarquia de informacao
- ordem de blocos
- nivel de destaque de metricas
- comportamento do detalhe
- distribuicao de contexto lateral
- fluxo principal de acao

## Leitura por dominio

### Admin Console
- foco em governanca, leitura administrativa e manutencao de configuracao
- pode usar shell e navegacao institucional
- nao deve ditar a estrutura de superficies operacionais

### Knowledge Base Admin
- foco em curadoria, revisao e publicacao
- precisa privilegiar leitura editorial, checklist e contexto de revisao

### Central Publica
- foco em documentacao tecnica B2B legivel
- deve parecer documentacao, nao dashboard nem admin

### Support Workspace
- foco em triagem, atendimento, continuidade operacional e contexto do cliente B2B
- a fila deve ser superficie dominante
- o ticket selecionado deve ser o centro da tratativa
- a conversa entre suporte e cliente deve ocupar o fluxo principal de atendimento
- resposta publica e nota interna nao podem ser confundidas
- timeline tecnica e eventos repetitivos devem ficar rebaixados ou recolhidos
- contexto do cliente ajuda a tratativa, mas nao rouba foco do atendimento

## Regra de decisao para futuras fases
- antes de reutilizar um layout existente, validar se a operacao real do dominio e a mesma
- se a operacao for diferente, criar estrutura propria do dominio com base nas mesmas primitives
- padronizacao visual nao pode sacrificar clareza operacional

## Gate estrutural para superficies operacionais
- superficies operacionais nao devem abrir com muitos blocos equivalentes competindo ao mesmo tempo
- o layout deve privilegiar no maximo 2 zonas principais de trabalho por tela
- a area util dominante precisa pertencer ao fluxo principal da tarefa, nao a contexto secundario
- detalhes tecnicos, metadados longos e trilhas auxiliares devem ficar recolhidos por padrao
- badges e sinais visuais devem ser usados apenas quando ajudam a decidir ou priorizar
- acoes principais precisam ter tamanho confortavel e posicao previsivel
- acoes secundarias devem ser rebaixadas, agrupadas ou recolhidas
- texto nunca pode vazar ou depender de coluna estreita para continuar legivel

## Sistema interno operacional
- a direcao visual detalhada das superficies internas fica formalizada em `INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
- shells internos devem ser colapsaveis, compactos e orientados a area util
- sidebars internas servem navegacao e estado minimo, nunca cards explicativos longos
- rails laterais existem para apoio operacional utilitario e podem ser recolhidos quando a largura precisa voltar ao fluxo principal
- accordions e detalhes recolhidos sao o lugar correto para:
  - historico tecnico
  - metadados longos
  - fallback tecnico
  - acoes de excecao

## Aplicacao direta da fase 6.2.2

### Support Workspace
- fila domina a triagem em `/support/queue`
- ticket vira fluxo de tratativa em `/support/tickets/:ticketId`
- composer fica no eixo principal antes do historico tecnico
- contexto do cliente opera como rail compacto de apoio
- atribuicao tecnica avancada e acoes de excecao ficam recolhidas
- conversa recente vira a principal superficie de leitura do ticket

### Knowledge Base Admin
- curadoria editorial opera em master/detail real, sem dashboard de metricas dominando a tela
- a lista do artigo e a revisao editorial dividem a largura util da tela
- advisory, checklist e bloco tecnico ficam resumidos ou recolhidos por padrao
- a superficie deve priorizar leitura, decisao e publish controlado, nao exibicao simultanea de todos os metadados
