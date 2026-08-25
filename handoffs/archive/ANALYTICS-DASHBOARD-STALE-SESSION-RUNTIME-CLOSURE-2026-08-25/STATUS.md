# STATUS

- Task: ANALYTICS-DASHBOARD-STALE-SESSION-RUNTIME-CLOSURE-2026-08-25
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: FINALIZING
- Base SHA: 73462fe00964f992a039a0de442eb7b838c80d43
- Implementation SHA: UNCOMMITTED_WORKTREE
- Review verdict: APPROVED, limitado ao harness read-only e às regressões determinísticas

Task promovida sequencialmente após a finalização local aprovada da Task 85.
O escopo é somente o gate read-only e sua evidência; o comportamento de
autenticação do produto permanece fora do lote.

F-STALE-001 respondido. A lógica agora exige uma única resposta POST 400 de
`/auth/v1/token`, um único diagnóstico 400 e correspondência exata desse
diagnóstico sanitizado; endpoint diferente, ausência da resposta ou diagnóstico
adicional permanece bloqueando.

F-STALE-002 respondido. `isExpectedStaleAuthResponse` só retorna verdadeiro
quando o item possui exatamente uma resposta `POST /auth/v1/token` 400. Com
duas respostas, nenhuma é excluída de `contractFailures`, mantendo
`NO_GO`/`failClosed=true`. A regressão determinística cobre a repetição.
Task devolvida ao Sentinel para re-review. Não autoriza alteração do
comportamento de autenticação nem ações remotas.

Re-review formal concluído pelo Sentinel. F-STALE-002 está resolvido: duas ou
mais respostas `POST /auth/v1/token` 400 não são aceitas como refresh stale
esperado, ativam `staleRefreshLoopDetected` e mantêm `NO_GO`/`failClosed=true`.
F-STALE-001 permanece resolvido. Teste específico 8/8, focused 358/358,
`node --check`, `docs:validate`, `review:gates` e `git diff --check` passaram.
A matriz browser não foi reexecutada nesta alteração determinística; a
execução anterior com diagnóstico genérico continua `NO_GO`. Veredito:
`APPROVED`, limitado ao harness read-only e sem aprovação do runtime
autenticado, produção ou ações remotas. Forge é o responsável pelo próximo
passo local.
