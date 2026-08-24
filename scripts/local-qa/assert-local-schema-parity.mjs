import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSql } from './sql.mjs';

export const PENDING_MIGRATION_PREFIXES = Object.freeze([
  '20260822190000',
  '20260822200000',
  '20260822220000',
  '20260823100000',
]);

export const HISTORICAL_EXCEPTION_MIGRATIONS = Object.freeze([
  '20260822220000',
  '20260823100000',
]);

export const TARGET_OBJECTS = Object.freeze([
  { key: 'rpc_service_promote_omie_snapshot', signature: 'p_sync_run_id uuid', migration: '20260822190000' },
  { key: 'internal_organizational_screen_defaults', signature: 'table', migration: '20260822200000' },
  { key: 'default_internal_screen_keys', signature: 'p_organizational_area_key text, p_legacy_area_key text', migration: '20260822200000' },
  { key: 'rpc_admin_update_internal_access_assignment', signature: 'p_user_id uuid, p_area_key text, p_function_id uuid, p_access_profile_id uuid', migration: '20260822200000' },
  { key: 'rpc_admin_assign_internal_access_profile', signature: 'p_membership_id uuid, p_access_profile_id uuid', migration: '20260822200000' },
  { key: 'rpc_analytics_ceo_snapshot_legacy', signature: 'p_from date, p_to date', migration: '20260822220000' },
  { key: 'rpc_analytics_customer_success_kpis_v2', signature: '', migration: '20260822220000' },
  { key: 'rpc_analytics_support_kpis_v2', signature: 'p_from date, p_to date, p_pipeline_id text, p_priority text', migration: '20260822220000' },
  { key: 'set_analytics_pipeline_exclusion_scope', signature: 'p_pipeline_ids text[]', migration: '20260823100000' },
  { key: 'rpc_analytics_timeseries_by_operation_5', signature: 'p_domain text, p_from date, p_to date, p_grain text, p_group_company text', migration: '20260823100000' },
  { key: 'rpc_analytics_timeseries_by_operation_6', signature: 'p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[]', migration: '20260823100000' },
]);

export function parseMigrationVersion(fileName) {
  const match = String(fileName).match(/^(\d{14})_/);
  return match?.[1] ?? null;
}

export function listFilesystemMigrations(migrationDirectory) {
  return readdirSync(migrationDirectory)
    .map(parseMigrationVersion)
    .filter(Boolean)
    .sort();
}

export function missingMigrations(filesystemVersions, appliedVersions) {
  const applied = new Set(appliedVersions);
  return filesystemVersions.filter((version) => !applied.has(version));
}

export function historyOnlyMigrations(filesystemVersions, appliedVersions) {
  const filesystem = new Set(filesystemVersions);
  return appliedVersions.filter((version) => !filesystem.has(version));
}

export function buildParityResult({
  filesystemVersions,
  appliedVersions,
  observedObjects = [],
  expectedObjects = TARGET_OBJECTS,
  migrationSafety = [],
}) {
  const findings = [];
  const missing = missingMigrations(filesystemVersions, appliedVersions);
  const historyOnly = historyOnlyMigrations(filesystemVersions, appliedVersions);
  if (missing.length) {
    findings.push({
      code: 'MIGRATION_MISSING_FROM_HISTORY',
      severity: 'HIGH',
      detail: missing.join(', '),
      action: 'aplicar somente após preflight local compatível e sem operação destrutiva',
    });
  }
  if (historyOnly.length) {
    findings.push({
      code: 'MIGRATION_HISTORY_WITHOUT_FILE',
      severity: 'HIGH',
      detail: historyOnly.join(', '),
      action: 'restaurar ou reconciliar o arquivo versionado antes de aplicar migrations pendentes',
    });
  }
  for (const safety of migrationSafety.filter((row) => row.safe === false)) {
    const historicalException = safety.historicalException === true;
    findings.push({
      code: 'MIGRATION_PREFLIGHT_BLOCKED',
      severity: 'HIGH',
      detail: historicalException
        ? `${safety.version}: HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF`
        : `${safety.version}: MIGRATION_PREFLIGHT_BLOCKED`,
      classification: historicalException
        ? 'HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF'
        : 'MIGRATION_PREFLIGHT_BLOCKED',
      action: historicalException
        ? 'manter a exceção local documentada; não tratar como aprovação técnica nem reaplicar sem preflight comprovado'
        : 'revisar o SQL da migration; não aplicar enquanto houver DO com SQL dinâmico não analisável',
    });
  }

  const observed = new Map(observedObjects.map((row) => [row.key, row]));
  for (const expected of expectedObjects) {
    const row = observed.get(expected.key);
    if (!row) {
      findings.push({
        code: 'EXECUTABLE_OBJECT_MISSING',
        severity: 'HIGH',
        detail: expected.key,
        action: `verificar migration de origem ${expected.migration} e schema local`,
      });
      continue;
    }
    if (expected.signature !== row.signature && expected.signature !== 'table') {
      findings.push({
        code: 'RPC_SIGNATURE_DIVERGENT',
        severity: 'HIGH',
        detail: `${expected.key}: esperado ${expected.signature}; observado ${row.signature}`,
        action: `reconciliar ${expected.migration} antes de validar o Dashboard`,
      });
    }
    if (row.versionPresent !== true || row.originVerified !== true) {
      findings.push({
        code: 'EXECUTABLE_OBJECT_WITHOUT_ORIGIN',
        severity: 'HIGH',
        detail: expected.key,
        action: 'comprovar versão presente e origem por declaração/hash da migration ou bloquear a validação',
      });
    }
  }

  return {
    ok: findings.length === 0,
    filesystemCount: filesystemVersions.length,
    appliedCount: appliedVersions.length,
    missingMigrations: missing,
    historyOnlyMigrations: historyOnly,
    objectEvidence: observedObjects.map((row) => ({
      key: row.key,
      migration: row.migration ?? null,
      versionPresent: row.versionPresent === true,
      originVerified: row.originVerified === true,
      classification: classifyObjectEvidence(row),
    })),
    findings,
  };
}

const DESTRUCTIVE_SQL_PATTERNS = Object.freeze([
  /drop\s+table/,
  /drop\s+column/,
  /truncate\b/,
  /delete\s+from/,
  /alter\s+table[^;\n]*\bdrop\b/,
]);

function stripSqlComments(sql) {
  return String(sql)
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .toLowerCase();
}

function isDestructiveSql(sql) {
  return DESTRUCTIVE_SQL_PATTERNS.some((pattern) => pattern.test(sql));
}

function classifyObjectEvidence(row) {
  if (row.versionPresent === true && row.originVerified === true) return 'VERIFIED_ORIGIN';
  if (row.versionPresent === true) return 'EXECUTABLE_OBJECT_WITHOUT_ORIGIN';
  return 'VERSION_NOT_PRESENT';
}

function stripPersistentFunctionBodies(sql, fileName) {
  const dollarTag = /\$(?:[a-z_]\w*)?\$/gi;
  let cursor = 0;
  let output = '';
  let opening;
  while ((opening = dollarTag.exec(sql)) !== null) {
    const tag = opening[0];
    const closingIndex = sql.indexOf(tag, opening.index + tag.length);
    if (closingIndex < 0) {
      throw new Error(`LOCAL_SCHEMA_PARITY_BLOCKED_UNPARSEABLE_DOLLAR_SQL: ${fileName}`);
    }
    const prefix = sql.slice(Math.max(0, opening.index - 160), opening.index);
    const body = sql.slice(opening.index + tag.length, closingIndex);
    const isDoBlock = /\bdo(?:\s+language\s+[a-z_][\w]*)?\s*$/i.test(prefix.trim());
    if (isDoBlock) {
      const bodySql = stripSqlComments(body);
      if (isDestructiveSql(bodySql) || /\bexecute\b/i.test(bodySql)) {
        throw new Error(`LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL: ${fileName}`);
      }
    }
    output += sql.slice(cursor, opening.index);
    output += ' ';
    cursor = closingIndex + tag.length;
    dollarTag.lastIndex = cursor;
  }
  return output + sql.slice(cursor);
}

export function assertNoDestructiveMigration(sql, fileName = 'migration') {
  const withoutComments = stripSqlComments(sql);
  const applySql = stripPersistentFunctionBodies(withoutComments, fileName);
  if (isDestructiveSql(applySql)) {
    throw new Error(`LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL: ${fileName}`);
  }
  return true;
}

function runLocalContainerPreflight() {
  const result = spawnSync('docker', ['ps', '--format', '{{.Names}}|{{.Status}}|{{.Ports}}'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('LOCAL_SCHEMA_PARITY_PREFLIGHT_FAILED: Docker indisponível');
  const rows = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const names = new Set(rows.map((row) => row.split('|', 1)[0]));
  if (!names.has('supabase_db_genius-support-os')) {
    throw new Error('LOCAL_SCHEMA_PARITY_PREFLIGHT_FAILED: banco local esperado não está ativo');
  }
  return {
    API_URL: 'http://127.0.0.1:54321',
    DB_URL: 'postgresql://127.0.0.1:54322/postgres',
    PROJECT_REF: 'genius-support-os',
    containers: rows.filter((row) => row.startsWith('supabase_')).map((row) => row.split('|')[0]),
  };
}

function readAppliedVersions() {
  const result = runSql('select version from supabase_migrations.schema_migrations order by version;');
  return result.rows.map((row) => String(row.version)).filter(Boolean);
}

export function verifyMigrationOrigin({ migrationText, expected }) {
  const normalized = stripSqlComments(migrationText).replace(/\s+/g, ' ');
  const baseKey = expected.key.replace(/_[56]$/, '');
  const schema = baseKey === 'default_internal_screen_keys' || baseKey === 'set_analytics_pipeline_exclusion_scope'
    ? 'app_private'
    : 'public';
  if (expected.signature === 'table') {
    return new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+${schema}\\.${baseKey}\\b`, 'i').test(normalized);
  }
  const signature = expected.signature;
  const declaration = `${schema}.${baseKey}(${signature})`;
  return normalized.includes(declaration);
}

function readOriginEvidence(migrationDirectory, filesystemVersions, appliedVersions) {
  const applied = new Set(appliedVersions);
  const files = new Map(
    readdirSync(migrationDirectory)
      .map((fileName) => [parseMigrationVersion(fileName), fileName])
      .filter(([version]) => version),
  );
  return TARGET_OBJECTS.map((expected) => {
    const fileName = files.get(expected.migration);
    const migrationText = fileName
      ? readFileSync(join(migrationDirectory, fileName), 'utf8')
      : null;
    const versionPresent = applied.has(expected.migration);
    const declarationMatch = migrationText ? verifyMigrationOrigin({ migrationText, expected }) : false;
    return {
      key: expected.key,
      migration: expected.migration,
      filePresent: filesystemVersions.includes(expected.migration),
      versionPresent,
      declarationMatch,
      originVerified: versionPresent && declarationMatch,
      verificationBasis: versionPresent && declarationMatch
        ? 'version_present_and_migration_declaration_match'
        : 'not_verified',
    };
  });
}

function readMigrationSafety(migrationDirectory, appliedVersions = []) {
  const applied = new Set(appliedVersions);
  return PENDING_MIGRATION_PREFIXES.map((version) => {
    const fileName = readdirSync(migrationDirectory).find((candidate) => parseMigrationVersion(candidate) === version);
    if (!fileName) {
      return {
        version,
        filePresent: false,
        applied: applied.has(version),
        safe: false,
        preflightProven: false,
        historicalException: false,
        classification: 'MIGRATION_FILE_MISSING',
        destructiveSql: null,
      };
    }
    const filePath = join(migrationDirectory, fileName);
    try {
      assertNoDestructiveMigration(readFileSync(filePath, 'utf8'), fileName);
      return {
        version,
        filePresent: true,
        applied: applied.has(version),
        safe: true,
        preflightProven: true,
        historicalException: false,
        classification: 'PREFLIGHT_PARSER_PASS',
        destructiveSql: false,
      };
    } catch (error) {
      const historicalException = HISTORICAL_EXCEPTION_MIGRATIONS.includes(version) && applied.has(version);
      return {
        version,
        filePresent: true,
        applied: applied.has(version),
        safe: false,
        preflightProven: false,
        historicalException,
        classification: historicalException
          ? 'HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF'
          : 'MIGRATION_PREFLIGHT_BLOCKED',
        destructiveSql: true,
        reason: error.message,
      };
    }
  });
}

function readObservedObjects(originEvidence) {
  const result = runSql(`
select 'rpc_service_promote_omie_snapshot' as key,
       'p_sync_run_id uuid' as signature
where to_regprocedure('public.rpc_service_promote_omie_snapshot(uuid)') is not null
union all
select 'internal_organizational_screen_defaults', 'table'
where to_regclass('public.internal_organizational_screen_defaults') is not null
union all
select 'default_internal_screen_keys', 'p_organizational_area_key text, p_legacy_area_key text'
where to_regprocedure('app_private.default_internal_screen_keys(text,text)') is not null
union all
select 'rpc_admin_update_internal_access_assignment', 'p_user_id uuid, p_area_key text, p_function_id uuid, p_access_profile_id uuid'
where to_regprocedure('public.rpc_admin_update_internal_access_assignment(uuid,text,uuid,uuid)') is not null
union all
select 'rpc_admin_assign_internal_access_profile', 'p_membership_id uuid, p_access_profile_id uuid'
where to_regprocedure('public.rpc_admin_assign_internal_access_profile(uuid,uuid)') is not null
union all
select 'rpc_analytics_ceo_snapshot_legacy', 'p_from date, p_to date'
where to_regprocedure('public.rpc_analytics_ceo_snapshot_legacy(date,date)') is not null
union all
select 'rpc_analytics_customer_success_kpis_v2', ''
where to_regprocedure('public.rpc_analytics_customer_success_kpis_v2()') is not null
union all
select 'rpc_analytics_support_kpis_v2', 'p_from date, p_to date, p_pipeline_id text, p_priority text'
where to_regprocedure('public.rpc_analytics_support_kpis_v2(date,date,text,text)') is not null
union all
select 'set_analytics_pipeline_exclusion_scope', 'p_pipeline_ids text[]'
where to_regprocedure('app_private.set_analytics_pipeline_exclusion_scope(text[])') is not null
union all
select 'rpc_analytics_timeseries_by_operation_5', 'p_domain text, p_from date, p_to date, p_grain text, p_group_company text'
where to_regprocedure('public.rpc_analytics_timeseries_by_operation(text,date,date,text,text)') is not null
union all
select 'rpc_analytics_timeseries_by_operation_6', 'p_domain text, p_from date, p_to date, p_grain text, p_group_company text, p_excluded_pipeline_ids text[]'
where to_regprocedure('public.rpc_analytics_timeseries_by_operation(text,date,date,text,text,text[])') is not null;
`);
  const evidence = new Map(originEvidence.map((row) => [row.key, row]));
  return result.rows.map((row) => ({
    key: String(row.key),
    migration: evidence.get(String(row.key))?.migration ?? null,
    signature: String(row.signature ?? ''),
    versionPresent: evidence.get(String(row.key))?.versionPresent === true,
    originVerified: evidence.get(String(row.key))?.originVerified === true,
    verificationBasis: evidence.get(String(row.key))?.verificationBasis ?? 'not_verified',
  }));
}

export function runGate({ cwd = process.cwd(), migrationDirectory = join(cwd, 'supabase', 'migrations') } = {}) {
  const status = runLocalContainerPreflight();
  if (status.PROJECT_REF !== 'genius-support-os' || new URL(status.API_URL).hostname !== '127.0.0.1' || new URL(status.DB_URL).hostname !== '127.0.0.1') {
    throw new Error('LOCAL_SCHEMA_PARITY_PREFLIGHT_FAILED: alvo não é o Supabase local esperado');
  }
  const filesystemVersions = listFilesystemMigrations(migrationDirectory);
  const appliedVersions = readAppliedVersions();
  const migrationSafety = readMigrationSafety(migrationDirectory, appliedVersions);
  const originEvidence = readOriginEvidence(migrationDirectory, filesystemVersions, appliedVersions);
  const observedObjects = readObservedObjects(originEvidence);
  const result = buildParityResult({ filesystemVersions, appliedVersions, observedObjects, migrationSafety });
  return {
    target: 'supabase-local',
    apiHost: new URL(status.API_URL).host,
    dbHost: new URL(status.DB_URL).host,
    migrationSafety,
    originEvidence,
    ...result,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = runGate();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
