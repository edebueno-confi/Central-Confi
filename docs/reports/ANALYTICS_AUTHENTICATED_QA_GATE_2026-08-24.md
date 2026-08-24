# Analytics Authenticated QA Gate

## Resultado executivo

QA local read-only executado em `127.0.0.1:4173` em 2026-08-24. Não havia
sessão autenticada reutilizável disponível. O arquivo `.env.local.qa` foi apenas
detectado por nome; seus valores não foram lidos e nenhum login por credencial
foi tentado.

O smoke cobriu as cinco superfícies Analytics solicitadas em desktop
`1920x1080` e mobile `390x844`, totalizando 10 navegações. Em todas:

- resposta inicial do shell: HTTP 200;
- destino final: `/login` com `redirectTo` presente;
- erros de console: 0;
- `pageerror`: 0;
- falhas de request: 0;
- respostas HTTP 4xx/5xx observadas: 0;
- overflow horizontal: não observado.

Esse resultado comprova somente o alcance local do shell e a barreira para
usuário não autenticado. Não comprova o fluxo autenticado, dados, RPCs,
filtros, estados internos, Posição/Evolução, RLS, isolamento ou performance.

## Método e evidência reproduzível

Timestamp da execução: `2026-08-24T04:24:26.2134240-03:00` para abertura do
HOLD e `2026-08-24T04:28:47.9923621-03:00` até
`2026-08-24T04:29:04.6643267-03:00` para o smoke compacto reproduzido.

Servidor confirmado localmente em `127.0.0.1:4173`; nenhuma produção ou serviço
externo foi acessado. O roteiro Playwright foi executado inline, sem criar
arquivo de sessão, sem ler cookies/tokens e sem gravar dados. Cada navegação
usou `waitUntil=domcontentloaded`, espera de `networkidle` limitada a 10s e
viewport isolado.

Rotas exercitadas:

| Superfície | Rota | Desktop | Mobile |
| --- | --- | --- | --- |
| Visão Geral | `/admin/analytics?tab=ceo` | 200 → `/login` | 200 → `/login` |
| Comercial | `/admin/analytics?tab=commercial` | 200 → `/login` | 200 → `/login` |
| Customer Success | `/admin/analytics?tab=customer-success` | 200 → `/login` | 200 → `/login` |
| Suporte | `/admin/analytics?tab=support` | 200 → `/login` | 200 → `/login` |
| Financeiro | `/admin/analytics?tab=finance` | 200 → `/login` | 200 → `/login` |

O caminho final manteve `redirectTo` para a rota solicitada. O corpo observado
foi a tela pública de login do ConfiOne, sem conteúdo de indicadores.

## Matriz de cobertura

| Cenário | Resultado | Evidência | Classificação |
| --- | --- | --- | --- |
| Shell local e guard não autenticado | PASS restrito | 10/10 navegações 200 → `/login` | Fato reproduzido |
| Console e erros de página na barreira | PASS restrito | 0 console errors, 0 page errors | Fato reproduzido |
| Rede na barreira | PASS restrito | 0 request failures e 0 respostas 4xx/5xx | Fato reproduzido |
| Responsividade do shell de login | PASS restrito | 1920x1080 e 390x844, sem overflow | Fato reproduzido |
| Sessão autenticada | NÃO COMPROVADO | sessão reutilizável não disponível; login por senha proibido neste lote | Limitação ambiental |
| Visão Geral autenticada | NÃO COMPROVADO | guard impediu a montagem | Limitação ambiental |
| Comercial autenticado | NÃO COMPROVADO | guard impediu a montagem | Limitação ambiental |
| Customer Success autenticado | NÃO COMPROVADO | guard impediu a montagem | Limitação ambiental |
| Suporte autenticado | NÃO COMPROVADO | guard impediu a montagem | Limitação ambiental |
| Financeiro autenticado | NÃO COMPROVADO | guard impediu a montagem | Limitação ambiental |
| Recorte `Todas` | NÃO COMPROVADO | nenhum seletor autenticado foi montado | Limitação ambiental |
| Recorte por operação | NÃO COMPROVADO | nenhuma operação real foi selecionada ou inventada | Limitação ambiental |
| RPCs e respostas de dados | NÃO COMPROVADO | nenhuma RPC foi chamada após o redirect | Limitação ambiental |
| Estados loading/error/empty/unavailable | NÃO COMPROVADO | estados internos não foram montados | Limitação ambiental |
| Posição/Evolução e séries | NÃO COMPROVADO | sub-abas não foram alcançadas | Limitação ambiental |
| RLS/cross-tenant e permissões autenticadas | NÃO COMPROVADO | exige sessão e contexto autorizados | Limitação ambiental |
| Performance com dados reais | NÃO COMPROVADO | não houve consulta autenticada nem carga | Limitação ambiental |

## Segurança e limites

Nenhum secret, credential, token ou cookie foi lido, exibido, persistido ou
incluído no relatório. Não foram executados scripts existentes que fazem login
com `LOCAL_QA_*`, porque a task autoriza somente sessão já disponível. Não houve
SQL, migration, banco remoto, HubSpot, OMIE, sync externo ou escrita
operacional.

O resultado não deve ser interpretado como aprovação de produção ou como
evidência de integração. O próximo gate recomendado é repetir o mesmo roteiro
em ambiente local com uma sessão autenticada previamente autorizada e não
expor seus artefatos, cobrindo as rotas e operações reais sem alterar dados.

## Validações do lote

Resultados finais registrados no handoff:

- `npm run test:focused`: PASS, 306/306;
- `npm run web:typecheck`: PASS;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline
  resolvidos;
- `git diff --check`: PASS.

O smoke acima é a evidência funcional read-only deste relatório; ele não
substitui testes de contrato nem gates do repositório.
