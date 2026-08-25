# Analytics Dashboard Runtime Matrix Gate · 2026-08-24

## Veredito vigente

`NO_GO` fail-closed para aceitação funcional completa.

O gate read-only foi implementado para exercitar as cinco abas do Dashboard,
registrar rotas, respostas, parâmetros sanitizados, console, falhas de rede,
overflow e sinais de loading/stale. Ele exige execução em `127.0.0.1:4173` e
nunca lê credenciais, executa login por senha ou escreve no banco.

## Evidência da execução

- Base local: `512e11d31c47437040e25b86abb1d9f968b773ae`.
- Superfícies: Visão Geral, Comercial, Customer Success, Suporte e Financeiro.
- Execução atual: 5/5 rotas sem sessão redirecionaram para `/login` com
  `redirectTo` preservado; 0 console errors, 0 page errors, 0 request failures,
  0 respostas 4xx/5xx e 0 overflow.
- Resultado do comando: exit 1 esperado, `state=NO_GO` e `failClosed=true`,
  pois as três sessões autenticadas não foram fornecidas.
- Após a revisão do gate, a captura inclui `:54321` local e os POSTs permitidos
  ficaram limitados a refresh de sessão e RPCs `rpc_analytics_*`; métodos de
  escrita e hosts externos falham closed. Console, page errors, rede, query e
  body passam por sanitização antes do registro.
- Loading e stale não são apenas campos informativos: quando uma sessão é
  fornecida, ausência de evidência de loading ou, no perfil stale, de guarda
  stale, mantém o resultado em `NO_GO`.
- Com sessão autenticada fornecida pelo ambiente, a matriz também percorre as
  opções publicadas de operação, altera datas e controles disponíveis, abre o
  combobox de pipelines, alterna um pipeline e executa uma troca rápida de
  operação. Cada ação registra `requestsBefore`, `requestsAfter` e
  `requestDelta`; sem nova requisição, a evidência não pode ser promovida a
  sucesso funcional.
- Personas declaradas: não autenticado, autorizado, `dashboard_viewer` e sessão
  stale.
- Filtros exercitados quando um `storageState` autenticado é fornecido:
  operação/Todas, período, datas, estágio/status, responsável, prioridade,
  cliente e trocas rápidas.
- Métodos de rede aceitos pelo gate: leitura HTTP e `POST` de RPC/read model;
  métodos diferentes falham antes de produzir aprovação.
- Evidência de rede publicada apenas com caminho, método, status e parâmetros
  sanitizados. Tokens, cookies, JWTs, senhas, secrets e chaves nunca entram no
  relatório.

## Limitação encontrada

Na execução vigente não foi fornecido `storageState` autenticado para os
perfis `authorized`, `dashboard_viewer` e `stale_session`. Portanto, o gate
comprova somente a camada sem sessão e a existência da matriz autenticada como
cenário opcional. Não é legítimo declarar que permissões, RPCs, dados, filtros
aplicados, estados stale, RLS/cross-tenant ou performance foram comprovados.

Variáveis opcionais para uma execução autenticada read-only, sem login por
senha:

- `LOCAL_QA_AUTHORIZED_STORAGE_STATE`
- `LOCAL_QA_DASHBOARD_VIEWER_STORAGE_STATE`
- `LOCAL_QA_STALE_STORAGE_STATE`

Os arquivos devem ser fornecidos pelo ambiente de QA e não devem ser
versionados. O script não imprime o conteúdo deles.

## Correções dos findings F-RUNTIME-MATRIX-001/002

Os findings foram respondidos sem ampliar o escopo read-only:

- `loadingTransitionObserved` só é verdadeiro quando o DOM apresenta sinal de
  loading na coleta inicial e deixa de apresentá-lo após a estabilização da
  página. A ausência dessa transição bloqueia o resultado.
- `staleTransitionObserved` só é verdadeiro para `stale_session` quando a
  navegação chega a `/login` ou `/access-denied`, ou quando há sinal explícito
  de sessão expirada/dados desatualizados. A ausência também bloqueia o
  resultado quando a storageState existe.
- Console e `pageerror` passam por `sanitizeDiagnostic`, com normalização,
  limite de tamanho e redação conservadora de bearer, JWT e nomes de chaves
  sensíveis. O JSON não publica as mensagens cruas.

Após a correção, `node --test
tests/scripts/analytics-dashboard-runtime-matrix.test.mjs` passou em 5/5 e
`npm run test:focused` passou em 355/355. A execução local do gate permaneceu
exit 1 esperado, `NO_GO` e `failClosed=true`, porque nenhuma das três
storageStates autenticadas foi fornecida. As cinco rotas sem sessão
continuaram em `/login`, sem erros de console/page, falhas de rede, respostas
4xx/5xx ou requests externos. Loading/stale autenticados, dados, RPCs,
filtros aplicados, RLS/cross-tenant e performance continuam `NÃO COMPROVADOS`.

## Reprodução

```powershell
node scripts/local-qa/analytics-dashboard-runtime-matrix.mjs
node --test tests/scripts/analytics-dashboard-runtime-matrix.test.mjs
```

O primeiro comando retorna código diferente de zero quando faltar cobertura
autenticada, houver erro de contrato, erro de console, falha de rede ou método
de escrita. Isso é intencional e preserva o `NO_GO`.

## Fora deste lote

Não houve migration, SQL manual, reset, seed, hydrate, escrita no banco,
alteração de RPC/RLS, integração externa, secrets, push, merge, deploy ou
correção de dados. A matriz não transforma `HTTP 200`, redirecionamento para
`/login` ou shell renderizado em prova de autenticação ou paridade numérica.
