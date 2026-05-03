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

select plan(18);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name = 'vw_admin_knowledge_article_review_advisories'
  ),
  1,
  'authenticated possui SELECT na view administrativa de advisory editorial'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vw_admin_knowledge_article_review_advisories'
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  1,
  'view administrativa de advisory usa security_barrier'
);

select is(
  (
    select count(distinct gr.routine_name)::integer
    from information_schema.routine_privileges as gr
    where gr.grantee = 'authenticated'
      and gr.privilege_type = 'EXECUTE'
      and gr.specific_schema = 'public'
      and gr.routine_name in (
        'rpc_admin_mark_knowledge_article_reviewed',
        'rpc_admin_update_knowledge_article_review_status'
      )
  ),
  2,
  'authenticated recebe EXECUTE nas duas RPCs de advisory editorial'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name = 'knowledge_article_review_advisories'
  ),
  0,
  'authenticated continua sem SELECT direto na tabela base de advisory'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'knowledge_article_review_advisories'
  ),
  'tabela de advisory editorial esta protegida por RLS'
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
    'platform-admin-advisory@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Platform Admin Advisory"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'tenant-admin-advisory@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Admin Advisory"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP phase5.3'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do platform_admin de advisory permanece funcional'
);

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

insert into public.knowledge_categories (
  id,
  knowledge_space_id,
  visibility,
  name,
  slug,
  description
)
values (
  '71000000-0000-4000-8000-000000000001',
  (select id from public.knowledge_spaces where slug = 'genius'),
  'internal',
  'Advisory Editorial',
  'advisory-editorial',
  'Categoria de apoio para advisory editorial.'
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
  source_path,
  source_hash,
  current_revision_number,
  created_at,
  updated_at
)
values
  (
    '72000000-0000-4000-8000-000000000001',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '71000000-0000-4000-8000-000000000001',
    'internal',
    'draft',
    'Artigo Advisory Primario',
    'artigo-advisory-primario',
    'Resumo inicial do artigo advisory.',
    'Corpo markdown do artigo advisory primario.',
    'raw_knowledge/octadesk_export/latest/articles/advisory/primario',
    'hash-advisory-duplicado',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    (select id from public.knowledge_spaces where slug = 'genius'),
    '71000000-0000-4000-8000-000000000001',
    'restricted',
    'draft',
    'Artigo Advisory Secundario',
    'artigo-advisory-secundario',
    'Resumo secundario do advisory.',
    'Corpo markdown do artigo advisory secundario.',
    'raw_knowledge/octadesk_export/latest/articles/advisory/secundario',
    'hash-advisory-duplicado',
    1,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

insert into public.knowledge_article_review_advisories (
  id,
  article_id,
  source_hash,
  suggested_visibility,
  suggested_classification,
  classification_reason,
  duplicate_group_key,
  risk_flags,
  review_status,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    'hash-advisory-duplicado',
    'restricted',
    'restricted',
    'Conteudo envolve integracoes e credenciais; manter revisao cautelosa.',
    'hash-advisory-duplicado',
    '["integracoes","credenciais"]'::jsonb,
    'pending',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    'hash-advisory-duplicado',
    'restricted',
    'duplicate',
    'Mesmo source_hash do artigo primario; consolidar antes de promover.',
    'hash-advisory-duplicado',
    '["integracoes"]'::jsonb,
    'pending',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  )
on conflict (article_id) do nothing;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_article_review_advisories
      where article_slug like 'artigo-advisory-%'$$
  ),
  2::bigint,
  'platform_admin le os advisories editoriais do knowledge space'
);

select is(
  pg_temp.safe_text(
    $$select suggested_classification::text
      from public.vw_admin_knowledge_article_review_advisories
      where article_slug = 'artigo-advisory-primario'$$
  ),
  'restricted',
  'view administrativa expõe classificacao sugerida do advisory'
);

select is(
  pg_temp.safe_bigint(
    $$select duplicate_group_article_count
      from public.vw_admin_knowledge_article_review_advisories
      where article_slug = 'artigo-advisory-primario'$$
  ),
  2::bigint,
  'view administrativa expõe contagem de duplicidade por duplicate_group_key'
);

select is(
  (
    public.rpc_admin_update_knowledge_article_review_status(
      '72000000-0000-4000-8000-000000000001'::uuid,
      'in_review',
      '{"title_reviewed": true, "summary_reviewed": true}'::jsonb,
      'Revisao editorial iniciada.'
    )
  ).review_status::text,
  'in_review',
  'RPC atualiza o status da revisao editorial sem publicar artigo'
);

select is(
  pg_temp.safe_text(
    $$select human_confirmations::text
      from public.vw_admin_knowledge_article_review_advisories
      where article_id = '72000000-0000-4000-8000-000000000001'::uuid$$
  ),
  '{"title_reviewed": true, "summary_reviewed": true}',
  'RPC persiste confirmacoes humanas no advisory'
);

select is(
  pg_temp.safe_text(
    $$select coalesce(review_notes, '<null>')
      from public.vw_admin_knowledge_article_review_advisories
      where article_id = '72000000-0000-4000-8000-000000000001'::uuid$$
  ),
  'Revisao editorial iniciada.',
  'RPC persiste notas da revisao editorial'
);

select is(
  (
    public.rpc_admin_mark_knowledge_article_reviewed(
      '72000000-0000-4000-8000-000000000001'::uuid,
      '{"title_reviewed": true, "summary_reviewed": true, "ready_for_review": true}'::jsonb,
      'Curadoria concluida.'
    )
  ).review_status::text,
  'reviewed',
  'RPC marca advisory como revisado de forma explicita'
);

select is(
  pg_temp.safe_text(
    $$select reviewed_by_user_id::text
      from public.vw_admin_knowledge_article_review_advisories
      where article_id = '72000000-0000-4000-8000-000000000001'::uuid$$
  ),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'marcacao de revisado persiste o usuario revisor'
);

select is(
  pg_temp.safe_text(
    $$select status::text
      from public.vw_admin_knowledge_article_detail_v2
      where id = '72000000-0000-4000-8000-000000000001'::uuid$$
  ),
  'draft',
  'advisory nao altera automaticamente o status do artigo'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  pg_temp.safe_bigint(
    $$select count(*) from public.vw_admin_knowledge_article_review_advisories$$
  ),
  0::bigint,
  'usuario autenticado sem platform_admin nao le a view administrativa de advisory'
);

select throws_ok(
  $$
    select public.rpc_admin_update_knowledge_article_review_status(
      '72000000-0000-4000-8000-000000000001'::uuid,
      'in_review',
      '{}'::jsonb,
      null
    )
  $$,
  'P0001',
  'rpc_admin_update_knowledge_article_review_status denied',
  'usuario sem permissao global nao executa RPC de advisory'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role anon;
set local request.jwt.claim.role = 'anon';
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_bigint(
    $$select count(*) from public.vw_admin_knowledge_article_review_advisories$$
  ),
  (-2)::bigint,
  'anon nao recebe SELECT na view administrativa de advisory'
);

select * from finish();
rollback;
