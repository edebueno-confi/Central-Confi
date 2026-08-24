import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertLocalSupabaseEnvironment, loadQaEnv, runLocalCommand } from './assert-local-supabase.mjs';

const qa = loadQaEnv();
assertLocalSupabaseEnvironment({ ...process.env, ...qa });

const MIGRATION_DIRECTORY = 'supabase/migrations';
const REBUILD_PROOF_PATH = process.env.LOCAL_QA_REBUILD_PROOF_PATH
  ?? 'output/local-qa/local-rebuild-provenance.json';

function migrationVersion(fileName) {
  return String(fileName).match(/^(\d{14})_/)?.[1] ?? null;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readMigrationFileHashes() {
  return Object.fromEntries(
    readdirSync(MIGRATION_DIRECTORY)
      .map((fileName) => [migrationVersion(fileName), fileName])
      .filter(([version]) => version)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([version, fileName]) => [version, sha256File(join(MIGRATION_DIRECTORY, fileName))]),
  );
}

function readAppliedMigrations() {
  const output = runLocalCommand(['migration', 'list', '--local']);
  const line = output.split(/\r?\n/).reverse().find((candidate) => candidate.trim().startsWith('{'));
  if (!line) throw new Error('LOCAL_QA_REBUILD_PROOF_FAILED: lista de migrations sem JSON');
  const payload = JSON.parse(line);
  return payload.migrations.map((row) => String(row.local ?? row.remote)).filter(Boolean);
}

function writeRebuildProof() {
  const appliedVersions = readAppliedMigrations();
  const fileHashes = readMigrationFileHashes();
  const target = 'supabase_db_genius-support-os';
  const image = spawnSync('docker', ['inspect', '--format', '{{.Config.Image}}', target], {
    encoding: 'utf8', windowsHide: true,
  });
  if (image.status !== 0 || image.stdout.trim() !== 'public.ecr.aws/supabase/postgres:17.6.1.158') {
    throw new Error('LOCAL_QA_REBUILD_PROOF_FAILED: imagem do container canônico divergente');
  }
  mkdirSync(dirname(REBUILD_PROOF_PATH), { recursive: true });
  writeFileSync(REBUILD_PROOF_PATH, `${JSON.stringify({
    schema: 'confione-local-rebuild-proof-v1',
    projectRef: 'genius-support-os',
    target: {
      container: target,
      image: image.stdout.trim(),
      disposable: false,
      apiHost: '127.0.0.1:54321',
      dbHost: '127.0.0.1:54322',
    },
    resetCommand: 'supabase db reset --local',
    hydrateCommand: 'npm run local:qa:hydrate',
    verifyCommand: 'npm run local:qa:verify',
    completedAt: new Date().toISOString(),
    filesystemVersions: Object.keys(fileHashes),
    appliedVersions,
    migrationFileSha256: fileHashes,
  }, null, 2)}\n`, 'utf8');
}

if (process.env.ALLOW_LOCAL_DB_RESET !== 'true') {
  throw new Error('LOCAL_DB_RESET_BLOCKED: este comando destrói o banco local. Use ALLOW_LOCAL_DB_RESET=true somente em uma operação deliberada.');
}

try {
  runLocalCommand(['start'], { timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const childOptions = { cwd: process.cwd(), env: { ...process.env, ...qa }, encoding: 'utf8', windowsHide: true, timeout: 900000, shell: process.platform === 'win32' };
  const result = spawnSync(npm, ['run', 'supabase:db:reset'], childOptions);
  if (result.status !== 0) throw new Error([result.stderr, result.stdout].filter(Boolean).join('\n'));
  const hydrate = spawnSync(npm, ['run', 'local:qa:hydrate'], childOptions);
  if (hydrate.status !== 0) throw new Error([hydrate.stderr, hydrate.stdout].filter(Boolean).join('\n'));
  const verify = spawnSync(npm, ['run', 'local:qa:verify'], childOptions);
  if (verify.status !== 0) throw new Error([verify.stderr, verify.stdout].filter(Boolean).join('\n'));
  writeRebuildProof();
  console.log('LOCAL_QA_RESET_OK');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
