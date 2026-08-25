# Auditoria de reuniões e Predição Comercial

**Task:** `ANALYTICS-COMMERCIAL-MEETINGS-AND-PREDICTION-CONTRACT-2026-08-25`
**Data:** 2026-08-25
**Modo:** read-only, evidência local versionada
**Veredito:** `NÃO COMPROVADO` para KPI de reuniões e Predição no produto atual

## Resumo executivo

O repositório registra uma descoberta de schema HubSpot com o objeto
`MEETING_EVENT` e propriedades compatíveis com uma futura análise comercial.
Isso prova viabilidade de investigação, mas não prova que os eventos estejam
persistidos no read model do ConfiOne, associados a negócios, classificados por
operação ou cobertos pelo contrato servido ao Dashboard.

Portanto, não é seguro publicar agora contagem de reuniões, performance
individual, probabilidade de meta, pipeline adicional necessário ou qualquer
insight derivado desses dados. A próxima evolução deve criar ingestão e
contrato backend versionados, com coorte e proveniência explícitas, antes da
UI.

## Fontes auditadas

| Fonte | O que comprova | Limite |
| --- | --- | --- |
| `docs/ANALYTICS_DASHBOARD_EVOLUTION_DESIGN_V2_2026-08-25.md` | Campos HubSpot candidatos e capacidades registradas no discovery | É registro documental; não substitui nova leitura remota nem prova de ingestão local |
| `docs/ANALYTICS_METRIC_CATALOG_V1.md` | Read models, definições e coortes atuais de Deals e Tickets | O catálogo é histórico/contratual e não publica reunião como métrica ativa |
| `docs/reports/2026-08-02_hubspot-cs-metric-catalog.md` | Estado limitado de atividades e MRR | Denominadores, associações e atribuição permanecem incompletos |
| `scripts/analytics/hubspot-coverage-discovery.mjs` | Padrão de discovery read-only, cobertura e associações de Tickets | Não implementa persistência de `MEETING_EVENT` nem contrato do Dashboard |
| migrations/views/RPCs em `supabase/` | Contratos executáveis existentes para Deals/Tickets | Não foi localizada uma tabela, view ou RPC publicado para reuniões nesta auditoria |

## Matriz de cobertura

| Pergunta | Fonte/campo candidato | Coorte necessária | Estado atual |
| --- | --- | --- | --- |
| Reuniões realizadas/agendadas | `MEETING_EVENT`; `hs_timestamp`, `hs_meeting_start_time`, `hs_meeting_end_time`, `hs_meeting_outcome` | Evento por data operacional e status de resultado | `NÃO COMPROVADO`: sem read model/RPC ativo de reuniões |
| Título da reunião | `hs_meeting_title` | Evento | `NÃO COMPROVADO` no produto |
| Responsável | `hubspot_owner_id` | Evento com owner resolvido | `NÃO COMPROVADO`: falta atribuição persistida e regra de owner |
| Negócios associados | Associations API entre reunião, Deal, Contact e Company | Relação evento-negócio no instante do evento | `NÃO COMPROVADO`: associação remota documentada, persistência local não provada |
| Negócios criados | Deals, `createdate`, `pipeline`, `dealstage` | Data de criação no período e pipeline publicado | `DISPONÍVEL COM LIMITAÇÕES` nos contratos comerciais existentes |
| Negócios ganhos/perdidos | Deals, `hs_is_closed_won`, `hs_is_closed_lost`, `closedate` | Data de fechamento, estado terminal e pipeline | `DISPONÍVEL COM LIMITAÇÕES`; coorte deve permanecer explícita |
| Negócios tocados | Histórico de propriedades, atividades e associações | Evento de atividade dentro do período | `NÃO COMPROVADO`: posição atual não prova toque |
| Conversão | Ganhos / (ganhos + perdas) | Mesma coorte de fechamento e denominador não nulo | `DISPONÍVEL COM LIMITAÇÕES` no contrato atual; não usar para reunião sem coorte comum |
| Lead time | Histórico de estágio, `hs_v2_date_entered_current_stage`, `closedate` | Entrada/saída de estágio por Deal | `NÃO COMPROVADO` para série completa e atribuição individual |
| MRR | Campos financeiros/contratos publicados | Deal ou Company com definição, moeda, vigência e atualização | `NÃO COMPROVADO` para Predição; `won_amount` não é MRR |
| Pipeline adicional necessário | Saída derivada no backend | Meta, prazo, conversão histórica calibrada, ticket e pipeline aberto | `NÃO COMPROVADO`; não calcular no frontend |

## Regras de cálculo futuras

Estas fórmulas são requisitos de contrato, não cálculos liberados no frontend:

```text
taxa_de_conversao = ganhos_da_coorte / (ganhos_da_coorte + perdas_da_coorte)
ticket_medio = receita_ganha_da_coorte / ganhos_da_coorte
lead_time = data_de_saida_do_estagio - data_de_entrada_no_estagio
```

As fórmulas só devem retornar valor quando a coorte, o denominador, a moeda e
as datas forem válidos. Caso contrário, o estado correto é `indisponível`, não
zero.

Para Predição, o backend deverá receber pelo menos:

```text
meta_mrr, prazo, pipeline_aberto, conversao_por_coorte,
ticket_medio, lead_time, moeda, observed_at
```

E deverá retornar:

```text
atingivel | nao_atingivel | indisponivel,
probabilidade_calibrada,
negocios_adicionais_necessarios,
premissas, coorte, observed_at, quality_status
```

Sem histórico suficiente, a resposta deve ser `indisponível`.

## Contrato backend recomendado

Antes de criar componentes de UI, criar uma migration/read model versionada que
publique, no mínimo:

1. eventos de reunião com ID externo, timestamp, outcome, owner e proveniência;
2. associações reunião-Deal-Company persistidas e auditáveis;
3. dimensões de operação e pipeline derivadas de contrato, nunca de texto no
   frontend;
4. coortes de criação, toque, fechamento e entrada/saída de estágio separadas;
5. moeda e origem de valor explícitas;
6. `observed_at`, `effective_at`, `source_system`, `source_record_id`,
   `quality_status` e versão do mapeamento;
7. RLS, ACL, tenant e testes de contrato antes do rollout.

O preflight deverá provar assinatura, owner, `SECURITY DEFINER`, `search_path`,
grants, escopo por operação, paridade e smoke autenticado. Sem isso, o estado é
`NO_GO`.

## Predição: decisão atual

`NÃO CONSTRUIR UI AINDA`. A base atual não prova simultaneamente MRR, pipeline
aberto, conversão por coorte, lead time e ticket médio com a mesma população.
Também não há evidência suficiente de reuniões associadas e atribuídas para
explicar a performance individual de um vendedor.

## Limitações e segurança

- Nenhum token, cookie, JWT ou secret foi lido ou publicado neste relatório.
- Nenhuma escrita no HubSpot, migration, SQL remoto, banco, provider de IA,
  deploy ou alteração externa foi executada.
- A descoberta documental não equivale a QA autenticado nem a paridade remota.
- Não foi criada propriedade customizada de Company; essa decisão exige task
  própria com definição de operação, cardinalidade e governança.

## Próximos passos

1. Executar discovery read-only reproduzível do objeto `MEETING_EVENT`, campos,
   associações e cobertura por período/pipeline/owner.
2. Confirmar persistência local e proveniência antes de publicar métricas.
3. Criar contrato backend e testes de coorte, operação, RLS e moeda.
4. Revalidar com shadow/preflight e QA autenticado.
5. Só então desenhar a aba Evolução e o agente Comercial, sempre com cálculo
   backend explicável e revisão humana.
