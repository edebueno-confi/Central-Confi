import { createConnection } from "node:net";
import { spawn } from "node:child_process";

const baseEndpoints = [
  {
    label: "REST admin readiness",
    url: "http://127.0.0.1:55321/rest-admin/v1/ready",
    method: "HEAD",
  },
];

const edgeRuntimeEndpoint = {
  label: "Edge runtime health",
  url: "http://127.0.0.1:55321/functions/v1/_internal/health",
  method: "HEAD",
};

const sockets = [
  {
    label: "Postgres TCP readiness",
    host: process.env.SUPABASE_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.SUPABASE_DB_PORT ?? 55322),
  },
];

const timeoutMs = Number(process.env.SUPABASE_READY_TIMEOUT_MS ?? 60_000);
const intervalMs = Number(process.env.SUPABASE_READY_INTERVAL_MS ?? 2_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function shouldProbeEdgeRuntime() {
  if (process.env.SUPABASE_READY_REQUIRE_EDGE === "1") {
    return true;
  }

  const command =
    process.platform === "win32"
      ? process.env.ComSpec ?? "cmd.exe"
      : "npx";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npx supabase status -o env"]
      : ["supabase", "status", "-o", "env"];
  const result = await runProcess(command, args);

  if (result.code !== 0) {
    return true;
  }

  const statusOutput = `${result.stdout}\n${result.stderr}`;
  return !statusOutput.includes("supabase_edge_runtime_");
}

async function probeEndpoint(endpoint) {
  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "cache-control": "no-cache",
      },
    });

    return {
      ...endpoint,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      ...endpoint,
      ok: false,
      error:
        error instanceof Error ? error.message : "unknown readiness probe error",
    };
  }
}

async function probeSocket(socket) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    };

    const client = createConnection(
      {
        host: socket.host,
        port: socket.port,
      },
      () => {
        client.end();
        finish({
          ...socket,
          ok: true,
          status: "connected",
        });
      },
    );

    client.on("error", (error) => {
      client.destroy();
      finish({
        ...socket,
        ok: false,
        error:
          error instanceof Error ? error.message : "unknown socket probe error",
      });
    });

    client.setTimeout(intervalMs, () => {
      client.destroy();
      finish({
        ...socket,
        ok: false,
        error: "socket timeout",
      });
    });
  });
}

async function main() {
  const endpoints = [...baseEndpoints];
  const probeEdgeRuntime = await shouldProbeEdgeRuntime();

  if (probeEdgeRuntime) {
    endpoints.push(edgeRuntimeEndpoint);
  } else {
    console.log(
      "[supabase-ready] edge runtime reported as stopped by supabase status; skipping edge health probe",
    );
  }

  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;

    const results = await Promise.all([
      ...endpoints.map(probeEndpoint),
      ...sockets.map(probeSocket),
    ]);
    const summary = results
      .map((result) =>
        result.ok
          ? `${result.label}=ok(${result.status})`
          : `${result.label}=pending(${result.error ?? result.status ?? "unknown"})`,
      )
      .join(" | ");

    console.log(`[supabase-ready] attempt=${attempt} ${summary}`);

    if (results.every((result) => result.ok)) {
      console.log(
        `[supabase-ready] all endpoints healthy after ${Date.now() - startedAt}ms`,
      );
      return 0;
    }

    await sleep(intervalMs);
  }

  console.error(
    `[supabase-ready] timeout after ${timeoutMs}ms waiting for local Supabase services`,
  );
  return 1;
}

process.exitCode = await main();
