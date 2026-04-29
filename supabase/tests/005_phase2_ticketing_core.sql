create extension if not exists pgtap with schema extensions;

begin;

select plan(27);

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
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'viewer-a@tenant-a.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Viewer A"}'::jsonb,
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
    'tenant_requester',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'tenant_viewer',
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
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
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
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'Contato Requester B',
    'requester-b@tenant-b.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

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
  'requester do tenant A cria ticket no proprio tenant'
);

select ok(
  (
    select ticket_a_id is not null
    from test_ticket_ids
  ),
  'ticket A criado fica persistido para os testes seguintes'
);

select is(
  (
    select count(*)::integer
    from public.vw_tickets_list
  ),
  1,
  'tenant A nao le tickets do tenant B pela view de lista'
);

select throws_ok(
  $$
    select count(*)
    from public.tickets
  $$,
  '42501',
  'permission denied for table tickets',
  'app autenticado nao acessa tabela base de tickets diretamente'
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
    update test_ticket_ids
    set ticket_b_id = (select id from created)
  $$,
  'requester do tenant B cria ticket no proprio tenant'
);

select ok(
  (
    select ticket_b_id is not null
    from test_ticket_ids
  ),
  'ticket B criado fica persistido para os testes seguintes'
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
    from public.vw_ticket_detail
    where id = (select ticket_b_id from test_ticket_ids)
  ),
  0,
  'views respeitam RLS e escondem detalhe do ticket de outro tenant'
);

select throws_ok(
  $$
    select public.rpc_add_ticket_message(
      (select ticket_b_id from test_ticket_ids),
      'Mensagem indevida cross-tenant'
    )
  $$,
  'P0001',
  'rpc_add_ticket_message denied',
  'tenant A nao escreve em ticket do tenant B'
);

select throws_ok(
  $$
    select public.rpc_add_internal_ticket_note(
      (select ticket_a_id from test_ticket_ids),
      'Nota interna indevida'
    )
  $$,
  'P0001',
  'rpc_add_internal_ticket_note denied',
  'usuario comum nao cria nota interna'
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
    from public.vw_tickets_list
  ),
  1,
  'suporte interno acessa apenas tickets do tenant permitido'
);

select throws_ok(
  $$
    select public.rpc_update_ticket_status(
      (select ticket_a_id from test_ticket_ids),
      'not_real'::public.ticket_status
    )
  $$,
  '22P02',
  'invalid input value for enum ticket_status: "not_real"',
  'status invalido e bloqueado pelo enum'
);

select throws_ok(
  $$
    select public.rpc_close_ticket(
      (select ticket_a_id from test_ticket_ids),
      'Fechamento indevido'
    )
  $$,
  'P0001',
  'ticket must be resolved before close',
  'transicao invalida para fechamento e bloqueada'
);

select throws_ok(
  $$
    select public.rpc_assign_ticket(
      (select ticket_a_id from test_ticket_ids),
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
    )
  $$,
  'P0001',
  'rpc_assign_ticket denied',
  'assignment indevido para usuario nao interno e bloqueado'
);

select is(
  (
    public.rpc_update_ticket_status(
      (select ticket_a_id from test_ticket_ids),
      'triage',
      'Classificacao inicial'
    )
  ).status::text,
  'triage',
  'suporte altera status valido'
);

select is(
  (
    public.rpc_assign_ticket(
      (select ticket_a_id from test_ticket_ids),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )
  ).assigned_to_user_id::text,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'suporte atribui ticket a operador interno valido'
);

select is(
  (
    public.rpc_add_internal_ticket_note(
      (select ticket_a_id from test_ticket_ids),
      'Nota interna de triagem'
    )
  ).visibility::text,
  'internal',
  'suporte adiciona nota interna'
);

select is(
  (
    public.rpc_add_ticket_message(
      (select ticket_a_id from test_ticket_ids),
      'Resposta publica ao ticket'
    )
  ).visibility::text,
  'customer',
  'mensagem publica e registrada via RPC'
);

select is(
  (
    public.rpc_update_ticket_status(
      (select ticket_a_id from test_ticket_ids),
      'resolved',
      'Problema resolvido'
    )
  ).status::text,
  'resolved',
  'ticket pode ser resolvido por suporte interno'
);

select is(
  (
    public.rpc_close_ticket(
      (select ticket_a_id from test_ticket_ids),
      'Cliente validou resolucao'
    )
  ).status::text,
  'closed',
  'rpc_close_ticket fecha ticket resolvido'
);

select is(
  (
    public.rpc_reopen_ticket(
      (select ticket_a_id from test_ticket_ids),
      'Cliente pediu nova analise'
    )
  ).status::text,
  'waiting_support',
  'rpc_reopen_ticket reabre ticket fechado'
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
    from public.vw_ticket_timeline
    where ticket_id = (select ticket_a_id from test_ticket_ids)
      and visibility = 'internal'
  ),
  0,
  'usuario comum nao acessa nota interna indevida pela timeline'
);

select ok(
  (
    select assigned_to_user_id is null
    from public.vw_ticket_detail
    where id = (select ticket_a_id from test_ticket_ids)
  ),
  'detalhe do ticket esconde assigned_to_user_id para perfil externo'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select ok(
  (
    select exists (
      select 1
      from public.vw_ticket_timeline
      where ticket_id = (select ticket_a_id from test_ticket_ids)
        and visibility = 'internal'
    )
  ),
  'suporte interno acessa nota interna pela timeline'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tickets'
      and al.action = 'insert'
      and al.after_state ->> 'title' = 'Ticket A'
  ),
  'auditoria gerada para create de ticket'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'tickets'
      and al.action = 'update'
      and al.after_state ->> 'status' = 'waiting_support'
  ),
  'auditoria gerada para update de status do ticket'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'ticket_messages'
      and al.action = 'insert'
      and al.actor_user_id in (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
      )
  ),
  'auditoria gerada para mensagens e notas'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as al
    where al.entity_table = 'ticket_events'
      and al.action = 'insert'
      and al.after_state ->> 'event_type' in (
        'ticket_created',
        'status_changed',
        'assigned',
        'message_added',
        'internal_note_added',
        'resolved',
        'closed',
        'reopened'
      )
  ),
  'auditoria gerada para eventos do ticket'
);

select * from finish();
rollback;
