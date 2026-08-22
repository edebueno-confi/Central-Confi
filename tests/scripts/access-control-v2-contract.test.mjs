import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../../supabase/migrations/20260811130000_access_control_v2_lifecycle_effective_permissions.sql', import.meta.url), 'utf8');
const page = await readFile(new URL('../../apps/web/src/features/access/InternalControlPlanePage.tsx', import.meta.url), 'utf8');
const contracts = await readFile(new URL('../../apps/web/src/contracts/admin-contracts.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../../apps/web/src/features/settings/settings-ui.css', import.meta.url), 'utf8');

test('ACCESS CONTROL V2 preserva histórico e impede exclusão com dependências', () => {
  assert.match(migration, /rpc_admin_delete_internal_area/);
  assert.match(migration, /organizational area has references; deactivate it instead/);
  assert.match(migration, /internal_area_memberships/);
  assert.match(migration, /internal_functions/);
  assert.match(migration, /internal_invites/);
  assert.match(migration, /internal_action_target_areas/);
  assert.match(migration, /internal_organizational_areas_audit_row_change/);
  assert.match(migration, /p_confirmed boolean/);
});

test('detalhe de acesso expõe evidência efetiva sem regra de permissão no frontend', () => {
  assert.match(migration, /effective_permissions/);
  assert.match(migration, /has_conflict/);
  assert.match(migration, /sources/);
  assert.match(migration, /scope_areas/);
  assert.match(contracts, /AdminInternalEffectivePermissionRow/);
  assert.match(page, /Permissões efetivas/);
  assert.match(page, /Fontes:/);
  assert.doesNotMatch(page, /service_role|SERVICE_ROLE/);
});

test('interface confirma mutações sensíveis e mantém rolagem no corpo da tela', () => {
  assert.match(page, /window\.confirm/);
  assert.match(page, /deleteAdminInternalAccessArea/);
  assert.doesNotMatch(page, /label: 'Convites'/);
  assert.doesNotMatch(page, /InviteHistoryPanel/);
  assert.match(page, /Ativas por padrão/);
  assert.match(page, /onUpdateArea/);
  assert.match(page, /onUpdateFunction/);
  assert.match(page, /onUpdateProfile/);
  assert.match(page, /Vincular usu/);
  assert.match(page, /AccessEditorModal/);
  assert.match(page, /gso-access-list/);
  assert.match(page, /gso-ui-groups--compact/);
  assert.match(page, /data-access-editor-modal/);
  assert.match(page, /event\.key === 'Tab'/);
  assert.match(page, /lastActiveElementRef/);
  assert.doesNotMatch(page, /Duplicar perfil/);
  assert.match(css, /\.gso-po-v2-access \.gso-ui-shell-body/);
  assert.match(css, /\.gso-po-v2-access \.gso-ui-split--wide-detail/);
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /gso-access-modal/);
  assert.match(css, /gso-access-grants-grid/);
  assert.match(css, /gso-access-modal-form \.gso-ui-actions[^\n]*position: sticky/);
});
