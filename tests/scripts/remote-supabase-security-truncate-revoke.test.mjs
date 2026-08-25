import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20260825093000_remote_authenticated_truncate_revoke_v1.sql',
  'utf8',
);

test('candidate revoga somente TRUNCATE de authenticated nos dois objetos auditados', () => {
  assert.match(
    migration,
    /revoke\s+truncate\s+on\s+table\s+public\.profiles\s*,\s*public\.tenants\s+from\s+authenticated\s*;/i,
  );
  assert.doesNotMatch(migration, /\bgrant\b/i);
  assert.doesNotMatch(migration, /\b(drop|alter|insert|update|delete|truncate\s+table)\b/i);
  assert.doesNotMatch(migration, /\b(public\.(?!profiles\b|tenants\b)[a-z_]+)\b/i);
});
