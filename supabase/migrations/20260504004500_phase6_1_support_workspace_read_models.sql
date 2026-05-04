create or replace function app_private.can_access_support_workspace(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.has_global_role('platform_admin'::public.platform_role)
    or (
      app_private.is_active_tenant_member(target_tenant_id)
      and app_private.has_any_global_role(
        array[
          'support_agent',
          'support_manager'
        ]::public.platform_role[]
      )
    );
$$;

create or replace view public.vw_support_tickets_queue
with (security_barrier = true)
as
  with support_visible as (
    select
      q.*
    from public.vw_tickets_list as q
    where app_private.can_access_support_workspace(q.tenant_id)
  )
  select
    q.id,
    q.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    t.legal_name as tenant_legal_name,
    q.requester_contact_id,
    requester.full_name as requester_contact_full_name,
    requester.email as requester_contact_email,
    q.title,
    q.source,
    q.status,
    q.priority,
    q.severity,
    q.created_by_user_id,
    q.created_by_full_name,
    q.assigned_to_user_id,
    q.assigned_to_full_name,
    q.created_at,
    q.updated_at,
    q.resolved_at,
    q.closed_at,
    q.last_message_at,
    q.customer_message_count,
    q.internal_message_count,
    q.can_view_internal,
    q.can_add_message,
    q.can_update_status,
    q.can_add_internal_note,
    q.can_assign,
    q.can_close,
    q.can_reopen,
    (q.assigned_to_user_id is null) as is_unassigned,
    (q.status = 'waiting_customer') as is_waiting_customer,
    (q.status = 'waiting_support') as is_waiting_support,
    (q.status = 'waiting_engineering') as is_waiting_engineering
  from support_visible as q
  join public.tenants as t
    on t.id = q.tenant_id
  left join public.tenant_contacts as requester
    on requester.id = q.requester_contact_id
   and requester.tenant_id = q.tenant_id;

create or replace view public.vw_support_ticket_detail
with (security_barrier = true)
as
  with support_visible as (
    select
      d.*
    from public.vw_ticket_detail as d
    where app_private.can_access_support_workspace(d.tenant_id)
  )
  select
    d.id,
    d.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    t.legal_name as tenant_legal_name,
    t.status as tenant_status,
    d.requester_contact_id,
    d.requester_contact_full_name,
    d.requester_contact_email,
    d.title,
    d.description,
    d.source,
    d.status,
    d.priority,
    d.severity,
    d.close_reason,
    d.created_by_user_id,
    d.created_by_full_name,
    d.assigned_to_user_id,
    d.assigned_to_full_name,
    d.created_at,
    d.updated_at,
    d.resolved_at,
    d.closed_at,
    d.last_message_at,
    d.customer_message_count,
    d.internal_message_count,
    d.customer_attachment_count,
    d.internal_attachment_count,
    d.can_view_internal,
    d.can_add_message,
    d.can_update_status,
    d.can_add_internal_note,
    d.can_assign,
    d.can_close,
    d.can_reopen
  from support_visible as d
  join public.tenants as t
    on t.id = d.tenant_id;

create or replace view public.vw_support_ticket_timeline
with (security_barrier = true)
as
  with support_visible as (
    select
      tl.*
    from public.vw_ticket_timeline as tl
    where app_private.can_access_support_workspace(tl.tenant_id)
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
    tl.metadata
  from support_visible as tl
  join public.tenants as t
    on t.id = tl.tenant_id
  left join public.profiles as actor
    on actor.id = tl.actor_user_id;

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
      count(*)::integer as active_contacts_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', tc.id,
            'full_name', tc.full_name,
            'email', tc.email,
            'is_primary', tc.is_primary,
            'linked_user_id', tc.linked_user_id,
            'created_at', tc.created_at
          )
          order by tc.is_primary desc, lower(tc.full_name), tc.created_at
        ),
        '[]'::jsonb
      ) as active_contacts
    from public.tenant_contacts as tc
    where tc.tenant_id = at.id
      and tc.is_active
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
      from public.vw_support_tickets_queue as q
      where q.tenant_id = at.id
      order by q.updated_at desc, lower(q.title)
      limit 5
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
        te.ticket_id,
        tk.title as ticket_title,
        te.event_type,
        te.visibility,
        te.occurred_at,
        te.actor_user_id
      from public.ticket_events as te
      join public.tickets as tk
        on tk.id = te.ticket_id
       and tk.tenant_id = te.tenant_id
      where te.tenant_id = at.id
      order by te.occurred_at desc, tk.title
      limit 10
    ) as x
  ) as recent_events
    on true;

revoke all on public.vw_support_tickets_queue from public, anon, authenticated, service_role;
revoke all on public.vw_support_ticket_detail from public, anon, authenticated, service_role;
revoke all on public.vw_support_ticket_timeline from public, anon, authenticated, service_role;
revoke all on public.vw_support_customer_360 from public, anon, authenticated, service_role;

grant select on public.vw_support_tickets_queue to authenticated, service_role;
grant select on public.vw_support_ticket_detail to authenticated, service_role;
grant select on public.vw_support_ticket_timeline to authenticated, service_role;
grant select on public.vw_support_customer_360 to authenticated, service_role;

revoke all on function app_private.can_access_support_workspace(uuid) from public, anon, authenticated, service_role;
grant execute on function app_private.can_access_support_workspace(uuid) to authenticated, service_role;

comment on function app_private.can_access_support_workspace(uuid) is
  'Helper privado da camada de suporte. Permite acesso apenas a platform_admin ou support_agent/support_manager com membership ativo no tenant.';

comment on view public.vw_support_tickets_queue is
  'Fila contratual do Support Workspace, restrita a platform_admin e support roles internas com membership ativo no tenant.';

comment on view public.vw_support_ticket_detail is
  'Detalhe contratual do Support Workspace com contexto do tenant e permissoes operacionais.';

comment on view public.vw_support_ticket_timeline is
  'Timeline contratual do Support Workspace com enriquecimento de ator e isolamento interno por tenant.';

comment on view public.vw_support_customer_360 is
  'Read model minimo de customer 360 para suporte interno, com contatos ativos, tickets recentes, contagem por status e eventos relevantes.';
