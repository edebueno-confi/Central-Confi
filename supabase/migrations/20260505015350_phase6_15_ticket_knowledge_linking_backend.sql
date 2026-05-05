create type public.ticket_knowledge_link_type as enum (
  'reference_internal',
  'sent_to_customer',
  'suggested_article',
  'documentation_gap',
  'needs_update'
);

create or replace function app_private.ticket_knowledge_note_is_safe(input_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    input_text is null
    or (
      input_text !~* '(https?://|localhost|127\.0\.0\.1|\.internal\b|\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b|\bsource_hash\b|\bsource_path\b|\btenant_id\b|\bknowledge_space_id\b|\bv[wW]_[a-z0-9_]+\b|\brpc_[a-z0-9_]+\b|\bapi[_-]?key\b|\bx-api-key\b|\bbearer\s+[A-Za-z0-9\-\._]+\b|\bauthorization\s*:|\b(client[_-]?secret|refresh[_-]?token|access[_-]?token)\b|\b(password|passwd|secret|token)\s*[:=]|\bprivate[_ -]?key\b|-----BEGIN)'
    );
$$;

create or replace function app_private.assert_ticket_knowledge_note_safe(
  field_name text,
  field_value text,
  max_length integer default 600,
  allow_null boolean default true
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_value text;
begin
  normalized_value := nullif(regexp_replace(btrim(field_value), '\s+', ' ', 'g'), '');

  if normalized_value is null then
    if allow_null then
      return null;
    end if;

    raise exception 'ticket knowledge field "%" is required', field_name;
  end if;

  if max_length is not null and char_length(normalized_value) > max_length then
    raise exception 'ticket knowledge field "%" exceeds % characters', field_name, max_length;
  end if;

  if not app_private.ticket_knowledge_note_is_safe(normalized_value) then
    raise exception 'ticket knowledge field "%" contains restricted content', field_name;
  end if;

  return normalized_value;
end;
$$;

create or replace function app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
begin
  select *
  into v_ticket
  from public.tickets as t
  where t.id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'ticket not found';
  end if;

  return v_ticket;
end;
$$;

create or replace function app_private.resolve_ticket_knowledge_link_article(p_article_id uuid)
returns public.knowledge_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.knowledge_articles;
begin
  select *
  into v_article
  from public.knowledge_articles as ka
  where ka.id = p_article_id;

  if v_article.id is null then
    raise exception 'knowledge article not found';
  end if;

  return v_article;
end;
$$;

create or replace function app_private.require_ticket_knowledge_actor(p_ticket_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_ticket public.tickets;
begin
  v_actor_user_id := app_private.require_active_actor();
  v_ticket := app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id);

  if not app_private.can_access_support_workspace(v_ticket.tenant_id) then
    raise exception 'ticket knowledge linking denied';
  end if;

  return v_actor_user_id;
end;
$$;

create or replace function app_private.validate_ticket_knowledge_article_access(
  p_ticket_id uuid,
  p_article_id uuid,
  p_link_type public.ticket_knowledge_link_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_article public.knowledge_articles;
  v_space_owner_tenant_id uuid;
begin
  v_ticket := app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id);
  v_article := app_private.resolve_ticket_knowledge_link_article(p_article_id);

  if not app_private.can_read_knowledge_article(
    v_article.tenant_id,
    v_article.visibility,
    v_article.status
  ) then
    raise exception 'ticket knowledge article access denied';
  end if;

  select ks.owner_tenant_id
  into v_space_owner_tenant_id
  from public.knowledge_spaces as ks
  where ks.id = v_article.knowledge_space_id;

  if p_link_type = 'sent_to_customer'::public.ticket_knowledge_link_type then
    if v_article.visibility <> 'public'::public.knowledge_visibility
       or v_article.status <> 'published'::public.knowledge_article_status
       or v_article.published_at is null then
      raise exception 'ticket knowledge link sent_to_customer requires public published article';
    end if;

    return;
  end if;

  if v_article.visibility <> 'public'::public.knowledge_visibility
     and v_article.tenant_id is distinct from v_ticket.tenant_id
     and v_space_owner_tenant_id is distinct from v_ticket.tenant_id then
    raise exception 'ticket knowledge cross-tenant article denied';
  end if;
end;
$$;

create or replace function app_private.ticket_knowledge_link_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'ticket_knowledge_links id is immutable';
  end if;

  if new.tenant_id <> old.tenant_id then
    raise exception 'ticket_knowledge_links tenant_id is immutable';
  end if;

  if new.ticket_id <> old.ticket_id then
    raise exception 'ticket_knowledge_links ticket_id is immutable';
  end if;

  if new.article_id is distinct from old.article_id then
    raise exception 'ticket_knowledge_links article_id is immutable';
  end if;

  if new.link_type <> old.link_type then
    raise exception 'ticket_knowledge_links link_type is immutable';
  end if;

  if new.note is distinct from old.note then
    raise exception 'ticket_knowledge_links note is immutable';
  end if;

  if new.created_by_user_id <> old.created_by_user_id then
    raise exception 'ticket_knowledge_links created_by_user_id is immutable';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'ticket_knowledge_links created_at is immutable';
  end if;

  if old.archived_at is not null then
    raise exception 'ticket_knowledge_links archived link is immutable';
  end if;

  if new.archived_at is null or new.archived_by_user_id is null then
    raise exception 'ticket_knowledge_links archive requires archived_at and archived_by_user_id';
  end if;

  return new;
end;
$$;

create table public.ticket_knowledge_links (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null,
  article_id uuid,
  link_type public.ticket_knowledge_link_type not null,
  note text,
  created_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  archived_by_user_id uuid references public.profiles (id),
  constraint ticket_knowledge_links_ticket_fk
    foreign key (ticket_id, tenant_id)
    references public.tickets (id, tenant_id)
    on delete cascade,
  constraint ticket_knowledge_links_article_fk
    foreign key (article_id)
    references public.knowledge_articles (id)
    on delete restrict,
  constraint ticket_knowledge_links_article_required_by_type_check
    check (
      (
        link_type in (
          'documentation_gap'::public.ticket_knowledge_link_type,
          'suggested_article'::public.ticket_knowledge_link_type
        )
      )
      or article_id is not null
    ),
  constraint ticket_knowledge_links_note_length_check
    check (note is null or char_length(note) <= 600),
  constraint ticket_knowledge_links_note_safe_check
    check (note is null or app_private.ticket_knowledge_note_is_safe(note)),
  constraint ticket_knowledge_links_archive_pair_check
    check (
      (archived_at is null and archived_by_user_id is null)
      or (archived_at is not null and archived_by_user_id is not null)
    )
);

create unique index ticket_knowledge_links_active_article_key
  on public.ticket_knowledge_links (ticket_id, article_id, link_type)
  where archived_at is null and article_id is not null;

create index ticket_knowledge_links_ticket_created_idx
  on public.ticket_knowledge_links (ticket_id, created_at desc)
  where archived_at is null;

create index ticket_knowledge_links_tenant_type_created_idx
  on public.ticket_knowledge_links (tenant_id, link_type, created_at desc)
  where archived_at is null;

alter table public.ticket_knowledge_links enable row level security;
alter table public.ticket_knowledge_links force row level security;

create policy ticket_knowledge_links_select_support_visible
on public.ticket_knowledge_links
for select
to authenticated
using (
  app_private.can_access_support_workspace(tenant_id)
  or app_private.can_manage_knowledge_base()
);

create policy ticket_knowledge_links_update_support_visible
on public.ticket_knowledge_links
for update
to authenticated
using (
  app_private.can_access_support_workspace(tenant_id)
  or app_private.can_manage_knowledge_base()
)
with check (
  app_private.can_access_support_workspace(tenant_id)
  or app_private.can_manage_knowledge_base()
);

create trigger ticket_knowledge_links_guard_update
before update on public.ticket_knowledge_links
for each row
execute function app_private.ticket_knowledge_link_guard_update();

create trigger ticket_knowledge_links_prevent_delete
before delete on public.ticket_knowledge_links
for each row
execute function audit.prevent_mutation();

create trigger ticket_knowledge_links_audit
after insert or update or delete on public.ticket_knowledge_links
for each row
execute function audit.capture_row_change();

revoke select, insert, update, delete on public.ticket_knowledge_links from authenticated;

create or replace function app_private.resolve_ticket_knowledge_link_record(p_ticket_knowledge_link_id uuid)
returns public.ticket_knowledge_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.ticket_knowledge_links;
begin
  select *
  into v_link
  from public.ticket_knowledge_links as tkl
  where tkl.id = p_ticket_knowledge_link_id;

  if v_link.id is null then
    raise exception 'ticket knowledge link not found';
  end if;

  return v_link;
end;
$$;

create or replace view public.vw_support_ticket_knowledge_links
with (security_barrier = true)
as
select
  tkl.id as ticket_knowledge_link_id,
  tkl.ticket_id,
  tkl.link_type,
  tkl.note,
  tkl.created_at,
  tkl.created_by_user_id,
  creator.full_name as created_by_full_name,
  tkl.article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  ka.visibility as article_visibility,
  ka.status as article_status,
  (
    ka.id is not null
    and ka.visibility = 'public'::public.knowledge_visibility
    and ka.status = 'published'::public.knowledge_article_status
    and ka.published_at is not null
  ) as is_customer_send_allowed
from public.ticket_knowledge_links as tkl
join public.tickets as t
  on t.id = tkl.ticket_id
 and t.tenant_id = tkl.tenant_id
left join public.knowledge_articles as ka
  on ka.id = tkl.article_id
left join public.profiles as creator
  on creator.id = tkl.created_by_user_id
where tkl.archived_at is null
  and app_private.can_access_support_workspace(tkl.tenant_id);

comment on view public.vw_support_ticket_knowledge_links is
  'Read model contratual para listar vinculos ativos entre ticket e conhecimento no workspace de suporte.';

revoke all on public.vw_support_ticket_knowledge_links from public, anon;
grant select on public.vw_support_ticket_knowledge_links to authenticated, service_role;

create or replace view public.vw_support_knowledge_article_picker
with (security_barrier = true)
as
select
  t.id as ticket_id,
  ka.id as article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  ka.summary as article_summary,
  kc.name as category_name,
  ka.visibility as article_visibility,
  ka.status as article_status,
  (
    ka.visibility = 'public'::public.knowledge_visibility
    and ka.status = 'published'::public.knowledge_article_status
    and ka.published_at is not null
  ) as is_customer_send_allowed
from public.tickets as t
join public.knowledge_articles as ka
  on (
    (
      ka.visibility = 'public'::public.knowledge_visibility
      and ka.status = 'published'::public.knowledge_article_status
      and ka.published_at is not null
    )
    or (
      (
        ka.tenant_id = t.tenant_id
        or exists (
          select 1
          from public.knowledge_spaces as ks
          where ks.id = ka.knowledge_space_id
            and ks.owner_tenant_id = t.tenant_id
        )
      )
      and app_private.can_read_knowledge_article(
        ka.tenant_id,
        ka.visibility,
        ka.status
      )
    )
  )
left join public.knowledge_categories as kc
  on kc.id = ka.category_id
where app_private.can_access_support_workspace(t.tenant_id)
  and ka.archived_at is null;

comment on view public.vw_support_knowledge_article_picker is
  'Read model contratual para buscar artigos utilizaveis no fluxo de vinculacao ticket -> conhecimento.';

revoke all on public.vw_support_knowledge_article_picker from public, anon;
grant select on public.vw_support_knowledge_article_picker to authenticated, service_role;

create or replace view public.vw_customer_portal_ticket_knowledge_links
with (security_barrier = true)
as
select
  tkl.ticket_id,
  tkl.article_id,
  ka.title as article_title,
  ka.slug as article_slug,
  tkl.created_at as sent_at
from public.ticket_knowledge_links as tkl
join public.knowledge_articles as ka
  on ka.id = tkl.article_id
where tkl.archived_at is null
  and tkl.link_type = 'sent_to_customer'::public.ticket_knowledge_link_type
  and ka.visibility = 'public'::public.knowledge_visibility
  and ka.status = 'published'::public.knowledge_article_status
  and ka.published_at is not null;

comment on view public.vw_customer_portal_ticket_knowledge_links is
  'Contrato futuro seguro para expor ao portal B2B apenas artigos publicos publicados enviados ao cliente.';

revoke all on public.vw_customer_portal_ticket_knowledge_links from public, anon, authenticated;
grant select on public.vw_customer_portal_ticket_knowledge_links to service_role;

create or replace function public.rpc_support_link_ticket_article(
  p_ticket_id uuid,
  p_article_id uuid default null,
  p_link_type public.ticket_knowledge_link_type default 'reference_internal',
  p_note text default null
)
returns public.ticket_knowledge_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_ticket public.tickets;
  v_note text;
  v_link public.ticket_knowledge_links;
begin
  v_actor_user_id := app_private.require_ticket_knowledge_actor(p_ticket_id);
  v_ticket := app_private.resolve_ticket_knowledge_link_ticket(p_ticket_id);
  v_note := app_private.assert_ticket_knowledge_note_safe('note', p_note, 600, true);

  if p_link_type in (
    'reference_internal'::public.ticket_knowledge_link_type,
    'sent_to_customer'::public.ticket_knowledge_link_type
  ) and p_article_id is null then
    raise exception 'ticket knowledge article is required for %', p_link_type;
  end if;

  if p_article_id is not null then
    perform app_private.validate_ticket_knowledge_article_access(
      p_ticket_id,
      p_article_id,
      p_link_type
    );
  elsif p_link_type not in (
    'suggested_article'::public.ticket_knowledge_link_type,
    'documentation_gap'::public.ticket_knowledge_link_type
  ) then
    raise exception 'ticket knowledge article is required for %', p_link_type;
  end if;

  if p_article_id is not null then
    select *
    into v_link
    from public.ticket_knowledge_links as tkl
    where tkl.ticket_id = p_ticket_id
      and tkl.article_id = p_article_id
      and tkl.link_type = p_link_type
      and tkl.archived_at is null;

    if v_link.id is not null then
      raise exception 'ticket knowledge link already active';
    end if;
  end if;

  insert into public.ticket_knowledge_links (
    tenant_id,
    ticket_id,
    article_id,
    link_type,
    note,
    created_by_user_id
  )
  values (
    v_ticket.tenant_id,
    p_ticket_id,
    p_article_id,
    p_link_type,
    v_note,
    v_actor_user_id
  )
  returning *
  into v_link;

  return v_link;
end;
$$;

create or replace function public.rpc_support_archive_ticket_article_link(
  p_ticket_knowledge_link_id uuid
)
returns public.ticket_knowledge_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_link public.ticket_knowledge_links;
begin
  v_link := app_private.resolve_ticket_knowledge_link_record(p_ticket_knowledge_link_id);
  v_actor_user_id := app_private.require_ticket_knowledge_actor(v_link.ticket_id);

  if v_link.archived_at is not null then
    raise exception 'ticket knowledge link already archived';
  end if;

  update public.ticket_knowledge_links
  set archived_at = timezone('utc', now()),
      archived_by_user_id = v_actor_user_id
  where id = p_ticket_knowledge_link_id
  returning *
  into v_link;

  return v_link;
end;
$$;

create or replace function public.rpc_support_mark_documentation_gap(
  p_ticket_id uuid,
  p_note text default null,
  p_article_id uuid default null
)
returns public.ticket_knowledge_links
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.rpc_support_link_ticket_article(
    p_ticket_id => p_ticket_id,
    p_article_id => p_article_id,
    p_link_type => 'documentation_gap'::public.ticket_knowledge_link_type,
    p_note => p_note
  );
end;
$$;

create or replace function public.rpc_support_mark_article_needs_update(
  p_ticket_id uuid,
  p_article_id uuid,
  p_note text default null
)
returns public.ticket_knowledge_links
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.rpc_support_link_ticket_article(
    p_ticket_id => p_ticket_id,
    p_article_id => p_article_id,
    p_link_type => 'needs_update'::public.ticket_knowledge_link_type,
    p_note => p_note
  );
end;
$$;

revoke all on function app_private.ticket_knowledge_note_is_safe(text) from public, anon, authenticated, service_role;
revoke all on function app_private.assert_ticket_knowledge_note_safe(text, text, integer, boolean) from public, anon, authenticated, service_role;
revoke all on function app_private.resolve_ticket_knowledge_link_ticket(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.resolve_ticket_knowledge_link_article(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.resolve_ticket_knowledge_link_record(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.require_ticket_knowledge_actor(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.validate_ticket_knowledge_article_access(uuid, uuid, public.ticket_knowledge_link_type) from public, anon, authenticated, service_role;
revoke all on function app_private.ticket_knowledge_link_guard_update() from public, anon, authenticated, service_role;

revoke all on function public.rpc_support_link_ticket_article(uuid, uuid, public.ticket_knowledge_link_type, text) from public, anon;
revoke all on function public.rpc_support_archive_ticket_article_link(uuid) from public, anon;
revoke all on function public.rpc_support_mark_documentation_gap(uuid, text, uuid) from public, anon;
revoke all on function public.rpc_support_mark_article_needs_update(uuid, uuid, text) from public, anon;

grant execute on function public.rpc_support_link_ticket_article(uuid, uuid, public.ticket_knowledge_link_type, text) to authenticated, service_role;
grant execute on function public.rpc_support_archive_ticket_article_link(uuid) to authenticated, service_role;
grant execute on function public.rpc_support_mark_documentation_gap(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.rpc_support_mark_article_needs_update(uuid, uuid, text) to authenticated, service_role;
