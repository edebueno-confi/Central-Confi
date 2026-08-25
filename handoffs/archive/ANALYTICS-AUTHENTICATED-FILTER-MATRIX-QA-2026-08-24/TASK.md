# TASK

- Task: ANALYTICS-AUTHENTICATED-FILTER-MATRIX-QA-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: fa258809853f05a22ca48c7df8abf82e8ef17ef6
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

Escopo read-only local: validar, no runtime autenticado disponível, acesso ao
Dashboard Gerencial, abas por área, filtros de período/operação/grain, recálculo
por troca, ausência de dados stale, parâmetros/RPCs, console, rede e estados de
erro. Não alterar código, migrations, banco, secrets ou integrações externas.
Se a sessão autenticada não estiver disponível, registrar a limitação sem
solicitar ou expor credenciais. Finding F-QA-001 HIGH foi registrado: as RPCs
de Comercial/Suporte recebem assinatura de seis argumentos inexistente no
schema local atual e respondem PGRST202.
