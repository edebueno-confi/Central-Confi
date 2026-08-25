# TASK

Task: `ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-R2-2026-08-25`

State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: 596a2b59

## Resultado

A migration foi aplicada uma única vez no projeto `ConfiOne /
jzmmvfcmruasqmrdmbup` após preflight imediato `GO`. A pós-validação
read-only confirmou os quatro wrappers, segurança, ACLs e predicados de
operação. O histórico remoto registrou o nome versionado em
`20260825144746`. Não houve retry nem escrita fora da migration aprovada.

## Objetivo

Aplicar, somente após nova aprovação independente, a migration versionada
`supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql` no
projeto explicitamente confirmado `ConfiOne / jzmmvfcmruasqmrdmbup`. A migration
cria os wrappers filtrados e `by_operation` de seis argumentos e preserva as
assinaturas legadas de quatro argumentos.

## Allowlist

- `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`
- `scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs`
- `tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs`
- `docs/reports/ANALYTICS_KPI_CONTRACT_REMOTE_APPLICATION_R2_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`

## Fora de escopo

- SQL manual fora da migration versionada;
- retry, reset, repair, rebuild, ACL fora da migration ou aplicação parcial;
- alteração de secrets, produção fora do alvo, push, merge, deploy ou release;
- execução de qualquer migration de dashboard além desta migration KPI.

## Guardrails de aplicação

1. Reconfirmar identidade exata do projeto e versão ausente imediatamente antes.
2. Reconfirmar, por leitura, os quatro helpers, owner, `SECURITY DEFINER`,
   `search_path`, fingerprints, ACLs e probes registrados no preflight aprovado.
3. Na mesma leitura, confirmar por `to_regprocedure` os dois wrappers legados
   de quatro argumentos e os quatro alvos de seis argumentos; conferir owner,
   `SECURITY DEFINER`, `search_path`, ACLs e fingerprint dos legados. Os dois
   legados devem existir e os quatro alvos devem estar ausentes. Qualquer
   divergência é `NO_GO` antes de `CREATE OR REPLACE`.
4. Usar exclusivamente `mcp__codex_apps__supabase_apply_migration`, com a
   migration inteira e nome versionado, em uma única chamada.
5. Não repetir em timeout, resposta ambígua, falha ou parcialidade. Parar em
   `OWNER_DECISION_REQUIRED`.
6. Após sucesso inequívoco, fazer somente leituras de histórico, catálogo,
   ACL/RLS, predicados de operação e probes read-only dos wrappers legados e
   novos. Smoke autenticado permanece `NOT_PROVEN` sem sessão válida.

## Critérios de aceite

- aprovação independente registrada pelo Sentinel;
- envelope `BEGIN`/`COMMIT` explícito na migration;
- preflight imediato executável cobre legados, alvos, segurança, ACLs e
  fingerprints, com regressões fail-closed;
- migration aplicada uma única vez no projeto confirmado, sem divergência;
- quatro wrappers de seis argumentos presentes com segurança e ACL esperadas;
- predicado server-side de operação e exclusões de pipeline preservado;
- assinaturas legadas de quatro argumentos permanecem presentes;
- pós-validação read-only sem erro, parcialidade ou retry;
- qualquer falha mantém o rollout em `NO_GO` e não autoriza seguir para UI.
