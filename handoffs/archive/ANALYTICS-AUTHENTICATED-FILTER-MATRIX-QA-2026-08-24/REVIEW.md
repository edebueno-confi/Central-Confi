# REVIEW

- Task: ANALYTICS-AUTHENTICATED-FILTER-MATRIX-QA-2026-08-24
- Reviewer: Sentinel (Codex Independent Reviewer)
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Revisão independente

O relatório foi confrontado com o código local e com a migration candidata. A
evidência sustenta o finding `F-QA-001 HIGH`: `analytics-api.ts` envia
`p_excluded_pipeline_ids` para as RPCs de Comercial e Suporte, enquanto a
assinatura histórica local permanece com quatro argumentos. A migration
`20260824210000_analytics_kpi_contract_parity_v1.sql` declara as assinaturas de
seis argumentos, mas não foi aplicada. O `PGRST202` e a ausência de dados
válidos nas superfícies são, portanto, coerentes com o estado local observado.

O relatório também preserva corretamente:

- QA autenticado limitado ao perfil QA Local Administrador;
- operação, período e chamadas observadas sem transformar erro de contrato em
  dado disponível;
- ausência de botão Aplicar e ausência de console errors/warnings;
- não comprovação de paridade remota, RLS/cross-tenant, performance real e
  produção;
- proibição de contornar o finding aplicando migration no banco canônico ou
  remoto.

Validações read-only desta revisão:

- inspeção do diff e das fontes locais confirmou os parâmetros de seis
  argumentos no frontend e a assinatura histórica de quatro argumentos;
- `git diff --check`: PASS;
- gates registrados no handoff: docs:validate PASS, review:gates PASS e
  `F-QA-001 HIGH` preservado.

## Decisão

`APPROVED`, limitado ao relatório e ao registro do QA autenticado local. O
finding `F-QA-001 HIGH` permanece aberto e bloqueia a aceitação funcional das
leituras Comercial/Suporte até uma task independente de compatibilidade e
validação da migration candidata. Esta aprovação não autoriza alterar código,
aplicar migration, executar SQL, modificar banco, secrets, produção, push,
merge ou deploy.
