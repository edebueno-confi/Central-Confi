import { useEffect, type CSSProperties } from 'react';
import type {
  PublicHelpSeoDefaults,
  PublicHelpSupportContacts,
  PublicHelpThemeTokens,
  PublicKnowledgeSpaceResolverRow,
} from '../../contracts/public-contracts';

const SAFE_URL_PATTERN = /^(https?:\/\/|\/)[^\s]+$/i;
const SAFE_EMAIL_PATTERN = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;
const SAFE_CSS_PATTERN = /^[#(),.%\-+\s\w/]+$/;
const HELP_CENTER_FALLBACK_IMAGE = '/favicon.svg';

const THEME_TOKEN_TO_VAR = {
  surface: '--help-surface',
  surfaceStrong: '--help-surface-strong',
  panel: '--help-panel',
  ink: '--help-ink',
  inkStrong: '--help-ink-strong',
  muted: '--help-muted',
  border: '--help-border',
  accent: '--help-accent',
  accentStrong: '--help-accent-strong',
  accentSoft: '--help-accent-soft',
  link: '--help-link',
  linkHover: '--help-link-hover',
  codeSurface: '--help-code-surface',
  codeInk: '--help-code-ink',
  hero: '--help-hero',
  orbA: '--help-orb-a',
  orbB: '--help-orb-b',
} as const;

function isSafeUrl(value: string | null | undefined) {
  return Boolean(value && value.trim() && value.trim().length <= 2048 && SAFE_URL_PATTERN.test(value.trim()));
}

function toAbsoluteUrl(value: string | null | undefined) {
  if (!isSafeUrl(value)) {
    return null;
  }

  const trimmed = value!.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (typeof window === 'undefined') {
    return trimmed;
  }

  return new URL(trimmed, window.location.origin).toString();
}

function isSafeEmail(value: string | null | undefined) {
  return Boolean(value && value.trim() && value.trim().length <= 254 && SAFE_EMAIL_PATTERN.test(value.trim()));
}

function isSafeCssValue(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240 || !SAFE_CSS_PATTERN.test(trimmed)) {
    return false;
  }

  return (
    trimmed.startsWith('#') ||
    trimmed.startsWith('rgb(') ||
    trimmed.startsWith('rgba(') ||
    trimmed.startsWith('hsl(') ||
    trimmed.startsWith('hsla(') ||
    trimmed.startsWith('linear-gradient(') ||
    trimmed.startsWith('radial-gradient(')
  );
}

function fallbackTheme(space: {
  brandName: string;
  knowledgeSpaceSlug: string;
}) {
  const slug = space.knowledgeSpaceSlug.toLowerCase();

  if (slug === 'genius') {
    return {
      '--help-surface': '#eef5ff',
      '--help-surface-strong': '#ffffff',
      '--help-panel': 'rgba(255,255,255,0.9)',
      '--help-ink': '#223357',
      '--help-ink-strong': '#142042',
      '--help-muted': 'rgba(20,32,66,0.72)',
      '--help-border': 'rgba(20,31,71,0.12)',
      '--help-accent': '#307fe2',
      '--help-accent-strong': '#141f47',
      '--help-accent-soft': 'rgba(48,127,226,0.14)',
      '--help-link': '#1f67c6',
      '--help-link-hover': '#153d82',
      '--help-code-surface': '#142042',
      '--help-code-ink': '#f5f8ff',
      '--help-hero':
        'linear-gradient(135deg, rgba(20,31,71,0.98), rgba(48,127,226,0.94) 55%, rgba(116,210,231,0.92))',
      '--help-orb-a': 'rgba(116,210,231,0.2)',
      '--help-orb-b': 'rgba(225,0,152,0.14)',
    } as CSSProperties;
  }

  const hash = Array.from(`${space.brandName}:${space.knowledgeSpaceSlug}`).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  const hue = hash % 360;
  const secondaryHue = (hue + 42) % 360;

  return {
    '--help-surface': `hsl(${hue} 42% 97%)`,
    '--help-surface-strong': '#ffffff',
    '--help-panel': 'rgba(255,255,255,0.92)',
    '--help-ink': `hsl(${hue} 28% 26%)`,
    '--help-ink-strong': `hsl(${hue} 34% 18%)`,
    '--help-muted': `hsl(${hue} 14% 38% / 0.84)`,
    '--help-border': `hsl(${hue} 32% 28% / 0.12)`,
    '--help-accent': `hsl(${secondaryHue} 70% 48%)`,
    '--help-accent-strong': `hsl(${hue} 60% 22%)`,
    '--help-accent-soft': `hsl(${secondaryHue} 78% 48% / 0.14)`,
    '--help-link': `hsl(${secondaryHue} 74% 42%)`,
    '--help-link-hover': `hsl(${secondaryHue} 82% 28%)`,
    '--help-code-surface': `hsl(${hue} 38% 16%)`,
    '--help-code-ink': '#f7fbff',
    '--help-hero': `linear-gradient(135deg, hsl(${hue} 54% 20%), hsl(${secondaryHue} 72% 44%) 58%, hsl(${(secondaryHue + 28) % 360} 70% 62%))`,
    '--help-orb-a': `hsl(${secondaryHue} 72% 58% / 0.2)`,
    '--help-orb-b': `hsl(${(secondaryHue + 120) % 360} 68% 62% / 0.16)`,
  } as CSSProperties;
}

export function resolvePublicLogoUrl(value: string | null | undefined) {
  return isSafeUrl(value) ? value!.trim() : null;
}

export function sanitizePublicThemeTokens(tokens: PublicHelpThemeTokens | null | undefined) {
  const next: PublicHelpThemeTokens = {};

  if (!tokens) {
    return next;
  }

  for (const [key] of Object.entries(THEME_TOKEN_TO_VAR) as Array<
    [keyof PublicHelpThemeTokens, string]
  >) {
    const value = tokens[key];
    if (isSafeCssValue(value)) {
      next[key] = value!.trim();
    }
  }

  return next;
}

export function buildHelpCenterTheme(space: {
  brandName: string;
  knowledgeSpaceSlug: string;
  themeTokens?: PublicHelpThemeTokens | null;
}) {
  const theme = fallbackTheme(space);
  const safeTokens = sanitizePublicThemeTokens(space.themeTokens);
  const overrides = Object.entries(THEME_TOKEN_TO_VAR).reduce<Record<string, string>>(
    (result, [key, cssVar]) => {
      const value = safeTokens[key as keyof PublicHelpThemeTokens];
      if (value) {
        result[cssVar] = value;
      }
      return result;
    },
    {},
  );

  return {
    ...theme,
    ...overrides,
  } as CSSProperties;
}

export function sanitizePublicSeoDefaults(seo: PublicHelpSeoDefaults | null | undefined) {
  return {
    title:
      seo?.title && seo.title.trim() && seo.title.trim().length <= 120
        ? seo.title.trim()
        : null,
    description:
      seo?.description && seo.description.trim() && seo.description.trim().length <= 200
        ? seo.description.trim()
        : null,
    imageUrl: isSafeUrl(seo?.imageUrl) ? seo!.imageUrl!.trim() : null,
  } satisfies PublicHelpSeoDefaults;
}

function upsertMetaTag(attributeName: 'name' | 'property', attributeValue: string) {
  const head = document.head;
  let meta = head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attributeName, attributeValue);
    head.appendChild(meta);
  }

  return meta;
}

function upsertLinkTag(rel: string) {
  const head = document.head;
  let link = head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    head.appendChild(link);
  }

  return link;
}

export function resolvePublicSeoImageUrl(
  value: string | null | undefined,
  fallbackValue?: string | null,
) {
  return toAbsoluteUrl(value) ?? toAbsoluteUrl(fallbackValue) ?? toAbsoluteUrl(HELP_CENTER_FALLBACK_IMAGE);
}

export function sanitizePublicSupportContacts(
  contacts: PublicHelpSupportContacts | null | undefined,
) {
  return {
    email: isSafeEmail(contacts?.email) ? contacts!.email!.trim().toLowerCase() : null,
    websiteUrl: isSafeUrl(contacts?.websiteUrl) ? contacts!.websiteUrl!.trim() : null,
    statusPageUrl: isSafeUrl(contacts?.statusPageUrl)
      ? contacts!.statusPageUrl!.trim()
      : null,
    docsUrl: isSafeUrl(contacts?.docsUrl) ? contacts!.docsUrl!.trim() : null,
  } satisfies PublicHelpSupportContacts;
}

export function useHelpCenterDocumentMeta({
  title,
  description,
  imageUrl,
  canonicalPath,
  type = 'website',
}: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  canonicalPath?: string | null;
  type?: 'website' | 'article';
}) {
  useEffect(() => {
    document.title = title;

    const descriptionMeta = upsertMetaTag('name', 'description');
    const ogTitleMeta = upsertMetaTag('property', 'og:title');
    const ogDescriptionMeta = upsertMetaTag('property', 'og:description');
    const ogTypeMeta = upsertMetaTag('property', 'og:type');
    const ogImageMeta = upsertMetaTag('property', 'og:image');
    const canonicalLink = upsertLinkTag('canonical');
    const canonicalUrl =
      typeof window !== 'undefined'
        ? new URL(canonicalPath ?? window.location.pathname, window.location.origin).toString()
        : canonicalPath ?? null;
    const resolvedImageUrl = toAbsoluteUrl(imageUrl);

    if (description && description.trim()) {
      const normalizedDescription = description.trim();
      descriptionMeta.setAttribute('content', normalizedDescription);
      ogDescriptionMeta.setAttribute('content', normalizedDescription);
    } else {
      descriptionMeta.removeAttribute('content');
      ogDescriptionMeta.removeAttribute('content');
    }

    ogTitleMeta.setAttribute('content', title);
    ogTypeMeta.setAttribute('content', type);

    if (resolvedImageUrl) {
      ogImageMeta.setAttribute('content', resolvedImageUrl);
    } else {
      ogImageMeta.removeAttribute('content');
    }

    if (canonicalUrl) {
      canonicalLink.setAttribute('href', canonicalUrl);
    } else {
      canonicalLink.removeAttribute('href');
    }
  }, [canonicalPath, description, imageUrl, title, type]);
}

export function buildHelpCenterSeoTitle(space: PublicKnowledgeSpaceResolverRow) {
  const seo = sanitizePublicSeoDefaults(space.seo_defaults);
  return seo.title ?? `${space.brand_name} | Help Center B2B`;
}
