import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import { AppButton, GhostButton, InlineNotice, StatusPill, cx } from '../../components/ui';
import type {
  PublicKnowledgeArticleListRow,
  PublicKnowledgeSpaceResolverRow,
} from '../../contracts/public-contracts';
import { classifyAdminError } from '../admin/admin-errors';
import type { HelpCenterSpaceContext } from './context';
import {
  buildHelpCenterSeoTitle,
  buildHelpCenterTheme,
  resolvePublicLogoUrl,
  sanitizePublicSeoDefaults,
  sanitizePublicSupportContacts,
  useHelpCenterDocumentMeta,
} from './branding';
import {
  getPublicKnowledgeSpace,
  listPublicKnowledgeArticles,
  listPublicKnowledgeNavigation,
  listPublicKnowledgeSpaces,
} from './public-api';

type LoadPhase = 'loading' | 'ready' | 'empty' | 'contract-unavailable' | 'error';

interface HelpCenterSpaceSummary {
  knowledgeSpaceId: string;
  knowledgeSpaceSlug: string;
  displayName: string;
  brandName: string;
  defaultLocale: string;
  organizationDisplayName: string;
  canonicalPath: string;
  canonicalHost: string | null;
  routeCount: number;
  logoAssetUrl: string | null;
}

function toneForArticleCount(count: number) {
  if (count >= 8) {
    return 'positive' as const;
  }

  if (count >= 3) {
    return 'accent' as const;
  }

  return 'default' as const;
}

function buildSpaceSummary(
  rows: PublicKnowledgeSpaceResolverRow[],
): HelpCenterSpaceSummary {
  const primaryRoute =
    rows.find((row) => row.route_kind === 'space_slug') ??
    rows.find((row) => row.is_canonical) ??
    rows[0];

  const domainRoute =
    rows.find((row) => row.route_kind === 'domain' && row.is_canonical) ??
    rows.find((row) => row.route_kind === 'domain') ??
    null;

  return {
    knowledgeSpaceId: primaryRoute.knowledge_space_id,
    knowledgeSpaceSlug: primaryRoute.knowledge_space_slug,
    displayName: primaryRoute.knowledge_space_display_name,
    brandName: primaryRoute.brand_name,
    defaultLocale: primaryRoute.default_locale,
    organizationDisplayName: primaryRoute.organization_display_name,
    canonicalPath:
      primaryRoute.route_kind === 'space_slug'
        ? primaryRoute.route_path_prefix
        : `/help/${primaryRoute.knowledge_space_slug}`,
    canonicalHost: domainRoute?.route_host ?? null,
    routeCount: rows.length,
    logoAssetUrl: resolvePublicLogoUrl(primaryRoute.logo_asset_url),
  };
}

function groupSpaceSummaries(rows: PublicKnowledgeSpaceResolverRow[]) {
  const bySpace = new Map<string, PublicKnowledgeSpaceResolverRow[]>();

  for (const row of rows) {
    const current = bySpace.get(row.knowledge_space_slug) ?? [];
    current.push(row);
    bySpace.set(row.knowledge_space_slug, current);
  }

  return Array.from(bySpace.values())
    .map(buildSpaceSummary)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'pt-BR'));
}

export function HelpCenterPage() {
  const didLoadRef = useRef(false);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<HelpCenterSpaceSummary[]>([]);

  useHelpCenterDocumentMeta({
    title: 'Genius Support OS | Help Center B2B',
    description:
      'Guias publicos de uso, configuracao e integracao para clientes B2B da plataforma Genius Support OS.',
  });

  const loadSpaces = useEffectEvent(async () => {
    try {
      const rows = await listPublicKnowledgeSpaces();
      const nextSpaces = groupSpaceSummaries(rows);
      setSpaces(nextSpaces);
      setPhase(nextSpaces.length === 0 ? 'empty' : 'ready');
      setMessage(null);
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Nao foi possivel carregar a Central de Ajuda.',
      );
      setMessage(classified.message);
      setPhase(
        classified.kind === 'contract-unavailable'
          ? 'contract-unavailable'
          : 'error',
      );
    }
  });

  useEffect(() => {
    if (didLoadRef.current) {
      return;
    }

    didLoadRef.current = true;
    void loadSpaces();
  }, []);

  if (phase === 'loading') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <LoadingState
          title="Carregando a Central de Ajuda"
          description="Estamos preparando as centrais publicas disponiveis para leitura."
        />
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ContractUnavailableState contractName="central publica de ajuda" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ErrorState
          title="Falha ao carregar a Central de Ajuda"
          description={
            message ??
            'Nao foi possivel carregar as centrais publicas disponiveis neste ambiente.'
          }
          action={<GhostButton onClick={() => void loadSpaces()}>Tentar novamente</GhostButton>}
        />
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <EmptyState
          title="Nenhuma central disponivel"
          description="Ainda nao existe uma central publicada para leitura neste ambiente."
          action={<GhostButton onClick={() => void loadSpaces()}>Tentar novamente</GhostButton>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="relative overflow-hidden rounded-[36px] border border-[rgba(20,31,71,0.12)] bg-[linear-gradient(135deg,rgba(20,31,71,0.98),rgba(48,127,226,0.95)_54%,rgba(116,210,231,0.9))] px-6 py-8 text-white shadow-[0_28px_80px_rgba(20,31,71,0.16)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(225,0,152,0.18),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.8fr)]">
            <div className="space-y-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-white/72">
                Help Center B2B
              </p>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                  Documentacao tecnica clara para operar a plataforma sem depender do suporte interno.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Guias publicados de uso, configuracao e integracao para clientes B2B e usuarios da plataforma. Aqui voce ve apenas o conteudo pronto para leitura.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {spaces.slice(0, 3).map((space) => (
                  <Link
                    key={space.knowledgeSpaceSlug}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/16"
                    to={`/help/${space.knowledgeSpaceSlug}`}
                  >
                    Abrir {space.brandName}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-white/76">
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  leitura simples e navegacao direta
                </span>
                <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5">
                  foco em documentacao tecnica B2B
                </span>
              </div>
            </div>
            <div className="grid gap-4 rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(12,19,42,0.42),rgba(19,31,67,0.68))] p-5 shadow-[0_16px_34px_rgba(8,13,32,0.18)]">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/78">
                  Disponivel agora
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                  {spaces.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/88">
                  central{spaces.length > 1 ? 'is' : ''} pronta{spaces.length > 1 ? 's' : ''} para leitura neste ambiente.
                </p>
              </div>
              <div className="grid gap-3">
                {spaces.map((space) => (
                  <div
                    key={space.knowledgeSpaceSlug}
                    className="rounded-[24px] border border-white/14 bg-[rgba(255,255,255,0.14)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{space.brandName}</p>
                        <p className="text-xs text-white/82">{space.organizationDisplayName}</p>
                      </div>
                      {space.logoAssetUrl ? (
                        <img
                          alt={`Logo ${space.brandName}`}
                          className="h-10 w-10 rounded-2xl border border-white/12 bg-white/88 object-contain p-1.5"
                          src={space.logoAssetUrl}
                        />
                      ) : null}
                      <StatusPill tone="positive">ativo</StatusPill>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/84">
                      Acesso principal: {space.canonicalPath}
                      {space.canonicalHost ? ` ou ${space.canonicalHost}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[rgba(20,31,71,0.12)] bg-white/88 p-5 shadow-[var(--shadow-panel)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                Centrais publicas
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.05em] text-[color:var(--color-ink)] sm:text-3xl">
                Escolha a documentacao certa para a operacao que voce usa.
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-muted)]">
                Cada central organiza artigos publicados para uma marca ou operacao, com leitura direta e sem excesso de contexto tecnico.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => (
            <article
              key={space.knowledgeSpaceSlug}
              className="rounded-[28px] border border-[rgba(20,31,71,0.12)] bg-[color:var(--color-surface)] p-6 shadow-[0_18px_44px_rgba(20,31,71,0.06)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                    Central
                  </p>
                  {space.logoAssetUrl ? (
                    <img
                      alt={`Logo ${space.brandName}`}
                      className="mt-4 h-14 w-14 rounded-[20px] border border-[rgba(20,31,71,0.08)] bg-[color:var(--color-surface)] object-contain p-2"
                      src={space.logoAssetUrl}
                    />
                  ) : null}
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                    {space.brandName}
                  </h2>
                </div>
                <StatusPill tone={toneForArticleCount(space.routeCount)}>
                  {space.defaultLocale}
                </StatusPill>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                {space.displayName} publica guias de uso, configuracao e integracao para a operacao tecnica B2B da plataforma.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/help/${space.knowledgeSpaceSlug}`}>
                  <AppButton>Abrir central</AppButton>
                </Link>
                <Link to={`/help/${space.knowledgeSpaceSlug}/articles`}>
                  <GhostButton>Ver artigos</GhostButton>
                </Link>
              </div>
            </article>
          ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function HelpCenterSpaceLayout() {
  const location = useLocation();
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [context, setContext] = useState<HelpCenterSpaceContext | null>(null);

  const loadSpace = useEffectEvent(async (targetSpaceSlug: string) => {
    try {
      const [routes, navigation, articles] = await Promise.all([
        getPublicKnowledgeSpace(targetSpaceSlug),
        listPublicKnowledgeNavigation(targetSpaceSlug),
        listPublicKnowledgeArticles(targetSpaceSlug),
      ]);

      if (routes.length === 0) {
        setContext(null);
        setPhase('empty');
        setMessage(null);
        return;
      }

      const primaryRoute =
        routes.find((row) => row.route_kind === 'space_slug') ??
        routes.find((row) => row.is_canonical) ??
        routes[0];

      setContext({
        routes,
        primaryRoute,
        navigation,
        articles,
      });
      setMessage(null);
      setPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Nao foi possivel carregar a central tecnica solicitada.',
      );
      setContext(null);
      setMessage(classified.message);
      setPhase(
        classified.kind === 'contract-unavailable'
          ? 'contract-unavailable'
          : 'error',
      );
    }
  });

  useEffect(() => {
    if (!spaceSlug) {
      return;
    }

    setPhase('loading');
    void loadSpace(spaceSlug);
  }, [spaceSlug]);

  const space = context?.primaryRoute ?? null;
  const theme = useMemo(
    () =>
      space
        ? buildHelpCenterTheme({
            brandName: space.brand_name,
            knowledgeSpaceSlug: space.knowledge_space_slug,
            themeTokens: space.theme_tokens,
          })
        : null,
    [space],
  );
  const seoDefaults = useMemo(
    () => (space ? sanitizePublicSeoDefaults(space.seo_defaults) : null),
    [space],
  );
  const supportContacts = useMemo(
    () => (space ? sanitizePublicSupportContacts(space.support_contacts) : null),
    [space],
  );
  const logoAssetUrl = useMemo(
    () => (space ? resolvePublicLogoUrl(space.logo_asset_url) : null),
    [space],
  );
  const topCategories =
    context?.navigation.filter((entry) => entry.parent_category_id === null) ?? [];
  const latestArticles: PublicKnowledgeArticleListRow[] = (context?.articles ?? []).slice(0, 5);
  const isArticlesRoute =
    location.pathname.endsWith('/articles') ||
    location.pathname.includes('/articles/');
  const helpCenterTitle = space
    ? buildHelpCenterSeoTitle(space)
    : 'Help Center B2B | Genius Support OS';
  const helpCenterDescription = space
    ? seoDefaults?.description ??
      `${space.brand_name} publica guias de uso, configuracao e integracao para clientes B2B.`
    : 'Guias publicos B2B da plataforma Genius Support OS.';

  useHelpCenterDocumentMeta({
    title: helpCenterTitle,
    description: helpCenterDescription,
  });

  if (!spaceSlug) {
    return <Navigate replace to="/help" />;
  }

  if (phase === 'loading') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <LoadingState
          title="Carregando a documentacao tecnica"
          description="Estamos preparando esta central e a navegacao publicada."
        />
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ContractUnavailableState contractName="central publica desta marca" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ErrorState
          title="Falha ao carregar a central publica"
          description={
            message ??
            'Nao foi possivel abrir a central solicitada neste ambiente.'
          }
          action={<GhostButton onClick={() => void loadSpace(spaceSlug)}>Tentar novamente</GhostButton>}
        />
      </div>
    );
  }

  if (phase === 'empty' || !context || !space) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <EmptyState
          title="Central publica nao encontrada"
          description="A central solicitada nao existe ou ainda nao ficou disponivel para leitura."
          action={
            <Link to="/help">
              <GhostButton>Voltar para /help</GhostButton>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at top right, var(--help-orb-a), transparent 24%), radial-gradient(circle at bottom left, var(--help-orb-b), transparent 20%), linear-gradient(180deg, var(--help-surface) 0%, #f8fbff 48%, #f3f6fb 100%)',
        ...theme,
      }}
    >
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
        <aside className="grid content-start gap-4 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:py-2">
          <section className="relative overflow-hidden rounded-[34px] border border-[var(--help-border)] bg-[var(--help-hero)] px-6 py-7 text-white shadow-[0_28px_80px_rgba(20,31,71,0.14)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between gap-3">
                <Link
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/82 no-underline"
                  to="/help"
                >
                  Help Center
                </Link>
                <StatusPill tone="positive">publico</StatusPill>
              </div>
              <div className="space-y-3">
                {logoAssetUrl ? (
                  <img
                    alt={`Logo ${space.brand_name}`}
                    className="h-16 w-16 rounded-[22px] bg-white/14 object-contain p-2 shadow-[0_14px_28px_rgba(20,31,71,0.18)]"
                    src={logoAssetUrl}
                  />
                ) : (
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/12 text-lg font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_rgba(20,31,71,0.18)]">
                    {(space.brand_name || space.knowledge_space_display_name)
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="space-y-1.5">
                  <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                    {space.brand_name}
                  </h1>
                  <p className="text-sm leading-7 text-white/88">
                    {space.knowledge_space_display_name} publica apenas documentacao tecnica aprovada para clientes B2B e usuarios da plataforma.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 rounded-[24px] border border-white/16 bg-[linear-gradient(180deg,rgba(12,19,42,0.36),rgba(19,31,67,0.62))] p-4 shadow-[0_14px_30px_rgba(8,13,32,0.18)]">
                <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/82">
                      Caminho principal
                    </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    /help/{space.knowledge_space_slug}
                  </p>
                </div>
                {context.routes.some((route) => route.route_kind === 'domain') ? (
                  <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/82">
                        Dominio publicado
                      </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {context.routes.find((route) => route.route_kind === 'domain')?.route_host}
                    </p>
                  </div>
                ) : (
                  <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/82">
                        Leitura
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/88">
                        Leitura simples, foco nos artigos e navegacao direta por categorias.
                      </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {supportContacts && (supportContacts.email || supportContacts.docsUrl || supportContacts.statusPageUrl || supportContacts.websiteUrl) ? (
            <section className="rounded-[30px] border border-[var(--help-border)] bg-[color:var(--help-surface-strong)] p-5 shadow-[0_18px_42px_rgba(20,31,71,0.08)]">
              <div className="space-y-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                  Contato tecnico
                </p>
                <div className="grid gap-3 text-sm">
                  {supportContacts.email ? (
                    <a
                      className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 text-[var(--help-link)] no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)] hover:text-[var(--help-link-hover)]"
                      href={`mailto:${supportContacts.email}`}
                    >
                      {supportContacts.email}
                    </a>
                  ) : null}
                  {supportContacts.docsUrl ? (
                    <a
                      className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 text-[var(--help-link)] no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)] hover:text-[var(--help-link-hover)]"
                      href={supportContacts.docsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Documentacao oficial
                    </a>
                  ) : null}
                  {supportContacts.statusPageUrl ? (
                    <a
                      className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 text-[var(--help-link)] no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)] hover:text-[var(--help-link-hover)]"
                      href={supportContacts.statusPageUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Status da plataforma
                    </a>
                  ) : null}
                  {supportContacts.websiteUrl ? (
                    <a
                      className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 text-[var(--help-link)] no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)] hover:text-[var(--help-link-hover)]"
                      href={supportContacts.websiteUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Site institucional
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[30px] border border-[var(--help-border)] bg-[color:var(--help-surface-strong)] p-5 shadow-[0_18px_42px_rgba(20,31,71,0.08)]">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                Navegacao
              </p>
              <div className="grid gap-2">
                <Link
                  className={cx(
                    'rounded-[20px] px-4 py-3 text-sm font-medium transition',
                    !isArticlesRoute
                      ? 'bg-[var(--help-accent-soft)] text-[var(--help-ink-strong)]'
                      : 'text-[var(--help-ink)] hover:bg-[rgba(20,31,71,0.04)]',
                  )}
                  to={`/help/${space.knowledge_space_slug}`}
                >
                  Visao geral
                </Link>
                <Link
                  className={cx(
                    'rounded-[20px] px-4 py-3 text-sm font-medium transition',
                    isArticlesRoute
                      ? 'bg-[var(--help-accent-soft)] text-[var(--help-ink-strong)]'
                      : 'text-[var(--help-ink)] hover:bg-[rgba(20,31,71,0.04)]',
                  )}
                  to={`/help/${space.knowledge_space_slug}/articles`}
                >
                  Todos os artigos
                </Link>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {topCategories.map((category) => (
                <Link
                  key={category.category_id}
                  className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)]"
                  to={`/help/${space.knowledge_space_slug}/articles`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--help-ink-strong)]">
                        {category.category_name}
                      </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--help-muted)]">
                          {category.category_description ??
                          'Categoria com artigos publicados para consulta rapida.'}
                        </p>
                    </div>
                    <StatusPill tone={toneForArticleCount(category.subtree_article_count)}>
                      {category.subtree_article_count}
                    </StatusPill>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-[var(--help-border)] bg-[color:var(--help-surface-strong)] p-5 shadow-[0_18px_42px_rgba(20,31,71,0.08)]">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                Ultimos publicados
              </p>
              {latestArticles.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--help-muted)]">
                  Ainda nao existem artigos publicados visiveis nesta central.
                </p>
              ) : (
                <div className="grid gap-3">
                  {latestArticles.map((article) => (
                    <Link
                      key={article.id}
                      className="rounded-[22px] border border-[var(--help-border)] bg-white px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-[color:var(--help-surface)]"
                      to={`/help/${space.knowledge_space_slug}/articles/${article.slug}`}
                    >
                      <p className="text-sm font-semibold text-[var(--help-ink-strong)]">
                        {article.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--help-muted)]">
                        {article.summary ?? 'Artigo publicado para consulta.'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="grid content-start gap-6 py-1">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
