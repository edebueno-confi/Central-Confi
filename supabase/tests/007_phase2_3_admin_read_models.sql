create extension if not exists pgtap with schema extensions;

begin;

select plan(27);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_admin_tenants_list',
        'vw_admin_tenant_detail',
        'vw_admin_tenant_memberships',
        'vw_admin_audit_feed'
      )
  ),
  4,
  'authenticated possui SELECT nas quatro views contratuais do Admin Console'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_tenants_list',
        'vw_admin_tenant_detail',
        'vw_admin_tenant_memberships',
        'vw_admin_audit_feed'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  4,
  'views administrativas usam security_barrier como hardening explicito'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_tenants_list',
        'vw_admin_tenant_detail',
        'vw_admin_tenant_memberships',
        'vw_admin_audit_feed'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_invoker=true'
      )
  ),
  0,
  'views administrativas nao dependem de security_invoker'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_tenants_list',
        'vw_admin_tenant_detail',
        'vw_admin_tenant_memberships',
        'vw_admin_audit_feed'
      )
      and position(
        'app_private.has_global_role(''platform_admin'''
        in pg_get_viewdef(c.oid, true)
      ) > 0
  ),
  4,
  'todas as views administrativas filtram explicitamente por platform_admin'
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
    'tenant-admin-a@tenant-a.local',
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
    'member-a@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Member A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'tenant-admin-b@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant Admin B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP admin read models'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap inicial do platform_admin permanece funcional para a fase 2.3'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'tenant-admin-view-a',
      'Tenant Admin View A LTDA',
      'Tenant Admin View A',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant A usado nas views administrativas'
);

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'tenant-admin-view-b',
      'Tenant Admin View B LTDA',
      'Tenant Admin View B',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant B usado nas views administrativas'
);

select lives_ok(
  $$
    select public.rpc_admin_update_tenant_status(
      (
        select id
        from public.tenants
        where slug = 'tenant-admin-view-b'
      ),
      'suspended'
    )
  $$,
  'platform_admin suspende tenant B para auditoria administrativa'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-admin-view-a'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_admin no tenant A'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-admin-view-a'),
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
      'tenant_viewer',
      'active'
    )
  $$,
  'platform_admin adiciona membro adicional no tenant A'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'tenant-admin-view-b'),
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_admin no tenant B'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select lives_ok(
  $$
    select public.rpc_admin_create_tenant_contact(
      (select id from public.tenants where slug = 'tenant-admin-view-a'),
      'Contato Tenant A',
      'contato@tenant-a.local',
      '+55 11 99999-0000',
      'Operacoes',
      true,
      true,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )
  $$,
  'tenant_admin cria contato no proprio tenant para detalhamento da view'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenants_list
  ),
  2,
  'platform_admin le globalmente a lista contratual de tenants'
);

select is(
  (
    select active_membership_count
    from public.vw_admin_tenants_list
    where slug = 'tenant-admin-view-a'
  ),
  2,
  'lista contratual agrega memberships ativos do tenant A'
);

select is(
  (
    select status::text
    from public.vw_admin_tenants_list
    where slug = 'tenant-admin-view-b'
  ),
  'suspended',
  'lista contratual reflete o status atualizado do tenant B'
);

select is(
  (
    select contact_count
    from public.vw_admin_tenant_detail
    where slug = 'tenant-admin-view-a'
  ),
  1,
  'detalhe contratual do tenant agrega contatos vinculados'
);

select ok(
  exists (
    select 1
    from public.vw_admin_tenant_detail as v
    cross join lateral jsonb_array_elements(v.contacts) as contact(item)
    where v.slug = 'tenant-admin-view-a'
      and contact.item ->> 'full_name' = 'Contato Tenant A'
      and contact.item ->> 'linked_user_email' = 'tenant-admin-a@tenant-a.local'
  ),
  'detalhe contratual preserva payload legivel do contato vinculado'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenant_memberships
    where tenant_slug = 'tenant-admin-view-a'
  ),
  2,
  'view contratual de memberships lista membros do tenant A'
);

select ok(
  exists (
    select 1
    from public.vw_admin_tenant_memberships
    where tenant_slug = 'tenant-admin-view-a'
      and user_email = 'tenant-admin-a@tenant-a.local'
      and role = 'tenant_admin'::public.tenant_role
  ),
  'view contratual de memberships expõe role e email do membro'
);

select ok(
  exists (
    select 1
    from public.vw_admin_audit_feed
    where entity_table = 'user_global_roles'
      and action = 'insert'
      and after_state ->> 'user_id' = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and after_state ->> 'role' = 'platform_admin'
  ),
  'audit feed contratual inclui o bootstrap do primeiro platform_admin'
);

select ok(
  exists (
    select 1
    from public.vw_admin_audit_feed
    where entity_table = 'tenants'
      and action = 'update'
      and after_state ->> 'status' = 'suspended'
      and tenant_slug = 'tenant-admin-view-b'
  ),
  'audit feed contratual inclui update administrativo de tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenants_list
  ),
  0,
  'tenant_admin nao acessa a lista global do Admin Console'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenant_detail
    where slug = 'tenant-admin-view-b'
  ),
  0,
  'tenant_admin nao recebe detalhe cross-tenant pela view administrativa'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenant_memberships
    where tenant_slug = 'tenant-admin-view-a'
  ),
  0,
  'tenant_admin nao acessa memberships do Admin Console nem no proprio tenant'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_audit_feed
  ),
  0,
  'tenant_admin nao acessa feed administrativo de auditoria'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenants_list
  ),
  0,
  'membro comum nao acessa a lista contratual de tenants administrativos'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_tenant_memberships
    where tenant_slug = 'tenant-admin-view-a'
  ),
  0,
  'membro comum nao recebe memberships administrativas nem do proprio tenant'
);

select * from finish();
rollback;
