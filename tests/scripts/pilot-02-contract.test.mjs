import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { canOpenInternalRoute } from '../../apps/web/src/features/auth/internal-route-access.ts';

const analyticsShell = fs.readFileSync('apps/web/src/features/analytics/AnalyticsShell.tsx', 'utf8');
const ceoPage = fs.readFileSync('apps/web/src/features/analytics/AnalyticsCeoPage.tsx', 'utf8');
const adminShell = fs.readFileSync('apps/web/src/features/admin-shell/AdminConsoleShell.tsx', 'utf8');
const adminGate = fs.readFileSync('apps/web/src/features/auth/AdminGate.tsx', 'utf8');
const minimalNavigation = fs.readFileSync('apps/web/src/features/navigation/minimal-navigation.ts', 'utf8');

const viewerContext = {
  roles: ['dashboard_viewer'],
  screenKeys: [],
  hasCustomerPortalAccess: false,
  hasInternalActionAreaAccess: false,
  hasCsPortfolioAccess: false,
};

test('dashboard_viewer abre somente o Dashboard Gerencial dentro do Admin', () => {
  assert.equal(canOpenInternalRoute('/admin/analytics', viewerContext), true);
  for (const route of ['/admin/customer-portal', '/admin/knowledge', '/admin/settings', '/admin/system', '/admin/logs']) {
    assert.equal(canOpenInternalRoute(route, viewerContext), false, `rota indevidamente liberada: ${route}`);
  }
});

test('navegação visível do dashboard_viewer contém somente o Dashboard gerencial', () => {
  const viewerBranch = minimalNavigation.match(/if \(isDashboardViewer\) \{([\s\S]*?)\n  \}/)?.[1] ?? '';
  assert.match(viewerBranch, /label: 'Dashboard gerencial'/);
  assert.doesNotMatch(viewerBranch, /customer-area-config|help-center|knowledge-content|dashboard-settings/);
  assert.equal((viewerBranch.match(/id: 'dashboard-operational'/g) ?? []).length, 1);
});

test('shell do dashboard viewer mostra apenas a Visão executiva e não expõe comandos administrativos', () => {
  assert.match(analyticsShell, /DOMAINS\.filter/);
  assert.match(analyticsShell, /isAnalyticsDomainPublishedInRelease/);
  assert.match(analyticsShell, /activeKey === 'ceo'/);
  assert.match(analyticsShell, /isPlatformAdmin/);
  assert.match(analyticsShell, /onRetry/);
  assert.match(adminGate, /canOpenInternalRoute/);
});

test('Dashboard Gerencial concentra os KPIs no quadro reutilizável', () => {
  assert.match(ceoPage, /AnalyticsKpiBoard/);
  assert.doesNotMatch(ceoPage, /Desempenho no período/);
  assert.match(ceoPage, /Mapa das áreas/);
  assert.doesNotMatch(ceoPage, /Posição atual, não afetada pelo período selecionado/);
  assert.match(fs.readFileSync('apps/web/src/features/analytics/analytics-ui.tsx', 'utf8'), /min-h-\[170px\].*sm:min-h-\[240px\]/s);
  assert.match(fs.readFileSync('apps/web/src/features/analytics/analytics-ui.tsx', 'utf8'), /aria-busy="true"/);
  assert.match(ceoPage, /Não há registros no período selecionado/);
});

test('status de sincronização distingue delta processado do snapshot acumulado', () => {
  assert.match(analyticsShell, /hasValidSnapshot/);
  assert.match(ceoPage, /última atualização válida/);
});
