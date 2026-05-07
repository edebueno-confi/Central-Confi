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
  cx,
  Field,
  GhostButton,
  InlineNotice,
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
  beginKnowledgeArticleEditorialRevisionV2,
  createKnowledgeArticleDraftV2,
  discardKnowledgeArticleEditorialRevisionV2,
  createKnowledgeCategoryV2,
  getAdminKnowledgeArticleDetailV2,
  listAdminKnowledgeArticleReviewAdvisories,
  listAdminKnowledgeArticlesV2,
  listAdminKnowledgeCategoriesV2,
  listAdminKnowledgeSpaces,
  markKnowledgeArticleReviewed,
  publishKnowledgeArticleV2,
  publishKnowledgeArticleEditorialRevisionV2,
  submitKnowledgeArticleForReviewV2,
  updateKnowledgeArticleReviewStatus,
  updateKnowledgeArticleDraftV2,
  updateKnowledgeArticleEditorialRevisionV2,
  type AdminKnowledgeArticleReviewAdvisoryRow,
  type AdminKnowledgeArticleDetailV2Row,
  type AdminKnowledgeArticleEditorialDraftRow,
  type AdminKnowledgeArticleListItemV2Row,
  type AdminKnowledgeCategoryV2Row,
  type AdminKnowledgeSpaceRow,
  type KnowledgeAdvisoryClassification,
  type KnowledgeArticleStatus,
  type KnowledgeArticleReviewStatus,
  type KnowledgeReviewHumanConfirmations,
  type KnowledgeVisibility,
} from '../admin/admin-api';
import { classifyAdminError } from '../admin/admin-errors';
import {
  KNOWLEDGE_ARTICLE_REVIEW_STATUSES,
  KNOWLEDGE_VISIBILITIES,
} from '../../contracts/admin-contracts';
import { useAuthContext } from '../auth/auth-context';

type PagePhase = 'loading' | 'ready' | 'contract-unavailable' | 'error';
type ContentPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type DetailPhase = 'idle' | 'loading' | 'ready' | 'contract-unavailable' | 'error';
type PanelMode = 'detail' | 'create-article' | 'edit-article' | 'create-category';
type ArticleStatusFilter = KnowledgeArticleStatus | 'all';
type ArticleVisibilityFilter = KnowledgeVisibility | 'all';
type ArticleOriginFilter = 'all' | 'legacy' | 'manual';
type ArticleDuplicateFilter = 'all' | 'duplicates' | 'unique';
type ArticleClassificationFilter = KnowledgeAdvisoryClassification | 'all' | 'without-advisory';
type EditorialChecklistTone = 'default' | 'positive' | 'warning' | 'critical' | 'accent';
type KnowledgeListSort = 'recent' | 'oldest' | 'title';
type KnowledgeDateFilter = 'all' | '90' | '30' | '7';
type DetailTab = 'preview' | 'review' | 'classification' | 'checklist' | 'advanced';

interface EditorialChecklistItem {
  label: string;
  tone: EditorialChecklistTone;
  description: string;
}

interface HumanConfirmationDefinition {
  key: keyof KnowledgeReviewHumanConfirmations;
  label: string;
  help: string;
}

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

const HUMAN_CONFIRMATION_FIELDS: HumanConfirmationDefinition[] = [
  {
    key: 'title_reviewed',
    label: 'Título revisado',
    help: 'Confirma que o título editorial foi validado por um revisor humano.',
  },
  {
    key: 'summary_reviewed',
    label: 'Resumo revisado',
    help: 'Confirma que o resumo já está claro para suporte e cliente B2B.',
  },
  {
    key: 'body_reviewed',
    label: 'Conteudo em Markdown revisado',
    help: 'Confirma que o corpo principal foi revisado em Markdown seguro.',
  },
  {
    key: 'category_reviewed',
    label: 'Categoria correta',
    help: 'Confirma que a categoria atual representa bem o artigo.',
  },
  {
    key: 'visibility_reviewed',
    label: 'Visibilidade correta',
    help: 'Confirma que a visibilidade do artigo foi validada manualmente.',
  },
  {
    key: 'no_sensitive_data_exposed',
    label: 'Nenhum dado sensível exposto',
    help: 'Confirma revisão humana de credenciais, integrações e dados internos.',
  },
  {
    key: 'ready_for_review',
    label: 'Pronto para revisão',
    help: 'Confirma que o artigo pode sair de rascunho e entrar em revisão editorial.',
  },
  {
    key: 'ready_for_publish',
    label: 'Pronto para publicação',
    help: 'Confirma que o artigo já está pronto para publicação humana quando o status permitir.',
  },
];

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

function emptyHumanConfirmations(): KnowledgeReviewHumanConfirmations {
  return {};
}

function normalizeHumanConfirmations(
  value: unknown,
): KnowledgeReviewHumanConfirmations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyHumanConfirmations();
  }

  const record = value as Record<string, unknown>;
  const result: KnowledgeReviewHumanConfirmations = {};

  for (const field of HUMAN_CONFIRMATION_FIELDS) {
    if (typeof record[field.key] === 'boolean') {
      result[field.key] = record[field.key] as boolean;
    }
  }

  return result;
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

function buildArticleFormFromEditorialDraft(
  draft: AdminKnowledgeArticleEditorialDraftRow,
): ArticleFormState {
  return {
    title: draft.title,
    slug: draft.slug,
    summary: draft.summary ?? '',
    bodyMd: draft.body_md,
    categoryId: draft.category_id ?? '',
    visibility: draft.visibility,
    sourcePath: draft.source_path ?? '',
    sourceHash: draft.source_hash ?? '',
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

function toneForReviewStatus(status: KnowledgeArticleReviewStatus) {
  if (status === 'reviewed') {
    return 'positive' as const;
  }

  if (status === 'ready_for_publish' || status === 'ready_for_review') {
    return 'accent' as const;
  }

  if (status === 'needs_changes') {
    return 'critical' as const;
  }

  if (status === 'in_review') {
    return 'warning' as const;
  }

  return 'default' as const;
}

function toneForAdvisoryClassification(
  classification: KnowledgeAdvisoryClassification,
) {
  if (classification === 'public') {
    return 'positive' as const;
  }

  if (classification === 'internal') {
    return 'accent' as const;
  }

  if (classification === 'obsolete' || classification === 'duplicate') {
    return 'warning' as const;
  }

  return 'critical' as const;
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

function compactStatusBadgeClass(
  tone: 'default' | 'positive' | 'warning' | 'critical' | 'accent',
) {
  if (tone === 'positive') {
    return 'border-[color:var(--color-success-border)] bg-[color:var(--color-success-surface)] text-[color:var(--color-success-ink)]';
  }

  if (tone === 'warning') {
    return 'border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-surface)] text-[color:var(--color-warning-ink)]';
  }

  if (tone === 'critical') {
    return 'border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-surface)] text-[color:var(--color-danger-ink)]';
  }

  if (tone === 'accent') {
    return 'border-[rgba(225,0,152,0.18)] bg-[rgba(225,0,152,0.1)] text-[color:var(--color-brand-magenta)]';
  }

  return 'border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)]';
}

function compactStatusBadgeLabel(status: KnowledgeArticleStatus) {
  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'review') {
    return 'Em revisão';
  }

  if (status === 'archived') {
    return 'Arquivado';
  }

  return 'Rascunho';
}

function displayArticleStatus(status: KnowledgeArticleStatus) {
  if (status === 'published') {
    return 'Publicado';
  }

  if (status === 'review') {
    return 'Em revisão';
  }

  if (status === 'archived') {
    return 'Arquivado';
  }

  return 'Rascunho';
}

function displayVisibility(visibility: KnowledgeVisibility) {
  if (visibility === 'public') {
    return 'Público na central de ajuda';
  }

  if (visibility === 'restricted') {
    return 'Restrito';
  }

  return 'Interno';
}

function articleContributorName(article: AdminKnowledgeArticleListItemV2Row) {
  return (
    article.updated_by_full_name ??
    article.created_by_full_name ??
    'Indisponível'
  );
}

function articleContributorNameFromDetail(article: AdminKnowledgeArticleDetailV2Row) {
  return (
    article.updated_by_full_name ??
    article.created_by_full_name ??
    'Indisponível'
  );
}

function formatOptionalDate(value: string | null) {
  return value ? formatDateTime(value) : 'Indisponível';
}

function categoryDisplayName(category: AdminKnowledgeCategoryV2Row) {
  return category.parent_name
    ? `${category.parent_name} / ${category.name}`
    : category.name;
}

function noticeTone(message: string) {
  return /sucesso|concluida/i.test(message) ? 'positive' : 'critical';
}

function categoryBadgeClass(name: string | null | undefined) {
  const normalized = (name ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  if (normalized.includes('integr')) {
    return 'border-[rgba(216,70,153,0.24)] bg-[rgba(225,0,152,0.09)] text-[color:var(--color-brand-magenta)]';
  }

  if (normalized.includes('operac') || normalized.includes('reversa')) {
    return 'border-[rgba(237,173,64,0.26)] bg-[rgba(255,239,204,0.88)] text-[color:var(--color-warning-ink)]';
  }

  if (normalized.includes('primeir')) {
    return 'border-[rgba(182,154,255,0.28)] bg-[rgba(237,230,255,0.9)] text-[rgb(113,78,204)]';
  }

  if (normalized.includes('verifica')) {
    return 'border-[rgba(92,184,194,0.28)] bg-[rgba(224,248,250,0.9)] text-[rgb(30,126,136)]';
  }

  return 'border-[rgba(72,133,237,0.22)] bg-[rgba(232,242,255,0.92)] text-[rgb(35,92,176)]';
}

function compactCategoryLabel(name: string | null | undefined) {
  const normalized = (name ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  if (normalized.includes('operacao') || normalized.includes('reversa')) {
    return 'Operação';
  }

  if (normalized.includes('suporte tecnico')) {
    return 'Suporte técnico';
  }

  if (normalized.includes('primeiros')) {
    return 'Primeiros passos';
  }

  if (normalized.includes('verificacao')) {
    return 'Verificação';
  }

  return name ?? 'Indisponível';
}

function displayFilterCategoryLabel(name: string | null | undefined) {
  const normalized = (name ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  if (normalized.includes('space aware') || normalized.includes('verificacao')) {
    return 'Verificação';
  }

  return name ?? 'Indisponível';
}

function estimateReadingTime(body: string | null | undefined) {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;

  if (words === 0) {
    return 'Indisponível';
  }

  return `${Math.max(1, Math.ceil(words / 180))} min de leitura`;
}

function buildSourceHashCounts(articles: AdminKnowledgeArticleListItemV2Row[]) {
  const counts = new Map<string, number>();

  for (const article of articles) {
    if (!article.source_hash) {
      continue;
    }

    counts.set(article.source_hash, (counts.get(article.source_hash) ?? 0) + 1);
  }

  return counts;
}

function containsLegacyHtml(value: string) {
  return /<[^>]+>/.test(value);
}

function normalizeRiskFlags(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function buildPersistedHumanChecklist(
  confirmations: KnowledgeReviewHumanConfirmations,
): EditorialChecklistItem[] {
  return HUMAN_CONFIRMATION_FIELDS.map((field) => {
    const checked = confirmations[field.key] === true;

    return {
      label: field.label,
      tone: checked ? 'positive' : 'warning',
      description: checked
        ? 'Confirmacao humana persistida para este item.'
        : field.help,
    } satisfies EditorialChecklistItem;
  });
}

function buildEditorialChecklist(
  article: AdminKnowledgeArticleDetailV2Row,
  duplicateCount: number,
) {
  const titleReady = article.title.trim().length >= 8;
  const summaryLength = article.summary?.trim().length ?? 0;
  const summaryReady = summaryLength >= 24;
  const bodyLength = article.body_md.trim().length;
  const bodyHasLegacyHtml = containsLegacyHtml(article.body_md);
  const bodyReady = bodyLength >= 80 && !bodyHasLegacyHtml;
  const categoryReady = Boolean(article.category_id);
  const automatedReady = titleReady && summaryReady && bodyReady && categoryReady;

  const automated: EditorialChecklistItem[] = [
    {
      label: 'Título revisado',
      tone: titleReady ? 'positive' : 'critical',
      description: titleReady
        ? 'Título com comprimento suficiente para revisão editorial.'
        : 'Título ainda curto ou vazio para uma triagem segura.',
    },
    {
      label: 'Resumo revisado',
      tone: summaryReady ? 'positive' : 'warning',
      description: summaryReady
        ? 'Resumo presente e com densidade mínima para orientar a leitura.'
        : 'Resumo ausente ou curto; vale revisar antes de promover o artigo.',
    },
    {
      label: 'Markdown revisado',
      tone: bodyReady ? 'positive' : bodyHasLegacyHtml ? 'critical' : 'warning',
      description: bodyReady
        ? 'Corpo principal em Markdown e sem sinal de HTML legado.'
        : bodyHasLegacyHtml
          ? 'Corpo ainda contém marca de HTML legado; revise antes de avançar.'
          : 'Corpo principal ainda curto para uma leitura editorial segura.',
    },
    {
      label: 'Categoria correta',
      tone: categoryReady ? 'positive' : 'critical',
      description: categoryReady
        ? 'Artigo já está vinculado a uma categoria editorial.'
        : 'Categoria ainda não definida; classifique antes da revisão.',
    },
  ];

  const manual: EditorialChecklistItem[] = [
    {
      label: 'Visibilidade correta',
      tone:
        article.visibility === 'restricted'
          ? 'critical'
          : article.visibility === 'internal'
            ? 'warning'
            : 'accent',
      description:
        article.visibility === 'restricted'
          ? 'Conteúdo restrito exige leitura cautelosa antes de qualquer promoção.'
          : article.visibility === 'internal'
        ? 'Confirmar se o artigo deve permanecer interno ou evoluir para público.'
            : 'Confirmar se o recorte público está coerente com o risco real do artigo.',
    },
    {
      label: 'Nenhum segredo ou API sensivel exposto',
      tone: 'warning',
      description:
        'Confirmação humana obrigatória para garantir que nenhum dado sensível apareça no artigo.',
    },
    {
      label: 'Pronto para review',
      tone:
        automatedReady && article.status === 'draft'
          ? 'positive'
          : article.status === 'draft'
            ? 'warning'
            : 'default',
      description:
        automatedReady && article.status === 'draft'
          ? 'Sinais objetivos mínimos completos para envio à revisão humana.'
          : article.status === 'draft'
            ? 'Ainda faltam ajustes objetivos antes do envio para revisão.'
            : 'O artigo já saiu de rascunho; confirme o contexto editorial antes de repetir a ação.',
    },
    {
      label: 'Pronto para publish',
      tone:
        automatedReady && article.status === 'review'
          ? 'positive'
          : article.status === 'review'
            ? 'warning'
            : 'default',
      description:
        automatedReady && article.status === 'review'
          ? 'Sinais objetivos completos; falta apenas a aprovação humana final.'
          : article.status === 'review'
            ? 'O artigo esta em review, mas ainda precisa de ajuste antes de publish.'
            : 'A publicação continua bloqueada até o artigo chegar à revisão com revisão humana concluída.',
    },
  ];

  if (duplicateCount > 1) {
    manual.unshift({
      label: 'Possivel duplicidade de origem',
      tone: 'warning',
      description: `Existe mais ${duplicateCount - 1} artigo nesta central com a mesma origem rastreada. Consolidar antes de promover.`,
    });
  }

  return {
    automated,
    manual,
    automatedReady,
    backlogClassificationAvailable: false,
  };
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
  const [advisoryMessage, setAdvisoryMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<AdminKnowledgeCategoryV2Row[]>([]);
  const [articles, setArticles] = useState<AdminKnowledgeArticleListItemV2Row[]>([]);
  const [advisories, setAdvisories] = useState<AdminKnowledgeArticleReviewAdvisoryRow[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<ArticleStatusFilter>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  const [selectedDateWindow, setSelectedDateWindow] =
    useState<KnowledgeDateFilter>('90');
  const [listSort, setListSort] = useState<KnowledgeListSort>('recent');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>('idle');
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [articleDetail, setArticleDetail] = useState<AdminKnowledgeArticleDetailV2Row | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [detailTab, setDetailTab] = useState<DetailTab>('preview');
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<ArticleVisibilityFilter>('all');
  const [originFilter, setOriginFilter] = useState<ArticleOriginFilter>('all');
  const [duplicateFilter, setDuplicateFilter] = useState<ArticleDuplicateFilter>('all');
  const [classificationFilter, setClassificationFilter] =
    useState<ArticleClassificationFilter>('all');
  const [articleForm, setArticleForm] = useState<ArticleFormState>(emptyArticleForm);
  const [articleFormSubmitting, setArticleFormSubmitting] = useState(false);
  const [articleFormMessage, setArticleFormMessage] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [categoryFormSubmitting, setCategoryFormSubmitting] = useState(false);
  const [categoryFormMessage, setCategoryFormMessage] = useState<string | null>(null);
  const [articleActionSubmitting, setArticleActionSubmitting] = useState(false);
  const [articleActionFeedback, setArticleActionFeedback] =
    useState<ArticleActionFeedback | null>(null);
  const [reviewStatusDraft, setReviewStatusDraft] =
    useState<KnowledgeArticleReviewStatus>('pending');
  const [reviewNotesDraft, setReviewNotesDraft] = useState('');
  const [humanConfirmationsDraft, setHumanConfirmationsDraft] =
    useState<KnowledgeReviewHumanConfirmations>(emptyHumanConfirmations);
  const [reviewAdvisorySubmitting, setReviewAdvisorySubmitting] = useState(false);
  const [reviewAdvisoryMessage, setReviewAdvisoryMessage] = useState<string | null>(null);

  const selectedSpace =
    spaces.find((space) => space.id === selectedSpaceId) ?? null;
  const selectedArticleSummary =
    articles.find((article) => article.id === selectedArticleId) ?? null;
  const articleCategoryMap = new Map(categories.map((category) => [category.id, category]));
  const advisoryMap = new Map(advisories.map((advisory) => [advisory.article_id, advisory]));
  const selectedAdvisory =
    selectedArticleId ? advisoryMap.get(selectedArticleId) ?? null : null;
  const sourceHashCounts = buildSourceHashCounts(articles);
  const filteredArticles = articles.filter((article) => {
    const articleAdvisory = advisoryMap.get(article.id);

    if (originFilter === 'legacy') {
      if (!article.source_path && !article.source_hash) {
        return false;
      }
    }

    if (originFilter === 'manual') {
      if (article.source_path || article.source_hash) {
        return false;
      }
    }

    if (classificationFilter === 'without-advisory') {
      if (articleAdvisory) {
        return false;
      }
    } else if (classificationFilter !== 'all') {
      if (articleAdvisory?.suggested_classification !== classificationFilter) {
        return false;
      }
    }

    const duplicateCount =
      articleAdvisory?.duplicate_group_article_count ??
      (article.source_hash ? sourceHashCounts.get(article.source_hash) ?? 0 : 0);

    if (duplicateFilter === 'duplicates' && duplicateCount <= 1) {
      return false;
    }

    if (duplicateFilter === 'unique' && duplicateCount > 1) {
      return false;
    }

    return true;
  });
  const articleActionMessage =
    articleActionFeedback &&
    selectedArticleId &&
    articleActionFeedback.articleId === selectedArticleId
      ? articleActionFeedback.message
      : null;
  const selectedArticleDuplicateCount =
    selectedAdvisory?.duplicate_group_article_count ??
    (articleDetail?.source_hash
      ? sourceHashCounts.get(articleDetail.source_hash) ?? 0
      : 0);
  const selectedArticleCategory =
    articleDetail?.category_id
      ? articleCategoryMap.get(articleDetail.category_id) ?? null
      : null;
  const editorialDraftCategory =
    articleDetail?.editorial_draft?.category_id
      ? articleCategoryMap.get(articleDetail.editorial_draft.category_id) ?? null
      : null;
  const articleFormCategory =
    articleForm.categoryId
      ? articleCategoryMap.get(articleForm.categoryId) ?? null
      : null;
  const publishedEditorialDraft = articleDetail?.editorial_draft ?? null;
  const articleHasPublicCategoryMismatch =
    articleDetail?.visibility === 'public' &&
    articleDetail.category_id !== null &&
    selectedArticleCategory?.visibility !== 'public';
  const editorialDraftHasPublicCategoryMismatch =
    publishedEditorialDraft?.visibility === 'public' &&
    publishedEditorialDraft.category_id !== null &&
    editorialDraftCategory?.visibility !== 'public';
  const articleFormHasPublicCategoryMismatch =
    articleForm.visibility === 'public' &&
    articleForm.categoryId !== '' &&
    articleFormCategory?.visibility !== 'public';
  const publicPreviewHref =
    articleDetail && !articleHasPublicCategoryMismatch
      ? articleDetail.public_article_path
      : null;
  const publicPreviewMessage =
    articleHasPublicCategoryMismatch
      ? 'Indisponível enquanto a categoria do artigo não estiver pública.'
      : articleDetail?.visibility !== 'public'
        ? 'Indisponível enquanto o artigo permanecer interno.'
        : articleDetail?.status !== 'published'
          ? 'Indisponível enquanto o artigo não estiver publicado.'
          : 'Indisponível neste ambiente.';
  const editorialPreviewTitle =
    articleDetail?.status === 'published' && publishedEditorialDraft
      ? 'Preview da revisão'
      : 'Preview editorial';
  const editorialPreviewBody =
    articleDetail?.status === 'published' && publishedEditorialDraft
      ? publishedEditorialDraft.body_md
      : articleDetail?.body_md ?? '';
  const editorialChecklist = articleDetail
    ? buildEditorialChecklist(articleDetail, selectedArticleDuplicateCount)
    : null;
  const canSubmitForReview =
    articleDetail?.status === 'draft' &&
    (editorialChecklist?.automatedReady ?? false);
  const canPublishArticle =
    articleDetail?.status === 'review' &&
    !advisoryMessage &&
    (!selectedAdvisory || selectedAdvisory.review_status === 'reviewed') &&
    !articleHasPublicCategoryMismatch;
  const canPublishEditorialRevision =
    articleDetail?.status === 'published' &&
    !!publishedEditorialDraft &&
    publishedEditorialDraft.title.trim().length > 0 &&
    publishedEditorialDraft.body_md.trim().length > 0 &&
    publishedEditorialDraft.category_id !== null &&
    !editorialDraftHasPublicCategoryMismatch;
  const persistedHumanChecklist = buildPersistedHumanChecklist(humanConfirmationsDraft);
  const advisoryRiskFlags = normalizeRiskFlags(selectedAdvisory?.risk_flags);
  const statusCounts = {
    all: filteredArticles.length,
    published: filteredArticles.filter((article) => article.status === 'published').length,
    draft: filteredArticles.filter((article) => article.status === 'draft').length,
    review: filteredArticles.filter((article) => article.status === 'review').length,
    archived: filteredArticles.filter((article) => article.status === 'archived').length,
  };
  const sortedCategories = [...categories].sort((left, right) => {
    if (right.article_count !== left.article_count) {
      return right.article_count - left.article_count;
    }

    return left.name.localeCompare(right.name, 'pt-BR');
  });
  const visibleCategories = showAllCategories
    ? sortedCategories
    : sortedCategories.slice(0, 5);
  const availableAuthors = Array.from(
    new Set(filteredArticles.map((article) => articleContributorName(article))),
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  const searchedArticles = filteredArticles.filter((article) => {
    if (listStatusFilter !== 'all' && article.status !== listStatusFilter) {
      return false;
    }

    if (selectedCategoryId !== 'all' && article.category_id !== selectedCategoryId) {
      return false;
    }

    if (
      selectedAuthor !== 'all' &&
      articleContributorName(article) !== selectedAuthor
    ) {
      return false;
    }

    if (selectedDateWindow !== 'all') {
      const days = Number(selectedDateWindow);
      const updatedAtMs = Date.parse(article.updated_at);

      if (Number.isFinite(updatedAtMs)) {
        const ageInDays = (Date.now() - updatedAtMs) / (1000 * 60 * 60 * 24);

        if (ageInDays > days) {
          return false;
        }
      }
    }

    if (!searchQuery.trim()) {
      return true;
    }

    const haystack = [
      article.title,
      article.summary ?? '',
      article.category_name ?? '',
      articleContributorName(article),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchQuery.trim().toLowerCase());
  });
  const displayArticles = [...searchedArticles].sort((left, right) => {
    if (listSort === 'title') {
      return left.title.localeCompare(right.title, 'pt-BR');
    }

    const leftTime = Date.parse(left.updated_at);
    const rightTime = Date.parse(right.updated_at);

    if (listSort === 'oldest') {
      return leftTime - rightTime;
    }

    return rightTime - leftTime;
  });

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
        'Falha ao carregar a superfície das centrais editoriais.',
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
      setAdvisoryMessage(null);

      try {
        const [categoriesResult, articlesResult, advisoriesResult] = await Promise.allSettled([
          listAdminKnowledgeCategoriesV2(knowledgeSpaceId),
          listAdminKnowledgeArticlesV2({
            knowledgeSpaceId,
            status: statusFilter,
            visibility: visibilityFilter,
          }),
          listAdminKnowledgeArticleReviewAdvisories(knowledgeSpaceId),
        ]);

        if (categoriesResult.status === 'rejected') {
          throw categoriesResult.reason;
        }

        if (articlesResult.status === 'rejected') {
          throw articlesResult.reason;
        }

        const categoriesData = categoriesResult.value;
        const articlesData = articlesResult.value;

        setCategories(categoriesData);
        setArticles(articlesData);
        setContentPhase('ready');
        setContentMessage(null);
        setBackendDenied(false);

        if (advisoriesResult.status === 'fulfilled') {
          setAdvisories(advisoriesResult.value);
          setAdvisoryMessage(null);
        } else {
          const advisoryError = classifyAdminError(
            advisoriesResult.reason,
        'Os sinais de revisão editorial não ficaram disponíveis neste ambiente.',
          );

          if (advisoryError.kind === 'session-expired') {
            markSessionExpired();
            return;
          }

          setAdvisories([]);
          setAdvisoryMessage(advisoryError.message);
        }

        const preservedArticleId =
          preferredArticleId ??
          (articlesData.some((article) => article.id === selectedArticleId)
            ? selectedArticleId
            : null);

        setSelectedArticleId(preservedArticleId ?? articlesData[0]?.id ?? null);
      } catch (error) {
        const classified = classifyAdminError(
          error,
          'Falha ao carregar a camada editorial da central de ajuda.',
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
        setAdvisories([]);
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
        'O detalhe do artigo selecionado não ficou disponível.',
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
    setDetailTab('preview');
    setArticleForm(emptyArticleForm());
    setCategoryForm(emptyCategoryForm());
    setArticleFormMessage(null);
    setCategoryFormMessage(null);
    setArticleActionFeedback(null);
    setReviewAdvisoryMessage(null);
    setReviewStatusDraft('pending');
    setReviewNotesDraft('');
    setHumanConfirmationsDraft(emptyHumanConfirmations());
  }, [selectedSpaceId]);

  useEffect(() => {
    if (!selectedSpaceId) {
      setCategories([]);
      setArticles([]);
      setAdvisories([]);
      setSelectedArticleId(null);
      setContentPhase('idle');
      setContentMessage(null);
      setAdvisoryMessage(null);
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

    setDetailTab('preview');
    void loadArticleDetail(selectedArticleId);
  }, [selectedArticleId]);

  useEffect(() => {
    setReviewAdvisoryMessage(null);
    setReviewStatusDraft(selectedAdvisory?.review_status ?? 'pending');
    setReviewNotesDraft(selectedAdvisory?.review_notes ?? '');
    setHumanConfirmationsDraft(
      normalizeHumanConfirmations(selectedAdvisory?.human_confirmations),
    );
  }, [selectedAdvisory?.id]);

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

  async function openEditArticle() {
    if (!articleDetail) {
      return;
    }

    let detailForEditing = articleDetail;

    if (articleDetail.status === 'published') {
      if (!selectedSpaceId) {
        return;
      }

      setArticleActionSubmitting(true);
      setArticleActionFeedback(null);

      try {
        if (!articleDetail.editorial_draft) {
          await beginKnowledgeArticleEditorialRevisionV2({
            p_article_id: articleDetail.id,
            p_knowledge_space_id: selectedSpaceId,
          });
          await refreshSelectedSpace(articleDetail.id);
        }

        const refreshedDetail = await getAdminKnowledgeArticleDetailV2(articleDetail.id);
        if (refreshedDetail) {
          detailForEditing = refreshedDetail;
          setArticleDetail(refreshedDetail);
        }
      } catch (error) {
        const classified = classifyAdminError(
          error,
        'Falha ao iniciar a revisão editorial do artigo publicado.',
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
          articleId: articleDetail.id,
          message: classified.message,
        });
        return;
      } finally {
        setArticleActionSubmitting(false);
      }
    }

    const nextDraft =
      detailForEditing.status === 'published'
        ? detailForEditing.editorial_draft
        : null;

    setPanelMode('edit-article');
    setArticleForm(
      nextDraft
        ? buildArticleFormFromEditorialDraft(nextDraft)
        : buildArticleForm(detailForEditing),
    );
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

  function updateHumanConfirmation(
    key: keyof KnowledgeReviewHumanConfirmations,
    checked: boolean,
  ) {
    setHumanConfirmationsDraft((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  async function handleSaveReviewAdvisoryStatus() {
    if (!selectedArticleId) {
      return;
    }

    setReviewAdvisorySubmitting(true);
    setReviewAdvisoryMessage(null);

    try {
      await updateKnowledgeArticleReviewStatus({
        p_article_id: selectedArticleId,
        p_review_status: reviewStatusDraft,
        p_human_confirmations: humanConfirmationsDraft,
        p_review_notes: reviewNotesDraft,
      });

      await refreshSelectedSpace(selectedArticleId);
      setReviewAdvisoryMessage('Status editorial persistido com sucesso.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao persistir a revisão editorial.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setReviewAdvisoryMessage(classified.message);
    } finally {
      setReviewAdvisorySubmitting(false);
    }
  }

  async function handleMarkReviewAdvisoryReviewed() {
    if (!selectedArticleId) {
      return;
    }

    setReviewAdvisorySubmitting(true);
    setReviewAdvisoryMessage(null);

    try {
      await markKnowledgeArticleReviewed({
        p_article_id: selectedArticleId,
        p_human_confirmations: humanConfirmationsDraft,
        p_review_notes: reviewNotesDraft,
      });

      await refreshSelectedSpace(selectedArticleId);
      setReviewAdvisoryMessage('Revisão editorial marcada como concluída.');
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao concluir a revisão editorial.',
      );

      if (classified.kind === 'session-expired') {
        markSessionExpired();
        return;
      }

      if (classified.kind === 'permission-denied') {
        setBackendDenied(true);
        return;
      }

      setReviewAdvisoryMessage(classified.message);
    } finally {
      setReviewAdvisorySubmitting(false);
    }
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
        'Falha ao criar a categoria da central de ajuda.',
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
        if (articleDetail.status === 'published') {
          const updated = await updateKnowledgeArticleEditorialRevisionV2({
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

          recordId = updated.article_id;
        } else {
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
        }
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
        message:
          articleDetail?.status === 'published'
          ? 'Revisão editorial salva com sucesso.'
            : 'Rascunho sincronizado com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao sincronizar o rascunho da central de ajuda.',
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
      message: 'Artigo enviado para revisão com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao enviar o artigo para revisão.',
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
        'Falha ao publicar o artigo da central de ajuda.',
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

    const shouldArchive = window.confirm(
      'Arquivar este artigo remove o item da operação editorial ativa. Confirma o arquivamento?',
    );

    if (!shouldArchive) {
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

  async function handlePublishEditorialRevision() {
    if (!selectedSpaceId || !selectedArticleId) {
      return;
    }

    setArticleActionSubmitting(true);
    setArticleActionFeedback(null);

    try {
      await publishKnowledgeArticleEditorialRevisionV2({
        p_article_id: selectedArticleId,
        p_knowledge_space_id: selectedSpaceId,
      });

      await refreshSelectedSpace(selectedArticleId);
      await refreshArticleDetail(selectedArticleId);
      setArticleActionFeedback({
        articleId: selectedArticleId,
        message: 'Atualização publicada com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao publicar a atualizacao do artigo.',
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

  async function handleDiscardEditorialRevision() {
    if (!selectedSpaceId || !selectedArticleId) {
      return;
    }

    setArticleActionSubmitting(true);
    setArticleActionFeedback(null);

    try {
      await discardKnowledgeArticleEditorialRevisionV2({
        p_article_id: selectedArticleId,
        p_knowledge_space_id: selectedSpaceId,
      });

      await refreshSelectedSpace(selectedArticleId);
      await refreshArticleDetail(selectedArticleId);
      setPanelMode('detail');
      setArticleForm(emptyArticleForm());
      setArticleActionFeedback({
        articleId: selectedArticleId,
      message: 'Revisão editorial descartada com sucesso.',
      });
    } catch (error) {
      const classified = classifyAdminError(
        error,
        'Falha ao descartar a revisão editorial do artigo.',
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
    return <ContractUnavailableState contractName="lista de centrais editoriais" />;
  }

  if (pagePhase === 'error') {
    return (
        <ErrorState
          description={
            pageMessage ??
            'Não foi possível carregar as centrais editoriais neste ambiente.'
          }
        action={<AppButton onClick={() => void loadKnowledgeSpaces()}>Tentar novamente</AppButton>}
      />
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="space-y-5">
        <section className="rounded-[28px] border border-[color:var(--color-border)] bg-white/94 px-6 py-6 shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
                Conhecimento
              </h1>
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                Gerencie artigos, categorias e publicação na central de ajuda.
              </p>
            </div>
            <AppButton disabled>Novo artigo</AppButton>
          </div>
        </section>
        <EmptyState
          title="Nenhuma central editorial disponível"
          description="Ainda não existe uma central pronta para curadoria neste ambiente."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[24px] border border-[color:var(--color-border)] bg-white/95 px-6 py-4 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-[1.9rem] font-semibold tracking-[-0.05em] text-[color:var(--color-ink)]">
              Knowledge
            </h1>
            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
              Gerencie artigos, categorias e publicação na central de ajuda.
            </p>
          </div>
          <AppButton
            className="min-h-11 gap-2 px-5 text-[13px] font-semibold"
            disabled={!selectedSpace}
            onClick={openCreateArticle}
          >
            + Novo artigo
          </AppButton>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[256px_minmax(0,1fr)_400px]">
        <aside className="rounded-[20px] border border-[color:var(--color-border)] bg-white/94 px-4 py-4 shadow-[var(--shadow-panel)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                Filtros
              </p>
              <TextInput
                className="h-10 rounded-[14px] px-3.5"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar artigos..."
                value={searchQuery}
              />
            </div>

            {spaces.length > 1 ? (
              <Field label="Central">
                <SelectInput
                  className="h-10 rounded-[14px] px-3.5"
                  onChange={(event) => setSelectedSpaceId(event.target.value || null)}
                  value={selectedSpaceId ?? ''}
                >
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.display_name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}

            <div className="space-y-2.5">
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                Status
              </p>
              <div className="space-y-1">
                {[
                  ['all', 'Todos', statusCounts.all],
                  ['published', 'Publicado', statusCounts.published],
                  ['draft', 'Rascunho', statusCounts.draft],
                  ['review', 'Em revisão', statusCounts.review],
                  ['archived', 'Arquivado', statusCounts.archived],
                ].map(([value, label, count]) => (
                  <button
                    className={cx(
                      'flex w-full items-center justify-between rounded-[12px] px-3 py-1.5 text-left text-[0.95rem] transition',
                      listStatusFilter === value
                        ? 'bg-[rgba(48,127,226,0.1)] font-medium text-[color:var(--color-brand-blue)]'
                        : 'text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]',
                    )}
                    key={value}
                    onClick={() => setListStatusFilter(value as ArticleStatusFilter)}
                    type="button"
                  >
                    <span>{label}</span>
                    <span className="text-[color:var(--color-muted)]">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[0.74rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
                Categorias
              </p>
              <div className="space-y-1">
                <button
                  className={cx(
                    'flex w-full items-center justify-between rounded-[12px] px-3 py-1.5 text-left text-[0.95rem] transition',
                    selectedCategoryId === 'all'
                      ? 'bg-[rgba(48,127,226,0.1)] font-medium text-[color:var(--color-brand-blue)]'
                      : 'text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]',
                  )}
                  onClick={() => setSelectedCategoryId('all')}
                  type="button"
                >
                  <span>Todos</span>
                  <span className="text-[color:var(--color-muted)]">{filteredArticles.length}</span>
                </button>
                {visibleCategories.map((category) => (
                  <button
                    className={cx(
                      'flex w-full items-center justify-between rounded-[12px] px-3 py-1.5 text-left text-[0.95rem] transition',
                      selectedCategoryId === category.id
                        ? 'bg-[rgba(48,127,226,0.1)] font-medium text-[color:var(--color-brand-blue)]'
                        : 'text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]',
                    )}
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 leading-5">
                      {displayFilterCategoryLabel(category.name)}
                    </span>
                    <span className="pl-3 text-[color:var(--color-muted)]">{category.article_count}</span>
                  </button>
                ))}
                {sortedCategories.length > 5 ? (
                  <button
                    className="rounded-[12px] px-3 py-1.5 text-left text-sm font-medium text-[color:var(--color-brand-blue)]"
                    onClick={() => setShowAllCategories((current) => !current)}
                    type="button"
                  >
                    {showAllCategories ? '− Ver menos' : '+ Ver todas'}
                  </button>
                ) : null}
                <button
                  className="rounded-[12px] px-3 py-1.5 text-left text-sm font-medium text-[color:var(--color-brand-blue)]"
                  onClick={openCreateCategory}
                  type="button"
                >
                  + Nova categoria
                </button>
              </div>
            </div>

            <Field label="Autor">
              <SelectInput
                className="h-10 rounded-[14px] px-3.5"
                onChange={(event) => setSelectedAuthor(event.target.value)}
                value={selectedAuthor}
              >
                <option value="all">Todos</option>
                {availableAuthors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Data">
              <SelectInput
                className="h-10 rounded-[14px] px-3.5"
                onChange={(event) =>
                  setSelectedDateWindow(event.target.value as KnowledgeDateFilter)
                }
                value={selectedDateWindow}
              >
                <option value="90">Últimos 90 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="7">Últimos 7 dias</option>
                <option value="all">Todos os períodos</option>
              </SelectInput>
            </Field>

            <div className="flex flex-col gap-2 pt-1">
              <GhostButton
                className="min-h-10 justify-start rounded-[14px] px-3.5"
                disabled={!selectedSpaceId}
                onClick={() => {
                  if (selectedSpaceId) {
                    void refreshSelectedSpace();
                  }
                }}
              >
                Atualizar lista
              </GhostButton>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-[20px] border border-[color:var(--color-border)] bg-white/95 shadow-[var(--shadow-panel)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-4">
            <div>
              <h2 className="text-[1.28rem] font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
                Artigos ({displayArticles.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <SelectInput
                className="h-10 min-w-[156px] rounded-[14px] px-3.5"
                onChange={(event) => setListSort(event.target.value as KnowledgeListSort)}
                value={listSort}
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="title">Título A-Z</option>
              </SelectInput>
            </div>
          </header>

          {contentPhase === 'idle' ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Selecione uma central"
                description="Escolha a central no painel lateral para abrir a lista de artigos."
              />
            </div>
          ) : contentPhase === 'loading' ? (
            <div className="px-5 py-8">
              <LoadingState
                title="Carregando artigos"
                description="Estamos preparando a lista e a pré-visualização desta central."
              />
            </div>
          ) : contentPhase === 'contract-unavailable' ? (
            <div className="px-5 py-8">
              <ContractUnavailableState contractName="lista editorial de artigos e categorias" />
            </div>
          ) : contentPhase === 'error' ? (
            <div className="px-5 py-8">
              <ErrorState
                description={
                  contentMessage ?? 'Não foi possível carregar os artigos desta central.'
                }
                action={
                  <AppButton onClick={() => selectedSpaceId && void refreshSelectedSpace()}>
                    Tentar novamente
                  </AppButton>
                }
              />
            </div>
          ) : displayArticles.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Nenhum artigo encontrado"
                description="Ajuste os filtros ou crie um novo artigo para continuar."
                action={<AppButton onClick={openCreateArticle}>Criar artigo</AppButton>}
              />
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-[color:var(--color-border)] text-left text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                      <th className="px-5 py-3.5">Título</th>
                      <th className="w-[126px] px-3 py-3.5">Categoria</th>
                      <th className="w-[114px] px-3 py-3.5">Autor</th>
                      <th className="w-[116px] px-3 py-3.5">Data</th>
                      <th className="w-[148px] px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayArticles.map((article) => {
                      const isSelected = article.id === selectedArticleId;

                      return (
                        <tr
                          className={cx(
                            'cursor-pointer border-b border-[color:var(--color-border)] transition last:border-b-0',
                            isSelected
                              ? 'bg-[rgba(48,127,226,0.08)]'
                              : 'hover:bg-[color:var(--color-surface)]',
                          )}
                          key={article.id}
                          onClick={() => {
                            setSelectedArticleId(article.id);
                            setPanelMode('detail');
                            setArticleFormMessage(null);
                            setCategoryFormMessage(null);
                            setArticleActionFeedback(null);
                          }}
                        >
                          <td className="px-5 py-3.5 align-top">
                            <div className="space-y-0.5">
                              <p className="line-clamp-2 text-[0.94rem] font-medium leading-6 text-[color:var(--color-ink)]">
                                {article.title || 'Indisponível'}
                              </p>
                              <p className="line-clamp-1 text-[0.82rem] leading-5 text-[color:var(--color-muted)]">
                                {article.summary?.trim() || 'Indisponível'}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 align-top">
                            <span
                              className={cx(
                                'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold',
                                categoryBadgeClass(article.category_name),
                              )}
                            >
                              <span className="max-w-full truncate leading-4">
                                {compactCategoryLabel(article.category_name)}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3.5 align-top text-[0.84rem] text-[color:var(--color-ink)]">
                            <span className="block leading-5">
                              {articleContributorName(article)}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 align-top text-[0.8rem] text-[color:var(--color-ink)]">
                            {formatDateTime(article.updated_at)}
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            <div className="space-y-1">
                              <span
                                className={cx(
                                  'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-[0.32rem] text-[0.64rem] font-semibold uppercase tracking-[0.08em]',
                                  compactStatusBadgeClass(toneForArticleStatus(article.status)),
                                )}
                              >
                                <span className="leading-4">
                                  {compactStatusBadgeLabel(article.status)}
                                </span>
                              </span>
                              {article.has_editorial_draft ? (
                                <p className="text-[0.74rem] leading-4 text-[color:var(--color-muted)]">
                                  Revisão ativa
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-border)] px-5 py-4 text-sm text-[color:var(--color-muted)]">
                <p>
                  Mostrando 1-{displayArticles.length} de {filteredArticles.length} artigos
                </p>
              </footer>
            </>
          )}
        </section>

        <section className="self-start rounded-[20px] border border-[color:var(--color-border)] bg-white/95 px-4 py-4 shadow-[var(--shadow-panel)] xl:sticky xl:top-0">
          <div className="space-y-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
            <div className="space-y-1">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
                Pré-visualização
              </p>
            </div>

            <div className="space-y-3">
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

                  <Field label="Visibilidade">
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
                    <InlineNotice tone={noticeTone(categoryFormMessage)}>
                      {categoryFormMessage}
                    </InlineNotice>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <AppButton disabled={categoryFormSubmitting} type="submit">
                      {categoryFormSubmitting ? 'Salvando...' : 'Criar categoria'}
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
                <Field label="Título">
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
                      disabled={articleDetail?.status === 'published'}
                      placeholder="como-tratar-devolucao-com-reembolso-parcial"
                      required
                      value={articleForm.slug}
                    />
                  </Field>

                  {articleDetail?.status === 'published' ? (
                    <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                      O slug do artigo publicado permanece travado para preservar o mesmo link público.
                    </p>
                  ) : null}

                  <Field label="Resumo">
                    <TextareaInput
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      placeholder="Resumo curto para orientar a leitura do artigo."
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

                  {articleFormHasPublicCategoryMismatch ? (
                    <InlineNotice tone="warning">
                      Artigos públicos só aparecem na central quando a categoria selecionada também estiver pública. Ajuste a categoria ou a visibilidade antes de publicar.
                    </InlineNotice>
                  ) : null}

                  <Field label="Visibilidade">
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

                  <Field label="Conteúdo principal">
                    <TextareaInput
                      onChange={(event) =>
                        setArticleForm((current) => ({
                          ...current,
                          bodyMd: event.target.value,
                        }))
                      }
                      placeholder="Escreva ou revise o corpo principal do artigo."
                      required
                      value={articleForm.bodyMd}
                    />
                  </Field>

                  <details className="rounded-[18px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[color:var(--color-ink)]">
                      Informações avançadas
                    </summary>
                    <div className="mt-4 space-y-4">
                      <Field label="Caminho de origem">
                        <TextInput
                          onChange={(event) =>
                            setArticleForm((current) => ({
                              ...current,
                              sourcePath: event.target.value,
                            }))
                          }
                          placeholder="raw_knowledge/.../articles"
                          value={articleForm.sourcePath}
                        />
                      </Field>

                      <Field label="Hash de origem">
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
                    </div>
                  </details>

                  {articleFormMessage ? (
                    <InlineNotice tone="critical">{articleFormMessage}</InlineNotice>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <AppButton disabled={articleFormSubmitting} type="submit">
                      {articleFormSubmitting
                        ? 'Salvando...'
                        : panelMode === 'edit-article'
                          ? articleDetail?.status === 'published'
                        ? 'Salvar revisão'
                            : 'Salvar artigo'
                          : 'Criar artigo'}
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
                  description="Escolha um item da lista para abrir a pré-visualização."
                  action={<AppButton onClick={openCreateArticle}>Novo artigo</AppButton>}
                />
              ) : detailPhase === 'loading' ? (
                <LoadingState
                  title="Carregando pré-visualização"
                  description="Estamos preparando os dados do artigo selecionado."
                />
              ) : detailPhase === 'contract-unavailable' ? (
                <ContractUnavailableState contractName="detalhe editorial do artigo" />
              ) : detailPhase === 'error' || !articleDetail || !selectedArticleSummary ? (
                <ErrorState
                  description={
                    detailMessage ?? 'Não foi possível abrir o artigo selecionado.'
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
                <div className="space-y-4">
                  <div className="space-y-4 rounded-[22px] border border-[color:var(--color-border)] bg-white px-4 py-4 shadow-[0_16px_36px_rgba(19,33,79,0.08)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone={toneForArticleStatus(articleDetail.status)}>
                            {displayArticleStatus(articleDetail.status)}
                          </StatusPill>
                          {publishedEditorialDraft ? (
                            <StatusPill tone="accent">Revisão em andamento</StatusPill>
                          ) : null}
                        </div>
                        <h2 className="text-[1.55rem] font-semibold leading-8 tracking-[-0.05em] text-[color:var(--color-ink)]">
                          {articleDetail.title || 'Indisponível'}
                        </h2>
                      </div>
                      {articleDetail.category_name ? (
                        <span
                          className={cx(
                            'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]',
                            categoryBadgeClass(articleDetail.category_name),
                          )}
                        >
                          <span className="truncate">{articleDetail.category_name}</span>
                        </span>
                      ) : null}
                    </div>

                    <dl className="grid gap-x-4 gap-y-3 border-t border-[color:var(--color-border)] pt-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Autor
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {articleContributorNameFromDetail(articleDetail)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Atualizado em
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {formatOptionalDate(articleDetail.updated_at)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Leitura estimada
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {estimateReadingTime(articleDetail.body_md)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Visibilidade
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {displayVisibility(articleDetail.visibility)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Última publicação
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {formatOptionalDate(articleDetail.published_at)}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Versão
                        </dt>
                        <dd className="text-sm text-[color:var(--color-ink)]">
                          {articleDetail.current_revision_number ?? 'Indisponível'}
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-2 border-t border-[color:var(--color-border)] pt-4">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                        Resumo editorial
                      </p>
                      <p className="line-clamp-4 text-sm leading-6 text-[color:var(--color-ink)]">
                        {articleDetail.summary?.trim() || 'Indisponível'}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-[color:var(--color-border)] pt-4">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                        Link público
                      </p>
                      {publicPreviewHref ? (
                        <a
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--color-ink)] transition hover:border-[color:var(--color-brand-blue)]/40 hover:bg-[color:var(--color-surface)]"
                          href={publicPreviewHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Abrir artigo público
                        </a>
                      ) : (
                        <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                          {publicPreviewMessage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 border-t border-[color:var(--color-border)] pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                          Ações
                        </p>
                        {publishedEditorialDraft ? (
                          <StatusPill tone="accent">Revisão ativa</StatusPill>
                        ) : null}
                      </div>
                      <div className="grid gap-2.5">
                        {articleDetail.status === 'draft' ? (
                          <>
                            <AppButton className="min-h-11" disabled={articleActionSubmitting || !canSubmitForReview} onClick={() => void handleSubmitForReview()}>
                              {articleActionSubmitting ? 'Enviando...' : 'Enviar para revisão'}
                            </AppButton>
                            <GhostButton className="min-h-11 justify-center" disabled={articleActionSubmitting} onClick={() => void openEditArticle()}>
                              Editar
                            </GhostButton>
                          </>
                        ) : null}
                        {articleDetail.status === 'review' ? (
                          <>
                            <AppButton className="min-h-11" disabled={articleActionSubmitting || !canPublishArticle} onClick={() => void handlePublish()}>
                              {articleActionSubmitting ? 'Publicando...' : 'Publicar'}
                            </AppButton>
                            <GhostButton className="min-h-11 justify-center" disabled={articleActionSubmitting} onClick={() => void openEditArticle()}>
                              Editar
                            </GhostButton>
                          </>
                        ) : null}
                        {articleDetail.status === 'published' && !publishedEditorialDraft ? (
                          <GhostButton
                            className="min-h-11 justify-center"
                            disabled={articleActionSubmitting}
                            onClick={() => void openEditArticle()}
                          >
                            Editar
                          </GhostButton>
                        ) : null}
                        {articleDetail.status === 'published' && publishedEditorialDraft ? (
                          <>
                            <AppButton
                              className="min-h-11"
                              disabled={articleActionSubmitting || !canPublishEditorialRevision}
                              onClick={() => void handlePublishEditorialRevision()}
                            >
                              {articleActionSubmitting ? 'Publicando...' : 'Publicar atualização'}
                            </AppButton>
                            <GhostButton
                              className="min-h-11 justify-center"
                              disabled={articleActionSubmitting}
                              onClick={() => void openEditArticle()}
                            >
                              Editar revisão
                            </GhostButton>
                            <GhostButton
                              className="min-h-11 justify-center"
                              disabled={articleActionSubmitting}
                              onClick={() => void handleDiscardEditorialRevision()}
                            >
                              {articleActionSubmitting ? 'Descartando...' : 'Descartar revisão'}
                            </GhostButton>
                          </>
                        ) : null}
                        {articleDetail.status !== 'archived' ? (
                          <GhostButton className="min-h-11 justify-center border-[color:var(--color-danger-border)] text-[color:var(--color-danger-ink)]" disabled={articleActionSubmitting} onClick={() => void handleArchive()}>
                            {articleActionSubmitting ? 'Arquivando...' : 'Arquivar'}
                          </GhostButton>
                        ) : null}
                      </div>
                      {articleDetail.status === 'draft' && !canSubmitForReview ? (
                        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                          Complete título, resumo, categoria e conteúdo principal antes de enviar para revisão.
                        </p>
                      ) : null}
                      {articleDetail.status === 'review' && !canPublishArticle ? (
                        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                          {advisoryMessage
                            ? 'Recarregue os sinais de revisão editorial antes de publicar este artigo.'
                            : 'Conclua a revisão editorial persistida antes de publicar este artigo.'}
                        </p>
                      ) : null}
                      {articleDetail.status === 'published' && publishedEditorialDraft && !canPublishEditorialRevision ? (
                        <p className="text-xs leading-5 text-[color:var(--color-muted)]">
                          Conclua título, categoria e conteúdo principal da revisão antes de publicar a atualização.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {articleActionMessage ? (
                    <InlineNotice tone={noticeTone(articleActionMessage)}>
                      {articleActionMessage}
                    </InlineNotice>
                  ) : null}

                  {reviewAdvisoryMessage ? (
                    <InlineNotice tone={noticeTone(reviewAdvisoryMessage)}>
                      {reviewAdvisoryMessage}
                    </InlineNotice>
                  ) : null}

                  {advisoryMessage ? (
                    <InlineNotice tone="warning">{advisoryMessage}</InlineNotice>
                  ) : null}

                  {articleHasPublicCategoryMismatch ? (
                    <InlineNotice tone="warning">
                      Este artigo está marcado como público, mas a categoria atual não está pública. Enquanto essa coerência não for ajustada, o artigo não aparece na central de ajuda.
                    </InlineNotice>
                  ) : null}

                  {publishedEditorialDraft ? (
                    <InlineNotice tone="warning">
                      Existe uma revisão editorial em andamento. A versão pública continua estável até você publicar a atualização.
                    </InlineNotice>
                  ) : null}

                  {editorialDraftHasPublicCategoryMismatch ? (
                    <InlineNotice tone="warning">
                      A revisão em andamento está marcada como pública, mas a categoria escolhida ainda não está pública. Ajuste essa coerência antes de publicar a atualização.
                    </InlineNotice>
                  ) : null}

                  <div className="hidden rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4">
                    <div className="grid grid-cols-3 gap-2 border-b border-[color:var(--color-border)] pb-3">
                      {[
                        ['preview', 'Prévia'],
                        ['review', 'Revisão'],
                        ['classification', 'Classificação'],
                        ['checklist', 'Checklist'],
                        ['advanced', 'Avançado'],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={cx(
                            'inline-flex min-h-10 items-center justify-center rounded-full border px-3.5 text-[0.78rem] font-semibold transition',
                            detailTab === value
                              ? 'border-[rgba(22,101,239,0.26)] bg-[rgba(22,101,239,0.1)] text-[color:var(--color-brand-blue)]'
                              : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)]',
                          )}
                          onClick={() => setDetailTab(value as DetailTab)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      {detailTab === 'preview' ? (
                        <div className="space-y-3">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                            {editorialPreviewTitle}
                          </p>
                          <div className="max-h-72 overflow-y-auto rounded-[16px] border border-[color:var(--color-border)] bg-white px-4 py-4">
                            <div className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-ink)]">
                              {editorialPreviewBody.trim() || 'Indisponível'}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'review' ? (
                        selectedAdvisory ? (
                          <div className="space-y-4">
                            <Field label="Status da revisão">
                              <SelectInput
                                onChange={(event) =>
                                  setReviewStatusDraft(
                                    event.target.value as KnowledgeArticleReviewStatus,
                                  )
                                }
                                value={reviewStatusDraft}
                              >
                                {KNOWLEDGE_ARTICLE_REVIEW_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </SelectInput>
                            </Field>

                            <Field label="Notas da revisão">
                              <TextareaInput
                                className="min-h-24"
                                onChange={(event) => setReviewNotesDraft(event.target.value)}
                                placeholder="Registre orientações objetivas para a etapa editorial."
                                value={reviewNotesDraft}
                              />
                            </Field>

                            <div className="space-y-2">
                              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                                Confirmações humanas
                              </p>
                              <div className="space-y-2">
                                {HUMAN_CONFIRMATION_FIELDS.map((field) => (
                                  <label
                                    className="flex items-start gap-3 rounded-[16px] border border-[color:var(--color-border)] bg-white px-3 py-3"
                                    key={field.key}
                                  >
                                    <input
                                      checked={humanConfirmationsDraft[field.key] === true}
                                      className="mt-1 h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-brand-blue)]"
                                      onChange={(event) =>
                                        updateHumanConfirmation(field.key, event.target.checked)
                                      }
                                      type="checkbox"
                                    />
                                    <span className="space-y-1">
                                      <span className="block text-sm font-medium text-[color:var(--color-ink)]">
                                        {field.label}
                                      </span>
                                      <span className="block text-xs leading-5 text-[color:var(--color-muted)]">
                                        {field.help}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <AppButton
                                disabled={reviewAdvisorySubmitting}
                                onClick={() => void handleSaveReviewAdvisoryStatus()}
                              >
                                {reviewAdvisorySubmitting ? 'Salvando...' : 'Salvar revisão'}
                              </AppButton>
                              <GhostButton
                                disabled={reviewAdvisorySubmitting}
                                onClick={() => void handleMarkReviewAdvisoryReviewed()}
                              >
                                {reviewAdvisorySubmitting
                                  ? 'Concluindo...'
                                  : 'Marcar como revisado'}
                              </GhostButton>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                            Inicie uma revisão ou carregue sinais editoriais para abrir este painel.
                          </p>
                        )
                      ) : null}

                      {detailTab === 'classification' ? (
                        selectedAdvisory ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <StatusPill tone={toneForAdvisoryClassification(selectedAdvisory.suggested_classification)}>
                                {selectedAdvisory.suggested_classification}
                              </StatusPill>
                              <StatusPill tone={toneForVisibility(selectedAdvisory.suggested_visibility)}>
                                {selectedAdvisory.suggested_visibility}
                              </StatusPill>
                              <StatusPill tone={toneForReviewStatus(selectedAdvisory.review_status)}>
                                {selectedAdvisory.review_status}
                              </StatusPill>
                            </div>
                            <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                              {selectedAdvisory.classification_reason || 'Indisponível'}
                            </p>
                            {advisoryRiskFlags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {advisoryRiskFlags.map((flag) => (
                                  <StatusPill key={flag} tone="critical">
                                    {flag}
                                  </StatusPill>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                            Classificação indisponível para este artigo no momento.
                          </p>
                        )
                      ) : null}

                      {detailTab === 'checklist' ? (
                        <div className="space-y-4">
                          {editorialChecklist ? (
                            <div className="space-y-3">
                              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                                Sinais automáticos
                              </p>
                              {editorialChecklist.automated.map((item) => (
                                <div key={item.label} className="rounded-[14px] border border-[color:var(--color-border)] bg-white px-3 py-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusPill tone={item.tone}>{item.label}</StatusPill>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                                    {item.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="space-y-3">
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                              Confirmações humanas
                            </p>
                            {persistedHumanChecklist.map((item) => (
                              <div key={item.label} className="rounded-[14px] border border-[color:var(--color-border)] bg-white px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusPill tone={item.tone}>{item.label}</StatusPill>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                                  {item.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {detailTab === 'advanced' ? (
                        <div className="space-y-3 text-sm leading-6 text-[color:var(--color-muted)]">
                          <p>Central: {articleDetail.knowledge_space_display_name || 'Indisponível'}</p>
                          <p>Slug: {articleDetail.slug || 'Indisponível'}</p>
                          <p>Origem: {articleDetail.source_path || 'Indisponível'}</p>
                          <p>Hash: {articleDetail.source_hash || 'Indisponível'}</p>
                          <p>Revisões: {articleDetail.revisions.length}</p>
                          <p>
                            Revisão em andamento:{' '}
                            {publishedEditorialDraft ? 'Sim' : 'Não'}
                          </p>
                          {publishedEditorialDraft ? (
                            <>
                              <p>Slug em revisão: {publishedEditorialDraft.slug || 'Indisponível'}</p>
                              <p>
                                Revisão iniciada da versão:{' '}
                                {publishedEditorialDraft.based_on_revision_number}
                              </p>
                              <p>
                                Revisão atualizada em:{' '}
                                {formatOptionalDate(publishedEditorialDraft.updated_at)}
                              </p>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
