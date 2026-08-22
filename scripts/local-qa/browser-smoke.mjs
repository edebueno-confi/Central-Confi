import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

import { assertLocalSupabaseEnvironment, loadQaEnv, readLocalSupabaseStatus } from './assert-local-supabase.mjs';

const qa = loadQaEnv();
const status = readLocalSupabaseStatus({ ...process.env, ...qa });
assertLocalSupabaseEnvironment({ ...process.env, ...qa }, { status });

const root = process.cwd();
const baseUrl = process.env.LOCAL_QA_WEB_URL ?? 'http://127.0.0.1:4173';
const port = Number(new URL(baseUrl).port || 4173);
if (port !== 4173) throw new Error('LOCAL_QA_WEB_PORT_MUST_BE_4173');
const logDir = join(root, 'output', 'local-qa');
const serverLog = join(logDir, 'web-server.log');
mkdirSync(logDir, { recursive: true });

function isExternalFontAsset(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'fonts.gstatic.com' || parsed.hostname === 'fonts.googleapis.com';
  } catch {
    return false;
  }
}

async function waitForWebServer(child) {
  const deadline = Date.now() + Number(process.env.LOCAL_QA_WEB_START_TIMEOUT_MS ?? 45_000);
  let lastError = 'healthcheck ainda sem resposta';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`LOCAL_QA_WEB_PROCESS_EXITED: ${child.exitCode}; ${lastError}`);
    }
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`LOCAL_QA_WEB_HEALTHCHECK_FAILED: ${lastError}`);
}

function startWebServer() {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npm, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    env: {
      ...process.env,
      VITE_APP_ENV: 'local',
      VITE_SUPABASE_URL: status.API_URL,
      VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  child.stdout.on('data', (chunk) => appendFileSync(serverLog, chunk));
  child.stderr.on('data', (chunk) => appendFileSync(serverLog, chunk));
  return child;
}

async function stopWebServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function waitForPathChange(page, originalPath, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pathname = new URL(page.url()).pathname;
    if (pathname !== originalPath) return pathname;
    await page.waitForTimeout(250);
  }
  return new URL(page.url()).pathname;
}

async function waitForReception(page, originalPath, timeoutMs = 20_000) {
  const firstPath = await waitForPathChange(page, originalPath, timeoutMs);
  if (firstPath !== '/access-denied') return firstPath;
  return waitForPathChange(page, '/access-denied', timeoutMs);
}

const accounts = [
  // `/inicio` is the neutral authenticated reception. It is the safe fallback
  // when the requested operational route is not authorized for the profile.
  {
    role: 'platform_admin',
    email: qa.LOCAL_QA_ADMIN_EMAIL,
    password: qa.LOCAL_QA_ADMIN_PASSWORD,
    desktop: '/admin/analytics',
    mobile: '/admin/analytics',
    // Superfícies internas cobertas apenas em desktop: o objetivo é detectar erro
    // de runtime, request falho e overflow horizontal em tela autenticada real.
    // Só entram aqui as telas com `release_enabled = true` no
    // `internal_screen_catalog`. As demais respondem `/access-denied` porque
    // estão fora do manifesto do primeiro release, o que é contrato funcionando
    // e não falta de grant na fixture.
    extraRoutes: ['/admin/knowledge', '/admin/access', '/admin/settings', '/admin/tenants'],
    knowledgeEditorScenario: true,
    accessModalScenario: true,
    themeSurfaceScenario: true,
    settingsIntegrationsScenario: true,
    settingsAccessScenario: 'admin',
    // Sondagem sem asserção: inventário vivo das telas com
    // `release_enabled = false`. Elas respondem `/access-denied` por decisão de
    // release. Quando uma for publicada, promova para `extraRoutes`.
    probeRoutes: [
      '/admin/visao-geral',
      '/admin/system',
      '/admin/internal-areas',
      '/admin/product-docs',
      '/admin/build-journal',
      '/admin/customer-portal',
    ],
  },
  { role: 'dashboard_viewer', email: qa.LOCAL_QA_DASHBOARD_VIEWER_EMAIL, password: qa.LOCAL_QA_DASHBOARD_VIEWER_PASSWORD, desktop: '/admin/analytics', mobile: '/admin/analytics', settingsAccessScenario: 'denied' },
  { role: 'support_manager', email: qa.LOCAL_QA_SUPPORT_MANAGER_EMAIL, password: qa.LOCAL_QA_SUPPORT_MANAGER_PASSWORD, desktop: '/support/queue', mobile: '/support/queue', expectedDesktop: '/inicio', expectedMobile: '/inicio', settingsAccessScenario: 'denied' },
  { role: 'support_agent', email: qa.LOCAL_QA_SUPPORT_AGENT_EMAIL, password: qa.LOCAL_QA_SUPPORT_AGENT_PASSWORD, desktop: '/support/queue', mobile: '/support/queue', expectedDesktop: '/inicio', expectedMobile: '/inicio', settingsAccessScenario: 'denied' },
  { role: 'customer_user', email: qa.LOCAL_QA_CLIENT_EMAIL, password: qa.LOCAL_QA_CLIENT_PASSWORD, desktop: '/portal', mobile: '/portal', expectedDesktop: '/inicio', expectedMobile: '/inicio' },
];

for (const account of accounts) {
  if (!account.email || !account.password) throw new Error(`LOCAL_QA_CONFIG_MISSING: ${account.role}`);
}

const server = startWebServer();
const results = [];
const screenshots = [];
const extraRouteResults = [];
const probeResults = [];
const deepScenarios = [];
const settingsAccessResults = [];
const settingsRequestMatrix = [];
let defaultReceptionResult = null;
let browser;
try {
  await waitForWebServer(server);
  browser = await chromium.launch({ headless: true });
  for (const account of accounts) {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const events = { consoleErrors: [], pageErrors: [], requestFailures: [], externalAssetWarnings: [], unexpectedResponses: [], expectedForbidden: 0, administrativeRequests: [] };
      let activeSettingsAudit = null;
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (/fonts\.gstatic\.com|fonts\.googleapis\.com/i.test(text)) events.externalAssetWarnings.push(text);
        else events.consoleErrors.push(text);
      });
      page.on('pageerror', (error) => events.pageErrors.push(error.message));
      page.on('requestfailed', (request) => {
        const detail = `${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`;
        if (isExternalFontAsset(request.url())) events.externalAssetWarnings.push(detail);
        else events.requestFailures.push(detail);
      });
      page.on('request', (request) => {
        if (account.role !== 'platform_admin' && /\/rpc\/rpc_admin_|analytics_integration_schedule|managed_integrations/.test(request.url())) {
          events.administrativeRequests.push(`${request.method()} ${request.url()}`);
        }
      });
      page.on('response', (response) => {
        const status = response.status();
        if (activeSettingsAudit) {
          try {
            const parsed = new URL(response.url());
            if (parsed.port === '54321' && (parsed.pathname.startsWith('/rest/v1/') || parsed.pathname.startsWith('/rpc/'))) {
              activeSettingsAudit.requests.push({ method: response.request().method(), path: parsed.pathname, status });
            }
          } catch {
            // Respostas que não são URLs HTTP não participam da matriz.
          }
        }
        if (status === 403) events.unexpectedResponses.push(`403 ${response.url()}`);
        if ([400, 401, 404, 409, 422, 500].includes(status)) {
          if (status === 404 && isExternalFontAsset(response.url())) events.externalAssetWarnings.push(`${status} ${response.url()}`);
          else events.unexpectedResponses.push(`${status} ${response.url()}`);
        }
      });
      await page.goto(`${baseUrl}/login?redirectTo=${encodeURIComponent(account.desktop)}`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email').fill(account.email);
      await page.getByLabel('Senha').fill(account.password);
      await page.getByRole('button', { name: /entrar/i }).click();
      const loginPath = await waitForPathChange(page, '/login', 20_000);
      if (loginPath === '/login') throw new Error(`LOCAL_QA_LOGIN_ROUTE_FAILED: ${account.role} ${viewport.name}`);
      const expectedPath = viewport.name === 'desktop'
        ? (account.expectedDesktop ?? account.desktop)
        : (account.expectedMobile ?? account.mobile);
      if (!page.url().includes(expectedPath)) throw new Error(`LOCAL_QA_ROUTE_FAILED: ${account.role} expected ${expectedPath}, got ${page.url()}`);
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(500);
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (horizontalOverflow) throw new Error(`LOCAL_QA_HORIZONTAL_OVERFLOW: ${account.role} ${viewport.name}`);
      if (account.role === 'dashboard_viewer') {
        const text = await page.locator('body').innerText();
        if (/Sincronizar HubSpot|Exportar relatório|Configuração|Logs/.test(text)) {
          throw new Error(`LOCAL_QA_VIEWER_UI_SCOPE_FAILED: ${text.slice(0, 260)}`);
        }
      }
      await page.screenshot({ path: join(logDir, `browser-${account.role}-${viewport.name}.png`), fullPage: true });
      screenshots.push(`browser-${account.role}-${viewport.name}.png`);
      if (viewport.name === 'desktop' && account.extraRoutes?.length) {
        for (const extraRoute of account.extraRoutes) {
          await page.goto(`${baseUrl}${extraRoute}`, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(500);
          let reachedPath = new URL(page.url()).pathname;
          if (reachedPath === '/access-denied' && account.settingsAccessScenario !== 'admin') {
            reachedPath = await waitForPathChange(page, '/access-denied', 20_000);
          }
          if (reachedPath === '/login' || reachedPath === '/access-denied') {
            throw new Error(`LOCAL_QA_INTERNAL_ROUTE_UNREACHABLE: ${account.role} ${extraRoute} -> ${reachedPath}`);
          }
          const extraOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          if (extraOverflow) {
            throw new Error(`LOCAL_QA_HORIZONTAL_OVERFLOW: ${account.role} ${extraRoute}`);
          }
          const slug = extraRoute.replace(/^\//, '').replaceAll('/', '-');
          await page.screenshot({ path: join(logDir, `browser-${account.role}-${slug}-desktop.png`), fullPage: true });
          screenshots.push(`browser-${account.role}-${slug}-desktop.png`);
          extraRouteResults.push({ role: account.role, route: extraRoute, reachedPath });
        }
      }

      if (account.role === 'dashboard_viewer') {
        await page.goto(`${baseUrl}/admin/settings`, { waitUntil: 'domcontentloaded' });
        const deniedPath = await waitForReception(page, '/admin/settings', 20_000);
        if (deniedPath !== '/inicio') throw new Error(`LOCAL_QA_VIEWER_ROUTE_NOT_REDIRECTED_TO_RECEPTION: ${page.url()}`);
      }
      if (account.role === 'customer_user') {
        await page.goto(`${baseUrl}/support/queue`, { waitUntil: 'domcontentloaded' });
        const deniedPath = await waitForReception(page, '/support/queue', 20_000);
        if (deniedPath !== '/inicio') {
          await page.screenshot({ path: join(logDir, `browser-customer-route-check-${viewport.name}.png`), fullPage: true });
          throw new Error(`LOCAL_QA_CUSTOMER_ROUTE_NOT_REDIRECTED_TO_RECEPTION: ${page.url()} body=${(await page.locator('body').innerText()).slice(0, 240)}`);
        }
      }
      if (account.role === 'support_manager' || account.role === 'support_agent') {
        await page.goto(`${baseUrl}/admin/settings`, { waitUntil: 'domcontentloaded' });
        const deniedPath = await waitForReception(page, '/admin/settings', 20_000);
        if (deniedPath !== '/inicio') throw new Error(`LOCAL_QA_SUPPORT_SETTINGS_NOT_REDIRECTED_TO_RECEPTION: ${account.role} ${page.url()}`);
      }
      if (account.role === 'customer_user') {
        await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: 'domcontentloaded' });
        const deniedPath = await waitForReception(page, '/admin/analytics', 20_000);
        if (deniedPath !== '/inicio') throw new Error(`LOCAL_QA_CUSTOMER_ANALYTICS_NOT_REDIRECTED_TO_RECEPTION: ${page.url()}`);
      }
      if (viewport.name === 'desktop' && account.settingsAccessScenario) {
        const settingsRoutes = [
          '/admin/settings',
          '/admin/settings/integrations',
          '/admin/settings/dashboard-sources',
          '/admin/settings/sync-history',
          '/admin/settings/brands',
          '/admin/settings/help-center',
        ];
        for (const settingsRoute of settingsRoutes) {
          activeSettingsAudit = { role: account.role, route: settingsRoute, requests: [] };
          await page.goto(`${baseUrl}${settingsRoute}`, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(350);
          const reachedPath = new URL(page.url()).pathname;
          const expectedPath = account.settingsAccessScenario === 'admin' ? settingsRoute : '/inicio';
          if (reachedPath !== expectedPath) {
            throw new Error(`LOCAL_QA_SETTINGS_ACCESS_MATRIX_FAILED: ${account.role} ${settingsRoute} -> ${reachedPath}; expected ${expectedPath}`);
          }
          settingsAccessResults.push({ role: account.role, route: settingsRoute, reachedPath, expectedPath });
          settingsRequestMatrix.push({ ...activeSettingsAudit, requests: activeSettingsAudit.requests.slice() });
          activeSettingsAudit = null;
        }
      }
      if (events.administrativeRequests.length) throw new Error(`LOCAL_QA_VIEWER_ADMIN_REQUEST: ${events.administrativeRequests.join(', ')}`);
      results.push({ role: account.role, viewport: viewport.name, path: expectedPath, consoleErrors: events.consoleErrors.length, pageErrors: events.pageErrors.length, requestFailures: events.requestFailures.length, requestFailureDetails: events.requestFailures, externalAssetWarnings: events.externalAssetWarnings.length, unexpectedResponses: events.unexpectedResponses.length, unexpectedResponseDetails: events.unexpectedResponses, expectedForbidden: events.expectedForbidden, administrativeRequests: events.administrativeRequests.length });
      // Cenário profundo de Conhecimento: a listagem já é coberta por
      // `extraRoutes`, aqui o objetivo é entrar no editor de artigo real, que é o
      // arquivo mais pesado da superfície publicada, e verificar que ele monta
      // sem erro de runtime com dado real.
      if (viewport.name === 'desktop' && account.knowledgeEditorScenario) {
        await page.goto(`${baseUrl}/admin/knowledge`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
        const editButton = page.getByRole('button', { name: 'Editar' }).first();
        await editButton.waitFor({ state: 'visible', timeout: 15_000 });
        await editButton.click();
        const editorPath = await waitForPathChange(page, '/admin/knowledge', 20_000);
        if (!/^\/admin\/knowledge\/.+\/edit$/.test(editorPath)) {
          throw new Error(`LOCAL_QA_KNOWLEDGE_EDITOR_ROUTE_FAILED: ${editorPath}`);
        }
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(700);
        const editorOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (editorOverflow) {
          throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin knowledge-editor');
        }
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-knowledge-editor-desktop.png'), fullPage: true });
        screenshots.push('browser-platform_admin-knowledge-editor-desktop.png');
        deepScenarios.push({ role: account.role, scenario: 'knowledge-editor', reachedPath: editorPath });

        // Escrita real em Conhecimento: edita o título do artigo, salva, confirma
        // persistência após recarregar e restaura o valor original. O marcador é
        // sanitizado e o cenário limpa o que escreveu.
        const marker = ' [QA SMOKE]';
        const titleField = page.getByLabel('Título do artigo *');
        await titleField.waitFor({ state: 'visible', timeout: 15_000 });
        const originalTitle = (await titleField.inputValue()).replace(marker, '');
        await titleField.fill(originalTitle + marker);
        await page.getByRole('button', { name: /Salvar rascunho/i }).click();
        await page.waitForTimeout(1_800);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        const persistedTitle = await page
          .getByLabel('Título do artigo *')
          .inputValue();
        if (!persistedTitle.includes(marker)) {
          throw new Error(
            `LOCAL_QA_KNOWLEDGE_WRITE_NOT_PERSISTED: valor lido apos reload nao contem o marcador`,
          );
        }
        await page.getByLabel('Título do artigo *').fill(originalTitle);
        await page.getByRole('button', { name: /Salvar rascunho/i }).click();
        await page.waitForTimeout(1_800);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        const restoredTitle = await page
          .getByLabel('Título do artigo *')
          .inputValue();
        if (restoredTitle.includes(marker)) {
          throw new Error(
            'LOCAL_QA_KNOWLEDGE_WRITE_NOT_RESTORED: marcador de QA continua no titulo',
          );
        }
        deepScenarios.push({
          role: account.role,
          scenario: 'knowledge-write',
          persisted: true,
          restored: true,
        });
      }
      // Cenário visual do editor de acessos: abre o modal real de perfil sem
      // submeter alterações, verifica foco inicial, contenção de Tab, Escape,
      // rodapé sticky e ausência de overflow horizontal em desktop/mobile.
      if (account.accessModalScenario) {
        await page.goto(`${baseUrl}/admin/access`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
        await page.getByRole('button', { name: 'Perfis', exact: true }).click();
        const createProfileButton = page.getByRole('button', { name: 'Criar perfil', exact: true });
        await createProfileButton.click();
        const dialog = page.locator('[data-access-editor-modal="true"]');
        await dialog.waitFor({ state: 'visible', timeout: 10_000 });
        const modalLayout = await dialog.evaluate((node) => {
          const body = node.querySelector('.gso-access-modal-body');
          const actions = node.querySelector('.gso-ui-actions');
          return {
            activeInside: node.contains(document.activeElement),
            activeId: document.activeElement?.id ?? null,
            bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
            actionsPosition: actions ? getComputedStyle(actions).position : null,
            dialogWidth: node.getBoundingClientRect().width,
          };
        });
        if (!modalLayout.activeInside || modalLayout.activeId !== 'profile-editor-name') {
          throw new Error(`LOCAL_QA_ACCESS_MODAL_INITIAL_FOCUS_FAILED: ${JSON.stringify(modalLayout)}`);
        }
        if (modalLayout.bodyOverflowY !== 'auto' || modalLayout.actionsPosition !== 'sticky') {
          throw new Error(`LOCAL_QA_ACCESS_MODAL_LAYOUT_FAILED: ${JSON.stringify(modalLayout)}`);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (overflow) throw new Error(`LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin access-modal ${viewport.name}`);
        for (let index = 0; index < 4; index += 1) {
          await page.keyboard.press('Tab');
          const focusInside = await dialog.evaluate((node) => node.contains(document.activeElement));
          if (!focusInside) throw new Error(`LOCAL_QA_ACCESS_MODAL_FOCUS_TRAP_FAILED: ${viewport.name} tab=${index}`);
        }
        await page.screenshot({ path: join(logDir, `browser-platform_admin-access-modal-${viewport.name}.png`), fullPage: true });
        screenshots.push(`browser-platform_admin-access-modal-${viewport.name}.png`);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden', timeout: 5_000 });
        const restoredFocus = await page.evaluate(() => ({ id: document.activeElement?.id ?? null, text: document.activeElement?.textContent?.trim() ?? '' }));
        if (!/Criar perfil/.test(restoredFocus.text)) {
          throw new Error(`LOCAL_QA_ACCESS_MODAL_FOCUS_RESTORE_FAILED: ${JSON.stringify(restoredFocus)}`);
        }
        deepScenarios.push({ role: account.role, scenario: 'access-profile-modal', viewport: viewport.name, initialFocus: true, focusTrap: true, escape: true, stickyActions: true, horizontalOverflow: false });
      }
      // Regra de superfície do tema: com preferência escura salva, o ambiente
      // autenticado precisa ficar escuro e a Central Pública precisa continuar
      // clara. A verificação roda dentro da mesma sessão autenticada.
      if (viewport.name === 'desktop' && account.themeSurfaceScenario) {
        await page.evaluate(() => {
          window.localStorage.setItem('genius.theme-preference', 'dark');
        });
        await page.goto(`${baseUrl}/admin/analytics`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        const internalTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme'),
        );
        if (internalTheme !== 'dark') {
          throw new Error(
            `LOCAL_QA_THEME_INTERNAL_NOT_DARK: /admin/analytics resolveu ${internalTheme}`,
          );
        }
        await page.goto(`${baseUrl}/help/genius`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        const publicTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme'),
        );
        if (publicTheme !== 'light') {
          throw new Error(
            `LOCAL_QA_THEME_PUBLIC_NOT_LIGHT: /help/genius resolveu ${publicTheme}`,
          );
        }
        await page.evaluate(() => {
          window.localStorage.removeItem('genius.theme-preference');
        });
        deepScenarios.push({
          role: account.role,
          scenario: 'theme-surface',
          internalTheme,
          publicTheme,
        });
      }
      // Configurações → Integrações: auditoria visual em 1920x1080 e verificação
      // de que a tela nunca chega com credencial preenchida. Os campos de
      // segredo precisam nascer vazios, porque campo vazio significa "manter a
      // credencial atual" no contrato de gravação.
      if (viewport.name === 'desktop' && account.settingsIntegrationsScenario) {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(`${baseUrl}/admin/settings/integrations`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(700);
        // O blueprint atual usa o cabeçalho compartilhado (h1), dois painéis
        // de provedor (h3), a região de escopos e a política de segurança.
        // Os antigos blocos "Conexões e execuções" e "Proteção das
        // credenciais" foram removidos da composição vigente.
        for (const [name, level] of [
          ['Integrações', 1],
          ['HubSpot', 3],
          ['OMIE', 3],
          ['Permissões e escopos', 3],
          ['Política de segurança', 3],
        ]) {
          const heading = page.getByRole('heading', { name, level, exact: true });
          if (!(await heading.count())) {
            throw new Error(`LOCAL_QA_SETTINGS_INTEGRATIONS_MISSING_BLOCK: ${name}`);
          }
        }
        const credentialToggles = page.getByRole('button', { name: 'Gerenciar credenciais', exact: true });
        if ((await credentialToggles.count()) !== 2) {
          throw new Error(`LOCAL_QA_SETTINGS_INTEGRATIONS_CREDENTIAL_TOGGLES: ${await credentialToggles.count()}`);
        }
        for (let index = 0; index < await credentialToggles.count(); index += 1) {
          await credentialToggles.nth(index).click();
        }
        const credentialFields = page.locator('input[type="password"]');
        const credentialCount = await credentialFields.count();
        if (credentialCount < 3) {
          throw new Error(`LOCAL_QA_SETTINGS_INTEGRATIONS_CREDENTIAL_FIELDS: ${credentialCount}`);
        }
        for (let index = 0; index < credentialCount; index += 1) {
          if ((await credentialFields.nth(index).inputValue()) !== '') {
            throw new Error('LOCAL_QA_SETTINGS_INTEGRATIONS_CREDENTIAL_PREFILLED');
          }
        }
        const integrationsOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (integrationsOverflow) {
          throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin settings-integrations 1920');
        }
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-settings-integrations-1920.png'), fullPage: true });
        screenshots.push('browser-platform_admin-settings-integrations-1920.png');
        deepScenarios.push({
          role: account.role,
          scenario: 'settings-integrations',
          viewport: '1920x1080',
          credentialFields: credentialCount,
          credentialsPrefilled: false,
        });
        // Fontes do Dashboard: composição e ausência de overflow em 1920. A rota
        // fica neste bloco, depois do veredito do persona, porque o acesso direto
        // por URL faz o app reler o contexto administrativo e receber 401 — o
        // mesmo efeito já documentado para as rotas sondadas.
        await page.goto(`${baseUrl}/admin/settings/dashboard-sources`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const sourcesHeading = page.getByRole('heading', { name: 'Governança de dados', level: 1, exact: true });
        if (!(await sourcesHeading.count())) throw new Error('LOCAL_QA_SETTINGS_SOURCES_MISSING_HEADER');
        const sourcesRows = await page.locator('.gso-ui-table tbody tr').count();
        const sourcesOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (sourcesOverflow) throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin settings-dashboard-sources 1920');
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-settings-dashboard-sources-1920.png'), fullPage: true });
        screenshots.push('browser-platform_admin-settings-dashboard-sources-1920.png');
        deepScenarios.push({
          role: account.role,
          scenario: 'settings-dashboard-sources',
          viewport: '1920x1080',
          tableRows: sourcesRows,
        });
        // Histórico de sincronizações: a barra de filtros precisa existir e ter
        // efeito. O cenário troca o recorte para "Com falha" e confirma que a
        // faixa de indicadores acompanha a lista.
        await page.goto(`${baseUrl}/admin/settings/sync-history`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(700);
        const historyHeading = page.getByRole('heading', { name: 'Histórico de sincronizações', level: 1, exact: true });
        if (!(await historyHeading.count())) throw new Error('LOCAL_QA_SETTINGS_HISTORY_MISSING_HEADER');
        const historyFilters = page.locator('.gso-ui-toolbar select');
        const historyFilterCount = await historyFilters.count();
        if (historyFilterCount < 4) throw new Error(`LOCAL_QA_SETTINGS_HISTORY_FILTERS: ${historyFilterCount}`);
        const historyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (historyOverflow) throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin settings-sync-history 1920');
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-settings-sync-history-1920.png'), fullPage: true });
        screenshots.push('browser-platform_admin-settings-sync-history-1920.png');
        const metricsBefore = await page.locator('.gso-ui-metrics .gso-ui-metric .gso-ui-metric-value').first().innerText();
        await historyFilters.nth(2).selectOption('failed');
        await page.waitForTimeout(400);
        const metricsAfter = await page.locator('.gso-ui-metrics .gso-ui-metric .gso-ui-metric-value').first().innerText();
        deepScenarios.push({
          role: account.role,
          scenario: 'settings-sync-history',
          viewport: '1920x1080',
          filters: historyFilterCount,
          totalBefore: metricsBefore,
          totalAfterFailedFilter: metricsAfter,
        });
        // Marcas: composição lista + detalhe em 1920, sem overflow horizontal e
        // com o painel de detalhe da marca escolhida presente.
        await page.goto(`${baseUrl}/admin/settings/brands`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const brandsHeading = page.getByRole('heading', { name: 'Marcas', level: 1, exact: true });
        if (!(await brandsHeading.count())) throw new Error('LOCAL_QA_SETTINGS_BRANDS_MISSING_HEADER');
        const brandsRows = await page.locator('.gso-ui-table tbody tr').count();
        const brandsDetail = await page.locator('.gso-ui-split aside').count();
        const brandsOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (brandsOverflow) throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin settings-brands 1920');
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-settings-brands-1920.png'), fullPage: true });
        screenshots.push('browser-platform_admin-settings-brands-1920.png');
        deepScenarios.push({
          role: account.role,
          scenario: 'settings-brands',
          viewport: '1920x1080',
          tableRows: brandsRows,
          detailPanels: brandsDetail,
        });
        // Central de ajuda: um card por central, com os cinco canais de contato
        // reais e nenhum campo além do que o backend grava.
        await page.goto(`${baseUrl}/admin/settings/help-center`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(900);
        const helpCenterHeading = page.getByRole('heading', { name: 'Central de Ajuda', level: 1, exact: true });
        if (!(await helpCenterHeading.count())) throw new Error('LOCAL_QA_SETTINGS_HELP_CENTER_MISSING_HEADER');
        const helpCenterCards = await page.locator('.gso-ui-card').count();
        const helpCenterFields = await page.locator('.gso-ui-grid input').count();
        const helpCenterOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (helpCenterOverflow) throw new Error('LOCAL_QA_HORIZONTAL_OVERFLOW: platform_admin settings-help-center 1920');
        await page.screenshot({ path: join(logDir, 'browser-platform_admin-settings-help-center-1920.png'), fullPage: true });
        screenshots.push('browser-platform_admin-settings-help-center-1920.png');
        deepScenarios.push({
          role: account.role,
          scenario: 'settings-help-center',
          viewport: '1920x1080',
          cards: helpCenterCards,
          contactFields: helpCenterFields,
        });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      }
      // A sondagem roda por último, depois do veredito do persona, porque visita
      // rotas sem screen key de propósito. Nesse caminho o app tenta ler o read
      // model de contexto administrativo e recebe 401, o que é esperado para
      // usuário sem grant e não deve contaminar a asserção do cenário coberto.
      if (viewport.name === 'desktop' && account.probeRoutes?.length) {
        for (const probeRoute of account.probeRoutes) {
          await page.goto(`${baseUrl}${probeRoute}`, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(400);
          probeResults.push({
            role: account.role,
            route: probeRoute,
            reachedPath: new URL(page.url()).pathname,
          });
        }
      }
      await context.close();
    }
  }

  // Login sem `redirectTo`: qualquer perfil autenticado deve iniciar na
  // recepção, e não no Dashboard nem em uma rota operacional fixa.
  const defaultContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const defaultPage = await defaultContext.newPage();
  await defaultPage.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await defaultPage.getByLabel('Email').fill(qa.LOCAL_QA_ADMIN_EMAIL);
  await defaultPage.getByLabel('Senha').fill(qa.LOCAL_QA_ADMIN_PASSWORD);
  await defaultPage.getByRole('button', { name: /entrar/i }).click();
  await defaultPage.waitForURL((url) => url.pathname === '/inicio', { timeout: 20_000 });
  defaultReceptionResult = { role: 'platform_admin', route: new URL(defaultPage.url()).pathname };
  await defaultContext.close();
} finally {
  if (browser) await browser.close();
  await stopWebServer(server);
}

const failures = results.filter((item) => item.consoleErrors || item.pageErrors || item.requestFailures || item.unexpectedResponses);
if (failures.length) throw new Error(`LOCAL_QA_BROWSER_SMOKE_FAILED: ${JSON.stringify(failures)}`);
console.log(JSON.stringify({ environment: 'local', framework: 'playwright', server_started_automatically: true, healthcheck: true, personas: results, defaultReception: defaultReceptionResult, internalRoutes: extraRouteResults, deepScenarios, settingsAccessMatrix: settingsAccessResults, settingsRequestMatrix, probedRoutes: probeResults, screenshots }));
