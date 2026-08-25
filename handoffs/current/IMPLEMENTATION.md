# IMPLEMENTATION

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-SHADOW-PREFLIGHT-2026-08-25`
State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: ecf919f2
Implementation SHA: UNCOMMITTED_WORKTREE

## Plano de execução

Foi aberto um único lote para shadow descartável. O script deverá iniciar um
container namespaced da imagem aprovada, remover somente os helpers sintéticos
do bootstrap, aplicar as duas migrations candidatas em ordem e executar probes
read-only. O container será removido ao final.

Nenhuma escrita foi feita no banco local canônico ou no Supabase remoto.

## Evidência real

- `node --test tests/scripts/analytics-kpi-remote-prerequisites-shadow-preflight.test.mjs`: 4/4 PASS.
- `node --check scripts/local-qa/analytics-kpi-remote-prerequisites-shadow-preflight.mjs`: PASS.
- Shadow: `SHADOW_REPLAY_GO`, `failClosed=true`, identidade verificada,
  `public.ecr.aws/supabase/postgres:17.6.1.158`, container descartável removido.
- Migrations aplicadas apenas no shadow, nesta ordem:
  `20260825123000_analytics_kpi_remote_prerequisites_v1.sql` e
  `20260824210000_analytics_kpi_contract_parity_v1.sql`.
- Catálogo: `kpi_entry`, `kpi_ratio`, `set_analytics_operation_scope`,
  `analytics_pipeline_operation_eligible` e os wrappers Comercial/Suporte
  presentes; grants `anon` para wrappers e helpers ausentes.
- Semântica: `kpi_ratio(1,4)=25`, numerador nulo e universo inválido retornam
  `NULL`; `kpi_entry(NULL,'test')` retorna estado `unavailable`.
- Smoke SQL autenticado no shadow: Comercial selecionado 2, excluído 1,
  Todas 2; Suporte selecionado 2, excluído 1, Todas 3.
- PostgREST servido, equivalência numérica remota, RLS/cross-tenant servido,
  performance real, browser autenticado e produção permanecem
  `NÃO COMPROVADOS`.

## Gates desta entrega

- `git diff --check`: PASS.
- Nenhuma migration canônica ou remota foi aplicada. Nenhum secret, push,
  merge, deploy ou ação externa foi executado.
