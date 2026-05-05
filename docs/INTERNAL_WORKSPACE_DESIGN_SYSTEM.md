# INTERNAL_WORKSPACE_DESIGN_SYSTEM.md

## Objetivo
Fixar um mini design system para superficies operacionais internas do Genius Support OS, com foco em area util, baixa carga cognitiva e continuidade de uso diario.

## Regra principal
- dominio define composicao, hierarquia e fluxo
- tokens visuais podem ser compartilhados
- shell, lista, detalhe, rail e toolbar devem responder ao trabalho real do usuario

## Shell interno
- sidebar interna deve ser colapsavel
- estado expandido precisa mostrar navegacao clara
- estado recolhido precisa continuar util por icone ou inicial
- sessao atual deve ser compacta quando expandida e minima quando recolhida
- sidebars internas nao devem conter cards textuais longos
- o shell deve liberar largura real para a superficie principal
- quando a tela exigir contexto constante, usar subsidebar contextual entre a sidebar global e a area principal

## Sidebar
- labels de acao simples e curtas
- itens principais do Support:
  - Queue
  - Tickets
  - Customers
  - Knowledge
  - Admin quando autorizado
- itens principais do Admin:
  - Tenants
  - Knowledge
  - Access
  - System
- estado recolhido nao pode quebrar navegacao

## Subsidebar contextual
- funciona como coluna operacional leve, nunca como painel pesado
- pode ser fixa ou recolhivel, conforme o dominio
- serve para:
  - filtros da tela
  - atalhos de fila ou recortes rapidos
  - contexto auxiliar
  - ferramentas do dominio
- nao deve carregar:
  - narrativa longa
  - checklist extenso aberto por padrao
  - historico tecnico completo
  - blocos redundantes da area principal
- a subsidebar precisa continuar usavel em notebook sem empurrar a area principal para uma largura desconfortavel

## Density
- densidade media por padrao
- listas podem ser mais densas que paineis de decisao
- formularios tecnicos, observacoes internas longas e eventos de sistema ficam recolhidos
- o usuario nao deve receber mais de uma camada de decisao simultanea sem necessidade

## Botoes
- acao principal: altura minima de 48px
- acao secundaria: altura minima de 44px
- CTA principal sempre no lugar onde a decisao acontece
- acoes de excecao ficam em accordion, drawer ou bloco avancado

## Badges e sinais
- usar badges apenas para status, prioridade, severidade, alerta ou risco
- evitar mais de 2 ou 3 sinais fortes ao mesmo tempo no fluxo principal
- detalhes secundarios devem virar texto compacto ou bloco recolhido

## Toolbars
- cada dominio deve ter toolbar propria
- a toolbar organiza filtro, busca, recorte e recarregar
- metricas devem ser compactas e em linha
- nada de grid grande de cards tipo dashboard para abrir uma operacao diaria

## Rails
- rail lateral serve apoio utilitario
- deve conter apenas o que acelera a decisao atual
- o rail pode ser recolhido quando a largura precisa voltar ao fluxo principal
- contexto extenso, trilha tecnica e acoes avancadas ficam recolhidos

## Drawers e accordions
- usar para:
  - detalhes tecnicos
  - auditoria
  - historico tecnico
  - informacoes avancadas
  - acoes de excecao
- o conteudo recolhido nao pode ser requisito para a operacao basica diaria

## Comportamento por viewport

### Desktop largo
- lista dominante + detalhe ou detalhe + rail utilitario
- zero scroll horizontal
- area principal sempre maior que a secundaria

### Notebook
- foco em duas zonas claras
- nada de colunas estreitas demais para texto ou formularios
- sidebars recolhiveis e rails compactos sao obrigatorios

### Mobile basico
- sequencia vertical simples
- fila antes do detalhe
- detalhes secundarios recolhidos

## Aplicacao inicial por dominio

### Support
- queue: subsidebar com filtros, filas rapidas e atalhos; area principal com fila dominante e preview curto
- ticket:
  - cabecalho operacional compacto com metadados essenciais
  - toolbar util dentro da propria superficie
  - area principal com conversa em formato de troca real e composer amplo
  - cliente de um lado, equipe do outro, nota interna separada
  - rail direito com status, responsavel, cliente, conhecimento e atividade recente
  - historico tecnico e acoes avancadas recolhidos
- customers: subsidebar com clientes acessiveis e atalhos; area principal com stack, alertas, tickets recentes e contatos

### Knowledge
- subsidebar editorial com knowledge space, filtros e itens recolhidos de checklist/advisory
- lista de artigos compacta em master/detail
- revisao do artigo como foco dominante da area principal
- origem tecnica secundaria e recolhida

### Admin
- subsidebar por dominio com filtros e acoes recorrentes
- leitura administrativa clara na area principal
- detalhes tecnicos sempre recolhidos
- auditoria so expande quando o operador precisa investigar

## Nao objetivos
- nao virar dashboard executivo
- nao virar CRM comercial generico
- nao justificar linguagem tecnica no fluxo principal
- nao esconder a navegacao quando o shell estiver recolhido
