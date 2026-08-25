# Analytics Dashboard Runtime Auth Context Repair · 2026-08-25

## Escopo

Correção local e read-only do gate de runtime do Dashboard. A matriz
autenticada revelou que o frontend consulta o contexto de autorização por
`POST /rest/v1/rpc/rpc_internal_actor_workspace_context`. O gate anterior
permitia apenas `rpc_analytics_*` e encerrava a própria validação autenticada
antes de exercitar as abas.

## Correção

O gate agora permite somente esse RPC adicional, por nome exato, além dos
RPCs analíticos e da renovação de sessão já permitidos. Métodos diferentes de
`GET`, `HEAD`, `OPTIONS` e os `POST`s explicitamente allowlisted continuam
bloqueados. O alvo permanece restrito a `127.0.0.1`/`localhost`, porta
`54321` para Supabase e `4173` para a aplicação.

## Evidência que motivou o lote

- Smoke local autenticado do `dashboard_viewer`: sessão criada somente no
  ambiente local; console e request failures zerados nas rotas exercitadas.
- A matriz autenticada foi inicialmente interrompida pelo próprio gate ao
  encontrar o `rpc_internal_actor_workspace_context`, antes de alcançar as
  RPCs analíticas.
- Não houve banco remoto, migration, SQL manual, reset, secrets, push, merge,
  deploy ou escrita em integração externa.

## Critério de aceite

- teste específico comprova o novo RPC exato na allowlist;
- qualquer outro RPC não analítico e qualquer método de escrita continuam
  rejeitados;
- a matriz autenticada produz evidência sanitizada para as sessões locais
  disponíveis, preservando `NO_GO` quando faltar cobertura obrigatória;
- a validação independente do Sentinel confirma o lote antes de commit local.

## Execução após a correção

- A matriz exercitou 4 personas e 5 abas por persona.
- As personas `unauthenticated` e `stale_session` redirecionaram todas as abas
  para `/login`; `authorized` e `dashboard_viewer` chegaram às cinco abas.
- Cada persona autenticada realizou 39 interações de filtro.
- O resultado permaneceu `NO_GO` e `failClosed=true`: o storage state stale
  não foi fornecido e as RPCs `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation` responderam HTTP 404 no schema
  local atual.
- Não houve request failure. Foram observados 3 erros de console por persona
  autenticada, correspondentes às respostas 404 de contrato.
- A execução confirma a allowlist exata do RPC de contexto, mas não comprova
  o contrato analítico ausente. A migration candidata permaneceu não aplicada.

## Resposta ao finding F-AUTHCTX-001

O ramo `POST` agora exige simultaneamente `isLocalTarget(url)` e porta
`54321` antes de avaliar qualquer caminho allowlisted. Isso rejeita
deterministicamente um hostname externo, mesmo que use a porta do Supabase e
um caminho de RPC permitido. O teste específico inclui uma regressão estática
para essa condição, passou em 6/6 e preserva o bloqueio de métodos/caminhos
não allowlisted.

## Correção posterior F-AUTHCTX-001

- O ramo POST do gate agora exige `isLocalTarget(url)` além da porta 54321.
- A regressão determinística verifica a barreira de hostname local antes da
  aceitação de qualquer caminho POST allowlisted.
- O resultado funcional continua `NO_GO`/`failClosed=true` pelas RPCs 404 e
  pela ausência do storage state stale. Nenhuma dessas limitações foi
  mascarada ou resolvida por alteração de banco.

## Limitações

Esta correção não autoriza migration candidata, banco canônico, remoto,
produção, alteração de secrets, push, merge, deploy ou release. A prova de
RLS/cross-tenant e performance real permanece separada deste gate.
