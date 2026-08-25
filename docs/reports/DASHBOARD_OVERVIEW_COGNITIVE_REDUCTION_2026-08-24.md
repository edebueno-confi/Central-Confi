# Dashboard Overview Cognitive Reduction

## Resultado

O lote reduz a Visão Geral a um resumo executivo curto e remove cartões de
placeholder das abas que não acrescentavam leitura operacional. O quadro
reutilizável `AnalyticsKpiBoard` permanece como a única camada de KPIs da
Visão Geral. Evolução temporal fica nas abas Comercial, Suporte e Financeiro,
onde já existe contrato de série; Customer Success continua declarando a
indisponibilidade sem fabricar tendência.

## Decisões de produto e interface

- Visão Geral mantém filtros, estado da leitura, recorte por operação, quadro
  de KPIs, mapa das áreas e atenção operacional.
- Os blocos antigos de `Desempenho no período` e `Posição atual` foram
  removidos porque repetiam indicadores já publicados no quadro de KPIs.
- Os três painéis `Evolução por domínio` foram removidos da Visão Geral. A
  mesma série continua acessível na aba da área, com seu contexto, unidade e
  filtro próprios.
- Foram retirados do fluxo principal os placeholders de tarefas/atividades de
  Comercial, Customer Success e Suporte, o placeholder de Chat/Conversas de
  Suporte e a dimensão inexistente de responsável no Financeiro.
- Permanecem análises com fonte real, como funil e responsáveis em Comercial,
  fila e responsáveis em Suporte, carteira/risco em Customer Success e
  previsibilidade, aging e devedores em Financeiro.
- O botão Aplicar continua ausente. Os filtros controlados recalculam a leitura
  a cada alteração, mantendo o comportamento reativo já aprovado.

## Segurança e contratos

Nenhuma RPC, view, migration, policy, RLS, contrato backend, permissão,
integração, banco ou regra de negócio foi alterada. A operação continua sendo
enviada aos read models existentes e os estados indisponível, parcial e sem
histórico continuam explícitos.

## Validações

- regressões diretamente afetadas: 42/42 PASS;
- `npm run test:focused`: 350/350 PASS em 53 arquivos;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 946 módulos;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS;
- smoke local autenticado read-only em `127.0.0.1:4173`: Visão Geral sem
  Evolução por domínio, sem os blocos duplicados e sem Aplicar; Comercial,
  Suporte e Financeiro preservaram Posição/Evolução; Customer Success exibiu
  `Evolução indisponível` com explicação de contrato ausente.

## Limitações

O lote não comprova RLS/cross-tenant servido, paridade numérica remota,
performance com volume de produção, integração externa ou release. A
migration candidata de paridade de KPIs continua não aplicada. As alterações
preexistentes do worktree foram preservadas fora deste lote.
