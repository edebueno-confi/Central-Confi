import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { assertLocalSupabaseEnvironment, loadQaEnv, readLocalSupabaseStatus } from './assert-local-supabase.mjs';
import { parameterFailures, payloadFailures, pipelineSelectionIds, surfaceFailures } from './analytics-dashboard-filter-runtime-assertions.mjs';

const root = process.cwd();
const baseUrl = process.env.LOCAL_QA_FILTER_URL ?? 'http://127.0.0.1:4173';
const parsedBaseUrl = new URL(baseUrl);
if (parsedBaseUrl.hostname !== '127.0.0.1' || parsedBaseUrl.port !== '4173') {
  throw new Error('LOCAL_QA_FILTER_RUNTIME_REQUIRES_LOCAL_4173');
}

const qa = loadQaEnv();
const status = readLocalSupabaseStatus({ ...process.env, ...qa });
assertLocalSupabaseEnvironment({ ...process.env, ...qa }, { status });

const routes = [
  { key: 'overview', tab: 'ceo', label: 'Visão Geral', route: '/admin/analytics?tab=ceo' },
  { key: 'commercial', tab: 'commercial', label: 'Comercial', route: '/admin/analytics?tab=commercial' },
  { key: 'customer_success', tab: 'customer-success', label: 'Customer Success', route: '/admin/analytics?tab=customer-success' },
  { key: 'support', tab: 'support', label: 'Suporte', route: '/admin/analytics?tab=support' },
  { key: 'finance', tab: 'finance', label: 'Financeiro', route: '/admin/analytics?tab=finance' },
];
const personas = [
  { key: 'authorized', email: qa.LOCAL_QA_ADMIN_EMAIL, password: qa.LOCAL_QA_ADMIN_PASSWORD },
  { key: 'dashboard_viewer', email: qa.LOCAL_QA_DASHBOARD_VIEWER_EMAIL, password: qa.LOCAL_QA_DASHBOARD_VIEWER_PASSWORD },
];
for (const persona of personas) {
  if (!persona.email || !persona.password) throw new Error(`LOCAL_QA_CONFIG_MISSING:${persona.key}`);
}

const outputDir = join(root, 'output', 'local-qa');
const outputPath = join(outputDir, 'analytics-dashboard-filter-runtime.json');
const serverLog = join(outputDir, 'analytics-dashboard-filter-runtime-server.log');
mkdirSync(outputDir, { recursive: true });

async function startServer() {
  try {
    if ((await fetch(`${baseUrl}/login`)).ok) return null;
  } catch {
    // O servidor pode ainda estar subindo; waitForServer fará a confirmação local.
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: root,
    env: { ...process.env, VITE_APP_ENV: 'local', VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_ANON_KEY: status.ANON_KEY },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  child.stdout.on('data', (chunk) => appendFileSync(serverLog, chunk));
  child.stderr.on('data', (chunk) => appendFileSync(serverLog, chunk));
  return child;
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  else child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/login`)).ok) return;
    } catch {
      // A sondagem continua até o healthcheck local atingir o prazo definido.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('LOCAL_QA_FILTER_RUNTIME_HEALTHCHECK_FAILED');
}

function isLocal(url) {
  return url.hostname === '127.0.0.1' && ['4173', '4184', '54321'].includes(url.port);
}

function rpcName(path) {
  const match = path.match(/^\/rest\/v1\/rpc\/(rpc_analytics_[a-z0-9_]+)$/i);
  return match?.[1] ?? null;
}

function isReadOnlyRequest(request) {
  const url = new URL(request.url());
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return isLocal(url);
  return request.method() === 'POST'
    && url.port === '54321'
    && isLocal(url)
    && (/^\/auth\/v1\/token$/i.test(url.pathname) || Boolean(rpcName(url.pathname)) || url.pathname === '/rest/v1/rpc/rpc_internal_actor_workspace_context');
}

function sanitize(value, key = '') {
  if (/authorization|cookie|token|password|secret|apikey|api_key|service_role|anon_key|jwt/i.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 40).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)]));
  if (typeof value === 'string' && value.length > 160) return `${value.slice(0, 157)}...`;
  return value;
}

function captureRequest(request) {
  const url = new URL(request.url());
  let body = null;
  try { body = request.postDataJSON(); } catch { body = null; }
  return { method: request.method(), path: url.pathname, rpc: rpcName(url.pathname), body: sanitize(body) };
}

function createState() {
  return { requests: [], responses: [], consoleErrors: [], pageErrors: [], requestFailures: [], externalRequests: [], pendingResponseBodies: [], pipelineCatalog: [] };
}

function normalizeLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function extractPipelineCatalog(value) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = row && typeof row === 'object' ? row : {};
    return {
      id: String(item.hubspot_pipeline_id ?? '').trim(),
      labels: [item.label, item.hubspot_pipeline_label].map(normalizeLabel).filter(Boolean),
    };
  }).filter((item) => item.id && item.labels.length > 0);
}

async function flushPendingResponseBodies(state) {
  if (state.pendingResponseBodies.length === 0) return;
  await Promise.all(state.pendingResponseBodies);
  state.pendingResponseBodies = [];
}

async function waitForRead(page) {
  let loadingObserved = false;
  for (let index = 0; index < 12; index += 1) {
    const text = await page.locator('body').innerText().catch(() => '');
    if (/carregando|atualizando/i.test(text) || await page.locator('[aria-busy="true"]').count() > 0) loadingObserved = true;
    await page.waitForTimeout(100);
  }
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(300);
  return loadingObserved;
}

function analyticsCalls(state) {
  return state.requests.filter((request) => request.rpc && request.rpc !== 'rpc_analytics_source_status');
}

function relevantFilterCall(request) {
  return /rpc_analytics_(commercial|support|cs_|customer_success|timeseries|executive|finance_(snapshot|reconciliation_v1))/i.test(request.rpc ?? '');
}

async function login(page, persona, route) {
  await page.goto(`${baseUrl}/login?redirectTo=${encodeURIComponent(route)}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(persona.email);
  await page.getByLabel('Senha').fill(persona.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL((url) => new URL(url).pathname !== '/login', { timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function interact(page, state, details, action) {
  const before = state.requests.length;
  const beforeText = await page.locator('body').innerText().catch(() => '');
  const loadingObserved = await action();
  const afterLoading = await waitForRead(page);
  const calls = state.requests.slice(before).filter((request) => relevantFilterCall(request));
  return {
    ...details,
    requestDelta: state.requests.length - before,
    analyticsRpcDelta: calls.length,
    rpcNames: calls.map((request) => request.rpc),
    loadingObserved: Boolean(loadingObserved || afterLoading),
    contentChanged: beforeText !== await page.locator('body').innerText().catch(() => ''),
  };
}

function assertNewRead(item, label, failures) {
  if (item.analyticsRpcDelta < 1) failures.push(`${label}: nenhuma nova RPC analítica após a alteração`);
}

async function exercisePage(page, state, routeKey) {
  const failures = [];
  const interactions = [];
  await flushPendingResponseBodies(state);
  const operation = page.locator('label').filter({ hasText: /^Operação/ }).locator('select').first();
  const operationOptions = await operation.count()
    ? await operation.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean))
    : [];

  if (await operation.count()) {
    interactions.push(await interact(page, state, { filter: 'Operação', value: 'Todas' }, () => operation.selectOption('')));
    const values = [...new Set(operationOptions)];
    for (const value of values) {
      const item = await interact(page, state, { filter: 'Operação', value }, () => operation.selectOption(value));
      assertNewRead(item, `${routeKey}:Operação=${value}`, failures);
      const calls = state.requests.slice(-Math.max(item.requestDelta, 1)).filter((request) => relevantFilterCall(request));
      failures.push(...parameterFailures(calls, 'p_group_company', value, `${routeKey}:Operação=${value}`));
      interactions.push(item);
    }
    if (values.length > 0) {
      const item = await interact(page, state, { filter: 'Operação', value: 'Todas (retorno)' }, () => operation.selectOption(''));
      assertNewRead(item, `${routeKey}:Operação=Todas (retorno)`, failures);
      interactions.push(item);
    }
  }

  const dates = page.locator('input[type="date"]');
  if (await dates.count() >= 2) {
    const item = await interact(page, state, { filter: 'Período', value: '2026-01-01..2026-08-24' }, async () => {
      await dates.nth(0).fill('2026-01-01');
      await dates.nth(1).fill('2026-08-24');
      return false;
    });
    assertNewRead(item, `${routeKey}:Período`, failures);
    interactions.push(item);
    const recent = state.requests.slice(-Math.max(item.requestDelta, 1)).filter((request) => relevantFilterCall(request));
    failures.push(...payloadFailures(recent, { p_from: '2026-01-01', p_to: '2026-08-24' }, `${routeKey}:Período`));
  }

  const fieldMap = [
    { labels: ['Estágio'], key: 'p_stage_id' },
    { labels: ['Situação'], key: 'p_status' },
    { labels: ['Responsável'], key: 'p_owner_id' },
    { labels: ['Prioridade'], key: 'p_priority' },
    { labels: ['Aging'], key: 'p_aging_bucket' },
  ];
  for (const field of fieldMap) {
    let label = null;
    for (const candidate of field.labels) {
      if (await page.locator('label').filter({ hasText: new RegExp(`^${candidate}`) }).locator('select').count()) {
        label = candidate;
        break;
      }
    }
    if (!label) continue;
    const select = page.locator('label').filter({ hasText: new RegExp(`^${label}`)}).locator('select').first();
    const values = await select.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
    if (values.length === 0) continue;
    const item = await interact(page, state, { filter: label, value: values[0] }, () => select.selectOption(values[0]));
    assertNewRead(item, `${routeKey}:${label}`, failures);
    const recent = state.requests.slice(-Math.max(item.requestDelta, 1)).filter((request) => relevantFilterCall(request));
    failures.push(...parameterFailures(recent, field.key, values[0], `${routeKey}:${label}`));
    interactions.push(item);
  }

  const pipeline = page.getByTestId('analytics-pipeline-combobox').first();
  if (await pipeline.count()) {
    await pipeline.getByRole('button', { name: /Todos os pipelines|pipeline/i }).first().click().catch(() => {
      failures.push(`${routeKey}:Pipelines não abriu o seletor`);
    });
    await pipeline.getByRole('button', { name: 'Selecionar todos', exact: true }).click().catch(() => {
      // O botão fica desabilitado quando todos já estão incluídos.
    });
    await waitForRead(page);
    const options = pipeline.getByRole('option');
    if (await options.count() > 1) {
      const optionIndex = await options.evaluateAll((items) => items.findIndex((item, index) => index > 0 && item.getAttribute('aria-selected') === 'true'));
      if (optionIndex < 1) {
        failures.push(`${routeKey}:Pipelines não encontrou pipeline incluído para excluir`);
      } else {
        const option = options.nth(optionIndex);
        const selectedLabel = await option.locator('span.font-medium').innerText().catch(() => '');
        const expectedPipeline = state.pipelineCatalog.find((item) => item.labels.includes(normalizeLabel(selectedLabel)));
        if (!expectedPipeline) failures.push(`${routeKey}:Pipelines não correlacionou o rótulo selecionado ao catálogo read-only`);
        const beforeExcluded = [...state.requests].reverse().find((request) => Array.isArray(request.body?.p_excluded_pipeline_ids))?.body?.p_excluded_pipeline_ids ?? [];
        const expectedExcluded = expectedPipeline ? pipelineSelectionIds(beforeExcluded, expectedPipeline.id) : null;
        const item = await interact(page, state, { filter: 'Pipelines', value: selectedLabel, pipelineId: expectedPipeline?.id ?? null }, () => option.click());
        assertNewRead(item, `${routeKey}:Pipelines`, failures);
        const recent = state.requests.slice(-Math.max(item.requestDelta, 1)).filter((request) => relevantFilterCall(request));
        if (expectedExcluded) failures.push(...parameterFailures(recent, 'p_excluded_pipeline_ids', expectedExcluded, `${routeKey}:Pipelines`));
        interactions.push(item);
      }
    }
  }

  const evolution = page.getByRole('button', { name: 'Por semana', exact: true }).first();
  if (await evolution.count()) {
    const item = await interact(page, state, { filter: 'Granularidade', value: 'week' }, () => evolution.click());
    assertNewRead(item, `${routeKey}:Granularidade`, failures);
    const recent = state.requests.slice(-Math.max(item.requestDelta, 1)).filter((request) => request.rpc === 'rpc_analytics_timeseries_by_operation');
    if (!recent.some((request) => request.body?.p_grain === 'week')) failures.push(`${routeKey}:Granularidade não chegou à série temporal`);
    interactions.push(item);
  }

  return { operationOptions, interactions, failures };
}

const server = await startServer();
const results = [];
const globalFailures = [];
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  for (const persona of personas) {
    for (const surface of routes) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const state = createState();
      page.on('console', (message) => { if (message.type() === 'error') state.consoleErrors.push(message.text().slice(0, 240)); });
      page.on('pageerror', (error) => state.pageErrors.push(error.message.slice(0, 240)));
      page.on('requestfailed', (request) => state.requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}`));
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (!isLocal(url)) {
          if (!/fonts\.(googleapis|gstatic)\.com$/i.test(url.hostname)) state.externalRequests.push(url.hostname);
          return;
        }
        if (!isReadOnlyRequest(request)) throw new Error(`LOCAL_QA_FILTER_RUNTIME_WRITE_METHOD:${request.method()} ${url.pathname}`);
        state.requests.push(captureRequest(request));
      });
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (isLocal(url) && response.status() >= 400) state.responses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
        if (isLocal(url) && response.status() < 400 && url.pathname === '/rest/v1/vw_admin_analytics_pipeline_catalog_v2') {
          const pending = response.json().then((body) => { state.pipelineCatalog = extractPipelineCatalog(body); }).catch(() => {
            state.pipelineCatalog = [];
          });
          state.pendingResponseBodies.push(pending);
        }
      });
      await login(page, persona, surface.route);
      const activeLabels = (await page.locator('button[aria-current="page"]').allTextContents()).map((label) => label.trim());
      globalFailures.push(...surfaceFailures(surface, page.url(), activeLabels).map((failure) => `${persona.key}:${failure}`));
      const reachedUrl = new URL(page.url());
      if (reachedUrl.pathname === '/login' || reachedUrl.pathname === '/access-denied') globalFailures.push(`${persona.key}:${surface.key}:rota=${reachedUrl.pathname}`);
      const loadingObserved = await waitForRead(page);
      const interaction = await exercisePage(page, state, `${persona.key}/${surface.key}`);
      const failureList = [
        ...interaction.failures,
        ...state.consoleErrors.map((error) => `${persona.key}:${surface.key}:console:${error}`),
        ...state.pageErrors.map((error) => `${persona.key}:${surface.key}:page:${error}`),
        ...state.requestFailures.map((error) => `${persona.key}:${surface.key}:request:${error}`),
        ...state.externalRequests.map((error) => `${persona.key}:${surface.key}:external:${error}`),
        ...state.responses.map((response) => `${persona.key}:${surface.key}:response:${response.status} ${response.path}`),
      ];
      results.push({ persona: persona.key, surface: surface.key, expectedRoute: surface.route, expectedTab: surface.label, route: new URL(page.url()).pathname + new URL(page.url()).search, activeTabs: activeLabels, loadingObserved, operationOptions: interaction.operationOptions, interactions: interaction.interactions, rpcCount: analyticsCalls(state).length, rpcRequests: analyticsCalls(state), failures: failureList });
      await context.close();
    }
  }
} finally {
  await browser?.close();
  await stopServer(server);
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: 'local-read-only',
  baseUrl,
  personas: personas.map((persona) => persona.key),
  surfaces: routes.map((route) => route.key),
  results,
  failures: [...globalFailures, ...results.flatMap((result) => result.failures)],
  limitations: [
    'A matriz prova disparo de leituras e parâmetros observados, não equivalência numérica completa entre ambientes.',
    'RLS/cross-tenant servido, performance com volume real, Supabase remoto e produção permanecem NÃO COMPROVADOS.',
  ],
};
await import('node:fs/promises').then(({ writeFile }) => writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'));
console.log(JSON.stringify({ outputPath, combinations: results.length, failures: report.failures.length, operationOptions: [...new Set(results.flatMap((result) => result.operationOptions))] }));
if (report.failures.length > 0) process.exitCode = 1;
