create extension if not exists pgtap with schema extensions;

begin;

create or replace function pg_temp.safe_bigint(p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_result bigint;
begin
  execute p_sql into v_result;
  return coalesce(v_result, 0);
exception
  when undefined_table or undefined_column or undefined_function then
    return -1;
  when insufficient_privilege then
    return -2;
end;
$$;

create or replace function pg_temp.safe_text(p_sql text)
returns text
language plpgsql
as $$
declare
  v_result text;
begin
  execute p_sql into v_result;
  return coalesce(v_result, '<null>');
exception
  when undefined_table or undefined_column or undefined_function then
    return '<missing>';
  when insufficient_privilege then
    return '<denied>';
end;
$$;

select plan(21);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'anon'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_public_knowledge_space_resolver',
        'vw_public_knowledge_navigation',
        'vw_public_knowledge_articles_list',
        'vw_public_knowledge_article_detail'
      )
  ),
  4,
  'anon possui SELECT nas quatro views publicas aprovadas da Knowledge Base'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_public_knowledge_space_resolver',
        'vw_public_knowledge_navigation',
        'vw_public_knowledge_articles_list',
        'vw_public_knowledge_article_detail'
      )
  ),
  4,
  'authenticated tambem possui SELECT nas views publicas aprovadas'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_public_knowledge_space_resolver',
        'vw_public_knowledge_navigation',
        'vw_public_knowledge_articles_list',
        'vw_public_knowledge_article_detail'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  4,
  'views publicas usam security_barrier como hardening explicito'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_public_knowledge_space_resolver',
        'vw_public_knowledge_navigation',
        'vw_public_knowledge_articles_list',
        'vw_public_knowledge_article_detail'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_invoker=true'
      )
  ),
  0,
  'views publicas seguem a estrategia auditada sem security_invoker'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'anon'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'organizations',
        'knowledge_spaces',
        'knowledge_space_domains',
        'brand_settings',
        'knowledge_categories',
        'knowledge_articles',
        'knowledge_article_revisions',
        'knowledge_article_sources'
      )
  ),
  0,
  'anon continua sem SELECT direto nas tabelas base da camada publica da Knowledge Base'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns as cols
    where cols.table_schema = 'public'
      and cols.table_name in (
        'vw_public_knowledge_space_resolver',
        'vw_public_knowledge_navigation',
        'vw_public_knowledge_articles_list',
        'vw_public_knowledge_article_detail'
      )
      and cols.column_name in (
        'source_path',
        'source_hash',
        'created_by_full_name',
        'updated_by_full_name',
        'tenant_id'
      )
  ),
  0,
  'views publicas nao expoem trilha sensivel nem contexto interno de tenant'
);

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

insert into public.brand_settings (
  knowledge_space_id,
  brand_name,
  theme_tokens,
  seo_defaults,
  support_contacts
)
values (
  (select id from public.knowledge_spaces where slug = 'genius'),
  'Genius Returns',
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
)
on conflict (knowledge_space_id) do update
set brand_name = excluded.brand_name;

insert into public.knowledge_space_domains (
  id,
  knowledge_space_id,
  host,
  path_prefix,
  status,
  is_primary
)
values (
  '10000000-0000-4000-8000-000000000001',
  (select id from public.knowledge_spaces where slug = 'genius'),
  'help.genius.local',
  '/',
  'active',
  true
);

insert into public.knowledge_spaces (
  id,
  organization_id,
  slug,
  display_name,
  status,
  default_locale
)
values (
  '20000000-0000-4000-8000-000000000001',
  (select id from public.organizations where slug = 'genius-group'),
  'inactive-space',
  'Inactive Space',
  'draft',
  'pt-BR'
);

insert into public.knowledge_categories (
  id,
  knowledge_space_id,
  visibility,
  name,
  slug,
  description
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'public',
    'Configuracoes',
    'configuracoes',
    'Categoria publica raiz'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'public',
    'Integracoes',
    'integracoes',
    'Categoria publica filha'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'internal',
    'Runbooks internos',
    'runbooks-internos',
    'Categoria restrita ao time interno'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'public',
    'Inativa',
    'inativa',
    'Categoria de space inativo'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    null,
    'public',
    'Legado publico',
    'legado-publico',
    'Categoria publica legada sem knowledge_space_id explicito'
  );

update public.knowledge_categories
set parent_category_id = '30000000-0000-4000-8000-000000000001'
where id = '30000000-0000-4000-8000-000000000002';

insert into public.knowledge_articles (
  id,
  knowledge_space_id,
  category_id,
  visibility,
  status,
  title,
  slug,
  summary,
  body_md,
  current_revision_number,
  published_at,
  updated_at
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000001',
    'public',
    'published',
    'Configurar portal B2B',
    'configurar-portal-b2b',
    'Guia publico inicial',
    '## Passos\n\nConfigure o portal B2B sem HTML legado.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000001',
    'public',
    'draft',
    'Rascunho interno',
    'rascunho-interno',
    'Ainda em construcao',
    'Conteudo em rascunho.',
    1,
    null,
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000001',
    'internal',
    'published',
    'Runbook interno',
    'runbook-interno',
    'Nao pode ser publico',
    'Notas operacionais internas.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000001',
    'restricted',
    'published',
    'Documento restrito',
    'documento-restrito',
    'Nao pode ser publico',
    'Conteudo restrito.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000002',
    'public',
    'published',
    'Integrar transportadora',
    'integrar-transportadora',
    'Fluxo publico de integracao',
    '## Checklist\n\nConfigure a integracao tecnicamente.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '30000000-0000-4000-8000-000000000003',
    'public',
    'published',
    'Nao vazar categoria interna',
    'nao-vazar-categoria-interna',
    'Este artigo nao deve aparecer',
    'Categoria interna nao pode vazar.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    'public',
    'published',
    'Space inativo',
    'space-inativo',
    'Nao deve aparecer',
    'Conteudo de space inativo.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    null,
    '30000000-0000-4000-8000-000000000005',
    'public',
    'published',
    'Artigo legado publico',
    'artigo-legado-publico',
    'Compatibilidade publica para artigo sem knowledge_space_id.',
    '## Legado publico\n\nEste artigo continua publico na trilha canonica genius.',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  );

set local role anon;
set local request.jwt.claim.role = 'anon';
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'
        and route_path_prefix = '/help/genius'$$
  ),
  1::bigint,
  'resolver publico funciona por space_slug para o space genius'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'domain'
        and route_host = 'help.genius.local'$$
  ),
  1::bigint,
  'resolver publico tambem expande dominio ativo quando configurado'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_articles_list
      where knowledge_space_slug = 'genius'$$
  ),
  3::bigint,
  'anon le os artigos publicados e publicos do space ativo, incluindo compatibilidade legado sem knowledge_space_id'
);

select is(
  pg_temp.safe_text(
    $$select title
      from public.vw_public_knowledge_article_detail
      where slug = 'configurar-portal-b2b'$$
  ),
  'Configurar portal B2B',
  'anon le detalhe do artigo publico publicado'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'rascunho-interno'$$
  ),
  0::bigint,
  'anon nao le draft'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'runbook-interno'$$
  ),
  0::bigint,
  'anon nao le artigo internal'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'documento-restrito'$$
  ),
  0::bigint,
  'anon nao le artigo restricted'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'space-inativo'$$
  ),
  0::bigint,
  'anon nao le artigo de knowledge_space inativo'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_navigation
      where knowledge_space_slug = 'genius'$$
  ),
  3::bigint,
  'navigation retorna as categorias publicas relevantes, incluindo a categoria legada sem knowledge_space_id'
);

select is(
  pg_temp.safe_bigint(
    $$select subtree_article_count
      from public.vw_public_knowledge_navigation
      where category_slug = 'configuracoes'$$
  ),
  2::bigint,
  'navigation agrega apenas artigos publicos no subtree da categoria raiz'
);

select is(
  pg_temp.safe_bigint(
    $$select article_count
      from public.vw_public_knowledge_navigation
      where category_slug = 'integracoes'$$
  ),
  1::bigint,
  'navigation retorna a contagem correta de artigos publicos por categoria filha'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_navigation
      where category_slug = 'runbooks-internos'$$
  ),
  0::bigint,
  'navigation nao retorna categoria interna'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_articles_list
      where slug = 'nao-vazar-categoria-interna'$$
  ),
  0::bigint,
  'artigo publico ligado a categoria interna nao vaza na lista publica'
);

select is(
  pg_temp.safe_text(
    $$select knowledge_space_slug
      from public.vw_public_knowledge_article_detail
      where slug = 'artigo-legado-publico'$$
  ),
  'genius',
  'artigo publico legado sem knowledge_space_id resolve no knowledge_space canonico genius'
);

select is(
  pg_temp.safe_text(
    $$select category_slug
      from public.vw_public_knowledge_article_detail
      where slug = 'artigo-legado-publico'$$
  ),
  'legado-publico',
  'categoria publica legada sem knowledge_space_id permanece navegavel na camada publica'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
