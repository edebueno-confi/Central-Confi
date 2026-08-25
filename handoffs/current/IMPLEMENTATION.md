# IMPLEMENTATION

- Task: ANALYTICS-DASHBOARD-AUTHORIZATION-RUNTIME-CLOSURE-2026-08-25
- State: IDLE
- Owner: Forge
- Role: EXECUTOR
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Agent coordination: IDLE
- Base SHA: 09dc2278653c311f03cd94ebc41f03501d37eea4
- Implementation SHA: FINALIZE_LOCAL_PENDING_SHA

## Finalização local

Sentinel aprovou o lote para finalização local seletiva. O commit deve conter
somente os dois scripts do harness, o teste, o relatório e os quatro handoffs
arquivados, preservando alterações preexistentes fora da allowlist.

## Diagnóstico inicial

`node scripts/local-qa/analytics-dashboard-runtime-matrix.mjs` foi executado
contra `http://127.0.0.1:4173` em modo read-only e retornou `NO_GO` por ausência
de `LOCAL_QA_AUTHORIZED_STORAGE_STATE`,
`LOCAL_QA_DASHBOARD_VIEWER_STORAGE_STATE` e `LOCAL_QA_STALE_STORAGE_STATE`.
A persona não autenticada chegou às cinco rotas de `/login` sem erros, falhas
de request ou overflow. O gate atual não prova autorização autenticada porque
não recebeu states.

O smoke genérico `npm run local:qa:smoke` não será usado neste lote: ele parou
antes da validação do Dashboard em um cenário de Conhecimento que espera o
botão `Editar` e contém uma etapa de escrita posterior. Nenhuma escrita foi
alcançada nesta execução; a falha é fora do escopo do Dashboard.

## Plano de implementação

1. Criar um harness próprio de autorização, reaproveitando apenas o carregador
   de configuração QA e o servidor local existente.
2. Exercitar apenas navegação, guard, abas e diagnóstico read-only; não incluir
   cenários de edição, sincronização ou exportação.
3. Usar os logins QA existentes somente em memória para personas autorizadas e
   negar explicitamente o cenário sem permissão; nunca persistir credenciais ou
   storage state.
4. Manter stale como dimensão condicional e fail-closed quando ausente.
5. Adicionar regressões puras e relatório com evidência e limitações.

## Validações até aqui

- `node scripts/local-qa/analytics-dashboard-runtime-matrix.mjs`: `NO_GO`,
  esperado por ausência de storage states; somente a persona sem sessão foi
  exercitada.
- `npm run local:qa:smoke`: interrompido por timeout no cenário de Conhecimento
  em `scripts/local-qa/browser-smoke.mjs:292`, fora do Dashboard; sem escrita
  alcançada.

## Evidência do harness próprio

`node scripts/local-qa/analytics-dashboard-authorization-runtime.mjs` foi
reexecutado com o servidor local em `127.0.0.1:4173` e Supabase local em
`127.0.0.1:54321`:

- 40 rotas funcionais, cobrindo `platform_admin`, `dashboard_viewer` e
  `customer_user` em desktop e mobile, mais 10 rotas não autenticadas;
- `platform_admin` e `dashboard_viewer`: cinco abas cada, pathname/query e
  `aria-current` corretos, sem overflow;
- `customer_user`: cinco tentativas em cada viewport, todas redirecionadas para
  `/inicio`, sem acesso ao Dashboard;
- não autenticado: 10 redirects para `/login` com `redirectTo` exato;
- 0 falhas de rota, 0 erros de console/page, 0 request failures, 0 respostas
  inesperadas, 0 requests de escrita e 0 hosts externos não permitidos;
- configuração QA encontrada para as três personas autenticadas;
- stale state ausente: `state=NOT_PROVEN`, portanto o resultado global é
  `NO_GO`/`failClosed=true`, sem fabricar uma aprovação.

## Resposta aos findings do Sentinel

- F-AUTH-001: `isAllowedReadOnlyRequest` agora recebe a porta observada e
  rejeita qualquer POST allowlisted fora de `127.0.0.1:54321`; a regressão
  cobre o mesmo RPC em `4173`.
- F-AUTH-002: `diagnosticFailures` é aplicado a cada rota e
  `evidenceFailures(results)` também é agregado ao `allFailures` final,
  incluindo não autenticado e stale.
- F-AUTH-003: `customer_user` coleta links e botões da navegação principal;
  rotas e rótulos administrativos indevidos falham o resultado em desktop e
  mobile. Há regressões para rota, rótulo e link administrativo.

O resultado é `AUTHORIZATION_RUNTIME_GO` apenas para as dimensões executadas.
Não é aprovação de stale, RLS/cross-tenant, equivalência numérica,
performance real, remoto, produção ou deploy.

## Gates

- `node --test tests/scripts/analytics-dashboard-authorization-runtime.test.mjs`: 10/10 PASS;
- `node --check` dos dois scripts: PASS;
- execução do harness: 0 falhas observadas nas dimensões executadas,
  `state=NO_GO`, `failClosed=true` por stale ausente;
- `npm run test:focused`: 377/377 PASS;
- `npm run contracts:typecheck`: PASS;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 946 módulos;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline resolvidos;
- `git diff --check`: PASS.

## Transferência para revisão

State=READY_FOR_REVIEW, Owner=Sentinel, Role=REVIEWER, Reviewer active=Sentinel,
Review mode=SENTINEL_REQUIRED e Agent coordination=REVIEW_ACTIVE. Sentinel deve
revisar o allowlist, a distinção entre GO parcial e NO_GO global, a negação do
`customer_user`, a política de requests read-only e as regressões dos três
findings respondidos.
