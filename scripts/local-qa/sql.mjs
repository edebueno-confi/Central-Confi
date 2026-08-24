import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runLocalCommand } from './assert-local-supabase.mjs';

export const LOCAL_QA_DB_CONTAINER = 'supabase_db_genius-support-os';

export function assertCanonicalLocalQaDbContainer(value = process.env.LOCAL_QA_DB_CONTAINER) {
  if (value && value !== LOCAL_QA_DB_CONTAINER) {
    throw new Error(
      `LOCAL_QA_DB_CONTAINER_INVALID: esperado ${LOCAL_QA_DB_CONTAINER}; override divergente recusado.`,
    );
  }
  return LOCAL_QA_DB_CONTAINER;
}

export function sqlEscape(value) {
  return String(value).replaceAll("'", "''");
}

// Command tags are legitimate row-less responses, not parse failures.
const COMMAND_TAG_PATTERN =
  /^(INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK|SET|RESET|DO|CREATE|DROP|ALTER|GRANT|REVOKE|TRUNCATE|COPY)\b/i;

function excerpt(text, limit = 200) {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > limit ? `${single.slice(0, limit)}…` : single;
}

/**
 * Normalizes `supabase db query --output json` stdout into the stable
 * `{ rows: [...] }` contract every consumer expects.
 *
 * Supabase CLI 2.105.0 prints a bare array of row objects, while older and
 * batched shapes nest `{ rows: [...] }`. Both are accepted here so the
 * consumers never depend on the CLI's output shape.
 *
 * Real CLI and SQL failures are surfaced by the caller (`runLocalCommand`
 * throws on a non-zero exit); this function only classifies stdout and never
 * degrades an unexpected payload into an empty result.
 */
export function normalizeQueryResult(output, { source = 'supabase db query' } = {}) {
  const text = typeof output === 'string' ? output.trim() : '';

  if (!text) return { rows: [] };
  if (COMMAND_TAG_PATTERN.test(text)) return { rows: [] };

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `LOCAL_QA_SQL_OUTPUT_UNPARSEABLE: ${source} não retornou JSON válido. Saída: ${excerpt(text)}`,
    );
  }

  if (Array.isArray(parsed)) {
    const last = parsed.at(-1);
    if (last && typeof last === 'object' && !Array.isArray(last) && Array.isArray(last.rows)) {
      return { rows: last.rows };
    }
    return { rows: parsed };
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.rows)) return parsed;
    throw new Error(
      `LOCAL_QA_SQL_OUTPUT_UNEXPECTED: ${source} retornou objeto sem a propriedade "rows". Saída: ${excerpt(text)}`,
    );
  }

  throw new Error(
    `LOCAL_QA_SQL_OUTPUT_UNEXPECTED: ${source} retornou ${parsed === null ? 'null' : typeof parsed} em vez de linhas. Saída: ${excerpt(text)}`,
  );
}

export function runSql(sql) {
  const directory = mkdtempSync(join(tmpdir(), 'gso-local-qa-'));
  const file = join(directory, 'query.sql');
  writeFileSync(file, `${sql.trim()}\n`, 'utf8');
  try {
    const output = runLocalCommand(['db', 'query', '--local', '--file', file, '--output', 'json']);
    return normalizeQueryResult(output, { source: 'supabase db query --local' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function runSqlBatch(sql) {
  const normalized = sql.trim();
  if (!normalized) return { rows: [] };

  // The whole batch is sent through one psql session. BEGIN/COMMIT are
  // deliberately preserved so a mid-fixture error rolls back all business
  // data instead of leaving a partially hydrated local database. Supabase
  // CLI `db query` uses a prepared statement and rejects multiple commands;
  // the local database container is the supported single-session fallback.
  try {
    const container = assertCanonicalLocalQaDbContainer();
    const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', '-q'], {
      input: `${normalized}\n`, encoding: 'utf8', windowsHide: true,
    });
    if (result.status !== 0) throw new Error([result.stderr, result.stdout].filter(Boolean).join('\n'));
    return { rows: [] };
  } catch (error) {
    throw new Error(`LOCAL_QA_SQL_TRANSACTION_FAILED: ${error.message}`);
  }
}
