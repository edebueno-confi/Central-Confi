create extension if not exists pgtap with schema extensions;

begin;

select plan(11);

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
    'tenant-user@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Tenant User"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'support-b@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent B"}'::jsonb,
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
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
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
    '22222222-2222-4222-8222-222222222222',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
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
  ('30000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', null, 'Contato A1', 'a1@tenant-a.local', true, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', null, 'Contato A2', 'a2@tenant-a.local', false, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', null, 'Contato A3', 'a3@tenant-a.local', false, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', null, 'Contato A4', 'a4@tenant-a.local', false, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', null, 'Contato A5', 'a5@tenant-a.local', false, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', null, 'Contato B1', 'b1@tenant-b.local', true, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into public.tickets (
  id,
  tenant_id,
  requester_contact_id,
  title,
  description,
  source,
  status,
  priority,
  severity,
  created_by_user_id,
  assigned_to_user_id,
  updated_by_user_id
)
values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000001', 'Ticket A1', 'Descricao A1', 'portal', 'in_progress', 'high', 'medium', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000002', 'Ticket A2', 'Descricao A2', 'portal', 'triage', 'normal', 'low', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000003', 'Ticket A3', 'Descricao A3', 'portal', 'new', 'normal', 'low', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000004', 'Ticket A4', 'Descricao A4', 'portal', 'waiting_customer', 'urgent', 'critical', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000005', 'Ticket A5', 'Descricao A5', 'portal', 'waiting_support', 'low', 'low', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000001', 'Ticket A6', 'Descricao A6', 'portal', 'resolved', 'normal', 'medium', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000002', 'Ticket A7', 'Descricao A7', 'portal', 'waiting_support', 'normal', 'medium', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('10000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', '30000000-0000-4000-8000-000000000003', 'Ticket A8', 'Descricao A8', 'portal', 'cancelled', 'normal', 'low', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', null, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('20000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', '30000000-0000-4000-8000-000000000006', 'Ticket B1', 'Descricao B1', 'portal', 'new', 'normal', 'low', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  ('20000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '30000000-0000-4000-8000-000000000006', 'Ticket B2', 'Descricao B2', 'portal', 'waiting_support', 'high', 'high', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', null, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

insert into public.ticket_events (
  id,
  tenant_id,
  ticket_id,
  event_type,
  visibility,
  actor_user_id,
  metadata,
  occurred_at
)
select
  ('40000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  case when mod(gs, 2) = 0 then 'status_changed'::public.ticket_event_type else 'message_added'::public.ticket_event_type end,
  case when mod(gs, 5) = 0 then 'internal'::public.message_visibility else 'customer'::public.message_visibility end,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  jsonb_build_object('fixture_index', gs),
  timezone('utc', now()) - make_interval(mins => 80 - gs)
from generate_series(1, 14) as gs;

insert into public.ticket_messages (
  id,
  tenant_id,
  ticket_id,
  visibility,
  body,
  created_by_user_id,
  metadata,
  created_at,
  updated_at
)
select
  ('50000000-0000-4000-8000-' || lpad(gs::text, 12, '0'))::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  case when mod(gs, 4) = 0 then 'internal'::public.message_visibility else 'customer'::public.message_visibility end,
  format('Mensagem %s do fixture de volume', gs),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  jsonb_build_object('fixture_index', gs),
  timezone('utc', now()) - make_interval(mins => 40 - gs),
  timezone('utc', now()) - make_interval(mins => 40 - gs)
from generate_series(1, 14) as gs;

insert into public.ticket_events (
  id,
  tenant_id,
  ticket_id,
  event_type,
  visibility,
  actor_user_id,
  metadata,
  occurred_at
)
values
  ('60000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'ticket_created', 'customer', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{}'::jsonb, timezone('utc', now()) - interval '15 minutes'),
  ('60000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000002', 'status_changed', 'internal', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{"status":"waiting_support"}'::jsonb, timezone('utc', now()) - interval '10 minutes');

select ok(
  has_table_privilege('authenticated', 'public.vw_support_ticket_timeline_recent', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_customer_recent_tickets', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_customer_recent_events', 'SELECT'),
  'authenticated recebe SELECT nas views recentes de suporte'
);

select ok(
  not has_table_privilege('authenticated', 'public.ticket_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ticket_messages', 'SELECT'),
  'authenticated continua sem SELECT direto nas tabelas base usadas pelos recortes recentes'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (
    select count(*)::integer
    from public.vw_support_ticket_timeline_recent
    where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  25,
  'timeline recente limita a primeira leitura a 25 registros por ticket'
);

select ok(
  (
    select bool_and(has_more)
    from public.vw_support_ticket_timeline_recent
    where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  'timeline recente sinaliza quando existe historico adicional fora da janela inicial'
);

select is(
  (
    select max(total_available_count)
    from public.vw_support_ticket_timeline_recent
    where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  28,
  'timeline recente preserva a contagem total disponivel para o ticket'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_customer_recent_tickets
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  6,
  'customer recent tickets limita a primeira leitura a 6 tickets por tenant'
);

select is(
  (
    select count(*)::integer
    from public.vw_support_customer_recent_events
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  8,
  'customer recent events limita a primeira leitura a 8 registros por tenant'
);

select is(
  (
    select active_contacts_count
    from public.vw_support_customer_360
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  5,
  'customer_360 preserva a contagem total de contatos ativos'
);

select is(
  (
    select jsonb_array_length(active_contacts)
    from public.vw_support_customer_360
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  4,
  'customer_360 reduz o preview de contatos ativos para um recorte operacional'
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
    from public.vw_support_ticket_timeline_recent
  ),
  0,
  'usuario sem role de suporte nao enxerga a timeline recente do workspace'
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
    from public.vw_support_customer_recent_tickets
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  'support_agent de outro tenant nao recebe recortes cross-tenant'
);

select * from finish();
rollback;
