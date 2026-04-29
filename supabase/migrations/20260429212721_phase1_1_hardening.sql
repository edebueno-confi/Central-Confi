alter default privileges in schema app_private revoke execute on functions from public;
alter default privileges in schema audit revoke execute on functions from public;

create or replace function app_private.can_manage_membership_role(
  target_tenant_id uuid,
  target_user_id uuid,
  target_role public.tenant_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with actor as (
    select tm.role
    from public.tenant_memberships as tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  )
  select
    app_private.has_global_role('platform_admin')
    or exists (
      select 1
      from actor
      where auth.uid() <> target_user_id
        and (
          (
            actor.role = 'tenant_admin'
            and target_role = any(
              array['tenant_manager', 'tenant_requester', 'tenant_viewer']::public.tenant_role[]
            )
          )
          or (
            actor.role = 'tenant_manager'
            and target_role = any(
              array['tenant_requester', 'tenant_viewer']::public.tenant_role[]
            )
          )
        )
    );
$$;

create or replace function app_private.prevent_sensitive_profile_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id then
      raise exception 'profiles.id is immutable';
    end if;

    if new.email is distinct from old.email then
      raise exception 'profiles.email must be changed via Supabase Auth';
    end if;

    if new.is_active is distinct from old.is_active then
      raise exception 'profiles.is_active is backend-managed';
    end if;

    if new.created_at is distinct from old.created_at then
      raise exception 'profiles.created_at is immutable';
    end if;

    if new.created_by_user_id is distinct from old.created_by_user_id then
      raise exception 'profiles.created_by_user_id is immutable';
    end if;

    if new.updated_by_user_id is distinct from old.updated_by_user_id then
      raise exception 'profiles.updated_by_user_id is backend-managed';
    end if;
  end if;

  return new;
end;
$$;

create or replace function app_private.prevent_membership_key_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_memberships.tenant_id is immutable';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'tenant_memberships.user_id is immutable';
  end if;

  return new;
end;
$$;

create or replace function app_private.prevent_contact_tenant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_contacts.tenant_id is immutable';
  end if;

  return new;
end;
$$;

create or replace function app_private.platform_admin_bootstrap_status()
returns table (
  platform_admin_count bigint,
  bootstrapped boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint as platform_admin_count,
    count(*) > 0 as bootstrapped
  from public.user_global_roles
  where role = 'platform_admin';
$$;

create or replace function app_private.bootstrap_first_platform_admin(
  target_user_id uuid,
  bootstrap_reason text default 'manual bootstrap'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_admin_count bigint;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if nullif(btrim(bootstrap_reason), '') is null then
    raise exception 'bootstrap_reason is required';
  end if;

  select count(*)
  into existing_admin_count
  from public.user_global_roles
  where role = 'platform_admin';

  if existing_admin_count > 0 then
    raise exception 'platform_admin bootstrap already completed';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
      and is_active
  ) then
    raise exception 'target profile not found or inactive';
  end if;

  insert into public.user_global_roles (
    user_id,
    role,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    target_user_id,
    'platform_admin',
    target_user_id,
    target_user_id
  );

  return target_user_id;
end;
$$;

revoke all on function app_private.prevent_sensitive_profile_changes() from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_membership_key_changes() from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_contact_tenant_change() from public, anon, authenticated, service_role;
revoke all on function app_private.platform_admin_bootstrap_status() from public, anon, authenticated, service_role;
revoke all on function app_private.bootstrap_first_platform_admin(uuid, text) from public, anon, authenticated, service_role;

drop policy if exists profiles_update_self_or_platform_admin on public.profiles;
create policy profiles_update_self_safe_fields_only
on public.profiles
for update
to authenticated
using (id = app_private.current_user_id())
with check (id = app_private.current_user_id());

drop policy if exists tenant_memberships_insert_manager_or_platform_admin on public.tenant_memberships;
create policy tenant_memberships_insert_scoped_manager_or_platform_admin
on public.tenant_memberships
for insert
to authenticated
with check (
  app_private.can_manage_membership_role(tenant_id, user_id, role)
);

drop policy if exists tenant_memberships_update_manager_or_platform_admin on public.tenant_memberships;
create policy tenant_memberships_update_scoped_manager_or_platform_admin
on public.tenant_memberships
for update
to authenticated
using (
  app_private.can_manage_membership_role(tenant_id, user_id, role)
)
with check (
  app_private.can_manage_membership_role(tenant_id, user_id, role)
);

drop policy if exists tenant_memberships_delete_manager_or_platform_admin on public.tenant_memberships;
create policy tenant_memberships_delete_scoped_manager_or_platform_admin
on public.tenant_memberships
for delete
to authenticated
using (
  app_private.can_manage_membership_role(tenant_id, user_id, role)
);

create trigger profiles_prevent_sensitive_changes
before update on public.profiles
for each row
execute function app_private.prevent_sensitive_profile_changes();

create trigger tenant_memberships_prevent_key_changes
before update on public.tenant_memberships
for each row
execute function app_private.prevent_membership_key_changes();

create trigger tenant_contacts_prevent_tenant_change
before update on public.tenant_contacts
for each row
execute function app_private.prevent_contact_tenant_change();

comment on function app_private.platform_admin_bootstrap_status() is
  'Retorna o status do bootstrap do primeiro platform_admin para operacao local/remota segura.';

comment on function app_private.bootstrap_first_platform_admin(uuid, text) is
  'Promove o primeiro platform_admin apenas quando ainda nao existe nenhum administrador global.';
