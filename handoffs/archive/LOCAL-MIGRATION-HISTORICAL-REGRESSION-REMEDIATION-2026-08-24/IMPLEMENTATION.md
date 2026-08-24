# IMPLEMENTATION

- Task: LOCAL-MIGRATION-HISTORICAL-REGRESSION-REMEDIATION-2026-08-24
- State: READY_FOR_REVIEW
- Role: EXECUTOR / Forge
- Reviewer active: Sentinel
- Approval: APPROVED
- Base SHA: c70e995247962b9a24410e8d9d027d00b729e3b7
- Implementation SHA: UNCOMMITTED_WORKTREE

## Evidência final vigente

- Migration nova criada: `20260824190000_analytics_timeseries_scope_performance_remediation_v1.sql`.
- Preflight estático: 4/4 migrations `PREFLIGHT_READY_FOR_SHADOW`.
- Teste específico: 17/17 PASS.
- `npm run test:focused`: 323/323 PASS em 49 arquivos.
- Replay shadow mais recente: `SHADOW_REPLAY_CANDIDATE_GO`.
- Decisão global mais recente: `NO_GO`, com `candidate_go` separado e
  `historical_no_go` preservado.
- Shadow mais recente: `confione_shadow_semantic_preflight_20260824_29244`,
  imagem `public.ecr.aws/supabase/postgres:17.6.1.158`, disposable e distinto
  de `supabase_db_genius-support-os`; removido no `finally`.
- Catálogo, ACL, `SECURITY DEFINER`, `search_path` vazio, RLS/cross-tenant,
  contrato funcional e equivalência histórica/candidata passaram no replay.

## Gates finais

- `npm run local:qa:migration-semantic-preflight -- --no-shadow`: `NO_GO`
  esperado, `historicalState=historical_no_go` e `failClosed=true`;
- replay descartável: `SHADOW_REPLAY_CANDIDATE_GO`,
  `candidateState=candidate_go`, `historicalState=historical_no_go` e
  `globalState=NO_GO`;
- container `confione_shadow_semantic_preflight_20260824_34520`, imagem
  `public.ecr.aws/supabase/postgres:17.6.1.158`, distinto do canônico e
  removido ao final;
- medianas baseline/histórica/remediação: RPC all `6.341/7.778/5.592` ms,
  RPC excluded `5.965/10.411/6.011` ms; joins all `3.218/5.238/3.257` ms e
  excluded `5.577/7.222/6.085` ms; `OPTIMIZED_CANDIDATE_GO`;
- evidência de predicados: histórica com `current_setting=4`,
  `string_to_array=2` e nenhuma variável local; remediação com
  `current_setting=1`, `string_to_array=1`, `v_group_company`,
  `v_excluded_pipeline_ids` e dois predicados variáveis;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 baseline resolvidos;
- `npm run quality:changed`: aprovado, 0 findings;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run contracts:typecheck`: PASS;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 944 módulos;
- `git diff --check` e `git diff --cached --check`: PASS.

## Alterações esperadas

- adicionar migration real de remediação;
- ajustar manifesto, cadeia histórica e medição do preflight shadow;
- adicionar regressões estáticas e fail-closed;
- atualizar relatório, fila e estado corrente.

## Limitações preservadas

- equivalência comprovada no shadow sintético, não no banco principal;
- `historical_no_go` e `globalState=NO_GO` permanecem por causa da regressão
  histórica registrada;
- nenhuma migration, rebuild, reset, repair ou SQL foi aplicada no banco local
  canônico ou remoto.

Não houve migration, SQL manual, reset, repair, escrita no banco principal,
ação remota, secret, commit, push, merge ou deploy.
