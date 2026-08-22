-- DATA-TEMPORAL-SEMANTICS-2026-08-21
-- OD-003: o calendario operacional do analytics e America/Sao_Paulo.
-- As funcoes usam regras IANA, inclusive para o horario de verao historico.

create or replace function app_private.analytics_period_start(p_date date)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_date::timestamp at time zone 'America/Sao_Paulo'
$$;

create or replace function app_private.analytics_period_end_exclusive(p_date date)
returns timestamptz
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (p_date + 1)::timestamp at time zone 'America/Sao_Paulo'
$$;

comment on function app_private.analytics_period_start(date) is
  'Inicio inclusivo do dia operacional do analytics em America/Sao_Paulo.';
comment on function app_private.analytics_period_end_exclusive(date) is
  'Fim exclusivo do dia operacional do analytics em America/Sao_Paulo.';

revoke all on function app_private.analytics_period_start(date) from public, anon, authenticated;
revoke all on function app_private.analytics_period_end_exclusive(date) from public, anon, authenticated;

do $$
declare
  v_function text;
  v_definition text;
  v_old text;
  v_new text;
  v_old_count integer;
  v_index integer;
  v_old_patterns text[];
  v_new_patterns text[];
  v_functions constant text[] := array[
    'public.rpc_analytics_timeseries(text,date,date,text)',
    'public.rpc_analytics_commercial_kpis_v2(date,date,text,text)',
    'public.rpc_analytics_support_kpis_v2(date,date,text,text)',
    'public.rpc_analytics_commercial_snapshot(date,date,text,text,text[])',
    'public.rpc_analytics_cs_snapshot_alias_legacy(date,date,text,text,text[])',
    'public.rpc_analytics_ceo_snapshot_legacy(date,date)'
  ];
begin
  foreach v_function in array v_functions loop
    execute 'select pg_get_functiondef($1::regprocedure)' into v_definition using v_function;
    v_old_patterns := '{}'::text[];
    v_new_patterns := '{}'::text[];

    if v_function = 'public.rpc_analytics_timeseries(text,date,date,text)' then
      v_old_patterns := array[
        'date_trunc(v_bucket, p_from::timestamptz)',
        'date_trunc(v_bucket, p_to::timestamptz)',
        'e.hs_created_at)',
        'e.resolved_at)',
        'e.hs_closed_at)',
        'e.last_received_date::timestamptz)',
        'e.due_date::timestamptz)'
      ];
      v_new_patterns := array[
        'date_trunc(v_bucket, app_private.analytics_period_start(p_from))',
        'date_trunc(v_bucket, app_private.analytics_period_start(p_to))',
        'e.hs_created_at at time zone ''America/Sao_Paulo'')',
        'e.resolved_at at time zone ''America/Sao_Paulo'')',
        'e.hs_closed_at at time zone ''America/Sao_Paulo'')',
        'e.last_received_date::timestamp)',
        'e.due_date::timestamp)'
      ];
    elsif v_function = 'public.rpc_analytics_commercial_kpis_v2(date,date,text,text)' then
      v_old_patterns := array[
        'hs_created_at::date between p_from and p_to',
        'hs_closed_at::date between p_from and p_to'
      ];
      v_new_patterns := array[
        'hs_created_at >= app_private.analytics_period_start(p_from) and hs_created_at < app_private.analytics_period_end_exclusive(p_to)',
        'hs_closed_at >= app_private.analytics_period_start(p_from) and hs_closed_at < app_private.analytics_period_end_exclusive(p_to)'
      ];
    elsif v_function = 'public.rpc_analytics_support_kpis_v2(date,date,text,text)' then
      v_old_patterns := array[
        'hs_created_at::date between p_from and p_to',
        'resolved_at::date between p_from and p_to'
      ];
      v_new_patterns := array[
        'hs_created_at >= app_private.analytics_period_start(p_from) and hs_created_at < app_private.analytics_period_end_exclusive(p_to)',
        'resolved_at >= app_private.analytics_period_start(p_from) and resolved_at < app_private.analytics_period_end_exclusive(p_to)'
      ];
    elsif v_function = 'public.rpc_analytics_commercial_snapshot(date,date,text,text,text[])' then
      v_old_patterns := array[
        'p_from::timestamptz',
        '(p_to + 1)::timestamptz',
        'date_trunc(''month'', hs_created_at)'
      ];
      v_new_patterns := array[
        'app_private.analytics_period_start(p_from)',
        'app_private.analytics_period_end_exclusive(p_to)',
        'date_trunc(''month'', hs_created_at at time zone ''America/Sao_Paulo'')'
      ];
    elsif v_function = 'public.rpc_analytics_cs_snapshot_alias_legacy(date,date,text,text,text[])' then
      v_old_patterns := array[
        'p_from::timestamptz',
        '(p_to + 1)::timestamptz',
        'date_trunc(''month'', hs_created_at)',
        'date_trunc(''month'', hs_closed_at)'
      ];
      v_new_patterns := array[
        'app_private.analytics_period_start(p_from)',
        'app_private.analytics_period_end_exclusive(p_to)',
        'date_trunc(''month'', hs_created_at at time zone ''America/Sao_Paulo'')',
        'date_trunc(''month'', hs_closed_at at time zone ''America/Sao_Paulo'')'
      ];
    else
      v_old_patterns := array[
        'p_from::timestamptz',
        '(p_to + 1)::timestamptz'
      ];
      v_new_patterns := array[
        'app_private.analytics_period_start(p_from)',
        'app_private.analytics_period_end_exclusive(p_to)'
      ];
    end if;

    for v_index in 1..array_length(v_old_patterns, 1) loop
      v_old := v_old_patterns[v_index];
      v_new := v_new_patterns[v_index];
      v_old_count := (length(v_definition) - length(replace(v_definition, v_old, ''))) / length(v_old);
      if v_old_count = 0 then
        raise exception 'Transformacao obrigatoria ausente em %: %', v_function, v_old;
      end if;
      v_definition := replace(v_definition, v_old, v_new);
      if position(v_old in v_definition) > 0 then
        raise exception 'Transformacao incompleta em %: % -> %', v_function, v_old, v_new;
      end if;
    end loop;

    execute v_definition;
  end loop;
end;
$$;

comment on function public.rpc_analytics_timeseries(text, date, date, text) is
  'Séries temporais com coortes agrupadas no timezone operacional America/Sao_Paulo.';
