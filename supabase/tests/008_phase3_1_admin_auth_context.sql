create extension if not exists pgtap with schema extensions;

begin;

select plan(15);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name = 'vw_admin_auth_context'
  ),
  1,
  'authenticated possui SELECT na view contratual de auth context'
);

select ok(
  exists (
    select 1
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vw_admin_auth_context'
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  'vw_admin_auth_context usa security_barrier como hardening explicito'
);

select ok(
  not exists (
    select 1
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vw_admin_auth_context'
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_invoker=true'
      )
  ),
  'vw_admin_auth_context nao depende de security_invoker'
);

select ok(
  position('auth.uid()' in pg_get_viewdef('public.vw_admin_auth_context'::regclass, true)) > 0,
  'vw_admin_auth_context filtra explicitamente pelo auth.uid()'
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
    'support-agent@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'inactive-user@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Inactive User"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP auth context'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap inicial do platform_admin permanece funcional para auth context'
);

insert into public.user_global_roles (user_id, role)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'support_agent'::public.platform_role);

update public.profiles
set is_active = false
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (select count(*)::integer from public.vw_admin_auth_context),
  1,
  'platform_admin recebe exatamente uma linha no auth context'
);

select is(
  (select id::text from public.vw_admin_auth_context),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'platform_admin recebe apenas o proprio profile'
);

select is(
  (select full_name from public.vw_admin_auth_context),
  'Platform Admin',
  'auth context expõe full_name do actor autenticado'
);

select ok(
  (select roles @> array['platform_admin'::public.platform_role] from public.vw_admin_auth_context),
  'auth context expõe array de roles globais do platform_admin'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (select count(*)::integer from public.vw_admin_auth_context),
  1,
  'usuario interno nao-admin tambem recebe uma unica linha propria'
);

select ok(
  (select roles @> array['support_agent'::public.platform_role] from public.vw_admin_auth_context),
  'auth context expõe roles globais do proprio usuario autenticado'
);

select ok(
  not exists (
    select 1
    from public.vw_admin_auth_context
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  'usuario autenticado nao consegue ler auth context de outro usuario'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is(
  (select count(*)::integer from public.vw_admin_auth_context),
  1,
  'profile inativo continua resolvido no auth context para o proprio usuario'
);

select is(
  (select is_active from public.vw_admin_auth_context),
  false,
  'auth context preserva status is_active para gate explicito do frontend'
);

select is(
  coalesce(array_length((select roles from public.vw_admin_auth_context), 1), 0),
  0,
  'usuario sem role global recebe array vazio de roles'
);

select * from finish();
rollback;
