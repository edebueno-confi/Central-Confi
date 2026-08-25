import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../../supabase/migrations/20260825123000_analytics_kpi_remote_prerequisites_v1.sql', import.meta.url),
  'utf8',
);

test('migration dos helpers KPI é versionada e fail-closed', () => {
  assert.match(migration, /to_regclass\('public\.analytics_source_config'\)/);
  assert.match(migration, /to_regprocedure\('app_private\.can_read_analytics\(\)'\)/);
  assert.match(migration, /having count\(\*\) = 7/);
  assert.match(migration, /p\.prosecdef/);
  assert.match(migration, /pg_get_userbyid\(p\.proowner\) = 'postgres'/);
  assert.match(migration, /search_path=""/);
  assert.match(migration, /has_function_privilege\('authenticated'/);
  assert.match(migration, /has_function_privilege\('service_role'/);
  assert.match(migration, /has_function_privilege\('anon'/);
  assert.doesNotMatch(migration, /\b(insert|update|delete|truncate|drop)\b/i);
});

test('helpers KPI têm contratos, search_path vazio e isolamento de grants', () => {
  for (const signature of [
    'kpi_entry(numeric, text, text, text)',
    'kpi_ratio(numeric, numeric)',
    'set_analytics_operation_scope(text)',
    'analytics_pipeline_operation_eligible(text, text, text, text)',
  ]) {
    assert.match(migration, new RegExp(`revoke all on function app_private\\.${signature.replaceAll(/[() ,]/g, (char) => `\\${char}`)}`));
  }

  assert.equal((migration.match(/set search_path = ''/g) ?? []).length, 4);
  assert.equal((migration.match(/security definer/g) ?? []).length, 2);
  assert.doesNotMatch(migration, /grant execute on function app_private\./i);
  assert.doesNotMatch(migration, /notify pgrst/i);
});

test('elegibilidade preserva o predicado server-side de operação', () => {
  assert.match(migration, /analytics_pipeline_operation_eligible/);
  assert.match(migration, /group_company_source = 'confirmed'/);
  assert.match(migration, /a\.area_key <> 'a_classificar'/);
  assert.match(migration, /a\.group_company <> 'a_definir'/);
  assert.match(migration, /p_group_company/);
  assert.match(migration, /p_area_key/);
});

test('kpi_ratio recusa universo inválido e preserva a semântica vigente', () => {
  assert.match(migration, /p_denominator <= 0/);
  assert.match(migration, /p_numerator is null/);
  assert.match(migration, /p_numerator < 0/);
  assert.match(migration, /p_numerator > p_denominator/);
  assert.match(migration, /round\(\(p_numerator \/ p_denominator\) \* 100, 2\)/);
  assert.doesNotMatch(migration, /coalesce\(p_numerator, 0\)/);
});

test('preflight de can_read_analytics exige owner, segurança e grants esperados', () => {
  assert.match(migration, /pg_get_userbyid\(p\.proowner\) = 'postgres'/);
  assert.match(migration, /p\.prosecdef/);
  assert.match(migration, /array_position\(coalesce\(p\.proconfig, array\[\]::text\[\]\), 'search_path=""'\)/);
  assert.match(migration, /has_function_privilege\('authenticated', p\.oid, 'EXECUTE'\)/);
  assert.match(migration, /has_function_privilege\('service_role', p\.oid, 'EXECUTE'\)/);
  assert.match(migration, /not has_function_privilege\('anon', p\.oid, 'EXECUTE'\)/);
  assert.match(migration, /Dependência insegura: app_private\.can_read_analytics\(\)/);
});
