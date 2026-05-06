import { toAppError } from '../../app/errors';
import { requireSupabaseBrowserClient } from '../../app/supabase-browser';
import type {
  AdminAuditFeedRow,
  AdminKnowledgeArticleDetailV2Row,
  AdminKnowledgeArticleEditorialDraftRow,
  AdminKnowledgeArticleListItemV2Row,
  AdminKnowledgeArticleReviewAdvisoryRow,
  AdminKnowledgeCategoryRecordRow,
  AdminKnowledgeCategoryV2Row,
  AdminKnowledgeSpaceRow,
  AdminTenantContactRecordRow,
  AdminTenantContactViewRow,
  AdminTenantDetailRow,
  AdminTenantMembershipRecordRow,
  AdminTenantMembershipRow,
  AdminTenantRecordRow,
  AdminTenantsListItemRow,
  AdminUserLookupRow,
  KnowledgeAdvisoryClassification,
  KnowledgeArticleStatus,
  KnowledgeArticleReviewStatus,
  KnowledgeReviewHumanConfirmations,
  KnowledgeVisibility,
  RpcAdminAddTenantMemberPayload,
  RpcAdminAddTenantMemberResponse,
  RpcAdminArchiveKnowledgeArticleV2Response,
  RpcAdminArticleSpaceActionV2Payload,
  RpcAdminBeginKnowledgeArticleEditorialRevisionV2Response,
  RpcAdminCreateKnowledgeArticleDraftV2Payload,
  RpcAdminCreateKnowledgeArticleDraftV2Response,
  RpcAdminCreateKnowledgeCategoryV2Payload,
  RpcAdminCreateKnowledgeCategoryV2Response,
  RpcAdminCreateTenantContactPayload,
  RpcAdminCreateTenantContactResponse,
  RpcAdminCreateTenantPayload,
  RpcAdminCreateTenantResponse,
  RpcAdminDiscardKnowledgeArticleEditorialRevisionV2Response,
  RpcAdminMarkKnowledgeArticleReviewedPayload,
  RpcAdminMarkKnowledgeArticleReviewedResponse,
  RpcAdminPublishKnowledgeArticleV2Response,
  RpcAdminPublishKnowledgeArticleEditorialRevisionV2Response,
  RpcAdminSubmitKnowledgeArticleForReviewV2Response,
  RpcAdminUpdateKnowledgeArticleReviewStatusPayload,
  RpcAdminUpdateKnowledgeArticleReviewStatusResponse,
  RpcAdminUpdateKnowledgeArticleDraftV2Payload,
  RpcAdminUpdateKnowledgeArticleDraftV2Response,
  RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Payload,
  RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Response,
  RpcAdminUpdateTenantContactPayload,
  RpcAdminUpdateTenantContactResponse,
  RpcAdminUpdateTenantMemberRolePayload,
  RpcAdminUpdateTenantMemberRoleResponse,
  RpcAdminUpdateTenantMemberStatusPayload,
  RpcAdminUpdateTenantMemberStatusResponse,
  RpcAdminUpdateTenantStatusPayload,
  RpcAdminUpdateTenantStatusResponse,
} from '../../contracts/admin-contracts';

function requireClient() {
  return requireSupabaseBrowserClient();
}

function escapeLookupTerm(value: string) {
  return value.replace(/[%_,]/g, ' ').trim();
}

export async function listAdminTenants() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenants_list')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error, 'Falha ao carregar a lista de clientes.');
  }

  return (data ?? []) as AdminTenantsListItemRow[];
}

export async function getAdminTenantDetail(tenantId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenant_detail')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Falha ao carregar o detalhe do cliente.');
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as AdminTenantDetailRow),
    contacts: Array.isArray(data.contacts) ? (data.contacts as AdminTenantDetailRow['contacts']) : [],
  } satisfies AdminTenantDetailRow;
}

export async function listAdminMemberships() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_tenant_memberships')
    .select('*')
    .order('tenant_display_name', { ascending: true });

  if (error) {
    throw toAppError(error, 'Falha ao carregar os vínculos administrativos.');
  }

  return (data ?? []) as AdminTenantMembershipRow[];
}

export async function lookupAdminUsers(rawQuery: string, limit = 8) {
  const client = requireClient();
  const query = escapeLookupTerm(rawQuery);

  if (!query) {
    return [] as AdminUserLookupRow[];
  }

  const { data, error } = await client
    .from('vw_admin_user_lookup')
    .select('*')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw toAppError(error, 'Falha ao buscar usuários para os vínculos.');
  }

  return (data ?? []) as AdminUserLookupRow[];
}

export async function listAdminAuditFeed(limit = 120) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_audit_feed')
    .select('*')
    .limit(limit)
    .order('occurred_at', { ascending: false });

  if (error) {
    throw toAppError(error, 'Falha ao carregar o feed de auditoria.');
  }

  return (data ?? []) as AdminAuditFeedRow[];
}

export async function listAdminKnowledgeSpaces() {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_knowledge_spaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw toAppError(error, 'Falha ao carregar as áreas de conhecimento administrativas.');
  }

  return (data ?? []) as AdminKnowledgeSpaceRow[];
}

export async function listAdminKnowledgeCategoriesV2(knowledgeSpaceId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_knowledge_categories_v2')
    .select('*')
    .eq('knowledge_space_id', knowledgeSpaceId)
    .order('name', { ascending: true });

  if (error) {
    throw toAppError(
      error,
      'Falha ao carregar as categorias administrativas da central de ajuda.',
    );
  }

  return (data ?? []) as AdminKnowledgeCategoryV2Row[];
}

export async function listAdminKnowledgeArticlesV2(options: {
  knowledgeSpaceId: string;
  status?: KnowledgeArticleStatus | 'all';
  visibility?: KnowledgeVisibility | 'all';
}) {
  const client = requireClient();
  let query = client
    .from('vw_admin_knowledge_articles_list_v2')
    .select('*')
    .eq('knowledge_space_id', options.knowledgeSpaceId)
    .order('updated_at', { ascending: false });

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options.visibility && options.visibility !== 'all') {
    query = query.eq('visibility', options.visibility);
  }

  const { data, error } = await query;

  if (error) {
    throw toAppError(
      error,
      'Falha ao carregar a lista administrativa de artigos da central de ajuda.',
    );
  }

  return (data ?? []) as AdminKnowledgeArticleListItemV2Row[];
}

export async function getAdminKnowledgeArticleDetailV2(articleId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_knowledge_article_detail_v2')
    .select('*')
    .eq('id', articleId)
    .maybeSingle();

  if (error) {
    throw toAppError(
      error,
      'Falha ao carregar o detalhe administrativo do artigo.',
    );
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as AdminKnowledgeArticleDetailV2Row),
    revisions: Array.isArray(data.revisions)
      ? (data.revisions as AdminKnowledgeArticleDetailV2Row['revisions'])
      : [],
    sources: Array.isArray(data.sources)
      ? (data.sources as AdminKnowledgeArticleDetailV2Row['sources'])
      : [],
    editorial_draft:
      data.editorial_draft &&
      typeof data.editorial_draft === 'object' &&
      !Array.isArray(data.editorial_draft)
        ? (data.editorial_draft as AdminKnowledgeArticleDetailV2Row['editorial_draft'])
        : null,
  } satisfies AdminKnowledgeArticleDetailV2Row;
}

export async function listAdminKnowledgeArticleReviewAdvisories(
  knowledgeSpaceId: string,
) {
  const client = requireClient();
  const { data, error } = await client
    .from('vw_admin_knowledge_article_review_advisories')
    .select('*')
    .eq('knowledge_space_id', knowledgeSpaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw toAppError(
      error,
      'Falha ao carregar os alertas editoriais da central de ajuda.',
    );
  }

  return (data ?? []) as AdminKnowledgeArticleReviewAdvisoryRow[];
}

export async function createTenant(payload: RpcAdminCreateTenantPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_create_tenant', payload);

  if (error) {
    throw toAppError(error, 'Falha ao criar tenant.');
  }

  return data as RpcAdminCreateTenantResponse;
}

export async function updateTenantStatus(payload: RpcAdminUpdateTenantStatusPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_update_tenant_status', payload);

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o status do tenant.');
  }

  return data as RpcAdminUpdateTenantStatusResponse;
}

export async function addTenantMember(payload: RpcAdminAddTenantMemberPayload) {
  const client = requireClient();
  const { data, error } = await client.rpc('rpc_admin_add_tenant_member', payload);

  if (error) {
    throw toAppError(error, 'Falha ao adicionar membership.');
  }

  return data as RpcAdminAddTenantMemberResponse;
}

export async function updateTenantMemberRole(
  payload: RpcAdminUpdateTenantMemberRolePayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_member_role',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar a role do membership.');
  }

  return data as RpcAdminUpdateTenantMemberRoleResponse;
}

export async function updateTenantMemberStatus(
  payload: RpcAdminUpdateTenantMemberStatusPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_member_status',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o status do membership.');
  }

  return data as RpcAdminUpdateTenantMemberStatusResponse;
}

export async function createTenantContact(
  payload: RpcAdminCreateTenantContactPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_create_tenant_contact',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao criar contato do tenant.');
  }

  return data as RpcAdminCreateTenantContactResponse;
}

export async function updateTenantContact(
  payload: RpcAdminUpdateTenantContactPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_tenant_contact',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar contato do tenant.');
  }

  return data as RpcAdminUpdateTenantContactResponse;
}

export async function createKnowledgeCategoryV2(
  payload: RpcAdminCreateKnowledgeCategoryV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_create_knowledge_category_v2',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao criar a categoria da central de ajuda.');
  }

  return data as RpcAdminCreateKnowledgeCategoryV2Response;
}

export async function createKnowledgeArticleDraftV2(
  payload: RpcAdminCreateKnowledgeArticleDraftV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_create_knowledge_article_draft_v2',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao criar o rascunho da central de ajuda.');
  }

  return data as RpcAdminCreateKnowledgeArticleDraftV2Response;
}

export async function updateKnowledgeArticleDraftV2(
  payload: RpcAdminUpdateKnowledgeArticleDraftV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_knowledge_article_draft_v2',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o rascunho da central de ajuda.');
  }

  return data as RpcAdminUpdateKnowledgeArticleDraftV2Response;
}

export async function beginKnowledgeArticleEditorialRevisionV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_begin_knowledge_article_editorial_revision_v2',
    payload,
  );

  if (error) {
    throw toAppError(
      error,
      'Falha ao iniciar a revisão editorial do artigo publicado.',
    );
  }

  return data as RpcAdminBeginKnowledgeArticleEditorialRevisionV2Response;
}

export async function updateKnowledgeArticleEditorialRevisionV2(
  payload: RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_knowledge_article_editorial_revision_v2',
    payload,
  );

  if (error) {
    throw toAppError(
      error,
      'Falha ao salvar a revisão editorial do artigo publicado.',
    );
  }

  return data as RpcAdminUpdateKnowledgeArticleEditorialRevisionV2Response;
}

export async function submitKnowledgeArticleForReviewV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_submit_knowledge_article_for_review_v2',
    payload,
  );

  if (error) {
    throw toAppError(
      error,
      'Falha ao enviar o artigo para revisão editorial.',
    );
  }

  return data as RpcAdminSubmitKnowledgeArticleForReviewV2Response;
}

export async function publishKnowledgeArticleV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_publish_knowledge_article_v2',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao publicar o artigo da central de ajuda.');
  }

  return data as RpcAdminPublishKnowledgeArticleV2Response;
}

export async function archiveKnowledgeArticleV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_archive_knowledge_article_v2',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao arquivar o artigo da central de ajuda.');
  }

  return data as RpcAdminArchiveKnowledgeArticleV2Response;
}

export async function publishKnowledgeArticleEditorialRevisionV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_publish_knowledge_article_editorial_revision_v2',
    payload,
  );

  if (error) {
    throw toAppError(
      error,
      'Falha ao publicar a atualização do artigo.',
    );
  }

  return data as RpcAdminPublishKnowledgeArticleEditorialRevisionV2Response;
}

export async function discardKnowledgeArticleEditorialRevisionV2(
  payload: RpcAdminArticleSpaceActionV2Payload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_discard_knowledge_article_editorial_revision_v2',
    payload,
  );

  if (error) {
    throw toAppError(
      error,
      'Falha ao descartar a revisão editorial do artigo.',
    );
  }

  return data as RpcAdminDiscardKnowledgeArticleEditorialRevisionV2Response;
}

export async function updateKnowledgeArticleReviewStatus(
  payload: RpcAdminUpdateKnowledgeArticleReviewStatusPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_update_knowledge_article_review_status',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao atualizar o status da revisão editorial.');
  }

  return data as RpcAdminUpdateKnowledgeArticleReviewStatusResponse;
}

export async function markKnowledgeArticleReviewed(
  payload: RpcAdminMarkKnowledgeArticleReviewedPayload,
) {
  const client = requireClient();
  const { data, error } = await client.rpc(
    'rpc_admin_mark_knowledge_article_reviewed',
    payload,
  );

  if (error) {
    throw toAppError(error, 'Falha ao marcar a revisão editorial como concluída.');
  }

  return data as RpcAdminMarkKnowledgeArticleReviewedResponse;
}

export type {
  AdminAuditFeedRow,
  AdminKnowledgeArticleDetailV2Row,
  AdminKnowledgeArticleEditorialDraftRow,
  AdminKnowledgeArticleListItemV2Row,
  AdminKnowledgeArticleReviewAdvisoryRow,
  AdminKnowledgeCategoryRecordRow,
  AdminKnowledgeCategoryV2Row,
  AdminKnowledgeSpaceRow,
  AdminTenantContactRecordRow,
  AdminTenantContactViewRow,
  AdminTenantDetailRow,
  AdminTenantMembershipRecordRow,
  AdminTenantMembershipRow,
  AdminTenantRecordRow,
  AdminTenantsListItemRow,
  AdminUserLookupRow,
  KnowledgeAdvisoryClassification,
  KnowledgeArticleStatus,
  KnowledgeArticleReviewStatus,
  KnowledgeReviewHumanConfirmations,
  KnowledgeVisibility,
};
