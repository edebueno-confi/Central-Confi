import { toAppError } from '../../app/errors';
import { requireSupabaseBrowserClient } from '../../app/supabase-browser';
import type {
  PublicKnowledgeArticleDetailRow,
  PublicKnowledgeArticleListRow,
  PublicKnowledgeNavigationRow,
  PublicKnowledgeSearchArticleRow,
  PublicKnowledgeSpaceResolverRow,
} from '../../contracts/public-contracts';

function requireClient() {
  return requireSupabaseBrowserClient();
}

export async function listPublicKnowledgeSpaces() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_public_knowledge_space_resolver')
    .select('*')
    .order('knowledge_space_display_name', { ascending: true })
    .order('route_kind', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar os knowledge spaces publicos.');
  }

  return (data ?? []) as PublicKnowledgeSpaceResolverRow[];
}

export async function getPublicKnowledgeSpace(spaceSlug: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_public_knowledge_space_resolver')
    .select('*')
    .eq('knowledge_space_slug', spaceSlug)
    .order('is_canonical', { ascending: false })
    .order('route_kind', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao resolver o knowledge space publico.');
  }

  return (data ?? []) as PublicKnowledgeSpaceResolverRow[];
}

export async function listPublicKnowledgeNavigation(spaceSlug: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_public_knowledge_navigation')
    .select('*')
    .eq('knowledge_space_slug', spaceSlug)
    .order('parent_category_slug', { ascending: true, nullsFirst: true })
    .order('category_name', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar a navegacao publica.');
  }

  return (data ?? []).map((row) => ({
    ...(row as PublicKnowledgeNavigationRow),
    articles: Array.isArray(row.articles)
      ? (row.articles as PublicKnowledgeNavigationRow['articles'])
      : [],
  })) as PublicKnowledgeNavigationRow[];
}

export async function listPublicKnowledgeArticles(spaceSlug: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_public_knowledge_articles_list')
    .select('*')
    .eq('knowledge_space_slug', spaceSlug)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('title', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar os artigos publicos.');
  }

  return (data ?? []) as PublicKnowledgeArticleListRow[];
}

export async function getPublicKnowledgeArticle(
  spaceSlug: string,
  articleSlug: string,
) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_public_knowledge_article_detail')
    .select('*')
    .eq('knowledge_space_slug', spaceSlug)
    .eq('slug', articleSlug)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o artigo publico.');
  }

  return (data ?? null) as PublicKnowledgeArticleDetailRow | null;
}

export async function searchPublicKnowledgeArticles(
  spaceSlug: string,
  query: string,
  limit = 10,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_public_search_knowledge_articles',
    {
      p_space_slug: spaceSlug,
      p_query: query,
      p_limit: limit,
    },
  );

  if (error) {
    throw toAppError(error, 'Falha ao buscar artigos publicos.');
  }

  return (data ?? []) as PublicKnowledgeSearchArticleRow[];
}
