-- Repara literais publicados por funções analíticas sem reescrever dados de
-- origem. A migration preserva a definição vigente e troca somente fallbacks
-- conhecidos, evitando regressão nas regras de escopo e nos contratos.
do $$
declare
  v_definition text;
  v_signature regprocedure;
  v_signatures regprocedure[] := array[
    'public.rpc_analytics_ceo_snapshot_legacy(date,date)'::regprocedure,
    'public.rpc_analytics_customer_success_kpis_v2()'::regprocedure,
    'public.rpc_analytics_support_kpis_v2(date,date,text,text)'::regprocedure
  ];
begin
  foreach v_signature in array v_signatures loop
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, 'Sem responsÃ¡vel', 'Sem responsável');
    v_definition := replace(v_definition, 'Sem responsavel', 'Sem responsável');
    execute v_definition;
  end loop;
end;
$$;

comment on function public.rpc_analytics_customer_success_kpis_v2() is
  'KPIs de Customer Success com fallbacks UTF-8 íntegros; valores por cliente só são publicados quando o vínculo HubSpot↔OMIE é identificável.';
