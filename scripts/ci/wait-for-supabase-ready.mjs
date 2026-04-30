const endpoints = [
  {
    label: "REST admin readiness",
    url: "http://127.0.0.1:55321/rest-admin/v1/ready",
    method: "HEAD",
  },
  {
    label: "Edge runtime health",
    url: "http://127.0.0.1:55321/functions/v1/_internal/health",
    method: "HEAD",
  },
];

const timeoutMs = Number(process.env.SUPABASE_READY_TIMEOUT_MS ?? 60_000);
const intervalMs = Number(process.env.SUPABASE_READY_INTERVAL_MS ?? 2_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function main() {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;

    const results = await Promise.all(endpoints.map(probeEndpoint));
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
