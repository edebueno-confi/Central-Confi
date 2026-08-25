# Analytics Dashboard Filter Runtime Proof

## Resultado da execução final

Gate local read-only executado em 2026-08-25, com autenticação pelas fixtures
QA existentes, nas cinco superfícies de Analytics e nas personas `authorized`
(fixture administrativa) e `dashboard_viewer`.

Resultado após a correção dos findings F-FILTER-001 e F-FILTER-002:
**10/10 combinações sem falhas**. A rota, a aba esperada e os payloads exatos
foram revalidados no runtime local.

O gate observou 274 chamadas RPC analíticas locais, 52 alterações válidas de
filtros e 52 novas leituras correspondentes. Não houve erro de console, erro de
página, falha de rede, resposta local 4xx/5xx, rota indevida ou request
externo. As evidências foram sanitizadas e não registraram senha, token,
cookie, chave ou segredo.

## Matriz exercitada

| Superfície | Filtros exercitados | Resultado por persona |
| --- | --- | --- |
| Visão Geral | Todas, cada operação publicada, período | 7 interações, 6 novas leituras |
| Comercial | Todas, cada operação publicada, período, pipelines | 6 interações, 5 novas leituras |
| Customer Success | Todas, cada operação publicada | 5 interações, 4 novas leituras |
| Suporte | Todas, cada operação publicada, período, prioridade, pipelines | 9 interações, 8 novas leituras |
| Financeiro | período, situação, aging | 3 interações, 3 novas leituras |

As operações publicadas pelas fixtures foram observadas no conjunto
`Aftersale`, `Confi`, `Confi Analytics` e `Neotrust`, conforme a superfície.
Financeiro não possui filtro de operação no contrato atual e foi validado com
seus próprios filtros suportados.

## Contratos observados

- Operação foi enviada como `p_group_company` somente nas superfícies que
  possuem esse filtro.
- Período foi enviado como `p_from` e `p_to`.
- Estágio, responsável e prioridade foram verificados como
  `p_stage_id`, `p_owner_id` e `p_priority`.
- Financeiro foi verificado com `p_status` e `p_aging_bucket`.
- Pipelines foram verificados com `p_excluded_pipeline_ids`.
- Granularidade foi verificada com `p_grain` quando a série temporal estava
  disponível.
- Cada alteração válida foi seguida por pelo menos uma nova RPC analítica.
- O gate registrou loading e mudança de conteúdo como diagnóstico auxiliar;
  a prova de recálculo usa a nova leitura e a validação do payload enviado,
  sem inferir equivalência numérica apenas da renderização.

## Instrumentação e segurança

O gate aceita somente `127.0.0.1` nas portas locais esperadas (`4173`, `4184`
e `54321`). POSTs são limitados a autenticação local, RPCs analíticas e RPC de
contexto explicitamente allowlisted. Qualquer request de escrita, host externo,
falha de rede, erro de console/página, resposta 4xx/5xx ou rota indevida faz o
processo falhar.

Uma execução inicial expôs duas falhas do próprio harness: GETs da aplicação em
`4173` classificados como externos e o mapa de campos Financeiro associado a
parâmetros de outra área. Essas falhas foram corrigidas no instrumento e
regredidas antes da execução final; não houve alteração no código do produto.

## Validações

- `node --check scripts/local-qa/analytics-dashboard-filter-runtime.mjs` PASS;
- `node --test tests/scripts/analytics-dashboard-filter-runtime.test.mjs` PASS,
  9/9, incluindo rota/aba divergente, parâmetros ausentes/nulos/anteriores ou
  divergentes e array completo de exclusões de pipeline;
- Execução runtime final registrada após a correção: 10/10 combinações, 0
  falhas, com rota, aba e payloads exatos revalidados.

Gates complementares executados no checkout local: `npm run test:focused` PASS,
367/367; `npm run web:typecheck` PASS; `npm run build` PASS, 946 módulos;
`npm run lint` PASS, 0 erros e 158 warnings legados; `npm run docs:validate`
PASS, 0 bloqueios; `npm run review:gates` PASS, 0 regressões bloqueantes e 47
itens de baseline resolvidos; `git diff --check` PASS. Os checks dos dois
scripts também passaram.

## Correções do re-review F-FILTER-001 e F-FILTER-002

O instrumento foi corrigido sem alteração do produto. Para cada combinação, a
URL final agora é comparada com o pathname e os parâmetros esperados da
superfície, e o conjunto de botões com `aria-current="page"` deve conter o
rótulo da aba. Subabas válidas, como `Posição`, não substituem a verificação da
aba de domínio. Rota ou aba divergente entra em `failures` e encerra o gate com
código não-zero.

Cada janela de interação agora valida os valores completos do payload. Campos
ausentes, `null`, valor anterior ou divergente falham. O período exige
`p_from=2026-01-01` e `p_to=2026-08-24`; filtros de domínio exigem o valor
selecionado; e `p_excluded_pipeline_ids` é comparado como array completo,
incluindo o ID correlacionado ao rótulo selecionado a partir do catálogo
read-only local. A correlação não usa dado inventado nem modifica a aplicação.

As regressões determinísticas do helper allowlisted passaram 9/9. O comparador
foi ajustado para validar o payload completo do período e aceitar as subabas
internas somente quando a aba de domínio esperada também está ativa. A
reexecução posterior do smoke completo passou 10/10 em alvo local, sem nova
escrita ou ação externa.

## Limitações

Esta prova confirma o disparo local das leituras, o contexto dos parâmetros e
os estados observados no browser autenticado. Ela não comprova equivalência
numérica com o remoto, RLS/cross-tenant servido, performance sob volume real,
integrações externas, produção ou deploy.

Não houve alteração de código de produto, RPC, migration, banco, permissão,
secret, integração externa, push, merge ou deploy.
