# IMPLEMENTATION

Task: ANALYTICS-DASHBOARD-DOMAIN-FILTER-PARITY-2026-08-25
State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: daa6731f
Implementation SHA: FINALIZE_LOCAL

## Resultado

O lote confirmou a paridade de dimensões publicadas e corrigiu uma divergência
reproduzível no Suporte. O KPI e o snapshot aceitam etapa e exclusões, mas os
read models auxiliares de posição atual aceitam somente operação. Antes da
correção, esses auxiliares eram consultados e exibidos mesmo quando uma etapa
ou exclusão estava selecionada. Agora a consulta é omitida e a interface mostra
estado indisponível explícito, sem exibir o universo não filtrado como se fosse
o recorte solicitado. O estado já era limpo antes de cada geração e respostas
canceladas continuam sem commit.

Também foi aplicado o ajuste visual solicitado nos filtros inline: Operação usa
largura menor, Pipelines usa mais espaço, a lista usa tipografia e espaçamento
compactos e a segunda linha do pipeline só aparece quando o nome oficial é
realmente diferente do nome exibido. Seleção, busca, `aria-controls`,
`aria-expanded`, `role=listbox`, `role=option` e navegação por teclado foram
preservados.

## Auditoria por superfície

- **Comercial:** `analytics-api.ts` envia período, operação, etapa e exclusões
  quando publicados. `AnalyticsCommercialPage.tsx` mantém query key, limpeza,
  loading e descarte de respostas obsoletas. O funil já respeita a coorte do
  período, operação, pipeline, etapa e estágios publicados; não houve nova
  mudança de contrato.
- **Suporte:** KPIs e snapshot recebem período, operação, status/etapa,
  prioridade e exclusões. `getSupportStageBreakdown` e
  `getSupportQueueHealth` publicam somente posição atual por operação. A
  correção em `AnalyticsCsPage.tsx` impede consulta/renderização auxiliar para
  etapa ou exclusões e exibe indisponibilidade honesta.
- **Customer Success:** `getCustomerSuccessKpisV2` publica somente
  `p_group_company`; não publica série temporal, período, etapa ou exclusões.
  A ausência de atraso, recorrência ou clientes não é zero inferido. O estado
  observado depende da associação ticket→empresa e da identidade/cobertura
  financeira Companies/OMIE; join, filtro, ausência de dados e dimensão não
  publicada não foram convertidos em uma causa única.
- **Financeiro:** permanece consolidado. Quando uma operação é selecionada, a
  tela informa indisponibilidade, sem atribuir o consolidado a uma operação.
- **Visão Geral:** reutiliza os caminhos de KPI/read model e as exclusões das
  abas; não foi criado fallback consolidado para operação.

## Evidências locais e fontes

As fontes auditadas foram `apps/web/src/features/analytics/analytics-api.ts`,
`AnalyticsCeoPage.tsx`, `AnalyticsCommercialPage.tsx`, `AnalyticsCsPage.tsx`,
`AnalyticsCustomerSuccessPage.tsx`, `AnalyticsFinancePage.tsx`,
`AnalyticsOperationScope.tsx`, `AnalyticsPipelineCombobox.tsx` e a migration
local de governança operacional
`supabase/migrations/20260822070000_analytics_pipeline_operation_governance_v1.sql`.
As assinaturas auxiliares não foram ampliadas. Nenhuma migration, RPC, RLS,
ACL, banco ou integração externa foi alterada.

## Allowlist efetiva

- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsOperationScope.tsx`
- `apps/web/src/features/analytics/AnalyticsPipelineCombobox.tsx`
- `tests/scripts/analytics-dashboard-domain-filter-parity.test.mjs`
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`
- `docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`

`handoffs/current/REVIEW.md` foi preservado. Não devem entrar no stage as
alterações preexistentes em `docs/PROJECT_STATE.md`, `docs/README.md`,
`docs/ROADMAP_BUILDOUT_V3.md`, `docs/engineering/OWNER_DECISIONS.md`,
`docs/reports/REMOTE_SUPABASE_TRUNCATE_PRIVILEGE_APPLICATION_2026-08-25.md`,
`handoffs/README.md`, `package.json`, `scripts/run-focused-tests.mjs`, plano,
relatórios, arquivos arquivados e migration órfã de outras frentes.

## Gates executados

- `node --test tests/scripts/analytics-dashboard-domain-filter-parity.test.mjs`: **7/7 PASS**.
- `node --test tests/scripts/analytics-dashboard-help-center.test.mjs tests/scripts/analytics-kpi-contract-parity.test.mjs`: **22/22 PASS** após atualizar a expectativa legítima da largura inline.
- `npm run test:focused`: **410/410 PASS**.
- `npm run web:typecheck`: **PASS**.
- `npm run web:build`: **PASS**, **947 módulos**.
- `npm run lint`: **PASS**, 0 erros e 157 warnings legados do repositório.
- `npm run docs:validate`: **PASS**, 0 bloqueios.
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens de baseline resolvidos.
- `git diff --check`: **PASS**.

## Limitações

Não houve QA browser autenticado neste lote, validação de RPC/PostgREST/RLS
servido, prova cross-tenant, equivalência numérica remota, performance real,
produção, HubSpot/OMIE write, migration ou ação externa. O ajuste visual foi
validado por compilação e regressão estrutural determinística, não por screenshot
autenticado. A task mobile 112 permanece separada.

## Transferência

Entrega `READY_FOR_REVIEW` ao Sentinel e ao Codex. A ação esperada é revisão
independente do diff, dos contratos e das evidências. Não houve commit, push,
merge, deploy, migration ou escrita externa.
