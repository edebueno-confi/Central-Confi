create extension if not exists pgtap with schema extensions;

begin;

select plan(20);

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
    'tenant-admin@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Admin A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'tenant-manager@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Manager A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'regular@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Regular User"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'viewer@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Viewer B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'authenticated',
    'authenticated',
    'new-member@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"New Member"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP admin control plane'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap inicial do platform_admin permanece funcional'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (
    public.rpc_admin_create_tenant(
      'tenant-a',
      'Tenant A LTDA',
      'Tenant A',
      'sa-east-1'
    )
  ).slug,
  'tenant-a',
  'platform_admin cria tenant via RPC'
);

select is(
  (
    public.rpc_admin_create_tenant(
      'tenant-b',
      'Tenant B LTDA',
      'Tenant B',
      'sa-east-1'
    )
  ).slug,
  'tenant-b',
  'platform_admin cria segundo tenant via RPC'
);

select is(
  (
    public.rpc_admin_update_tenant_status(
      (select id from public.tenants where slug = 'tenant-b'),
      'suspended'
    )
  ).status::text,
  'suspended',
  'platform_admin altera status de tenant via RPC'
);

select is(
  (
    public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-a'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'tenant_admin',
      'active'
    )
  ).role::text,
  'tenant_admin',
  'platform_admin adiciona tenant_admin via RPC'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-a'),
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
      'tenant_manager',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_manager via RPC'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-b'),
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,
      'tenant_viewer',
      'active'
    )
  $$,
  'platform_admin adiciona membro no tenant B via RPC'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (
    public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-a'),
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
      'tenant_viewer',
      'invited'
    )
  ).status::text,
  'invited',
  'tenant_admin opera RPC no proprio tenant'
);

select throws_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-b'),
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid,
      'tenant_viewer',
      'invited'
    )
  $$,
  'P0001',
  'rpc_admin_add_tenant_member denied',
  'tenant_admin nao opera RPC cross-tenant'
);

select is(
  (
    public.rpc_admin_update_tenant_member_status(
      (
        select id
        from public.tenant_memberships
        where tenant_id = (select id from public.tenants where slug = 'tenant-a')
          and user_id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
      ),
      'active'
    )
  ).status::text,
  'active',
  'tenant_admin atualiza status de membership no proprio tenant'
);

select is(
  (
    public.rpc_admin_create_tenant_contact(
      (select id from public.tenants where slug = 'tenant-a'),
      'Contato Tenant A',
      'contato@tenant-a.local',
      '+55 11 99999-0000',
      'Operacoes',
      true,
      true,
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
    )
  ).full_name,
  'Contato Tenant A',
  'tenant_admin cria contato no proprio tenant'
);

select is(
  (
    public.rpc_admin_update_tenant_contact(
      (
        select id
        from public.tenant_contacts
        where tenant_id = (select id from public.tenants where slug = 'tenant-a')
      ),
      'Contato Tenant A Atualizado',
      'contato@tenant-a.local',
      '+55 11 99999-1111',
      'CX',
      true,
      true,
      'ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid
    )
  ).job_title,
  'CX',
  'tenant_admin atualiza contato no proprio tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select throws_ok(
  $$
    select public.rpc_admin_create_tenant_contact(
      (select id from public.tenants where slug = 'tenant-a'),
      'Contato Indevido',
      'indevido@tenant-a.local'
    )
  $$,
  'P0001',
  'rpc_admin_create_tenant_contact denied',
  'usuario comum nao usa RPC administrativa'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select throws_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-a'),
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'P0001',
  'rpc_admin_add_tenant_member denied',
  'tenant_manager nao cria admin via RPC'
);

select throws_ok(
  $$
    select public.rpc_admin_update_tenant_member_role(
      (
        select id
        from public.tenant_memberships
        where tenant_id = (select id from public.tenants where slug = 'tenant-a')
          and user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      ),
      'tenant_admin'
    )
  $$,
  'P0001',
  'rpc_admin_update_tenant_member_role denied',
  'tenant_manager nao promove a si mesmo via RPC'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tenants'
      and al.action = 'insert'
      and al.actor_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and al.after_state ->> 'slug' = 'tenant-a'
  ),
  'auditoria gerada para criacao de tenant'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tenants'
      and al.action = 'update'
      and al.actor_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and al.after_state ->> 'status' = 'suspended'
  ),
  'auditoria gerada para update de status do tenant'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tenant_memberships'
      and al.action = 'insert'
      and al.actor_user_id in (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      )
  ),
  'auditoria gerada para criacao de membership via RPC'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tenant_memberships'
      and al.action = 'update'
      and al.actor_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      and al.after_state ->> 'status' = 'active'
  ),
  'auditoria gerada para update de membership via RPC'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tenant_contacts'
      and al.action in ('insert', 'update')
      and al.actor_user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  ),
  'auditoria gerada para mutacoes de tenant_contact via RPC'
);

select * from finish();
rollback;
