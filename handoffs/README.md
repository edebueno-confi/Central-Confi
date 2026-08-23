# Handoffs entre Forge e Sentinel

## Finalidade

Este diretório é a interface persistente de colaboração entre:

- Forge, alias operacional do Codex, Senior Software Engineer / Implementer;
- Sentinel, Independent Code Reviewer / Principal Engineer ativo.

Referências a Codex e Claude em pacotes históricos permanecem preservadas. Claude
continua disponível para auditoria retroativa quando retornar, mas não bloqueia a
fila enquanto `Reviewer active = Sentinel`.

O handoff é baseado no repositório, não no histórico de conversas. O código, os
commits, os SHAs, os documentos, os testes e as evidências são a fonte compartilhada.

As decisões duráveis do proprietário estão em
[`docs/engineering/OWNER_DECISIONS.md`](../docs/engineering/OWNER_DECISIONS.md)
e devem ser consultadas quando a fila ou o protocolo dependerem de autorização
operacional.

## Estrutura

    handoffs/
      README.md
      current/
        TASK.md
        IMPLEMENTATION.md
        REVIEW.md
        STATUS.md
      archive/
      pacotes históricos ou específicos de domínio/

current/ contém uma única tarefa ativa. archive/ contém pacotes encerrados,
preservados para auditoria. Pacotes históricos existentes não devem ser apagados
nem tratados como estado corrente sem leitura e classificação.

## Fluxo

1. O proprietário ou Forge preenche current/TASK.md.
2. STATUS.md passa a READY_FOR_IMPLEMENTATION.
3. Forge muda para IMPLEMENTING, executa o lote e atualiza IMPLEMENTATION.md.
4. Forge executa as validações reais e muda para READY_FOR_REVIEW. Quando o
   lote já estiver autorizado para auto-revisão, pode usar `VALIDATING` para
   registrar os gates finais antes do veredito.
5. Imediatamente após entregar `READY_FOR_REVIEW`, Forge notifica Sentinel com
   task, estado, Owner, SHAs, allowlist, gates, limitações e ação esperada. A
   mensagem é apenas uma transferência operacional e não substitui os quatro
   artefatos canônicos.
6. Sentinel lê TASK, IMPLEMENTATION, diff, contratos e evidências, muda para
   REVIEWING e escreve REVIEW.md. Claude permanece como reviewer histórico ou de
   auditoria posterior. Se o proprietário tiver ativado
   `OWNER_AUTHORIZED_SELF_REVIEW`, Codex assume `Role: REVIEWER` em uma rodada
   separada e registra essa limitação no REVIEW.md.
7. O reviewer designado em STATUS.md registra APPROVED, REQUEST_CHANGES ou
   BLOCKED.
8. REQUEST_CHANGES devolve o lote a Forge, que usa findings válidos e muda para
   FIXING.
9. Depois da correção, Forge atualiza IMPLEMENTATION, preserva REVIEW histórico
   dentro do ciclo e retorna a READY_FOR_REVIEW.
10. Em lote com `Approval = APPROVED`, `APPROVED` aciona automaticamente
   `FINALIZE_LOCAL`: validar escopo e gates, criar commit local exclusivo,
   registrar SHA, arquivar o handoff e normalizar current/ para `IDLE`.
11. O fluxo operacional completo é `IMPLEMENTING -> VALIDATING -> APPROVED ->
    FINALIZING_LOCAL -> COMPLETED -> IDLE -> próxima tarefa elegível`.
12. Push, merge, pull request, deploy, migration remota, produção, secrets e
    release surface continuam bloqueados. `DONE` permanece como classificação
    da fila após o checkpoint local concluído.

## Coordenação explícita entre agentes

Quando Forge estiver executando uma decisão, diagnóstico ou lote local que
exija exclusividade temporária, ele deve registrar no início de
`handoffs/current/STATUS.md`:

```text
Agent coordination: HOLD
Hold owner: Forge
Hold reason: <motivo objetivo>
Hold scope: <agentes, tasks ou ações pausadas>
Hold started: <data e hora local>
Resume condition: <evento ou gate que libera a retomada>
```

Enquanto `Agent coordination: HOLD` estiver vigente, Sentinel, heartbeats e
outros agentes não devem iniciar, promover, revisar ou alterar arquivos dentro
do escopo pausado. Eles podem apenas ler o estado, registrar que encontraram o
HOLD e aguardar a condição de retomada. O HOLD não suspende proibições de
segurança nem autoriza ações externas.

Ao liberar a pausa, Forge deve substituir o bloco por um estado explícito,
como `Agent coordination: REVIEW_ACTIVE`, `READY_FOR_IMPLEMENTATION` ou
`IDLE`, registrar a condição atendida e notificar o próximo papel. A ausência
do bloco não deve ser interpretada como autorização para trabalho concorrente:
o agente deve seguir `State`, `Owner`, `Approval` e a allowlist dos quatro
artefatos canônicos.

Se a tarefa corrente exigir revisão independente, o estado correto é
`Agent coordination: REVIEW_ACTIVE`, com `Owner` igual ao reviewer designado.
Nesse caso, não usar `HOLD` para impedir a revisão obrigatória.

## Notificação por evento e heartbeat de recuperação

A coordenação normal é orientada a eventos. Ao concluir, devolver para revisão
ou encontrar um bloqueio, o agente responsável deve:

1. atualizar `TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md` conforme
   o papel e a transição real;
2. avisar diretamente o próximo agente responsável;
3. avisar o coordenador, Codex, com task, estado, SHA observado, gates,
   findings ou bloqueio e ação esperada.

Forge deve avisar Sentinel e Codex ao entregar, corrigir ou bloquear uma task.
Sentinel deve avisar Forge e Codex ao concluir uma revisão, com o veredito e os
findings. A mensagem é uma notificação operacional e não substitui os arquivos
canônicos, que continuam sendo a fonte de verdade para retomada após falha,
desconexão ou troca de agente.

Os heartbeats recorrentes de Forge, Sentinel e Codex Orquestrador são apenas
mecanismos de recuperação. Devem usar intervalo de 30 minutos, reler o estado
atual e agir somente quando não houver uma notificação já processada e os gates
permitirem a transição. Não devem duplicar execução, aprovação ou revisão em
andamento.

Para lotes previamente autorizados na fila, `APPROVED` autoriza o Forge a
executar `FINALIZE_LOCAL`, criar o checkpoint Git local exclusivo do lote,
arquivar o handoff e promover o próximo item elegível sem nova autorização
conversacional. O stage deve ser seletivo e baseado na allowlist do lote. Essa
autorização não inclui push, force push, merge, pull request, deploy, migration
remota, alteração de secrets ou release surface. Se alterações preexistentes
não puderem ser separadas com segurança, registrar `OWNER_DECISION_REQUIRED` e
interromper.

## Fila canônica de trabalho — ciclo prolongado 2026-08-21

O proprietário autorizou a execução sequencial desta fila. Esta tabela é a fila
canônica, mantida neste README para não criar um segundo sistema operacional.
Ela representa o trabalho futuro; `handoffs/current/` continua sendo a fonte da
tarefa ativa e de seu estado detalhado.

`Approval = APPROVED` significa autorização do proprietário para execução
autônoma. Isso não ignora dependências: Forge nunca executa item em `State =
PROPOSED`, e somente um item pode estar `ACTIVE` por vez.

| Ordem | Task ID | Project | Title | Priority | State | Approval | Dependencies | Origin | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | O-01 | ConfiOne | Baseline e veredito legado em `.review/` | P1 | DONE | APPROVED | — | Owner decision 2026-08-20 | Artefatos legados materializados e divergência documental resolvida. |
| 2 | R-01 / R01-B | ConfiOne | Negação de acesso e feedback pós-login | P1 | DONE | APPROVED | O-01 | Owner queue 2026-08-20 | Denial context preservado sem autorizar nova release surface. |
| 3 | R-03 | ConfiOne | Feedback de erro no Support Workspace | P1 | DONE | APPROVED | R-01 / R01-B | Owner queue 2026-08-20 | Falhas auxiliares visíveis; integrado em `1ea22b2`. |
| 4 | DEV-CONTROL-MVP | ConfiOne / Engineering | Development Control Plane MVP read-only | P0 | DONE | APPROVED | R-03 | Owner request 2026-08-20 | Aprovado no ciclo 5; handoff arquivado para integração aplicável. |
| 5 | R-11 | ConfiOne | Scripts npm que apontam para arquivos inexistentes | P1 | DONE | APPROVED | DEV-CONTROL-MVP | Owner queue 2026-08-20 | Aprovado no ciclo 2 e integrado em checkpoint local; handoff arquivado. |
| 6 | R-14 | ConfiOne | Deny-all intencional para tabelas RLS sem policy | P1 | DONE | APPROVED | R-11 | Owner queue 2026-08-20 | APPROVED; checkpoint local exclusivo `6eec6d7` e arquivamento executados por FINALIZE_LOCAL. |
| 7 | CONTROL-PLANE-BACKLOG-2026-08-21 | ConfiOne / Engineering | Materializar backlog prolongado e estados de elegibilidade | P0 | DONE | APPROVED | R-14 | Owner mission 2026-08-21 | Registrar a decomposição normativa sem tocar no produto e preparar a primeira task do ciclo. |
| 8 | DATA-OPERATION-SCOPE-2026-08-21 | ConfiOne / Analytics | Auditar e fechar o filtro de Operação ponta a ponta | P1 | DONE | APPROVED | CONTROL-PLANE-BACKLOG-2026-08-21 | Owner mission 2026-08-21 | APPROVED no ciclo 2; checkpoint local `4219a0cd26a70c74fb11e5bcaea11db16b4ae14c`; handoff arquivado. |
| 9 | DATA-PIPELINE-STAGE-SCOPE-2026-08-21 | ConfiOne / Analytics | Formalizar compatibilidade Operação → Pipeline → Stage | P1 | DONE | APPROVED | DATA-OPERATION-SCOPE-2026-08-21 | Owner mission 2026-08-21 | APPROVED no ciclo 1; checkpoint local `c7c700d`; handoff arquivado. |
| 10 | DATA-TEMPORAL-SEMANTICS-2026-08-21 | ConfiOne / Analytics | Separar criado no período de existente no período | P1 | DONE | APPROVED | DATA-OPERATION-SCOPE-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; checkpoint local exclusivo `8d9e7da1c70d1aee8aad21e4e0896c3bf325d2d2`; handoff arquivado. |
| 11 | COMMERCIAL-RECONCILIATION-2026-08-21 | ConfiOne / Comercial | Reconciliar totais, perdidos e fechados | P1 | DONE | APPROVED | DATA-PIPELINE-STAGE-SCOPE-2026-08-21, DATA-TEMPORAL-SEMANTICS-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; implementação integrada em `0f603b7`; handoff arquivado. P-COMM-001 permanece PROPOSED fora do lote. |
| 12 | COMMERCIAL-CONVERSION-SEMANTICS-2026-08-21 | ConfiOne / Comercial | Formalizar cálculo de conversão e impedir percentuais impossíveis | P1 | DONE | APPROVED | DATA-PIPELINE-STAGE-SCOPE-2026-08-21, DATA-TEMPORAL-SEMANTICS-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; checkpoint local exclusivo `63efe05f566dd63a2a74e7d4089abf14fa381373`; handoff arquivado. |
| 13 | COMMERCIAL-OWNER-STAGE-2026-08-21 | ConfiOne / Comercial | Corrigir filtro de estágio por responsável | P1 | DONE | APPROVED | DATA-PIPELINE-STAGE-SCOPE-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; checkpoint local exclusivo `19648adf0fda2b82fe7481bba7c98651084b5d8a`; handoff arquivado. |
| 14 | OVERVIEW-SNAPSHOT-FLOW-2026-08-21 | ConfiOne / Dashboard | Separar Agora de No período | P1 | DONE | APPROVED | DATA-TEMPORAL-SEMANTICS-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `f26ef07c3f507640c37ac4f488c0a240a7b7cb9d`; handoff arquivado. |
| 15 | OVERVIEW-QUEUE-SEMANTICS-2026-08-21 | ConfiOne / Dashboard | Resolver a duplicidade de Fila atual | P1 | DONE | APPROVED | DATA-OPERATION-SCOPE-2026-08-21, DATA-TEMPORAL-SEMANTICS-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `06b24742013dfcd3e74c805b3a8754bd2c632581`; handoff arquivado. |
| 16 | KPI-REGISTRY-2026-08-21 | ConfiOne / Analytics | Consolidar registro canônico de KPIs | P1 | DONE | APPROVED | COMMERCIAL-RECONCILIATION-2026-08-21, COMMERCIAL-CONVERSION-SEMANTICS-2026-08-21, OVERVIEW-SNAPSHOT-FLOW-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `de314b56ca57202290bbbd332a469bb1ffcb8afa`; handoff arquivado. |
| 17 | COMMERCIAL-EVOLUTION-2026-08-21 | ConfiOne / Comercial | Estruturar evolução e comparação temporal | P2 | DONE | APPROVED | KPI-REGISTRY-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `d3f26bfe6ac22f06376c5797c48d6b1221366cf2`; handoff arquivado. |
| 18 | COMMERCIAL-GOALS-MRR-2026-08-21 | ConfiOne / Comercial | Criar fundação de metas financeiras/MRR | P2 | DONE | APPROVED | KPI-REGISTRY-2026-08-21, COMMERCIAL-EVOLUTION-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `158069d34d6ab191177cfab32d77fa5349ba9d91`; handoff arquivado. P-COMM-EVOLUTION-001 permanece PROPOSED fora do lote. |
| 19 | COMMERCIAL-PREDICTION-2026-08-21 | ConfiOne / Comercial | Criar Predição explicável baseada em dados | P2 | DONE | APPROVED | COMMERCIAL-GOALS-MRR-2026-08-21, COMMERCIAL-RECONCILIATION-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `fd2a0407601b77004baf75c227cf057c2740b6da`; handoff arquivado. |
| 20 | CONTRACT-EXPIRY-2026-08-21 | ConfiOne / Customer Success | Investigar contratos próximos do vencimento | P2 | DONE | APPROVED | KPI-REGISTRY-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `6511d8ef0a5a270a02133b677cf2ae8f2c73dd1c`; handoff arquivado. |
| 21 | CS-DOMAIN-AUDIT-2026-08-21 | ConfiOne / Customer Success | Auditar carteira, risco, churn, expansão e renovação | P2 | DONE | APPROVED | KPI-REGISTRY-2026-08-21, CONTRACT-EXPIRY-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `8c3eff708811bcb19e28e56dbafda6131d89ea35`; handoff arquivado. Health Score upstream e inventário de APIs documentados; ingestão permanece lote futuro. |
| 22 | SUPPORT-DOMAIN-AUDIT-2026-08-21 | ConfiOne / Support | Auditar fila, SLA, aging, prioridade e operação | P1 | DONE | APPROVED | KPI-REGISTRY-2026-08-21 | Owner mission 2026-08-21 | Finalizada localmente em `55c097e18016ecdcf8d561a8b46980f771e6acf2`; handoff arquivado. |
| 23 | FINANCE-DOMAIN-AUDIT-2026-08-21 | ConfiOne / Financeiro | Auditar recebido, a receber, vencido e aging | P1 | DONE | APPROVED | KPI-REGISTRY-2026-08-21, CONTRACT-EXPIRY-2026-08-21 | Owner mission 2026-08-21 | Finalizada localmente em `f8cb344b7feac2b0dc4bcba42c86b0a28af88f4c`; handoff arquivado. |
| 24 | PRODUCT-DEV-DOMAIN-AUDIT-2026-08-21 | ConfiOne / Produto | Auditar indicadores de Produto e Desenvolvimento | P1 | DONE | APPROVED | KPI-REGISTRY-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `a1265a80f98095c56a60355327f7f06dd1912cd9`; handoff arquivado. |
| 25 | OVERVIEW-GOVERNANCE-DENSITY-2026-08-21 | ConfiOne / Dashboard | Reorganizar Atenção, Governança e cobertura | P1 | DONE | APPROVED | CS-DOMAIN-AUDIT-2026-08-21, SUPPORT-DOMAIN-AUDIT-2026-08-21, FINANCE-DOMAIN-AUDIT-2026-08-21, PRODUCT-DEV-DOMAIN-AUDIT-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; checkpoint local exclusivo `60bff9577de1bb4477d096e2989dae3d392df782`; handoff arquivado. |
| 26 | DASHBOARD-UX-DENSITY-2026-08-21 | ConfiOne / Dashboard | Refinar densidade e qualidade de decisão | P1 | DONE | APPROVED | OVERVIEW-GOVERNANCE-DENSITY-2026-08-21, COMMERCIAL-EVOLUTION-2026-08-21 | Owner mission 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `56e5fd3b0a5812fac6f22572f136b2feb82fd8e1`; handoff arquivado. |
| 27 | ANALYTICS-METRIC-METHODOLOGY-2026-08-21 | ConfiOne / Analytics | Documentar metodologia e proveniência dos KPIs | P1 | DONE | APPROVED | KPI-REGISTRY-2026-08-21, COMMERCIAL-CONVERSION-SEMANTICS-2026-08-21 | Owner request 2026-08-21; finalizada localmente em `0f514f9f1509c081f3f422212c856e7f64179656` após aprovação do Sentinel | Registry canônico reconciliado com fontes executáveis, campos/datas, coortes, fórmulas, cobertura, frescor, filtros e limitações; handoff arquivado sem alteração de runtime. |
| 28 | ANALYTICS-METRIC-CONTEXT-UI-2026-08-21 | ConfiOne / Dashboard | Expor metodologia dos indicadores na interface | P1 | DONE | APPROVED | ANALYTICS-METRIC-METHODOLOGY-2026-08-21, KPI-REGISTRY-2026-08-21 | Owner request 2026-08-21; finalizado localmente após APPROVED do Sentinel; commit `da206123b77c7cfab6ee10ffe32fa3b7b8f7b498` | Exibir contexto acessível junto aos KPIs usando apenas o contrato existente: coorte, campo de data, período, filtros, fonte, frescor, cobertura, estado e ressalvas; sem regra de negócio no frontend e sem criar segunda fonte de verdade. |
| 29 | AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21 | ConfiOne / Identity & Access | Reproduzir e corrigir administrador válido recebendo Acesso negado | P1 | DONE | APPROVED | —; handoff aberto após finalização da task 26 | Owner request 2026-08-21 | APPROVED por Sentinel; commit local exclusivo `0581660ae9b617845b66160dfa6059616cabecce`; handoff arquivado. |
| 30 | AUTH-MODEL-INVENTORY-2026-08-21 | ConfiOne / Identity & Access | Mapear fluxo e modelo atual de autorização | P1 | DONE | APPROVED | AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21 | Owner decision OD-007 2026-08-22 | APPROVED por Sentinel; checkpoint local exclusivo; inventário factual arquivado. Não iniciou simplificação estrutural. |
| 31 | AUTH-MODEL-AUDIT-2026-08-21 | ConfiOne / Identity & Access | Auditar complexidade, redundâncias e regras legadas | P1 | DONE | APPROVED | AUTH-MODEL-INVENTORY-2026-08-21 | Owner request 2026-08-21; promoção sequencial autorizada por OD-008 após inventário `APPROVED` e handoff `IDLE` | Auditoria documental aprovada pelo Sentinel; matriz factual, semântica limitada de `platform_admin`, itens não removíveis, contraexemplos e decisões pendentes arquivados. Sem simplificação estrutural. |
| 32 | AUTH-SCREEN-REGISTRY-2026-08-21 | ConfiOne / Identity & Access | Definir registry canônico de áreas, telas, rotas e capabilities | P1 | DONE | APPROVED | AUTH-MODEL-AUDIT-2026-08-21 | Owner request 2026-08-21; promoção sequencial autorizada por OD-008 após audit `APPROVED` e handoff `IDLE` | Registry documental aprovado pelo Sentinel; capability `analytics.view` reconciliada, papel `dashboard_viewer` separado e superfícies não publicadas explicitamente classificadas. Sem alteração de runtime. |
| 33 | AUTH-TARGET-ACCESS-CONTRACT-2026-08-21 | ConfiOne / Identity & Access | Especificar modelo simplificado de nível, área, tela e READ/WRITE | P1 | DONE | APPROVED | AUTH-MODEL-AUDIT-2026-08-21, AUTH-SCREEN-REGISTRY-2026-08-21 | Handoff arquivado e concluído localmente no checkpoint `d1f7793`; a especificação foi entregue sem implementar o modelo executável | Especificação documental concluída: níveis, precedência, `WRITE` implica `READ`, deny by default, escopo tenant/área, auditoria, proteção do último admin, sessão stale e de-para. O modelo executável permanece na task futura 53. |
| 34 | AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21 | ConfiOne / Identity & Access | Consolidar resolução de autorização, menu e route guards | P1 | DONE | APPROVED | AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21, AUTH-SCREEN-REGISTRY-2026-08-21, AUTH-TARGET-ACCESS-CONTRACT-2026-08-21 | Owner request 2026-08-21 | Fazer menu, landing, router, página e backend consumirem a mesma autorização efetiva, com fallback válido e sem loops. Commit local exclusivo após revisão Sentinel. |
| 35 | AUTH-ADMIN-CONSOLE-SIMPLIFICATION-2026-08-21 | ConfiOne / Identity & Access | Simplificar linguagem do painel administrativo de usuários e acessos | P2 | DONE | APPROVED | AUTH-TARGET-ACCESS-CONTRACT-2026-08-21, AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21 | OD-012 2026-08-22; execução restrita à UI, sem unificar o modelo executável | Usar linguagem de produto na AccessPage, sem claims, scopes, IDs, policy IDs ou configurações ocultas. Fontes e flags atuais permanecem autoridade; modelo Nível → Área → Tela → READ/WRITE fica em task futura. Commit local `a1c6993`. |
| 36 | AUTH-LEGACY-MIGRATION-SAFEGUARDS-2026-08-21 | ConfiOne / Identity & Access | Normalizar usuários e permissões existentes com de-para seguro | P1 | DONE | APPROVED | AUTH-TARGET-ACCESS-CONTRACT-2026-08-21, AUTH-ADMIN-CONSOLE-SIMPLIFICATION-2026-08-21 | OD-008; promoção sequencial após task 35 aprovada; fase inicial somente documental/read-only | Auditar e classificar o de-para atual, riscos de perda de acesso, escalada de privilégio, último administrador e stale. Nenhuma migration, grant, RLS/RPC ou escrita será executada nesta fase sem autorização específica. Commit local `f444a95`. |
| 37 | AUTH-SECURITY-REGRESSION-2026-08-21 | ConfiOne / Identity & Access | Validar autorização funcional, segurança e regressão ponta a ponta | P1 | DONE | APPROVED | AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21, AUTH-MODEL-INVENTORY-2026-08-21, AUTH-MODEL-AUDIT-2026-08-21, AUTH-SCREEN-REGISTRY-2026-08-21, AUTH-TARGET-ACCESS-CONTRACT-2026-08-21, AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21, AUTH-ADMIN-CONSOLE-SIMPLIFICATION-2026-08-21, AUTH-LEGACY-MIGRATION-SAFEGUARDS-2026-08-21 | OD-008; aprovado por Sentinel e finalizado localmente em `cce0fdd`; fase read-only preservou limitações de cobertura | Matriz e testes locais para bypass, deny by default, perfil inativo, fallback e contexto. WRITE, stale real, revogação em sessão carregada e cross-tenant ponta a ponta permanecem não comprovados; sem alteração de autorização. |
| 38 | R1-MY-SPACE-SAFE-LANDING-2026-08-21 | ConfiOne / Release 1 | Consolidar Meu Espaço como safe landing universal | P1 | DONE | APPROVED | AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21 | OD-008; aprovado por Sentinel e finalizado localmente em `66952d62c286eb4db38e049c34f90b199a66319f` | `/inicio` publicado como landing neutra, sem redirect indevido para Analytics, sem SupportGate, com proteção de sessão expirada e fallback seguro. QA browser autenticado permanece pendente. |
| 39 | R1-SHELL-NAV-AUTH-INTEGRATION-2026-08-21 | ConfiOne / Release 1 | Fechar shell, navegação e autorização integrada | P1 | DONE | APPROVED | AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21, R1-MY-SPACE-SAFE-LANDING-2026-08-21 | OD-008; aprovado por Sentinel e finalizado localmente em `9cafdaf3b30d9581821a519933b5d74e0763dd32` | Shell, menu, busca e guards reconciliados por testes focused; sem alteração de runtime, autorização ou shell visual. QA browser autenticado permanece pendente. |
| 40 | R1-DASHBOARD-RELEASE-GATE-2026-08-21 | ConfiOne / Release 1 | Fechar Dashboard Gerencial completo | P1 | DONE | APPROVED | OVERVIEW-GOVERNANCE-DENSITY-2026-08-21, DASHBOARD-UX-DENSITY-2026-08-21, ANALYTICS-METRIC-METHODOLOGY-2026-08-21, ANALYTICS-METRIC-CONTEXT-UI-2026-08-21, SUPPORT-DOMAIN-AUDIT-2026-08-21, FINANCE-DOMAIN-AUDIT-2026-08-21, PRODUCT-DEV-DOMAIN-AUDIT-2026-08-21, R1-INTEGRATION-CALL-QUALITY-2026-08-21, DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21, R1-UTF8-ENCODING-INTEGRITY-2026-08-21 | OD-008/OD-011; aprovado por Sentinel e finalizado localmente em `0e7d7c1bccb2aed0b0fd9eb673d4e2eb72fcb230` | Gate auditável das seis abas, filtros, coortes, frescor, estados, refresh/503 e visualizações; Produto/Desenvolvimento explicitamente indisponível e Financeiro fora do filtro operacional. |
| 41 | R1-CONFIGURATION-OPERATIONS-2026-08-21 | ConfiOne / Release 1 | Fechar Configurações operacionais | P1 | DONE | APPROVED | AUTH-RESOLUTION-GUARDS-NAVIGATION-2026-08-21 | OD-008; promoção sequencial após task 40 aprovada | Integrações, Governança de Dados, Histórico de Sincronizações e Marcas funcionam dentro da boundary de segurança e exibem cobertura, integridade, dependências e resultados reais. |
| 42 | R1-HELP-ADMIN-RELEASE-GATE-2026-08-21 | ConfiOne / Release 1 | Fechar Central de Ajuda administrativa | P1 | DONE | APPROVED | R1-CONFIGURATION-OPERATIONS-2026-08-21 | OD-008; promovida após task 41 aprovada, finalizada e current/ normalizado para IDLE | Operação administrativa da Knowledge Base, lista, detalhe, criação, edição, estados editoriais, configurações e link público com autorização consistente. |
| 43 | R1-PUBLIC-HELP-RELEASE-GATE-2026-08-21 | ConfiOne / Release 1 | Fechar Central Pública de Ajuda | P1 | DONE | APPROVED | R1-HELP-ADMIN-RELEASE-GATE-2026-08-21 | OD-008; promovida após task 42 aprovada, finalizada e current/ normalizado para IDLE | Expor somente conteúdo publicado, com home, lista, categoria, busca, artigo, relacionados e estados de ausência conforme contrato real. |
| 44 | R1-INTEGRATED-QA-SECURITY-2026-08-21 | ConfiOne / Release 1 | Validar R1 ponta a ponta | P1 | DONE | APPROVED | R1-MY-SPACE-SAFE-LANDING-2026-08-21, R1-SHELL-NAV-AUTH-INTEGRATION-2026-08-21, R1-DASHBOARD-RELEASE-GATE-2026-08-21, R1-CONFIGURATION-OPERATIONS-2026-08-21, R1-HELP-ADMIN-RELEASE-GATE-2026-08-21, R1-PUBLIC-HELP-RELEASE-GATE-2026-08-21, AUTH-SECURITY-REGRESSION-2026-08-21 | OD-008; finalizada localmente após APPROVED do Sentinel; handoff arquivado. | Auditoria integrada local/read-only concluída; limitações de browser autenticado, runtime servido, RLS/cross-tenant, performance e integrações permanecem registradas. |
| 45 | R1-RELEASE-READINESS-2026-08-21 | ConfiOne / Release 1 | Decidir prontidão da Release 1 | P1 | DONE | APPROVED | R1-INTEGRATED-QA-SECURITY-2026-08-21 | OD-008; finalizada localmente após APPROVED do Sentinel; handoff arquivado. | Recomendação documental NO-GO preservada; limitações externas permanecem explícitas. |
| 46 | R2-CUSTOMER-DATA-FOUNDATION-2026-08-21 | ConfiOne / Release 2 | Fechar fundação de dados da Central de Clientes | P2 | DONE | APPROVED | R1-RELEASE-READINESS-2026-08-21 | OD-008; finalizada localmente após APPROVED do Sentinel; handoff arquivado. | Fundação auditada localmente; matching OMIE NOT_PROVEN, sem fuzzy matching, e NO-GO externo preservado. |
| 47 | R2-CUSTOMER-CENTRAL-WORKSPACE-2026-08-21 | ConfiOne / Release 2 | Implementar workspace da Central de Clientes | P2 | DONE | APPROVED | R2-CUSTOMER-DATA-FOUNDATION-2026-08-21 | OD-008; finalizada localmente após APPROVED do Sentinel; handoff arquivado. | Rota dedicada e workspace existente reutilizado; QA autenticado, tabs internas, estados e isolamento servido permanecem não comprovados; R2 não publicada. |
| 48 | R2-CUSTOMER-CENTRAL-QA-2026-08-21 | ConfiOne / Release 2 | Validar Central de Clientes V1 | P2 | DONE | APPROVED | R2-CUSTOMER-CENTRAL-WORKSPACE-2026-08-21 | OD-008; finalizada no commit local exclusivo; QA local não publica a Release 2 | Validar fidelidade visual, arquitetura de informação, segurança, tenant, performance, estados reais e divergências justificadas contra os blueprints. |
| 49 | R1-INTEGRATION-CALL-QUALITY-2026-08-21 | ConfiOne / Release 1 | Verificar qualidade das chamadas de integrações e refresh dos painéis | P1 | DONE | APPROVED | FINANCE-DOMAIN-AUDIT-2026-08-21, KPI-REGISTRY-2026-08-21 | Owner decision OD-009 2026-08-22 | APPROVED por Sentinel; diagnóstico local arquivado em `handoffs/archive/R1-INTEGRATION-CALL-QUALITY-2026-08-21/` e `docs/reports/R1_INTEGRATION_CALL_QUALITY_2026-08-21.md`; atualização de radar em 2026-08-22 registra 503 no HubSpot/analytics e recusa inicial do painel local; sem escrita externa. |
| 53 | AUTH-ACCESS-MODEL-EXECUTABLE-2026-08-22 | ConfiOne / Identity & Access | Definir e implementar modelo executável Nível → Área → Tela → READ/WRITE | P1 | DONE | APPROVED | AUTH-TARGET-ACCESS-CONTRACT-2026-08-21, AUTH-ADMIN-CONSOLE-SIMPLIFICATION-2026-08-21, AUTH-SECURITY-REGRESSION-2026-08-21 | OD-013; auditoria/especificação documental finalizada em commit local exclusivo; sem migração executável neste lote | Auditar e especificar o contrato executável compatível, com segurança, tenant/área, auditoria, compatibilidade e plano separado para RLS/RPC/migrations. Nenhuma alteração remota neste lote. |
| 54 | AUTH-RELEASE-SURFACE-REGRESSION-2026-08-22 | ConfiOne / Identity & Access | Resolver divergência de publicação da rota /admin/tenants | P1 | DONE | APPROVED | AUTH-ACCESS-MODEL-EXECUTABLE-2026-08-22 | OD-014; finalizada localmente; deploy condicionado a autorização operacional separada | Publicar `/admin/tenants` no manifesto first-release usando screen key e guards existentes, corrigir regressões do contrato e preparar o checklist de deploy. |
| 50 | DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21 | ConfiOne / Release 1 | Governar o vínculo entre pipeline HubSpot, área e operação | P1 | DONE | APPROVED | DATA-OPERATION-SCOPE-2026-08-21, DATA-PIPELINE-STAGE-SCOPE-2026-08-21, KPI-REGISTRY-2026-08-21 | Owner decision OD-009 2026-08-22; aprovado pelo Sentinel e finalizado localmente por Codex | Implementado e aprovado: mapa canônico `pipeline_id -> área -> operação`, elegibilidade server-side confirmada, exclusão de suggested/ambiguous, filtros operacionais para os domínios aplicáveis e cobertura ticket-empresa auditável em Customer Success. Handoff arquivado; sem push, merge, deploy ou escrita externa. |
| 51 | R1-UTF8-ENCODING-INTEGRITY-2026-08-21 | ConfiOne / Release 1 | Corrigir integridade UTF-8 e caracteres acentuados/especiais | P1 | DONE | APPROVED | R1-INTEGRATION-CALL-QUALITY-2026-08-21, DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21 | Owner request 2026-08-21; aprovado pelo Sentinel e finalizado localmente por Codex | Mitigação defensiva de charset UTF-8 aplicada nas respostas compartilhadas; causa do incidente permanece não confirmada por limitação do runtime local. Regressões e diagnóstico arquivados; sem push, merge, deploy ou escrita externa. |
| 52 | DEV-CONTROL-VISUAL-V1-2026-08-22 | ConfiOne / Engineering | Evoluir o painel visual local de acompanhamento | P1 | DONE | APPROVED | DEV-CONTROL-MVP, CONTROL-PLANE-BACKLOG-2026-08-21 | Owner decision OD-010 2026-08-22 | APPROVED pelo Sentinel após re-review; handoff arquivado em `handoffs/archive/DEV-CONTROL-VISUAL-V1-2026-08-22/`; painel local read-only concluído, sem escrita externa. |
| 55 | R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22 | ConfiOne / Release 1 | Corrigir paridade da Visão Geral sob recorte operacional e integridade UTF-8 | P1 | DONE | APPROVED | R1-UTF8-ENCODING-INTEGRITY-2026-08-21, DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21 | Owner decision OD-015 2026-08-22; registro retroativo pelo Sentinel em 2026-08-23 (SEN-F05) | Guard de escopo antes do snapshot executivo consolidado e reparo defensivo de mojibake no cliente. Implementado em `b478ef6a`; revisão independente do Sentinel devolveu CHANGES_REQUESTED (SEN-F01..SEN-F07) e as correções seguem no ciclo local. Merge, deploy e nova migration remota fora de autorização. |
| 56 | ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23 | ConfiOne / Release 1 | Gráficos devem respeitar os filtros de operação e de área aplicados pelo usuário | P1 | ACTIVE | APPROVED | R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22, DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21 | Regra do proprietário registrada em 2026-08-23: indicadores e gráficos de todas as áreas devem ser calculados sobre os filtros aplicados, porque existem pipelines e tickets que não podem entrar na conta. | Defeito confirmado por leitura de código: `AnalyticsTrendPanel` aceita apenas `domain`, `grain` e `groupCompany`, e chama `getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`. A exclusão de pipelines (`excludedPipelineIds`), que Comercial e Customer Success já mantêm e aplicam aos KPIs, nunca chega aos gráficos das mesmas telas. O backend também não tem por onde receber: `rpc_analytics_timeseries_by_operation(p_domain, p_from, p_to, p_grain, p_group_company)` não possui parâmetro de exclusão. Exige migration remota, portanto decisão do proprietário registrada ANTES da execução. |

Regras da fila:

- somente um item pode estar `ACTIVE` por vez;
- `BACKLOG` representa item decomposto aguardando dependência ou seleção;
- `READY` representa item elegível para abertura da próxima TASK;
- A frente de autorização foi registrada com as tasks 29 e 30 concluídas
  localmente; a task 30 foi aprovada por Sentinel, arquivada e finalizada pelo
  Forge em checkpoint local exclusivo.
- A autorização de `OD-007` cobre somente a task 30 e não promove as tasks 31 a
  37, que permanecem `BACKLOG/PROPOSED`.
- `OD-008` autoriza o monitoramento contínuo do ciclo local e a promoção
  sequencial da próxima task existente quando os gates, dependências e o estado
  `IDLE` forem satisfeitos. Não autoriza aprovação em massa nem elimina a
  revisão independente do Sentinel.
- o próximo item só pode ser aberto depois de `APPROVED` no item anterior, suas
  dependências satisfeitas e o retorno de `handoffs/current/` para `IDLE`;
- `Approval` é autorização do proprietário; `State` controla elegibilidade e
  progresso. `PROPOSED` nunca é executado por Forge;
- quando um item aprovado e integrado termina, ele passa a `DONE` e a fila pode
  promover o próximo item aprovado e sem dependências pendentes para `APPROVED`;
- as tasks de gate 38 a 48 materializam a ordem de releases do roadmap; elas
  não duplicam as tasks AUTH 29 a 37 nem as tasks de Analytics, Dashboard,
  Suporte, Financeiro e Produto já existentes;
- a implementação visual dos blueprints da Central de Clientes não é iniciada
  por este registro e permanece dependente do gate da Release 1;
- `R1-INTEGRATION-CALL-QUALITY-2026-08-21` é uma verificação P1 de qualidade e
  observabilidade. Não deve ser confundida com a auditoria de domínio
  financeiro já concluída nem autoriza executar sync externo ou alterar
  credenciais;
- `DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21` estende as tasks de escopo de
  Operação e Pipeline/Stage já concluídas. Ela trata a governança de vínculo
  entre pipeline, área e operação, não a semântica de estágio já fechada;
- `R1-UTF8-ENCODING-INTEGRITY-2026-08-21` trata a integridade da codificação e
  não deve ser resolvida por transliteração ou remoção de acentos;
- em `OWNER_DECISION_REQUIRED`, risco material ou contaminação não separável,
  o heartbeat deve preservar o worktree, registrar a evidência e interromper a
  promoção até decisão específica do proprietário;
- cada item exige TASK, IMPLEMENTATION e REVIEW próprios, com entrega em
  `READY_FOR_REVIEW` e `Owner = Sentinel` antes da revisão;
- heartbeat do Forge pode abrir automaticamente o próximo item somente quando a
  fila estiver liberada pelo `APPROVED` anterior;
- `BLOCKED`, `OWNER_DECISION_REQUIRED` ou mudança material de escopo interrompem
  a fila e exigem retorno ao proprietário;
- push, merge e deploy permanecem fora da autorização desta fila.
- commit local de lote `APPROVED` e previamente autorizado na fila não exige
  nova autorização conversacional, desde que seja exclusivo e verificável;
  `FINALIZE_LOCAL` não pode usar `git add .`.

`Owner` identifica o agente responsável pelo próximo passo do estado atual. Em
`READY_FOR_IMPLEMENTATION`, `IMPLEMENTING`, `CHANGES_REQUESTED` e `FIXING`, o
responsável esperado é Forge. Em `READY_FOR_REVIEW` e `REVIEWING`, é Sentinel
quando `Reviewer active = Sentinel`. Após `APPROVED`, o responsável volta a Forge
para integração local.

Após cada verificação, quando a transição devolve o próximo passo a Forge em
`CHANGES_REQUESTED` ou `APPROVED`, Sentinel também deve notificá-lo diretamente
no chat correspondente. A mensagem é complementar e não substitui os artefatos
canônicos nem altera a fonte de verdade do repositório.

## Exceção temporária de agente único

Quando autorizada explicitamente pelo proprietário, a ausência temporária do
Claude pode ser coberta pelo mesmo Codex em rodadas alternadas:

- `Role: EXECUTOR`: Forge implementa, testa e escreve IMPLEMENTATION.md;
- `Role: REVIEWER`: o agente reviewer não altera código executável e revisa o lote contra
  TASK, diff, contratos e evidências;
- `Review mode: OWNER_AUTHORIZED_SELF_REVIEW` deve constar em STATUS.md;
- o REVIEW.md deve identificar que a revisão não é independente;
- a exceção não autoriza push, merge, deploy, release surface ou escrita remota.

O próximo passo só pode ser executado pelo papel indicado em STATUS.md. A
alternância permanece ativa até decisão contrária do proprietário e não cria
um segundo sistema de fila.

## Concorrência

Não editar código do produto simultaneamente na mesma working tree. Durante
REVIEWING, o reviewer designado somente lê o produto e escreve artefatos de revisão. Durante
IMPLEMENTING ou FIXING, Forge é o único agente autorizado a alterar produto.

## Relação com .review

`.review/` contém quality gates, inbox, contexto, baseline e vereditos técnicos.
Quando usado, seu resultado deve ser referenciado em `IMPLEMENTATION.md` ou
`REVIEW.md`. O inbox e os vereditos são opcionais, não substituem os quatro
arquivos de `current/` e não podem manter um pedido, estado ou veredito
contraditório. `.review/state.json` guarda apenas metadados de automação.

## Segurança

Nenhum handoff deve conter senha, token, cookie, JWT, service_role, segredo ou
conteúdo sensível desnecessário. Dúvida material de produto, arquitetura,
permissão, tenant, segurança ou operação externa deve ser registrada como:

UNRESOLVED — requires project owner decision
