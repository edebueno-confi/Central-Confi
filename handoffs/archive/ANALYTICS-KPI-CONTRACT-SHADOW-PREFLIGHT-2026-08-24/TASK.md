# TASK

- Task: ANALYTICS-KPI-CONTRACT-SHADOW-PREFLIGHT-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 2da99c95e00ac06ab222af3c1e4a26d67114205c
- Approval: APPROVED por promoção sequencial do Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Validar a migration candidata `20260824210000_analytics_kpi_contract_parity_v1.sql`
somente em shadow descartável namespaced, sem tocar o banco canônico local ou
remoto. A análise deve cobrir wrappers, assinaturas, filtros de operação,
Todas, estágio, exclusões de pipeline e honestidade de Customer Success e
Financeiro.

## Allowlist do lote

- `scripts/local-qa/analytics-kpi-shadow-preflight.mjs`
- `tests/scripts/analytics-kpi-shadow-preflight.test.mjs`
- `docs/reports/ANALYTICS_KPI_CONTRACT_SHADOW_PREFLIGHT_2026-08-24.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`
- `handoffs/current/REVIEW.md`, preservado sem veredito inventado

`package.json`, a migration candidata e quaisquer arquivos preexistentes fora
da lista não entram no lote. A fila `handoffs/README.md` possui alterações
preexistentes; eventual promoção da linha desta task fica fora do stage/commit
se não puder ser separada deterministicamente.

## Fora de escopo e segurança

- não aplicar migration no `supabase_db_genius-support-os`;
- não executar SQL manual fora do shadow descartável;
- não resetar, reparar, reconstruir ou alterar o banco local principal;
- não usar secrets, credenciais, HubSpot/OMIE, produção, push, merge, deploy ou
  release.

Se o shadow ou a migration falhar, o resultado deve ser `NO_GO` fail-closed,
com comando, alvo, erro sanitizado e limitação. Não contornar a falha no banco
canônico.

## Critérios

1. auditoria estática da migration e dos wrappers de seis argumentos;
2. identidade do container shadow verificada e distinta do canônico;
3. aplicação, catálogo, ACL, `search_path`, `security definer` e assinaturas
   validados no shadow, quando o schema de dependências permitir;
4. seleção de operação, Todas, estágio e exclusões coberta por fixture segura;
5. PostgREST, RLS/cross-tenant servido, browser autenticado, performance real,
   integrações externas e produção classificados como comprovados ou
   `NÃO COMPROVADO`, sem inferência;
6. testes focados, `docs:validate` e `git diff --check` executados;
7. entrega `READY_FOR_REVIEW`, Owner Sentinel, `REVIEW_ACTIVE`, sem aprovação
   automática.
