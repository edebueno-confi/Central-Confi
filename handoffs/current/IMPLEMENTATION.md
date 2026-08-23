# IMPLEMENTATION

- Task: R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22
- Base SHA: ec37f5673f8ee957a806f235cbf7e5cdf141834e
- Implementation SHA: b478ef6a7605942e3058557578f27e2e0342f5c6 (ciclo 1)
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Codex (Reviewer mode)
- Review mode: OWNER_AUTHORIZED_SELF_REVIEW
- State: APPROVED

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

- As migrations `access_02_provisioning_e2e_v1` e
  `analytics_utf8_and_scope_guard_v1` foram aplicadas no Supabase remoto
  `jzmmvfcmruasqmrdmbup` e verificadas por catálogo, definições e smoke
  read-only.
- O frontend está em PR 45 e possui preview Vercel concluído; a promoção para
  produção depende do gate obrigatório da `main`.
- Não houve QA autenticado de navegador após a alteração, nem carga real sob
  concorrência. A paridade remota foi verificada por leitura de catálogo,
  definições e chamadas read-only anteriores.
- A operação continua fora da dimensão Financeiro. Em abertura direta por
  operação, dimensões não publicadas permanecem indisponíveis por contrato.
- Próximo passo: aguardar os checks do PR 45, fazer merge controlado na `main`
  quando verdes e validar o domínio de produção após a promoção.

---

## Ciclo 2 — correções dos findings da revisão independente

Executado pelo Sentinel sob autorização explícita do proprietário em 2026-08-23.

- `analytics-ceo-snapshot.mjs`: novo `buildExecutiveIntegrityLine(dataQuality,
  operationScoped)` — helper puro que recusa publicar número de `dataQuality`
  sob recorte operacional e nunca converte ausência em zero. Tipo declarado em
  `analytics-ceo-snapshot.d.mts`.
- `analytics-ceo-snapshot.mjs`: `state.reason` da base indisponível virou frase
  publicável; o identificador de máquina passou para `state.reasonCode`.
- `AnalyticsCeoPage.tsx`: a branch operacional deixou de reaproveitar
  `current.data`; a base sob recorte é sempre `buildUnavailableCeoSnapshot()`.
  A linha "Governança e cobertura" passou a consumir o helper puro.
- `handoffs/README.md`: task registrada na fila canônica como item 55, `ACTIVE`.
- `handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/`: removido por ser
  arquivo prematuro; conteúdo permanece recuperável em `b478ef6a`.

### Testes

- `utf8-encoding-integrity.test.mjs`: passou a importar e exercitar
  `repairOperationalMojibake` e `sanitizeOperationalVisibleText`; o teste da
  migration afirma propriedades de segurança do patch em vez de literais.
- `analytics-dashboard-domains-integrations.test.mjs`: o guard operacional agora
  precisa retornar antes da chamada consolidada; asserção que congelava o
  defeito foi invertida.
- `analytics-ceo-snapshot.test.mjs`: quatro regressões comportamentais novas.
- `dev-control-mvp.test.mjs`: três asserções datadas trocadas por invariantes
  estruturais (declaradas ao proprietário no REVIEW).

### Gates do ciclo 2, reexecutados no host

web:typecheck PASS; lint PASS; test:focused 295/295; utf8 10/10;
dev-control-mvp 10/10; web:build PASS; docs:validate PASS; git diff --check PASS.
Sonda de mutação independente: 6/6 mutantes mortos.

### Não executado

Migration remota, merge, deploy e QA autenticado de navegador permanecem fora de
autorização e fora deste ciclo.
