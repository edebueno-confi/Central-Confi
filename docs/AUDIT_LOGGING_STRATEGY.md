# AUDIT_LOGGING_STRATEGY.md

## Objetivo
Garantir rastreabilidade de ações relevantes, segurança e capacidade de diagnóstico operacional.

## Eventos auditáveis
- login sensível ou troca de contexto;
- criação de ticket;
- alteração de status;
- alteração de prioridade;
- atribuição de responsável;
- criação/edição/publicação de artigo;
- criação de work item;
- vínculo ticket ↔ work item;
- upload/download de anexo sensível;
- alterações de permissão;
- ações de IA.

## Regras
- Audit log deve ser append-only.
- Não permitir update/delete direto.
- Registrar actor, tenant, ação, entidade, timestamp e metadata.
- Não registrar segredo ou token.

## Diferença entre event log e audit log
- ticket_events: timeline de negócio visível conforme permissão.
- audit_logs: trilha técnica/compliance, mais restrita.
