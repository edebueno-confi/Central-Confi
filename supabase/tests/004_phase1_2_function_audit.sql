create extension if not exists pgtap with schema extensions;

begin;

select plan(9);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname in ('public', 'app_private', 'audit')
      and p.proacl is null
  ),
  0,
  'todas as funcoes auditadas possuem ACL explicita'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname in ('public', 'app_private', 'audit')
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as cfg
        where cfg = 'search_path=""'
      )
  ),
  0,
  'toda funcao SECURITY DEFINER possui search_path fixo'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname like 'rpc_%'
  ),
  29,
  'as 29 RPCs expostas existem como funcoes SECURITY DEFINER controladas'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not like 'rpc_%'
  ),
  0,
  'nao existe SECURITY DEFINER exposta fora das RPCs controladas'
);

select is(
  (
    with allowed as (
      select unnest(array[
        'current_user_id',
        'has_global_role',
        'has_any_global_role',
        'has_tenant_role',
        'is_active_tenant_member',
        'can_manage_membership_role',
        'can_create_ticket',
        'can_manage_ticket',
        'can_view_internal_ticket_content',
        'can_assign_ticket',
        'can_access_support_workspace',
        'can_manage_knowledge_base',
        'can_manage_multi_brand_foundation',
        'can_read_knowledge_article'
      ]) as proname
    ),
    grants as (
      select
        p.proname,
        a.grantee
      from pg_proc as p
      join pg_namespace as n
        on n.oid = p.pronamespace
      left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
        on true
      where n.nspname = 'app_private'
    )
    select count(*)::integer
    from grants
    where grantee in (
      select oid from pg_roles where rolname in ('anon', 'authenticated')
      union all
      select 0
    )
      and proname not in (select proname from allowed)
  ),
  0,
  'nenhuma funcao privada alem do allowlist fica exposta a anon/authenticated/public'
);

select is(
  (
    with grants as (
      select
        p.proname,
        a.grantee
      from pg_proc as p
      join pg_namespace as n
        on n.oid = p.pronamespace
      left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
        on true
      where n.nspname = 'audit'
    )
    select count(*)::integer
    from grants
    where grantee in (
      select oid from pg_roles where rolname in ('anon', 'authenticated')
      union all
      select 0
    )
  ),
  0,
  'nenhuma funcao do schema audit esta exposta a anon/authenticated/public'
);

select is(
  (
    with grants as (
      select
        p.proname,
        a.grantee
      from pg_proc as p
      join pg_namespace as n
        on n.oid = p.pronamespace
      left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
        on true
      where n.nspname = 'public'
        and p.proname like 'rpc_%'
    )
    select count(distinct proname)::integer
    from grants
    where grantee = (select oid from pg_roles where rolname = 'authenticated')
  ),
  29,
  'authenticated recebe execute em todas as RPCs expostas e somente por grant explicito'
);

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
  'authenticated nao possui SELECT direto nas tabelas base de ticketing'
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
  'authenticated possui SELECT apenas nas views contratuais de ticketing'
);

select * from finish();
rollback;
