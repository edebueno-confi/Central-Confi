# LOCAL SYNC REPLAY FOUNDATION

- Task: `LOCAL-SYNC-REPLAY-FOUNDATION-2026-08-24`
- Base SHA: `da271d9e5579d8687edfb692a4d6e90e5d457062`
- Escopo: fixture sanitizada, namespaced e replay local idempotente
- Ambiente: Supabase local em `127.0.0.1`; nenhuma chamada externa
- Estado: READY_FOR_REVIEW; aprovação formal depende do Sentinel

## Correção F-SYNC-001

O finding sobre identidade do alvo de escrita foi respondido em
`scripts/local-qa/sql.mjs`. `runSqlBatch` aceita somente o container local
canônico `supabase_db_genius-support-os`: a ausência de
`LOCAL_QA_DB_CONTAINER` usa esse alvo, o mesmo valor explícito é aceito e
qualquer override divergente é rejeitado com
`LOCAL_QA_DB_CONTAINER_INVALID` antes do `docker exec`.

A regressão determinística cobre os três casos, incluindo um container local
divergente. O replay não foi executado novamente após a correção, conforme a
instrução do reviewer, porque ele escreve no banco local. As duas execuções
descritas abaixo são evidência histórica anterior ao finding e não são
reapresentadas como validação da correção.

## Resultado

Foi criada a fundação local `local-sync-replay-20260824`. O replay usa
somente usuários QA já existentes no banco local, cria tenants e memberships
com IDs determinísticos, e materializa payloads locais de HubSpot e OMIE com
identificadores e proveniência namespaced. O script não provisiona contas,
não lê senhas ou secrets e não ativa pipelines de integração.

O replay foi executado duas vezes. A segunda execução usou `ON CONFLICT DO
UPDATE` em todas as identidades e manteve as mesmas cardinalidades, sem
duplicação:

| objeto | quantidade final |
| --- | ---: |
| usuários locais reutilizados | 3 |
| tenants namespaced | 2 |
| memberships namespaced | 3 |
| empresas HubSpot locais | 2 |
| deals HubSpot locais | 1 |
| tickets HubSpot locais | 1 |
| payloads OMIE locais | 1 |

## Contratos e isolamento

- Usuários: `public.profiles` com correspondência em `auth.users`, ativos e
  já existentes. O lote não cria autenticação nem altera roles globais.
- Tenants: `public.tenants`, com slug `local-sync-replay-20260824-*` e
  UUIDs derivados deterministicamente do namespace.
- Memberships: `public.tenant_memberships`, com roles existentes
  `tenant_viewer` e `tenant_requester`, em conflito por `(tenant_id,user_id)`.
- HubSpot: `public.hubspot_companies`, `public.hubspot_deals` e
  `public.hubspot_tickets`. O payload bruto contém somente a marca de fixture,
  origem local e dados sintéticos.
- OMIE: `public.analytics_finance_receivables`, com `source_key` próprio do
  namespace, `identity_version='omie-v3'` e `raw_payload` sanitizado. Ele não
  é promovido para `omie_receivables_api`.
- Pipelines: `qa-local-commercial` e `qa-local-cs` já existiam e foram
  confirmados como inativos. O lote não cria nem ativa configuração de fonte.

## Read models e filtros

A verificação executou os contratos server-side existentes
`app_private.analytics_pipeline_operation_eligible`,
`rpc_analytics_commercial_snapshot_by_operation` e
`rpc_analytics_cs_snapshot_by_operation`, usando claims locais de um
`platform_admin` já existente apenas dentro da sessão SQL local.

Resultado reproduzido:

- pipeline comercial da fixture: `eligible=false`;
- pipeline de suporte da fixture: `eligible=false`;
- payload namespaced visível no snapshot comercial: `false`;
- payload namespaced visível no snapshot de suporte: `false`.

Isso comprova o isolamento server-side do replay em relação aos recortes
publicados. Não é uma afirmação de disponibilidade de operação nem uma
validação autenticada de produção.

## Segurança operacional

- O script valida `API_URL` local e `DB_URL` em localhost antes de escrever.
- A escrita usa uma transação local e somente `INSERT ... ON CONFLICT DO
  UPDATE` nas tabelas allowlisted pelo contrato.
- Não há `fetch`, cliente HubSpot/OMIE, `SERVICE_ROLE_KEY`, senha, secret,
  migration, reset, rollback, `DELETE`, `TRUNCATE` ou `DROP` no replay.
- Não houve promoção de snapshot, alteração de RLS/RPC, alteração de roles
  globais ou ativação de scheduler.

## Evidências e gates

Janela de execução local: 24/08/2026, aproximadamente 01:20 a 01:24
(-03:00), com Supabase local ativo. Os comandos foram:

O bloco abaixo é evidência histórica anterior ao finding F-SYNC-001. O replay
não foi repetido depois da correção do controle de alvo.

```text
node --test tests/scripts/local-sync-replay.test.mjs                  PASS 4/4 (histórico)
npm run local:qa:sync-replay                                         PASS
npm run local:qa:sync-replay                                         PASS (replay idêntico)
consulta SQL local de cardinalidade namespaced                          PASS
npm run test:focused                                                  PASS 306/306
npm run docs:validate                                                 PASS; 0 bloqueios
npm run review:gates                                                  PASS; 0 regressões bloqueantes; 47 baseline resolvidos
git diff --check                                                      PASS
```

Gates reexecutados após a correção, sem replay adicional:

```text
node --test tests/scripts/local-sync-replay.test.mjs                  PASS 5/5
npm run test:focused                                                  PASS 306/306
npm run docs:validate                                                 PASS; 0 bloqueios; 9 alertas
npm run review:gates                                                  PASS; 0 regressões bloqueantes; 47 baseline resolvidos
git diff --check                                                      PASS
```

O focused oficial executou 48 arquivos e 306 testes. O gate de qualidade
permaneceu verde contra o baseline corrente, com 0 regressões bloqueantes e 47
itens históricos resolvidos. Os testes puros do replay são adicionais aos
focused oficiais.

## Limitações

1. O banco local já contém histórico e dados de outras fixtures. O lote não
   limpa nem tenta reconciliar esse estado.
2. Usuários são referências a contas QA locais existentes. Provisionamento de
   Auth, senha e sessão autenticada não fazem parte deste lote.
3. Os pipelines namespaced permanecem inativos por segurança. Portanto, o
   lote comprova exclusão server-side de operação publicada, não uma operação
   publicada de teste.
4. Nenhuma chamada HubSpot/OMIE foi feita. A integração externa, latência,
   rate limit, scheduler e promoção de snapshots continuam não comprovados.
5. QA browser autenticado, RLS/cross-tenant servido e performance permanecem
   fora da evidência deste lote.

## Allowlist final

- `scripts/local-qa/local-sync-replay-fixture.mjs`
- `scripts/local-qa/local-sync-replay.mjs`
- `tests/scripts/local-sync-replay.test.mjs`
- `package.json`
- `docs/reports/LOCAL_SYNC_REPLAY_FOUNDATION_2026-08-24.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md` preservado, sem edição pelo executor

Arquivos preexistentes fora da allowlist foram preservados e não pertencem ao
lote.
