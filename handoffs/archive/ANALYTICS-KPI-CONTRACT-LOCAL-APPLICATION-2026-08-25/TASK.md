# TASK

- Task: ANALYTICS-KPI-CONTRACT-LOCAL-APPLICATION-2026-08-25
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 815e6a4f0bde49b84041dc370f543b6c00b08db2

## Objetivo

Aplicar, somente no Supabase local canônico, a migration candidata de contrato
de KPIs para que as RPCs de seis argumentos usadas por Comercial e Suporte
existam e a matriz autenticada possa avançar sem HTTP 404.

## Evidência do bloqueio

- A matriz autenticada chegou às cinco abas para `authorized` e
  `dashboard_viewer`.
- `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation` agora existem no schema local e a
  matriz autenticada não registrou mais HTTP 404.
- A migration candidata
  `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
  possui preflight estático e shadow aprovados e foi aplicada somente no
  container local canônico pelo comando oficial.
- O gate global continua `NO_GO`/`failClosed=true` por ausência de stale
  session state e pelas exceções históricas do schema parity. A validação
  remota permanece fora do escopo.

## Alternativas registradas antes da execução

1. Autorizar aplicação controlada somente no container local canônico, sem
   reset, sem rebuild, sem SQL manual e sem qualquer acesso remoto. Depois,
   executar schema parity, testes de contrato e matriz autenticada.
2. Manter a migration não aplicada teria preservado os 404 nas consultas
   avançadas e mantido a aceitação funcional bloqueada.

## Fora de escopo

Banco remoto, produção, secrets, reset, rebuild, rollback destrutivo, SQL
manual, push, merge, deploy e alteração de integrações externas.

## Autorização registrada

Autorização operacional explícita do proprietário para resolver a questão do
banco local e reaplicar migrations quando necessário. O escopo foi reduzido à
opção 1: somente a migration candidata, no container local canônico, sem reset,
rebuild, SQL manual ou remoto.
