import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    local: false,
    userId: null,
    reason: 'manual bootstrap',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case '--local':
        args.local = true;
        break;
      case '--user-id':
        args.userId = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--reason':
        args.reason = argv[index + 1] ?? args.reason;
        index += 1;
        break;
      default:
        fail(`Argumento nao suportado: ${token}`);
    }
  }

  return args;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sqlEscape(value) {
  return value.replace(/'/g, "''");
}

function runSupabaseDbQuery({ local, dbUrl, sql }) {
  const tempDir = mkdtempSync(join(tmpdir(), 'genius-support-os-bootstrap-'));
  const tempFile = join(tempDir, 'query.sql');
  writeFileSync(tempFile, `${sql.trim()}\n`, 'utf8');

  const localSupabaseBinary = join(
    process.cwd(),
    'node_modules',
    'supabase',
    'bin',
    process.platform === 'win32' ? 'supabase.exe' : 'supabase'
  );
  const hasLocalBinary = existsSync(localSupabaseBinary);
  const commandArgs = hasLocalBinary
    ? ['db', 'query', '--file', tempFile, '--output', 'json']
    : ['supabase', 'db', 'query', '--file', tempFile, '--output', 'json'];

  if (local) {
    commandArgs.push('--local');
  } else {
    commandArgs.push('--db-url', dbUrl);
  }

  const supabaseCommand = hasLocalBinary
    ? localSupabaseBinary
    : process.platform === 'win32' ? 'npx.cmd' : 'npx';

  const result = spawnSync(
    supabaseCommand,
    commandArgs,
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    }
  );

  rmSync(tempDir, { recursive: true, force: true });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const detail = [result.stderr?.trim(), result.stdout?.trim()]
      .filter(Boolean)
      .join('\n');
    fail(detail || 'Falha ao executar supabase db query.');
  }

  const stdout = result.stdout?.trim();

  if (!stdout) {
    fail('Resposta vazia do supabase db query.');
  }

  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`Nao foi possivel interpretar a resposta JSON do Supabase CLI: ${error.message}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const dbUrl = process.env.SUPABASE_DB_URL ?? '';

if (!args.local && !dbUrl) {
  fail('Defina SUPABASE_DB_URL para ambiente remoto ou use --local para o banco local.');
}

if (!args.userId || !isUuid(args.userId)) {
  fail('Informe um --user-id valido em formato UUID.');
}

const statusQuery = `
  select platform_admin_count, bootstrapped
  from app_private.platform_admin_bootstrap_status();
`;

const statusResult = runSupabaseDbQuery({
  local: args.local,
  dbUrl,
  sql: statusQuery,
});

  const statusRow = statusResult.rows?.[0];

if (!statusRow) {
  fail('Nao foi possivel ler o status de bootstrap do platform_admin.');
}

if (statusRow.bootstrapped) {
  fail(`Bootstrap abortado: ja existem ${statusRow.platform_admin_count} platform_admin(s).`);
}

const profileCheckQuery = `
  select exists (
    select 1
    from public.profiles
    where id = '${sqlEscape(args.userId)}'::uuid
      and is_active
  ) as profile_exists;
`;

const profileCheckResult = runSupabaseDbQuery({
  local: args.local,
  dbUrl,
  sql: profileCheckQuery,
});

const profileCheckRow = profileCheckResult.rows?.[0];

if (!profileCheckRow?.profile_exists) {
  fail(`Bootstrap abortado: o profile ${args.userId} nao existe ou esta inativo.`);
}

const bootstrapQuery = `
  select app_private.bootstrap_first_platform_admin(
    '${sqlEscape(args.userId)}'::uuid,
    '${sqlEscape(args.reason)}'
  )::text as platform_admin_user_id;
`;

const bootstrapResult = runSupabaseDbQuery({
  local: args.local,
  dbUrl,
  sql: bootstrapQuery,
});

const bootstrapRow = bootstrapResult.rows?.[0];

if (!bootstrapRow?.platform_admin_user_id) {
  fail('O bootstrap nao retornou o user_id promovido.');
}

console.log(
  `Bootstrap concluido com sucesso para o user_id ${bootstrapRow.platform_admin_user_id}.`
);
