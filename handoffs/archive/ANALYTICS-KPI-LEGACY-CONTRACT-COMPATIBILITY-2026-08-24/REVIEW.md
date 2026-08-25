# REVIEW

- Task: ANALYTICS-KPI-LEGACY-CONTRACT-COMPATIBILITY-2026-08-24
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: 1e8bb51b262bf5746eedb41f24d79d98bfd0cb4a
- Estado revisado: READY_FOR_REVIEW
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Revisão independente

O lote responde corretamente ao `F-QA-001 HIGH` sem aplicar a migration
candidata. Os adaptadores de Comercial e Suporte retornam a assinatura
histórica de quatro argumentos somente quando `stageId` e
`excludedPipelineIds` estão vazios, preservando `p_group_company`. Quando
estágio ou exclusões são necessários, continuam enviando explicitamente a
assinatura de seis argumentos e permanecem fail-closed se ela não existir.

Evidências revalidadas:

- testes diretamente afetados: 18/18 PASS;
- `getCommercialKpisV2`, `getCommercialKpisV2ForOverview`,
  `getSupportKpisV2` e `getSupportKpisV2ForOverview` usam os adaptadores;
- runtime autenticado local confirmou HTTP 200 para Comercial e Suporte,
  payload legado, filtro de operação preservado e ausência de PGRST202;
- `git diff --check`: PASS;
- gates registrados: test:focused 349/349, web:typecheck, build 946 módulos,
  lint sem erros, docs:validate e review:gates PASS.

As limitações foram mantidas: a migration candidata não foi aplicada,
stage/exclusões não estão disponíveis no schema histórico, e RLS/cross-tenant
servido, usuário não administrador, produção e performance real não foram
validados.

## Decisão

`APPROVED`, limitado ao adaptador de compatibilidade local e aos testes/QA
allowlisted. O caminho legado volta a entregar KPIs de operação sem o
`PGRST202`, enquanto filtros avançados não são mascarados como disponíveis.
Esta aprovação não autoriza aplicar migration, executar SQL, alterar banco,
secrets, produção, push, merge ou deploy.
