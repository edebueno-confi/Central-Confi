begin;

select plan(2);

select ok(
  exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rpc_analytics_ceo_snapshot'
      and pg_get_function_identity_arguments(p.oid) = 'p_from date, p_to date'
  ),
  'snapshot executivo existe com o contrato de datas publicado'
);

select ok(
  pg_get_functiondef('public.rpc_analytics_ceo_snapshot(date,date)'::regprocedure) ~ 'r\.is_current',
  'snapshot executivo restringe a leitura financeira ao estado corrente'
);

select * from finish();
rollback;
