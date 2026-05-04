create extension if not exists pgtap with schema extensions;

begin;

select plan(22);

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
    'admin@customer-account.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Customer Account Admin"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'support-manager@customer-account.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Manager A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'support-agent@customer-account.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent A"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'support-agent-b@customer-account.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'regular-user@customer-account.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Regular User"}'::jsonb,
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
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'platform_admin', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'support_manager', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'support_agent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'support_agent', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into public.tenants (
  id,
  slug,
  legal_name,
  display_name,
  status,
  created_by_user_id,
  updated_by_user_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'customer-account-a',
    'Customer Account A LTDA',
    'Customer Account A',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'customer-account-b',
    'Customer Account B LTDA',
    'Customer Account B',
    'active',
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
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'tenant_viewer', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('11111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'tenant_viewer', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'tenant_viewer', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'tenant_viewer', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

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
  ('30000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', null, 'Contato Operacional A', 'operacional-a@customer-account.local', true, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('30000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', null, 'Contato Tecnico A', 'tecnico-a@customer-account.local', false, true, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

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
  (
    '10000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000001',
    'Ticket A1',
    'Descricao A1',
    'portal',
    'in_progress',
    'high',
    'medium',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );

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
  (
    '40000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '10000000-0000-4000-8000-000000000001',
    'ticket_created',
    'customer',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '{}'::jsonb,
    timezone('utc', now()) - interval '20 minutes'
  );

select ok(
  has_table_privilege('authenticated', 'public.vw_support_customer_account_context', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_admin_customer_account_profiles', 'SELECT'),
  'authenticated recebe SELECT apenas nas views contratuais do customer account profile'
);

select ok(
  not has_table_privilege('authenticated', 'public.customer_account_profiles', 'SELECT')
  and not has_table_privilege('authenticated', 'public.customer_account_integrations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.customer_account_features', 'SELECT')
  and not has_table_privilege('authenticated', 'public.customer_account_customizations', 'SELECT')
  and not has_table_privilege('authenticated', 'public.customer_account_alerts', 'SELECT'),
  'authenticated nao recebe SELECT direto nas tabelas base do customer account profile'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select throws_ok(
  $$
    insert into public.customer_account_profiles (
      tenant_id,
      product_line,
      operational_status,
      account_tier,
      operational_flags,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'genius_returns'::public.customer_product_line,
      'active'::public.customer_operational_status,
      'gold',
      '{}'::jsonb,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )
  $$,
  'permission denied for table customer_account_profiles',
  'authenticated nao escreve diretamente em customer_account_profiles'
);

select throws_ok(
  $$
    select public.rpc_admin_upsert_customer_account_profile(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'genius_returns'::public.customer_product_line,
      'active'::public.customer_operational_status,
      'gold',
      'nota operacional',
      '{"high_touch_account": true}'::jsonb,
      '[]'::jsonb
    )
  $$,
  'customer account admin required',
  'support_manager nao usa RPC administrativa de escrita'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_upsert_customer_account_profile(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'genius_returns'::public.customer_product_line,
      'active'::public.customer_operational_status,
      'enterprise',
      'Conta com fluxo customizado e janela controlada.',
      '{"high_touch_account": true, "custom_operational_flow": true}'::jsonb,
      '[
        {"feature_key":"returns_portal","enabled":true,"source":"contract","notes":"Modulo principal habilitado"},
        {"feature_key":"refund_manual_review","enabled":true,"source":"operations","notes":"Aprovacao manual em casos sensiveis"}
      ]'::jsonb
    )
  $$,
  'platform_admin materializa o profile principal com flags e features'
);

select lives_ok(
  $$
    select public.rpc_admin_add_customer_integration(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'erp'::public.customer_integration_type,
      'totvs',
      'active'::public.customer_integration_status,
      'production'::public.customer_integration_environment,
      'Integracao principal de pedidos e devolucoes.'
    )
  $$,
  'platform_admin cria integracao resumida segura'
);

select lives_ok(
  $$
    select public.rpc_admin_add_customer_customization(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Fluxo de coleta prioritaria',
      'Cliente exige tratamento diferenciado para coletas de alto valor.',
      'high'::public.customer_customization_risk_level,
      'Conferir janela operacional antes de responder tickets de coleta.',
      'active'
    )
  $$,
  'platform_admin cria customizacao operacional auditada'
);

select lives_ok(
  $$
    select public.rpc_admin_add_customer_account_alert(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'warning'::public.customer_alert_severity,
      'Janela de ERP reduzida',
      'Evitar tratativas fora da janela homologada do ERP do cliente.',
      timezone('utc', now()) + interval '2 days'
    )
  $$,
  'platform_admin cria alerta operacional ativo'
);

select is(
  (
    select integrations_count
    from public.vw_admin_customer_account_profiles
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  1,
  'view administrativa agrega integracoes do tenant'
);

select is(
  (
    select features_count
    from public.vw_admin_customer_account_profiles
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  2,
  'view administrativa agrega features habilitadas do tenant'
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
    from public.vw_support_customer_account_context
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  1,
  'support_manager le o contexto operacional do tenant permitido'
);

select is(
  (
    select jsonb_array_length(enabled_features)
    from public.vw_support_customer_account_context
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  2,
  'support_manager recebe recorte operacional de features habilitadas'
);

select is(
  (
    select count(*)::integer
    from public.vw_admin_customer_account_profiles
  ),
  0,
  'support_manager nao enxerga a view administrativa do dominio'
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
    from public.vw_support_customer_account_context
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  'support_agent de outro tenant nao recebe contexto cross-tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select is(
  (
    select count(*)::integer
    from public.vw_support_customer_account_context
  ),
  0,
  'usuario comum nao le o customer account context'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vw_support_customer_account_context'
      and column_name in ('created_by_user_id', 'updated_by_user_id', 'created_at', 'updated_at')
  ),
  0,
  'view de suporte nao vaza colunas administrativas de auditoria'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select throws_ok(
  $$
    select public.rpc_admin_add_customer_integration(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'custom_api'::public.customer_integration_type,
      'custom-provider',
      'planned'::public.customer_integration_status,
      'sandbox'::public.customer_integration_environment,
      'Endpoint interno https://internal.local/token=abc'
    )
  $$,
  'customer account field "integration_notes" contains restricted content',
  'RPC bloqueia conteudo sensivel em notes de integracao'
);

select throws_ok(
  $$
    select public.rpc_admin_upsert_customer_account_profile(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'genius_returns'::public.customer_product_line,
      'active'::public.customer_operational_status,
      'enterprise',
      'Conta segura',
      '{"unexpected_flag": true}'::jsonb,
      null
    )
  $$,
  'customer account operational_flags invalid',
  'RPC bloqueia operational_flags fora do shape permitido'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as audit_log
    where audit_log.entity_schema = 'public'
      and audit_log.entity_table = 'customer_account_profiles'
      and audit_log.action in ('insert', 'update')
      and audit_log.tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'upsert do profile gera audit log'
);

select lives_ok(
  $$
    select public.rpc_admin_archive_customer_account_alert(
      (
        select (alerts -> 0 ->> 'id')::uuid
        from public.vw_admin_customer_account_profiles
        where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
      )
    )
  $$,
  'platform_admin arquiva alerta operacional sem delete fisico'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as audit_log
    where audit_log.entity_schema = 'public'
      and audit_log.entity_table = 'customer_account_alerts'
      and audit_log.action = 'update'
      and audit_log.tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'archive de alerta gera audit log de update'
);

select is(
  (
    select jsonb_array_length(active_alerts)
    from public.vw_support_customer_account_context
    where tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  0,
  'contexto de suporte remove alerta arquivado do recorte operacional'
);

select * from finish();
rollback;
