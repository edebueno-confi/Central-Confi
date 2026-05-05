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
      and tp.table_name in (
        'tickets',
        'ticket_messages',
        'ticket_events',
        'ticket_assignments',
        'ticket_attachments'
      )
  ),
  0,
  'authenticated continua sem SELECT direto nas tabelas base de ticketing'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_tickets_list',
        'vw_ticket_detail',
        'vw_ticket_timeline'
      )
  ),
  3,
  'authenticated possui SELECT apenas nas tres views oficiais de ticketing'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('vw_tickets_list', 'vw_ticket_detail', 'vw_ticket_timeline')
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_invoker=true'
      )
  ),
  0,
  'views oficiais nao usam security_invoker na estrategia atual auditada'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('vw_tickets_list', 'vw_ticket_detail', 'vw_ticket_timeline')
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  3,
  'views oficiais usam security_barrier como hardening explicito'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('vw_tickets_list', 'vw_ticket_detail', 'vw_ticket_timeline')
      and position('app_private.is_active_tenant_member' in pg_get_viewdef(c.oid, true)) > 0
  ),
  3,
  'todas as views oficiais filtram tenant explicitamente por helper de membership'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('vw_tickets_list', 'vw_ticket_detail', 'vw_ticket_timeline')
      and position('app_private.can_view_internal_ticket_content' in pg_get_viewdef(c.oid, true)) > 0
  ),
  3,
  'todas as views oficiais controlam conteudo interno explicitamente'
);

create temp table test_ticket_ids (
  ticket_a_id uuid,
  ticket_b_id uuid
) on commit drop;

grant select, update on test_ticket_ids to authenticated;

insert into test_ticket_ids default values;

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
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'support_agent',
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
    'tenant-a-view-audit',
    'Tenant A View Audit LTDA',
    'Tenant A View Audit',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'tenant-b-view-audit',
    'Tenant B View Audit LTDA',
    'Tenant B View Audit',
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
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'tenant_viewer',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'tenant_requester',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Contato Requester A',
    'requester-a@tenant-a.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '22222222-2222-4222-8222-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Contato Requester B',
    'requester-b@tenant-b.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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
    update test_ticket_ids
    set ticket_a_id = (select id from created)
  $$,
  'requester do tenant A cria ticket usado na auditoria de views'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select lives_ok(
  $$
    with created as (
      select (
        public.rpc_create_ticket(
          '22222222-2222-4222-8222-222222222222'::uuid,
          'Ticket B',
          'Descricao do ticket B',
          'portal',
          'normal',
          'medium',
          '44444444-4444-4444-8444-444444444444'::uuid
        )
      ).id as id
    )
    update test_ticket_ids
    set ticket_b_id = (select id from created)
  $$,
  'requester do tenant B cria ticket isolado da auditoria de views'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_add_internal_ticket_note(
      (select ticket_a_id from test_ticket_ids),
      'Nota interna restrita'
    )
  $$,
  'suporte cria nota interna para validar ocultacao nas views'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (
    select internal_message_count
    from public.vw_tickets_list
    where id = (select ticket_a_id from test_ticket_ids)
  ),
  0,
  'lista externa nao revela contagem de mensagens internas'
);

select ok(
  not (
    select can_view_internal
    from public.vw_ticket_detail
    where id = (select ticket_a_id from test_ticket_ids)
  ),
  'detalhe externo marca explicitamente que nao pode ver conteudo interno'
);

select is(
  (
    select count(*)::integer
    from public.vw_ticket_timeline
    where ticket_id = (select ticket_a_id from test_ticket_ids)
      and visibility = 'internal'
  ),
  0,
  'timeline externa oculta entradas internas'
);

select is(
  (
    select count(*)::integer
    from public.vw_ticket_detail
    where id = (select ticket_b_id from test_ticket_ids)
  ),
  0,
  'views nao vazam detalhe cross-tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (
    select internal_message_count
    from public.vw_tickets_list
    where id = (select ticket_a_id from test_ticket_ids)
  ),
  1,
  'lista interna mostra contagem de mensagens internas para suporte'
);

select ok(
  exists (
    select 1
    from public.vw_ticket_timeline
    where ticket_id = (select ticket_a_id from test_ticket_ids)
      and visibility = 'internal'
      and body = 'Nota interna restrita'
  ),
  'timeline interna mostra o corpo da nota interna apenas para suporte'
);

select * from finish();
rollback;
