# SUPPORT_WORKFLOW.md

## Fluxo padrão
1. Ticket criado.
2. Classificação inicial.
3. Priorização.
4. Atribuição.
5. Investigação.
6. Resposta técnico-operacional ao cliente B2B ou time interno.
7. Vínculo com artigo, se existir.
8. Escalonamento para engenharia, se necessário.
9. Devolutiva.
10. Encerramento com motivo.

## Responsabilidades do suporte
- Manter histórico claro.
- Usar macros e artigos quando aplicável.
- Não perder contexto em canais externos.
- Escalar para engenharia com evidência suficiente.
- Registrar retorno técnico para o cliente B2B ou stakeholder interno correto.

## Dados mínimos para escalonar
- Cliente B2B/tenant.
- Impacto.
- Evidência.
- Passos para reproduzir.
- Integração afetada.
- Prints/logs/anexos.
- Resultado esperado.
- Resultado atual.

## Anti-padrões
- Resolver por WhatsApp sem registrar.
- Resolver por e-mail sem registrar.
- Abrir bug sem contexto.
- Fechar ticket sem devolutiva.
- Usar conhecimento informal sem artigo.

## Direção arquitetural do Support Workspace
- o Support Workspace futuro deve partir da fila de tickets, nao de dashboard pesado
- a lista operacional deve ser a superficie dominante
- o detalhe do ticket deve concentrar timeline, composer, atribuicao e acoes de status
- o contexto do cliente B2B deve existir como visao 360 enxuta, sem virar CRM generico
- escalonamento para engenharia continua parte do fluxo, mas sem transformar suporte em board tecnico completo nesta fase
- timeline e customer context nao podem carregar historico infinito na primeira tela; a operacao deve partir de recortes recentes e controlados

## Authz atual do workspace
- a superficie de suporte interna agora esta contratada em read models proprios:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_customer_360`
  - `vw_support_ticket_timeline_recent`
  - `vw_support_customer_recent_tickets`
  - `vw_support_customer_recent_events`
- `platform_admin` pode ler a operacao completa
- `support_agent` e `support_manager` leem apenas os tenants em que possuem membership ativo
- membros comuns do tenant continuam fora do workspace
- engenharia continua fora destes read models especificos ate existir contrato proprio para Engineering Workspace

## Customer 360 minimo
- tenant operacional e seu status
- contatos ativos do tenant
- tickets recentes
- contagem de tickets por status
- eventos recentes relevantes
- sem metricas pesadas, SLA executavel ou funil comercial

## Proxima camada de contexto do cliente
- o Support Workspace ja validou a necessidade de um perfil operacional mais rico do cliente B2B
- esse dominio fica especificado em `CUSTOMER_ACCOUNT_PROFILE_SPEC.md`
- a proposta minima de modelo fica revisada em `CUSTOMER_ACCOUNT_PROFILE_DATA_MODEL_REVIEW.md`
- o desenho tecnico pre-migration desse dominio fica consolidado em `CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md`
- o suporte precisa consultar, antes da resposta:
  - produto ativo
  - plano e modulos relevantes
  - stack operacional principal
  - customizacoes e alertas
  - contatos por finalidade
- esse contexto deve apoiar a tratativa sem transformar a tela em CRM generico

## Boundary materializado na Fase 6.8
- o suporte continua lendo apenas por read models contratuais, nunca por tabela-base do perfil do cliente
- o primeiro read model executável desse dominio agora e `vw_support_customer_account_context`
- a manutencao do perfil operacional passou a existir apenas por RPCs administrativas dedicadas
- `platform_admin` continua como write actor garantido do primeiro corte
- `support_manager` e `support_agent` continuam apenas com leitura controlada por tenant no MVP do dominio
- o workspace agora consome esse contexto de forma controlada:
  - `/support/tickets/:ticketId` mostra apenas produto, status operacional, tier, plataforma, integrações principais, features relevantes, customizações de risco e alertas ativos no rail
  - `/support/customers/:tenantId` expande stack, integrações, features, customizações, alertas, contatos e tickets recentes sem virar CRM pesado
  - observacoes internas, flags e detalhes extensos ficam recolhidos por padrao

## Superficie minima ja implementada
- `/support` redireciona para a fila oficial `/support/queue`
- `/support/queue` e `/support/tickets` usam a fila dominante de tickets do workspace
- `/support/tickets/:ticketId` ancora o detalhe operacional do ticket
- `/support/customers/:tenantId` materializa a visao 360 minima do cliente B2B
- a leitura dessa superficie ocorre apenas por:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline_recent`
  - `vw_support_customer_360`
  - `vw_support_customer_recent_tickets`
  - `vw_support_customer_recent_events`
  - `vw_support_assignable_agents`
- a escrita continua apenas por:
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`

## Diretrizes de UX da fase 6.2.1
- a fila continua como ponto de partida e precisa dominar a triagem
- o ticket selecionado vira o centro do atendimento, nao um detalhe lateral comprimido
- resposta publica e nota interna passam a compartilhar um composer unico com modo explicito
- timeline precisa sustentar leitura operacional continua, nao sequencia de cards equivalentes
- contexto do cliente B2B deve ser compacto e util para a tratativa
- status e atribuicao precisam aparecer como acoes operacionais do fluxo
- o workspace nao deve parecer dashboard generico nem extensao visual do Admin Console
- foco em operacao interna de suporte/CS, nunca em atendimento a shopper final

## Correcoes consolidadas na fase 6.2.2
- a fila oficial passou a mostrar apenas o essencial para triagem:
  - status
  - prioridade e severidade
  - titulo
  - tenant
  - responsavel
  - ultima atividade
- o preview lateral da fila existe apenas para decidir o atendimento; nao concorre com a lista dominante
- o detalhe do ticket agora segue a ordem operacional:
  1. cabecalho do ticket
  2. composer
  3. timeline
  4. rail de status, atribuicao e cliente
- resposta publica e nota interna continuam no mesmo composer, mas com mudanca explicita de modo e CTA principal grande
- user_id tecnico, fechamento e reabertura ficam recolhidos em areas avancadas
- customer context fica compacto e serve a continuidade da tratativa sem virar CRM ou painel institucional

## Diretório de agentes da fase 6.3
- o fluxo principal de atribuicao agora depende de `vw_support_assignable_agents`, nao de UUID manual no corpo da tela
- o seletor de agente lista apenas operadores ativos e atribuiveis dentro do mesmo tenant permitido
- `Atribuir a mim` e `Desatribuir` continuam usando apenas `rpc_assign_ticket`
- o `user_id` tecnico permanece recolhido como fallback excepcional, nunca como caminho principal da operacao

## Guardrails de volume da fase 6.4
- a timeline principal do ticket passa a operar por `vw_support_ticket_timeline_recent`
- a tela inicial do ticket mostra apenas a janela recente com `recent_limit`, `total_available_count` e `has_more`
- o customer context passa a separar resumo e listas recentes:
  - `vw_support_customer_360` para tenant e preview de contatos
  - `vw_support_customer_recent_tickets` para tickets recentes
  - `vw_support_customer_recent_events` para eventos recentes
- a UI nao deve simular paginacao carregando tudo por baixo
- enquanto nao existir RPC paginavel dedicada, a leitura operacional fica explicitamente limitada ao recorte recente

## Passo visual da fase 6.4.1
- a tela `/support/tickets/:ticketId` passa a tratar conversa e composer como fluxo principal de atendimento
- respostas publicas e notas internas continuam no mesmo composer, mas com modo explicito e CTA principal forte
- eventos de sistema e historico tecnico ficam recolhidos em area secundaria
- o rail operacional fica reduzido a:
  - status
  - atribuicao
  - cliente B2B compacto
  - acoes principais
- `/support/customers/:tenantId` fica como apoio operacional sintetico, sem visual de CRM pesado ou dashboard

## Shell e workspace da fase 6.10
- o Support Workspace passa a usar shell interno colapsavel proprio
- a sidebar do suporte deixa de explicar a operacao e passa a servir navegacao rapida:
  - queue
  - tickets
  - customers
  - knowledge
  - admin quando autorizado
- o ticket vira workspace unico de atendimento:
  1. cabecalho compacto
  2. composer
  3. conversa recente
  4. rail operacional recolhivel
  5. historico tecnico e acoes de excecao recolhidos
- `/support/customers/:tenantId` continua apoiando a tratativa, mas com stack, tickets, contatos e eventos em leitura curta
- a referencia visual transversal dessa camada fica em `INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`

## Fora de escopo do workspace
- atendimento a shopper final
- omnichannel B2C
- chat widget
- IA ativa
- portal B2B
