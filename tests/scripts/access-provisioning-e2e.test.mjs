import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync(
  'supabase/migrations/20260822200000_access_02_provisioning_e2e_v1.sql',
  'utf8',
);
const page = fs.readFileSync(
  'apps/web/src/features/access/InternalControlPlanePage.tsx',
  'utf8',
);

test('provisionamento sem perfil materializa telas padrão da área', () => {
  assert.match(migration, /internal_organizational_screen_defaults/);
  assert.match(migration, /default_internal_screen_keys/);
  assert.match(migration, /internal_area_membership_screen_grants/);
  assert.match(migration, /no default screens configured/);
});

test('perfil vazio não é tratado como acesso funcional', () => {
  assert.match(migration, /access profile has no screen grants/);
  assert.match(page, /Acesso ativo, mas incompleto/);
  assert.match(page, /Aplicar telas padrão/);
});

test('painel diferencia capability de tela resolvida', () => {
  assert.match(page, /Telas resolvidas/);
  assert.match(page, /resolvedScreensForUser/);
  assert.match(page, /Telas padrão da área \(sem perfil\)/);
});
