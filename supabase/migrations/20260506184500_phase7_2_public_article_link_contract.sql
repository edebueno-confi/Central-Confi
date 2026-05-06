create or replace function app_private.default_public_knowledge_space_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ks.id
  from public.knowledge_spaces as ks
  join public.organizations as o
    on o.id = ks.organization_id
  where ks.slug = 'genius'
    and o.status = 'active'
  limit 1;
$$;

create or replace view app_private.vw_knowledge_articles_public_contract
as
  with default_space as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.status as knowledge_space_status,
      o.status as organization_status
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    where ks.slug = 'genius'
      and o.status = 'active'
    limit 1
  )
  select
    ka.id as article_id,
    case
      when ka.status = 'published'::public.knowledge_article_status
        and ka.visibility = 'public'::public.knowledge_visibility
        and ka.published_at is not null
        and coalesce(ka.knowledge_space_id, ds.knowledge_space_id) is not null
        and (
          ka.category_id is null
          or kc.visibility = 'public'::public.knowledge_visibility
        )
        and (
          ka.knowledge_space_id is null
          or (
            ks.status = 'active'
            and o.status = 'active'
          )
        )
      then ('/help/' || coalesce(ks.slug, ds.knowledge_space_slug) || '/articles/' || ka.slug)::text
      else null::text
    end as public_article_path
  from public.knowledge_articles as ka
  left join public.knowledge_categories as kc
    on kc.id = ka.category_id
  left join public.knowledge_spaces as ks
    on ks.id = ka.knowledge_space_id
  left join public.organizations as o
    on o.id = ks.organization_id
  left join default_space as ds
    on true;

create or replace function app_private.resolve_public_knowledge_article_path(p_article_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select contract.public_article_path
  from app_private.vw_knowledge_articles_public_contract as contract
  where contract.article_id = p_article_id;
$$;

create or replace function app_private.validate_ticket_knowledge_article_access(
  p_ticket_id uuid,
  p_article_id uuid,
  p_link_type public.ticket_knowledge_link_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_article public.knowledge_articles;
  v_space_owner_tenant_id uuid;
  v_public_article_path text;
begin
  v_ticket := app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id);
  v_article := app_private.resolve_ticket_knowledge_link_article(p_article_id);

  if not app_private.can_read_knowledge_article(
    v_article.tenant_id,
    v_article.visibility,
    v_article.status
  ) then
    raise exception 'ticket knowledge article access denied';
  end if;

  select ks.owner_tenant_id
  into v_space_owner_tenant_id
  from public.knowledge_spaces as ks
  where ks.id = v_article.knowledge_space_id;

  if p_link_type = 'sent_to_customer'::public.ticket_knowledge_link_type then
    if v_article.visibility <> 'public'::public.knowledge_visibility
       or v_article.status <> 'published'::public.knowledge_article_status
       or v_article.published_at is null then
      raise exception 'ticket knowledge link sent_to_customer requires public published article';
    end if;

    v_public_article_path := app_private.resolve_public_knowledge_article_path(p_article_id);

    if v_public_article_path is null then
      raise exception 'ticket knowledge article cannot be shared publicly';
    end if;

    return;
  end if;

  if v_article.visibility <> 'public'::public.knowledge_visibility
     and v_article.tenant_id is distinct from v_ticket.tenant_id
     and v_space_owner_tenant_id is distinct from v_ticket.tenant_id then
    raise exception 'ticket knowledge cross-tenant article denied';
  end if;
end;
$$;

create or replace view public.vw_support_ticket_knowledge_links
with (security_barrier = true)
as
select
  tkl.id as ticket_knowledge_link_id,
  tkl.ticket_id,
  tkl.link_type,
  tkl.note,
  tkl.created_at,
  tkl.created_by_user_id,
  creator.full_name as created_by_full_name,
  tkl.article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  ka.visibility as article_visibility,
  ka.status as article_status,
  pub.public_article_path is not null as is_customer_send_allowed,
  pub.public_article_path
from public.ticket_knowledge_links as tkl
join public.tickets as t
  on t.id = tkl.ticket_id
 and t.tenant_id = tkl.tenant_id
left join public.knowledge_articles as ka
  on ka.id = tkl.article_id
left join app_private.vw_knowledge_articles_public_contract as pub
  on pub.article_id = ka.id
left join public.profiles as creator
  on creator.id = tkl.created_by_user_id
where tkl.archived_at is null
  and app_private.can_access_support_workspace(tkl.tenant_id);

create or replace view public.vw_public_knowledge_navigation
  with (security_barrier = true)
as
  with recursive active_spaces as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.display_name as knowledge_space_display_name,
      ks.default_locale,
      coalesce(bs.brand_name, ks.display_name) as brand_name
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    left join public.brand_settings as bs
      on bs.knowledge_space_id = ks.id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  default_space as (
    select
      s.knowledge_space_id
    from active_spaces as s
    where s.knowledge_space_slug = 'genius'
    limit 1
  ),
  public_categories as (
    select
      kc.id,
      coalesce(kc.knowledge_space_id, ds.knowledge_space_id) as knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug,
      kc.description
    from public.knowledge_categories as kc
    left join default_space as ds
      on true
    join active_spaces as s
      on s.knowledge_space_id = coalesce(kc.knowledge_space_id, ds.knowledge_space_id)
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      coalesce(child.knowledge_space_id, parent.knowledge_space_id) as knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug,
      child.description
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and coalesce(child.knowledge_space_id, parent.knowledge_space_id) = parent.knowledge_space_id
  ),
  public_articles as (
    select
      ka.id,
      coalesce(ka.knowledge_space_id, ds.knowledge_space_id) as knowledge_space_id,
      ka.category_id,
      ka.title,
      ka.slug,
      ka.summary,
      ka.published_at,
      ka.updated_at
    from public.knowledge_articles as ka
    left join default_space as ds
      on true
    join active_spaces as s
      on s.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
    left join public_categories as pc
      on pc.id = ka.category_id
     and pc.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
    where ka.status = 'published'
      and ka.visibility = 'public'
      and (
        ka.category_id is null
        or pc.id is not null
      )
  ),
  category_closure as (
    select
      pc.id as ancestor_category_id,
      pc.id as descendant_category_id
    from public_categories as pc

    union all

    select
      cc.ancestor_category_id,
      child.id as descendant_category_id
    from category_closure as cc
    join public_categories as child
      on child.parent_category_id = cc.descendant_category_id
  ),
  category_direct_stats as (
    select
      pc.id as category_id,
      count(pa.id)::integer as article_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', pa.id,
            'slug', pa.slug,
            'title', pa.title,
            'summary', pa.summary,
            'published_at', pa.published_at
          )
          order by lower(pa.title)
        ) filter (where pa.id is not null),
        '[]'::jsonb
      ) as articles
    from public_categories as pc
    left join public_articles as pa
      on pa.category_id = pc.id
    group by pc.id
  ),
  category_subtree_stats as (
    select
      cc.ancestor_category_id as category_id,
      count(pa.id)::integer as subtree_article_count
    from category_closure as cc
    left join public_articles as pa
      on pa.category_id = cc.descendant_category_id
    group by cc.ancestor_category_id
  )
  select
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    pc.id as category_id,
    pc.parent_category_id,
    parent.slug as parent_category_slug,
    parent.name as parent_category_name,
    pc.name as category_name,
    pc.slug as category_slug,
    pc.description as category_description,
    coalesce(direct_stats.article_count, 0) as article_count,
    coalesce(subtree_stats.subtree_article_count, 0) as subtree_article_count,
    coalesce(direct_stats.articles, '[]'::jsonb) as articles
  from public_categories as pc
  join active_spaces as s
    on s.knowledge_space_id = pc.knowledge_space_id
  left join public_categories as parent
    on parent.id = pc.parent_category_id
  left join category_direct_stats as direct_stats
    on direct_stats.category_id = pc.id
  left join category_subtree_stats as subtree_stats
    on subtree_stats.category_id = pc.id
  where coalesce(subtree_stats.subtree_article_count, 0) > 0;

create or replace view public.vw_public_knowledge_articles_list
  with (security_barrier = true)
as
  with recursive active_spaces as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.display_name as knowledge_space_display_name,
      ks.default_locale,
      coalesce(bs.brand_name, ks.display_name) as brand_name
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    left join public.brand_settings as bs
      on bs.knowledge_space_id = ks.id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  default_space as (
    select
      s.knowledge_space_id
    from active_spaces as s
    where s.knowledge_space_slug = 'genius'
    limit 1
  ),
  public_categories as (
    select
      kc.id,
      coalesce(kc.knowledge_space_id, ds.knowledge_space_id) as knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug
    from public.knowledge_categories as kc
    left join default_space as ds
      on true
    join active_spaces as s
      on s.knowledge_space_id = coalesce(kc.knowledge_space_id, ds.knowledge_space_id)
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      coalesce(child.knowledge_space_id, parent.knowledge_space_id) as knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and coalesce(child.knowledge_space_id, parent.knowledge_space_id) = parent.knowledge_space_id
  )
  select
    ka.id,
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    ka.category_id,
    pc.slug as category_slug,
    pc.name as category_name,
    ka.title,
    ka.slug,
    ka.summary,
    ka.published_at,
    ka.updated_at
  from public.knowledge_articles as ka
  left join default_space as ds
    on true
  join active_spaces as s
    on s.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
  left join public_categories as pc
    on pc.id = ka.category_id
   and pc.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
  where ka.status = 'published'
    and ka.visibility = 'public'
    and (
      ka.category_id is null
      or pc.id is not null
    );

create or replace view public.vw_public_knowledge_article_detail
  with (security_barrier = true)
as
  with recursive active_spaces as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.display_name as knowledge_space_display_name,
      ks.default_locale,
      coalesce(bs.brand_name, ks.display_name) as brand_name
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    left join public.brand_settings as bs
      on bs.knowledge_space_id = ks.id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  default_space as (
    select
      s.knowledge_space_id
    from active_spaces as s
    where s.knowledge_space_slug = 'genius'
    limit 1
  ),
  public_categories as (
    select
      kc.id,
      coalesce(kc.knowledge_space_id, ds.knowledge_space_id) as knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug
    from public.knowledge_categories as kc
    left join default_space as ds
      on true
    join active_spaces as s
      on s.knowledge_space_id = coalesce(kc.knowledge_space_id, ds.knowledge_space_id)
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      coalesce(child.knowledge_space_id, parent.knowledge_space_id) as knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and coalesce(child.knowledge_space_id, parent.knowledge_space_id) = parent.knowledge_space_id
  )
  select
    ka.id,
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    ka.category_id,
    pc.slug as category_slug,
    pc.name as category_name,
    ka.title,
    ka.slug,
    ka.summary,
    ka.body_md,
    ka.published_at,
    ka.updated_at
  from public.knowledge_articles as ka
  left join default_space as ds
    on true
  join active_spaces as s
    on s.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
  left join public_categories as pc
    on pc.id = ka.category_id
   and pc.knowledge_space_id = coalesce(ka.knowledge_space_id, ds.knowledge_space_id)
  where ka.status = 'published'
    and ka.visibility = 'public'
    and (
      ka.category_id is null
      or pc.id is not null
    );

create or replace view public.vw_support_knowledge_article_picker
with (security_barrier = true)
as
select
  t.id as ticket_id,
  ka.id as article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  ka.summary as article_summary,
  kc.name as category_name,
  ka.visibility as article_visibility,
  ka.status as article_status,
  pub.public_article_path is not null as is_customer_send_allowed,
  pub.public_article_path
from public.tickets as t
join public.knowledge_articles as ka
  on ka.archived_at is null
left join app_private.vw_knowledge_articles_public_contract as pub
  on pub.article_id = ka.id
left join public.knowledge_categories as kc
  on kc.id = ka.category_id
where app_private.can_access_support_workspace(t.tenant_id)
  and (
    pub.public_article_path is not null
    or (
      (
        ka.tenant_id = t.tenant_id
        or exists (
          select 1
          from public.knowledge_spaces as ks
          where ks.id = ka.knowledge_space_id
            and ks.owner_tenant_id = t.tenant_id
        )
      )
      and app_private.can_read_knowledge_article(
        ka.tenant_id,
        ka.visibility,
        ka.status
      )
    )
  );

create or replace view public.vw_customer_portal_ticket_knowledge_links
with (security_barrier = true)
as
select
  tkl.ticket_id,
  tkl.article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  tkl.created_at as sent_at,
  pub.public_article_path
from public.ticket_knowledge_links as tkl
join public.knowledge_articles as ka
  on ka.id = tkl.article_id
join app_private.vw_knowledge_articles_public_contract as pub
  on pub.article_id = ka.id
where tkl.archived_at is null
  and tkl.link_type = 'sent_to_customer'::public.ticket_knowledge_link_type
  and pub.public_article_path is not null;

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
  pub.public_article_path
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
  coalesce(sources_json.sources, '[]'::jsonb) as sources,
  pub.public_article_path
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
  left join public.profiles as creator
    on creator.id = ka.created_by_user_id
  left join public.profiles as updater
    on updater.id = ka.updated_by_user_id;

revoke all on function app_private.resolve_public_knowledge_article_path(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.default_public_knowledge_space_id() from public, anon, authenticated, service_role;
