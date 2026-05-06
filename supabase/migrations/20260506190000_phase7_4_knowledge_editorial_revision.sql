create table public.knowledge_article_editorial_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  knowledge_space_id uuid not null references public.knowledge_spaces (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  category_id uuid references public.knowledge_categories (id) on delete set null,
  visibility public.knowledge_visibility not null default 'internal',
  title text not null,
  slug text not null,
  summary text,
  body_md text not null default '',
  source_path text,
  source_hash text,
  based_on_revision_number integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_article_editorial_drafts_article_key
    unique (article_id),
  constraint knowledge_article_editorial_drafts_based_on_revision_positive_check
    check (based_on_revision_number > 0),
  constraint knowledge_article_editorial_drafts_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint knowledge_article_editorial_drafts_slug_not_blank_check
    check (nullif(btrim(slug), '') is not null),
  constraint knowledge_article_editorial_drafts_body_md_not_blank_check
    check (body_md is not null),
  constraint knowledge_article_editorial_drafts_source_pair_check
    check (
      (source_path is null and source_hash is null)
      or (source_path is not null and source_hash is not null)
    )
);

create index knowledge_article_editorial_drafts_space_idx
  on public.knowledge_article_editorial_drafts (knowledge_space_id, updated_at desc);

create trigger knowledge_article_editorial_drafts_touch_updated_at
before update on public.knowledge_article_editorial_drafts
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_article_editorial_drafts_audit_row_change
after insert or update or delete on public.knowledge_article_editorial_drafts
for each row
execute function audit.capture_row_change();

alter table public.knowledge_article_editorial_drafts enable row level security;

create policy knowledge_article_editorial_drafts_select_managed
on public.knowledge_article_editorial_drafts
for select
to authenticated
using (app_private.can_manage_knowledge_base());

create policy knowledge_article_editorial_drafts_write_managed
on public.knowledge_article_editorial_drafts
for all
to authenticated
using (app_private.can_manage_knowledge_base())
with check (app_private.can_manage_knowledge_base());

revoke select, insert, update, delete on public.knowledge_article_editorial_drafts from authenticated;

create or replace function public.rpc_admin_begin_knowledge_article_editorial_revision_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid
)
returns public.knowledge_article_editorial_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_article public.knowledge_articles;
  v_existing_draft public.knowledge_article_editorial_drafts;
  v_result public.knowledge_article_editorial_drafts;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_begin_knowledge_article_editorial_revision_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_article.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
  end if;

  if v_article.status <> 'published' then
    raise exception 'only published knowledge articles support editorial revision';
  end if;

  select *
  into v_existing_draft
  from public.knowledge_article_editorial_drafts as draft
  where draft.article_id = p_article_id;

  if v_existing_draft.id is not null then
    return v_existing_draft;
  end if;

  insert into public.knowledge_article_editorial_drafts (
    article_id,
    knowledge_space_id,
    tenant_id,
    category_id,
    visibility,
    title,
    slug,
    summary,
    body_md,
    source_path,
    source_hash,
    based_on_revision_number,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    v_article.id,
    v_article.knowledge_space_id,
    v_article.tenant_id,
    v_article.category_id,
    v_article.visibility,
    v_article.title,
    v_article.slug,
    v_article.summary,
    v_article.body_md,
    v_article.source_path,
    v_article.source_hash,
    v_article.current_revision_number,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_admin_update_knowledge_article_editorial_revision_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid,
  p_title text,
  p_slug text,
  p_summary text default null,
  p_body_md text default ''::text,
  p_category_id uuid default null,
  p_visibility public.knowledge_visibility default 'internal',
  p_source_path text default null,
  p_source_hash text default null
)
returns public.knowledge_article_editorial_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_article public.knowledge_articles;
  v_category public.knowledge_categories;
  v_result public.knowledge_article_editorial_drafts;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_update_knowledge_article_editorial_revision_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_article.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
  end if;

  if v_article.status <> 'published' then
    raise exception 'only published knowledge articles support editorial revision';
  end if;

  if lower(btrim(p_slug)) <> v_article.slug then
    raise exception 'published article slug is immutable during editorial revision';
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

    if v_category.tenant_id is distinct from v_article.tenant_id then
      raise exception 'knowledge article tenant mismatch';
    end if;
  end if;

  update public.knowledge_article_editorial_drafts
  set
    category_id = p_category_id,
    visibility = p_visibility,
    title = btrim(p_title),
    slug = v_article.slug,
    summary = nullif(btrim(p_summary), ''),
    body_md = btrim(p_body_md),
    source_path = nullif(btrim(p_source_path), ''),
    source_hash = nullif(btrim(p_source_hash), ''),
    updated_by_user_id = v_actor_user_id
  where article_id = p_article_id
    and knowledge_space_id = p_knowledge_space_id
  returning *
  into v_result;

  if v_result.id is null then
    raise exception 'knowledge article editorial revision not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.rpc_admin_publish_knowledge_article_editorial_revision_v2(
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
  v_article public.knowledge_articles;
  v_draft public.knowledge_article_editorial_drafts;
  v_revision public.knowledge_article_revisions;
  v_result public.knowledge_articles;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_publish_knowledge_article_editorial_revision_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_article.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
  end if;

  if v_article.status <> 'published' then
    raise exception 'only published knowledge articles support editorial revision';
  end if;

  select *
  into v_draft
  from public.knowledge_article_editorial_drafts as draft
  where draft.article_id = p_article_id
    and draft.knowledge_space_id = p_knowledge_space_id;

  if v_draft.id is null then
    raise exception 'knowledge article editorial revision not found';
  end if;

  update public.knowledge_articles
  set
    category_id = v_draft.category_id,
    visibility = v_draft.visibility,
    title = v_draft.title,
    slug = v_draft.slug,
    summary = v_draft.summary,
    body_md = v_draft.body_md,
    source_path = v_draft.source_path,
    source_hash = v_draft.source_hash,
    current_revision_number = current_revision_number + 1,
    published_at = timezone('utc', now()),
    updated_by_user_id = v_actor_user_id
  where id = p_article_id
  returning *
  into v_result;

  v_revision := app_private.capture_knowledge_revision(
    v_result.id,
    v_actor_user_id,
    'published editorial revision via v2'
  );

  if v_result.source_path is not null and v_result.source_hash is not null then
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
      v_result.id,
      v_revision.id,
      'legacy_octadesk',
      v_result.source_path,
      v_result.source_hash,
      v_result.title,
      jsonb_build_object(
        'updated_status', v_result.status,
        'updated_visibility', v_result.visibility,
        'knowledge_space_id', v_result.knowledge_space_id,
        'editorial_revision', true
      ),
      v_actor_user_id,
      v_actor_user_id
    )
    on conflict (article_id, source_path, source_hash) do nothing;
  end if;

  delete from public.knowledge_article_editorial_drafts
  where id = v_draft.id;

  return v_result;
end;
$$;

create or replace function public.rpc_admin_discard_knowledge_article_editorial_revision_v2(
  p_article_id uuid,
  p_knowledge_space_id uuid
)
returns public.knowledge_article_editorial_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.knowledge_articles;
  v_result public.knowledge_article_editorial_drafts;
begin
  perform app_private.require_active_actor();

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_discard_knowledge_article_editorial_revision_v2 denied';
  end if;

  if p_knowledge_space_id is null then
    raise exception 'knowledge space is required';
  end if;

  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  if v_article.knowledge_space_id is distinct from p_knowledge_space_id then
    raise exception 'knowledge article space mismatch';
  end if;

  delete from public.knowledge_article_editorial_drafts
  where article_id = p_article_id
    and knowledge_space_id = p_knowledge_space_id
  returning *
  into v_result;

  if v_result.id is null then
    raise exception 'knowledge article editorial revision not found';
  end if;

  return v_result;
end;
$$;

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
    updater.full_name as updated_by_full_name,
    pub.public_article_path,
    coalesce(editorial_draft.article_id is not null, false) as has_editorial_draft,
    editorial_draft.updated_at as editorial_draft_updated_at
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
  left join app_private.vw_knowledge_articles_public_contract as pub
    on pub.article_id = ka.id
  left join public.knowledge_article_editorial_drafts as editorial_draft
    on editorial_draft.article_id = ka.id
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
  ),
  editorial_drafts_json as (
    select
      draft.article_id,
      jsonb_build_object(
        'id', draft.id,
        'article_id', draft.article_id,
        'knowledge_space_id', draft.knowledge_space_id,
        'tenant_id', draft.tenant_id,
        'category_id', draft.category_id,
        'visibility', draft.visibility,
        'title', draft.title,
        'slug', draft.slug,
        'summary', draft.summary,
        'body_md', draft.body_md,
        'source_path', draft.source_path,
        'source_hash', draft.source_hash,
        'based_on_revision_number', draft.based_on_revision_number,
        'created_at', draft.created_at,
        'updated_at', draft.updated_at,
        'created_by_user_id', draft.created_by_user_id,
        'updated_by_user_id', draft.updated_by_user_id,
        'created_by_full_name', creator.full_name,
        'updated_by_full_name', updater.full_name
      ) as editorial_draft
    from public.knowledge_article_editorial_drafts as draft
    left join public.profiles as creator
      on creator.id = draft.created_by_user_id
    left join public.profiles as updater
      on updater.id = draft.updated_by_user_id
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
    coalesce(sources_json.sources, '[]'::jsonb) as sources,
    pub.public_article_path,
    editorial_drafts_json.editorial_draft
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
  left join app_private.vw_knowledge_articles_public_contract as pub
    on pub.article_id = ka.id
  left join editorial_drafts_json
    on editorial_drafts_json.article_id = ka.id
  left join public.profiles as creator
    on creator.id = ka.created_by_user_id
  left join public.profiles as updater
    on updater.id = ka.updated_by_user_id;

revoke all on function public.rpc_admin_begin_knowledge_article_editorial_revision_v2(uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_update_knowledge_article_editorial_revision_v2(uuid, uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) from public, anon;
revoke all on function public.rpc_admin_publish_knowledge_article_editorial_revision_v2(uuid, uuid) from public, anon;
revoke all on function public.rpc_admin_discard_knowledge_article_editorial_revision_v2(uuid, uuid) from public, anon;

grant execute on function public.rpc_admin_begin_knowledge_article_editorial_revision_v2(uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_update_knowledge_article_editorial_revision_v2(uuid, uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) to authenticated, service_role;
grant execute on function public.rpc_admin_publish_knowledge_article_editorial_revision_v2(uuid, uuid) to authenticated, service_role;
grant execute on function public.rpc_admin_discard_knowledge_article_editorial_revision_v2(uuid, uuid) to authenticated, service_role;

comment on table public.knowledge_article_editorial_drafts is
  'Draft editorial privado para revisar artigos publicados sem alterar a versao publica atual.';

comment on function public.rpc_admin_begin_knowledge_article_editorial_revision_v2(uuid, uuid) is
  'Inicia ou reaproveita um draft editorial privado para um artigo ja publicado.';

comment on function public.rpc_admin_update_knowledge_article_editorial_revision_v2(uuid, uuid, text, text, text, text, uuid, public.knowledge_visibility, text, text) is
  'Atualiza o draft editorial privado de um artigo publicado.';

comment on function public.rpc_admin_publish_knowledge_article_editorial_revision_v2(uuid, uuid) is
  'Aplica o draft editorial privado na versao publica do artigo, preservando o mesmo public_article_path.';

comment on function public.rpc_admin_discard_knowledge_article_editorial_revision_v2(uuid, uuid) is
  'Descarta o draft editorial privado de um artigo publicado.';
