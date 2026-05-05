# UX_DIRECTION.md

## Premissa global
- cada dominio do Genius Support OS deve responder a operacao real do usuario que o utiliza
- layout, hierarquia, densidade de informacao e fluxo de acao nao podem ser herdados por conveniencia de uma superficie para outra
- tokens visuais, tipografia, espacamento e primitives podem ser compartilhados
- a composicao da tela deve ser determinada pelo trabalho real do usuario, nao pela implementacao tecnica por baixo

## Regra de linguagem
- toda tela deve explicar o que o usuario faz ali, nao como o sistema foi implementado
- copy deve ser curta, direta, operacional e orientada a proxima acao
- fluxo principal nao deve expor linguagem de banco, schema, read model, RPC, contrato, RLS ou backend
- mensagens de erro, vazio e loading devem orientar a proxima acao do usuario
- linguagem tecnica so pode aparecer em areas recolhidas como:
  - Detalhes tecnicos
  - Auditoria
  - Informacoes avancadas

## Regra de informacao visivel
- mostrar apenas o essencial para decidir, agir ou revisar
- detalhes tecnicos e metadados longos ficam recolhidos por padrao
- o fluxo principal nao deve exibir:
  - UUID
  - source_hash
  - nomes de views ou RPCs
  - nomes de schema
  - tenant_id
  - nomes internos de contrato
  - detalhes de seguranca de banco

## Regra de layout
- menos cards e mais superficies de trabalho
- shell interno opera em 3 camadas quando necessario:
  - sidebar principal para navegacao global
  - subsidebar contextual para filtros, tools, atalhos e contexto auxiliar
  - area principal para a tarefa real
- toolbar por dominio sempre que houver triagem, filtro ou acoes recorrentes
- no maximo 2 zonas principais por tela na maior parte dos casos
- rails laterais servem apoio operacional e podem ser recolhidos
- drawers e accordions guardam contexto secundario, trilha tecnica e acoes de excecao
- zero scroll horizontal
- texto nunca pode vazar
- a acao principal precisa ser evidente e confortavel para clique
- telas internas devem continuar usaveis em notebook

## O que pode ser compartilhado
- tipografia base
- escala de espacamento
- tokens de cor
- primitives de formulario, painel e estado
- comportamento de sidebar colapsavel em ambientes internos
- primitives de subsidebar contextual, desde que o conteudo continue sendo especifico do dominio

## O que nao deve ser compartilhado por inercia
- layout principal de pagina
- ordem de blocos
- nivel de destaque de metricas
- hierarquia de contexto lateral
- distribuicao entre lista, detalhe e rail
- linguagem de empty, loading e erro

## Leituras por dominio

### Support Workspace
- foco em fila, conversa, resposta, nota interna, status, responsavel e contexto do cliente
- a fila deve dominar a triagem
- o ticket precisa parecer uma ferramenta de atendimento diario, nao dashboard
- conversa e composer ficam no fluxo principal
- a tratativa do ticket deve assumir formato de workspace de conversa:
  - cabecalho operacional compacto
  - toolbar util dentro da propria superficie
  - mensagens do cliente e da equipe em lados distintos
  - nota interna visualmente separada
  - rail direito apenas com acoes do ticket, cliente, conhecimento e atividade recente
- historico tecnico fica recolhido
- contexto do cliente apoia a tratativa, sem dominar a tela

### Knowledge Admin
- foco em curadoria editorial, revisao de conteudo e publicacao segura
- master/detail real e leitura confortavel para revisao
- advisory, checklist e trilha tecnica nao podem competir ao mesmo tempo
- a revisao do artigo deve ser o centro da tela

### Admin Console
- foco em governanca, tenants, acessos, auditoria e controle operacional
- deve priorizar manutencao segura e leitura clara
- nao deve impor sua hierarquia a superficies operacionais como suporte

### Customer Context
- foco em stack do cliente, integracoes, alertas, contatos e tickets recentes
- deve funcionar como apoio de tratativa, nao CRM comercial generico
- detalhes internos e observacoes longas ficam recolhidos

### Central Publica
- foco em leitura simples, busca e navegacao por artigos
- deve parecer documentacao B2B, nao admin nem dashboard
- linguagem interna ou tecnica de implementacao nao deve aparecer ao leitor

## Gate estrutural para superficies operacionais
- superficies operacionais nao podem abrir com muitos blocos equivalentes competindo ao mesmo tempo
- a maior area util deve pertencer ao fluxo principal da tarefa
- contexto secundario nao pode esmagar lista, conversa ou revisao
- subsidebars devem reduzir carga cognitiva, nunca criar uma terceira coluna pesada
- badges devem existir apenas quando ajudam a decidir ou priorizar
- acoes de excecao devem ser rebaixadas ou recolhidas

## Regra de subsidebar contextual
- a sidebar principal nunca carrega contexto detalhado da tela
- a subsidebar contextual muda por dominio e rota
- a subsidebar concentra:
  - filtros
  - filas rapidas
  - atalhos
  - contexto auxiliar
  - ferramentas operacionais
- a subsidebar deve ser compacta, escaneavel e colapsavel quando a largura precisar voltar para a area principal
- detalhe tecnico, trilha de auditoria e historico longo continuam em accordion ou drawer, nao na camada inicial da subsidebar

## Regra de decisao para futuras fases
- antes de reutilizar um layout existente, validar se a operacao real do dominio e a mesma
- se a operacao for diferente, criar estrutura propria do dominio usando as mesmas primitives
- padronizacao visual nao pode sacrificar clareza operacional
- qualquer nova superficie interna deve passar pelo checklist de `INTERNAL_UI_ACCEPTANCE_CHECKLIST.md`
