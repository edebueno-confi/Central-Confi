create extension if not exists pgtap with schema extensions;

begin;

select plan(31);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'vw_admin_knowledge_categories',
        'vw_admin_knowledge_articles_list',
        'vw_admin_knowledge_article_detail'
      )
  ),
  3,
  'authenticated possui SELECT nas três views contratuais internas de Knowledge Base'
);

select is(
  (
    select count(*)::integer
    from information_schema.table_privileges as tp
    where tp.grantee = 'authenticated'
      and tp.privilege_type = 'SELECT'
      and tp.table_schema = 'public'
      and tp.table_name in (
        'knowledge_categories',
        'knowledge_articles',
        'knowledge_article_revisions',
        'knowledge_article_sources'
      )
  ),
  0,
  'authenticated não possui SELECT direto nas tabelas base de Knowledge Base'
);

select is(
  (
    select count(*)::integer
    from pg_class as c
    join pg_namespace as n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'vw_admin_knowledge_categories',
        'vw_admin_knowledge_articles_list',
        'vw_admin_knowledge_article_detail'
      )
      and exists (
        select 1
        from unnest(coalesce(c.reloptions, array[]::text[])) as opt
        where opt = 'security_barrier=true'
      )
  ),
  3,
  'views administrativas de Knowledge Base usam security_barrier'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'knowledge_articles'
      and policyname = 'knowledge_articles_select_readable'
  ),
  'knowledge_articles possui policy explícita de leitura'
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
    'viewer-b@tenant-b.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Viewer B"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'support-agent@genius.local',
    crypt('password', gen_salt('bf')),
    timezone('utc', now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Agent"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  );

insert into public.user_global_roles (user_id, role)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid, 'support_agent'::public.platform_role);

select is(
  app_private.bootstrap_first_platform_admin(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'pgTAP knowledge base'
  )::text,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bootstrap do primeiro platform_admin permanece funcional para Knowledge Base'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'kb-tenant-a',
      'KB Tenant A LTDA',
      'KB Tenant A',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant A para Knowledge Base'
);

select lives_ok(
  $$
    select public.rpc_admin_create_tenant(
      'kb-tenant-b',
      'KB Tenant B LTDA',
      'KB Tenant B',
      'sa-east-1'
    )
  $$,
  'platform_admin cria tenant B para Knowledge Base'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'kb-tenant-a'),
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'tenant_admin',
      'active'
    )
  $$,
  'platform_admin adiciona tenant_admin ao tenant A'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'kb-tenant-a'),
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
      'tenant_viewer',
      'active'
    )
  $$,
  'platform_admin adiciona membro comum ao tenant A'
);

select lives_ok(
  $$
    select public.rpc_admin_add_tenant_member(
      (select id from public.tenants where slug = 'kb-tenant-b'),
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
      'tenant_viewer',
      'active'
    )
  $$,
  'platform_admin adiciona membro ao tenant B'
);

select is(
  (
    public.rpc_admin_create_knowledge_category(
      'Legado Octadesk',
      'legado-octadesk',
      'Categoria raiz importada do legado',
      'internal',
      null,
      null
    )
  ).slug,
  'legado-octadesk',
  'platform_admin cria categoria global de Knowledge Base'
);

select is(
  (
    public.rpc_admin_create_knowledge_category(
      'Playbooks Tenant A',
      'playbooks-tenant-a',
      'Conteúdo interno do tenant A',
      'restricted',
      null,
      (select id from public.tenants where slug = 'kb-tenant-a')
    )
  ).tenant_id::text,
  (select id::text from public.tenants where slug = 'kb-tenant-a'),
  'platform_admin cria categoria tenant-scoped quando aplicável'
);

select is(
  (
    public.rpc_admin_create_knowledge_article_draft(
      'Perguntas frequentes públicas',
      'faq-publica',
      'Resumo público de uma operação frequente.',
      'Corpo markdown público.',
      (select id from public.vw_admin_knowledge_categories where slug = 'legado-octadesk'),
      'public',
      null,
      'raw_knowledge/octadesk_export/latest/articles/public/faq-publica',
      'hash-public-v1'
    )
  ).source_hash,
  'hash-public-v1',
  'draft inicial preserva source_hash no artigo'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'faq-publica')
    )
  $$,
  'platform_admin envia draft público para review'
);

select is(
  (
    public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'faq-publica')
    )
  ).status::text,
  'published',
  'platform_admin publica artigo em review'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Playbook interno tenant A',
      'playbook-interno-tenant-a',
      'Resumo interno do tenant A.',
      'Corpo markdown interno.',
      (select id from public.vw_admin_knowledge_categories where slug = 'playbooks-tenant-a'),
      'internal',
      (select id from public.tenants where slug = 'kb-tenant-a'),
      'raw_knowledge/octadesk_export/latest/articles/internal/playbook-a',
      'hash-internal-a-v1'
    )
  $$,
  'platform_admin cria artigo interno tenant-scoped'
);

select lives_ok(
  $$
    select public.rpc_admin_submit_knowledge_article_for_review(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'playbook-interno-tenant-a')
    )
  $$,
  'platform_admin envia artigo interno para review'
);

select lives_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'playbook-interno-tenant-a')
    )
  $$,
  'platform_admin publica artigo interno tenant-scoped'
);

select lives_ok(
  $$
    select public.rpc_admin_create_knowledge_article_draft(
      'Rascunho público',
      'rascunho-publico',
      'Ainda em elaboração.',
      'Corpo markdown de rascunho.',
      (select id from public.vw_admin_knowledge_categories where slug = 'legado-octadesk'),
      'public',
      null,
      'raw_knowledge/octadesk_export/latest/articles/public/rascunho-publico',
      'hash-draft-v1'
    )
  $$,
  'platform_admin cria artigo público ainda em draft'
);

select is(
  (
    select revision_count
    from public.vw_admin_knowledge_articles_list
    where slug = 'faq-publica'
  ),
  3,
  'lista administrativa expõe versionamento acumulado do artigo publicado'
);

select ok(
  exists (
    select 1
    from public.vw_admin_knowledge_article_detail as v
    where v.slug = 'faq-publica'
      and v.source_hash = 'hash-public-v1'
      and jsonb_array_length(v.revisions) = 3
      and jsonb_array_length(v.sources) = 1
  ),
  'detalhe administrativo preserva source_hash, revisões e trilha de origem'
);

select ok(
  (
    select count(*)::integer
    from audit.audit_logs as al
    where al.entity_table in (
      'knowledge_categories',
      'knowledge_articles',
      'knowledge_article_revisions',
      'knowledge_article_sources'
    )
  ) >= 8,
  'mutações de Knowledge Base geram trilha de auditoria'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (select count(*)::integer from public.vw_admin_knowledge_articles_list),
  0,
  'tenant_admin não acessa a lista administrativa de Knowledge Base'
);

select throws_ok(
  $$
    select public.rpc_admin_publish_knowledge_article(
      (select id from public.vw_admin_knowledge_articles_list where slug = 'rascunho-publico')
    )
  $$,
  'P0001',
  'rpc_admin_publish_knowledge_article denied',
  'publicação continua bloqueada para role não autorizada'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select is(
  (select count(*)::integer from public.vw_admin_knowledge_articles_list),
  0,
  'usuário comum não acessa a lista administrativa de Knowledge Base'
);

select is(
  app_private.can_read_knowledge_article(
    null,
    'public'::public.knowledge_visibility,
    'published'::public.knowledge_article_status
  ),
  true,
  'artigo público publicado é legível fora do escopo administrativo'
);

select is(
  app_private.can_read_knowledge_article(
    null,
    'public'::public.knowledge_visibility,
    'draft'::public.knowledge_article_status
  ),
  false,
  'draft não aparece como público'
);

select is(
  app_private.can_read_knowledge_article(
    (select id from public.tenants where slug = 'kb-tenant-a'),
    'internal'::public.knowledge_visibility,
    'published'::public.knowledge_article_status
  ),
  true,
  'membro ativo do tenant A pode ler artigo interno publicado do próprio tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select is(
  app_private.can_read_knowledge_article(
    (select id from public.tenants where slug = 'kb-tenant-a'),
    'internal'::public.knowledge_visibility,
    'published'::public.knowledge_article_status
  ),
  false,
  'isolamento multi-tenant bloqueia artigo interno de outro tenant'
);

reset role;
reset request.jwt.claim.role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select is(
  app_private.can_read_knowledge_article(
    (select id from public.tenants where slug = 'kb-tenant-a'),
    'internal'::public.knowledge_visibility,
    'published'::public.knowledge_article_status
  ),
  true,
  'ator interno global autorizado pode ler artigo interno publicado'
);

select throws_ok(
  $$
    select id
    from public.knowledge_articles
    limit 1
  $$,
  '42501',
  'permission denied for table knowledge_articles',
  'frontend autenticado continua sem SELECT direto na tabela base de artigos'
);

select * from finish();
rollback;
