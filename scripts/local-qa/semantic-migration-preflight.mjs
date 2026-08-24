import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHADOW_IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.158';
const CANONICAL_CONTAINER = 'supabase_db_genius-support-os';
const CANONICAL_TIMESERIES_MIGRATION = 'supabase/migrations/20260807250000_analytics_timeseries_v1.sql';

export const PROHIBITED_MAIN_DATABASE_COMMANDS = Object.freeze([
  'supabase db reset --local',
  'supabase db push --local',
  'supabase migration up --local',
  'docker exec supabase_db_genius-support-os',
  'psql postgresql://127.0.0.1:54322',
  'git reset',
  'git clean',
  'drop database',
]);

const UTF8_MIGRATION = '20260822220000';
const OPERATION_SCOPE_MIGRATION = '20260821090000';
const TIMESERIES_MIGRATION = '20260823100000';
const REMEDIATION_MIGRATION = '20260824190000';
const BENCHMARK_RPC_REPEAT_COUNT = 4;

const HISTORICAL_MIGRATIONS = Object.freeze([
  OPERATION_SCOPE_MIGRATION,
  UTF8_MIGRATION,
  TIMESERIES_MIGRATION,
]);

// Este bloque é uma trava versionada, não uma aprovação da migration. A
// regressão histórica foi observada no shadow em 2026-08-24 e continua sendo
// o estado operacional até que exista uma decisão explícita e uma nova prova
// comparável. O candidato pode ser GO sem promover a migration histórica.
export const HISTORICAL_MIGRATION_GATE = Object.freeze({
  state: 'historical_no_go',
  reason: 'HISTORICAL_BASELINE_REGRESSION',
  evidence: Object.freeze({
    source: 'docs/reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md',
    observedAt: '2026-08-24',
    workloads: Object.freeze([
      Object.freeze({ id: 'rpc_analytics_timeseries_all', beforeMs: 2988, afterMs: 4857 }),
      Object.freeze({ id: 'rpc_analytics_timeseries_excluded', beforeMs: 3480, afterMs: 9436 }),
    ]),
  }),
  unlockCondition: 'decisão do proprietário e baseline histórico reproduzível sem regressão',
});

const BENCHMARK_ENV = Object.freeze({
  rowsPerTable: 'CONFIONE_SEMANTIC_PREFLIGHT_ROWS_PER_TABLE',
  runs: 'CONFIONE_SEMANTIC_PREFLIGHT_RUNS',
  warmups: 'CONFIONE_SEMANTIC_PREFLIGHT_WARMUPS',
  timeoutMs: 'CONFIONE_SEMANTIC_PREFLIGHT_TIMEOUT_MS',
});

export const SEMANTIC_PREFLIGHT_BENCHMARK_LIMITS = Object.freeze({
  defaultRowsPerTable: 100_000,
  minRowsPerTable: 1_000,
  maxRowsPerTable: 100_000,
  defaultRuns: 5,
  minRuns: 2,
  maxRuns: 5,
  defaultWarmups: 2,
  maxWarmups: 2,
  defaultTimeoutMs: 30_000,
  maxTimeoutMs: 30_000,
  regressionMarginPercent: 25,
  absoluteRegressionMarginMs: 2,
  costRegressionMarginPercent: 1,
});

export const SHADOW_TENANT_CONTEXTS = Object.freeze({
  tenantA: Object.freeze({ tenantId: 'tenant-a', userId: 'user-a' }),
  tenantB: Object.freeze({ tenantId: 'tenant-b', userId: 'user-b' }),
});

export function readBenchmarkConfig(env = process.env) {
  const limits = SEMANTIC_PREFLIGHT_BENCHMARK_LIMITS;
  const readInteger = (key, fallback, { min, max }) => {
    const raw = env[key];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(String(raw))) throw new Error(`BENCHMARK_CONFIG_INVALID:${key}`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`BENCHMARK_CONFIG_OUT_OF_RANGE:${key}:${min}-${max}`);
    }
    return value;
  };
  return Object.freeze({
    rowsPerTable: readInteger(BENCHMARK_ENV.rowsPerTable, limits.defaultRowsPerTable, {
      min: limits.minRowsPerTable,
      max: limits.maxRowsPerTable,
    }),
    runs: readInteger(BENCHMARK_ENV.runs, limits.defaultRuns, {
      min: limits.minRuns,
      max: limits.maxRuns,
    }),
    warmups: readInteger(BENCHMARK_ENV.warmups, limits.defaultWarmups, {
      min: 0,
      max: limits.maxWarmups,
    }),
    timeoutMs: readInteger(BENCHMARK_ENV.timeoutMs, limits.defaultTimeoutMs, {
      min: 1_000,
      max: limits.maxTimeoutMs,
    }),
    regressionMarginPercent: limits.regressionMarginPercent,
    absoluteRegressionMarginMs: limits.absoluteRegressionMarginMs,
    costRegressionMarginPercent: limits.costRegressionMarginPercent,
  });
}

export const SEMANTIC_MIGRATION_MANIFEST = Object.freeze({
  version: 'semantic-preflight-v1',
  prohibitedMainDatabaseCommands: PROHIBITED_MAIN_DATABASE_COMMANDS,
  shadow: {
    required: true,
    disposable: true,
    canonicalContainer: CANONICAL_CONTAINER,
    image: SHADOW_IMAGE,
    namespacePrefix: 'confione_shadow_semantic_preflight_20260824_',
  },
  benchmark: {
    synthetic: true,
    source: 'generate_series no PostgreSQL shadow; nenhum dado do banco canônico é copiado',
    rpcRepeatCount: BENCHMARK_RPC_REPEAT_COUNT,
    limits: SEMANTIC_PREFLIGHT_BENCHMARK_LIMITS,
    environment: BENCHMARK_ENV,
    workloads: [
      'rpc_analytics_timeseries_all',
      'rpc_analytics_timeseries_excluded',
      'timeseries_join_all',
      'timeseries_join_excluded',
    ],
  },
  migrations: {
    [OPERATION_SCOPE_MIGRATION]: {
      file: 'supabase/migrations/20260821090000_analytics_timeseries_operation_scope_v1.sql',
      sha256: 'ec200116bce512961873aa44afb2aaf801e828a07e47789ed303858b422ee3b2',
      classification: 'SEMANTICALLY_VERIFIED_IN_SHADOW',
      execute: {
        count: 1,
        exact: 'execute v_definition',
        allowedTarget: 'pg_get_functiondef(regprocedure) -> validate two operation anchors -> execute same definition',
      },
      dynamicTarget: {
        qualifiedName: 'public.rpc_analytics_timeseries',
        signature: 'p_domain text, p_from date, p_to date, p_grain text',
      },
      anchors: [
        { id: 'active-archived-scope', pattern: 'and c[.]is_active[[:space:]]+and not coalesce[(]c[.]is_archived, false[)]', count: 2 },
      ],
      allowedDependencies: ['public.rpc_analytics_timeseries', 'public.rpc_analytics_timeseries_by_operation', 'app_private.set_analytics_operation_scope'],
      requiredDependencies: ['public.rpc_analytics_timeseries'],
    },
    [UTF8_MIGRATION]: {
      file: 'supabase/migrations/20260822220000_analytics_utf8_and_scope_guard_v1.sql',
      sha256: '2f510fe66073e8d45dc704f1f3f6101edc0b2d333f040c437b7de95f1e58563c',
      classification: 'SEMANTICALLY_VERIFIED_IN_SHADOW',
      execute: {
        count: 1,
        exact: 'execute v_definition',
        allowedTarget: 'pg_get_functiondef(regprocedure) -> replace known literals -> execute same definition',
      },
      targets: [
        { qualifiedName: 'public.rpc_analytics_ceo_snapshot_legacy', signature: 'p_from date, p_to date' },
        { qualifiedName: 'public.rpc_analytics_customer_success_kpis_v2', signature: '' },
        { qualifiedName: 'public.rpc_analytics_support_kpis_v2', signature: 'p_from date, p_to date, p_pipeline_id text, p_priority text' },
      ],
      transformations: [
        { id: 'utf8-mojibake', old: 'Sem responsÃ¡vel', new: 'Sem responsável' },
        { id: 'utf8-unaccented', old: 'Sem responsavel', new: 'Sem responsável' },
      ],
      allowedDependencies: [],
    },
    [TIMESERIES_MIGRATION]: {
      file: 'supabase/migrations/20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql',
      sha256: '3dd96ebef8648ca4ac6afc68bcc767f2afbe3f56b4bc82baf79c35ea2d36a8d7',
      classification: 'SEMANTICALLY_VERIFIED_IN_SHADOW',
      execute: {
        count: 1,
        exact: 'execute v_definition',
        allowedTarget: 'pg_get_functiondef(regprocedure) -> validate two anchors -> replace predicates -> execute same definition',
      },
      staticFunction: {
        qualifiedName: 'public.rpc_analytics_timeseries_by_operation',
        signature: 'p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[]',
      },
      dynamicTarget: {
        qualifiedName: 'public.rpc_analytics_timeseries',
        signature: 'p_domain text, p_from date, p_to date, p_grain text',
      },
      anchors: [
        {
          id: 'ticket-predicate',
          old: "on c.object_type = 'ticket' and c.hubspot_pipeline_id = t.pipeline_id",
          alias: 't',
        },
        {
          id: 'deal-predicate',
          old: "on c.object_type = 'deal' and c.hubspot_pipeline_id = d.pipeline_id",
          alias: 'd',
        },
      ],
      allowedDependencies: [
        'app_private.set_analytics_operation_scope',
        'app_private.set_analytics_pipeline_exclusion_scope',
        'public.rpc_analytics_timeseries',
        'public.rpc_analytics_timeseries_by_operation',
      ],
      requiredDependencies: [
        'app_private.set_analytics_operation_scope',
        'app_private.set_analytics_pipeline_exclusion_scope',
        'public.rpc_analytics_timeseries',
      ],
    },
    [REMEDIATION_MIGRATION]: {
      file: 'supabase/migrations/20260824190000_analytics_timeseries_scope_performance_remediation_v1.sql',
      sha256: '7418576ed9887c667e55fe6d926be342aeb74f940b15663604e2a62c44b22eca',
      classification: 'CANDIDATE_ONLY_SHADOW',
      execute: {
        count: 1,
        exact: 'execute v_definition',
        allowedTarget: 'pg_get_functiondef(regprocedure) -> validate declaration/predicate counts -> execute same definition',
      },
      dynamicTarget: {
        qualifiedName: 'public.rpc_analytics_timeseries',
        signature: 'p_domain text, p_from date, p_to date, p_grain text',
      },
      anchors: {
        groupPredicateCount: 2,
        ticketExclusionPredicateCount: 1,
        dealExclusionPredicateCount: 1,
      },
      requiredContractMarkers: [
        'with scope as (',
        'cross join scope scope_config',
        'scope_config.group_company is null or c.group_company = scope_config.group_company',
        'scope_config.excluded_pipeline_ids is null or %s.pipeline_id <> all(scope_config.excluded_pipeline_ids)',
        "position('search_path' in lower(v_definition))",
        'revoke all on function public.rpc_analytics_timeseries',
        'grant execute on function public.rpc_analytics_timeseries',
      ],
      allowedDependencies: ['public.hubspot_deals', 'public.hubspot_tickets', 'public.rpc_analytics_timeseries'],
      requiredDependencies: [],
    },
  },
});

export function extractCanonicalFunctionDefinition(source) {
  const text = String(source);
  const start = text.search(/create\s+or\s+replace\s+function\s+public\.rpc_analytics_timeseries\s*\(/i);
  if (start < 0) throw new Error('CANONICAL_TIMESERIES_FUNCTION_NOT_FOUND');
  const end = text.indexOf('$$;', start);
  if (end < 0) throw new Error('CANONICAL_TIMESERIES_FUNCTION_BODY_NOT_FOUND');
  return text.slice(start, end + 3);
}

export function loadCanonicalTimeseriesDefinition(root = ROOT) {
  return extractCanonicalFunctionDefinition(readFileSync(join(root, CANONICAL_TIMESERIES_MIGRATION), 'utf8'));
}

function countOccurrences(source, needle) {
  const text = String(source);
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const index = text.indexOf(needle, from);
    if (index < 0) return count;
    count += 1;
    from = index + needle.length;
  }
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function blank(output, start, end) {
  for (let index = start; index < end; index += 1) {
    if (output[index] !== '\n' && output[index] !== '\r') output[index] = ' ';
  }
}

// Mantém código executável e remove comentários/literais para que EXECUTE e
// comandos proibidos em strings não sejam confundidos com comandos reais.
export function maskSqlLiterals(source) {
  const text = String(source);
  const output = Array.from(text);
  let index = 0;
  while (index < text.length) {
    if (text.startsWith('--', index)) {
      const end = text.indexOf('\n', index + 2);
      const commentEnd = end < 0 ? text.length : end;
      blank(output, index, commentEnd);
      index = commentEnd;
      continue;
    }
    if (text.startsWith('/*', index)) {
      let depth = 1;
      let cursor = index + 2;
      while (cursor < text.length && depth > 0) {
        if (text.startsWith('/*', cursor)) {
          depth += 1;
          cursor += 2;
        } else if (text.startsWith('*/', cursor)) {
          depth -= 1;
          cursor += 2;
        } else {
          cursor += 1;
        }
      }
      blank(output, index, cursor);
      if (depth !== 0) return null;
      index = cursor;
      continue;
    }
    if (text[index] === "'") {
      const start = index;
      index += 1;
      let closed = false;
      while (index < text.length) {
        if (text[index] === '\\') {
          index += Math.min(2, text.length - index);
          continue;
        }
        if (text[index] === "'") {
          if (text[index + 1] === "'") {
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        index += 1;
      }
      blank(output, start, index);
      if (!closed) return null;
      continue;
    }
    index += 1;
  }
  return output.join('');
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function splitArguments(value) {
  const result = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth -= 1;
    if (value[index] === ',' && depth === 0) {
      result.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (value.slice(start).trim()) result.push(value.slice(start));
  return result;
}

function normalizeSignature(value) {
  return splitArguments(value)
    .map((argument) => argument.replace(/\s+default\s+[\s\S]*$/i, '').trim())
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
}

export function extractFunctionIdentity(definition) {
  const match = String(definition).match(
    /create\s+(?:or\s+replace\s+)?function\s+([a-z_][\w$]*\.[a-z_][\w$]*)\s*\(([\s\S]*?)\)\s*returns\b/i,
  );
  if (!match) return null;
  return {
    qualifiedName: match[1].toLowerCase(),
    signature: normalizeSignature(match[2]),
  };
}

function assertExactSignature(definition, target) {
  const identity = extractFunctionIdentity(definition);
  if (!identity) return { ok: false, reason: 'SIGNATURE_NOT_FOUND' };
  if (identity.qualifiedName !== target.qualifiedName.toLowerCase()) {
    return { ok: false, reason: `SIGNATURE_UNEXPECTED:${identity.qualifiedName}` };
  }
  const expected = normalizeSignature(target.signature);
  if (identity.signature !== expected) {
    return { ok: false, reason: `SIGNATURE_UNEXPECTED:${identity.signature}` };
  }
  return { ok: true, identity };
}

function dependencyNames(source) {
  return [...new Set(String(source).match(/\b(?:public|app_private)\.[a-z_][\w$]*/gi) ?? [])]
    .map((name) => name.toLowerCase())
    .sort();
}

export function validateDependencies(source, { allowed = [], required = [] } = {}) {
  const actual = dependencyNames(source);
  const allowedSet = new Set(allowed.map((name) => name.toLowerCase()));
  const requiredSet = new Set(required.map((name) => name.toLowerCase()));
  const unexpected = actual.filter((name) => !allowedSet.has(name));
  const missing = [...requiredSet].filter((name) => !actual.includes(name));
  return { ok: unexpected.length === 0 && missing.length === 0, actual, unexpected, missing };
}

export function applyUtf8Transform(definition, target, transformations) {
  const signature = assertExactSignature(definition, target);
  if (!signature.ok) return { ok: false, reason: signature.reason };
  let transformed = String(definition);
  const replacements = [];
  for (const transformation of transformations) {
    const count = countOccurrences(transformed, transformation.old);
    transformed = transformed.replaceAll(transformation.old, transformation.new);
    replacements.push({ id: transformation.id, old: transformation.old, new: transformation.new, count });
  }
  return { ok: true, transformed, replacements, identity: signature.identity };
}

function exclusionPredicate(alias) {
  return `(nullif(current_setting('app.analytics_excluded_pipeline_ids', true), '') is null or ${alias}.pipeline_id <> all(string_to_array(current_setting('app.analytics_excluded_pipeline_ids', true), ',')))`;
}

export function loadRemediationMigration(root = ROOT) {
  return readFileSync(join(root, SEMANTIC_MIGRATION_MANIFEST.migrations[REMEDIATION_MIGRATION].file), 'utf8');
}

export function applyTimeseriesTransform(definition, manifest = SEMANTIC_MIGRATION_MANIFEST.migrations[TIMESERIES_MIGRATION]) {
  const signature = assertExactSignature(definition, manifest.dynamicTarget);
  if (!signature.ok) return { ok: false, reason: signature.reason };
  let transformed = String(definition);
  const anchors = [];
  for (const anchor of manifest.anchors) {
    const count = countOccurrences(transformed, anchor.old);
    if (count !== 1) return { ok: false, reason: `ANCHOR_${count === 0 ? 'MISSING' : 'DUPLICATED'}:${anchor.id}`, anchors };
    const addition = `${anchor.old}\n       and ${exclusionPredicate(anchor.alias)}`;
    if (countOccurrences(transformed, exclusionPredicate(anchor.alias)) > 0) {
      return { ok: false, reason: `ANCHOR_ALREADY_TRANSFORMED:${anchor.id}`, anchors };
    }
    transformed = transformed.replace(anchor.old, addition);
    anchors.push({ id: anchor.id, count, alias: anchor.alias });
  }
  return { ok: true, transformed, anchors, identity: signature.identity };
}

function executeTokens(source) {
  const masked = maskSqlLiterals(source);
  if (masked === null) return { ok: false, reason: 'SQL_LEXICALLY_UNPARSEABLE', count: null };
  const executableSql = masked.replace(/\bgrant\s+execute\b/gi, 'grant             ');
  return { ok: true, count: (executableSql.match(/\bexecute\b/gi) ?? []).length, masked };
}

function checkForbiddenSql(source) {
  const masked = maskSqlLiterals(source);
  if (masked === null) return 'SQL_LEXICALLY_UNPARSEABLE';
  const forbidden = [
    /\bdrop\s+(?:table|schema|database)\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\balter\s+table[\s\S]*\bdrop\b/i,
  ];
  return forbidden.find((pattern) => pattern.test(masked))?.source ?? null;
}

function staticFunctionCount(source, target) {
  const masked = maskSqlLiterals(source);
  if (masked === null) return 0;
  const pattern = new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?function\\s+${target.qualifiedName.replace('.', '\\.') }\\s*\\(([\\s\\S]*?)\\)\\s*returns\\b`,
    'gi',
  );
  let count = 0;
  for (const match of masked.matchAll(pattern)) {
    if (normalizeSignature(match[1]) === normalizeSignature(target.signature)) count += 1;
  }
  return count;
}

function validateUtf8Migration(source, manifest) {
  const reasons = [];
  if (sha256(source) !== manifest.sha256) reasons.push('SOURCE_SHA256_UNEXPECTED');
  const forbidden = checkForbiddenSql(source);
  if (forbidden) reasons.push(`FORBIDDEN_SQL:${forbidden}`);
  const execution = executeTokens(source);
  if (!execution.ok || execution.count !== manifest.execute.count || countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_NOT_ALLOWED');
  if (countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_TARGET_UNEXPECTED');
  for (const target of manifest.targets) {
    const escapedName = target.qualifiedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetCount = (source.match(new RegExp(`'${escapedName}\\([^']*\\)'::regprocedure`, 'gi')) ?? []).length;
    if (targetCount !== 1) reasons.push(`TARGET_${targetCount === 0 ? 'MISSING' : 'DUPLICATED'}:${target.qualifiedName}`);
  }
  if (countOccurrences(source, 'pg_get_functiondef') !== 1) reasons.push('TARGET_COUNT_UNEXPECTED');
  return { ok: reasons.length === 0, reasons, executeCount: execution.count };
}

function validateTimeseriesMigration(source, manifest) {
  const reasons = [];
  if (sha256(source) !== manifest.sha256) reasons.push('SOURCE_SHA256_UNEXPECTED');
  const forbidden = checkForbiddenSql(source);
  if (forbidden) reasons.push(`FORBIDDEN_SQL:${forbidden}`);
  const execution = executeTokens(source);
  if (!execution.ok || execution.count !== manifest.execute.count || countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_NOT_ALLOWED');
  if (countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_TARGET_UNEXPECTED');
  if (staticFunctionCount(source, manifest.staticFunction) !== 1) reasons.push('SIX_PARAMETER_SIGNATURE_UNEXPECTED');
  if (countOccurrences(source, 'p_excluded_pipeline_ids text[]') !== 1) reasons.push('SIX_PARAMETER_UNIQUE_ANCHOR_UNEXPECTED');
  for (const anchor of manifest.anchors) {
    const encoded = anchor.old.replaceAll("'", "''");
    if (countOccurrences(source, encoded) !== 1) reasons.push(`MIGRATION_ANCHOR_UNEXPECTED:${anchor.id}`);
  }
  const dependencies = validateDependencies(source, {
    allowed: manifest.allowedDependencies,
    required: manifest.requiredDependencies,
  });
  if (!dependencies.ok) reasons.push('DEPENDENCY_UNEXPECTED');
  return { ok: reasons.length === 0, reasons, executeCount: execution.count, dependencies };
}

function validateOperationScopeMigration(source, manifest) {
  const reasons = [];
  if (sha256(source) !== manifest.sha256) reasons.push('SOURCE_SHA256_UNEXPECTED');
  const forbidden = checkForbiddenSql(source);
  if (forbidden) reasons.push(`FORBIDDEN_SQL:${forbidden}`);
  const execution = executeTokens(source);
  if (!execution.ok || execution.count !== manifest.execute.count || countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_NOT_ALLOWED');
  if (countOccurrences(source.toLowerCase(), 'pg_get_functiondef') !== 1) reasons.push('PG_GET_FUNCTIONDEF_COUNT_UNEXPECTED');
  if (countOccurrences(source, "'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure") !== 1) reasons.push('TARGET_SIGNATURE_UNEXPECTED');
  if (countOccurrences(source, 'v_match_count <> 2') !== 1) reasons.push('ANCHOR_COUNT_GUARD_UNEXPECTED');
  if (countOccurrences(source, 'regexp_replace(') !== 1) reasons.push('TRANSFORM_COUNT_UNEXPECTED');
  const dependencies = validateDependencies(source, {
    allowed: manifest.allowedDependencies,
    required: manifest.requiredDependencies,
  });
  if (!dependencies.ok) reasons.push('DEPENDENCY_UNEXPECTED');
  return { ok: reasons.length === 0, reasons, executeCount: execution.count, dependencies };
}

function validateRemediationMigration(source, manifest) {
  const reasons = [];
  if (sha256(source) !== manifest.sha256) reasons.push('SOURCE_SHA256_UNEXPECTED');
  const forbidden = checkForbiddenSql(source);
  if (forbidden) reasons.push(`FORBIDDEN_SQL:${forbidden}`);
  const execution = executeTokens(source);
  if (!execution.ok || execution.count !== manifest.execute.count || countOccurrences(source.toLowerCase(), manifest.execute.exact) !== 1) reasons.push('EXECUTE_NOT_ALLOWED');
  if (countOccurrences(source.toLowerCase(), 'pg_get_functiondef') !== 1) reasons.push('PG_GET_FUNCTIONDEF_COUNT_UNEXPECTED');
  if (countOccurrences(source, "'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure") !== 1) reasons.push('TARGET_SIGNATURE_UNEXPECTED');
  if (countOccurrences(source, 'v_group_count <> 2') !== 1) reasons.push('GROUP_ANCHOR_COUNT_GUARD_UNEXPECTED');
  if (countOccurrences(source, 'v_ticket_exclusion_count <> 1 or v_deal_exclusion_count <> 1') !== 1) reasons.push('EXCLUSION_ANCHOR_COUNT_GUARD_UNEXPECTED');
  if (countOccurrences(source, 'v_declare_count <> 1 or v_begin_count <> 1') !== 1) reasons.push('BLOCK_COUNT_GUARD_UNEXPECTED');
  if (countOccurrences(source, 'v_scope_count <> 3') !== 1) reasons.push('SCOPE_CTE_GUARD_UNEXPECTED');
  if (countOccurrences(source, 'v_ticket_from_count <> 1 or v_deal_from_count <> 1') !== 1) reasons.push('SCOPE_JOIN_GUARD_UNEXPECTED');
  for (const marker of manifest.requiredContractMarkers) {
    if (countOccurrences(source, marker) < 1) reasons.push(`CONTRACT_MARKER_UNEXPECTED:${marker}`);
  }
  const dependencies = validateDependencies(source, {
    allowed: manifest.allowedDependencies,
    required: manifest.requiredDependencies,
  });
  if (!dependencies.ok) reasons.push('DEPENDENCY_UNEXPECTED');
  return { ok: reasons.length === 0, reasons, executeCount: execution.count, dependencies };
}

export function preflightMigration({ version, source }) {
  const manifest = SEMANTIC_MIGRATION_MANIFEST.migrations[version];
  if (!manifest) return { version, state: 'NO_GO', reasons: ['MIGRATION_NOT_IN_MANIFEST'] };
  const validation = version === UTF8_MIGRATION
    ? validateUtf8Migration(source, manifest)
    : version === OPERATION_SCOPE_MIGRATION
      ? validateOperationScopeMigration(source, manifest)
      : version === TIMESERIES_MIGRATION
        ? validateTimeseriesMigration(source, manifest)
        : validateRemediationMigration(source, manifest);
  return {
    version,
    state: validation.ok ? 'PREFLIGHT_READY_FOR_SHADOW' : 'NO_GO',
    classification: validation.ok ? null : 'NO_GO',
    reasons: validation.reasons,
    validation,
    manifestVersion: SEMANTIC_MIGRATION_MANIFEST.version,
  };
}

function docker(args, input = undefined) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error([result.stderr, result.stdout].filter(Boolean).join('\n').trim() || `docker exit ${result.status}`);
  }
  return result.stdout?.trim() ?? '';
}

function psql(container, sql, args = ['-At', '-X', '-q']) {
  try {
    return docker(['exec', '-i', container, 'psql', ...args, '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], `${sql.trim()}\n`);
  } catch (error) {
    const marker = String(sql).match(/\b(?:select|insert|create|alter|grant|revoke|analyze|explain)\b[\s\S]*/i)?.[0]
      ?.replace(/\s+/g, ' ')
      .slice(0, 180) ?? 'unclassified';
    throw new Error(`PSQL_FAILED:${marker}:${error instanceof Error ? error.message : String(error)}`);
  }
}

function psqlJson(container, sql) {
  const output = psql(container, sql);
  if (!output) throw new Error('SHADOW_SQL_EMPTY_RESULT');
  return JSON.parse(output);
}

function waitShadow(container) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const state = spawnSync('docker', ['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}', container], { encoding: 'utf8', windowsHide: true });
    const health = state.stdout.trim();
    if (health === 'healthy') return;
    if (health === 'no-health') {
      const probe = spawnSync('docker', ['exec', container, 'psql', '-X', '-q', '-At', '-U', 'postgres', '-d', 'postgres', '-c', 'select 1'], { encoding: 'utf8', windowsHide: true });
      if (probe.status === 0 && probe.stdout.trim() === '1') return;
    }
    const wait = Date.now() + 500;
    while (Date.now() < wait) {}
  }
  throw new Error('SHADOW_DATABASE_NOT_READY');
}

const SHADOW_INIT_SQL_BASE = `
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role analytics_owner nologin nosuperuser nocreatedb nocreaterole noinherit;
exception when duplicate_object then null; end $$;
grant analytics_owner to postgres;
create schema if not exists app_private;
alter schema app_private owner to analytics_owner;
create table public.analytics_source_config(tenant_id text not null, object_type text not null, hubspot_pipeline_id text not null, group_company text, is_active boolean not null default true, is_archived boolean not null default false);
create table public.hubspot_tickets(tenant_id text not null, ticket_id text primary key, pipeline_id text not null, hs_created_at timestamptz not null);
create table public.analytics_ticket_resolution(tenant_id text not null, ticket_id text primary key, resolved_at timestamptz, resolution_days numeric);
create view public.vw_analytics_ticket_resolution with (security_invoker = true) as
  select tenant_id, ticket_id, resolved_at, resolution_days from public.analytics_ticket_resolution;
create table public.hubspot_deals(tenant_id text not null, deal_id text primary key, pipeline_id text not null, hs_created_at timestamptz not null, hs_closed_at timestamptz, amount_home numeric(14,2), dealstage text not null);
create table public.hubspot_pipeline_stages(tenant_id text not null, object_type text not null, pipeline_id text not null, stage_id text not null, is_won boolean not null, is_closed boolean not null);
create table public.analytics_finance_receivables(tenant_id text not null, receivable_id text primary key, due_date date, last_received_date date, received_amount numeric(14,2), balance numeric(14,2), is_cancelled boolean not null default false, is_current boolean not null default true);
create table app_private.analytics_memberships(tenant_id text not null, user_id text not null, active boolean not null default true, primary key (tenant_id, user_id));

alter table public.analytics_source_config enable row level security;
alter table public.analytics_source_config force row level security;
alter table public.hubspot_tickets enable row level security;
alter table public.hubspot_tickets force row level security;
alter table public.analytics_ticket_resolution enable row level security;
alter table public.analytics_ticket_resolution force row level security;
alter table public.hubspot_deals enable row level security;
alter table public.hubspot_deals force row level security;
alter table public.hubspot_pipeline_stages enable row level security;
alter table public.hubspot_pipeline_stages force row level security;
alter table public.analytics_finance_receivables enable row level security;
alter table public.analytics_finance_receivables force row level security;
alter table app_private.analytics_memberships enable row level security;
alter table app_private.analytics_memberships force row level security;

create policy shadow_analytics_source_read on public.analytics_source_config for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_hubspot_tickets_read on public.hubspot_tickets for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_ticket_resolution_read on public.analytics_ticket_resolution for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_hubspot_deals_read on public.hubspot_deals for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_pipeline_stages_read on public.hubspot_pipeline_stages for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_finance_read on public.analytics_finance_receivables for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));
create policy shadow_membership_read on app_private.analytics_memberships for select to authenticated, analytics_owner using (tenant_id = current_setting('request.jwt.claim.tenant_id', true));

grant usage, create on schema public to analytics_owner;
grant usage on schema app_private to authenticated;
grant usage on schema public to authenticated, analytics_owner;
grant select on public.analytics_source_config, public.hubspot_tickets, public.analytics_ticket_resolution, public.vw_analytics_ticket_resolution, public.hubspot_deals, public.hubspot_pipeline_stages, public.analytics_finance_receivables, app_private.analytics_memberships to authenticated, analytics_owner;
create or replace function app_private.can_read_analytics()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from app_private.analytics_memberships m
    where m.tenant_id = current_setting('request.jwt.claim.tenant_id', true)
      and m.user_id = current_setting('request.jwt.claim.sub', true)
      and m.active
  );
$$;
alter function app_private.can_read_analytics() owner to analytics_owner;
grant execute on function app_private.can_read_analytics() to authenticated, analytics_owner;
create or replace function app_private.set_analytics_operation_scope(p_group_company text)
returns void language plpgsql security definer set search_path = '' as $$
begin perform set_config('app.analytics_group_company', coalesce(p_group_company, ''), true); end;
$$;
revoke all on function app_private.set_analytics_operation_scope(text) from public, anon, authenticated;
alter function app_private.set_analytics_operation_scope(text) owner to analytics_owner;
grant execute on function app_private.set_analytics_operation_scope(text) to analytics_owner;
create or replace function public.rpc_analytics_ceo_snapshot_legacy(p_from date, p_to date)
returns jsonb language sql security definer set search_path = '' as $$ select jsonb_build_object('owner','Sem responsÃ¡vel','fallback','Sem responsavel'); $$;
create or replace function public.rpc_analytics_customer_success_kpis_v2()
returns jsonb language sql security definer set search_path = '' as $$ select jsonb_build_object('owner','Sem responsÃ¡vel','fallback','Sem responsavel'); $$;
create or replace function public.rpc_analytics_support_kpis_v2(p_from date, p_to date, p_pipeline_id text, p_priority text)
returns jsonb language sql security definer set search_path = '' as $$ select jsonb_build_object('owner','Sem responsÃ¡vel','fallback','Sem responsavel'); $$;
revoke all on function public.rpc_analytics_ceo_snapshot_legacy(date,date), public.rpc_analytics_customer_success_kpis_v2(), public.rpc_analytics_support_kpis_v2(date,date,text,text) from public, anon;
grant execute on function public.rpc_analytics_ceo_snapshot_legacy(date,date), public.rpc_analytics_customer_success_kpis_v2(), public.rpc_analytics_support_kpis_v2(date,date,text,text) to authenticated, service_role;
`;

export function buildShadowInitSql(definition = loadCanonicalTimeseriesDefinition()) {
  return `${SHADOW_INIT_SQL_BASE}
${definition}
alter function public.rpc_analytics_timeseries(text,date,date,text) owner to analytics_owner;
revoke all on function public.rpc_analytics_timeseries(text,date,date,text) from public, anon;
grant execute on function public.rpc_analytics_timeseries(text,date,date,text) to authenticated, service_role;
`;
}

const SHADOW_SEMANTIC_DATA_SQL = `
insert into app_private.analytics_memberships(tenant_id,user_id) values ('tenant-a','user-a'),('tenant-b','user-b');
insert into public.analytics_source_config(tenant_id,object_type,hubspot_pipeline_id,group_company) values
('tenant-a','ticket','ticket-keep','commercial'),('tenant-a','ticket','ticket-drop','commercial'),('tenant-a','ticket','ticket-support','support'),
('tenant-a','deal','deal-keep','commercial'),('tenant-a','deal','deal-drop','commercial'),
('tenant-b','ticket','tenant-b-ticket','commercial'),('tenant-b','deal','tenant-b-deal','commercial');
insert into public.hubspot_tickets(tenant_id,ticket_id,pipeline_id,hs_created_at) values
('tenant-a','ticket-keep','ticket-keep','2026-02-05T10:00:00Z'),('tenant-a','ticket-drop','ticket-drop','2026-02-10T10:00:00Z'),('tenant-a','ticket-support','ticket-support','2026-02-12T10:00:00Z'),
('tenant-b','tenant-b-ticket-row','tenant-b-ticket','2026-02-07T10:00:00Z');
insert into public.analytics_ticket_resolution(tenant_id,ticket_id,resolved_at,resolution_days) values
('tenant-a','ticket-keep','2026-02-08T10:00:00Z',3),('tenant-a','ticket-drop','2026-02-11T10:00:00Z',1),('tenant-a','ticket-support','2026-02-15T10:00:00Z',3),
('tenant-b','tenant-b-ticket-row','2026-02-09T10:00:00Z',2);
insert into public.hubspot_deals(tenant_id,deal_id,pipeline_id,hs_created_at,hs_closed_at,amount_home,dealstage) values
('tenant-a','deal-keep','deal-keep','2026-02-06T10:00:00Z','2026-02-15T10:00:00Z',100,'won'),('tenant-a','deal-drop','deal-drop','2026-02-12T10:00:00Z','2026-02-20T10:00:00Z',50,'lost'),
('tenant-b','tenant-b-deal-row','tenant-b-deal','2026-02-08T10:00:00Z','2026-02-18T10:00:00Z',999,'won');
insert into public.hubspot_pipeline_stages(tenant_id,object_type,pipeline_id,stage_id,is_won,is_closed) values
('tenant-a','deal','deal-keep','won',true,true),('tenant-a','deal','deal-drop','lost',false,true),
('tenant-b','deal','tenant-b-deal','won',true,true);
insert into public.analytics_finance_receivables(tenant_id,receivable_id,due_date,last_received_date,received_amount,balance) values
('tenant-a','receivable-a','2026-02-10','2026-02-12',40,60),('tenant-a','receivable-b','2026-02-20',null,0,80),
('tenant-b','tenant-b-receivable','2026-02-14','2026-02-16',999,0);
`;

export function buildSyntheticFixtureSql(rowsPerTable) {
  if (!Number.isSafeInteger(rowsPerTable)
    || rowsPerTable < SEMANTIC_PREFLIGHT_BENCHMARK_LIMITS.minRowsPerTable
    || rowsPerTable > SEMANTIC_PREFLIGHT_BENCHMARK_LIMITS.maxRowsPerTable) {
    throw new Error('BENCHMARK_FIXTURE_VOLUME_INVALID');
  }
  return `${SHADOW_SEMANTIC_DATA_SQL}
insert into public.analytics_source_config(tenant_id, object_type, hubspot_pipeline_id, group_company)
select 'tenant-a', 'ticket', 'bench-ticket-' || ((n - 1) % 100), 'benchmark'
from generate_series(1, 100) as item(n)
union all
select 'tenant-a', 'deal', 'bench-deal-' || ((n - 1) % 100), 'benchmark'
from generate_series(1, 100) as item(n);
insert into public.hubspot_tickets(tenant_id, ticket_id, pipeline_id, hs_created_at)
select 'tenant-a', 'bench-ticket-row-' || n, 'bench-ticket-' || ((n - 1) % 100), '2026-01-01T00:00:00Z'
from generate_series(1, ${rowsPerTable}) as item(n);
insert into public.hubspot_deals(tenant_id, deal_id, pipeline_id, hs_created_at, hs_closed_at, amount_home, dealstage)
select 'tenant-a', 'bench-deal-row-' || n, 'bench-deal-' || ((n - 1) % 100), '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z', 1, 'won'
from generate_series(1, ${rowsPerTable}) as item(n);
analyze public.analytics_source_config, public.hubspot_tickets, public.hubspot_deals;`;
}

const BENCHMARK_WORKLOADS = Object.freeze([
  {
    id: 'rpc_analytics_timeseries_all',
    excludedPipelineIds: '',
    statement: `select sum(length(public.rpc_analytics_timeseries(
  'commercial',
  date '2026-01-01' + (calls.n - calls.n),
  date '2026-01-31' + (calls.n - calls.n),
  'month')::text))
from generate_series(1, ${BENCHMARK_RPC_REPEAT_COUNT}) as calls(n);`,
  },
  {
    id: 'rpc_analytics_timeseries_excluded',
    excludedPipelineIds: 'bench-ticket-1,bench-deal-1',
    statement: `select sum(length(public.rpc_analytics_timeseries(
  'commercial',
  date '2026-01-01' + (calls.n - calls.n),
  date '2026-01-31' + (calls.n - calls.n),
  'month')::text))
from generate_series(1, ${BENCHMARK_RPC_REPEAT_COUNT}) as calls(n);`,
  },
  {
    id: 'timeseries_join_all',
    excludedPipelineIds: '',
    statement: `select count(*)
from public.hubspot_tickets t
join public.analytics_source_config c
  on c.object_type = 'ticket'
 and c.hubspot_pipeline_id = t.pipeline_id
 and c.is_active
 and not coalesce(c.is_archived, false)
 and (nullif(current_setting('app.analytics_group_company', true), '') is null
      or c.group_company = current_setting('app.analytics_group_company', true))
 and (nullif(current_setting('app.analytics_excluded_pipeline_ids', true), '') is null
      or t.pipeline_id <> all(string_to_array(current_setting('app.analytics_excluded_pipeline_ids', true), ',')));`,
  },
  {
    id: 'timeseries_join_excluded',
    excludedPipelineIds: 'bench-ticket-1,bench-deal-1',
    statement: `select count(*)
from public.hubspot_tickets t
join public.analytics_source_config c
  on c.object_type = 'ticket'
 and c.hubspot_pipeline_id = t.pipeline_id
 and c.is_active
 and not coalesce(c.is_archived, false)
 and (nullif(current_setting('app.analytics_group_company', true), '') is null
      or c.group_company = current_setting('app.analytics_group_company', true))
 and (nullif(current_setting('app.analytics_excluded_pipeline_ids', true), '') is null
      or t.pipeline_id <> all(string_to_array(current_setting('app.analytics_excluded_pipeline_ids', true), ',')));`,
  },
]);

function benchmarkQuery(workload, timeoutMs) {
  const excluded = workload.excludedPipelineIds.replaceAll("'", "''");
  return `set role authenticated;
set statement_timeout = '${timeoutMs}ms';
set request.jwt.claim.tenant_id = 'tenant-a';
set request.jwt.claim.sub = 'user-a';
set app.analytics_group_company = 'benchmark';
set app.analytics_excluded_pipeline_ids = '${excluded}';
explain (analyze, buffers, format json)
${workload.statement}`;
}

function functionDefinitionSql() {
  return `select pg_get_functiondef(
    'public.rpc_analytics_timeseries(text,date,date,text)'::regprocedure
  )`;
}

function predicateEvidence(definition) {
  const source = String(definition);
  return {
    sha256: sha256(source),
    currentSettingCount: countOccurrences(source, "current_setting('app.analytics_excluded_pipeline_ids', true)"),
    stringToArrayCount: countOccurrences(source, 'string_to_array('),
    localScopeVariables: ['v_group_company', 'v_excluded_pipeline_ids'].filter((name) => source.includes(name)),
    variablePredicateCount: countOccurrences(source, 'v_excluded_pipeline_ids is null'),
  };
}

function authContextSql({ tenantId, userId }) {
  return `set role authenticated;
set request.jwt.claim.tenant_id = '${tenantId}';
set request.jwt.claim.sub = '${userId}';`;
}

function readSemanticSnapshot(container, context = SHADOW_TENANT_CONTEXTS.tenantA) {
  const utf8Values = psqlJson(container, `${authContextSql(context)}
select jsonb_build_object(
    'ceo', public.rpc_analytics_ceo_snapshot_legacy(date '2026-02-01', date '2026-02-28'),
    'cs', public.rpc_analytics_customer_success_kpis_v2(),
    'support', public.rpc_analytics_support_kpis_v2(date '2026-02-01', date '2026-02-28', null, null)
  )`);
  const direct = psqlJson(container, `${authContextSql(context)}
select jsonb_build_object(
  'support', public.rpc_analytics_timeseries('support', date '2026-02-01', date '2026-02-28', 'month'),
  'commercial', public.rpc_analytics_timeseries('commercial', date '2026-02-01', date '2026-02-28', 'month'),
  'finance', public.rpc_analytics_timeseries('finance', date '2026-02-01', date '2026-02-28', 'month'),
  'unknown', public.rpc_analytics_timeseries('product', date '2026-02-01', date '2026-02-28', 'month')
)`);
  const seriesFiltered = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('commercial', date '2026-02-01', date '2026-02-28', 'month', 'commercial', array['deal-drop']::text[])`);
  const seriesSingle = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('support', date '2026-02-01', date '2026-02-28', 'month', 'support', array['ticket-drop']::text[])`);
  const seriesMultiple = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('commercial', date '2026-02-01', date '2026-02-28', 'month', 'commercial', array['deal-drop','deal-not-present']::text[])`);
  const seriesAll = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('commercial', date '2026-02-01', date '2026-02-28', 'month', 'commercial', '{}'::text[])`);
  const seriesOtherOperation = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('support', date '2026-02-01', date '2026-02-28', 'month', 'support', '{}'::text[])`);
  const seriesFinance = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('finance', date '2026-02-01', date '2026-02-28', 'month', 'commercial', '{}'::text[])`);
  const seriesMissing = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('commercial', date '2026-02-01', date '2026-02-28', 'month', 'does-not-exist', '{}'::text[])`);
  const operationCrossTenant = psqlJson(container, `${authContextSql(context)}
select public.rpc_analytics_timeseries_by_operation('commercial', date '2026-02-01', date '2026-02-28', 'month', 'tenant-b', '{}'::text[])`);
  return {
    context,
    utf8Values,
    direct,
    seriesFiltered,
    seriesSingle,
    seriesMultiple,
    seriesAll,
    seriesOtherOperation,
    seriesFinance,
    seriesMissing,
    operationCrossTenant,
  };
}

function readTenantIsolationProbe(container, context = SHADOW_TENANT_CONTEXTS.tenantA) {
  return psqlJson(container, `${authContextSql(context)}
select jsonb_build_object(
  'visible_tenant', '${context.tenantId}',
  'visible_tickets', (select coalesce(jsonb_agg(ticket_id order by ticket_id), '[]'::jsonb) from (select ticket_id from public.hubspot_tickets order by ticket_id limit 20) sample),
  'visible_deals', (select coalesce(jsonb_agg(deal_id order by deal_id), '[]'::jsonb) from (select deal_id from public.hubspot_deals order by deal_id limit 20) sample),
  'visible_ticket_count', (select count(*) from public.hubspot_tickets),
  'visible_deal_count', (select count(*) from public.hubspot_deals),
  'cross_tenant_ticket_count', (select count(*) from public.hubspot_tickets where tenant_id <> '${context.tenantId}'),
  'cross_tenant_deal_count', (select count(*) from public.hubspot_deals where tenant_id <> '${context.tenantId}')
)`);
}

function evaluateSemanticSnapshot(snapshot) {
  const contract = snapshot.direct ?? {};
  const payloadShape = ['support', 'commercial', 'finance'].every((domain) => {
    const value = contract[domain];
    return value?.domain === (domain === 'unknown' ? 'product' : domain)
      && typeof value.grain === 'string'
      && value.period_from === '2026-02-01'
      && value.period_to === '2026-02-28'
      && Array.isArray(value.series);
  })
    && contract.unknown?.domain === 'product'
    && typeof contract.unknown.grain === 'string'
    && Array.isArray(contract.unknown.series)
    && contract.unknown.unavailable_reason === 'history_insufficient';
  const seriesKeys = {
    support: ['period', 'opened', 'resolved', 'balance', 'cumulative_balance', 'median_resolution_days'],
    commercial: ['period', 'created', 'won', 'lost', 'won_amount', 'win_rate'],
    finance: ['period', 'received', 'expected', 'overdue'],
  };
  const completeSeries = ['support', 'commercial', 'finance'].every((domain) => {
    const rows = contract[domain]?.series ?? [];
    return rows.length > 0 && seriesKeys[domain].every((key) => Object.hasOwn(rows[0], key));
  });
  const hasLegends = ['support', 'commercial', 'finance'].every((domain) => Object.keys(contract[domain]?.legend ?? {}).length >= 3);
  const expectedCommercial = snapshot.context?.tenantId === 'tenant-b' ? 1 : 2;
  const expectedSupport = snapshot.context?.tenantId === 'tenant-b' ? 0 : 1;
  const excludedCommercial = snapshot.context?.tenantId === 'tenant-b' ? 1 : 1;
  const excludedSupport = snapshot.context?.tenantId === 'tenant-b' ? 0 : 1;
  const commercialTotal = (payload) => (payload?.series ?? []).reduce((sum, row) => sum + Number(row.created ?? 0), 0);
  const supportTotal = (payload) => (payload?.series ?? []).reduce((sum, row) => sum + Number(row.opened ?? 0), 0);
  const missingOperationContract = snapshot.seriesMissing?.domain === 'commercial'
    && Array.isArray(snapshot.seriesMissing?.series)
    && snapshot.seriesMissing.series.length > 0
    && snapshot.seriesMissing.series.every((row) => Number(row.created ?? 0) === 0
      && Number(row.won ?? 0) === 0
      && Number(row.lost ?? 0) === 0
      && Number(row.won_amount ?? 0) === 0);
  return {
    utf8Corrected: JSON.stringify(snapshot.utf8Values).includes('Sem responsável') && !JSON.stringify(snapshot.utf8Values).includes('Sem responsÃ¡vel'),
    completeContract: payloadShape && completeSeries && hasLegends && contract.unknown?.unavailable_reason === 'history_insufficient',
    exclusionSingle: commercialTotal(snapshot.seriesFiltered) === excludedCommercial,
    exclusionSimple: supportTotal(snapshot.seriesSingle) === excludedSupport,
    exclusionMultiple: commercialTotal(snapshot.seriesMultiple) === excludedCommercial,
    exclusionEmpty: commercialTotal(snapshot.seriesAll) === expectedCommercial,
    financeUnavailable: snapshot.seriesFinance?.unavailable_reason === 'operation_dimension_unavailable',
    missingOperationPreservesRealContract: missingOperationContract,
    operationIsolation: supportTotal(snapshot.seriesOtherOperation) === expectedSupport,
  };
}

export function assessCrossTenantEvidence({ rlsPolicyPresent, tenantA, tenantB, snapshotA, snapshotB }) {
  const directPolicyProven = Boolean(rlsPolicyPresent
    && tenantA?.cross_tenant_ticket_count === 0
    && tenantA?.cross_tenant_deal_count === 0
    && tenantB?.cross_tenant_ticket_count === 0
    && tenantB?.cross_tenant_deal_count === 0
    && (tenantA?.visible_tickets ?? []).every((id) => !String(id).startsWith('tenant-b-'))
    && (tenantB?.visible_tickets ?? []).every((id) => !String(id).startsWith('ticket-')));
  const hasNoRows = (payload) => Boolean(
    payload?.domain === 'commercial'
      && Array.isArray(payload.series)
      && payload.series.length > 0
      && payload.series.every((row) => Number(row.created ?? 0) === 0
        && Number(row.won ?? 0) === 0
        && Number(row.lost ?? 0) === 0
        && Number(row.won_amount ?? 0) === 0),
  );
  const authenticatedRpcTenantProven = Boolean(
    hasNoRows(snapshotA?.operationCrossTenant)
      && hasNoRows(snapshotB?.operationCrossTenant),
  );
  return {
    directPolicyProven,
    authenticatedRpcTenantProven: Boolean(authenticatedRpcTenantProven),
    proven: directPolicyProven && Boolean(authenticatedRpcTenantProven),
  };
}

export const CATALOG_ALLOWLIST = Object.freeze({
  historical: Object.freeze({
    functions: Object.freeze([
      'public.rpc_analytics_ceo_snapshot_legacy(p_from date, p_to date)',
      'public.rpc_analytics_customer_success_kpis_v2()',
      'public.rpc_analytics_support_kpis_v2(p_from date, p_to date, p_pipeline_id text, p_priority text)',
      'public.rpc_analytics_timeseries(p_domain text, p_from date, p_to date, p_grain text)',
      'public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text)',
      'public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[])',
      'app_private.set_analytics_operation_scope(p_group_company text)',
      'app_private.set_analytics_pipeline_exclusion_scope(p_pipeline_ids text[])',
    ]),
    function_security: Object.freeze([
      'public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text)',
      'public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[])',
      'app_private.set_analytics_operation_scope(p_group_company text)',
      'app_private.set_analytics_pipeline_exclusion_scope(p_pipeline_ids text[])',
    ]),
    tables: Object.freeze([]),
    grants: Object.freeze([
      'function:public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text)',
      'function:public.rpc_analytics_timeseries_by_operation(p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[])',
      'function:app_private.set_analytics_operation_scope(p_group_company text)',
      'function:app_private.set_analytics_pipeline_exclusion_scope(p_pipeline_ids text[])',
    ]),
    rls: Object.freeze([]),
    policies: Object.freeze([]),
  }),
  candidate: Object.freeze({
    functions: Object.freeze(['public.rpc_analytics_timeseries(p_domain text, p_from date, p_to date, p_grain text)']),
    function_security: Object.freeze([]),
    tables: Object.freeze([]),
    grants: Object.freeze([]),
    rls: Object.freeze([]),
    policies: Object.freeze([]),
  }),
});

const SHADOW_CATALOG_TABLES = Object.freeze([
  'analytics_source_config', 'hubspot_tickets', 'analytics_ticket_resolution',
  'vw_analytics_ticket_resolution', 'hubspot_deals', 'hubspot_pipeline_stages',
  'analytics_finance_receivables',
]);

function catalogSql() {
  const tableList = SHADOW_CATALOG_TABLES.map((name) => `'${name}'`).join(', ');
  return `select jsonb_build_object(
    'functions', coalesce((select jsonb_agg(jsonb_build_object(
      'identity', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      'definition', md5(pg_get_functiondef(p.oid))
    ) order by n.nspname, p.proname, p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private')), '[]'::jsonb),
    'function_security', coalesce((select jsonb_agg(jsonb_build_object(
      'identity', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
      'owner', pg_get_userbyid(p.proowner),
      'acl', coalesce(p.proacl::text, ''),
      'security_definer', p.prosecdef,
      'config', coalesce(p.proconfig::text, ''),
      'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute'),
      'service_role_execute', has_function_privilege('service_role', p.oid, 'execute')
    ) order by n.nspname, p.proname, p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private')), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(jsonb_build_object(
      'identity', n.nspname || '.' || c.relname,
      'owner', pg_get_userbyid(c.relowner),
      'kind', c.relkind,
      'persistence', c.relpersistence,
      'options', coalesce(c.reloptions::text, ''),
      'acl', coalesce(c.relacl::text, '')
    ) order by n.nspname, c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${tableList})), '[]'::jsonb),
    'grants', coalesce((select jsonb_agg(jsonb_build_object('identity', 'function:' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', 'acl', coalesce(p.proacl::text, '')) order by n.nspname, p.proname, p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private')), '[]'::jsonb),
    'rls', coalesce((select jsonb_agg(jsonb_build_object('table', n.nspname || '.' || c.relname, 'rowsecurity', c.relrowsecurity, 'forcerowsecurity', c.relforcerowsecurity) order by n.nspname, c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${tableList})), '[]'::jsonb),
    'policies', coalesce((select jsonb_agg(jsonb_build_object('table', schemaname || '.' || tablename, 'policy', policyname, 'permissive', permissive, 'roles', roles, 'cmd', cmd, 'qual', qual, 'with_check', with_check) order by schemaname, tablename, policyname) from pg_policies where (schemaname='public' and tablename in (${tableList})) or (schemaname='app_private' and tablename='analytics_memberships')), '[]'::jsonb)
  )`;
}

export function diffCatalog(before, after) {
  const changes = [];
  const compare = (kind, beforeRows, afterRows, keyFor, fields) => {
    const beforeByKey = new Map((beforeRows ?? []).map((row) => [keyFor(row), row]));
    const afterByKey = new Map((afterRows ?? []).map((row) => [keyFor(row), row]));
    const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
    for (const key of keys) {
      const previous = beforeByKey.get(key);
      const current = afterByKey.get(key);
      const changedFields = fields.filter((field) => JSON.stringify(previous?.[field]) !== JSON.stringify(current?.[field]));
      if (changedFields.length > 0) {
        changes.push({
          kind,
          key,
          change: previous && current ? 'CHANGED' : current ? 'ADDED' : 'REMOVED',
          fields: changedFields,
          before: previous ? Object.fromEntries(fields.map((field) => [field, previous[field]])) : null,
          after: current ? Object.fromEntries(fields.map((field) => [field, current[field]])) : null,
        });
      }
    }
  };

  compare('functions', before.functions, after.functions, (row) => row.identity, ['definition']);
  compare('function_security', before.function_security, after.function_security, (row) => row.identity, [
    'owner', 'acl', 'security_definer', 'config', 'anon_execute', 'authenticated_execute', 'service_role_execute',
  ]);
  compare('tables', before.tables, after.tables, (row) => row.identity, ['owner', 'kind', 'persistence', 'options', 'acl']);
  compare('grants', before.grants, after.grants, (row) => row.identity, ['acl']);
  compare('rls', before.rls, after.rls, (row) => row.table, ['rowsecurity', 'forcerowsecurity']);
  compare('policies', before.policies, after.policies, (row) => `${row.table}:${row.policy}`, [
    'permissive', 'roles', 'cmd', 'qual', 'with_check',
  ]);
  return changes.sort((left, right) => `${left.kind}:${left.key}`.localeCompare(`${right.kind}:${right.key}`));
}

export function evaluateCatalogAllowlist(changes, allowlist) {
  const violations = changes.filter((change) => !allowlist[change.kind]?.includes(change.key));
  return { allowed: violations.length === 0, violations };
}

function hasEmptySearchPath(config) {
  const normalized = String(config ?? '').replaceAll('\\"', '"');
  return /(?:^|[,{])\s*"?search_path"?\s*=\s*(?:""|(?=[,}]|$))/.test(normalized);
}

function securityPropertiesOk(rows) {
  return rows.length > 0 && rows.every((row) => {
    const isPublicRpc = String(row.identity ?? '').startsWith('public.');
    const grantShapeOk = isPublicRpc
      ? row.authenticated_execute === true && row.service_role_execute === true
      : row.authenticated_execute === false && row.service_role_execute === false;
    return row.anon_execute === false
      && row.security_definer === true
      && grantShapeOk
      && hasEmptySearchPath(row.config);
  });
}

function parseExplain(output) {
  const payload = JSON.parse(output);
  const plan = payload[0]?.['Plan'] ?? payload[0];
  const planShape = [];
  const visit = (node) => {
    if (!node) return;
    planShape.push({
      nodeType: node['Node Type'] ?? null,
      relation: node['Relation Name'] ?? null,
      index: node['Index Name'] ?? null,
      joinType: node['Join Type'] ?? null,
    });
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(plan);
  return {
    planningMs: payload[0]?.['Planning Time'] ?? null,
    executionMs: payload[0]?.['Execution Time'] ?? plan?.['Actual Total Time'] ?? null,
    node: plan?.['Node Type'] ?? null,
    totalCost: plan?.['Total Cost'] ?? null,
    planShape,
  };
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function benchmarkError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    ok: false,
    timeout: /statement timeout|canceling statement due to statement timeout|timeout/i.test(message),
    error: message,
  };
}

function runExplainBenchmark(container, workload, config) {
  const started = performance.now();
  try {
    const explain = parseExplain(psql(container, benchmarkQuery(workload, config.timeoutMs)));
    const wallClockMs = Number((performance.now() - started).toFixed(3));
    if (!Number.isFinite(explain.executionMs) || !Number.isFinite(explain.planningMs)) {
      return { ok: false, timeout: false, error: 'EXPLAIN_TIMING_MISSING' };
    }
    return { ok: true, ...explain, wallClockMs };
  } catch (error) {
    return benchmarkError(error);
  }
}

function runBenchmarkStage(container, config, stage) {
  const workloads = [];
  for (const workload of BENCHMARK_WORKLOADS) {
    const warmups = [];
    for (let index = 0; index < config.warmups; index += 1) {
      const result = runExplainBenchmark(container, workload, config);
      warmups.push(result);
      if (!result.ok) {
        workloads.push({ id: workload.id, excludedPipelineIds: workload.excludedPipelineIds, ok: false, warmups });
        return { stage, ok: false, workloads, error: result.error, timeout: result.timeout };
      }
    }
    const samples = [];
    for (let index = 0; index < config.runs; index += 1) {
      const result = runExplainBenchmark(container, workload, config);
      samples.push(result);
      if (!result.ok) {
        workloads.push({ id: workload.id, excludedPipelineIds: workload.excludedPipelineIds, ok: false, warmups, samples });
        return { stage, ok: false, workloads, error: result.error, timeout: result.timeout };
      }
    }
    workloads.push({
      id: workload.id,
      excludedPipelineIds: workload.excludedPipelineIds,
      ok: true,
      warmups,
      samples,
      median: {
        planningMs: median(samples.map((sample) => sample.planningMs)),
        executionMs: median(samples.map((sample) => sample.executionMs)),
        wallClockMs: median(samples.map((sample) => sample.wallClockMs)),
      },
      planShape: samples[0].planShape,
      totalCost: samples[0].totalCost,
    });
  }
  return { stage, ok: true, workloads };
}

export function compareBenchmarkStages(before, after, config) {
  const base = {
    executed: Boolean(before?.ok && after?.ok),
    timeout: Boolean(before?.timeout || after?.timeout),
    marginPercent: config.regressionMarginPercent,
    criterion: `mediana after <= mediana before + ${config.regressionMarginPercent}% ou ${config.absoluteRegressionMarginMs} ms, custo estimado <= before + ${config.costRegressionMarginPercent}% e forma do plano é idêntica; qualquer erro, timeout ou plano divergente é regressão/NO_GO`,
    workloads: [],
  };
  if (!base.executed) {
    return { ...base, comparable: false, passed: false, reason: 'BENCHMARK_NOT_COMPLETED', before, after };
  }
  for (const beforeWorkload of before.workloads) {
    const afterWorkload = after.workloads.find((candidate) => candidate.id === beforeWorkload.id);
    if (!afterWorkload?.ok) {
      return { ...base, comparable: false, passed: false, reason: 'BENCHMARK_WORKLOAD_MISSING', before, after };
    }
    const beforeExecution = beforeWorkload.median.executionMs;
    const afterExecution = afterWorkload.median.executionMs;
    const allowedExecution = Math.max(
      beforeExecution * (1 + config.regressionMarginPercent / 100),
      beforeExecution + config.absoluteRegressionMarginMs,
    );
    const beforeCost = beforeWorkload.totalCost;
    const afterCost = afterWorkload.totalCost;
    const allowedCost = beforeCost * (1 + config.costRegressionMarginPercent / 100);
    const planChanged = JSON.stringify(beforeWorkload.planShape) !== JSON.stringify(afterWorkload.planShape);
    const costRegressed = Number.isFinite(beforeCost)
      && Number.isFinite(afterCost)
      && afterCost > allowedCost;
    const timeRegressed = afterExecution > allowedExecution;
    base.workloads.push({
      id: beforeWorkload.id,
      before: beforeWorkload.median,
      after: afterWorkload.median,
      allowedExecutionMs: Number(allowedExecution.toFixed(3)),
      beforeCost,
      afterCost,
      allowedCost: Number(allowedCost.toFixed(3)),
      planChanged,
      costRegressed,
      timeRegressed,
      passed: !planChanged && !costRegressed && !timeRegressed,
      planShapeBefore: beforeWorkload.planShape,
      planShapeAfter: afterWorkload.planShape,
    });
  }
  const passed = base.workloads.every((workload) => workload.passed);
  return {
    ...base,
    comparable: true,
    passed,
    reason: passed ? 'BENCHMARK_COMPARATIVE_GO' : 'BENCHMARK_REGRESSION',
    before,
    after,
  };
}

const OPTIMIZED_RPC_WORKLOADS = new Set([
  'rpc_analytics_timeseries_all',
  'rpc_analytics_timeseries_excluded',
]);

export function assessOptimizedCandidate(current, candidate, config) {
  const comparison = compareBenchmarkStages(current, candidate, config);
  const unchangedWorkloads = comparison.workloads.filter((workload) => !OPTIMIZED_RPC_WORKLOADS.has(workload.id));
  const unchangedWorkloadsStable = unchangedWorkloads.every((workload) => !workload.planChanged && !workload.costRegressed);
  const optimizedWorkloadsComparable = comparison.workloads
    .filter((workload) => OPTIMIZED_RPC_WORKLOADS.has(workload.id));
  const optimizedWorkloadsPassed = optimizedWorkloadsComparable.length === OPTIMIZED_RPC_WORKLOADS.size
    && optimizedWorkloadsComparable.every((workload) => workload.passed);
  const reductions = [];
  for (const currentWorkload of current?.workloads ?? []) {
    if (!OPTIMIZED_RPC_WORKLOADS.has(currentWorkload.id)) continue;
    const candidateWorkload = candidate?.workloads?.find((workload) => workload.id === currentWorkload.id);
    reductions.push({
      id: currentWorkload.id,
      currentExecutionMs: currentWorkload.median?.executionMs ?? null,
      candidateExecutionMs: candidateWorkload?.median?.executionMs ?? null,
      reduced: Boolean(candidateWorkload?.ok && candidateWorkload.median.executionMs < currentWorkload.median.executionMs),
    });
  }
  const strictRpcReduction = reductions.length === OPTIMIZED_RPC_WORKLOADS.size && reductions.every((workload) => workload.reduced);
  const atLeastOneRpcReduction = reductions.some((workload) => workload.reduced);
  const candidateComparisonPassed = optimizedWorkloadsPassed && unchangedWorkloadsStable;
  return {
    ...comparison,
    unchangedWorkloadsStable,
    optimizedWorkloadsPassed,
    strictRpcReduction,
    atLeastOneRpcReduction,
    reductions,
    passed: candidateComparisonPassed && atLeastOneRpcReduction,
    reason: candidateComparisonPassed && atLeastOneRpcReduction ? 'OPTIMIZED_CANDIDATE_GO' : 'OPTIMIZED_CANDIDATE_REGRESSION',
  };
}

export function evaluateGlobalPreflightDecision({ staticOk, shadowResult, historicalGate = HISTORICAL_MIGRATION_GATE }) {
  const shadowState = shadowResult?.state ?? 'NOT_RUN';
  const candidateGo = Boolean(
    staticOk
      && (shadowState === 'SHADOW_REPLAY_GO' || shadowState === 'SHADOW_REPLAY_CANDIDATE_GO')
      && shadowResult?.performance?.passed === true,
  );
  const historicalReplayGo = Boolean(
    staticOk
      && shadowState === 'SHADOW_REPLAY_GO'
      && (shadowResult?.performance?.comparison?.current?.passed ?? shadowResult?.performance?.passed) === true,
  );
  const historicalNoGo = historicalGate?.state === 'historical_no_go';
  const historicalState = historicalNoGo
    ? 'historical_no_go'
    : historicalReplayGo
      ? 'historical_go'
      : 'historical_no_go';
  const globalState = historicalState === 'historical_go' && historicalReplayGo ? 'GO' : 'NO_GO';
  return {
    state: globalState,
    globalState,
    shadowState,
    candidateState: candidateGo ? 'candidate_go' : 'candidate_no_go',
    historicalState,
    candidate: {
      state: candidateGo ? 'candidate_go' : 'candidate_no_go',
      shadowState,
      performancePassed: shadowResult?.performance?.passed === true,
    },
    historical: {
      state: historicalState,
      replayPassed: historicalReplayGo,
      reason: historicalNoGo ? historicalGate.reason : null,
      evidence: historicalNoGo ? historicalGate.evidence : null,
    },
    failClosed: globalState === 'NO_GO',
    decision: candidateGo && historicalNoGo
      ? 'CANDIDATE_GO_ONLY: historical_no_go; não autorizar migration histórica'
      : candidateGo
        ? 'GO somente para etapa separada, nunca para este processo'
        : 'OWNER_DECISION_REQUIRED: não autorizar rebuild do banco local principal',
  };
}

export async function runShadowReplay({ root = ROOT, dockerImage = SHADOW_IMAGE, benchmarkConfig = readBenchmarkConfig() } = {}) {
  if (dockerImage !== SHADOW_IMAGE) throw new Error('SHADOW_IMAGE_INVALID');
  const name = `${SEMANTIC_MIGRATION_MANIFEST.shadow.namespacePrefix}${process.pid}`;
  if (name === CANONICAL_CONTAINER || name.includes('genius-support-os')) throw new Error('SHADOW_IDENTITY_COLLISION');
  let container = null;
  try {
    docker(['run', '--detach', '--rm', '--name', name,
      '--label', 'com.confione.scope=semantic-preflight-shadow',
      '--label', `com.confione.canonical-container=${CANONICAL_CONTAINER}`,
      '--env', 'POSTGRES_PASSWORD=shadow-only', dockerImage]);
    container = name;
    waitShadow(container);
    psql(container, buildShadowInitSql());
    const beforeFirst = psqlJson(container, catalogSql());
    psql(container, buildSyntheticFixtureSql(benchmarkConfig.rowsPerTable));
    const benchmarkBefore = runBenchmarkStage(container, benchmarkConfig, 'before_migrations');
    for (const version of HISTORICAL_MIGRATIONS) {
      psql(container, loadMigration(version));
    }
    const afterHistorical = psqlJson(container, catalogSql());
    psql(container, 'analyze public.analytics_source_config, public.hubspot_tickets, public.hubspot_deals;');
    const benchmarkAfter = runBenchmarkStage(container, benchmarkConfig, 'after_migrations');
    const currentPerformance = compareBenchmarkStages(benchmarkBefore, benchmarkAfter, benchmarkConfig);
    const currentSnapshot = readSemanticSnapshot(container, SHADOW_TENANT_CONTEXTS.tenantA);
    const currentTenantBSnapshot = readSemanticSnapshot(container, SHADOW_TENANT_CONTEXTS.tenantB);
    const currentDefinition = psql(container, functionDefinitionSql());

    // Aplica a migration versionada real como candidato separado. Ela deriva
    // a definição vigente no próprio shadow; nenhum SQL sintético substitui a
    // migration candidata.
    psql(container, loadMigration(REMEDIATION_MIGRATION));
    const afterCandidate = psqlJson(container, catalogSql());
    psql(container, 'analyze public.analytics_source_config, public.hubspot_tickets, public.hubspot_deals;');
    const benchmarkCandidate = runBenchmarkStage(container, benchmarkConfig, 'optimized_candidate');
    const candidatePerformance = compareBenchmarkStages(benchmarkBefore, benchmarkCandidate, benchmarkConfig);
    const candidateVsCurrentPerformance = assessOptimizedCandidate(benchmarkAfter, benchmarkCandidate, benchmarkConfig);
    const candidateSnapshot = readSemanticSnapshot(container, SHADOW_TENANT_CONTEXTS.tenantA);
    const candidateDefinition = psql(container, functionDefinitionSql());
    const tenantA = readTenantIsolationProbe(container, SHADOW_TENANT_CONTEXTS.tenantA);
    const tenantB = readTenantIsolationProbe(container, SHADOW_TENANT_CONTEXTS.tenantB);
    const candidateTenantSnapshotB = readSemanticSnapshot(container, SHADOW_TENANT_CONTEXTS.tenantB);

    const explainFiltered = parseExplain(psql(container, `explain (analyze, format json) select count(*) from public.hubspot_tickets t join public.analytics_source_config c on c.object_type='ticket' and c.hubspot_pipeline_id=t.pipeline_id and (nullif(current_setting('app.analytics_excluded_pipeline_ids', true), '') is null or t.pipeline_id <> all(string_to_array(current_setting('app.analytics_excluded_pipeline_ids', true), ',')))`));
    const explainAll = parseExplain(psql(container, `explain (analyze, format json) select count(*) from public.hubspot_tickets t join public.analytics_source_config c on c.object_type='ticket' and c.hubspot_pipeline_id=t.pipeline_id`));
    const targetPattern = /(?:rpc_analytics_ceo_snapshot_legacy|rpc_analytics_customer_success_kpis_v2|rpc_analytics_support_kpis_v2|rpc_analytics_timeseries_by_operation|rpc_analytics_timeseries|set_analytics_operation_scope|set_analytics_pipeline_exclusion_scope)/;
    const targetFunctions = (afterCandidate.function_security ?? []).filter((row) => targetPattern.test(row.identity));
    const currentTargetFunctions = (afterHistorical.function_security ?? []).filter((row) => targetPattern.test(row.identity));
    const identityVerified = container === name
      && name.startsWith(SEMANTIC_MIGRATION_MANIFEST.shadow.namespacePrefix)
      && name !== CANONICAL_CONTAINER
      && !name.includes('genius-support-os');
    const aclOk = securityPropertiesOk(targetFunctions);
    const currentAclOk = securityPropertiesOk(currentTargetFunctions);
    const requiredRlsTables = ['public.analytics_source_config', 'public.hubspot_tickets', 'public.analytics_ticket_resolution', 'public.hubspot_deals', 'public.hubspot_pipeline_stages', 'public.analytics_finance_receivables'];
    const rlsPolicyPresent = requiredRlsTables.every((table) => (afterCandidate.rls ?? []).some((row) => row.table === table && row.rowsecurity === true && row.forcerowsecurity === true))
      && requiredRlsTables.every((table) => (afterCandidate.policies ?? []).some((row) => row.table === table && row.policy.startsWith('shadow_') && String(row.qual).includes('request.jwt.claim.tenant_id')))
      && (afterCandidate.policies ?? []).some((row) => row.table === 'app_private.analytics_memberships' && row.policy === 'shadow_membership_read');
    const crossTenantEvidence = assessCrossTenantEvidence({
      rlsPolicyPresent,
      tenantA,
      tenantB,
      snapshotA: candidateSnapshot,
      snapshotB: candidateTenantSnapshotB,
    });
    const rlsOk = crossTenantEvidence.proven;
    const currentSemanticChecks = evaluateSemanticSnapshot(currentSnapshot);
    const currentTenantBSemanticChecks = evaluateSemanticSnapshot(currentTenantBSnapshot);
    const candidateSemanticChecks = evaluateSemanticSnapshot(candidateSnapshot);
    const candidateTenantBSemanticChecks = evaluateSemanticSnapshot(candidateTenantSnapshotB);
    const semanticEquivalent = JSON.stringify(currentSnapshot) === JSON.stringify(candidateSnapshot)
      && JSON.stringify(currentTenantBSnapshot) === JSON.stringify(candidateTenantSnapshotB);
    const semanticChecks = {
      ...candidateSemanticChecks,
      currentImplementation: currentSemanticChecks,
      currentTenantBImplementation: currentTenantBSemanticChecks,
      candidateTenantBImplementation: candidateTenantBSemanticChecks,
      candidateEquivalentToCurrent: semanticEquivalent,
      currentTenantB: evaluateSemanticSnapshot(currentTenantBSnapshot),
      candidateTenantBEquivalentToCurrent: JSON.stringify(currentTenantBSnapshot) === JSON.stringify(candidateTenantSnapshotB),
      aclOk,
      currentAclOk,
      rlsPolicyPresent,
      tenantA,
      tenantB,
      rlsCrossTenantProven: crossTenantEvidence.directPolicyProven,
      authenticatedRpcTenantProven: crossTenantEvidence.authenticatedRpcTenantProven,
      crossTenantEvidence,
      rlsOk,
    };
    const allowedDiff = CATALOG_ALLOWLIST.historical;
    const diff = diffCatalog(beforeFirst, afterHistorical)
      .sort((left, right) => `${left.kind}:${left.key}`.localeCompare(`${right.kind}:${right.key}`));
    const candidateDiff = diffCatalog(afterHistorical, afterCandidate);
    const catalogAssessment = evaluateCatalogAllowlist(diff, allowedDiff);
    const candidateCatalogAssessment = evaluateCatalogAllowlist(candidateDiff, CATALOG_ALLOWLIST.candidate);
    const catalogAllowed = catalogAssessment.allowed;
    const candidateCatalogAllowed = candidateCatalogAssessment.allowed;
    const currentReplayOk = identityVerified && Object.values(currentSemanticChecks).every(Boolean) && Object.values(currentTenantBSemanticChecks).every(Boolean) && currentAclOk && rlsOk && catalogAllowed;
    const candidateReplayOk = identityVerified && Object.values(candidateSemanticChecks).every(Boolean) && Object.values(candidateTenantBSemanticChecks).every(Boolean) && semanticEquivalent && semanticChecks.aclOk && semanticChecks.currentAclOk && semanticChecks.rlsOk && catalogAllowed && candidateCatalogAllowed;
    return {
      state: currentReplayOk && currentPerformance.passed
        ? 'SHADOW_REPLAY_GO'
        : candidateReplayOk && candidateVsCurrentPerformance.passed
          ? 'SHADOW_REPLAY_CANDIDATE_GO'
          : 'NO_GO',
      targetIdentity: { container, image: dockerImage, canonicalContainer: CANONICAL_CONTAINER, disposable: true, verified: identityVerified },
      catalog: {
        diff,
        candidateDiff,
        allowlist: { historical: allowedDiff, candidate: CATALOG_ALLOWLIST.candidate },
        allowed: catalogAllowed,
        candidateAllowed: candidateCatalogAllowed,
        violations: { historical: catalogAssessment.violations, candidate: candidateCatalogAssessment.violations },
      },
      semanticChecks,
      acl: targetFunctions,
      performance: {
        synthetic: true,
        source: SEMANTIC_MIGRATION_MANIFEST.benchmark.source,
        volume: benchmarkConfig,
        comparable: candidateVsCurrentPerformance.comparable,
        passed: candidateVsCurrentPerformance.passed,
        reason: candidateVsCurrentPerformance.reason,
        before: benchmarkBefore,
        current: benchmarkAfter,
        candidate: benchmarkCandidate,
        comparison: {
          historical: currentPerformance,
          candidateVsBaseline: candidatePerformance,
          historicalVsRemediation: candidateVsCurrentPerformance,
        },
        predicateEvidence: {
          historical: predicateEvidence(currentDefinition),
          remediation: predicateEvidence(candidateDefinition),
        },
        legacyExplain: { filtered: explainFiltered, all: explainAll },
      },
      isolation: {
        current: currentSnapshot,
        candidate: candidateSnapshot,
        candidateTenantB: candidateTenantSnapshotB,
      },
    };
  } finally {
    if (container) {
      try { docker(['rm', '--force', container]); } catch { /* container descartável já pode ter encerrado */ }
    }
  }
}

function loadMigration(version) {
  const path = join(ROOT, SEMANTIC_MIGRATION_MANIFEST.migrations[version].file);
  return readFileSync(path, 'utf8');
}

export async function runPreflight({ shadow = true } = {}) {
  const staticResults = Object.keys(SEMANTIC_MIGRATION_MANIFEST.migrations).map((version) => preflightMigration({ version, source: loadMigration(version) }));
  let shadowResult = { state: 'NOT_RUN', reason: 'shadow replay não solicitado' };
  if (shadow && staticResults.every((result) => result.state === 'PREFLIGHT_READY_FOR_SHADOW')) {
    try {
      shadowResult = await runShadowReplay();
    } catch (error) {
      shadowResult = {
        state: 'NO_GO',
        reason: error instanceof Error ? error.message : String(error),
        dependency: 'Docker/PostgreSQL shadow',
        targetIdentity: {
          namespacePrefix: SEMANTIC_MIGRATION_MANIFEST.shadow.namespacePrefix,
          image: SEMANTIC_MIGRATION_MANIFEST.shadow.image,
          canonicalContainer: SEMANTIC_MIGRATION_MANIFEST.shadow.canonicalContainer,
          disposable: true,
        },
      };
    }
  }
  const staticOk = staticResults.every((result) => result.state === 'PREFLIGHT_READY_FOR_SHADOW');
  const globalDecision = evaluateGlobalPreflightDecision({ staticOk, shadowResult });
  const candidateGo = globalDecision.candidate.state === 'candidate_go';
  return {
    manifestVersion: SEMANTIC_MIGRATION_MANIFEST.version,
    state: globalDecision.state,
    globalState: globalDecision.globalState,
    candidateState: globalDecision.candidateState,
    historicalState: globalDecision.historicalState,
    candidate: globalDecision.candidate,
    historical: globalDecision.historical,
    failClosed: globalDecision.failClosed,
    historicalGate: HISTORICAL_MIGRATION_GATE,
    staticResults,
    shadow: shadowResult,
    migrationClassifications: [],
    candidateMigrationClassifications: candidateGo
      ? [REMEDIATION_MIGRATION].map((version) => ({ version, classification: SEMANTIC_MIGRATION_MANIFEST.migrations[version].classification }))
      : [],
    prohibitedMainDatabaseCommands: PROHIBITED_MAIN_DATABASE_COMMANDS,
    decision: globalDecision.decision,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const report = await runPreflight({ shadow: !process.argv.includes('--no-shadow') });
  console.log(JSON.stringify(report, null, 2));
}
