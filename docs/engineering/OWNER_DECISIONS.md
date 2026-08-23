# Decisões do proprietário

Registro durável e versionado das decisões do proprietário sobre governança
operacional do ConfiOne. Este arquivo é a fonte oficial dessas decisões no
repositório, conforme determinação do proprietário em 2026-08-21.

Precedência: as decisões aqui registradas ocupam o nível 3 da precedência de
fontes definida em [REVIEW_PROTOCOL.md](REVIEW_PROTOCOL.md#precedência-das-fontes),
abaixo da especificação da tarefa e dos critérios de aceitação, e acima da
documentação normativa geral.

Regras deste registro:

- cada decisão recebe um identificador estável `OD-nnn`;
- decisões não são apagadas; quando substituídas, são marcadas como
  `SUPERSEDED` com referência à decisão que as substitui;
- o texto do proprietário é preservado em bloco de citação, sem paráfrase;
- qualquer interpretação operacional feita por um agente aparece em seção
  separada e identificada, para que o proprietário possa corrigi-la.

---

## OD-001 — Autonomia operacional do ciclo local de desenvolvimento

- **Data:** 2026-08-21
- **Origem:** decisão explícita do proprietário, Ede, na sessão de operação
  Cowork do dia.
- **Registrado por:** Claude, Principal Engineer / Independent Code Reviewer.
- **Status:** ATIVA

### Texto do proprietário

> Registre no repositório como `OWNER_DECISION` que Codex e Claude possuem
> autonomia operacional para conduzir o ciclo local de desenvolvimento sem
> autorização conversacional entre lotes. Isso inclui commits locais,
> finalização de lotes `APPROVED`, arquivamento de handoffs, atualização da
> state machine/heartbeat e ajustes de governança necessários para manter o
> fluxo autônomo. O commit `53e705c` está ratificado pelo owner e não deve ser
> revertido por esse motivo. Persistam essa decisão na fonte da verdade do
> Control Plane. Enquanto o painel ainda não estiver disponível para mim, o
> repositório deve ser a fonte oficial do estado, decisões, fila e histórico.
> Quando o painel for implementado, ele deverá refletir esse estado persistido.
> Push, merge, deploy e alterações em produção continuam fora dessa autorização
> até nova decisão explícita do owner.

Ratificação anterior, do mesmo dia, sobre o mesmo tema:

> O commit `53e705c` e a autorização persistente para commit local após
> `APPROVED` estão ratificados pelo owner. Não reverter. Registre esta decisão
> como `OWNER_DECISION` e considere essa autonomia válida daqui em diante.

### Autorizado

- Conduzir o ciclo local completo sem autorização conversacional entre lotes.
- Commit local.
- Finalização de lotes em `APPROVED`.
- Arquivamento de handoffs.
- Atualização da state machine e do heartbeat.
- Ajustes de governança necessários para manter o fluxo autônomo.
- O commit `53e705c` fica ratificado e não deve ser revertido sob o argumento
  de falta de autorização.

### Não autorizado

Permanecem fora desta decisão, até nova decisão explícita do proprietário:

- push e force push;
- merge e pull request;
- deploy;
- alterações em produção;
- migration remota, alteração de secrets e escrita em serviços externos.

### Fonte da verdade

Enquanto o Development Control Plane não estiver disponível ao proprietário, o
repositório é a fonte oficial do estado, das decisões, da fila e do histórico.
Quando o painel estiver disponível, ele deve refletir esse estado persistido, e
não constituir uma segunda fonte.

### Interpretação operacional registrada pelo revisor

Esta seção é interpretação de agente, não texto do proprietário, e pode ser
corrigida por ele a qualquer momento.

1. A decisão remove a dependência de autorização conversacional **entre lotes**.
   Ela não converte o revisor em opcional: quando Claude está disponível, a
   revisão independente continua sendo o caminho normal, e o
   `OWNER_AUTHORIZED_SELF_REVIEW` continua sendo exceção para indisponibilidade,
   registrada como auto-revisão não independente em `REVIEW.md`.
2. Um `APPROVED` produzido em auto-revisão é aceite interno de continuidade.
   Ele não equivale a uma aprovação independente e não deve ser descrito como
   tal no histórico.
3. "Ajustes de governança necessários para manter o fluxo autônomo" são
   alterações de processo. Alterações que reduzam a verificação de segurança,
   afrouxem asserção de teste, reescrevam baseline ou ampliem a superfície de
   release não se enquadram nesta autorização e continuam exigindo decisão
   explícita do proprietário.
4. Toda alteração de governança feita sob esta autonomia deve ser rastreável:
   commit próprio, mensagem que a identifique como governança e registro no
   handoff correspondente.

### Cross-link aplicado

Este arquivo é referenciado por `handoffs/README.md` e por
`docs/engineering/REVIEW_PROTOCOL.md`. As referências foram aplicadas pelo
Codex no lote `CONTROL-PLANE-BACKLOG-2026-08-21` e conferidas pelo revisor no
ciclo 2, junto com a integridade das citações do proprietário.

---

## OD-002 — Autorização do backlog prolongado de 2026-08-21

- **Data:** 2026-08-21
- **Origem:** confirmação explícita do proprietário, Ede, durante a revisão do
  lote `CONTROL-PLANE-BACKLOG-2026-08-21`.
- **Registrado por:** Claude, Principal Engineer / Independent Code Reviewer.
- **Status:** ATIVA

### Texto do proprietário

> todo esse aumento de fila foi autorizado por mim o dono do projeto

### Efeito

Os itens 7 a 26 da fila canônica em `handoffs/README.md`, decompostos no lote
`CONTROL-PLANE-BACKLOG-2026-08-21` e originados na missão de desenvolvimento
prolongado de 2026-08-21, estão autorizados pelo proprietário. O campo
`Approval = APPROVED` nesses itens é legítimo.

A autorização é de execução na ordem de dependências declarada. Ela não
antecipa aprovação de review de nenhum lote individual, e não altera o que a
`OD-001` mantém fora de escopo: push, merge, pull request, deploy, migration
remota, secrets e produção.

### Por que este registro existe

A `OD-001` determina que o repositório é a fonte oficial de decisões enquanto o
painel não estiver disponível. Sem este registro, vinte itens marcados como
`APPROVED` teriam como única evidência de autorização uma conversa fora do
repositório.

---

## OD-003 — Timezone operacional do analytics

- **Data:** 2026-08-21
- **Origem:** decisão explícita do proprietário, Ede, em resposta ao
  `OWNER_DECISION_REQUIRED` do lote `DATA-TEMPORAL-SEMANTICS-2026-08-21`.
- **Registrado por:** Claude, Principal Engineer / Independent Code Reviewer.
- **Status:** ATIVA

### Decisão

1. **Timezone operacional do analytics: `America/Sao_Paulo`.** Os limites de
   período passam a ser materializados nesse fuso, tanto no frontend quanto nas
   RPCs temporais. O mês fecha como a operação brasileira o conta.
2. **A decisão é retroativa.** Séries, coortes e comparativos históricos passam
   a ser calculados no fuso decidido em toda a base. Não há data de corte e não
   se cria descontinuidade na série.

### Contexto que motivou a decisão

O frontend materializava o período no fuso do navegador
(`analytics-periods.ts`, componentes locais de `Date`), enquanto as RPCs
materializavam o mesmo limite no fuso da sessão do banco, que é UTC por padrão
(`p_from::timestamptz`, `date_trunc` sobre `timestamptz`). Com o navegador em
São Paulo, isso produzia deslocamento de três horas em cada extremo: um evento
em `2026-08-01T01:00Z` é 31 de julho às 22h em São Paulo, contado como agosto
pelo backend.

O erro não aparecia como falha, e sim como número levemente diferente do
esperado no fechamento de mês e nos comparativos.

### Consequências aceitas

Alguns números já apresentados vão mudar levemente após o recálculo. O
proprietário aceitou essa mudança em favor de uma base coerente.

### O que a implementação precisa cobrir

- `apps/web/src/features/analytics/analytics-periods.ts`: calcular limites em
  `America/Sao_Paulo`, não no fuso do navegador.
- RPCs temporais: materializar `p_from` e `p_to` e agrupar com `date_trunc`
  nesse fuso, preservando a convenção meia-aberta já vigente, `>= from` e
  `< to + 1`.
- `docs/ANALYTICS_METRIC_CATALOG_V1.md`, hoje declarando o ponto como pendente:
  registrar o timezone escolhido.
- Testes que exercitem evento próximo à meia-noite, para travar a fronteira.
- Verificar o comportamento para datas anteriores a 2019, quando o Brasil ainda
  adotava horário de verão, antes de assumir deslocamento fixo.

### Escopo desta decisão

Define semântica de leitura. Não altera o que a `OD-001` mantém fora de escopo:
push, merge, pull request, deploy, migration remota, secrets e produção.

---

## OD-004 — Frente de cadastro, liberação e autorização de usuários

- **Data:** 2026-08-21
- **Origem:** pedido explícito do proprietário recebido pelo Navigator.
- **Registrado por:** Navigator.
- **Status:** ATIVA

### Texto do proprietário

> A primeira demanda real é uma revisão profunda do cadastro, liberação e
> autorização de usuários.
>
> Antes de realizar uma grande refatoração, reproduzir e corrigir o problema
> atual que impede um administrador válido de acessar o sistema.
>
> Não implemente a solução. Registre esta demanda no Development Control Plane,
> decomponha, deduplicate, defina prioridades, dependências e critérios de
> aceite, coloque as tasks na fila e deixe a primeira task elegível pronta para
> Forge.

### Efeito operacional

- A decisão cria a frente `AUTH-*` no Control Plane, com a correção P1 de causa
  raiz antes da simplificação estrutural.
- A direção de produto é `Usuário -> Nível -> Área -> Tela -> READ/WRITE`, mas
  a taxonomia e as telas definitivas dependem de evidência do inventário real.
- A task `AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21` fica em `READY` com
  `Approval = APPROVED` para abertura futura pelo Forge quando
  `handoffs/current/` retornar a `IDLE`. As demais permanecem
  `BACKLOG/PROPOSED` até que suas dependências e critérios estejam satisfeitos.

### Limites

Esta decisão não autoriza implementação neste lote, refatoração imediata,
alteração de RLS, migration, RPC, release surface, deploy, escrita remota,
secrets ou remoção do modelo de autorização vigente sem inventário, contrato,
revisão independente e autorização específica do respectivo lote.

### Interpretação operacional registrada pelo Navigator

O `APPROVED` da primeira task significa que o Owner aprovou sua preparação e
abertura futura no fluxo Forge/Sentinel. Não significa que o Navigator deve
executar código agora nem que as tasks estruturais estejam autorizadas para
execução. A causa do bug continua uma hipótese operacional até ser reproduzida
e demonstrada com evidência.

---

## OD-005 — Rota negada não inativa usuário autenticado

- **Data:** 2026-08-21
- **Origem:** sugestão explícita do proprietário durante a definição da frente
  de cadastro, liberação e autorização.
- **Registrado por:** Navigator.
- **Status:** ATIVA

### Texto do proprietário

> Acesso negado não deve inativar o acesso do usuário, porque pode ser um erro
> de rota. Se o acesso for negado, o usuário deve ter a opção de voltar para a
> home, na área de recepção, o Meu espaço. Não deve ficar simplesmente em
> Access denied sem uma opção de entrar em algum ambiente logado.

### Efeito operacional

- Negação de rota, tela ou destino não pode alterar `is_active`, encerrar a
  sessão ou transformar erro de URL em bloqueio de identidade.
- A recepção autenticada `/inicio`, apresentada como `Meu espaço`, deve ser o
  fallback quando estiver publicada e autorizada.
- Se a conta estiver autenticada, mas não houver workspace autorizado, o
  produto deve exibir estado explícito de acesso não configurado. Não se deve
  concluir que usuário e senha, sozinhos, concedem autorização operacional.
- `inactive-profile` e sessão expirada continuam estados independentes, com
  bloqueio backend apropriado.

### Interpretação operacional registrada pelo Navigator

O comportamento local atual já encaminha sessões autenticadas de
`AccessDeniedPage` para `/inicio` e exibe aviso em `HomePage`. A task
`AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21` deve provar esse fluxo com teste e
verificar os casos de perfil inativo, ausência de workspace e rota inválida sem
misturá-los.

---

## OD-007 — Continuidade autônoma do próximo lote autorizado

- **Data:** 2026-08-22
- **Origem:** pedido explícito do proprietário, Ede, sobre a paralisação de
  Forge e Sentinel por falta de task autorizada.
- **Registrado por:** Navigator.
- **Status:** ATIVA

### Texto do proprietário

> os agentes Sentinel e Forge pararam porque nao ha tarefa autorizada, pdoe
> cuidar disso de forma autonoma?

### Efeito operacional

- Autoriza a continuidade autônoma do próximo item elegível já previsto na fila,
  sem aprovar automaticamente todo o backlog.
- A próxima task elegível é `AUTH-MODEL-INVENTORY-2026-08-21`, pois a task
  `AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21` foi concluída, revisada e integrada
  localmente.
- `AUTH-MODEL-INVENTORY-2026-08-21` pode ser promovida para
  `READY/APPROVED` e aberta no handoff corrente para Forge, com Sentinel como
  reviewer obrigatório.
- A autorização cobre descoberta, inventário, documentação e validação local
  dentro da allowlist da task. Não cobre a implementação da simplificação,
  alteração de RLS/RPC/migration, escrita remota, secrets, deploy, push, merge
  ou aprovação das tasks seguintes.
- A task seguinte só pode ser promovida depois de `APPROVED`, suas dependências
  satisfeitas e o handoff corrente retornar a `IDLE`, conforme o protocolo.

---

## OD-006 — Ordem canônica de releases e blueprints da Central de Clientes

- **Data:** 2026-08-21
- **Origem:** decisão explícita do proprietário, Ede, no checkpoint de
  reorganização do roadmap e aprovação dos blueprints visuais.
- **Registrado por:** Navigator.
- **Status:** ATIVA

### Texto do proprietário

> As imagens CENTRAL_CLIENTES_HOME_V1 e CLIENTE_RESUMO_V1 são os blueprints
> visuais aprovados pelo Product Owner para a Central de Clientes V1.

> A ordem canônica atual é Release 1 — ConfiOne Core Interno em Produção,
> incluindo autenticação, usuários e acessos, Meu Espaço como safe landing,
> shell e navegação, Dashboard Gerencial completo, Configurações, Integrações,
> Governança de Dados, Histórico de Sincronizações, Marcas, Central de Ajuda
> administrativa, Central Pública, QA, segurança, performance e release
> readiness. Depois vem a Release 2 — Central de Clientes. O histórico técnico
> do roadmap deve ser preservado, mas recomendações antigas precisam ser
> classificadas como CURRENT, NEXT, DEFERRED, COMPLETED ou SUPERSEDED.
>
> As imagens `CENTRAL_CLIENTES_HOME_V1` e `CLIENTE_RESUMO_V1` são os blueprints
> visuais aprovados pelo Product Owner para a Central de Clientes V1. A primeira
> representa a visão da carteira; a segunda representa o workspace dedicado do
> cliente e substitui conceitualmente o slide-over como superfície principal.
> A implementação continua na Release 2. Forge deverá usar os arquivos como
> referência obrigatória e registrar divergências justificadas; Sentinel deverá
> revisá-los como contrato visual e solicitar `CHANGES_REQUESTED` para
> divergências relevantes sem justificativa.
>
> Esta mensagem registra e persiste a decisão visual. Ela não altera sozinha a
> prioridade atual da Release 1. A implementação da Central de Clientes
> continua pertencendo à RELEASE 2. Não implemente a Central de Clientes nesta
> ação.

### Efeito operacional

- `docs/ROADMAP_BUILDOUT_V3.md` é a fonte da ordem atual: Release 1 agora,
  Release 2 depois, futuro e histórico preservados e classificados.
- A fila do Control Plane reutiliza as tasks AUTH e Analytics existentes e
  materializa gates de R1 e R2 sem duplicar o backlog.
- A Central de Clientes não desloca a fila corrente de Release 1 e nenhuma tela
  é implementada por esta decisão.
- Os arquivos visuais canônicos são
  `docs/design/blueprints/central-clientes/CENTRAL_CLIENTES_HOME_V1.png` e
  `docs/design/blueprints/central-clientes/CLIENTE_RESUMO_V1.png`.
- As especificações relacionadas devem apontar diretamente para esses arquivos.

### Regras visuais preservadas para a implementação futura

- usar a busca global existente no header, sem criar uma segunda busca textual
  principal redundante;
- tratar a Central como superfície operacional da carteira B2B, não como CRM
  genérico;
- abrir o cliente em rota/workspace próprio, sem usar slide-over como workspace
  principal;
- manter o Resumo seletivo, sem transformar a aba em relatório detalhado;
- preservar a direção HD informacional, desktop-first, com referência prioritária
  de `1920x1080`;
- registrar e justificar qualquer divergência exigida por dados reais,
  acessibilidade ou limitação técnica.

---

## OD-008 — Continuidade autônoma da fila e monitoramento de Forge/Sentinel

- **Data:** 2026-08-22
- **Origem:** solicitação explícita do proprietário, Ede, para manter os
  agentes trabalhando continuamente, cuidar da fila e aprovar o necessário.
- **Registrado por:** Navigator.
- **Status:** ATIVA

### Texto do proprietário

> Eu quero que eles trabalhem continuamente, não precisam de mim, eu já trouxe
> a vocês o que preciso e nós já temos um roadmap. Vocês devem cuidar disso,
> monitorar os agentes, cuidar da fila e aprovar o que for necessário.

### Efeito operacional

- O heartbeat local pode monitorar `handoffs/current/`, a fila canônica, os
  gates e o estado Git, e executar o próximo passo elegível sem nova pergunta
  conversacional.
- A fila pode promover sequencialmente a próxima task existente para
  `READY/APPROVED` somente quando a task anterior estiver concluída, revisada,
  integrada localmente, com dependências satisfeitas, `handoffs/current/` em
  `IDLE` e sem mudança material de escopo.
- Forge continua sendo o executor. Sentinel continua sendo o reviewer
  independente obrigatório. Uma aprovação autônoma não substitui a revisão do
  Sentinel nem autoriza autoaprovação do executor.
- A autorização não aprova todo o backlog de uma vez. Tasks `PROPOSED`, com
  dependência pendente ou com ambiguidade material permanecem aguardando o
  próximo gate elegível.
- Diante de risco cross-tenant, bypass de RLS, exposição de dados, migration
  destrutiva, alteração ampla de permissões, segredo, custo ou escrita externa,
  o ciclo deve registrar `OWNER_DECISION_REQUIRED` e parar nesse ponto.

### Limites permanentes

Esta decisão não autoriza push, merge, rebase, deploy, produção, migration
remota, alteração ou rotação de secrets, escrita em integrações externas,
reset/clean destrutivo, publicação ou release surface. Também não autoriza
alterar código fora da task corrente ou mascarar falhas para avançar a fila.

---

## OD-009 — Aceleração sequencial das frentes de Dashboard, integrações e Central de Clientes

- **Data:** 2026-08-22
- **Origem:** solicitação explícita do proprietário, Ede, para adiantar o
  reparo da sincronização, a construção do Dashboard e as demandas da Central
  de Clientes.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Efeito operacional

- Reutilizar somente as tasks já existentes na fila, sem duplicar backlog.
- Priorizar a sequência de dependências: `R1-INTEGRATION-CALL-QUALITY-2026-08-21`,
  `DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21`,
  `R1-UTF8-ENCODING-INTEGRITY-2026-08-21`, metodologia/contexto dos KPIs,
  `R1-DASHBOARD-RELEASE-GATE-2026-08-21` e os gates de prontidão da Release 1.
- Após a Release 1 estar pronta e aprovada, avançar sequencialmente a fundação,
  o workspace e o QA da Central de Clientes usando os blueprints de `OD-006`.
- Somente uma task pode estar ativa no worktree. Cada promoção exige
  dependências satisfeitas, allowlist, handoff em `IDLE`, revisão independente
  e gates proporcionais. A aprovação é sequencial, não em massa.
- A primeira task promovida por esta decisão é
  `R1-INTEGRATION-CALL-QUALITY-2026-08-21`, pois `FINANCE-DOMAIN-AUDIT-2026-08-21`
  e `KPI-REGISTRY-2026-08-21` já estão concluídas.

### Limites

- Diagnóstico de integração não autoriza rotação ou alteração de credenciais,
  escrita em HubSpot/OMIE, produção, deploy, migration remota ou uso de
  fallback silencioso.
- A Central de Clientes continua condicionada à ordem canônica da Release 1;
  este registro acelera sua preparação futura, mas não autoriza publicação
  parcial nem bypass dos gates.

---

## OD-010 — Prioridade do painel visual de acompanhamento do desenvolvimento

- **Data:** 2026-08-22
- **Origem:** solicitação explícita do proprietário, Ede, para acompanhar
  visualmente as tasks, agentes, estados e progresso da construção.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Efeito operacional

- Criar a task `DEV-CONTROL-VISUAL-V1-2026-08-22` como evolução do MVP local
  `DEV-CONTROL-MVP`, sem criar uma segunda fonte de verdade.
- Priorizar a entrega visual read-only imediatamente após a task de integração
  financeira atualmente em execução, usando os arquivos de handoff, fila,
  decisões, Git e heartbeats como fontes observáveis.
- O painel deve tornar visíveis, no mínimo, task corrente, fila, estados
  canônicos, owner, Forge, Sentinel, Codex, revisão, findings, gates,
  dependências, decisões e estado do worktree.
- A V1 permanece local, read-only e sem comandos de aprovação, transição,
  execução, escrita externa ou publicação online.

### Limites

- Reutilizar `tools/dev-control`; não criar banco paralelo, fila paralela,
  snapshot sem contrato ou estado derivado que contradiga os handoffs.
- Não expor secrets, tokens, dados de clientes ou conteúdo sensível no painel.
- A evolução online, autenticação própria, auditoria persistida e ações
  interativas ficam para decisões posteriores.

---

## OD-011 — Diversidade e adequação das visualizações do Dashboard

- **Data:** 2026-08-22
- **Origem:** solicitação explícita do proprietário, Ede, para reduzir a
  repetição de barras, pizzas e KPIs e explorar melhor a biblioteca de gráficos.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Efeito operacional

- Incorporar a diretriz ao `R1-DASHBOARD-RELEASE-GATE-2026-08-21`, sem criar
  uma task paralela ou duplicar o backlog existente.
- Para cada nova visualização, escolher o encodamento conforme a pergunta
  operacional, o tipo de dado, a série temporal, a comparação e a densidade de
  leitura. Avaliar alternativas como linha, área, faixa, dispersão, funil,
  heatmap, treemap, waterfall, bullet, tabela analítica ou composição híbrida
  quando forem mais explicativas que barras ou pizza.
- Não usar variedade como decoração: toda visualização precisa ter título,
  unidade, período, fonte, estado de cobertura e uma decisão que ajude o
  usuário a tomar.
- Revisar dimensões, proporções, acessibilidade, responsividade e legibilidade
  antes de aceitar um gráfico. KPIs continuam reservados para números de
  destaque, não para substituir análises que pedem série, distribuição ou
  relação entre variáveis.

### Limites

- Usar somente dados e contratos reais já autorizados; não criar gráfico para
  preencher espaço quando a fonte estiver ausente, stale ou indisponível.
- A diretriz não autoriza alterar a biblioteca, inventar métricas, mover o shell
  global ou redesenhar telas fora do gate do Dashboard.

---

## OD-012 — Redução de escopo da simplificação do console administrativo

- **Data:** 2026-08-22
- **Origem:** decisão explícita do proprietário, Ede, para destravar
  `AUTH-ADMIN-CONSOLE-SIMPLIFICATION-2026-08-21`.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Decisão do proprietário

> Autorizar a redução de `AUTH-ADMIN-CONSOLE-SIMPLIFICATION` para
> simplificação da linguagem da UI, sem unificar o modelo executável de
> permissões. Preservar as fontes atuais e registrar uma task futura para o
> modelo Nível → Área → Tela → READ/WRITE.

### Efeito operacional

- A task corrente fica limitada à linguagem, hierarquia explicativa e
  apresentação da superfície `AccessPage.tsx`, usando os contratos e flags de
  autorização já existentes.
- Permanecem fora do lote o modelo executável unificado, RLS, RPCs, migrations,
  grants, claims, scopes, capabilities, secrets, integrações e alterações
  amplas de permissão.
- O backend e as fontes atuais continuam sendo a autoridade. A UI não pode
  inferir, consolidar ou salvar uma cadeia de acesso que não exista no contrato
  executável.
- A futura task `AUTH-ACCESS-MODEL-EXECUTABLE-2026-08-22` fica registrada como
  proposta nesta decisão. A restrição de não promoção foi posteriormente
  substituída pela OD-013; a task deverá definir, auditar e implementar
  separadamente o modelo Nível → Área → Tela → READ/WRITE, com revisão de
  segurança e compatibilidade.

### Limites

Esta decisão libera a retomada documental e de UI da task corrente. A
promoção posterior da task futura segue a OD-013.

---

## OD-013 — Retomada autorizada do modelo executável de permissões

- **Data:** 2026-08-22
- **Origem:** decisão explícita do proprietário, Ede, nesta sessão.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Texto do proprietário

> Estou delegando a você o controle, prossiga

### Efeito operacional

- A restrição de promoção da task `AUTH-ACCESS-MODEL-EXECUTABLE-2026-08-22`
  registrada na OD-012 fica substituída.
- A task 53 pode ser promovida individualmente para `ACTIVE/APPROVED`, pois
  suas dependências documentais e de regressão já estão concluídas.
- O primeiro lote deve auditar e especificar o modelo executável Nível → Área
  → Tela → READ/WRITE, reconciliando fontes atuais, tenant/área, precedência,
  deny by default, compatibilidade, auditoria e impacto em RLS/RPC/migrations.
- Nenhuma alteração remota, migration, grant, secret, deploy, push ou merge é
  autorizada por esta decisão. Implementação executável deve permanecer em
  lote revisado e separado, com aprovação independente do Sentinel.
- A autonomia operacional de OD-008 permanece ativa: uma task por vez, stage
  seletivo e finalização local somente após aprovação formal.

---

## OD-014 — Publicação da rota /admin/tenants e solicitação de deploy

- **Data:** 2026-08-22
- **Origem:** decisão explícita do proprietário, Ede, nesta sessão.
- **Registrado por:** Codex Orquestrador.
- **Status:** ATIVA

### Texto do proprietário

> quero que publique e faça o deploy

### Efeito operacional

- Autoriza a task `AUTH-RELEASE-SURFACE-REGRESSION-2026-08-22` a resolver a
  divergência de publicação de `/admin/tenants`.
- A publicação deve usar os contratos, guards, screen key e testes existentes;
  não deve criar bypass de autorização nem alterar o backend sem necessidade.
- Após revisão independente, gates verdes e checklist de deploy, fica
  autorizada a preparação do deploy solicitado pelo proprietário.
- O caminho de produção continua sujeito à estratégia versionada: `main`,
  revisão/CI e integração de deploy. Não autoriza secrets, migrations remotas,
  escrita de dados externos ou alteração de banco.

---

## OD-015 — Ratificação das migrations remotas aplicadas em 2026-08-22

- **Data:** 2026-08-22
- **Origem:** decisão explícita do proprietário, Ede, em resposta à divergência
  levantada pelo coordenador durante o takeover.
- **Registrado por:** Claude, Coordenador operacional.
- **Status:** ATIVA

### Contexto

O handoff de takeover informou que duas migrations já haviam sido aplicadas no
projeto Supabase `jzmmvfcmruasqmrdmbup`:

- `access_02_provisioning_e2e_v1`, registrada remotamente como `20260822234654`;
- `analytics_utf8_and_scope_guard_v1`, registrada remotamente como `20260822234701`.

O coordenador verificou que nenhuma decisão registrada autorizava migration
remota. Todas as menções no registro eram proibições, incluindo a `OD-014`, do
mesmo dia, que declara textualmente: "Não autoriza secrets, migrations remotas,
escrita de dados externos ou alteração de banco".

### Decisão

O proprietário ratifica as duas migrations já aplicadas. Elas permanecem em
produção e não devem ser revertidas por falta de autorização registrada.

### O que esta decisão não faz

- Não autoriza novas migrations remotas. Cada aplicação futura exige decisão
  própria e registrada **antes** da execução.
- Não altera a `OD-014` quanto a secrets, escrita de dados externos e alteração
  de banco.

### Lacuna de processo registrada

A autorização existiu em conversa e não foi persistida antes da execução. Isso
contraria a `OD-001`, que define o repositório como fonte oficial das decisões
enquanto o painel não estiver disponível. O registro fica aqui para que a
lacuna seja auditável, não para normalizá-la: a ordem correta é decidir,
registrar e só então executar em ambiente remoto.
