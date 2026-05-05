create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists app_private;
create schema if not exists audit;

create type public.platform_role as enum (
  'platform_admin',
  'support_agent',
  'support_manager',
  'engineering_member',
  'engineering_manager',
  'knowledge_manager',
  'audit_reviewer'
);

create type public.tenant_status as enum ('active', 'suspended', 'archived');
create type public.membership_status as enum ('invited', 'active', 'revoked');
create type public.tenant_role as enum (
  'tenant_admin',
  'tenant_manager',
  'tenant_requester',
  'tenant_viewer'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email extensions.citext,
  avatar_url text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id)
);

create unique index profiles_email_key
  on public.profiles (email)
  where email is not null;

create table public.user_global_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  unique (user_id, role)
);

create index user_global_roles_user_lookup_idx
  on public.user_global_roles (user_id, role);

create table public.tenants (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null,
  legal_name text not null,
  display_name text not null,
  status public.tenant_status not null default 'active',
  data_region text not null default 'sa-east-1',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint tenants_slug_format_check
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index tenants_slug_key
  on public.tenants (lower(slug));

create table public.tenant_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.tenant_role not null,
  status public.membership_status not null default 'invited',
  invited_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  unique (tenant_id, user_id)
);

create index tenant_memberships_user_lookup_idx
  on public.tenant_memberships (user_id, status, tenant_id);

create index tenant_memberships_tenant_lookup_idx
  on public.tenant_memberships (tenant_id, status, role);

create table public.tenant_contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  linked_user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email extensions.citext,
  phone text,
  job_title text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id)
);

create index tenant_contacts_tenant_lookup_idx
  on public.tenant_contacts (tenant_id, is_active, created_at desc);

create unique index tenant_contacts_primary_per_tenant_key
  on public.tenant_contacts (tenant_id)
  where is_primary and is_active;

create table audit.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  actor_user_id uuid references public.profiles (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  entity_schema text not null,
  entity_table text not null,
  entity_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_logs_tenant_time_idx
  on audit.audit_logs (tenant_id, occurred_at desc);

create index audit_logs_entity_idx
  on audit.audit_logs (entity_schema, entity_table, entity_id, occurred_at desc);

create or replace function app_private.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select auth.uid();
$$;

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function app_private.has_global_role(required_role public.platform_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_global_roles as ugr
    where ugr.user_id = auth.uid()
      and ugr.role = required_role
  );
$$;

create or replace function app_private.is_active_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships as tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function app_private.has_tenant_role(
  target_tenant_id uuid,
  allowed_roles public.tenant_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_memberships as tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role = any(allowed_roles)
  );
$$;

create or replace function app_private.sync_auth_user_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    locale,
    timezone,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    nullif(lower(new.email), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'pt-BR'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'America/Sao_Paulo'),
    new.deleted_at is null,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    locale = coalesce(excluded.locale, public.profiles.locale),
    timezone = coalesce(excluded.timezone, public.profiles.timezone),
    is_active = excluded.is_active,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function audit.capture_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
  target_tenant_id uuid;
  target_entity_id uuid;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if payload ? 'tenant_id' and nullif(payload ->> 'tenant_id', '') is not null then
    target_tenant_id := (payload ->> 'tenant_id')::uuid;
  end if;

  if payload ? 'id' and nullif(payload ->> 'id', '') is not null then
    target_entity_id := (payload ->> 'id')::uuid;
  end if;

  insert into audit.audit_logs (
    occurred_at,
    actor_user_id,
    tenant_id,
    entity_schema,
    entity_table,
    entity_id,
    action,
    before_state,
    after_state,
    metadata
  )
  values (
    timezone('utc', now()),
    auth.uid(),
    target_tenant_id,
    tg_table_schema,
    tg_table_name,
    target_entity_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    jsonb_build_object('trigger_name', tg_name)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function audit.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit.audit_logs is append-only';
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function app_private.touch_updated_at();

create trigger user_global_roles_set_updated_at
before update on public.user_global_roles
for each row
execute function app_private.touch_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row
execute function app_private.touch_updated_at();

create trigger tenant_memberships_set_updated_at
before update on public.tenant_memberships
for each row
execute function app_private.touch_updated_at();

create trigger tenant_contacts_set_updated_at
before update on public.tenant_contacts
for each row
execute function app_private.touch_updated_at();

create trigger on_auth_user_created_or_updated
after insert or update of email, raw_user_meta_data, deleted_at on auth.users
for each row
execute function app_private.sync_auth_user_to_profile();

create trigger audit_logs_prevent_update
before update or delete on audit.audit_logs
for each row
execute function audit.prevent_mutation();

create trigger profiles_audit_row_change
after insert or update or delete on public.profiles
for each row
execute function audit.capture_row_change();

create trigger user_global_roles_audit_row_change
after insert or update or delete on public.user_global_roles
for each row
execute function audit.capture_row_change();

create trigger tenants_audit_row_change
after insert or update or delete on public.tenants
for each row
execute function audit.capture_row_change();

create trigger tenant_memberships_audit_row_change
after insert or update or delete on public.tenant_memberships
for each row
execute function audit.capture_row_change();

create trigger tenant_contacts_audit_row_change
after insert or update or delete on public.tenant_contacts
for each row
execute function audit.capture_row_change();

insert into public.profiles (
  id,
  full_name,
  email,
  avatar_url,
  locale,
  timezone,
  is_active,
  created_at,
  updated_at
)
select
  au.id,
  coalesce(
    nullif(au.raw_user_meta_data ->> 'full_name', ''),
    nullif(au.raw_user_meta_data ->> 'name', '')
  ),
  nullif(lower(au.email), ''),
  nullif(au.raw_user_meta_data ->> 'avatar_url', ''),
  coalesce(nullif(au.raw_user_meta_data ->> 'locale', ''), 'pt-BR'),
  coalesce(nullif(au.raw_user_meta_data ->> 'timezone', ''), 'America/Sao_Paulo'),
  au.deleted_at is null,
  timezone('utc', now()),
  timezone('utc', now())
from auth.users as au
on conflict (id) do update
set
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  email = excluded.email,
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  locale = coalesce(excluded.locale, public.profiles.locale),
  timezone = coalesce(excluded.timezone, public.profiles.timezone),
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

revoke all on schema app_private from public;
revoke all on schema audit from public;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema app_private to authenticated, service_role;
grant usage on schema audit to authenticated, service_role;

grant execute on function app_private.current_user_id() to authenticated, service_role;
grant execute on function app_private.has_global_role(public.platform_role) to authenticated, service_role;
grant execute on function app_private.is_active_tenant_member(uuid) to authenticated, service_role;
grant execute on function app_private.has_tenant_role(uuid, public.tenant_role[]) to authenticated, service_role;

grant select, update on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.user_global_roles to authenticated, service_role;
grant select, insert, update, delete on public.tenants to authenticated, service_role;
grant select, insert, update, delete on public.tenant_memberships to authenticated, service_role;
grant select, insert, update, delete on public.tenant_contacts to authenticated, service_role;
grant select on audit.audit_logs to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.user_global_roles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_contacts enable row level security;
alter table audit.audit_logs enable row level security;

create policy profiles_select_self_or_platform_admin
on public.profiles
for select
to authenticated
using (
  id = app_private.current_user_id()
  or app_private.has_global_role('platform_admin')
);

create policy profiles_update_self_or_platform_admin
on public.profiles
for update
to authenticated
using (
  id = app_private.current_user_id()
  or app_private.has_global_role('platform_admin')
)
with check (
  id = app_private.current_user_id()
  or app_private.has_global_role('platform_admin')
);

create policy user_global_roles_select_self_or_platform_admin
on public.user_global_roles
for select
to authenticated
using (
  user_id = app_private.current_user_id()
  or app_private.has_global_role('platform_admin')
);

create policy user_global_roles_insert_platform_admin
on public.user_global_roles
for insert
to authenticated
with check (app_private.has_global_role('platform_admin'));

create policy user_global_roles_update_platform_admin
on public.user_global_roles
for update
to authenticated
using (app_private.has_global_role('platform_admin'))
with check (app_private.has_global_role('platform_admin'));

create policy user_global_roles_delete_platform_admin
on public.user_global_roles
for delete
to authenticated
using (app_private.has_global_role('platform_admin'));

create policy tenants_select_member_or_platform_admin
on public.tenants
for select
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.is_active_tenant_member(id)
);

create policy tenants_write_platform_admin
on public.tenants
for insert
to authenticated
with check (app_private.has_global_role('platform_admin'));

create policy tenants_update_platform_admin
on public.tenants
for update
to authenticated
using (app_private.has_global_role('platform_admin'))
with check (app_private.has_global_role('platform_admin'));

create policy tenants_delete_platform_admin
on public.tenants
for delete
to authenticated
using (app_private.has_global_role('platform_admin'));

create policy tenant_memberships_select_self_manager_or_platform_admin
on public.tenant_memberships
for select
to authenticated
using (
  user_id = app_private.current_user_id()
  or app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_memberships_insert_manager_or_platform_admin
on public.tenant_memberships
for insert
to authenticated
with check (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_memberships_update_manager_or_platform_admin
on public.tenant_memberships
for update
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
)
with check (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_memberships_delete_manager_or_platform_admin
on public.tenant_memberships
for delete
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_contacts_select_member_or_platform_admin
on public.tenant_contacts
for select
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.is_active_tenant_member(tenant_id)
);

create policy tenant_contacts_insert_manager_or_platform_admin
on public.tenant_contacts
for insert
to authenticated
with check (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_contacts_update_manager_or_platform_admin
on public.tenant_contacts
for update
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
)
with check (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy tenant_contacts_delete_manager_or_platform_admin
on public.tenant_contacts
for delete
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.has_tenant_role(
    tenant_id,
    array['tenant_admin', 'tenant_manager']::public.tenant_role[]
  )
);

create policy audit_logs_select_platform_admin_or_audit_reviewer
on audit.audit_logs
for select
to authenticated
using (
  app_private.has_global_role('platform_admin')
  or app_private.has_global_role('audit_reviewer')
);

comment on schema app_private is
  'Funcoes internas de autorizacao, sync de auth e automacoes de backend.';

comment on schema audit is
  'Trilha append-only de auditoria e compliance.';
