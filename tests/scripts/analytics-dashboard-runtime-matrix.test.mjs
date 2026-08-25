import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../scripts/local-qa/analytics-dashboard-runtime-matrix.mjs', import.meta.url), 'utf8');

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
