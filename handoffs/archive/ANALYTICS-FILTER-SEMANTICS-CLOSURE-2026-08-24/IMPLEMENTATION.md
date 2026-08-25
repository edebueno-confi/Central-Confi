# IMPLEMENTATION

- Task: ANALYTICS-FILTER-SEMANTICS-CLOSURE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: aa32a7816ad34e6f6b1ece0582a94621da575d64
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

O Financeiro deixou de usar `draft`/`setDraft`; os controles leem `filters`,
a busca textual usa `debouncedClientQuery` e a consulta permanece dependente
da chave semântica. O preset é derivado dos filtros e o intervalo inválido não
é emitido.

Gates: teste direto 16/16, focused 350/350, web:typecheck PASS, build 946
módulos PASS, lint 0 erros/158 warnings legados, docs:validate PASS,
review:gates PASS e git diff --check PASS.
