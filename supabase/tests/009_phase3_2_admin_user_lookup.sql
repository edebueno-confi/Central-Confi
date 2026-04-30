create extension if not exists pgtap with schema extensions;

begin;

select plan(11);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name = 'vw_admin_user_lookup'
  ),
  1,
  'authenticated possui SELECT na view contratual de lookup de usuarios'
);

select ok(
  exists (
    select 1
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vw_admin_user_lookup'
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  'vw_admin_user_lookup usa security_barrier como hardening explicito'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated nao possui SELECT direto em public.profiles'
);

select is(
  (
    select array_agg(cols.column_name::text order by cols.ordinal_position)
    from information_schema.columns as cols
    where cols.table_schema = 'public'
      and cols.table_name = 'vw_admin_user_lookup'
  ),
  array['user_id', 'full_name', 'email', 'is_active', 'created_at']::text[],
  'vw_admin_user_lookup expõe apenas os campos permitidos'
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
    '{"full_name":"Tenant Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'common-user@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Common User"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP admin user lookup'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap inicial do platform_admin permanece funcional para user lookup'
);

insert into public.tenants (
  id,
  slug,
  legal_name,
  display_name,
  created_by_user_id,
  updated_by_user_id
)
values (
  '11111111-1111-4111-8111-111111111111',
  'tenant-lookup',
  'Tenant Lookup LTDA',
  'Tenant Lookup',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

insert into public.tenant_memberships (
  tenant_id,
  user_id,
  role,
  status,
  invited_by_user_id,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'tenant_admin',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'tenant_viewer',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (select count(*)::integer from public.vw_admin_user_lookup),
  3,
  'platform_admin acessa o lookup global de usuarios existentes'
);

select ok(
  exists (
    select 1
    from public.vw_admin_user_lookup
    where email = 'tenant-admin@tenant-a.local'
      and full_name = 'Tenant Admin'
  ),
  'lookup expõe nome e email legiveis do usuario existente'
);

select ok(
  not exists (
    select 1
    from information_schema.columns as cols
    where cols.table_schema = 'public'
      and cols.table_name = 'vw_admin_user_lookup'
      and cols.column_name in ('avatar_url', 'locale', 'timezone', 'updated_at', 'created_by_user_id')
  ),
  'lookup nao expõe colunas sensiveis ou irrelevantes para memberships'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (select count(*)::integer from public.vw_admin_user_lookup),
  0,
  'tenant_admin nao acessa o lookup global de usuarios'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is(
  (select count(*)::integer from public.vw_admin_user_lookup),
  0,
  'usuario comum nao acessa o lookup global de usuarios'
);

select throws_ok(
  $$
    select id
    from public.profiles
    limit 1
  $$,
  '42501',
  'permission denied for table profiles',
  'authenticated continua sem SELECT direto na tabela base profiles'
);

select * from finish();
rollback;
