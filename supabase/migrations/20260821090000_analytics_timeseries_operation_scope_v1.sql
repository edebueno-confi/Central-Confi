-- DATA-OPERATION-SCOPE-2026-08-21
--
-- A evolução compartilhada também precisa respeitar o recorte de Operação.
-- O contrato legado sem recorte continua disponível para leituras globais;
-- a RPC abaixo configura o escopo somente na transação atual e delega à
-- função existente, preservando o contrato de série e seus coortes.

do $$
declare
  v_definition text;
  v_original text;
  v_match_count integer;
  v_scope_predicate constant text :=
    '(nullif(current_setting(''app.analytics_group_company'', true), '''') is null'
    || ' or c.group_company = current_setting(''app.analytics_group_company'', true))';
begin
  v_definition := pg_get_functiondef(
    'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure
  );
  v_original := v_definition;

  select count(*)
    into v_match_count
  from regexp_matches(
    v_definition,
    'and c[.]is_active[[:space:]]+and not coalesce[(]c[.]is_archived, false[)]',
    'g'
  );

  if v_match_count <> 2 then
    raise exception 'Contrato inesperado de rpc_analytics_timeseries';
  end if;

  v_definition := regexp_replace(
    v_definition,
    'and c[.]is_active[[:space:]]+and not coalesce[(]c[.]is_archived, false[)]',
    'and c.is_active and not coalesce(c.is_archived, false)' || chr(10)
      || '       and ' || v_scope_predicate,
    'g'
  );

  if v_definition = v_original then
    raise exception 'Falha ao aplicar o escopo operacional em rpc_analytics_timeseries';
  end if;

  execute v_definition;
end;
$$;

create or replace function public.rpc_analytics_timeseries_by_operation(
  p_domain text,
  p_from date,
  p_to date,
  p_grain text default 'month',
  p_group_company text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.set_analytics_operation_scope(p_group_company);

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

comment on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text) is
  'Série temporal com recorte de Operação. Financeiro permanece indisponível quando a fonte não publica essa dimensão.';

revoke all on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text) from public, anon;
grant execute on function public.rpc_analytics_timeseries_by_operation(text, date, date, text, text) to authenticated, service_role;
