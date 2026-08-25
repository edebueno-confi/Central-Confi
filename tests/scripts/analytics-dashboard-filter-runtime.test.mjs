import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { exactValueEqual, parameterFailures, payloadFailures, pipelineSelectionIds, surfaceFailures } from '../../scripts/local-qa/analytics-dashboard-filter-runtime-assertions.mjs';

const source = await readFile(new URL('../../scripts/local-qa/analytics-dashboard-filter-runtime.mjs', import.meta.url), 'utf8');

test('gate cobre as cinco superfícies e as duas personas autenticadas', () => {
  for (const route of ['overview', 'commercial', 'customer_success', 'support', 'finance']) assert.match(source, new RegExp(route));
  for (const tab of ['ceo', 'commercial', 'customer-success', 'support', 'finance']) assert.match(source, new RegExp(`tab: '${tab}'`));
  for (const label of ['Visão Geral', 'Comercial', 'Customer Success', 'Suporte', 'Financeiro']) assert.match(source, new RegExp(label));
  for (const persona of ['authorized', 'dashboard_viewer']) assert.match(source, new RegExp(persona));
  assert.match(source, /LOCAL_QA_CONFIG_MISSING/);
});

test('gate aceita somente alvo local e requests read-only', () => {
  assert.match(source, /LOCAL_QA_FILTER_RUNTIME_REQUIRES_LOCAL_4173/);
  assert.match(source, /LOCAL_QA_FILTER_RUNTIME_WRITE_METHOD/);
  assert.match(source, /\['4173', '4184', '54321'\]/);
  assert.match(source, /rpc_analytics_/);
  assert.doesNotMatch(source, /LOCAL_QA_\w+_PASSWORD\s*=/);
  assert.doesNotMatch(source, /supabase db reset|git add|migration/i);
});

test('gate exercita operação, período, filtros, pipelines e granularidade', () => {
  for (const field of ['Operação', 'Período', 'Estágio', 'Situação', 'Responsável', 'Prioridade', 'Aging', 'Pipelines', 'Granularidade']) assert.match(source, new RegExp(field));
  assert.match(source, /p_group_company/);
  assert.match(source, /p_from/);
  assert.match(source, /p_stage_id/);
  assert.match(source, /p_owner_id/);
  assert.match(source, /p_priority/);
  assert.match(source, /p_status/);
  assert.match(source, /p_aging_bucket/);
  assert.match(source, /p_excluded_pipeline_ids/);
  assert.match(source, /p_grain/);
  assert.match(source, /assertNewRead/);
});

test('gate mantém falhas de console, rede, respostas e rotas como bloqueadores', () => {
  for (const failure of ['consoleErrors', 'pageErrors', 'requestFailures', 'externalRequests', 'responses', 'globalFailures']) assert.match(source, new RegExp(failure));
  assert.match(source, /surfaceFailures/);
  assert.match(source, /button\[aria-current="page"\]/);
  assert.match(source, /if \(report\.failures\.length > 0\) process\.exitCode = 1/);
});

test('gate rejeita payload sem o valor completo e correlaciona pipeline ao ID', () => {
  assert.match(source, /parameterFailures/);
  assert.match(source, /payloadFailures/);
  assert.match(source, /pipelineSelectionIds/);
  assert.match(source, /expectedExcluded/);
  assert.match(source, /p_from/);
  assert.match(source, /p_to/);
  assert.match(source, /p_status/);
  assert.match(source, /p_aging_bucket/);
  assert.match(source, /pipelineCatalog/);
});

test('gate sanitiza evidência e não publica credenciais', () => {
  assert.match(source, /function sanitize/);
  assert.match(source, /REDACTED/);
  assert.match(source, /postDataJSON/);
  assert.match(source, /outputPath/);
});

test('regressão de superfície rejeita rota ou aba divergente', () => {
  const surface = { key: 'commercial', label: 'Comercial', route: '/admin/analytics?tab=commercial' };
  assert.deepEqual(surfaceFailures(surface, 'http://127.0.0.1:4173/admin/analytics?tab=finance', 'Financeiro').length > 0, true);
  assert.deepEqual(surfaceFailures(surface, 'http://127.0.0.1:4173/admin/analytics?tab=commercial&extra=1', ['Comercial']), ['commercial: query final divergente']);
  assert.deepEqual(surfaceFailures(surface, 'http://127.0.0.1:4173/admin/analytics?tab=commercial', ['Posição']).length > 0, true);
  assert.deepEqual(surfaceFailures(surface, 'http://127.0.0.1:4173/admin/analytics?tab=commercial', 'Comercial'), []);
});

test('regressão de payload rejeita ausência, null, valor anterior e divergência', () => {
  const expected = { p_status: 'open', p_from: '2026-01-01', p_to: '2026-08-24' };
  const valid = [{ body: expected }];
  assert.deepEqual(parameterFailures(valid, 'p_status', 'open', 'status'), []);
  assert.deepEqual(parameterFailures([{ body: { p_status: 'old' } }, { body: { p_status: 'open' } }], 'p_status', 'open', 'status'), []);
  for (const body of [{}, { p_status: null }, { p_status: 'closed' }, { p_status: 'old' }]) {
    assert.notDeepEqual(parameterFailures([{ body }], 'p_status', 'open', 'status'), []);
  }
  assert.deepEqual(payloadFailures(valid, { p_status: 'open', p_from: '2026-01-01', p_to: '2026-08-24' }, 'payload'), []);
  assert.notDeepEqual(payloadFailures([...valid, { body: { p_from: '2026-01-01', p_to: '2026-08-23' } }], { p_status: 'open', p_from: '2026-01-01', p_to: '2026-08-24' }, 'payload'), []);
  assert.notDeepEqual(payloadFailures([{ body: { p_from: '2026-01-01', p_to: '2026-08-23' } }], { p_from: '2026-01-01', p_to: '2026-08-24' }, 'payload'), []);
  assert.notDeepEqual(payloadFailures([{ body: { p_from: '2026-01-01' } }], { p_from: '2026-01-01', p_to: '2026-08-24' }, 'payload'), []);
  assert.equal(exactValueEqual(['pipeline-a'], ['pipeline-a']), true);
  assert.equal(exactValueEqual(['pipeline-a'], ['pipeline-b']), false);
});

test('regressão de pipeline compara o array completo de exclusões', () => {
  const expected = pipelineSelectionIds(['pipeline-old'], 'pipeline-selected');
  assert.deepEqual(expected, ['pipeline-old', 'pipeline-selected']);
  assert.deepEqual(parameterFailures([{ body: { p_excluded_pipeline_ids: expected } }], 'p_excluded_pipeline_ids', expected, 'pipelines'), []);
  assert.notDeepEqual(parameterFailures([{ body: { p_excluded_pipeline_ids: ['pipeline-selected'] } }], 'p_excluded_pipeline_ids', expected, 'pipelines'), []);
});
