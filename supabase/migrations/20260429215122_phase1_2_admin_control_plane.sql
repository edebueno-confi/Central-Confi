revoke execute on function app_private.current_user_id() from public, anon, authenticated, service_role;
revoke execute on function app_private.has_global_role(public.platform_role) from public, anon, authenticated, service_role;
revoke execute on function app_private.is_active_tenant_member(uuid) from public, anon, authenticated, service_role;
revoke execute on function app_private.has_tenant_role(uuid, public.tenant_role[]) from public, anon, authenticated, service_role;
revoke all on function app_private.can_manage_membership_role(uuid, uuid, public.tenant_role) from public, anon, authenticated, service_role;
revoke all on function app_private.touch_updated_at() from public, anon, authenticated, service_role;
revoke all on function app_private.sync_auth_user_to_profile() from public, anon, authenticated, service_role;
revoke all on function audit.capture_row_change() from public, anon, authenticated, service_role;
revoke all on function audit.prevent_mutation() from public, anon, authenticated, service_role;

grant execute on function app_private.current_user_id() to authenticated, service_role;
grant execute on function app_private.has_global_role(public.platform_role) to authenticated, service_role;
grant execute on function app_private.is_active_tenant_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_tenant_role(uuid, public.tenant_role[]) to authenticated, service_role;
grant execute on function app_private.can_manage_membership_role(uuid, uuid, public.tenant_role) to authenticated, service_role;

revoke insert, update, delete on public.user_global_roles from authenticated;
revoke insert, update, delete on public.tenants from authenticated;
revoke insert, update, delete on public.tenant_memberships from authenticated;
revoke insert, update, delete on public.tenant_contacts from authenticated;

create or replace function app_private.require_active_actor()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_actor_user_id
      and p.is_active
  ) then
    raise exception 'active profile required';
  end if;

  return v_actor_user_id;
end;
$$;

create or replace function public.rpc_admin_create_tenant(
  p_slug text,
  p_legal_name text,
  p_display_name text,
  p_data_region text default 'sa-east-1'
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_tenant public.tenants;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.has_global_role('platform_admin'::public.platform_role) then
    raise exception 'rpc_admin_create_tenant denied';
  end if;

  insert into public.tenants (
    slug,
    legal_name,
    display_name,
    data_region,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    lower(btrim(p_slug)),
    btrim(p_legal_name),
    btrim(p_display_name),
    coalesce(nullif(btrim(p_data_region), ''), 'sa-east-1'),
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_tenant;

  return v_tenant;
end;
$$;

create or replace function public.rpc_admin_update_tenant_status(
  p_tenant_id uuid,
  p_status public.tenant_status
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_tenant public.tenants;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.has_global_role('platform_admin'::public.platform_role) then
    raise exception 'rpc_admin_update_tenant_status denied';
  end if;

  update public.tenants
  set
    status = p_status,
    updated_by_user_id = v_actor_user_id
  where id = p_tenant_id
  returning *
  into v_tenant;

  if v_tenant.id is null then
    raise exception 'tenant not found';
  end if;

  return v_tenant;
end;
$$;

create or replace function public.rpc_admin_add_tenant_member(
  p_tenant_id uuid,
  p_user_id uuid,
  p_role public.tenant_role,
  p_status public.membership_status default 'invited'
)
returns public.tenant_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_membership public.tenant_memberships;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active
  ) then
    raise exception 'target profile not found or inactive';
  end if;

  if not app_private.has_global_role('platform_admin'::public.platform_role)
     and not app_private.can_manage_membership_role(p_tenant_id, p_user_id, p_role) then
    raise exception 'rpc_admin_add_tenant_member denied';
  end if;

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_user_id,
    p_role,
    p_status,
    v_actor_user_id,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_membership;

  return v_membership;
end;
$$;

create or replace function public.rpc_admin_update_tenant_member_role(
  p_membership_id uuid,
  p_role public.tenant_role
)
returns public.tenant_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tenant_memberships;
  v_membership public.tenant_memberships;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tenant_memberships as tm
  where tm.id = p_membership_id;

  if v_existing.id is null then
    raise exception 'tenant membership not found';
  end if;

  if not app_private.has_global_role('platform_admin'::public.platform_role) then
    if not app_private.can_manage_membership_role(
      v_existing.tenant_id,
      v_existing.user_id,
      v_existing.role
    ) then
      raise exception 'rpc_admin_update_tenant_member_role denied';
    end if;

    if not app_private.can_manage_membership_role(
      v_existing.tenant_id,
      v_existing.user_id,
      p_role
    ) then
      raise exception 'rpc_admin_update_tenant_member_role denied';
    end if;
  end if;

  update public.tenant_memberships
  set
    role = p_role,
    updated_by_user_id = v_actor_user_id
  where id = p_membership_id
  returning *
  into v_membership;

  return v_membership;
end;
$$;

create or replace function public.rpc_admin_update_tenant_member_status(
  p_membership_id uuid,
  p_status public.membership_status
)
returns public.tenant_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tenant_memberships;
  v_membership public.tenant_memberships;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tenant_memberships as tm
  where tm.id = p_membership_id;

  if v_existing.id is null then
    raise exception 'tenant membership not found';
  end if;

  if not app_private.has_global_role('platform_admin'::public.platform_role)
     and not app_private.can_manage_membership_role(
       v_existing.tenant_id,
       v_existing.user_id,
       v_existing.role
     ) then
    raise exception 'rpc_admin_update_tenant_member_status denied';
  end if;

  update public.tenant_memberships
  set
    status = p_status,
    updated_by_user_id = v_actor_user_id
  where id = p_membership_id
  returning *
  into v_membership;

  return v_membership;
end;
$$;

create or replace function public.rpc_admin_create_tenant_contact(
  p_tenant_id uuid,
  p_full_name text,
  p_email extensions.citext default null,
  p_phone text default null,
  p_job_title text default null,
  p_is_primary boolean default false,
  p_is_active boolean default true,
  p_linked_user_id uuid default null
)
returns public.tenant_contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_contact public.tenant_contacts;
begin
  v_actor_user_id := app_private.require_active_actor();

  if p_linked_user_id is not null
     and not exists (
       select 1
       from public.profiles as p
       where p.id = p_linked_user_id
     ) then
    raise exception 'linked profile not found';
  end if;

  if not app_private.has_global_role('platform_admin'::public.platform_role)
     and not app_private.has_tenant_role(
       p_tenant_id,
       array['tenant_admin', 'tenant_manager']::public.tenant_role[]
     ) then
    raise exception 'rpc_admin_create_tenant_contact denied';
  end if;

  insert into public.tenant_contacts (
    tenant_id,
    linked_user_id,
    full_name,
    email,
    phone,
    job_title,
    is_primary,
    is_active,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_linked_user_id,
    btrim(p_full_name),
    p_email,
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_job_title), ''),
    p_is_primary,
    p_is_active,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_contact;

  return v_contact;
end;
$$;

create or replace function public.rpc_admin_update_tenant_contact(
  p_contact_id uuid,
  p_full_name text,
  p_email extensions.citext default null,
  p_phone text default null,
  p_job_title text default null,
  p_is_primary boolean default false,
  p_is_active boolean default true,
  p_linked_user_id uuid default null
)
returns public.tenant_contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tenant_contacts;
  v_contact public.tenant_contacts;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tenant_contacts as tc
  where tc.id = p_contact_id;

  if v_existing.id is null then
    raise exception 'tenant contact not found';
  end if;

  if p_linked_user_id is not null
     and not exists (
       select 1
       from public.profiles as p
       where p.id = p_linked_user_id
     ) then
    raise exception 'linked profile not found';
  end if;

  if not app_private.has_global_role('platform_admin'::public.platform_role)
     and not app_private.has_tenant_role(
       v_existing.tenant_id,
       array['tenant_admin', 'tenant_manager']::public.tenant_role[]
     ) then
    raise exception 'rpc_admin_update_tenant_contact denied';
  end if;

  update public.tenant_contacts
  set
    linked_user_id = p_linked_user_id,
    full_name = btrim(p_full_name),
    email = p_email,
    phone = nullif(btrim(p_phone), ''),
    job_title = nullif(btrim(p_job_title), ''),
    is_primary = p_is_primary,
    is_active = p_is_active,
    updated_by_user_id = v_actor_user_id
  where id = p_contact_id
  returning *
  into v_contact;

  return v_contact;
end;
$$;

revoke all on function app_private.require_active_actor() from public, anon, authenticated, service_role;

revoke all on function public.rpc_admin_create_tenant(text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_tenant_status(uuid, public.tenant_status) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_add_tenant_member(uuid, uuid, public.tenant_role, public.membership_status) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_tenant_member_role(uuid, public.tenant_role) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_tenant_member_status(uuid, public.membership_status) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_create_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) from public, anon, authenticated, service_role;

grant execute on function public.rpc_admin_create_tenant(text, text, text, text) to authenticated;
grant execute on function public.rpc_admin_update_tenant_status(uuid, public.tenant_status) to authenticated;
grant execute on function public.rpc_admin_add_tenant_member(uuid, uuid, public.tenant_role, public.membership_status) to authenticated;
grant execute on function public.rpc_admin_update_tenant_member_role(uuid, public.tenant_role) to authenticated;
grant execute on function public.rpc_admin_update_tenant_member_status(uuid, public.membership_status) to authenticated;
grant execute on function public.rpc_admin_create_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) to authenticated;
grant execute on function public.rpc_admin_update_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) to authenticated;

comment on function public.rpc_admin_create_tenant(text, text, text, text) is
  'RPC administrativa para criacao de tenant. Permitida apenas a platform_admin.';

comment on function public.rpc_admin_update_tenant_status(uuid, public.tenant_status) is
  'RPC administrativa para alteracao de status do tenant. Permitida apenas a platform_admin.';

comment on function public.rpc_admin_add_tenant_member(uuid, uuid, public.tenant_role, public.membership_status) is
  'RPC administrativa para adicionar membership com controles de escopo e anti-escalation.';

comment on function public.rpc_admin_update_tenant_member_role(uuid, public.tenant_role) is
  'RPC administrativa para alterar role de membership com controles de escopo e anti-escalation.';

comment on function public.rpc_admin_update_tenant_member_status(uuid, public.membership_status) is
  'RPC administrativa para alterar status de membership com controles de escopo.';

comment on function public.rpc_admin_create_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) is
  'RPC administrativa para criar contato do tenant sem DML direto pelo app.';

comment on function public.rpc_admin_update_tenant_contact(uuid, text, extensions.citext, text, text, boolean, boolean, uuid) is
  'RPC administrativa para atualizar contato do tenant sem DML direto pelo app.';
