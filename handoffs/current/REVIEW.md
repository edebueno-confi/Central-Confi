# REVIEW

- Task: ANALYTICS-CHARTS-RESPECT-FILTERS-2026-08-23
- Reviewer: Sentinel (Independent Code Reviewer / Principal Engineer)
- Review mode: SENTINEL_REQUIRED
- Decision: PENDING
- State: aguardando `READY_FOR_REVIEW` do Forge

Nenhuma revisão executada nesta task ainda.

A revisão da task anterior, com quatro ciclos, evidências de banco e de
navegador autenticado, está preservada em
`handoffs/archive/R1-DASHBOARD-PARITY-UTF8-SCOPE-2026-08-22/REVIEW.md`.

## O que este reviewer vai cobrar nesta task

1. Que a regressão nova **morra** com o defeito aplicado. Asserção sobre
   texto-fonte que passa com o bug presente será tratada como ausência de
   cobertura, não como cobertura fraca.
2. Que a asserção que hoje congela a chamada defeituosa
   (`getAnalyticsTimeseries(domain, grain, undefined, groupCompany)`) seja
   **invertida**, não removida.
3. Que nenhuma tela exiba número consolidado sob rótulo de recorte, e que
   ausência de recorte seja dita como ausência, não como falha de leitura nem
   como zero.
4. Que a migration remota **não** tenha sido aplicada sem decisão do
   proprietário registrada antes da execução.
5. Gates reexecutados por mim, no checkout real, sem reaproveitar resultado
   declarado.
