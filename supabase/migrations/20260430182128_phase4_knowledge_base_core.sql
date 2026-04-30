create type public.knowledge_visibility as enum ('public', 'internal', 'restricted');
create type public.knowledge_article_status as enum (
  'draft',
  'review',
  'published',
  'archived'
);

create table public.knowledge_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  parent_category_id uuid references public.knowledge_categories (id) on delete set null,
  visibility public.knowledge_visibility not null default 'internal',
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_categories_name_not_blank_check
    check (nullif(btrim(name), '') is not null),
  constraint knowledge_categories_slug_not_blank_check
    check (nullif(btrim(slug), '') is not null),
  constraint knowledge_categories_slug_format_check
    check (slug = lower(slug) and slug !~ '\s')
);

alter table public.knowledge_categories
  add constraint knowledge_categories_slug_scope_key
  unique nulls not distinct (tenant_id, parent_category_id, slug);

create index knowledge_categories_parent_idx
  on public.knowledge_categories (parent_category_id, slug);

create table public.knowledge_articles (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  category_id uuid references public.knowledge_categories (id) on delete set null,
  visibility public.knowledge_visibility not null default 'internal',
  status public.knowledge_article_status not null default 'draft',
  title text not null,
  slug text not null,
  summary text,
  body_md text not null,
  source_path text,
  source_hash text,
  current_revision_number integer not null default 1,
  submitted_for_review_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_articles_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint knowledge_articles_slug_not_blank_check
    check (nullif(btrim(slug), '') is not null),
  constraint knowledge_articles_slug_format_check
    check (slug = lower(slug) and slug !~ '\s'),
  constraint knowledge_articles_body_md_not_blank_check
    check (nullif(btrim(body_md), '') is not null),
  constraint knowledge_articles_source_pair_check
    check (
      (source_path is null and source_hash is null)
      or (nullif(btrim(source_path), '') is not null and nullif(btrim(source_hash), '') is not null)
    ),
  constraint knowledge_articles_revision_positive_check
    check (current_revision_number >= 1),
  constraint knowledge_articles_status_timestamps_check
    check (
      (status = 'draft' and submitted_for_review_at is null and published_at is null and archived_at is null)
      or (status = 'review' and submitted_for_review_at is not null and published_at is null and archived_at is null)
      or (status = 'published' and published_at is not null and archived_at is null)
      or (status = 'archived' and archived_at is not null)
    )
);

alter table public.knowledge_articles
  add constraint knowledge_articles_slug_scope_key
  unique nulls not distinct (tenant_id, slug);

create index knowledge_articles_category_status_idx
  on public.knowledge_articles (category_id, status, updated_at desc);

create index knowledge_articles_tenant_visibility_idx
  on public.knowledge_articles (tenant_id, visibility, status, updated_at desc);

create table public.knowledge_article_revisions (
  id uuid primary key default extensions.gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  revision_number integer not null,
  status_snapshot public.knowledge_article_status not null,
  visibility public.knowledge_visibility not null,
  title text not null,
  slug text not null,
  summary text,
  body_md text not null,
  source_path text,
  source_hash text,
  change_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_article_revisions_revision_positive_check
    check (revision_number >= 1),
  constraint knowledge_article_revisions_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint knowledge_article_revisions_slug_not_blank_check
    check (nullif(btrim(slug), '') is not null),
  constraint knowledge_article_revisions_body_md_not_blank_check
    check (nullif(btrim(body_md), '') is not null),
  constraint knowledge_article_revisions_source_pair_check
    check (
      (source_path is null and source_hash is null)
      or (nullif(btrim(source_path), '') is not null and nullif(btrim(source_hash), '') is not null)
    )
);

alter table public.knowledge_article_revisions
  add constraint knowledge_article_revisions_article_revision_key
  unique (article_id, revision_number);

create index knowledge_article_revisions_article_created_idx
  on public.knowledge_article_revisions (article_id, created_at desc);

create table public.knowledge_article_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  revision_id uuid references public.knowledge_article_revisions (id) on delete set null,
  source_kind text not null default 'legacy_octadesk',
  source_path text not null,
  source_hash text not null,
  source_title text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_article_sources_kind_not_blank_check
    check (nullif(btrim(source_kind), '') is not null),
  constraint knowledge_article_sources_path_not_blank_check
    check (nullif(btrim(source_path), '') is not null),
  constraint knowledge_article_sources_hash_not_blank_check
    check (nullif(btrim(source_hash), '') is not null)
);

alter table public.knowledge_article_sources
  add constraint knowledge_article_sources_article_path_hash_key
  unique (article_id, source_path, source_hash);

create index knowledge_article_sources_article_created_idx
  on public.knowledge_article_sources (article_id, created_at desc);

create or replace function app_private.can_manage_knowledge_base()
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

create or replace function app_private.can_read_knowledge_article(
  target_tenant_id uuid,
  target_visibility public.knowledge_visibility,
  target_status public.knowledge_article_status
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when app_private.can_manage_knowledge_base() then true
    when target_status <> 'published' then false
    when target_visibility = 'public'::public.knowledge_visibility then true
    when target_visibility = 'internal'::public.knowledge_visibility then (
      auth.uid() is not null
      and (
        app_private.has_any_global_role(
          array[
            'support_agent',
            'support_manager',
            'engineering_member',
            'engineering_manager',
            'knowledge_manager',
            'audit_reviewer'
          ]::public.platform_role[]
        )
        or (
          target_tenant_id is not null
          and app_private.is_active_tenant_member(target_tenant_id)
        )
      )
    )
    else false
  end;
$$;

create or replace function app_private.capture_knowledge_revision(
  p_article_id uuid,
  p_actor_user_id uuid,
  p_change_note text default null
)
returns public.knowledge_article_revisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.knowledge_articles;
  v_revision public.knowledge_article_revisions;
begin
  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  insert into public.knowledge_article_revisions (
    article_id,
    revision_number,
    status_snapshot,
    visibility,
    title,
    slug,
    summary,
    body_md,
    source_path,
    source_hash,
    change_note,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    v_article.id,
    v_article.current_revision_number,
    v_article.status,
    v_article.visibility,
    v_article.title,
    v_article.slug,
    v_article.summary,
    v_article.body_md,
    v_article.source_path,
    v_article.source_hash,
    nullif(btrim(p_change_note), ''),
    p_actor_user_id,
    p_actor_user_id
  )
  returning *
  into v_revision;

  return v_revision;
end;
$$;

create or replace function public.rpc_admin_create_knowledge_category(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_parent_category_id uuid default null,
  p_tenant_id uuid default null
)
returns public.knowledge_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_parent public.knowledge_categories;
  v_category public.knowledge_categories;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_create_knowledge_category denied';
  end if;

  if p_tenant_id is not null
     and not exists (
       select 1
       from public.tenants as t
       where t.id = p_tenant_id
     ) then
    raise exception 'knowledge tenant not found';
  end if;

  if p_parent_category_id is not null then
    select *
    into v_parent
    from public.knowledge_categories as kc
    where kc.id = p_parent_category_id;

    if v_parent.id is null then
      raise exception 'knowledge parent category not found';
    end if;

    if v_parent.tenant_id is distinct from p_tenant_id then
      raise exception 'knowledge category tenant mismatch';
    end if;
  end if;

  insert into public.knowledge_categories (
    tenant_id,
    parent_category_id,
    visibility,
    name,
    slug,
    description,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_parent_category_id,
    p_visibility,
    btrim(p_name),
    lower(btrim(p_slug)),
    nullif(btrim(p_description), ''),
    v_actor_user_id,
    v_actor_user_id
  )
  on conflict (tenant_id, parent_category_id, slug)
  do update set
    name = excluded.name,
    description = excluded.description,
    visibility = excluded.visibility,
    updated_by_user_id = v_actor_user_id
  returning *
  into v_category;

  return v_category;
end;
$$;

create or replace function public.rpc_admin_create_knowledge_article_draft(
  p_title text,
  p_slug text,
  p_summary text default null,
  p_body_md text default '',
  p_category_id uuid default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_tenant_id uuid default null,
  p_source_path text default null,
  p_source_hash text default null
)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_category public.knowledge_categories;
  v_article public.knowledge_articles;
  v_revision public.knowledge_article_revisions;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_create_knowledge_article_draft denied';
  end if;

  if p_tenant_id is not null
     and not exists (
       select 1
       from public.tenants as t
       where t.id = p_tenant_id
     ) then
    raise exception 'knowledge tenant not found';
  end if;

  if p_category_id is not null then
    select *
    into v_category
    from public.knowledge_categories as kc
    where kc.id = p_category_id;

    if v_category.id is null then
      raise exception 'knowledge category not found';
    end if;

    if v_category.tenant_id is distinct from p_tenant_id then
      raise exception 'knowledge article tenant mismatch';
    end if;
  end if;

  insert into public.knowledge_articles (
    tenant_id,
    category_id,
    visibility,
    status,
    title,
    slug,
    summary,
    body_md,
    source_path,
    source_hash,
    current_revision_number,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_category_id,
    p_visibility,
    'draft',
    btrim(p_title),
    lower(btrim(p_slug)),
    nullif(btrim(p_summary), ''),
    btrim(p_body_md),
    nullif(btrim(p_source_path), ''),
    nullif(btrim(p_source_hash), ''),
    1,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_article;

  v_revision := app_private.capture_knowledge_revision(
    v_article.id,
    v_actor_user_id,
    'draft created'
  );

  if v_article.source_path is not null and v_article.source_hash is not null then
    insert into public.knowledge_article_sources (
      article_id,
      revision_id,
      source_kind,
      source_path,
      source_hash,
      source_title,
      source_metadata,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_article.id,
      v_revision.id,
      'legacy_octadesk',
      v_article.source_path,
      v_article.source_hash,
      v_article.title,
      jsonb_build_object(
        'initial_status', v_article.status,
        'initial_visibility', v_article.visibility
      ),
      v_actor_user_id,
      v_actor_user_id
    )
    on conflict (article_id, source_path, source_hash) do nothing;
  end if;

  return v_article;
end;
$$;

create or replace function public.rpc_admin_update_knowledge_article_draft(
  p_article_id uuid,
  p_title text,
  p_slug text,
  p_summary text default null,
  p_body_md text default '',
  p_category_id uuid default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_source_path text default null,
  p_source_hash text default null
)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_articles;
  v_category public.knowledge_categories;
  v_article public.knowledge_articles;
  v_revision public.knowledge_article_revisions;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_update_knowledge_article_draft denied';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.status = 'published' then
    raise exception 'published knowledge article requires a new editorial flow';
  end if;

  if v_existing.status = 'archived' then
    raise exception 'archived knowledge article is immutable';
  end if;

  if p_category_id is not null then
    select *
    into v_category
    from public.knowledge_categories as kc
    where kc.id = p_category_id;

    if v_category.id is null then
      raise exception 'knowledge category not found';
    end if;

    if v_category.tenant_id is distinct from v_existing.tenant_id then
      raise exception 'knowledge article tenant mismatch';
    end if;
  end if;

  update public.knowledge_articles
  set
    category_id = p_category_id,
    visibility = p_visibility,
    title = btrim(p_title),
    slug = lower(btrim(p_slug)),
    summary = nullif(btrim(p_summary), ''),
    body_md = btrim(p_body_md),
    source_path = nullif(btrim(p_source_path), ''),
    source_hash = nullif(btrim(p_source_hash), ''),
    current_revision_number = current_revision_number + 1,
    updated_by_user_id = v_actor_user_id
  where id = p_article_id
  returning *
  into v_article;

  v_revision := app_private.capture_knowledge_revision(
    v_article.id,
    v_actor_user_id,
    'draft updated'
  );

  if v_article.source_path is not null and v_article.source_hash is not null then
    insert into public.knowledge_article_sources (
      article_id,
      revision_id,
      source_kind,
      source_path,
      source_hash,
      source_title,
      source_metadata,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      v_article.id,
      v_revision.id,
      'legacy_octadesk',
      v_article.source_path,
      v_article.source_hash,
      v_article.title,
      jsonb_build_object(
        'updated_status', v_article.status,
        'updated_visibility', v_article.visibility
      ),
      v_actor_user_id,
      v_actor_user_id
    )
    on conflict (article_id, source_path, source_hash) do nothing;
  end if;

  return v_article;
end;
$$;

create or replace function public.rpc_admin_submit_knowledge_article_for_review(
  p_article_id uuid
)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_articles;
  v_article public.knowledge_articles;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_submit_knowledge_article_for_review denied';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.status <> 'draft' then
    raise exception 'knowledge article must be draft before review';
  end if;

  update public.knowledge_articles
  set
    status = 'review',
    current_revision_number = current_revision_number + 1,
    submitted_for_review_at = timezone('utc', now()),
    updated_by_user_id = v_actor_user_id
  where id = p_article_id
  returning *
  into v_article;

  perform app_private.capture_knowledge_revision(
    v_article.id,
    v_actor_user_id,
    'submitted for review'
  );

  return v_article;
end;
$$;

create or replace function public.rpc_admin_publish_knowledge_article(
  p_article_id uuid
)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_articles;
  v_article public.knowledge_articles;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_publish_knowledge_article denied';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.status <> 'review' then
    raise exception 'knowledge article must be in review before publish';
  end if;

  update public.knowledge_articles
  set
    status = 'published',
    current_revision_number = current_revision_number + 1,
    published_at = timezone('utc', now()),
    archived_at = null,
    updated_by_user_id = v_actor_user_id
  where id = p_article_id
  returning *
  into v_article;

  perform app_private.capture_knowledge_revision(
    v_article.id,
    v_actor_user_id,
    'published'
  );

  return v_article;
end;
$$;

create or replace function public.rpc_admin_archive_knowledge_article(
  p_article_id uuid
)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_articles;
  v_article public.knowledge_articles;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_archive_knowledge_article denied';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.status = 'archived' then
    raise exception 'knowledge article already archived';
  end if;

  update public.knowledge_articles
  set
    status = 'archived',
    current_revision_number = current_revision_number + 1,
    archived_at = timezone('utc', now()),
    updated_by_user_id = v_actor_user_id
  where id = p_article_id
  returning *
  into v_article;

  perform app_private.capture_knowledge_revision(
    v_article.id,
    v_actor_user_id,
    'archived'
  );

  return v_article;
end;
$$;

create trigger knowledge_categories_touch_updated_at
before update on public.knowledge_categories
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_articles_touch_updated_at
before update on public.knowledge_articles
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_categories_audit_row_change
after insert or update or delete on public.knowledge_categories
for each row
execute function audit.capture_row_change();

create trigger knowledge_articles_audit_row_change
after insert or update or delete on public.knowledge_articles
for each row
execute function audit.capture_row_change();

create trigger knowledge_article_revisions_audit_row_change
after insert or update or delete on public.knowledge_article_revisions
for each row
execute function audit.capture_row_change();

create trigger knowledge_article_sources_audit_row_change
after insert or update or delete on public.knowledge_article_sources
for each row
execute function audit.capture_row_change();

create trigger knowledge_article_revisions_append_only
before update or delete on public.knowledge_article_revisions
for each row
execute function audit.prevent_mutation();

create trigger knowledge_article_sources_append_only
before update or delete on public.knowledge_article_sources
for each row
execute function audit.prevent_mutation();

alter table public.knowledge_categories enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.knowledge_article_revisions enable row level security;
alter table public.knowledge_article_sources enable row level security;

create policy knowledge_categories_select_managed
on public.knowledge_categories
for select
to authenticated
using (app_private.can_manage_knowledge_base());

create policy knowledge_categories_write_managed
on public.knowledge_categories
for all
to authenticated
using (app_private.can_manage_knowledge_base())
with check (app_private.can_manage_knowledge_base());

create policy knowledge_articles_select_readable
on public.knowledge_articles
for select
to authenticated
using (
  app_private.can_read_knowledge_article(
    tenant_id,
    visibility,
    status
  )
);

create policy knowledge_articles_write_managed
on public.knowledge_articles
for all
to authenticated
using (app_private.can_manage_knowledge_base())
with check (app_private.can_manage_knowledge_base());

create policy knowledge_article_revisions_select_readable
on public.knowledge_article_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.knowledge_articles as ka
    where ka.id = article_id
      and app_private.can_read_knowledge_article(
        ka.tenant_id,
        ka.visibility,
        ka.status
      )
  )
);

create policy knowledge_article_revisions_insert_managed
on public.knowledge_article_revisions
for insert
to authenticated
with check (app_private.can_manage_knowledge_base());

create policy knowledge_article_sources_select_managed
on public.knowledge_article_sources
for select
to authenticated
using (app_private.can_manage_knowledge_base());

create policy knowledge_article_sources_insert_managed
on public.knowledge_article_sources
for insert
to authenticated
with check (app_private.can_manage_knowledge_base());

revoke select, insert, update, delete on public.knowledge_categories from authenticated;
revoke select, insert, update, delete on public.knowledge_articles from authenticated;
revoke select, insert, update, delete on public.knowledge_article_revisions from authenticated;
revoke select, insert, update, delete on public.knowledge_article_sources from authenticated;

create or replace view public.vw_admin_knowledge_categories
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_knowledge_base()
  ),
  article_stats as (
    select
      ka.category_id,
      count(*)::integer as article_count,
      count(*) filter (where ka.status = 'draft')::integer as draft_count,
      count(*) filter (where ka.status = 'review')::integer as review_count,
      count(*) filter (where ka.status = 'published')::integer as published_count,
      count(*) filter (where ka.status = 'archived')::integer as archived_count
    from public.knowledge_articles as ka
    group by ka.category_id
  )
  select
    kc.id,
    kc.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    kc.parent_category_id,
    parent.slug as parent_slug,
    parent.name as parent_name,
    kc.visibility,
    kc.name,
    kc.slug,
    kc.description,
    coalesce(stats.article_count, 0) as article_count,
    coalesce(stats.draft_count, 0) as draft_count,
    coalesce(stats.review_count, 0) as review_count,
    coalesce(stats.published_count, 0) as published_count,
    coalesce(stats.archived_count, 0) as archived_count,
    kc.created_at,
    kc.updated_at,
    creator.full_name as created_by_full_name,
    updater.full_name as updated_by_full_name
  from public.knowledge_categories as kc
  join current_actor
    on true
  left join public.tenants as t
    on t.id = kc.tenant_id
  left join public.knowledge_categories as parent
    on parent.id = kc.parent_category_id
  left join article_stats as stats
    on stats.category_id = kc.id
  left join public.profiles as creator
    on creator.id = kc.created_by_user_id
  left join public.profiles as updater
    on updater.id = kc.updated_by_user_id;

create or replace view public.vw_admin_knowledge_articles_list
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_knowledge_base()
  ),
  revision_stats as (
    select
      kar.article_id,
      count(*)::integer as revision_count,
      max(kar.created_at) as latest_revision_at
    from public.knowledge_article_revisions as kar
    group by kar.article_id
  )
  select
    ka.id,
    ka.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    ka.category_id,
    kc.name as category_name,
    kc.slug as category_slug,
    ka.visibility,
    ka.status,
    ka.title,
    ka.slug,
    ka.summary,
    ka.source_path,
    ka.source_hash,
    ka.current_revision_number,
    coalesce(stats.revision_count, 0) as revision_count,
    stats.latest_revision_at,
    ka.submitted_for_review_at,
    ka.published_at,
    ka.archived_at,
    ka.created_at,
    ka.updated_at,
    creator.full_name as created_by_full_name,
    updater.full_name as updated_by_full_name
  from public.knowledge_articles as ka
  join current_actor
    on true
  left join public.tenants as t
    on t.id = ka.tenant_id
  left join public.knowledge_categories as kc
    on kc.id = ka.category_id
  left join revision_stats as stats
    on stats.article_id = ka.id
  left join public.profiles as creator
    on creator.id = ka.created_by_user_id
  left join public.profiles as updater
    on updater.id = ka.updated_by_user_id;

create or replace view public.vw_admin_knowledge_article_detail
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_knowledge_base()
  ),
  revisions_json as (
    select
      kar.article_id,
      jsonb_agg(
        jsonb_build_object(
          'id', kar.id,
          'revision_number', kar.revision_number,
          'status_snapshot', kar.status_snapshot,
          'visibility', kar.visibility,
          'title', kar.title,
          'slug', kar.slug,
          'summary', kar.summary,
          'body_md', kar.body_md,
          'source_path', kar.source_path,
          'source_hash', kar.source_hash,
          'change_note', kar.change_note,
          'created_at', kar.created_at,
          'created_by_user_id', kar.created_by_user_id
        )
        order by kar.revision_number desc, kar.created_at desc
      ) as revisions
    from public.knowledge_article_revisions as kar
    group by kar.article_id
  ),
  sources_json as (
    select
      kas.article_id,
      jsonb_agg(
        jsonb_build_object(
          'id', kas.id,
          'revision_id', kas.revision_id,
          'source_kind', kas.source_kind,
          'source_path', kas.source_path,
          'source_hash', kas.source_hash,
          'source_title', kas.source_title,
          'source_metadata', kas.source_metadata,
          'created_at', kas.created_at
        )
        order by kas.created_at desc, kas.id desc
      ) as sources
    from public.knowledge_article_sources as kas
    group by kas.article_id
  )
  select
    ka.id,
    ka.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    ka.category_id,
    kc.name as category_name,
    kc.slug as category_slug,
    ka.visibility,
    ka.status,
    ka.title,
    ka.slug,
    ka.summary,
    ka.body_md,
    ka.source_path,
    ka.source_hash,
    ka.current_revision_number,
    ka.submitted_for_review_at,
    ka.published_at,
    ka.archived_at,
    ka.created_at,
    ka.updated_at,
    creator.full_name as created_by_full_name,
    updater.full_name as updated_by_full_name,
    coalesce(revisions_json.revisions, '[]'::jsonb) as revisions,
    coalesce(sources_json.sources, '[]'::jsonb) as sources
  from public.knowledge_articles as ka
  join current_actor
    on true
  left join public.tenants as t
    on t.id = ka.tenant_id
  left join public.knowledge_categories as kc
    on kc.id = ka.category_id
  left join revisions_json
    on revisions_json.article_id = ka.id
  left join sources_json
    on sources_json.article_id = ka.id
  left join public.profiles as creator
    on creator.id = ka.created_by_user_id
  left join public.profiles as updater
    on updater.id = ka.updated_by_user_id;

revoke all on public.vw_admin_knowledge_categories from public, anon, authenticated, service_role;
revoke all on public.vw_admin_knowledge_articles_list from public, anon, authenticated, service_role;
revoke all on public.vw_admin_knowledge_article_detail from public, anon, authenticated, service_role;

grant select on public.vw_admin_knowledge_categories to authenticated, service_role;
grant select on public.vw_admin_knowledge_articles_list to authenticated, service_role;
grant select on public.vw_admin_knowledge_article_detail to authenticated, service_role;

revoke all on function app_private.can_manage_knowledge_base() from public, anon, authenticated, service_role;
revoke all on function app_private.can_read_knowledge_article(uuid, public.knowledge_visibility, public.knowledge_article_status) from public, anon, authenticated, service_role;
revoke all on function app_private.capture_knowledge_revision(uuid, uuid, text) from public, anon, authenticated, service_role;

grant execute on function app_private.can_manage_knowledge_base() to authenticated, service_role;
grant execute on function app_private.can_read_knowledge_article(uuid, public.knowledge_visibility, public.knowledge_article_status) to authenticated, service_role;

revoke all on function public.rpc_admin_create_knowledge_category(text, text, text, public.knowledge_visibility, uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_create_knowledge_article_draft(text, text, text, text, uuid, public.knowledge_visibility, uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_update_knowledge_article_draft(uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) from public, anon;
revoke all on function public.rpc_admin_submit_knowledge_article_for_review(uuid) from public, anon;
revoke all on function public.rpc_admin_publish_knowledge_article(uuid) from public, anon;
revoke all on function public.rpc_admin_archive_knowledge_article(uuid) from public, anon;

grant execute on function public.rpc_admin_create_knowledge_category(text, text, text, public.knowledge_visibility, uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_create_knowledge_article_draft(text, text, text, text, uuid, public.knowledge_visibility, uuid, text, text) to authenticated, service_role;
grant execute on function public.rpc_admin_update_knowledge_article_draft(uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) to authenticated, service_role;
grant execute on function public.rpc_admin_submit_knowledge_article_for_review(uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_publish_knowledge_article(uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_archive_knowledge_article(uuid) to authenticated, service_role;

comment on view public.vw_admin_knowledge_categories is
  'Read model contratual das categorias de Knowledge Base para operação administrativa interna.';

comment on view public.vw_admin_knowledge_articles_list is
  'Read model contratual da lista administrativa de artigos de Knowledge Base.';

comment on view public.vw_admin_knowledge_article_detail is
  'Read model contratual do detalhe administrativo de artigo com revisões e trilha de origem.';
