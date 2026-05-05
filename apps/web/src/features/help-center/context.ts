import type {
  PublicHelpSeoDefaults,
  PublicHelpSupportContacts,
  PublicHelpThemeTokens,
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

export interface HelpCenterResolvedBranding {
  logoAssetUrl: string | null;
  themeTokens: PublicHelpThemeTokens;
  seoDefaults: PublicHelpSeoDefaults;
  supportContacts: PublicHelpSupportContacts;
}
