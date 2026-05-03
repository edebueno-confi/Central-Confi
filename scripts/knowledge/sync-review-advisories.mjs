import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    apply: false,
    local: false,
    actorUserId: null,
    spaceSlug: null,
    knowledgeSpaceId: null,
    input: join(
      process.cwd(),
      'docs',
      'reports',
      'KNOWLEDGE_LEGACY_CURATION_BACKLOG.json',
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

    if (value === '--input') {
      args.input = argv[index + 1] ?? args.input;
      index += 1;
    }
  }

  if (!args.local) {
    fail('Sync de advisories bloqueado: esta fase so permite pipeline local. Use --local.');
  }

  if (!args.spaceSlug && !args.knowledgeSpaceId) {
    fail(
      'Sync de advisories bloqueado: informe --space-slug ou --knowledge-space-id para definir o destino explicito.',
    );
  }

  if (args.spaceSlug && args.knowledgeSpaceId) {
    fail(
      'Sync de advisories bloqueado: use apenas um destino explicito por vez (--space-slug ou --knowledge-space-id).',
    );
  }

  if (args.apply && !args.actorUserId) {
    fail('Sync de advisories com --apply exige --actor-user-id.');
  }

  if (!existsSync(args.input)) {
    fail(
      `Backlog JSON nao encontrado em ${args.input}. Rode npm run knowledge:curation:backlog antes do sync.`,
    );
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

function createWorkspaceTempDir(prefix) {
  const tempRoot = join(process.cwd(), '.tmp');
  mkdirSync(tempRoot, { recursive: true });
  return mkdtempSync(join(tempRoot, prefix));
}

function executeSql(sql) {
  const tempDir = createWorkspaceTempDir('genius-review-advisories-');
  const sqlFile = join(tempDir, 'query.sql');
  writeFileSync(sqlFile, `${sql}\n`, 'utf8');

  try {
    const { command, args } = localSupabaseBinary([
      'db',
      'query',
      '--local',
      '--output',
      'json',
      '--file',
      sqlFile,
    ]);
    return run(command, args);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseJsonRows(rawOutput) {
  const parsed = JSON.parse(rawOutput || '[]');

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.rows)) {
    return parsed.rows;
  }

  return [];
}

function readBacklogRows(inputPath) {
  const parsed = JSON.parse(readFileSync(inputPath, 'utf8'));

  if (!Array.isArray(parsed.rows)) {
    fail('Backlog JSON invalido: rows ausente.');
  }

  return parsed.rows;
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

function buildArticleKey(row) {
  const sourcePath = String(row.sourcePath ?? row.source_path ?? '').trim();
  const sourceHash = String(row.sourceHash ?? row.source_hash ?? '').trim();
  return `${sourcePath}::${sourceHash}`;
}

function fetchSpaceArticles(args) {
  const rows = parseJsonRows(
    executeSql(`
      select
        ka.id::text as article_id,
        ka.source_path,
        ka.source_hash,
        coalesce(advisory.review_status::text, '<null>') as review_status,
        advisory.reviewed_by_user_id::text as reviewed_by_user_id,
        advisory.reviewed_at::text as reviewed_at,
        advisory.human_confirmations
      from public.knowledge_articles as ka
      left join public.knowledge_article_review_advisories as advisory
        on advisory.article_id = ka.id
      where ka.knowledge_space_id = ${buildSpaceSqlExpression(args)}
        and ka.source_path is not null
        and ka.source_hash is not null
      order by ka.created_at asc;
    `),
  );

  return rows.map((row) => ({
    articleId: row.article_id,
    sourcePath: row.source_path,
    sourceHash: row.source_hash,
    reviewStatus: row.review_status,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    humanConfirmations:
      row.human_confirmations && typeof row.human_confirmations === 'object'
        ? row.human_confirmations
        : {},
  }));
}

function buildSyncPlan(backlogRows, articles) {
  const articleMap = new Map(
    articles.map((article) => [buildArticleKey(article), article]),
  );

  const matched = [];
  const missing = [];
  const preserved = [];

  for (const row of backlogRows) {
    const match = articleMap.get(buildArticleKey(row));
    if (!match) {
      missing.push({
        sourcePath: row.sourcePath,
        sourceHash: row.sourceHash,
        title: row.title,
      });
      continue;
    }

    const humanReviewed =
      Boolean(match.reviewedByUserId) ||
      Boolean(match.reviewedAt) ||
      (match.humanConfirmations &&
        Object.keys(match.humanConfirmations).length > 0 &&
        JSON.stringify(match.humanConfirmations) !== '{}') ||
      (match.reviewStatus && match.reviewStatus !== '<null>' && match.reviewStatus !== 'pending');

    if (humanReviewed) {
      preserved.push({
        articleId: match.articleId,
        title: row.title,
        reviewStatus: match.reviewStatus,
      });
    }

    matched.push({
      articleId: match.articleId,
      title: row.title,
      sourcePath: row.sourcePath,
      sourceHash: row.sourceHash,
      suggestedVisibility: row.suggestedVisibility,
      suggestedClassification: row.suggestedClassification,
      classificationReason: row.classificationReason,
      duplicateGroupKey: row.duplicateGroupKey,
      riskFlags: Array.isArray(row.riskFlags) ? row.riskFlags : [],
    });
  }

  return {
    matched,
    missing,
    preserved,
  };
}

function applySync(plan, args) {
  const sqlChunks = ['do $block$', 'begin'];

  for (const row of plan.matched) {
    const riskFlags = JSON.stringify(row.riskFlags);
    const duplicateGroupKey = row.duplicateGroupKey
      ? `'${sqlEscape(row.duplicateGroupKey)}'`
      : 'null';

    sqlChunks.push(`
      insert into public.knowledge_article_review_advisories (
        article_id,
        source_hash,
        suggested_visibility,
        suggested_classification,
        classification_reason,
        duplicate_group_key,
        risk_flags,
        review_status,
        created_by_user_id,
        updated_by_user_id
      )
      values (
        '${sqlEscape(row.articleId)}'::uuid,
        '${sqlEscape(row.sourceHash)}',
        '${sqlEscape(row.suggestedVisibility)}'::public.knowledge_visibility,
        '${sqlEscape(row.suggestedClassification)}'::public.knowledge_advisory_classification,
        '${sqlEscape(row.classificationReason)}',
        ${duplicateGroupKey},
        '${sqlEscape(riskFlags)}'::jsonb,
        'pending'::public.knowledge_article_review_status,
        '${sqlEscape(args.actorUserId)}'::uuid,
        '${sqlEscape(args.actorUserId)}'::uuid
      )
      on conflict (article_id) do update
      set
        source_hash = excluded.source_hash,
        suggested_visibility = excluded.suggested_visibility,
        suggested_classification = excluded.suggested_classification,
        classification_reason = excluded.classification_reason,
        duplicate_group_key = excluded.duplicate_group_key,
        risk_flags = excluded.risk_flags,
        updated_by_user_id = excluded.updated_by_user_id
      where public.knowledge_article_review_advisories.reviewed_by_user_id is null
        and public.knowledge_article_review_advisories.reviewed_at is null
        and public.knowledge_article_review_advisories.human_confirmations = '{}'::jsonb
        and public.knowledge_article_review_advisories.review_status = 'pending'::public.knowledge_article_review_status;
    `);
  }

  sqlChunks.push('end;', '$block$;');

  executeSql(sqlChunks.join('\n'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const backlogRows = readBacklogRows(args.input);
  const articles = fetchSpaceArticles(args);
  const plan = buildSyncPlan(backlogRows, articles);

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          knowledge_space_slug: args.spaceSlug,
          knowledge_space_id: args.knowledgeSpaceId,
          input: args.input,
          backlog_rows: backlogRows.length,
          matched_articles: plan.matched.length,
          missing_articles: plan.missing.length,
          preserved_human_reviews: plan.preserved.length,
          missing_sample: plan.missing.slice(0, 5),
        },
        null,
        2,
      ),
    );
    return;
  }

  applySync(plan, args);

  console.log(
    JSON.stringify(
      {
        mode: 'apply',
        remote_used: false,
        actor_user_id: args.actorUserId,
        knowledge_space_slug: args.spaceSlug,
        knowledge_space_id: args.knowledgeSpaceId,
        input: args.input,
        backlog_rows: backlogRows.length,
        matched_articles: plan.matched.length,
        preserved_human_reviews: plan.preserved.length,
        missing_articles: plan.missing.length,
      },
      null,
      2,
    ),
  );
}

main();
