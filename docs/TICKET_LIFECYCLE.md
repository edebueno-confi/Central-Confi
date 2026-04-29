# TICKET_LIFECYCLE.md

## Status oficiais
- `new`
- `triage`
- `waiting_customer`
- `waiting_support`
- `waiting_engineering`
- `in_progress`
- `resolved`
- `closed`
- `cancelled`

## Máquina de estados executável

Transições válidas na migration atual:

- `new` -> `triage`, `waiting_customer`, `waiting_support`, `waiting_engineering`, `in_progress`, `resolved`, `cancelled`
- `triage` -> `waiting_customer`, `waiting_support`, `waiting_engineering`, `in_progress`, `resolved`, `cancelled`
- `waiting_support` -> `triage`, `waiting_customer`, `waiting_engineering`, `in_progress`, `resolved`, `cancelled`
- `waiting_customer` -> `waiting_support`, `in_progress`, `resolved`, `cancelled`
- `waiting_engineering` -> `waiting_support`, `in_progress`, `resolved`, `cancelled`
- `in_progress` -> `waiting_customer`, `waiting_support`, `waiting_engineering`, `resolved`, `cancelled`
- `resolved` -> `closed`, `waiting_support`, `in_progress`
- `closed` -> `waiting_support`

Regras:
- transição para o mesmo status é inválida;
- `rpc_update_ticket_status` não fecha ticket diretamente;
- `rpc_close_ticket` exige estado atual `resolved`;
- `rpc_reopen_ticket` só atua sobre `resolved` ou `closed`;
- `cancelled` não possui reabertura na versão atual.

## Campos críticos do ticket
- `tenant_id`
- `requester_contact_id`
- `title`
- `description`
- `source`
- `status`
- `priority`
- `severity`
- `created_by_user_id`
- `assigned_to_user_id`
- `resolved_at`
- `closed_at`
- `close_reason`

## Visibilidade de comunicação

### Mensagem pública
- armazenada em `ticket_messages`
- `visibility = customer`
- aparece em `vw_ticket_timeline` para membros autorizados do tenant
- pode ser criada via `rpc_add_ticket_message`

### Nota interna
- armazenada em `ticket_messages`
- `visibility = internal`
- só aparece para perfis com permissão interna
- pode ser criada via `rpc_add_internal_ticket_note`

## Eventos obrigatórios já materializados
- `ticket_created`
- `status_changed`
- `assigned`
- `unassigned`
- `message_added`
- `internal_note_added`
- `resolved`
- `closed`
- `reopened`
- `cancelled`

## Fechamento

`closed` exige:
- ticket previamente `resolved`
- `close_reason` não vazio
- geração de `closed_at`
- geração de `ticket_event`
- geração de `audit.audit_logs`

## Reabertura

Reabertura atual:
- status final volta para `waiting_support`
- motivo opcional é registrado em `metadata`
- gera evento `reopened`
- preserva histórico completo

## Restrições de acesso
- todo ticket pertence a exatamente um tenant;
- todo anexo pertence ao tenant e ao ticket;
- leitura do app ocorre por views;
- escrita do app ocorre por RPCs;
- mutações de ticket geram trilha em `ticket_events` e `audit.audit_logs`.
