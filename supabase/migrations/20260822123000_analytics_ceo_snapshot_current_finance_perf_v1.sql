-- O snapshot executivo publica a posição financeira atual. A tabela mantém
-- histórico para auditoria, mas a leitura do dashboard deve usar somente a
-- versão corrente; sem esse predicado o índice parcial de estado corrente não
-- pode ser usado e o custo cresce a cada sincronização.

do $migration$
declare
  v_definition text;
  v_marker text;
begin
  select pg_get_functiondef('public.rpc_analytics_ceo_snapshot(date,date)'::regprocedure)
    into v_definition;

  v_marker := 'where r.source_key = ''omie_receivables_api''' || chr(10)
    || '    and (p_to is null or coalesce(r.due_date, r.issued_date) <= p_to)';

  if position(v_marker in v_definition) = 0 then
    raise exception 'Contrato inesperado de rpc_analytics_ceo_snapshot: predicado financeiro não localizado';
  end if;

  v_definition := replace(
    v_definition,
    v_marker,
    'where r.source_key = ''omie_receivables_api''' || chr(10)
      || '    and r.is_current' || chr(10)
      || '    and (p_to is null or coalesce(r.due_date, r.issued_date) <= p_to)'
  );

  execute v_definition;
end;
$migration$;

comment on function public.rpc_analytics_ceo_snapshot(date, date) is
  'Read model executivo API-only: posição financeira usa somente títulos correntes e preserva o histórico fora da leitura operacional.';
