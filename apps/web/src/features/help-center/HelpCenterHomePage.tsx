import { Link, useOutletContext } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import { EmptyState } from '../../components/states';
import { AppButton, InlineNotice, StatusPill } from '../../components/ui';
import type { HelpCenterSpaceContext } from './context';
import { sanitizePublicSupportContacts } from './branding';

function toneForCategoryCount(count: number) {
  if (count >= 6) {
    return 'positive' as const;
  }

  if (count >= 2) {
    return 'accent' as const;
  }

  return 'default' as const;
}

export function HelpCenterHomePage() {
  const context = useOutletContext<HelpCenterSpaceContext>();
  const rootCategories = context.navigation.filter(
    (entry) => entry.parent_category_id === null,
  );
  const featuredArticles = context.articles.slice(0, 6);
  const supportContacts = sanitizePublicSupportContacts(
    context.primaryRoute.support_contacts,
  );

  return (
    <>
      <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--help-muted)]">
              Visao geral
            </p>
            <h2 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--help-ink-strong)]">
              Guias publicos para operacao tecnica B2B.
            </h2>
            <p className="max-w-3xl text-base leading-8 text-[var(--help-muted)]">
              Esta central concentra apenas conteudo publicado e aprovado para clientes B2B e usuarios da plataforma. Nenhum rascunho, artigo restrito ou playbook interno entra nesta camada.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={`/help/${context.primaryRoute.knowledge_space_slug}/articles`}>
                <AppButton>Ver todos os artigos</AppButton>
              </Link>
              <StatusPill tone="positive">
                {context.articles.length} artigo{context.articles.length === 1 ? '' : 's'} publicado{context.articles.length === 1 ? '' : 's'}
              </StatusPill>
            </div>
          </div>
          <div className="grid gap-4 rounded-[30px] border border-[var(--help-border)] bg-white/74 p-5">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                Contrato publico
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--help-ink)]">
                A leitura desta tela sai apenas de `vw_public_knowledge_*`. O backend continua como source of truth para filtragem de status, visibilidade e activity do knowledge space.
              </p>
            </div>
            <InlineNotice>
              Conteudo legado em HTML nao e renderizado aqui. O corpo oficial segue `body_md` com renderizacao Markdown segura.
            </InlineNotice>
            {supportContacts.email || supportContacts.docsUrl || supportContacts.statusPageUrl ? (
              <div className="grid gap-2 text-sm">
                {supportContacts.email ? (
                  <a
                    className="font-medium text-[var(--help-link)] no-underline hover:text-[var(--help-link-hover)]"
                    href={`mailto:${supportContacts.email}`}
                  >
                    {supportContacts.email}
                  </a>
                ) : null}
                {supportContacts.docsUrl ? (
                  <a
                    className="font-medium text-[var(--help-link)] no-underline hover:text-[var(--help-link-hover)]"
                    href={supportContacts.docsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir documentacao oficial
                  </a>
                ) : null}
                {supportContacts.statusPageUrl ? (
                  <a
                    className="font-medium text-[var(--help-link)] no-underline hover:text-[var(--help-link-hover)]"
                    href={supportContacts.statusPageUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Ver status da plataforma
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {rootCategories.length === 0 ? (
          <div className="xl:col-span-2">
            <EmptyState
              title="Sem categorias publicas visiveis"
              description="Ainda nao existem categorias publicas com artigos publicados para este knowledge space."
            />
          </div>
        ) : (
          rootCategories.map((category) => (
            <article
              key={category.category_id}
              className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                    Categoria
                  </p>
                  <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
                    {category.category_name}
                  </h3>
                  <p className="text-sm leading-7 text-[var(--help-muted)]">
                    {category.category_description ??
                      'Categoria publica aprovada para orientar configuracao, uso e integracao.'}
                  </p>
                </div>
                <StatusPill tone={toneForCategoryCount(category.subtree_article_count)}>
                  {category.subtree_article_count} itens
                </StatusPill>
              </div>
              {category.articles.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {category.articles.map((article) => (
                    <Link
                      key={article.id}
                      className="rounded-[22px] border border-[var(--help-border)] bg-white/78 px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                      to={`/help/${context.primaryRoute.knowledge_space_slug}/articles/${article.slug}`}
                    >
                      <p className="text-sm font-semibold text-[var(--help-ink-strong)]">
                        {article.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--help-muted)]">
                        {article.summary ?? 'Artigo publico publicado.'}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-dashed border-[var(--help-border)] px-4 py-4 text-sm leading-6 text-[var(--help-muted)]">
                  A categoria ja esta publica, mas ainda nao possui artigos publicados diretamente nela.
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <section className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
              Publicados recentemente
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
              Ultimos artigos visiveis
            </h3>
          </div>
          <Link to={`/help/${context.primaryRoute.knowledge_space_slug}/articles`}>
            <AppButton>Ir para a lista completa</AppButton>
          </Link>
        </div>
        {featuredArticles.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Nenhum artigo publicado ainda"
              description="O knowledge space ainda nao tem artigos publicos publicados para leitura."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {featuredArticles.map((article) => (
              <Link
                key={article.id}
                className="rounded-[24px] border border-[var(--help-border)] bg-white/78 px-5 py-4 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                to={`/help/${context.primaryRoute.knowledge_space_slug}/articles/${article.slug}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[var(--help-ink-strong)]">
                      {article.title}
                    </p>
                    <p className="text-sm leading-6 text-[var(--help-muted)]">
                      {article.summary ?? 'Artigo tecnico B2B publicado.'}
                    </p>
                  </div>
                  <StatusPill tone="default">
                    {formatDateTime(article.updated_at)}
                  </StatusPill>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
