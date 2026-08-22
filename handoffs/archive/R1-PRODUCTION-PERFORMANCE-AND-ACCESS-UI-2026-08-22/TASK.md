# TASK

## R1-PRODUCTION-PERFORMANCE-AND-ACCESS-UI-2026-08-22

- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: 4c2e915e8eec02bb1699e54d6f9c0114507f475b
- Approval: APPROVED

### Objetivo

Eliminar as falhas observadas no teste autenticado de produção, reduzir o
tempo de carregamento e impedir publicação do frontend sem o esquema remoto
compatível. Refatorar o modal de criação/edição de acesso para uma composição
estável, responsiva e visualmente alinhada, sem unificar ou substituir o modelo
executável de permissões.

### Allowlist

- `apps/web/src/features/access/InternalControlPlanePage.tsx`
- `apps/web/src/features/settings/settings-ui.css`
- `apps/web/src/components/ui.tsx`
- `apps/web/src/features/analytics/analytics-api.ts`
- `apps/web/src/features/admin/admin-api.ts`
- `supabase/migrations/` somente migrations novas e corretivas diretamente
  relacionadas aos contratos e performance encontrados
- `supabase/tests/` e `tests/scripts/` para regressões do lote
- `.github/workflows/` e `scripts/ci/` para gate de compatibilidade de banco
- `scripts/local-qa/browser-smoke.mjs` somente para corrigir a inicialização do
  frontend local com as variáveis públicas do Supabase local, sem repassar
  credenciais de personas ao processo Vite
- documentação do lote e `handoffs/current/*`

### Fora de escopo

- alteração do modelo de permissões ou do contrato Nível → Área → Tela → READ/WRITE;
- remoção de fontes executáveis existentes;
- secrets, credenciais, escrita externa, migration remota, produção, push, merge
  ou deploy nesta etapa;
- redesign geral do shell ou de telas fora do módulo de acessos.

### Evidências de produção a responder

- `vw_admin_tenant_group_context` retornou 404 `PGRST205`;
- `rpc_analytics_customer_success_kpis_by_operation` retornou 404 `PGRST202`;
- `rpc_analytics_ceo_snapshot`, `rpc_analytics_ceo_history` e
  `rpc_analytics_executive_kpis_v2` retornaram 500 `57014` por statement timeout;
- Comercial, Suporte e Financeiro carregaram; Produto e Desenvolvimento ficou
  explicitamente indisponível por contrato;
- o CI local validava migrations, mas não aplicava nem verificava o Supabase
  remoto antes da publicação do frontend.

### Critérios de aceitação

1. Os contratos ausentes têm migration/teste de presença, grants e schema cache
   compatíveis com os consumidores atuais.
2. As RPCs executivas têm caminho de consulta mensurável e regressões contra
   timeout/performance, sem mascarar falhas como zero ou indisponível.
3. Existe gate de release documentado e automatizável que bloqueia promoção do
   frontend quando migration remota ou smoke contract não passa.
4. O modal de acesso possui header, body rolável e footer estáveis, foco/ESC,
   responsividade e sem sobreposição com o drawer de detalhe.
5. Typecheck, build, lint, testes focados, docs:validate e diff check passam.
