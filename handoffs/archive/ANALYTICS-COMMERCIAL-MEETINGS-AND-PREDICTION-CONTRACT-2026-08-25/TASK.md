# TASK

State: READY_FOR_REVIEW
Owner: Sentinel
Reviewer active: Sentinel
Role: REVIEWER
Review mode: SENTINEL_REQUIRED
Agent coordination: REVIEW_ACTIVE
Task: ANALYTICS-COMMERCIAL-MEETINGS-AND-PREDICTION-CONTRACT-2026-08-25
Base SHA: a7f758033d6f1155127030b91545b5aeea489a90

## Objetivo

Investigar, somente em modo read-only, se o contrato atual possui dados reais
para reuniões HubSpot e se existe base suficiente para Predição Comercial.

## Deve entregar

- inventário de propriedades, eventos, objetos, associações e read models já
  existentes no código e na documentação;
- matriz de cobertura para reuniões, negócios criados/tocados/ganhos/perdidos,
  responsável, pipeline, período, conversão, lead time e MRR;
- definição de coorte e limitações para cada métrica, sem inventar campos;
- decisão objetiva: disponível, indisponível ou não comprovado;
- recomendação de contrato backend futuro, sem implementar UI ou cálculo local;
- testes/documentação read-only reproduzíveis quando houver superfície existente.

## Fora de escopo

HubSpot write, propriedade customizada, migration, SQL remoto/manual, secrets,
provider de IA, predição em produção, cálculo no frontend, deploy, push, merge,
reset, repair ou alteração de dados externos.

## Critérios de aceite

- fontes e campos são citados por contrato/read model ou marcados NÃO COMPROVADO;
- nenhuma conclusão depende de fallback consolidado ou zero artificial;
- relatório registra data, método, cobertura, limitações e próximos contratos;
- gates documentais e diff-check passam;
- entrega em READY_FOR_REVIEW para Sentinel, sem autoveredito.

## Allowlist do lote

- `docs/reports/ANALYTICS_COMMERCIAL_MEETINGS_PREDICTION_CONTRACT_2026-08-25.md`
- `tests/scripts/analytics-commercial-meetings-prediction-contract.test.mjs`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/STATUS.md`

`handoffs/current/REVIEW.md` permanece reservado ao Sentinel. Alterações
preexistentes fora da allowlist não pertencem a este lote.
