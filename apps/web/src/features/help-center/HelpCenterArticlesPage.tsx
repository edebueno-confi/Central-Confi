import { Link, useOutletContext } from 'react-router-dom';
import { EmptyState } from '../../components/states';
import { StatusPill } from '../../components/ui';
import { formatDateTime } from '../../app/format';
import type { PublicKnowledgeNavigationRow } from '../../contracts/public-contracts';
import type { HelpCenterSpaceContext } from './context';

function buildCategoryMap(navigation: PublicKnowledgeNavigationRow[]) {
  return new Map(
    navigation.map((entry) => [entry.category_id, entry.category_name] as const),
  );
}

export function HelpCenterArticlesPage() {
  const context = useOutletContext<HelpCenterSpaceContext>();
  const categoryMap = buildCategoryMap(context.navigation);

  if (context.articles.length === 0) {
    return (
      <EmptyState
        title="Nenhum artigo publicado"
        description="Este knowledge space ainda nao possui artigos publicos publicados para a lista geral."
      />
    );
  }

  return (
    <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--help-muted)]">
            Todos os artigos
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--help-ink-strong)]">
            Base publicada de {context.primaryRoute.brand_name}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-[var(--help-muted)]">
            Lista integral dos artigos tecnicos publicos aprovados para este knowledge space.
          </p>
        </div>
        <StatusPill tone="positive">
          {context.articles.length} publicado{context.articles.length === 1 ? '' : 's'}
        </StatusPill>
      </div>
      <div className="mt-6 grid gap-4">
        {context.articles.map((article) => (
          <Link
            key={article.id}
            className="rounded-[26px] border border-[var(--help-border)] bg-white/80 px-5 py-5 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
            to={`/help/${context.primaryRoute.knowledge_space_slug}/articles/${article.slug}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {article.category_id ? (
                    <StatusPill tone="accent">
                      {categoryMap.get(article.category_id) ?? article.category_name ?? 'Categoria publica'}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="default">Sem categoria</StatusPill>
                  )}
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
                  {article.title}
                </h3>
                <p className="max-w-3xl text-sm leading-7 text-[var(--help-muted)]">
                  {article.summary ?? 'Artigo tecnico publico sem resumo adicional.'}
                </p>
              </div>
              <div className="text-right text-xs leading-5 text-[var(--help-muted)]">
                <p>Publicado</p>
                <p className="mt-1 font-medium text-[var(--help-ink)]">
                  {article.published_at
                    ? formatDateTime(article.published_at)
                    : formatDateTime(article.updated_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
