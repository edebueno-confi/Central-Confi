-- Reconcile contracts that may be marked applied while absent from the target schema.
-- This migration is idempotent and intentionally fails if its dependencies are absent.

do $$
declare
  required_relation text;
  required_relations text[] := array[
    'public.profiles',
    'public.customer_account_groups',
    'public.customer_account_group_members',
    'public.analytics_source_config',
    'public.hubspot_tickets',
    'public.analytics_hubspot_associations',
    'public.vw_analytics_customer_financial_link'
  ];
  required_procedure text;
  required_procedures text[] := array[
    'app_private.has_global_role(public.platform_role)',
    'app_private.can_read_analytics()',
    'app_private.set_analytics_operation_scope(text)',
    'app_private.analytics_pipeline_operation_eligible(text,text,text,text)',
    'public.rpc_analytics_customer_success_kpis_v2()'
  ];
begin
  foreach required_relation in array required_relations loop
    if to_regclass(required_relation) is null then
      raise exception 'Dependência ausente para reconciliação de contratos: relação %', required_relation;
    end if;
  end loop;

  foreach required_procedure in array required_procedures loop
    if to_regprocedure(required_procedure) is null then
      raise exception 'Dependência ausente para reconciliação de contratos: função %', required_procedure;
    end if;
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.vw_admin_tenant_group_context') is null then
    execute $view$
      create view public.vw_admin_tenant_group_context
      with (security_barrier = true)
      as
        with current_actor as (
          select p.id
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active
            and app_private.has_global_role('platform_admin'::public.platform_role)
        ), ranked_groups as (
          select
            m.tenant_id,
            g.id as group_id,
            g.display_name as group_display_name,
            g.group_type,
            m.relationship,
            m.is_primary,
            count(*) over (partition by m.tenant_id)::integer as group_count,
            row_number() over (
              partition by m.tenant_id
              order by m.is_primary desc, g.display_name asc, g.id
            ) as rank
          from public.customer_account_group_members as m
          join public.customer_account_groups as g on g.id = m.group_id
          where m.tenant_id is not null
            and m.status = 'active'
            and g.status = 'active'
        )
        select
          rg.tenant_id,
          rg.group_id,
          rg.group_display_name,
          rg.group_type,
          rg.relationship,
          rg.is_primary,
          rg.group_count
        from current_actor as ca
        join ranked_groups as rg on true
        where rg.rank = 1
    $view$;
  else
    execute $view$
      create or replace view public.vw_admin_tenant_group_context
      with (security_barrier = true)
      as
        with current_actor as (
          select p.id
          from public.profiles as p
          where p.id = auth.uid()
            and p.is_active
            and app_private.has_global_role('platform_admin'::public.platform_role)
        ), ranked_groups as (
          select
            m.tenant_id,
            g.id as group_id,
            g.display_name as group_display_name,
            g.group_type,
            m.relationship,
            m.is_primary,
            count(*) over (partition by m.tenant_id)::integer as group_count,
            row_number() over (
              partition by m.tenant_id
              order by m.is_primary desc, g.display_name asc, g.id
            ) as rank
          from public.customer_account_group_members as m
          join public.customer_account_groups as g on g.id = m.group_id
          where m.tenant_id is not null
            and m.status = 'active'
            and g.status = 'active'
        )
        select
          rg.tenant_id,
          rg.group_id,
          rg.group_display_name,
          rg.group_type,
          rg.relationship,
          rg.is_primary,
          rg.group_count
        from current_actor as ca
        join ranked_groups as rg on true
        where rg.rank = 1
    $view$;
  end if;
end;
$$;

revoke all on public.vw_admin_tenant_group_context from public, anon, authenticated, service_role;
grant select on public.vw_admin_tenant_group_context to authenticated, service_role;

comment on view public.vw_admin_tenant_group_context is
  'Contexto resumido do agrupamento principal de cada tenant operacional.';

create or replace function public.rpc_analytics_customer_success_kpis_by_operation(
  p_group_company text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_operation text := nullif(btrim(p_group_company), '');
  v_state text;
  v_reason text;
  v_ticket_count integer := 0;
  v_associated_ticket_count integer := 0;
  v_coverage_percent numeric := 0;
begin
  if not app_private.can_read_analytics() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  perform app_private.set_analytics_operation_scope(v_operation);
  v_result := public.rpc_analytics_customer_success_kpis_v2();

  with eligible_pipelines as (
    select distinct c.hubspot_pipeline_id
    from public.analytics_source_config c
    where c.object_type = 'ticket'
      and c.area_key = 'customer_success'
      and app_private.analytics_pipeline_operation_eligible(
        'ticket', c.hubspot_pipeline_id, v_operation, 'customer_success'
      )
  ), ticket_rows as (
    select distinct t.ticket_id
    from public.hubspot_tickets t
    join eligible_pipelines p on p.hubspot_pipeline_id = t.pipeline_id
  )
  select
    count(*)::integer,
    count(*) filter (where exists (
      select 1
      from public.analytics_hubspot_associations a
      join public.vw_analytics_customer_financial_link f
        on f.company_id::text = a.to_id
      where a.from_object_type = 'tickets'
        and a.from_id = ticket_rows.ticket_id
        and a.to_object_type = 'companies'
    ))::integer
  into v_ticket_count, v_associated_ticket_count
  from ticket_rows;

  if v_ticket_count = 0 then
    v_state := 'unavailable';
    v_reason := 'operation_ticket_coverage_missing';
  elsif v_associated_ticket_count = 0 then
    v_state := 'unavailable';
    v_reason := 'ticket_company_association_missing';
  elsif v_associated_ticket_count < v_ticket_count then
    v_state := 'partial';
    v_reason := 'ticket_company_association_partial';
  else
    v_state := 'available';
    v_reason := null;
  end if;

  v_coverage_percent := round((v_associated_ticket_count::numeric * 100) / nullif(v_ticket_count, 0), 2);

  return coalesce(v_result, '{}'::jsonb) || jsonb_build_object(
    'operation_scope', jsonb_build_object(
      'operation', v_operation,
      'source', 'confirmed ticket pipeline -> company association',
      'state', v_state,
      'reason', v_reason,
      'ticket_count', v_ticket_count,
      'associated_ticket_count', v_associated_ticket_count,
      'coverage_percent', coalesce(v_coverage_percent, 0)
    )
  );
end;
$$;

revoke all on function public.rpc_analytics_customer_success_kpis_by_operation(text) from public, anon;
grant execute on function public.rpc_analytics_customer_success_kpis_by_operation(text) to authenticated, service_role;

notify pgrst, 'reload schema';
