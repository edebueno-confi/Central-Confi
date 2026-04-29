# SLA_STRATEGY.md

## Objetivo
Controlar prazos de atendimento com base em prioridade, severidade, cliente e horário operacional.

## Regras
SLA deve ser calculado no backend, nunca no frontend.

## Dimensões possíveis
- tenant
- plano do cliente
- prioridade
- severidade
- tipo de ticket
- horário comercial
- feriados
- status pausáveis

## Métricas iniciais
- first_response_due_at
- resolution_due_at
- first_response_at
- resolved_at
- breached_first_response
- breached_resolution

## Pausas de SLA
Status que podem pausar SLA devem ser explícitos, como:
- waiting_customer
- waiting_external

## MVP
No MVP, implementar SLA simples por prioridade antes de regras sofisticadas.
