# Diagnóstico de divergência temporal do Auth local

- Task: `LOCAL-AUTH-CLOCK-SKEW-DIAGNOSIS-2026-08-24`
- Base SHA: `b1518eb8979e9d5a0e0d00fbea0cc36558339ee6`
- Ambiente: Supabase local, sem acesso remoto
- Natureza: diagnóstico e QA read-only
- Resultado: relógios alinhados no momento da rechecagem; login e QA local read-only reproduzidos com sucesso
- Causa histórica do erro `JWT issued at future`: não confirmada

## Escopo e segurança

Foram usados somente leituras do relógio do host e dos containers, o smoke de
autenticação local já existente e navegador headless com perfil local existente.
Nenhum segredo, token, cookie ou payload foi registrado. Não houve restart,
reset, migration, seed, SQL manual, alteração de produto, escrita no banco ou
ação remota.

## Evidência temporal

Janela de leitura: `2026-08-24T23:45:34Z` a `2026-08-24T23:45:35Z`.

| Origem | Horário UTC observado | Epoch observado | Classificação |
| --- | --- | ---: | --- |
| Host Windows | `2026-08-24T23:45:34.7113304Z` | `1787615135` | fato local |
| `supabase_auth_genius-support-os` | `2026-08-24T23:45:34+0000` | `1787615135` | fato local |
| `supabase_db_genius-support-os` | `2026-08-24T23:45:35+0000` | `1787615135` | fato local |
| `supabase_kong_genius-support-os` | `2026-08-24T23:45:35+0000` | `1787615136` | fato local, diferença de leitura de até 1 s |

O container Auth foi identificado pelo nome canônico e estava ativo. A leitura
do container REST com `date` não foi possível porque a imagem não possui esse
executável; isso não impediu a comparação do Auth, banco e gateway.

Conclusão factual: não há skew temporal ativo observável nessa janela. Não foi
necessário alterar ou reiniciar serviços.

## Revalidação do login

Comando read-only existente:

```text
npm run local:qa:smoke:auth
```

Resultado sanitizado: `admin`, `dashboard_viewer`, `support_manager`,
`support_agent` e `customer_user` autenticados `true`, 5/5.

No navegador, em `2026-08-24T23:46:30.722Z`, um contexto novo com o perfil
local `platform_admin` chegou a `/admin/analytics`. Resultado: HTTP inicial
200, login 200, sem console errors, page errors ou request failures.

Interpretação: o erro `JWT issued at future` não foi reproduzido após a nova
leitura temporal e novo contexto de login. Isso demonstra recuperação
operacional local por nova sessão, não prova a causa histórica do incidente.

## QA read-only do Dashboard

Em `2026-08-24T23:47:33.251Z`, foram navegadas as cinco abas do Dashboard:

| Aba | Resultado | Evidência de rede |
| --- | --- | --- |
| Visão Geral | PASS | rota `/admin/analytics?tab=ceo`, sem nova chamada ao clicar na aba já ativa |
| Comercial | PASS | RPCs de KPIs e snapshot retornaram 200 |
| Customer Success | PASS | inventário e `rpc_analytics_customer_success_kpis_by_operation` retornaram 200 |
| Suporte | PASS | stage breakdown, queue health, snapshot e KPIs retornaram 200 |
| Financeiro | PASS | snapshot, source status, reconciliação e histórico retornaram 200 |

Em `2026-08-24T23:48:08.570Z`, no contexto da Visão Geral:

- troca de período de `Este mês` para `Personalizado` disparou 5 chamadas RPC, todas 200;
- troca de operação de `Todas` para `Aftersale` disparou 9 chamadas RPC, incluindo Comercial, Suporte e Customer Success, todas 200;
- `Por semana` e `Por dia` dispararam nova chamada a `rpc_analytics_timeseries_by_operation`, ambas 200;
- loading foi observado imediatamente em algumas trocas, confirmando transição de consulta;
- console errors, page errors e request failures permaneceram zero;
- não foram executadas ações de escrita.

O teste comprova que as trocas iniciam novas leituras e que o runtime local
retorna estados HTTP 200. A ausência de snapshot stale não deve ser promovida
como prova completa somente por essa sondagem; a confirmação de conteúdo antigo
versus novo exige dados controlados e comparação funcional específica.

## Diagnóstico

| Item | Classificação | Evidência |
| --- | --- | --- |
| Host fora de sincronia com Auth | não observado agora | epoch host/Auth igual na leitura |
| Docker com relógio divergente | não observado agora | Auth, banco e Kong alinhados em até 1 s |
| Serviço Auth permanentemente incorreto | não comprovado | smoke 5/5 e login browser passaram após nova sessão |
| Token/sessão anterior com `iat` futuro | hipótese plausível | erro anterior desapareceu em novo contexto, mas não houve inspeção de token |
| Falha de produto na validação JWT | não comprovado | não reproduzida após a rechecagem temporal |

## Limitações e decisão

- A causa original não foi reproduzida nem isolada entre emissão do token,
  sessão anterior e relógio do cliente.
- Não foram lidos tokens, cookies, secrets ou logs sensíveis.
- O runtime servido local foi validado, mas produção, RLS/cross-tenant,
  performance real e integrações externas continuam fora deste lote.
- Se `JWT issued at future` voltar a ocorrer, a próxima investigação deve
  capturar apenas timestamps sanitizados da emissão/validação e confirmar a
  identidade do alvo local. Não deve alterar a lógica de autenticação para
  mascarar a falha.

## Gates

- `npm run local:qa:smoke:auth`: PASS, 5/5 perfis existentes autenticados.
- QA browser read-only: PASS para login, cinco abas, trocas de período/operação/grain, 200 nas RPCs observadas e zero erros de console/rede.
- `npm run docs:validate`: PASS, 0 documentos bloqueados; alertas documentais preexistentes preservados.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline resolvidos.
- `git diff --check`: PASS.
