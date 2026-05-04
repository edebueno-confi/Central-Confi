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

## Authz atual do workspace
- a superficie de suporte interna agora esta contratada em read models proprios:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_customer_360`
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

## Superficie minima ja implementada
- `/support` redireciona para a fila oficial `/support/queue`
- `/support/queue` e `/support/tickets` usam a fila dominante de tickets do workspace
- `/support/tickets/:ticketId` ancora o detalhe operacional do ticket
- `/support/customers/:tenantId` materializa a visao 360 minima do cliente B2B
- a leitura dessa superficie ocorre apenas por:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_customer_360`
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

## Fora de escopo do workspace
- atendimento a shopper final
- omnichannel B2C
- chat widget
- IA ativa
- portal B2B
