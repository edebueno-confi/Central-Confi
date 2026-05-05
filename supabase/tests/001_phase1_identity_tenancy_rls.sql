create extension if not exists pgtap with schema extensions;

begin;

select plan(10);

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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'alice@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alice Tenant A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'bob@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Bob Tenant B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  (select count(*)::integer from public.profiles),
  3,
  'sync auth.users -> profiles materializa todos os perfis'
);

insert into public.user_global_roles (
  user_id,
  role,
  created_by_user_id,
  updated_by_user_id
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'platform_admin',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
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
    '11111111-1111-1111-1111-111111111111',
    'tenant-a',
    'Tenant A LTDA',
    'Tenant A',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'tenant-b',
    'Tenant B LTDA',
    'Tenant B',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
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
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'tenant_manager',
    'active',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'tenant_viewer',
    'active',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
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
    '11111111-1111-1111-1111-111111111111',
    'Contato A',
    'contato-a@tenant-a.local',
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Contato B',
    'contato-b@tenant-b.local',
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  );

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select is(
  (select count(*)::integer from public.tenants),
  1,
  'Alice enxerga apenas o tenant vinculado'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated nao possui SELECT direto em public.profiles'
);

select is(
  (select count(*)::integer from public.vw_admin_auth_context),
  1,
  'Alice resolve apenas o proprio auth context pela view contratual'
);

select is(
  (select count(*)::integer from public.tenant_contacts),
  1,
  'Alice enxerga apenas contatos do tenant A'
);

select is(
  (select count(*)::integer from public.tenant_memberships),
  1,
  'Alice enxerga apenas o proprio membership'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select is(
  (select count(*)::integer from public.tenants),
  1,
  'Bob enxerga apenas o tenant B'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*)::integer from public.tenants),
  2,
  'Platform admin enxerga todos os tenants'
);

select ok(
  (
    select count(*)::integer
    from audit.audit_logs as al
    where al.entity_table = 'tenant_contacts'
      and al.action = 'insert'
  ) = 2,
  'Auditoria registra os inserts iniciais de tenant_contacts'
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
  'Audit log rejeita mutacao direta'
);

select * from finish();
rollback;
