-- ANALYTICS-TIMESERIES-SCOPE-PERFORMANCE-REMEDIATION-V1
--
-- Materializa o escopo transacional uma vez por chamada da RPC temporal.
-- A migration deriva a definição vigente no banco e não reescreve nenhuma
-- migration histórica. Falhas de assinatura, âncoras ou cardinalidade são
-- fatais para evitar publicar uma função parcialmente transformada.

do $$
declare
  v_definition text;
  v_original text;
  v_signature constant regprocedure :=
    'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure;
  v_group_predicate constant text :=
    '(nullif(current_setting(''app.analytics_group_company'', true), '''') is null'
    || ' or c.group_company = current_setting(''app.analytics_group_company'', true))';
  v_exclusion_predicate constant text :=
    '(nullif(current_setting(''app.analytics_excluded_pipeline_ids'', true), '''') is null'
    || ' or %s.pipeline_id <> all(string_to_array(current_setting(''app.analytics_excluded_pipeline_ids'', true), '','')))';
  v_group_new constant text :=
    '(scope_config.group_company is null or c.group_company = scope_config.group_company)';
  v_exclusion_new constant text :=
    '(scope_config.excluded_pipeline_ids is null or %s.pipeline_id <> all(scope_config.excluded_pipeline_ids))';
  v_scope_cte constant text :=
    'with scope as (' || chr(10)
    || '       select nullif(current_setting(''app.analytics_group_company'', true), '''') as group_company,' || chr(10)
    || '              string_to_array(nullif(current_setting(''app.analytics_excluded_pipeline_ids'', true), ''''), '','') as excluded_pipeline_ids' || chr(10)
    || '     ),' || chr(10)
    || '    periodos as (';
  v_group_count integer;
  v_ticket_exclusion_count integer;
  v_deal_exclusion_count integer;
  v_declare_count integer;
  v_begin_count integer;
  v_scope_count integer;
  v_ticket_from_count integer;
  v_deal_from_count integer;
begin
  v_definition := pg_get_functiondef(v_signature);
  v_original := v_definition;

  if v_definition !~* 'create[[:space:]]+or[[:space:]]+replace[[:space:]]+function[[:space:]]+public[.]rpc_analytics_timeseries[[:space:]]*[(][^)]*[)][[:space:]]+returns' then
    raise exception 'Assinatura inesperada de public.rpc_analytics_timeseries';
  end if;

  v_group_count := (length(v_definition) - length(replace(v_definition, v_group_predicate, ''))) / length(v_group_predicate);
  if v_group_count <> 2 then
    raise exception 'Âncora de operação inesperada em rpc_analytics_timeseries: %', v_group_count;
  end if;

  v_ticket_exclusion_count := (length(v_definition) - length(replace(v_definition, format(v_exclusion_predicate, 't'), ''))) / length(format(v_exclusion_predicate, 't'));
  v_deal_exclusion_count := (length(v_definition) - length(replace(v_definition, format(v_exclusion_predicate, 'd'), ''))) / length(format(v_exclusion_predicate, 'd'));
  if v_ticket_exclusion_count <> 1 or v_deal_exclusion_count <> 1 then
    raise exception 'Âncoras de exclusão inesperadas em rpc_analytics_timeseries: ticket=%, deal=%', v_ticket_exclusion_count, v_deal_exclusion_count;
  end if;

  v_declare_count := (length(lower(v_definition)) - length(replace(lower(v_definition), chr(10) || 'declare' || chr(10), ''))) / length(chr(10) || 'declare' || chr(10));
  v_begin_count := (length(lower(v_definition)) - length(replace(lower(v_definition), chr(10) || 'begin' || chr(10), ''))) / length(chr(10) || 'begin' || chr(10));
  if v_declare_count <> 1 or v_begin_count <> 1 then
    raise exception 'Blocos DECLARE/BEGIN inesperados em rpc_analytics_timeseries: declare=%, begin=%', v_declare_count, v_begin_count;
  end if;

  v_scope_count := (length(lower(v_definition)) - length(replace(lower(v_definition), 'with periodos as (', ''))) / length('with periodos as (');
  if v_scope_count <> 3 then
    raise exception 'Blocos temporais inesperados em rpc_analytics_timeseries: %', v_scope_count;
  end if;

  v_ticket_from_count := (length(v_definition) - length(replace(v_definition, 'from public.hubspot_tickets t' || chr(10), ''))) / length('from public.hubspot_tickets t' || chr(10));
  v_deal_from_count := (length(v_definition) - length(replace(v_definition, 'from public.hubspot_deals d' || chr(10), ''))) / length('from public.hubspot_deals d' || chr(10));
  if v_ticket_from_count <> 1 or v_deal_from_count <> 1 then
    raise exception 'Âncoras de origem inesperadas em rpc_analytics_timeseries: tickets=%, deals=%', v_ticket_from_count, v_deal_from_count;
  end if;

  v_definition := replace(v_definition, 'with periodos as (', v_scope_cte);
  v_definition := replace(
    v_definition,
    'from public.hubspot_tickets t' || chr(10),
    'from public.hubspot_tickets t' || chr(10) || '      cross join scope scope_config' || chr(10)
  );
  v_definition := replace(
    v_definition,
    'from public.hubspot_deals d' || chr(10),
    'from public.hubspot_deals d' || chr(10) || '      cross join scope scope_config' || chr(10)
  );

  v_definition := replace(v_definition, v_group_predicate, v_group_new);
  v_definition := replace(v_definition, format(v_exclusion_predicate, 't'), format(v_exclusion_new, 't'));
  v_definition := replace(v_definition, format(v_exclusion_predicate, 'd'), format(v_exclusion_new, 'd'));

  if v_definition = v_original then
    raise exception 'Nenhuma transformação aplicada em rpc_analytics_timeseries';
  end if;
  if position(v_group_predicate in v_definition) > 0
     or position(format(v_exclusion_predicate, 't') in v_definition) > 0
     or position(format(v_exclusion_predicate, 'd') in v_definition) > 0 then
    raise exception 'Predicado transacional por linha permaneceu em rpc_analytics_timeseries';
  end if;
  if (position('with scope as (' in lower(v_definition)) = 0)
     or (length(v_definition) - length(replace(v_definition, 'cross join scope scope_config', ''))) / length('cross join scope scope_config') <> 2 then
    raise exception 'Materialização de escopo inesperada em rpc_analytics_timeseries';
  end if;
  if position('search_path' in lower(v_definition)) = 0
     or (position('to ' || chr(39) || chr(39) in lower(v_definition)) = 0
       and position('= ' || chr(39) || chr(39) in lower(v_definition)) = 0) then
    raise exception 'search_path vazio não preservado em rpc_analytics_timeseries';
  end if;

  execute v_definition;
end;
$$;

revoke all on function public.rpc_analytics_timeseries(text, date, date, text) from public, anon;
grant execute on function public.rpc_analytics_timeseries(text, date, date, text) to authenticated, service_role;
