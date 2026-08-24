# IMPLEMENTATION

- Task: LOCAL-MIGRATION-HISTORICAL-REBUILD-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 6e4ed7ff7b23b62c75a6aecae0ab4337808a089d
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

## Pré-condições verificadas

- Container canônico ativo: `supabase_db_genius-support-os`.
- Imagem: `public.ecr.aws/supabase/postgres:17.6.1.158`.
- Portas locais: API `127.0.0.1:54321`, banco `127.0.0.1:54322`.
- Preflight/replay shadow do lote anterior aprovado pelo Sentinel.
- Backup public schema/data gerado antes do reset em
  `output/local-qa/task60-pre-rebuild-20260824-163807/`.
- `public-schema.sql`: 4.622.124 bytes,
  SHA-256 `CB6CB7BE44F4509B45DD8D15A93A747016898717B3E8A5A0F3B6D0D740ECCF8B`.
- `public-data.sql`: 57.023.424 bytes,
  SHA-256 `AA5946AFCBA4F3BA32D5AB5EC9E9282355E67CF63E11ED7B727D31CCC9B71577`.
- Inventário antes do reset: 4 tenants, 0 tickets, 2.142 deals,
  49.416 HubSpot tickets, 3.781 recebíveis e 11 usuários.

## Rebuild local concluído

- `ALLOW_LOCAL_DB_RESET=true npm run local:qa:reset`: `LOCAL_QA_RESET_OK`.
- Alvo confirmado antes/depois: `supabase_db_genius-support-os`,
  `public.ecr.aws/supabase/postgres:17.6.1.158`, health `healthy`.
- Histórico reaplicado: 299 migrations aplicadas; `20260824190000` presente.
- `npm run local:qa:verify`: PASS, 3 tenants, 18 tickets, 3 deals,
  6 recebíveis, 5 usuários, isolamento local sem linhas cross-tenant.
- `npm run local:qa:schema-parity`: PASS, proof válido, 299/299, sem ausentes,
  sem migrations extras, findings vazio; objetos auditados com origem verificada.
- Definição local da RPC temporal contém o CTE `scope` e os dois joins de
  escopo da remediação candidata.

## Preflight semântico e remediação de performance

- Shadow descartável com 5.000 linhas por tabela: `candidate_go`, contrato,
  equivalência, ACL, RLS/cross-tenant e performance PASS.
- Shadow descartável com 100.000 linhas por tabela: `candidate_go`,
  `OPTIMIZED_CANDIDATE_GO`; os dois RPCs ficaram dentro da margem, ao menos
  uma redução foi observada, e joins mantiveram plano/custo.
- O critério do benchmark foi corrigido para separar workloads alterados pela
  migration dos joins de observação: RPCs exigem não regressão e evidência de
  redução; joins exigem plano e custo estáveis, sem reprovação por ruído de
  tempo em consulta não alterada.
- Estado global permanece `NO_GO` por `historical_no_go`, deliberadamente
  separado do `candidate_go`; isso não autoriza promoção remota ou release.

## Resposta a F-REBUILD-001 e revalidação das fixtures

- Diagnóstico independente: `npm run local:qa:verify` falhou duas vezes com
  `tenants=0` e `tickets=0`, apesar de deals, recebíveis e usuários presentes.
- Alvo confirmado para a correção: somente o container local canônico
  `supabase_db_genius-support-os`; não houve container divergente, reset ou
  chamada externa nesta correção.
- Reaplicação autorizada: `npm run local:qa:hydrate` concluído com resultado
  sanitizado `environment=local`, `hydrated=true`, `users=5`, `tenants=3`,
  `tickets=18`, `external_sync=false`.
- Revalidação: `npm run local:qa:verify` PASS com `users=5`, `tenants=3`,
  `tickets=18`, `deals=3`, `hubspot_tickets=3`, `receivables=6`,
  `schedules_off=1`, `roles=4`.
- Isolamento: `client_membership=1`, `client_other_memberships=0` e
  `fake_omie_rows=0`; a fixture não apresenta associação cross-tenant nem
  linhas OMIE falsas.
- Nenhuma senha, chave, token ou cookie foi registrado; a saída de status foi
  tratada somente como confirmação de alvo local e sanitizada no handoff.

## Gates finais e entrega ao Sentinel

- `node --test tests/scripts/local-schema-parity.test.mjs`: 17/17 PASS.
- `node --test tests/scripts/migration-semantic-preflight.test.mjs`: 17/17 PASS.
- `npm run test:focused`: 323/323 PASS.
- `npm run local:qa:verify`: PASS após a reaplicação, 3 tenants, 18 tickets,
  3 deals, 6 recebíveis, 5 usuários e isolamento local sem linhas cross-tenant.
- `npm run local:qa:schema-parity`: PASS, proof válido, 299/299 migrations,
  ausentes 0, extras 0 e findings 0.
- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: exit 0,
  `NO_GO`, `historical_no_go` e `failClosed=true`, conforme esperado sem shadow.
- `npm run local:qa:migration-semantic-preflight`: exit 0, shadow descartável
  `SHADOW_REPLAY_CANDIDATE_GO`, `candidate_go`, `OPTIMIZED_CANDIDATE_GO`,
  contrato equivalente, RLS/cross-tenant e RPC autenticada comprovados;
  `globalState=NO_GO` permanece por `historical_no_go`.
- Benchmark padrão do preflight: 100.000 linhas por tabela, 5 medições, 2
  aquecimentos, timeout 30 s, margem relativa 25%, margem absoluta 2 ms e
  tolerância de custo 1%. O comparador continua fail-closed para erro, timeout,
  mudança de plano, regressão material de tempo ou custo.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens de baseline
  resolvidos.
- `npm run lint`: PASS, 0 erros e 158 warnings legados.
- `npm run contracts:typecheck`: PASS.
- `npm run web:typecheck`: PASS.
- `npm run build`: PASS, 944 módulos.
- `git diff --check`: PASS.
- `git diff --cached --check`: PASS, sem conteúdo staged.

## Contaminação preexistente reconciliada

O worktree contém alterações anteriores à task corrente em `docs/PROJECT_STATE.md`,
`docs/README.md`, `docs/engineering/OWNER_DECISIONS.md`, `handoffs/README.md`,
`package.json`, `scripts/run-focused-tests.mjs`,
`docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md`,
`docs/reports/LOCAL_MIGRATION_HISTORY_REPAIR_2026-08-23.md`,
`handoffs/after-sale-migration-claude/genius-uvline/`,
`handoffs/archive/LOCAL-MIGRATION-HISTORY-REPAIR-2026-08-23/` e
`supabase/migrations/20260822130000_release_contract_drift_reconciliation_v1.sql`.
Esses caminhos estão fora da allowlist, não foram stageados e serão preservados
fora do commit. A validação final deve usar stage seletivo, nunca `git add .`.

## Estado de entrega

O lote está novamente entregue ao Sentinel para revisão independente. O rebuild
local original foi executado somente no container canônico autorizado, após
backup, e a correção corrente reaplicou apenas as fixtures por `local:qa:hydrate`.
Não houve migration remota, produção, secrets, escrita externa, push, merge ou
deploy. Não fazer commit antes de `APPROVED` formal e validação final da
allowlist.
