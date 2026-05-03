import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from 'react';
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

function buildBrandTheme(space: {
  brandName: string;
  knowledgeSpaceSlug: string;
  displayName: string;
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

export function HelpCenterPage() {
  const didLoadRef = useRef(false);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<HelpCenterSpaceSummary[]>([]);

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
        'Nao foi possivel carregar a superficie publica da Central de Ajuda.',
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
          description="A superficie publica esta validando os knowledge spaces disponiveis antes de expor a documentacao tecnica."
        />
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ContractUnavailableState contractName="read models publicos da Knowledge Base" />
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
            'A superficie publica nao conseguiu carregar os spaces disponiveis neste ambiente.'
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
          title="Nenhuma central tecnica disponivel"
          description="Ainda nao existe knowledge space ativo e publicavel neste ambiente."
          action={<GhostButton onClick={() => void loadSpaces()}>Revalidar contratos</GhostButton>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section className="relative overflow-hidden rounded-[36px] border border-[rgba(20,31,71,0.12)] bg-[linear-gradient(135deg,rgba(20,31,71,0.98),rgba(48,127,226,0.95)_54%,rgba(116,210,231,0.9))] px-6 py-8 text-white shadow-[0_28px_80px_rgba(20,31,71,0.16)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(225,0,152,0.18),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
            <div className="space-y-5">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-white/72">
                Help Center B2B
              </p>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                  Documentacao tecnica oficial para operacao B2B do Genius Support OS.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  Esta superficie publica entrega guias de uso, configuracao e integracao para clientes B2B e usuarios da plataforma, sem expor playbooks internos nem estados editoriais nao publicados.
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
            </div>
            <div className="grid gap-4 rounded-[30px] border border-white/14 bg-white/10 p-5 backdrop-blur">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/65">
                  Disponibilidade
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                  {spaces.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/76">
                  knowledge space{spaces.length > 1 ? 's' : ''} ativo{spaces.length > 1 ? 's' : ''} e publicavel{spaces.length > 1 ? 'is' : ''} neste ambiente.
                </p>
              </div>
              <div className="grid gap-3">
                {spaces.map((space) => (
                  <div
                    key={space.knowledgeSpaceSlug}
                    className="rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.08)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{space.brandName}</p>
                        <p className="text-xs text-white/68">{space.organizationDisplayName}</p>
                      </div>
                      <StatusPill tone="positive">ativo</StatusPill>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/74">
                      Rota canonica: {space.canonicalPath}
                      {space.canonicalHost ? ` ou ${space.canonicalHost}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => (
            <article
              key={space.knowledgeSpaceSlug}
              className="rounded-[30px] border border-[rgba(20,31,71,0.12)] bg-white/92 p-6 shadow-[var(--shadow-panel)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                    Knowledge Space
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                    {space.brandName}
                  </h2>
                </div>
                <StatusPill tone={toneForArticleCount(space.routeCount)}>
                  {space.defaultLocale}
                </StatusPill>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                {space.displayName} opera como central tecnica publica da plataforma, mantendo o mesmo backend e a mesma governanca multi-brand.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-[color:var(--color-muted)]">
                <span className="rounded-full bg-[color:var(--color-surface)] px-3 py-1">
                  slug: {space.knowledgeSpaceSlug}
                </span>
                {space.canonicalHost ? (
                  <span className="rounded-full bg-[color:var(--color-surface)] px-3 py-1">
                    host: {space.canonicalHost}
                  </span>
                ) : null}
              </div>
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
        </section>
      </div>
    </div>
  );
}

export function HelpCenterSpaceLayout() {
  const location = useLocation();
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const didLoadRef = useRef(false);
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

    didLoadRef.current = true;
    setPhase('loading');
    void loadSpace(spaceSlug);
  }, [spaceSlug]);

  const space = context?.primaryRoute ?? null;
  const theme = useMemo(
    () =>
      space
        ? buildBrandTheme({
            brandName: space.brand_name,
            knowledgeSpaceSlug: space.knowledge_space_slug,
            displayName: space.knowledge_space_display_name,
          })
        : null,
    [space],
  );
  const topCategories =
    context?.navigation.filter((entry) => entry.parent_category_id === null) ?? [];
  const latestArticles: PublicKnowledgeArticleListRow[] = (context?.articles ?? []).slice(0, 5);
  const isArticlesRoute =
    location.pathname.endsWith('/articles') ||
    location.pathname.includes('/articles/');

  if (!spaceSlug) {
    return <Navigate replace to="/help" />;
  }

  if (phase === 'loading') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <LoadingState
          title="Carregando a documentacao tecnica"
          description="A Central Publica esta resolvendo o knowledge space e a navegacao publica antes de exibir o conteudo."
        />
      </div>
    );
  }

  if (phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <ContractUnavailableState contractName="superficie publica da Knowledge Base" />
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
            'A superficie publica nao conseguiu resolver o knowledge space solicitado.'
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
          description="O knowledge space solicitado nao existe ou ainda nao esta ativo para leitura publica."
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
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <aside className="grid content-start gap-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:py-2">
          <section className="relative overflow-hidden rounded-[34px] border border-[var(--help-border)] bg-[var(--help-hero)] px-6 py-7 text-white shadow-[0_28px_80px_rgba(20,31,71,0.14)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between gap-3">
                <Link
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/70 no-underline"
                  to="/help"
                >
                  Help Center
                </Link>
                <StatusPill tone="positive">publico</StatusPill>
              </div>
              <div className="space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/12 text-lg font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_28px_rgba(20,31,71,0.18)]">
                  {(space.brand_name || space.knowledge_space_display_name)
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                    {space.brand_name}
                  </h1>
                  <p className="text-sm leading-6 text-white/76">
                    {space.knowledge_space_display_name} publica apenas documentacao tecnica B2B aprovada para leitura.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 rounded-[24px] border border-white/14 bg-white/10 p-4 backdrop-blur">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/62">
                    Rota
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    /help/{space.knowledge_space_slug}
                  </p>
                </div>
                {context.routes.some((route) => route.route_kind === 'domain') ? (
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/62">
                      Dominio futuro
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {context.routes.find((route) => route.route_kind === 'domain')?.route_host}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/62">
                      Branding
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      Fallback visual seguro usando os dados publicos do knowledge space.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur">
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
                  className="rounded-[22px] border border-[var(--help-border)] bg-white/74 px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                  to={`/help/${space.knowledge_space_slug}/articles`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--help-ink-strong)]">
                        {category.category_name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--help-muted)]">
                        {category.category_description ??
                          'Categoria publica com guias tecnicos aprovados.'}
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

          <section className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-5 shadow-[var(--shadow-panel)] backdrop-blur">
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                Ultimos publicados
              </p>
              {latestArticles.length === 0 ? (
                <p className="text-sm leading-6 text-[var(--help-muted)]">
                  Ainda nao existem artigos publicados visiveis neste knowledge space.
                </p>
              ) : (
                <div className="grid gap-3">
                  {latestArticles.map((article) => (
                    <Link
                      key={article.id}
                      className="rounded-[22px] border border-[var(--help-border)] bg-white/74 px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                      to={`/help/${space.knowledge_space_slug}/articles/${article.slug}`}
                    >
                      <p className="text-sm font-semibold text-[var(--help-ink-strong)]">
                        {article.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--help-muted)]">
                        {article.summary ?? 'Artigo tecnico publicado.'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>

        <main className="grid content-start gap-6 py-2">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
