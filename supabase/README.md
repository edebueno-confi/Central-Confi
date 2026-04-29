# Supabase

O backend do Genius Support OS será materializado aqui.

## Estado atual

O projeto Supabase local foi inicializado e a Fase 1 passou a usar:
- `config.toml` versionado;
- `migrations/` oficiais;
- `tests/` de banco para RLS e auditoria;
- `seeds/` separado e desabilitado por padrao.
- `bootstrap/` para o primeiro `platform_admin`;
- CI obrigatoria para reset, pgTAP e lint.
- control plane administrativo por RPCs seguras.

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
4. So depois abrir contratos de leitura/escrita da Fase 2.

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

## Regras de operacao

- Nunca usar seed demo para criar `platform_admin`.
- Nunca abrir policy temporaria para promover admin.
- Alteracoes sensiveis de `profiles` devem passar por Auth/backend controlado.
- Toda mudanca de tenancy e papel precisa continuar compatível com os testes pgTAP.
- Toda mutacao administrativa do app deve usar RPC; nao usar DML direto nas tabelas administrativas.

## Estrutura esperada

- `blueprints/`: historico e rascunhos nao executaveis de modelagem.
- `migrations/`: migrations oficiais geradas pelo fluxo do Supabase CLI.
- `seeds/`: apenas bootstrap controlado e nunca mocks de produto.
- `bootstrap/`: fluxo controlado para a primeira elevacao de `platform_admin`.

## Comandos operacionais

```bash
npm run supabase:start
npm run supabase:verify
npm run supabase:bootstrap:first-admin -- --local --user-id <uuid>
```
