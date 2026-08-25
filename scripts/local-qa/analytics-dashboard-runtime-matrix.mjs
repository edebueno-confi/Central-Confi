import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { isExpectedStaleAuthResponse, isExpectedStaleConsoleError, staleRefreshLoopDetected } from './analytics-dashboard-runtime-matrix-logic.mjs';

const baseUrl = process.env.LOCAL_QA_WEB_URL ?? 'http://127.0.0.1:4173';
const parsedBaseUrl = new URL(baseUrl);
if (!['127.0.0.1', 'localhost'].includes(parsedBaseUrl.hostname) || parsedBaseUrl.port !== '4173') {
  throw new Error('LOCAL_QA_RUNTIME_MATRIX_REQUIRES_LOCAL_4173');
}

const tabRoutes = [
  { key: 'overview', route: '/admin/analytics?tab=ceo', title: 'Visão Geral' },
  { key: 'commercial', route: '/admin/analytics?tab=commercial', title: 'Comercial' },
  { key: 'customer_success', route: '/admin/analytics?tab=customer-success', title: 'Customer Success' },
  { key: 'support', route: '/admin/analytics?tab=support', title: 'Suporte' },
  { key: 'finance', route: '/admin/analytics?tab=finance', title: 'Financeiro' },
];

const personas = [
  { key: 'unauthenticated', stateEnv: null, expected: 'login' },
  { key: 'authorized', stateEnv: 'LOCAL_QA_AUTHORIZED_STORAGE_STATE', expected: 'dashboard' },
  { key: 'dashboard_viewer', stateEnv: 'LOCAL_QA_DASHBOARD_VIEWER_STORAGE_STATE', expected: 'dashboard' },
  { key: 'stale_session', stateEnv: 'LOCAL_QA_STALE_STORAGE_STATE', expected: 'login_or_denied' },
];

const filterLabels = ['Período', 'De', 'Até', 'Estágio', 'Status', 'Responsável', 'Prioridade', 'Operação', 'Cliente'];
const secretKeyPattern = /(authorization|cookie|token|password|secret|apikey|api_key|service_role|anon_key|jwt)/i;

function isRelevantNetwork(url) {
  return /^\/admin\/analytics|^\/login|^\/access-denied|^\/rest\/v1\/rpc\/|^\/auth\/v1\/token/i.test(url.pathname);
}

function isLocalTarget(url) {
  const hostname = url.hostname.replace(/\.$/, '');
  return ['127.0.0.1', 'localhost'].includes(hostname) && ['4173', '54321'].includes(url.port);
}

function isReadOnlyRequest(request) {
  const url = new URL(request.url());
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return isLocalTarget(url);
  if (request.method() !== 'POST' || !isLocalTarget(url) || url.port !== '54321') return false;
  return /^\/auth\/v1\/token$/i.test(url.pathname)
    || /^\/rest\/v1\/rpc\/rpc_analytics_[a-z0-9_]+$/i.test(url.pathname)
    || url.pathname === '/rest/v1/rpc/rpc_internal_actor_workspace_context';
}

function sanitizeText(value) {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}/g, '[REDACTED_JWT]')
    .slice(0, 240);
}

function sanitizeDiagnostic(value) {
  const normalized = String(value ?? '[NO_MESSAGE]').replace(/\s+/g, ' ').trim();
  return sanitizeValue(sanitizeText(normalized)).slice(0, 240);
}

function sanitizeValue(value) {
  if (secretKeyPattern.test(String(value))) return '[REDACTED]';
  if (typeof value === 'string' && value.length > 120) return `${value.slice(0, 117)}...`;
  return value;
}

function sanitizeObject(value, key = '') {
  if (secretKeyPattern.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeObject(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([childKey, childValue]) => [childKey, sanitizeObject(childValue, childKey)]));
  }
  return sanitizeValue(value);
}

function sanitizeRequest(request) {
  const url = new URL(request.url());
  const query = Object.fromEntries([...url.searchParams.entries()].map(([key, value]) => [key, sanitizeValue(value)]));
  let body = null;
  try {
    body = request.postDataJSON();
  } catch {
    body = request.postData() ? '[body_not_json]' : null;
  }
  return {
    method: request.method(),
    path: url.pathname,
    query,
    body: body === null ? null : sanitizeObject(body),
  };
}

function sessionStatePath(persona) {
  if (!persona.stateEnv) return null;
  const candidate = process.env[persona.stateEnv];
  if (!candidate) return null;
  const absolute = resolve(candidate);
  return existsSync(absolute) ? absolute : null;
}

function createEvidence() {
  return {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    responses: [],
    requests: [],
    externalRequests: [],
    loadingObserved: false,
    loadingTransitionObserved: false,
    staleGuardObserved: false,
    staleTransitionObserved: false,
    filterInteractions: [],
  };
}

async function collectPage(page, evidence, route, personaKey) {
  const requestedPath = new URL(`${baseUrl}${route}`);
  await page.goto(requestedPath.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((error) => {
    evidence.pageErrors.push(sanitizeDiagnostic(`navigation:${personaKey}:${route}:${error.message}`));
  });
  const earlyText = await page.locator('body').innerText().catch(() => '');
  const earlyLoadingSignal = await page.locator('[aria-busy="true"]').count() > 0 || /carregando|atualizando/i.test(earlyText);
  evidence.loadingObserved ||= earlyLoadingSignal;
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(300);
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const readyLoadingSignal = await page.locator('[aria-busy="true"]').count() > 0 || /carregando|atualizando/i.test(bodyText);
  evidence.loadingTransitionObserved ||= earlyLoadingSignal && !readyLoadingSignal;
  const reachedPath = new URL(page.url()).pathname;
  const staleSignal = /dados anteriores|stale|desatualizad|sessão expirada|sessao expirada/i.test(bodyText);
  const staleGuardOutcome = personaKey === 'stale_session' && (reachedPath === '/login' || reachedPath === '/access-denied' || staleSignal);
  evidence.staleTransitionObserved ||= staleGuardOutcome;
  evidence.staleGuardObserved ||= staleGuardOutcome;
  return {
    requested: requestedPath.pathname + requestedPath.search,
    reached: new URL(page.url()).pathname + new URL(page.url()).search,
    bodySignals: {
      login: /ConfiOne|Entrar|Senha/i.test(bodyText),
      dashboard: /Dashboard|Visão Geral|Visão Executiva/i.test(bodyText),
      unavailable: /indisponível|indisponivel/i.test(bodyText),
      error: /não foi possível|erro ao carregar|falha ao carregar/i.test(bodyText),
    },
    routeIsLogin: reachedPath === '/login',
    routeIsDenied: reachedPath === '/access-denied',
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null),
  };
}

async function exerciseFilters(page, evidence) {
  const interact = async (details, action) => {
    const requestsBefore = evidence.requests.length;
    await action();
    await page.waitForTimeout(350);
    const requestsAfter = evidence.requests.length;
    evidence.filterInteractions.push({ ...details, requestsBefore, requestsAfter, requestDelta: requestsAfter - requestsBefore });
  };
  const operation = page.locator('label').filter({ hasText: /^Operação/ }).locator('select').first();
  if (await operation.count()) {
    const options = await operation.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
    for (const value of options) await interact({ label: 'Operação', action: 'select', value }, () => operation.selectOption(value).catch(() => {}));
    if (options.length > 1) {
      const requestsBefore = evidence.requests.length;
      await operation.selectOption(options[0]).catch(() => {});
      await operation.selectOption(options[1]).catch(() => {});
      await operation.selectOption('').catch(() => {});
      await page.waitForTimeout(350);
      const requestsAfter = evidence.requests.length;
      evidence.filterInteractions.push({ label: 'Operação', action: 'rapid-swap', values: options.slice(0, 2), requestsBefore, requestsAfter, requestDelta: requestsAfter - requestsBefore });
    }
    await interact({ label: 'Operação', action: 'select', value: '' }, () => operation.selectOption('').catch(() => {}));
  }
  const dates = page.locator('input[type="date"]');
  if (await dates.count() >= 2) {
    await interact({ label: 'De', action: 'fill', value: '2026-08-01' }, () => dates.nth(0).fill('2026-08-01').catch(() => {}));
    await interact({ label: 'Até', action: 'fill', value: '2026-08-24' }, () => dates.nth(1).fill('2026-08-24').catch(() => {}));
  }
  for (const label of filterLabels) {
    const locator = page.locator('label').filter({ hasText: new RegExp(`^${label}`) }).first();
    if (!await locator.count()) continue;
    const select = locator.locator('select');
    if (await select.count()) {
      const options = await select.locator('option').evaluateAll((items) => items.map((item) => item.value).filter(Boolean));
      if (options[0]) {
        await interact({ label, action: 'select', value: options[0] }, () => select.selectOption(options[0]).catch(() => {}));
      }
      continue;
    }
    const input = locator.locator('input').first();
    if (await input.count() && await input.getAttribute('type') !== 'date') {
      await interact({ label, action: 'fill-and-clear' }, async () => {
        await input.fill('qa-filter-probe').catch(() => {});
        await input.fill('').catch(() => {});
      });
    }
  }
  const pipeline = page.getByTestId('analytics-pipeline-combobox').first();
  if (await pipeline.count()) {
    await pipeline.getByRole('button', { name: /Todos os pipelines|pipeline/i }).first().click().catch(() => {});
    const options = pipeline.getByRole('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await interact({ label: 'Pipeline', action: 'toggle', value: 'first-pipeline' }, () => options.nth(1).click().catch(() => {}));
      await interact({ label: 'Pipeline', action: 'toggle', value: 'first-pipeline' }, () => options.nth(1).click().catch(() => {}));
    }
    const query = pipeline.getByLabel('Buscar pipeline');
    if (await query.count()) await interact({ label: 'Pipeline', action: 'search-and-clear' }, async () => { await query.fill('qa-filter-probe').catch(() => {}); await query.fill('').catch(() => {}); });
  }
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true });
const matrix = [];
const missingAuthenticatedStates = [];
try {
  for (const persona of personas) {
    const statePath = sessionStatePath(persona);
    if (persona.stateEnv && !statePath) missingAuthenticatedStates.push({ persona: persona.key, env: persona.stateEnv });
    const context = await browser.newContext(statePath ? { storageState: JSON.parse(readFileSync(statePath, 'utf8')) } : {});
    const page = await context.newPage();
    const evidence = createEvidence();
    page.on('console', (message) => { if (message.type() === 'error') evidence.consoleErrors.push(sanitizeDiagnostic(message.text())); });
    page.on('pageerror', (error) => evidence.pageErrors.push(sanitizeDiagnostic(error?.message)));
    page.on('requestfailed', (request) => evidence.requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}`));
    page.on('request', (request) => {
      const url = new URL(request.url());
      const hostname = url.hostname.replace(/\.$/, '');
      if (!isLocalTarget(url) && (hostname.endsWith('googleapis.com') || hostname.endsWith('gstatic.com'))) return;
      if (!isLocalTarget(url)) {
        evidence.externalRequests.push(url.hostname);
        return;
      }
      if (!isReadOnlyRequest(request)) throw new Error(`LOCAL_QA_RUNTIME_MATRIX_WRITE_METHOD:${request.method()} ${url.pathname}`);
      if (isLocalTarget(url) && isRelevantNetwork(url)) evidence.requests.push(sanitizeRequest(request));
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (isLocalTarget(url) && isRelevantNetwork(url)) {
        evidence.responses.push({ method: response.request().method(), path: url.pathname, status: response.status() });
      }
    });
    const routes = [];
    for (const tab of tabRoutes) {
      const result = await collectPage(page, evidence, tab.route, persona.key);
      if (statePath && !result.routeIsLogin && !result.routeIsDenied) await exerciseFilters(page, evidence);
      routes.push({ tab: tab.key, title: tab.title, ...result });
    }
    matrix.push({ persona: persona.key, stateProvided: Boolean(statePath), expected: persona.expected, routes, evidence });
    await context.close();
  }
} finally {
  await browser.close();
}

const expectedStaleAuthFailures = matrix.flatMap((item) => item.evidence.responses
  .filter((response) => isExpectedStaleAuthResponse(item, response, tabRoutes.length))
  .map((response) => ({ persona: item.persona, reason: 'stale_session_refresh_rejected', ...response })));
const staleRefreshLoops = matrix.filter((item) => staleRefreshLoopDetected(item, tabRoutes.length)).map((item) => ({
  persona: item.persona,
  count: item.evidence.responses.filter((response) => response.method === 'POST' && response.path === '/auth/v1/token' && response.status === 400).length,
  reason: 'stale_session_refresh_loop',
}));
const contractFailures = matrix.flatMap((item) => item.evidence.responses
  .filter((response) => response.status >= 400 && !isExpectedStaleAuthResponse(item, response, tabRoutes.length))
  .map((response) => ({ persona: item.persona, ...response })));
const stateCoverageFailures = matrix.filter((item) => item.stateProvided && (!item.evidence.loadingTransitionObserved || (item.persona === 'stale_session' && !item.evidence.staleTransitionObserved))).map((item) => ({
  persona: item.persona,
  loadingObserved: item.evidence.loadingObserved,
  loadingTransitionObserved: item.evidence.loadingTransitionObserved,
  staleGuardObserved: item.evidence.staleGuardObserved,
  staleTransitionObserved: item.evidence.staleTransitionObserved,
}));
const unexpectedDiagnostics = matrix.flatMap((item) => [
  ...item.evidence.consoleErrors.filter((diagnostic) => !isExpectedStaleConsoleError(item, diagnostic, tabRoutes.length)).map((diagnostic) => ({ persona: item.persona, kind: 'console', diagnostic })),
  ...item.evidence.pageErrors.map((diagnostic) => ({ persona: item.persona, kind: 'page', diagnostic })),
  ...item.evidence.requestFailures.map((diagnostic) => ({ persona: item.persona, kind: 'request', diagnostic })),
  ...item.evidence.externalRequests.map((diagnostic) => ({ persona: item.persona, kind: 'external', diagnostic })),
]);
const runtimeNoGo = missingAuthenticatedStates.length > 0 || contractFailures.length > 0 || staleRefreshLoops.length > 0 || stateCoverageFailures.length > 0 || unexpectedDiagnostics.length > 0;
console.log(JSON.stringify({
  state: runtimeNoGo ? 'NO_GO' : 'RUNTIME_MATRIX_GO',
  failClosed: true,
  environment: 'local-read-only',
  baseUrl,
  personas: personas.map(({ key, expected, stateEnv }) => ({ key, expected, stateEnv })),
  missingAuthenticatedStates,
  expectedStaleAuthFailures,
  staleRefreshLoops,
  contractFailures,
  stateCoverageFailures,
  unexpectedDiagnostics,
  matrix,
  limitations: [
    'Sem storageState autenticado fornecido, autorização, dados/RPCs, filtros aplicados, RLS/cross-tenant e performance permanecem NÃO COMPROVADOS.',
    'O gate não lê credenciais, não executa login por senha e não realiza escrita em banco ou integração externa.',
  ],
}, null, 2));
if (runtimeNoGo) process.exitCode = 1;
