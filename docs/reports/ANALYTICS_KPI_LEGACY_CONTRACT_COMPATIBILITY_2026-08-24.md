# Analytics KPI Legacy Contract Compatibility

Data: 2026-08-24
Task: ANALYTICS-KPI-LEGACY-CONTRACT-COMPATIBILITY-2026-08-24
Base SHA: `1e8bb51b262bf5746eedb41f24d79d98bfd0cb4a`
Implementation: `UNCOMMITTED_WORKTREE`

## Objetivo

Corrigir o PGRST202 observado no Dashboard autenticado quando o frontend
enviava a assinatura de seis argumentos para RPCs que, no schema local atual,
exibem apenas a assinatura histórica de quatro argumentos.

## Correção aplicada

`analytics-api.ts` agora centraliza os argumentos em dois adaptadores. Quando
`stageId` e `excludedPipelineIds` estão vazios, Comercial e Suporte chamam a
assinatura legada, mantendo `p_group_company` para respeitar o filtro por
operação. Quando estágio ou exclusões são necessários, a chamada de seis
argumentos continua explícita. Sem a migration candidata aplicada, esse caminho
continua fail-closed e não inventa resultado.

## Evidência autenticada local

Ambiente read-only:

- Aplicação: `http://127.0.0.1:4173`
- Supabase local: `http://127.0.0.1:54321`
- Perfil visível: `QA Local Administrador`
- Rota Comercial: `admin/analytics?tab=commercial`
- Rota Suporte: `admin/analytics?tab=support`

Observações de rede via DevTools:

- Comercial respondeu HTTP 200 usando payload legado com
  `p_from`, `p_to`, `p_owner_id` e `p_group_company`.
- Com a operação `Aftersale`, o payload continha
  `p_group_company: "Aftersale"`.
- Suporte respondeu HTTP 200 usando payload legado com
  `p_from`, `p_to`, `p_priority` e `p_group_company`.
- Com a operação `Neotrust`, o payload continha
  `p_group_company: "Neotrust"`.
- Não foi observado `PGRST202` nessas chamadas.
- O botão `Aplicar` não existe na interface.
- Não houve erro ou warning originado pelo aplicativo no console. Mensagens de
  extensão do navegador foram desconsideradas.

## Gates

- Testes diretamente afetados: 18/18 PASS
- `npm run test:focused`: 349/349 PASS
- `npm run web:typecheck`: PASS
- `npm run build`: PASS, 946 módulos
- `npm run lint`: PASS, 0 erros e 158 warnings legados
- `npm run docs:validate`: PASS, 0 bloqueios
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos
- `git diff --check`: PASS

## Limitações e no-go

- A migration candidata de seis argumentos não foi aplicada.
- Stage e exclusões continuam não comprovados no schema histórico e só podem
  ser habilitados após preflight semântico aprovado.
- RLS/cross-tenant servido, usuário não administrador, produção e performance
  com volume real permanecem não comprovados.
- Este lote não autoriza migration, SQL, reset, repair, banco remoto, secrets,
  push, merge ou deploy.
