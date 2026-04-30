# Genius Support OS

Plataforma interna de suporte, base de conhecimento, tickets, comunicação
suporte-tecnologia e gestão de demandas técnicas do ecossistema Genius Return.

## Estado atual

O repositório está com a Fase 2 e a Fase 2.1 concluídas localmente. A Fase 2.2
sincronizou a documentação e preparou o runbook de deploy remoto. Não existe
frontend implementado e a UI continua bloqueada. A base atual já inclui:

- Supabase inicializado oficialmente;
- migrations reais de identidade, tenancy, hardening e ticketing core;
- RLS, auditoria append-only e views contratuais validadas com pgTAP;
- bootstrap seguro do primeiro `platform_admin`;
- control plane administrativo via RPCs seguras;
- contratos tipados de backend antes da UI;
- runbook seguro para deploy remoto controlado do banco.

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
- Existe runbook de deploy remoto em `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`, mas nenhum deploy remoto foi executado nesta fase.
- A fonte prioritária de verdade documental está em `docs/`, com foco nos arquivos em caixa alta.

## Validação atual

- `npm run contracts:typecheck`: OK
- `npm run supabase:verify`: OK
- pgTAP: `Files=6`, `Tests=93`, `Result: PASS`
- GitHub Actions `Supabase DB`: `success` no commit `85b3495`

## Comandos úteis

```bash
npm run supabase:start
npm run supabase:verify
npm run supabase:bootstrap:first-admin -- --local --user-id <uuid>
```

Para deploy remoto do banco, usar exclusivamente o runbook em
`docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.

## Script preservado

```bash
npm run extract:octadesk
```
