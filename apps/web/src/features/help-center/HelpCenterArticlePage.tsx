import { FormEvent, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import { AppButton, GhostButton, StatusPill, TextInput, cx } from '../../components/ui';
import type { PublicKnowledgeArticleDetailRow } from '../../contracts/public-contracts';
import { classifyAdminError } from '../admin/admin-errors';
import type { HelpCenterSpaceContext } from './context';
import { useHelpCenterDocumentMeta } from './branding';
import { MarkdownDocument } from './markdown';
import { getPublicKnowledgeArticle } from './public-api';

type DetailPhase = 'loading' | 'ready' | 'empty' | 'contract-unavailable' | 'error';

interface ArticleSectionItem {
  id: string;
  label: string;
}

function slugifyHeading(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function estimateReadingTime(source: string) {
  const plainText = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, ' ')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = plainText ? plainText.split(' ').length : 0;
  return Math.max(1, Math.ceil(wordCount / 190));
}

function extractArticleSections(source: string, fallbackTitle: string) {
  const sections: ArticleSectionItem[] = [];
  const usedIds = new Map<string, number>();

  for (const rawLine of source.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = rawLine.trim();
    const match = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const label = match[2].trim();
    const baseId = slugifyHeading(label) || 'secao';
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    sections.push({ id, label });
  }

  if (sections.length === 0) {
    return [
      {
        id: slugifyHeading(fallbackTitle) || 'visao-geral',
        label: 'Visão geral',
      },
    ];
  }

  return sections.slice(0, 9);
}

function ArticleHeaderSearch({
  spaceSlug,
}: {
  spaceSlug: string;
}) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTerm = searchTerm.trim();
    if (!nextTerm) {
      navigate(`/help/${spaceSlug}/articles`);
      return;
    }

    navigate(`/help/${spaceSlug}?q=${encodeURIComponent(nextTerm)}`);
  }

  return (
    <form
      className="flex w-full max-w-[360px] items-center gap-3 rounded-[18px] border border-[var(--help-border)] bg-white px-4 py-3 shadow-[0_10px_26px_rgba(20,31,71,0.05)]"
      onSubmit={handleSearchSubmit}
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5 text-[var(--help-muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="11" cy="11" r="6" />
      </svg>
      <TextInput
        aria-label="Buscar artigos"
        className="h-auto flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus:border-0 focus:ring-0"
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Buscar artigos..."
        type="search"
        value={searchTerm}
      />
      <span className="rounded-xl border border-[var(--help-border)] bg-[var(--help-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--help-muted)]">
        Ctrl + K
      </span>
    </form>
  );
}

function PublicArticleChrome({
  spaceSlug,
  brandName,
  topCategories,
  breadcrumbCategory,
  articleTitle,
  children,
}: {
  spaceSlug: string;
  brandName: string;
  topCategories: Array<{ category_id: string; category_name: string; subtree_article_count: number }>;
  breadcrumbCategory: string;
  articleTitle: string;
  children: React.ReactNode;
}) {
  const brandMonogram = (brandName || 'GS').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--help-border)] bg-white/92 shadow-[0_14px_30px_rgba(20,31,71,0.04)] backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
          <Link
            className="flex items-center gap-3 no-underline"
            to={`/help/${spaceSlug}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--color-brand-navy),var(--color-brand-blue)_66%,var(--color-brand-magenta))] text-base font-semibold text-white shadow-[0_12px_26px_rgba(20,31,71,0.22)]">
              {brandMonogram}
            </div>
            <div className="leading-tight">
              <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--help-ink-strong)]">
                {brandName}
              </p>
              <p className="text-[0.95rem] text-[var(--help-muted)]">Central de ajuda</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <Link
              className="text-base font-medium text-[var(--help-ink)] no-underline transition hover:text-[var(--help-link)]"
              to={`/help/${spaceSlug}`}
            >
              Início
            </Link>
            <Link
              className="text-base font-medium text-[var(--help-ink)] no-underline transition hover:text-[var(--help-link)]"
              to={`/help/${spaceSlug}/articles`}
            >
              Todos os artigos
            </Link>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-medium text-[var(--help-ink)] transition hover:text-[var(--help-link)]">
                Categorias
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 transition group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="absolute left-1/2 top-[calc(100%+12px)] z-20 w-[280px] -translate-x-1/2 rounded-[22px] border border-[var(--help-border)] bg-white p-3 shadow-[0_18px_44px_rgba(20,31,71,0.12)]">
                <div className="grid gap-2">
                  {topCategories.length > 0 ? (
                    topCategories.slice(0, 6).map((category) => (
                      <Link
                        key={category.category_id}
                        className="rounded-[16px] px-3 py-2 no-underline transition hover:bg-[var(--help-surface)]"
                        to={`/help/${spaceSlug}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-[var(--help-ink)]">
                            {category.category_name}
                          </span>
                          <span className="text-xs text-[var(--help-muted)]">
                            {category.subtree_article_count}
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-[var(--help-muted)]">
                      Indisponível
                    </p>
                  )}
                </div>
              </div>
            </details>
          </nav>

          <ArticleHeaderSearch spaceSlug={spaceSlug} />
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-5 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-3 border-b border-[var(--help-border)] pb-4 text-sm text-[var(--help-muted)]"
        >
          <Link
            className="font-medium text-[var(--help-ink)] no-underline transition hover:text-[var(--help-link)]"
            to={`/help/${spaceSlug}`}
          >
            Central de ajuda
          </Link>
          <span aria-hidden="true">›</span>
          <span>{breadcrumbCategory}</span>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-[var(--help-ink)]">{articleTitle}</span>
        </nav>

        {children}
      </div>
    </div>
  );
}

function ArticlePageSkeleton({
  sectionCount,
}: {
  sectionCount: number;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="grid content-start gap-5 xl:sticky xl:top-6">
        <div className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="h-4 w-32 rounded-full bg-[var(--help-surface)]" />
          <div className="mt-5 grid gap-3">
            {Array.from({ length: sectionCount }).map((_, index) => (
              <div
                key={`toc-${index}`}
                className="h-11 rounded-[18px] bg-[var(--help-surface)]"
              />
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="h-6 w-40 rounded-full bg-[var(--help-surface)]" />
          <div className="mt-4 h-16 rounded-[18px] bg-[var(--help-surface)]" />
          <div className="mt-4 h-12 w-36 rounded-[16px] bg-[var(--help-surface)]" />
        </div>
      </aside>

      <section className="rounded-[30px] border border-[var(--help-border)] bg-white px-8 py-8 shadow-[0_22px_48px_rgba(20,31,71,0.06)]">
        <div className="h-8 w-28 rounded-full bg-[var(--help-surface)]" />
        <div className="mt-5 h-14 w-3/4 rounded-[18px] bg-[var(--help-surface)]" />
        <div className="mt-4 h-5 w-1/2 rounded-full bg-[var(--help-surface)]" />
        <div className="mt-6 h-24 rounded-[24px] bg-[var(--help-accent-soft)]/70" />
        <div className="mt-8 grid gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={`line-${index}`}
              className={cx(
                'h-5 rounded-full bg-[var(--help-surface)]',
                index % 3 === 0 ? 'w-full' : index % 3 === 1 ? 'w-[92%]' : 'w-[84%]',
              )}
            />
          ))}
        </div>
      </section>

      <aside className="grid content-start gap-5 xl:sticky xl:top-6">
        <div className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="h-5 w-40 rounded-full bg-[var(--help-surface)]" />
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`related-${index}`}
                className="h-16 rounded-[18px] bg-[var(--help-surface)]"
              />
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="h-5 w-36 rounded-full bg-[var(--help-surface)]" />
          <div className="mt-5 flex gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--help-surface)]" />
            <div className="h-12 w-12 rounded-2xl bg-[var(--help-surface)]" />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function HelpCenterArticlePage() {
  const { spaceSlug, articleSlug } = useParams<{
    spaceSlug: string;
    articleSlug: string;
  }>();
  const context = useOutletContext<HelpCenterSpaceContext>();
  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [article, setArticle] = useState<PublicKnowledgeArticleDetailRow | null>(null);
  const topCategories = context.navigation.filter(
    (entry) => entry.parent_category_id === null,
  );
  const articleMetaTitle = article
    ? `${article.title} | ${context.primaryRoute.brand_name}`
    : `${context.primaryRoute.brand_name} | Artigo`;
  const articleMetaDescription = article?.summary ??
    `${context.primaryRoute.brand_name} reúne guias aprovados para consulta B2B.`;

  const loadArticle = useEffectEvent(
    async (targetSpaceSlug: string, targetArticleSlug: string) => {
      try {
        const data = await getPublicKnowledgeArticle(
          targetSpaceSlug,
          targetArticleSlug,
        );

        if (!data) {
          setArticle(null);
          setMessage(null);
          setPhase('empty');
          return;
        }

        setArticle(data);
        setMessage(null);
        setPhase('ready');
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Não foi possível carregar o artigo público solicitado.',
        );
        setArticle(null);
        setMessage(classified.message);
        setPhase(
          classified.kind === 'contract-unavailable'
            ? 'contract-unavailable'
            : 'error',
        );
      }
    },
  );

  useEffect(() => {
    if (!spaceSlug || !articleSlug) {
      return;
    }

    setPhase('loading');
    void loadArticle(spaceSlug, articleSlug);
  }, [articleSlug, spaceSlug]);

  useHelpCenterDocumentMeta({
    title: articleMetaTitle,
    description: articleMetaDescription,
  });

  const relatedArticles = useMemo(
    () =>
      context.articles
        .filter((entry) => entry.id !== article?.id)
        .filter((entry) =>
          article?.category_id ? entry.category_id === article.category_id : true,
        )
        .slice(0, 4),
    [article?.category_id, article?.id, context.articles],
  );
  const articleSections = useMemo(
    () => extractArticleSections(article?.body_md ?? '', article?.title ?? 'Visão geral'),
    [article?.body_md, article?.title],
  );
  const readingTime = useMemo(
    () => estimateReadingTime(article?.body_md ?? ''),
    [article?.body_md],
  );

  function renderShell(content: React.ReactNode) {
    return (
      <PublicArticleChrome
        articleTitle={article?.title ?? 'Artigo'}
        brandName={context.primaryRoute.brand_name || 'Genius Central de ajuda'}
        breadcrumbCategory={article?.category_name ?? 'Indisponível'}
        spaceSlug={spaceSlug ?? context.primaryRoute.knowledge_space_slug}
        topCategories={topCategories}
      >
        {content}
      </PublicArticleChrome>
    );
  }

  if (!spaceSlug || !articleSlug) {
    return renderShell(
      <div className="rounded-[30px] border border-[var(--help-border)] bg-white p-8 shadow-[0_20px_44px_rgba(20,31,71,0.08)]">
        <EmptyState
          title="Artigo não encontrado"
          description="A rota informada não tem os dados necessários para abrir este artigo."
        />
      </div>,
    );
  }

  if (phase === 'loading') {
    return renderShell(<ArticlePageSkeleton sectionCount={Math.max(articleSections.length, 4)} />);
  }

  if (phase === 'contract-unavailable') {
    return renderShell(
      <div className="rounded-[30px] border border-[var(--help-border)] bg-white p-8 shadow-[0_20px_44px_rgba(20,31,71,0.08)]">
        <ContractUnavailableState contractName="leitura publica do artigo" />
      </div>,
    );
  }

  if (phase === 'error') {
    return renderShell(
      <div className="rounded-[30px] border border-[var(--help-border)] bg-white p-8 shadow-[0_20px_44px_rgba(20,31,71,0.08)]">
        <ErrorState
          title="Falha ao carregar o artigo"
          description={
            message ??
            'Não foi possível carregar este artigo neste ambiente.'
          }
          action={
            <GhostButton onClick={() => void loadArticle(spaceSlug, articleSlug)}>
              Tentar novamente
            </GhostButton>
          }
        />
      </div>,
    );
  }

  if (phase === 'empty' || !article) {
    return renderShell(
      <div className="rounded-[30px] border border-[var(--help-border)] bg-white p-8 shadow-[0_20px_44px_rgba(20,31,71,0.08)]">
        <EmptyState
          title="Artigo não encontrado"
          description="O artigo solicitado não existe, ainda não foi publicado ou não está disponível nesta central."
          action={
            <Link to={`/help/${spaceSlug}/articles`}>
              <GhostButton>Voltar para a lista de artigos</GhostButton>
            </Link>
          }
        />
      </div>,
    );
  }

  return renderShell(
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="grid content-start gap-5 xl:sticky xl:top-6">
        <section className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="space-y-5">
            <div>
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-[var(--help-muted)]">
                Neste artigo
              </p>
            </div>
            <div className="grid gap-1.5">
              {articleSections.map((section, index) => (
                <a
                  key={section.id}
                  className={cx(
                    'flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm no-underline transition',
                    index === 0
                      ? 'border border-[rgba(48,127,226,0.12)] bg-[var(--help-accent-soft)] text-[var(--help-link)] shadow-[inset_3px_0_0_var(--help-accent)]'
                      : 'text-[var(--help-ink)] hover:bg-[var(--help-surface)]',
                  )}
                  href={`#${section.id}`}
                >
                  <span className={cx('font-semibold', index === 0 ? 'text-[var(--help-link)]' : 'text-[var(--help-muted)]')}>
                    {index + 1}.
                  </span>
                  <span className="font-medium">{section.label}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="space-y-4">
            <h3 className="text-[1.85rem] font-semibold tracking-[-0.05em] text-[var(--help-ink-strong)]">
              Precisa de mais ajuda?
            </h3>
            <p className="text-sm leading-7 text-[var(--help-muted)]">
              Abra um ticket com nosso time de suporte.
            </p>
            <Link to="/login">
              <AppButton className="w-full justify-center rounded-[16px] py-3 text-base">
                Abrir ticket
              </AppButton>
            </Link>
          </div>
        </section>
      </aside>

      <section className="rounded-[30px] border border-[var(--help-border)] bg-white px-8 py-8 shadow-[0_22px_48px_rgba(20,31,71,0.06)] sm:px-10 sm:py-9">
        <div className="space-y-6">
          <div className="space-y-4">
            <StatusPill tone="accent">
              {article.category_name ?? 'Indisponível'}
            </StatusPill>
            <div className="space-y-3">
              <h1 className="text-[clamp(2.8rem,4vw,4rem)] font-semibold tracking-[-0.07em] text-[var(--help-ink-strong)]">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-base text-[var(--help-muted)]">
                <span>
                  Atualizado em{' '}
                  {article.updated_at ? formatDateTime(article.updated_at) : 'Indisponível'}
                </span>
                <span aria-hidden="true">•</span>
                <span>{readingTime} min de leitura</span>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(48,127,226,0.18)] bg-[linear-gradient(180deg,rgba(48,127,226,0.09),rgba(48,127,226,0.04))] px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--help-accent)] text-white shadow-[0_10px_24px_rgba(48,127,226,0.22)]">
                i
              </div>
              <p className="max-w-4xl text-[1.02rem] font-medium leading-8 text-[var(--help-link)]">
                {article.summary ??
                  'Este artigo ajuda a orientar os pontos principais desta operação pública.'}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <MarkdownDocument source={article.body_md} />
          </div>
        </div>

        <footer className="mt-10 border-t border-[var(--help-border)] pt-5 text-center text-sm text-[var(--help-muted)]">
          © 2026 Genius Central de ajuda. Todos os direitos reservados.
        </footer>
      </section>

      <aside className="grid content-start gap-5 xl:sticky xl:top-6">
        <section className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="space-y-5">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.24em] text-[var(--help-muted)]">
              Artigos relacionados
            </p>
            {relatedArticles.length > 0 ? (
              <div className="grid gap-1">
                {relatedArticles.map((entry, index) => (
                  <Link
                    key={entry.id}
                    className="rounded-[18px] px-2 py-3 no-underline transition hover:bg-[var(--help-surface)]"
                    to={`/help/${spaceSlug}/articles/${entry.slug}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--help-border)] bg-[var(--help-surface)] text-[var(--help-link)]">
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          viewBox="0 0 24 24"
                        >
                          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium leading-7 text-[var(--help-ink-strong)]">
                          {entry.title}
                        </p>
                        <p className="text-sm leading-6 text-[var(--help-muted)]">
                          {entry.summary ?? 'Indisponível'}
                        </p>
                      </div>
                    </div>
                    {index < relatedArticles.length - 1 ? (
                      <div className="mt-4 border-t border-[var(--help-border)]" />
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--help-muted)]">
                Nenhum artigo relacionado disponível.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--help-border)] bg-white p-6 shadow-[0_18px_42px_rgba(20,31,71,0.06)]">
          <div className="space-y-5">
            <h3 className="text-[1.7rem] font-semibold tracking-[-0.05em] text-[var(--help-ink-strong)]">
              Este artigo foi útil?
            </h3>
            <div className="flex gap-3">
              <button
                className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-[var(--help-border)] bg-[var(--help-surface)] text-[var(--help-ink)] transition hover:border-[var(--help-accent)]/40 hover:bg-white"
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10v11M12 21h4.65a2 2 0 0 0 1.98-1.72l1.03-7A2 2 0 0 0 17.68 10H14V5.72A1.72 1.72 0 0 0 12.28 4L7 10v11" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-[var(--help-border)] bg-[var(--help-surface)] text-[var(--help-ink)] transition hover:border-[var(--help-accent)]/40 hover:bg-white"
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 14V3M12 3H7.35a2 2 0 0 0-1.98 1.72l-1.03 7A2 2 0 0 0 6.32 14H10v4.28A1.72 1.72 0 0 0 11.72 20L17 14V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>,
  );
}
