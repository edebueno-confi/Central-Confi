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

select plan(41);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_admin_organizations_list',
        'vw_admin_organization_detail',
        'vw_admin_knowledge_spaces'
      )
  ),
  3,
  'authenticated possui SELECT nas tres views administrativas novas de multi-brand'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'organizations',
        'organization_memberships',
        'knowledge_spaces',
        'knowledge_space_domains',
        'brand_settings'
      )
  ),
  0,
  'authenticated nao possui SELECT direto nas tabelas base de multi-brand'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_organizations_list',
        'vw_admin_organization_detail',
        'vw_admin_knowledge_spaces'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  3,
  'views administrativas novas usam security_barrier'
);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organizations'
  ),
  'organizations existe'
);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'organization_memberships'
  ),
  'organization_memberships existe'
);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'knowledge_spaces'
  ),
  'knowledge_spaces existe'
);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'knowledge_space_domains'
  ),
  'knowledge_space_domains existe'
);

select ok(
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'brand_settings'
  ),
  'brand_settings existe'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenants'
      and column_name = 'organization_id'
  ),
  'tenants possui organization_id'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_categories'
      and column_name = 'knowledge_space_id'
  ),
  'knowledge_categories possui knowledge_space_id'
);

select ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_articles'
      and column_name = 'knowledge_space_id'
  ),
  'knowledge_articles possui knowledge_space_id'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_select_managed'
  ),
  'organizations possui policy de leitura administrada'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_memberships'
      and policyname = 'organization_memberships_select_managed'
  ),
  'organization_memberships possui policy de leitura administrada'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_spaces'
      and policyname = 'knowledge_spaces_select_managed'
  ),
  'knowledge_spaces possui policy de leitura administrada'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_space_domains'
      and policyname = 'knowledge_space_domains_select_managed'
  ),
  'knowledge_space_domains possui policy de leitura administrada'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brand_settings'
      and policyname = 'brand_settings_select_managed'
  ),
  'brand_settings possui policy de leitura administrada'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'knowledge_categories_space_slug_scope_key'
      and lower(indexdef) like '%(knowledge_space_id, parent_category_id, slug)%'
      and lower(indexdef) like '%where (knowledge_space_id is not null)%'
  ),
  'knowledge_categories possui indice unico futuro por knowledge_space_id sem quebrar nulos atuais'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'knowledge_articles_space_slug_scope_key'
      and lower(indexdef) like '%(knowledge_space_id, slug)%'
      and lower(indexdef) like '%where (knowledge_space_id is not null)%'
  ),
  'knowledge_articles possui indice unico futuro por knowledge_space_id sem quebrar nulos atuais'
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
    'pgTAP multi brand foundation'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do primeiro platform_admin permanece funcional na fundacao multi-brand'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'kb-tenant-a',
      'KB Tenant A LTDA',
      'KB Tenant A',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant A pela RPC atual'
);

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'kb-tenant-b',
      'KB Tenant B LTDA',
      'KB Tenant B',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant B pela RPC atual'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'kb-tenant-a'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_admin ao tenant A pela RPC atual'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select lives_ok(
  $$
    do $block$
    begin
      insert into public.organizations (
        id,
        slug,
        legal_name,
        display_name,
        status,
        created_by_user_id,
        updated_by_user_id
      )
      values
        (
          '10000000-0000-4000-8000-000000000001'::uuid,
          'org-genius',
          'Genius CX Platform LTDA',
          'Genius CX Platform',
          'active',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        ),
        (
          '10000000-0000-4000-8000-000000000002'::uuid,
          'org-aftersale',
          'After Sale CX LTDA',
          'After Sale CX',
          'active',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        );

      update public.tenants
      set organization_id = '10000000-0000-4000-8000-000000000001'::uuid
      where slug = 'kb-tenant-a';

      update public.tenants
      set organization_id = '10000000-0000-4000-8000-000000000002'::uuid
      where slug = 'kb-tenant-b';

      insert into public.organization_memberships (
        organization_id,
        user_id,
        role,
        status,
        invited_by_user_id,
        created_by_user_id,
        updated_by_user_id
      )
      values
        (
          '10000000-0000-4000-8000-000000000001'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'organization_admin',
          'active',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        ),
        (
          '10000000-0000-4000-8000-000000000001'::uuid,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
          'organization_viewer',
          'active',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        );

      insert into public.knowledge_spaces (
        id,
        organization_id,
        owner_tenant_id,
        slug,
        display_name,
        status,
        is_primary,
        default_locale,
        created_by_user_id,
        updated_by_user_id
      )
      values
        (
          '20000000-0000-4000-8000-000000000001'::uuid,
          '10000000-0000-4000-8000-000000000001'::uuid,
          (select id from public.tenants where slug = 'kb-tenant-a'),
          'fixture-genius',
          'Genius Help Center',
          'draft',
          true,
          'pt-BR',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        ),
        (
          '20000000-0000-4000-8000-000000000002'::uuid,
          '10000000-0000-4000-8000-000000000002'::uuid,
          (select id from public.tenants where slug = 'kb-tenant-b'),
          'fixture-aftersale',
          'After Sale Help Center',
          'draft',
          true,
          'pt-BR',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        );

      insert into public.knowledge_space_domains (
        knowledge_space_id,
        host,
        path_prefix,
        status,
        is_primary,
        created_by_user_id,
        updated_by_user_id
      )
      values
        (
          '20000000-0000-4000-8000-000000000001'::uuid,
          'help.geniusreturns.com.br',
          '/',
          'active',
          true,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        ),
        (
          '20000000-0000-4000-8000-000000000002'::uuid,
          'help.aftersale.com.br',
          '/',
          'active',
          true,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        );

      insert into public.brand_settings (
        knowledge_space_id,
        brand_name,
        theme_tokens,
        seo_defaults,
        support_contacts,
        created_by_user_id,
        updated_by_user_id
      )
      values
        (
          '20000000-0000-4000-8000-000000000001'::uuid,
          'Genius Returns',
          '{"accent":"navy"}'::jsonb,
          '{"title":"Genius Help"}'::jsonb,
          '{"email":"support@geniusreturns.com.br"}'::jsonb,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        ),
        (
          '20000000-0000-4000-8000-000000000002'::uuid,
          'After Sale',
          '{"accent":"green"}'::jsonb,
          '{"title":"After Sale Help"}'::jsonb,
          '{"email":"support@aftersale.com.br"}'::jsonb,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        );
    end;
    $block$;
  $$,
  'fundacao multi-brand pode ser semeada de forma aditiva no backend local'
);

select throws_ok(
  $$
    insert into public.knowledge_spaces (
      organization_id,
      owner_tenant_id,
      slug,
      display_name,
      status,
      is_primary,
      default_locale,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '10000000-0000-4000-8000-000000000002'::uuid,
      (select id from public.tenants where slug = 'kb-tenant-b'),
      'genius',
      'Slug duplicado',
      'draft',
      false,
      'pt-BR',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "knowledge_spaces_slug_key"',
  'knowledge_spaces rejeita slug global duplicado'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_organizations_list'),
  3::bigint,
  'platform_admin le tres organizations pela view administrativa nova'
);

select is(
  pg_temp.safe_bigint(
    $$select tenant_count
      from public.vw_admin_organization_detail
      where slug = 'org-genius'$$
  ),
  1::bigint,
  'detalhe da organization Genius expõe tenant_count correto'
);

select is(
  pg_temp.safe_bigint(
    $$select knowledge_space_count
      from public.vw_admin_organization_detail
      where slug = 'org-genius'$$
  ),
  1::bigint,
  'detalhe da organization Genius expõe knowledge_space_count correto'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_knowledge_spaces'),
  3::bigint,
  'platform_admin le tres knowledge_spaces pela view administrativa nova'
);

select is(
  pg_temp.safe_text(
    $$select brand_name
      from public.vw_admin_knowledge_spaces
      where slug = 'fixture-genius'$$
  ),
  'Genius Returns',
  'vw_admin_knowledge_spaces resolve brand_name do space fixture-genius'
);

select is(
  pg_temp.safe_text(
    $$select primary_domain_host
      from public.vw_admin_knowledge_spaces
      where slug = 'fixture-genius'$$
  ),
  'help.geniusreturns.com.br',
  'vw_admin_knowledge_spaces resolve dominio primario do space fixture-genius'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Legacy Compat Root',
      'legacy-compat-root',
      'Categoria criada pela RPC legada na fase 4.2.',
      'internal',
      null,
      null
    )
  $$,
  'RPC atual de categoria continua funcional sem knowledge_space_id'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Legacy Compat Article',
      'legacy-compat-article',
      'Resumo legado compatível.',
      'Corpo markdown legado compatível.',
      (select id from public.vw_admin_knowledge_categories where slug = 'legacy-compat-root'),
      'internal',
      null,
      'raw_knowledge/octadesk_export/latest/articles/legacy-compat-article',
      'legacy-compat-hash-v1'
    )
  $$,
  'RPC atual de artigo continua funcional sem knowledge_space_id'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select is(
  pg_temp.safe_text(
    $$select coalesce(knowledge_space_id::text, '<null>')
      from public.knowledge_categories
      where slug = 'legacy-compat-root'$$
  ),
  '<null>',
  'categoria criada pela RPC atual permanece com knowledge_space_id nulo'
);

select is(
  pg_temp.safe_text(
    $$select coalesce(knowledge_space_id::text, '<null>')
      from public.knowledge_articles
      where slug = 'legacy-compat-article'$$
  ),
  '<null>',
  'artigo criado pela RPC atual permanece com knowledge_space_id nulo'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  pg_temp.safe_bigint(
    $$select count(*)
      from public.vw_admin_knowledge_articles_list
      where slug = 'legacy-compat-article'$$
  ),
  1::bigint,
  'view administrativa atual de KB continua enxergando o artigo legado compativel'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_tenants_list'),
  2::bigint,
  'view administrativa atual de tenants continua funcional apos organization_id'
);

select throws_ok(
  $$
    select id
    from public.organizations
    limit 1
  $$,
  '42501',
  'permission denied for table organizations',
  'platform_admin continua sem SELECT direto em organizations'
);

select throws_ok(
  $$
    select id
    from public.knowledge_spaces
    limit 1
  $$,
  '42501',
  'permission denied for table knowledge_spaces',
  'platform_admin continua sem SELECT direto em knowledge_spaces'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_organizations_list'),
  0::bigint,
  'tenant_admin nao acessa a lista administrativa de organizations'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_organization_detail'),
  0::bigint,
  'tenant_admin nao acessa o detalhe administrativo de organizations'
);

select is(
  pg_temp.safe_bigint('select count(*) from public.vw_admin_knowledge_spaces'),
  0::bigint,
  'tenant_admin nao acessa a lista administrativa de knowledge_spaces'
);

select * from finish();
rollback;
