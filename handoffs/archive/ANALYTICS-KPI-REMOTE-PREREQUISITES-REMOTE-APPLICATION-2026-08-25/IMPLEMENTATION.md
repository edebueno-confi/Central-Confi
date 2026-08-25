# IMPLEMENTATION

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-REMOTE-APPLICATION-2026-08-25`
State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: 48f8f5bb
Implementation SHA: PENDING_LOCAL_FINALIZATION

Finalization: APPROVED pelo Sentinel; o lote está encerrado para novas
alterações e será integrado somente por stage seletivo.

## Ferramenta única da aplicação inicial

A aplicação autorizada usou exclusivamente
`mcp__codex_apps__supabase_apply_migration` com `project_id`, `name` e `query`
explícitos, uma única vez. Não foi usado `supabase db push`, CLI alternativo,
SQL manual ou segunda chamada.

## Guardrails de atomicidade da aplicação inicial

- A migration contém `BEGIN`/`COMMIT` explícitos.
- A resposta da ferramenta não será tratada como prova de sucesso parcial.
- Erro, timeout, desconexão, resposta ambígua, divergência de identidade ou
  dúvida sobre parcialidade encerra em `OWNER_DECISION_REQUIRED`.
- Não houve retry, nova chamada ou SQL manual. A reconciliação posterior usou
  exclusivamente o repair oficial da CLI, separado da aplicação inicial.
- Somente resposta inequívoca de sucesso seguida de pós-leitura coerente será
  registrada como aplicação confirmada.

## Preflight imediatamente anterior à aplicação inicial

Antes da única chamada, no mesmo projeto e ciclo, serão repetidas consultas
read-only para os quatro helpers:

- `to_regprocedure` e argumentos de identidade;
- `pg_get_function_identity_arguments` e retorno;
- owner e `prosecdef` em `pg_proc`;
- `proconfig` com `search_path` vazio;
- `proacl` e `has_function_privilege` para anon/authenticated/service_role;
- fingerprint de `pg_get_functiondef`;
- probes semânticos de ratio, entry indisponível e elegibilidade.

O resultado teve exatamente quatro funções compatíveis com o preflight 95
e a fonte versionada. Qualquer divergência aborta antes da migration.

## Evidência da correção

- teste específico do shadow: 4/4 PASS;
- `node --check`: PASS;
- replay shadow descartável: `SHADOW_REPLAY_GO`;
- target namespaced distinto do container canônico;
- envelope transacional detectado e executado no shadow;
- helpers, wrappers, ACL sem anon e semântica KPI: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes/47 baseline;
- `git diff --check`: PASS;
- PostgREST autenticado, smoke remoto e produção: `NOT_PROVEN`.

## Estado de execução

Preflight read-only imediatamente anterior: `PASS`.

- identidade exata e `ACTIVE_HEALTHY` confirmados;
- migration `20260825123000` ausente do histórico imediatamente antes da
  chamada;
- `helperCount=4`, owners/search_path/ACLs/fingerprints compatíveis;
- probes: ratio 25, inválidos NULL, entry indisponível e elegibilidade ausente
  false;
- pós-repair: uma versão (`20260825125051`) para o nome da migration; histórico
  reconciliado.

Aplicação remota: `REPAIRED_AND_VALIDATED`.

## Resultado do repair oficial

Com autorização explícita do proprietário, a CLI Supabase 2.114.0 executou uma
única vez:

`supabase migration repair --project-ref jzmmvfcmruasqmrdmbup --status reverted 20260825125305 --yes`

O comando removeu somente a entrada duplicada do tracking table. Não executou
nem desfez SQL. A pós-validação confirmou projeto `ACTIVE_HEALTHY`, 312
migrations, exatamente uma entrada da migration helper na versão
`20260825125051`, 4/4 helpers, ACLs sem EXECUTE para clientes, fingerprints e
probes semânticos PASS.

O lote está entregue ao Sentinel para revisão independente do repair e da
pós-validação. A migration de contrato KPI continua fora do lote.

### Histórico observado antes do repair

Em 2026-08-25T09:54:03.3886006-03:00, a chamada autorizada a
`mcp__codex_apps__supabase_apply_migration` retornou `success=true`. A
leitura posterior de migrations, porém, registrou duas entradas para o mesmo
nome `20260825123000_analytics_kpi_remote_prerequisites_v1`, nas versões
`20260825125051` e `20260825125305`. Isso não satisfaz o critério de uma única
aplicação verificável. Não é possível atribuir causalidade ou corrigir o
histórico com segurança nesta etapa.

As pós-leituras catalogais dos quatro helpers passaram: quatro assinaturas,
retornos, owners `postgres`, `search_path` vazio, perfis `SECURITY DEFINER`
esperados, sem execução para `anon`, `authenticated` ou `service_role`,
fingerprints registrados e probes semânticos PASS. Essa evidência não elimina
a ambiguidade do histórico.

Esse estado foi encerrado pelo repair oficial descrito acima. Não houve retry,
SQL manual, reset, rollback de dados ou nova aplicação da migration.

## Gates após a pós-leitura

- `npm run docs:validate`: PASS, 0 bloqueios, 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens do baseline
  resolvidos;
- `git diff --check`: PASS.

Esses gates validam o worktree/documentação e não transformam o histórico
remoto ambíguo em aplicação aceita.

Ledger read-only: as duas entradas têm o mesmo autor
`ede.oliveira@confi.com.vc`, `idempotency_key` nula, um statement cada e o
mesmo fingerprint `483c4666c9dc244a462ec14e79db4153`. Isso confirma duplicidade
de registro do mesmo conteúdo, mas não define qual linha deve ser removida nem
autoriza editar `supabase_migrations.schema_migrations`.

## Diagnóstico read-only do duplicado

Os logs do Postgres mostram dois eventos distintos `apply sql from post body`
para o mesmo SQL, em `12:50:51` e `12:53:05` UTC. Também mostram os avisos
`there is already a transaction in progress` e `there is no transaction in
progress`, compatíveis com o envelope explícito da migration sendo executado
dentro do wrapper transacional da ferramenta. Esses avisos não foram tratados
como prova de rollback ou sucesso parcial. A segunda aplicação não será
repetida nem desfeita por SQL manual.

## Mecanismo oficial de repair utilizado

A documentação oficial do Supabase orienta o repair usado acima, que altera
apenas o tracking table e não executa nem desfaz SQL. A CLI local foi autenticada
sem expor ou persistir credenciais, e o projeto foi passado explicitamente por
`--project-ref`; não foi feito `supabase link` em projeto divergente.
