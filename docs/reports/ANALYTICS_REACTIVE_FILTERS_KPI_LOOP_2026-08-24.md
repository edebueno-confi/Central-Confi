# ANALYTICS-REACTIVE-FILTERS-KPI-LOOP-2026-08-24

## Resultado

Correção local do loop de renderização do `AnalyticsTrendPanel` e alinhamento
dos filtros do Dashboard para emissão reativa. O lote não altera RPCs, views,
migrations, RLS, grants, banco, integrações ou secrets.

O finding HIGH F-REACTIVE-001 foi respondido localmente. Cada nova `queryKey`
invalida a superfície renderizada antes das leituras: o estado entra em
`loading`, o cancelamento/ignore de respostas antigas permanece ativo e os
payloads associados não são reutilizados como se pertencessem ao novo recorte.

## Evidências e correções

- `AnalyticsTrendPanel` usa uma lista vazia de pipelines excluídos estável,
  chave semântica determinística e geração de requisição. A resposta de uma
  consulta anterior é ignorada quando o recorte muda, e o payload é limpo ao
  entrar em loading.
- A chave compartilhada contempla domínio/período, operação, pipelines
  excluídos, responsável, etapa/status, prioridade, granularidade e busca
  quando a superfície publica essa dimensão. Pipelines são deduplicados e
  ordenados antes da chave.
- Comercial, Suporte e Financeiro dependem da chave efetiva, não da identidade
  transitória de objetos/arrays de filtros.
- Ao iniciar uma geração, Comercial limpa estado, KPI atual e comparação;
  Suporte limpa estado, KPI, etapas e fila; Financeiro limpa o snapshot antes
  da nova consulta ou do estado de indisponibilidade por operação. A regressão
  executa o helper compartilhado de loading e verifica as três integrações.
- Filtros comuns não exibem mais `Aplicar`: alterações válidas em período,
  responsável, etapa/status e prioridade são emitidas imediatamente. Intervalo
  inválido mantém a leitura anterior e apresenta validação.
- Financeiro mantém a indisponibilidade quando uma operação é selecionada, sem
  atribuir títulos a uma operação. A busca de cliente usa debounce local de
  300 ms e `Limpar` permanece disponível.
- Customer Success e Suporte continuam usando seus read models por operação;
  a evolução temporal de Customer Success permanece indisponível quando o
  contrato temporal não existe. A janela própria do TrendPanel continua sendo
  resolvida pelo contrato de séries, portanto o período da posição não é
  falsamente aplicado à série.

## Arquivos do lote

- `apps/web/src/features/analytics/AnalyticsTrendPanel.tsx`
- `apps/web/src/features/analytics/AnalyticsFilters.tsx`
- `apps/web/src/features/analytics/AnalyticsFinancePage.tsx`
- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`
- `apps/web/src/features/analytics/AnalyticsCsPage.tsx`
- `apps/web/src/features/analytics/analytics-query-key.ts`
- `apps/web/src/features/analytics/analytics-reactive-state.mjs`
- `apps/web/src/features/analytics/analytics-reactive-state.d.mts`
- `tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`
- `tests/scripts/analytics-loading-stability.test.mjs`
- atualizações de contrato nos testes de evolução diretamente afetados
- `docs/reports/ANALYTICS_REACTIVE_FILTERS_KPI_LOOP_2026-08-24.md`
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`

`handoffs/current/REVIEW.md` foi preservado. As alterações preexistentes em
documentação, package scripts, migrations e handoffs fora da task permanecem
fora da allowlist deste lote.

## Gates executados

Janela final de validação local: `2026-08-24T20:22:14.4988897-03:00`.

| Comando | Resultado |
| --- | --- |
| `node --test` dos testes Analytics diretamente afetados | PASS, 7/7 |
| `npm run test:focused` | PASS, 50 arquivos, 328/328 |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS, 946 módulos transformados |
| `npm run lint --workspace @genius-support-os/web` | PASS, 0 erros, 158 warnings existentes |
| `npm run docs:validate` | PASS, 0 bloqueios; 9 alertas documentais existentes |
| `npm run review:gates` | PASS, 0 regressões bloqueantes; 47 itens baseline resolvidos |
| `git diff --check` | PASS |

## Limitações e riscos

- Não houve QA visual/browser autenticado neste lote, nem validação de RPCs
  servidos, RLS/cross-tenant ou performance com volume real.
- O build comprova compilação e transformação dos módulos, não comprova uma
  sessão autenticada nem dados funcionais do ambiente remoto.
- Os 158 warnings de lint não foram introduzidos ou reduzidos por este lote;
  permanecem como baseline técnico.
- A ausência de contrato temporal para Customer Success continua sendo
  `unavailable`; nenhuma série, zero ou fallback consolidado foi inventado.
- Não houve commit, push, merge, deploy, migration, reset, escrita externa ou
  leitura de secrets.

## Re-review solicitado

Estado entregue: `READY_FOR_REVIEW`, Owner `Sentinel`, com
`Agent coordination=REVIEW_ACTIVE`. O `REVIEW.md` foi preservado integralmente;
o finding e o veredito continuam sob responsabilidade do Sentinel.
