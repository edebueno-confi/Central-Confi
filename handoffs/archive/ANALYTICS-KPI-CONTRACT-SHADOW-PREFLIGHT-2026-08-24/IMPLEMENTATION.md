# IMPLEMENTATION

- Task: ANALYTICS-KPI-CONTRACT-SHADOW-PREFLIGHT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 2da99c95e00ac06ab222af3c1e4a26d67114205c
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

## Resultado entregue ao Sentinel

O lote ficou restrito ao parser/preflight específico, teste determinístico,
relatório e handoffs correntes. O container canônico observado foi
`supabase_db_genius-support-os`, imagem `public.ecr.aws/supabase/postgres:17.6.1.158`.
Ele é proibido para esta task. O shadow usou nome com prefixo próprio, label de
escopo e senha efêmera apenas no container descartável, sem copiar dados do
banco canônico.

O shadow semântico existente foi auditado e é específico para timeseries. Ele
não foi tratado como prova do contrato KPI. A migration candidata continua não
aplicada no banco canônico.

## Evidências

- auditoria estática confirmou wrappers de seis argumentos e overloads legados;
- filtros de operação, estágio e exclusões foram encontrados nas CTEs
  server-side da migration candidata;
- Customer Success permanece com contrato distinto e Financeiro permanece
  indisponível quando há operação;
- ACL, `security definer`, `search_path`, grants e reload foram confirmados
  estaticamente, mas não foram lidos após aplicação runtime;
- parser estático: 5/5 PASS;
- consumidores locais: operação, estágio e exclusões chegam à Visão Geral,
  Comercial e Suporte; Customer Success permanece distinto; Financeiro fica
  indisponível com operação;
- shadow final: `NO_GO`, `failClosed=true`, identidade namespaced verificada,
  `SHADOW_APPLY_FAILED`, `directSql=NOT_RUN` e `postgrest=NOT_PROVEN`;
- o erro final sanitizado foi `DOCKER_FAILED:FailedPrecondition`, pois o
  processo init do container shadow não permaneceu em execução. Nenhuma falha
  foi contornada no banco canônico.

## Gates executados

- `node --test tests/scripts/analytics-kpi-shadow-preflight.test.mjs`: 5/5 PASS;
- `node scripts/local-qa/analytics-kpi-shadow-preflight.mjs`: NO_GO esperado e
  fail-closed;
- `npm run test:focused`: 343/343 PASS;
- `npm run web:typecheck`: PASS;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS em `2026-08-25T00:51:01.596Z`, 0 regressões
  bloqueantes, baseline 47;
- `git diff --check`: PASS.

`web:build` não foi executado porque não houve alteração de frontend,
contratos ou configuração de build. `git diff --cached --check` fica reservado
à finalização seletiva após aprovação e não há commit neste lote.

## Limitações obrigatórias

Não houve autenticação por credencial nova, chamada externa, migration no banco
principal/remoto, RLS/cross-tenant servido, performance real ou prova de
PostgREST. Essas lacunas permanecem `NÃO COMPROVADO` e mantêm o resultado
operacional `NO_GO` até nova execução revisável.

## Transferência

Estado transferido para `READY_FOR_REVIEW`, Owner Sentinel e
`Agent coordination=REVIEW_ACTIVE`. Solicitação de revisão independente
enviada ao Sentinel e ao Codex; não há aprovação autodeclarada.
