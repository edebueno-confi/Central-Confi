create extension if not exists pgtap with schema extensions;

begin;

select plan(32);

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
    'platform-admin@ticket-kb.local',
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
    'support-manager-a@ticket-kb.local',
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
    'support-agent-a@ticket-kb.local',
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
    'support-agent-b@ticket-kb.local',
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
    'regular-user@ticket-kb.local',
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
    'ticket-kb-tenant-a',
    'Ticket KB Tenant A LTDA',
    'Ticket KB Tenant A',
    'active',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'ticket-kb-tenant-b',
    'Ticket KB Tenant B LTDA',
    'Ticket KB Tenant B',
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
  ('22222222-2222-4222-8222-222222222222', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'tenant_viewer', 'active', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

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
    '30000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    null,
    'Contato Operacional A',
    'operacional-a@ticket-kb.local',
    true,
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  );

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
    'Ticket KB A1',
    'Cliente precisa de contexto de base de conhecimento para uma tratativa.',
    'portal',
    'in_progress',
    'high',
    'medium',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );

select ok(
  has_table_privilege('authenticated', 'public.vw_support_ticket_knowledge_links', 'SELECT')
  and has_table_privilege('authenticated', 'public.vw_support_knowledge_article_picker', 'SELECT')
  and not has_table_privilege('authenticated', 'public.vw_customer_portal_ticket_knowledge_links', 'SELECT'),
  'authenticated recebe apenas as views internas contratuais do vinculo ticket kb'
);

select ok(
  not has_table_privilege('authenticated', 'public.ticket_knowledge_links', 'SELECT'),
  'authenticated nao recebe SELECT direto na tabela base ticket_knowledge_links'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Publico Tenant A',
      'publico-tenant-a',
      'Categoria publica do tenant A',
      'public',
      null,
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  'platform_admin cria categoria publica tenant-scoped'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Interno Tenant A',
      'interno-tenant-a',
      'Categoria interna do tenant A',
      'internal',
      null,
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  'platform_admin cria categoria interna tenant-scoped'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Restrito Tenant A',
      'restrito-tenant-a',
      'Categoria restrita do tenant A',
      'restricted',
      null,
      '11111111-1111-4111-8111-111111111111'::uuid
    )
  $$,
  'platform_admin cria categoria restrita tenant-scoped'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_category(
      'Interno Tenant B',
      'interno-tenant-b',
      'Categoria interna do tenant B',
      'internal',
      null,
      '22222222-2222-4222-8222-222222222222'::uuid
    )
  $$,
  'platform_admin cria categoria interna tenant B'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Artigo publico publicado',
      'artigo-publico-publicado',
      'Resumo publico seguro.',
      'Corpo markdown publico.',
      (select id from public.vw_admin_knowledge_categories where slug = 'publico-tenant-a'),
      'public',
      '11111111-1111-4111-8111-111111111111'::uuid,
      null,
      null
    )
  $$,
  'platform_admin cria artigo publico'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Artigo interno publicado',
      'artigo-interno-publicado',
      'Resumo interno tenant A.',
      'Corpo markdown interno.',
      (select id from public.vw_admin_knowledge_categories where slug = 'interno-tenant-a'),
      'internal',
      '11111111-1111-4111-8111-111111111111'::uuid,
      null,
      null
    )
  $$,
  'platform_admin cria artigo interno'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Artigo restrito publicado',
      'artigo-restrito-publicado',
      'Resumo restrito tenant A.',
      'Corpo markdown restrito.',
      (select id from public.vw_admin_knowledge_categories where slug = 'restrito-tenant-a'),
      'restricted',
      '11111111-1111-4111-8111-111111111111'::uuid,
      null,
      null
    )
  $$,
  'platform_admin cria artigo restrito'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Artigo interno tenant B',
      'artigo-interno-tenant-b',
      'Resumo interno tenant B.',
      'Corpo markdown interno tenant B.',
      (select id from public.vw_admin_knowledge_categories where slug = 'interno-tenant-b'),
      'internal',
      '22222222-2222-4222-8222-222222222222'::uuid,
      null,
      null
    )
  $$,
  'platform_admin cria artigo interno tenant B'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-publico-publicado')
    )
  $$,
  'artigo publico vai para review'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-interno-publicado')
    )
  $$,
  'artigo interno tenant A vai para review'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-restrito-publicado')
    )
  $$,
  'artigo restrito vai para review'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-interno-tenant-b')
    )
  $$,
  'artigo interno tenant B vai para review'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-publico-publicado')
    )
  $$,
  'artigo publico e publicado'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-interno-publicado')
    )
  $$,
  'artigo interno tenant A e publicado'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-restrito-publicado')
    )
  $$,
  'artigo restrito e publicado'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-interno-tenant-b')
    )
  $$,
  'artigo interno tenant B e publicado'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

update public.knowledge_spaces
set status = 'active'
where slug = 'genius';

update public.knowledge_categories
set knowledge_space_id = (select id from public.knowledge_spaces where slug = 'genius')
where slug in (
  'publico-tenant-a',
  'interno-tenant-a',
  'restrito-tenant-a',
  'interno-tenant-b'
)
  and knowledge_space_id is null;

update public.knowledge_articles
set knowledge_space_id = (select id from public.knowledge_spaces where slug = 'genius')
where slug in (
  'artigo-publico-publicado',
  'artigo-interno-publicado',
  'artigo-restrito-publicado',
  'artigo-interno-tenant-b'
)
  and knowledge_space_id is null;

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select throws_ok(
  $$
    select * from public.ticket_knowledge_links
  $$,
  'permission denied for table ticket_knowledge_links',
  'authenticated nao le ticket_knowledge_links diretamente'
);

select lives_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      (select article_id from public.vw_support_knowledge_article_picker where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid and article_slug = 'artigo-publico-publicado'),
      'sent_to_customer'::public.ticket_knowledge_link_type,
      'Encaminhar este artigo publico como resposta oficial.'
    )
  $$,
  'support_manager cria vinculo sent_to_customer com artigo public published'
);

select lives_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      (select article_id from public.vw_support_knowledge_article_picker where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid and article_slug = 'artigo-interno-publicado'),
      'reference_internal'::public.ticket_knowledge_link_type,
      'Referencia interna para orientar o atendimento.'
    )
  $$,
  'support_manager cria referencia interna com artigo interno legivel'
);

select lives_ok(
  $$
    select public.rpc_support_mark_documentation_gap(
      '10000000-0000-4000-8000-000000000001'::uuid,
      'Falta documentacao operacional para este caso.'
    )
  $$,
  'documentation_gap funciona sem article_id'
);

select lives_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      null,
      'suggested_article'::public.ticket_knowledge_link_type,
      'Criar artigo enxuto com passo a passo desse incidente recorrente.'
    )
  $$,
  'suggested_article funciona sem article_id'
);

select throws_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      (select article_id from public.vw_support_knowledge_article_picker where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid and article_slug = 'artigo-interno-publicado'),
      'sent_to_customer'::public.ticket_knowledge_link_type,
      'Tentativa invalida com artigo interno.'
    )
  $$,
  'ticket knowledge link sent_to_customer requires public published article',
  'sent_to_customer bloqueia artigo internal'
);

select throws_ok(
  $$
    select public.rpc_support_mark_article_needs_update(
      '10000000-0000-4000-8000-000000000001'::uuid,
      null,
      'Sem artigo alvo nao deve passar.'
    )
  $$,
  'ticket knowledge article is required for needs_update',
  'needs_update nao funciona sem article_id'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select throws_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-restrito-publicado'),
      'sent_to_customer'::public.ticket_knowledge_link_type,
      'Tentativa invalida com artigo restrito.'
    )
  $$,
  'ticket knowledge link sent_to_customer requires public published article',
  'platform_admin tambem nao envia artigo restricted ao cliente'
);

select throws_ok(
  $$
    select public.rpc_support_link_ticket_article(
      '10000000-0000-4000-8000-000000000001'::uuid,
      (select id from public.vw_admin_knowledge_articles_list where slug = 'artigo-interno-tenant-b'),
      'reference_internal'::public.ticket_knowledge_link_type,
      'Referencia cruzada indevida entre tenants.'
    )
  $$,
  'ticket knowledge cross-tenant article denied',
  'cross-tenant internal e bloqueado mesmo para actor com visibilidade global'
);

select throws_ok(
  $$
    select public.rpc_support_mark_documentation_gap(
      '10000000-0000-4000-8000-000000000001'::uuid,
      'Detalhar source_hash e endpoint https://internal.local/token=abc'
    )
  $$,
  'ticket knowledge field "note" contains restricted content',
  'note sensivel e sanitizada antes de persistir'
);

select lives_ok(
  $$
    select public.rpc_support_archive_ticket_article_link(
      (
        select ticket_knowledge_link_id
        from public.vw_support_ticket_knowledge_links
        where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid
          and link_type = 'reference_internal'::public.ticket_knowledge_link_type
        order by created_at asc
        limit 1
      )
    )
  $$,
  'archive logico funciona para vinculo ativo'
);

select ok(
  exists (
    select 1
    from audit.audit_logs as audit_log
    where audit_log.entity_schema = 'public'
      and audit_log.entity_table = 'ticket_knowledge_links'
      and audit_log.action = 'insert'
      and audit_log.tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  )
  and exists (
    select 1
    from audit.audit_logs as audit_log
    where audit_log.entity_schema = 'public'
      and audit_log.entity_table = 'ticket_knowledge_links'
      and audit_log.action = 'update'
      and audit_log.tenant_id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'create e archive geram audit log'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

select is(
  (
    select count(*)::integer
    from public.vw_customer_portal_ticket_knowledge_links
    where ticket_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'portal future view expone apenas o artigo realmente enviado ao cliente'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vw_customer_portal_ticket_knowledge_links'
      and column_name = 'note'
  ),
  0,
  'portal future view nao expoe note interna'
);

select * from finish();
rollback;
