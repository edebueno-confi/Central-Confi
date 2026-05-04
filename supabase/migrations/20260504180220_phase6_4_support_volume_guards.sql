create or replace view public.vw_support_ticket_timeline_recent
with (security_barrier = true)
as
  with support_visible as (
    select
      tl.*
    from public.vw_ticket_timeline as tl
    where app_private.can_access_support_workspace(tl.tenant_id)
  ),
  ranked as (
    select
      tl.*,
      row_number() over (
        partition by tl.ticket_id
        order by tl.occurred_at desc, tl.timeline_entry_id desc
      )::integer as recent_rank,
      count(*) over (
        partition by tl.ticket_id
      )::integer as total_available_count
    from support_visible as tl
  )
  select
    tl.ticket_id,
    tl.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    tl.timeline_entry_id,
    tl.entry_type,
    tl.visibility,
    tl.occurred_at,
    tl.actor_user_id,
    actor.full_name as actor_full_name,
    actor.email as actor_email,
    tl.message_id,
    tl.event_id,
    tl.event_type,
    tl.assignment_id,
    tl.body,
    tl.metadata,
    tl.recent_rank,
    tl.total_available_count,
    25::integer as recent_limit,
    (tl.total_available_count > 25) as has_more
  from ranked as tl
  join public.tenants as t
    on t.id = tl.tenant_id
  left join public.profiles as actor
    on actor.id = tl.actor_user_id
  where tl.recent_rank <= 25;

create or replace view public.vw_support_customer_recent_tickets
with (security_barrier = true)
as
  with ranked as (
    select
      q.*,
      row_number() over (
        partition by q.tenant_id
        order by q.updated_at desc, lower(q.title), q.id desc
      )::integer as recent_rank,
      count(*) over (
        partition by q.tenant_id
      )::integer as total_available_count
    from public.vw_support_tickets_queue as q
  )
  select
    q.tenant_id,
    q.tenant_slug,
    q.tenant_display_name,
    q.tenant_legal_name,
    q.id,
    q.title,
    q.status,
    q.priority,
    q.severity,
    q.assigned_to_user_id,
    q.assigned_to_full_name,
    q.updated_at,
    q.recent_rank,
    q.total_available_count,
    6::integer as recent_limit,
    (q.total_available_count > 6) as has_more
  from ranked as q
  where q.recent_rank <= 6;

create or replace view public.vw_support_customer_recent_events
with (security_barrier = true)
as
  with support_visible as (
    select
      tl.ticket_id,
      tl.tenant_id,
      tl.tenant_slug,
      tl.tenant_display_name,
      tl.visibility,
      tl.occurred_at,
      tl.actor_user_id,
      tl.actor_full_name,
      tl.actor_email,
      coalesce(tl.event_type, 'message_added'::public.ticket_event_type) as event_type,
      coalesce(tl.body, coalesce(tl.event_type::text, 'message_added')) as body,
      tk.title as ticket_title
    from public.vw_support_ticket_timeline as tl
    join public.tickets as tk
      on tk.id = tl.ticket_id
     and tk.tenant_id = tl.tenant_id
  ),
  ranked as (
    select
      tl.*,
      row_number() over (
        partition by tl.tenant_id
        order by tl.occurred_at desc, tl.ticket_id desc
      )::integer as recent_rank,
      count(*) over (
        partition by tl.tenant_id
      )::integer as total_available_count
    from support_visible as tl
  )
  select
    tl.tenant_id,
    tl.tenant_slug,
    tl.tenant_display_name,
    tl.ticket_id,
    tl.ticket_title,
    tl.event_type,
    tl.visibility,
    tl.occurred_at,
    tl.actor_user_id,
    tl.actor_full_name,
    tl.actor_email,
    tl.body,
    tl.recent_rank,
    tl.total_available_count,
    8::integer as recent_limit,
    (tl.total_available_count > 8) as has_more
  from ranked as tl
  where tl.recent_rank <= 8;

create or replace view public.vw_support_customer_360
with (security_barrier = true)
as
  with accessible_tenants as (
    select
      t.id,
      t.slug,
      t.display_name,
      t.legal_name,
      t.status,
      t.created_at,
      t.updated_at
    from public.tenants as t
    where app_private.can_access_support_workspace(t.id)
  ),
  status_counts as (
    select
      t.tenant_id,
      jsonb_object_agg(t.status, t.status_count order by t.status) as ticket_status_counts,
      sum(t.status_count)::integer as total_ticket_count,
      sum(t.status_count) filter (
        where t.status <> all(array['resolved', 'closed', 'cancelled']::public.ticket_status[])
      )::integer as open_ticket_count
    from (
      select
        tk.tenant_id,
        tk.status,
        count(*)::integer as status_count
      from public.tickets as tk
      join accessible_tenants as at
        on at.id = tk.tenant_id
      group by tk.tenant_id, tk.status
    ) as t
    group by t.tenant_id
  )
  select
    at.id as tenant_id,
    at.slug as tenant_slug,
    at.display_name as tenant_display_name,
    at.legal_name as tenant_legal_name,
    at.status as tenant_status,
    at.created_at as tenant_created_at,
    at.updated_at as tenant_updated_at,
    coalesce(contact_stats.active_contacts_count, 0) as active_contacts_count,
    coalesce(status_counts.total_ticket_count, 0) as total_ticket_count,
    coalesce(status_counts.open_ticket_count, 0) as open_ticket_count,
    coalesce(status_counts.ticket_status_counts, '{}'::jsonb) as ticket_status_counts,
    coalesce(contact_stats.active_contacts, '[]'::jsonb) as active_contacts,
    coalesce(recent_tickets.recent_tickets, '[]'::jsonb) as recent_tickets,
    coalesce(recent_events.recent_events, '[]'::jsonb) as recent_events
  from accessible_tenants as at
  left join lateral (
    select
      stats.active_contacts_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', stats.id,
            'full_name', stats.full_name,
            'email', stats.email,
            'is_primary', stats.is_primary,
            'linked_user_id', stats.linked_user_id,
            'created_at', stats.created_at
          )
          order by stats.is_primary desc, lower(stats.full_name), stats.created_at
        ),
        '[]'::jsonb
      ) as active_contacts
    from (
      select
        ranked.id,
        ranked.full_name,
        ranked.email,
        ranked.is_primary,
        ranked.linked_user_id,
        ranked.created_at,
        ranked.active_contacts_count
      from (
        select
          tc.id,
          tc.full_name,
          tc.email,
          tc.is_primary,
          tc.linked_user_id,
          tc.created_at,
          count(*) over ()::integer as active_contacts_count,
          row_number() over (
            order by tc.is_primary desc, lower(tc.full_name), tc.created_at
          )::integer as recent_rank
        from public.tenant_contacts as tc
        where tc.tenant_id = at.id
          and tc.is_active
      ) as ranked
      where ranked.recent_rank <= 4
    ) as stats
    group by stats.active_contacts_count
  ) as contact_stats
    on true
  left join status_counts
    on status_counts.tenant_id = at.id
  left join lateral (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', x.id,
            'title', x.title,
            'status', x.status,
            'priority', x.priority,
            'severity', x.severity,
            'assigned_to_user_id', x.assigned_to_user_id,
            'assigned_to_full_name', x.assigned_to_full_name,
            'updated_at', x.updated_at
          )
          order by x.updated_at desc, lower(x.title)
        ),
        '[]'::jsonb
      ) as recent_tickets
    from (
      select
        q.id,
        q.title,
        q.status,
        q.priority,
        q.severity,
        q.assigned_to_user_id,
        q.assigned_to_full_name,
        q.updated_at
      from public.vw_support_customer_recent_tickets as q
      where q.tenant_id = at.id
      order by q.recent_rank
    ) as x
  ) as recent_tickets
    on true
  left join lateral (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'ticket_id', x.ticket_id,
            'ticket_title', x.ticket_title,
            'event_type', x.event_type,
            'visibility', x.visibility,
            'occurred_at', x.occurred_at,
            'actor_user_id', x.actor_user_id
          )
          order by x.occurred_at desc, lower(x.ticket_title)
        ),
        '[]'::jsonb
      ) as recent_events
    from (
      select
        q.ticket_id,
        q.ticket_title,
        q.event_type,
        q.visibility,
        q.occurred_at,
        q.actor_user_id
      from public.vw_support_customer_recent_events as q
      where q.tenant_id = at.id
      order by q.recent_rank
    ) as x
  ) as recent_events
    on true;

revoke all on public.vw_support_ticket_timeline_recent from public, anon, authenticated, service_role;
revoke all on public.vw_support_customer_recent_tickets from public, anon, authenticated, service_role;
revoke all on public.vw_support_customer_recent_events from public, anon, authenticated, service_role;
revoke all on public.vw_support_customer_360 from public, anon, authenticated, service_role;

grant select on public.vw_support_ticket_timeline_recent to authenticated, service_role;
grant select on public.vw_support_customer_recent_tickets to authenticated, service_role;
grant select on public.vw_support_customer_recent_events to authenticated, service_role;
grant select on public.vw_support_customer_360 to authenticated, service_role;

comment on view public.vw_support_ticket_timeline_recent is
  'Janela recente da timeline do Support Workspace. Carrega apenas os 25 registros mais recentes por ticket, com metadados de limite para operacao.';

comment on view public.vw_support_customer_recent_tickets is
  'Recorte operacional dos tickets recentes por tenant no Support Workspace. Limita a primeira leitura a 6 tickets por tenant.';

comment on view public.vw_support_customer_recent_events is
  'Recorte operacional dos eventos e mensagens recentes por tenant no Support Workspace. Limita a primeira leitura a 8 registros por tenant.';

comment on view public.vw_support_customer_360 is
  'Read model minimo de customer 360 para suporte interno, com contatos ativos resumidos, tickets recentes, contagem por status e eventos relevantes.';
