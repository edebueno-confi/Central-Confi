# REVIEW

- Task: ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-R2-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 596a2b59
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- State: CHANGES_REQUESTED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD

## Evidências conferidas

- SHA-256 da migration conferido: `7FDAE191217DB18D21642C0BA5D26A2225BF5C7F931D4ED6D95DB7F4616F6445`.
- Allowlist limitada à migration de contrato, relatório e handoffs. A
  aplicação remota ainda não foi executada.
- A migration preserva assinaturas legadas, adiciona wrappers filtrados e
  `by_operation` de seis argumentos, mantém predicados server-side,
  exclusões de pipeline, `SECURITY DEFINER`, `search_path` vazio e ACLs
  restritas.
- Guardrails exigem reconfirmação do alvo, ausência da versão e dos quatro
  helpers, chamada MCP única, sem retry e pós-leituras read-only.
- Testes: 30/30 PASS; `docs:validate` PASS com 0 bloqueios; `review:gates`
  PASS sem regressões bloqueantes e 47 itens baseline resolvidos;
  `git diff --check` PASS.

## Findings

### F-R2-REMOTE-001 — HIGH — atomicidade da migration não demonstrada

A migration contém várias criações/substituições de funções, grants, revokes e
`NOTIFY pgrst`, mas não contém envelope explícito `BEGIN`/`COMMIT`. O plano
proíbe retry e exige parar em caso de parcialidade, porém não apresenta
garantia verificável de atomicidade da ferramenta MCP para esta migration.

Correção esperada: adicionar envelope transacional explícito ou documentar
evidência verificável do contrato transacional da ferramenta, mantendo
`OWNER_DECISION_REQUIRED` para timeout, falha, resposta ambígua ou estado
parcial.

### F-R2-REMOTE-002 — HIGH — preflight imediato não cobre o contrato legado/alvo

Os guardrails exigem reconfirmar os quatro helpers, mas não exigem, na mesma
janela da escrita, confirmar que os wrappers legados de quatro argumentos ainda
existem e que os wrappers filtrados/alvo de seis argumentos estão ausentes ou
na versão esperada. Como a migration usa `CREATE OR REPLACE FUNCTION`, essa
omissão pode substituir uma função existente ou deixar compatibilidade legada
não comprovada.

Correção esperada: incluir no preflight imediato `to_regprocedure`, assinaturas,
owners, segurança, ACLs e fingerprints dos wrappers legados e dos alvos,
abortando antes da chamada se o estado divergir.

## Veredito

`CHANGES_REQUESTED`. Não aplicar a migration remota, não executar SQL manual,
retry, reset, repair, alteração de ACL, push, merge ou deploy até responder os
dois findings em revisão independente.

## Re-review independente — 2026-08-25

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 596a2b59
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- State: CHANGES_REQUESTED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD

### Findings reavaliados

- `F-R2-REMOTE-001`: **RESOLVIDO**. A migration agora contém envelope
  explícito `BEGIN`/`COMMIT`, com `NOTIFY` dentro da transação. Os guardrails
  mantêm parada em `OWNER_DECISION_REQUIRED` para erro, timeout, resposta
  ambígua ou parcialidade, sem retry.
- `F-R2-REMOTE-002`: **PARCIALMENTE RESOLVIDO**. O preflight enumera os dois
  legados e quatro alvos e verifica presença/ausência, segurança, ACLs e
  fingerprints no SQL gerado.

### Novos findings

#### F-R2-REMOTE-003 — HIGH — `search_path` vazio validado com representação incorreta

O preflight extrai `proconfig` e exige `search_path <> 'search_path='`. Para
funções configuradas com `SET search_path = ''`, o catálogo PostgreSQL usa a
representação `search_path=""`, conforme as migrations dos helpers. O guard
pode classificar funções válidas como `NO_GO` ou não validar corretamente o
requisito.

Correção esperada: normalizar e comparar explicitamente `search_path=""`, com
regressão para configuração vazia e não vazia.

#### F-R2-REMOTE-004 — HIGH — fingerprints e ACLs não participam da decisão

`buildImmediateContractPreflightQuery` coleta fingerprints e privilégios, mas
`evaluateImmediateContractPreflight` decide apenas por contagem de legados,
ausência dos alvos e `legacy_security_ok`. Não há comparação dos fingerprints,
ACLs ou grants retornados contra valores esperados. Uma definição ou permissão
divergente pode passar pelo guard.

Correção esperada: comparar fingerprints, ACLs, grants e atributos esperados na
avaliação, falhando fechado quando qualquer valor divergir; adicionar
regressões para fingerprint e ACL incompatíveis.

### Gates e decisão

- Testes direcionados: 33/33 PASS.
- `node --check`: PASS.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos.
- `git diff --check`: PASS.

Veredito: **CHANGES_REQUESTED**. Não executar a migration remota, SQL manual,
retry, reset, repair, alteração de ACL, push, merge ou deploy até responder
F-R2-REMOTE-003/004.

---

## Re-review independente — F-R2-REMOTE-003/004

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `596a2b59`
- Implementation: `UNCOMMITTED_WORKTREE`
- State revisado: `READY_FOR_REVIEW`
- Data: 2026-08-25

### Verificações

- `F-R2-REMOTE-003`: **RESOLVIDO**. A consulta e o avaliador exigem a
  representação PostgreSQL `search_path=""`, evitando aceitar a forma
  incorreta `search_path=`.
- `F-R2-REMOTE-004`: **RESOLVIDO**. O avaliador deixou de confiar em contagens:
  inspeciona cada linha dos dois legados e exige owner `postgres`,
  `SECURITY DEFINER`, `search_path=""`, fingerprint não vazio, sem EXECUTE
  para `anon` e com EXECUTE para `authenticated` e `service_role`; os quatro
  alvos precisam estar ausentes. A regressão cobre fingerprint ausente e alvo
  presente.
- `F-R2-REMOTE-001/002`: permanecem resolvidos. O envelope explícito
  `BEGIN`/`COMMIT` contém o `NOTIFY`, e o preflight imediato cobre os dois
  contratos legados e os quatro alvos.

### Evidências independentes

- Testes direcionados: `33/33 PASS`.
- `node --check` do preflight: `PASS`.
- `npm run docs:validate`: `PASS`, 0 bloqueios.
- `npm run review:gates`: `PASS`, 0 regressões bloqueantes e 47 itens baseline
  resolvidos.
- `git diff --check`: `PASS`.

### Decisão

**APPROVED**, limitado ao candidato e aos guardrails de aplicação descritos.
Esta aprovação autoriza somente uma futura chamada única da ferramenta
versionada `mcp__codex_apps__supabase_apply_migration`, após reconfirmação
imediata de identidade, ausência da migration e preflight completo. Timeout,
erro, resposta ambígua ou parcialidade exigem parada em
`OWNER_DECISION_REQUIRED`, sem retry. Pós-validação deve ser somente leitura.

A migration remota continua **NOT_RUN**. Não há comprovação de smoke
autenticado, PostgREST servido, RLS/cross-tenant, performance real ou produção.
Esta aprovação não autoriza SQL manual, outra migration, alteração de ACL fora
do candidato, reset, repair, push, merge, deploy ou secrets.
