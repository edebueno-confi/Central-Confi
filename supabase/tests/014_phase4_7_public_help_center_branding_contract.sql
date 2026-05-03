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

select plan(16);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vw_public_knowledge_space_resolver'
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  1,
  'resolver publico continua com security_barrier'
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
        'knowledge_articles'
      )
  ),
  0,
  'anon continua sem SELECT direto nas tabelas base da camada publica'
);

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

insert into public.brand_settings (
  knowledge_space_id,
  brand_name,
  logo_asset_url,
  theme_tokens,
  seo_defaults,
  support_contacts
)
values (
  (select id from public.knowledge_spaces where slug = 'genius'),
  'Genius Returns',
  '/brand-assets/genius-returns-help.svg',
  jsonb_build_object(
    'surface', '#f7fbff',
    'accent', '#1459c7',
    'hero', 'linear-gradient(135deg, #141f47, #307fe2 58%, #74d2e7)',
    'orbA', 'rgba(116,210,231,0.18)',
    'script', 'javascript:alert(1)',
    'customObject', jsonb_build_object('hack', true)
  ),
  jsonb_build_object(
    'title', 'Genius Returns Help Center',
    'description', 'Documentacao tecnica oficial para operacao B2B.',
    'imageUrl', 'https://cdn.example.com/help-center-og.png',
    'secretToken', 'nao-publicar'
  ),
  jsonb_build_object(
    'email', 'support@geniusreturns.com.br',
    'websiteUrl', 'https://geniusreturns.com.br',
    'statusPageUrl', 'https://status.geniusreturns.com.br',
    'privatePhone', '+55 11 99999-0000',
    'internalSlack', '#ops'
  )
)
on conflict (knowledge_space_id) do update
set brand_name = excluded.brand_name,
    logo_asset_url = excluded.logo_asset_url,
    theme_tokens = excluded.theme_tokens,
    seo_defaults = excluded.seo_defaults,
    support_contacts = excluded.support_contacts;

insert into public.knowledge_space_domains (
  id,
  knowledge_space_id,
  host,
  path_prefix,
  status,
  is_primary
)
values (
  '51000000-0000-4000-8000-000000000001',
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
  '52000000-0000-4000-8000-000000000001',
  (select id from public.organizations where slug = 'genius-group'),
  'inactive-branding',
  'Inactive Branding',
  'draft',
  'pt-BR'
)
on conflict (id) do nothing;

insert into public.brand_settings (
  knowledge_space_id,
  brand_name,
  logo_asset_url,
  theme_tokens,
  seo_defaults,
  support_contacts
)
values (
  '52000000-0000-4000-8000-000000000001',
  'Inactive Branding',
  '/brand-assets/inactive.svg',
  jsonb_build_object('surface', '#ffffff'),
  jsonb_build_object('title', 'Nao deveria vazar'),
  jsonb_build_object('email', 'private@example.com')
)
on conflict (knowledge_space_id) do nothing;

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
    '53000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'public',
    'Categoria Publica',
    'categoria-publica-branding',
    'Categoria publica para teste do branding'
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'internal',
    'Categoria Interna',
    'categoria-interna-branding',
    'Nao pode vazar'
  )
on conflict (id) do nothing;

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
    '54000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '53000000-0000-4000-8000-000000000001',
    'public',
    'published',
    'Artigo publico com branding',
    'artigo-publico-com-branding',
    'Resumo publico.',
    '## Conteudo publico',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '54000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '53000000-0000-4000-8000-000000000001',
    'public',
    'draft',
    'Draft com branding',
    'draft-com-branding',
    'Nao pode sair',
    'Conteudo draft',
    1,
    null,
    timezone('utc', now())
  ),
  (
    '54000000-0000-4000-8000-000000000003',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '53000000-0000-4000-8000-000000000001',
    'restricted',
    'published',
    'Restrito com branding',
    'restrito-com-branding',
    'Nao pode sair',
    'Conteudo restrito',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '54000000-0000-4000-8000-000000000004',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '53000000-0000-4000-8000-000000000002',
    'public',
    'published',
    'Categoria interna nao pode vazar',
    'categoria-interna-nao-pode-vazar',
    'Nao pode sair',
    'Conteudo bloqueado por categoria',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

set local role anon;
set local request.jwt.claim.role = 'anon';
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_text(
    $$select logo_asset_url
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  '/brand-assets/genius-returns-help.svg',
  'anon recebe logo_asset_url publico permitido'
);

select is(
  pg_temp.safe_text(
    $$select theme_tokens ->> 'surface'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  '#f7fbff',
  'anon recebe token publico de tema permitido'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)::bigint
      from jsonb_object_keys(
        (
          select theme_tokens
          from public.vw_public_knowledge_space_resolver
          where knowledge_space_slug = 'genius'
            and route_kind = 'space_slug'
        )
      ) as theme_key$$
  ),
  4::bigint,
  'resolver publico nao expande JSON bruto de theme_tokens'
);

select is(
  pg_temp.safe_text(
    $$select theme_tokens ->> 'script'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  '<null>',
  'resolver publico nao expoe chave insegura de theme_tokens'
);

select is(
  pg_temp.safe_text(
    $$select seo_defaults ->> 'title'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  'Genius Returns Help Center',
  'anon recebe seo_defaults publicos permitidos'
);

select is(
  pg_temp.safe_text(
    $$select seo_defaults ->> 'secretToken'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  '<null>',
  'resolver publico nao expoe segredo em seo_defaults'
);

select is(
  pg_temp.safe_text(
    $$select support_contacts ->> 'email'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  'support@geniusreturns.com.br',
  'anon recebe support contact publico permitido'
);

select is(
  pg_temp.safe_text(
    $$select support_contacts ->> 'privatePhone'
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'space_slug'$$
  ),
  '<null>',
  'resolver publico nao expoe contato privado'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'inactive-branding'$$
  ),
  0::bigint,
  'space inativo nao expoe branding no resolver publico'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_articles_list
      where slug = 'artigo-publico-com-branding'$$
  ),
  1::bigint,
  'artigo publico publicado continua visivel nas views publicas'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'draft-com-branding'$$
  ),
  0::bigint,
  'draft continua bloqueado nas views publicas'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_article_detail
      where slug = 'restrito-com-branding'$$
  ),
  0::bigint,
  'restricted continua bloqueado nas views publicas'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_public_knowledge_articles_list
      where slug = 'categoria-interna-nao-pode-vazar'$$
  ),
  0::bigint,
  'artigo de categoria interna continua bloqueado'
);

select is(
  pg_temp.safe_text(
    $$select route_host
      from public.vw_public_knowledge_space_resolver
      where knowledge_space_slug = 'genius'
        and route_kind = 'domain'$$
  ),
  'help.genius.local',
  'resolver publico continua suportando dominio ativo com branding'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
