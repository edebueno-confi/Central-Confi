# TASK

- Task: ANALYTICS-KPI-CONTRACT-SHADOW-BOOTSTRAP-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 4bf30fdd094f456760fc574fcca6218f6efe4ebb
- Approval: APPROVED
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Corrigir exclusivamente o bootstrap do PostgreSQL shadow descartável usado pelo
preflight da migration candidata de paridade dos KPIs. O shadow deve aguardar
o fim dos scripts de inicialização da imagem antes de executar SQL de teste,
evitando corrida com extensões e gatilhos internos.

## Escopo allowlisted

- `scripts/local-qa/analytics-kpi-shadow-preflight.mjs`;
- `tests/scripts/analytics-kpi-shadow-preflight.test.mjs`;
- `docs/reports/ANALYTICS_KPI_CONTRACT_SHADOW_PREFLIGHT_2026-08-24.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md`;
- atualização seletiva da linha desta task em `handoffs/README.md`.

## Fora de escopo

Banco local canônico, migration canônica aplicada, reset, repair, SQL manual
fora do shadow, banco remoto, secrets, integrações externas, push, merge,
deploy e release.

## Critérios de aceite

1. O shadow continua namespaced, descartável e rejeita o container canônico.
2. A readiness aguarda o marcador de bootstrap completo da imagem e depois
   confirma `select 1`; corrida ou container encerrado produzem `NO_GO` sem
   executar SQL adicional.
3. Há regressões determinísticas para readiness incompleta/exit e para não
   expor o alvo canônico.
4. O preflight completo é executado somente no shadow; caso a aplicação ou
   PostgREST não possam ser comprovados, o resultado continua `NO_GO` e
   `failClosed=true`.
5. Os gates relevantes passam e a entrega volta a `READY_FOR_REVIEW` para o
   Sentinel, sem aprovação autodeclarada.
