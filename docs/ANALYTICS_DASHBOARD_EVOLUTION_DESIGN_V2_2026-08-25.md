# ConfiOne Analytics Dashboard Evolution V2

**Data:** 2026-08-25
**Status:** design técnico e de produto antes da implementação
**Escopo:** Visão Geral, Comercial, Customer Success, Suporte e investigação
read-only de reuniões HubSpot
**Regra:** nenhum número será publicado sem fonte, coorte, período e cobertura
comprovados.

## Decisão executiva

O dashboard terá três leituras diferentes:

1. **Posição:** o que existe no recorte selecionado ou no instante de
   referência explicitamente informado.
2. **Evolução:** o que mudou ao longo do tempo, somente quando houver série
   temporal real.
3. **Insights:** quais variações merecem atenção e quais evidências sustentam
   a leitura.

O filtro de período será controlado e reativo. Toda troca deverá invalidar o
snapshot anterior, exibir loading e enviar o período exato para todas as
consultas da superfície. Não haverá botão Aplicar onde a consulta já for
reativa.

## Ponto crítico de semântica temporal

O contrato KPI remoto aplicado em 2026-08-25 já permite filtrar Comercial e
Suporte por operação, etapa, prioridade e exclusões de pipeline. Porém, o
campo de posição aberta atual representa o estado aberto no momento da
consulta. Ele não prova automaticamente o estado aberto em uma data histórica.

Portanto:

- `criado no período`, `fechado no período`, `ganho no período`, `perdido no
  período` e reuniões realizadas no período são métricas de período;
- `pipeline aberto` e `valor ponderado` são posição atual, salvo quando existir
  snapshot `as_of` ou histórico suficiente;
- para um período histórico, a posição aberta será marcada como
  `NÃO COMPROVADO` até existir snapshot temporal;
- o funil só será chamado de funil histórico quando houver eventos de entrada e
  saída de etapa. Antes disso, a alternativa honesta é “negócios criados no
  período por etapa atual”, com esse nome e limitação explícitos.

Isso evita que o filtro de período pareça funcionar enquanto um gráfico
continua lendo a coorte atual.

## Arquitetura das superfícies

### Visão Geral

```text
Filtros: período | operação
Resumo: Comercial | Customer Success | Suporte | Financeiro
Atenção: maior risco | maior acúmulo | maior variação comprovada
Tendência executiva: no máximo uma, somente com contrato temporal
Atalhos: abrir posição | abrir evolução | abrir insights
```

Manter o mapa das áreas como navegação. Não duplicar funil, ranking de
responsáveis ou gráficos detalhados nesta tela. O Financeiro deve declarar
quando permanece consolidado ou indisponível para uma operação.

### Comercial

#### Posição

- valor em negociação: negócios abertos no instante de referência, excluindo
  ganhos e perdas;
- valor ponderado: somente quando a cobertura de probabilidade for comprovada;
- negócios criados no período;
- ganhos, perdas e receita ganha no período;
- taxa de ganho entre negócios fechados no período;
- funil por etapa do recorte, com coorte e definição visíveis;
- ranking de responsáveis no período, sem misturar posição atual com fechados
  históricos.

“Valor em negociação” não significa soma de todas as etapas. Significa apenas
negócios abertos no recorte definido, excluindo `WON` e `LOST`.

#### Evolução

Com granularidade mensal, e com comparação ao período anterior:

- reuniões realizadas, por responsável;
- negócios criados;
- negócios tocados, somente se a definição de atividade estiver disponível;
- negócios ganhos e perdidos;
- valor ganho;
- taxa de ganho;
- ciclo mediano de vendas;
- conversão por etapa, somente com histórico de transição.

O seletor de responsável será aplicado ao mesmo contrato. Exemplo: Osmar deve
produzir uma série mensal de reuniões, negócios e fechamentos, não apenas um
card filtrado enquanto os gráficos permanecem consolidados.

#### Insights

Somente insights derivados de dados comprovados:

- queda ou alta de ganhos contra o período anterior;
- concentração de pipeline por responsável;
- etapa com maior acúmulo;
- cobertura insuficiente de probabilidade;
- pipeline sem classificação de operação;
- variação de reuniões versus negócios criados.

Não criar previsão de receita nem causa automática sem contrato de eventos e
regra de negócio.

### Customer Success

#### Posição

- carteira e clientes ativos, quando a dimensão operacional estiver publicada;
- entradas, riscos e estados atuais do portfólio;
- operação e pipeline apenas quando o backend publicar essas dimensões.

#### Evolução

Permanece `Evolução indisponível` enquanto não existir série temporal real de
carteira, churn, retenção ou lead time. Snapshot atual não será transformado
em tendência.

#### Insights

Começar com cobertura, clientes sem atualização e estados explicitamente
publicados. Churn e retenção só entram após fonte temporal comprovada.

### Suporte

#### Posição

- backlog aberto;
- idade mediana do backlog;
- distribuição por prioridade, pipeline e responsável;
- cobertura de SLA;
- tickets criados no período.

#### Evolução

- tickets criados e resolvidos por mês, se `closed_date` estiver coberto;
- backlog em snapshots diários;
- tempo de resolução e primeira resposta, somente com cobertura suficiente;
- comparação por operação, pipeline e prioridade.

Cada troca de período, operação, pipeline, etapa ou prioridade limpa o snapshot,
entra em loading e descarta respostas obsoletas.

### Financeiro

Auditar primeiro. After Sale somente será habilitado quando a origem financeira
publicar `group_company` de forma explícita e comprovada. Não atribuir títulos
financeiros a uma operação por inferência visual ou fallback consolidado.

## Contrato mínimo de cada métrica

Cada KPI, gráfico ou insight deve ter internamente:

```text
metric_id
semantics: position | period | evolution | insight
source_object_or_event
source_field_or_formula
cohort_definition
time_grain
operation_dimension
filters_applied
freshness_at
coverage
state: available | partial | unavailable | awaiting_history
warning_codes
```

O frontend apenas apresenta esse contrato. Coorte, elegibilidade de pipeline,
RLS e regra de operação permanecem no backend/read model.

## Filtros e reatividade

### Comercial

Filtros controlados: período, operação, pipeline, etapa, prioridade,
responsável e granularidade. Cada payload deve conter exatamente os valores
selecionados. Funil, KPIs, ranking, evolução e insights devem compartilhar o
mesmo request context ou contratos equivalentes comprovados.

### Suporte

Filtros controlados: período, operação, pipeline, etapa, prioridade,
responsável e granularidade publicada. A ausência de uma dimensão deve ser
exibida como indisponível, não como filtro decorativo.

### Customer Success

Começar com período e operação somente onde publicados. Pipeline só entra após
prova do contrato. Não exibir filtros que não alteram a consulta.

### Financeiro

Manter apenas os filtros comprovados pela consulta atual até a auditoria de
After Sale terminar.

## HubSpot: evidência de viabilidade

O portal read-only confirmado é `20108050`, usuário `ede.oliveira@confi.com.vc`.
A descoberta de schema retornou `DEAL`, `TICKET` e `MEETING_EVENT` com leitura
disponível.

Capacidades relevantes confirmadas:

- Reuniões: `hs_timestamp`, `hs_meeting_start_time`,
  `hs_meeting_end_time`, `hs_meeting_title`, `hubspot_owner_id`,
  `hs_meeting_outcome` e contadores de concluída, no-show, agendada,
  cancelada e remarcada.
- Negócios: `dealstage`, `pipeline`, `hubspot_owner_id`, `createdate`,
  `closedate`, `hs_is_closed_won`, `hs_is_closed_lost`,
  `hs_v2_date_entered_current_stage`, valor em moeda da empresa e valor
  ponderado em moeda da empresa.
- Tickets: `hs_pipeline`, `hs_pipeline_stage`, `createdate`, `closed_date`,
  `hubspot_owner_id`, prioridade, tempo de primeira resposta e tempo de
  fechamento.
- Associações de reuniões com deals/contatos/empresas podem ser consultadas
  pela Associations API. A ingestão local ainda precisa provar que essas
  associações estão persistidas no read model do ConfiOne.
- A API de negócios suporta `propertiesWithHistory`, suficiente para investigar
  histórico de `dealstage`; isso não significa que o histórico já esteja
  sincronizado localmente.

A consulta exploratória read-only encontrou volume suficiente para justificar
uma task própria de ingestão e contrato, mas não foi usada como KPI: os
resultados são paginados, há reuniões agendadas no futuro e a presença do
registro remoto não prova associação, operação ou cobertura local.

## Predição

Não construir a UI ainda. Primeiro comprovar, no backend:

- MRR ou receita recorrente;
- pipeline aberto em moeda comum;
- taxa de conversão por coorte;
- lead time por etapa;
- valor médio por negócio;
- premissas e data de atualização.

Depois o endpoint poderá retornar `atingível`, `não atingível`, negócios
adicionais necessários e premissas. O cálculo ficará no backend.

## Ordem de implementação

1. Corrigir e testar a propagação do período no funil e em todos os gráficos
   Comerciais.
2. Implementar o lote de Visão Geral e Comercial com Posição/Evolução/Insights
   e filtros reativos, sem criar métricas sem contrato.
3. Validar o lote independentemente com recortes Todas e After Sale, payloads
   exatos, loading e descarte de resposta obsoleta.
4. Expandir filtros de Suporte e Customer Success conforme as dimensões
   publicadas.
5. Auditar Financeiro e só então habilitar After Sale.
6. Criar task separada para reuniões HubSpot e, depois, decidir Predição.
7. QA autenticado local e preparação de publicação somente após aprovação.

## Critérios de aceite do próximo lote

- mudar o período muda o funil e todos os gráficos que se declaram de período;
- posição atual e evolução temporal não compartilham snapshot indevidamente;
- filtros são enviados com valores exatos e sem botão Aplicar redundante;
- todas as respostas antigas são descartadas após nova seleção;
- Comercial possui evidência de operação, período, pipeline e responsável;
- CS não publica evolução artificial;
- Suporte expõe estado honesto para cobertura de fechamento e SLA;
- testes focados, typecheck, build, lint, docs, review gates e diff check passam;
- nenhuma alteração remota adicional ocorre neste lote.
