# Analytics KPI Contract Shadow Preflight

## Resultado executivo

Resultado `NO_GO` fail-closed para a migration candidata
`20260824210000_analytics_kpi_contract_parity_v1.sql`.

A auditoria estática confirmou os wrappers de seis argumentos, os filtros de
operação, estágio e exclusões de pipeline nas CTEs server-side, e a coerência
dos consumidores locais entre Visão Geral, Comercial e Suporte. A tentativa de
aplicação foi feita somente em containers PostgreSQL descartáveis namespaced,
com identidade distinta do banco canônico. A aplicação falhou dentro do
shadow antes da leitura das funções, portanto não há prova de resolução SQL
runtime, paridade numérica ou PostgREST. A migration permanece não aplicada no
banco canônico local e remoto.

## Escopo e allowlist

- `scripts/local-qa/analytics-kpi-shadow-preflight.mjs`
- `tests/scripts/analytics-kpi-shadow-preflight.test.mjs`
- este relatório;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`.

`package.json`, a migration candidata, o banco local principal, a fila e todos
os demais arquivos foram preservados fora do lote. `handoffs/README.md` possui
alterações preexistentes e não foi usado como stage do lote.

## Identidade e janela de execução

Observação local em `2026-08-24T21:46:14.4815543-03:00`, por:

```text
Get-Date -Format o
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Labels}}'
docker image inspect public.ecr.aws/supabase/postgres:17.6.1.158 --format '{{.Id}}'
```

O container canônico observado foi `supabase_db_genius-support-os`, com a
imagem `public.ecr.aws/supabase/postgres:17.6.1.158`. A imagem estava presente
localmente, id `sha256:99b1729aeb0bac314445024fc149fbd39306170b61dd50800ccf180327ab3459`.
Não houve pull, acesso ao container canônico, `psql` no porto 54322 ou comando
de migration no banco principal.

As tentativas shadow usaram nomes como
`confione_shadow_kpi_contract_20260824_<pid>`, label
`com.confione.scope=analytics-kpi-contract-shadow`, senha efêmera apenas no
container descartável e remoção automática ao final. O manifesto rejeita o
nome canônico e qualquer nome contendo `genius-support-os`.

## Auditoria estática

Comando: `node --test tests/scripts/analytics-kpi-shadow-preflight.test.mjs`.

Resultado final: **5/5 PASS**.

Migration auditada com SHA-256:
`7fdae191217db18d21642c0ba5d26a2225bf5c7f931d4ed6d95db7f4616f6445`.

Fatos confirmados no texto versionado:

- wrappers `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation` com seis argumentos;
- funções filtered com estágio e exclusões de pipeline;
- `current_setting('app.analytics_group_company', true)` e
  `analytics_pipeline_operation_eligible` dentro das CTEs scoped;
- `security definer`, `search_path = ''`, grants para `authenticated` e
  `service_role`, revogação de `anon` e `notify pgrst`;
- Customer Success não é alterado pela migration candidata;
- Financeiro não recebe dimensão operacional pela migration candidata.

Auditoria dos consumidores locais:

- `analytics-api.ts` envia operação, estágio e exclusões para Comercial e
  Suporte, inclusive nos carregamentos da Visão Geral;
- `AnalyticsCeoPage.tsx` passa os mesmos parâmetros de operação e exclusões
  para os carregamentos de Comercial e Suporte;
- Financeiro fica indisponível quando há operação selecionada;
- Customer Success mantém contrato distinto e não foi promovido como paridade
  de filtros sem origem contratada.

Esses itens são evidência estática e não substituem a execução runtime.

## Shadow runtime

Comando:

```text
node scripts/local-qa/analytics-kpi-shadow-preflight.mjs
```

Janela final observada: `2026-08-24T21:47:09.741-03:00`, equivalente a
`2026-08-25T00:47:09.741Z` no campo `generatedAt` do relatório do script.

Resultado sanitizado:

```text
state=NO_GO
failClosed=true
targetIdentity.verified=true
targetIdentity.disposable=true
migration.result=SHADOW_APPLY_FAILED
directSql.state=NOT_RUN
postgrest.state=NOT_PROVEN
```

O erro final sanitizado foi:
`DOCKER_FAILED:FailedPrecondition: container <id> init process is not running: failed precondition`.
As tentativas anteriores, também somente em shadow descartável, expuseram
dependências de bootstrap ausentes (`synced_at` e manutenção do objeto
`graphql.seq_schema_version`); o bootstrap foi ajustado apenas dentro do
script allowlisted. A tentativa final continuou falhando antes da leitura do
catálogo. Nenhuma dessas falhas foi contornada no banco canônico.

Por consequência, não foram declarados como PASS:

- `to_regprocedure` e execução dos wrappers no shadow;
- recortes numéricos de operação selecionada, Todas, estágio e exclusão;
- ACL, `prosecdef` e `proconfig` observados após a migration;
- resolução via PostgREST.

## Classificação dos critérios

| Critério | Resultado | Evidência | Limite |
|---|---|---|---|
| Migration candidata e assinaturas | PASS estático | parser/teste 5/5, SHA do arquivo | não é execução SQL |
| Identidade do shadow | PASS | nome, label, imagem local e exclusão do canônico | não prova o contrato |
| Aplicação em shadow | NO_GO | `SHADOW_APPLY_FAILED` | container descartável falhou antes do catálogo |
| Operação, Todas, estágio e exclusões | NÃO COMPROVADO | sem `directSql` após falha | não inventar paridade |
| Visão Geral versus abas | PASS estático | consumidores e parâmetros locais | RPC/PostgREST não servidos |
| Customer Success | NÃO PROMOVIDO | contrato distinto no código | cobertura temporal não faz parte desta migration |
| Financeiro | HONESTO/indisponível por operação | `financeUnavailable` no consumidor | sem nova dimensão operacional |
| PostgREST | NÃO COMPROVADO | nenhum serviço PostgREST foi criado no shadow | não usar o PostgREST canônico como substituto |
| RLS/cross-tenant servido | NÃO COMPROVADO | não houve execução pós-migration | não confundir política estática com prova ponta a ponta |
| Performance real | NÃO COMPROVADO | nenhum benchmark servido | shadow sintético não foi concluído |
| Browser autenticado | NÃO COMPROVADO | fora do lote | sem credenciais/cookies novos |
| Integrações e produção | NÃO EXECUTADO | fora do escopo | HubSpot/OMIE e remoto preservados |

## Gates

Executados em `2026-08-24` no checkout local:

- `node --test tests/scripts/analytics-kpi-shadow-preflight.test.mjs`: **5/5 PASS**;
- `node scripts/local-qa/analytics-kpi-shadow-preflight.mjs`: **NO_GO esperado,
  fail-closed**, shadow namespaced verificado, migration apply falhou antes do
  catálogo e PostgREST não comprovado;
- `npm run test:focused`: **343/343 PASS** em 52 arquivos;
- `npm run web:typecheck`: **PASS**;
- `npm run lint`: **PASS**, 0 erros e 158 warnings legados;
- `npm run docs:validate`: **PASS**, 0 bloqueios;
- `npm run review:gates`: **PASS** em `2026-08-25T00:51:01.596Z`, 0 regressões
  bloqueantes e 47 itens de baseline resolvidos;
- `git diff --check`: **PASS**.

Build web não foi executado: o lote não alterou frontend, contratos ou
configuração de build. O stage seletivo e `git diff --cached --check` ficam
reservados à finalização após aprovação independente, sem commit neste lote.

## Decisão operacional

`NO_GO` para aplicar a migration candidata no banco local canônico ou remoto.
O próximo passo seguro é uma decisão/ajuste específico do bootstrap shadow e,
somente depois, nova execução em container namespaced. Não é permitido usar a
falha do shadow como motivo para aplicar a migration no banco principal.
