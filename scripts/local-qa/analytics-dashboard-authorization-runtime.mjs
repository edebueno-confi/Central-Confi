import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { loadQaEnv, readLocalSupabaseStatus } from './assert-local-supabase.mjs';
import {
  activeTabMatches,
  customerNavigationFailures,
  customerRouteIsDenied,
  diagnosticFailures,
  evidenceFailures,
  exactLoginRedirect,
  exactRoute,
  isAllowedReadOnlyRequest,
  staleCoverageState,
} from './analytics-dashboard-authorization-runtime-logic.mjs';

const baseUrl = process.env.LOCAL_QA_WEB_URL ?? 'http://127.0.0.1:4173';
const base = new URL(baseUrl);
if (base.hostname !== '127.0.0.1' || base.port !== '4173') {
  throw new Error('LOCAL_QA_AUTH_RUNTIME_REQUIRES_127_0_0_1_4173');
}
const supabaseStatus = readLocalSupabaseStatus({ ...process.env, ...loadQaEnv() });
const qa = loadQaEnv();
const tabs = [
  { key: 'overview', route: '/admin/analytics?tab=ceo', label: 'Visão Geral' },
  { key: 'commercial', route: '/admin/analytics?tab=commercial', label: 'Comercial' },
  { key: 'customer_success', route: '/admin/analytics?tab=customer-success', label: 'Customer Success' },
  { key: 'support', route: '/admin/analytics?tab=support', label: 'Suporte' },
  { key: 'finance', route: '/admin/analytics?tab=finance', label: 'Financeiro' },
];
const personas = [
  { key: 'platform_admin', email: qa.LOCAL_QA_ADMIN_EMAIL, password: qa.LOCAL_QA_ADMIN_PASSWORD, kind: 'dashboard' },
  { key: 'dashboard_viewer', email: qa.LOCAL_QA_DASHBOARD_VIEWER_EMAIL, password: qa.LOCAL_QA_DASHBOARD_VIEWER_PASSWORD, kind: 'dashboard' },
  { key: 'customer_user', email: qa.LOCAL_QA_CLIENT_EMAIL, password: qa.LOCAL_QA_CLIENT_PASSWORD, kind: 'denied' },
];
const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'mobile', width: 390, height: 844 },
];
const staleStatePath = process.env.LOCAL_QA_STALE_STORAGE_STATE
  ? resolve(process.env.LOCAL_QA_STALE_STORAGE_STATE)
  : null;
const missingConfiguration = personas.filter((persona) => !persona.email || !persona.password).map((persona) => persona.key);
const diagnostics = [];
const externalRequests = [];
const writeRequests = [];
const unexpectedResponses = [];
const results = [];

function isKnownFontAsset(url) {
  return ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname.replace(/\.$/, ''));
}

function recordPageSignals(page, persona, viewport, evidence) {
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(`${persona}:${viewport}:${message.text().slice(0, 220)}`);
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(`${persona}:${viewport}:${String(error?.message ?? error).slice(0, 220)}`));
  page.on('requestfailed', (request) => evidence.requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}`));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname.replace(/\.$/, ''))) {
      if (isKnownFontAsset(url)) return;
      externalRequests.push(`${persona}:${viewport}:${url.hostname}`);
      return;
    }
    if (url.port !== '4173' && url.port !== '54321') {
      externalRequests.push(`${persona}:${viewport}:${url.hostname}:${url.port}`);
      return;
    }
    if (!isAllowedReadOnlyRequest(request.method(), url.pathname, url.port)) {
      writeRequests.push(`${persona}:${viewport}:${request.method()} ${url.pathname}`);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.port !== '4173' && url.port !== '54321') return;
    if (response.status() >= 400 && !(persona === 'customer_user' && response.status() === 401 && /auth_context|workspace_context/i.test(url.pathname))) {
      unexpectedResponses.push(`${persona}:${viewport}:${response.status()} ${url.pathname}`);
    }
  });
}

async function login(page, persona, target) {
  try {
    await page.goto(`${baseUrl}/login?redirectTo=${encodeURIComponent(target)}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.getByLabel('Email').fill(persona.email);
    await page.getByLabel('Senha').fill(persona.password);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    return { ok: true, actual: page.url() };
  } catch (error) {
    return { ok: false, actual: page.url(), failure: `login:${persona.key}:${String(error?.message ?? error).slice(0, 220)}` };
  }
}

async function inspectRoute(page, persona, viewport, tab, expectedKind) {
  const evidence = { consoleErrors: [], pageErrors: [], requestFailures: [] };
  recordPageSignals(page, persona, viewport, evidence);
  await page.goto(`${baseUrl}${tab.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  await page.waitForTimeout(250);
  const actual = page.url();
  const activeLabels = (await page.locator('button[aria-current="page"]').allTextContents()).map((label) => label.trim());
  const navigation = expectedKind === 'denied'
    ? await page.locator('nav[aria-label="Navegação principal"]').evaluate((nav) => ({
      links: Array.from(nav.querySelectorAll('a[href]')).map((item) => ({ href: item.getAttribute('href'), text: item.textContent })),
      buttons: Array.from(nav.querySelectorAll('button')).map((item) => ({ href: item.getAttribute('href'), text: item.textContent })),
    })).catch(() => ({ links: [], buttons: [] }))
    : null;
  const navigationFailures = expectedKind === 'denied' ? customerNavigationFailures(navigation) : [];
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => null);
  const routePass = expectedKind === 'dashboard' ? exactRoute(actual, tab.route) : customerRouteIsDenied(actual);
  const tabPass = expectedKind === 'dashboard' ? activeTabMatches(activeLabels, tab.label) : navigationFailures.length === 0;
  const adminNavigationPass = expectedKind === 'denied' ? navigationFailures.length === 0 : true;
  const failures = [
    ...(routePass ? [] : [`route:${actual}`]),
    ...(tabPass ? [] : [`active_tab:${activeLabels.join('|')}`]),
    ...navigationFailures,
    ...(overflow ? ['horizontal_overflow'] : []),
    ...diagnosticFailures(evidence),
  ];
  return { tab: tab.key, requested: tab.route, actual: new URL(actual).pathname + new URL(actual).search, activeLabels, navigation, navigationFailures, expectedKind, routePass, tabPass, adminNavigationPass, overflow, evidence, failures };
}

async function runDashboardPersona(browser, persona, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const first = tabs[0];
  const loginResult = await login(page, persona, first.route);
  if (!loginResult.ok) {
    const failure = loginResult.failure;
    await context.close();
    return {
      persona: persona.key,
      viewport: viewport.key,
      routes: tabs.map((tab) => ({ tab: tab.key, requested: tab.route, actual: new URL(loginResult.actual).pathname + new URL(loginResult.actual).search, expectedKind: persona.kind, routePass: false, tabPass: false, adminNavigationPass: persona.kind === 'denied', overflow: null, evidence: { consoleErrors: [], pageErrors: [], requestFailures: [] }, failures: [failure] })),
    };
  }
  const routes = [];
  for (const tab of tabs) routes.push(await inspectRoute(page, persona.key, viewport.key, tab, persona.kind));
  await context.close();
  return { persona: persona.key, viewport: viewport.key, routes };
}

async function runUnauthenticated(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const routes = [];
  for (const tab of tabs) {
    const evidence = { consoleErrors: [], pageErrors: [], requestFailures: [] };
    recordPageSignals(page, 'unauthenticated', viewport.key, evidence);
    await page.goto(`${baseUrl}${tab.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForURL((url) => url.pathname === '/login', { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(200);
    const actual = page.url();
    const redirectPass = exactLoginRedirect(actual, tab.route);
    routes.push({ tab: tab.key, requested: tab.route, actual: new URL(actual).pathname + new URL(actual).search, redirectPass, evidence, failures: [
      ...(redirectPass ? [] : [`redirect:${actual}`]),
      ...diagnosticFailures(evidence),
    ] });
  }
  await context.close();
  return { persona: 'unauthenticated', viewport: viewport.key, routes };
}

async function runStale(browser) {
  if (!staleStatePath || !existsSync(staleStatePath)) return { persona: 'stale_session', stateProvided: false, coverage: staleCoverageState(false, []), routes: [] };
  const context = await browser.newContext({ storageState: JSON.parse(readFileSync(staleStatePath, 'utf8')), viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const routes = [];
  for (const tab of tabs) {
    const evidence = { consoleErrors: [], pageErrors: [], requestFailures: [] };
    recordPageSignals(page, 'stale_session', 'desktop', evidence);
    await page.goto(`${baseUrl}${tab.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(300);
    const pathname = new URL(page.url()).pathname;
    const routeIsLogin = pathname === '/login';
    const routeIsDenied = pathname === '/access-denied';
    routes.push({ tab: tab.key, routeIsLogin, routeIsDenied, evidence, failures: [
      ...(routeIsLogin || routeIsDenied ? [] : [`stale_route:${page.url()}`]),
      ...diagnosticFailures(evidence),
    ] });
  }
  await context.close();
  return { persona: 'stale_session', stateProvided: true, coverage: staleCoverageState(true, routes), routes };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) results.push(await runUnauthenticated(browser, viewport));
  for (const persona of personas) {
    if (persona.email && persona.password) {
      for (const viewport of viewports) results.push(await runDashboardPersona(browser, persona, viewport));
    }
  }
  results.push(await runStale(browser));
} finally {
  await browser.close();
}

const routeFailures = results.flatMap((result) => result.routes.flatMap((route) => route.failures ?? []));
const stateMissing = !staleStatePath || !existsSync(staleStatePath) ? ['stale_session'] : [];
const staleCoverageFailures = results.flatMap((result) => result.persona === 'stale_session'
  && result.stateProvided
  && result.coverage?.state !== 'PROVEN'
  ? [`stale_coverage:${result.coverage?.state ?? 'UNKNOWN'}`]
  : []);
const allFailures = [
  ...routeFailures,
  ...staleCoverageFailures,
  ...evidenceFailures(results),
  ...missingConfiguration.map((persona) => `missing_qa_config:${persona}`),
  ...writeRequests,
  ...unexpectedResponses,
  ...externalRequests,
];
const runtimeNoGo = allFailures.length > 0 || stateMissing.length > 0;
console.log(JSON.stringify({
  state: runtimeNoGo ? 'NO_GO' : 'AUTHORIZATION_RUNTIME_GO',
  failClosed: true,
  environment: 'local-read-only',
  baseUrl,
  supabaseApiUrl: supabaseStatus.API_URL,
  personas: ['unauthenticated', ...personas.map((persona) => persona.key), 'stale_session'],
  stateMissing,
  missingConfiguration,
  writeRequests,
  unexpectedResponses,
  externalRequests,
  failures: allFailures,
  results,
  limitations: ['RLS/cross-tenant servido, equivalência numérica, performance real, remoto e produção permanecem NÃO COMPROVADOS.'],
}, null, 2));
if (runtimeNoGo) process.exitCode = 1;
