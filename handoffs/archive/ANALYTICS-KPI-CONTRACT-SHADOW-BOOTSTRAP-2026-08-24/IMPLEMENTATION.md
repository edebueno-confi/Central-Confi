# IMPLEMENTATION

- Task: ANALYTICS-KPI-CONTRACT-SHADOW-BOOTSTRAP-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 4bf30fdd094f456760fc574fcca6218f6efe4ebb
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

Diagnóstico confirmado em shadow descartável: a readiness atual aceitava o
PostgreSQL assim que `select 1` respondia, enquanto os scripts de inicialização
da imagem ainda executavam. O SQL do preflight então concorria com extensões e
gatilhos de bootstrap; isso produziu `permission denied for schema realtime`,
falha de extensão GraphQL e encerramento do container. O próximo lote deve
aguardar o marcador `PostgreSQL init process complete; ready for start up.` e
validar novamente o estado do processo antes do SQL de setup.

## Entrega para revisão independente

Correção concluída dentro da allowlist:

- readiness agora aguarda o marcador de bootstrap completo da imagem, estado
  `running` e probe `select 1`;
- erro Docker inclui status e detalhe sanitizado, sem perder falhas de spawn;
- setup não depende mais de `graphql.seq_schema_version` nem de ownership
  interno da imagem;
- regressões determinísticas cobrem readiness incompleta, container encerrado,
  identidade e fixture de operação/exclusões.

Evidências reais:

- `node --test tests/scripts/analytics-kpi-shadow-preflight.test.mjs`: 8/8 PASS;
- `node scripts/local-qa/analytics-kpi-shadow-preflight.mjs`: `NO_GO` esperado,
  `failClosed=true`, `bootstrap.ready=true`, `migration=SHADOW_ONLY`,
  `directSql.expected=true`, PostgREST `NOT_PROVEN`;
- shadow namespaced descartável executou a candidata; o container canônico
  `supabase_db_genius-support-os` não foi acessado;
- recortes comprovados: Comercial 2/1/2 e Suporte 2/1/3 para selecionado,
  excluído e Todas;
- `npm run test:focused`: 346/346 PASS em 52 arquivos;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens de baseline
  resolvidos;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `git diff --check`: PASS;
- `npm run web:typecheck`: PASS.

Limitações mantidas: PostgREST servido, RLS/cross-tenant servido, performance
real, browser autenticado, integrações externas e produção permanecem não
comprovados.

Nenhum banco canônico ou remoto foi tocado.

## Finalização local

O stage seletivo inclui este relatório, os scripts/testes allowlisted e os
quatro handoffs arquivados/current. A linha 77 foi marcada `DONE` no worktree,
mas `handoffs/README.md` permaneceu fora do commit porque contém alterações
   preexistentes que não podem ser separadas deterministicamente neste lote.
