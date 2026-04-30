import {
  type FormEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import { formatDateTime } from '../../app/format';
import {
  AppButton,
  Field,
  GhostButton,
  InlineNotice,
  MetricCard,
  PageHeader,
  Panel,
  SelectInput,
  StatusPill,
  TextInput,
  TextareaInput,
} from '../../components/ui';
import {
  ContractUnavailableState,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/states';
import {
  archiveKnowledgeArticleV2,
  createKnowledgeArticleDraftV2,
  createKnowledgeCategoryV2,
  getAdminKnowledgeArticleDetailV2,
  listAdminKnowledgeArticlesV2,
  listAdminKnowledgeCategoriesV2,
  listAdminKnowledgeSpaces,
  publishKnowledgeArticleV2,
  submitKnowledgeArticleForReviewV2,
  updateKnowledgeArticleDraftV2,
  type AdminKnowledgeArticleDetailV2Row,
  type AdminKnowledgeArticleListItemV2Row,
  type AdminKnowledgeCategoryV2Row,
  type AdminKnowledgeSpaceRow,
  type KnowledgeArticleStatus,
  type KnowledgeVisibility,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';
import {
  KNOWLEDGE_ARTICLE_STATUSES,
  KNOWLEDGE_VISIBILITIES,
} from '../../contracts/admin-contracts';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type ContentPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type PanelMode = 'detail' | 'create-article' | 'edit-article' | 'create-category';
type ArticleStatusFilter = KnowledgeArticleStatus | 'all';
type ArticleVisibilityFilter = KnowledgeVisibility | 'all';

interface ArticleFormState {
  title: string;
  slug: string;
  summary: string;
  bodyMd: string;
  categoryId: string;
  visibility: KnowledgeVisibility;
  sourcePath: string;
  sourceHash: string;
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  visibility: KnowledgeVisibility;
  parentCategoryId: string;
}

interface ArticleActionFeedback {
  articleId: string;
  message: string;
}

function emptyArticleForm(): ArticleFormState {
  return {
    title: '',
    slug: '',
    summary: '',
    bodyMd: '',
    categoryId: '',
    visibility: 'internal',
    sourcePath: '',
    sourceHash: '',
  };
}

function emptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    slug: '',
    description: '',
    visibility: 'internal',
    parentCategoryId: '',
  };
}

function buildArticleForm(detail: AdminKnowledgeArticleDetailV2Row): ArticleFormState {
  return {
    title: detail.title,
    slug: detail.slug,
    summary: detail.summary ?? '',
    bodyMd: detail.body_md,
    categoryId: detail.category_id ?? '',
    visibility: detail.visibility,
    sourcePath: detail.source_path ?? '',
    sourceHash: detail.source_hash ?? '',
  };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toneForSpaceStatus(status: AdminKnowledgeSpaceRow['status']) {
  if (status === 'active') {
    return 'positive' as const;
  }

  if (status === 'archived') {
    return 'critical' as const;
  }

  return 'warning' as const;
}

function toneForArticleStatus(status: KnowledgeArticleStatus) {
  if (status === 'published') {
    return 'positive' as const;
  }

  if (status === 'review') {
    return 'warning' as const;
  }

  if (status === 'archived') {
    return 'critical' as const;
  }

  return 'default' as const;
}

function toneForVisibility(visibility: KnowledgeVisibility) {
  if (visibility === 'public') {
    return 'positive' as const;
  }

  if (visibility === 'restricted') {
    return 'critical' as const;
  }

  return 'accent' as const;
}

function categoryDisplayName(category: AdminKnowledgeCategoryV2Row) {
  return category.parent_name
    ? `${category.parent_name} / ${category.name}`
    : category.name;
}

export function KnowledgePage() {
  const { markSessionExpired } = useAuthContext();
  const didBootstrapRef = useRef(false);
  const [backendDenied, setBackendDenied] = useState(false);
  const [pagePhase, setPagePhase] = useState<PagePhase>('loading');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<AdminKnowledgeSpaceRow[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [contentPhase, setContentPhase] = useState<ContentPhase>('idle');
  const [contentMessage, setContentMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminKnowledgeCategoryV2Row[]>([]);
  const [articles, setArticles] = useState<AdminKnowledgeArticleListItemV2Row[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('idle');
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<AdminKnowledgeArticleDetailV2Row | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<ArticleVisibilityFilter>('all');
  const [articleForm, setArticleForm] = useState<ArticleFormState>(emptyArticleForm);
  const [articleFormSubmitting, setArticleFormSubmitting] = useState(false);
  const [articleFormMessage, setArticleFormMessage] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [categoryFormSubmitting, setCategoryFormSubmitting] = useState(false);
  const [categoryFormMessage, setCategoryFormMessage] = useState<string | null>(null);
  const [articleActionSubmitting, setArticleActionSubmitting] = useState(false);
  const [articleActionFeedback, setArticleActionFeedback] =
    useState<ArticleActionFeedback | null>(null);

  const selectedSpace =
    spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedArticleSummary =
    articles.find((article) => article.id === selectedArticleId) ?? null;
  const articleActionMessage =
    articleActionFeedback &&
    selectedArticleId &&
    articleActionFeedback.articleId === selectedArticleId
      ? articleActionFeedback.message
      : null;
  const rootCategoryCount = categories.filter(
    (category) => category.parent_category_id === null,
  ).length;
  const draftArticleCount = articles.filter(
    (article) => article.status === 'draft',
  ).length;
  const reviewArticleCount = articles.filter(
    (article) => article.status === 'review',
  ).length;
  const publishedArticleCount = articles.filter(
    (article) => article.status === 'published',
  ).length;

  const loadKnowledgeSpaces = useEffectEvent(
    async (preferredSpaceId?: string | null) => {
      try {
        const data = await listAdminKnowledgeSpaces();
        setSpaces(data);
        setPagePhase('ready');
        setPageMessage(null);
        setBackendDenied(false);

        const preservedSpaceId =
          preferredSpaceId ??
          (data.some((space) => space.id === selectedSpaceId)
            ? selectedSpaceId
            : null);

        setSelectedSpaceId(preservedSpaceId ?? data[0]?.id ?? null);
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Falha ao carregar a superficie de knowledge spaces.',
        );

        if (classified.kind === 'session-expired') {
          markSessionExpired();
          return;
        }

        if (classified.kind === 'permission-denied') {
          setBackendDenied(true);
          return;
        }

        setSpaces([]);
        setSelectedSpaceId(null);
        setPageMessage(classified.message);
        setPagePhase(
          classified.kind === 'contract-unavailable'
            ? 'contract-unavailable'
            : 'error',
        );
      }
    },
  );

  const loadKnowledgeContent = useEffectEvent(
    async (knowledgeSpaceId: string, preferredArticleId?: string | null) => {
      setContentPhase('loading');
      setContentMessage(null);

      try {
        const [categoriesData, articlesData] = await Promise.all([
          listAdminKnowledgeCategoriesV2(knowledgeSpaceId),
          listAdminKnowledgeArticlesV2({
            knowledgeSpaceId,
            status: statusFilter,
            visibility: visibilityFilter,
          }),
        ]);

        setCategories(categoriesData);
        setArticles(articlesData);
        setContentPhase('ready');
        setContentMessage(null);
        setBackendDenied(false);

        const preservedArticleId =
          preferredArticleId ??
          (articlesData.some((article) => article.id === selectedArticleId)
            ? selectedArticleId
            : null);

        setSelectedArticleId(preservedArticleId ?? articlesData[0]?.id ?? null);
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Falha ao carregar a camada editorial da Knowledge Base.',
        );

        if (classified.kind === 'session-expired') {
          markSessionExpired();
          return;
        }

        if (classified.kind === 'permission-denied') {
          setBackendDenied(true);
          return;
        }

        setCategories([]);
        setArticles([]);
        setSelectedArticleId(null);
        setContentMessage(classified.message);
        setContentPhase(
          classified.kind === 'contract-unavailable'
            ? 'contract-unavailable'
            : 'error',
        );
      }
    },
  );

  const loadArticleDetail = useEffectEvent(async (articleId: string) => {
    setDetailPhase('loading');
    setDetailMessage(null);

    try {
      const detail = await getAdminKnowledgeArticleDetailV2(articleId);
      setBackendDenied(false);

      if (!detail) {
        setArticleDetail(null);
        setDetailPhase('error');
        setDetailMessage(
          'O backend nao retornou detalhe para o artigo selecionado.',
        );
        return;
      }

      setArticleDetail(detail);
      setDetailPhase('ready');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao carregar o detalhe editorial do artigo.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setArticleDetail(null);
      setDetailMessage(classified.message);
      setDetailPhase(
        classified.kind === 'contract-unavailable'
          ? 'contract-unavailable'
          : 'error',
      );
    }
  });

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }

    didBootstrapRef.current = true;
    void loadKnowledgeSpaces();
  }, []);

  useEffect(() => {
    setPanelMode('detail');
    setArticleForm(emptyArticleForm());
    setCategoryForm(emptyCategoryForm());
    setArticleFormMessage(null);
    setCategoryFormMessage(null);
    setArticleActionFeedback(null);
  }, [selectedSpaceId]);

  useEffect(() => {
    if (!selectedSpaceId) {
      setCategories([]);
      setArticles([]);
      setSelectedArticleId(null);
      setContentPhase('idle');
      setContentMessage(null);
      return;
    }

    void loadKnowledgeContent(selectedSpaceId);
  }, [selectedSpaceId, statusFilter, visibilityFilter]);

  useEffect(() => {
    if (!selectedArticleId) {
      setArticleDetail(null);
      setDetailPhase('idle');
      setDetailMessage(null);
      return;
    }

    void loadArticleDetail(selectedArticleId);
  }, [selectedArticleId]);

  function openCreateArticle() {
    setPanelMode('create-article');
    setArticleForm(emptyArticleForm());
    setArticleFormMessage(null);
    setArticleActionFeedback(null);
  }

  function openCreateCategory() {
    setPanelMode('create-category');
    setCategoryForm(emptyCategoryForm());
    setCategoryFormMessage(null);
    setArticleActionFeedback(null);
  }

  function openEditArticle() {
    if (!articleDetail) {
      return;
    }

    setPanelMode('edit-article');
    setArticleForm(buildArticleForm(articleDetail));
    setArticleFormMessage(null);
    setArticleActionFeedback(null);
  }

  async function refreshSelectedSpace(preferredArticleId?: string | null) {
    if (!selectedSpaceId) {
      return;
    }

    await loadKnowledgeContent(selectedSpaceId, preferredArticleId ?? selectedArticleId);
  }

  async function refreshArticleDetail(articleId?: string | null) {
    const targetArticleId = articleId ?? selectedArticleId;
    if (!targetArticleId) {
      return;
    }

    await loadArticleDetail(targetArticleId);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSpace) {
      return;
    }

    setCategoryFormSubmitting(true);
    setCategoryFormMessage(null);

    try {
      await createKnowledgeCategoryV2({
        p_name: categoryForm.name.trim(),
        p_slug: slugify(categoryForm.slug || categoryForm.name),
        p_description: normalizeOptionalText(categoryForm.description),
        p_visibility: categoryForm.visibility,
        p_parent_category_id:
          normalizeOptionalText(categoryForm.parentCategoryId) ?? null,
        p_knowledge_space_id: selectedSpace.id,
        p_tenant_id: selectedSpace.owner_tenant_id ?? null,
      });

      await refreshSelectedSpace();
      setCategoryForm(emptyCategoryForm());
      setCategoryFormMessage('Categoria sincronizada com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao criar categoria da Knowledge Base.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setCategoryFormMessage(classified.message);
    } finally {
      setCategoryFormSubmitting(false);
    }
  }

  async function handleSaveArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSpace) {
      return;
    }

    setArticleFormSubmitting(true);
    setArticleFormMessage(null);

    try {
      let recordId: string;

      if (panelMode === 'edit-article' && articleDetail) {
        const updated = await updateKnowledgeArticleDraftV2({
          p_article_id: articleDetail.id,
          p_knowledge_space_id: selectedSpace.id,
          p_title: articleForm.title.trim(),
          p_slug: slugify(articleForm.slug || articleForm.title),
          p_summary: normalizeOptionalText(articleForm.summary),
          p_body_md: articleForm.bodyMd.trim(),
          p_category_id: normalizeOptionalText(articleForm.categoryId),
          p_visibility: articleForm.visibility,
          p_source_path: normalizeOptionalText(articleForm.sourcePath),
          p_source_hash: normalizeOptionalText(articleForm.sourceHash),
        });

        recordId = updated.id;
      } else {
        const created = await createKnowledgeArticleDraftV2({
          p_title: articleForm.title.trim(),
          p_slug: slugify(articleForm.slug || articleForm.title),
          p_summary: normalizeOptionalText(articleForm.summary),
          p_body_md: articleForm.bodyMd.trim(),
          p_category_id: normalizeOptionalText(articleForm.categoryId),
          p_visibility: articleForm.visibility,
          p_knowledge_space_id: selectedSpace.id,
          p_tenant_id: selectedSpace.owner_tenant_id ?? null,
          p_source_path: normalizeOptionalText(articleForm.sourcePath),
          p_source_hash: normalizeOptionalText(articleForm.sourceHash),
        });

        recordId = created.id;
      }

      await refreshSelectedSpace(recordId);
      await refreshArticleDetail(recordId);
      setSelectedArticleId(recordId);
      setPanelMode('detail');
      setArticleForm(emptyArticleForm());
      setArticleActionFeedback({
        articleId: recordId,
        message: 'Draft sincronizado com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao sincronizar o draft da Knowledge Base.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setArticleFormMessage(classified.message);
    } finally {
      setArticleFormSubmitting(false);
    }
  }

  async function handleSubmitForReview() {
    if (!selectedSpaceId || !selectedArticleId) {
      return;
    }

    setArticleActionSubmitting(true);
    setArticleActionFeedback(null);

    try {
      await submitKnowledgeArticleForReviewV2({
        p_article_id: selectedArticleId,
        p_knowledge_space_id: selectedSpaceId,
      });

      await refreshSelectedSpace(selectedArticleId);
      await refreshArticleDetail(selectedArticleId);
      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: 'Artigo enviado para revisao com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao enviar o artigo para revisao.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: classified.message,
      });
    } finally {
      setArticleActionSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!selectedSpaceId || !selectedArticleId) {
      return;
    }

    setArticleActionSubmitting(true);
    setArticleActionFeedback(null);

    try {
      await publishKnowledgeArticleV2({
        p_article_id: selectedArticleId,
        p_knowledge_space_id: selectedSpaceId,
      });

      await refreshSelectedSpace(selectedArticleId);
      await refreshArticleDetail(selectedArticleId);
      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: 'Artigo publicado com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao publicar o artigo da Knowledge Base.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: classified.message,
      });
    } finally {
      setArticleActionSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!selectedSpaceId || !selectedArticleId) {
      return;
    }

    setArticleActionSubmitting(true);
    setArticleActionFeedback(null);

    try {
      await archiveKnowledgeArticleV2({
        p_article_id: selectedArticleId,
        p_knowledge_space_id: selectedSpaceId,
      });

      await refreshSelectedSpace(selectedArticleId);
      await refreshArticleDetail(selectedArticleId);
      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: 'Artigo arquivado com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao arquivar o artigo da Knowledge Base.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: classified.message,
      });
    } finally {
      setArticleActionSubmitting(false);
    }
  }

  if (backendDenied) {
    return <Navigate replace state={{ reason: 'backend-permission' }} to="/access-denied" />;
  }

  if (pagePhase === 'loading') {
    return <LoadingState title="Carregando Knowledge Base" />;
  }

  if (pagePhase === 'contract-unavailable') {
    return <ContractUnavailableState contractName="vw_admin_knowledge_spaces" />;
  }

  if (pagePhase === 'error') {
    return (
      <ErrorState
        description={
          pageMessage ??
          'O Admin Console nao conseguiu materializar a leitura dos knowledge spaces.'
        }
        action={<AppButton onClick={() => void loadKnowledgeSpaces()}>Tentar novamente</AppButton>}
      />
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Knowledge"
          description="Superficie administrativa minima para curadoria editorial da Knowledge Base, ainda sem Help Center publico."
        />
        <EmptyState
          title="Nenhum knowledge space disponivel"
          description="A governanca multi-brand ainda nao expôs um knowledge space utilizavel neste ambiente."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge"
        description="Curadoria editorial space-aware da Knowledge Base. A operacao filtra por knowledge space, lista artigos, edita drafts e controla o fluxo de revisao sem abrir a Central Publica."
        action={
          <div className="flex flex-wrap gap-2">
            <GhostButton
              onClick={() => {
                void loadKnowledgeSpaces(selectedSpaceId);
                if (selectedSpaceId) {
                  void refreshSelectedSpace();
                }
              }}
            >
              Recarregar
            </GhostButton>
            <GhostButton disabled={!selectedSpace} onClick={openCreateCategory}>
              Nova categoria
            </GhostButton>
            <AppButton disabled={!selectedSpace} onClick={openCreateArticle}>
              Criar draft
            </AppButton>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Knowledge spaces"
          value={String(spaces.length)}
          helper="Leitura oficial em vw_admin_knowledge_spaces."
        />
        <MetricCard
          label="Categorias"
          value={String(categories.length)}
          helper={`${rootCategoryCount} categorias raiz no space selecionado.`}
        />
        <MetricCard
          label="Drafts"
          value={String(draftArticleCount)}
          helper="Rascunhos visiveis com os filtros atuais."
        />
        <MetricCard
          label="Review/Publicados"
          value={`${reviewArticleCount}/${publishedArticleCount}`}
          helper="Revisao humana continua obrigatoria antes da publicacao."
        />
      </div>

      <Panel
        title="Escopo editorial"
        description="A leitura desta etapa usa apenas knowledge spaces e views v2 space-aware. Nenhuma tabela-base da Knowledge Base e acessada pelo frontend."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Field label="Knowledge space">
            <SelectInput
              onChange={(event) => setSelectedSpaceId(event.target.value || null)}
              value={selectedSpaceId ?? ''}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.display_name} ({space.slug})
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Filtro por status">
            <SelectInput
              onChange={(event) =>
                setStatusFilter(event.target.value as ArticleStatusFilter)
              }
              value={statusFilter}
            >
              <option value="all">Todos</option>
              {KNOWLEDGE_ARTICLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="Filtro por visibility">
            <SelectInput
              onChange={(event) =>
                setVisibilityFilter(event.target.value as ArticleVisibilityFilter)
              }
              value={visibilityFilter}
            >
              <option value="all">Todas</option>
              {KNOWLEDGE_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="flex items-end">
            <GhostButton
              disabled={!selectedSpaceId}
              onClick={() => {
                if (selectedSpaceId) {
                  void refreshSelectedSpace();
                }
              }}
            >
              Recarregar artigos
            </GhostButton>
          </div>
        </div>

        {selectedSpace ? (
          <div className="mt-5 grid gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={toneForSpaceStatus(selectedSpace.status)}>
                  {selectedSpace.status}
                </StatusPill>
                <StatusPill tone="accent">{selectedSpace.organization_display_name}</StatusPill>
                <StatusPill>{selectedSpace.default_locale}</StatusPill>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                  {selectedSpace.display_name}
                </h2>
                <p className="text-sm text-[color:var(--color-muted)]">
                  slug {selectedSpace.slug}
                  {selectedSpace.brand_name ? ` · marca ${selectedSpace.brand_name}` : ''}
                  {selectedSpace.primary_domain_host
                    ? ` · dominio ${selectedSpace.primary_domain_host}${selectedSpace.primary_domain_path_prefix ?? ''}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <InlineNotice tone="warning">
                Esta superficie continua interna. Publicar um artigo aqui nao abre
                Help Center nem Central Publica.
              </InlineNotice>
              {selectedSpace.owner_tenant_id ? (
                <InlineNotice>
                  Compatibilidade legada ativa pelo tenant dono{' '}
                  {selectedSpace.owner_tenant_display_name ?? selectedSpace.owner_tenant_slug}.
                </InlineNotice>
              ) : (
                <InlineNotice>
                  Este knowledge space ainda opera sem `owner_tenant_id` oficial.
                </InlineNotice>
              )}
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.95fr)]">
        <Panel
          title="Artigos"
          description="Lista space-aware de artigos administrativos da Knowledge Base."
        >
          {contentPhase === 'idle' ? (
            <EmptyState
              title="Selecione um knowledge space"
              description="A lista editorial depende de um knowledge space ativo no seletor."
            />
          ) : contentPhase === 'loading' ? (
            <LoadingState
              title="Carregando artigos"
              description="O frontend esta aguardando as views v2 de artigos e categorias."
            />
          ) : contentPhase === 'contract-unavailable' ? (
            <ContractUnavailableState contractName="vw_admin_knowledge_categories_v2 / vw_admin_knowledge_articles_list_v2" />
          ) : contentPhase === 'error' ? (
            <ErrorState
              description={
                contentMessage ??
                'A camada editorial da Knowledge Base nao respondeu como esperado.'
              }
              action={
                <AppButton onClick={() => selectedSpaceId && void refreshSelectedSpace()}>
                  Tentar novamente
                </AppButton>
              }
            />
          ) : articles.length === 0 ? (
            <EmptyState
              title="Nenhum artigo encontrado"
              description="Nao existem artigos para o knowledge space e filtros selecionados."
              action={
                <AppButton onClick={openCreateArticle}>
                  Criar o primeiro draft
                </AppButton>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-[color:var(--color-border)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[color:var(--color-surface)] text-[color:var(--color-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Artigo</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Visibility</th>
                      <th className="px-4 py-3 font-medium">Categoria</th>
                      <th className="px-4 py-3 font-medium">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((article) => {
                      const isSelected = article.id === selectedArticleId;
                      return (
                        <tr
                          key={article.id}
                          className={isSelected ? 'bg-[rgba(48,127,226,0.08)]' : 'bg-white'}
                        >
                          <td className="px-4 py-3">
                            <button
                              className="flex w-full flex-col items-start gap-1 rounded-2xl text-left outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/25"
                              onClick={() => {
                                setSelectedArticleId(article.id);
                                setPanelMode('detail');
                                setArticleFormMessage(null);
                                setCategoryFormMessage(null);
                                setArticleActionFeedback(null);
                              }}
                              type="button"
                            >
                              <span className="font-medium text-[color:var(--color-ink)]">
                                {article.title}
                              </span>
                              <span className="text-xs text-[color:var(--color-muted)]">
                                {article.slug}
                                {article.source_path ? ' · importado do legado' : ''}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill tone={toneForArticleStatus(article.status)}>
                              {article.status}
                            </StatusPill>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill tone={toneForVisibility(article.visibility)}>
                              {article.visibility}
                            </StatusPill>
                          </td>
                          <td className="px-4 py-3 text-[color:var(--color-muted)]">
                            {article.category_name ?? 'Sem categoria'}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--color-muted)]">
                            {formatDateTime(article.updated_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title={
            panelMode === 'create-category'
              ? 'Nova categoria'
              : panelMode === 'create-article'
                ? 'Criar draft'
                : panelMode === 'edit-article'
                  ? 'Editar draft'
                  : 'Detalhe do artigo'
          }
          description={
            panelMode === 'create-category'
              ? 'Criacao minima de categoria pela RPC v2 space-aware.'
              : panelMode === 'create-article'
                ? 'Novo draft editorial pela RPC v2 space-aware.'
                : panelMode === 'edit-article'
                  ? 'Edicao de artigo ainda em draft/review sem tocar tabelas-base.'
                  : 'Leitura detalhada do artigo apenas pela view v2 de detalhe.'
          }
        >
          {panelMode === 'create-category' ? (
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <Field label="Nome da categoria">
                <TextInput
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug:
                        current.slug === '' ||
                        current.slug === slugify(current.name)
                          ? slugify(event.target.value)
                          : current.slug,
                    }))
                  }
                  placeholder="Politicas de devolucao"
                  required
                  value={categoryForm.name}
                />
              </Field>

              <Field label="Slug">
                <TextInput
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  placeholder="politicas-de-devolucao"
                  required
                  value={categoryForm.slug}
                />
              </Field>

              <Field label="Categoria pai">
                <SelectInput
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      parentCategoryId: event.target.value,
                    }))
                  }
                  value={categoryForm.parentCategoryId}
                >
                  <option value="">Sem categoria pai</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {categoryDisplayName(category)}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Visibility">
                <SelectInput
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      visibility: event.target.value as KnowledgeVisibility,
                    }))
                  }
                  value={categoryForm.visibility}
                >
                  {KNOWLEDGE_VISIBILITIES.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Descricao">
                <TextareaInput
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Orienta a curadoria editorial deste grupo."
                  value={categoryForm.description}
                />
              </Field>

              {categoryFormMessage ? (
                <InlineNotice
                  tone={
                    categoryFormMessage.includes('sucesso') ? 'warning' : 'critical'
                  }
                >
                  {categoryFormMessage}
                </InlineNotice>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <AppButton disabled={categoryFormSubmitting} type="submit">
                  {categoryFormSubmitting ? 'Sincronizando...' : 'Criar categoria'}
                </AppButton>
                <GhostButton
                  disabled={categoryFormSubmitting}
                  onClick={() => {
                    setPanelMode('detail');
                    setCategoryForm(emptyCategoryForm());
                    setCategoryFormMessage(null);
                  }}
                >
                  Fechar
                </GhostButton>
              </div>
            </form>
          ) : panelMode === 'create-article' || panelMode === 'edit-article' ? (
            <form className="space-y-4" onSubmit={handleSaveArticle}>
              <Field label="Titulo">
                <TextInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      title: event.target.value,
                      slug:
                        current.slug === '' ||
                        current.slug === slugify(current.title)
                          ? slugify(event.target.value)
                          : current.slug,
                    }))
                  }
                  placeholder="Como tratar devolucao com reembolso parcial"
                  required
                  value={articleForm.title}
                />
              </Field>

              <Field label="Slug">
                <TextInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  placeholder="como-tratar-devolucao-com-reembolso-parcial"
                  required
                  value={articleForm.slug}
                />
              </Field>

              <Field label="Resumo">
                <TextareaInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Resumo curto para orientar a curadoria e a futura experiencia publica."
                  value={articleForm.summary}
                />
              </Field>

              <Field label="Categoria">
                <SelectInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  value={articleForm.categoryId}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {categoryDisplayName(category)}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Visibility">
                <SelectInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      visibility: event.target.value as KnowledgeVisibility,
                    }))
                  }
                  value={articleForm.visibility}
                >
                  {KNOWLEDGE_VISIBILITIES.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field label="Body (Markdown/texto limpo)">
                <TextareaInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      bodyMd: event.target.value,
                    }))
                  }
                  placeholder="Escreva ou revise o corpo principal sem depender de HTML legado."
                  required
                  value={articleForm.bodyMd}
                />
              </Field>

              <Field
                label="Source path"
                description="Opcional para curadoria manual. O import legado continua preenchendo isso automaticamente."
              >
                <TextInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      sourcePath: event.target.value,
                    }))
                  }
                  placeholder="raw_knowledge/octadesk_export/latest/articles/..."
                  value={articleForm.sourcePath}
                />
              </Field>

              <Field label="Source hash">
                <TextInput
                  onChange={(event) =>
                    setArticleForm((current) => ({
                      ...current,
                      sourceHash: event.target.value,
                    }))
                  }
                  placeholder="sha256..."
                  value={articleForm.sourceHash}
                />
              </Field>

              {articleForm.sourcePath || articleForm.sourceHash ? (
                <InlineNotice tone="warning">
                  Conteudo com trilha legada nao sera publicado automaticamente.
                  A curadoria humana continua obrigatoria.
                </InlineNotice>
              ) : null}

              {articleFormMessage ? (
                <InlineNotice tone="critical">{articleFormMessage}</InlineNotice>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <AppButton disabled={articleFormSubmitting} type="submit">
                  {articleFormSubmitting
                    ? 'Sincronizando...'
                    : panelMode === 'edit-article'
                      ? 'Salvar draft'
                      : 'Criar draft'}
                </AppButton>
                <GhostButton
                  disabled={articleFormSubmitting}
                  onClick={() => {
                    setPanelMode('detail');
                    setArticleForm(emptyArticleForm());
                    setArticleFormMessage(null);
                  }}
                >
                  Cancelar
                </GhostButton>
              </div>
            </form>
          ) : detailPhase === 'idle' ? (
            <EmptyState
              title="Selecione um artigo"
              description="O detalhe editorial so abre quando existe um artigo selecionado na lista."
              action={
                <AppButton onClick={openCreateArticle}>
                  Criar novo draft
                </AppButton>
              }
            />
          ) : detailPhase === 'loading' ? (
            <LoadingState
              title="Carregando detalhe do artigo"
              description="O frontend esta aguardando vw_admin_knowledge_article_detail_v2."
            />
          ) : detailPhase === 'contract-unavailable' ? (
            <ContractUnavailableState contractName="vw_admin_knowledge_article_detail_v2" />
          ) : detailPhase === 'error' || !articleDetail || !selectedArticleSummary ? (
            <ErrorState
              description={
                detailMessage ??
                'O detalhe do artigo nao ficou disponivel nesta superficie.'
              }
              action={
                <AppButton
                  onClick={() =>
                    selectedArticleId && void refreshArticleDetail(selectedArticleId)
                  }
                >
                  Tentar novamente
                </AppButton>
              }
            />
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={toneForArticleStatus(articleDetail.status)}>
                    {articleDetail.status}
                  </StatusPill>
                  <StatusPill tone={toneForVisibility(articleDetail.visibility)}>
                    {articleDetail.visibility}
                  </StatusPill>
                  {articleDetail.category_name ? (
                    <StatusPill>{articleDetail.category_name}</StatusPill>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                    {articleDetail.title}
                  </h2>
                  <p className="text-sm text-[color:var(--color-muted)]">
                    {articleDetail.slug}
                    {articleDetail.summary ? ` · ${articleDetail.summary}` : ''}
                  </p>
                </div>
              </div>

              {articleDetail.source_path || articleDetail.source_hash ? (
                <InlineNotice tone="warning">
                  Conteudo importado do legado detectado. O artigo permanece sob
                  curadoria humana antes de qualquer publicacao editorial.
                </InlineNotice>
              ) : null}

              {articleActionMessage ? (
                <InlineNotice
                  tone={
                    articleActionMessage.includes('sucesso')
                      ? 'warning'
                      : 'critical'
                  }
                >
                  {articleActionMessage}
                </InlineNotice>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {(articleDetail.status === 'draft' || articleDetail.status === 'review') ? (
                  <GhostButton
                    disabled={articleActionSubmitting}
                    onClick={openEditArticle}
                  >
                    Editar draft
                  </GhostButton>
                ) : null}

                {articleDetail.status === 'draft' ? (
                  <AppButton
                    disabled={articleActionSubmitting}
                    onClick={() => void handleSubmitForReview()}
                  >
                    {articleActionSubmitting ? 'Enviando...' : 'Enviar para revisao'}
                  </AppButton>
                ) : null}

                {articleDetail.status === 'review' ? (
                  <AppButton
                    disabled={articleActionSubmitting}
                    onClick={() => void handlePublish()}
                  >
                    {articleActionSubmitting ? 'Publicando...' : 'Publicar'}
                  </AppButton>
                ) : null}

                {articleDetail.status !== 'archived' ? (
                  <GhostButton
                    disabled={articleActionSubmitting}
                    onClick={() => void handleArchive()}
                  >
                    {articleActionSubmitting ? 'Arquivando...' : 'Arquivar'}
                  </GhostButton>
                ) : null}
              </div>

                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 text-sm leading-6 text-[color:var(--color-muted)]">
                <p>Knowledge space: {articleDetail.knowledge_space_display_name}</p>
                <p>Organization: {articleDetail.organization_display_name}</p>
                <p>Revisoes: {articleDetail.revisions.length}</p>
                <p>Revision atual: {articleDetail.current_revision_number}</p>
                <p>Criado: {formatDateTime(articleDetail.created_at)}</p>
                <p>Atualizado: {formatDateTime(articleDetail.updated_at)}</p>
                {articleDetail.submitted_for_review_at ? (
                  <p>
                    Enviado para revisao:{' '}
                    {formatDateTime(articleDetail.submitted_for_review_at)}
                  </p>
                ) : null}
                {articleDetail.published_at ? (
                  <p>Publicado: {formatDateTime(articleDetail.published_at)}</p>
                ) : null}
                {articleDetail.archived_at ? (
                  <p>Arquivado: {formatDateTime(articleDetail.archived_at)}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
                  Corpo principal
                </h3>
                <div className="rounded-[24px] border border-[color:var(--color-border)] bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-ink)]">
                    {articleDetail.body_md || 'Sem body_md cadastrado.'}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
                  Trilha de origem
                </h3>
                {articleDetail.sources.length === 0 ? (
                  <EmptyState
                    title="Sem fontes rastreadas"
                    description="Este artigo ainda nao possui trilha de fonte agregada no detalhe."
                  />
                ) : (
                  <div className="space-y-3">
                    {articleDetail.sources.slice(0, 4).map((source) => (
                      <div
                        key={source.id}
                        className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                      >
                        <p className="font-medium text-[color:var(--color-ink)]">
                          {source.source_title ?? source.source_kind}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                          {source.source_path}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                          hash {source.source_hash}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[color:var(--color-ink)]">
                  Revisoes recentes
                </h3>
                {articleDetail.revisions.length === 0 ? (
                  <EmptyState
                    title="Sem revisoes agregadas"
                    description="O backend nao retornou historico de revisoes para este artigo."
                  />
                ) : (
                  <div className="space-y-3">
                    {articleDetail.revisions.slice(0, 4).map((revision) => (
                      <div
                        key={revision.id}
                        className="rounded-[22px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={toneForArticleStatus(revision.status_snapshot)}>
                            {revision.status_snapshot}
                          </StatusPill>
                          <StatusPill tone={toneForVisibility(revision.visibility)}>
                            {revision.visibility}
                          </StatusPill>
                          <StatusPill>rev {revision.revision_number}</StatusPill>
                        </div>
                        <p className="mt-3 text-sm font-medium text-[color:var(--color-ink)]">
                          {revision.title}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                          {revision.change_note ?? 'Sem anotacao de mudanca'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
