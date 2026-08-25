-- Cobertura pgTAP da migration candidata de paridade de filtros.
-- Este arquivo acompanha o candidato e só pode passar depois de um preflight
-- aprovado e da aplicação controlada no alvo autorizado. Não aplicar aqui.

begin;

select plan(16);

select has_function(
  'public',
  'rpc_analytics_commercial_kpis_v2_filtered',
  'RPC comercial filtrada por estágio e exclusões existe'
);

select has_function(
  'public',
  'rpc_analytics_support_kpis_v2_filtered',
  'RPC de suporte filtrada por estágio e exclusões existe'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])',
    'EXECUTE'
  ),
  'usuário autenticado pode ler a RPC comercial candidata'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])',
    'EXECUTE'
  ),
  'anônimo não executa a RPC comercial candidata'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])',
    'EXECUTE'
  ),
  'usuário autenticado pode ler a RPC de suporte candidata'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])',
    'EXECUTE'
  ),
  'anônimo não executa a RPC de suporte candidata'
);

select ok(
  position(
    'p_stage_id is null or d.dealstage = p_stage_id'
    in pg_get_functiondef(
      'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a RPC comercial candidata aplica o estágio antes das métricas'
);

select ok(
  position(
    'p_excluded_pipeline_ids'
    in pg_get_functiondef(
      'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a RPC comercial candidata aplica as exclusões de pipeline'
);

select ok(
  position(
    'p_stage_id is null or t.pipeline_stage = p_stage_id'
    in pg_get_functiondef(
      'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a RPC de suporte candidata aplica o estágio antes das métricas'
);

select ok(
  position(
    'p_excluded_pipeline_ids'
    in pg_get_functiondef(
      'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a RPC de suporte candidata aplica as exclusões de pipeline'
);

select ok(
  position(
    $$app_private.analytics_pipeline_operation_eligible('deal', c.hubspot_pipeline_id, current_setting('app.analytics_group_company', true), 'commercial')$$
    in pg_get_functiondef(
      'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a CTE comercial aplica a elegibilidade da operação no servidor'
);

select ok(
  position(
    $$app_private.analytics_pipeline_operation_eligible('ticket', c.hubspot_pipeline_id, current_setting('app.analytics_group_company', true), 'support')$$
    in pg_get_functiondef(
      'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
    )
  ) > 0,
  'a CTE de suporte aplica a elegibilidade da operação no servidor'
);

select ok(
  position(
    'set_analytics_operation_scope(p_group_company)'
    in pg_get_functiondef(
      'public.rpc_analytics_commercial_kpis_by_operation(date,date,text,text,text[],text)'::regprocedure
    )
  ) > 0,
  'o wrapper comercial propaga Todas ou a operação selecionada ao contexto'
);

select ok(
  position(
    'set_analytics_operation_scope(p_group_company)'
    in pg_get_functiondef(
      'public.rpc_analytics_support_kpis_by_operation(date,date,text,text,text[],text)'::regprocedure
    )
  ) > 0,
  'o wrapper de suporte propaga Todas ou a operação selecionada ao contexto'
);

select ok(
  to_regprocedure('app_private.analytics_pipeline_operation_eligible(text,text,text,text)') is not null,
  'a elegibilidade canônica é uma dependência explícita do candidato'
);

select ok(
  position('p_excluded_pipeline_ids' in pg_get_functiondef(
    'public.rpc_analytics_commercial_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
  )) > 0
  and position('p_excluded_pipeline_ids' in pg_get_functiondef(
    'public.rpc_analytics_support_kpis_v2_filtered(date,date,text,text,text[])'::regprocedure
  )) > 0,
  'as exclusões permanecem no mesmo corpo que a elegibilidade de operação'
);

select * from finish();
rollback;
