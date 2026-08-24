import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildMinimalNavigation } from '../../apps/web/src/features/navigation/minimal-navigation.ts';
import { canOpenInternalRoute } from '../../apps/web/src/features/auth/internal-route-access.ts';
import { setReleaseSurfaceModeForTests } from '../../apps/web/src/app/release-surface.mjs';

setReleaseSurfaceModeForTests('first-release');

const ids = (navigation) => navigation.flatMap((section) => section.items.map((item) => item.id));

test('menu publicado e guard compartilham a fonte de release para administrador', () => {
  const context = { roles: ['platform_admin'], screenKeys: [], hasReceptionAccess: true };
  const navigation = buildMinimalNavigation({ pathname: '/inicio', permissions: { isPlatformAdmin: true, roles: context.roles, screenKeys: [] } });
  const destinations = navigation.flatMap((section) => section.items.map((item) => item.to));

  assert.deepEqual(ids(navigation), [
    'user-reception',
    'admin-tenants',
    'admin-analytics',
    'admin-knowledge',
    'admin-knowledge-new',
    'public-help-center',
    'admin-access',
    'admin-settings-integrations',
    'admin-settings-dashboard-sources',
    'admin-settings-sync-history',
    'admin-settings-brands',
    'admin-settings-help-center',
  ]);
  for (const destination of destinations) assert.equal(canOpenInternalRoute(destination, context), true, destination);
  assert.equal(destinations.includes('/admin/tenants'), true);
  assert.equal(destinations.includes('/support/queue'), false);
});

test('dashboard_viewer recebe somente recepção e Dashboard publicado', () => {
  const context = { roles: ['dashboard_viewer'], screenKeys: [], hasReceptionAccess: true };
  const navigation = buildMinimalNavigation({
    pathname: '/inicio',
    permissions: {
      isPlatformAdmin: false,
      roles: context.roles,
      screenKeys: [],
      hasDashboardViewerAccess: true,
    },
  });
  const destinations = navigation.flatMap((section) => section.items.map((item) => item.to));

  assert.deepEqual(destinations, ['/inicio', '/admin/analytics']);
  assert.equal(canOpenInternalRoute('/admin/analytics', context), true);
  assert.equal(canOpenInternalRoute('/admin/settings', context), false);
  assert.equal(canOpenInternalRoute('/admin/knowledge', context), false);
});

test('perfil sem grants recebe somente a recepção e não ganha rota por texto ou role implícito', () => {
  const context = { roles: [], screenKeys: [], hasReceptionAccess: true };
  const navigation = buildMinimalNavigation({ pathname: '/inicio', permissions: { isPlatformAdmin: false, roles: [], screenKeys: [] } });

  assert.deepEqual(ids(navigation), ['user-reception']);
  assert.equal(canOpenInternalRoute('/inicio', context), true);
  assert.equal(canOpenInternalRoute('/admin/analytics', context), false);
  assert.equal(canOpenInternalRoute('/support/queue', context), false);
});

test('shell mantém busca no header e menu de usuário em um único ponto global', () => {
  const shell = fs.readFileSync(new URL('../../apps/web/src/features/navigation/MinimalAppShell.tsx', import.meta.url), 'utf8');
  const header = shell.slice(shell.indexOf('function ShellTopbar'), shell.indexOf('export function MinimalAppShell'));
  const appShell = shell.slice(shell.indexOf('export function MinimalAppShell'));

  assert.equal((shell.match(/<GeniusGlobalSearch /g) ?? []).length, 1);
  assert.equal((shell.match(/<SidebarAccount/g) ?? []).length, 2, 'desktop e drawer mobile reutilizam o mesmo componente');
  assert.match(header, /<GeniusGlobalSearch permissions=\{searchPermissions\} \/>/);
  assert.doesNotMatch(header, /\n\s*<SidebarAccount/);
  assert.match(appShell, /<GeniusSidebar/);
});

test('estados de recepção, erro, negação e fallback permanecem cobertos pela composição real', () => {
  const router = fs.readFileSync(new URL('../../apps/web/src/app/router.tsx', import.meta.url), 'utf8');
  const receptionGate = fs.readFileSync(new URL('../../apps/web/src/features/auth/ReceptionGate.tsx', import.meta.url), 'utf8');
  const accessDenied = fs.readFileSync(new URL('../../apps/web/src/features/auth/AccessDeniedPage.tsx', import.meta.url), 'utf8');

  assert.match(router, /path: '\/inicio'/);
  assert.match(router, /<ReceptionGate>/);
  assert.match(router, /path: '\/access-denied'/);
  assert.match(receptionGate, /phase === 'booting'/);
  assert.match(receptionGate, /sessionExpired/);
  assert.match(receptionGate, /phase === 'config-error'/);
  assert.match(accessDenied, /\/inicio/);
});
