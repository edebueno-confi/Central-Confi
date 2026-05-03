import type {
  PublicKnowledgeArticleListRow,
  PublicKnowledgeNavigationRow,
  PublicKnowledgeSpaceResolverRow,
} from '../../contracts/public-contracts';

export interface HelpCenterSpaceContext {
  routes: PublicKnowledgeSpaceResolverRow[];
  primaryRoute: PublicKnowledgeSpaceResolverRow;
  navigation: PublicKnowledgeNavigationRow[];
  articles: PublicKnowledgeArticleListRow[];
}
