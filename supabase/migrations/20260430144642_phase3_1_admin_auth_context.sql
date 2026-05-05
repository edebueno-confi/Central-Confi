create or replace view public.vw_admin_auth_context
with (security_barrier = true)
as
  select
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.is_active,
    array(
      select ugr.role
      from public.user_global_roles as ugr
      where ugr.user_id = p.id
      order by ugr.role::text asc
    ) as roles
  from public.profiles as p
  where p.id = auth.uid();

revoke all on public.vw_admin_auth_context from public, anon, authenticated, service_role;

grant select on public.vw_admin_auth_context to authenticated, service_role;

comment on view public.vw_admin_auth_context is
  'Read model contratual do contexto autenticado do Admin Console, restrito ao proprio auth.uid().';
