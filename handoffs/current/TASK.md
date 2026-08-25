# TASK

Task: `ANALYTICS-DASHBOARD-OPERATION-FILTER-PROVENANCE-AND-HELP-CENTER-2026-08-25`
State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: `457eecdf`
Implementation SHA: `LOCAL_COMMIT_PENDING`

## Objetivo

Auditar a origem dos KPIs e gráficos por operação, corrigir somente desvios
comprovados de filtro/recálculo e criar uma Central de Ajuda interna do
Dashboard com fonte, campo, fórmula, coorte, granularidade, cobertura e
limitações reais.

## Escopo

- Visão Geral, Comercial, Customer Success, Suporte e Financeiro;
- recortes Todas, After Sale, Neutrust, Confi/Confi Analytics e demais valores
  publicados pelo contrato;
- período, operação, pipeline, etapa e demais filtros efetivamente suportados;
- auditoria read-only do HubSpot e dos read models/RPCs locais/remotos;
- documentação navegável interna sem expor segredos ou dados sensíveis;
- correção local de produto apenas quando o contrato e a origem estiverem
  comprovados.

## Allowlist inicial

- `apps/web/src/features/analytics/`
- `apps/web/src/features/navigation/`
- `apps/web/src/index.css`
- `docs/`
- `tests/`
- `handoffs/current/`

Arquivos de migration, RLS, ACL, secrets, integrações externas e qualquer
propriedade customizada do HubSpot exigem task própria e nova aprovação.

## Critérios de aceite

1. Cada KPI/gráfico auditado identifica fonte, campo, fórmula e coorte, ou fica
   explicitamente `NÃO COMPROVADO`/indisponível.
2. O filtro de operação é respeitado em cada superfície onde o backend publica
   a dimensão; nenhuma consolidação implícita mascara a ausência de dados.
3. Toda troca de filtro invalida snapshot, consulta novamente e descarta
   respostas obsoletas.
4. Customer Success e Financeiro não recebem dimensões que o contrato não
   publica; não criar fallback ou zeros artificiais.
5. A Central de Ajuda fica acessível pela navegação interna sem duplicar menu
   global nem alterar permissões existentes.
6. Testes direcionados, typecheck, build, lint, docs:validate,
   review:gates e git diff --check passam.
7. Nenhuma escrita remota é executada nesta task.

## Regra de segurança

A hipótese de criar um campo customizado para classificar um mesmo cliente em
mais de uma operação será documentada como decisão de modelo. Não será criada
nem preenchida automaticamente. Primeiro serão auditados os campos e
associações existentes no HubSpot, incluindo pipelines, deals, tickets,
companies e propriedades de operação.

## Compatibilidade de contratos já auditada

Esta task não reaplica a migration KPI remota. O preflight separado de contrato
já exige `to_regprocedure` para confirmar os wrappers legados de quatro
argumentos e os alvos de seis argumentos antes de qualquer aplicação. A
preservação dos wrappers legados, ACLs e fingerprints permanece pré-requisito
para qualquer task futura de aplicação remota.


## Próximo lote planejado: Evolução Comercial

Este lote atual não publica uma série nova nem inventa eventos de reunião. O
próximo lote funcional deverá separar explicitamente as leituras:

- **Posição:** fotografia atual do recorte, incluindo funil aberto, valor em
  negociação e demais KPIs do instante de referência;
- **Evolução:** série mensal com comparação equivalente ao período anterior para
  reuniões, negócios criados, negócios tocados quando houver definição de
  atividade, ganhos, perdas, receita ganha, taxa de ganho e ciclo de vendas;
- **Insights:** somente variações e concentrações derivadas de medidas
  comprovadas, sem atribuir causa ou criar previsão no frontend.

O contrato futuro deverá aceitar período, operação, pipeline, etapa, prioridade,
responsável e granularidade com valores exatos. Para um responsável como Osmar,
todos os cards e séries devem compartilhar o mesmo contexto de consulta. A
primeira implementação deverá validar a existência local de `MEETING_EVENT`,
associações com negócios e histórico de etapas antes de publicar reuniões,
negócios tocados ou conversão por etapa. Até essa prova, esses indicadores
permanecem `NÃO COMPROVADO`/indisponíveis.
