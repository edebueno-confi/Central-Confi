# TASK

- Task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Codex (Reviewer mode)
- Review mode: OWNER_AUTHORIZED_SELF_REVIEW
- Coordinator: Codex

- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e

## Objetivo

Corrigir no código local as causas confirmadas da divergência da Visão Geral
quando há operação selecionada e da corrupção de textos operacionais em UTF-8,
preservando os contratos server-side existentes.

## Allowlist

- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/analytics-ceo-snapshot.mjs`
- `apps/web/src/features/analytics/analytics-ceo-snapshot.d.mts`
- `apps/web/src/features/analytics/analytics-model.ts`
- `apps/web/src/lib/operational-copy.ts`
- `supabase/migrations/20260822220000_analytics_utf8_and_scope_guard_v1.sql`
- `tests/scripts/analytics-ceo-snapshot.test.mjs`
- `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`
- `tests/scripts/utf8-encoding-integrity.test.mjs`
- estes quatro handoffs

## Fora de escopo

- alterações no HubSpot ou OMIE;
- alteração de secrets, credenciais ou configuração remota;
- aplicação remota de migration ou deploy antes de revisão independente;
- Financeiro dentro do filtro de operação;
- alterações nos arquivos de After Sale já modificados no worktree;
- substituição do modelo executável de permissões, já integrado em lote separado.

## Critérios de aceite

1. Com operação selecionada, a Visão Geral não chama `rpc_analytics_ceo_snapshot`;
   usa somente os read models operacionais confirmados e marca como
   indisponíveis as métricas sem dimensão operacional publicada.
2. A operação selecionada continua coerente nas leituras de Comercial,
   Customer Success e Suporte, sem reaproveitar valores do consolidado.
3. Os literais de fallback e o payload do KPI não exibem `Ã`, `Â` ou
   `Sem responsavel` quando a fonte publica o estado sem responsável.
4. Há regressões automatizadas para o guard de escopo e a correção UTF-8.
5. Typecheck, build, testes focados, docs validate e diff check passam.
