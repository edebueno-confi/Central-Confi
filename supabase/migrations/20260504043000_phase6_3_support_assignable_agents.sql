create or replace view public.vw_support_assignable_agents
with (security_barrier = true)
as
  with role_candidates as (
    select
      tm.tenant_id,
      coalesce(t.display_name, t.legal_name, t.slug) as tenant_name,
      p.id as user_id,
      coalesce(nullif(btrim(p.full_name), ''), p.email) as full_name,
      p.email,
      role_info.role,
      tm.status as membership_status,
      p.is_active
    from public.tenant_memberships as tm
    join public.tenants as t
      on t.id = tm.tenant_id
    join public.profiles as p
      on p.id = tm.user_id
    join lateral (
      select
        ugr.role
      from public.user_global_roles as ugr
      where ugr.user_id = p.id
        and ugr.role = any(
          array[
            'platform_admin',
            'support_manager',
            'support_agent'
          ]::public.platform_role[]
        )
      order by case ugr.role
        when 'platform_admin'::public.platform_role then 1
        when 'support_manager'::public.platform_role then 2
        when 'support_agent'::public.platform_role then 3
        else 99
      end
      limit 1
    ) as role_info
      on true
    where tm.status = 'active'
      and p.is_active
      and app_private.can_assign_ticket(tm.tenant_id, p.id)
  )
  select
    user_id,
    full_name,
    email,
    tenant_id,
    tenant_name,
    role,
    membership_status,
    is_active
  from role_candidates;

revoke all on public.vw_support_assignable_agents from public, anon;
grant select on public.vw_support_assignable_agents to authenticated;

comment on view public.vw_support_assignable_agents is
  'Lista de agentes ativos e atribuiveis por tenant para o Support Workspace, filtrada pelo mesmo contrato de autorizacao usado por rpc_assign_ticket.';
