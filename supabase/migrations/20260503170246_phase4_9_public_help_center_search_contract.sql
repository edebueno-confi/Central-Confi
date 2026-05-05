create index if not exists knowledge_articles_public_search_idx
  on public.knowledge_articles
  using gin (
    to_tsvector(
      'portuguese',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body_md, '')
    )
  )
  where knowledge_space_id is not null
    and status = 'published'
    and visibility = 'public';

create or replace function public.rpc_public_search_knowledge_articles(
  p_space_slug text,
  p_query text,
  p_limit integer default 10
)
returns table (
  article_id uuid,
  title text,
  slug text,
  summary text,
  category_name text,
  rank_score real,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with normalized_input as (
    select
      nullif(btrim(p_space_slug), '') as space_slug,
      nullif(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'), '') as search_query,
      greatest(1, least(coalesce(p_limit, 10), 25)) as result_limit
  ),
  active_space as (
    select
      ks.id as knowledge_space_id
    from normalized_input as input
    join public.knowledge_spaces as ks
      on ks.slug = input.space_slug
    join public.organizations as o
      on o.id = ks.organization_id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  public_categories as (
    select
      kc.id,
      kc.knowledge_space_id,
      kc.name
    from public.knowledge_categories as kc
    join active_space as s
      on s.knowledge_space_id = kc.knowledge_space_id
    where kc.visibility = 'public'
  ),
  searchable_articles as (
    select
      ka.id as article_id,
      ka.title,
      ka.slug,
      ka.summary,
      pc.name as category_name,
      ka.updated_at,
      to_tsvector(
        'portuguese',
        coalesce(ka.title, '') || ' ' || coalesce(ka.summary, '') || ' ' || coalesce(ka.body_md, '')
      ) as search_document
    from public.knowledge_articles as ka
    join active_space as s
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
  safe_query as (
    select
      websearch_to_tsquery('portuguese', input.search_query) as ts_query,
      input.result_limit
    from normalized_input as input
    where input.search_query is not null
      and char_length(input.search_query) >= 2
  )
  select
    article.article_id,
    article.title,
    article.slug,
    article.summary,
    article.category_name,
    ts_rank(article.search_document, query.ts_query)::real as rank_score,
    article.updated_at
  from safe_query as query
  join searchable_articles as article
    on article.search_document @@ query.ts_query
  order by
    rank_score desc,
    article.updated_at desc,
    lower(article.title) asc
  limit (select result_limit from safe_query limit 1);
$$;

revoke all on function public.rpc_public_search_knowledge_articles(text, text, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.rpc_public_search_knowledge_articles(text, text, integer)
  to anon, authenticated, service_role;

comment on function public.rpc_public_search_knowledge_articles(text, text, integer) is
  'RPC publica de busca textual simples da Knowledge Base, expondo apenas artigos published/public em knowledge_spaces ativos.';
