create or replace view public.vw_admin_tenants_list
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.has_global_role('platform_admin'::public.platform_role)
  ),
  membership_stats as (
    select
      tm.tenant_id,
      count(*)::integer as membership_count,
      count(*) filter (where tm.status = 'active')::integer as active_membership_count,
      count(*) filter (where tm.status = 'invited')::integer as invited_membership_count,
      count(*) filter (where tm.status = 'revoked')::integer as revoked_membership_count
    from public.tenant_memberships as tm
    group by tm.tenant_id
  ),
  contact_stats as (
    select
      tc.tenant_id,
      count(*)::integer as contact_count,
      count(*) filter (where tc.is_active)::integer as active_contact_count
    from public.tenant_contacts as tc
    group by tc.tenant_id
  ),
  primary_contacts as (
    select distinct on (tc.tenant_id)
      tc.tenant_id,
      tc.id as primary_contact_id,
      tc.linked_user_id as primary_contact_linked_user_id,
      tc.full_name as primary_contact_full_name,
      tc.email as primary_contact_email,
      tc.phone as primary_contact_phone,
      tc.job_title as primary_contact_job_title
    from public.tenant_contacts as tc
    where tc.is_active
    order by tc.tenant_id, tc.is_primary desc, tc.created_at asc, tc.id asc
  )
  select
    t.id,
    t.slug,
    t.legal_name,
    t.display_name,
    t.status,
    t.data_region,
    t.created_at,
    t.updated_at,
    t.created_by_user_id,
    creator.full_name as created_by_full_name,
    t.updated_by_user_id,
    updater.full_name as updated_by_full_name,
    coalesce(ms.membership_count, 0) as membership_count,
    coalesce(ms.active_membership_count, 0) as active_membership_count,
    coalesce(ms.invited_membership_count, 0) as invited_membership_count,
    coalesce(ms.revoked_membership_count, 0) as revoked_membership_count,
    coalesce(cs.contact_count, 0) as contact_count,
    coalesce(cs.active_contact_count, 0) as active_contact_count,
    pc.primary_contact_id,
    pc.primary_contact_linked_user_id,
    pc.primary_contact_full_name,
    pc.primary_contact_email,
    pc.primary_contact_phone,
    pc.primary_contact_job_title
  from current_actor as ca
  join public.tenants as t
    on true
  left join public.profiles as creator
    on creator.id = t.created_by_user_id
  left join public.profiles as updater
    on updater.id = t.updated_by_user_id
  left join membership_stats as ms
    on ms.tenant_id = t.id
  left join contact_stats as cs
    on cs.tenant_id = t.id
  left join primary_contacts as pc
    on pc.tenant_id = t.id
  order by t.created_at desc, t.display_name asc;

create or replace view public.vw_admin_tenant_detail
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.has_global_role('platform_admin'::public.platform_role)
  ),
  membership_stats as (
    select
      tm.tenant_id,
      count(*)::integer as membership_count,
      count(*) filter (where tm.status = 'active')::integer as active_membership_count,
      count(*) filter (where tm.status = 'invited')::integer as invited_membership_count,
      count(*) filter (where tm.status = 'revoked')::integer as revoked_membership_count
    from public.tenant_memberships as tm
    group by tm.tenant_id
  ),
  contact_payload as (
    select
      tc.tenant_id,
      count(*)::integer as contact_count,
      count(*) filter (where tc.is_active)::integer as active_contact_count,
      jsonb_agg(
        jsonb_build_object(
          'id', tc.id,
          'linked_user_id', tc.linked_user_id,
          'linked_user_full_name', linked_profile.full_name,
          'linked_user_email', linked_profile.email,
          'full_name', tc.full_name,
          'email', tc.email,
          'phone', tc.phone,
          'job_title', tc.job_title,
          'is_primary', tc.is_primary,
          'is_active', tc.is_active,
          'created_at', tc.created_at,
          'updated_at', tc.updated_at
        )
        order by tc.is_primary desc, tc.is_active desc, tc.created_at asc, tc.id asc
      ) as contacts
    from public.tenant_contacts as tc
    left join public.profiles as linked_profile
      on linked_profile.id = tc.linked_user_id
    group by tc.tenant_id
  )
  select
    t.id,
    t.slug,
    t.legal_name,
    t.display_name,
    t.status,
    t.data_region,
    t.created_at,
    t.updated_at,
    t.created_by_user_id,
    creator.full_name as created_by_full_name,
    t.updated_by_user_id,
    updater.full_name as updated_by_full_name,
    coalesce(ms.membership_count, 0) as membership_count,
    coalesce(ms.active_membership_count, 0) as active_membership_count,
    coalesce(ms.invited_membership_count, 0) as invited_membership_count,
    coalesce(ms.revoked_membership_count, 0) as revoked_membership_count,
    coalesce(cp.contact_count, 0) as contact_count,
    coalesce(cp.active_contact_count, 0) as active_contact_count,
    coalesce(cp.contacts, '[]'::jsonb) as contacts
  from current_actor as ca
  join public.tenants as t
    on true
  left join public.profiles as creator
    on creator.id = t.created_by_user_id
  left join public.profiles as updater
    on updater.id = t.updated_by_user_id
  left join membership_stats as ms
    on ms.tenant_id = t.id
  left join contact_payload as cp
    on cp.tenant_id = t.id
  order by t.created_at desc, t.display_name asc;

create or replace view public.vw_admin_tenant_memberships
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.has_global_role('platform_admin'::public.platform_role)
  )
  select
    tm.id,
    tm.tenant_id,
    t.slug as tenant_slug,
    t.display_name as tenant_display_name,
    t.status as tenant_status,
    tm.user_id,
    member.full_name as user_full_name,
    member.email as user_email,
    member.avatar_url as user_avatar_url,
    member.is_active as user_is_active,
    tm.role,
    tm.status,
    tm.invited_by_user_id,
    inviter.full_name as invited_by_full_name,
    inviter.email as invited_by_email,
    tm.created_at,
    tm.updated_at,
    tm.created_by_user_id,
    tm.updated_by_user_id
  from current_actor as ca
  join public.tenant_memberships as tm
    on true
  join public.tenants as t
    on t.id = tm.tenant_id
  join public.profiles as member
    on member.id = tm.user_id
  left join public.profiles as inviter
    on inviter.id = tm.invited_by_user_id
  order by t.display_name asc, tm.created_at asc, tm.id asc;

create or replace view public.vw_admin_audit_feed
with (security_barrier = true)
as
  with current_actor as (
    select p.id
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active
      and app_private.has_global_role('platform_admin'::public.platform_role)
  ),
  relevant_logs as (
    select al.*
    from audit.audit_logs as al
    where al.entity_schema = 'public'
      and al.entity_table = any(
        array[
          'profiles',
          'user_global_roles',
          'tenants',
          'tenant_memberships',
          'tenant_contacts'
        ]::text[]
      )
  )
  select
    al.id,
    al.occurred_at,
    al.actor_user_id,
    actor.full_name as actor_full_name,
    actor.email as actor_email,
    coalesce(
      al.tenant_id,
      case
        when al.entity_table = 'tenants' then al.entity_id
        else null
      end
    ) as tenant_id,
    tenant.slug as tenant_slug,
    tenant.display_name as tenant_display_name,
    al.entity_schema,
    al.entity_table,
    al.entity_id,
    al.action,
    al.before_state,
    al.after_state,
    al.metadata
  from current_actor as ca
  join relevant_logs as al
    on true
  left join public.profiles as actor
    on actor.id = al.actor_user_id
  left join public.tenants as tenant
    on tenant.id = coalesce(
      al.tenant_id,
      case
        when al.entity_table = 'tenants' then al.entity_id
        else null
      end
    )
  order by al.occurred_at desc, al.id desc;

revoke all on public.vw_admin_tenants_list from public, anon, authenticated, service_role;
revoke all on public.vw_admin_tenant_detail from public, anon, authenticated, service_role;
revoke all on public.vw_admin_tenant_memberships from public, anon, authenticated, service_role;
revoke all on public.vw_admin_audit_feed from public, anon, authenticated, service_role;

grant select on public.vw_admin_tenants_list to authenticated, service_role;
grant select on public.vw_admin_tenant_detail to authenticated, service_role;
grant select on public.vw_admin_tenant_memberships to authenticated, service_role;
grant select on public.vw_admin_audit_feed to authenticated, service_role;

comment on view public.vw_admin_tenants_list is
  'Read model contratual da lista global de tenants do Admin Console, restrito a platform_admin.';

comment on view public.vw_admin_tenant_detail is
  'Read model contratual do detalhe administrativo do tenant com contatos agregados, restrito a platform_admin.';

comment on view public.vw_admin_tenant_memberships is
  'Read model contratual de memberships por tenant para o Admin Console, restrito a platform_admin.';

comment on view public.vw_admin_audit_feed is
  'Read model contratual do feed administrativo de auditoria, restrito a platform_admin.';
