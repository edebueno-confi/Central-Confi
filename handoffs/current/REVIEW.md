# REVIEW

- Reviewer: Sentinel (Independent Code Reviewer / Principal Engineer)
- Review mode: SENTINEL_INDEPENDENT
- Decision: APPROVED (após correção; ver "Ciclo 2" no fim deste documento)
- Decision do ciclo 1: CHANGES_REQUESTED
- Reviewed task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e
- Implementation: b478ef6a7605942e3058557578f27e2e0342f5c6
- HEAD no momento da revisão: cdbda1b6
- Data: 2026-08-23

A auto-revisão anterior do Forge/Codex não foi apagada nem reescrita: seu texto
permanece recuperável em `git show b478ef6a:handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/REVIEW.md`
e em `git show b478ef6a:handoffs/current/REVIEW.md`. O diretório de arquivo em
si foi removido no ciclo 2 por ser prematuro (SEN-F07). Esta revisão é
independente e substitui a anterior apenas como documento corrente, conforme
OD-008 e a interpretação registrada em
`docs/engineering/OWNER_DECISIONS.md` (auto-revisão é aceite interno de
continuidade, não aprovação independente).

## Escopo revisado

Diff real conferido: `b478ef6a` toca 17 arquivos, todos dentro da allowlist da
TASK, com uma exceção não declarada (a pasta `handoffs/archive/...`, ver
SEN-F07). Os commits `6c18ebae`, `f9977038` e `cdbda1b6` são exclusivamente
documentais.

## Evidências reexecutadas por mim

Executadas nativamente no host Windows, no checkout real, sem reaproveitar
resultado declarado pelo implementador:

- `npm run web:typecheck` — PASS (exit 0)
- `npm run lint` — PASS (exit 0)
- `npm run test:focused` — PASS, 290/290, 0 falhas
- `npm run web:build` — PASS
- `npm run docs:validate` — PASS
- `git diff --check` — PASS

Os números batem exatamente com o que o IMPLEMENTATION/REVIEW do lote declarou.
Não houve repetição do padrão DOS-F01 (código entregue que não compilava sob
gate declarado como PASS).

Sonda comportamental própria do algoritmo de reparo UTF-8 (reprodução fiel de
`repairUtf8Mojibake`), 11/11 casos:

- repara `Sem responsÃ¡vel`, `OperaÃ§Ã£o`, `IntegraÃ§Ãµes`;
- preserva `instância`, `Câmara Municipal`, `ângulo`, `Atenção`,
  `âncora ótima`, `Café & ação`;
- não transforma `Sem responsavel` (sem acento) — esse literal depende
  exclusivamente da migration remota.

Medições de estado feitas via `tools/dev-control/server.mjs`:

- fila canônica: 54 itens, **todos** em `DONE`; nenhum `BACKLOG`, nenhum `ACTIVE`;
- `readSnapshot().current.status.task` = `UNRESOLVED`;
- a task corrente **não** está na fila canônica;
- `node --test tests/scripts/dev-control-mvp.test.mjs` → 8 PASS / 2 FAIL.

## Pontos confirmados como corretos

1. O guard de escopo existe de fato: com `groupCompany` preenchido o efeito
   retorna antes de `getCeoSnapshot`, e passa a usar somente
   `getCommercialKpisV2ForOverview`, `getSupportKpisV2ForOverview` e
   `getCsSnapshotForOverview`. Critério de aceite 1, na parte do desvio: OK.
2. Financeiro **é** mascarado sob recorte operacional. Verifiquei
   `buildDomainCards(data, hubspotUnavailable, omieUnavailable || operationScoped, …)`
   e `financeUnavailable={omieUnavailable || Boolean(groupCompany)}`. Cheguei a
   levantar um finding contra este ponto e o retirei após conferir o call site:
   a afirmação do implementador está correta.
3. `buildExecutiveExceptions` suprime corretamente `support.highPriorityOpen` e
   `finance.overdueBalance` quando `operationScoped`.
4. `maskUnscopedOperationKpis` neutraliza as chaves sem dimensão operacional
   (`mrr_total`, `active_customers`, `received_amount`, `overdue_receivables`,
   `mrr_overdue`, `nrr`) no board de KPIs.
5. A migration usa `pg_get_functiondef` + `replace` + `execute`, preservando a
   definição vigente, a assinatura e os grants; troca apenas dois literais.

## Findings

### SEN-F01 — MEDIUM — "Governança e cobertura" publica número consolidado sob recorte operacional

`apps/web/src/features/analytics/AnalyticsCeoPage.tsx:890-903` renderiza
`data.dataQuality.unmatchedFinanceTitles` e `data.dataQuality.supportUnassigned`
sem nenhum guard de `operationScoped`.

`applyOperationScope` devolve `{ ...data, commercial, support }` — `dataQuality`
passa intacto. Como o efeito operacional monta o resultado com
`data: current.data ?? buildUnavailableCeoSnapshot()`, existem dois caminhos:

- **caminho quente** (usuário abre o consolidado e depois seleciona a operação):
  `current.data` é o snapshot consolidado e sobrevive. O painel exibe
  "Títulos sem correspondência" e "Tickets sem responsável" **do consolidado**
  dentro de uma visão que declara uma operação selecionada. Isso é exatamente o
  "reaproveitar valores do consolidado" vedado pelo critério de aceite 2;
- **caminho frio** (abertura direta em uma operação): `buildUnavailableCeoSnapshot()`
  fixa os dois campos em `0`, e o painel afirma "0" como fato, contrariando o
  critério 1 e o princípio declarado no próprio REVIEW do lote ("não transformar
  ausência de dimensão em zero").

Todos os `HdMetric` vizinhos do mesmo canvas têm o guard ("Encerramentos do
recorte indisponíveis", "Prioridade do recorte indisponível", "Dados
financeiros indisponíveis"). Isto é omissão, não decisão de projeto.

Correção sugerida: aplicar o mesmo padrão dos irmãos — `operationScoped ?
"Indisponível" : …` — nos dois valores, ou incluir `dataQuality` no
`applyOperationScope` com `null`.

### SEN-F02 — LOW — token técnico vazando para o painel executivo

`buildUnavailableCeoSnapshot()` define `state.reason =
'operation_dimension_unavailable'`, e `analytics-executive.ts:52` usa
`detail: state.reason || '…'`. No caminho frio o card de exceção exibe a string
`operation_dimension_unavailable` ao usuário final, enquanto os demais motivos
do arquivo são frases em português ("O denominador de cliente ativo ainda não
foi confirmado."). Sugestão: manter o token em campo próprio e publicar frase.

### SEN-F03 — MEDIUM — o critério de aceite 4 não está de fato coberto

Três das quatro regressões adicionadas não conseguem falhar pelo defeito que
dizem cobrir:

1. `tests/scripts/utf8-encoding-integrity.test.mjs` — "a migration corrige a
   origem dos fallbacks conhecidos" faz `assert.match` no próprio `.sql`
   procurando literais que o arquivo contém por construção. É tautológico: só
   falha se alguém apagar a migration, e não afirma nada sobre o banco.
2. `tests/scripts/utf8-encoding-integrity.test.mjs` — "o frontend repara
   mojibake sem transliterar acentos válidos" **nunca chama**
   `repairOperationalMojibake`. Só faz grep do texto-fonte atrás de
   `TextDecoder('utf-8', { fatal: true })` e de nomes de função. O comportamento
   que dá nome ao teste está sem cobertura. (Eu o exercitei por fora: passa
   11/11. O problema é que a suíte não exercita.)
3. `tests/scripts/analytics-dashboard-domains-integrations.test.mjs` — "operação
   selecionada não dispara o snapshot executivo consolidado" compara posições de
   `indexOf` no texto-fonte e fixa o literal
   `data: current\.data \?\? buildUnavailableCeoSnapshot`. Ou seja: **congela**
   a expressão apontada no SEN-F01 em vez de validá-la, e continuaria passando
   se o `return` antecipado do guard fosse removido — precisamente a regressão
   que ele existe para impedir.

O quarto teste ("cria base honesta quando a Visão Geral abre diretamente em uma
operação") é um teste real, mas afirma `snapshot.finance.balance === 0`,
certificando como correto o zero-como-fato que o próprio lote diz evitar.

### SEN-F04 — MEDIUM — o STATUS corrente não identifica a task

`handoffs/current/STATUS.md` foi movido de `IDLE` para `APPROVED` em `b478ef6a`
sem os campos `Task`, `Base SHA` e `Implementation`. A cópia arquivada os tem; a
canônica corrente não. Consequência medida: `readSnapshot()` do Control Plane
reporta `current.status.task = UNRESOLVED`. A fonte oficial de estado não diz
qual task está aprovada.

### SEN-F05 — MEDIUM — a task nunca entrou na fila canônica, e a suíte do Control Plane está vermelha

`R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22` não existe em `handoffs/README.md`
(54 linhas, todas `DONE`). Todo lote concluído anterior tem linha na fila e
referência a uma OD; este foi implementado, auto-aprovado, arquivado e commitado
fora dela.

Consequência medida, não inferida — `node --test tests/scripts/dev-control-mvp.test.mjs`
falha 2 de 10:

- `assert.ok(snapshot.queue.some((item) => item.task_id === snapshot.current.status.task))`
- `assert.ok(queue.filter((item) => item.state === 'BACKLOG').length >= 10)` (hoje: 0)

Essa suíte está em `test:all`, **não** em `test:focused`. Por isso os gates
declarados (290/290) e `review:gates` não a enxergam — e `test:all` continua
ausente do workflow `ubuntu-latest`. O repositório tem hoje uma suíte vermelha
que nenhum gate em uso executa.

### SEN-F06 — LOW — mudança de regime de revisão dentro de um commit `fix:`

`b478ef6a` altera `Reviewer active: Sentinel` → `Codex (Reviewer mode)` e
`Review mode: SENTINEL_REQUIRED` → `OWNER_AUTHORIZED_SELF_REVIEW` no mesmo
commit que entrega o código que esse regime então aprova. O modo em si é
legítimo (exceção por indisponibilidade do revisor) e o Forge declarou a
limitação honestamente no REVIEW. O que é irregular é o empacotamento: a
interpretação ratificada em `OWNER_DECISIONS.md` exige que alteração de
governança tenha commit próprio e mensagem que a identifique como governança.
É o mesmo padrão já registrado em `53e705c`.

### SEN-F07 — INFO — arquivo criado antes da conclusão, com SHA errado

`handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/` foi criado no
mesmo commit da implementação e registra `Implementation: UNCOMMITTED_WORKTREE`.
O arquivo histórico portanto atribui permanentemente o lote a um worktree sujo
em vez de `b478ef6a`, e duplica uma task que continua marcada como corrente.

## Limitações desta revisão

Declaradas sem atenuação:

- **Banco de dados não verificado.** pgTAP e qualquer comportamento de Postgres
  são inverificáveis a partir do meu ambiente. O efeito real da migration nas
  três funções remotas é asserção de leitura do implementador, não medição
  minha. Não confirmei sequer a existência de
  `public.rpc_analytics_ceo_snapshot_legacy` no banco alvo.
- **Nenhum QA autenticado de navegador.** Console, rede, RPC/view efetivamente
  servida, autorização e isolamento tenant não foram exercitados. Não declaro a
  aplicação saudável.
- **Dependência de produção não coberta por teste.** O critério 3, na parte do
  literal `Sem responsavel` sem acento, depende exclusivamente da migration
  remota: o cliente deliberadamente não o repara (verificado). Se a migration
  for revertida ou uma função nova reintroduzir o literal, nada no frontend
  defende e nenhum teste acusa.

## Decisão operacional

CHANGES_REQUESTED. O núcleo funcional está correto e os gates declarados são
honestos e foram reproduzidos. O que impede o APPROVED independente:

- SEN-F01, porque quebra os critérios 1 e 2 em um painel visível;
- SEN-F03, porque o critério 4 está satisfeito apenas nominalmente;
- SEN-F04 e SEN-F05, porque a fonte canônica de estado e fila está incoerente e
  a suíte do Control Plane está vermelha no HEAD atual.

Merge da PR 45, deploy e qualquer nova aplicação remota continuam **fora de
autorização** (OD-001, OD-014, OD-015). O guard `expected_head_sha=6c18ebae` do
documento de takeover está desatualizado: HEAD é `cdbda1b6`.

---

## Ciclo 2 — correções aplicadas pelo Sentinel sob autorização do proprietário

O proprietário autorizou explicitamente ("assuma, verifique tudo o que precisar,
garanta a correção e commite") que eu assumisse também a implementação das
correções desta revisão. Sem essa autorização eu permaneceria apenas como
revisor. Registro a mudança de papel para que o histórico não sugira que o
revisor implementou por conta própria.

### Situação dos findings

| Finding | Severidade | Situação | Evidência |
| --- | --- | --- | --- |
| SEN-F01 | MEDIUM | RESOLVIDO | guard puro `buildExecutiveIntegrityLine` + base sob recorte deixa de reaproveitar `current.data` |
| SEN-F02 | LOW | RESOLVIDO | `state.reason` virou frase; token preservado em `state.reasonCode` |
| SEN-F03 | MEDIUM | RESOLVIDO | 3 testes de grep trocados por 9 testes comportamentais; 6/6 mutantes mortos |
| SEN-F04 | MEDIUM | RESOLVIDO | `STATUS.md` voltou a declarar `Task`, `Base SHA` e `Implementation` |
| SEN-F05 | MEDIUM | RESOLVIDO | task registrada na fila como item 55; `dev-control-mvp` 10/10 |
| SEN-F06 | LOW | RECONHECIDO, NÃO REVERTIDO | ver "Pendências" abaixo |
| SEN-F07 | INFO | RESOLVIDO | arquivo prematuro removido; conteúdo preservado em `b478ef6a` |

### O que mudou no código

1. **SEN-F01, causa raiz.** A branch operacional passou de
   `data: current.data ?? buildUnavailableCeoSnapshot()` para
   `data: buildUnavailableCeoSnapshot()`. Depender de "todo consumidor tem
   guard" foi exatamente o que produziu o defeito; agora o consolidado não
   entra no estado sob recorte, e só o que tem read model operacional é
   preenchido depois por `applyOperationScope`.
2. **SEN-F01, sintoma.** A linha "Governança e cobertura" passou a usar
   `buildExecutiveIntegrityLine(dataQuality, operationScoped)`, novo helper puro
   em `analytics-ceo-snapshot.mjs` (com tipo em `.d.mts`). Sob recorte devolve
   "Indisponível" com rótulo explícito; sem recorte devolve o número formatado;
   com `dataQuality` ausente devolve "Indisponível" em vez de inventar zero.
   O helper é puro justamente para que a regressão consiga falhar sem React.
3. **SEN-F02.** `state.reason` agora é frase publicável e o identificador de
   máquina vive em `state.reasonCode`.

### O que mudou nos testes

- `utf8-encoding-integrity.test.mjs` passou a **importar** `operational-copy.ts`
  e exercitar `repairOperationalMojibake` e `sanitizeOperationalVisibleText`:
  repara `Sem responsÃ¡vel`, `OperaÃ§Ã£o`, `IntegraÃ§Ãµes`, `AtenÃ§Ã£o`;
  preserva `instância`, `Câmara Municipal`, `ângulo`, `Atenção`, `âncora ótima`,
  `Café & ação`, `Sem responsável`; trata nulo, vazio e texto sem marcador.
- O teste da migration deixou de procurar literais que o arquivo contém por
  construção e passou a afirmar propriedades de segurança do patch: usa
  `pg_get_functiondef`, não usa `drop function`, não regrava o literal
  corrompido. A eficácia no banco continua declarada como não verificada.
- O teste do guard de escopo passou a exigir que a branch operacional
  **retorne** antes da chamada consolidada e não contenha `getCeoSnapshot(`,
  em vez de comparar posições de `indexOf`. A asserção que congelava
  `current.data ?? buildUnavailableCeoSnapshot` foi substituída pela inversa.
- `analytics-ceo-snapshot.test.mjs` ganhou quatro regressões comportamentais
  para a linha de governança e para o `reason` publicável.

### Prova de que as novas regressões não são tautológicas

Rodei uma sonda de mutação fora do repositório, aplicando em cada asserção nova
o comportamento anterior à correção: **6 de 6 mutantes mortos**. Nenhuma das
asserções novas sobrevive ao defeito que diz cobrir — que era justamente o
problema das três que substituí.

### Gates reexecutados após a correção

- `npm run web:typecheck` — PASS
- `npm run lint` — PASS
- `npm run test:focused` — PASS, **295/295** (eram 290; +5 regressões novas)
- `node --test tests/scripts/utf8-encoding-integrity.test.mjs` — PASS, 10/10
- `node --test tests/scripts/dev-control-mvp.test.mjs` — PASS, **10/10**
  (estava 8/10 antes)
- `npm run web:build` — PASS
- `npm run docs:validate` — PASS
- `git diff --check` — PASS

### Asserções de teste que substituí — atenção do proprietário

A interpretação ratificada em `OWNER_DECISIONS.md` diz que afrouxar asserção de
teste exige decisão explícita do proprietário. Substituí três asserções e
declaro cada uma para que ele julgue:

1. `queue.filter(state === 'BACKLOG').length >= 10` → invariantes estruturais
   por linha da fila (task_id, project, priority, origin, summary, estado dentro
   do contrato, id único, no máximo um `ACTIVE`). Era um censo datado que
   quebrou quando a fila foi drenada; a troca é mais exigente, não menos.
2. `agents.find(name === 'Codex').observed === true` → coerência entre
   `STATUS.md` e a projeção de agentes, seja quem for o coordenador. Congelava
   quem coordenava naquela semana.
3. `taskDetails` de `ANALYTICS-METRIC-METHODOLOGY-2026-08-21` sem review/owner →
   invariante de procedência aplicado a **todas** as linhas: só a corrente vem
   de `handoffs/current/`, item sem arquivo não inventa review, estado ou owner,
   e nenhum item fora do corrente declara gates. A asserção antiga quebrou
   silenciosamente quando aquela task foi arquivada.

Nenhuma das três foi relaxada para acomodar minha alteração: as duas últimas já
falhavam antes dela, mascaradas porque esta suíte não está em nenhum gate em uso.

### Pendências que continuam abertas

- **SEN-F06 não foi revertido.** O empacotamento da mudança de regime de revisão
  dentro de `b478ef6a` já está no histórico; reverter exigiria reescrever commit
  publicado. Fica registrado como precedente a não repetir.
- **`test:all` continua fora do workflow `ubuntu-latest`.** Foi o que permitiu
  que `dev-control-mvp` ficasse vermelho sem ninguém ver. Correção pertence a um
  lote de CI próprio, não a este.
- **O parser de review do Control Plane** extrai cabeçalhos como se fossem
  findings (`'Verificação'`, `'Veredito formal'` duplicado). Defeito do painel,
  não deste lote; anotado para o backlog.
- **Limitações da seção anterior seguem integralmente válidas**: banco não
  verificado, nenhum QA autenticado de navegador, e o literal `Sem responsavel`
  sem acento continua dependendo exclusivamente da migration remota.

### Decisão do ciclo 2

APPROVED para finalização local. Merge da PR 45, deploy e qualquer nova
aplicação remota continuam **fora de autorização** (OD-001, OD-014, OD-015).

---

## Ciclo 3 — auditoria da aba Visão Geral a partir de evidência de produção

O proprietário enviou capturas da aplicação em produção e pediu revisão completa
da Visão Geral, com remoção de informação errada ou desnecessária. As capturas
mostravam, com a operação Aftersale selecionada, onze indicadores em
"Indisponível" e a frase "Este indicador tem uma limitação de origem registrada
pela equipe responsável", enquanto a aba Comercial exibia R$ 744.078 para o
mesmo recorte.

### Verificação independente contra o banco

Consulta somente-leitura ao projeto `jzmmvfcmruasqmrdmbup`, identidade
confirmada antes da execução, com `p_group_company => 'Aftersale'` e o mesmo
período das capturas:

| Chave | Estado | Valor |
| --- | --- | --- |
| `open_pipeline_amount` | available | 744077.50 |
| `won_amount` | available | 499.00 |
| `win_rate` | available | 2.56 |
| `open_deals` | available | 1095 |

Conclusão: **a origem publica o dado**. A frase exibida era falsa. O defeito é
de frontend, não de fonte nem de dimensão ausente.

`rpc_analytics_ceo_snapshot` respondeu em 346 ms pelo papel do MCP, então o
timeout não se reproduz por esse caminho; qual das chamadas falha no navegador
autenticado continua não medido (ver Limitações).

### Findings

#### V-01 — ALTA — o painel afirmava uma limitação de origem que não existe

`analytics-kpi-contract.mjs` usava `UNKNOWN_REASON_MESSAGE` — "Este indicador
tem uma limitação de origem registrada pela equipe responsável" — sempre que o
indicador não trazia motivo declarado, inclusive quando simplesmente não havia
sido carregado. O painel afirmava um fato que não tem como conhecer, atribuía o
problema à equipe de dados e não oferecia ação nenhuma ao leitor.

Corrigido: motivo ausente passa a dizer que não foi possível confirmar o
indicador nesta leitura, com ação; código não traduzido passa a dizer que a
origem enviou uma ressalva que o painel ainda não sabe traduzir, sem culpar
ninguém e sem vazar o código.

#### V-02 — ALTA — `operation_load_unavailable` não tinha tradução

O código era emitido pelo próprio frontend em `buildUnavailableOperationKpiPayload`
e não existia no dicionário de motivos, então caía no aviso genérico do V-01.
Falha de carregamento aparecia como característica do dado. Corrigido com
tradução própria, que nomeia a falha e oferece atualizar.

#### V-03 — ALTA — falha de leitura era indistinguível de ausência de dado

Não havia estado que separasse "não carregou" de "a origem não publica esta
dimensão". As duas viravam a mesma parede de cards. Corrigido com
`operationLoadFailed`, aviso único no topo e ação "Tentar de novo" — esta
apoiada em `operationRetryToken` nas dependências do efeito, sem o qual o botão
existiria sem refazer leitura alguma, porque o memo de filtros é estável por valor.

#### V-04 — MÉDIA — jargão técnico na tela executiva

A linha do recorte dizia "o recorte é aplicado server-side aos read models
publicados" e "associação ticket-empresa". Reescrita em linguagem de negócio,
preservando as três declarações que ela precisa fazer.

#### V-05 — MÉDIA — ressalva repetida onze vezes

Quando a faixa inteira cai pelo mesmo motivo, a frase subia em cada indicador.
Agora aparece uma vez no cabeçalho da faixa; o detalhe "Como interpretar"
continua trazendo a ressalva completa por indicador.

### Regra registrada pelo proprietário

"Os gráficos devem sempre respeitar os filtros aplicados pelo usuário", de
operação e de área. Defeito confirmado por leitura de código, não por suposição:
`AnalyticsTrendPanel` recebe apenas `domain`, `grain` e `groupCompany`, e chama
`getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`. A exclusão de
pipelines que Comercial e Customer Success já aplicam aos KPIs nunca alcança os
gráficos das mesmas telas, e `rpc_analytics_timeseries_by_operation` não tem
parâmetro para recebê-la. Registrado na fila como item 56, `BACKLOG`. **Exige
migration remota, portanto decisão do proprietário registrada antes da execução.**

Observação para quem pegar o item 56: o teste
`analytics-dashboard-domains-integrations.test.mjs` hoje **fixa** a chamada
defeituosa (`getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`).
Essa asserção terá de ser invertida junto com a correção, como foi feito no
ciclo 2 com o guard de escopo.

### Gates do ciclo 3

- `npm run web:typecheck` — PASS
- `npm run lint` — PASS
- `npm run test:focused` — PASS, **302/302** (eram 295)
- `analytics-kpi-contract` — PASS, 19/19
- `utf8-encoding-integrity` — PASS, 10/10
- `dev-control-mvp` — PASS, 10/10
- `npm run web:build` — PASS
- `npm run docs:validate` — PASS
- `git diff --check` — PASS
- Sonda de mutação independente das regressões novas: **6/6 mutantes mortos**

### Asserção de teste substituída — declarada ao proprietário

`analytics-dashboard-domains-integrations.test.mjs` fixava a redação antiga da
linha do recorte (`/Financeiro permanece consolidado e fora desta dimensão/`).
Substituída por uma asserção ancorada no próprio parágrafo do recorte, que exige
a declaração — Financeiro não é separado por operação — e proíbe o jargão. Falha
se a declaração sumir do lugar onde o leitor a procura; é mais exigente, não menos.

### Limitações do ciclo 3

- **Não foi possível determinar, no navegador autenticado, qual chamada falha.**
  Abri a aplicação no Chrome do proprietário e ela parou no login com as
  credenciais preenchidas pelo gerenciador. Não submeto formulário de senha,
  então o rastreamento de console e rede continua pendente. Enquanto isso, não
  está provado se a correção do ciclo 2 elimina a tela vazia que ele fotografou
  ou se a falha está nas próprias leituras operacionais servidas ao usuário.
- As correções deste ciclo tornam a tela honesta e recuperável em qualquer um
  dos dois casos, mas honestidade não é o mesmo que exibir o número.
- Banco verificado apenas por leitura pontual; nenhuma alteração remota foi feita.

### Decisão do ciclo 3

APPROVED para finalização local. Merge da PR 45, deploy e migration remota
continuam fora de autorização (OD-001, OD-014, OD-015, OD-016).

---

## Ciclo 4 — validação autenticada de navegador, enfim executada

O proprietário fez o login e abriu também o build local em
`http://127.0.0.1:4173`. Com isso a limitação declarada nos ciclos anteriores
deixou de existir e foi possível medir, e não inferir.

### Produção, com operação Aftersale selecionada

Ao contrário do que a captura anterior sugeria, **a Visão Geral não está
permanentemente quebrada**. Hoje ela exibe:

| Indicador | Produção | Banco |
| --- | --- | --- |
| Valor em negociação | R$ 744.078 | 744077.50 |
| Receita fechada | R$ 499 | 499.00 |
| Taxa de ganho | 2,6% | 2.56 |

Ou seja, a tela vazia que originou esta investigação era **falha intermitente**,
não estado permanente. Isso não diminui o defeito: quando falhava, a tela
afirmava uma limitação de origem inexistente e não oferecia ação. Continua
valendo, e continua corrigido.

Confirmado também que a frase falsa **está viva em produção agora**, nos cards
sem dimensão operacional — o build publicado é anterior ao mapeamento de
`operation_dimension_unavailable`.

### Build local com as correções — comportamento medido

Rede, com Aftersale selecionado: `rpc_analytics_ceo_snapshot` **não é chamado**,
e `rpc_analytics_commercial_kpis_by_operation`,
`rpc_analytics_support_kpis_by_operation` e
`rpc_analytics_cs_snapshot_by_operation` respondem 200. O guard de escopo do
ciclo 2 funciona no navegador autenticado, não apenas no teste.

Console da aplicação sem erros. O único erro registrado vem de uma extensão do
navegador (`csspeeper-inspector-tools`), fora do produto.

Tela conferida: números operacionais presentes (R$ 743.080, 2.794, R$ 499, 3%,
281), linha de escopo em linguagem de negócio, ressalva única no cabeçalho da
faixa e **nenhuma ocorrência** de "limitação de origem registrada pela equipe
responsável".

### V-06 — MÉDIA — encontrado na própria validação

Com a tela corrigida no ar, ficou visível um defeito vizinho que os testes não
pegariam: "Receita recorrente", "Clientes ativos", "Recebido no período",
"A receber em atraso", "Recorrência com atraso" e "Retenção líquida" exibiam
"Não foi possível confirmar este indicador nesta leitura. Atualize para tentar
de novo."

Esses indicadores **não têm dimensão operacional publicada**. Nenhuma
atualização faria o número aparecer. A mensagem convidava o usuário a insistir
por um valor que nunca viria — a mentira inversa da que eu tinha acabado de
remover.

Causa: `maskUnscopedOperationKpis` só reescrevia chaves que já existissem no
payload base. Sob recorte, o payload executivo é zerado, as chaves somem, e o
contrato cai no motivo ausente. Corrigido: a máscara passa a **garantir** a
entrada com `operation_dimension_unavailable`, exista ou não na origem.

Verificado na tela após a correção: os seis cards passaram a dizer "Este recorte
de operação ainda não possui dimensão publicada para este domínio; o painel não
atribui o consolidado a uma operação."

### Observação de desempenho, não corrigida neste lote

Sem operação selecionada, `rpc_analytics_ceo_snapshot` foi chamado **quatro
vezes** em uma única abertura, quando o contrato prevê duas janelas. Não toquei
nisso porque está fora da allowlist desta task e merece medição própria. Fica
registrado para um lote de desempenho.

### Gates do ciclo 4

web:typecheck PASS; lint PASS; test:focused PASS; kpi-contract PASS; utf8 PASS;
dev-control-mvp PASS; web:build PASS; docs:validate PASS; git diff --check PASS.

### Limitações que caíram e as que permanecem

- **Caiu:** QA autenticado de navegador. Console, rede e leitura servida foram
  verificados no build corrigido e em produção.
- **Permanece:** isolamento entre clientes e autorização por perfil não foram
  exercitados — a sessão usada é de administrador. Um teste de tenant exige
  outra conta e continua pendente.
- **Permanece:** nenhuma alteração remota foi feita; a migration segue apenas
  lida.

### Decisão do ciclo 4

APPROVED. Do meu lado a recomendação técnica sobre o merge deixa de estar
bloqueada por falta de evidência: o comportamento corrigido foi observado
funcionando no navegador autenticado. A decisão de publicar continua sendo do
proprietário, e a `OD-016` mantém merge e deploy fora da minha autonomia.
