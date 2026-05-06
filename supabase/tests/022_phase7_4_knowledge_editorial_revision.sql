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

select plan(23);

select is(
  (
    select count(distinct gr.routine_name)::integer
    from information_schema.routine_privileges as gr
    where gr.grantee = 'authenticated'
      and gr.privilege_type = 'EXECUTE'
      and gr.specific_schema = 'public'
      and gr.routine_name in (
        'rpc_admin_begin_knowledge_article_editorial_revision_v2',
        'rpc_admin_update_knowledge_article_editorial_revision_v2',
        'rpc_admin_publish_knowledge_article_editorial_revision_v2',
        'rpc_admin_discard_knowledge_article_editorial_revision_v2'
      )
  ),
  4,
  'authenticated recebe EXECUTE nas quatro RPCs do fluxo editorial de artigo publicado'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name = 'knowledge_article_editorial_drafts'
  ),
  0,
  'authenticated continua sem SELECT direto na tabela de drafts editoriais publicados'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vw_admin_knowledge_articles_list_v2'
      and column_name = 'has_editorial_draft'
  ),
  'lista administrativa space-aware expõe flag de revisão editorial em andamento'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vw_admin_knowledge_article_detail_v2'
      and column_name = 'editorial_draft'
  ),
  'detalhe administrativo space-aware expõe payload do draft editorial'
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
values (
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated',
  'authenticated',
  'platform-admin-editorial@genius.local',
  crypt('password', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Platform Admin Editorial"}'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do nothing;

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP phase7.4'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do platform_admin editorial permanece funcional'
);

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category_v2(
      'Editorial Publico',
      'editorial-publico',
      'Categoria publica para validar revisão editorial.',
      'public',
      null,
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      null
    )
  $$,
  'RPC v2 cria categoria pública para o fluxo editorial de artigo publicado'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft_v2(
      'Artigo publicado original',
      'artigo-publicado-original',
      'Resumo original publicado.',
      'Corpo original publicado.',
      (select id from public.vw_admin_knowledge_categories_v2 where slug = 'editorial-publico'),
      'public',
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      null,
      null,
      null
    )
  $$,
  'RPC v2 cria o artigo draft que servirá de base para a revisão editorial'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'artigo base entra em review antes da primeira publicação'
);

select is(
  (
    public.rpc_admin_publish_knowledge_article_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  ).status::text,
  'published',
  'artigo base é publicado antes da revisão editorial controlada'
);

select is(
  pg_temp.safe_text(
    $$select public_article_path
      from public.vw_admin_knowledge_article_detail_v2
      where slug = 'artigo-publicado-original'$$
  ),
  '/help/genius/articles/artigo-publicado-original',
  'detalhe administrativo expõe o caminho público estável do artigo publicado'
);

select lives_ok(
  $$
    select public.rpc_admin_begin_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'fluxo editorial inicia revisão privada para artigo já publicado'
);

select is(
  pg_temp.safe_text(
    $$select has_editorial_draft::text
      from public.vw_admin_knowledge_articles_list_v2
      where slug = 'artigo-publicado-original'$$
  ),
  'true',
  'iniciar revisão editorial é idempotente e mantém um único draft privado por artigo'
);

select lives_ok(
  $$
    select public.rpc_admin_update_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      'Artigo publicado revisado',
      'artigo-publicado-original',
      'Resumo revisado para a central pública.',
      'Corpo revisado para a central pública.',
      (select id from public.vw_admin_knowledge_categories_v2 where slug = 'editorial-publico'),
      'public',
      null,
      null
    )
  $$,
  'revisão editorial privada aceita alterações sem tocar a peça pública atual'
);

select is(
  pg_temp.safe_text(
    $$select editorial_draft ->> 'title'
      from public.vw_admin_knowledge_article_detail_v2
      where slug = 'artigo-publicado-original'$$
  ),
  'Artigo publicado revisado',
  'detalhe administrativo expõe o título da revisão privada em andamento'
);

select is(
  pg_temp.safe_text(
    $$select title
      from public.vw_public_knowledge_article_detail
      where slug = 'artigo-publicado-original'$$
  ),
  'Artigo publicado original',
  'a rota pública permanece estável com o conteúdo antigo enquanto a revisão não for publicada'
);

select throws_like(
  $$
    select public.rpc_admin_update_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius'),
      'Tentativa indevida',
      'slug-alterado-nao-permitido',
      'Resumo inválido.',
      'Corpo inválido.',
      (select id from public.vw_admin_knowledge_categories_v2 where slug = 'editorial-publico'),
      'public',
      null,
      null
    )
  $$,
  '%slug is immutable%',
  'slug de artigo publicado permanece imutável durante a revisão editorial'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'publicar revisão editorial aplica a atualização apenas no momento correto'
);

select is(
  pg_temp.safe_text(
    $$select title
      from public.vw_public_knowledge_article_detail
      where slug = 'artigo-publicado-original'$$
  ),
  'Artigo publicado revisado',
  'rota pública passa a servir a nova versão somente após a publicação da revisão'
);

select is(
  pg_temp.safe_text(
    $$select coalesce(editorial_draft::text, '<null>')
      from public.vw_admin_knowledge_article_detail_v2
      where slug = 'artigo-publicado-original'$$
  ),
  '<null>',
  'draft editorial some do detalhe administrativo após a publicação da revisão'
);

select is(
  pg_temp.safe_text(
    $$select public_article_path
      from public.vw_admin_knowledge_article_detail_v2
      where slug = 'artigo-publicado-original'$$
  ),
  '/help/genius/articles/artigo-publicado-original',
  'public_article_path permanece estável após a atualização editorial publicada'
);

select lives_ok(
  $$
    select public.rpc_admin_begin_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'revisão editorial pode ser reaberta após uma publicação bem-sucedida'
);

select lives_ok(
  $$
    select public.rpc_admin_discard_knowledge_article_editorial_revision_v2(
      (select id from public.vw_admin_knowledge_articles_list_v2 where slug = 'artigo-publicado-original'),
      (select id from public.vw_admin_knowledge_spaces where slug = 'genius')
    )
  $$,
  'draft editorial pode ser descartado sem tocar a versão pública vigente'
);

select is(
  pg_temp.safe_text(
    $$select has_editorial_draft::text
      from public.vw_admin_knowledge_articles_list_v2
      where slug = 'artigo-publicado-original'$$
  ),
  'false',
  'descartar revisão limpa o draft privado sem remover o artigo publicado'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select *
from finish();

rollback;
