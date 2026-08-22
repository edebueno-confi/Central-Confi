# IMPLEMENTATION

- Task: R1-PRODUCTION-PERFORMANCE-AND-ACCESS-UI-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Base SHA: 4c2e915e8eec02bb1699e54d6f9c0114507f475b
- Implementation SHA: UNCOMMITTED_WORKTREE

## Diagnóstico inicial

- Produção autenticada confirmou que o shell e a autorização carregam.
- Visão Geral falhou nas RPCs executivas por `57014`/statement timeout.
- Customer Success falhou por RPC ausente no schema cache remoto.
- Central de Clientes falhou por view ausente no schema cache remoto.
- Comercial, Suporte e Financeiro responderam com HTTP 200.
- O modal de perfil foi reproduzido em viewport de 1920 px; a composição atual
  não possui estrutura explícita de header/body/footer e precisa de correção
  responsiva antes de ser considerada concluída.

As validações e alterações serão registradas abaixo conforme forem executadas.

## Alterações realizadas

- `AnalyticsCeoPage.tsx`: removeu histórico executivo do caminho crítico inicial
  e enfileira KPIs executivos, recorte de operação e histórico depois do
  snapshot principal, evitando disparos concorrentes por abertura ou mudança
  de filtro.
- `analytics-api.ts`: as leituras de período e posição de
  `rpc_analytics_ceo_snapshot` e `rpc_analytics_executive_kpis_v2` passaram a
  ser sequenciais. Cada erro continua sendo propagado; a mudança reduz a
  concorrência sobre os mesmos read models durante a abertura do painel.
- `InternalControlPlanePage.tsx` e `settings-ui.css`: modal de edição com
  header/body rolável/footer de ações sticky, foco inicial, retorno de foco,
  Escape e contenção de Tab.
- `20260822120000_analytics_executive_query_indexes_v1.sql`: índices compostos
  para os predicados de pipeline/período e snapshot financeiro corrente.
- `124_analytics_executive_query_indexes.sql`: regressões pgTAP dos quatro
  índices.
- `20260822123000_analytics_ceo_snapshot_current_finance_perf_v1.sql`: o
  snapshot executivo agora lê somente títulos OMIE com `is_current`, alinhando
  o predicado ao contrato financeiro e permitindo o uso dos índices parciais.
- `125_analytics_ceo_snapshot_current_finance.sql`: regressão pgTAP do contrato
  corrente do snapshot.
- `20260822124000_reconcile_production_release_contracts_v1.sql` e
  `126_production_release_contracts.sql`: reconciliação idempotente da view e
  da RPC observadas como 404, grants explícitos e reload do schema PostgREST.
- `.github/workflows/supabase-release.yml`, `package.json` e
  `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`: gate manual que valida localmente,
  aplica migrations no projeto remoto vinculado e executa smoke autenticado dos
  contratos críticos antes da promoção do frontend.
- `scripts/local-qa/browser-smoke.mjs`: o servidor Vite do smoke local agora
  recebe somente `VITE_APP_ENV`, `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` do Supabase local. As senhas das personas de QA não
  são repassadas ao processo do frontend. O harness também aborta quando o
  processo filho encerra e inclui cenário visual do modal de perfil em desktop
  e mobile.
- `docs/DEPLOYMENT_STRATEGY.md`: removeu a premissa de publicação web automática
  antes da reconciliação do banco.

## Gates executados

- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS, 945 módulos.
- `npm run lint`: PASS, 0 erros e 160 warnings legados.
- `npm run test:focused`: PASS, 287/287.
- `npm run docs:validate`: PASS, 0 bloqueios e 9 alertas históricos.
- `git diff --check`: PASS.

## Validação adicional do banco local

- `npx supabase db push --local`: PASS; aplicou as migrations novas
  `20260822120000_analytics_executive_query_indexes_v1.sql` e
  `20260822123000_analytics_ceo_snapshot_current_finance_perf_v1.sql`.
- `npm run supabase:test:db`: PASS, 129 arquivos e 1.969 testes, incluindo
  `124_analytics_executive_query_indexes.sql` 4/4 e
  `125_analytics_ceo_snapshot_current_finance.sql` 2/2 e
  `126_production_release_contracts.sql` 6/6.
- `npx supabase db query --local` com `EXPLAIN ANALYZE` mediu, no dataset local,
  aproximadamente 541 ms para `rpc_analytics_ceo_snapshot`, 246 ms para
  `rpc_analytics_ceo_history`, 921 ms para `rpc_analytics_executive_kpis_v2`
  e 587 ms para `rpc_analytics_support_kpis_v2`. O executor mostrou uso de
  temporários no suporte e no resumo executivo, portanto o ambiente remoto
  ainda precisa do smoke autenticado e de medição com volume real.
- `npm run supabase:lint:db`: executou, mas reportou erros históricos do schema
  `extensions` e avisos de estabilidade em RPCs existentes; não foram
  introduzidos pela migration de índices. O gate existente não classificou
  esses achados como regressão nova.
- `EXPLAIN (ANALYZE, BUFFERS)` após o predicado `is_current`: aproximadamente
  529 ms e 14.780 buffers no dataset local. A redução local não é conclusiva
  porque há apenas seis linhas financeiras; o custo predominante restante vem
  do legado executivo e das leituras HubSpot, que precisam de medição no volume
  remoto antes de outra alteração estrutural.
- `npm run web:build`: PASS, 945 módulos, após a serialização das leituras.
- `npm run test:focused`: PASS, 287/287, incluindo as regressões do modal e

## Resposta aos findings do Sentinel

- F-PERF-002: permanece explicitamente **NÃO COMPROVADO**. Nenhuma execução
  remota, credencial, smoke autenticado de produção ou medição com volume real
  foi autorizada nesta etapa. Portanto, os `57014` observados em produção não
  podem ser declarados resolvidos por `EXPLAIN` local, build ou typecheck.
- Gate obrigatório antes de qualquer promoção do frontend: executar o workflow
  manual protegido com `apply=true`, aplicar/reconciliar migrations no projeto
  autorizado, executar `release:remote:contracts` e registrar duração/resultado
  das RPCs `rpc_analytics_ceo_snapshot`, `rpc_analytics_ceo_history` e
  `rpc_analytics_executive_kpis_v2` em volume real. Falha, timeout, contrato
  ausente ou schema cache inconsistente mantém o NO-GO.

- F-PERF-001: os contratos 404 já tinham definições em migrations históricas,
  mas isso não era suficiente para um remoto cujo histórico estivesse marcado
  como aplicado com objetos ausentes. Foi adicionada a migration corretiva
  idempotente `20260822124000_reconcile_production_release_contracts_v1.sql`.
  Antes da criação, executa preflight com `to_regclass` para as sete relações
  usadas e `to_regprocedure` para as cinco funções usadas pela view/RPC.
  Dependências ausentes fazem a migration falhar explicitamente; não há
  fallback para zero ou indisponível. Depois, recria somente a view ausente
  quando necessário, reaplica grants e comentário, e recria a RPC de Customer
  Success com o contrato e grants existentes.
- F-PERF-001: `supabase/tests/126_production_release_contracts.sql` comprova
  localmente presença, assinatura, grants e as 12 dependências do preflight,
  totalizando 18/18 asserções. O workflow
  remoto já aplica migrations novas e executa `release:remote:contracts`; a
  presença remota e o schema cache continuam condicionados à execução
  autorizada desse workflow, que não foi executado nesta correção.
- F-PERF-002: não foi feita alegação de resolução dos timeouts `57014`. As
  medições `EXPLAIN ANALYZE` permanecem somente locais. O gate remoto continua
  sendo pré-condição para medir as RPCs com volume real e confirmar o incidente.

## Validações da correção

- `npx supabase db push --local --dry-run`: PASS, somente a migration corretiva.
- `npx supabase db push --local`: a migration foi aplicada localmente no ciclo
  anterior; nesta repetição o comando foi bloqueado antes da aplicação por
  drift preexistente de histórico (`20260822130000` registrado no banco local
  mas ausente no diretório de migrations). Isso não foi corrigido nem ocultado.
- `npx supabase test db --local supabase/tests/126_production_release_contracts.sql`: PASS, 18/18.
- `npm run docs:validate`: PASS, 0 bloqueios.
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 baseline resolvidos.
- `git diff --check`: PASS.
- Limitação preservada: nenhuma migration remota, smoke autenticado remoto ou
  medição de produção foi executada.
  do carregamento executivo.
- `npm run review:gates`: PASS, 0 regressões bloqueantes.
- `npm run quality:changed`: aprovado, 0 blockers e 0 findings.
- `node --test tests/scripts/analytics-dashboard-domains-integrations.test.mjs`:
  PASS, 7/7, incluindo a regressão que impede concorrência entre as duas
  leituras executivas.
- `npm run local:qa:smoke`: PASS. Dez combinações de persona/viewport sem erros
  de console, erros de página, falhas de request ou respostas inesperadas; as
  rotas administrativas, incluindo `/admin/access`, `/admin/settings` e
  `/admin/tenants`, foram alcançadas pelo `platform_admin`. Cenários profundos
  de Knowledge e Configurações também passaram, incluindo persistência local,
  temas e filtros.
- Repetição após serializar as RPCs executivas: PASS com as mesmas dez
  combinações, sem erros de console, erros de página, falhas de request ou
  respostas inesperadas.
- Cenário visual `access-profile-modal`: PASS em `1440x900` e `390x844`.
  Evidência direta: foco inicial em `profile-editor-name`, contenção de Tab,
  fechamento por Escape, restauração de foco, corpo com rolagem, ações sticky e
  ausência de overflow horizontal. Screenshots locais:
  `output/local-qa/browser-platform_admin-access-modal-desktop.png` e
  `output/local-qa/browser-platform_admin-access-modal-mobile.png`.

## Reconciliação final deste ciclo

- A evidência autorizada mais recente permanece: `npm run test:focused` PASS,
  287/287; `npm run supabase:test:db` PASS, 129 arquivos e 1.969 testes;
  `npm run docs:validate` PASS; `npm run review:gates` PASS; e
  `git diff --check` PASS.
- A migration `20260822124000_reconcile_production_release_contracts_v1.sql`
  é a correção idempotente para os contratos 404 observados. Ela faz preflight
  das dependências, cria ou substitui a view conforme a presença local,
  reaplica grants e solicita reload do schema PostgREST. O teste
  `126_production_release_contracts.sql` cobre 18/18 asserções.
- O histórico local contém uma referência órfã `20260822130000` sem arquivo
  correspondente. Esse drift não foi reparado por reset ou descarte de dados;
  portanto não é tratado como prova de que a sequência remota esteja correta.
- F-PERF-002 continua aberto: os timeouts remotos e a duração das RPCs em
  volume real somente serão considerados resolvidos após execução autorizada
  do gate remoto autenticado. Não houve migration remota, deploy, push, merge,
  leitura de secrets ou chamada externa neste ciclo.

Não foi executado `supabase db push`, migration remota, deploy, push, merge,
leitura de secrets ou chamada externa. O workflow novo foi validado por
inspeção local, mas sua execução depende de Environment/secrets configurados
no GitHub e de desativar a promoção automática do Vercel.
