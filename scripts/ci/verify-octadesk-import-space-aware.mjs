import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
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

function hashText(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
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

function createOctadeskFixture() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'genius-phase4-3-octadesk-fixture-'));
  const rootDir = join(tempRoot, 'articles');
  const articleDir = join(rootDir, '0001-space-aware-ci');
  const articleJsonPath = join(articleDir, 'article.json');
  const contentPath = join(articleDir, 'content.txt');
  mkdirSync(articleDir, { recursive: true });

  const article = {
    id: 'space-aware-ci-article',
    articleId: 'space-aware-ci-article',
    title: 'Space Aware CI Fixture',
    url: 'space-aware-ci-fixture',
    status: 'published',
    categoryId: 'kb-category-ci',
    categoryTitle: 'CI Imports',
    categoryUrl: 'ci-imports',
    sectionId: 'kb-section-ci',
    sectionTitle: 'Verificacao Space Aware',
    sectionUrl: 'verificacao-space-aware',
    permission: 'public',
    plainText: '',
    contentHtml: '<p>Space aware fixture</p>',
    articleDirRelative: 'articles/0001-space-aware-ci',
    assets: [],
  };

  const content = [
    article.title,
    '',
    'Este artigo existe apenas para validar a importacao Octadesk space-aware na CI.',
    'O corpo principal permanece em markdown/texto limpo.',
  ].join('\n');

  writeFileSync(articleJsonPath, JSON.stringify(article, null, 2), 'utf8');
  writeFileSync(contentPath, `${content}\n`, 'utf8');

  return {
    cleanupDir: tempRoot,
    rootDir,
    articleSlug: article.url,
    sourcePath: relative(process.cwd(), articleDir).replace(/\\/g, '/'),
    sourceHash: hashText(content.trim()),
  };
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

function expectMissingSpaceFailure(rootDir) {
  const result = run(
    process.execPath,
    ['scripts/knowledge/import-octadesk-drafts.mjs', '--local', '--limit', '1', '--root', rootDir],
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

function runSpaceAwareImport(rootDir) {
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
      '--root',
      rootDir,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const detail = [result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join('\n');
    fail(detail || 'Import com space explícito falhou.');
  }

  return result.stdout?.trim() ?? '';
}

function assertImportedArticleSpaceAware(fixture) {
  const output = executeSql(`
    select json_build_object(
      'space_slug',
      (
        select ks.slug
        from public.knowledge_articles as ka
        join public.knowledge_spaces as ks
          on ks.id = ka.knowledge_space_id
        where ka.slug = '${fixture.articleSlug}'
          and ka.source_path = '${fixture.sourcePath}'
        limit 1
      ),
      'article_source_hash',
      (
        select ka.source_hash
        from public.knowledge_articles as ka
        where ka.slug = '${fixture.articleSlug}'
          and ka.source_path = '${fixture.sourcePath}'
        limit 1
      ),
      'source_row_hash',
      (
        select kas.source_hash
        from public.knowledge_article_sources as kas
        where kas.source_path = '${fixture.sourcePath}'
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

  if (payload.article_source_hash !== fixture.sourceHash) {
    fail(`source_hash inesperado para o fixture importado: ${JSON.stringify(payload)}`);
  }

  if (!payload.article_source_hash || payload.article_source_hash !== payload.source_row_hash) {
    fail(`source_hash não foi preservado entre artigo e trilha de origem: ${JSON.stringify(payload)}`);
  }
}

function main() {
  const fixture = createOctadeskFixture();

  try {
    seedActor();
    expectMissingSpaceFailure(fixture.rootDir);
    runSpaceAwareImport(fixture.rootDir);
    assertImportedArticleSpaceAware(fixture);
    console.log('Octadesk import space-aware verificado com sucesso.');
  } finally {
    rmSync(fixture.cleanupDir, {
      recursive: true,
      force: true,
    });
  }
}

main();
