# Genius Support OS

Plataforma interna de suporte, base de conhecimento, tickets, comunicação
suporte-tecnologia e gestão de demandas técnicas do ecossistema Genius Return.

## Estado atual

O repositório está com a Fase 2 e a Fase 2.1 concluídas, a Fase 2.2
documental consolidada e o deploy remoto do banco já encerrado com bootstrap
do primeiro `platform_admin`. Não existe frontend implementado e a UI continua
bloqueada. A base atual já inclui:

- Supabase inicializado oficialmente;
- migrations reais de identidade, tenancy, hardening e ticketing core;
- RLS, auditoria append-only e views contratuais validadas com pgTAP;
- bootstrap seguro do primeiro `platform_admin`;
- control plane administrativo via RPCs seguras;
- contratos tipados de backend antes da UI;
- runbook seguro para deploy remoto controlado do banco;
- deploy remoto das 4 migrations concluído com migration list alinhada;
- bootstrap remoto validado em `user_global_roles` e `audit.audit_logs`.

## Princípios

- Backend é a fonte da verdade.
- Frontend apenas renderiza e orquestra comandos.
- Nada de dados mockados como regra de produto.
- Permissões sérias desde o primeiro ciclo.
- Multi-tenant obrigatório.
- Auditoria, action logs e histórico imutável obrigatórios.
- Dados sensíveis protegidos por padrão.
- Documentação viva no repositório.

## Estrutura canônica

- `apps/web/`: futura aplicação React, iniciada somente depois dos contratos.
- `packages/contracts/`: contratos tipados consumidos pela aplicação.
- `packages/tooling/`: configs e utilitários compartilhados do workspace.
- `supabase/`: migrations oficiais, testes, bootstrap e blueprint histórico do backend.
- `docs/`: arquitetura, modelo de dados, fases e decisões.
- `tests/`: estratégia de testes de banco, contratos e e2e.
- `raw_knowledge/`: base bruta preservada da KB atual para migração posterior.

## Documentação oficial atual

- [Estado do projeto](./docs/PROJECT_STATE.md)
- [Visão de produto](./docs/PRODUCT_VISION.md)
- [Regras de arquitetura](./docs/ARCHITECTURE_RULES.md)
- [Estrutura do repositório](./docs/REPOSITORY_STRUCTURE.md)
- [Estratégia de modelo de dados](./docs/DATA_MODEL_STRATEGY.md)
- [Plano de implementação](./docs/IMPLEMENTATION_PLAN.md)
- [Runbook de deploy remoto](./docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md)
- [Checklist de validação](./docs/VALIDATION_CHECKLIST.md)

## Conhecimento legado preservado

O único material legado mantido por design é a extração bruta em
`raw_knowledge/octadesk_export/latest/`. Esse conteúdo deve ser tratado como
fonte operacional privada para futura ingestão e curadoria.

## Estado real

- `apps/web/` continua apenas como placeholder.
- `supabase/blueprints/001_foundation.sql` é histórico e não executável.
- `supabase/migrations/` já contém as migrations oficiais das Fases 1 e 2.
- Auth, policies de RLS, triggers, RPCs administrativas, ticketing core e testes de banco já foram implementados localmente.
- O app não deve fazer DML direto em `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles`; essas mutações passam por RPCs auditadas.
- O app não deve ler tabelas base de ticketing diretamente; a leitura passa por `vw_tickets_list`, `vw_ticket_detail` e `vw_ticket_timeline`.
- `packages/contracts` materializa os contratos TypeScript oficiais de ticketing.
- O deploy remoto das 4 migrations foi concluído sem seed e sem `service_role`.
- O primeiro `platform_admin` remoto foi criado com sucesso e a segunda tentativa segue bloqueada por desenho.
- A fonte prioritária de verdade documental está em `docs/`, com foco nos arquivos em caixa alta.

## Validação atual

- `npm run contracts:typecheck`: OK
- `npm run supabase:verify`: OK
- pgTAP: `Files=6`, `Tests=93`, `Result: PASS`
- GitHub Actions `Supabase DB`: `success` no commit `85b3495`
- remoto: migrations alinhadas, `platform_admin` inicial criado, `user_global_roles` e `audit.audit_logs` validados

## Comandos úteis

```bash
npm run supabase:start
npm run supabase:verify
npm run web:dev
npm run supabase:bootstrap:first-admin -- --local --user-id <uuid>
```

Para subir o frontend local, criar antes `apps/web/.env.local` com:

```env
VITE_APP_ENV=local
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<anon-key-local-ou-do-ambiente>
APP_BASE_URL=http://127.0.0.1:4173
```

O comando `npm run web:dev` valida essas chaves antes de abrir o Vite.

Para deploy remoto do banco, usar exclusivamente o runbook em
`docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.

## Script preservado

```bash
npm run extract:octadesk
```
