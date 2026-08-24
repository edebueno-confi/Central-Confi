import { readLocalSupabaseStatus } from './assert-local-supabase.mjs';
import { runSql, runSqlBatch } from './sql.mjs';
import { buildFixture, buildReplaySql, buildVerificationSql, FIXTURE_NAMESPACE, REQUIRED_LOCAL_USERS } from './local-sync-replay-fixture.mjs';

function fail(message) {
  throw new Error(message);
}

function readUsers() {
  const emails = REQUIRED_LOCAL_USERS.map((user) => `'${user.email.replaceAll("'", "''")}'`).join(',');
  const result = runSql(`select p.id::text as id,p.email::text as email,p.is_active from public.profiles p join auth.users u on u.id=p.id where lower(p.email::text) in (${emails}) and p.is_active and u.deleted_at is null;`);
  const byEmail = new Map(result.rows.map((row) => [String(row.email).toLowerCase(), row]));
  const users = Object.fromEntries(REQUIRED_LOCAL_USERS.map((user) => [user.key, byEmail.get(user.email)]));
  if (Object.values(users).some((user) => !user?.id)) fail('LOCAL_SYNC_REPLAY_USER_CONTRACT_MISSING: usuários QA locais existentes não encontrados. Nenhuma conta foi provisionada.');
  return users;
}

function assertLocal(status) {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(status.API_URL ?? '') || !/@(127\.0\.0\.1|localhost):54322\//.test(status.DB_URL ?? '')) {
    fail('LOCAL_SYNC_REPLAY_BLOCKED: o alvo não é o Supabase local esperado.');
  }
}

const status = readLocalSupabaseStatus(process.env);
assertLocal(status);
const users = readUsers();
const fixture = buildFixture(users);
const sourceConfig = runSql(`select count(*)::int as count from public.analytics_source_config where hubspot_pipeline_id in ('qa-local-commercial','qa-local-cs') and is_active = false;`).rows[0];
if (Number(sourceConfig?.count ?? 0) !== 2) fail('LOCAL_SYNC_REPLAY_SOURCE_CONTRACT_MISSING: pipelines locais namespaced não estão inativos.');

runSqlBatch(buildReplaySql(fixture));
const verification = runSql(buildVerificationSql(fixture, users.admin.id)).rows[0] ?? {};
const expected = {
  namespace: FIXTURE_NAMESPACE,
  users: Object.fromEntries(Object.entries(users).map(([key, user]) => [key, { id: user.id, active: user.is_active }])),
  tenantRows: fixture.tenants.length,
  membershipRows: fixture.memberships.length,
  hubspotRows: fixture.hubspot.companies.length + fixture.hubspot.deals.length + fixture.hubspot.tickets.length,
  omieRows: fixture.omie.length,
  operationFilters: {
    commercialEligible: verification.commercial_eligible === true || verification.commercial_eligible === 'true',
    supportEligible: verification.support_eligible === true || verification.support_eligible === 'true',
    commercialFixtureVisible: verification.commercial_fixture_visible === true || verification.commercial_fixture_visible === 'true',
    supportFixtureVisible: verification.support_fixture_visible === true || verification.support_fixture_visible === 'true',
  },
};
if (expected.operationFilters.commercialEligible || expected.operationFilters.supportEligible || expected.operationFilters.commercialFixtureVisible || expected.operationFilters.supportFixtureVisible) {
  fail('LOCAL_SYNC_REPLAY_FILTER_CONTRACT_FAILED: payload namespaced foi elegível ou visível em operação publicada.');
}

console.log(JSON.stringify({ environment: 'local', replay: 'idempotent-upsert', ...expected, rows: { deal: verification.deal_rows, ticket: verification.ticket_rows }, external_calls: false, secrets_read: false }, null, 2));
