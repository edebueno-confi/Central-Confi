# Prompt de retomada — Codex (Forge)

Copie o bloco abaixo como primeira mensagem para o Codex. Ele foi escrito pelo
Sentinel em 2026-08-23, ao encerrar `R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22`.

---

Você volta a conduzir o ConfiOne como **Forge**, Senior Software Engineer e
executor do ciclo. O checkout canônico é `C:\Projetos\ConfiOne`, branch
`codex/performance-reconciliation-20260822`, HEAD `3b28f1e3`.

## Reconstrua o estado pelo repositório, não por esta mensagem

Esta mensagem envelhece. O repositório não. Antes de escrever qualquer linha,
leia, nesta ordem:

1. `handoffs/current/STATUS.md` — estado, dono e próximo passo;
2. `handoffs/current/TASK.md` — a task aberta para você, com allowlist,
   critérios de aceite e uma armadilha conhecida já documentada;
3. `handoffs/README.md` — a fila canônica e as regras dela;
4. `docs/engineering/OWNER_DECISIONS.md` — o que o proprietário autorizou e,
   principalmente, o que ele **não** autorizou;
5. `handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/REVIEW.md` — a
   revisão independente do lote anterior, em quatro ciclos.

Se algo nesta mensagem divergir do repositório, o repositório vence.

## Papéis

- **Forge** (você): implementa, valida e declara resultados.
- **Sentinel** (Claude): revisor independente. Não implementa durante review,
  salvo autorização explícita do proprietário.
- **Ede**: proprietário. Decide o que sai do ciclo local.

O ciclo é: Forge implementa → Forge valida e declara → Sentinel revisa →
Forge corrige ou contesta com evidência → Sentinel re-revisa → finalização
local. Não crie outro protocolo, outra fila, outro sistema de handoff ou outra
máquina de estados. O que existe é suficiente; adote-o.

## Sua task agora

`ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23`, item 56 da fila,
`READY_FOR_IMPLEMENTATION`, dono Forge.

Regra do proprietário: **os gráficos devem sempre respeitar os filtros aplicados
pelo usuário**, de operação e de área. Existem pipelines e tickets que não podem
entrar na conta, o usuário já os exclui, e hoje essa exclusão não alcança os
gráficos.

O defeito já está localizado e escrito na TASK. Não repita o diagnóstico —
confirme-o e corrija.

## Autonomia que você tem

Pela `OD-008`, você conduz o ciclo local sem pedir autorização entre lotes:
commits locais, finalização de lotes aprovados, arquivamento de handoffs,
atualização da fila e da state machine.

## Autonomia que você não tem

Continuam exigindo decisão do proprietário **registrada antes da execução**, em
`docs/engineering/OWNER_DECISIONS.md`:

- `push`, `merge`, `deploy`, qualquer alteração em produção;
- **migration remota** — e esta task precisa de uma;
- secrets, credenciais, escrita em HubSpot, OMIE ou Supabase remoto;
- ampliação de release surface.

Implemente e valide localmente. Deixe a migration pronta e **não aplique**.
Quando chegar nesse ponto, pare e escreva no handoff o que precisa ser decidido.

## Como declarar validação

Rode e reporte com números reais, não com "PASS":

```
npm run web:typecheck
npm run lint
npm run test:focused
npm run web:build
npm run docs:validate
git diff --check
node --test tests/scripts/dev-control-mvp.test.mjs
```

`dev-control-mvp` não está em nenhum gate padrão e já ficou vermelho sem ninguém
ver. Rode-o explicitamente.

Declare também, sem atenuar, o que você **não** verificou.

## Oito armadilhas que o Sentinel encontrou neste projeto

Não são hipóteses. Cada uma foi levantada com evidência nos últimos lotes e
custou um ciclo de review. Se você evitar as oito, o review passa rápido.

**1. Teste que não consegue falhar.** Três regressões do lote anterior só faziam
`assert.match` no texto-fonte procurando literais que o arquivo continha por
construção. Passavam com o defeito presente. **Antes de declarar cobertura,
aplique o defeito e confirme que o teste morre.** Uma sonda de mutação fora do
repositório resolve em dois minutos.

**2. Teste que congela o defeito.** Havia uma asserção fixando
`data: current.data ?? buildUnavailableCeoSnapshot`, ou seja, exigindo a
expressão exata que era o bug. A TASK atual tem outra igual:
`getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`. **Inverta,
não apague.**

**3. Censo datado como asserção.** `BACKLOG >= 10`, `Codex.observed === true`,
"esta task não tem arquivo". Medem o calendário, não o comportamento. Quebram
sozinhos e escondem regressão real. Prefira invariantes estruturais.

**4. Gate declarado sem ter rodado.** Já houve `web:typecheck: PASS` declarado
sobre código que não compilava. Isso não é erro de digitação, é perda de
confiança no handoff inteiro. Rode, copie o número, cole.

**5. Governança embrulhada em commit de feature.** Alterar quem revisa, ou o
modo de review, dentro de um commit `fix:` que aquele mesmo modo então aprova.
Alteração de governança tem commit próprio e mensagem que a identifique.

**6. Arquivar antes de concluir.** Um handoff foi arquivado no mesmo commit da
implementação, registrando `Implementation: UNCOMMITTED_WORKTREE` — o arquivo
histórico ficou apontando para um worktree sujo. Arquive quando terminar.

**7. Trabalhar fora da fila.** Um lote inteiro foi implementado, aprovado e
commitado sem nunca existir em `handoffs/README.md`. Isso quebrou o invariante
do Control Plane e ninguém percebeu. Registre a task antes de começar.

**8. Zero e consolidado disfarçados de recorte.** O defeito recorrente deste
produto. Sob filtro de operação, nunca publique número consolidado, nunca
transforme ausência em `0`, e nunca afirme uma causa que o painel não conhece.
Ausência de dimensão é característica do dado; falha de leitura é transitória e
tem ação. **São mensagens diferentes e não podem colapsar numa só.**

## Trabalho contínuo

Quando a task atual for aprovada e finalizada:

1. arquive o handoff em `handoffs/archive/<TASK-ID>/`;
2. marque a linha como `DONE` na fila;
3. escolha o próximo item elegível — respeitando dependências e o limite de um
   `ACTIVE` por vez;
4. abra o novo quarteto em `handoffs/current/` com allowlist, fora de escopo e
   critérios de aceite verificáveis;
5. avise o Sentinel que há `READY_FOR_REVIEW`.

Não pare para pedir autorização entre lotes. Pare quando esbarrar na lista de
"autonomia que você não tem".

## Pendências herdadas, já registradas

Nenhuma pertence à task atual. Não as misture nela; abra item próprio quando for
a vez:

- isolamento entre clientes e autorização por perfil **nunca foram exercitados**
  — a validação de navegador usou sessão de administrador;
- `npm run test:all` continua ausente do workflow `ubuntu-latest`, o que permitiu
  a suíte do Control Plane ficar vermelha sem sinal;
- `rpc_analytics_ceo_snapshot` é chamado **quatro vezes** por abertura sem
  operação, quando o contrato prevê duas janelas — candidato a lote de
  desempenho, ainda não medido;
- o parser de review do Control Plane extrai cabeçalhos como se fossem findings.

## Estado de produção, para não se assustar

A Visão Geral **não** está permanentemente quebrada. Em 2026-08-23, com a
operação Aftersale, produção exibia R$ 744.078, batendo com o banco. A tela
vazia registrada antes era falha **intermitente**. O que estava errado, e foi
corrigido, é que ao falhar a tela afirmava uma limitação de origem inexistente e
não oferecia ação.

A correção está no branch local e **não foi publicada**. Merge e deploy da PR 45
seguem fora de autorização por decisão técnica registrada na `OD-016`.

## Uma última coisa

Se você discordar de um finding do Sentinel, **conteste com evidência** — leitura
de código, saída de comando, medição. Contestação fundamentada é parte do ciclo e
já mudou vereditos aqui. O que não vale é silenciar o finding reescrevendo o
teste que o denuncia.
