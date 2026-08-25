# Aplicação remota dos pré-requisitos KPI

Estado do lote: `READY_FOR_REVIEW`, após repair oficial autorizado e
pós-validação read-only coerente.

## Escopo

Este lote prepara uma única aplicação da migration versionada
`20260825123000_analytics_kpi_remote_prerequisites_v1.sql` no projeto
explicitamente confirmado `ConfiOne / jzmmvfcmruasqmrdmbup`.

Não inclui a migration de contrato KPI `20260824210000`, SQL manual, alteração
de ACL fora da própria migration, reset, rebuild, secrets, retry ou deploy. O
repair oficial do tracking table foi executado separadamente, sob autorização
explícita, para remover apenas a entrada duplicada.

## Resposta aos findings

### F-REMOTE-PREREQ-APP-001

A ferramenta exata foi `mcp__codex_apps__supabase_apply_migration`, com
`project_id`, `name` e `query` explícitos, chamada uma única vez. A migration
contém envelope PostgreSQL explícito `BEGIN`/`COMMIT`, mas a atomicidade do
transporte e a recuperação após timeout permanecem não comprovadas pelo
contrato da ferramenta.

Regras de encerramento:

- somente resposta inequívoca de sucesso seguida de pós-leitura permite
  concluir aplicação;
- erro, timeout, resposta ambígua, desconexão, divergência de identidade ou
  qualquer dúvida sobre parcialidade encerra em `OWNER_DECISION_REQUIRED`;
- não haverá retry, segunda chamada, SQL manual ou tentativa de marcar a
  migration como aplicada;
- se a pós-leitura encontrar a versão aplicada após resposta ambígua, o estado
  será registrado como `APPLIED_BUT_RESPONSE_AMBIGUOUS`, sem nova escrita.

Assim, a segurança depende do envelope transacional executado no servidor, da
reconciliação pós-leitura e da regra fail-closed para qualquer incerteza do
transporte. A ferramenta não será tratada como prova adicional de atomicidade
além desses controles.

### F-REMOTE-PREREQ-APP-002

Imediatamente antes da chamada serão repetidas leituras read-only no mesmo
projeto e na mesma janela:

```sql
select
  n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as identity,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  coalesce(p.proconfig, array[]::text[]) as config,
  coalesce(p.proacl, array[]::text[]) as acl,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute,
  md5(pg_get_functiondef(p.oid)) as definition_fingerprint
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.oid in (
  'app_private.kpi_entry(numeric,text,text,text)'::regprocedure,
  'app_private.kpi_ratio(numeric,numeric)'::regprocedure,
  'app_private.set_analytics_operation_scope(text)'::regprocedure,
  'app_private.analytics_pipeline_operation_eligible(text,text,text,text)'::regprocedure
)
order by identity;
```

O resultado só passa com exatamente quatro linhas, assinaturas e retornos
compatíveis, owners e `prosecdef` esperados, `search_path` vazio, ACLs sem
execução indevida e fingerprints compatíveis com o preflight 95 e a fonte
versionada. Probes read-only de `kpi_ratio`, `kpi_entry` e
`analytics_pipeline_operation_eligible` também devem passar. Qualquer
divergência aborta antes de `CREATE OR REPLACE` ou `REVOKE`.

## Evidência local da correção

- teste específico do shadow: 4/4 PASS;
- `node --check`: PASS;
- replay shadow descartável: `SHADOW_REPLAY_GO`;
- envelope transacional detectado estaticamente e aplicado no shadow;
- helpers, wrappers de shadow, ausência de EXECUTE para anon e semântica KPI:
  PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes/47 baseline;
- `git diff --check`: PASS;
- PostgREST autenticado, smoke remoto e produção: `NOT_PROVEN`.

## Histórico observado antes do repair

Em 2026-08-25T09:54:03.3886006-03:00, a única chamada autorizada a
`mcp__codex_apps__supabase_apply_migration` para o projeto
`jzmmvfcmruasqmrdmbup` retornou `success=true`.

A leitura posterior do histórico encontrou duas entradas com o mesmo nome
`20260825123000_analytics_kpi_remote_prerequisites_v1`, nas versões
`20260825125051` e `20260825125305`. Portanto, o resultado é
`APPLIED_BUT_HISTORY_AMBIGUOUS`, não uma confirmação de aplicação única. A
causalidade das duas entradas e o tratamento correto do histórico não foram
determinados.

A pós-leitura catalogal confirmou quatro helpers, assinaturas/retornos,
owners `postgres`, `search_path` vazio, `SECURITY DEFINER` somente nos helpers
esperados, ausência de execução para `anon`, `authenticated` e `service_role`,
fingerprints registrados e probes semânticos PASS. Essa confirmação não
autoriza reparo nem elimina a ambiguidade do histórico naquele momento.

Esse estado foi encerrado pelo repair oficial descrito abaixo. A migration de
contrato KPI continua fora do lote.

### Gates locais após a pós-leitura

- `npm run docs:validate`: PASS, 0 bloqueios, 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes, 47 itens do baseline
  resolvidos;
- `git diff --check`: PASS.

Os gates locais não validam atomicidade de transporte nem resolvem a
ambiguidade do histórico remoto.

## Diagnóstico read-only da duplicidade

Os logs do Postgres registram dois eventos distintos `apply sql from post body`
para o mesmo SQL, às `12:50:51` e `12:53:05` UTC. Também registram avisos de
transação já aberta e inexistente, compatíveis com o `BEGIN`/`COMMIT` explícito
da migration dentro do wrapper transacional da ferramenta. Isso explica a
existência de duas tentativas observáveis, mas não autoriza inferir causalidade
ou editar o histórico.

Leitura adicional do ledger confirmou que as duas entradas têm o mesmo autor
`ede.oliveira@confi.com.vc`, `idempotency_key` nula, um statement cada e o
mesmo fingerprint de statements
`483c4666c9dc244a462ec14e79db4153`. O dado confirma duplicidade do mesmo
conteúdo, mas não autoriza escolher ou remover uma linha.

O mecanismo oficial identificado foi o repair da CLI Supabase, executado
somente depois da autorização do proprietário e com `--project-ref` explícito.

## Estado atual

## Resultado do repair oficial

Com autorização explícita do proprietário, a CLI Supabase 2.114.0 executou uma
única vez, usando o projeto explícito:

`supabase migration repair --project-ref jzmmvfcmruasqmrdmbup --status reverted 20260825125305 --yes`

O repair removeu somente a entrada duplicada do tracking table. A versão
`20260825125051` permaneceu. Pós-validação confirmou 312 migrations, exatamente
uma entrada da migration helper, projeto `ACTIVE_HEALTHY`, quatro helpers,
ACLs restritas, fingerprints e probes semânticos PASS.

Não houve SQL manual, retry, nova aplicação da migration, reset, rollback de
dados, secrets ou deploy. A revisão independente do Sentinel ainda é necessária.

Aplicação remota: `REPAIRED_AND_VALIDATED`.

Os wrappers KPI de seis argumentos continuam fora desta task. Smoke HTTP
autenticado, PostgREST, RLS/cross-tenant, produção e performance continuam
`NOT_PROVEN`.
