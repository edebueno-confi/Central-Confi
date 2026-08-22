-- ACCESS-02: provisionamento operacional ponta a ponta.
--
-- O modelo executável continua separado: capabilities continuam sendo
-- resolvidas pelas fontes atuais e telas continuam sendo resolvidas por
-- grants de role, membership ou perfil. Esta migration apenas impede que a
-- associação de área seja marcada como ativa sem materializar a tela inicial
-- correspondente.

create table if not exists public.internal_organizational_screen_defaults (
  organizational_area_key text not null
    references public.internal_organizational_areas(area_key) on delete cascade,
  screen_key text not null
    references public.internal_screen_catalog(screen_key) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles(id),
  primary key (organizational_area_key, screen_key)
);

create index if not exists internal_org_screen_defaults_screen_idx
  on public.internal_organizational_screen_defaults(screen_key, organizational_area_key);

alter table public.internal_organizational_screen_defaults enable row level security;

drop policy if exists internal_org_screen_defaults_admin_read
  on public.internal_organizational_screen_defaults;
create policy internal_org_screen_defaults_admin_read
on public.internal_organizational_screen_defaults
for select to authenticated
using (app_private.has_global_role('platform_admin'::public.platform_role));

insert into public.internal_organizational_screen_defaults (organizational_area_key, screen_key)
values
  ('executive', 'home'),
  ('executive', 'analytics'),
  ('commercial', 'home'),
  ('commercial', 'analytics'),
  ('support', 'home'),
  ('support', 'support_inbox'),
  ('support', 'support_queue'),
  ('support', 'support_tickets'),
  ('content_knowledge', 'home'),
  ('content_knowledge', 'knowledge'),
  ('technology', 'home'),
  ('technology', 'settings')
on conflict (organizational_area_key, screen_key) do nothing;

create or replace function app_private.default_internal_screen_keys(
  p_organizational_area_key text,
  p_legacy_area_key text
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $function$
  with recursive base_keys(screen_key) as (
    select defaults.screen_key
    from public.internal_organizational_screen_defaults as defaults
    where defaults.organizational_area_key = p_organizational_area_key
    union
    select defaults.screen_key
    from public.internal_screen_area_defaults as defaults
    where defaults.area_key in (p_organizational_area_key, p_legacy_area_key)
  ), required_keys(screen_key) as (
    select base.screen_key from base_keys as base
    union
    select dependency.dependency_screen_key
    from required_keys as required
    join public.internal_screen_dependencies as dependency
      on dependency.screen_key = required.screen_key
  )
  select coalesce(
    array_agg(required.screen_key order by screen.sort_order, required.screen_key),
    array[]::text[]
  )
  from required_keys as required
  join public.internal_screen_catalog as screen
    on screen.screen_key = required.screen_key
   and screen.is_active
$function$;

revoke all on function app_private.default_internal_screen_keys(text, text)
  from public, anon, authenticated, service_role;

create or replace function public.rpc_admin_update_internal_access_assignment(
  p_user_id uuid,
  p_area_key text,
  p_function_id uuid,
  p_access_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_tenant uuid;
  v_legacy_area text;
  v_profile public.internal_access_profiles;
  v_function public.internal_functions;
  v_membership public.internal_area_memberships;
  v_default_screen_keys text[];
begin
  v_actor := app_private.require_active_actor();
  perform app_private.require_internal_capability('access.users.manage');

  if not exists (
    select 1
    from public.internal_organizational_areas
    where area_key = p_area_key and is_active
  ) then
    raise exception 'organizational area not found or inactive' using errcode = 'P0002';
  end if;

  select * into v_function
  from public.internal_functions
  where id = p_function_id
    and organizational_area_key = p_area_key
    and is_active;

  if p_function_id is not null and v_function.id is null then
    raise exception 'function not found for area' using errcode = 'P0002';
  end if;

  select * into v_profile
  from public.internal_access_profiles
  where id = p_access_profile_id and is_active;

  if p_access_profile_id is not null and v_profile.id is null then
    raise exception 'active access profile not found' using errcode = 'P0002';
  end if;

  select case
    when exists (
      select 1 from public.internal_action_target_areas
      where area_key = p_area_key
    ) then p_area_key
    else 'other_internal'
  end into v_legacy_area;

  if p_access_profile_id is not null then
    if v_profile.area_key is not null and v_profile.area_key <> v_legacy_area then
      raise exception 'access profile is not compatible with membership area'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.internal_access_profile_screen_grants
      where access_profile_id = v_profile.id
    ) then
      raise exception 'access profile has no screen grants; configure its screens or choose the area default'
        using errcode = '22023';
    end if;
  else
    v_default_screen_keys := app_private.default_internal_screen_keys(
      p_area_key,
      v_legacy_area
    );

    if cardinality(v_default_screen_keys) = 0 then
      raise exception 'no default screens configured for organizational area'
        using errcode = '22023';
    end if;
  end if;

  select id into v_tenant
  from public.tenants
  where slug = 'genius-internal';

  if v_tenant is null then
    insert into public.tenants(
      slug, legal_name, display_name, status, data_region,
      created_by_user_id, updated_by_user_id
    )
    values (
      'genius-internal', 'Genius Returns', 'Operação interna Genius Returns',
      'active', 'sa-east-1', v_actor, v_actor
    )
    returning id into v_tenant;
  end if;

  insert into public.tenant_memberships(
    tenant_id, user_id, role, status, created_by_user_id, updated_by_user_id
  )
  values (
    v_tenant, p_user_id, 'tenant_viewer', 'active', v_actor, v_actor
  )
  on conflict (tenant_id, user_id) do update
    set status = 'active', updated_by_user_id = v_actor;

  insert into public.user_actor_contexts(
    user_id, actor_type, is_primary, status,
    created_by_user_id, updated_by_user_id
  )
  values (
    p_user_id, 'internal', true, 'active', v_actor, v_actor
  )
  on conflict (user_id, actor_type) do update
    set status = 'active',
        is_primary = true,
        updated_by_user_id = v_actor,
        updated_at = timezone('utc', now());

  insert into public.internal_area_memberships(
    tenant_id, user_id, area_key, organizational_area_key, role, status,
    access_profile_id, permission_mode, created_by_user_id, updated_by_user_id
  )
  values (
    v_tenant, p_user_id, v_legacy_area, p_area_key, 'member', 'active',
    p_access_profile_id,
    case when p_access_profile_id is null
      then 'custom'::public.internal_permission_mode
      else 'profile'::public.internal_permission_mode
    end,
    v_actor, v_actor
  )
  on conflict (tenant_id, user_id, area_key) do update
    set organizational_area_key = excluded.organizational_area_key,
        access_profile_id = excluded.access_profile_id,
        permission_mode = excluded.permission_mode,
        status = 'active',
        updated_by_user_id = v_actor,
        updated_at = timezone('utc', now())
  returning * into v_membership;

  if p_access_profile_id is null then
    delete from public.internal_area_membership_screen_grants
    where membership_id = v_membership.id;

    insert into public.internal_area_membership_screen_grants(
      membership_id, screen_key, created_by_user_id, updated_by_user_id
    )
    select v_membership.id, screen_key, v_actor, v_actor
    from unnest(v_default_screen_keys) as selected(screen_key);
  end if;

  return public.rpc_admin_get_internal_access_user(p_user_id);
end;
$$;

create or replace function public.rpc_admin_assign_internal_access_profile(
  p_membership_id uuid,
  p_access_profile_id uuid
)
returns public.internal_area_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_membership public.internal_area_memberships;
  v_profile public.internal_access_profiles;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.has_global_role('platform_admin'::public.platform_role) then
    raise exception 'rpc_admin_assign_internal_access_profile denied';
  end if;

  select * into v_membership
  from public.internal_area_memberships
  where id = p_membership_id;

  select * into v_profile
  from public.internal_access_profiles
  where id = p_access_profile_id and is_active;

  if v_membership.id is null or v_profile.id is null then
    raise exception 'membership or active access profile not found' using errcode = 'P0002';
  end if;

  if v_profile.area_key is not null and v_profile.area_key <> v_membership.area_key then
    raise exception 'access profile is not compatible with membership area'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.internal_access_profile_screen_grants
    where access_profile_id = v_profile.id
  ) then
    raise exception 'access profile has no screen grants; configure its screens before assigning it'
      using errcode = '22023';
  end if;

  update public.internal_area_memberships
  set access_profile_id = v_profile.id,
      permission_mode = 'profile'::public.internal_permission_mode,
      updated_by_user_id = v_actor_user_id,
      updated_at = timezone('utc', now())
  where id = v_membership.id
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke all on public.internal_organizational_screen_defaults
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_internal_access_assignment(uuid, text, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_assign_internal_access_profile(uuid, uuid)
  from public, anon, authenticated, service_role;
grant select on public.internal_organizational_screen_defaults to authenticated, service_role;
grant execute on function public.rpc_admin_update_internal_access_assignment(uuid, text, uuid, uuid)
  to authenticated, service_role;
grant execute on function public.rpc_admin_assign_internal_access_profile(uuid, uuid)
  to authenticated, service_role;

comment on table public.internal_organizational_screen_defaults is
  'Telas padrão por área organizacional. Orienta o provisionamento sem substituir grants de role, membership ou perfil.';

comment on function public.rpc_admin_update_internal_access_assignment(uuid, text, uuid, uuid) is
  'Provisiona contexto, membership e telas padrão em uma transação; perfil nomeado exige grants de tela explícitos.';
