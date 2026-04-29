# Genius Support OS

Plataforma interna de suporte, base de conhecimento, tickets, comunicação
suporte-tecnologia e gestão de demandas técnicas do ecossistema Genius Return.

## Estado atual

O repositório está em Fase 1.2 concluída localmente. Não existe frontend
implementado e a UI continua bloqueada. A fundação atual já inclui:

- Supabase inicializado oficialmente;
- migrations reais de identidade, tenancy e hardening;
- RLS mínima e auditoria append-only validadas com pgTAP;
- bootstrap seguro do primeiro `platform_admin`;
- control plane administrativo via RPCs seguras;
- contratos de backend antes da UI.

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
- [Checklist de validação](./docs/VALIDATION_CHECKLIST.md)

## Conhecimento legado preservado

O único material legado mantido por design é a extração bruta em
`raw_knowledge/octadesk_export/latest/`. Esse conteúdo deve ser tratado como
fonte operacional privada para futura ingestão e curadoria.

## Estado real

- `apps/web/` continua apenas como placeholder.
- `supabase/blueprints/001_foundation.sql` é histórico e não executável.
- `supabase/migrations/` já contém as migrations oficiais da Fase 1.
- Auth, policies de RLS, triggers, RPCs administrativas e testes de banco já foram implementados localmente.
- O app não deve fazer DML direto em `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles`; essas mutações passam por RPCs auditadas.
- A fonte prioritária de verdade documental está em `docs/`, com foco nos arquivos em caixa alta.

## Comandos úteis

```bash
npm run supabase:start
npm run supabase:verify
npm run supabase:bootstrap:first-admin -- --local --user-id <uuid>
```

## Script preservado

```bash
npm run extract:octadesk
```
