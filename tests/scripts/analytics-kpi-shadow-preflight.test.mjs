import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  auditCandidate,
  auditConsumers,
  KPI_SHADOW_MANIFEST,
  SHADOW_INIT_SQL,
  verifyShadowIdentity,
} from '../../scripts/local-qa/analytics-kpi-shadow-preflight.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const candidate = readFileSync(join(ROOT, 'supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql'), 'utf8');

test('manifesto rejeita o container canônico e exige shadow descartável namespaced', () => {
  assert.equal(verifyShadowIdentity('supabase_db_genius-support-os'), false);
  assert.equal(verifyShadowIdentity('confione_shadow_kpi_contract_20260824_123'), true);
  assert.equal(verifyShadowIdentity('confione_shadow_kpi_contract_20260824_genius-support-os'), false);
  assert.equal(KPI_SHADOW_MANIFEST.shadow.disposable, true);
  assert.equal(KPI_SHADOW_MANIFEST.shadow.copiesCanonicalData, false);
});

test('auditoria estática exige wrappers de seis argumentos e filtros server-side', () => {
  const result = auditCandidate(candidate);
  assert.equal(result.staticOk, true);
  assert.equal(Object.values(result.signatures).every(Boolean), true);
  assert.equal(result.markers.commercialOperationPredicate, true);
  assert.equal(result.markers.supportOperationPredicate, true);
  assert.equal(result.markers.groupContext, true);
  assert.equal(result.markers.stageFilter, true);
  assert.equal(result.markers.exclusionFilter, true);
});

test('auditoria mantém Customer Success e Financeiro fora da falsa paridade', () => {
  const result = auditCandidate(candidate);
  assert.equal(result.customerSuccess.state, 'NOT_IN_CANDIDATE');
  assert.equal(result.finance.state, 'NOT_IN_CANDIDATE');
  assert.match(result.finance.reason, /não cria dimensão operacional/);
});

test('consumidores compartilham os parâmetros suportados e mantêm limites honestos', () => {
  const result = auditConsumers(ROOT);
  assert.equal(result.commercialAndSupportApiSendOperation, true);
  assert.equal(result.commercialAndSupportApiSendStage, true);
  assert.equal(result.commercialAndSupportApiSendExclusions, true);
  assert.equal(result.overviewCallsShareOperationAndExclusions, true);
  assert.equal(result.financeOperationUnavailable, true);
  assert.equal(result.customerSuccessContractRemainsDistinct, true);
});

test('bootstrap do shadow não contém o container canônico nem credenciais reais', () => {
  assert.doesNotMatch(SHADOW_INIT_SQL, /supabase_db_genius-support-os/);
  assert.doesNotMatch(SHADOW_INIT_SQL, /postgresql:\/\//i);
  assert.match(KPI_SHADOW_MANIFEST.prohibited.join('\n'), /docker exec supabase_db_genius-support-os/);
});
