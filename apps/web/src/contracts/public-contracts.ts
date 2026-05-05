import type { IsoTimestamp, Uuid } from '@genius-support-os/contracts';

export interface PublicHelpThemeTokens {
  surface?: string;
  surfaceStrong?: string;
  panel?: string;
  ink?: string;
  inkStrong?: string;
  muted?: string;
  border?: string;
  accent?: string;
  accentStrong?: string;
  accentSoft?: string;
  link?: string;
  linkHover?: string;
  codeSurface?: string;
  codeInk?: string;
  hero?: string;
  orbA?: string;
  orbB?: string;
}

export interface PublicHelpSeoDefaults {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface PublicHelpSupportContacts {
  email?: string | null;
  websiteUrl?: string | null;
  statusPageUrl?: string | null;
  docsUrl?: string | null;
}

export interface PublicKnowledgeSpaceResolverRow {
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  brand_name: string;
  default_locale: string;
  organization_slug: string;
  organization_display_name: string;
  route_kind: string;
  route_host: string | null;
  route_path_prefix: string;
  is_canonical: boolean;
  logo_asset_url: string | null;
  theme_tokens: PublicHelpThemeTokens;
  seo_defaults: PublicHelpSeoDefaults;
  support_contacts: PublicHelpSupportContacts;
}

export interface PublicKnowledgeNavigationArticleItem {
  id: Uuid;
  slug: string;
  title: string;
  summary: string | null;
  published_at: IsoTimestamp | null;
}

export interface PublicKnowledgeNavigationRow {
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  brand_name: string;
  default_locale: string;
  category_id: Uuid;
  parent_category_id: Uuid | null;
  parent_category_slug: string | null;
  parent_category_name: string | null;
  category_name: string;
  category_slug: string;
  category_description: string | null;
  article_count: number;
  subtree_article_count: number;
  articles: PublicKnowledgeNavigationArticleItem[];
}

export interface PublicKnowledgeArticleListRow {
  id: Uuid;
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  brand_name: string;
  default_locale: string;
  category_id: Uuid | null;
  category_slug: string | null;
  category_name: string | null;
  title: string;
  slug: string;
  summary: string | null;
  published_at: IsoTimestamp | null;
  updated_at: IsoTimestamp;
}

export interface PublicKnowledgeArticleDetailRow {
  id: Uuid;
  knowledge_space_id: Uuid;
  knowledge_space_slug: string;
  knowledge_space_display_name: string;
  brand_name: string;
  default_locale: string;
  category_id: Uuid | null;
  category_slug: string | null;
  category_name: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body_md: string;
  published_at: IsoTimestamp | null;
  updated_at: IsoTimestamp;
}

export interface PublicKnowledgeSearchArticleRow {
  article_id: Uuid;
  title: string;
  slug: string;
  summary: string | null;
  category_name: string | null;
  rank_score: number | null;
  updated_at: IsoTimestamp;
}
