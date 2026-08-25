# REVIEW

- Task: ANALYTICS-DASHBOARD-FILTER-RUNTIME-PROOF-2026-08-25
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 869ea70198856535e112801ea86808d501e4abc8
- Implementation SHA: UNCOMMITTED_WORKTREE
- Estado revisado: READY_FOR_REVIEW após resposta aos findings F-FILTER-001 e F-FILTER-002
- State: APPROVED
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: HOLD
- Veredito: APPROVED

## Escopo e evidência reconhecida

O lote é read-only e está dentro da allowlist declarada. A execução registrada
observou 10/10 combinações locais autenticadas, 274 RPCs analíticas, 52
alterações e 52 novas leituras, sem erros de console/página/rede, respostas
4xx/5xx, hosts externos ou rotas indevidas no resultado produzido. Os gates
registrados e reexecutados pelo Sentinel passaram: teste específico 5/5,
`node --check`, `docs:validate`, `review:gates` e `git diff --check`.

Essa evidência demonstra que o cenário executado passou no instrumento, mas os
dois gaps abaixo impedem concluir que o instrumento prova a rota correta e os
valores corretos dos filtros.

## Findings

### F-FILTER-001 — HIGH — rota e aba efetivas não são validadas

Em `scripts/local-qa/analytics-dashboard-filter-runtime.mjs`, `login` aguarda
somente que a URL deixe `/login`. Depois, o gate marca falha apenas quando a
rota é `/login` ou `/access-denied` (linhas 294-295). Não há comparação da URL
final com `surface.route`, nem verificação de que a aba correspondente está
ativa. Uma sessão autenticada redirecionada para outra rota ou aba pode, em
princípio, continuar a execução e produzir leituras de uma superfície
incorreta sem ser registrada como rota indevida.

Isso contraria o critério de bloquear rotas indevidas e pode tornar o resultado
10/10 um falso positivo de cobertura de superfície.

Correção esperada: validar pathname e query/tab esperados por superfície, além
de um marcador confiável da aba ativa quando existente; criar regressão
determinística para rota/aba divergente mantendo `failures` não vazio e exit
code diferente de zero.

### F-FILTER-002 — HIGH — vários filtros não têm validação do valor enviado

O helper `assertFilterParam` compara valor exato somente para operação, em
`p_group_company` (linhas 186-189). Para período, o gate passa se qualquer
request recente tiver `p_from` ou `p_to` igual a um dos limites (linhas
201-210). Para estágio, situação, responsável, prioridade e aging, ele apenas
verifica que a chave existe no corpo, aceitando inclusive `null` (linhas
233-236). Para pipelines, também verifica somente que
`p_excluded_pipeline_ids` é um array, sem conferir o ID selecionado (linhas
240-248).

Assim, uma nova RPC pode ocorrer com filtro ausente, nulo, valor antigo ou
pipeline diferente e ainda satisfazer o gate. Isso não atende ao critério de
confirmar que o parâmetro correspondente ao contrato foi enviado após cada
alteração válida.

Correção esperada: associar cada interação à janela exata de requests e
comparar os valores selecionados completos, incluindo ambos os limites de
período e o ID esperado de pipeline. Cobrir regressões com valor omitido,
`null`, valor anterior e valor divergente.

## Limitações preservadas

RLS/cross-tenant servido, equivalência numérica, performance com volume real,
Supabase remoto, produção e deploy não foram comprovados. Não houve alteração
de código de produto, RPC, migration, banco, secrets, push, merge ou ação
externa.

## Decisão

`CHANGES_REQUESTED`. Forge deve corrigir os dois gaps no harness/testes e
atualizar o relatório antes de novo review. A aprovação futura, se houver,
será limitada à prova local read-only e não autorizará banco, migration,
remoto, secrets, push, merge ou deploy.

## Resposta do Forge e nova entrega

- F-FILTER-001: respondido. O helper compara pathname e a query completa da
  rota, sem aceitar parâmetros extras, e exige o rótulo da superfície no
  marcador `button[aria-current="page"]`. A regressão cobre rota, query e aba
  divergentes.
- F-FILTER-002: respondido. O helper exige valores exatos, rejeitando ausência,
  `null`, valor anterior e divergência. O período exige `p_from` e `p_to` no
  mesmo payload; campos de domínio e pipelines são comparados integralmente,
  com pipeline correlacionado ao ID do catálogo read-only local.
- Validações após a correção: teste específico 9/9 PASS; runtime autenticado
  local 10/10 PASS, 274 RPCs, 52 alterações e 52 novas leituras, 0 falhas;
  `node --check` PASS.
- Nenhum arquivo de produto, RPC, migration, banco, permissão, secret ou
  integração externa foi alterado.
- Estado: READY_FOR_REVIEW. Owner: Sentinel. Role: REVIEWER. Reviewer active:
  Sentinel. Review mode: SENTINEL_REQUIRED. Agent coordination: REVIEW_ACTIVE.

## Re-review formal dos findings F-FILTER-001 e F-FILTER-002

Os dois findings foram resolvidos dentro da allowlist. Para F-FILTER-001,
`surfaceFailures` compara pathname, query completa sem parâmetros extras e a
aba de domínio esperada em `button[aria-current="page"]`, preservando subabas
internas válidas como `Posição`. A regressão rejeita rota, query e aba
divergentes.

Para F-FILTER-002, os comparadores allowlisted exigem o valor completo do
último payload parametrizado da janela: `p_from` e `p_to` no mesmo payload,
valores exatos dos filtros de domínio e array completo de
`p_excluded_pipeline_ids`, correlacionado ao ID do catálogo local read-only.
Ausência, `null`, valor anterior ou divergência falham. As regressões cobrem
esses casos e a correlação de pipeline.

## Evidências independentes do re-review

- teste específico: 9/9 PASS;
- `node --check` do harness e do helper: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos;
- `git diff --check`: PASS;
- execução runtime local registrada: 10/10 combinações autenticadas, 274 RPCs,
  52 alterações, 52 novas leituras e 0 falhas, com rota, aba e payloads exatos
  revalidados.

## Veredito vigente

`APPROVED`, limitado ao harness, às regressões e à prova local read-only dos
filtros. A evidência confirma disparo de leituras e parâmetros observados, mas
não comprova equivalência numérica remota, RLS/cross-tenant servido,
performance com volume real, produção ou deploy. Não autoriza alteração de
produto, banco, migration, secrets, push, merge ou ação remota. Owner devolvido
ao Forge para continuidade local autorizada.
