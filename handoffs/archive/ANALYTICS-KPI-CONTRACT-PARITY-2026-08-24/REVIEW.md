# REVIEW

- Task: ANALYTICS-KPI-CONTRACT-PARITY-2026-08-24
- State: APPROVED
- Reviewer: Sentinel (Codex Independent Reviewer)
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 543e8e27a09706b733434788523c467ccbe2f2cd
- Reviewed state: READY_FOR_REVIEW
- Implementation SHA: UNCOMMITTED_WORKTREE
- Veredito: APPROVED para a correção client/server candidata e sua evidência estática; não autoriza aplicar migration, promover a integração servida ou executar ações remotas.

## Re-review independente

F-KPI-001 foi considerado resolvido no escopo revisado:

- A CTE `scoped` Comercial agora aplica `app_private.analytics_pipeline_operation_eligible('deal', c.hubspot_pipeline_id, current_setting('app.analytics_group_company', true), 'commercial')` junto com estágio e exclusões.
- A CTE `scoped` de Suporte aplica o predicado equivalente para `ticket` e `support`.
- Os wrappers de seis argumentos preservam `set_analytics_operation_scope(p_group_company)`, `security definer`, `search_path = ''`, revogações para `public`/`anon` e grants para `authenticated`/`service_role`.
- `Todas` continua representada pelo contexto vazio, e a operação selecionada usa a elegibilidade canônica server-side.
- A cobertura Node passou de 8/8 para 10/10 e o pgTAP candidato foi ampliado para 16 asserções, sem ser executado contra o banco porque a migration permanece não aplicada.

Ganho para o SaaS: a paridade pretendida deixa de depender somente do wrapper e passa a aplicar o recorte operacional no mesmo corpo server-side que calcula os KPIs, reduzindo o risco de mistura entre operações quando o contrato for aplicado.

## Decisão do re-review

`APPROVED` limitado ao diff, aos testes estáticos e à migration candidata. A resolução PostgREST, a paridade numérica servida e o comportamento em ambiente aplicado continuam pendentes de preflight e aplicação autorizados.

## Funcionalidade implementada ou melhorada

O lote melhora a propagação client-side de estágio e exclusões de pipeline entre Visão Geral, Comercial e Suporte, preserva a indisponibilidade honesta de Financeiro e não inventa dimensões para Customer Success.

Ganho para o SaaS: quando o contrato server-side for aplicado em ambiente compatível, as superfícies poderão usar o mesmo recorte operacional, reduzindo divergência de KPIs. A integração servida e a paridade numérica continuam pendentes de validação.

## Finding histórico preservado

O texto e as evidências abaixo registram a condição encontrada na revisão inicial, antes da correção de F-KPI-001. O finding permanece no histórico e está explicitamente marcado como resolvido no re-review.

### F-KPI-001 [HIGH] Candidata não aplica o escopo de operação no corpo dos KPIs filtrados (resolvido no re-review)

Evidência concreta:

- Em `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql:32-58`, a CTE `scoped` comercial filtra somente configuração ativa/não arquivada, owner, estágio e exclusões de pipeline. Não há `group_company`, `current_setting('app.analytics_group_company', true)` nem `app_private.analytics_pipeline_operation_eligible`.
- Em `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql:247-264`, a CTE `scoped` de Suporte tem a mesma ausência de escopo operacional.
- Os wrappers em `:470-520` chamam `set_analytics_operation_scope(p_group_company)`, mas os corpos filtrados não leem esse contexto. Portanto, selecionar uma operação pode retornar dados de outras operações em vez de manter o mesmo recorte dos snapshots.
- A migration vigente `20260822073000_analytics_pipeline_operation_governance_findings_v1.sql:63-84` demonstra que as definições efetivas V2 precisam da elegibilidade server-side por operação. A candidata não preserva esse predicado ao reconstruir os corpos.

Impacto: risco de KPI cross-operation e falsa paridade entre Visão Geral, Comercial e Suporte. Isso é incorreção de dados, não apenas limitação de resolução PostgREST.

Correção esperada:

1. Derivar os corpos candidatos das definições efetivas mais recentes, preservando a elegibilidade server-side, ou aplicar explicitamente o predicado canônico nas duas CTEs `scoped` com o contexto de operação.
2. Adicionar regressão determinística e pgTAP que comprovem a presença do predicado de operação nos dois corpos e a resolução exata dos wrappers de seis argumentos, além das verificações já existentes de estágio, exclusões e ACL.
3. Manter a migration não aplicada até novo preflight autorizado. Não usar dados servidos ou aprovação local como prova de paridade numérica.

## Validações da revisão inicial

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs`: 8/8 PASS.
- `git diff --check`: PASS.
- A análise estática independente encontrou zero referências a `analytics_pipeline_operation_eligible` ou `current_setting` dentro dos corpos `*_v2_filtered` candidatos.
- Os gates declarados de focused, typecheck, build, lint, docs e review permanecem registrados, mas não compensam o finding funcional.

## Validações do re-review

- `node --test tests/scripts/analytics-kpi-contract-parity.test.mjs`: 10/10 PASS.
- `git diff --check`: PASS.
- A análise estática confirmou o predicado canônico nas duas CTEs, o contexto `current_setting` e os wrappers de seis argumentos.
- Os gates declarados pelo Forge: focused 338/338, typecheck, build 946 módulos, lint sem erros, docs:validate e review:gates PASS.

## Limitações e segurança

A migration não foi aplicada, a resolução PostgREST e a paridade numérica servida não foram comprovadas, e RLS/cross-tenant, browser autenticado, produção e performance real permanecem fora do lote. Não houve banco, SQL manual, reset, seed, secrets, escrita externa, push, merge, deploy ou ação remota.

## Próximo responsável

Forge pode executar apenas `FINALIZE_LOCAL` seletivo do lote aprovado. A migration continua não aplicada e qualquer aplicação depende de preflight, identidade do alvo e autorização operacional separados.

## Histórico preservado

- O veredito anterior permanece arquivado em `handoffs/archive/ANALYTICS-AUTHENTICATED-RUNTIME-QA-2026-08-24/`.
