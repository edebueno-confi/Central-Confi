# REVIEW

- Task: ANALYTICS-FILTERS-CONTROLLED-REACTIVE-2026-08-24
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: a95c36b3bc27cc2bdac60e95f3fc3159989e02c3
- Estado revisado: READY_FOR_REVIEW
- Review mode: SENTINEL_REQUIRED
- Veredito: APPROVED

## Revisão independente

O diff allowlisted remove o estado intermediário `draft` do
`AnalyticsFilters`, deriva o preset a partir de `value` e emite alterações
válidas por `onChange`. Datas inválidas não são emitidas; `Limpar` mantém o
recorte controlado e os consumidores Comercial, Suporte e Visão Geral foram
migrados de `onApply` para `onChange`. Não há uso restante de `onApply` no
componente comum. Financeiro permanece fora do componente e mantém somente o
estado local necessário ao debounce de cliente, conforme o escopo.

Evidências revalidadas:

- `node --test tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`:
  5/5 PASS;
- `npm run test:focused`: 346/346 PASS em 52 arquivos;
- `npm run web:typecheck`: PASS;
- gates registrados em IMPLEMENTATION.md: build 946 módulos, lint sem erros,
  docs:validate, review:gates e `git diff --check` PASS;
- nenhum RPC, migration, banco, RLS, contrato remoto, integração ou secret foi
  alterado ou executado.

Não foram executados QA browser autenticado, validação de PostgREST/RLS
servido, produção ou performance com volume real. Essas limitações não
impedem o aceite desta mudança local de contrato visual controlado.

## Decisão

`APPROVED`, limitado aos arquivos allowlisted e à remoção do estado intermediário
dos filtros comuns. O ganho para o produto é uma experiência reativa e
consistente entre Visão Geral, Comercial e Suporte, com menor risco de estado
stale ou ação Aplicar divergente. Esta aprovação não autoriza migration,
alteração de banco, ação remota, push, merge ou deploy.
