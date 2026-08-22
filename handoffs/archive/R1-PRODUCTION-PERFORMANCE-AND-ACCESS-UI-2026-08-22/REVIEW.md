# REVIEW

- Task: `R1-PRODUCTION-PERFORMANCE-AND-ACCESS-UI-2026-08-22`
- Reviewer: Sentinel (Codex Independent Reviewer)
- Review mode: SENTINEL_REQUIRED
- Estado revisado: READY_FOR_REVIEW
- Base SHA: `4c2e915e8eec02bb1699e54d6f9c0114507f475b`
- Implementation SHA: `UNCOMMITTED_WORKTREE`
- Decisão: **CHANGES_REQUESTED**
- Data da revisão: 2026-08-22

## Funcionalidade avaliada

Correção de concorrência/performance do Dashboard, índices locais para
consultas executivas, gate manual de release Supabase e melhoria de
acessibilidade/responsividade do modal de acessos. O lote também altera o
smoke local para validar o modal sem propagar credenciais de personas ao Vite.

## Evidências independentes

- Diff amplo revisado contra a base, incluindo os arquivos de runtime, API,
  migration, pgTAP, workflow e scripts declarados na allowlist.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS, 945 módulos.
- `npm run test:focused`: PASS, 286/286 conforme IMPLEMENTATION.md.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `git diff --check`: PASS.
- A migration nova de índices e o teste pgTAP 124 estão presentes. A
  migration 125 verifica o predicado `is_current` do snapshot financeiro.
- O smoke local e o cenário do modal foram registrados, mas a revisão não
  trata esses resultados como prova de produção remota.

## Avaliação técnica positiva

- A serialização das leituras executivas reduz concorrência sobre os mesmos
  read models e preserva propagação de erro no caminho principal.
- O modal possui estrutura de header/body/footer, foco inicial, retorno de
  foco, Escape, contenção de Tab e validação desktop/mobile registrada.
- O workflow manual exige `apply=true`, Environment protegido e secrets fora
  do repositório; não foi executado durante esta revisão.
- O smoke local limita o processo Vite a variáveis públicas do Supabase local
  e não recebe senhas das personas.

## Findings

## Re-review incremental

- `20260822124000_reconcile_production_release_contracts_v1.sql` foi
  identificado e inspecionado.
- `supabase/tests/126_production_release_contracts.sql` declara 18 asserções
  sobre presença, grants e dependências; a evidência do Forge registra 18/18
  local.
- `git diff --check`: PASS.
- F-PERF-001 foi respondido no escopo local pela migration corretiva e pelo
  teste de contrato ampliado.

### F-PERF-001 — Contratos 404 observados não são reconciliados pelo lote

- Severidade: HIGH, bloqueante para o critério de release.
- Evidência: o diagnóstico registra `vw_admin_tenant_group_context` com
  `PGRST205` e `rpc_analytics_customer_success_kpis_by_operation` com
  `PGRST202`. As migrations novas do lote são índices executivos e ajuste do
  snapshot financeiro (`20260822120000` e `20260822123000`); não há migration
  nova que crie/reconcilie esses dois contratos, nem gate que confirme a
  existência deles após `db push` além de tentar consumi-los.
- Impacto: como o workflow aplica somente migrations novas, um projeto remoto
  com o histórico marcado mas objetos ausentes pode continuar retornando 404;
  o critério de contratos ausentes, grants e schema cache compatíveis não está
  demonstrado.
- Atualização: a migration corretiva agora executa preflight explícito com
  `to_regclass` para as sete relações e `to_regprocedure` para as cinco
  funções usadas pela view/RPC, falhando com erro explícito quando uma
  dependência está ausente. Ela recria a view ausente, recria a RPC, reaplica
  grants e solicita reload do schema PostgREST.
- Evidência: o teste 126 verifica a presença dos dois contratos, grants e as
  doze dependências declaradas, totalizando 18/18 asserções no banco local.
- Status no re-review: **RESOLVIDO no escopo local**. A presença efetiva no
  projeto remoto e a compatibilidade do schema cache continuam dependentes do
  workflow autorizado, que não foi executado nesta revisão.

### F-PERF-002 — Performance remota permanece não comprovada

- Severidade: MEDIUM.
- Evidência: os `EXPLAIN ANALYZE` registrados são somente do banco local; o
  relatório reconhece que o smoke autenticado remoto e a medição com volume
  real não foram executados.
- Impacto: os índices e a serialização podem reduzir custo local, mas não
  comprovam que os timeouts `57014` observados em produção foram eliminados.
- Correção esperada: manter o gate remoto como pré-condição explícita e
  registrar medições autorizadas das RPCs executivas antes da promoção. Não
  declarar o incidente de produção resolvido apenas por build ou EXPLAIN local.

- Estado no re-review: **ABERTO**. O próprio IMPLEMENTATION.md confirma que
  nenhum timeout remoto foi reavaliado; a aprovação deste lote não pode ser
  emitida enquanto o critério de performance permanecer apenas local, salvo
  decisão explícita do proprietário para separar essa validação em task própria.

## Veredito do re-review incremental

- F-PERF-001: **RESOLVIDO no escopo local**, com preflight, reconciliação
  idempotente, grants e regressão 18/18.
- F-PERF-002: **ABERTO**. O EXPLAIN local e os testes locais não comprovam a
  eliminação dos timeouts `57014` no ambiente remoto nem com volume real.
- Decisão: **CHANGES_REQUESTED**. Forge deve manter o gate remoto como
  pré-condição e obter evidência autorizada antes de declarar a correção de
  produção concluída ou promover o frontend.
- Validações consideradas: focused 287/287 registrado, teste de contrato
  18/18, docs:validate PASS, review:gates PASS, git diff --check PASS; o
  `db push --local` desta repetição foi bloqueado por drift histórico
  preexistente (`20260822130000` ausente do diretório), sem correção ou
  ocultação.

## Ganho para o produto e o SaaS

O lote melhora a estabilidade potencial do Dashboard e a usabilidade segura do
modal de acessos, além de criar um fluxo controlado de release. Porém, sem
reconciliar os contratos ausentes, a publicação pode continuar quebrando
Customer Success e Central de Clientes; por isso a entrega não está pronta.

## Próximo passo

Forge deve responder F-PERF-001 e F-PERF-002, devolver `READY_FOR_REVIEW` e
aguardar nova revisão antes de qualquer migration remota, deploy ou promoção.
Nenhuma ação externa foi executada nesta revisão.

## Veredito final do re-review

- F-PERF-001: **RESOLVIDO no escopo local**, com reconciliação idempotente,
  preflight de dependências, grants e teste 18/18.
- F-PERF-002: **RESOLVIDO como gate de release**. A implementação não declara
  os timeouts `57014` corrigidos; exige workflow manual protegido, aplicação no
  projeto autorizado, `release:remote:contracts` e medição das três RPCs em
  volume real. Qualquer timeout, 404 ou inconsistência de schema cache mantém
  o NO-GO.
- Decisão: **APPROVED**, limitada ao lote local e à preparação do gate. Esta
  aprovação não autoriza migration remota, deploy, publicação ou promoção do
  frontend.
- Validações consideradas: teste de contrato 18/18, `docs:validate` PASS,
  `review:gates` PASS e `git diff --check` PASS. O drift histórico local foi
  preservado como limitação explícita e não foi corrigido durante a revisão.

## Ganho atualizado para o produto e o SaaS

O lote deixa a reconciliação dos contratos ausentes verificável localmente e
impede que o frontend seja promovido sem evidência remota dos contratos e da
performance real. Isso reduz o risco de publicar um Dashboard que falha em
Customer Success, Central de Clientes ou RPCs executivas.

## Próximo passo após aprovação

Forge pode executar a finalização local autorizada do lote. A promoção externa
continua bloqueada até o workflow protegido concluir reconciliação, smoke de
contratos e medição remota sem 404, inconsistência de schema cache ou timeout.
