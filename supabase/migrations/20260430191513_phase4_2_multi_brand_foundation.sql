create type public.organization_status as enum ('active', 'suspended', 'archived');
create type public.organization_role as enum (
  'organization_admin',
  'organization_member',
  'organization_viewer'
);
create type public.knowledge_space_status as enum ('draft', 'active', 'archived');
create type public.knowledge_space_domain_status as enum ('active', 'inactive');

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null,
  legal_name text not null,
  display_name text not null,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint organizations_slug_format_check
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_legal_name_not_blank_check
    check (nullif(btrim(legal_name), '') is not null),
  constraint organizations_display_name_not_blank_check
    check (nullif(btrim(display_name), '') is not null)
);

create unique index organizations_slug_key
  on public.organizations (lower(slug));

create table public.organization_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'invited',
  invited_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  unique (organization_id, user_id)
);

create index organization_memberships_user_lookup_idx
  on public.organization_memberships (user_id, status, organization_id);

create index organization_memberships_organization_lookup_idx
  on public.organization_memberships (organization_id, status, role);

create table public.knowledge_spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_tenant_id uuid references public.tenants (id) on delete set null,
  slug text not null,
  display_name text not null,
  status public.knowledge_space_status not null default 'draft',
  is_primary boolean not null default false,
  default_locale text not null default 'pt-BR',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_spaces_slug_format_check
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint knowledge_spaces_display_name_not_blank_check
    check (nullif(btrim(display_name), '') is not null),
  constraint knowledge_spaces_default_locale_not_blank_check
    check (nullif(btrim(default_locale), '') is not null)
);

create unique index knowledge_spaces_slug_key
  on public.knowledge_spaces (lower(slug));

create index knowledge_spaces_organization_lookup_idx
  on public.knowledge_spaces (organization_id, status, created_at desc);

create index knowledge_spaces_owner_tenant_lookup_idx
  on public.knowledge_spaces (owner_tenant_id, status, created_at desc);

create table public.knowledge_space_domains (
  id uuid primary key default extensions.gen_random_uuid(),
  knowledge_space_id uuid not null references public.knowledge_spaces (id) on delete cascade,
  host text not null,
  path_prefix text not null default '/',
  status public.knowledge_space_domain_status not null default 'active',
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_space_domains_host_not_blank_check
    check (nullif(btrim(host), '') is not null),
  constraint knowledge_space_domains_host_format_check
    check (host = lower(host) and host !~ '\s' and host ~ '^[a-z0-9.-]+$'),
  constraint knowledge_space_domains_path_prefix_check
    check (nullif(btrim(path_prefix), '') is not null and left(path_prefix, 1) = '/')
);

create unique index knowledge_space_domains_host_path_key
  on public.knowledge_space_domains (lower(host), path_prefix);

create unique index knowledge_space_domains_primary_per_space_key
  on public.knowledge_space_domains (knowledge_space_id)
  where is_primary;

create index knowledge_space_domains_space_lookup_idx
  on public.knowledge_space_domains (knowledge_space_id, status, created_at desc);

create table public.brand_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  knowledge_space_id uuid not null unique references public.knowledge_spaces (id) on delete cascade,
  brand_name text not null,
  logo_asset_url text,
  theme_tokens jsonb not null default '{}'::jsonb,
  seo_defaults jsonb not null default '{}'::jsonb,
  support_contacts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint brand_settings_brand_name_not_blank_check
    check (nullif(btrim(brand_name), '') is not null)
);

alter table public.tenants
  add column organization_id uuid references public.organizations (id) on delete set null;

create index tenants_organization_lookup_idx
  on public.tenants (organization_id, status, created_at desc);

alter table public.knowledge_categories
  add column knowledge_space_id uuid references public.knowledge_spaces (id) on delete set null;

alter table public.knowledge_articles
  add column knowledge_space_id uuid references public.knowledge_spaces (id) on delete set null;

create index knowledge_categories_space_parent_idx
  on public.knowledge_categories (knowledge_space_id, parent_category_id, slug)
  where knowledge_space_id is not null;

create unique index knowledge_categories_space_slug_scope_key
  on public.knowledge_categories (knowledge_space_id, parent_category_id, slug)
  where knowledge_space_id is not null;

create index knowledge_articles_space_status_idx
  on public.knowledge_articles (knowledge_space_id, status, updated_at desc)
  where knowledge_space_id is not null;

create unique index knowledge_articles_space_slug_scope_key
  on public.knowledge_articles (knowledge_space_id, slug)
  where knowledge_space_id is not null;

create or replace function app_private.can_manage_multi_brand_foundation()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
  )
  and app_private.has_global_role('platform_admin'::public.platform_role);
$$;

create trigger organizations_touch_updated_at
before update on public.organizations
for each row
execute function app_private.touch_updated_at();

create trigger organization_memberships_touch_updated_at
before update on public.organization_memberships
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_spaces_touch_updated_at
before update on public.knowledge_spaces
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_space_domains_touch_updated_at
before update on public.knowledge_space_domains
for each row
execute function app_private.touch_updated_at();

create trigger brand_settings_touch_updated_at
before update on public.brand_settings
for each row
execute function app_private.touch_updated_at();

create trigger organizations_audit_row_change
after insert or update or delete on public.organizations
for each row
execute function audit.capture_row_change();

create trigger organization_memberships_audit_row_change
after insert or update or delete on public.organization_memberships
for each row
execute function audit.capture_row_change();

create trigger knowledge_spaces_audit_row_change
after insert or update or delete on public.knowledge_spaces
for each row
execute function audit.capture_row_change();

create trigger knowledge_space_domains_audit_row_change
after insert or update or delete on public.knowledge_space_domains
for each row
execute function audit.capture_row_change();

create trigger brand_settings_audit_row_change
after insert or update or delete on public.brand_settings
for each row
execute function audit.capture_row_change();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.knowledge_spaces enable row level security;
alter table public.knowledge_space_domains enable row level security;
alter table public.brand_settings enable row level security;

create policy organizations_select_managed
on public.organizations
for select
to authenticated
using (app_private.can_manage_multi_brand_foundation());

create policy organizations_write_managed
on public.organizations
for all
to authenticated
using (app_private.can_manage_multi_brand_foundation())
with check (app_private.can_manage_multi_brand_foundation());

create policy organization_memberships_select_managed
on public.organization_memberships
for select
to authenticated
using (app_private.can_manage_multi_brand_foundation());

create policy organization_memberships_write_managed
on public.organization_memberships
for all
to authenticated
using (app_private.can_manage_multi_brand_foundation())
with check (app_private.can_manage_multi_brand_foundation());

create policy knowledge_spaces_select_managed
on public.knowledge_spaces
for select
to authenticated
using (app_private.can_manage_multi_brand_foundation());

create policy knowledge_spaces_write_managed
on public.knowledge_spaces
for all
to authenticated
using (app_private.can_manage_multi_brand_foundation())
with check (app_private.can_manage_multi_brand_foundation());

create policy knowledge_space_domains_select_managed
on public.knowledge_space_domains
for select
to authenticated
using (app_private.can_manage_multi_brand_foundation());

create policy knowledge_space_domains_write_managed
on public.knowledge_space_domains
for all
to authenticated
using (app_private.can_manage_multi_brand_foundation())
with check (app_private.can_manage_multi_brand_foundation());

create policy brand_settings_select_managed
on public.brand_settings
for select
to authenticated
using (app_private.can_manage_multi_brand_foundation());

create policy brand_settings_write_managed
on public.brand_settings
for all
to authenticated
using (app_private.can_manage_multi_brand_foundation())
with check (app_private.can_manage_multi_brand_foundation());

revoke select, insert, update, delete on public.organizations from authenticated;
revoke select, insert, update, delete on public.organization_memberships from authenticated;
revoke select, insert, update, delete on public.knowledge_spaces from authenticated;
revoke select, insert, update, delete on public.knowledge_space_domains from authenticated;
revoke select, insert, update, delete on public.brand_settings from authenticated;

create or replace view public.vw_admin_organizations_list
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_multi_brand_foundation()
  ),
  tenant_stats as (
    select
      t.organization_id,
      count(*)::integer as tenant_count,
      count(*) filter (where t.status = 'active')::integer as active_tenant_count
    from public.tenants as t
    where t.organization_id is not null
    group by t.organization_id
  ),
  membership_stats as (
    select
      om.organization_id,
      count(*)::integer as organization_membership_count,
      count(*) filter (where om.status = 'active')::integer as active_organization_membership_count
    from public.organization_memberships as om
    group by om.organization_id
  ),
  knowledge_space_stats as (
    select
      ks.organization_id,
      count(*)::integer as knowledge_space_count,
      count(*) filter (where ks.status = 'active')::integer as active_knowledge_space_count
    from public.knowledge_spaces as ks
    group by ks.organization_id
  )
  select
    o.id,
    o.slug,
    o.legal_name,
    o.display_name,
    o.status,
    o.created_at,
    o.updated_at,
    o.created_by_user_id,
    creator.full_name as created_by_full_name,
    o.updated_by_user_id,
    updater.full_name as updated_by_full_name,
    coalesce(ts.tenant_count, 0) as tenant_count,
    coalesce(ts.active_tenant_count, 0) as active_tenant_count,
    coalesce(ms.organization_membership_count, 0) as organization_membership_count,
    coalesce(ms.active_organization_membership_count, 0) as active_organization_membership_count,
    coalesce(kss.knowledge_space_count, 0) as knowledge_space_count,
    coalesce(kss.active_knowledge_space_count, 0) as active_knowledge_space_count
  from current_actor as ca
  join public.organizations as o
    on true
  left join public.profiles as creator
    on creator.id = o.created_by_user_id
  left join public.profiles as updater
    on updater.id = o.updated_by_user_id
  left join tenant_stats as ts
    on ts.organization_id = o.id
  left join membership_stats as ms
    on ms.organization_id = o.id
  left join knowledge_space_stats as kss
    on kss.organization_id = o.id
  order by o.created_at desc, o.display_name asc;

create or replace view public.vw_admin_organization_detail
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_multi_brand_foundation()
  ),
  tenant_payload as (
    select
      t.organization_id,
      count(*)::integer as tenant_count,
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'slug', t.slug,
          'display_name', t.display_name,
          'status', t.status,
          'data_region', t.data_region,
          'created_at', t.created_at
        )
        order by t.created_at desc, t.display_name asc
      ) as tenants
    from public.tenants as t
    where t.organization_id is not null
    group by t.organization_id
  ),
  knowledge_space_payload as (
    select
      ks.organization_id,
      count(*)::integer as knowledge_space_count,
      jsonb_agg(
        jsonb_build_object(
          'id', ks.id,
          'slug', ks.slug,
          'display_name', ks.display_name,
          'status', ks.status,
          'owner_tenant_id', ks.owner_tenant_id,
          'is_primary', ks.is_primary,
          'default_locale', ks.default_locale,
          'created_at', ks.created_at
        )
        order by ks.created_at desc, ks.display_name asc
      ) as knowledge_spaces
    from public.knowledge_spaces as ks
    group by ks.organization_id
  ),
  membership_payload as (
    select
      om.organization_id,
      count(*)::integer as organization_membership_count,
      jsonb_agg(
        jsonb_build_object(
          'id', om.id,
          'user_id', om.user_id,
          'role', om.role,
          'status', om.status,
          'created_at', om.created_at
        )
        order by om.created_at asc, om.id asc
      ) as organization_memberships
    from public.organization_memberships as om
    group by om.organization_id
  )
  select
    o.id,
    o.slug,
    o.legal_name,
    o.display_name,
    o.status,
    o.created_at,
    o.updated_at,
    o.created_by_user_id,
    creator.full_name as created_by_full_name,
    o.updated_by_user_id,
    updater.full_name as updated_by_full_name,
    coalesce(tp.tenant_count, 0) as tenant_count,
    coalesce(ksp.knowledge_space_count, 0) as knowledge_space_count,
    coalesce(mp.organization_membership_count, 0) as organization_membership_count,
    coalesce(tp.tenants, '[]'::jsonb) as tenants,
    coalesce(ksp.knowledge_spaces, '[]'::jsonb) as knowledge_spaces,
    coalesce(mp.organization_memberships, '[]'::jsonb) as organization_memberships
  from current_actor as ca
  join public.organizations as o
    on true
  left join public.profiles as creator
    on creator.id = o.created_by_user_id
  left join public.profiles as updater
    on updater.id = o.updated_by_user_id
  left join tenant_payload as tp
    on tp.organization_id = o.id
  left join knowledge_space_payload as ksp
    on ksp.organization_id = o.id
  left join membership_payload as mp
    on mp.organization_id = o.id
  order by o.created_at desc, o.display_name asc;

create or replace view public.vw_admin_knowledge_spaces
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_multi_brand_foundation()
  ),
  primary_domains as (
    select distinct on (ksd.knowledge_space_id)
      ksd.knowledge_space_id,
      ksd.host as primary_domain_host,
      ksd.path_prefix as primary_domain_path_prefix,
      ksd.status as primary_domain_status
    from public.knowledge_space_domains as ksd
    order by ksd.knowledge_space_id, ksd.is_primary desc, ksd.created_at asc, ksd.id asc
  ),
  category_stats as (
    select
      kc.knowledge_space_id,
      count(*)::integer as category_count
    from public.knowledge_categories as kc
    where kc.knowledge_space_id is not null
    group by kc.knowledge_space_id
  ),
  article_stats as (
    select
      ka.knowledge_space_id,
      count(*)::integer as article_count,
      count(*) filter (where ka.status = 'published')::integer as published_article_count
    from public.knowledge_articles as ka
    where ka.knowledge_space_id is not null
    group by ka.knowledge_space_id
  )
  select
    ks.id,
    ks.organization_id,
    o.slug as organization_slug,
    o.display_name as organization_display_name,
    ks.owner_tenant_id,
    owner_tenant.slug as owner_tenant_slug,
    owner_tenant.display_name as owner_tenant_display_name,
    ks.slug,
    ks.display_name,
    ks.status,
    ks.is_primary,
    ks.default_locale,
    pd.primary_domain_host,
    pd.primary_domain_path_prefix,
    pd.primary_domain_status,
    bs.brand_name,
    bs.logo_asset_url,
    coalesce(cs.category_count, 0) as category_count,
    coalesce(ars.article_count, 0) as article_count,
    coalesce(ars.published_article_count, 0) as published_article_count,
    ks.created_at,
    ks.updated_at,
    ks.created_by_user_id,
    creator.full_name as created_by_full_name,
    ks.updated_by_user_id,
    updater.full_name as updated_by_full_name
  from current_actor as ca
  join public.knowledge_spaces as ks
    on true
  join public.organizations as o
    on o.id = ks.organization_id
  left join public.tenants as owner_tenant
    on owner_tenant.id = ks.owner_tenant_id
  left join primary_domains as pd
    on pd.knowledge_space_id = ks.id
  left join public.brand_settings as bs
    on bs.knowledge_space_id = ks.id
  left join category_stats as cs
    on cs.knowledge_space_id = ks.id
  left join article_stats as ars
    on ars.knowledge_space_id = ks.id
  left join public.profiles as creator
    on creator.id = ks.created_by_user_id
  left join public.profiles as updater
    on updater.id = ks.updated_by_user_id
  order by ks.created_at desc, ks.display_name asc;

revoke all on public.vw_admin_organizations_list from public, anon, authenticated, service_role;
revoke all on public.vw_admin_organization_detail from public, anon, authenticated, service_role;
revoke all on public.vw_admin_knowledge_spaces from public, anon, authenticated, service_role;

grant select on public.vw_admin_organizations_list to authenticated, service_role;
grant select on public.vw_admin_organization_detail to authenticated, service_role;
grant select on public.vw_admin_knowledge_spaces to authenticated, service_role;

revoke all on function app_private.can_manage_multi_brand_foundation() from public, anon, authenticated, service_role;

grant execute on function app_private.can_manage_multi_brand_foundation() to authenticated, service_role;

comment on view public.vw_admin_organizations_list is
  'Read model contratual da lista administrativa de organizations, restrito a platform_admin.';

comment on view public.vw_admin_organization_detail is
  'Read model contratual do detalhe administrativo de organizations com tenants, memberships e knowledge spaces agregados.';

comment on view public.vw_admin_knowledge_spaces is
  'Read model contratual dos knowledge spaces administrativos com organization, tenant dono, dominio primario e branding.';
