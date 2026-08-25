import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const api = await readFile('apps/web/src/features/analytics/analytics-api.ts', 'utf8');

function functionBlock(name) {
  return api.match(new RegExp(`function ${name}[\\s\\S]*?\\n}`))?.[0] ?? '';
}

test('Comercial usa a assinatura histórica somente sem estágio ou exclusões', () => {
  const block = functionBlock('commercialKpiRpcArgs');
  assert.notEqual(block, '');
  assert.match(block, /p_owner_id: filters\.ownerId \|\| null/);
  assert.match(block, /p_group_company: groupCompany/);
  assert.match(block, /if \(!filters\.stageId && excludedPipelineIds\.length === 0\) return base/);
  assert.match(block, /p_stage_id: filters\.stageId \|\| null/);
  assert.match(block, /p_excluded_pipeline_ids: excludedPipelineIds/);
});

test('Suporte usa a assinatura histórica somente sem estágio ou exclusões', () => {
  const block = functionBlock('supportKpiRpcArgs');
  assert.notEqual(block, '');
  assert.match(block, /p_priority: filters\.priority \|\| null/);
  assert.match(block, /p_group_company: groupCompany/);
  assert.match(block, /if \(!filters\.stageId && excludedPipelineIds\.length === 0\) return base/);
  assert.match(block, /p_stage_id: filters\.stageId \|\| null/);
  assert.match(block, /p_excluded_pipeline_ids: excludedPipelineIds/);
});

test('todos os consumidores de KPI usam o adaptador compatível', () => {
  assert.match(api, /client\.rpc\('rpc_analytics_commercial_kpis_by_operation', commercialKpiRpcArgs\(/);
  assert.doesNotMatch(api, /getCommercialKpisV2[\\s\\S]*?p_excluded_pipeline_ids: excludedPipelineIds/);
  assert.match(api, /client\.rpc\('rpc_analytics_support_kpis_by_operation', supportKpiRpcArgs\(/);
  assert.doesNotMatch(api, /getSupportKpisV2[\\s\\S]*?p_excluded_pipeline_ids: excludedPipelineIds/);
});
