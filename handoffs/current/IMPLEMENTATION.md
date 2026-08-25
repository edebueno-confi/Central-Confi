# IMPLEMENTATION

Task: `ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-R2-2026-08-25`
State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: 596a2b59
Implementation SHA: UNCOMMITTED_WORKTREE

## Preparação executada

- Migration candidata atualizada com envelope explícito `BEGIN`/`COMMIT`:
  `20260824210000_analytics_kpi_contract_parity_v1`.
- Preflight imediato executável criado em
  `scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs`.
- Regressões determinísticas criadas em
  `tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs`.
- SHA-256 atual da migration: `463F2E978D7F62EEF82A18D9F8D071043965BF7D8A7105CF17D9A6BE5ADAEC52`.
- Preflight remoto anterior aprovado confirmou o projeto `ConfiOne /
  jzmmvfcmruasqmrdmbup`, helpers presentes e wrappers ausentes.
- A ferramenta foi alinhada exclusivamente a
  `mcp__codex_apps__supabase_apply_migration`.

## Execução remota concluída

- Identidade reconfirmada: `ConfiOne / jzmmvfcmruasqmrdmbup`,
  `ACTIVE_HEALTHY`.
- Preflight imediato read-only: `GO`, legados `2/2` presentes, alvos `0/4`
  presentes, segurança dos legados válida.
- Aplicação única via `mcp__codex_apps__supabase_apply_migration`: sucesso.
- Histórico remoto: nome `20260824210000_analytics_kpi_contract_parity_v1`,
  versão registrada `20260825144746`.
- Pós-validação read-only: `4/4` wrappers presentes, owner `postgres`,
  `SECURITY DEFINER`, `search_path=""`, ACLs esperadas e predicados de
  operação confirmados.
- Uma consulta read-only inicial foi corrigida por erro de alias SQL; não
  houve nova migration nem escrita decorrente desse diagnóstico.

## Não executado

Não houve SQL manual de escrita, retry, reset, repair, secret, push, merge ou
deploy. Smoke autenticado, equivalência numérica servida, RLS/cross-tenant e
performance real permanecem `NÃO COMPROVADOS`.

## Gates locais

- `git diff --check`: PASS na entrega anterior;
- `docs:validate`: PASS na entrega anterior;
- `review:gates`: PASS na entrega anterior;
- `node --test tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs tests/scripts/analytics-kpi-contract-parity.test.mjs tests/scripts/analytics-kpi-contract.test.mjs`: 33/33 PASS;
- `node --check scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs`: PASS;
- `git diff --check`: PASS;
- validações pesadas de produto permanecem fora da correção porque não houve
  alteração de código de produto.

## Ação esperada do Sentinel

Revisar a migration, os guardrails de aplicação única, a identidade do alvo, a
separação entre preflight, aplicação e pós-validação e a ausência de retry.
Emitir APPROVED ou CHANGES_REQUESTED nos handoffs canônicos. Sem APPROVED, a
aplicação remota não deve ocorrer.

## Transferência

O canal direto da thread do Sentinel retornou `stale thread` ao tentar enviar a
notificação automática no ciclo anterior. A transferência permanece registrada
neste handoff e nos quatro arquivos canônicos; a nova revisão deve ser iniciada
somente com `READY_FOR_REVIEW` consistente.

## Resposta aos findings F-R2-REMOTE-003/004

- `F-R2-REMOTE-003`: corrigido usando a representação PostgreSQL
  `search_path=""` no SQL e no avaliador, em vez de `search_path=`.
- `F-R2-REMOTE-004`: corrigido; `evaluateImmediateContractPreflight` agora
  inspeciona cada linha de catálogo e exige fingerprint, owner,
  `SECURITY DEFINER`, `search_path` e ACLs/grants corretos. Contagens isoladas
  não produzem mais `GO`.

## Gates da correção

- `node --test tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs tests/scripts/analytics-kpi-contract-parity.test.mjs tests/scripts/analytics-kpi-contract.test.mjs`: 33/33 PASS;
- `node --check scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs`: PASS;
- `git diff --check`: PASS;
- migration SHA-256: `463F2E978D7F62EEF82A18D9F8D071043965BF7D8A7105CF17D9A6BE5ADAEC52`.

## Resposta aos findings

- `F-R2-REMOTE-001`: migration agora contém `BEGIN` antes da primeira operação
  e `COMMIT` depois do `NOTIFY`; erro, timeout, resposta ambígua ou parcialidade
  continuam sem retry e exigem `OWNER_DECISION_REQUIRED`.
- `F-R2-REMOTE-002`: o preflight imediato agora gera consulta read-only com
  `to_regprocedure` para os dois legados e quatro alvos, coletando owner,
  `SECURITY DEFINER`, `search_path`, ACL/grants e fingerprint. Os legados devem
  existir e os alvos devem estar ausentes antes da aplicação.
