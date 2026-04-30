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

select plan(38);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_admin_knowledge_categories_v2',
        'vw_admin_knowledge_articles_list_v2',
        'vw_admin_knowledge_article_detail_v2'
      )
  ),
  3,
  'authenticated possui SELECT nas três views v2 space-aware de Knowledge Base'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_knowledge_categories_v2',
        'vw_admin_knowledge_articles_list_v2',
        'vw_admin_knowledge_article_detail_v2'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  3,
  'views v2 space-aware usam security_barrier'
);

select is(
  (
    select count(distinct gr.routine_name)::integer
    from information_schema.routine_privileges as gr
    where gr.grantee = 'authenticated'
      and gr.privilege_type = 'EXECUTE'
      and gr.specific_schema = 'public'
      and gr.routine_name in (
        'rpc_admin_create_knowledge_category_v2',
        'rpc_admin_create_knowledge_article_draft_v2',
        'rpc_admin_update_knowledge_article_draft_v2',
        'rpc_admin_submit_knowledge_article_for_review_v2',
        'rpc_admin_publish_knowledge_article_v2',
        'rpc_admin_archive_knowledge_article_v2'
      )
  ),
  6,
  'authenticated recebe EXECUTE nas seis RPCs v2 space-aware'
);

select ok(
  exists (
    select 1
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'app_private'
      and p.proname = 'ensure_default_genius_space'
  ),
  'helper privado de bootstrap/backfill da space genius existe'
);

select is(
  pg_temp.safe_text(
    $$select slug
      from public.organizations
      where slug = 'genius-group'$$
  ),
  'genius-group',
  'organization padrão genius-group existe após a migration'
);

select is(
  pg_temp.safe_text(
    $$select display_name
      from public.organizations
      where slug = 'genius-group'$$
  ),
  'Genius Group',
  'organization padrão usa display_name Genius Group'
);

select is(
  pg_temp.safe_text(
    $$select slug
      from public.knowledge_spaces
      where slug = 'genius'$$
  ),
  'genius',
  'knowledge_space padrão genius existe após a migration'
);

select is(
  pg_temp.safe_text(
    $$select display_name
      from public.knowledge_spaces
      where slug = 'genius'$$
  ),
  'Genius Returns',
  'knowledge_space padrão usa display_name Genius Returns'
);

select is(
  pg_temp.safe_text(
    $$select status::text
      from public.knowledge_spaces
      where slug = 'genius'$$
  ),
  'draft',
  'knowledge_space padrão permanece em draft enquanto a Central Pública não existe'
);

select is(
  pg_temp.safe_text(
    $$select coalesce(owner_tenant_id::text, '<null>')
      from public.knowledge_spaces
      where slug = 'genius'$$
  ),
  '<null>',
  'knowledge_space padrão nasce sem owner_tenant_id nesta fase'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.knowledge_spaces
      where slug = 'aftersale'$$
  ),
  0::bigint,
  'After Sale ainda não é criada nesta fase'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'platform-admin@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Platform Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'tenant-admin@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Admin A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP phase4.3'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do primeiro platform_admin permanece funcional na fase 4.3'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'kb-space-aware-tenant-a',
      'KB Space A LTDA',
      'KB Space A',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant de apoio para a fase 4.3'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'kb-space-aware-tenant-a'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_admin ao tenant de apoio'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Legacy Backfill Root',
      'legacy-backfill-root',
      'Categoria legada criada pela RPC antiga.',
      'internal',
      null,
      null
    )
  $$,
  'RPC antiga ainda cria categoria sem knowledge_space_id antes do rerun do backfill'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Legacy Backfill Article',
      'legacy-backfill-article',
      'Resumo legado sem space.',
      'Corpo legado sem space.',
      (select id from public.vw_admin_knowledge_categories where slug = 'legacy-backfill-root'),
      'internal',
      null,
      'raw_knowledge/octadesk_export/latest/articles/legacy-backfill-article',
      'legacy-backfill-hash-v1'
    )
  $$,
  'RPC antiga ainda cria artigo sem knowledge_space_id antes do rerun do backfill'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_text(
    $$select coalesce(knowledge_space_id::text, '<null>')
      from public.knowledge_categories
      where slug = 'legacy-backfill-root'$$
  ),
  '<null>',
  'categoria legada criada após a migration permanece nula até o helper de backfill ser executado'
);

select is(
  pg_temp.safe_text(
    $$select coalesce(knowledge_space_id::text, '<null>')
      from public.knowledge_articles
      where slug = 'legacy-backfill-article'$$
  ),
  '<null>',
  'artigo legado criado após a migration permanece nulo até o helper de backfill ser executado'
);

select lives_ok(
  $$
    select app_private.ensure_default_genius_space()
  $$,
  'helper privado de genius space pode ser reexecutado de forma idempotente'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.organizations
      where slug = 'genius-group'$$
  ),
  1::bigint,
  'rerun do helper não duplica a organization padrão'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.knowledge_spaces
      where slug = 'genius'$$
  ),
  1::bigint,
  'rerun do helper não duplica o knowledge_space padrão'
);

select is(
  pg_temp.safe_text(
    $$select ks.slug
      from public.knowledge_categories as kc
      join public.knowledge_spaces as ks
        on ks.id = kc.knowledge_space_id
      where kc.slug = 'legacy-backfill-root'$$
  ),
  'genius',
  'backfill associa categorias legadas nulas ao space genius'
);

select is(
  pg_temp.safe_text(
    $$select ks.slug
      from public.knowledge_articles as ka
      join public.knowledge_spaces as ks
        on ks.id = ka.knowledge_space_id
      where ka.slug = 'legacy-backfill-article'$$
  ),
  'genius',
  'backfill associa artigos legados nulos ao space genius'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category_v2(
      'Space Aware Root',
      'space-aware-root',
      'Categoria criada pela RPC v2.',
      'internal',
      null,
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      null
    )
  $$,
  'RPC v2 cria categoria explicitamente no space genius'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft_v2(
      'Space Aware Article',
      'space-aware-article',
      'Resumo da camada v2.',
      'Corpo markdown da camada v2.',
      (select id from public.vw_admin_knowledge_categories_v2 where slug = 'space-aware-root'),
      'internal',
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      null,
      'raw_knowledge/octadesk_export/latest/articles/space-aware-article',
      'space-aware-hash-v1'
    )
  $$,
  'RPC v2 cria artigo draft no space correto'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'space-aware-article'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'RPC v2 envia artigo para review no space correto'
);

select is(
  (
    public.rpc_admin_publish_knowledge_article_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'space-aware-article'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  ).status::text,
  'published',
  'RPC v2 publica artigo no space correto'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_articles_list_v2
      where slug = 'space-aware-article'$$
  ),
  1::bigint,
  'lista v2 enxerga o artigo criado pela RPC space-aware'
);

select is(
  pg_temp.safe_text(
    $$select knowledge_space_slug
      from public.vw_admin_knowledge_articles_list_v2
      where slug = 'space-aware-article'$$
  ),
  'genius',
  'lista v2 expõe knowledge_space_slug do artigo'
);

select ok(
  exists (
    select 1
    from public.vw_admin_knowledge_article_detail_v2 as v
    where v.slug = 'space-aware-article'
      and v.organization_slug = 'genius-group'
      and v.knowledge_space_slug = 'genius'
      and v.source_hash = 'space-aware-hash-v1'
      and jsonb_array_length(v.revisions) = 3
      and jsonb_array_length(v.sources) = 1
  ),
  'detalhe v2 preserva organization, knowledge_space, source_hash e trilha editorial'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Legacy Null After V2',
      'legacy-null-after-v2',
      'Categoria criada pela RPC antiga após a camada v2.',
      'internal',
      null,
      null
    )
  $$,
  'RPC antiga continua criando categoria legada sem quebrar a fase 4.3'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Legacy Null Article After V2',
      'legacy-null-article-after-v2',
      'Resumo legado ainda sem space.',
      'Corpo legado ainda sem space.',
      (select id from public.vw_admin_knowledge_categories where slug = 'legacy-null-after-v2'),
      'internal',
      null,
      'raw_knowledge/octadesk_export/latest/articles/legacy-null-article-after-v2',
      'legacy-null-after-v2-hash'
    )
  $$,
  'RPC antiga continua criando artigo legado sem quebrar a fase 4.3'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_articles_list_v2
      where slug = 'legacy-null-article-after-v2'$$
  ),
  0::bigint,
  'views v2 filtram artigos ainda sem knowledge_space_id'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_articles_list
      where slug = 'legacy-null-article-after-v2'$$
  ),
  1::bigint,
  'view antiga continua enxergando o artigo legado sem space'
);

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_articles_list
      where slug = 'space-aware-article'$$
  ),
  1::bigint,
  'view antiga também continua enxergando artigo criado via RPC v2'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_knowledge_categories_v2'),
  0::bigint,
  'tenant_admin não acessa a lista v2 de categorias'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_knowledge_articles_list_v2'),
  0::bigint,
  'tenant_admin não acessa a lista v2 de artigos'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_knowledge_article_detail_v2'),
  0::bigint,
  'tenant_admin não acessa o detalhe v2 de artigos'
);

select * from finish();
rollback;
