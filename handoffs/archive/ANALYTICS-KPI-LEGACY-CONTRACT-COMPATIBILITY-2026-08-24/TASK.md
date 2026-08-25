# TASK

- Task: ANALYTICS-KPI-LEGACY-CONTRACT-COMPATIBILITY-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 1e8bb51b262bf5746eedb41f24d79d98bfd0cb4a
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

Corrigir a divergência runtime das RPCs de KPI de Comercial e Suporte sem
aplicar migration. Quando estágio e exclusões de pipeline estiverem vazios,
usar a assinatura histórica de quatro argumentos, preservando o filtro de
operação. Quando esses filtros exigirem a assinatura de seis argumentos,
manter chamada explícita e estado fail-closed se o contrato ainda não existir.
Adicionar regressão determinística e validar o Dashboard autenticado local.
Não alterar migration, banco canônico/remoto, secrets ou integrações externas.

Entrega concluída para revisão independente. A validação runtime autenticada
confirmou que o caminho legado de quatro argumentos responde 200 quando estágio
e exclusões estão vazios, preservando p_group_company para o filtro de operação.
