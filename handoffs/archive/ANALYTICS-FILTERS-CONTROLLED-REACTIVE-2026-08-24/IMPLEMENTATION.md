# IMPLEMENTATION

- Task: ANALYTICS-FILTERS-CONTROLLED-REACTIVE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: a95c36b3bc27cc2bdac60e95f3fc3159989e02c3
- Implementation SHA: UNCOMMITTED_WORKTREE
- Agent coordination: REVIEW_ACTIVE

## Diagnóstico

O botão `Aplicar` já não era renderizado e os campos comuns já chamavam o
callback a cada alteração, mas `AnalyticsFilters.tsx` ainda mantinha `draft`
e sincronizava esse estado por `useEffect`. Isso deixava uma camada de estado
intermediária desnecessária e contrariava o contrato de filtros controlados.

## Implementação

- `AnalyticsFilters` passou a ler diretamente `value` e emitir `onChange`;
- período preset passou a ser derivado do valor controlado;
- Comercial, Suporte e Visão Geral foram migrados de `onApply` para `onChange`;
- regressão passou a exigir ausência de `draft` e de `useState(value)`;
- Financeiro permaneceu sem alteração funcional, mantendo apenas o estado
  necessário ao debounce da busca de cliente.

## Gates executados

- `node --test tests/scripts/analytics-reactive-filters-kpi-loop.test.mjs`: 5/5 PASS;
- `npm run test:focused`: 346/346 PASS em 52 arquivos;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 946 módulos transformados;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens de baseline resolvidos;
- `git diff --check`: PASS.

Nenhum banco, migration, RPC, contrato remoto, secret, push, merge ou deploy
foi alterado ou executado.

Nenhuma implementação ativa.
