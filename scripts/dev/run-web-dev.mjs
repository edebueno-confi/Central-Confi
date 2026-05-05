import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const webRoot = join(repoRoot, 'apps', 'web');
const localEnvPath = join(webRoot, '.env.local');
const developmentLocalEnvPath = join(webRoot, '.env.development.local');
const envPath = join(webRoot, '.env');
const developmentEnvPath = join(webRoot, '.env.development');
const requiredKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const contents = readFileSync(filePath, 'utf8');
  const result = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function readMergedPublicEnv() {
  const sources = [
    envPath,
    developmentEnvPath,
    localEnvPath,
    developmentLocalEnvPath,
  ];

  const merged = {};

  for (const source of sources) {
    Object.assign(merged, parseEnvFile(source));
  }

  for (const key of requiredKeys) {
    const shellValue = process.env[key]?.trim();
    if (shellValue) {
      merged[key] = shellValue;
    }
  }

  return merged;
}

function failMissingEnv(missingKeys) {
  console.error(
    [
      '[web:dev] Frontend Vite sem configuração pública mínima.',
      `[web:dev] Variáveis ausentes: ${missingKeys.join(', ')}`,
      `[web:dev] Crie ${localEnvPath} com VITE_APP_ENV, VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de subir o frontend.`,
    ].join('\n'),
  );
  process.exit(1);
}

const mergedEnv = readMergedPublicEnv();
const missingKeys = requiredKeys.filter((key) => !mergedEnv[key]?.trim());

if (missingKeys.length > 0) {
  failMissingEnv(missingKeys);
}

const extraArgs = process.argv.slice(2);
const child =
  process.platform === 'win32'
    ? spawn(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', `npm run dev${extraArgs.length > 0 ? ` -- ${extraArgs.join(' ')}` : ''}`],
        {
          cwd: webRoot,
          stdio: 'inherit',
          env: process.env,
        },
      )
    : spawn('npm', ['run', 'dev', ...(extraArgs.length > 0 ? ['--', ...extraArgs] : [])], {
        cwd: webRoot,
        stdio: 'inherit',
        env: process.env,
      });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
