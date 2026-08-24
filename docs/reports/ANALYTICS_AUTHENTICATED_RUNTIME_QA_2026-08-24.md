# QA de runtime local do Analytics

- Task: `ANALYTICS-AUTHENTICATED-RUNTIME-QA-2026-08-24`
- Base SHA: `ea328cacd65dcfa74aec0c62ff8b5512f4fa8d90`
- Data da execução: `2026-08-24`
- Ambiente: local, `http://127.0.0.1:4173`, navegador headless Playwright, viewport `1440x900`
- Natureza: QA local read-only
- Resultado: PARCIAL, sem aprovação funcional autenticada

## Allowlist efetiva

Este lote alterou somente o relatório e os handoffs correntes `TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`. `REVIEW.md` foi preservado. Nenhum arquivo de runtime, teste de produto, contrato, configuração executável, banco ou migration foi alterado.

## Evidências reproduzidas

### Ambiente

Na janela local `2026-08-24T20:35:40.9507764-03:00`, o checkout foi confirmado em `C:\Projetos\ConfiOne`, branch `codex/performance-reconciliation-20260822`, HEAD `ea328cacd65dcfa74aec0c62ff8b5512f4fa8d90`. O processo web já estava ouvindo em `127.0.0.1:4173`. O Docker mostrou o container local canônico `supabase_db_genius-support-os` saudável. Nenhum comando de escrita, migration, reset ou seed foi executado.

### Guard não autenticado

Foram navegadas as cinco entradas abaixo, cada uma em contexto novo:

| Entrada | HTTP inicial | Destino final | Console/page errors | Falhas de request | REST/RPC observado |
| --- | ---: | --- | ---: | ---: | ---: |
| `/admin/analytics` | 200 | `/login?redirectTo=/admin/analytics` | 0 | 0 | 0 |
| `/admin/analytics?tab=commercial` | 200 | `/login?redirectTo=/admin/analytics?tab=commercial` | 0 | 0 | 0 |
| `/admin/analytics?tab=cs` | 200 | `/login?redirectTo=/admin/analytics?tab=cs` | 0 | 0 | 0 |
| `/admin/analytics?tab=support` | 200 | `/login?redirectTo=/admin/analytics?tab=support` | 0 | 0 | 0 |
| `/admin/analytics?tab=finance` | 200 | `/login?redirectTo=/admin/analytics?tab=finance` | 0 | 0 | 0 |

Isso comprova apenas reachability do shell e bloqueio correto do usuário não autenticado. HTTP 200 não foi tratado como sucesso funcional.

### Tentativa autenticada com perfil existente

Foi usado somente o perfil local já configurado `platform_admin` em `.env.local.qa`, sem registrar ou exibir email, senha, token, cookie ou payload. O fluxo foi iniciado pela tela de login para `/admin/analytics`. A aplicação permaneceu em `/login` e exibiu o erro sanitizado `JWT issued at future`. O Dashboard não foi alcançado.

Classificação: bloqueio de ambiente local de autenticação por divergência temporal. Não é evidência de falha do contrato do Dashboard nem de sucesso autenticado.

## Matriz de cobertura

| Cenário | Resultado | Evidência/limite |
| --- | --- | --- |
| Shell e guard de `/admin/analytics` | COMPROVADO localmente | Cinco entradas retornaram 200 e terminaram em `/login`, sem erros ou requests falhos. |
| Tabs Visão Geral, Comercial, CS/Suporte e Financeiro autenticadas | NÃO COMPROVADO | A sessão existente não passou do login. |
| Troca de operação | NÃO COMPROVADO | Não houve tela autenticada disponível. |
| Troca de período | NÃO COMPROVADO | Não houve tela autenticada disponível. |
| Filtros de owner, stage, status, prioridade e pipelines | NÃO COMPROVADO | Não houve tela autenticada disponível. |
| Troca de grain/série temporal | NÃO COMPROVADO | Não houve tela autenticada disponível. |
| RPCs/read models servidos | NÃO COMPROVADO | Nenhuma chamada REST/RPC foi observada no contexto não autenticado; a sessão autenticada não foi estabelecida. |
| Console, page errors e request failures autenticados | NÃO COMPROVADO | O bloqueio ocorreu antes do Dashboard. No contexto não autenticado, todos foram zero. |
| Ausência de loop de navegação autenticado | NÃO COMPROVADO | Não foi possível executar o fluxo autenticado. O guard não autenticado terminou em `/login` sem loop na janela observada. |
| Ausência de snapshot stale após filtro | NÃO COMPROVADO | Sem dados e sem tela autenticada não há base para afirmar limpeza, cancelamento ou descarte de resposta obsoleta. |
| RLS, isolamento cross-tenant e permissões servidas | NÃO COMPROVADO | Não foram feitas consultas autenticadas nem chamadas remotas. |
| Performance/latência real | NÃO COMPROVADO | QA limitado ao shell local e ao bloqueio de autenticação. |

## Scripts e fontes consultados

- `scripts/local-qa/browser-smoke.mjs`: lido, mas não executado porque inclui cenários de escrita em Conhecimento e geração de screenshots, incompatíveis com este lote read-only.
- `scripts/local-qa/smoke.mjs`: lido como referência de autenticação existente; nenhum valor de credencial foi impresso.
- `scripts/local-qa/assert-local-supabase.mjs`: usado apenas como referência de validação de ambiente local.
- `apps/web/src/features/analytics/analytics-api.ts`: contratos locais de RPCs consultados por inspeção, sem chamada direta neste lote.
- `apps/web/src/app/router.tsx` e componentes de Analytics: consultados para confirmar as entradas de rota e o escopo do QA.

## Riscos e próximos passos

1. O bloqueio `JWT issued at future` precisa ser corrigido no ambiente local autorizado, por sincronização temporal/revalidação controlada da sessão, antes de repetir QA autenticado. Não é permitido contornar isso com credenciais novas ou tokens expostos.
2. Depois que uma sessão local já existente funcionar, repetir as cinco superfícies, filtros, grain, troca rápida de recorte, console, rede e confirmação de ausência de snapshot stale.
3. Manter como gate separado qualquer validação de RLS/cross-tenant, performance real, produção e integrações HubSpot/OMIE.

## Gates

- `npm run docs:validate`: PASS, 0 bloqueios; 3 documentos válidos, 9 com alertas preexistentes e 0 bloqueados.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline resolvidos; os achados do baseline permaneceram sem novos regressões.
- `git diff --check`: PASS.

Os gates acima são validações do lote documental. Eles não transformam a cobertura autenticada em comprovada.
