import type { InternalScreenKey, PlatformRole } from '../../contracts/admin-contracts';
import {
  PUBLIC_HELP_CENTER_HREF,
  canOpenSettingsSection,
  getReleaseSurfaceMode,
  isScreenPublishedInRelease,
} from '../../app/release-surface.mjs';

export interface MinimalNavigationPermissions {
  isPlatformAdmin: boolean;
  roles?: PlatformRole[];
  screenKeys?: InternalScreenKey[];
  hasDashboardViewerAccess?: boolean;
  hasInternalActionAreaAccess?: boolean;
  hasCsPortfolioAccess?: boolean;
}

export type MinimalNavigationIcon = 'inbox' | 'ticket' | 'users' | 'workflow' | 'engineering' | 'shield' | 'book' | 'settings' | 'document';

export interface MinimalNavigationItem {
  id: string;
  label: string;
  to: string;
  icon: MinimalNavigationIcon;
  /**
   * Seção de Configurações representada pelo item. Quando presente, o shell
   * desenha o ícone linear da seção em vez do glifo genérico da sidebar.
   */
  settingsSection?: string;
  matches: (pathname: string) => boolean;
  /** Opens outside the authenticated shell, in a new tab. */
  external?: boolean;
}

export interface MinimalNavigationSection {
  id: 'workspace' | 'intelligence' | 'administration' | 'operations' | 'knowledge';
  label: string;
  items: MinimalNavigationItem[];
}

function matchesBase(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

/**
 * Submenu de Configurações na sidebar global.
 *
 * As seções reais da tela de Configurações — as mesmas rotas que o roteador já
 * publica — passam a ser itens da sidebar. Antes a tela repetia esta navegação
 * numa segunda coluna interna, duplicando o nível de navegação e roubando
 * largura do conteúdo.
 *
 * Cada entrada continua sujeita à mesma decisão do release usada pela tela
 * (`canOpenSettingsSection`): publicação no release primeiro, permissão do
 * perfil depois. Nada é declarado aqui que a tela não saiba renderizar.
 */
const RELEASE_SETTINGS_SUBMENU: ReadonlyArray<{
  id: string;
  sectionId: string;
  label: string;
  to: string;
}> = [
  { id: 'admin-settings-integrations', sectionId: 'integracoes', label: 'Integrações', to: '/admin/settings/integrations' },
  { id: 'admin-settings-dashboard-sources', sectionId: 'dashboard-fontes', label: 'Governança de dados', to: '/admin/settings/dashboard-sources' },
  { id: 'admin-settings-sync-history', sectionId: 'dashboard-historico', label: 'Histórico de sincronizações', to: '/admin/settings/sync-history' },
  { id: 'admin-settings-brands', sectionId: 'marcas', label: 'Marcas', to: '/admin/settings/brands' },
  { id: 'admin-settings-help-center', sectionId: 'central-ajuda', label: 'Central de ajuda', to: '/admin/settings/help-center' },
];

/**
 * Sidebar for the published release surface.
 *
 * An item only appears when the screen is published in the release AND the
 * profile is authorized for it. Empty groups are dropped; nothing is rendered
 * disabled or as "coming soon".
 */
function buildReleaseNavigation({
  isPlatformAdmin,
  isDashboardViewer,
  screenKeys,
}: {
  isPlatformAdmin: boolean;
  isDashboardViewer: boolean;
  screenKeys: InternalScreenKey[];
}): MinimalNavigationSection[] {
  const allows = (screenKey: InternalScreenKey) =>
    isScreenPublishedInRelease(screenKey) &&
    (isPlatformAdmin || screenKeys.includes(screenKey) ||
      (screenKey === 'analytics' && isDashboardViewer));

  const sections: MinimalNavigationSection[] = [];

  if (isScreenPublishedInRelease('home')) {
    sections.push({
      id: 'workspace',
      label: 'Minha área',
      items: [
        {
          id: 'user-reception',
          label: 'Meu espaço',
          to: '/inicio',
          icon: 'users',
          matches: (path) => matchesBase(path, '/inicio'),
        },
      ],
    });

    if (allows('tenants')) {
      sections[sections.length - 1].items.push({
        id: 'admin-tenants',
        label: 'Central de Clientes',
        to: '/admin/tenants',
        icon: 'users',
        matches: (path) => matchesBase(path, '/admin/tenants'),
      });
    }
  }

  if (allows('analytics')) {
    sections.push({
      id: 'intelligence',
      label: 'Painel',
      items: [
        {
          id: 'admin-analytics',
          label: 'Dashboard gerencial',
          to: '/admin/analytics',
          icon: 'workflow',
          matches: (path) => matchesBase(path, '/admin/analytics'),
        },
      ],
    });
  }

  if (allows('knowledge')) {
    sections.push({
      id: 'knowledge',
      label: 'Central de Ajuda',
      items: [
        {
          id: 'admin-knowledge',
          label: 'Artigos',
          to: '/admin/knowledge',
          icon: 'book',
          matches: (path) =>
            matchesBase(path, '/admin/knowledge') && !matchesBase(path, '/admin/knowledge/new'),
        },
        {
          id: 'admin-knowledge-new',
          label: 'Novo artigo',
          to: '/admin/knowledge/new',
          icon: 'document',
          matches: (path) => matchesBase(path, '/admin/knowledge/new'),
        },
        {
          id: 'public-help-center',
          label: 'Abrir Central pública',
          to: PUBLIC_HELP_CENTER_HREF,
          icon: 'book',
          matches: () => false,
          external: true,
        },
      ],
    });
  }

  // Um único nível de navegação para Configurações: o cabeçalho da seção
  // expande/recolhe e cada subitem navega direto para a rota da seção.
  const administration: MinimalNavigationItem[] = [];

  if (allows('access')) {
    administration.push({
      id: 'admin-access',
      label: 'Usuários e acessos',
      to: '/admin/access',
      icon: 'shield',
      settingsSection: 'access',
      matches: (path) => matchesBase(path, '/admin/access') || matchesBase(path, '/admin/internal-areas'),
    });
  }

  if (allows('settings')) {
    for (const entry of RELEASE_SETTINGS_SUBMENU) {
      if (!canOpenSettingsSection(entry.sectionId, { isPlatformAdmin, screenKeys })) continue;
      administration.push({
        id: entry.id,
        label: entry.label,
        to: entry.to,
        icon: 'settings',
        settingsSection: entry.sectionId,
        matches: (path) => path === entry.to,
      });
    }
  }

  if (administration.length > 0) {
    sections.push({
      id: 'administration',
      label: allows('settings') ? 'Configurações' : 'Administração',
      items: administration,
    });
  }

  return sections.filter((section) => section.items.length > 0);
}

export function buildMinimalNavigation({
  permissions,
}: {
  pathname: string;
  permissions: MinimalNavigationPermissions;
}): MinimalNavigationSection[] {
  const roles = permissions.roles ?? [];
  const screenKeys = permissions.screenKeys ?? [];
  const isPlatformAdmin = permissions.isPlatformAdmin || roles.includes('platform_admin');
  const isDashboardViewer = !isPlatformAdmin && permissions.hasDashboardViewerAccess === true;
  // While a reduced surface is published, the sidebar is derived from the
  // release manifest intersected with the profile's permissions. The full
  // navigation below is preserved untouched for the complete system.
  if (getReleaseSurfaceMode() === 'first-release') {
    return buildReleaseNavigation({ isDashboardViewer, isPlatformAdmin, screenKeys });
  }

  if (isDashboardViewer) {
    return [{
      id: 'operations',
      label: 'Minha área',
      items: [
        { id: 'dashboard-operational', label: 'Dashboard gerencial', to: '/admin/analytics', icon: 'workflow', matches: (path) => matchesBase(path, '/admin/analytics') },
      ],
    }];
  }

  const hasScreen = (screenKey: InternalScreenKey) => isPlatformAdmin || screenKeys.includes(screenKey);
  const sections: MinimalNavigationSection[] = [];

  if (isDashboardViewer || hasScreen('analytics')) {
    sections.push({
      id: 'intelligence',
      label: 'Inteligência',
      items: [{ id: 'admin-analytics', label: 'Dashboard gerencial', to: '/admin/analytics', icon: 'workflow', matches: (path) => matchesBase(path, '/admin/analytics') }],
    });
  }

  if (isPlatformAdmin || hasScreen('knowledge') || roles.includes('knowledge_manager')) {
    sections.push({
      id: 'workspace',
      label: 'Conteúdo',
      items: [{ id: 'admin-knowledge', label: 'Conhecimento', to: '/admin/knowledge', icon: 'book', matches: (path) => matchesBase(path, '/admin/knowledge') }],
    });
  }

  const administration: MinimalNavigationItem[] = [];
  if (isPlatformAdmin || hasScreen('settings')) {
    administration.push({ id: 'admin-cockpit', label: 'Cockpit gerencial', to: '/admin/cockpit', icon: 'workflow', matches: (path) => matchesBase(path, '/admin/cockpit') });
    administration.push({ id: 'admin-settings', label: 'Configurações', to: '/admin/settings', icon: 'settings', matches: (path) => matchesBase(path, '/admin/settings') });
  }
  // A permissão de acesso é independente das configurações. Escondê-la para
  // quem também pode abrir Configurações criava um beco sem saída na sidebar:
  // a rota continuava protegida e disponível, mas não era alcançável pelo menu.
  if (isPlatformAdmin || hasScreen('access')) {
    administration.push({ id: 'admin-access', label: 'Usuários e acessos', to: '/admin/access', icon: 'shield', matches: (path) => matchesBase(path, '/admin/access') || matchesBase(path, '/admin/internal-areas') });
  }
  if (administration.length) sections.push({ id: 'administration', label: 'Administração', items: administration });
  return sections;
}

export function resolveMinimalRouteLabel(pathname: string) {
  if (/^\/support\/tickets\/[^/]+/.test(pathname)) return 'Ticket';
  const routes: Array<[string, string]> = [
    ['/admin/cockpit', 'Cockpit gerencial'],
    ['/admin/analytics', 'Dashboard gerencial'],
    ['/admin/knowledge', 'Conhecimento'],
    ['/admin/settings', 'Configurações'],
    ['/admin/internal-areas', 'Usuários e acessos'],
    ['/admin/access', 'Usuários e acessos'],
    ['/inicio', 'Meu espaço'],
    ['/support/inbox', 'Atendimento'],
    ['/support/queue', 'Fila operacional'],
    ['/support/tickets', 'Tickets'],
    ['/support/clientes', 'Clientes B2B'],
    ['/support/customers', 'Clientes B2B'],
    ['/cs/portfolio', 'Carteira CS'],
    ['/internal-actions', 'Acionamentos'],
    ['/engineering', 'Produto'],
    ['/admin/visao-geral', 'Visão geral'],
    ['/admin/tenants', 'Central de Clientes'],
    ['/admin/customer-portal', 'Portal do cliente'],
    ['/admin/system', 'Sistema'],
    ['/admin/build-journal', 'Diário de construção'],
    ['/admin/product-docs', 'Documentos'],
  ];
  return routes.find(([basePath]) => matchesBase(pathname, basePath))?.[1] ?? 'Confi One';
}

export type MinimalBreadcrumbSegment = {
  label: string;
  to?: string;
};

/**
 * Breadcrumb trail for the shared topbar.
 *
 * The trail is derived from the same route table and the same settings submenu
 * that build the sidebar, so it never announces a surface that the navigation
 * model does not know about. The root segment is always the product; the last
 * segment is always the current surface and carries no link.
 */
export function resolveMinimalBreadcrumb(pathname: string): MinimalBreadcrumbSegment[] {
  const root: MinimalBreadcrumbSegment = { label: 'Confi One', to: '/' };
  const routeLabel = resolveMinimalRouteLabel(pathname);

  if (matchesBase(pathname, '/admin/settings')) {
    const leaf = RELEASE_SETTINGS_SUBMENU.find((entry) => matchesBase(pathname, entry.to));
    if (leaf) {
      return [root, { label: 'Configurações', to: '/admin/settings' }, { label: leaf.label }];
    }
    return [root, { label: 'Configurações', to: '/admin/settings' }, { label: 'Configurações gerais' }];
  }

  if (matchesBase(pathname, '/admin/access') || matchesBase(pathname, '/admin/internal-areas')) {
    return [root, { label: 'Configurações', to: '/admin/settings' }, { label: 'Usuários e acessos' }];
  }

  if (routeLabel === 'Confi One') return [root];
  return [root, { label: routeLabel }];
}
