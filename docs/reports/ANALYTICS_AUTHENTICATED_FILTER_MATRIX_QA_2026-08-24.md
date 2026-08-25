# ANALYTICS AUTHENTICATED FILTER MATRIX QA 2026-08-24

## Resultado executivo

O runtime autenticado local foi alcançado no perfil QA Local Administrador e a
matriz de navegação, abas, operação, período e ausência do botão Aplicar foi
exercitada somente em leitura. O recálculo envia o recorte de operação e as
datas corretos às RPCs observadas. A aceitação funcional completa ficou
bloqueada por uma divergência real do contrato local: Comercial e Suporte
enviam a assinatura de seis argumentos com `p_excluded_pipeline_ids`, mas o
PostgREST local só tem a assinatura histórica de quatro argumentos.

## Ambiente e identidade

- Origem: `http://127.0.0.1:4173`.
- Backend observado: Supabase local em `127.0.0.1:54321`.
- Perfil autenticado visível: `QA Local Administrador`, `Administrador da plataforma`.
- Escopo: leitura de DOM, console e eventos de rede; nenhuma escrita em banco,
  migration, reset, fixture, integração ou segredo.
- A validação foi feita no commit `fa258809853f05a22ca48c7df8abf82e8ef17ef6`.

## Matriz executada

| Superfície | Resultado observado |
| --- | --- |
| Visão Geral | carregou autenticada; filtros de período e operação visíveis; estados indisponíveis foram honestos quando o contrato não respondeu |
| Comercial | rota e aba carregaram; operação `Aftersale` e `Neotrust` foram enviadas nas chamadas; sem dados comerciais por falha de assinatura local |
| Customer Success | carregou com operação `Neotrust`; declarou cobertura ticket-empresa ausente sem inferir carteira |
| Suporte | rota e aba carregaram; operação `Neotrust` foi enviada; estados vazios/indisponíveis foram preservados |
| Financeiro | ao selecionar operação, declarou consolidado fora do recorte e ofereceu retorno ao Financeiro consolidado |

Também foram exercitados:

- operação `Aftersale`, `Neotrust` e `Todas`;
- período `Mês passado`, com `p_from=2026-07-01` e `p_to=2026-07-31`;
- granularidade disponível na interface, sem fabricar evolução quando faltou série;
- troca de operação com inspeção imediata e após a conclusão das leituras;
- contagem de botão com nome Aplicar: `0`.

## Evidência de rede

As chamadas observadas para `rpc_analytics_timeseries_by_operation` carregaram
`p_group_company` com `Aftersale` e as datas do recorte. As chamadas de
Customer Success e Suporte também carregaram `p_group_company` com a operação
selecionada. A troca de período enviou `p_from=2026-07-01` e
`p_to=2026-07-31` ao snapshot executivo.

### Finding F-QA-001 HIGH

Nas chamadas autenticadas de:

- `rpc_analytics_commercial_kpis_by_operation`;
- `rpc_analytics_support_kpis_by_operation`;

o frontend enviou `p_excluded_pipeline_ids: []`, além dos demais parâmetros da
assinatura de seis argumentos. O PostgREST local respondeu `404 PGRST202`:

```text
Could not find the function public.rpc_analytics_commercial_kpis_by_operation(
p_excluded_pipeline_ids, p_from, p_group_company, p_owner_id, p_stage_id, p_to
) in the schema cache
Perhaps you meant ... (p_from, p_group_company, p_owner_id, p_to)
```

O mesmo ocorreu para Suporte, com a sugestão da assinatura de quatro
argumentos. Isso explica os estados de dados indisponíveis nas superfícies,
sem indicar perda de dados. A migration candidata
`20260824210000_analytics_kpi_contract_parity_v1.sql` adiciona as assinaturas
de seis argumentos, mas permanece não aplicada por decisão fail-closed. Não é
permitido contornar este finding aplicando migration no banco canônico ou
remoto.

## Console, stale e limitações

- Console: nenhum `error` ou `warn` foi observado durante a matriz.
- Trocas de filtro não exibiram valores numéricos antigos como se fossem do
  novo recorte. Como as RPCs de Comercial/Suporte falharam no contrato local,
  a parte de recálculo com dados válidos não pode ser considerada comprovada.
- RLS, cross-tenant, paridade numérica com o PostgREST remoto, performance com
  volume real e produção não foram validados.
- Nenhum usuário não autorizado foi criado nem foram lidos ou inseridos
  segredos, tokens, cookies ou credenciais.

## Próxima ação

Abrir lote separado para compatibilidade explícita com a assinatura histórica:
usar a RPC de quatro argumentos somente quando não houver estágio nem exclusões
de pipeline, mantendo estado indisponível quando o recorte exigir a assinatura
de seis argumentos ainda não aplicada. A correção deve ser aprovada
independentemente e não substitui a decisão futura sobre a migration candidata.
