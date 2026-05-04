import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FIXTURE = {
  qaAdmin: {
    email: 'qa.local.platform-admin@genius.local',
    password: 'Local-QA-Admin-2026!',
    fullName: 'QA Local Platform Admin',
  },
  agents: [
    {
      key: 'support-agent-a',
      email: 'qa.local.support-agent-a@genius.local',
      password: 'Local-QA-Agent-A-2026!',
      fullName: 'QA Local Support Agent A',
      globalRole: 'support_agent',
      tenantSlug: 'support-qa-a',
    },
    {
      key: 'support-manager-a',
      email: 'qa.local.support-manager-a@genius.local',
      password: 'Local-QA-Manager-A-2026!',
      fullName: 'QA Local Support Manager A',
      globalRole: 'support_manager',
      tenantSlug: 'support-qa-a',
    },
    {
      key: 'support-agent-b',
      email: 'qa.local.support-agent-b@genius.local',
      password: 'Local-QA-Agent-B-2026!',
      fullName: 'QA Local Support Agent B',
      globalRole: 'support_agent',
      tenantSlug: 'support-qa-b',
    },
  ],
  tenants: [
    {
      slug: 'support-qa-a',
      legalName: 'Support QA Tenant A Ltda',
      displayName: 'Support QA Tenant A',
      contact: {
        fullName: 'Marina Operacoes QA',
        email: 'marina.ops@support-qa-a.local',
        phone: '+55 11 91000-0001',
        jobTitle: 'Coordenacao de Operacoes',
      },
      customerAccount: {
        productLine: 'genius_returns',
        operationalStatus: 'active',
        accountTier: 'enterprise',
        internalNotes:
          'Conta com acompanhamento operacional proximo e fluxo sensivel de devolucoes.',
        operationalFlags: {
          high_touch_account: true,
          custom_operational_flow: true,
          integration_sensitive_account: true,
        },
        integrations: [
          {
            integrationType: 'erp',
            provider: 'totvs',
            status: 'active',
            environment: 'production',
            notes: 'Integra pedidos, devolucoes e conciliacao financeira do tenant.',
          },
          {
            integrationType: 'carrier',
            provider: 'correios',
            status: 'active',
            environment: 'production',
            notes: 'Operacao principal de coleta e tracking contratada pelo tenant.',
          },
        ],
        features: [
          {
            featureKey: 'returns_portal',
            enabled: true,
            source: 'contract',
            notes: 'Portal principal de operacao habilitado.',
          },
          {
            featureKey: 'refund_manual_review',
            enabled: true,
            source: 'operations',
            notes: 'CS valida casos de estorno com revisao humana.',
          },
        ],
        customizations: [
          {
            title: 'Fluxo prioritario de coleta',
            description:
              'Coletas de alto valor seguem janela dedicada e retorno manual do suporte.',
            riskLevel: 'high',
            operationalNote:
              'Antes de responder, conferir janela combinada e fila operacional dedicada.',
            status: 'active',
          },
        ],
        alerts: [
          {
            severity: 'warning',
            title: 'Janela de ERP reduzida',
            description:
              'Evitar respostas conclusivas fora da janela homologada de sincronizacao do ERP.',
          },
        ],
      },
    },
    {
      slug: 'support-qa-b',
      legalName: 'Support QA Tenant B Ltda',
      displayName: 'Support QA Tenant B',
      contact: {
        fullName: 'Rafael Integracoes QA',
        email: 'rafael.integracoes@support-qa-b.local',
        phone: '+55 11 91000-0002',
        jobTitle: 'Analista de Integracoes',
      },
      customerAccount: {
        productLine: 'after_sale',
        operationalStatus: 'limited',
        accountTier: 'growth',
        internalNotes:
          'Tenant B opera com stack mais simples e depende de apoio tecnico pontual.',
        operationalFlags: {
          restricted_support_window: true,
        },
        integrations: [
          {
            integrationType: 'ecommerce_platform',
            provider: 'shopify',
            status: 'active',
            environment: 'production',
            notes: 'Plataforma de ecommerce principal do tenant B.',
          },
        ],
        features: [
          {
            featureKey: 'basic_returns_flow',
            enabled: true,
            source: 'contract',
            notes: 'Fluxo basico ativo para operacao do tenant B.',
          },
        ],
        customizations: [
          {
            title: 'Motivo customizado de homologacao',
            description:
              'Tenant B depende de motivo especial durante ajustes de onboarding estendido.',
            riskLevel: 'medium',
            operationalNote:
              'Se o ticket tocar homologacao, responder com cautela e revisar a regra ativa.',
            status: 'active',
          },
        ],
        alerts: [
          {
            severity: 'info',
            title: 'Onboarding estendido',
            description:
              'Acompanhar chamados do tenant B considerando a fase atual de onboarding assistido.',
          },
        ],
      },
    },
  ],
  tickets: [
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Conciliacao de devolucoes com atraso',
      description:
        'Cliente B2B reporta atraso na conciliacao das devolucoes aprovadas na plataforma.',
      priority: 'high',
      severity: 'medium',
      source: 'portal',
      assignee: 'support-agent-a',
      status: 'in_progress',
      publicMessage:
        'Recebemos o caso e estamos validando a trilha operacional da conciliacao.',
      internalNote:
        'Validar lote de conciliacao, janela de sincronizacao e discrepancias por tenant.',
      extraTimelineEntries: 18,
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Webhook sem retorno na integracao ERP',
      description:
        'Tenant tecnico informa que o webhook de atualizacao de status nao retornou confirmacao.',
      priority: 'urgent',
      severity: 'critical',
      source: 'api',
      assignee: null,
      status: 'waiting_engineering',
      publicMessage:
        'Registramos o incidente e escalamos a validacao tecnica do endpoint informado.',
      internalNote:
        'Conferir timeout, retries e eventuais bloqueios no endpoint do tenant.',
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Etiqueta sem baixa automatica',
      description:
        'Equipe operacional relata que etiquetas expedidas nao estao baixando automaticamente no tenant.',
      priority: 'high',
      severity: 'medium',
      source: 'email',
      assignee: 'support-manager-a',
      status: 'triage',
      publicMessage:
        'Iniciamos a triagem do fluxo logistico e vamos retornar com o proximo passo.',
      internalNote:
        'Cruzar webhook da transportadora com o reconciliador interno antes de responder.',
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Painel de SLA interno desalinhado',
      description:
        'CS percebeu divergencia entre a fila interna e a expectativa contratual do cliente.',
      priority: 'normal',
      severity: 'low',
      source: 'internal',
      assignee: null,
      status: 'waiting_customer',
      publicMessage:
        'Pedimos confirmacao do horario de corte aplicado pelo cliente para revisar a fila.',
      internalNote:
        'Nao tratar como SLA de produto ainda; so validar entendimento operacional.',
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Reenvio de coleta sem tracking',
      description:
        'Operacao informou reenvio sem numero de rastreio disponivel para o tenant.',
      priority: 'normal',
      severity: 'medium',
      source: 'phone',
      assignee: 'support-agent-a',
      status: 'waiting_support',
      publicMessage:
        'Estamos consolidando a trilha do reenvio para responder com status unico.',
      internalNote:
        'Buscar correlacao entre coleta original e ordem de reenvio no tenant.',
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Divergencia na regra de expedicao',
      description:
        'Fluxo de expedicao apresentou comportamento diferente do combinado no rollout do cliente.',
      priority: 'urgent',
      severity: 'high',
      source: 'portal',
      assignee: 'support-manager-a',
      status: 'in_progress',
      publicMessage:
        'Caso priorizado pelo suporte. Estamos revisando a regra operacional aplicada.',
      internalNote:
        'Comparar tenant settings atuais com a baseline de implantacao aprovada.',
    },
    {
      tenantSlug: 'support-qa-a',
      title: 'QA Support | Ajuste de motivo pendente em homologacao',
      description:
        'Mudanca de motivo ainda pendente de aprovacao final do cliente em homologacao.',
      priority: 'low',
      severity: 'low',
      source: 'internal',
      assignee: null,
      status: 'new',
      publicMessage:
        'Ticket aberto para acompanhar a aprovacao final antes de aplicar a configuracao.',
      internalNote:
        'Sem acao tecnica agora. Aguardar sinal de CS.',
    },
    {
      tenantSlug: 'support-qa-b',
      title: 'QA Support | Divergencia de tracking em tenant B',
      description:
        'Tenant B reportou divergencia pontual entre tracking externo e status refletido no app.',
      priority: 'high',
      severity: 'medium',
      source: 'api',
      assignee: 'support-agent-b',
      status: 'triage',
      publicMessage:
        'Estamos verificando a divergencia do evento de tracking informado.',
      internalNote:
        'Conferir payload do tenant B e cronologia dos eventos recebidos.',
    },
    {
      tenantSlug: 'support-qa-b',
      title: 'QA Support | Regra de motivo precisa de ajuste',
      description:
        'CS pediu orientacao para uma regra de motivo que deixou de refletir a politica atual do cliente.',
      priority: 'normal',
      severity: 'low',
      source: 'internal',
      assignee: 'support-manager-a',
      status: 'waiting_customer',
      publicMessage:
        'Solicitamos a confirmacao do novo criterio operacional para concluir a configuracao.',
      internalNote:
        'Aguardando retorno do cliente com o mapeamento final dos motivos aprovados.',
    },
  ],
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function localSupabaseCommandArgs(args) {
  const localSupabaseBinary = join(
    process.cwd(),
    'node_modules',
    'supabase',
    'bin',
    process.platform === 'win32' ? 'supabase.exe' : 'supabase',
  );

  if (existsSync(localSupabaseBinary)) {
    return {
      command: localSupabaseBinary,
      args,
    };
  }

  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['supabase', ...args],
  };
}

function runProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    ...options,
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const detail = [result.stderr?.trim(), result.stdout?.trim()]
      .filter(Boolean)
      .join('\n');
    fail(detail || `Falha ao executar ${command}.`);
  }

  return result.stdout?.trim() ?? '';
}

function runSupabaseStatusEnv() {
  const { command, args } = localSupabaseCommandArgs(['status', '-o', 'env']);
  const stdout = runProcess(command, args);
  const envMap = new Map();

  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (!match) {
      continue;
    }

    envMap.set(match[1], match[2]);
  }

  return envMap;
}

function assertLocalOnly(envMap) {
  const apiUrl = envMap.get('API_URL') ?? '';
  const dbUrl = envMap.get('DB_URL') ?? '';
  const serviceRoleKey = envMap.get('SERVICE_ROLE_KEY') ?? '';

  const isLocalApi =
    apiUrl.startsWith('http://127.0.0.1:') ||
    apiUrl.startsWith('http://localhost:');
  const isLocalDb = dbUrl.includes('@127.0.0.1:') || dbUrl.includes('@localhost:');

  if (!isLocalApi || !isLocalDb || !serviceRoleKey) {
    fail(
      'Fixture de suporte bloqueada: este script so pode rodar contra o Supabase local com API_URL/DB_URL locais e SERVICE_ROLE_KEY local.',
    );
  }

  return {
    apiUrl,
    serviceRoleKey,
  };
}

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

function runSupabaseDbQuery(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'genius-support-os-support-fixture-'));
  const tempFile = join(tempDir, 'query.sql');
  writeFileSync(tempFile, `${sql.trim()}\n`, 'utf8');

  const { command, args } = localSupabaseCommandArgs([
    'db',
    'query',
    '--local',
    '--file',
    tempFile,
    '--output',
    'json',
  ]);

  try {
    const stdout = runProcess(command, args);
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      if (/^(INSERT|UPDATE|DELETE|BEGIN|COMMIT|SET|RESET)\b/i.test(stdout.trim())) {
        return { rows: [] };
      }

      throw new Error(stdout);
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) {
      return parsed;
    }

    if (Array.isArray(parsed)) {
      const rowsEntry = [...parsed].reverse().find((entry) => Array.isArray(entry?.rows));
      return rowsEntry ?? { rows: [] };
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.results)) {
      const rowsEntry = [...parsed.results]
        .reverse()
        .find((entry) => Array.isArray(entry?.rows));
      return rowsEntry ?? { rows: [] };
    }

    return { rows: [] };
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : 'Nao foi possivel interpretar a resposta JSON do Supabase CLI.',
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function queryAuthUserByEmail(email) {
  const result = runSupabaseDbQuery(`
    select id::text as id
    from auth.users
    where email = '${sqlEscape(email)}'
    limit 1;
  `);

  return result.rows?.[0] ?? null;
}

async function createOrUpdateAuthUser({
  apiUrl,
  serviceRoleKey,
  email,
  password,
  fullName,
}) {
  const existingUser = queryAuthUserByEmail(email);
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      name: fullName,
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
    },
  };

  if (existingUser?.id) {
    const updateResponse = await fetch(`${apiUrl}/auth/v1/admin/users/${existingUser.id}`, {
      method: 'PUT',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      fail(`Falha ao atualizar usuario Auth local ${email}: ${updateResponse.status} ${detail}`);
    }

    return updateResponse.json();
  }

  const createResponse = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createResponse.ok) {
    const detail = await createResponse.text();
    fail(`Falha ao criar usuario Auth local ${email}: ${createResponse.status} ${detail}`);
  }

  return createResponse.json();
}

function queryProfileByEmail(email) {
  const result = runSupabaseDbQuery(`
    select
      id::text as id,
      is_active
    from public.profiles
    where email = '${sqlEscape(email)}'
    limit 1;
  `);

  return result.rows?.[0] ?? null;
}

function bootstrapFirstPlatformAdmin(userId) {
  const result = spawnSync(
    process.execPath,
    [
      'supabase/bootstrap/bootstrap-first-platform-admin.mjs',
      '--local',
      '--user-id',
      userId,
      '--reason',
      'local support fixture bootstrap',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    },
  );

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const detail = [result.stderr?.trim(), result.stdout?.trim()]
      .filter(Boolean)
      .join('\n');
    fail(detail || 'Falha ao executar bootstrap local do platform_admin de suporte.');
  }
}

function ensurePlatformAdminRole(userId) {
  const current = runSupabaseDbQuery(`
    select
      (
        select count(*)::integer
        from public.user_global_roles
        where role = 'platform_admin'::public.platform_role
      ) as platform_admin_count,
      exists(
        select 1
        from public.user_global_roles
        where user_id = '${sqlEscape(userId)}'::uuid
          and role = 'platform_admin'::public.platform_role
      ) as is_platform_admin;
  `);

  const row = current.rows?.[0];
  if (row?.is_platform_admin) {
    return;
  }

  if ((row?.platform_admin_count ?? 0) === 0) {
    bootstrapFirstPlatformAdmin(userId);
    return;
  }

  runSupabaseDbQuery(`
    insert into public.user_global_roles (user_id, role)
    select '${sqlEscape(userId)}'::uuid, 'platform_admin'::public.platform_role
    where not exists (
      select 1
      from public.user_global_roles
      where user_id = '${sqlEscape(userId)}'::uuid
        and role = 'platform_admin'::public.platform_role
    );
  `);
}

function ensureGlobalRole({ actorUserId, userId, role }) {
  runSupabaseDbQuery(`
    insert into public.user_global_roles (
      user_id,
      role,
      created_by_user_id,
      updated_by_user_id
    )
    select
      '${sqlEscape(userId)}'::uuid,
      '${role}'::public.platform_role,
      '${sqlEscape(actorUserId)}'::uuid,
      '${sqlEscape(actorUserId)}'::uuid
    where not exists (
      select 1
      from public.user_global_roles
      where user_id = '${sqlEscape(userId)}'::uuid
        and role = '${role}'::public.platform_role
    );
  `);
}

function ensureTenantMembership({ actorUserId, tenantId, userId, role = 'tenant_viewer' }) {
  runSupabaseDbQuery(`
    insert into public.tenant_memberships (
      tenant_id,
      user_id,
      role,
      status,
      invited_by_user_id,
      created_by_user_id,
      updated_by_user_id
    )
    select
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(userId)}'::uuid,
      '${role}'::public.tenant_role,
      'active'::public.membership_status,
      '${sqlEscape(actorUserId)}'::uuid,
      '${sqlEscape(actorUserId)}'::uuid,
      '${sqlEscape(actorUserId)}'::uuid
    where not exists (
      select 1
      from public.tenant_memberships
      where tenant_id = '${sqlEscape(tenantId)}'::uuid
        and user_id = '${sqlEscape(userId)}'::uuid
    );
  `);

  runSupabaseDbQuery(`
    update public.tenant_memberships
    set
      status = 'active'::public.membership_status,
      role = '${role}'::public.tenant_role,
      updated_by_user_id = '${sqlEscape(actorUserId)}'::uuid
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
      and user_id = '${sqlEscape(userId)}'::uuid;
  `);
}

function ensureTenant(adminUserId, tenant) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.tenants
    where slug = '${sqlEscape(tenant.slug)}'
    limit 1;
  `);

  const existingId = existing.rows?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = runSupabaseDbQuery(`
    insert into public.tenants (
      slug,
      legal_name,
      display_name,
      status,
      data_region,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '${sqlEscape(tenant.slug)}',
      '${sqlEscape(tenant.legalName)}',
      '${sqlEscape(tenant.displayName)}',
      'active'::public.tenant_status,
      'sa-east-1',
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const tenantId = created.rows?.[0]?.id;
  if (!tenantId) {
    fail(`Nao foi possivel criar o tenant ${tenant.slug}.`);
  }

  return tenantId;
}

function ensureCustomerAccountProfile(adminUserId, tenantId, customerAccount) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.customer_account_profiles
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
    limit 1;
  `);

  const internalNotesSql = customerAccount.internalNotes
    ? `'${sqlEscape(customerAccount.internalNotes)}'`
    : 'null';
  const flagsSql = `'${sqlEscape(JSON.stringify(customerAccount.operationalFlags ?? {}))}'::jsonb`;

  if (existing.rows?.[0]?.id) {
    runSupabaseDbQuery(`
      update public.customer_account_profiles
      set
        product_line = '${customerAccount.productLine}'::public.customer_product_line,
        operational_status = '${customerAccount.operationalStatus}'::public.customer_operational_status,
        account_tier = '${sqlEscape(customerAccount.accountTier)}',
        internal_notes = ${internalNotesSql},
        operational_flags = ${flagsSql},
        updated_by_user_id = '${sqlEscape(adminUserId)}'::uuid
      where tenant_id = '${sqlEscape(tenantId)}'::uuid;
    `);

    return existing.rows[0].id;
  }

  const created = runSupabaseDbQuery(`
    insert into public.customer_account_profiles (
      tenant_id,
      product_line,
      operational_status,
      account_tier,
      internal_notes,
      operational_flags,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${customerAccount.productLine}'::public.customer_product_line,
      '${customerAccount.operationalStatus}'::public.customer_operational_status,
      '${sqlEscape(customerAccount.accountTier)}',
      ${internalNotesSql},
      ${flagsSql},
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  return created.rows?.[0]?.id ?? null;
}

function ensureCustomerAccountIntegrations(adminUserId, tenantId, customerAccount) {
  for (const integration of customerAccount.integrations ?? []) {
    const existing = runSupabaseDbQuery(`
      select id::text as id
      from public.customer_account_integrations
      where tenant_id = '${sqlEscape(tenantId)}'::uuid
        and integration_type = '${integration.integrationType}'::public.customer_integration_type
        and lower(provider) = lower('${sqlEscape(integration.provider)}')
        and environment = '${integration.environment}'::public.customer_integration_environment
      limit 1;
    `);

    const notesSql = integration.notes ? `'${sqlEscape(integration.notes)}'` : 'null';

    if (existing.rows?.[0]?.id) {
      runSupabaseDbQuery(`
        update public.customer_account_integrations
        set
          status = '${integration.status}'::public.customer_integration_status,
          notes = ${notesSql},
          updated_by_user_id = '${sqlEscape(adminUserId)}'::uuid
        where id = '${sqlEscape(existing.rows[0].id)}'::uuid;
      `);
      continue;
    }

    runSupabaseDbQuery(`
      insert into public.customer_account_integrations (
        tenant_id,
        integration_type,
        provider,
        status,
        environment,
        notes,
        created_by_user_id,
        updated_by_user_id
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${integration.integrationType}'::public.customer_integration_type,
        '${sqlEscape(integration.provider)}',
        '${integration.status}'::public.customer_integration_status,
        '${integration.environment}'::public.customer_integration_environment,
        ${notesSql},
        '${sqlEscape(adminUserId)}'::uuid,
        '${sqlEscape(adminUserId)}'::uuid
      );
    `);
  }
}

function ensureCustomerAccountFeatures(adminUserId, tenantId, customerAccount) {
  for (const feature of customerAccount.features ?? []) {
    const existing = runSupabaseDbQuery(`
      select id::text as id
      from public.customer_account_features
      where tenant_id = '${sqlEscape(tenantId)}'::uuid
        and lower(feature_key) = lower('${sqlEscape(feature.featureKey)}')
      limit 1;
    `);

    const notesSql = feature.notes ? `'${sqlEscape(feature.notes)}'` : 'null';
    const enabledSql = feature.enabled ? 'true' : 'false';

    if (existing.rows?.[0]?.id) {
      runSupabaseDbQuery(`
        update public.customer_account_features
        set
          enabled = ${enabledSql},
          source = '${sqlEscape(feature.source)}',
          notes = ${notesSql},
          updated_by_user_id = '${sqlEscape(adminUserId)}'::uuid
        where id = '${sqlEscape(existing.rows[0].id)}'::uuid;
      `);
      continue;
    }

    runSupabaseDbQuery(`
      insert into public.customer_account_features (
        tenant_id,
        feature_key,
        enabled,
        source,
        notes,
        created_by_user_id,
        updated_by_user_id
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(feature.featureKey)}',
        ${enabledSql},
        '${sqlEscape(feature.source)}',
        ${notesSql},
        '${sqlEscape(adminUserId)}'::uuid,
        '${sqlEscape(adminUserId)}'::uuid
      );
    `);
  }
}

function ensureCustomerAccountCustomizations(adminUserId, tenantId, customerAccount) {
  for (const customization of customerAccount.customizations ?? []) {
    const existing = runSupabaseDbQuery(`
      select id::text as id
      from public.customer_account_customizations
      where tenant_id = '${sqlEscape(tenantId)}'::uuid
        and lower(title) = lower('${sqlEscape(customization.title)}')
      limit 1;
    `);

    const noteSql = customization.operationalNote
      ? `'${sqlEscape(customization.operationalNote)}'`
      : 'null';

    if (existing.rows?.[0]?.id) {
      runSupabaseDbQuery(`
        update public.customer_account_customizations
        set
          description = '${sqlEscape(customization.description)}',
          risk_level = '${customization.riskLevel}'::public.customer_customization_risk_level,
          operational_note = ${noteSql},
          status = '${sqlEscape(customization.status)}',
          updated_by_user_id = '${sqlEscape(adminUserId)}'::uuid
        where id = '${sqlEscape(existing.rows[0].id)}'::uuid;
      `);
      continue;
    }

    runSupabaseDbQuery(`
      insert into public.customer_account_customizations (
        tenant_id,
        title,
        description,
        risk_level,
        operational_note,
        status,
        created_by_user_id,
        updated_by_user_id
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(customization.title)}',
        '${sqlEscape(customization.description)}',
        '${customization.riskLevel}'::public.customer_customization_risk_level,
        ${noteSql},
        '${sqlEscape(customization.status)}',
        '${sqlEscape(adminUserId)}'::uuid,
        '${sqlEscape(adminUserId)}'::uuid
      );
    `);
  }
}

function ensureCustomerAccountAlerts(adminUserId, tenantId, customerAccount) {
  for (const alert of customerAccount.alerts ?? []) {
    const existing = runSupabaseDbQuery(`
      select id::text as id
      from public.customer_account_alerts
      where tenant_id = '${sqlEscape(tenantId)}'::uuid
        and lower(title) = lower('${sqlEscape(alert.title)}')
      limit 1;
    `);

    if (existing.rows?.[0]?.id) {
      runSupabaseDbQuery(`
        update public.customer_account_alerts
        set
          severity = '${alert.severity}'::public.customer_alert_severity,
          description = '${sqlEscape(alert.description)}',
          active = true,
          updated_by_user_id = '${sqlEscape(adminUserId)}'::uuid
        where id = '${sqlEscape(existing.rows[0].id)}'::uuid;
      `);
      continue;
    }

    runSupabaseDbQuery(`
      insert into public.customer_account_alerts (
        tenant_id,
        severity,
        title,
        description,
        active,
        created_by_user_id,
        updated_by_user_id
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${alert.severity}'::public.customer_alert_severity,
        '${sqlEscape(alert.title)}',
        '${sqlEscape(alert.description)}',
        true,
        '${sqlEscape(adminUserId)}'::uuid,
        '${sqlEscape(adminUserId)}'::uuid
      );
    `);
  }
}

function ensureContact(adminUserId, tenantId, contact) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.tenant_contacts
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
      and email = '${sqlEscape(contact.email)}'
    limit 1;
  `);

  const existingId = existing.rows?.[0]?.id;
  if (existingId) {
    return existingId;
  }

  const created = runSupabaseDbQuery(`
    insert into public.tenant_contacts (
      tenant_id,
      linked_user_id,
      full_name,
      email,
      phone,
      job_title,
      is_primary,
      is_active,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      null,
      '${sqlEscape(contact.fullName)}',
      '${sqlEscape(contact.email)}',
      '${sqlEscape(contact.phone)}',
      '${sqlEscape(contact.jobTitle)}',
      true,
      true,
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const contactId = created.rows?.[0]?.id;
  if (!contactId) {
    fail(`Nao foi possivel criar o contato do tenant ${tenantId}.`);
  }

  return contactId;
}

function queryExistingSupportTicket(tenantId, title) {
  const result = runSupabaseDbQuery(`
    select id::text as id
    from public.tickets
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
      and title = '${sqlEscape(title)}'
    limit 1;
  `);

  return result.rows?.[0]?.id ?? null;
}

function createSupportTicket({ actorUserId, tenantId, contactId, ticket }) {
  const existingTicketId = queryExistingSupportTicket(tenantId, ticket.title);
  if (existingTicketId) {
    return existingTicketId;
  }

  const assignedUserId = ticket.assignee ? ticket.assignee : null;

  const created = runSupabaseDbQuery(`
    insert into public.tickets (
      tenant_id,
      requester_contact_id,
      title,
      description,
      source,
      status,
      priority,
      severity,
      created_by_user_id,
      assigned_to_user_id,
      updated_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(contactId)}'::uuid,
      '${sqlEscape(ticket.title)}',
      '${sqlEscape(ticket.description)}',
      '${ticket.source}'::public.ticket_source,
      '${ticket.status}'::public.ticket_status,
      '${ticket.priority}'::public.ticket_priority,
      '${ticket.severity}'::public.ticket_severity,
      '${sqlEscape(actorUserId)}'::uuid,
      ${assignedUserId ? `'${sqlEscape(assignedUserId)}'::uuid` : 'null::uuid'},
      '${sqlEscape(actorUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const ticketId = created.rows?.[0]?.id;
  if (!ticketId) {
    fail(`Nao foi possivel criar o ticket ${ticket.title}.`);
  }

  runSupabaseDbQuery(`
    insert into public.ticket_events (
      tenant_id,
      ticket_id,
      event_type,
      visibility,
      actor_user_id,
      metadata
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(ticketId)}'::uuid,
      'ticket_created'::public.ticket_event_type,
      'customer'::public.message_visibility,
      '${sqlEscape(actorUserId)}'::uuid,
      '{}'::jsonb
    );
  `);

  if (assignedUserId) {
    const assignment = runSupabaseDbQuery(`
      insert into public.ticket_assignments (
        tenant_id,
        ticket_id,
        assignment_kind,
        assigned_to_user_id,
        previous_assigned_to_user_id,
        assigned_by_user_id
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(ticketId)}'::uuid,
        'assigned'::public.ticket_assignment_kind,
        '${sqlEscape(assignedUserId)}'::uuid,
        null,
        '${sqlEscape(actorUserId)}'::uuid
      )
      returning id::text as id;
    `);

    const assignmentId = assignment.rows?.[0]?.id;
    if (assignmentId) {
      runSupabaseDbQuery(`
        insert into public.ticket_events (
          tenant_id,
          ticket_id,
          event_type,
          visibility,
          actor_user_id,
          assignment_id,
          metadata
        )
        values (
          '${sqlEscape(tenantId)}'::uuid,
          '${sqlEscape(ticketId)}'::uuid,
          'assigned'::public.ticket_event_type,
          'internal'::public.message_visibility,
          '${sqlEscape(actorUserId)}'::uuid,
          '${sqlEscape(assignmentId)}'::uuid,
          jsonb_build_object('assigned_to_user_id', '${sqlEscape(assignedUserId)}')
        );
      `);
    }
  }

  const publicMessage = runSupabaseDbQuery(`
    insert into public.ticket_messages (
      tenant_id,
      ticket_id,
      visibility,
      body,
      created_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(ticketId)}'::uuid,
      'customer'::public.message_visibility,
      '${sqlEscape(ticket.publicMessage)}',
      '${sqlEscape(actorUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const publicMessageId = publicMessage.rows?.[0]?.id;
  if (publicMessageId) {
    runSupabaseDbQuery(`
      insert into public.ticket_events (
        tenant_id,
        ticket_id,
        event_type,
        visibility,
        actor_user_id,
        message_id,
        metadata
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(ticketId)}'::uuid,
        'message_added'::public.ticket_event_type,
        'customer'::public.message_visibility,
        '${sqlEscape(actorUserId)}'::uuid,
        '${sqlEscape(publicMessageId)}'::uuid,
        '{}'::jsonb
      );
    `);
  }

  const internalMessage = runSupabaseDbQuery(`
    insert into public.ticket_messages (
      tenant_id,
      ticket_id,
      visibility,
      body,
      created_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(ticketId)}'::uuid,
      'internal'::public.message_visibility,
      '${sqlEscape(ticket.internalNote)}',
      '${sqlEscape(actorUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const internalMessageId = internalMessage.rows?.[0]?.id;
  if (internalMessageId) {
    runSupabaseDbQuery(`
      insert into public.ticket_events (
        tenant_id,
        ticket_id,
        event_type,
        visibility,
        actor_user_id,
        message_id,
        metadata
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(ticketId)}'::uuid,
        'internal_note_added'::public.ticket_event_type,
        'internal'::public.message_visibility,
        '${sqlEscape(actorUserId)}'::uuid,
        '${sqlEscape(internalMessageId)}'::uuid,
        '{}'::jsonb
      );
    `);
  }

  if (ticket.status !== 'new') {
    runSupabaseDbQuery(`
      insert into public.ticket_events (
        tenant_id,
        ticket_id,
        event_type,
        visibility,
        actor_user_id,
        metadata
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(ticketId)}'::uuid,
        ${ticket.status === 'resolved' ? "'resolved'::public.ticket_event_type" : ticket.status === 'cancelled' ? "'cancelled'::public.ticket_event_type" : "'status_changed'::public.ticket_event_type"},
        'internal'::public.message_visibility,
        '${sqlEscape(actorUserId)}'::uuid,
        jsonb_build_object(
          'status', '${ticket.status}',
          'note', 'Fixture local do Support Workspace'
        )
      );
    `);
  }

  const extraTimelineEntries = Number(ticket.extraTimelineEntries ?? 0);
  for (let index = 1; index <= extraTimelineEntries; index += 1) {
    const visibility = index % 3 === 0 ? 'internal' : 'customer';
    const body =
      visibility === 'internal'
        ? `Nota interna extra ${index} para validar continuidade operacional do ticket.`
        : `Atualizacao publica extra ${index} para manter o cliente alinhado sobre a tratativa.`;

    const extraMessage = runSupabaseDbQuery(`
      insert into public.ticket_messages (
        tenant_id,
        ticket_id,
        visibility,
        body,
        created_by_user_id,
        metadata
      )
      values (
        '${sqlEscape(tenantId)}'::uuid,
        '${sqlEscape(ticketId)}'::uuid,
        '${visibility}'::public.message_visibility,
        '${sqlEscape(body)}',
        '${sqlEscape(actorUserId)}'::uuid,
        jsonb_build_object('fixture_extra_index', ${index})
      )
      returning id::text as id;
    `);

    const extraMessageId = extraMessage.rows?.[0]?.id;
    if (extraMessageId) {
      runSupabaseDbQuery(`
        insert into public.ticket_events (
          tenant_id,
          ticket_id,
          event_type,
          visibility,
          actor_user_id,
          message_id,
          metadata
        )
        values (
          '${sqlEscape(tenantId)}'::uuid,
          '${sqlEscape(ticketId)}'::uuid,
          ${visibility === 'internal' ? "'internal_note_added'::public.ticket_event_type" : "'message_added'::public.ticket_event_type"},
          '${visibility}'::public.message_visibility,
          '${sqlEscape(actorUserId)}'::uuid,
          '${sqlEscape(extraMessageId)}'::uuid,
          jsonb_build_object('fixture_extra_index', ${index})
        );
      `);
    }
  }

  return ticketId;
}

function clearFixtureTickets() {
  return null;
}

async function main() {
  const envMap = runSupabaseStatusEnv();
  const { apiUrl, serviceRoleKey } = assertLocalOnly(envMap);

  const qaAdmin = await createOrUpdateAuthUser({
    apiUrl,
    serviceRoleKey,
    ...FIXTURE.qaAdmin,
  });

  const profile = queryProfileByEmail(FIXTURE.qaAdmin.email);
  if (!profile?.id || !profile.is_active) {
    fail('O profile do QA admin de suporte nao foi materializado corretamente.');
  }

  ensurePlatformAdminRole(profile.id);

  const tenantMap = new Map();
  const contactMap = new Map();

  for (const tenant of FIXTURE.tenants) {
    const tenantId = ensureTenant(profile.id, tenant);
    tenantMap.set(tenant.slug, tenantId);
    contactMap.set(tenant.slug, ensureContact(profile.id, tenantId, tenant.contact));
    ensureCustomerAccountProfile(profile.id, tenantId, tenant.customerAccount);
    ensureCustomerAccountIntegrations(profile.id, tenantId, tenant.customerAccount);
    ensureCustomerAccountFeatures(profile.id, tenantId, tenant.customerAccount);
    ensureCustomerAccountCustomizations(profile.id, tenantId, tenant.customerAccount);
    ensureCustomerAccountAlerts(profile.id, tenantId, tenant.customerAccount);
    ensureTenantMembership({
      actorUserId: profile.id,
      tenantId,
      userId: profile.id,
    });
  }

  const operatorMap = new Map([['qa-admin', profile.id]]);

  for (const agent of FIXTURE.agents) {
    const authUser = await createOrUpdateAuthUser({
      apiUrl,
      serviceRoleKey,
      email: agent.email,
      password: agent.password,
      fullName: agent.fullName,
    });

    const agentProfile = queryProfileByEmail(agent.email);
    if (!agentProfile?.id || !agentProfile.is_active) {
      fail(`O profile do agente local ${agent.email} nao foi materializado corretamente.`);
    }

    const tenantId = tenantMap.get(agent.tenantSlug);
    if (!tenantId) {
      fail(`Tenant ausente para o agente local ${agent.email}.`);
    }

    ensureGlobalRole({
      actorUserId: profile.id,
      userId: agentProfile.id,
      role: agent.globalRole,
    });
    ensureTenantMembership({
      actorUserId: profile.id,
      tenantId,
      userId: agentProfile.id,
    });

    operatorMap.set(agent.key, agentProfile.id);
    operatorMap.set(agent.email, agentProfile.id);
    operatorMap.set(authUser.id, agentProfile.id);
  }

  clearFixtureTickets();

  const createdTickets = [];
  for (const ticket of FIXTURE.tickets) {
    const tenantId = tenantMap.get(ticket.tenantSlug);
    const contactId = contactMap.get(ticket.tenantSlug);

    if (!tenantId || !contactId) {
      fail(`Tenant ou contato ausente para o fixture ${ticket.title}.`);
    }

    const ticketId = createSupportTicket({
      actorUserId:
        ticket.assignee && operatorMap.has(ticket.assignee)
          ? operatorMap.get(ticket.assignee)
          : profile.id,
      tenantId,
      contactId,
      ticket: {
        ...ticket,
        assignee:
          ticket.assignee && operatorMap.has(ticket.assignee) ? operatorMap.get(ticket.assignee) : null,
      },
    });

    createdTickets.push({
      id: ticketId,
      title: ticket.title,
      tenant_slug: ticket.tenantSlug,
      status: ticket.status,
    });
  }

  console.log(
    JSON.stringify(
      {
        fixture: 'local-support-workspace',
        remote_used: false,
        qa_admin: {
          user_id: qaAdmin.id,
          profile_id: profile.id,
          email: FIXTURE.qaAdmin.email,
          password: FIXTURE.qaAdmin.password,
        },
        support_agents: FIXTURE.agents.map((agent) => ({
          key: agent.key,
          email: agent.email,
          password: agent.password,
          tenant_slug: agent.tenantSlug,
          user_id: operatorMap.get(agent.key),
        })),
        tenants: FIXTURE.tenants.map((tenant) => ({
          slug: tenant.slug,
          id: tenantMap.get(tenant.slug),
        })),
        customer_accounts: FIXTURE.tenants.map((tenant) => ({
          tenant_slug: tenant.slug,
          product_line: tenant.customerAccount.productLine,
          integrations: tenant.customerAccount.integrations.length,
          features: tenant.customerAccount.features.length,
          customizations: tenant.customerAccount.customizations.length,
          alerts: tenant.customerAccount.alerts.length,
        })),
        tickets: createdTickets,
      },
      null,
      2,
    ),
  );
}

await main();
