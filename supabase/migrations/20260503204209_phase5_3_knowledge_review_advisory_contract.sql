create type public.knowledge_advisory_classification as enum (
  'public',
  'internal',
  'restricted',
  'obsolete',
  'duplicate'
);

create type public.knowledge_article_review_status as enum (
  'pending',
  'in_review',
  'needs_changes',
  'ready_for_review',
  'ready_for_publish',
  'reviewed'
);

create table public.knowledge_article_review_advisories (
  id uuid primary key default extensions.gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  source_hash text,
  suggested_visibility public.knowledge_visibility not null default 'internal',
  suggested_classification public.knowledge_advisory_classification not null,
  classification_reason text not null,
  duplicate_group_key text,
  risk_flags jsonb not null default '[]'::jsonb,
  human_confirmations jsonb not null default '{}'::jsonb,
  review_status public.knowledge_article_review_status not null default 'pending',
  review_notes text,
  reviewed_by_user_id uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.profiles (id),
  updated_by_user_id uuid references public.profiles (id),
  constraint knowledge_article_review_advisories_article_key
    unique (article_id),
  constraint knowledge_article_review_advisories_source_hash_not_blank_check
    check (source_hash is null or nullif(btrim(source_hash), '') is not null),
  constraint knowledge_article_review_advisories_reason_not_blank_check
    check (nullif(btrim(classification_reason), '') is not null),
  constraint knowledge_article_review_advisories_duplicate_group_not_blank_check
    check (duplicate_group_key is null or nullif(btrim(duplicate_group_key), '') is not null),
  constraint knowledge_article_review_advisories_risk_flags_array_check
    check (jsonb_typeof(risk_flags) = 'array'),
  constraint knowledge_article_review_advisories_human_confirmations_object_check
    check (jsonb_typeof(human_confirmations) = 'object'),
  constraint knowledge_article_review_advisories_reviewed_pair_check
    check (
      (reviewed_by_user_id is null and reviewed_at is null)
      or (reviewed_by_user_id is not null and reviewed_at is not null)
    )
);

create index knowledge_article_review_advisories_source_hash_idx
  on public.knowledge_article_review_advisories (source_hash);

create index knowledge_article_review_advisories_duplicate_group_idx
  on public.knowledge_article_review_advisories (duplicate_group_key)
  where duplicate_group_key is not null;

create index knowledge_article_review_advisories_review_status_idx
  on public.knowledge_article_review_advisories (review_status, updated_at desc);

create trigger knowledge_article_review_advisories_touch_updated_at
before update on public.knowledge_article_review_advisories
for each row
execute function app_private.touch_updated_at();

create trigger knowledge_article_review_advisories_audit_row_change
after insert or update or delete on public.knowledge_article_review_advisories
for each row
execute function audit.capture_row_change();

alter table public.knowledge_article_review_advisories enable row level security;

create policy knowledge_article_review_advisories_select_managed
on public.knowledge_article_review_advisories
for select
to authenticated
using (app_private.can_manage_knowledge_base());

create policy knowledge_article_review_advisories_write_managed
on public.knowledge_article_review_advisories
for all
to authenticated
using (app_private.can_manage_knowledge_base())
with check (app_private.can_manage_knowledge_base());

revoke select, insert, update, delete on public.knowledge_article_review_advisories from authenticated;

create or replace view public.vw_admin_knowledge_article_review_advisories
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.can_manage_knowledge_base()
  ),
  duplicate_stats as (
    select
      advisory.duplicate_group_key,
      count(*)::integer as duplicate_group_article_count
    from public.knowledge_article_review_advisories as advisory
    where advisory.duplicate_group_key is not null
    group by advisory.duplicate_group_key
  )
  select
    advisory.id,
    advisory.article_id,
    ka.knowledge_space_id,
    ks.slug as knowledge_space_slug,
    ks.display_name as knowledge_space_display_name,
    advisory.source_hash,
    ka.source_path,
    ka.visibility as article_visibility,
    ka.status as article_status,
    ka.title as article_title,
    ka.slug as article_slug,
    ka.summary as article_summary,
    ka.updated_at as article_updated_at,
    ka.category_id,
    kc.name as category_name,
    kc.slug as category_slug,
    advisory.suggested_visibility,
    advisory.suggested_classification,
    advisory.classification_reason,
    advisory.duplicate_group_key,
    coalesce(duplicate_stats.duplicate_group_article_count, 0) as duplicate_group_article_count,
    advisory.risk_flags,
    advisory.human_confirmations,
    advisory.review_status,
    advisory.review_notes,
    advisory.reviewed_by_user_id,
    reviewer.full_name as reviewed_by_full_name,
    advisory.reviewed_at,
    advisory.created_at,
    advisory.updated_at,
    advisory.created_by_user_id,
    creator.full_name as created_by_full_name,
    advisory.updated_by_user_id,
    updater.full_name as updated_by_full_name
  from public.knowledge_article_review_advisories as advisory
  join current_actor
    on true
  join public.knowledge_articles as ka
    on ka.id = advisory.article_id
  join public.knowledge_spaces as ks
    on ks.id = ka.knowledge_space_id
  left join public.knowledge_categories as kc
    on kc.id = ka.category_id
  left join duplicate_stats
    on duplicate_stats.duplicate_group_key = advisory.duplicate_group_key
  left join public.profiles as reviewer
    on reviewer.id = advisory.reviewed_by_user_id
  left join public.profiles as creator
    on creator.id = advisory.created_by_user_id
  left join public.profiles as updater
    on updater.id = advisory.updated_by_user_id;

create or replace function public.rpc_admin_update_knowledge_article_review_status(
  p_article_id uuid,
  p_review_status public.knowledge_article_review_status,
  p_human_confirmations jsonb default null,
  p_review_notes text default null
)
returns public.knowledge_article_review_advisories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_article_review_advisories;
  v_result public.knowledge_article_review_advisories;
  v_notes text;
begin
  v_actor_user_id := app_private.require_active_actor();
  v_notes := case
    when p_review_notes is null then null
    else nullif(btrim(p_review_notes), '')
  end;

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_update_knowledge_article_review_status denied';
  end if;

  if p_human_confirmations is not null
     and jsonb_typeof(p_human_confirmations) <> 'object' then
    raise exception 'human confirmations must be a json object';
  end if;

  select *
  into v_existing
  from public.knowledge_article_review_advisories as advisory
  where advisory.article_id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge review advisory not found';
  end if;

  update public.knowledge_article_review_advisories
  set
    review_status = p_review_status,
    human_confirmations = coalesce(p_human_confirmations, human_confirmations),
    review_notes = case
      when p_review_notes is null then review_notes
      else v_notes
    end,
    reviewed_by_user_id = case
      when p_review_status = 'reviewed' then coalesce(reviewed_by_user_id, v_actor_user_id)
      else null
    end,
    reviewed_at = case
      when p_review_status = 'reviewed' then coalesce(reviewed_at, timezone('utc', now()))
      else null
    end,
    updated_by_user_id = v_actor_user_id
  where article_id = p_article_id
  returning *
  into v_result;

  return v_result;
end;
$$;

create or replace function public.rpc_admin_mark_knowledge_article_reviewed(
  p_article_id uuid,
  p_human_confirmations jsonb default null,
  p_review_notes text default null
)
returns public.knowledge_article_review_advisories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_existing public.knowledge_article_review_advisories;
  v_result public.knowledge_article_review_advisories;
  v_notes text;
begin
  v_actor_user_id := app_private.require_active_actor();
  v_notes := case
    when p_review_notes is null then null
    else nullif(btrim(p_review_notes), '')
  end;

  if not app_private.can_manage_knowledge_base() then
    raise exception 'rpc_admin_mark_knowledge_article_reviewed denied';
  end if;

  if p_human_confirmations is not null
     and jsonb_typeof(p_human_confirmations) <> 'object' then
    raise exception 'human confirmations must be a json object';
  end if;

  select *
  into v_existing
  from public.knowledge_article_review_advisories as advisory
  where advisory.article_id = p_article_id;

  if v_existing.id is null then
    raise exception 'knowledge review advisory not found';
  end if;

  update public.knowledge_article_review_advisories
  set
    review_status = 'reviewed',
    human_confirmations = coalesce(p_human_confirmations, human_confirmations),
    review_notes = case
      when p_review_notes is null then review_notes
      else v_notes
    end,
    reviewed_by_user_id = v_actor_user_id,
    reviewed_at = timezone('utc', now()),
    updated_by_user_id = v_actor_user_id
  where article_id = p_article_id
  returning *
  into v_result;

  return v_result;
end;
$$;

revoke all on public.vw_admin_knowledge_article_review_advisories from public, anon, authenticated, service_role;

grant select on public.vw_admin_knowledge_article_review_advisories to authenticated, service_role;

revoke all on function public.rpc_admin_update_knowledge_article_review_status(uuid, public.knowledge_article_review_status, jsonb, text) from public, anon;
revoke all on function public.rpc_admin_mark_knowledge_article_reviewed(uuid, jsonb, text) from public, anon;

grant execute on function public.rpc_admin_update_knowledge_article_review_status(uuid, public.knowledge_article_review_status, jsonb, text) to authenticated, service_role;
grant execute on function public.rpc_admin_mark_knowledge_article_reviewed(uuid, jsonb, text) to authenticated, service_role;

comment on table public.knowledge_article_review_advisories is
  'Apoio persistente de curadoria editorial para artigos da Knowledge Base sem automação de publicação.';

comment on view public.vw_admin_knowledge_article_review_advisories is
  'Read model contratual de advisories editoriais da Knowledge Base para o Admin Console.';
