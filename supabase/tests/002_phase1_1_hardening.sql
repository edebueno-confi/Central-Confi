create extension if not exists pgtap with schema extensions;

begin;

select plan(13);

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
    'admin@genius.local',
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
    'alice@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Tenant Manager"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'bob@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bob Tenant Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'dave@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dave Regular User"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'eve@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Eve Tenant B Viewer"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  (select count(*)::integer from public.profiles),
  5,
  'sync auth.users -> profiles continua cobrindo todos os usuarios'
);

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP bootstrap'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do primeiro platform_admin funciona uma unica vez'
);

select throws_ok(
  $$
    select app_private.bootstrap_first_platform_admin(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'segunda tentativa'
    )
  $$,
  'P0001',
  'platform_admin bootstrap already completed',
  'bootstrap falha quando ja existe platform_admin'
);

insert into public.tenants (
  id,
  slug,
  legal_name,
  display_name,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'tenant-a',
    'Tenant A LTDA',
    'Tenant A',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'tenant-b',
    'Tenant B LTDA',
    'Tenant B',
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
    'tenant_manager',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'tenant_admin',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'tenant_viewer',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

insert into public.tenant_contacts (
  tenant_id,
  full_name,
  email,
  is_primary,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Contato A',
    'contato-a@tenant-a.local',
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Contato B',
    'contato-b@tenant-b.local',
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (select count(*)::integer from public.tenant_contacts where tenant_id = '22222222-2222-4222-8222-222222222222'),
  0,
  'tenant_manager nao le contatos de outro tenant'
);

select throws_ok(
  $$
    insert into public.user_global_roles (user_id, role)
    values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'platform_admin'
    )
  $$,
  '42501',
  'permission denied for table user_global_roles',
  'tenant_manager nao faz mutacao direta em user_global_roles'
);

select throws_ok(
  $$
    insert into public.tenant_memberships (
      tenant_id,
      user_id,
      role,
      status
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'tenant_viewer',
      'invited'
    )
  $$,
  '42501',
  'permission denied for table tenant_memberships',
  'tenant_manager nao faz insert direto em membership'
);

select throws_ok(
  $$
    insert into public.tenant_contacts (
      tenant_id,
      full_name,
      email
    )
    values (
      '22222222-2222-4222-8222-222222222222',
      'Contato Indevido',
      'indevido@tenant-b.local'
    )
  $$,
  '42501',
  'permission denied for table tenant_contacts',
  'tenant_manager nao faz insert direto em tenant_contacts'
);

select lives_ok(
  $$
    update public.profiles
    set full_name = 'Alice Tenant Manager Hardened'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  $$,
  'usuario consegue editar apenas campo seguro do proprio profile'
);

select throws_ok(
  $$
    update public.profiles
    set email = 'alice-alterado@tenant-a.local'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  $$,
  'P0001',
  'profiles.email must be changed via Supabase Auth',
  'email sensivel nao pode ser alterado direto no profile'
);

select throws_ok(
  $$
    update public.profiles
    set is_active = false
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  $$,
  'P0001',
  'profiles.is_active is backend-managed',
  'status do profile nao pode ser alterado por usuario autenticado'
);

select throws_ok(
  $$
    insert into public.tenant_memberships (
      tenant_id,
      user_id,
      role,
      status
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'tenant_viewer',
      'active'
    )
  $$,
  '42501',
  'permission denied for table tenant_memberships',
  'usuario autenticado nao faz insert direto em membership'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select throws_ok(
  $$
    update audit.audit_logs
    set updated_at = timezone('utc', now())
    where id = (select id from audit.audit_logs order by id asc limit 1)
  $$,
  'P0001',
  'audit.audit_logs is append-only',
  'update em audit.audit_logs segue proibido'
);

select throws_ok(
  $$
    delete from audit.audit_logs
    where id = (select id from audit.audit_logs order by id asc limit 1)
  $$,
  'P0001',
  'audit.audit_logs is append-only',
  'delete em audit.audit_logs segue proibido'
);

select * from finish();
rollback;
