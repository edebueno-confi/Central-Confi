import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditCandidates,
  CANONICAL_CONTAINER,
  CONTRACT_CANDIDATE,
  HELPER_CANDIDATE,
  SHADOW_MANIFEST,
  verifyShadowIdentity,
} from '../../scripts/local-qa/analytics-kpi-remote-prerequisites-shadow-preflight.mjs';

test('shadow é namespaced, descartável e rejeita o container canônico', () => {
  assert.equal(verifyShadowIdentity(`${SHADOW_MANIFEST.task}_shadow`), false);
  assert.equal(verifyShadowIdentity('confione_shadow_kpi_prerequisites_20260825_123'), true);
  assert.equal(verifyShadowIdentity(CANONICAL_CONTAINER), false);
  assert.equal(SHADOW_MANIFEST.disposable, true);
  assert.equal(SHADOW_MANIFEST.copiesCanonicalData, false);
});

test('ambas as migrations candidatas são versionadas e auditáveis', () => {
  const result = auditCandidates();
  assert.equal(result.staticOk, true);
  assert.equal(result.helperMarkers.transactionEnvelope, true);
  assert.match(HELPER_CANDIDATE, /20260825123000/);
  assert.match(CONTRACT_CANDIDATE, /20260824210000/);
  assert.equal(result.helperMarkers.invalidRatioNull, true);
  assert.equal(result.helperMarkers.operationEligibility, true);
  assert.equal(result.contractMarkers.operationWrappers, true);
});

test('preflight exige segurança dos helpers e ausência de grants para cliente', () => {
  const result = auditCandidates();
  assert.equal(result.helperMarkers.canReadPreflight, true);
  assert.equal(result.helperMarkers.noClientGrants, true);
  assert.equal(result.contractMarkers.helperCalls, true);
});

test('manifesto proíbe o canônico, reset local e aplicação remota', () => {
  assert.match(SHADOW_MANIFEST.prohibited.join('\n'), /supabase_db_genius-support-os/);
  assert.match(SHADOW_MANIFEST.prohibited.join('\n'), /supabase db reset --local/);
  assert.match(SHADOW_MANIFEST.prohibited.join('\n'), /supabase db push --local/);
});
