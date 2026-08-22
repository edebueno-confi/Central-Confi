begin;

select plan(4);

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'hubspot_deals_pipeline_created_idx'),
  'deals têm índice composto de pipeline e data de criação'
);

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'hubspot_tickets_pipeline_created_idx'),
  'tickets têm índice composto de pipeline e data de criação'
);

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'analytics_finance_receivables_source_current_due_idx'),
  'financeiro tem índice corrente por fonte e vencimento'
);

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'analytics_finance_receivables_source_current_issued_idx'),
  'financeiro tem índice corrente por fonte e emissão'
);

select * from finish();
rollback;
