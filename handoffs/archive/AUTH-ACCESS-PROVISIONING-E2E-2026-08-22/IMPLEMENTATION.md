# IMPLEMENTATION

- Task: AUTH-ACCESS-PROVISIONING-E2E-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 0168a647bd3251364ad643f26f48b2119c5370f3
- Implementation SHA: UNCOMMITTED_WORKTREE

## Evidência inicial

- Reprodução local read-only: identidade interna ativa com 26 capabilities
  efetivas, sem membership de área e sem grants de tela.
- Código reconciliado: `rpc_admin_update_internal_access_assignment` cria o
  contexto/membership, mas a variante sem perfil não cria grants de tela;
  `rpc_internal_actor_workspace_context` só publica telas resolvidas por
  `internal_role_screen_grants`, `internal_area_membership_screen_grants` ou
  `internal_access_profile_screen_grants`.
- Impacto observado: usuário pode aparecer ativo no painel e ainda receber
  `Meu espaço` sem nenhuma área operacional.

## Plano de execução

1. Tornar a atribuição sem perfil um comando transacional que aplica as telas
   padrão da área e dependências existentes.
2. Expor no read model a diferença entre capabilities efetivas e telas
   resolvidas, para a UI não declarar acesso completo incorretamente.
3. Simplificar o formulário e oferecer reparo explícito para usuário sem tela.
4. Adicionar regressões para provisionamento, revogação, sessão e fallback.

## Entrega para revisão

- Implementação allowlisted: `supabase/migrations/20260822200000_access_02_provisioning_e2e_v1.sql`, `supabase/tests/127_access_provisioning_e2e.sql`, `tests/scripts/access-provisioning-e2e.test.mjs` e ajustes diretamente relacionados em `apps/web/src/features/access/InternalControlPlanePage.tsx`.
- As alterações de apresentação UTF-8 em `apps/web/src/lib/operational-copy.ts` e `apps/web/src/features/support/SupportWorkspacePage.tsx` já estavam no worktree como frente separada e não fazem parte desta allowlist; foram preservadas sem serem misturadas ao lote de autorização.
- A variante sem perfil agora materializa telas padrão da área e dependências; perfil nomeado sem grants de tela é rejeitado; o painel diferencia capabilities de telas resolvidas e oferece reparo explícito.
- Teste focused allowlisted: `node --test tests/scripts/access-provisioning-e2e.test.mjs` PASS 3/3.
- Suíte focused: `npm run test:focused` PASS 288/288.
- Banco local: aplicação transacional da migration e exercício de provisionamento/reversão PASS; `npm run supabase:test:file -- supabase/tests/127_access_provisioning_e2e.sql` PASS 12/12.
- Frontend: `npm run web:typecheck` PASS; `npm run web:build` PASS, 945 módulos transformados.
- Governança: `npm run docs:validate` PASS, 0 bloqueios; `npm run review:gates` PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos; `git diff --check` PASS.

## Limitações e riscos

- `npm exec -- supabase migration up --local` continua bloqueado por divergência preexistente do histórico local/remoto (`LegacyMigrationMissingLocalError`, migration remota ausente no checkout local). A migration nova foi validada em dry-run transacional e aplicada manualmente somente no banco local para a validação comportamental; não houve reparo destrutivo de histórico.
- Não foram executadas migration remota, deploy, chamadas externas, leitura de secrets ou alterações em produção.
- A validação autenticada em navegador da UI permanece pendente do reviewer; typecheck/build e testes estruturais não substituem essa validação.
