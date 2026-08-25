import assert from 'node:assert/strict';
import test from 'node:test';
import { activeTabMatches, adminNavigationIsAbsent, customerNavigationFailures, customerRouteIsDenied, exactLoginRedirect, exactRoute, evidenceFailures, isAllowedReadOnlyRequest, staleCoverageState } from '../../scripts/local-qa/analytics-dashboard-authorization-runtime-logic.mjs';

test('rota de dashboard exige pathname e query exatos', () => {
  assert.equal(exactRoute('/admin/analytics?tab=ceo', '/admin/analytics?tab=ceo'), true);
  assert.equal(exactRoute('/admin/analytics?tab=support', '/admin/analytics?tab=ceo'), false);
  assert.equal(exactRoute('/admin/analytics?tab=ceo&extra=1', '/admin/analytics?tab=ceo'), false);
});

test('redirect não autenticado preserva destino exato', () => {
  assert.equal(exactLoginRedirect('/login?redirectTo=%2Fadmin%2Fanalytics%3Ftab%3Dceo', '/admin/analytics?tab=ceo'), true);
  assert.equal(exactLoginRedirect('/login?redirectTo=%2Fadmin%2Fanalytics', '/admin/analytics?tab=ceo'), false);
});

test('aba ativa é validada pelo rótulo exato', () => {
  assert.equal(activeTabMatches(['Visão Geral'], 'Visão Geral'), true);
  assert.equal(activeTabMatches(['Comercial'], 'Visão Geral'), false);
});

test('customer_user só pode cair em rotas de recepção ou negação', () => {
  assert.equal(customerRouteIsDenied('/inicio'), true);
  assert.equal(customerRouteIsDenied('/access-denied'), true);
  assert.equal(customerRouteIsDenied('/admin/analytics?tab=ceo'), false);
});

test('GET e endpoints RPC allowlisted são somente leitura', () => {
  assert.equal(isAllowedReadOnlyRequest('GET', '/rest/v1/vw_admin_auth_context'), true);
  assert.equal(isAllowedReadOnlyRequest('POST', '/auth/v1/token', '54321'), true);
  assert.equal(isAllowedReadOnlyRequest('POST', '/rest/v1/rpc/rpc_analytics_ceo_snapshot', '54321'), true);
  assert.equal(isAllowedReadOnlyRequest('POST', '/rest/v1/rpc/rpc_analytics_ceo_snapshot', '4173'), false);
  assert.equal(isAllowedReadOnlyRequest('POST', '/rest/v1/tenants'), false);
});

test('métodos e RPCs fora da allowlist bloqueiam o gate', () => {
  assert.equal(isAllowedReadOnlyRequest('PUT', '/rest/v1/rpc/rpc_analytics_ceo_snapshot', '54321'), false);
  assert.equal(isAllowedReadOnlyRequest('POST', '/rest/v1/rpc/rpc_admin_mutation', '54321'), false);
  assert.equal(isAllowedReadOnlyRequest('DELETE', '/rest/v1/anything', '54321'), false);
});

test('stale ausente permanece não comprovado e fail-closed', () => {
  assert.deepEqual(staleCoverageState(false, []), { state: 'NOT_PROVEN', failClosed: true });
});

test('stale fornecido exige todas as rotas fechadas', () => {
  assert.equal(staleCoverageState(true, [
    { routeIsLogin: true, routeIsDenied: false },
    { routeIsLogin: false, routeIsDenied: true },
  ]).state, 'PROVEN');
  assert.equal(staleCoverageState(true, [{ routeIsLogin: false, routeIsDenied: false }]).state, 'FAILED');
});

test('customer_user não pode exibir navegação administrativa', () => {
  assert.equal(adminNavigationIsAbsent(['/inicio', '/help']), true);
  assert.equal(adminNavigationIsAbsent(['/admin/analytics']), false);
  assert.deepEqual(customerNavigationFailures({
    links: [{ href: '/inicio', text: 'Meu espaço' }],
    buttons: [{ text: 'Minha área' }],
  }), []);
  assert.deepEqual(customerNavigationFailures({
    links: [],
    buttons: [{ text: 'Administração' }],
  }), ['customer_navigation_admin:Administração']);
  assert.deepEqual(customerNavigationFailures({
    links: [{ href: '/admin/analytics', text: 'Dashboard gerencial' }],
    buttons: [],
  }), ['customer_navigation_admin:/admin/analytics']);
});

test('diagnósticos de qualquer persona entram no veredito global', () => {
  const failures = evidenceFailures([{ routes: [{ evidence: { consoleErrors: ['console'], pageErrors: ['page'], requestFailures: ['request'] } }] }]);
  assert.deepEqual(failures, ['console:console', 'page:page', 'request:request']);
});
