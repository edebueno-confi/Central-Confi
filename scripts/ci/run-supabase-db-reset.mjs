import { spawn } from "node:child_process";

const attempts = Number(process.env.SUPABASE_DB_RESET_ATTEMPTS ?? 2);
const retryDelayMs = Number(process.env.SUPABASE_DB_RESET_RETRY_DELAY_MS ?? 10_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runProcess(command, args, label) {
  return new Promise((resolve) => {
    console.log(`[supabase-db-reset] running ${label}`);

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function runNpmScript(scriptName, label) {
  if (process.platform === "win32") {
    const command = process.env.ComSpec ?? "cmd.exe";
    return runProcess(command, ["/d", "/s", "/c", `npm run ${scriptName}`], label);
  }

  return runProcess("npm", ["run", scriptName], label);
}

async function waitForReadiness() {
  const nodeCommand = process.execPath;
  return runProcess(
    nodeCommand,
    ["scripts/ci/wait-for-supabase-ready.mjs"],
    "supabase readiness probes",
  );
}

async function resetDatabase() {
  return runNpmScript(
    "supabase:db:reset:raw",
    "supabase db reset --local --yes",
  );
}

async function main() {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const readinessExitCode = await waitForReadiness();
    if (readinessExitCode !== 0) {
      if (attempt === attempts) {
        console.error(
          `[supabase-db-reset] readiness failed on final attempt=${attempt}`,
        );
        return readinessExitCode;
      }

      console.error(
        `[supabase-db-reset] readiness failed on attempt=${attempt}; retrying in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
      continue;
    }

    const resetExitCode = await resetDatabase();
    if (resetExitCode === 0) {
      console.log(`[supabase-db-reset] reset succeeded on attempt=${attempt}`);
      return 0;
    }

    if (attempt === attempts) {
      console.error(`[supabase-db-reset] reset failed on final attempt=${attempt}`);
      return resetExitCode;
    }

    console.error(
      `[supabase-db-reset] reset failed on attempt=${attempt}; retrying in ${retryDelayMs}ms`,
    );
    await sleep(retryDelayMs);
  }

  return 1;
}

process.exitCode = await main();
