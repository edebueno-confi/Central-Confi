# IMPLEMENTATION

- Task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e
- Implementation SHA: UNCOMMITTED_WORKTREE
- Owner: Forge
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- State: READY_FOR_REVIEW

## Alterações allowlisted

- `AnalyticsCeoPage` agora interrompe a leitura executiva consolidada quando há
  operação selecionada. A Visão Geral usa os read models operacionais de
  Comercial, Customer Success e Suporte e mantém indisponíveis as dimensões
  sem contrato operacional publicado.
- Foi criado `buildUnavailableCeoSnapshot()` para a abertura direta em uma
  operação, sem fabricar KPIs consolidados.
- O modelo analítico repara mojibake conhecido na fronteira de leitura e os
  fallbacks operacionais usam `Indisponível` e `Sem responsável`.
- A migration
  `supabase/migrations/20260822220000_analytics_utf8_and_scope_guard_v1.sql`
  atualiza somente os literais de fallback das funções existentes, preservando
  seus contratos e a origem dos dados.
- Foram adicionadas regressões para o guard de escopo, o snapshot indisponível
  e a integridade UTF-8.

## Diagnóstico confirmado

- Produção possui os RPCs principais e views consultados. O 404 histórico de
  objeto inexistente não corresponde ao estado remoto atual.
- O payload remoto de `rpc_analytics_customer_success_kpis_v2` continha
  `Sem responsÃ¡vel`.
- `rpc_analytics_ceo_snapshot_legacy` e `rpc_analytics_support_kpis_v2`
  publicavam `Sem responsavel` sem acento.
- A seleção canônica de operação é `Aftersale`, `Confi`, `Confi Analytics` ou
  `Neotrust`. A seleção `Aftersale` retornou dados próprios no RPC Comercial;
  `After Sale` não retorna dados.
- Antes da correção, `AnalyticsCeoPage` chamava `getCeoSnapshot` antes de
  testar `groupCompany`, disparando leitura consolidada pesada junto com as
  leituras operacionais e aumentando o risco de timeout/HTTP 500.

## Validações locais

- Testes diretamente relacionados:
  `node --test tests/scripts/analytics-ceo-snapshot.test.mjs
  tests/scripts/analytics-dashboard-domains-integrations.test.mjs
  tests/scripts/utf8-encoding-integrity.test.mjs` PASS, 23/23.
- Suíte focada: `npm run test:focused` PASS, 290/290.
- `npm run web:typecheck` PASS.
- `npm run web:build` PASS, 945 módulos transformados.
- `npm run lint` PASS, 0 erros e 158 warnings preexistentes.
- `npm run docs:validate` PASS, 0 bloqueios e 9 alertas documentais
  históricos.
- `npm run review:gates` PASS, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos.
- `git diff --check` PASS.
- A lógica SQL da migration foi executada localmente como bloco equivalente
  porque o wrapper `supabase db query --local --file` rejeitou o arquivo com
  múltiplos comandos preparados. A consulta local posterior retornou
  `Sem responsável` no KPI de Customer Success.

## Limitações e próximo passo

- A migration ainda não foi aplicada no Supabase remoto e o frontend ainda não
  foi publicado neste lote.
- Não houve QA autenticado de navegador após a alteração, nem carga real sob
  concorrência. A paridade remota foi verificada por leitura de catálogo,
  definições e chamadas read-only anteriores.
- A operação continua fora da dimensão Financeiro. Em abertura direta por
  operação, dimensões não publicadas permanecem indisponíveis por contrato.
- Entregar agora para revisão independente do Sentinel. Após `APPROVED`, fazer
  stage seletivo, commit local exclusivo, aplicar as migrations aprovadas no
  projeto remoto e validar os RPCs antes de publicar o frontend.
