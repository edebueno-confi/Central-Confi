create or replace function app_private.ensure_default_genius_space()
returns public.knowledge_spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization public.organizations;
  v_space public.knowledge_spaces;
begin
  select *
  into v_organization
  from public.organizations as o
  where o.slug = 'genius-group'
  limit 1;

  if v_organization.id is null then
    insert into public.organizations (
      slug,
      legal_name,
      display_name,
      status
    )
    values (
      'genius-group',
      'Genius Group',
      'Genius Group',
      'active'
    )
    returning *
    into v_organization;
  end if;

  select *
  into v_space
  from public.knowledge_spaces as ks
  where ks.slug = 'genius'
  limit 1;

  if v_space.id is null then
    insert into public.knowledge_spaces (
      organization_id,
      owner_tenant_id,
      slug,
      display_name,
      status,
      is_primary,
      default_locale
    )
    values (
      v_organization.id,
      null,
      'genius',
      'Genius Returns',
      'draft',
      true,
      'pt-BR'
    )
    returning *
    into v_space;
  end if;

  update public.knowledge_categories
  set knowledge_space_id = v_space.id
  where knowledge_space_id is null;

  update public.knowledge_articles
  set knowledge_space_id = v_space.id
  where knowledge_space_id is null;

  select *
  into v_space
  from public.knowledge_spaces as ks
  where ks.id = v_space.id;

  return v_space;
end;
$$;

do $block$
begin
  perform app_private.ensure_default_genius_space();
end;
$block$;

create or replace function public.rpc_admin_create_knowledge_category_v2(
  p_name text,
  p_slug text,
  p_description text default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_parent_category_id uuid default null,
  p_knowledge_space_id uuid default null,
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
  v_space public.knowledge_spaces;
  v_slug text;
begin
  v_actor_user_id := app_private.require_active_actor();
  v_slug := lower(btrim(p_slug));

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_create_knowledge_category_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_space
  from public.knowledge_spaces as ks
  where ks.id = p_knowledge_space_id;

  if v_space.id is null then
    raise exception 'knowledge space not found';
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

    if v_parent.knowledge_space_id is distinct from p_knowledge_space_id then
      raise exception 'knowledge category space mismatch';
    end if;

    if v_parent.tenant_id is distinct from p_tenant_id then
      raise exception 'knowledge category tenant mismatch';
    end if;
  end if;

  select *
  into v_category
  from public.knowledge_categories as kc
  where kc.knowledge_space_id = p_knowledge_space_id
    and kc.parent_category_id is not distinct from p_parent_category_id
    and kc.slug = v_slug;

  if v_category.id is null then
    insert into public.knowledge_categories (
      tenant_id,
      knowledge_space_id,
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
      p_knowledge_space_id,
      p_parent_category_id,
      p_visibility,
      btrim(p_name),
      v_slug,
      nullif(btrim(p_description), ''),
      v_actor_user_id,
      v_actor_user_id
    )
    returning *
    into v_category;
  else
    update public.knowledge_categories
    set
      tenant_id = p_tenant_id,
      visibility = p_visibility,
      name = btrim(p_name),
      description = nullif(btrim(p_description), ''),
      updated_by_user_id = v_actor_user_id
    where id = v_category.id
    returning *
    into v_category;
  end if;

  return v_category;
end;
$$;

create or replace function public.rpc_admin_create_knowledge_article_draft_v2(
  p_title text,
  p_slug text,
  p_summary text default null,
  p_body_md text default '',
  p_category_id uuid default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_knowledge_space_id uuid default null,
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
    raise exception 'rpc_admin_create_knowledge_article_draft_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  if not exists (
    select 1
    from public.knowledge_spaces as ks
    where ks.id = p_knowledge_space_id
  ) then
    raise exception 'knowledge space not found';
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

    if v_category.knowledge_space_id is distinct from p_knowledge_space_id then
      raise exception 'knowledge article space mismatch';
    end if;

    if v_category.tenant_id is distinct from p_tenant_id then
      raise exception 'knowledge article tenant mismatch';
    end if;
  end if;

  insert into public.knowledge_articles (
    tenant_id,
    knowledge_space_id,
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
    p_knowledge_space_id,
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
    'draft created via v2'
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
        'initial_visibility', v_article.visibility,
        'knowledge_space_id', v_article.knowledge_space_id
      ),
      v_actor_user_id,
      v_actor_user_id
    )
    on conflict (article_id, source_path, source_hash) do nothing;
  end if;

  return v_article;
end;
$$;

create or replace function public.rpc_admin_update_knowledge_article_draft_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid,
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
    raise exception 'rpc_admin_update_knowledge_article_draft_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
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

    if v_category.knowledge_space_id is distinct from p_knowledge_space_id then
      raise exception 'knowledge article space mismatch';
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
    'draft updated via v2'
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
        'updated_visibility', v_article.visibility,
        'knowledge_space_id', v_article.knowledge_space_id
      ),
      v_actor_user_id,
      v_actor_user_id
    )
    on conflict (article_id, source_path, source_hash) do nothing;
  end if;

  return v_article;
end;
$$;

create or replace function public.rpc_admin_submit_knowledge_article_for_review_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid
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
    raise exception 'rpc_admin_submit_knowledge_article_for_review_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
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
    'submitted for review via v2'
  );

  return v_article;
end;
$$;

create or replace function public.rpc_admin_publish_knowledge_article_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid
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
    raise exception 'rpc_admin_publish_knowledge_article_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
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
    'published via v2'
  );

  return v_article;
end;
$$;

create or replace function public.rpc_admin_archive_knowledge_article_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid
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
    raise exception 'rpc_admin_archive_knowledge_article_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_existing
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_existing.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
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
    'archived via v2'
  );

  return v_article;
end;
$$;

create or replace view public.vw_admin_knowledge_categories_v2
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
    where ka.knowledge_space_id is not null
    group by ka.category_id
  )
  select
    kc.id,
    kc.knowledge_space_id,
    ks.slug as knowledge_space_slug,
    ks.display_name as knowledge_space_display_name,
    ks.status as knowledge_space_status,
    o.id as organization_id,
    o.slug as organization_slug,
    o.display_name as organization_display_name,
    ks.owner_tenant_id,
    owner_tenant.slug as owner_tenant_slug,
    owner_tenant.display_name as owner_tenant_display_name,
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
  join public.knowledge_spaces as ks
    on ks.id = kc.knowledge_space_id
  join public.organizations as o
    on o.id = ks.organization_id
  left join public.tenants as owner_tenant
    on owner_tenant.id = ks.owner_tenant_id
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

create or replace view public.vw_admin_knowledge_articles_list_v2
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
    ka.knowledge_space_id,
    ks.slug as knowledge_space_slug,
    ks.display_name as knowledge_space_display_name,
    ks.status as knowledge_space_status,
    o.id as organization_id,
    o.slug as organization_slug,
    o.display_name as organization_display_name,
    ks.owner_tenant_id,
    owner_tenant.slug as owner_tenant_slug,
    owner_tenant.display_name as owner_tenant_display_name,
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
  join public.knowledge_spaces as ks
    on ks.id = ka.knowledge_space_id
  join public.organizations as o
    on o.id = ks.organization_id
  left join public.tenants as owner_tenant
    on owner_tenant.id = ks.owner_tenant_id
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

create or replace view public.vw_admin_knowledge_article_detail_v2
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
    ka.knowledge_space_id,
    ks.slug as knowledge_space_slug,
    ks.display_name as knowledge_space_display_name,
    ks.status as knowledge_space_status,
    o.id as organization_id,
    o.slug as organization_slug,
    o.display_name as organization_display_name,
    ks.owner_tenant_id,
    owner_tenant.slug as owner_tenant_slug,
    owner_tenant.display_name as owner_tenant_display_name,
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
  join public.knowledge_spaces as ks
    on ks.id = ka.knowledge_space_id
  join public.organizations as o
    on o.id = ks.organization_id
  left join public.tenants as owner_tenant
    on owner_tenant.id = ks.owner_tenant_id
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

revoke all on function app_private.ensure_default_genius_space() from public, anon, authenticated, service_role;

revoke all on function public.rpc_admin_create_knowledge_category_v2(text, text, text, public.knowledge_visibility, uuid, uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_create_knowledge_article_draft_v2(text, text, text, text, uuid, public.knowledge_visibility, uuid, uuid, text, text) from public, anon;
revoke all on function public.rpc_admin_update_knowledge_article_draft_v2(uuid, uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) from public, anon;
revoke all on function public.rpc_admin_submit_knowledge_article_for_review_v2(uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_publish_knowledge_article_v2(uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_archive_knowledge_article_v2(uuid, uuid) from public, anon;

grant execute on function public.rpc_admin_create_knowledge_category_v2(text, text, text, public.knowledge_visibility, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_create_knowledge_article_draft_v2(text, text, text, text, uuid, public.knowledge_visibility, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.rpc_admin_update_knowledge_article_draft_v2(uuid, uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) to authenticated, service_role;
grant execute on function public.rpc_admin_submit_knowledge_article_for_review_v2(uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_publish_knowledge_article_v2(uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_archive_knowledge_article_v2(uuid, uuid) to authenticated, service_role;

revoke all on public.vw_admin_knowledge_categories_v2 from public, anon, authenticated, service_role;
revoke all on public.vw_admin_knowledge_articles_list_v2 from public, anon, authenticated, service_role;
revoke all on public.vw_admin_knowledge_article_detail_v2 from public, anon, authenticated, service_role;

grant select on public.vw_admin_knowledge_categories_v2 to authenticated, service_role;
grant select on public.vw_admin_knowledge_articles_list_v2 to authenticated, service_role;
grant select on public.vw_admin_knowledge_article_detail_v2 to authenticated, service_role;

comment on view public.vw_admin_knowledge_categories_v2 is
  'Read model contratual space-aware das categorias administrativas de Knowledge Base.';

comment on view public.vw_admin_knowledge_articles_list_v2 is
  'Read model contratual space-aware da lista administrativa de artigos de Knowledge Base.';

comment on view public.vw_admin_knowledge_article_detail_v2 is
  'Read model contratual space-aware do detalhe administrativo de artigos de Knowledge Base.';
