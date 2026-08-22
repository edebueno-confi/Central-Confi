# TASK

- Task ID: R1-PRODUCTION-MIGRATION-RECONCILIATION-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Agent coordination: REVIEW_ACTIVE
- Hold owner: none
- Hold reason: none
- Hold scope: none
- Hold started: none
- Resume condition: revisão independente concluída
- Base SHA: 1adb1f7cf98186ba4b395507031b25a3a43fdff4
- Approval: APPROVED

## Objetivo

Reconciliar os guards das migrations de escopo operacional e semântica temporal
com as definições efetivamente encontradas no Supabase de produção, registrar
as evidências do reparo e manter o próximo `db push` reproduzível.

## Allowlist

- `supabase/migrations/20260821090000_analytics_timeseries_operation_scope_v1.sql`
- `supabase/migrations/20260821100000_analytics_temporal_semantics_timezone_v1.sql`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/charts/OwnerPerformanceCharts.tsx`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `docs/reports/R1_PRODUCTION_MIGRATION_RECONCILIATION_2026-08-22.md`
- `docs/DEPLOYMENT_STRATEGY.md`
- `handoffs/current/*`

## Fora de escopo

- Dados de negócio, secrets, credenciais, usuários ou sincronizações externas.
- Alteração de RLS fora das migrations já autorizadas.
- Alteração dos arquivos preexistentes da frente After Sale.

## Critérios de aceite

1. Os guards reconhecem whitespace equivalente sem remover proteção de contrato.
2. A migration temporal mantém as fronteiras `America/Sao_Paulo` e passa os
   testes pgTAP.
3. A documentação registra o projeto remoto, a reconciliação e as limitações
   sem expor credenciais.
4. Typecheck, build, focused, pgTAP, docs, review gates e diff check passam.
