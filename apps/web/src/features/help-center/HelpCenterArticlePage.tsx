import { useEffect, useEffectEvent, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import { GhostButton, InlineNotice, StatusPill } from '../../components/ui';
import type { PublicKnowledgeArticleDetailRow } from '../../contracts/public-contracts';
import { classifyAdminError } from '../admin/admin-errors';
import type { HelpCenterSpaceContext } from './context';
import { useHelpCenterDocumentMeta } from './branding';
import { MarkdownDocument } from './markdown';
import { getPublicKnowledgeArticle } from './public-api';

type DetailPhase = 'loading' | 'ready' | 'empty' | 'contract-unavailable' | 'error';

export function HelpCenterArticlePage() {
  const { spaceSlug, articleSlug } = useParams<{
    spaceSlug: string;
    articleSlug: string;
  }>();
  const context = useOutletContext<HelpCenterSpaceContext>();
  const [phase, setPhase] = useState<DetailPhase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [article, setArticle] = useState<PublicKnowledgeArticleDetailRow | null>(null);
  const articleMetaTitle = article
    ? `${article.title} | ${context.primaryRoute.brand_name}`
    : `${context.primaryRoute.brand_name} | Artigo tecnico`;
  const articleMetaDescription = article?.summary ??
    `${context.primaryRoute.brand_name} publica documentacao tecnica B2B aprovada para leitura.`;

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
          'Nao foi possivel carregar o artigo publico solicitado.',
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

  if (!spaceSlug || !articleSlug) {
    return (
      <EmptyState
        title="Artigo nao encontrado"
        description="A rota publica solicitada esta incompleta para resolver este artigo."
      />
    );
  }

  if (phase === 'loading') {
    return (
      <LoadingState
        title="Carregando artigo tecnico"
        description="O frontend esta resolvendo o detalhe publico do artigo aprovado para leitura."
      />
    );
  }

  if (phase === 'contract-unavailable') {
    return (
      <ContractUnavailableState contractName="detalhe publico de artigo da Knowledge Base" />
    );
  }

  if (phase === 'error') {
    return (
      <ErrorState
        title="Falha ao carregar o artigo"
        description={
          message ??
          'A superficie publica nao conseguiu carregar este artigo neste ambiente.'
        }
        action={
          <GhostButton onClick={() => void loadArticle(spaceSlug, articleSlug)}>
            Tentar novamente
          </GhostButton>
        }
      />
    );
  }

  if (phase === 'empty' || !article) {
    return (
      <EmptyState
        title="Artigo nao encontrado"
        description="O artigo solicitado nao existe, nao esta publicado ou nao e publico neste knowledge space."
        action={
          <Link to={`/help/${spaceSlug}/articles`}>
            <GhostButton>Voltar para a lista de artigos</GhostButton>
          </Link>
        }
      />
    );
  }

  const relatedArticles = context.articles
    .filter((entry) => entry.id !== article.id)
    .filter((entry) =>
      article.category_id ? entry.category_id === article.category_id : true,
    )
    .slice(0, 3);

  return (
    <>
      <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="text-sm font-medium text-[var(--help-link)] no-underline hover:text-[var(--help-link-hover)]"
              to={`/help/${spaceSlug}`}
            >
              {context.primaryRoute.brand_name}
            </Link>
            <span className="text-[var(--help-muted)]">/</span>
            <Link
              className="text-sm font-medium text-[var(--help-link)] no-underline hover:text-[var(--help-link-hover)]"
              to={`/help/${spaceSlug}/articles`}
            >
              Artigos
            </Link>
            {article.category_name ? (
              <>
                <span className="text-[var(--help-muted)]">/</span>
                <span className="text-sm text-[var(--help-muted)]">{article.category_name}</span>
              </>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {article.category_name ? (
                <StatusPill tone="accent">{article.category_name}</StatusPill>
              ) : null}
              <StatusPill tone="positive">publicado</StatusPill>
            </div>
            <h2 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--help-ink-strong)]">
              {article.title}
            </h2>
            <p className="max-w-3xl text-base leading-8 text-[var(--help-muted)]">
              {article.summary ?? 'Artigo tecnico aprovado para leitura publica.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--help-muted)]">
            <div>
              <p className="font-medium text-[var(--help-ink)]">Publicado em</p>
              <p>{article.published_at ? formatDateTime(article.published_at) : '-'}</p>
            </div>
            <div>
              <p className="font-medium text-[var(--help-ink)]">Atualizado em</p>
              <p>{formatDateTime(article.updated_at)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <MarkdownDocument source={article.body_md} />
      </section>

      <InlineNotice>
        Esta camada publica exibe somente `body_md` aprovado. Conteudo interno, trilha de importacao legado e metadados editoriais nao sao expostos nesta superficie.
      </InlineNotice>

      {relatedArticles.length > 0 ? (
        <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
          <div className="space-y-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--help-muted)]">
                Continuar leitura
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
                Mais artigos relacionados
              </h3>
            </div>
            <div className="grid gap-3">
              {relatedArticles.map((entry) => (
                <Link
                  key={entry.id}
                  className="rounded-[24px] border border-[var(--help-border)] bg-white/78 px-5 py-4 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                  to={`/help/${spaceSlug}/articles/${entry.slug}`}
                >
                  <p className="text-base font-semibold text-[var(--help-ink-strong)]">
                    {entry.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--help-muted)]">
                    {entry.summary ?? 'Artigo tecnico publico.'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
