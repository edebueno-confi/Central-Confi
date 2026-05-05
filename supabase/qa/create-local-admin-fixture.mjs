import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FIXTURE = {
  admin: {
    email: 'ede.oliveira@confi.com.vc',
    password: 'Admin123!',
    fullName: 'Eduardo Oliveira',
  },
  denied: {
    email: 'qa.local.denied@genius.local',
    password: 'Local-QA-NoRole-Only-2026!',
    fullName: 'QA Local No Role User',
  },
  tenant: {
    slug: 'qa-local-tenant',
    legalName: 'QA Local Tenant Ltda',
    displayName: 'QA Local Tenant',
    dataRegion: 'sa-east-1',
  },
  contact: {
    fullName: 'QA Operations Contact',
    email: 'ops.qa.local@genius.local',
    phone: '+55 11 90000-0000',
    jobTitle: 'QA Operations',
  },
  membership: {
    role: 'tenant_admin',
    status: 'active',
  },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  return {
    includeDeniedUser: argv.includes('--with-denied-user'),
  };
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
      'Fixture de QA bloqueada: este script so pode rodar contra o Supabase local com API_URL/DB_URL locais e SERVICE_ROLE_KEY local.',
    );
  }

  return {
    apiUrl,
    serviceRoleKey,
  };
}

function runSupabaseDbQuery(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'genius-support-os-qa-fixture-'));
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
    return JSON.parse(stdout);
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

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

function queryAuthUserByEmail(email) {
  const result = runSupabaseDbQuery(`
    select
      id::text as id,
      email::text as email
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
    const updateResponse = await fetch(
      `${apiUrl}/auth/v1/admin/users/${existingUser.id}`,
      {
        method: 'PUT',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      fail(
        `Falha ao atualizar usuario Auth local ${email}: ${updateResponse.status} ${detail}`,
      );
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
    fail(
      `Falha ao criar usuario Auth local ${email}: ${createResponse.status} ${detail}`,
    );
  }

  return createResponse.json();
}

function readPlatformAdminStatus(userId) {
  const result = runSupabaseDbQuery(`
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
      ) as fixture_admin_is_platform_admin;
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
      'local qa fixture bootstrap',
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
    fail(detail || 'Falha ao executar bootstrap local do platform_admin.');
  }
}

function ensurePlatformAdminRole(userId) {
  runSupabaseDbQuery(`
    insert into public.user_global_roles (user_id, role)
    select '${sqlEscape(userId)}'::uuid, 'platform_admin'::public.platform_role
    where not exists (
      select 1
      from public.user_global_roles as ugr
      where ugr.user_id = '${sqlEscape(userId)}'::uuid
        and ugr.role = 'platform_admin'::public.platform_role
    )
    returning user_id::text as user_id;
  `);
}

function queryProfileByEmail(email) {
  const result = runSupabaseDbQuery(`
    select
      id::text as id,
      email::text as email,
      full_name::text as full_name,
      is_active
    from public.profiles
    where email = '${sqlEscape(email)}'
    limit 1;
  `);

  return result.rows?.[0] ?? null;
}

function createTenant(adminUserId) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.tenants
    where slug = '${sqlEscape(FIXTURE.tenant.slug)}'
    limit 1;
  `);

  const existingTenantId = existing.rows?.[0]?.id;
  if (existingTenantId) {
    return existingTenantId;
  }

  const result = runSupabaseDbQuery(`
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
      '${sqlEscape(FIXTURE.tenant.slug)}',
      '${sqlEscape(FIXTURE.tenant.legalName)}',
      '${sqlEscape(FIXTURE.tenant.displayName)}',
      'active'::public.tenant_status,
      '${sqlEscape(FIXTURE.tenant.dataRegion)}',
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const tenantId = result.rows?.[0]?.id;
  if (!tenantId) {
    fail('Nao foi possivel criar o tenant local de QA.');
  }

  return tenantId;
}

function createMembership({ tenantId, adminUserId }) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.tenant_memberships
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
      and user_id = '${sqlEscape(adminUserId)}'::uuid
    order by created_at asc
    limit 1;
  `);

  const existingMembershipId = existing.rows?.[0]?.id;
  if (existingMembershipId) {
    return existingMembershipId;
  }

  const result = runSupabaseDbQuery(`
    insert into public.tenant_memberships (
      tenant_id,
      user_id,
      role,
      status,
      invited_by_user_id,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      '${sqlEscape(tenantId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid,
      '${FIXTURE.membership.role}'::public.tenant_role,
      '${FIXTURE.membership.status}'::public.membership_status,
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const membershipId = result.rows?.[0]?.id;
  if (!membershipId) {
    fail('Nao foi possivel criar a membership local de QA.');
  }

  return membershipId;
}

function createTenantContact({ tenantId, adminUserId }) {
  const existing = runSupabaseDbQuery(`
    select id::text as id
    from public.tenant_contacts
    where tenant_id = '${sqlEscape(tenantId)}'::uuid
      and email = '${sqlEscape(FIXTURE.contact.email)}'
    order by created_at asc
    limit 1;
  `);

  const existingContactId = existing.rows?.[0]?.id;
  if (existingContactId) {
    return existingContactId;
  }

  const result = runSupabaseDbQuery(`
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
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(FIXTURE.contact.fullName)}',
      '${sqlEscape(FIXTURE.contact.email)}',
      '${sqlEscape(FIXTURE.contact.phone)}',
      '${sqlEscape(FIXTURE.contact.jobTitle)}',
      true,
      true,
      '${sqlEscape(adminUserId)}'::uuid,
      '${sqlEscape(adminUserId)}'::uuid
    )
    returning id::text as id;
  `);

  const contactId = result.rows?.[0]?.id;
  if (!contactId) {
    fail('Nao foi possivel criar o contato local de QA.');
  }

  return contactId;
}

function readFixtureSummary(adminUserId, deniedUserId, tenantId) {
  const result = runSupabaseDbQuery(`
    select
      '${sqlEscape(adminUserId)}'::text as admin_user_id,
      ${deniedUserId ? `'${sqlEscape(deniedUserId)}'::text` : 'null::text'} as denied_user_id,
      '${sqlEscape(tenantId)}'::text as tenant_id,
      (
        select count(*)::integer
        from public.user_global_roles
        where role = 'platform_admin'::public.platform_role
      ) as platform_admin_count,
      (
        select count(*)::integer
        from public.tenants
      ) as tenants_count,
      (
        select count(*)::integer
        from public.tenant_memberships
      ) as memberships_count,
      (
        select count(*)::integer
        from public.tenant_contacts
      ) as contacts_count,
      (
        select count(*)::integer
        from audit.audit_logs
      ) as audit_logs_count;
  `);

  return result.rows?.[0] ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envMap = runSupabaseStatusEnv();
  const { apiUrl, serviceRoleKey } = assertLocalOnly(envMap);

  const adminAuthUser = await createOrUpdateAuthUser({
    apiUrl,
    serviceRoleKey,
    email: FIXTURE.admin.email,
    password: FIXTURE.admin.password,
    fullName: FIXTURE.admin.fullName,
  });

  const adminProfile = queryProfileByEmail(FIXTURE.admin.email);
  if (!adminProfile?.id || !adminProfile.is_active) {
    fail('O profile do admin local nao foi materializado corretamente pelo trigger auth -> profiles.');
  }

  const platformAdminStatus = readPlatformAdminStatus(adminProfile.id);
  const platformAdminCount = platformAdminStatus?.platform_admin_count ?? 0;
  const fixtureAdminIsPlatformAdmin =
    platformAdminStatus?.fixture_admin_is_platform_admin ?? false;

  if (!fixtureAdminIsPlatformAdmin) {
    if (platformAdminCount !== 0) {
      ensurePlatformAdminRole(adminProfile.id);
    } else {
      bootstrapFirstPlatformAdmin(adminProfile.id);
    }
  }

  let deniedUserId = null;
  if (args.includeDeniedUser) {
    const deniedAuthUser = await createOrUpdateAuthUser({
      apiUrl,
      serviceRoleKey,
      email: FIXTURE.denied.email,
      password: FIXTURE.denied.password,
      fullName: FIXTURE.denied.fullName,
    });

    const deniedProfile = queryProfileByEmail(FIXTURE.denied.email);
    if (!deniedProfile?.id || !deniedProfile.is_active) {
      fail('O profile do usuario sem role nao foi materializado corretamente.');
    }

    deniedUserId = deniedAuthUser.id;
  }

  const tenantId = createTenant(adminProfile.id);
  const membershipId = createMembership({
    tenantId,
    adminUserId: adminProfile.id,
  });
  const contactId = createTenantContact({
    tenantId,
    adminUserId: adminProfile.id,
  });
  const summary = readFixtureSummary(adminProfile.id, deniedUserId, tenantId);

  console.log(
    JSON.stringify(
      {
        fixture: 'local-qa-only',
        remote_used: false,
        admin: {
          user_id: adminAuthUser.id,
          profile_id: adminProfile.id,
          email: FIXTURE.admin.email,
          password: FIXTURE.admin.password,
        },
        denied_user: args.includeDeniedUser
          ? {
              user_id: deniedUserId,
              email: FIXTURE.denied.email,
              password: FIXTURE.denied.password,
            }
          : null,
        tenant: {
          id: tenantId,
          slug: FIXTURE.tenant.slug,
        },
        membership: {
          id: membershipId,
          role: FIXTURE.membership.role,
          status: FIXTURE.membership.status,
        },
        contact: {
          id: contactId,
          email: FIXTURE.contact.email,
        },
        summary,
      },
      null,
      2,
    ),
  );
}

await main();
