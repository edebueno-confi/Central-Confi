# Supabase

O backend do Genius Support OS será materializado aqui.

## Estado atual

O projeto Supabase local foi inicializado e o backend executável atual usa:
- `config.toml` versionado;
- `migrations/` oficiais;
- `tests/` de banco para RLS e auditoria;
- `seeds/` separado e desabilitado por padrao.
- `bootstrap/` para o primeiro `platform_admin`;
- CI obrigatoria para reset, pgTAP e lint.
- control plane administrativo por RPCs seguras.
- ticketing core por views contratuais e RPCs seguras.
- contratos tipados em `packages/contracts`.
- runbook de deploy remoto controlado em `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.

Os documentos canônicos para essa etapa são:

- `docs/ARCHITECTURE_RULES.md`
- `docs/DATA_MODEL_STRATEGY.md`
- `docs/AUTH_CONTEXT_STRATEGY.md`
- `docs/AUDIT_LOGGING_STRATEGY.md`
- `docs/SECURITY_RLS_TEST_PLAN.md`
- `docs/VIEW_RPC_CONTRACTS.md`

## Regra de evolução

1. Tratar `migrations/` como fonte executável de verdade.
2. Manter `blueprints/` apenas como histórico e rascunho não executável.
3. Cobrir RLS, triggers, functions e RPCs com testes de banco.
4. Materializar contratos tipados so depois da migration e dos testes locais.

## Hardening Fase 1.2

- Bootstrap seguro do primeiro `platform_admin`:
  - `supabase/bootstrap/bootstrap-first-platform-admin.mjs`
  - `supabase/bootstrap/README.md`
- RPCs administrativas atuais:
  - `rpc_admin_create_tenant`
  - `rpc_admin_update_tenant_status`
  - `rpc_admin_add_tenant_member`
  - `rpc_admin_update_tenant_member_role`
  - `rpc_admin_update_tenant_member_status`
  - `rpc_admin_create_tenant_contact`
  - `rpc_admin_update_tenant_contact`
- Auditoria de functions:
  - `SECURITY DEFINER` com `search_path` fixo
  - `EXECUTE` revogado para helpers privados e triggers
  - DML direto revogado de `authenticated` nas tabelas administrativas
- Verificacao local completa:
  - `npm run supabase:start`
  - `npm run supabase:verify`
- Pipeline CI:
  - `.github/workflows/supabase-db.yml`

## Ticketing Core Fase 2

- Migration oficial:
  - `supabase/migrations/20260429225342_phase2_ticketing_core_backend_contracts.sql`
- Tabelas:
  - `tickets`
  - `ticket_messages`
  - `ticket_events`
  - `ticket_assignments`
  - `ticket_attachments`
- Views contratuais:
  - `vw_tickets_list`
  - `vw_ticket_detail`
  - `vw_ticket_timeline`
- RPCs de ticketing:
  - `rpc_create_ticket`
  - `rpc_update_ticket_status`
  - `rpc_assign_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_close_ticket`
  - `rpc_reopen_ticket`
- Garantias atuais:
  - `authenticated` nao possui `SELECT` direto nas tabelas base de ticketing;
  - o app le tickets apenas pelas views contratuais;
  - o app escreve tickets apenas pelas RPCs;
  - mensagens internas e publicas sao separadas por `visibility`;
  - toda mutacao gera `ticket_events` e `audit.audit_logs`.

## Fase 2.1: Typed Contracts + View Security Audit

- `packages/contracts` materializa enums, DTOs de views e payloads/responses de RPCs.
- `contracts:typecheck` faz parte da validacao obrigatoria.
- `supabase/tests/006_phase2_1_view_security_audit.sql` protege grants, filtros e visibilidade das views oficiais.

## Fase 2.2: Documentation Sync + Remote Deploy Runbook

- documentacao sincronizada com o estado real da Fase 2 e 2.1;
- runbook remoto criado em `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`;
- nenhum deploy remoto executado nesta fase.

## Verificacao local atual

- `npm run contracts:typecheck`
- `npx supabase db reset --local --yes`
- `npx supabase test db --local`
- `npx supabase db lint --local`
- Resultado atual:
  - `contracts:typecheck`: OK
  - `Files=6, Tests=93, Result: PASS`
  - `No schema errors found`

## CI remota atual

- Workflow: `Supabase DB`
- Branch: `codex/phase1-2-admin-control-plane`
- Commit validado: `85b3495`
- Run: `25139500960`
- Conclusao: `success`

## Regras de operacao

- Nunca usar seed demo para criar `platform_admin`.
- Nunca abrir policy temporaria para promover admin.
- Alteracoes sensiveis de `profiles` devem passar por Auth/backend controlado.
- Toda mudanca de tenancy e papel precisa continuar compatível com os testes pgTAP.
- Toda mutacao administrativa do app deve usar RPC; nao usar DML direto nas tabelas administrativas.
- O app nao deve consultar tabelas base de ticketing; usar apenas as views contratuais.
- Deploy remoto do banco deve seguir `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.

## Estrutura esperada

- `blueprints/`: historico e rascunhos nao executaveis de modelagem.
- `migrations/`: migrations oficiais geradas pelo fluxo do Supabase CLI.
- `seeds/`: apenas bootstrap controlado e nunca mocks de produto.
- `bootstrap/`: fluxo controlado para a primeira elevacao de `platform_admin`.
- `tests/`: pgTAP para tenancy, hardening administrativo, ACL de functions e ticketing core.

## Comandos operacionais

```bash
npm run supabase:start
npm run supabase:verify
npm run supabase:bootstrap:first-admin -- --local --user-id <uuid>
```
