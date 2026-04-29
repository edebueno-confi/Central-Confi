# TICKET_LIFECYCLE.md

## Status sugeridos
- new
- triage
- waiting_customer
- waiting_support
- waiting_engineering
- in_progress
- resolved
- closed
- cancelled

## Transições controladas
Toda mudança de status deve passar por regra backend e gerar evento.

## Campos críticos
- status
- priority
- severity
- assigned_to
- requester_contact_id
- tenant_id
- source
- due_at
- resolved_at
- closed_at

## Eventos obrigatórios
- ticket_created
- status_changed
- priority_changed
- assigned
- message_added
- attachment_added
- escalated_to_engineering
- linked_to_work_item
- resolved
- closed

## Fechamento
Ticket só deve ser fechado com:
- motivo;
- responsável;
- data;
- histórico preservado;
- devolutiva registrada quando aplicável.
