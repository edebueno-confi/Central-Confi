create extension if not exists pgtap with schema extensions;

begin;

select plan(17);

create temp table test_support_ticket_ids (
  ticket_a_id uuid,
  ticket_b_id uuid
) on commit drop;

grant select, update on test_support_ticket_ids to authenticated;

insert into test_support_ticket_ids default values;

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
    'support-a@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'engineering-a@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Engineering Member A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'requester-a@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Requester A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'requester-b@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Requester B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

insert into public.user_global_roles (
  user_id,
  role,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'platform_admin',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'support_agent',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'engineering_member',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
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
    'tenant_viewer',
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
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'tenant_requester',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'tenant_requester',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

insert into public.tenant_contacts (
  id,
  tenant_id,
  linked_user_id,
  full_name,
  email,
  is_primary,
  is_active,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'Contato Requester A',
    'requester-a@tenant-a.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '33333333-3333-4333-8333-333333333334',
    '11111111-1111-4111-8111-111111111111',
    null,
    'Contato Operacional A',
    'ops-a@tenant-a.local',
    false,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'Contato Requester B',
    'requester-b@tenant-b.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

select ok(
  has_table_privilege('authenticated', 'public.vw_support_tickets_queue', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_ticket_detail', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_ticket_timeline', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_customer_360', 'SELECT'),
  'authenticated recebe SELECT nas quatro views do Support Workspace'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_support_tickets_queue',
        'vw_support_ticket_detail',
        'vw_support_ticket_timeline',
        'vw_support_customer_360'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  4,
  'views de suporte usam security_barrier como hardening explicito'
);

select ok(
  not has_table_privilege('authenticated', 'public.tickets', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ticket_messages', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ticket_events', 'SELECT'),
  'authenticated continua sem SELECT direto nas tabelas base de ticketing'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select lives_ok(
  $$
    with created as (
      select (
        public.rpc_create_ticket(
          '11111111-1111-4111-8111-111111111111'::uuid,
          'Ticket A',
          'Descricao do ticket A',
          'portal',
          'normal',
          'medium',
          '33333333-3333-4333-8333-333333333333'::uuid
        )
      ).id as id
    )
    update test_support_ticket_ids
    set ticket_a_id = (select id from created)
  $$,
  'requester do tenant A cria ticket A'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select lives_ok(
  $$
    with created as (
      select (
        public.rpc_create_ticket(
          '22222222-2222-4222-8222-222222222222'::uuid,
          'Ticket B',
          'Descricao do ticket B',
          'portal',
          'high',
          'high',
          '44444444-4444-4444-8444-444444444444'::uuid
        )
      ).id as id
    )
    update test_support_ticket_ids
    set ticket_b_id = (select id from created)
  $$,
  'requester do tenant B cria ticket B'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select lives_ok(
  $$
    select public.rpc_add_internal_ticket_note(
      (select ticket_a_id from test_support_ticket_ids),
      'Nota interna de suporte'
    )
  $$,
  'suporte interno adiciona nota interna no ticket do tenant permitido'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_tickets_queue
  ),
  1,
  'support_agent enxerga apenas a fila do tenant permitido'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_ticket_detail
    where id = (select ticket_b_id from test_support_ticket_ids)
  ),
  0,
  'support_agent nao enxerga detalhe de ticket cross-tenant'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_ticket_timeline
    where ticket_id = (select ticket_a_id from test_support_ticket_ids)
      and visibility = 'internal'
      and body = 'Nota interna de suporte'
  ),
  1,
  'support_agent enxerga nota interna na timeline do workspace'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_customer_360
  ),
  1,
  'support_agent enxerga customer_360 apenas do tenant permitido'
);

select is(
  (
    select active_contacts_count
    from public.vw_support_customer_360
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  2,
  'customer_360 agrega contatos ativos do tenant permitido'
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
    from public.vw_support_tickets_queue
  ),
  0,
  'engineering_member nao entra automaticamente na fila de suporte'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select is(
  (
    select count(*)::integer
    from public.vw_support_tickets_queue
  ),
  0,
  'usuario sem role de suporte nao enxerga fila do Support Workspace'
);

select is(
  (
    select count(*)::integer
    from public.vw_ticket_timeline
    where ticket_id = (select ticket_a_id from test_support_ticket_ids)
      and visibility = 'internal'
  ),
  0,
  'nota interna permanece protegida fora da camada de suporte para requester comum'
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
    from public.vw_support_tickets_queue
  ),
  2,
  'platform_admin enxerga a fila completa de suporte'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_customer_360
  ),
  2,
  'platform_admin enxerga o customer_360 de ambos os tenants'
);

select is(
  (
    select coalesce((ticket_status_counts ->> 'new')::integer, 0)
    from public.vw_support_customer_360
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  1,
  'customer_360 agrega contagem de tickets por status sem vazamento cross-tenant'
);

select * from finish();
rollback;
