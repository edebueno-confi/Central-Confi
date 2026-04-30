import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { tmpdir } from 'node:os';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    local: false,
    limit: null,
    actorUserId: null,
    spaceSlug: null,
    knowledgeSpaceId: null,
    root: join(
      process.cwd(),
      'raw_knowledge',
      'octadesk_export',
      'latest',
      'articles',
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--apply') {
      args.apply = true;
      continue;
    }

    if (value === '--local') {
      args.local = true;
      continue;
    }

    if (value === '--actor-user-id') {
      args.actorUserId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === '--space-slug') {
      args.spaceSlug = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === '--knowledge-space-id') {
      args.knowledgeSpaceId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === '--limit') {
      const raw = argv[index + 1] ?? '';
      args.limit = Number.parseInt(raw, 10);
      index += 1;
      continue;
    }

    if (value === '--root') {
      args.root = argv[index + 1] ?? args.root;
      index += 1;
      continue;
    }
  }

  if (!args.local) {
    fail(
      'Importação Octadesk bloqueada: esta fase só permite pipeline local. Use --local.',
    );
  }

  if (!args.spaceSlug && !args.knowledgeSpaceId) {
    fail(
      'Importação Octadesk bloqueada: informe --space-slug ou --knowledge-space-id para definir o destino explícito.',
    );
  }

  if (args.spaceSlug && args.knowledgeSpaceId) {
    fail(
      'Importação Octadesk bloqueada: use apenas um destino explícito por vez (--space-slug ou --knowledge-space-id).',
    );
  }

  if (args.apply && !args.actorUserId) {
    fail('Importação com --apply exige --actor-user-id.');
  }

  return args;
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function run(command, args, options = {}) {
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

function localSupabaseBinary(args) {
  if (process.platform === 'win32') {
    const localBinary = join(
      process.cwd(),
      'node_modules',
      'supabase',
      'bin',
      'supabase.exe',
    );

    if (existsSync(localBinary)) {
      return { command: localBinary, args };
    }
  }

  return {
    command: 'npx',
    args: ['supabase', ...args],
  };
}

function readStatusEnv() {
  const { command, args } = localSupabaseBinary(['status', '-o', 'env']);
  const output = run(command, args);
  const env = new Map();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (!match) {
      continue;
    }

    env.set(match[1], match[2]);
  }

  const apiUrl = env.get('API_URL') ?? '';
  const dbUrl = env.get('DB_URL') ?? '';
  if (!apiUrl || !dbUrl) {
    fail('Importação Octadesk bloqueada: não foi possível resolver o ambiente Supabase local.');
  }

  return env;
}

function hashText(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function buildSpaceSqlExpression(args) {
  if (args.knowledgeSpaceId) {
    return `'${sqlEscape(args.knowledgeSpaceId)}'::uuid`;
  }

  return `(
    select ks.id
    from public.knowledge_spaces as ks
    where ks.slug = '${sqlEscape(args.spaceSlug)}'
  )`;
}

function cleanBody(rawTitle, rawText) {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n').map((line) => line.trim());

  while (lines[0] && normalizeKey(lines[0]) === normalizeKey(rawTitle)) {
    lines.shift();
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeKey(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function summarizeBody(body) {
  const firstParagraph = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!firstParagraph) {
    return null;
  }

  return firstParagraph.slice(0, 240);
}

function rootCategoryName(article) {
  return article.categoryTitle || article.categoryUrl || 'Sem categoria';
}

function sectionCategoryName(article) {
  return article.sectionTitle || article.sectionUrl || null;
}

function normalizeSlug(rawValue, fallback) {
  const source = (rawValue || fallback || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  return source
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .replace(/-{2,}/g, '-')
    .trim();
}

function classifySensitivity(article, body, duplicateCount) {
  const text = `${article.title}\n${article.categoryTitle}\n${article.sectionTitle}\n${body}`;
  const sensitivePattern =
    /(token|senha|secret|api key|api token|appkey|apptoken|credencial|oauth|bearer|permiss|correios|pix|blocklist|seguran|shopify|vtex|tray|nuvemshop|oracle|linx|antmarket)/i;

  if (duplicateCount > 1) {
    return 'restricted';
  }

  return sensitivePattern.test(text) ? 'restricted' : 'internal';
}

function discoverArticles(root) {
  const articleDirs = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (existsSync(join(full, 'article.json'))) {
          articleDirs.push(full);
          continue;
        }

        walk(full);
      }
    }
  }

  walk(root);

  return articleDirs;
}

function buildInventory(root, limit = null) {
  const dirs = discoverArticles(root);
  const draftRows = [];

  for (const dir of dirs) {
    const article = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8'));
    const contentPath = join(dir, 'content.txt');
    const rawContent = existsSync(contentPath)
      ? readFileSync(contentPath, 'utf8')
      : article.plainText || '';
    const body = cleanBody(article.title, rawContent);
    const relDir = relative(process.cwd(), dir).replace(/\\/g, '/');
    const bodyHash = hashText(rawContent.trim());
    const rootSlug = normalizeSlug(article.categoryUrl, rootCategoryName(article));
    const sectionName = sectionCategoryName(article);
    const sectionSlug = sectionName
      ? normalizeSlug(article.sectionUrl, sectionName)
      : null;

    draftRows.push({
      article,
      body,
      summary: summarizeBody(body),
      sourcePath: relDir,
      sourceHash: bodyHash,
      rootCategoryName: rootCategoryName(article),
      rootCategorySlug: rootSlug,
      sectionCategoryName: sectionName,
      sectionCategorySlug: sectionSlug,
      articleSlug: normalizeSlug(
        article.url,
        basename(dir).replace(/^\d+-/, ''),
      ),
    });
  }

  const duplicateMap = new Map();
  for (const row of draftRows) {
    duplicateMap.set(row.sourceHash, (duplicateMap.get(row.sourceHash) ?? 0) + 1);
  }

  const enriched = draftRows.map((row) => ({
    ...row,
    duplicateCount: duplicateMap.get(row.sourceHash) ?? 1,
    initialVisibility: classifySensitivity(row.article, row.body, duplicateMap.get(row.sourceHash) ?? 1),
  }));

  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0
    ? enriched.slice(0, limit)
    : enriched;
}

function buildSummary(rows) {
  const byRoot = Object.entries(
    rows.reduce((acc, row) => {
      acc[row.rootCategoryName] = (acc[row.rootCategoryName] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));

  const duplicates = rows
    .filter((row) => row.duplicateCount > 1)
    .map((row) => ({
      title: row.article.title,
      sourcePath: row.sourcePath,
      sourceHash: row.sourceHash,
      duplicateCount: row.duplicateCount,
    }));

  const sensitive = rows
    .filter((row) => row.initialVisibility === 'restricted')
    .map((row) => ({
      title: row.article.title,
      sourcePath: row.sourcePath,
      visibility: row.initialVisibility,
    }));

  return {
    totalArticles: rows.length,
    rootCategories: byRoot,
    duplicates,
    restrictedCandidates: sensitive,
    sampleMetadataKeys: rows[0] ? Object.keys(rows[0].article).sort() : [],
  };
}

function writeSqlAndExecute(rows, actorUserId, args) {
  const spaceSqlExpression = buildSpaceSqlExpression(args);
  const sqlChunks = [
    'do $block$',
    'declare',
    '  v_target_space_id uuid;',
    '  v_root public.knowledge_categories;',
    '  v_section public.knowledge_categories;',
    '  v_existing record;',
    'begin',
    "  perform set_config('request.jwt.claim.role', 'authenticated', true);",
    `  perform set_config('request.jwt.claim.sub', '${sqlEscape(actorUserId)}', true);`,
    `  select ${spaceSqlExpression}`,
    '  into v_target_space_id;',
    '',
    '  if v_target_space_id is null then',
    "    raise exception 'knowledge space target not found';",
    '  end if;',
    "  execute 'set local role authenticated';",
  ];

  for (const row of rows) {
    const sectionCategorySql = row.sectionCategoryName
      ? `
    v_section := public.rpc_admin_create_knowledge_category_v2(
      '${sqlEscape(row.sectionCategoryName)}',
      '${sqlEscape(row.sectionCategorySlug)}',
      'Subcategoria importada do legado Octadesk.',
      'internal'::public.knowledge_visibility,
      v_root.id,
      v_target_space_id,
      null
    );`
      : '\n    v_section := v_root;';

    sqlChunks.push(`
  v_root := public.rpc_admin_create_knowledge_category_v2(
    '${sqlEscape(row.rootCategoryName)}',
    '${sqlEscape(row.rootCategorySlug)}',
    'Categoria importada do legado Octadesk.',
    'internal'::public.knowledge_visibility,
    null,
    v_target_space_id,
    null
  );${sectionCategorySql}

  select *
  into v_existing
  from public.vw_admin_knowledge_article_detail_v2 as ka
  where ka.knowledge_space_id = v_target_space_id
    and ka.slug = '${sqlEscape(row.articleSlug)}';

  if v_existing.id is null then
    perform public.rpc_admin_create_knowledge_article_draft_v2(
      '${sqlEscape(row.article.title)}',
      '${sqlEscape(row.articleSlug)}',
      ${row.summary ? `'${sqlEscape(row.summary)}'` : 'null'},
      '${sqlEscape(row.body)}',
      v_section.id,
      '${row.initialVisibility}'::public.knowledge_visibility,
      v_target_space_id,
      null,
      '${sqlEscape(row.sourcePath)}',
      '${sqlEscape(row.sourceHash)}'
    );
  elsif v_existing.status in ('draft'::public.knowledge_article_status, 'review'::public.knowledge_article_status) then
    if v_existing.title is distinct from '${sqlEscape(row.article.title)}'
       or v_existing.summary is distinct from ${row.summary ? `'${sqlEscape(row.summary)}'` : 'null'}
       or v_existing.body_md is distinct from '${sqlEscape(row.body)}'
       or v_existing.category_id is distinct from v_section.id
       or v_existing.visibility is distinct from '${row.initialVisibility}'::public.knowledge_visibility
       or v_existing.source_path is distinct from '${sqlEscape(row.sourcePath)}'
       or v_existing.source_hash is distinct from '${sqlEscape(row.sourceHash)}' then
      perform public.rpc_admin_update_knowledge_article_draft_v2(
        v_existing.id,
        v_target_space_id,
        '${sqlEscape(row.article.title)}',
        '${sqlEscape(row.articleSlug)}',
        ${row.summary ? `'${sqlEscape(row.summary)}'` : 'null'},
        '${sqlEscape(row.body)}',
        v_section.id,
        '${row.initialVisibility}'::public.knowledge_visibility,
        '${sqlEscape(row.sourcePath)}',
        '${sqlEscape(row.sourceHash)}'
      );
    end if;
  end if;`);
  }

  sqlChunks.push('end;', '$block$;');

  const tempDir = mkdtempSync(join(tmpdir(), 'genius-octadesk-import-'));
  const sqlFile = join(tempDir, 'import.sql');
  writeFileSync(sqlFile, `${sqlChunks.join('\n')}\n`, 'utf8');

  try {
    const { command, args } = localSupabaseBinary([
      'db',
      'query',
      '--local',
      '--file',
      sqlFile,
    ]);
    run(command, args);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  readStatusEnv();

  const rows = buildInventory(args.root, args.limit);
  const summary = buildSummary(rows);

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          knowledge_space_slug: args.spaceSlug,
          knowledge_space_id: args.knowledgeSpaceId,
          root: relative(process.cwd(), args.root).replace(/\\/g, '/'),
          ...summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  writeSqlAndExecute(rows, args.actorUserId, args);

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        remote_used: false,
        actor_user_id: args.actorUserId,
        knowledge_space_slug: args.spaceSlug,
        knowledge_space_id: args.knowledgeSpaceId,
        imported_articles: rows.length,
        root: relative(process.cwd(), args.root).replace(/\\/g, '/'),
        restricted_articles: rows.filter((row) => row.initialVisibility === 'restricted').length,
        duplicate_hash_groups: new Set(
          rows.filter((row) => row.duplicateCount > 1).map((row) => row.sourceHash),
        ).size,
      },
      null,
      2,
    ),
  );
}

main();
