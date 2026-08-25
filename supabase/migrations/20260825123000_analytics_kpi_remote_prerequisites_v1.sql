-- ANALYTICS-KPI-REMOTE-PREREQUISITES-V1
-- Candidato versionado para disponibilizar somente os helpers exigidos pelos
-- overloads de seis argumentos do contrato KPI. Não aplicar automaticamente.
-- A aplicação remota exige preflight aprovado, shadow quando disponível e
-- smoke autenticado posterior. Nenhum helper recebe EXECUTE direto de roles
-- de cliente.

begin;

do $preflight$
begin
  if to_regclass('public.analytics_source_config') is null then
    raise exception 'Dependência ausente: public.analytics_source_config';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_source_config'
      and column_name in ('object_type', 'hubspot_pipeline_id', 'area_key',
                          'group_company', 'group_company_source', 'is_active',
                          'is_archived')
    group by table_schema, table_name
    having count(*) = 7
  ) then
    raise exception 'Dependência incompleta: public.analytics_source_config';
  end if;

  if to_regprocedure('app_private.can_read_analytics()') is null then
    raise exception 'Dependência ausente: app_private.can_read_analytics()';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'can_read_analytics'
      and pg_get_function_identity_arguments(p.oid) = ''
      and p.prosecdef
      and pg_get_userbyid(p.proowner) = 'postgres'
      and array_position(coalesce(p.proconfig, array[]::text[]), 'search_path=""') is not null
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'Dependência insegura: app_private.can_read_analytics()';
  end if;
end;
$preflight$;

create or replace function app_private.kpi_entry(
  p_value numeric,
  p_basis text,
  p_state text default 'available',
  p_reason text default null
)
returns jsonb
language sql
immutable
set search_path = ''
as $function$
  select jsonb_build_object(
    'state', case when p_state = 'available' and p_value is null then 'unavailable' else p_state end,
    'value', case when p_state in ('unavailable', 'awaiting_history') then null else p_value end,
    'basis', p_basis,
    'reason', case
      when p_state = 'available' and p_value is null then coalesce(p_reason, 'no_data_in_period')
      else p_reason
    end
  );
$function$;

comment on function app_private.kpi_entry(numeric, text, text, text) is
  'Constrói a entrada padrão de um KPI com estado, valor, coorte de data e motivo.';

revoke all on function app_private.kpi_entry(numeric, text, text, text)
  from public, anon, authenticated;

create or replace function app_private.kpi_ratio(
  p_numerator numeric,
  p_denominator numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_denominator is null
      or p_denominator <= 0
      or p_numerator is null
      or p_numerator < 0
      or p_numerator > p_denominator then null
    else round((p_numerator / p_denominator) * 100, 2)
  end;
$function$;

comment on function app_private.kpi_ratio(numeric, numeric) is
  'Percentual protegido contra divisão por zero.';

revoke all on function app_private.kpi_ratio(numeric, numeric)
  from public, anon, authenticated;

create or replace function app_private.set_analytics_operation_scope(
  p_group_company text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  perform set_config(
    'app.analytics_group_company',
    coalesce(nullif(btrim(p_group_company), ''), ''),
    true
  );
end;
$function$;

revoke all on function app_private.set_analytics_operation_scope(text)
  from public, anon, authenticated;

create or replace function app_private.analytics_pipeline_operation_eligible(
  p_object_type text,
  p_pipeline_id text,
  p_group_company text default null,
  p_area_key text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  with active_rows as (
    select
      c.area_key,
      nullif(btrim(c.group_company), '') as group_company,
      c.group_company_source
    from public.analytics_source_config c
    where c.object_type = p_object_type
      and c.hubspot_pipeline_id = p_pipeline_id
      and c.is_active
      and not coalesce(c.is_archived, false)
  ), aggregate_state as (
    select
      count(*) as row_count,
      count(distinct concat_ws('|', coalesce(area_key, ''), coalesce(group_company, ''))) as mapping_variants,
      coalesce(bool_and(group_company_source = 'confirmed'), false) as all_sources_confirmed,
      min(area_key) as area_key,
      min(group_company) as group_company
    from active_rows
  )
  select
    a.row_count > 0
    and a.mapping_variants = 1
    and a.all_sources_confirmed
    and nullif(btrim(a.area_key), '') is not null
    and a.area_key <> 'a_classificar'
    and nullif(btrim(a.group_company), '') is not null
    and a.group_company <> 'a_definir'
    and (nullif(btrim(p_group_company), '') is null or a.group_company = btrim(p_group_company))
    and (nullif(btrim(p_area_key), '') is null or a.area_key = btrim(p_area_key))
  from aggregate_state a;
$function$;

comment on function app_private.analytics_pipeline_operation_eligible(text, text, text, text) is
  'Elegibilidade server-side para pipeline publicado: ativo, não arquivado, área classificada, operação confirmada e sem variantes ambíguas.';

revoke all on function app_private.analytics_pipeline_operation_eligible(text, text, text, text)
  from public, anon, authenticated;

commit;
