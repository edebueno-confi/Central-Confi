import { FormEvent, useEffect, useEffectEvent, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import { AppButton, GhostButton, InlineNotice, StatusPill } from '../../components/ui';
import type { PublicKnowledgeSearchArticleRow } from '../../contracts/public-contracts';
import { classifyAdminError } from '../admin/admin-errors';
import type { HelpCenterSpaceContext } from './context';
import { sanitizePublicSupportContacts } from './branding';
import { searchPublicKnowledgeArticles } from './public-api';

type SearchPhase = 'idle' | 'loading' | 'ready' | 'empty' | 'contract-unavailable' | 'error';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const rootCategories = context.navigation.filter(
    (entry) => entry.parent_category_id === null,
  );
  const featuredArticles = context.articles.slice(0, 6);
  const supportContacts = sanitizePublicSupportContacts(
    context.primaryRoute.support_contacts,
  );
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle');
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PublicKnowledgeSearchArticleRow[]>([]);
  const activeQuery = (searchParams.get('q') ?? '').trim();

  const loadSearch = useEffectEvent(async (query: string) => {
    try {
      const results = await searchPublicKnowledgeArticles(
        context.primaryRoute.knowledge_space_slug,
        query,
        10,
      );
      setSearchResults(results);
      setSearchMessage(null);
      setSearchPhase(results.length === 0 ? 'empty' : 'ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Nao foi possivel executar a busca publica da Central de Ajuda.',
      );
      setSearchResults([]);
      setSearchMessage(classified.message);
      setSearchPhase(
        classified.kind === 'contract-unavailable'
          ? 'contract-unavailable'
          : 'error',
      );
    }
  });

  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (!activeQuery) {
      setSearchResults([]);
      setSearchMessage(null);
      setSearchPhase('idle');
      return;
    }

    if (activeQuery.length < 2) {
      setSearchResults([]);
      setSearchMessage(null);
      setSearchPhase('empty');
      return;
    }

    setSearchPhase('loading');
    void loadSearch(activeQuery);
  }, [activeQuery, context.primaryRoute.knowledge_space_slug]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    const nextParams = new URLSearchParams(searchParams);

    if (!nextQuery) {
      nextParams.delete('q');
    } else {
      nextParams.set('q', nextQuery);
    }

    setSearchParams(nextParams, { replace: nextQuery === activeQuery });
  }

  function clearSearch() {
    setSearchInput('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <>
      <section className="rounded-[34px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--help-muted)]">
              Visao geral
            </p>
            <h2 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--help-ink-strong)]">
              Encontre rapido a orientacao certa para operar a plataforma.
            </h2>
            <p className="max-w-3xl text-base leading-8 text-[var(--help-muted)]">
              Esta central concentra somente conteudo publicado e aprovado. O objetivo aqui e reduzir friccao de uso, configuracao e integracao sem expor conteudo interno.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={`/help/${context.primaryRoute.knowledge_space_slug}/articles`}>
                <AppButton>Ver todos os artigos</AppButton>
              </Link>
              <StatusPill tone="positive">
                {context.articles.length} artigo{context.articles.length === 1 ? '' : 's'} publicado{context.articles.length === 1 ? '' : 's'}
              </StatusPill>
            </div>
            <form
              className="grid gap-3 rounded-[28px] border border-[var(--help-border)] bg-white/82 p-4 shadow-[0_18px_42px_rgba(20,31,71,0.06)] sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={handleSearchSubmit}
            >
              <label className="grid gap-2" htmlFor="help-center-search">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                  Buscar artigo
                </span>
                <input
                  id="help-center-search"
                  autoComplete="off"
                  className="h-12 rounded-[20px] border border-[var(--help-border)] bg-[var(--help-surface)] px-4 text-sm text-[var(--help-ink-strong)] outline-none transition placeholder:text-[var(--help-muted)] focus:border-[var(--help-accent)] focus:ring-2 focus:ring-[color:var(--help-accent-soft)]"
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Ex.: integracao, configuracao, transportadora"
                  type="search"
                  value={searchInput}
                />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <AppButton type="submit">Buscar</AppButton>
                {(searchInput || activeQuery) ? (
                  <GhostButton onClick={clearSearch} type="button">
                    Limpar
                  </GhostButton>
                ) : null}
              </div>
            </form>
          </div>
          <div className="grid gap-4 rounded-[30px] border border-[var(--help-border)] bg-white/74 p-5">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
                Como esta camada funciona
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--help-ink)]">
                Esta central mostra apenas orientacoes publicas e aprovadas. O conteudo visivel aqui foi organizado para facilitar configuracao, uso e integracao sem expor material interno.
              </p>
            </div>
            <InlineNotice>
              Cada artigo desta central passa por revisao antes de aparecer aqui. Conteudo interno ou rascunhos continuam fora da experiencia publica.
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

      <section className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
              Resultado da busca
            </p>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
              Procurar artigos publicados
            </h3>
            <p className="max-w-3xl text-sm leading-7 text-[var(--help-muted)]">
              Use a busca para encontrar rapidamente orientacoes publicas desta central sem sair do fluxo principal.
            </p>
          </div>
          {activeQuery ? (
            <StatusPill tone={searchPhase === 'ready' ? 'positive' : 'default'}>
              consulta: {activeQuery}
            </StatusPill>
          ) : null}
        </div>

        <div className="mt-5">
          {searchPhase === 'idle' ? (
            <div className="rounded-[24px] border border-dashed border-[var(--help-border)] bg-white/56 px-5 py-5 text-sm leading-7 text-[var(--help-muted)]">
              Digite pelo menos 2 caracteres para procurar configuracoes, fluxos e integracoes publicadas nesta central.
            </div>
          ) : null}

          {searchPhase === 'loading' ? (
            <LoadingState
              title="Buscando artigos publicados"
              description="Estamos consultando apenas conteudo publico e aprovado desta central."
            />
          ) : null}

          {searchPhase === 'contract-unavailable' ? (
            <ErrorState
              title="Busca publica indisponivel"
              description="A busca desta central nao ficou disponivel neste ambiente agora."
            />
          ) : null}

          {searchPhase === 'error' ? (
            <ErrorState
              title="Falha ao executar a busca"
              description={
                searchMessage ??
                'A camada publica nao conseguiu consultar os artigos publicados neste ambiente.'
              }
              action={
                <GhostButton onClick={() => void loadSearch(activeQuery)}>
                  Tentar novamente
                </GhostButton>
              }
            />
          ) : null}

          {searchPhase === 'empty' ? (
            activeQuery.length < 2 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--help-border)] bg-white/56 px-5 py-5 text-sm leading-7 text-[var(--help-muted)]">
                Use pelo menos 2 caracteres para manter a busca publica objetiva e legivel.
              </div>
            ) : (
              <EmptyState
                title="Nenhum artigo encontrado"
                description="Nenhum artigo publicado corresponde a esta consulta neste knowledge space. Tente um termo mais direto ou navegue pelas categorias abaixo."
              />
            )
          ) : null}

          {searchPhase === 'ready' ? (
            <div className="grid gap-3">
              {searchResults.map((article) => (
                <Link
                  key={article.article_id}
                  className="rounded-[24px] border border-[var(--help-border)] bg-white/80 px-5 py-4 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
                  to={`/help/${context.primaryRoute.knowledge_space_slug}/articles/${article.slug}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone="accent">
                          {article.category_name ?? 'Artigo publico'}
                        </StatusPill>
                      </div>
                      <h4 className="text-lg font-semibold tracking-[-0.03em] text-[var(--help-ink-strong)]">
                        {article.title}
                      </h4>
                      <p className="max-w-3xl text-sm leading-7 text-[var(--help-muted)]">
                        {article.summary ?? 'Artigo tecnico B2B publicado sem resumo adicional.'}
                      </p>
                    </div>
                    <div className="text-left text-xs leading-5 text-[var(--help-muted)] sm:text-right">
                      {article.rank_score ? (
                        <p className="font-medium text-[var(--help-ink)]">
                          score {article.rank_score.toFixed(2)}
                        </p>
                      ) : null}
                      <p className="mt-1">Atualizado em {formatDateTime(article.updated_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--help-border)] bg-[var(--help-panel)] p-6 shadow-[var(--shadow-panel)] backdrop-blur sm:p-8">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--help-muted)]">
            Navegar por categoria
          </p>
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--help-ink-strong)]">
            Acesse os temas principais sem depender da busca.
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-[var(--help-muted)]">
            As categorias abaixo organizam apenas artigos publicos e publicados deste knowledge space.
          </p>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
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
              className="rounded-[28px] border border-[var(--help-border)] bg-white/78 p-6 shadow-[0_18px_44px_rgba(20,31,71,0.05)]"
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
                      className="rounded-[22px] border border-[var(--help-border)] bg-[var(--help-surface)] px-4 py-3 no-underline transition hover:border-[var(--help-accent)]/30 hover:bg-white"
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
        </div>
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
