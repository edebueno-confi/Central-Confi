# Reconciliação do histórico local de migrations

**Task:** `LOCAL-MIGRATION-HISTORY-RECONCILIATION-2026-08-23`
**Base SHA:** `b128c432b34da8c590d07d7898d40c38ae6051d4`
**Data:** 23/08/2026
**Escopo:** somente Supabase local, sem reset, repair cego, SQL manual,
migration remota, produção, secrets, HubSpot/OMIE, push, merge ou deploy.

## Resultado executivo

**NO-GO para reconciliar ou aplicar migrations neste lote.**

A versão `20260822130000` está registrada em
`supabase_migrations.schema_migrations` e não existe no checkout como arquivo
alcançável. A revisão Sentinel encontrou, porém, conteúdo determinístico em
um objeto Git inacessível: tree
`2bcf8c993849b1b8b6163c7e630cbdad53a3263c`, blob
`6887a1b623d05b2fd0bb11cb0095f0e56161c236`, contendo
`20260822130000_release_contract_drift_reconciliation_v1.sql`. Isso identifica
conteúdo recuperável por `git cat-file`, mas não constitui fonte versionada
alcançável, proveniência histórica comprovada ou autorização para repair.
Portanto, nenhum `migration repair`, restauração ao checkout, migration
inventada, SQL manual ou aplicação das quatro versões posteriores foi executado.

O gate continua fail-closed: há 297 arquivos no filesystem e 294 versões no
histórico local; as quatro migrations posteriores não estão aplicadas; a órfã
`20260822130000` permanece sem arquivo; e as migrations `20260822220000` e
`20260823100000` permanecem bloqueadas por `DO` com `EXECUTE` dinâmico.

## Evidência da origem órfã

| Fonte local pesquisada | Resultado |
| --- | --- |
| `supabase/migrations` | Não há arquivo `20260822130000` |
| `git log --all --reflog -S'20260822130000'` | Nenhuma ocorrência determinística |
| branches locais e `origin/*` já disponíveis | Nenhum arquivo correspondente alcançável |
| stash local preservado | Nenhum arquivo correspondente alcançável |
| tree Git inacessível | Conteúdo determinístico encontrado no tree/blob abaixo |
| commits/árvores Git alcançáveis | Nenhuma fonte versionada alcançável da órfã |
| histórico local lido pelo gate | Versão `20260822130000` presente, sem arquivo alcançável |

### Conteúdo encontrado no objeto inacessível

Leitura read-only com `git cat-file` confirmou o nome da migration e os
contratos relevantes, sem restaurar o arquivo e sem executar seu SQL:

- tree: `2bcf8c993849b1b8b6163c7e630cbdad53a3263c`;
- blob: `6887a1b623d05b2fd0bb11cb0095f0e56161c236`;
- migration: `20260822130000_release_contract_drift_reconciliation_v1.sql`;
- view: `public.vw_admin_tenant_group_context`;
- RPC: `public.rpc_analytics_customer_success_kpis_by_operation(text)`;
- grants explícitos para os objetos e `notify pgrst, 'reload schema'`.

**Classificação:** conteúdo determinístico encontrado em objeto Git inacessível;
proveniência, relação causal com a linha órfã registrada no banco, autorização
para restaurar/repair e compatibilidade com o schema atual permanecem **NÃO
COMPROVADAS**. O conteúdo não entra na allowlist nem no stage desta task.

## Avaliação das quatro migrations posteriores

| Migration | Conteúdo relevante | Preflight | Compatibilidade/origem | Decisão |
| --- | --- | --- | --- | --- |
| `20260822190000_omie_promotion_skip_metadata_only_updates.sql` | Define RPC `rpc_service_promote_omie_snapshot`; corpo persistente contém DML executado somente quando a função é chamada; grants explícitos para `service_role` | PASS, sem operação destrutiva de apply | Origem não comprovada porque a versão não está no histórico; dependências e execução pós-apply não foram comprovadas | NÃO APLICAR |
| `20260822200000_access_02_provisioning_e2e_v1.sql` | Cria tabela/index, habilita RLS, recria policy, insere defaults e define RPCs de provisionamento | PASS, `DROP POLICY IF EXISTS` tratado como idempotente; sem `DROP TABLE/COLUMN`, `TRUNCATE` ou `DELETE` de apply | Origem não comprovada; inclui inserts e dependências de autorização que exigem validação posterior | NÃO APLICAR |
| `20260822220000_analytics_utf8_and_scope_guard_v1.sql` | Bloco `DO` reobtém definições e executa SQL dinâmico | BLOCKED, `DO` com `EXECUTE` não analisável | Não pode ser tratado como seguro apenas pela intenção declarada | NO-GO |
| `20260823100000_analytics_timeseries_pipeline_exclusion_v1.sql` | Define escopo, altera definição de RPC temporal por bloco `DO` e executa SQL dinâmico | BLOCKED, `DO` com `EXECUTE` não analisável | Não pode ser tratado como seguro sem revisão específica e contrato de origem | NO-GO |

O detector distingue corpos persistentes de funções, que não rodam durante o
apply, de blocos `DO`, que rodam durante o apply. `EXECUTE` dentro de `DO` é
bloqueado, inclusive quando a string é montada por concatenação.

## Gate e estado antes/depois

| Verificação | Antes | Depois |
| --- | --- | --- |
| Arquivos de migration | 297 | 297 |
| Versões no histórico local | 294 | 294 |
| Histórico órfão | `20260822130000` presente | permanece presente |
| Migrations posteriores aplicadas | não comprovado | nenhuma aplicada |
| Gate de paridade | bloqueado | falha esperada, acionável e fail-closed |
| Reset, repair ou SQL manual | não executado | não executado |

## Validações reproduzidas

- `node --test tests/scripts/local-schema-parity.test.mjs`,
  `2026-08-23T15:12:34.3172670-03:00`: **9/9 PASS**.
- `npm run local:qa:schema-parity`,
  `2026-08-23T15:12:34.5410541-03:00`: exit 1 esperado; alvo local
  confirmado; 297/294; quatro ausentes; órfã; origem não comprovada; duas
  migrations bloqueadas por `DO` com `EXECUTE`.
- `npm run docs:validate`, `2026-08-23T15:12:38.6452803-03:00`:
  **PASS**, 0 bloqueios e 9 alertas históricos.
- `git diff --check`, `2026-08-23T15:12:39.4787587-03:00`: **PASS**.
- `npm run review:gates`, `2026-08-23T15:13:46.2561014-03:00`: **PASS**, 0
  regressões bloqueantes e 47 itens baseline resolvidos.
- `npm exec -- supabase migration up --local --yes` não foi repetido nesta
  task: a execução anterior já parou antes do apply com
  `LegacyMigrationMissingLocalError`; o conteúdo determinístico encontrado no
  tree/blob inacessível não comprova proveniência ou autorização para repair.
  Repetir não mudaria essa pré-condição e poderia induzir uma aplicação não
  autorizada.

Na resposta ao finding F-HISTORY-001, o focused foi repetido em
`2026-08-23T15:21:32.7493016-03:00` com 9/9 PASS, `npm run docs:validate` em
`2026-08-23T15:21:33.0266845-03:00` com PASS e 0 bloqueios, e `git diff --check`
em `2026-08-23T15:21:34.2688227-03:00` com PASS.

## Limitações e próximo passo

Não foi comprovada paridade pós-migration, grants/RLS autenticados, execução das
RPCs após aplicação, scheduler, replay de sync ou integração HubSpot/OMIE. O
próximo passo exige decisão do proprietário para fornecer ou restaurar a fonte
determinística de `20260822130000`. Somente depois disso deve-se repetir o
preflight e considerar as duas migrations estáticas, mantendo as duas com
`DO`/`EXECUTE` em NO-GO até revisão de segurança específica.
