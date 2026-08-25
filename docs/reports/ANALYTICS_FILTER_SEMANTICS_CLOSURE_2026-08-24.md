# Analytics Filter Semantics Closure

## Resultado

O Financeiro deixou de manter um `draft` separado dos filtros efetivos. Período,
situação, aging e cliente agora usam o estado controlado que alimenta a
consulta. A busca textual do cliente continua com debounce de 300 ms para não
consultar a cada tecla. O botão Aplicar permanece ausente.

## Decisões

- O preset de período é derivado dos filtros atuais, sem cópia intermediária.
- Intervalo inválido não atualiza o recorte nem inicia nova consulta e mostra
  validação ao operador.
- A chave semântica mantém período, operação, pipelines excluídos,
  responsável, estágio, prioridade, granularidade e busca quando publicados.
- Ao mudar o recorte, o Financeiro entra em loading e respostas de gerações
  canceladas não podem publicar snapshot antigo.
- A limitação de dimensão operacional do OMIE permanece explícita; não há
  atribuição inventada por operação.

## Validações

- teste direto de filtros/KPI: 16/16 PASS;
- `npm run test:focused`: 350/350 PASS em 53 arquivos;
- `npm run web:typecheck`: PASS;
- `npm run build`: PASS, 946 módulos;
- `npm run lint`: PASS, 0 erros e 158 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens baseline
  resolvidos;
- `git diff --check`: PASS.

## Limitações

Este lote não altera RPCs, views, migrations, policies, RLS, permissões,
integrações, banco ou secrets. Paridade remota, RLS/cross-tenant servido,
performance com volume real, sessão autenticada em produção e release não
foram validados.
