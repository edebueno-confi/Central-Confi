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
- aparece em `vw_ticket_timeline` para membros autorizados do tenant e representa comunicação B2B com o cliente da plataforma, não com shopper final
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
- todo ticket representa operação B2B da plataforma, não atendimento a consumidor final da loja;
- todo anexo pertence ao tenant e ao ticket;
- leitura do app ocorre por views;
- escrita do app ocorre por RPCs;
- mutações de ticket geram trilha em `ticket_events` e `audit.audit_logs`.

## Leitura arquitetural para o Support Workspace
- `vw_tickets_list` deve sustentar a fila operacional inicial
- `vw_ticket_detail` deve sustentar o painel de detalhe inicial
- `vw_ticket_timeline` deve sustentar a timeline unica do ticket
- a proxima camada de suporte nao deve duplicar a maquina de estados atual; deve reaproveita-la
- comentarios publicos e notas internas precisam continuar explicitamente separados na UX futura

## Camada contratual atual do Support Workspace
- `vw_support_tickets_queue` e a fila oficial para suporte interno B2B
- `vw_support_ticket_detail` e o detalhe oficial do ticket para o workspace
- `vw_support_ticket_timeline` e a timeline oficial do workspace com mensagens publicas e notas internas
- `vw_support_customer_360` concentra contexto minimo do tenant sem virar CRM
- a escrita continua via RPCs ja existentes de ticketing; esta fase nao cria mutacoes novas

## Boundary de autorizacao da Fase 6.1
- `platform_admin` acessa todos os tenants
- `support_agent` e `support_manager` acessam apenas tenants em que tenham membership ativo
- membros comuns do tenant nao acessam o workspace de suporte
- `engineering_member` e `engineering_manager` continuam fora da superficie de suporte nesta fase, mesmo conseguindo operar partes do ticketing core

## Lacunas ainda abertas antes da UI
- vinculo ticket -> artigo de KB
- vinculo ticket -> item de engenharia
- camada executavel de SLA
