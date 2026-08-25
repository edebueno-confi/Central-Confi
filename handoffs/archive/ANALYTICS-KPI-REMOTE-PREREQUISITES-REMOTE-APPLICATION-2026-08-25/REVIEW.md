# REVIEW

## Finalização canônica

Veredito vigente: **APPROVED**, limitado ao lote dos helpers KPI, à
reconciliação oficial do tracking e à finalização local seletiva. O Sentinel
confirmou a pós-validação read-only; não há autorização para aplicar a
migration de contrato KPI, executar SQL manual, retry, reset, repair adicional,
push, merge, deploy ou release.

## Canonical re-review handoff

State: `READY_FOR_REVIEW`; Owner: `Sentinel`; Role: `REVIEWER`; Reviewer active:
`Sentinel`; Agent coordination: `REVIEW_ACTIVE`. Os findings históricos abaixo
foram preservados. F-REMOTE-PREREQ-APP-003 está respondido nos handoffs
canônicos pela ferramenta MCP única.

- Task: ANALYTICS-KPI-REMOTE-PREREQUISITES-REMOTE-APPLICATION-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 48f8f5bb
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- State: CHANGES_REQUESTED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD

## Evidências conferidas

- Allowlist limitada à migration dos helpers, relatório e handoffs; a
  migration de contrato `20260824210000` permanece fora do lote.
- O plano exige reconfirmar `ConfiOne / jzmmvfcmruasqmrdmbup`, a ausência da
  versão `20260825123000`, uma única chamada da ferramenta versionada e
  validações pós-aplicação somente por leitura.
- A migration contém preflight fail-closed e não inclui DML de dados, `DROP`,
  `TRUNCATE`, `NOTIFY` ou SQL manual fora da migration.
- Gates registrados: `node --check` PASS, `npm run docs:validate` PASS sem
  bloqueios, `npm run review:gates` PASS sem regressões bloqueantes e
  `git diff --check` PASS.
- Nenhuma escrita remota foi executada nesta revisão.

## Findings

### F-REMOTE-PREREQ-APP-001 — HIGH — atomicidade da ferramenta não comprovada

O plano exige abortar em caso de parcialidade ou incerteza de atomicidade, mas
não identifica a ferramenta versionada nem apresenta evidência verificável de
que a chamada remota executa a migration como uma unidade transacional e deixa
o estado conhecido após erro, timeout ou resposta ambígua.

Correção esperada: registrar a ferramenta exata, seu contrato de atomicidade,
o comportamento em erro/timeout e o critério objetivo de encerramento em
`OWNER_DECISION_REQUIRED`, sem retry automático ou nova chamada para o mesmo
alvo.

### F-REMOTE-PREREQ-APP-002 — HIGH — preflight final insuficiente antes de `CREATE OR REPLACE`

O preflight anterior confirmou helpers existentes e compatíveis, mas o plano
final reconfirma apenas identidade e ausência da versão. A migration usa
`CREATE OR REPLACE FUNCTION` e `REVOKE`; uma deriva entre o preflight anterior e
a escrita poderia substituir definição ou ACL sem ser detectada.

Correção esperada: imediatamente antes da única aplicação, reconfirmar por
leitura os quatro helpers, definições/assinaturas, owner, `SECURITY DEFINER`,
`search_path`, ACLs e semântica já aprovados, abortando se qualquer item
divergir. Registrar também que wrappers KPI de seis argumentos continuam fora
do lote e ausentes não devem ser tratados como aplicação parcial bem-sucedida.

## Veredito

`CHANGES_REQUESTED`. A aplicação remota permanece proibida até os dois
findings serem respondidos em handoff revisável. Não executar migration, SQL
manual, retry, reset, repair, alteração de ACL, push, merge, deploy ou ação
externa.

## Re-review independente — 2026-08-25

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 48f8f5bb
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- State: CHANGES_REQUESTED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD

### Resposta aos findings

- `F-REMOTE-PREREQ-APP-001`: **PARCIALMENTE RESPONDIDO**. O envelope
  `BEGIN`/`COMMIT`, a chamada única, a ausência de retry e o encerramento em
  `OWNER_DECISION_REQUIRED` foram documentados. A atomicidade do transporte
  continua explicitamente não comprovada; qualquer resposta ambígua deve
  permanecer bloqueante.
- `F-REMOTE-PREREQ-APP-002`: **RESPONDIDO COMO CRITÉRIO**. O preflight
  imediatamente anterior foi especificado com quatro helpers, assinaturas,
  owners, segurança, `search_path`, ACLs, grants, fingerprint de
  `pg_get_functiondef` e probes read-only antes de qualquer substituição.

### Novo finding

#### F-REMOTE-PREREQ-APP-003 — HIGH — ferramenta de aplicação contraditória

Historical finding from the prior review pass. It is preserved for traceability
and is superseded by the current MCP-only canonical handoff above.

`TASK.md` exige `supabase@2.114.0 db push`, com `--dry-run`, `--skip-vault`,
`--project-ref` explícito e workdir temporário. Porém, o relatório e
`IMPLEMENTATION.md` declaram que a chamada efetiva será
`mcp__codex_apps__supabase_apply_migration`, com argumentos diferentes. São
procedimentos distintos, com evidências e garantias operacionais diferentes.

Correção esperada: escolher uma única ferramenta autorizada, alinhar
TASK/IMPLEMENTATION/relatório e documentar exatamente seus argumentos,
pré-validação, retorno, timeout, estado ambíguo e pós-leituras. Não executar
enquanto a contradição persistir.

### Gates e decisão

- Teste específico do shadow: 4/4 PASS.
- `node --check`: PASS.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `git diff --check`: PASS.

Veredito atualizado: **CHANGES_REQUESTED**. A aplicação remota continua
proibida. Não executar migration, SQL manual, retry, reset, repair, alteração
de ACL, push, merge ou deploy até alinhar a ferramenta e responder o finding.

## Re-review final independente — 2026-08-25

- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 48f8f5bb
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW
- State: APPROVED, condicionado aos guardrails documentados
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD

### Verificações

- TASK, IMPLEMENTATION e STATUS estão consistentes em
  `READY_FOR_REVIEW`, Owner Sentinel, Role REVIEWER e `REVIEW_ACTIVE`.
- Os três artefatos de execução usam exclusivamente
  `mcp__codex_apps__supabase_apply_migration` com `project_id`, `name` e
  `query` explícitos. A menção a `db push` permanece apenas como ferramenta
  proibida.
- F-REMOTE-PREREQ-APP-001 foi respondido como limitação controlada: a
  migration tem `BEGIN`/`COMMIT`, a chamada é única e qualquer erro, timeout,
  desconexão, resposta ambígua ou dúvida de parcialidade encerra em
  `OWNER_DECISION_REQUIRED`, sem retry.
- F-REMOTE-PREREQ-APP-002 foi respondido com preflight imediato dos quatro
  helpers, incluindo assinatura, retorno, owner, `prosecdef`,
  `proconfig/search_path`, ACLs, grants, fingerprint de
  `pg_get_functiondef` e probes semânticos read-only antes da aplicação.
- F-REMOTE-PREREQ-APP-003 está preservado como histórico superseded; não há
  contradição vigente de ferramenta nos handoffs canônicos.
- A migration de contrato `20260824210000` permanece fora do lote. A aplicação
  continua `NOT_RUN`.

### Gates

- Teste específico do shadow: 4/4 PASS.
- `node --check`: PASS.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `git diff --check`: PASS.

### Veredito e limites

Veredito: **APPROVED**, limitado a uma única aplicação da migration dos
helpers via a ferramenta MCP declarada, somente após reconfirmação de
identidade, ausência da versão e preflight imediato aprovado. Sucesso só pode
ser declarado após pós-leituras coerentes de histórico, funções, segurança,
ACLs e semântica.

Esta aprovação não autoriza retry, SQL manual, aplicação da migration de
contrato, alteração de ACL fora da migration, reset, repair, rebuild, secrets,
push, merge ou deploy. Smoke HTTP autenticado, PostgREST, RLS/cross-tenant,
performance, produção e equivalência remota continuam não comprovados.
