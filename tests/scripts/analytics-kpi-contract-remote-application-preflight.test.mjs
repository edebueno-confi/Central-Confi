import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  LEGACY_FUNCTIONS,
  TARGET_FUNCTIONS,
  buildImmediateContractPreflightQuery,
  evaluateImmediateContractPreflight,
} from '../../scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs';

const migration = await readFile(
  new URL('../../supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql', import.meta.url),
  'utf8',
);
const report = await readFile(
  new URL('../../docs/reports/ANALYTICS_KPI_CONTRACT_REMOTE_APPLICATION_R2_2026-08-25.md', import.meta.url),
  'utf8',
);

test('migration remota tem envelope transacional explícito', () => {
  assert.match(migration, /\bbegin;[\s\S]*create or replace function/);
  assert.match(migration, /notify pgrst, 'reload schema';[\s\S]*\bcommit;/);
});

test('preflight imediato cobre legados, alvos, segurança, ACL e fingerprints', () => {
  const query = buildImmediateContractPreflightQuery();
  for (const signature of [...LEGACY_FUNCTIONS, ...TARGET_FUNCTIONS]) {
    assert.match(query, new RegExp(signature.replace(/[()[\]]/g, '\\$&')));
  }
  assert.match(query, /to_regprocedure\(e\.signature\)/);
  assert.match(query, /pg_get_functiondef\(p\.oid\)/);
  assert.match(query, /has_function_privilege\('anon'/);
  assert.match(query, /has_function_privilege\('authenticated'/);
  assert.match(query, /has_function_privilege\('service_role'/);
  assert.match(query, /search_path <> 'search_path=""'/);
  assert.match(query, /definition_fingerprint is null/);
  assert.match(query, /legacy_security_ok/);
  assert.match(query, /targets_absent/);
  // O contrato remoto é validado contra o relatório versionado da própria
  // task. O TASK corrente é mutável e não pode ser dependência deste gate.
  assert.match(report, /to_regprocedure[\s\S]*wrappers legados/);
});

test('preflight falha fechado quando legado falta ou alvo já existe', () => {
  const validFunctions = LEGACY_FUNCTIONS.map((signature) => ({
    signature,
    oid: 1,
    owner: 'postgres',
    security_definer: true,
    search_path: 'search_path=""',
    definition_fingerprint: 'fingerprint',
    anon_execute: false,
    authenticated_execute: true,
    service_role_execute: true,
  })).concat(TARGET_FUNCTIONS.map((signature) => ({ signature, oid: null })));
  assert.deepEqual(evaluateImmediateContractPreflight({
    functions: validFunctions,
  }), {
    state: 'GO', failClosed: false, legacyPresent: true, targetsAbsent: true, securityOk: true,
  });
  const blocked = evaluateImmediateContractPreflight({
    functions: validFunctions.map((row) => row.signature === LEGACY_FUNCTIONS[0]
      ? { ...row, definition_fingerprint: null }
      : row.signature === TARGET_FUNCTIONS[0]
        ? { ...row, oid: 99 }
        : row),
  });
  assert.equal(blocked.state, 'NO_GO');
  assert.equal(blocked.failClosed, true);
  assert.equal(blocked.securityOk, false);
  assert.equal(blocked.targetsAbsent, false);
});
