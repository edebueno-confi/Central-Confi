begin;
select plan(23);

select ok(to_regclass('public.analytics_finance_receivables_staging') is not null, 'staging financeiro existe');
select ok((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'analytics_finance_sync_runs' and column_name = 'coverage') = 1, 'run OMIE possui cobertura separada');
select ok((select relrowsecurity from pg_class where oid = 'public.analytics_finance_receivables_staging'::regclass), 'staging financeiro possui RLS');
select ok(to_regprocedure('public.rpc_service_promote_omie_snapshot(uuid)') is not null, 'RPC de promocao atomica existe');
select ok(
  position('target.sync_run_id is distinct from excluded.sync_run_id' in pg_get_functiondef('public.rpc_service_promote_omie_snapshot(uuid)'::regprocedure)) = 0,
  'promocao nao reaudita titulo quando somente o sync_run_id muda'
);
select is(
  has_function_privilege('anon', 'public.rpc_service_promote_omie_snapshot(uuid)', 'EXECUTE'),
  false,
  'anon nao executa promocao atomica'
);
select is(
  has_function_privilege('authenticated', 'public.rpc_service_promote_omie_snapshot(uuid)', 'EXECUTE'),
  false,
  'authenticated nao executa promocao atomica'
);
select is(
  has_function_privilege('service_role', 'public.rpc_service_promote_omie_snapshot(uuid)', 'EXECUTE'),
  true,
  'service_role executa promocao atomica'
);
select ok(position('can_read_analytics' in pg_get_functiondef('public.rpc_analytics_cs_snapshot(date,date,text,text,text[])'::regprocedure)) > 0, 'wrapper CS declara gate de leitura');
select ok(position('SECURITY DEFINER' in upper(pg_get_functiondef('public.rpc_analytics_cs_snapshot(date,date,text,text,text[])'::regprocedure))) > 0, 'wrapper CS permanece controlado');
select is(has_function_privilege('authenticated', 'public.rpc_analytics_cs_snapshot_impl(date,date,text,text,text[])', 'EXECUTE'), false, 'implementacao legada nao e executavel diretamente');

-- Comportamento: staging vazio nao pode desativar snapshot anterior.
insert into public.analytics_finance_receivables (source_key, source_record_id, identity_version, status_original, aging_bucket, is_current)
values ('omie_receivables_api', 'test-current-a', 'omie-v3', 'A vencer', 'a_vencer', true);
insert into public.analytics_finance_sync_runs (status, accepted_rows, total_rows) values ('processing', 0, 0) returning id \gset empty_
select throws_ok(format('select public.rpc_service_promote_omie_snapshot(%L::uuid)', :'empty_id'), 'Staging OMIE vazio; promocao rejeitada', 'staging vazio rejeitado dentro da RPC');
select is((select count(*) from public.analytics_finance_receivables where source_record_id = 'test-current-a' and is_current), 1::bigint, 'snapshot anterior preservado no staging vazio');
update public.analytics_finance_sync_runs set status = 'failed' where id = :'empty_id'::uuid;

-- Comportamento: source key indevida, identidade errada e contagem divergente rejeitam sem modificar snapshot.
insert into public.analytics_finance_sync_runs (status, accepted_rows, total_rows) values ('processing', 1, 1) returning id \gset invalid_
insert into public.analytics_finance_receivables_staging (sync_run_id, source_key, source_record_id, identity_version, status_original, aging_bucket)
values (:'invalid_id'::uuid, 'unexpected_source', 'bad-source', 'omie-v3', 'A vencer', 'a_vencer');
select throws_ok(format('select public.rpc_service_promote_omie_snapshot(%L::uuid)', :'invalid_id'), 'source_key OMIE nao autorizado', 'source key indevida rejeitada');
update public.analytics_finance_sync_runs set status = 'failed' where id = :'invalid_id'::uuid;

-- Comportamento: promoção válida é atômica e segunda chamada é idempotente.
insert into public.analytics_finance_sync_runs (status, accepted_rows, total_rows) values ('processing', 1, 1) returning id \gset valid_
insert into public.analytics_finance_receivables_staging (sync_run_id, source_key, source_record_id, identity_version, status_original, aging_bucket, net_amount)
values (:'valid_id'::uuid, 'omie_receivables_api', 'valid-record', 'omie-v3', 'A vencer', 'a_vencer', 100);
select ok(public.rpc_service_promote_omie_snapshot(:'valid_id'::uuid) ? 'promoted', 'promoção válida concluída');
select is((select status from public.analytics_finance_sync_runs where id = :'valid_id'::uuid), 'completed', 'run concluído após promoção válida');
select is((select count(*) from public.analytics_finance_receivables where source_record_id = 'valid-record' and is_current), 1::bigint, 'registro promovido fica atual');
select is((select count(*) from public.analytics_finance_receivables where source_record_id = 'test-current-a' and is_current), 0::bigint, 'registro anterior desativado somente após promoção válida');
select ok(public.rpc_service_promote_omie_snapshot(:'valid_id'::uuid) ? 'promoted', 'segunda promoção retorna resultado idempotente');
select is((select count(*) from public.analytics_finance_receivables where source_record_id = 'valid-record'), 1::bigint, 'segunda promoção nao duplica');
select is((select count(*) from public.analytics_finance_receivables_staging where sync_run_id = :'valid_id'::uuid), 0::bigint, 'staging limpo após promoção');

-- Repeticao com novo run e dados identicos nao deve regravar a linha financeira.
insert into public.analytics_finance_sync_runs (status, accepted_rows, total_rows) values ('processing', 1, 1) returning id \gset replay_
insert into public.analytics_finance_receivables_staging (sync_run_id, source_key, source_record_id, identity_version, status_original, aging_bucket, net_amount)
values (:'replay_id'::uuid, 'omie_receivables_api', 'valid-record', 'omie-v3', 'A vencer', 'a_vencer', 100);
select ok(public.rpc_service_promote_omie_snapshot(:'replay_id'::uuid) ? 'promoted', 'replay identico promovido');
select is((select sync_run_id from public.analytics_finance_receivables where source_record_id = 'valid-record'), :'valid_id'::uuid, 'replay identico preserva proveniencia da linha sem mudanca');

select * from finish();
rollback;
