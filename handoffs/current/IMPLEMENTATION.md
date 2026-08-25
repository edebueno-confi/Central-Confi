# IMPLEMENTATION

- Task: ANALYTICS-DASHBOARD-FILTER-RUNTIME-PROOF-2026-08-25
- State: IDLE
- Owner: Forge
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Role: EXECUTOR
- Agent coordination: IDLE
- Base SHA: 869ea70198856535e112801ea86808d501e4abc8
- Implementation SHA: e8dc9d92

## Diagnóstico

A auditoria autenticada read-only das cinco superfícies e 50 combinações de
tema/viewport passou console, page errors, request failures, respostas
inesperadas e overflow. O critério antigo de seis cards comerciais falhou por
seletor obsoleto e não representa um defeito observado na tela.

Permanece sem prova executável no runtime que a troca de cada filtro dispare
nova RPC com o contexto correto e sem reaproveitar a leitura anterior.

## Plano

1. Criar gate Playwright local read-only usando as fixtures QA existentes.
2. Exercitar operação, período, filtros de domínio, pipelines e granularidade.
3. Sanitizar requests e validar parâmetros dos RPCs publicados.
4. Registrar evidência e executar testes, typecheck/build/lint/documentação e
   quality gates.
5. Entregar para revisão independente sem alterar produto, banco ou integrações.

## Resposta aos findings F-FILTER-001 e F-FILTER-002

- F-FILTER-001: resolvido no lote. O harness passou a comparar pathname e
  parâmetros esperados da superfície, além do marcador `aria-current="page"`
  com o rótulo da aba. Quando há subaba ativa, o conjunto de marcadores é
  comparado e precisa conter a aba da superfície. Rota ou aba divergente agora
  gera falha bloqueante.
- F-FILTER-002: resolvido no lote. Cada janela de interação agora exige
  parâmetros completos e exatos. Chave ausente, `null`, valor anterior ou
  valor divergente falham; período valida `p_from` e `p_to`, filtros de domínio
  validam o valor selecionado e pipelines validam o array completo de
  exclusões, incluindo o ID identificado no payload read-only da superfície.
- A primeira reexecução do browser revelou chamadas transitórias legítimas ao
  preencher os dois limites de período: uma delas ainda carregava o outro
  limite anterior. O comparador foi ajustado para validar o último payload
  parametrizado da janela, mantendo falha para o último valor ausente, nulo ou
  divergente. A regressão cobre valor anterior seguido do valor final correto.
- O helper de asserções é puro, está dentro da allowlist e possui regressões
  determinísticas independentes do browser.

## Allowlist efetiva da correção

- `scripts/local-qa/analytics-dashboard-filter-runtime.mjs`
- `scripts/local-qa/analytics-dashboard-filter-runtime-assertions.mjs`
- `tests/scripts/analytics-dashboard-filter-runtime.test.mjs`
- `docs/reports/ANALYTICS_DASHBOARD_FILTER_RUNTIME_PROOF_2026-08-25.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`; `REVIEW.md`
  permanece preservado pelo reviewer.

O helper novo contém somente comparadores puros usados pelo gate. Nenhum arquivo
de produto, banco, migration, RPC, secret ou integração externa foi alterado.

## Implementação do gate

- O alvo é fixado em `http://127.0.0.1:4173`; qualquer outro host ou porta
  aborta o processo.
- GET/HEAD/OPTIONS locais e POSTs de autenticação, RPCs analíticas e RPC de
  contexto explicitamente allowlisted são capturados; requests de escrita,
  hosts externos, falhas de rede, erros de console/página, respostas 4xx/5xx e
  rotas indevidas bloqueiam o resultado.
- A captura sanitiza corpos antes de persistir a evidência e não grava
  credenciais, tokens, cookies ou chaves.
- A validação usa a janela de requests criada por cada interação, exige ao
  menos uma nova RPC analítica para cada alteração válida e confere o parâmetro
  correspondente ao contrato da superfície.
- Os contratos financeiros foram separados dos contratos de CRM: `p_status`
  e `p_aging_bucket` não são confundidos com `p_stage_id` e `p_priority`.

## Evidência final do runtime

Execução final de `node scripts/local-qa/analytics-dashboard-filter-runtime.mjs`
em 2026-08-25, reexecutada após as correções deste re-review:

- 10/10 combinações autenticadas locais sem falhas, cobrindo as cinco abas e
  as fixtures `authorized` e `dashboard_viewer`;
- 274 RPCs analíticas locais observadas;
- 52 alterações válidas de filtros e 52 novas leituras correspondentes;
- operações observadas: `Aftersale`, `Confi`, `Confi Analytics` e `Neotrust`;
- 0 erros de console, 0 erros de página, 0 falhas de request, 0 respostas
  locais 4xx/5xx, 0 requests externos e 0 rotas indevidas;
- loading e mudança de conteúdo registrados por interação como diagnóstico;
- Financeiro validado com período, situação e aging, sem inventar filtro de
  operação que não existe no contrato.
- As dez URLs finais coincidiram exatamente com pathname e query esperados, e a
  aba de domínio esperada apareceu no marcador `aria-current="page"`.
- O período foi validado em um único payload contendo simultaneamente
  `p_from=2026-01-01` e `p_to=2026-08-24`; campos de domínio e pipelines foram
  comparados com os valores selecionados, incluindo IDs obtidos do catálogo
  local read-only.

As reexecuções pós-correção do smoke completo passaram 10/10 em alvo local.
Elas não substituem a revisão independente. O resultado foi produzido sem
nova escrita ou ação externa.

O relatório completo está em
`docs/reports/ANALYTICS_DASHBOARD_FILTER_RUNTIME_PROOF_2026-08-25.md`.

## Validações executadas até aqui

- `node --check scripts/local-qa/analytics-dashboard-filter-runtime.mjs` PASS;
- `node --test tests/scripts/analytics-dashboard-filter-runtime.test.mjs` PASS,
  9/9, incluindo regressões de rota/aba, payload incompleto ou divergente e
  array completo de exclusões de pipeline;
- `node scripts/local-qa/analytics-dashboard-filter-runtime.mjs` PASS,
  10/10 combinações, 0 falhas.

## Gates complementares

- `npm run test:focused` PASS, 367/367;
- `npm run contracts:typecheck` PASS;
- `npm run web:typecheck` PASS;
- `npm run build` PASS, 946 módulos;
- `npm run lint` PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate` PASS, 0 bloqueios;
- `npm run review:gates` PASS, 0 regressões bloqueantes e 47 itens de baseline
  resolvidos;
- `git diff --check` PASS.

## Limitações

O gate não corrige autenticação, RPCs ou banco. RLS/cross-tenant servido,
performance com volume real, remoto e produção permanecem fora desta task.

## Transferência para revisão

State=READY_FOR_REVIEW, Owner=Sentinel, Role=REVIEWER, Reviewer active=Sentinel,
Review mode=SENTINEL_REQUIRED e Agent coordination=REVIEW_ACTIVE. Sentinel deve
revisar independentemente a correção de F-FILTER-001/F-FILTER-002, incluindo as
regressões 9/9 e a reexecução runtime 10/10 pós-correção.

## Finalização local

Sentinel aprovou o lote. FINALIZE_LOCAL foi executado seletivamente, com
allowlist validada e handoffs arquivados. O commit funcional foi criado sem
misturar as alterações preexistentes do worktree; o SHA final será registrado
no checkpoint de metadados desta finalização.
