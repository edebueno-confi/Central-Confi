import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildFixture, buildReplaySql, buildVerificationSql, FIXTURE_NAMESPACE, COMMERCIAL_PIPELINE_ID, SUPPORT_PIPELINE_ID } from '../../scripts/local-qa/local-sync-replay-fixture.mjs';
import { assertCanonicalLocalQaDbContainer, LOCAL_QA_DB_CONTAINER } from '../../scripts/local-qa/sql.mjs';

const source = await readFile(new URL('../../scripts/local-qa/local-sync-replay.mjs', import.meta.url), 'utf8');
const fixture = buildFixture({
  admin: { id: '11111111-1111-4111-8111-111111111111' },
  dashboardViewer: { id: '22222222-2222-4222-8222-222222222222' },
  client: { id: '33333333-3333-4333-8333-333333333333' },
});

test('fixture é determinística e namespaced', () => {
  const again = buildFixture({
    admin: { id: fixture.users.admin },
    dashboardViewer: { id: fixture.users.viewer },
    client: { id: fixture.users.client },
  });
  assert.deepEqual(again, fixture);
  assert.equal(fixture.namespace, FIXTURE_NAMESPACE);
  assert.ok(fixture.tenants.every((tenant) => tenant.slug.startsWith(FIXTURE_NAMESPACE)));
  assert.ok(fixture.hubspot.companies.every((row) => row.companyId.startsWith(FIXTURE_NAMESPACE)));
  assert.ok(fixture.omie.every((row) => row.sourceKey.startsWith(FIXTURE_NAMESPACE)));
});

test('replay usa upsert por identidades reais e não contém operação destrutiva', () => {
  const sql = buildReplaySql(fixture).toLowerCase();
  assert.match(sql, /on conflict \(id\) do update/);
  assert.match(sql, /on conflict \(tenant_id,user_id\) do update/);
  assert.match(sql, /on conflict \(company_id\) do update/);
  assert.match(sql, /on conflict \(deal_id\) do update/);
  assert.match(sql, /on conflict \(ticket_id\) do update/);
  assert.match(sql, /on conflict \(source_key,source_record_id\) do update/);
  assert.doesNotMatch(sql, /\b(delete|truncate|drop)\b/);
});

test('payloads usam os pipelines locais inativos e não ativam fonte externa', () => {
  const sql = buildReplaySql(fixture);
  assert.match(sql, new RegExp(COMMERCIAL_PIPELINE_ID));
  assert.match(sql, new RegExp(SUPPORT_PIPELINE_ID));
  assert.match(sql, /fixture_namespace/);
  assert.doesNotMatch(source, /fetch\s*\(/i);
  assert.doesNotMatch(source, /SERVICE_ROLE_KEY|LOCAL_QA_.*PASSWORD|app\.hubspot\.com|app\.omie\.com\.br/i);
});

test('runSqlBatch rejeita override de container divergente', () => {
  assert.equal(assertCanonicalLocalQaDbContainer(undefined), LOCAL_QA_DB_CONTAINER);
  assert.equal(assertCanonicalLocalQaDbContainer(LOCAL_QA_DB_CONTAINER), LOCAL_QA_DB_CONTAINER);
  assert.throws(
    () => assertCanonicalLocalQaDbContainer('outro-container-local'),
    /LOCAL_QA_DB_CONTAINER_INVALID.*supabase_db_genius-support-os/,
  );
});

test('verificação executa os wrappers server-side e exige invisibilidade do fixture', () => {
  const verificationSql = buildVerificationSql(fixture, fixture.users.admin);
  assert.match(verificationSql, /analytics_pipeline_operation_eligible/);
  assert.match(verificationSql, /rpc_analytics_commercial_snapshot_by_operation/);
  assert.match(verificationSql, /rpc_analytics_cs_snapshot_by_operation/);
  assert.match(verificationSql, /commercial_fixture_visible/);
  assert.match(verificationSql, /support_fixture_visible/);
});
