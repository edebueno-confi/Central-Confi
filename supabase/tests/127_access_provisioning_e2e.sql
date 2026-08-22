begin;

select plan(12);

select has_table(
  'public',
  'internal_organizational_screen_defaults',
  'defaults de tela por área organizacional existem'
);

select has_function(
  'app_private',
  'default_internal_screen_keys',
  'resolver privado de telas padrão existe'
);

select has_function(
  'public',
  'rpc_admin_update_internal_access_assignment',
  'RPC de atribuição continua existindo'
);

select ok(
  position('internal_area_membership_screen_grants' in pg_get_functiondef('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'atribuição materializa grants de tela'
);

select ok(
  position('default_internal_screen_keys' in pg_get_functiondef('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'atribuição consulta telas padrão governadas'
);

select ok(
  position('no default screens configured' in pg_get_functiondef('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'área sem tela padrão não vira acesso silenciosamente incompleto'
);

select ok(
  position('access profile has no screen grants' in pg_get_functiondef('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'perfil sem telas não vira acesso silenciosamente incompleto'
);

select ok(
  position('''custom''::public.internal_permission_mode' in pg_get_functiondef('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)'::regprocedure)) > 0,
  'fallback sem perfil preserva modo customizado'
);

select ok(
  not has_table_privilege('anon', 'public.internal_organizational_screen_defaults', 'select'),
  'anon não lê defaults internos'
);

select ok(
  has_function_privilege('authenticated', 'public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)', 'execute'),
  'authenticated executa a atribuição protegida'
);

select ok(
  not has_function_privilege('anon', 'public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)', 'execute'),
  'anon não executa a atribuição'
);

select is(
  (select count(*)::integer from public.internal_organizational_screen_defaults where organizational_area_key = 'commercial' and screen_key = 'analytics'),
  1,
  'Comercial possui tela padrão do Dashboard'
);

select * from finish();
rollback;
