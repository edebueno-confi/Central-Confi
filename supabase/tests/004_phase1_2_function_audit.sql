create extension if not exists pgtap with schema extensions;

begin;

select plan(7);

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
      and p.proname like 'rpc_admin_%'
  ),
  7,
  'as 7 RPCs administrativas existem como funcoes SECURITY DEFINER expostas'
);

select is(
  (
    select count(*)::integer
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not like 'rpc_admin_%'
  ),
  0,
  'nao existe SECURITY DEFINER exposta fora do control plane administrativo'
);

select is(
  (
    with allowed as (
      select unnest(array[
        'current_user_id',
        'has_global_role',
        'has_tenant_role',
        'is_active_tenant_member',
        'can_manage_membership_role'
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
        and p.proname like 'rpc_admin_%'
    )
    select count(distinct proname)::integer
    from grants
    where grantee = (select oid from pg_roles where rolname = 'authenticated')
  ),
  7,
  'authenticated recebe execute em todas as RPCs administrativas e somente por grant explicito'
);

select * from finish();
rollback;
