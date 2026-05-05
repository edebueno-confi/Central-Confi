create type public.customer_product_line as enum (
  'genius_returns',
  'after_sale',
  'hybrid',
  'other'
);

create type public.customer_operational_status as enum (
  'onboarding',
  'active',
  'limited',
  'suspended',
  'legacy'
);

create type public.customer_integration_type as enum (
  'ecommerce_platform',
  'erp',
  'oms',
  'logistics_provider',
  'carrier',
  'gateway',
  'refund_provider',
  'custom_api',
  'other'
);

create type public.customer_integration_status as enum (
  'planned',
  'active',
  'degraded',
  'disabled',
  'deprecated'
);

create type public.customer_integration_environment as enum (
  'production',
  'sandbox',
  'staging',
  'other'
);

create type public.customer_customization_risk_level as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.customer_alert_severity as enum (
  'info',
  'warning',
  'high',
  'critical'
);

create or replace function app_private.customer_account_text_is_safe(input_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    input_text is null
    or (
      input_text !~* '(https?://|localhost|127\.0\.0\.1|\.internal\b|\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b|\bapi[_-]?key\b|\bx-api-key\b|\bbearer\s+[A-Za-z0-9\-\._]+\b|\bauthorization\s*:|\b(client[_-]?secret|refresh[_-]?token|access[_-]?token)\b|\b(password|passwd|secret|token)\s*[:=]|\bprivate[_ -]?key\b|-----BEGIN)'
    );
$$;

create or replace function app_private.customer_account_flags_are_valid(input_flags jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    input_flags is not null
    and jsonb_typeof(input_flags) = 'object'
    and not exists (
      select 1
      from jsonb_each(input_flags) as flag_entry(key, value)
      where flag_entry.key <> all(
        array[
          'high_touch_account',
          'custom_operational_flow',
          'financial_attention_required',
          'restricted_support_window',
          'integration_sensitive_account'
        ]::text[]
      )
      or jsonb_typeof(flag_entry.value) <> 'boolean'
    );
$$;

create or replace function app_private.customer_account_customization_status_is_valid(input_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(input_status = any(array['draft', 'active', 'deprecated', 'archived']::text[]), false);
$$;

create or replace function app_private.require_customer_account_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
begin
  v_actor_user_id := app_private.require_active_actor();

  if not app_private.has_global_role('platform_admin'::public.platform_role) then
    raise exception 'customer account admin required';
  end if;

  return v_actor_user_id;
end;
$$;

create or replace function app_private.can_read_customer_account_context(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.can_access_support_workspace(target_tenant_id);
$$;

create or replace function app_private.can_read_customer_account_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_global_role('platform_admin'::public.platform_role);
$$;

create or replace function app_private.assert_customer_account_safe_text(
  field_name text,
  field_value text,
  max_length integer default null,
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
  normalized_value := nullif(btrim(field_value), '');

  if normalized_value is null then
    if allow_null then
      return null;
    end if;

    raise exception 'customer account field "%" is required', field_name;
  end if;

  if max_length is not null and char_length(normalized_value) > max_length then
    raise exception 'customer account field "%" exceeds % characters', field_name, max_length;
  end if;

  if not app_private.customer_account_text_is_safe(normalized_value) then
    raise exception 'customer account field "%" contains restricted content', field_name;
  end if;

  return normalized_value;
end;
$$;

create or replace function app_private.assert_customer_account_flags(input_flags jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_flags jsonb := coalesce(input_flags, '{}'::jsonb);
begin
  if not app_private.customer_account_flags_are_valid(normalized_flags) then
    raise exception 'customer account operational_flags invalid';
  end if;

  return normalized_flags;
end;
$$;

create or replace function app_private.customer_account_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id <> old.tenant_id then
    raise exception '% tenant_id is immutable', tg_table_name;
  end if;

  if new.created_by_user_id <> old.created_by_user_id then
    raise exception '% created_by_user_id is immutable', tg_table_name;
  end if;

  if new.created_at <> old.created_at then
    raise exception '% created_at is immutable', tg_table_name;
  end if;

  if new.updated_by_user_id is null then
    raise exception '% updated_by_user_id is required', tg_table_name;
  end if;

  return new;
end;
$$;

create table public.customer_account_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product_line public.customer_product_line not null,
  operational_status public.customer_operational_status not null,
  account_tier text not null,
  internal_notes text,
  operational_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid not null references public.profiles (id),
  updated_by_user_id uuid not null references public.profiles (id),
  constraint customer_account_profiles_account_tier_not_blank_check
    check (nullif(btrim(account_tier), '') is not null),
  constraint customer_account_profiles_account_tier_safe_check
    check (app_private.customer_account_text_is_safe(account_tier)),
  constraint customer_account_profiles_internal_notes_safe_check
    check (internal_notes is null or app_private.customer_account_text_is_safe(internal_notes)),
  constraint customer_account_profiles_internal_notes_length_check
    check (internal_notes is null or char_length(internal_notes) <= 1000),
  constraint customer_account_profiles_operational_flags_valid_check
    check (app_private.customer_account_flags_are_valid(operational_flags))
);

create unique index customer_account_profiles_tenant_key
  on public.customer_account_profiles (tenant_id);

create table public.customer_account_integrations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  integration_type public.customer_integration_type not null,
  provider text not null,
  status public.customer_integration_status not null,
  environment public.customer_integration_environment not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid not null references public.profiles (id),
  updated_by_user_id uuid not null references public.profiles (id),
  constraint customer_account_integrations_provider_not_blank_check
    check (nullif(btrim(provider), '') is not null),
  constraint customer_account_integrations_provider_safe_check
    check (app_private.customer_account_text_is_safe(provider)),
  constraint customer_account_integrations_provider_length_check
    check (char_length(provider) <= 120),
  constraint customer_account_integrations_notes_safe_check
    check (notes is null or app_private.customer_account_text_is_safe(notes)),
  constraint customer_account_integrations_notes_length_check
    check (notes is null or char_length(notes) <= 800)
);

create unique index customer_account_integrations_tenant_type_provider_env_key
  on public.customer_account_integrations (tenant_id, integration_type, lower(provider), environment);

create index customer_account_integrations_tenant_status_idx
  on public.customer_account_integrations (tenant_id, status, environment);

create table public.customer_account_features (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  source text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid not null references public.profiles (id),
  updated_by_user_id uuid not null references public.profiles (id),
  constraint customer_account_features_feature_key_not_blank_check
    check (nullif(btrim(feature_key), '') is not null),
  constraint customer_account_features_feature_key_safe_check
    check (app_private.customer_account_text_is_safe(feature_key)),
  constraint customer_account_features_feature_key_length_check
    check (char_length(feature_key) <= 120),
  constraint customer_account_features_source_not_blank_check
    check (nullif(btrim(source), '') is not null),
  constraint customer_account_features_source_safe_check
    check (app_private.customer_account_text_is_safe(source)),
  constraint customer_account_features_source_length_check
    check (char_length(source) <= 120),
  constraint customer_account_features_notes_safe_check
    check (notes is null or app_private.customer_account_text_is_safe(notes)),
  constraint customer_account_features_notes_length_check
    check (notes is null or char_length(notes) <= 600)
);

create unique index customer_account_features_tenant_feature_key
  on public.customer_account_features (tenant_id, lower(feature_key));

create index customer_account_features_tenant_enabled_idx
  on public.customer_account_features (tenant_id, enabled, feature_key);

create table public.customer_account_customizations (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  description text not null,
  risk_level public.customer_customization_risk_level not null,
  operational_note text,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid not null references public.profiles (id),
  updated_by_user_id uuid not null references public.profiles (id),
  constraint customer_account_customizations_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint customer_account_customizations_title_safe_check
    check (app_private.customer_account_text_is_safe(title)),
  constraint customer_account_customizations_title_length_check
    check (char_length(title) <= 160),
  constraint customer_account_customizations_description_not_blank_check
    check (nullif(btrim(description), '') is not null),
  constraint customer_account_customizations_description_safe_check
    check (app_private.customer_account_text_is_safe(description)),
  constraint customer_account_customizations_description_length_check
    check (char_length(description) <= 1200),
  constraint customer_account_customizations_operational_note_safe_check
    check (operational_note is null or app_private.customer_account_text_is_safe(operational_note)),
  constraint customer_account_customizations_operational_note_length_check
    check (operational_note is null or char_length(operational_note) <= 800),
  constraint customer_account_customizations_status_not_blank_check
    check (nullif(btrim(status), '') is not null),
  constraint customer_account_customizations_status_valid_check
    check (app_private.customer_account_customization_status_is_valid(status))
);

create index customer_account_customizations_tenant_status_idx
  on public.customer_account_customizations (tenant_id, status, risk_level, updated_at desc);

create table public.customer_account_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  severity public.customer_alert_severity not null,
  title text not null,
  description text not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid not null references public.profiles (id),
  updated_by_user_id uuid not null references public.profiles (id),
  constraint customer_account_alerts_title_not_blank_check
    check (nullif(btrim(title), '') is not null),
  constraint customer_account_alerts_title_safe_check
    check (app_private.customer_account_text_is_safe(title)),
  constraint customer_account_alerts_title_length_check
    check (char_length(title) <= 160),
  constraint customer_account_alerts_description_not_blank_check
    check (nullif(btrim(description), '') is not null),
  constraint customer_account_alerts_description_safe_check
    check (app_private.customer_account_text_is_safe(description)),
  constraint customer_account_alerts_description_length_check
    check (char_length(description) <= 1000),
  constraint customer_account_alerts_expires_at_after_created_at_check
    check (expires_at is null or expires_at > created_at)
);

create index customer_account_alerts_tenant_active_idx
  on public.customer_account_alerts (tenant_id, active, severity, expires_at);

alter table public.customer_account_profiles enable row level security;
alter table public.customer_account_integrations enable row level security;
alter table public.customer_account_features enable row level security;
alter table public.customer_account_customizations enable row level security;
alter table public.customer_account_alerts enable row level security;

create policy customer_account_profiles_support_read
  on public.customer_account_profiles
  for select
  to authenticated
  using (
    app_private.can_read_customer_account_context(tenant_id)
    or app_private.can_read_customer_account_admin()
  );

create policy customer_account_integrations_support_read
  on public.customer_account_integrations
  for select
  to authenticated
  using (
    app_private.can_read_customer_account_context(tenant_id)
    or app_private.can_read_customer_account_admin()
  );

create policy customer_account_features_support_read
  on public.customer_account_features
  for select
  to authenticated
  using (
    app_private.can_read_customer_account_context(tenant_id)
    or app_private.can_read_customer_account_admin()
  );

create policy customer_account_customizations_support_read
  on public.customer_account_customizations
  for select
  to authenticated
  using (
    app_private.can_read_customer_account_context(tenant_id)
    or app_private.can_read_customer_account_admin()
  );

create policy customer_account_alerts_support_read
  on public.customer_account_alerts
  for select
  to authenticated
  using (
    app_private.can_read_customer_account_context(tenant_id)
    or app_private.can_read_customer_account_admin()
  );

create policy customer_account_profiles_admin_write
  on public.customer_account_profiles
  for all
  to authenticated
  using (app_private.can_read_customer_account_admin())
  with check (app_private.can_read_customer_account_admin());

create policy customer_account_integrations_admin_write
  on public.customer_account_integrations
  for all
  to authenticated
  using (app_private.can_read_customer_account_admin())
  with check (app_private.can_read_customer_account_admin());

create policy customer_account_features_admin_write
  on public.customer_account_features
  for all
  to authenticated
  using (app_private.can_read_customer_account_admin())
  with check (app_private.can_read_customer_account_admin());

create policy customer_account_customizations_admin_write
  on public.customer_account_customizations
  for all
  to authenticated
  using (app_private.can_read_customer_account_admin())
  with check (app_private.can_read_customer_account_admin());

create policy customer_account_alerts_admin_write
  on public.customer_account_alerts
  for all
  to authenticated
  using (app_private.can_read_customer_account_admin())
  with check (app_private.can_read_customer_account_admin());

create trigger customer_account_profiles_guard_update
before update on public.customer_account_profiles
for each row
execute function app_private.customer_account_guard_update();

create trigger customer_account_profiles_touch_updated_at
before update on public.customer_account_profiles
for each row
execute function app_private.touch_updated_at();

create trigger customer_account_integrations_guard_update
before update on public.customer_account_integrations
for each row
execute function app_private.customer_account_guard_update();

create trigger customer_account_integrations_touch_updated_at
before update on public.customer_account_integrations
for each row
execute function app_private.touch_updated_at();

create trigger customer_account_features_guard_update
before update on public.customer_account_features
for each row
execute function app_private.customer_account_guard_update();

create trigger customer_account_features_touch_updated_at
before update on public.customer_account_features
for each row
execute function app_private.touch_updated_at();

create trigger customer_account_customizations_guard_update
before update on public.customer_account_customizations
for each row
execute function app_private.customer_account_guard_update();

create trigger customer_account_customizations_touch_updated_at
before update on public.customer_account_customizations
for each row
execute function app_private.touch_updated_at();

create trigger customer_account_alerts_guard_update
before update on public.customer_account_alerts
for each row
execute function app_private.customer_account_guard_update();

create trigger customer_account_alerts_touch_updated_at
before update on public.customer_account_alerts
for each row
execute function app_private.touch_updated_at();

create trigger customer_account_profiles_audit_change
after insert or update or delete on public.customer_account_profiles
for each row
execute function audit.capture_row_change();

create trigger customer_account_integrations_audit_change
after insert or update or delete on public.customer_account_integrations
for each row
execute function audit.capture_row_change();

create trigger customer_account_features_audit_change
after insert or update or delete on public.customer_account_features
for each row
execute function audit.capture_row_change();

create trigger customer_account_customizations_audit_change
after insert or update or delete on public.customer_account_customizations
for each row
execute function audit.capture_row_change();

create trigger customer_account_alerts_audit_change
after insert or update or delete on public.customer_account_alerts
for each row
execute function audit.capture_row_change();

create or replace view public.vw_support_customer_account_context
with (security_barrier = true)
as
  with accessible_tenants as (
    select
      customer_360.tenant_id,
      customer_360.tenant_slug,
      customer_360.tenant_display_name,
      customer_360.tenant_legal_name,
      customer_360.tenant_status,
      customer_360.active_contacts_count,
      customer_360.total_ticket_count,
      customer_360.open_ticket_count,
      customer_360.ticket_status_counts,
      customer_360.active_contacts
    from public.vw_support_customer_360 as customer_360
    where app_private.can_read_customer_account_context(customer_360.tenant_id)
  )
  select
    tenant_scope.tenant_id,
    tenant_scope.tenant_slug,
    tenant_scope.tenant_display_name,
    tenant_scope.tenant_legal_name,
    tenant_scope.tenant_status,
    profile.id as profile_id,
    profile.product_line,
    profile.operational_status,
    profile.account_tier,
    profile.internal_notes,
    coalesce(profile.operational_flags, '{}'::jsonb) as operational_flags,
    tenant_scope.active_contacts_count,
    tenant_scope.total_ticket_count,
    tenant_scope.open_ticket_count,
    coalesce(tenant_scope.ticket_status_counts, '{}'::jsonb) as ticket_status_counts,
    coalesce(tenant_scope.active_contacts, '[]'::jsonb) as active_contacts,
    coalesce(integration_summary.integrations, '[]'::jsonb) as integrations,
    coalesce(feature_summary.enabled_features, '[]'::jsonb) as enabled_features,
    coalesce(customization_summary.active_customizations, '[]'::jsonb) as active_customizations,
    coalesce(alert_summary.active_alerts, '[]'::jsonb) as active_alerts
  from accessible_tenants as tenant_scope
  left join public.customer_account_profiles as profile
    on profile.tenant_id = tenant_scope.tenant_id
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', integration.id,
          'integration_type', integration.integration_type,
          'provider', integration.provider,
          'status', integration.status,
          'environment', integration.environment,
          'notes', integration.notes
        )
        order by integration.integration_type, lower(integration.provider), integration.environment
      ) as integrations
    from public.customer_account_integrations as integration
    where integration.tenant_id = tenant_scope.tenant_id
  ) as integration_summary
    on true
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object(
          'feature_key', feature.feature_key,
          'enabled', feature.enabled,
          'source', feature.source,
          'notes', feature.notes
        )
        order by lower(feature.feature_key)
      ) as enabled_features
    from public.customer_account_features as feature
    where feature.tenant_id = tenant_scope.tenant_id
      and feature.enabled
  ) as feature_summary
    on true
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', customization.id,
          'title', customization.title,
          'description', customization.description,
          'risk_level', customization.risk_level,
          'operational_note', customization.operational_note,
          'status', customization.status
        )
        order by
          case customization.risk_level
            when 'critical' then 4
            when 'high' then 3
            when 'medium' then 2
            else 1
          end desc,
          lower(customization.title)
      ) as active_customizations
    from public.customer_account_customizations as customization
    where customization.tenant_id = tenant_scope.tenant_id
      and customization.status = 'active'
  ) as customization_summary
    on true
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', alert.id,
          'severity', alert.severity,
          'title', alert.title,
          'description', alert.description,
          'expires_at', alert.expires_at
        )
        order by
          case alert.severity
            when 'critical' then 4
            when 'high' then 3
            when 'warning' then 2
            else 1
          end desc,
          lower(alert.title)
      ) as active_alerts
    from public.customer_account_alerts as alert
    where alert.tenant_id = tenant_scope.tenant_id
      and alert.active
      and (alert.expires_at is null or alert.expires_at > timezone('utc', now()))
  ) as alert_summary
    on true;

create or replace view public.vw_admin_customer_account_profiles
with (security_barrier = true)
as
  with admin_visible as (
    select
      tenant.id as tenant_id,
      tenant.slug as tenant_slug,
      tenant.display_name as tenant_display_name,
      tenant.legal_name as tenant_legal_name,
      tenant.status as tenant_status,
      profile.id as profile_id,
      profile.product_line,
      profile.operational_status,
      profile.account_tier,
      profile.internal_notes,
      profile.operational_flags,
      profile.created_at,
      profile.updated_at,
      profile.created_by_user_id,
      created_by.full_name as created_by_full_name,
      profile.updated_by_user_id,
      updated_by.full_name as updated_by_full_name
    from public.tenants as tenant
    join public.customer_account_profiles as profile
      on profile.tenant_id = tenant.id
    left join public.profiles as created_by
      on created_by.id = profile.created_by_user_id
    left join public.profiles as updated_by
      on updated_by.id = profile.updated_by_user_id
    where app_private.can_read_customer_account_admin()
  )
  select
    admin_visible.tenant_id,
    admin_visible.tenant_slug,
    admin_visible.tenant_display_name,
    admin_visible.tenant_legal_name,
    admin_visible.tenant_status,
    admin_visible.profile_id,
    admin_visible.product_line,
    admin_visible.operational_status,
    admin_visible.account_tier,
    admin_visible.internal_notes,
    admin_visible.operational_flags,
    admin_visible.created_at,
    admin_visible.updated_at,
    admin_visible.created_by_user_id,
    admin_visible.created_by_full_name,
    admin_visible.updated_by_user_id,
    admin_visible.updated_by_full_name,
    coalesce(integration_summary.integrations_count, 0) as integrations_count,
    coalesce(integration_summary.integrations, '[]'::jsonb) as integrations,
    coalesce(feature_summary.features_count, 0) as features_count,
    coalesce(feature_summary.features, '[]'::jsonb) as features,
    coalesce(customization_summary.customizations_count, 0) as customizations_count,
    coalesce(customization_summary.customizations, '[]'::jsonb) as customizations,
    coalesce(alert_summary.alerts_count, 0) as alerts_count,
    coalesce(alert_summary.alerts, '[]'::jsonb) as alerts
  from admin_visible
  left join lateral (
    select
      count(*)::integer as integrations_count,
      jsonb_agg(
        jsonb_build_object(
          'id', integration.id,
          'integration_type', integration.integration_type,
          'provider', integration.provider,
          'status', integration.status,
          'environment', integration.environment,
          'notes', integration.notes,
          'created_at', integration.created_at,
          'updated_at', integration.updated_at
        )
        order by integration.integration_type, lower(integration.provider), integration.environment
      ) as integrations
    from public.customer_account_integrations as integration
    where integration.tenant_id = admin_visible.tenant_id
  ) as integration_summary
    on true
  left join lateral (
    select
      count(*)::integer as features_count,
      jsonb_agg(
        jsonb_build_object(
          'id', feature.id,
          'feature_key', feature.feature_key,
          'enabled', feature.enabled,
          'source', feature.source,
          'notes', feature.notes,
          'created_at', feature.created_at,
          'updated_at', feature.updated_at
        )
        order by lower(feature.feature_key)
      ) as features
    from public.customer_account_features as feature
    where feature.tenant_id = admin_visible.tenant_id
  ) as feature_summary
    on true
  left join lateral (
    select
      count(*)::integer as customizations_count,
      jsonb_agg(
        jsonb_build_object(
          'id', customization.id,
          'title', customization.title,
          'description', customization.description,
          'risk_level', customization.risk_level,
          'operational_note', customization.operational_note,
          'status', customization.status,
          'created_at', customization.created_at,
          'updated_at', customization.updated_at
        )
        order by
          case customization.risk_level
            when 'critical' then 4
            when 'high' then 3
            when 'medium' then 2
            else 1
          end desc,
          lower(customization.title)
      ) as customizations
    from public.customer_account_customizations as customization
    where customization.tenant_id = admin_visible.tenant_id
  ) as customization_summary
    on true
  left join lateral (
    select
      count(*)::integer as alerts_count,
      jsonb_agg(
        jsonb_build_object(
          'id', alert.id,
          'severity', alert.severity,
          'title', alert.title,
          'description', alert.description,
          'active', alert.active,
          'expires_at', alert.expires_at,
          'created_at', alert.created_at,
          'updated_at', alert.updated_at
        )
        order by
          case alert.severity
            when 'critical' then 4
            when 'high' then 3
            when 'warning' then 2
            else 1
          end desc,
          lower(alert.title)
      ) as alerts
    from public.customer_account_alerts as alert
    where alert.tenant_id = admin_visible.tenant_id
  ) as alert_summary
    on true;

create or replace function app_private.upsert_customer_account_features(
  p_tenant_id uuid,
  p_features jsonb,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  feature_entry jsonb;
  normalized_feature_key text;
  normalized_source text;
  normalized_notes text;
begin
  if p_features is null then
    return;
  end if;

  if jsonb_typeof(p_features) <> 'array' then
    raise exception 'customer account features payload invalid';
  end if;

  for feature_entry in
    select value
    from jsonb_array_elements(p_features)
  loop
    normalized_feature_key := lower(
      app_private.assert_customer_account_safe_text(
        'feature_key',
        feature_entry ->> 'feature_key',
        120,
        false
      )
    );

    normalized_source := lower(
      app_private.assert_customer_account_safe_text(
        'feature_source',
        feature_entry ->> 'source',
        120,
        false
      )
    );

    normalized_notes := app_private.assert_customer_account_safe_text(
      'feature_notes',
      feature_entry ->> 'notes',
      600,
      true
    );

    insert into public.customer_account_features (
      tenant_id,
      feature_key,
      enabled,
      source,
      notes,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      p_tenant_id,
      normalized_feature_key,
      coalesce((feature_entry ->> 'enabled')::boolean, false),
      normalized_source,
      normalized_notes,
      p_actor_user_id,
      p_actor_user_id
    )
    on conflict (tenant_id, lower(feature_key))
    do update
    set
      enabled = excluded.enabled,
      source = excluded.source,
      notes = excluded.notes,
      updated_by_user_id = p_actor_user_id;
  end loop;
end;
$$;

create or replace function public.rpc_admin_upsert_customer_account_profile(
  p_tenant_id uuid,
  p_product_line public.customer_product_line,
  p_operational_status public.customer_operational_status,
  p_account_tier text,
  p_internal_notes text default null,
  p_operational_flags jsonb default '{}'::jsonb,
  p_features jsonb default null
)
returns public.customer_account_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_profile public.customer_account_profiles;
begin
  v_actor_user_id := app_private.require_customer_account_admin();

  if not exists (
    select 1
    from public.tenants as tenant
    where tenant.id = p_tenant_id
  ) then
    raise exception 'tenant not found';
  end if;

  insert into public.customer_account_profiles (
    tenant_id,
    product_line,
    operational_status,
    account_tier,
    internal_notes,
    operational_flags,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_product_line,
    p_operational_status,
    lower(app_private.assert_customer_account_safe_text('account_tier', p_account_tier, 80, false)),
    app_private.assert_customer_account_safe_text('internal_notes', p_internal_notes, 1000, true),
    app_private.assert_customer_account_flags(p_operational_flags),
    v_actor_user_id,
    v_actor_user_id
  )
  on conflict (tenant_id)
  do update
  set
    product_line = excluded.product_line,
    operational_status = excluded.operational_status,
    account_tier = excluded.account_tier,
    internal_notes = excluded.internal_notes,
    operational_flags = excluded.operational_flags,
    updated_by_user_id = v_actor_user_id
  returning *
  into v_profile;

  perform app_private.upsert_customer_account_features(
    p_tenant_id,
    p_features,
    v_actor_user_id
  );

  return v_profile;
end;
$$;

create or replace function public.rpc_admin_add_customer_integration(
  p_tenant_id uuid,
  p_integration_type public.customer_integration_type,
  p_provider text,
  p_status public.customer_integration_status,
  p_environment public.customer_integration_environment,
  p_notes text default null
)
returns public.customer_account_integrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_integration public.customer_account_integrations;
begin
  v_actor_user_id := app_private.require_customer_account_admin();

  if not exists (
    select 1
    from public.tenants as tenant
    where tenant.id = p_tenant_id
  ) then
    raise exception 'tenant not found';
  end if;

  insert into public.customer_account_integrations (
    tenant_id,
    integration_type,
    provider,
    status,
    environment,
    notes,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_integration_type,
    app_private.assert_customer_account_safe_text('integration_provider', p_provider, 120, false),
    p_status,
    p_environment,
    app_private.assert_customer_account_safe_text('integration_notes', p_notes, 800, true),
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_integration;

  return v_integration;
end;
$$;

create or replace function public.rpc_admin_update_customer_integration(
  p_integration_id uuid,
  p_status public.customer_integration_status,
  p_environment public.customer_integration_environment,
  p_notes text default null
)
returns public.customer_account_integrations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_integration public.customer_account_integrations;
begin
  v_actor_user_id := app_private.require_customer_account_admin();

  update public.customer_account_integrations
  set
    status = p_status,
    environment = p_environment,
    notes = app_private.assert_customer_account_safe_text('integration_notes', p_notes, 800, true),
    updated_by_user_id = v_actor_user_id
  where id = p_integration_id
  returning *
  into v_integration;

  if v_integration.id is null then
    raise exception 'customer integration not found';
  end if;

  return v_integration;
end;
$$;

create or replace function public.rpc_admin_add_customer_customization(
  p_tenant_id uuid,
  p_title text,
  p_description text,
  p_risk_level public.customer_customization_risk_level,
  p_operational_note text default null,
  p_status text default 'active'
)
returns public.customer_account_customizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_customization public.customer_account_customizations;
  v_status text;
begin
  v_actor_user_id := app_private.require_customer_account_admin();
  v_status := lower(app_private.assert_customer_account_safe_text('customization_status', p_status, 40, false));

  if not app_private.customer_account_customization_status_is_valid(v_status) then
    raise exception 'customer customization status invalid';
  end if;

  insert into public.customer_account_customizations (
    tenant_id,
    title,
    description,
    risk_level,
    operational_note,
    status,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    app_private.assert_customer_account_safe_text('customization_title', p_title, 160, false),
    app_private.assert_customer_account_safe_text('customization_description', p_description, 1200, false),
    p_risk_level,
    app_private.assert_customer_account_safe_text('customization_operational_note', p_operational_note, 800, true),
    v_status,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_customization;

  return v_customization;
end;
$$;

create or replace function public.rpc_admin_update_customer_customization(
  p_customization_id uuid,
  p_title text,
  p_description text,
  p_risk_level public.customer_customization_risk_level,
  p_operational_note text default null,
  p_status text default 'active'
)
returns public.customer_account_customizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_customization public.customer_account_customizations;
  v_status text;
begin
  v_actor_user_id := app_private.require_customer_account_admin();
  v_status := lower(app_private.assert_customer_account_safe_text('customization_status', p_status, 40, false));

  if not app_private.customer_account_customization_status_is_valid(v_status) then
    raise exception 'customer customization status invalid';
  end if;

  update public.customer_account_customizations
  set
    title = app_private.assert_customer_account_safe_text('customization_title', p_title, 160, false),
    description = app_private.assert_customer_account_safe_text('customization_description', p_description, 1200, false),
    risk_level = p_risk_level,
    operational_note = app_private.assert_customer_account_safe_text('customization_operational_note', p_operational_note, 800, true),
    status = v_status,
    updated_by_user_id = v_actor_user_id
  where id = p_customization_id
  returning *
  into v_customization;

  if v_customization.id is null then
    raise exception 'customer customization not found';
  end if;

  return v_customization;
end;
$$;

create or replace function public.rpc_admin_add_customer_account_alert(
  p_tenant_id uuid,
  p_severity public.customer_alert_severity,
  p_title text,
  p_description text,
  p_expires_at timestamptz default null
)
returns public.customer_account_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_alert public.customer_account_alerts;
begin
  v_actor_user_id := app_private.require_customer_account_admin();

  insert into public.customer_account_alerts (
    tenant_id,
    severity,
    title,
    description,
    active,
    expires_at,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_tenant_id,
    p_severity,
    app_private.assert_customer_account_safe_text('alert_title', p_title, 160, false),
    app_private.assert_customer_account_safe_text('alert_description', p_description, 1000, false),
    true,
    p_expires_at,
    v_actor_user_id,
    v_actor_user_id
  )
  returning *
  into v_alert;

  return v_alert;
end;
$$;

create or replace function public.rpc_admin_archive_customer_account_alert(
  p_alert_id uuid
)
returns public.customer_account_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid;
  v_alert public.customer_account_alerts;
begin
  v_actor_user_id := app_private.require_customer_account_admin();

  update public.customer_account_alerts
  set
    active = false,
    updated_by_user_id = v_actor_user_id
  where id = p_alert_id
  returning *
  into v_alert;

  if v_alert.id is null then
    raise exception 'customer account alert not found';
  end if;

  return v_alert;
end;
$$;

revoke all on public.customer_account_profiles from public, anon, authenticated;
revoke all on public.customer_account_integrations from public, anon, authenticated;
revoke all on public.customer_account_features from public, anon, authenticated;
revoke all on public.customer_account_customizations from public, anon, authenticated;
revoke all on public.customer_account_alerts from public, anon, authenticated;

revoke all on public.vw_support_customer_account_context from public, anon, authenticated, service_role;
revoke all on public.vw_admin_customer_account_profiles from public, anon, authenticated, service_role;

grant select on public.vw_support_customer_account_context to authenticated, service_role;
grant select on public.vw_admin_customer_account_profiles to authenticated, service_role;

revoke all on function app_private.customer_account_text_is_safe(text) from public, anon, authenticated, service_role;
revoke all on function app_private.customer_account_flags_are_valid(jsonb) from public, anon, authenticated, service_role;
revoke all on function app_private.customer_account_customization_status_is_valid(text) from public, anon, authenticated, service_role;
revoke all on function app_private.require_customer_account_admin() from public, anon, authenticated, service_role;
revoke all on function app_private.can_read_customer_account_context(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.can_read_customer_account_admin() from public, anon, authenticated, service_role;
revoke all on function app_private.assert_customer_account_safe_text(text, text, integer, boolean) from public, anon, authenticated, service_role;
revoke all on function app_private.assert_customer_account_flags(jsonb) from public, anon, authenticated, service_role;
revoke all on function app_private.customer_account_guard_update() from public, anon, authenticated, service_role;
revoke all on function app_private.upsert_customer_account_features(uuid, jsonb, uuid) from public, anon, authenticated, service_role;

grant execute on function app_private.can_read_customer_account_context(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_customer_account_admin() to authenticated, service_role;

revoke all on function public.rpc_admin_upsert_customer_account_profile(uuid, public.customer_product_line, public.customer_operational_status, text, text, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_add_customer_integration(uuid, public.customer_integration_type, text, public.customer_integration_status, public.customer_integration_environment, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_customer_integration(uuid, public.customer_integration_status, public.customer_integration_environment, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_add_customer_customization(uuid, text, text, public.customer_customization_risk_level, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_update_customer_customization(uuid, text, text, public.customer_customization_risk_level, text, text) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_add_customer_account_alert(uuid, public.customer_alert_severity, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.rpc_admin_archive_customer_account_alert(uuid) from public, anon, authenticated, service_role;

grant execute on function public.rpc_admin_upsert_customer_account_profile(uuid, public.customer_product_line, public.customer_operational_status, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.rpc_admin_add_customer_integration(uuid, public.customer_integration_type, text, public.customer_integration_status, public.customer_integration_environment, text) to authenticated;
grant execute on function public.rpc_admin_update_customer_integration(uuid, public.customer_integration_status, public.customer_integration_environment, text) to authenticated;
grant execute on function public.rpc_admin_add_customer_customization(uuid, text, text, public.customer_customization_risk_level, text, text) to authenticated;
grant execute on function public.rpc_admin_update_customer_customization(uuid, text, text, public.customer_customization_risk_level, text, text) to authenticated;
grant execute on function public.rpc_admin_add_customer_account_alert(uuid, public.customer_alert_severity, text, text, timestamptz) to authenticated;
grant execute on function public.rpc_admin_archive_customer_account_alert(uuid) to authenticated;

comment on view public.vw_support_customer_account_context is
  'Contexto operacional seguro do cliente B2B para suporte interno, separado do 360 generico e sem campos sensiveis.';

comment on view public.vw_admin_customer_account_profiles is
  'Leitura administrativa consolidada do perfil operacional do cliente B2B, restrita a platform_admin.';
