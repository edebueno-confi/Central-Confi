const baseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = String(process.env.SUPABASE_ANON_KEY || '');
const smokeJwt = String(process.env.SUPABASE_SMOKE_JWT || '');
const timeoutMs = Number(process.env.SUPABASE_RELEASE_SMOKE_TIMEOUT_MS || 15000);

if (!baseUrl || !anonKey || !smokeJwt) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SMOKE_JWT são obrigatórios para o smoke remoto.');
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${smokeJwt}`,
  'Content-Type': 'application/json',
};

const checks = [
  {
    name: 'Central de Clientes: contexto de grupos',
    url: `${baseUrl}/rest/v1/vw_admin_tenant_group_context?select=*&limit=1`,
  },
  {
    name: 'Customer Success: KPIs por operação',
    url: `${baseUrl}/rest/v1/rpc/rpc_analytics_customer_success_kpis_by_operation`,
    body: { p_group_company: null },
  },
  {
    name: 'Dashboard: snapshot executivo',
    url: `${baseUrl}/rest/v1/rpc/rpc_analytics_ceo_snapshot`,
    body: { p_from: null, p_to: null },
  },
  {
    name: 'Dashboard: histórico executivo',
    url: `${baseUrl}/rest/v1/rpc/rpc_analytics_ceo_history`,
    body: { p_from: null, p_to: null },
  },
  {
    name: 'Dashboard: KPIs executivos',
    url: `${baseUrl}/rest/v1/rpc/rpc_analytics_executive_kpis_v2`,
    body: { p_from: null, p_to: null },
  },
];

const results = [];
for (const check of checks) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(check.url, {
      method: check.body ? 'POST' : 'GET',
      headers,
      body: check.body ? JSON.stringify(check.body) : undefined,
      signal: controller.signal,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    results.push({ name: check.name, status: response.status, durationMs });
    if (!response.ok) {
      throw new Error(`${check.name} retornou HTTP ${response.status}.`);
    }
    if (durationMs >= timeoutMs) {
      throw new Error(`${check.name} excedeu o orçamento de ${timeoutMs}ms.`);
    }
  } catch (error) {
    const reason = error?.name === 'AbortError' ? `timeout após ${timeoutMs}ms` : error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ results, failed: { name: check.name, reason } }));
    process.exitCode = 1;
    break;
  } finally {
    clearTimeout(timer);
  }
}

if (process.exitCode !== 1) {
  console.log(JSON.stringify({ status: 'pass', checks: results }));
}
