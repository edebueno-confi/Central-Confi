import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ACTOR_USER_ID = 'f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    ...options,
  });

  if (result.error) {
    fail(result.error.message);
  }

  return result;
}

function localSupabaseBinary(args) {
  const localBinary = join(
    process.cwd(),
    'node_modules',
    'supabase',
    'bin',
    process.platform === 'win32' ? 'supabase.exe' : 'supabase',
  );

  if (existsSync(localBinary)) {
    return { command: localBinary, args };
  }

  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['supabase', ...args],
  };
}

function executeSql(sql) {
  const tempDir = mkdtempSync(join(tmpdir(), 'genius-phase4-3-import-verify-'));
  const sqlFile = join(tempDir, 'verify.sql');
  writeFileSync(sqlFile, `${sql}\n`, 'utf8');

  try {
    const { command, args } = localSupabaseBinary(['db', 'query', '--local', '--file', sqlFile]);
    const result = run(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    if (result.status !== 0) {
      const detail = [result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join('\n');
      fail(detail || 'Falha ao executar SQL local de verificação.');
    }

    return result.stdout?.trim() ?? '';
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function seedActor() {
  executeSql(`
    with ensured_user as (
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      values (
        '00000000-0000-0000-0000-000000000000',
        '${ACTOR_USER_ID}',
        'authenticated',
        'authenticated',
        'space-aware-import@genius.local',
        crypt('password', gen_salt('bf')),
        timezone('utc', now()),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Space Aware Import"}'::jsonb,
        timezone('utc', now()),
        timezone('utc', now())
      )
      on conflict (id) do update
      set updated_at = excluded.updated_at
      returning id
    )
    insert into public.user_global_roles (user_id, role)
    select id, 'platform_admin'::public.platform_role
    from ensured_user
    on conflict do nothing;
  `);
}

function expectMissingSpaceFailure() {
  const result = run(
    process.execPath,
    ['scripts/knowledge/import-octadesk-drafts.mjs', '--local', '--limit', '1'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status === 0) {
    fail('Import sem space deveria falhar, mas o comando terminou com sucesso.');
  }

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (
    !output.includes('--space-slug')
    && !output.includes('--knowledge-space-id')
    && !output.toLowerCase().includes('destino')
  ) {
    fail(`Falha inesperada ao validar import sem space:\n${output}`);
  }
}

function runSpaceAwareImport() {
  const result = run(
    process.execPath,
    [
      'scripts/knowledge/import-octadesk-drafts.mjs',
      '--local',
      '--apply',
      '--limit',
      '1',
      '--actor-user-id',
      ACTOR_USER_ID,
      '--space-slug',
      'genius',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const detail = [result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join('\n');
    fail(detail || 'Import com space explícito falhou.');
  }

  return result.stdout?.trim() ?? '';
}

function assertImportedArticleSpaceAware() {
  const output = executeSql(`
    select json_build_object(
      'space_slug',
      (
        select ks.slug
        from public.knowledge_articles as ka
        join public.knowledge_spaces as ks
          on ks.id = ka.knowledge_space_id
        where ka.source_hash is not null
        order by ka.created_at desc
        limit 1
      ),
      'article_source_hash',
      (
        select ka.source_hash
        from public.knowledge_articles as ka
        where ka.source_hash is not null
        order by ka.created_at desc
        limit 1
      ),
      'source_row_hash',
      (
        select kas.source_hash
        from public.knowledge_article_sources as kas
        order by kas.created_at desc
        limit 1
      )
    );
  `);

  let payload;

  try {
    const parsed = JSON.parse(output);
    payload = parsed?.rows?.[0]?.json_build_object ?? parsed;
  } catch {
    payload = null;
  }

  if (!payload) {
    fail(`Não foi possível interpretar a verificação SQL do import:\n${output}`);
  }

  if (payload.space_slug !== 'genius') {
    fail(`Artigo importado não ficou associado ao space genius: ${JSON.stringify(payload)}`);
  }

  if (!payload.article_source_hash || payload.article_source_hash !== payload.source_row_hash) {
    fail(`source_hash não foi preservado entre artigo e trilha de origem: ${JSON.stringify(payload)}`);
  }
}

function main() {
  seedActor();
  expectMissingSpaceFailure();
  runSpaceAwareImport();
  assertImportedArticleSpaceAware();
  console.log('Octadesk import space-aware verificado com sucesso.');
}

main();
