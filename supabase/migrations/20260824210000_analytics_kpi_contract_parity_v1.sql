-- ANALYTICS-KPI-CONTRACT-PARITY-2026-08-24
-- Candidato versionado local. Não aplicar automaticamente: o histórico/schema
-- local está sob gate fail-closed e qualquer aplicação exige preflight aprovado.
--
-- Esta migration preserva os wrappers legados de quatro argumentos e adiciona
-- overloads de seis argumentos. O consumidor só usa os overloads quando o
-- contrato estiver aplicado no ambiente alvo.
-- As CTEs também aplicam a elegibilidade canônica. O wrapper apenas configura
-- o contexto; ele não substitui o predicado server-side.

begin;

create or replace function public.rpc_analytics_commercial_kpis_v2_filtered(
  p_from date,
  p_to date,
  p_owner_id text default null,
  p_stage_id text default null,
  p_excluded_pipeline_ids text[] default '{}'::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_version text;
begin
  if not app_private.can_read_analytics() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select calculation_version into v_version from public.analytics_kpi_settings where id;
  v_version := coalesce(v_version, 'kpi_v1');

  with scoped as (
    select
      d.deal_id,
      d.owner_id,
      d.amount_home,
      d.hs_created_at,
      d.hs_closed_at,
      d.pipeline_id,
      s.is_closed,
      s.is_won,
      s.label as stage_label,
      s.display_order,
      s.stage_id,
      nullif(s.metadata ->> 'probability', '')::numeric as stage_probability
    from public.hubspot_deals d
    join public.analytics_source_config c
      on c.object_type = 'deal'
     and c.hubspot_pipeline_id = d.pipeline_id
     and c.is_active
     and not coalesce(c.is_archived, false)
    join public.hubspot_pipeline_stages s
      on s.object_type = 'deal'
     and s.pipeline_id = d.pipeline_id
     and s.stage_id = d.dealstage
    where (p_owner_id is null or d.owner_id = p_owner_id)
      and (p_stage_id is null or d.dealstage = p_stage_id)
      and not coalesce(d.pipeline_id = any(p_excluded_pipeline_ids), false)
      and app_private.analytics_pipeline_operation_eligible(
        'deal',
        c.hubspot_pipeline_id,
        current_setting('app.analytics_group_company', true),
        'commercial'
      )
  ),
  -- Coorte "aberto agora": independe do período selecionado.
  open_now as (
    select
      count(*)::integer as open_deals,
      round(coalesce(sum(amount_home), 0)::numeric, 2) as open_amount,
      round(sum(amount_home * stage_probability)
              filter (where stage_probability is not null)::numeric, 2) as weighted_amount,
      count(*) filter (where stage_probability is not null)::integer as with_probability
    from scoped
    where not coalesce(is_closed, false)
  ),
  -- Coorte "criado no período".
  created_cohort as (
    select count(*)::integer as created_deals,
           round(coalesce(sum(amount_home), 0)::numeric, 2) as created_amount
    from scoped
    where hs_created_at is not null
      and hs_created_at::date between p_from and p_to
  ),
  -- Coorte "fechado no período". Win rate, ticket médio e ciclo usam esta.
  closed_cohort as (
    select
      count(*) filter (where is_won)::integer as won_deals,
      count(*) filter (where is_closed and not is_won)::integer as lost_deals,
      round(coalesce(sum(amount_home) filter (where is_won), 0)::numeric, 2) as won_amount,
      round(avg(amount_home) filter (where is_won)::numeric, 2) as avg_won_amount,
      round(percentile_cont(0.5) within group (
        order by amount_home
      ) filter (where is_won)::numeric, 2) as median_won_amount,
      round(percentile_cont(0.5) within group (
        order by extract(epoch from (hs_closed_at - hs_created_at)) / 86400.0
      ) filter (where is_won and hs_created_at is not null)::numeric, 1) as median_cycle_days,
      round(avg(extract(epoch from (hs_closed_at - hs_created_at)) / 86400.0)
              filter (where is_won and hs_created_at is not null)::numeric, 1) as avg_cycle_days
    from scoped
    where is_closed
      and hs_closed_at is not null
      and hs_closed_at::date between p_from and p_to
  ),
  by_owner as (
    select coalesce(jsonb_agg(row_to_json(o) order by o.won_amount desc nulls last), '[]'::jsonb) as payload
    from (
      select
        coalesce(sc.owner_id, '_unassigned') as owner_id,
        coalesce(ow.full_name, 'Sem responsável') as owner_name,
        count(*) filter (where not coalesce(sc.is_closed, false))::integer as open_deals,
        round(coalesce(sum(sc.amount_home) filter (where not coalesce(sc.is_closed, false)), 0)::numeric, 2) as open_amount,
        count(*) filter (
          where sc.is_won and sc.hs_closed_at::date between p_from and p_to
        )::integer as won_deals,
        count(*) filter (
          where sc.is_closed and not sc.is_won and sc.hs_closed_at::date between p_from and p_to
        )::integer as lost_deals,
        round(coalesce(sum(sc.amount_home) filter (
          where sc.is_won and sc.hs_closed_at::date between p_from and p_to
        ), 0)::numeric, 2) as won_amount,
        app_private.kpi_ratio(
          count(*) filter (where sc.is_won and sc.hs_closed_at::date between p_from and p_to),
          nullif(count(*) filter (
            where sc.is_closed and sc.hs_closed_at::date between p_from and p_to
          ), 0)
        ) as win_rate,
        round(percentile_cont(0.5) within group (
          order by extract(epoch from (sc.hs_closed_at - sc.hs_created_at)) / 86400.0
        ) filter (
          where sc.is_won and sc.hs_created_at is not null
            and sc.hs_closed_at::date between p_from and p_to
        )::numeric, 1) as median_cycle_days
      from scoped sc
      left join public.hubspot_owners ow on ow.owner_id = sc.owner_id
      group by 1, 2
    ) o
  ),
  funnel as (
    select coalesce(jsonb_agg(row_to_json(f) order by f.display_order nulls last), '[]'::jsonb) as payload
    from (
      select
        sc.stage_id,
        sc.stage_label,
        sc.display_order,
        count(*) filter (where not coalesce(sc.is_closed, false))::integer as open_deals,
        round(coalesce(sum(sc.amount_home) filter (where not coalesce(sc.is_closed, false)), 0)::numeric, 2) as open_amount,
        sc.stage_probability
      from scoped sc
      group by 1, 2, 3, 6
    ) f
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'source', 'hubspot',
      'calculation_version', v_version,
      'freshness_at', (select max(synced_at) from public.hubspot_deals),
      'period_from', p_from,
      'period_to', p_to,
      'coverage_percent', app_private.kpi_ratio(o.with_probability, nullif(o.open_deals, 0)),
      'is_partial', o.with_probability < o.open_deals,
      'warning_codes', case
        when o.with_probability < o.open_deals
          then jsonb_build_array('weighted_pipeline_partial_coverage')
        else '[]'::jsonb
      end
    ),
    'kpis', jsonb_build_object(
      'open_pipeline_amount', app_private.kpi_entry(nullif(o.open_amount, 0), 'stage_open_now'),
      'open_deals', app_private.kpi_entry(nullif(o.open_deals, 0)::numeric, 'stage_open_now'),
      'weighted_pipeline_amount', app_private.kpi_entry(
        o.weighted_amount, 'stage_open_now',
        case when o.with_probability = 0 then 'unavailable'
             when o.with_probability < o.open_deals then 'partial'
             else 'available' end,
        case when o.with_probability = 0 then 'stage_probability_missing'
             when o.with_probability < o.open_deals then 'stage_probability_partial'
             else null end
      ),
      'created_deals', app_private.kpi_entry(cr.created_deals::numeric, 'deal_created_at'),
      'created_amount', app_private.kpi_entry(nullif(cr.created_amount, 0), 'deal_created_at'),
      'won_deals', app_private.kpi_entry(cc.won_deals::numeric, 'deal_closed_at'),
      'lost_deals', app_private.kpi_entry(cc.lost_deals::numeric, 'deal_closed_at'),
      'won_amount', app_private.kpi_entry(nullif(cc.won_amount, 0), 'deal_closed_at'),
      'win_rate', app_private.kpi_entry(
        app_private.kpi_ratio(cc.won_deals, nullif(cc.won_deals + cc.lost_deals, 0)),
        'deal_closed_at', 'available', 'no_closed_deals_in_period'
      ),
      'avg_deal_amount', app_private.kpi_entry(cc.avg_won_amount, 'deal_closed_at'),
      'median_deal_amount', app_private.kpi_entry(cc.median_won_amount, 'deal_closed_at'),
      'median_sales_cycle_days', app_private.kpi_entry(cc.median_cycle_days, 'deal_closed_at'),
      'avg_sales_cycle_days', app_private.kpi_entry(cc.avg_cycle_days, 'deal_closed_at'),
      'stage_aging_days', app_private.kpi_entry(
        null, 'deal_stage_entered_at', 'awaiting_history', 'history_insufficient'
      ),
      'stage_conversion_rate', app_private.kpi_entry(
        null, 'deal_stage_transition', 'awaiting_history', 'history_insufficient'
      )
    ),
    'by_owner', bo.payload,
    'funnel', fn.payload
  )
  into v_result
  from open_now o
  cross join created_cohort cr
  cross join closed_cohort cc
  cross join by_owner bo
  cross join funnel fn;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.rpc_analytics_support_kpis_v2_filtered(
  p_from date,
  p_to date,
  p_stage_id text default null,
  p_priority text default null,
  p_excluded_pipeline_ids text[] default '{}'::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_version text;
  v_buckets integer[];
begin
  if not app_private.can_read_analytics() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select calculation_version, backlog_aging_hours
    into v_version, v_buckets
  from public.analytics_kpi_settings where id;
  v_version := coalesce(v_version, 'kpi_v1');
  v_buckets := coalesce(v_buckets, array[4, 24, 72, 168]);

  with scoped as (
    select
      t.ticket_id,
      t.pipeline_id,
      t.pipeline_stage,
      t.owner_id,
      t.source_type,
      t.priority,
      t.hs_created_at,
      t.hs_closed_at,
      t.time_to_first_response_sla_status,
      t.time_to_close_sla_status,
      coalesce(s.metadata ->> 'ticketState', '') = 'OPEN' as is_open,
      s.label as stage_label,
      s.display_order,
      c.label as pipeline_label,
      c.hubspot_pipeline_label
    from public.hubspot_tickets t
    join public.analytics_source_config c
      on c.object_type = 'ticket'
     and c.hubspot_pipeline_id = t.pipeline_id
     and c.is_active
     and not coalesce(c.is_archived, false)
    join public.hubspot_pipeline_stages s
      on s.object_type = 'ticket'
     and s.pipeline_id = t.pipeline_id
     and s.stage_id = t.pipeline_stage
    where (p_stage_id is null or t.pipeline_stage = p_stage_id)
      and not coalesce(t.pipeline_id = any(p_excluded_pipeline_ids), false)
      and (p_priority is null or t.priority = p_priority)
      and app_private.analytics_pipeline_operation_eligible(
        'ticket',
        c.hubspot_pipeline_id,
        current_setting('app.analytics_group_company', true),
        'support'
      )
  ),
  backlog as (
    select
      count(*) filter (where is_open)::integer as open_tickets,
      count(*) filter (where is_open and hs_created_at is not null)::integer as open_with_date,
      round(percentile_cont(0.5) within group (
        order by extract(epoch from (timezone('utc', now()) - hs_created_at)) / 86400.0
      ) filter (where is_open)::numeric, 1) as median_backlog_age_days
    from scoped
  ),
  received as (
    select count(*)::integer as created_tickets
    from scoped
    where hs_created_at is not null
      and hs_created_at::date between p_from and p_to
  ),
  close_coverage as (
    select
      count(*) filter (where not is_open)::integer as closed_stage_tickets,
      count(*) filter (where not is_open and hs_closed_at is not null)::integer as closed_with_date
    from scoped
  ),
  sla as (
    select
      count(*) filter (
        where nullif(btrim(coalesce(time_to_first_response_sla_status, '')), '') is not null
      )::integer as frt_sla_rows,
      count(*) filter (
        where nullif(btrim(coalesce(time_to_close_sla_status, '')), '') is not null
      )::integer as close_sla_rows,
      count(*)::integer as total_rows
    from scoped
  ),
  aging as (
    select coalesce(jsonb_agg(row_to_json(a) order by a.sort_order), '[]'::jsonb) as payload
    from (
      select bucket, sort_order, count(*)::integer as tickets
      from (
        select
          case
            when hours < v_buckets[1] then '< ' || v_buckets[1] || 'h'
            when hours < v_buckets[2] then v_buckets[1] || '-' || v_buckets[2] || 'h'
            when hours < v_buckets[3] then v_buckets[2] || 'h-' || (v_buckets[3] / 24) || 'd'
            when hours < v_buckets[4] then (v_buckets[3] / 24) || '-' || (v_buckets[4] / 24) || 'd'
            else '> ' || (v_buckets[4] / 24) || 'd'
          end as bucket,
          case
            when hours < v_buckets[1] then 1
            when hours < v_buckets[2] then 2
            when hours < v_buckets[3] then 3
            when hours < v_buckets[4] then 4
            else 5
          end as sort_order
        from (
          select extract(epoch from (timezone('utc', now()) - hs_created_at)) / 3600.0 as hours
          from scoped
          where is_open and hs_created_at is not null
        ) h
      ) b
      group by bucket, sort_order
    ) a
  ),
  by_priority as (
    select coalesce(jsonb_agg(row_to_json(p) order by p.open_tickets desc), '[]'::jsonb) as payload
    from (
      select
        coalesce(priority, '_unset') as priority,
        count(*) filter (where is_open)::integer as open_tickets,
        count(*) filter (
          where hs_created_at::date between p_from and p_to
        )::integer as created_tickets
      from scoped group by 1
    ) p
  ),
  by_source as (
    select coalesce(jsonb_agg(row_to_json(s) order by s.open_tickets desc), '[]'::jsonb) as payload
    from (
      select
        coalesce(nullif(btrim(coalesce(source_type, '')), ''), '_unset') as source_type,
        count(*) filter (where is_open)::integer as open_tickets,
        count(*) filter (
          where hs_created_at::date between p_from and p_to
        )::integer as created_tickets
      from scoped group by 1
    ) s
  ),
  by_owner as (
    select coalesce(jsonb_agg(row_to_json(o) order by o.open_tickets desc), '[]'::jsonb) as payload
    from (
      select
        coalesce(sc.owner_id, '_unassigned') as owner_id,
        coalesce(ow.full_name, 'Sem responsável') as owner_name,
        count(*) filter (where sc.is_open)::integer as open_tickets,
        count(*) filter (
          where sc.hs_created_at::date between p_from and p_to
        )::integer as created_tickets
      from scoped sc
      left join public.hubspot_owners ow on ow.owner_id = sc.owner_id
      group by 1, 2
    ) o
  ),
  by_pipeline as (
    select coalesce(jsonb_agg(row_to_json(p) order by p.open_tickets desc), '[]'::jsonb) as payload
    from (
      select
        pipeline_id,
        coalesce(pipeline_label, hubspot_pipeline_label, 'Sem nome') as pipeline_label,
        count(*) filter (where is_open)::integer as open_tickets,
        count(*) filter (
          where hs_created_at::date between p_from and p_to
        )::integer as created_tickets
      from scoped group by 1, 2
    ) p
  ),
  history as (
    select count(distinct snapshot_date)::integer as days
    from public.analytics_kpi_daily_snapshot
    where metric_key = 'support_backlog_open'
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'source', 'hubspot',
      'calculation_version', v_version,
      'freshness_at', (select max(synced_at) from public.hubspot_tickets),
      'period_from', p_from,
      'period_to', p_to,
      'coverage_percent', app_private.kpi_ratio(sl.close_sla_rows, nullif(sl.total_rows, 0)),
      'is_partial', true,
      'history_days', h.days,
      'warning_codes', jsonb_build_array(
        'ticket_close_date_missing',
        'ticket_first_response_missing',
        'associations_missing'
      ) || case
        when sl.close_sla_rows = 0 then jsonb_build_array('sla_unavailable')
        else jsonb_build_array('sla_partial_coverage')
      end
    ),
    'kpis', jsonb_build_object(
      'created_tickets', app_private.kpi_entry(rc.created_tickets::numeric, 'ticket_created_at'),
      'open_backlog', app_private.kpi_entry(bl.open_tickets::numeric, 'ticket_state_open_now'),
      'median_backlog_age_days', app_private.kpi_entry(bl.median_backlog_age_days, 'ticket_created_at'),
      -- Bloqueados por ausência de closedate na conta. Ver cabeçalho.
      'resolved_tickets', app_private.kpi_entry(
        null, 'ticket_closed_at', 'unavailable', 'ticket_close_date_missing'
      ),
      'median_time_to_resolution_days', app_private.kpi_entry(
        null, 'ticket_closed_at', 'unavailable', 'ticket_close_date_missing'
      ),
      'median_first_response_hours', app_private.kpi_entry(
        null, 'ticket_first_response_at', 'unavailable', 'ticket_first_response_missing'
      ),
      'first_response_sla_coverage_percent', app_private.kpi_entry(
        app_private.kpi_ratio(sl.frt_sla_rows, nullif(sl.total_rows, 0)),
        'ticket_sla_status',
        case when sl.frt_sla_rows = 0 then 'unavailable' else 'partial' end,
        case when sl.frt_sla_rows = 0 then 'sla_unavailable' else 'sla_partial_coverage' end
      ),
      'close_sla_coverage_percent', app_private.kpi_entry(
        app_private.kpi_ratio(sl.close_sla_rows, nullif(sl.total_rows, 0)),
        'ticket_sla_status',
        case when sl.close_sla_rows = 0 then 'unavailable' else 'partial' end,
        case when sl.close_sla_rows = 0 then 'sla_unavailable' else 'sla_partial_coverage' end
      ),
      'reopen_rate', app_private.kpi_entry(
        null, 'ticket_stage_transition', 'awaiting_history', 'history_insufficient'
      ),
      'historic_backlog', app_private.kpi_entry(
        null, 'ticket_state_open_at_date', 'awaiting_history',
        case when h.days > 1 then null else 'history_insufficient' end
      )
    ),
    'aging', ag.payload,
    'by_priority', bp.payload,
    'by_source', bs.payload,
    'by_owner', bo.payload,
    'by_pipeline', bpi.payload,
    'close_date_coverage', jsonb_build_object(
      'closed_stage_tickets', cvg.closed_stage_tickets,
      'closed_with_date', cvg.closed_with_date
    )
  )
  into v_result
  from backlog bl
  cross join received rc
  cross join close_coverage cvg
  cross join sla sl
  cross join aging ag
  cross join by_priority bp
  cross join by_source bs
  cross join by_owner bo
  cross join by_pipeline bpi
  cross join history h;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;


comment on function public.rpc_analytics_commercial_kpis_v2_filtered(date, date, text, text, text[]) is
  'Candidato local: KPIs comerciais com operação, estágio e exclusões de pipeline explícitos; mantém o contrato de saída V2.';
comment on function public.rpc_analytics_support_kpis_v2_filtered(date, date, text, text, text[]) is
  'Candidato local: KPIs de suporte com operação, estágio e exclusões de pipeline explícitos; mantém o contrato de saída V2.';

create or replace function public.rpc_analytics_commercial_kpis_by_operation(
  p_from date,
  p_to date,
  p_owner_id text,
  p_stage_id text,
  p_excluded_pipeline_ids text[],
  p_group_company text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform app_private.set_analytics_operation_scope(p_group_company);
  return public.rpc_analytics_commercial_kpis_v2_filtered(
    p_from,
    p_to,
    p_owner_id,
    p_stage_id,
    coalesce(p_excluded_pipeline_ids, '{}'::text[])
  );
end;
$function$;

create or replace function public.rpc_analytics_support_kpis_by_operation(
  p_from date,
  p_to date,
  p_stage_id text,
  p_priority text,
  p_excluded_pipeline_ids text[],
  p_group_company text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform app_private.set_analytics_operation_scope(p_group_company);
  return public.rpc_analytics_support_kpis_v2_filtered(
    p_from,
    p_to,
    p_stage_id,
    p_priority,
    coalesce(p_excluded_pipeline_ids, '{}'::text[])
  );
end;
$function$;

revoke all on function public.rpc_analytics_commercial_kpis_v2_filtered(date, date, text, text, text[]) from public, anon;
revoke all on function public.rpc_analytics_support_kpis_v2_filtered(date, date, text, text, text[]) from public, anon;
grant execute on function public.rpc_analytics_commercial_kpis_v2_filtered(date, date, text, text, text[]) to authenticated, service_role;
grant execute on function public.rpc_analytics_support_kpis_v2_filtered(date, date, text, text, text[]) to authenticated, service_role;

revoke all on function public.rpc_analytics_commercial_kpis_by_operation(date, date, text, text, text[], text) from public, anon;
revoke all on function public.rpc_analytics_support_kpis_by_operation(date, date, text, text, text[], text) from public, anon;
grant execute on function public.rpc_analytics_commercial_kpis_by_operation(date, date, text, text, text[], text) to authenticated, service_role;
grant execute on function public.rpc_analytics_support_kpis_by_operation(date, date, text, text, text[], text) to authenticated, service_role;

comment on function public.rpc_analytics_commercial_kpis_by_operation(date, date, text, text, text[], text) is
  'KPIs comerciais no recorte de operação com owner, estágio e exclusões de pipeline; operação é filtro de leitura, não permissão.';
comment on function public.rpc_analytics_support_kpis_by_operation(date, date, text, text, text[], text) is
  'KPIs de suporte no recorte de operação com estágio, prioridade e exclusões de pipeline; operação é filtro de leitura, não permissão.';

notify pgrst, 'reload schema';

commit;
