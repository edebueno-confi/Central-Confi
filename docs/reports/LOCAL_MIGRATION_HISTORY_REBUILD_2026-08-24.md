# Relatório de rebuild local da task 60

## Resultado executivo

O banco Supabase local canônico foi recriado a partir das migrations do checkout,
com backup anterior, fixtures locais reaplicadas e validação de schema, contrato,
isolamento e preflight semântico. O candidato de remediação passou no shadow
descartável. O bloqueio histórico permanece separado e fail-closed como
`historical_no_go`; portanto este relatório não autoriza migration histórica,
remota ou produção.

## Alvo e proteção

- Container: `supabase_db_genius-support-os`.
- Projeto local: `genius-support-os`.
- Imagem: `public.ecr.aws/supabase/postgres:17.6.1.158`.
- API local: `127.0.0.1:54321`.
- Banco local: `127.0.0.1:54322`.
- Backup: `output/local-qa/task60-pre-rebuild-20260824-163807/`.
- `public-schema.sql`: 4.622.124 bytes,
  SHA-256 `CB6CB7BE44F4509B45DD8D15A93A747016898717B3E8A5A0F3B6D0D740ECCF8B`.
- `public-data.sql`: 57.023.424 bytes,
  SHA-256 `AA5946AFCBA4F3BA32D5AB5EC9E9282355E67CF63E11ED7B727D31CCC9B71577`.

O reset foi executado com `ALLOW_LOCAL_DB_RESET=true npm run local:qa:reset`,
conforme OD-020 e autorização explícita do proprietário. Nenhum container
divergente foi usado.

## Resultado do rebuild

- `LOCAL_QA_RESET_OK`.
- 299 migrations aplicadas, incluindo `20260824190000`.
- O primeiro resultado declarado de `local:qa:verify` não foi reproduzido na
  revisão independente: duas execuções observaram `tenants=0` e `tickets=0`.
  Isso foi tratado como falha funcional real, não como erro documental.
- Após reaplicar as fixtures com `npm run local:qa:hydrate` no container canônico,
  `npm run local:qa:verify` passou com 3 tenants, 18 tickets, 3 deals, 6
  recebíveis, 5 usuários e sem linhas cross-tenant no fixture de isolamento.
- A hidratação foi local, namespaced pelas próprias fixtures, sem sync externo;
  nenhuma senha, chave, token ou cookie foi registrada no relatório.
- `local:qa:schema-parity`: PASS, 299/299, sem ausentes, extras ou findings;
  objetos auditados com origem verificada.
- A RPC temporal local contém o CTE `scope` e os joins de escopo esperados.

## Preflight semântico e performance

O preflight padrão usa shadow PostgreSQL descartável com 100.000 linhas por
tabela, 5 medições, 2 aquecimentos e timeout de 30 segundos. As RPCs são
executadas quatro vezes por amostra para tornar observável uma diferença que
ficaria abaixo do ruído de uma chamada única. A comparação mantém margem relativa
de 25%, margem absoluta de 2 ms e tolerância de custo estimado de 1%; erro,
timeout, mudança de plano ou regressão material continuam `NO_GO`.

Resultado observado:

- `SHADOW_REPLAY_CANDIDATE_GO`.
- `candidateState=candidate_go`.
- `OPTIMIZED_CANDIDATE_GO`.
- contrato completo e equivalência com a implementação corrente.
- ACL, `search_path`, RLS, cross-tenant e RPC autenticada comprovados.
- `globalState=NO_GO` e `historicalState=historical_no_go`, preservados pela
  regressão histórica versionada.
- Sem shadow, o gate continua `NO_GO` e `failClosed=true`.

## Resposta ao finding F-REBUILD-001

- O estado observado antes da correção foi `tenants=0` e `tickets=0`, apesar de
  parte das fixtures permanecer presente. Schema parity 299/299 não foi usado
  como substituto para a validação funcional.
- A correção foi limitada à reaplicação autorizada de `local:qa:hydrate` no
  container `supabase_db_genius-support-os`; não houve novo reset, SQL manual,
  migration, reparo de histórico ou escrita externa.
- A verificação posterior confirmou `client_membership=1`,
  `client_other_memberships=0` e `fake_omie_rows=0`, mantendo a prova de
  isolamento local e a ausência de fixtures OMIE falsas.
- O resultado é reproduzível no estado local reidratado, mas não comprova
  produção, RLS servido, HubSpot/OMIE, carga real ou qualquer integração externa.

## Limitações e proibições

O benchmark é sintético e não representa latência de produção, volume real ou
carga concorrente. Não houve validação remota, migration remota, SQL manual no
banco principal, secrets, HubSpot, OMIE, push, merge, deploy ou release. A task
60 continua registrada como `BLOCKED` porque o histórico que originou o bloqueio
não foi falsificado como aprovado. O que foi resolvido é o ambiente local
canônico e a prova do candidato em shadow.
