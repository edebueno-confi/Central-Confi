# Central de Ajuda do Dashboard V1

Status: `READY_FOR_REVIEW` na task `ANALYTICS-DASHBOARD-OPERATION-FILTER-PROVENANCE-AND-HELP-CENTER-2026-08-25`.

Este documento descreve a origem, os campos, a fórmula, a coorte, a
granularidade e as limitações dos indicadores do Dashboard. O código
executável, migrations, RPCs, read models e testes prevalecem sobre qualquer
texto deste documento.

## Regra de leitura

O período altera coortes temporais. A posição atual é uma fotografia do estado
presente e não deve mudar apenas porque o período mudou. A evolução exige
histórico de eventos ou snapshots; não é criada a partir de uma leitura atual.

Toda entrada de KPI possui estado. `available` publica um número com cobertura
suficiente, `partial` publica um número com ressalva, e `unavailable` ou
`awaiting_history` não deve ser convertido em zero.

## Fontes e filtros

| Domínio | Fonte publicada | Contratos principais | Operação atual |
| --- | --- | --- | --- |
| Comercial | HubSpot Deals sincronizado | `rpc_analytics_commercial_kpis_by_operation`, `rpc_analytics_commercial_snapshot_by_operation` | `pipeline_id -> area_key -> group_company` no catálogo `analytics_source_config` |
| Suporte | HubSpot Tickets sincronizado | `rpc_analytics_support_kpis_by_operation`, `rpc_analytics_cs_snapshot_by_operation` | pipelines de tickets ativos e classificados |
| Customer Success | Companies, associações ticket→empresa e vínculos OMIE | `rpc_analytics_customer_success_kpis_v2`, `rpc_analytics_customer_success_kpis_by_operation` | associação real e cobertura publicada; sem inferência por nome |
| Financeiro | Read model OMIE | `rpc_analytics_finance_snapshot`, `rpc_analytics_finance_reconciliation_v1` | consolidado; After Sale exige dimensão financeira explícita |
| Visão Geral | composição dos read models | `rpc_analytics_executive_kpis_v2`, `rpc_analytics_ceo_snapshot` | reutiliza os domínios e mascara dimensões não comprovadas |

### Campos observados no HubSpot

Os campos abaixo foram consultados em auditoria read-only do portal ConfiOne,
sem registrar valores pessoais e sem escrever registros:

- Deals: `pipeline`, `dealstage`, `amount_in_home_currency`,
  `hs_projected_amount_in_home_currency`, `hubspot_owner_id`, `closedate` e
  `hs_deal_stage_probability`.
- Tickets: `hs_pipeline`, `hs_pipeline_stage`, `hs_ticket_priority`,
  `closed_date` e `hubspot_owner_id`.
- Companies: `unidades_negocio_contratadas`, `empresa_t_group__clonado_`,
  `status_do_cliente___aftersale`, `status_do_cliente___confi`,
  `status_do_cliente___neotrust`, `e_cliente_aftersale_` e
  `hs_current_customer`.

Esses campos do portal não substituem automaticamente o catálogo local. O
contrato atual usa a classificação de pipeline server-side para os recortes de
Comercial, Suporte e CS. A propriedade de empresa multioperação foi observada
como evidência de modelo, mas ainda não é a fonte publicada do Dashboard.

## Registro de indicadores

### Visão Geral

| Indicador | Fonte/campos | Fórmula ou definição | Recorte |
| --- | --- | --- | --- |
| Em negociação | Deals: `pipeline`, `dealstage`, `amount_in_home_currency` | soma de valor de negócios não fechados na posição atual | Todas ou operação com pipeline classificado |
| Ganhos e conversão | Deals: `hs_closed_at`, `is_won`, `amount_home` | ganhos fechados no período; ganhos / negócios encerrados | período e operação publicada |
| Atendimentos abertos | Tickets: `hs_pipeline`, `hs_pipeline_stage` | contagem em estágio não fechado agora | operação por pipeline |
| Atendimentos criados | Tickets: `hs_created_at` | contagem criada no intervalo | período e operação |
| MRR e clientes ativos | read model de Companies/OMIE e regra server-side | soma/contagem segundo regra configurada | consolidado enquanto dimensão operacional não for publicada |
| Recebido, a receber e vencido | read model OMIE | pagamento por data efetiva; saldo aberto e aging por vencimento | consolidado enquanto dimensão financeira não for publicada |

### Comercial

| Indicador | Campos | Fórmula |
| --- | --- | --- |
| Pipeline aberto | `pipeline_id`, `dealstage`, `amount_home`, `owner_id` | soma e contagem onde `is_closed = false` |
| Funil por etapa | `stage_id`, `stage_label`, `display_order`, `is_closed`, `is_won` | contagem/valor aberto agrupados pela etapa publicada |
| Ganhos e perdas | `hs_closed_at`, `is_won`, `amount_home` | coorte de fechamento no período |
| Taxa de ganho | `is_won`, `is_closed`, `hs_closed_at` | negócios ganhos / negócios fechados válidos |
| Ciclo | `hs_created_at`, `hs_closed_at` | diferença entre criação e fechamento dos ganhos |
| Performance por responsável | `hubspot_owner_id` | mesmas métricas agrupadas por owner |

O valor em negociação considera apenas negócios abertos. A posição do funil
não é uma coorte temporal: o período altera ganhos, perdas e demais eventos
fechados, mas não deve fazer um negócio atualmente aberto desaparecer por ter
sido criado antes do período, salvo se o contrato de posição disser o contrário.

### Suporte

| Indicador | Campos | Fórmula |
| --- | --- | --- |
| Fila aberta | `hs_pipeline`, `hs_pipeline_stage`, `hs_ticket_priority` | tickets não fechados na posição atual |
| Criados | `hs_created_at` | tickets criados no período |
| Por fonte, pipeline e responsável | `source_type`, `hs_pipeline`, `hubspot_owner_id` | distribuição do mesmo universo filtrado |
| SLA/resolução | `closed_date` e histórico de resolução | somente com cobertura válida do campo/status |

Os KPIs e o snapshot de Suporte aceitam período, operação, etapa, prioridade e
exclusões de pipeline conforme o contrato publicado. Os read models auxiliares
de posição atual, usados para distribuição por etapa e saúde da fila, não
recebem filtros de período, etapa ou exclusões. Quando uma dessas dimensões é
selecionada, a interface mantém os KPIs no recorte e mostra os detalhes
auxiliares como indisponíveis, sem exibir o universo não filtrado como se fosse
o resultado solicitado.

### Customer Success

| Indicador | Fonte/campos | Fórmula | Limitação |
| --- | --- | --- | --- |
| Clientes ativos | Companies e regra `active_customer_rule` | contagem da carteira elegível | indisponível se a regra não estiver resolvida |
| MRR/ARPA | Companies, MRR e vínculos OMIE | soma de MRR; MRR / clientes com MRR | cobertura parcial de identidade |
| Tickets da carteira | associação ticket→empresa e estágio | empresas ativas com tickets abertos/críticos | não atribuir por nome ou deal |
| Churn, NRR, GRR e evolução | snapshots/transições | comparação entre estados temporais | `awaiting_history` sem série real |

Customer Success publica posição atual da carteira e a operação quando existe
associação ticket→empresa com classificação confirmada. A evolução não publica
uma série temporal neste contrato, portanto permanece indisponível; período,
etapa e exclusões de pipeline não são enviados para o KPI de carteira. A
ausência de clientes em atraso ou recorrência não é convertida em zero: depende
da identidade financeira e da cobertura do vínculo Companies/OMIE.

### Financeiro

| Indicador | Campos | Fórmula |
| --- | --- | --- |
| Recebido | `dDtPagamento` ou campo normalizado, valor recebido | soma de títulos pagos pela data efetiva |
| A receber | `nValAberto` e vencimento | saldo aberto na posição financeira |
| Vencido | saldo aberto, vencimento e bucket aging | saldo aberto com aging atrasado |
| Conciliação | CNPJ normalizado e vínculos OMIE/HubSpot | correspondência por identidade auditável |

Financeiro não deve receber o filtro de operação como se fosse funcional sem
uma dimensão financeira explícita. Não usar pipeline de negócio, nome de
empresa ou propriedade HubSpot como substituto automático de carteira OMIE.

## Reuniões, predição e insights

Reuniões do HubSpot e previsões comerciais ainda não são indicadores publicados
no Dashboard. Os campos de owner e datas de Deal não comprovam, sozinhos, que
uma reunião ocorreu ou que foi associada ao negócio correto. Antes de criar um
gráfico de reuniões ou uma predição de meta, é necessário publicar um read model
com eventos/associações de reunião, pipeline aberto, taxa de conversão, ciclo e
valor médio. O cálculo de previsão deverá ficar no backend e publicar premissas,
intervalo e estado, sem cálculo decisório no frontend.

## Empresas em múltiplas operações

A auditoria read-only encontrou uma propriedade de empresa que aceita múltiplas
unidades de negócio e amostras compatíveis com empresas presentes em mais de
uma unidade. Isso confirma que uma empresa não deve ser classificada por um
único `group_company`.

O diagnóstico do consumidor local também encontrou uma limitação de ingestão:
os valores de MRR/status de Company atualmente normalizados para o Analytics
vem principalmente dos campos After Sale e acabam em colunas genéricas como
`hubspot_companies.mrr` e `hubspot_companies.client_status`. Campos por operação
de Neotrust e Confi existem no portal, mas não são uma dimensão operacional
publicada no read model atual.

### Recomendação profissional

1. Não usar uma única propriedade singular para representar a carteira.
2. Governar os valores permitidos em uma propriedade multi-select de empresa,
   com valores estáveis como `Aftersale`, `Confi` e `Neotrust`, caso o negócio
   escolha esse campo como entrada mantida pelo time.
3. Ingerir o pertencimento para um read model normalizado, por exemplo
   `company_id + operation_key + status + mrr + source_field + source_timestamp + confidence`.
   Esse read model é a fonte de cálculo do Dashboard, não o texto direto da UI.
4. Usar o pertencimento para escopos de Companies/OMIE e associações, e usar o
   catálogo de pipeline para o universo de Deals/Tickets quando a regra do
   domínio exigir.
5. Definir precedência e conflitos: ausência, valor desatualizado e operação
   divergente devem produzir `partial`/`unavailable`, nunca incluir tudo.
6. Testar uma empresa em múltiplas operações, uma empresa sem operação e uma
   empresa com pipeline de operação diferente do pertencimento.

A propriedade existente no HubSpot não será criada, preenchida ou usada como
fonte efetiva sem task própria, preflight, aprovação independente, migração ou
sincronização versionada e pós-validação. A decisão evita alterar a carteira
remota com base em inferência e permite auditoria humana do backfill.

## Evidência e limitações atuais

- Auditoria HubSpot somente leitura; nenhum registro, propriedade ou associação
  foi alterado.
- A descoberta confirmou campos e enums, mas não prova que todos os registros
  estejam preenchidos ou que o contrato remoto do Dashboard já os consuma.
- O inventário remoto sem contexto autenticado não provou a matriz completa de
  pipelines. A ausência de linhas nesse método é `NOT_COMPROVADO`, não ausência
  de dados.
- Equivalência numérica remota, RLS/cross-tenant servido e performance real
  permanecem fora desta documentação.

## Fontes executáveis

- `apps/web/src/features/analytics/analytics-api.ts`
- `apps/web/src/features/analytics/AnalyticsCeoPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`
- `supabase/migrations/20260822070000_analytics_pipeline_operation_governance_v1.sql`
- `docs/ANALYTICS_PIPELINE_OPERATION_GOVERNANCE_V1.md`
- `docs/ANALYTICS_KPI_REGISTRY_V1.md`
