create or replace view public.vw_public_knowledge_space_resolver
  with (security_barrier = true)
as
  with public_brand_settings as (
    select
      bs.knowledge_space_id,
      nullif(btrim(bs.brand_name), '') as brand_name,
      case
        when bs.logo_asset_url is not null
          and length(bs.logo_asset_url) <= 2048
          and bs.logo_asset_url ~ '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
          then bs.logo_asset_url
        else null
      end as logo_asset_url,
      jsonb_strip_nulls(
        jsonb_build_object(
          'surface',
          case
            when jsonb_typeof(bs.theme_tokens -> 'surface') = 'string'
              and length(bs.theme_tokens ->> 'surface') <= 160
              then bs.theme_tokens ->> 'surface'
            else null
          end,
          'surfaceStrong',
          case
            when jsonb_typeof(bs.theme_tokens -> 'surfaceStrong') = 'string'
              and length(bs.theme_tokens ->> 'surfaceStrong') <= 160
              then bs.theme_tokens ->> 'surfaceStrong'
            else null
          end,
          'panel',
          case
            when jsonb_typeof(bs.theme_tokens -> 'panel') = 'string'
              and length(bs.theme_tokens ->> 'panel') <= 160
              then bs.theme_tokens ->> 'panel'
            else null
          end,
          'ink',
          case
            when jsonb_typeof(bs.theme_tokens -> 'ink') = 'string'
              and length(bs.theme_tokens ->> 'ink') <= 160
              then bs.theme_tokens ->> 'ink'
            else null
          end,
          'inkStrong',
          case
            when jsonb_typeof(bs.theme_tokens -> 'inkStrong') = 'string'
              and length(bs.theme_tokens ->> 'inkStrong') <= 160
              then bs.theme_tokens ->> 'inkStrong'
            else null
          end,
          'muted',
          case
            when jsonb_typeof(bs.theme_tokens -> 'muted') = 'string'
              and length(bs.theme_tokens ->> 'muted') <= 160
              then bs.theme_tokens ->> 'muted'
            else null
          end,
          'border',
          case
            when jsonb_typeof(bs.theme_tokens -> 'border') = 'string'
              and length(bs.theme_tokens ->> 'border') <= 160
              then bs.theme_tokens ->> 'border'
            else null
          end,
          'accent',
          case
            when jsonb_typeof(bs.theme_tokens -> 'accent') = 'string'
              and length(bs.theme_tokens ->> 'accent') <= 160
              then bs.theme_tokens ->> 'accent'
            else null
          end,
          'accentStrong',
          case
            when jsonb_typeof(bs.theme_tokens -> 'accentStrong') = 'string'
              and length(bs.theme_tokens ->> 'accentStrong') <= 160
              then bs.theme_tokens ->> 'accentStrong'
            else null
          end,
          'accentSoft',
          case
            when jsonb_typeof(bs.theme_tokens -> 'accentSoft') = 'string'
              and length(bs.theme_tokens ->> 'accentSoft') <= 160
              then bs.theme_tokens ->> 'accentSoft'
            else null
          end,
          'link',
          case
            when jsonb_typeof(bs.theme_tokens -> 'link') = 'string'
              and length(bs.theme_tokens ->> 'link') <= 160
              then bs.theme_tokens ->> 'link'
            else null
          end,
          'linkHover',
          case
            when jsonb_typeof(bs.theme_tokens -> 'linkHover') = 'string'
              and length(bs.theme_tokens ->> 'linkHover') <= 160
              then bs.theme_tokens ->> 'linkHover'
            else null
          end,
          'codeSurface',
          case
            when jsonb_typeof(bs.theme_tokens -> 'codeSurface') = 'string'
              and length(bs.theme_tokens ->> 'codeSurface') <= 160
              then bs.theme_tokens ->> 'codeSurface'
            else null
          end,
          'codeInk',
          case
            when jsonb_typeof(bs.theme_tokens -> 'codeInk') = 'string'
              and length(bs.theme_tokens ->> 'codeInk') <= 160
              then bs.theme_tokens ->> 'codeInk'
            else null
          end,
          'hero',
          case
            when jsonb_typeof(bs.theme_tokens -> 'hero') = 'string'
              and length(bs.theme_tokens ->> 'hero') <= 240
              then bs.theme_tokens ->> 'hero'
            else null
          end,
          'orbA',
          case
            when jsonb_typeof(bs.theme_tokens -> 'orbA') = 'string'
              and length(bs.theme_tokens ->> 'orbA') <= 160
              then bs.theme_tokens ->> 'orbA'
            else null
          end,
          'orbB',
          case
            when jsonb_typeof(bs.theme_tokens -> 'orbB') = 'string'
              and length(bs.theme_tokens ->> 'orbB') <= 160
              then bs.theme_tokens ->> 'orbB'
            else null
          end
        )
      ) as theme_tokens,
      jsonb_strip_nulls(
        jsonb_build_object(
          'title',
          case
            when jsonb_typeof(bs.seo_defaults -> 'title') = 'string'
              and length(bs.seo_defaults ->> 'title') <= 120
              then bs.seo_defaults ->> 'title'
            else null
          end,
          'description',
          case
            when jsonb_typeof(bs.seo_defaults -> 'description') = 'string'
              and length(bs.seo_defaults ->> 'description') <= 200
              then bs.seo_defaults ->> 'description'
            else null
          end,
          'imageUrl',
          case
            when jsonb_typeof(bs.seo_defaults -> 'imageUrl') = 'string'
              and length(bs.seo_defaults ->> 'imageUrl') <= 2048
              and bs.seo_defaults ->> 'imageUrl' ~ '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
              then bs.seo_defaults ->> 'imageUrl'
            else null
          end
        )
      ) as seo_defaults,
      jsonb_strip_nulls(
        jsonb_build_object(
          'email',
          case
            when jsonb_typeof(bs.support_contacts -> 'email') = 'string'
              and length(bs.support_contacts ->> 'email') <= 254
              and bs.support_contacts ->> 'email' ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
              then lower(bs.support_contacts ->> 'email')
            else null
          end,
          'websiteUrl',
          case
            when jsonb_typeof(bs.support_contacts -> 'websiteUrl') = 'string'
              and length(bs.support_contacts ->> 'websiteUrl') <= 2048
              and bs.support_contacts ->> 'websiteUrl' ~ '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
              then bs.support_contacts ->> 'websiteUrl'
            else null
          end,
          'statusPageUrl',
          case
            when jsonb_typeof(bs.support_contacts -> 'statusPageUrl') = 'string'
              and length(bs.support_contacts ->> 'statusPageUrl') <= 2048
              and bs.support_contacts ->> 'statusPageUrl' ~ '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
              then bs.support_contacts ->> 'statusPageUrl'
            else null
          end,
          'docsUrl',
          case
            when jsonb_typeof(bs.support_contacts -> 'docsUrl') = 'string'
              and length(bs.support_contacts ->> 'docsUrl') <= 2048
              and bs.support_contacts ->> 'docsUrl' ~ '^(https?://[^[:space:]]+|/[^[:space:]]*)$'
              then bs.support_contacts ->> 'docsUrl'
            else null
          end
        )
      ) as support_contacts
    from public.brand_settings as bs
  ),
  active_spaces as (
    select
      ks.id as knowledge_space_id,
      ks.slug as knowledge_space_slug,
      ks.display_name as knowledge_space_display_name,
      ks.default_locale,
      o.slug as organization_slug,
      o.display_name as organization_display_name,
      coalesce(pbs.brand_name, ks.display_name) as brand_name,
      pbs.logo_asset_url,
      coalesce(pbs.theme_tokens, '{}'::jsonb) as theme_tokens,
      coalesce(pbs.seo_defaults, '{}'::jsonb) as seo_defaults,
      coalesce(pbs.support_contacts, '{}'::jsonb) as support_contacts
    from public.knowledge_spaces as ks
    join public.organizations as o
      on o.id = ks.organization_id
    left join public_brand_settings as pbs
      on pbs.knowledge_space_id = ks.id
    where ks.status = 'active'
      and o.status = 'active'
  ),
  active_domains as (
    select
      ksd.knowledge_space_id,
      ksd.host,
      ksd.path_prefix,
      ksd.is_primary
    from public.knowledge_space_domains as ksd
    where ksd.status = 'active'
  )
  select
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    s.organization_slug,
    s.organization_display_name,
    'space_slug'::text as route_kind,
    null::text as route_host,
    ('/help/' || s.knowledge_space_slug)::text as route_path_prefix,
    not exists (
      select 1
      from active_domains as ad
      where ad.knowledge_space_id = s.knowledge_space_id
    ) as is_canonical,
    s.logo_asset_url,
    s.theme_tokens,
    s.seo_defaults,
    s.support_contacts
  from active_spaces as s

  union all

  select
    s.knowledge_space_id,
    s.knowledge_space_slug,
    s.knowledge_space_display_name,
    s.brand_name,
    s.default_locale,
    s.organization_slug,
    s.organization_display_name,
    'domain'::text as route_kind,
    ad.host as route_host,
    ad.path_prefix as route_path_prefix,
    ad.is_primary as is_canonical,
    s.logo_asset_url,
    s.theme_tokens,
    s.seo_defaults,
    s.support_contacts
  from active_spaces as s
  join active_domains as ad
    on ad.knowledge_space_id = s.knowledge_space_id;

comment on view public.vw_public_knowledge_space_resolver is
  'Read model contratual publico para resolver knowledge spaces ativos por slug e dominio, incluindo branding publico sanitizado.';
