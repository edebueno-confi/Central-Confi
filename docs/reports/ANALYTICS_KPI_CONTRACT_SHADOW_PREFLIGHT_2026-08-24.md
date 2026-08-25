# Analytics KPI Contract Shadow Preflight

## Resultado executivo

Resultado `NO_GO` fail-closed para a migration candidata
`20260824210000_analytics_kpi_contract_parity_v1.sql`.

A auditoria estática confirmou os wrappers de seis argumentos, os filtros de
operação, estágio e exclusões de pipeline nas CTEs server-side, e a coerência
dos consumidores locais entre Visão Geral, Comercial e Suporte. A aplicação e
os probes SQL foram executados somente em container PostgreSQL descartável
namespaced, com identidade distinta do banco canônico. O bootstrap foi
corrigido para aguardar a inicialização completa da imagem, e o shadow aplicou
a candidata e comprovou catálogo, ACL básica e recortes numéricos. PostgREST
servido, RLS/cross-tenant servido e performance real continuam não
comprovados, portanto o resultado global permanece `NO_GO`.

## Escopo e allowlist

- `scripts/local-qa/analytics-kpi-shadow-preflight.mjs`
- `tests/scripts/analytics-kpi-shadow-preflight.test.mjs`
- este relatório;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `STATUS.md` e `REVIEW.md`.
- atualização seletiva da linha 77 em `handoffs/README.md`.

`package.json`, a migration candidata, o banco local principal e todos os
demais arquivos foram preservados fora do lote. As demais alterações
preexistentes em `handoffs/README.md` permanecem fora do escopo.

## Identidade e janela de execução

Observação local em `2026-08-24T22:08:15.847-03:00`, por:

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

Resultado final: **8/8 PASS**.

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

Janela final observada: `2026-08-24T22:08:15.847-03:00`, equivalente a
`2026-08-25T01:08:15.847Z` no campo `generatedAt` do relatório do script.

Resultado sanitizado:

```text
state=NO_GO
failClosed=true
targetIdentity.verified=true
targetIdentity.disposable=true
bootstrap.ready=true
bootstrap.markerSeen=true
migration.result=SHADOW_ONLY
directSql.expected=true
postgrest.state=NOT_PROVEN
```

O diagnóstico reproduzido foi uma corrida entre o primeiro `select 1` e os
scripts de inicialização da imagem. O SQL do harness era enviado antes do
marcador `PostgreSQL init process complete; ready for start up.` e podia
derrubar o container por conflitos de ownership em schemas internos. O lote
agora aguarda o marcador, confirma o probe e não cria objetos em `graphql`.
Falhas de bootstrap continuam resultando em `NO_GO` sem SQL posterior.

Por consequência, não foram declarados como PASS:

- resolução via PostgREST.
- RLS/cross-tenant servido;
- performance real e browser autenticado.

Evidência obtida no shadow:

- `commercialSelected=2`, `commercialExcluded=1`, `allCommercial=2`;
- `supportSelected=2`, `supportExcluded=1`, `allSupport=3`;
- wrappers e funções filtered presentes via `to_regprocedure`;
- `security definer`, `search_path=""` e `anon` sem execute nos wrappers;
- bootstrap `ready=true`, marcador visto e `select 1` confirmado.

## Classificação dos critérios

| Critério | Resultado | Evidência | Limite |
|---|---|---|---|
| Migration candidata e assinaturas | PASS estático | parser/teste 5/5, SHA do arquivo | não é execução SQL |
| Identidade do shadow | PASS | nome, label, imagem local e exclusão do canônico | não prova o contrato |
| Aplicação em shadow | PASS | `SHADOW_ONLY`, bootstrap pronto | não é aplicação no canônico |
| Operação, Todas, estágio e exclusões | PASS no shadow | `directSql.expected=true` e recortes numéricos | dados sintéticos, sem paridade servida |
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

- `node --test tests/scripts/analytics-kpi-shadow-preflight.test.mjs`: **8/8 PASS**;
- `node scripts/local-qa/analytics-kpi-shadow-preflight.mjs`: **NO_GO esperado,
  fail-closed**, shadow namespaced verificado, migration aplicada somente no
  shadow, `directSql.expected=true` e PostgREST não comprovado;
- `npm run test:focused`: **346/346 PASS** em 52 arquivos;
- `npm run web:typecheck`: **PASS**;
- `npm run web:typecheck`: **PASS**;
- `npm run lint`: **PASS**, 0 erros e 158 warnings legados;
- `npm run docs:validate`: **PASS**, 0 bloqueios;
- `npm run review:gates`: **PASS** em `2026-08-25T01:09:49.048Z`, 0 regressões
  bloqueantes e 47 itens de baseline resolvidos;
- `git diff --check`: **PASS**.

Build web não foi executado: o lote não alterou frontend, contratos ou
configuração de build. O stage seletivo e `git diff --cached --check` ficam
reservados à finalização após aprovação independente, sem commit neste lote.

## Decisão operacional

`NO_GO` para aplicar a migration candidata no banco local canônico ou remoto.
O bootstrap do shadow está corrigido e o contrato SQL sintético foi exercitado,
mas a resolução servida via PostgREST e as provas de RLS/performance ainda
faltam. Não é permitido usar o sucesso do SQL direto no shadow como motivo
para aplicar a migration no banco principal.
