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

select plan(13);

select is(
  (
    select count(distinct gr.routine_name)::integer
    from information_schema.routine_privileges as gr
    where gr.grantee = 'anon'
      and gr.privilege_type = 'EXECUTE'
      and gr.specific_schema = 'public'
      and gr.routine_name = 'rpc_public_search_knowledge_articles'
  ),
  1,
  'anon recebe EXECUTE na RPC publica de busca'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'anon'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'knowledge_spaces',
        'brand_settings',
        'knowledge_categories',
        'knowledge_articles'
      )
  ),
  0,
  'anon continua sem SELECT direto nas tabelas base da busca publica'
);

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

insert into public.knowledge_spaces (
  id,
  organization_id,
  slug,
  display_name,
  status,
  default_locale
)
values (
  '61000000-0000-4000-8000-000000000001',
  (select id from public.organizations where slug = 'genius-group'),
  'space-inativo-busca',
  'Space Inativo Busca',
  'draft',
  'pt-BR'
)
on conflict (id) do nothing;

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
    '62000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'public',
    'Integracoes Publicas',
    'integracoes-publicas-busca',
    'Categoria publica para busca'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    'internal',
    'Integracoes Internas',
    'integracoes-internas-busca',
    'Categoria interna para isolamento'
  ),
  (
    '62000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000001',
    'public',
    'Categoria Inativa',
    'categoria-inativa-busca',
    'Categoria publica em space inativo'
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
    '63000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '62000000-0000-4000-8000-000000000001',
    'public',
    'published',
    'Configurar webhook tecnico',
    'configurar-webhook-tecnico',
    'Guia publico para configurar webhook na plataforma.',
    '## Configuracao de webhook publico',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '62000000-0000-4000-8000-000000000001',
    'public',
    'draft',
    'Webhook draft bloqueado',
    'webhook-draft-bloqueado',
    'Nao pode aparecer na busca',
    'Conteudo draft',
    1,
    null,
    timezone('utc', now())
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '62000000-0000-4000-8000-000000000001',
    'restricted',
    'published',
    'Webhook restrito',
    'webhook-restrito',
    'Nao pode aparecer na busca',
    'Conteudo restrito',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '63000000-0000-4000-8000-000000000004',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '62000000-0000-4000-8000-000000000002',
    'public',
    'published',
    'Webhook interno por categoria',
    'webhook-interno-por-categoria',
    'Nao pode aparecer por causa da categoria interna',
    'Conteudo em categoria interna',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '63000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000003',
    'public',
    'published',
    'Webhook em space inativo',
    'webhook-space-inativo',
    'Nao pode aparecer porque o space esta inativo',
    'Conteudo em space inativo',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

set local role anon;
set local request.jwt.claim.role = 'anon';
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'webhook', 10)$$
  ),
  1::bigint,
  'anon encontra artigo publico publicado na busca'
);

select is(
  pg_temp.safe_text(
    $$select title
      from public.rpc_public_search_knowledge_articles('genius', 'webhook', 10)
      limit 1$$
  ),
  'Configurar webhook tecnico',
  'RPC publica retorna o artigo publicado esperado'
);

select is(
  pg_temp.safe_text(
    $$select category_name
      from public.rpc_public_search_knowledge_articles('genius', 'webhook', 10)
      limit 1$$
  ),
  'Integracoes Publicas',
  'RPC publica retorna categoria publica resumida'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'draft', 10)$$
  ),
  0::bigint,
  'anon nao encontra draft na busca publica'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'restrito', 10)$$
  ),
  0::bigint,
  'anon nao encontra artigo restricted na busca publica'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'categoria interna', 10)$$
  ),
  0::bigint,
  'anon nao encontra artigo em categoria interna'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('space-inativo-busca', 'webhook', 10)$$
  ),
  0::bigint,
  'space inativo nao retorna resultados na busca publica'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', '', 10)$$
  ),
  0::bigint,
  'busca vazia retorna lista vazia controlada'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'w', 10)$$
  ),
  0::bigint,
  'busca curta retorna lista vazia controlada'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.rpc_public_search_knowledge_articles('genius', 'webhook', 1)$$
  ),
  1::bigint,
  'limite explicito e respeitado na RPC publica'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'knowledge_articles_public_search_idx'
  ),
  'indice de busca publica foi criado'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select * from finish();
rollback;
