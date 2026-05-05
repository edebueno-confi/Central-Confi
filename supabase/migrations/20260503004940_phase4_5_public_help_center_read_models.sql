revoke select, insert, update, delete on public.organizations from public, anon;
revoke select, insert, update, delete on public.knowledge_spaces from public, anon;
revoke select, insert, update, delete on public.knowledge_space_domains from public, anon;
revoke select, insert, update, delete on public.brand_settings from public, anon;
revoke select, insert, update, delete on public.knowledge_categories from public, anon;
revoke select, insert, update, delete on public.knowledge_articles from public, anon;
revoke select, insert, update, delete on public.knowledge_article_revisions from public, anon;
revoke select, insert, update, delete on public.knowledge_article_sources from public, anon;

create or replace view public.vw_public_knowledge_space_resolver
  with (security_barrier = true)
as
  with active_spaces as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.display_name as knowledge_space_display_name,
      ks.default_locale,
      o.slug as organization_slug,
      o.display_name as organization_display_name,
      coalesce(bs.brand_name, ks.display_name) as brand_name
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    left join public.brand_settings as bs
      on bs.knowledge_space_id = ks.id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  active_domains as (
    select
      ksd.knowledge_space_id,
      ksd.host,
      ksd.path_prefix,
      ksd.is_primary
    from public.knowledge_space_domains as ksd
    where ksd.status = 'active'
  )
  select
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    s.organization_slug,
    s.organization_display_name,
    'space_slug'::text as route_kind,
    null::text as route_host,
    ('/help/' || s.knowledge_space_slug)::text as route_path_prefix,
    not exists (
      select 1
      from active_domains as ad
      where ad.knowledge_space_id = s.knowledge_space_id
    ) as is_canonical
  from active_spaces as s

  union all

  select
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    s.organization_slug,
    s.organization_display_name,
    'domain'::text as route_kind,
    ad.host as route_host,
    ad.path_prefix as route_path_prefix,
    ad.is_primary as is_canonical
  from active_spaces as s
  join active_domains as ad
    on ad.knowledge_space_id = s.knowledge_space_id;

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
  public_categories as (
    select
      kc.id,
      kc.knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug,
      kc.description
    from public.knowledge_categories as kc
    join active_spaces as s
      on s.knowledge_space_id = kc.knowledge_space_id
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      child.knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug,
      child.description
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and child.knowledge_space_id = parent.knowledge_space_id
  ),
  public_articles as (
    select
      ka.id,
      ka.knowledge_space_id,
      ka.category_id,
      ka.title,
      ka.slug,
      ka.summary,
      ka.published_at,
      ka.updated_at
    from public.knowledge_articles as ka
    join active_spaces as s
      on s.knowledge_space_id = ka.knowledge_space_id
    left join public_categories as pc
      on pc.id = ka.category_id
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
  public_categories as (
    select
      kc.id,
      kc.knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug
    from public.knowledge_categories as kc
    join active_spaces as s
      on s.knowledge_space_id = kc.knowledge_space_id
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      child.knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and child.knowledge_space_id = parent.knowledge_space_id
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
  join active_spaces as s
    on s.knowledge_space_id = ka.knowledge_space_id
  left join public_categories as pc
    on pc.id = ka.category_id
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
  public_categories as (
    select
      kc.id,
      kc.knowledge_space_id,
      kc.parent_category_id,
      kc.name,
      kc.slug
    from public.knowledge_categories as kc
    join active_spaces as s
      on s.knowledge_space_id = kc.knowledge_space_id
    where kc.visibility = 'public'
      and kc.parent_category_id is null

    union all

    select
      child.id,
      child.knowledge_space_id,
      child.parent_category_id,
      child.name,
      child.slug
    from public.knowledge_categories as child
    join public_categories as parent
      on parent.id = child.parent_category_id
    where child.visibility = 'public'
      and child.knowledge_space_id = parent.knowledge_space_id
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
  join active_spaces as s
    on s.knowledge_space_id = ka.knowledge_space_id
  left join public_categories as pc
    on pc.id = ka.category_id
  where ka.status = 'published'
    and ka.visibility = 'public'
    and (
      ka.category_id is null
      or pc.id is not null
    );

revoke all on public.vw_public_knowledge_space_resolver from public, anon, authenticated, service_role;
revoke all on public.vw_public_knowledge_navigation from public, anon, authenticated, service_role;
revoke all on public.vw_public_knowledge_articles_list from public, anon, authenticated, service_role;
revoke all on public.vw_public_knowledge_article_detail from public, anon, authenticated, service_role;

grant select on public.vw_public_knowledge_space_resolver to anon, authenticated, service_role;
grant select on public.vw_public_knowledge_navigation to anon, authenticated, service_role;
grant select on public.vw_public_knowledge_articles_list to anon, authenticated, service_role;
grant select on public.vw_public_knowledge_article_detail to anon, authenticated, service_role;

comment on view public.vw_public_knowledge_space_resolver is
  'Read model contratual publico para resolver knowledge spaces ativos por slug e por dominio futuro.';

comment on view public.vw_public_knowledge_navigation is
  'Read model contratual publico da navegacao da Knowledge Base, expondo apenas categorias e artigos publicos publicados.';

comment on view public.vw_public_knowledge_articles_list is
  'Read model contratual publico da lista de artigos publicados e publicos da Knowledge Base.';

comment on view public.vw_public_knowledge_article_detail is
  'Read model contratual publico do detalhe de artigo publicado e publico da Knowledge Base, sempre em Markdown.';
