# REVIEW

- Reviewer: Sentinel (Independent Code Reviewer / Principal Engineer)
- Review mode: SENTINEL_INDEPENDENT
- Decision: CHANGES_REQUESTED
- Reviewed task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e
- Implementation: b478ef6a7605942e3058557578f27e2e0342f5c6
- HEAD no momento da revisão: cdbda1b6
- Data: 2026-08-23

A auto-revisão anterior do Forge/Codex permanece preservada em
`handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/REVIEW.md` e não foi
apagada nem reescrita. Esta revisão é independente e a substitui apenas como
documento corrente, conforme OD-008 e a interpretação registrada em
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
