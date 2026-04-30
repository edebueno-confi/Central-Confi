create or replace view public.vw_admin_user_lookup
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.has_global_role('platform_admin'::public.platform_role)
  )
  select
    p.id as user_id,
    p.full_name,
    p.email,
    p.is_active,
    p.created_at
  from public.profiles as p
  join current_actor
    on true;

revoke select on public.profiles from authenticated;

revoke all on public.vw_admin_user_lookup from public, anon, authenticated, service_role;

grant select on public.vw_admin_user_lookup to authenticated, service_role;

comment on view public.vw_admin_user_lookup is
  'Read model contratual de lookup global de usuarios para o Admin Console, restrito a platform_admin ativo.';
