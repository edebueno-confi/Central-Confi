import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoDestructiveMigration,
  buildParityResult,
  historyOnlyMigrations,
  missingMigrations,
  parseMigrationVersion,
  verifyMigrationOrigin,
} from '../../scripts/local-qa/assert-local-schema-parity.mjs';

test('extrai versões de migrations sem carregar conteúdo sensível', () => {
  assert.equal(parseMigrationVersion('20260823100000_analytics_timeseries.sql'), '20260823100000');
  assert.equal(parseMigrationVersion('README.md'), null);
});

test('detecta migration ausente no histórico', () => {
  assert.deepEqual(
    missingMigrations(['20260822190000', '20260822200000'], ['20260822190000']),
    ['20260822200000'],
  );
});

test('detecta migration registrada sem arquivo versionado', () => {
  assert.deepEqual(
    historyOnlyMigrations(['20260822190000'], ['20260822190000', '20260822130000']),
    ['20260822130000'],
  );
  const result = buildParityResult({
    filesystemVersions: ['20260822190000'],
    appliedVersions: ['20260822190000', '20260822130000'],
    expectedObjects: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings[0].code, 'MIGRATION_HISTORY_WITHOUT_FILE');
});

test('detecta assinatura divergente e objeto sem origem', () => {
  const result = buildParityResult({
    filesystemVersions: ['20260823100000'],
    appliedVersions: ['20260823100000'],
    expectedObjects: [{ key: 'rpc_x', signature: 'a text', migration: '20260823100000' }],
    observedObjects: [{ key: 'rpc_x', signature: 'b text', versionPresent: true, originVerified: false }],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.findings.map((finding) => finding.code), [
    'RPC_SIGNATURE_DIVERGENT',
    'EXECUTABLE_OBJECT_WITHOUT_ORIGIN',
  ]);
});

test('aceita paridade completa', () => {
  const result = buildParityResult({
    filesystemVersions: ['20260823100000'],
    appliedVersions: ['20260823100000'],
    expectedObjects: [{ key: 'rpc_x', signature: 'a text', migration: '20260823100000' }],
    observedObjects: [{ key: 'rpc_x', signature: 'a text', versionPresent: true, originVerified: true }],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('bloqueia SQL destrutivo antes de qualquer aplicação', () => {
  assert.throws(
    () => assertNoDestructiveMigration('drop table public.example', 'bad.sql'),
    /LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL/,
  );
});

test('não confunde DELETE encapsulado em função com operação do apply', () => {
  assert.doesNotThrow(() => assertNoDestructiveMigration(`
    create or replace function public.example()
    returns void language plpgsql as $$
    begin
      delete from public.staging;
    end;
    $$;
  `, 'function-body.sql'));
});

test('bloqueia DELETE e SQL dinâmico dentro de bloco DO executado no apply', () => {
  assert.throws(
    () => assertNoDestructiveMigration(`do $$ begin delete from public.staging; end; $$;`, 'do-delete.sql'),
    /LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL/,
  );
  assert.throws(
    () => assertNoDestructiveMigration(`do $$ begin execute format('drop table %I', 'x'); end; $$;`, 'do-execute.sql'),
    /LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL/,
  );
  assert.throws(
    () => assertNoDestructiveMigration(`do $$ begin execute 'drop ' || 'table public.staging'; end; $$;`, 'do-execute-string.sql'),
    /LOCAL_SCHEMA_PARITY_BLOCKED_DESTRUCTIVE_SQL/,
  );
});

test('não comprova origem apenas por presença da versão no histórico', () => {
  const expected = { key: 'rpc_x', signature: 'p_id uuid', migration: '20260823100000' };
  assert.equal(
    verifyMigrationOrigin({
      migrationText: 'create or replace function public.rpc_x(p_id uuid) returns void language sql as $$ select 1 $$;',
      expected,
    }),
    true,
  );
  const result = buildParityResult({
    filesystemVersions: ['20260823100000'],
    appliedVersions: ['20260823100000'],
    expectedObjects: [expected],
    observedObjects: [{ key: 'rpc_x', signature: 'p_id uuid', versionPresent: true, originVerified: false }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.objectEvidence[0].versionPresent, true);
  assert.equal(result.objectEvidence[0].originVerified, false);
  assert.equal(result.objectEvidence[0].classification, 'EXECUTABLE_OBJECT_WITHOUT_ORIGIN');
  assert.equal(result.findings[0].code, 'EXECUTABLE_OBJECT_WITHOUT_ORIGIN');
});

test('separa exceção histórica aplicada de preflight comprovado sem liberar o gate', () => {
  const result = buildParityResult({
    filesystemVersions: ['20260822220000', '20260823100000'],
    appliedVersions: ['20260822220000', '20260823100000'],
    expectedObjects: [],
    migrationSafety: ['20260822220000', '20260823100000'].map((version) => ({
      version,
      safe: false,
      applied: true,
      preflightProven: false,
      historicalException: true,
      classification: 'HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF',
    })),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.findings.map((finding) => finding.classification), [
    'HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF',
    'HISTORICAL_EXCEPTION_APPLIED_WITHOUT_PREFLIGHT_PROOF',
  ]);
  assert.deepEqual(result.findings.map((finding) => finding.code), [
    'MIGRATION_PREFLIGHT_BLOCKED',
    'MIGRATION_PREFLIGHT_BLOCKED',
  ]);
  assert.match(result.findings[0].detail, /20260822220000/);
  assert.match(result.findings[1].detail, /20260823100000/);
});

test('não classifica preflight parser aprovado como exceção histórica', () => {
  const result = buildParityResult({
    filesystemVersions: ['20260822190000'],
    appliedVersions: ['20260822190000'],
    expectedObjects: [],
    migrationSafety: [{
      version: '20260822190000',
      safe: true,
      applied: true,
      preflightProven: true,
      historicalException: false,
      classification: 'PREFLIGHT_PARSER_PASS',
    }],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
