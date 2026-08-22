begin;

select plan(18);

select has_view('public', 'vw_admin_tenant_group_context', 'tenant group context view exists');
select has_function(
  'public',
  'rpc_analytics_customer_success_kpis_by_operation',
  ARRAY['text'],
  'customer success operation RPC exists'
);
select ok(has_table_privilege('authenticated', 'public.vw_admin_tenant_group_context', 'select'), 'tenant group context grant');
select ok(has_function_privilege(
  'authenticated',
  'public.rpc_analytics_customer_success_kpis_by_operation(text)',
  'execute'
), 'customer success RPC grant');
select ok(not has_table_privilege('anon', 'public.vw_admin_tenant_group_context', 'select'), 'tenant group context denies anon');
select ok(not has_function_privilege(
  'anon',
  'public.rpc_analytics_customer_success_kpis_by_operation(text)',
  'execute'
), 'customer success RPC denies anon');
select ok(to_regclass('public.profiles') is not null, 'profiles dependency exists');
select ok(to_regclass('public.customer_account_groups') is not null, 'customer groups dependency exists');
select ok(to_regclass('public.customer_account_group_members') is not null, 'customer group members dependency exists');
select ok(to_regclass('public.analytics_source_config') is not null, 'analytics source config dependency exists');
select ok(to_regclass('public.hubspot_tickets') is not null, 'hubspot tickets dependency exists');
select ok(to_regclass('public.analytics_hubspot_associations') is not null, 'association dependency exists');
select ok(to_regclass('public.vw_analytics_customer_financial_link') is not null, 'customer financial link dependency exists');
select ok(to_regprocedure('app_private.has_global_role(public.platform_role)') is not null, 'global role dependency exists');
select ok(to_regprocedure('app_private.can_read_analytics()') is not null, 'analytics access dependency exists');
select ok(to_regprocedure('app_private.set_analytics_operation_scope(text)') is not null, 'operation scope dependency exists');
select ok(to_regprocedure('app_private.analytics_pipeline_operation_eligible(text,text,text,text)') is not null, 'pipeline eligibility dependency exists');
select ok(to_regprocedure('public.rpc_analytics_customer_success_kpis_v2()') is not null, 'customer success snapshot dependency exists');

select * from finish();
rollback;
