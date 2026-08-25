# IMPLEMENTATION

- Task: ANALYTICS-KPI-LEGACY-CONTRACT-COMPATIBILITY-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 1e8bb51b262bf5746eedb41f24d79d98bfd0cb4a
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

Lote local concluído para revisão independente. O escopo foi somente o adaptador
de argumentos das RPCs de KPI, testes e evidência runtime; migration e banco
permanecem fora.

Arquivos alterados no lote:
- apps/web/src/features/analytics/analytics-api.ts
- tests/scripts/analytics-kpi-legacy-contract-compatibility.test.mjs
- tests/scripts/analytics-kpi-contract-parity.test.mjs
- docs/reports/ANALYTICS_KPI_LEGACY_CONTRACT_COMPATIBILITY_2026-08-24.md

Correção:
- Comercial e Suporte usam a assinatura histórica de quatro argumentos quando
  stageId e excludedPipelineIds estão vazios.
- p_group_company continua presente no caminho legado, portanto o filtro de
  operação não é descartado.
- Quando estágio ou exclusões existem, a chamada de seis argumentos permanece
  explícita e fail-closed enquanto a migration candidata não estiver aplicada.

Validações locais:
- node --test tests/scripts/analytics-kpi-legacy-contract-compatibility.test.mjs
  tests/scripts/analytics-kpi-contract-parity.test.mjs
  tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs: 18/18 PASS
- npm run test:focused: 349/349 PASS
- npm run web:typecheck: PASS
- npm run build: PASS, 946 módulos
- npm run lint: PASS, 0 erros e 158 warnings legados
- npm run docs:validate: PASS, 0 bloqueios
- npm run review:gates: PASS, 0 regressões bloqueantes, 47 itens baseline resolvidos
- git diff --check: PASS

Runtime autenticado read-only em http://127.0.0.1:4173, perfil QA Local
Administrador, Supabase local em 127.0.0.1:54321:
- Comercial carregou a RPC legada com payload de quatro argumentos e HTTP 200;
  operação Aftersale foi enviada como p_group_company=Aftersale.
- Suporte carregou a RPC legada com payload de quatro argumentos e HTTP 200;
  operação Neotrust foi enviada como p_group_company=Neotrust.
- Não houve PGRST202 nos caminhos observados, botão Aplicar permaneceu ausente
  e não houve erros ou warnings do aplicativo no console. Erros de extensão do
  navegador foram excluídos da leitura do aplicativo.

Limitações preservadas:
- A migration candidata de seis argumentos não foi aplicada.
- Stage/exclusions continuam não comprovados neste schema histórico e devem
  permanecer fail-closed até a migration passar pelo preflight aprovado.
- RLS/cross-tenant servido, usuário não administrador, produção e performance
  com volume real não foram validados neste lote.
