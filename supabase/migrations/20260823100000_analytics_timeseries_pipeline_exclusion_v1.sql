-- ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23
--
-- O gráfico de evolução precisa receber a mesma exclusão de pipelines usada
-- pelos KPIs da tela. O escopo é mantido em configuração transacional para
-- preservar a RPC histórica de séries e evitar regra duplicada no frontend.

create or replace function app_private.set_analytics_pipeline_exclusion_scope(
  p_pipeline_ids text[] default '{}'::text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ids text;
begin
  select string_agg(nullif(btrim(value), ''), ',' order by value)
    into v_ids
  from unnest(coalesce(p_pipeline_ids, '{}'::text[])) as item(value);

  perform set_config(
    'app.analytics_excluded_pipeline_ids',
    coalesce(v_ids, ''),
    true
  );
end;
$$;

revoke all on function app_private.set_analytics_pipeline_exclusion_scope(text[]) from public, anon, authenticated;

do $$
declare
  v_definition text;
  v_old text;
  v_new text;
  v_exclusion constant text :=
    '(nullif(current_setting(''app.analytics_excluded_pipeline_ids'', true), '''') is null'
    || ' or %s.pipeline_id <> all(string_to_array(current_setting(''app.analytics_excluded_pipeline_ids'', true), '','')))';
begin
  v_definition := pg_get_functiondef(
    'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure
  );

  v_old := 'on c.object_type = ''ticket'' and c.hubspot_pipeline_id = t.pipeline_id';
  if position(v_old in v_definition) = 0 then
    raise exception 'Contrato inesperado de rpc_analytics_timeseries para tickets';
  end if;
  v_new := v_old || chr(10) || '       and ' || format(v_exclusion, 't');
  v_definition := replace(v_definition, v_old, v_new);

  v_old := 'on c.object_type = ''deal'' and c.hubspot_pipeline_id = d.pipeline_id';
  if position(v_old in v_definition) = 0 then
    raise exception 'Contrato inesperado de rpc_analytics_timeseries para deals';
  end if;
  v_new := v_old || chr(10) || '       and ' || format(v_exclusion, 'd');
  v_definition := replace(v_definition, v_old, v_new);

  execute v_definition;
end;
$$;

create or replace function public.rpc_analytics_timeseries_by_operation(
  p_domain text,
  p_from date,
  p_to date,
  p_grain text,
  p_group_company text,
  p_excluded_pipeline_ids text[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.set_analytics_operation_scope(p_group_company);
  perform app_private.set_analytics_pipeline_exclusion_scope(p_excluded_pipeline_ids);

  if p_domain = 'finance' and nullif(btrim(p_group_company), '') is not null then
    return jsonb_build_object(
      'domain', p_domain,
      'grain', case when p_grain in ('day', 'week', 'month') then p_grain else 'month' end,
      'period_from', p_from,
      'period_to', p_to,
      'series', '[]'::jsonb,
      'unavailable_reason', 'operation_dimension_unavailable'
    );
  end if;

  return public.rpc_analytics_timeseries(p_domain, p_from, p_to, p_grain);
end;
$$;

comment on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text, text[]) is
  'Série temporal com recorte de operação e exclusão de pipelines. Financeiro permanece indisponível quando a fonte não publica essa dimensão.';

revoke all on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text, text[]) from public, anon;
grant execute on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text, text[]) to authenticated, service_role;
