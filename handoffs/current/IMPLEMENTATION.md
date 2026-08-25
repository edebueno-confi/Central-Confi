# IMPLEMENTATION

Task: `ANALYTICS-DASHBOARD-OPERATION-FILTER-PROVENANCE-AND-HELP-CENTER-2026-08-25`
State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: `457eecdf`
Implementation SHA: `LOCAL_COMMIT_PENDING`

## Plano de execução

1. Ler contratos, consumidores, read models, migrations e documentação antes
   de alterar produto.
2. Fazer auditoria read-only do HubSpot: tipos, propriedades, enums, pipelines,
   etapas, associações e amostras limitadas, sem escrever registros.
3. Comparar os filtros enviados com os predicados server-side e identificar se
   o problema é filtro, origem/ownership da empresa ou ausência de dimensão.
4. Corrigir localmente apenas o que tiver contrato comprovado.
5. Criar a Central de Ajuda interna e testes de proveniência/estado honesto.
6. Entregar a Sentinel para revisão independente.

## Evidência

### Auditoria read-only do HubSpot

- Portal confirmado: ConfiOne, account `20108050`; nenhuma escrita foi
  executada e nenhum segredo, token, cookie ou dado pessoal foi registrado.
- Objetos consultados: Company, Deal e Ticket, somente metadados de
  propriedades/enums e amostras limitadas.
- Campos relevantes confirmados: Deals `pipeline`, `dealstage`,
  `amount_in_home_currency`, `hs_projected_amount_in_home_currency`,
  `hubspot_owner_id`, `createdate`, `closedate` e
  `hs_deal_stage_probability`; Tickets `hs_pipeline`, `hs_pipeline_stage`,
  `hs_ticket_priority`, `hubspot_owner_id` e `closed_date`; Companies
  `unidades_negocio_contratadas`, `empresa_t_group__clonado_`, statuses por
  operação, `e_cliente_aftersale_` e `hs_current_customer`.
- A propriedade de unidades de negócio aceita múltiplos valores e a amostra
  confirmou empresas em mais de uma unidade. Isso torna incorreto usar apenas
  um `group_company`, um `client_status` genérico ou um `mrr` genérico para
  representar a carteira de todas as operações.
- O diagnóstico local confirmou que o read model atual normaliza principalmente
  campos de After Sale em colunas genéricas de Company. Campos por operação de
  Neotrust e Confi existem no portal, mas ainda não são ingeridos como dimensão
  operacional publicada.
- Comercial e Suporte possuem escopo comprovável por pipeline classificado. CS
  ainda usa a dimensão operacional de tickets/associações para cobertura,
  enquanto os KPIs de carteira financeira permanecem globais. Financeiro não
  possui dimensão operacional publicada.
- A recomendação é uma dimensão local normalizada de pertencimento operacional,
  preservando múltiplos vínculos por Company, origem, timestamp, status, MRR e
  confiança. Uma propriedade multi-select pode ser a entrada governada, mas não
  será criada/preenchida ou tratada como fonte efetiva nesta task.

### Central de Ajuda e validações iniciais

- Adicionados `apps/web/src/features/analytics/AnalyticsDashboardHelp.tsx` e
  `docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md` com fonte, campos, fórmulas,
  coortes, recortes e limitações das cinco superfícies.
- `AnalyticsShell` expõe a central por um botão contextual, sem alterar menu
  global, rota de permissão ou banco de artigos.
- `node --test tests/scripts/analytics-dashboard-help-center.test.mjs` = 5/5
  PASS.
- `git diff --check` = PASS.

Nenhum filtro, RPC, migration, propriedade HubSpot, RLS, ACL ou regra de
negócio foi alterado antes de fechar a auditoria da origem. Os gates globais
serão registrados aqui antes de `READY_FOR_REVIEW`.

### Planejamento da evolução Comercial para o próximo lote

O pedido de ampliar a evolução foi registrado sem misturar implementação ao
lote atual. A arquitetura aprovada para planejamento é:

1. manter a Posição como fotografia atual e o funil aberto fora da coorte
   histórica;
2. criar Evolução mensal com comparação equivalente ao período anterior;
3. medir reuniões, negócios criados, tocados, ganhos, perdas, valor ganho,
   taxa de ganho e ciclo somente quando cada evento e sua data estiverem
   persistidos no read model;
4. aplicar o mesmo request context a KPIs, gráficos, ranking e Insights;
5. adicionar responsável, começando por Osmar como caso de aceite, sem
   consolidar novamente quando houver seleção individual;
6. investigar `MEETING_EVENT`, associações e `propertiesWithHistory` antes de
   publicar reuniões, atividade ou conversão por etapa;
7. manter predição fora da UI até existirem MRR, pipeline, conversão, lead time,
   valor médio e premissas versionadas no backend.

Critério de entrada do próximo lote: contrato local de eventos e dimensões
comprovado em leitura, seguido por testes de payload exato, coorte mensal,
comparação anterior, loading, descarte de resposta obsoleta e QA autenticado
local. A execução atual continua sem escrita remota.

### Gates finais desta entrega

- `npm run test:focused`: 399/399 PASS em 61 arquivos;
- testes do lote: Central de Ajuda 7/7 e proveniência de filtros 3/3 PASS;
- `npm run web:typecheck`: PASS;
- `npm run web:build`: PASS, 947 módulos;
- `npm run lint --workspace @genius-support-os/web`: PASS, 0 erros e 157
  avisos legados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens de
  baseline resolvidos;
- `git diff --check`: PASS.

Não houve commit, push, deploy, migration, alteração remota, escrita no
HubSpot, criação de propriedade, RLS, ACL ou alteração de secrets. A validação
autenticada de produção e a publicação de artigos no banco de conhecimento
continuam fora desta entrega.

### Resposta aos findings F-HELP-001 e F-HELP-002

- `F-HELP-001`: o diálogo agora guarda o elemento ativo anterior, move o foco
  inicial para Fechar no próximo frame, contém Tab/Shift+Tab no conjunto de
  elementos focáveis, trata o caso sem elementos focáveis, fecha por Escape e
  restaura o foco ao fechar. O comportamento foi coberto no teste determinístico
  da Central.
- `F-HELP-002`: `docs/ANALYTICS_DASHBOARD_HELP_CENTER_V1.md` agora declara
  `READY_FOR_REVIEW`, alinhado aos handoffs correntes.

Validações da correção: teste da Central 7/7 PASS, `npm run test:focused`
399/399 PASS, `npm run web:typecheck` PASS, lint PASS com 0 erros e 157
avisos legados, `npm run docs:validate` PASS, `npm run review:gates` PASS com
0 regressões bloqueantes e `git diff --check` PASS. O build final foi refeito
após a correção: 947 módulos, PASS.
