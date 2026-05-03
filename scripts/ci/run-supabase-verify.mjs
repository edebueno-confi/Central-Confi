import { spawn } from 'node:child_process';

function runProcess(command, args, label) {
  return new Promise((resolve) => {
    console.log(`[supabase-verify] running ${label}`);

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

function runNpmScript(scriptName, extraArgs = []) {
  const label = `${scriptName}${extraArgs.length > 0 ? ` ${extraArgs.join(' ')}` : ''}`;

  if (process.platform === 'win32') {
    const command = process.env.ComSpec ?? 'cmd.exe';
    const suffix = extraArgs.length > 0 ? ` -- ${extraArgs.join(' ')}` : '';
    return runProcess(command, ['/d', '/s', '/c', `npm run ${scriptName}${suffix}`], label);
  }

  return runProcess('npm', ['run', scriptName, ...(extraArgs.length > 0 ? ['--', ...extraArgs] : [])], label);
}

function runNodeScript(scriptPath, label) {
  return runProcess(process.execPath, [scriptPath], label);
}

async function main() {
  const steps = [
    ['supabase:db:reset', []],
    ['supabase:test:db', []],
    ['knowledge:verify:octadesk:space-aware', []],
    ['supabase:lint:db', []],
  ];

  for (const [scriptName, extraArgs] of steps) {
    const exitCode = await runNpmScript(scriptName, extraArgs);
    if (exitCode !== 0) {
      return exitCode;
    }
  }

  if (!process.env.CI) {
    const readinessExitCode = await runNodeScript(
      'scripts/ci/wait-for-supabase-ready.mjs',
      'supabase readiness before QA fixture rehydrate',
    );
    if (readinessExitCode !== 0) {
      return readinessExitCode;
    }

    const fixtureExitCode = await runNpmScript('supabase:qa:local-admin-fixture', ['--with-denied-user']);
    if (fixtureExitCode !== 0) {
      return fixtureExitCode;
    }
  }

  return 0;
}

process.exitCode = await main();
