import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isExpectedStaleAuthResponse, isExpectedStaleConsoleError, staleRefreshLoopDetected } from '../../scripts/local-qa/analytics-dashboard-runtime-matrix-logic.mjs';

const source = await readFile(new URL('../../scripts/local-qa/analytics-dashboard-runtime-matrix.mjs', import.meta.url), 'utf8');
const logicSource = await readFile(new URL('../../scripts/local-qa/analytics-dashboard-runtime-matrix-logic.mjs', import.meta.url), 'utf8');

test('matriz cobre personas, abas e estado fail-closed', () => {
  for (const persona of ['unauthenticated', 'authorized', 'dashboard_viewer', 'stale_session']) assert.match(source, new RegExp(persona));
  for (const tab of ['overview', 'commercial', 'customer-success', 'support', 'finance']) assert.match(source, new RegExp(tab.replace('-', '[-_]')));
  assert.match(source, /failClosed: true/);
  assert.match(source, /process\.exitCode = 1/);
});

test('gate exige alvo local e não aceita métodos de escrita', () => {
  assert.match(source, /LOCAL_QA_RUNTIME_MATRIX_REQUIRES_LOCAL_4173/);
  assert.match(source, /LOCAL_QA_RUNTIME_MATRIX_WRITE_METHOD/);
  assert.match(source, /54321/);
  assert.match(source, /rpc_analytics_\[a-z0-9_\]/);
  assert.match(source, /rpc_internal_actor_workspace_context/);
  assert.match(source, /request\.method\(\) !== 'POST' \|\| !isLocalTarget\(url\) \|\| url\.port !== '54321'/);
  assert.doesNotMatch(source, /LOCAL_QA_\w+_PASSWORD/);
  assert.doesNotMatch(source, /getByLabel\(['"]Senha/);
});

test('POST allowlisted exige hostname local mesmo na porta do Supabase', () => {
  assert.match(source, /request\.method\(\) !== 'POST' \|\| !isLocalTarget\(url\) \|\| url\.port !== '54321'/);
  assert.match(source, /if \(\['GET', 'HEAD', 'OPTIONS'\]\.includes\(request\.method\(\)\)\) return isLocalTarget\(url\)/);
});

test('evidência de rede é sanitizada antes de ser publicada', () => {
  assert.match(source, /secretKeyPattern/);
  assert.match(source, /sanitizeRequest/);
  assert.match(source, /sanitizeObject/);
  assert.match(source, /authorization\|cookie\|token/);
});

test('matriz exercita filtros e registra loading/stale sem inventar sucesso', () => {
  assert.match(source, /exerciseFilters/);
  assert.match(source, /filterInteractions/);
  assert.match(source, /analytics-pipeline-combobox/);
  assert.match(source, /requestDelta/);
  assert.match(source, /rapid/);
  assert.match(source, /loadingObserved/);
  assert.match(source, /staleGuardObserved/);
  assert.match(source, /stateCoverageFailures/);
  assert.match(source, /stateCoverageFailures\.length/);
  assert.match(source, /loadingTransitionObserved/);
  assert.match(source, /staleTransitionObserved/);
  assert.match(source, /!item\.evidence\.loadingTransitionObserved/);
  assert.match(source, /!item\.evidence\.staleTransitionObserved/);
  assert.match(source, /NÃO COMPROVADOS/);
});

test('mensagens de console e page errors passam por sanitização', () => {
  assert.match(source, /sanitizeDiagnostic\(message\.text\(\)\)/);
  assert.match(source, /sanitizeDiagnostic\(error\?\.message\)/);
  assert.match(source, /function sanitizeDiagnostic/);
});

test('refresh rejeitado de stale só é esperado com as cinco rotas fechadas', () => {
  assert.match(source, /stale_session_refresh_rejected/);
  assert.match(logicSource, /\/auth\/v1\/token/);
  assert.match(source, /analytics-dashboard-runtime-matrix-logic\.mjs/);
  assert.match(source, /isExpectedStaleAuthResponse/);
  assert.match(source, /expectedStaleAuthFailures/);
  assert.match(source, /staleRefreshLoops/);
  assert.match(source, /unexpectedDiagnostics/);
  assert.match(source, /!isExpectedStaleAuthResponse\(item, response, tabRoutes\.length\)/);
  assert.match(source, /!isExpectedStaleConsoleError\(item, diagnostic, tabRoutes\.length\)/);
  assert.match(logicSource, /function staleSessionRoutesClosed/);
});

test('console 400 stale exige uma única resposta de refresh correlacionada', () => {
  const item = {
    persona: 'stale_session',
    stateProvided: true,
    evidence: {
      staleTransitionObserved: true,
      responses: [{ method: 'POST', path: '/auth/v1/token', status: 400 }],
      consoleErrors: ['POST http://127.0.0.1:54321/auth/v1/token 400 (Bad Request)'],
    },
    routes: Array.from({ length: 5 }, () => ({ routeIsLogin: true, routeIsDenied: false })),
  };
  const diagnostic = item.evidence.consoleErrors[0];
  assert.equal(isExpectedStaleAuthResponse(item, item.evidence.responses[0], 5), true);
  assert.equal(isExpectedStaleConsoleError(item, diagnostic, 5), true);
  const repeatedRefresh = {
    ...item,
    evidence: {
      ...item.evidence,
      responses: [
        ...item.evidence.responses,
        { method: 'POST', path: '/auth/v1/token', status: 400 },
      ],
    },
  };
  assert.equal(isExpectedStaleAuthResponse(repeatedRefresh, repeatedRefresh.evidence.responses[0], 5), false);
  assert.equal(isExpectedStaleAuthResponse(repeatedRefresh, repeatedRefresh.evidence.responses[1], 5), false);
  assert.equal(staleRefreshLoopDetected(repeatedRefresh, 5), true);
  assert.equal(isExpectedStaleConsoleError(repeatedRefresh, diagnostic, 5), false);
  assert.equal(isExpectedStaleConsoleError({ ...item, evidence: { ...item.evidence, consoleErrors: ['Failed to load resource: the server responded with a status of 400 (Bad Request)'] } }, 'Failed to load resource: the server responded with a status of 400 (Bad Request)', 5), false);
  assert.equal(isExpectedStaleConsoleError({ ...item, evidence: { ...item.evidence, responses: [] } }, diagnostic, 5), false);
  assert.equal(isExpectedStaleConsoleError({ ...item, evidence: { ...item.evidence, responses: [{ method: 'POST', path: '/rest/v1/rpc/unrelated', status: 400 }] } }, diagnostic, 5), false);
  assert.equal(isExpectedStaleConsoleError({ ...item, evidence: { ...item.evidence, consoleErrors: [diagnostic, 'unrelated 400'] } }, diagnostic, 5), false);
});
