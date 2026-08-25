# IMPLEMENTATION

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-REMOTE-PREFLIGHT-2026-08-25`
State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: eea38cc8
Implementation SHA: UNCOMMITTED_WORKTREE

## Plano de execução

Lote aprovado e arquivado. A aplicação remota não pertenceu a este lote e
permanece NOT_RUN.

O lote foi read-only. Consultas executadas pelo conector Supabase no projeto
`jzmmvfcmruasqmrdmbup`; nenhuma migration ou SQL de escrita foi executada.

## Evidência

- Identidade: ConfiOne, `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.111, us-east-1.
- Histórico: 299 migrations; candidatos 20260825123000 e 20260824210000 ausentes.
- `analytics_source_config`: sete colunas necessárias presentes; 38 linhas,
  30 ativas/classificadas/confirmadas e 3 ativas ambíguas.
- `can_read_analytics()`: owner postgres, SECURITY DEFINER, search_path vazio,
  EXECUTE authenticated/service_role e ausência para anon.
- Helpers presentes: `kpi_entry`, `kpi_ratio`,
  `set_analytics_operation_scope` e `analytics_pipeline_operation_eligible`;
  ACL somente postgres, sem EXECUTE para anon/authenticated/service_role.
- Semântica: ratio válido 25, numerador nulo e universo inválido NULL;
  entry sem valor retorna `unavailable`.
- Wrappers novos Comercial/Suporte de seis argumentos e filtered ausentes;
  wrappers antigos de operação de quatro argumentos presentes.
- Smoke HTTP autenticado: `NOT_PROVEN`; nenhuma sessão, secret ou credencial
  foi lida.
- Estado: `REMOTE_PREFLIGHT_NO_GO`, `failClosed=true`, application `NOT_RUN`.
