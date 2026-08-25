# TASK

Task: ANALYTICS-DASHBOARD-OVERVIEW-SCOPE-AND-CHARTS-2026-08-25
State: READY_FOR_REVIEW
Owner: Sentinel
Role: REVIEWER
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: REVIEW_ACTIVE
Base SHA: f12f57b7
Implementation SHA: UNCOMMITTED_WORKTREE

## Objetivo

Reestruturar a Visão Geral e posicionar os gráficos comerciais na superfície
correta, reduzindo duplicação e mantendo uma leitura executiva simples.

## Escopo

- manter na Visão Geral o mapa das áreas, KPIs executivos, atenção operacional e
  no máximo uma tendência temporal com contrato válido;
- concentrar na aba Comercial funil por etapa, ganhos, perdas, valor em
  negociação, negócios fechados e performance por responsável;
- separar explicitamente Posição atual de Evolução temporal;
- garantir que período, operação, pipeline e filtros comerciais usem o mesmo
  contexto de request, sem snapshot antigo após troca;
- validar Todas e After Sale com payloads exatos e estados honestos;
- garantir que o funil por estágio use a coorte do período selecionado e não
  um snapshot fora do recorte;
- validar operação, pipeline e todos os estágios publicados no recorte, sem
  ocultar estágios com dados nem preencher ausências com zero;
- compactar visualmente o seletor de pipeline, preservando leitura, teclado e
  estado selecionado;
- revisar as abas Analytics em busca de inconsistência de filtros, títulos,
  loading, estados vazios e duplicação;
- depois de proteger o Comercial, executar um levantamento read-only de
  Customer Success sobre atraso, recorrência, clientes e cruzamento financeiro,
  sem alterar a UI ou criar fallback;
- reutilizar componentes e biblioteca visual existentes;
- preservar Customer Success, Suporte e Financeiro fora deste lote, salvo
  regressão diretamente causada pela reorganização;
- alterar somente contratos locais comprovados. Não criar cálculo no frontend.

## Fora do escopo

- migration, RPC, RLS, ACL ou SQL remoto;
- alteração ou criação de propriedade HubSpot;
- aplicação de migration no remoto;
- publicação de artigos no banco de conhecimento;
- predição, reuniões ou série temporal inventada;
- deploy, push, merge, release ou secrets.

## Critérios de aceite

1. Visão Geral não duplica os gráficos detalhados da aba Comercial.
2. Comercial exibe posição e evolução com títulos, coortes e estados
   compreensíveis.
3. Funil e métricas de movimento respeitam período; o funil atual declara
   quando representa snapshot fora da coorte histórica.
4. Todas e After Sale enviam o recorte correto e não recebem fallback
   consolidado indevido.
5. Troca de filtro invalida snapshot, mostra loading e descarta resposta
   obsoleta.
6. Testes direcionados cobrem posição, evolução, período, operação, pipeline,
   todos os estágios publicados e ausência de dados.
7. test:focused, typecheck, build, lint, docs:validate, review:gates e
   git diff --check passam.
8. Entrega deve terminar em READY_FOR_REVIEW para o Sentinel.
9. O seletor de pipeline permanece compacto e acessível sem alterar contratos
   de dados ou permissões.
10. O levantamento de Customer Success registra fonte, campo, join, filtro,
    cobertura e motivo verificável para cada KPI ausente.

## Allowlist efetiva deste lote

- `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`;
- `apps/web/src/features/analytics/AnalyticsPipelineCombobox.tsx`;

- `tests/scripts/analytics-kpi-contract-parity.test.mjs`;
- `tests/scripts/analytics-dashboard-filter-provenance.test.mjs`;
- `tests/scripts/analytics-kpi-contract-remote-application-preflight.test.mjs`,
  apenas para remover a dependência do gate no TASK corrente mutável;
- `handoffs/current/TASK.md`, `handoffs/current/IMPLEMENTATION.md` e
  `handoffs/current/STATUS.md`;
- `handoffs/current/REVIEW.md` é preservado pelo reviewer e não foi editado pelo
  executor.

`AnalyticsCustomerSuccessPage.tsx` e seus contratos foram somente lidos para o
levantamento de Customer Success; não receberam alteração. A task 112
`ANALYTICS-DASHBOARD-MOBILE-RESPONSIVE-2026-08-25` permanece fora do lote e não
teve arquivos de responsividade alterados.
