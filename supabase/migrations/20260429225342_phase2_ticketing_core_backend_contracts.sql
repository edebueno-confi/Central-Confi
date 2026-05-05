create type public.ticket_status as enum (
  'new',
  'triage',
  'waiting_customer',
  'waiting_support',
  'waiting_engineering',
  'in_progress',
  'resolved',
  'closed',
  'cancelled'
);

create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_severity as enum ('low', 'medium', 'high', 'critical');
create type public.ticket_source as enum (
  'portal',
  'email',
  'chat',
  'phone',
  'api',
  'internal'
);
create type public.message_visibility as enum ('internal', 'customer');
create type public.ticket_event_type as enum (
  'ticket_created',
  'status_changed',
  'priority_changed',
  'assigned',
  'unassigned',
  'message_added',
  'internal_note_added',
  'attachment_added',
  'escalated_to_engineering',
  'linked_to_work_item',
  'resolved',
  'closed',
  'reopened',
  'cancelled'
);
create type public.ticket_assignment_kind as enum ('assigned', 'unassigned');

create unique index tenant_contacts_id_tenant_key
  on public.tenant_contacts (id, tenant_id);

create table public.tickets (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  requester_contact_id uuid,
  title text not null,
  description text not null,
  source public.ticket_source not null,
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'normal',
  severity public.ticket_severity not null default 'medium',
  close_reason text,
  created_by_user_id uuid not null references public.profiles (id),
  assigned_to_user_id uuid references public.profiles (id),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid references public.profiles (id),
  constraint tickets_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint tickets_description_not_blank_check
    check (nullif(btrim(description), '') is not null),
  constraint tickets_closed_state_check
    check (
      (status = 'closed' and closed_at is not null and nullif(btrim(close_reason), '') is not null)
      or (status <> 'closed' and closed_at is null and close_reason is null)
    ),
  constraint tickets_requester_contact_fk
    foreign key (requester_contact_id, tenant_id)
    references public.tenant_contacts (id, tenant_id)
    on delete set null
);

create unique index tickets_id_tenant_key
  on public.tickets (id, tenant_id);

create index tickets_tenant_status_priority_idx
  on public.tickets (tenant_id, status, priority, updated_at desc);

create index tickets_tenant_assignee_idx
  on public.tickets (tenant_id, assigned_to_user_id, status, updated_at desc);

create index tickets_created_by_idx
  on public.tickets (created_by_user_id, tenant_id, created_at desc);

create table public.ticket_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null,
  visibility public.message_visibility not null default 'customer',
  body text not null,
  created_by_user_id uuid not null references public.profiles (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticket_messages_body_not_blank_check
    check (nullif(btrim(body), '') is not null),
  constraint ticket_messages_ticket_fk
    foreign key (ticket_id, tenant_id)
    references public.tickets (id, tenant_id)
    on delete cascade
);

create unique index ticket_messages_id_tenant_key
  on public.ticket_messages (id, tenant_id);

create index ticket_messages_ticket_created_at_idx
  on public.ticket_messages (ticket_id, created_at asc);

create index ticket_messages_tenant_visibility_idx
  on public.ticket_messages (tenant_id, visibility, created_at desc);

create table public.ticket_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null,
  assignment_kind public.ticket_assignment_kind not null,
  assigned_to_user_id uuid references public.profiles (id),
  previous_assigned_to_user_id uuid references public.profiles (id),
  assigned_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticket_assignments_ticket_fk
    foreign key (ticket_id, tenant_id)
    references public.tickets (id, tenant_id)
    on delete cascade,
  constraint ticket_assignments_kind_target_check
    check (
      (assignment_kind = 'assigned' and assigned_to_user_id is not null)
      or (assignment_kind = 'unassigned' and assigned_to_user_id is null)
    )
);

create unique index ticket_assignments_id_tenant_key
  on public.ticket_assignments (id, tenant_id);

create index ticket_assignments_ticket_created_at_idx
  on public.ticket_assignments (ticket_id, created_at desc);

create table public.ticket_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null,
  event_type public.ticket_event_type not null,
  visibility public.message_visibility not null default 'customer',
  actor_user_id uuid references public.profiles (id),
  message_id uuid,
  assignment_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticket_events_ticket_fk
    foreign key (ticket_id, tenant_id)
    references public.tickets (id, tenant_id)
    on delete cascade,
  constraint ticket_events_message_fk
    foreign key (message_id, tenant_id)
    references public.ticket_messages (id, tenant_id)
    on delete set null,
  constraint ticket_events_assignment_fk
    foreign key (assignment_id, tenant_id)
    references public.ticket_assignments (id, tenant_id)
    on delete set null
);

create index ticket_events_ticket_occurred_at_idx
  on public.ticket_events (ticket_id, occurred_at asc);

create index ticket_events_tenant_visibility_idx
  on public.ticket_events (tenant_id, visibility, occurred_at desc);

create table public.ticket_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null,
  message_id uuid,
  visibility public.message_visibility not null default 'customer',
  storage_bucket text not null,
  storage_object_path text not null,
  file_name text not null,
  content_type text,
  byte_size bigint not null,
  uploaded_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ticket_attachments_ticket_fk
    foreign key (ticket_id, tenant_id)
    references public.tickets (id, tenant_id)
    on delete cascade,
  constraint ticket_attachments_message_fk
    foreign key (message_id, tenant_id)
    references public.ticket_messages (id, tenant_id)
    on delete set null,
  constraint ticket_attachments_bucket_not_blank_check
    check (nullif(btrim(storage_bucket), '') is not null),
  constraint ticket_attachments_object_path_not_blank_check
    check (nullif(btrim(storage_object_path), '') is not null),
  constraint ticket_attachments_file_name_not_blank_check
    check (nullif(btrim(file_name), '') is not null),
  constraint ticket_attachments_byte_size_check
    check (byte_size >= 0)
);

create index ticket_attachments_ticket_created_at_idx
  on public.ticket_attachments (ticket_id, created_at desc);

create index ticket_attachments_tenant_visibility_idx
  on public.ticket_attachments (tenant_id, visibility, created_at desc);

create unique index ticket_attachments_storage_object_key
  on public.ticket_attachments (storage_bucket, storage_object_path);

create or replace function app_private.has_any_global_role(required_roles public.platform_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_global_roles as ugr
    where ugr.user_id = auth.uid()
      and ugr.role = any(required_roles)
  );
$$;

create or replace function app_private.can_create_ticket(target_tenant_id uuid)
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
      and (
        app_private.has_any_global_role(
          array[
            'support_agent',
            'support_manager',
            'engineering_member',
            'engineering_manager'
          ]::public.platform_role[]
        )
        or app_private.has_tenant_role(
          target_tenant_id,
          array['tenant_admin', 'tenant_manager', 'tenant_requester']::public.tenant_role[]
        )
      )
    );
$$;

create or replace function app_private.can_manage_ticket(target_tenant_id uuid)
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
          'support_manager',
          'engineering_member',
          'engineering_manager'
        ]::public.platform_role[]
      )
    );
$$;

create or replace function app_private.can_view_internal_ticket_content(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.can_manage_ticket(target_tenant_id);
$$;

create or replace function app_private.can_assign_ticket(
  target_tenant_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.can_manage_ticket(target_tenant_id)
    and (
      target_user_id is null
      or exists (
        select 1
        from public.profiles as p
        join public.tenant_memberships as tm
          on tm.user_id = p.id
         and tm.tenant_id = target_tenant_id
         and tm.status = 'active'
        join public.user_global_roles as ugr
          on ugr.user_id = p.id
        where p.id = target_user_id
          and p.is_active
          and ugr.role = any(
            array[
              'platform_admin',
              'support_agent',
              'support_manager',
              'engineering_member',
              'engineering_manager'
            ]::public.platform_role[]
          )
      )
    );
$$;

create or replace function app_private.ticket_status_transition_allowed(
  current_status public.ticket_status,
  target_status public.ticket_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when current_status = target_status then false
    when current_status = 'new' then target_status = any(
      array[
        'triage',
        'waiting_customer',
        'waiting_support',
        'waiting_engineering',
        'in_progress',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'triage' then target_status = any(
      array[
        'waiting_customer',
        'waiting_support',
        'waiting_engineering',
        'in_progress',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'waiting_support' then target_status = any(
      array[
        'triage',
        'waiting_customer',
        'waiting_engineering',
        'in_progress',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'waiting_customer' then target_status = any(
      array[
        'waiting_support',
        'in_progress',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'waiting_engineering' then target_status = any(
      array[
        'waiting_support',
        'in_progress',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'in_progress' then target_status = any(
      array[
        'waiting_customer',
        'waiting_support',
        'waiting_engineering',
        'resolved',
        'cancelled'
      ]::public.ticket_status[]
    )
    when current_status = 'resolved' then target_status = any(
      array['closed', 'waiting_support', 'in_progress']::public.ticket_status[]
    )
    when current_status = 'closed' then target_status = 'waiting_support'
    else false
  end;
$$;

create or replace function app_private.prevent_ticket_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_schema || '.' || tg_table_name;
end;
$$;

create or replace function app_private.create_ticket_event(
  p_ticket_id uuid,
  p_tenant_id uuid,
  p_event_type public.ticket_event_type,
  p_visibility public.message_visibility,
  p_actor_user_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_message_id uuid default null,
  p_assignment_id uuid default null
)
returns public.ticket_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.ticket_events;
begin
  insert into public.ticket_events (
    tenant_id,
    ticket_id,
    event_type,
    visibility,
    actor_user_id,
    message_id,
    assignment_id,
    metadata
  )
  values (
    p_tenant_id,
    p_ticket_id,
    p_event_type,
    p_visibility,
    p_actor_user_id,
    p_message_id,
    p_assignment_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *
  into v_event;

  return v_event;
end;
$$;

create or replace function app_private.transition_ticket_status(
  p_ticket_id uuid,
  p_actor_user_id uuid,
  p_target_status public.ticket_status,
  p_event_type public.ticket_event_type,
  p_metadata jsonb default '{}'::jsonb,
  p_close_reason text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.tickets;
  v_ticket public.tickets;
begin
  select *
  into v_existing
  from public.tickets as t
  where t.id = p_ticket_id
  for update;

  if v_existing.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.ticket_status_transition_allowed(v_existing.status, p_target_status) then
    raise exception 'invalid ticket status transition: % -> %', v_existing.status, p_target_status;
  end if;

  if p_target_status = 'closed' and nullif(btrim(p_close_reason), '') is null then
    raise exception 'close reason is required';
  end if;

  update public.tickets
  set
    status = p_target_status,
    resolved_at = case
      when p_target_status = 'resolved' then timezone('utc', now())
      when p_target_status = 'closed' then coalesce(v_existing.resolved_at, timezone('utc', now()))
      when p_target_status in ('waiting_support', 'in_progress', 'triage', 'waiting_customer', 'waiting_engineering', 'cancelled', 'new') then null
      else v_existing.resolved_at
    end,
    closed_at = case
      when p_target_status = 'closed' then timezone('utc', now())
      else null
    end,
    close_reason = case
      when p_target_status = 'closed' then btrim(p_close_reason)
      else null
    end,
    updated_by_user_id = p_actor_user_id
  where id = p_ticket_id
  returning *
  into v_ticket;

  perform app_private.create_ticket_event(
    v_ticket.id,
    v_ticket.tenant_id,
    p_event_type,
    'customer'::public.message_visibility,
    p_actor_user_id,
    coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'previous_status', v_existing.status,
        'new_status', v_ticket.status
      )
      || case
        when p_target_status = 'closed'
          then jsonb_build_object('close_reason', btrim(p_close_reason))
        else '{}'::jsonb
      end
  );

  return v_ticket;
end;
$$;

create trigger tickets_set_updated_at
before update on public.tickets
for each row
execute function app_private.touch_updated_at();

create trigger ticket_messages_prevent_mutation
before update or delete on public.ticket_messages
for each row
execute function app_private.prevent_ticket_history_mutation();

create trigger ticket_events_prevent_mutation
before update or delete on public.ticket_events
for each row
execute function app_private.prevent_ticket_history_mutation();

create trigger ticket_assignments_prevent_mutation
before update or delete on public.ticket_assignments
for each row
execute function app_private.prevent_ticket_history_mutation();

create trigger ticket_attachments_prevent_mutation
before update or delete on public.ticket_attachments
for each row
execute function app_private.prevent_ticket_history_mutation();

create trigger tickets_audit_row_change
after insert or update or delete on public.tickets
for each row
execute function audit.capture_row_change();

create trigger ticket_messages_audit_row_change
after insert or update or delete on public.ticket_messages
for each row
execute function audit.capture_row_change();

create trigger ticket_events_audit_row_change
after insert or update or delete on public.ticket_events
for each row
execute function audit.capture_row_change();

create trigger ticket_assignments_audit_row_change
after insert or update or delete on public.ticket_assignments
for each row
execute function audit.capture_row_change();

create trigger ticket_attachments_audit_row_change
after insert or update or delete on public.ticket_attachments
for each row
execute function audit.capture_row_change();

grant select on public.tickets to service_role;
grant select on public.ticket_messages to service_role;
grant select on public.ticket_events to service_role;
grant select on public.ticket_assignments to service_role;
grant select on public.ticket_attachments to service_role;

revoke all on public.tickets from authenticated;
revoke all on public.ticket_messages from authenticated;
revoke all on public.ticket_events from authenticated;
revoke all on public.ticket_assignments from authenticated;
revoke all on public.ticket_attachments from authenticated;

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_attachments enable row level security;

create policy tickets_select_member_or_platform_admin
on public.tickets
for select
to authenticated
using (
  app_private.has_global_role('platform_admin'::public.platform_role)
  or app_private.is_active_tenant_member(tenant_id)
);

create policy ticket_messages_select_visible_to_member
on public.ticket_messages
for select
to authenticated
using (
  app_private.has_global_role('platform_admin'::public.platform_role)
  or (
    app_private.is_active_tenant_member(tenant_id)
    and (
      visibility = 'customer'
      or app_private.can_view_internal_ticket_content(tenant_id)
    )
  )
);

create policy ticket_events_select_visible_to_member
on public.ticket_events
for select
to authenticated
using (
  app_private.has_global_role('platform_admin'::public.platform_role)
  or (
    app_private.is_active_tenant_member(tenant_id)
    and (
      visibility = 'customer'
      or app_private.can_view_internal_ticket_content(tenant_id)
    )
  )
);

create policy ticket_assignments_select_internal_only
on public.ticket_assignments
for select
to authenticated
using (
  app_private.has_global_role('platform_admin'::public.platform_role)
  or app_private.can_view_internal_ticket_content(tenant_id)
);

create policy ticket_attachments_select_visible_to_member
on public.ticket_attachments
for select
to authenticated
using (
  app_private.has_global_role('platform_admin'::public.platform_role)
  or (
    app_private.is_active_tenant_member(tenant_id)
    and (
      visibility = 'customer'
      or app_private.can_view_internal_ticket_content(tenant_id)
    )
  )
);

create or replace view public.vw_tickets_list
with (security_barrier = true)
as
  with accessible_tickets as (
    select
      t.*,
      app_private.can_view_internal_ticket_content(t.tenant_id) as can_view_internal,
      app_private.can_create_ticket(t.tenant_id) as can_add_message,
      app_private.can_manage_ticket(t.tenant_id) as can_manage
    from public.tickets as t
    where app_private.has_global_role('platform_admin'::public.platform_role)
       or app_private.is_active_tenant_member(t.tenant_id)
  ),
  visible_message_stats as (
    select
      at.id as ticket_id,
      max(tm.created_at) as last_message_at,
      count(tm.id) filter (where tm.visibility = 'customer')::integer as customer_message_count,
      count(tm.id) filter (
        where tm.visibility = 'internal'
          and at.can_view_internal
      )::integer as internal_message_count
    from accessible_tickets as at
    left join public.ticket_messages as tm
      on tm.ticket_id = at.id
     and tm.tenant_id = at.tenant_id
     and (
       tm.visibility = 'customer'
       or at.can_view_internal
     )
    group by at.id
  )
  select
    t.id,
    t.tenant_id,
    t.requester_contact_id,
    t.title,
    t.source,
    t.status,
    t.priority,
    t.severity,
    t.created_by_user_id,
    creator.full_name as created_by_full_name,
    case
      when t.can_view_internal then t.assigned_to_user_id
      else null
    end as assigned_to_user_id,
    case
      when t.can_view_internal then assignee.full_name
      else null
    end as assigned_to_full_name,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at,
    ms.last_message_at,
    coalesce(ms.customer_message_count, 0) as customer_message_count,
    coalesce(ms.internal_message_count, 0) as internal_message_count,
    t.can_view_internal,
    t.can_add_message,
    t.can_manage as can_update_status,
    t.can_manage as can_add_internal_note,
    t.can_manage as can_assign,
    (
      t.can_manage
      and t.status = 'resolved'
    ) as can_close,
    (
      t.can_manage
      and t.status = any(array['resolved', 'closed']::public.ticket_status[])
    ) as can_reopen
  from accessible_tickets as t
  left join public.profiles as creator
    on creator.id = t.created_by_user_id
  left join public.profiles as assignee
    on assignee.id = t.assigned_to_user_id
  left join visible_message_stats as ms
    on ms.ticket_id = t.id;

create or replace view public.vw_ticket_detail
with (security_barrier = true)
as
  with accessible_tickets as (
    select
      t.*,
      app_private.can_view_internal_ticket_content(t.tenant_id) as can_view_internal,
      app_private.can_create_ticket(t.tenant_id) as can_add_message,
      app_private.can_manage_ticket(t.tenant_id) as can_manage
    from public.tickets as t
    where app_private.has_global_role('platform_admin'::public.platform_role)
       or app_private.is_active_tenant_member(t.tenant_id)
  ),
  visible_message_stats as (
    select
      at.id as ticket_id,
      max(tm.created_at) as last_message_at,
      count(tm.id) filter (where tm.visibility = 'customer')::integer as customer_message_count,
      count(tm.id) filter (
        where tm.visibility = 'internal'
          and at.can_view_internal
      )::integer as internal_message_count
    from accessible_tickets as at
    left join public.ticket_messages as tm
      on tm.ticket_id = at.id
     and tm.tenant_id = at.tenant_id
     and (
       tm.visibility = 'customer'
       or at.can_view_internal
     )
    group by at.id
  ),
  visible_attachment_stats as (
    select
      at.id as ticket_id,
      count(ta.id) filter (where ta.visibility = 'customer')::integer as customer_attachment_count,
      count(ta.id) filter (
        where ta.visibility = 'internal'
          and at.can_view_internal
      )::integer as internal_attachment_count
    from accessible_tickets as at
    left join public.ticket_attachments as ta
      on ta.ticket_id = at.id
     and ta.tenant_id = at.tenant_id
     and (
       ta.visibility = 'customer'
       or at.can_view_internal
     )
    group by at.id
  )
  select
    t.id,
    t.tenant_id,
    t.requester_contact_id,
    requester.full_name as requester_contact_full_name,
    requester.email as requester_contact_email,
    t.title,
    t.description,
    t.source,
    t.status,
    t.priority,
    t.severity,
    t.close_reason,
    t.created_by_user_id,
    creator.full_name as created_by_full_name,
    case
      when t.can_view_internal then t.assigned_to_user_id
      else null
    end as assigned_to_user_id,
    case
      when t.can_view_internal then assignee.full_name
      else null
    end as assigned_to_full_name,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at,
    ms.last_message_at,
    coalesce(ms.customer_message_count, 0) as customer_message_count,
    coalesce(ms.internal_message_count, 0) as internal_message_count,
    coalesce(ats.customer_attachment_count, 0) as customer_attachment_count,
    coalesce(ats.internal_attachment_count, 0) as internal_attachment_count,
    t.can_view_internal,
    t.can_add_message,
    t.can_manage as can_update_status,
    t.can_manage as can_add_internal_note,
    t.can_manage as can_assign,
    (
      t.can_manage
      and t.status = 'resolved'
    ) as can_close,
    (
      t.can_manage
      and t.status = any(array['resolved', 'closed']::public.ticket_status[])
    ) as can_reopen
  from accessible_tickets as t
  left join public.profiles as creator
    on creator.id = t.created_by_user_id
  left join public.profiles as assignee
    on assignee.id = t.assigned_to_user_id
  left join public.tenant_contacts as requester
    on requester.id = t.requester_contact_id
   and requester.tenant_id = t.tenant_id
  left join visible_message_stats as ms
    on ms.ticket_id = t.id
  left join visible_attachment_stats as ats
    on ats.ticket_id = t.id;

create or replace view public.vw_ticket_timeline
with (security_barrier = true)
as
  with accessible_tickets as (
    select
      t.id,
      t.tenant_id,
      app_private.can_view_internal_ticket_content(t.tenant_id) as can_view_internal
    from public.tickets as t
    where app_private.has_global_role('platform_admin'::public.platform_role)
       or app_private.is_active_tenant_member(t.tenant_id)
  )
  select
    tm.ticket_id,
    tm.tenant_id,
    tm.id as timeline_entry_id,
    'message'::text as entry_type,
    tm.visibility,
    tm.created_at as occurred_at,
    tm.created_by_user_id as actor_user_id,
    tm.id as message_id,
    null::uuid as event_id,
    null::public.ticket_event_type as event_type,
    null::uuid as assignment_id,
    tm.body,
    tm.metadata
  from accessible_tickets as at
  join public.ticket_messages as tm
    on tm.ticket_id = at.id
   and tm.tenant_id = at.tenant_id
   and (
     tm.visibility = 'customer'
     or at.can_view_internal
   )
  union all
  select
    te.ticket_id,
    te.tenant_id,
    te.id as timeline_entry_id,
    'event'::text as entry_type,
    te.visibility,
    te.occurred_at,
    te.actor_user_id,
    te.message_id,
    te.id as event_id,
    te.event_type,
    te.assignment_id,
    null::text as body,
    te.metadata
  from accessible_tickets as at
  join public.ticket_events as te
    on te.ticket_id = at.id
   and te.tenant_id = at.tenant_id
   and (
     te.visibility = 'customer'
     or at.can_view_internal
   );

revoke all on public.vw_tickets_list from public, anon, authenticated, service_role;
revoke all on public.vw_ticket_detail from public, anon, authenticated, service_role;
revoke all on public.vw_ticket_timeline from public, anon, authenticated, service_role;

grant select on public.vw_tickets_list to authenticated, service_role;
grant select on public.vw_ticket_detail to authenticated, service_role;
grant select on public.vw_ticket_timeline to authenticated, service_role;

create or replace function public.rpc_create_ticket(
  p_tenant_id uuid,
  p_title text,
  p_description text,
  p_source public.ticket_source,
  p_priority public.ticket_priority default 'normal',
  p_severity public.ticket_severity default 'medium',
  p_requester_contact_id uuid default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_ticket public.tickets;
  v_requester_contact_id uuid;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.can_create_ticket(p_tenant_id) then
    raise exception 'rpc_create_ticket denied';
  end if;

  if p_requester_contact_id is not null then
    if not exists (
      select 1
      from public.tenant_contacts as tc
      where tc.id = p_requester_contact_id
        and tc.tenant_id = p_tenant_id
        and tc.is_active
    ) then
      raise exception 'requester contact not found for tenant';
    end if;

    v_requester_contact_id := p_requester_contact_id;
  else
    select tc.id
    into v_requester_contact_id
    from public.tenant_contacts as tc
    where tc.tenant_id = p_tenant_id
      and tc.linked_user_id = v_actor_user_id
      and tc.is_active
    order by tc.is_primary desc, tc.created_at asc
    limit 1;
  end if;

  insert into public.tickets (
    tenant_id,
    requester_contact_id,
    title,
    description,
    source,
    priority,
    severity,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    v_requester_contact_id,
    btrim(p_title),
    btrim(p_description),
    p_source,
    p_priority,
    p_severity,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_ticket;

  perform app_private.create_ticket_event(
    v_ticket.id,
    v_ticket.tenant_id,
    'ticket_created',
    'customer',
    v_actor_user_id,
    jsonb_build_object(
      'source', v_ticket.source,
      'priority', v_ticket.priority,
      'severity', v_ticket.severity,
      'requester_contact_id', v_ticket.requester_contact_id
    )
  );

  return v_ticket;
end;
$$;

create or replace function public.rpc_update_ticket_status(
  p_ticket_id uuid,
  p_status public.ticket_status,
  p_note text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tickets;
  v_event_type public.ticket_event_type;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_existing.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_manage_ticket(v_existing.tenant_id) then
    raise exception 'rpc_update_ticket_status denied';
  end if;

  if p_status = 'closed' then
    raise exception 'use rpc_close_ticket for closed status';
  end if;

  if v_existing.status = any(array['resolved', 'closed']::public.ticket_status[])
     and p_status = 'waiting_support' then
    raise exception 'use rpc_reopen_ticket to reopen ticket';
  end if;

  v_event_type := case
    when p_status = 'resolved' then 'resolved'::public.ticket_event_type
    when p_status = 'cancelled' then 'cancelled'::public.ticket_event_type
    else 'status_changed'::public.ticket_event_type
  end;

  return app_private.transition_ticket_status(
    p_ticket_id,
    v_actor_user_id,
    p_status,
    v_event_type,
    case
      when nullif(btrim(coalesce(p_note, '')), '') is null
        then '{}'::jsonb
      else jsonb_build_object('note', btrim(p_note))
    end
  );
end;
$$;

create or replace function public.rpc_assign_ticket(
  p_ticket_id uuid,
  p_assigned_to_user_id uuid default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tickets;
  v_ticket public.tickets;
  v_assignment public.ticket_assignments;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tickets as t
  where t.id = p_ticket_id
  for update;

  if v_existing.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_manage_ticket(v_existing.tenant_id) then
    raise exception 'rpc_assign_ticket denied';
  end if;

  if not app_private.can_assign_ticket(v_existing.tenant_id, p_assigned_to_user_id) then
    raise exception 'rpc_assign_ticket denied';
  end if;

  if v_existing.assigned_to_user_id is not distinct from p_assigned_to_user_id then
    raise exception 'ticket assignment unchanged';
  end if;

  update public.tickets
  set
    assigned_to_user_id = p_assigned_to_user_id,
    updated_by_user_id = v_actor_user_id
  where id = p_ticket_id
  returning *
  into v_ticket;

  insert into public.ticket_assignments (
    tenant_id,
    ticket_id,
    assignment_kind,
    assigned_to_user_id,
    previous_assigned_to_user_id,
    assigned_by_user_id
  )
  values (
    v_ticket.tenant_id,
    v_ticket.id,
    case
      when p_assigned_to_user_id is null then 'unassigned'::public.ticket_assignment_kind
      else 'assigned'::public.ticket_assignment_kind
    end,
    p_assigned_to_user_id,
    v_existing.assigned_to_user_id,
    v_actor_user_id
  )
  returning *
  into v_assignment;

  perform app_private.create_ticket_event(
    v_ticket.id,
    v_ticket.tenant_id,
    case
      when p_assigned_to_user_id is null then 'unassigned'::public.ticket_event_type
      else 'assigned'::public.ticket_event_type
    end,
    'internal',
    v_actor_user_id,
    jsonb_build_object(
      'previous_assigned_to_user_id', v_existing.assigned_to_user_id,
      'assigned_to_user_id', p_assigned_to_user_id
    ),
    null,
    v_assignment.id
  );

  return v_ticket;
end;
$$;

create or replace function public.rpc_add_ticket_message(
  p_ticket_id uuid,
  p_body text
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_ticket public.tickets;
  v_message public.ticket_messages;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_ticket
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_create_ticket(v_ticket.tenant_id) then
    raise exception 'rpc_add_ticket_message denied';
  end if;

  if v_ticket.status = any(array['closed', 'cancelled']::public.ticket_status[]) then
    raise exception 'ticket is not open for public messages';
  end if;

  insert into public.ticket_messages (
    tenant_id,
    ticket_id,
    visibility,
    body,
    created_by_user_id
  )
  values (
    v_ticket.tenant_id,
    v_ticket.id,
    'customer',
    btrim(p_body),
    v_actor_user_id
  )
  returning *
  into v_message;

  perform app_private.create_ticket_event(
    v_ticket.id,
    v_ticket.tenant_id,
    'message_added',
    'customer',
    v_actor_user_id,
    jsonb_build_object('visibility', v_message.visibility),
    v_message.id
  );

  return v_message;
end;
$$;

create or replace function public.rpc_add_internal_ticket_note(
  p_ticket_id uuid,
  p_body text
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_ticket public.tickets;
  v_message public.ticket_messages;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_ticket
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_manage_ticket(v_ticket.tenant_id) then
    raise exception 'rpc_add_internal_ticket_note denied';
  end if;

  insert into public.ticket_messages (
    tenant_id,
    ticket_id,
    visibility,
    body,
    created_by_user_id
  )
  values (
    v_ticket.tenant_id,
    v_ticket.id,
    'internal',
    btrim(p_body),
    v_actor_user_id
  )
  returning *
  into v_message;

  perform app_private.create_ticket_event(
    v_ticket.id,
    v_ticket.tenant_id,
    'internal_note_added',
    'internal',
    v_actor_user_id,
    jsonb_build_object('visibility', v_message.visibility),
    v_message.id
  );

  return v_message;
end;
$$;

create or replace function public.rpc_close_ticket(
  p_ticket_id uuid,
  p_close_reason text
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tickets;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_existing.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_manage_ticket(v_existing.tenant_id) then
    raise exception 'rpc_close_ticket denied';
  end if;

  if v_existing.status <> 'resolved' then
    raise exception 'ticket must be resolved before close';
  end if;

  return app_private.transition_ticket_status(
    p_ticket_id,
    v_actor_user_id,
    'closed',
    'closed',
    '{}'::jsonb,
    p_close_reason
  );
end;
$$;

create or replace function public.rpc_reopen_ticket(
  p_ticket_id uuid,
  p_reopen_reason text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.tickets;
begin
  v_actor_user_id := app_private.require_active_actor();

  select *
  into v_existing
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_existing.id is null then
    raise exception 'ticket not found';
  end if;

  if not app_private.can_manage_ticket(v_existing.tenant_id) then
    raise exception 'rpc_reopen_ticket denied';
  end if;

  if v_existing.status not in ('resolved', 'closed') then
    raise exception 'ticket is not reopenable';
  end if;

  return app_private.transition_ticket_status(
    p_ticket_id,
    v_actor_user_id,
    'waiting_support',
    'reopened',
    case
      when nullif(btrim(coalesce(p_reopen_reason, '')), '') is null
        then '{}'::jsonb
      else jsonb_build_object('reopen_reason', btrim(p_reopen_reason))
    end
  );
end;
$$;

revoke all on function app_private.has_any_global_role(public.platform_role[]) from public, anon, authenticated, service_role;
revoke all on function app_private.can_create_ticket(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.can_manage_ticket(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.can_view_internal_ticket_content(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.can_assign_ticket(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.ticket_status_transition_allowed(public.ticket_status, public.ticket_status) from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_ticket_history_mutation() from public, anon, authenticated, service_role;
revoke all on function app_private.create_ticket_event(uuid, uuid, public.ticket_event_type, public.message_visibility, uuid, jsonb, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.transition_ticket_status(uuid, uuid, public.ticket_status, public.ticket_event_type, jsonb, text) from public, anon, authenticated, service_role;

grant execute on function app_private.has_any_global_role(public.platform_role[]) to authenticated, service_role;
grant execute on function app_private.can_create_ticket(uuid) to authenticated, service_role;
grant execute on function app_private.can_manage_ticket(uuid) to authenticated, service_role;
grant execute on function app_private.can_view_internal_ticket_content(uuid) to authenticated, service_role;
grant execute on function app_private.can_assign_ticket(uuid, uuid) to authenticated, service_role;

revoke all on function public.rpc_create_ticket(uuid, text, text, public.ticket_source, public.ticket_priority, public.ticket_severity, uuid) from public, anon, authenticated, service_role;
revoke all on function public.rpc_update_ticket_status(uuid, public.ticket_status, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_assign_ticket(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.rpc_add_ticket_message(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_add_internal_ticket_note(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_close_ticket(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_reopen_ticket(uuid, text) from public, anon, authenticated, service_role;

grant execute on function public.rpc_create_ticket(uuid, text, text, public.ticket_source, public.ticket_priority, public.ticket_severity, uuid) to authenticated;
grant execute on function public.rpc_update_ticket_status(uuid, public.ticket_status, text) to authenticated;
grant execute on function public.rpc_assign_ticket(uuid, uuid) to authenticated;
grant execute on function public.rpc_add_ticket_message(uuid, text) to authenticated;
grant execute on function public.rpc_add_internal_ticket_note(uuid, text) to authenticated;
grant execute on function public.rpc_close_ticket(uuid, text) to authenticated;
grant execute on function public.rpc_reopen_ticket(uuid, text) to authenticated;

comment on function public.rpc_create_ticket(uuid, text, text, public.ticket_source, public.ticket_priority, public.ticket_severity, uuid) is
  'Cria ticket por RPC com tenant, prioridade, severidade e requester validados no backend.';

comment on function public.rpc_update_ticket_status(uuid, public.ticket_status, text) is
  'Altera status de ticket com validacao de maquina de estados e evento automatico.';

comment on function public.rpc_assign_ticket(uuid, uuid) is
  'Atribui ou desatribui ticket por RPC, registrando historico e evento interno.';

comment on function public.rpc_add_ticket_message(uuid, text) is
  'Adiciona mensagem visivel ao cliente em ticket existente.';

comment on function public.rpc_add_internal_ticket_note(uuid, text) is
  'Adiciona nota interna em ticket existente com visibilidade restrita.';

comment on function public.rpc_close_ticket(uuid, text) is
  'Fecha ticket resolvido com motivo obrigatorio e trilha de evento.';

comment on function public.rpc_reopen_ticket(uuid, text) is
  'Reabre ticket resolvido ou fechado para waiting_support com trilha de evento.';
