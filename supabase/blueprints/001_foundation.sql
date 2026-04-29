create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app_private;
create schema if not exists audit;

create type public.tenant_status as enum ('active', 'suspended', 'archived');
create type public.membership_status as enum ('active', 'invited', 'revoked');
create type public.platform_role as enum (
  'platform_admin',
  'support_lead',
  'support_agent',
  'engineering_manager',
  'engineer',
  'knowledge_manager',
  'audit_reviewer'
);
create type public.tenant_role as enum (
  'tenant_admin',
  'tenant_manager',
  'tenant_requester',
  'tenant_viewer'
);
create type public.ticket_status as enum (
  'new',
  'triaged',
  'in_progress',
  'waiting_customer',
  'waiting_engineering',
  'resolved',
  'closed',
  'cancelled'
);
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_channel as enum (
  'portal',
  'email',
  'chat',
  'phone',
  'api',
  'internal'
);
create type public.message_visibility as enum ('internal', 'customer');
create type public.knowledge_audience as enum ('internal', 'tenant');
create type public.knowledge_status as enum (
  'draft',
  'in_review',
  'published',
  'archived'
);
create type public.work_item_type as enum ('bug', 'improvement', 'task', 'incident');
create type public.work_item_status as enum (
  'backlog',
  'ready',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email citext,
  avatar_url text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists profiles_email_key
  on public.profiles (email)
  where email is not null;

create table if not exists public.user_global_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legal_name text not null,
  display_name text not null,
  status public.tenant_status not null default 'active',
  plan_code text,
  data_region text not null default 'sa-east-1',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.tenant_role not null,
  status public.membership_status not null default 'invited',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, user_id)
);

create table if not exists public.tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  linked_user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email citext,
  phone text,
  job_title text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ticket_queues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  queue_id uuid not null references public.ticket_queues (id) on delete restrict,
  requester_contact_id uuid references public.tenant_contacts (id) on delete set null,
  opened_by_user_id uuid references public.profiles (id) on delete set null,
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  description_markdown text not null,
  description_text text not null,
  status public.ticket_status not null default 'new',
  priority public.ticket_priority not null default 'normal',
  channel public.ticket_channel not null default 'portal',
  origin_reference jsonb not null default '{}'::jsonb,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_tenant_status_idx
  on public.tickets (tenant_id, status, created_at desc);

create index if not exists tickets_assignee_idx
  on public.tickets (assigned_to_user_id, status);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  author_user_id uuid references public.profiles (id) on delete set null,
  author_contact_id uuid references public.tenant_contacts (id) on delete set null,
  visibility public.message_visibility not null default 'internal',
  channel public.ticket_channel not null default 'portal',
  body_markdown text not null,
  body_text text not null,
  source_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ticket_messages_author_check
    check (author_user_id is not null or author_contact_id is not null)
);

create index if not exists ticket_messages_ticket_idx
  on public.ticket_messages (ticket_id, created_at);

create table if not exists public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  actor_user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ticket_events_ticket_idx
  on public.ticket_events (ticket_id, created_at);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  uploaded_by_user_id uuid references public.profiles (id) on delete set null,
  linked_entity_type text not null,
  linked_entity_id uuid not null,
  is_sensitive boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (storage_bucket, storage_path)
);

create table if not exists public.knowledge_spaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  code text not null unique,
  name text not null,
  audience public.knowledge_audience not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint knowledge_spaces_scope_check
    check (
      (audience = 'internal' and tenant_id is null)
      or (audience = 'tenant' and tenant_id is not null)
    )
);

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.knowledge_spaces (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  slug text not null,
  title text not null,
  status public.knowledge_status not null default 'draft',
  current_revision_id uuid,
  source_kind text not null default 'native',
  source_reference jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (space_id, slug)
);

create table if not exists public.knowledge_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  body_markdown text not null,
  body_text text not null,
  changelog text,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz,
  unique (article_id, version)
);

alter table public.knowledge_articles
  add constraint knowledge_articles_current_revision_fk
  foreign key (current_revision_id)
  references public.knowledge_article_revisions (id)
  on delete set null;

create table if not exists public.engineering_work_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  reported_from_ticket_id uuid references public.tickets (id) on delete set null,
  type public.work_item_type not null,
  status public.work_item_status not null default 'backlog',
  priority public.ticket_priority not null default 'normal',
  title text not null,
  description_markdown text not null,
  description_text text not null,
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  created_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz
);

create index if not exists engineering_work_items_status_idx
  on public.engineering_work_items (status, priority, created_at desc);

create table if not exists public.engineering_ticket_links (
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  work_item_id uuid not null references public.engineering_work_items (id) on delete cascade,
  link_type text not null default 'implements',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (ticket_id, work_item_id)
);

create table if not exists audit.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_user_id uuid,
  tenant_id uuid,
  entity_schema text not null,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_logs_tenant_time_idx
  on audit.audit_logs (tenant_id, occurred_at desc);

create or replace function app_private.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function app_private.has_platform_role(required_role public.platform_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_global_roles ugr
    where ugr.user_id = app_private.current_user_id()
      and ugr.role = required_role
  );
$$;

create or replace function app_private.can_access_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select
    app_private.has_platform_role('platform_admin')
    or app_private.has_platform_role('support_lead')
    or app_private.has_platform_role('support_agent')
    or app_private.has_platform_role('engineering_manager')
    or app_private.has_platform_role('engineer')
    or app_private.has_platform_role('knowledge_manager')
    or exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = target_tenant_id
        and tm.user_id = app_private.current_user_id()
        and tm.status = 'active'
    );
$$;

create or replace function audit.capture_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  payload jsonb;
  target_tenant_id uuid;
  target_entity_id uuid;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_tenant_id := nullif(payload ->> 'tenant_id', '')::uuid;
  target_entity_id := nullif(payload ->> 'id', '')::uuid;

  insert into audit.audit_logs (
    actor_user_id,
    tenant_id,
    entity_schema,
    entity_table,
    entity_id,
    action,
    before_state,
    after_state
  )
  values (
    auth.uid(),
    target_tenant_id,
    tg_table_schema,
    tg_table_name,
    target_entity_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.touch_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function app_private.touch_updated_at();

create trigger tenant_memberships_set_updated_at
before update on public.tenant_memberships
for each row execute function app_private.touch_updated_at();

create trigger tenant_contacts_set_updated_at
before update on public.tenant_contacts
for each row execute function app_private.touch_updated_at();

create trigger ticket_queues_set_updated_at
before update on public.ticket_queues
for each row execute function app_private.touch_updated_at();

create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function app_private.touch_updated_at();

create trigger knowledge_spaces_set_updated_at
before update on public.knowledge_spaces
for each row execute function app_private.touch_updated_at();

create trigger knowledge_articles_set_updated_at
before update on public.knowledge_articles
for each row execute function app_private.touch_updated_at();

create trigger engineering_work_items_set_updated_at
before update on public.engineering_work_items
for each row execute function app_private.touch_updated_at();

create trigger tenants_audit_row_change
after insert or update or delete on public.tenants
for each row execute function audit.capture_row_change();

create trigger tenant_memberships_audit_row_change
after insert or update or delete on public.tenant_memberships
for each row execute function audit.capture_row_change();

create trigger tenant_contacts_audit_row_change
after insert or update or delete on public.tenant_contacts
for each row execute function audit.capture_row_change();

create trigger tickets_audit_row_change
after insert or update or delete on public.tickets
for each row execute function audit.capture_row_change();

create trigger ticket_messages_audit_row_change
after insert or update or delete on public.ticket_messages
for each row execute function audit.capture_row_change();

create trigger ticket_events_audit_row_change
after insert or update or delete on public.ticket_events
for each row execute function audit.capture_row_change();

create trigger attachments_audit_row_change
after insert or update or delete on public.attachments
for each row execute function audit.capture_row_change();

create trigger knowledge_articles_audit_row_change
after insert or update or delete on public.knowledge_articles
for each row execute function audit.capture_row_change();

create trigger knowledge_article_revisions_audit_row_change
after insert or update or delete on public.knowledge_article_revisions
for each row execute function audit.capture_row_change();

create trigger engineering_work_items_audit_row_change
after insert or update or delete on public.engineering_work_items
for each row execute function audit.capture_row_change();

alter table public.profiles enable row level security;
alter table public.user_global_roles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_contacts enable row level security;
alter table public.ticket_queues enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.attachments enable row level security;
alter table public.knowledge_spaces enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.knowledge_article_revisions enable row level security;
alter table public.engineering_work_items enable row level security;
alter table public.engineering_ticket_links enable row level security;
alter table audit.audit_logs enable row level security;

comment on schema app_private is
  'Funcoes internas de autorizacao, triggers e automacoes nao expostas diretamente.';

comment on schema audit is
  'Trilha append-only para auditoria forense.';
