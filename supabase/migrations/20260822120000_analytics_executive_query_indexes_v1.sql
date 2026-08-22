-- Índices compostos para os predicados usados pelo snapshot executivo.
-- Não alteram o contrato nem a semântica das métricas. Eles evitam que as
-- consultas por pipeline/período e pelo snapshot financeiro percorram índices
-- separados em tabelas que crescem com cada sincronização.

create index if not exists hubspot_deals_pipeline_created_idx
  on public.hubspot_deals (pipeline_id, hs_created_at);

create index if not exists hubspot_tickets_pipeline_created_idx
  on public.hubspot_tickets (pipeline_id, hs_created_at);

create index if not exists analytics_finance_receivables_source_current_due_idx
  on public.analytics_finance_receivables (source_key, is_current, due_date)
  where is_current;

create index if not exists analytics_finance_receivables_source_current_issued_idx
  on public.analytics_finance_receivables (source_key, is_current, issued_date)
  where is_current;

comment on index public.hubspot_deals_pipeline_created_idx is
  'Acelera recortes executivos por pipeline e data de criação.';

comment on index public.hubspot_tickets_pipeline_created_idx is
  'Acelera recortes executivos por pipeline e data de criação.';

comment on index public.analytics_finance_receivables_source_current_due_idx is
  'Acelera o snapshot financeiro OMIE por fonte, snapshot corrente e vencimento.';

comment on index public.analytics_finance_receivables_source_current_issued_idx is
  'Acelera o snapshot financeiro OMIE por fonte, snapshot corrente e emissão.';
