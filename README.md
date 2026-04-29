# Genius Support OS

Plataforma interna de suporte, base de conhecimento, tickets, comunicação
suporte-tecnologia e gestão de demandas técnicas do ecossistema Genius Return.

## Estado atual

O repositório está em fase de fundação arquitetural. Não existe frontend
implementado, nem ambiente Supabase inicializado neste estado. A prioridade
atual é consolidar:

- modelo de domínio;
- multi-tenant desde a base;
- permissões e RLS;
- auditoria e rastreabilidade;
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
- `supabase/`: blueprints, schema e futuras migrations do backend.
- `docs/`: arquitetura, modelo de dados, fases e decisões.
- `tests/`: estratégia de testes de banco, contratos e e2e.
- `raw_knowledge/`: base bruta preservada da KB atual para migração posterior.

## Documentação inicial

- [Arquitetura](./docs/architecture.md)
- [Estrutura do repositório](./docs/repository-structure.md)
- [Modelo inicial de dados](./docs/data-model.md)
- [Acesso, tenancy e auditoria](./docs/access-and-audit.md)
- [Plano técnico por fases](./docs/implementation-phases.md)

## Conhecimento legado preservado

O único material legado mantido por design é a extração bruta em
`raw_knowledge/octadesk_export/latest/`. Esse conteúdo deve ser tratado como
fonte operacional privada para futura ingestão e curadoria.

## Script preservado

```bash
npm run extract:octadesk
```
