# IMPLEMENTATION

Task: ANALYTICS-DASHBOARD-OVERVIEW-SCOPE-AND-CHARTS-2026-08-25
State: READY_FOR_REVIEW
Owner: Sentinel
Role: REVIEWER
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: REVIEW_ACTIVE
Base SHA: f12f57b7
Implementation SHA: UNCOMMITTED_WORKTREE

## Plano de execução

1. Ler os componentes de Visão Geral, Comercial, filtros e contratos atuais.
2. Mapear quais gráficos são snapshot, movimento do período ou série temporal.
3. Remover duplicação da Visão Geral sem eliminar informação necessária.
4. Concentrar gráficos comerciais na aba Comercial com filtros e estados
   existentes.
5. Adicionar regressões determinísticas para período, operação, loading e
   respostas obsoletas.
6. Executar gates proporcionais e entregar ao Sentinel sem alterar banco ou
   serviços externos.

## Requisitos adicionados pelo proprietário

- Funil atual por estágio deve recalcular com o período selecionado.
- Regressões devem provar Todas/After Sale, pipeline, operação e todos os
  estágios retornados pelo contrato.
- O seletor de pipeline deve ocupar menos espaço sem perder acessibilidade.
- Revisar as abas Analytics sem ampliar o escopo para banco ou remoto.
- Após o núcleo Comercial, levantar read-only a origem dos KPIs ausentes de
  Customer Success, incluindo atraso, recorrência, clientes, joins financeiros
  e dimensão operacional; não corrigir por fallback ou zero artificial.

## Evidência da auditoria e implementação

O código executável entregue neste lote mantém a Visão Geral concentrada em
mapa, KPIs executivos e atenção operacional, sem duplicar os gráficos detalhados
das abas. Em `AnalyticsCommercialPage.tsx`, o funil agora é apresentado como
recorte do período selecionado, coerente com o snapshot comercial que envia
período, operação, pipeline, estágio e exclusões à RPC. O texto anterior dizia
que o funil era posição atual fora da coorte e foi removido para não contradizer
o contrato real. A separação entre `Posição` e `Evolução`, invalidação antes de
nova geração e descarte de respostas obsoletas foi preservada.

Em `AnalyticsPipelineCombobox.tsx`, o seletor foi compactado por largura,
altura e espaçamento. O valor selecionado continua visível; `button`,
`aria-expanded`, `aria-controls`, `role=option`, seleção e controles de teclado
foram preservados. Não houve alteração de contrato, autorização ou fonte de
dados.

Foram adicionadas regressões determinísticas em
`analytics-kpi-contract-parity.test.mjs` para a composição Overview/Comercial,
coorte do período, Todas/After Sale, operação, exclusão de pipeline, todos os
estágios publicados e seletor compacto. O teste
`analytics-kpi-contract-remote-application-preflight.test.mjs` permanece
desacoplado do `handoffs/current/TASK.md` mutável e conserva as asserções do
preflight remoto histórico, usando o artefato estável da própria task remota.

## Levantamento read-only de Customer Success

O levantamento foi somente documental e de código, sem alterar
`AnalyticsCustomerSuccessPage.tsx`, banco, HubSpot ou OMIE. A tela chama
`getCustomerSuccessKpisV2(groupCompany || null)` em
`apps/web/src/features/analytics/AnalyticsCustomerSuccessPage.tsx` e o cliente
envia somente `p_group_company` para
`rpc_analytics_customer_success_kpis_by_operation` em
`apps/web/src/features/analytics/analytics-api.ts`. Portanto, o recorte de CS
não recebe período, stage ou exclusões de pipeline neste contrato.

Fatos rastreáveis:

- `supabase/migrations/20260807130000_analytics_kpi_read_models_v1.sql:560-746`
  define o contrato base de `rpc_analytics_customer_success_kpis_v2()` sobre
  `vw_analytics_customer_financial_link`, publicando clientes ativos, MRR,
  atraso e `top_overdue_customers`, mas deixa clientes sem atividade,
  associações abertas e séries de churn como indisponíveis/aguardando histórico.
- A versão posterior em
  `supabase/migrations/20260807170000_analytics_kpi_read_models_v3.sql:348-594`
  adiciona campos reais de atividade e o vínculo ticket->empresa via
  `vw_analytics_ticket_company`. O estado é calculado pela cobertura observada,
  sem zero artificial. Os campos de atraso e recorrência por responsável vêm
  do mesmo conjunto `enriched`, que parte da carteira financeira.
- `supabase/migrations/20260807160000_analytics_hubspot_native_dates_v1.sql:233-283`
  define `vw_analytics_customer_financial_link`: a base de empresas é ligada a
  títulos OMIE por `tax_id_normalized`; nome, domínio e e-mail não participam do
  match. A ausência de CNPJ compatível reduz `has_financial_link` e a cobertura,
  mas não elimina a linha da empresa da base.
- `supabase/migrations/20260822073000_analytics_pipeline_operation_governance_findings_v1.sql:191-271`
  envolve a RPC por operação e calcula separadamente tickets elegíveis e
  associações ticket->empresa. A operação não altera a carteira financeira
  inteira: ela apenas publica `operation_scope` com estado, motivo, contagens e
  cobertura. `operation_ticket_coverage_missing`,
  `ticket_company_association_missing` e `ticket_company_association_partial`
  são estados do vínculo operacional, não prova de ausência de clientes.
- `supabase/migrations/20260604193000_cs_portfolio_contract_foundation.sql:35-57`
  publica `vw_cs_customer_portfolio`, mas marca
  `health_summary_status='unavailable'`; portanto health score não é uma
  dimensão disponível neste contrato.

Classificação dos sintomas solicitados:

- Atraso: há fonte e join financeiros publicados por CNPJ normalizado. Se a
  empresa não aparece em `top_overdue_customers`, as hipóteses verificáveis são
  ausência de linha ativa, saldo vencido não positivo, CNPJ ausente/incompatível
  ou estado de identidade financeira incompleta. Não há evidência local neste
  lote para escolher entre elas.
- Recorrência: `mrr`/`mrr_overdue` dependem de `vw_analytics_customer_base` e da
  configuração `mrr_source`; quando a origem ou o CNPJ não é resolvido, o
  contrato publica `unavailable`/`partial`. Isso é lacuna de cobertura/configuração,
  não autorização para preencher zero.
- Clientes: `active_customers` vem da carteira ativa da base HubSpot/financeira,
  e não do conjunto de títulos. Uma diferença entre clientes e financeiro não
  prova join incorreto. O join financeiro é `LEFT JOIN`, então o caso primário é
  cliente sem correspondência financeira, não cliente descartado.
- Atraso/recorrência/clientes por operação: a RPC de operação usa pipeline de
  ticket para medir cobertura ticket->empresa, mas não filtra a carteira
  financeira por uma dimensão operacional publicada. Assim, não se deve inferir
  que a operação selecionada é uma carteira CS financeira completa. Isso é uma
  dimensão não publicada no contrato atual, não um fallback a ser criado na UI.
- Health, churn, NRR/GRR e histórico temporal continuam não publicados ou sem
  série suficiente conforme os estados do read model. A ausência é contratual,
  não um erro que possa ser corrigido com zero, mock ou join heurístico.

Conclusão do levantamento: há evidência de fonte financeira e joins canônicos,
mas não de paridade numérica servida, cobertura real por operação ou causa
individual de cada cliente ausente. Recomenda-se uma task posterior de
reconciliação read-only por empresa, com contagens de base ativa, CNPJ, vínculo
financeiro, estado de identidade e elegibilidade de pipeline antes de qualquer
alteração de UI ou contrato.

## Allowlist e exclusões

Allowlist efetiva:

- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`;
- `apps/web/src/features/analytics/AnalyticsPipelineCombobox.tsx`;
- `tests/scripts/analytics-kpi-contract-parity.test.mjs`;
- `tests/scripts/analytics-dashboard-filter-provenance.test.mjs`;
- `tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs`,
  somente para remover a leitura/assertion do TASK corrente mutável;
- `handoffs/current/TASK.md`;
- `handoffs/current/IMPLEMENTATION.md`;
- `handoffs/current/STATUS.md`.

`handoffs/current/REVIEW.md` foi preservado sem edição pelo executor. Todos os
arquivos preexistentes exibidos por `git status`, inclusive documentação,
`package.json`, `scripts/run-focused-tests.mjs`, migrations e handoffs
arquivados, permanecem fora deste lote. A task 112
`ANALYTICS-DASHBOARD-MOBILE-RESPONSIVE-2026-08-25` também permanece fora do
escopo; não foram alterados mobile, viewport ou shell.

## Validações

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs` e testes
  diretamente relacionados em conjunto: 35/35 PASS;
- `node --test tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs`:
  3/3 PASS após a correção do acoplamento;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 947 módulos transformados;
- `npm run lint`: PASS, 0 erros e 157 warnings preexistentes;
- `npm run docs:validate`: PASS, 0 bloqueios, com alertas documentais já
  existentes;
- `npm run review:gates`: PASS, 0 regressões bloqueantes contra 47 itens do
  baseline;
- `git diff --check`: PASS.

- `npm run test:focused`: PASS, 403/403; a correção estrutural removeu apenas a
  dependência do gate remoto no `TASK.md` corrente e preservou suas asserções de
  contrato.

## Limitações e pedido de revisão

As regressões são determinísticas e estáticas. O levantamento de Customer
Success também é read-only e não comprova dados servidos por usuário autenticado.
Não houve QA visual autenticado,
validação de RPC/PostgREST servido, RLS/cross-tenant ponta a ponta,
performance real, produção, migration, banco, integração externa, push, merge
ou deploy. O painel temporal da Comercial mantém a janela independente prevista
no contrato e não deve ser interpretado como duplicação ou como série inventada
do período do KPI.

Entrega em `READY_FOR_REVIEW` para revisão independente do Sentinel. A ação
esperada é validar a allowlist, o diff e as evidências, sem editar código de
produto ou aprovar por silêncio. Transferência notificada ao Sentinel e ao
Codex: task 99, base `f12f57b7`, implementação `UNCOMMITTED_WORKTREE`,
allowlist registrada acima, gates focused 403/403, typecheck/build/lint/docs/
review/diff PASS, levantamento de Customer Success read-only e task mobile 112
fora do lote.
