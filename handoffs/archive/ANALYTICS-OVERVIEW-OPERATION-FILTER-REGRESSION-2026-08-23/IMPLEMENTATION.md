# IMPLEMENTATION

- Task: ANALYTICS-OVERVIEW-OPERATION-FILTER-REGRESSION-2026-08-23
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 7bdaeec0689fb26a7e17aae4a63f1ea4ae7c6801
- Implementation SHA: UNCOMMITTED_WORKTREE
- Allowlist alterada: apps/web/src/features/analytics/AnalyticsCeoPage.tsx, apps/web/src/features/analytics/analytics-ceo-snapshot.mjs, apps/web/src/features/analytics/analytics-ceo-snapshot.d.mts, tests/scripts/analytics-ceo-snapshot.test.mjs, tests/scripts/analytics-overview-honesty.test.mjs e os quatro handoffs correntes. analytics-api.ts e AnalyticsTrendPanel.tsx foram inspecionados, mas não alterados.

## Evidência inicial

QA browser local autenticado em `http://127.0.0.1:4173/admin/analytics` reproduziu o defeito. Sem filtro, a Visão Geral carregou valores. Com `Aftersale`, a Visão Geral exibiu os principais blocos como `Indisponível`, enquanto Comercial carregou R$ 743.080 em negociação e Suporte carregou 2.794 na fila. Não houve erro de console porque o fluxo captura a falha e apresenta estado indisponível.

## Hipótese técnica a validar

O caminho operacional da Visão Geral executava Comercial, Suporte e o snapshot de Customer Success em uma composição conjunta. Um erro em qualquer chamada definia `operationKpis=null` e impedia a aplicação dos resultados válidos dos outros domínios. A chamada passou a usar `Promise.allSettled`, preservando cada domínio concluído e publicando falha parcial quando necessário. O contrato de `rpc_analytics_timeseries_by_operation` foi somente inspecionado; não foi alterado, porque o drift local continua NO-GO.

## Implementação concluída

- `buildOperationKpisFromSettledLoads` normaliza resultados resolvidos/rejeitados sem converter falha de Customer Success em indisponibilidade de Comercial ou Suporte.
- A Visão Geral mantém os dados operacionais válidos e diferencia falha total, falha parcial e ausência legítima de dimensão operacional.
- A mensagem de erro orienta o usuário sem afirmar que a origem não possui dados; o retry continua disponível.
- A declaração TypeScript do módulo `.mjs` foi atualizada para manter o contrato compilável.
- Regressões cobrem domínio secundário rejeitado, falha total e o novo fluxo de composição.

## Validação executada

- QA browser local autenticado em `http://127.0.0.1:4173/admin/analytics`: com `Aftersale`, Visão Geral exibiu R$ 743.080 em negociação, 2.794 na fila, R$ 499 fechados, 3% de ganho e 281 atendimentos abertos; não houve erro ou warning no console. Comercial e Suporte permaneceram funcionais no mesmo recorte.
- QA browser local sem filtro: snapshot consolidado carregou os valores de referência; não houve erro ou warning no console.
- `node --test tests/scripts/analytics-ceo-snapshot.test.mjs tests/scripts/analytics-overview-honesty.test.mjs`: 20/20 PASS.
- `npm run test:focused`: 306/306 PASS em 48 arquivos.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS, 945 módulos transformados.
- `npm run lint`: PASS, 0 erros e 158 warnings legados.
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline resolvidos.
- `git diff --check`: PASS.

## Limitações

- O banco local ainda possui drift: gate fail-closed com migrations ausentes, versão órfã e objetos sem origem comprovada. Nenhuma migration, reset, repair ou SQL de escrita foi executado.
- A assinatura real da RPC de séries não foi modificada nem validada contra produção neste lote. A evolução dos gráficos permanece dependente de reconciliação autorizada do schema.
- QA autenticado confirmou a tela e o comportamento do recorte, mas não comprova paridade remota, RLS/cross-tenant ou integração HubSpot/OMIE.
- Commit, push, merge, deploy e publicação não foram executados.

## Restrições

O drift de schema continua NO-GO. Nenhuma migration, SQL de escrita, alteração de banco, chamada externa, produção, push, merge ou deploy será executado neste lote.
