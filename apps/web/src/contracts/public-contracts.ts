import type { IsoTimestamp, Uuid } from '@genius-support-os/contracts';

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
