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

## Fora de escopo do workspace
- atendimento a shopper final
- omnichannel B2C
- chat widget
- IA ativa
- portal B2B
