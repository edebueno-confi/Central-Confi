# Estado corrente — Interface High-Density V1 — 2026-08-03

## SUPABASE-MIGRATION-SAFETY-PROCESS-V1 — 2026-08-24

- **Tipo:** governança documental e procedimento fail-closed; sem alteração de
  runtime, banco, migration aplicada, secret ou serviço externo.
- **Escopo:** transformar a ocorrência da task 60 em guardrails permanentes para
  identidade do alvo, backup/PITR, proveniência, preflight semântico, shadow,
  ACL, RLS, cross-tenant, performance, locks e pós-validação.
- **Documento:** `docs/engineering/SUPABASE_MIGRATION_SAFETY_PROCESS_V1.md`.
- **Estado real registrado:** `historical_no_go` permanece preservado; o
  candidato local/shadow foi validado; o remoto continua desconhecido e sem
  alteração.
- **Validação:** `npm run docs:validate` e `git diff --check`.
- **Riscos restantes:** diagnóstico remoto ainda não realizado; qualquer janela
  remota exige autorização e evidência próprias.

## Governança executável de pipeline, área e operação — 2026-08-22

- **Tipo:** implementação backend/frontend e documentação de governança do Analytics; sem chamadas externas ou escrita em integrações.
- **Task:** `DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21`, base `051ce0b`.
- **Artefato:** `ANALYTICS_PIPELINE_OPERATION_GOVERNANCE_V1.md`.
- **Runtime:** novo inventário server-side com estados de mapeamento e reconciliação; novo wrapper de Customer Success por operação usando ticket confirmado e associação ticket-empresa; seletor de operação compartilhado na tela de Customer Success; Produto/Desenvolvimento continua indisponível e Financeiro fora da dimensão.
- **Views/RPCs:** `rpc_analytics_pipeline_inventory`, `rpc_analytics_customer_success_kpis_by_operation`, `vw_admin_analytics_pipeline_catalog_v2` como fonte de catálogo.
- **Testes:** `supabase/tests/121_analytics_pipeline_operation_governance.sql` e `tests/scripts/analytics-dashboard-domains-integrations.test.mjs`, gates registrados no handoff corrente.
- **Riscos restantes:** paridade do catálogo com o portal HubSpot requer próxima sincronização read-only autorizada; empresas sem associação CS confirmada não são atribuídas por nome.
- **Limites:** sem Financeiro na dimensão, sem GitHub/Product data, sem secrets, sem produção, sem migration remota e sem escrita externa.

# Continuidade autônoma da fila e monitoramento — 2026-08-22

- **Tipo:** decisão operacional do proprietário e governança do Control Plane;
  sem mudança de runtime, produção ou integração externa.
- **Fonte canônica:** `docs/engineering/OWNER_DECISIONS.md`, `OD-008`, e
  `handoffs/README.md`.
- **Decisão:** o heartbeat local acompanha Forge/Sentinel e promove somente a
  próxima task elegível, em sequência, preservando gates e revisão independente.
- **Estado inicial:** `AUTH-MODEL-INVENTORY-2026-08-21` está
  `READY_FOR_IMPLEMENTATION/APPROVED`; tasks futuras não foram aprovadas em
  massa.
- **Limites:** sem push, merge, deploy, produção, secrets, migrations remotas,
  escritas externas ou ações destrutivas.

# Coordenação explícita de pausa entre agentes — 2026-08-22

- **Tipo:** ajuste de governança do handoff; sem mudança de runtime, banco,
  produção ou integração externa.
- **Decisão:** quando Forge precisar de exclusividade temporária, deve gravar
  `Agent coordination: HOLD`, motivo, escopo, início e condição de retomada em
  `handoffs/current/STATUS.md`. Agentes e heartbeats devem aguardar dentro do
  escopo pausado.
- **Exceção corrente:** a task `AUTH-MODEL-INVENTORY-2026-08-21` permanece em
  `Agent coordination: REVIEW_ACTIVE`, pois Sentinel tem revisão independente
  obrigatória. Não há HOLD aplicado agora.
- **Documentos alterados:** `handoffs/README.md`,
  `handoffs/current/STATUS.md`, `docs/PROJECT_STATE.md` e este ledger.
- **Riscos e limites:** HOLD não autoriza ação externa, não substitui Owner,
  State, Approval ou allowlist e não pode bloquear revisão independente
  obrigatória.

# Notificação por evento e heartbeat de recuperação — 2026-08-22

- **Tipo:** ajuste de governança da colaboração entre agentes; sem mudança de
  runtime, banco, produção ou integração externa.
- **Decisão:** Forge e Sentinel devem atualizar os quatro artefatos canônicos,
  avisar diretamente o próximo papel e notificar o Codex ao concluir, bloquear,
  corrigir ou revisar uma task.
- **Fallback:** os heartbeats de Forge, Sentinel e Codex Orquestrador permanecem
  ativos em intervalo de 30 minutos e só atuam quando o estado atual exigir
  recuperação; não aprovam em massa nem duplicam execução ou revisão.
- **Documentos alterados:** `handoffs/README.md`,
  `handoffs/current/STATUS.md`, `docs/PROJECT_STATE.md` e este ledger.
- **Limites:** as notificações não substituem os handoffs, a revisão
  independente, a allowlist ou as proibições de ações externas.

# Briefing do modelo de trabalho para apresentação executiva — 2026-08-22

- **Tipo:** síntese conceitual para apresentação; sem mudança de runtime,
  banco, fila, permissões ou integração externa.
- **Artefato:** `docs/reports/CONFIONE_AGENT_OPERATING_MODEL_PRESENTATION_BRIEF_2026-08-22.md`.
- **Conteúdo:** papéis de produto, Codex Orquestrador, Forge, Sentinel,
  Cloud/Claude, repositório, handoffs, comunicação por evento, heartbeats,
  controles e roteiro visual sugerido.
- **Limite:** não detalha lotes nem substitui roadmap, task ou handoff técnico.
- **Validação:** coerência com `AGENTS.md`, `handoffs/README.md`, estado do
  projeto e avaliação existente do Development Control Plane.

# Inventário factual do modelo de autorização — 2026-08-22

- **Tipo:** inventário técnico documental da task `AUTH-MODEL-INVENTORY-2026-08-21`.
- **Fonte corrente:** código frontend, contratos TypeScript, migrations,
  views/RPCs e testes locais; documentação histórica não prevaleceu sobre
  contratos executáveis.
- **Artefato:** `docs/specs/AUTHORIZATION_MODEL_INVENTORY_V1.md`.
- **Conteúdo:** fluxo de identidade até autorização, fontes de permissão,
  menu, router, release gate, backend, RLS/grants, estados de ausência,
  revogação, usuário inativo, sessão stale e classificação de riscos.
- **Estado:** `READY_FOR_REVIEW`, Owner Sentinel; nenhum runtime, banco,
  migration, policy, grant, secret ou serviço externo foi alterado.
- **Próximo gate:** revisão independente do Sentinel; a task de auditoria do
  modelo continua proposta e não foi aprovada em massa.

# Reorientação do roadmap e blueprints da Central de Clientes — 2026-08-21

- **Tipo:** decisão de produto e contrato visual; sem mudança de runtime,
  banco, contrato executável, permissão ou release surface.
- **Fonte canônica:** `docs/ROADMAP_BUILDOUT_V3.md` na seção `CURRENT PRODUCT
  EXECUTION ORDER` e `docs/engineering/OWNER_DECISIONS.md` em `OD-006`.
- **Decisão:** Release 1 é o Core Interno em Produção. Release 2 é a Central
  de Clientes. O histórico permanece preservado e classificado como CURRENT,
  NEXT, DEFERRED, COMPLETED ou SUPERSEDED.
- **Blueprints:**
  `docs/design/blueprints/central-clientes/CENTRAL_CLIENTES_HOME_V1.png` e
  `docs/design/blueprints/central-clientes/CLIENTE_RESUMO_V1.png` são as
  referências visuais aprovadas para a futura implementação da Central.
- **Docs alterados:** `ROADMAP_BUILDOUT_V3.md`, `PROJECT_STATE.md`,
  `docs/README.md`, `docs/design/screens/ADMIN_TENANTS.md`,
  `CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md`,
  `reports/CUSTOMER_RELATIONSHIP_GROUPS_V1_2026-08-16.md`, este ledger e
  `OWNER_DECISIONS.md`.
- **Fila:** gates R1 e R2 foram materializados em `handoffs/README.md`, com
  reuso das tasks AUTH e Analytics existentes; não foi criada task de
  implementação dos blueprints neste lote.
- **Validação:** referências, hashes dos assets, `git diff --check` e
  `npm run docs:validate`; sem commit, push, deploy, migration remota ou
  escrita externa.

# Avaliação do Development Control Plane Visual — 2026-08-21

- **Tipo:** descoberta técnica e estimativa; sem mudança de runtime ou
  publicação online.
- **Fonte:** `tools/dev-control/*`, `tests/scripts/dev-control-mvp.test.mjs`,
  `handoffs/README.md`, handoffs correntes, Git local e documentação de
  governança.
- **Resultado:** `C. PARCIALMENTE IMPLEMENTADO`. Existe MVP local read-only,
  mas faltam contrato completo do snapshot, detalhe de task, decisões,
  heartbeat, estados canônicos e publicação online protegida.
- **Recomendação:** `SIM, COM PRÉ-REQUISITOS` para V1 online read-only,
  separada da Release 1 e sem writes na primeira versão.
- **Validação:** `node --test tests/scripts/dev-control-mvp.test.mjs` teve 7
  aprovações e 1 falha por allowlist histórica de owner que não inclui
  `Sentinel`; o relatório registra a limitação e não corrige o produto nesta
  descoberta.

# Plano de autorização administrativa e acesso de usuários — 2026-08-21

- **Tipo:** decisão de produto, planejamento e decomposição no Development Control Plane; sem mudança de runtime.
- **Fonte canônica:** `docs/specs/AUTHORIZATION_ADMIN_ACCESS_SIMPLIFICATION_PLAN_V1.md`.
- **Decisão:** priorizar a reprodução e correção do acesso negado indevido de administrador válido; depois simplificar progressivamente para nível, área, tela e `READ/WRITE`, preservando backend, isolamento e auditoria.
- **Regra adicional do Owner:** negação de rota não inativa o usuário nem encerra a sessão; quando autorizado, o fallback é `/inicio`, a recepção exibida como `Meu espaço`. Falta de workspace deve ser informada explicitamente e não presumida como autorização.
- **Fila:** `AUTH-ADMIN-DENIAL-ROOT-CAUSE-2026-08-21` ficou `READY/APPROVED`; tasks estruturais 30 a 37 ficaram `BACKLOG/PROPOSED` e dependentes.
- **Estado atual:** `CS-DOMAIN-AUDIT-2026-08-21` foi finalizado localmente e arquivado; `handoffs/current/` está ocupado por `SUPPORT-DOMAIN-AUDIT-2026-08-21`, em `READY_FOR_REVIEW`, sob responsabilidade do Sentinel.
- **Docs alterados:** `docs/specs/AUTHORIZATION_ADMIN_ACCESS_SIMPLIFICATION_PLAN_V1.md`, `docs/PROJECT_STATE.md`, `docs/ROADMAP_BUILDOUT_V3.md`, `docs/README.md`, `docs/engineering/OWNER_DECISIONS.md`, `handoffs/README.md` e este ledger.
- **Telas afetadas:** nenhuma neste lote.
- **Views/RPCs/migrations afetadas:** nenhuma; somente referenciadas como evidência para discovery.
- **Validação:** inspeção do Control Plane, handoffs R01/R01-B, contratos de auth, estado Git e `git diff --check` após a edição.
- **Riscos restantes:** a causa raiz do bug ainda não foi reproduzida neste lote; o modelo atual é complexo e não deve ser removido por analogia; a abertura de `handoffs/current/` depende do retorno do ciclo atual a `IDLE`.
- **Impacto futuro na FAQ:** documentar claramente a diferença entre autenticação, autorização, nível, área, tela e `READ/WRITE`, somente após o contrato ser aprovado.

## Fundação de metas financeiras e MRR — 2026-08-21

- **Tipo:** fundação documental de contrato futuro; sem mudança de runtime,
  banco, contrato executável, permissão ou release surface.
- **Fonte canônica:** `rpc_analytics_customer_success_kpis_v2()`,
  `vw_analytics_customer_base`, `analytics_kpi_settings`,
  `rpc_analytics_kpi_settings()` e `docs/ANALYTICS_KPI_REGISTRY_V1.md`.
- **Registro:** MRR atual é posição observada, enquanto meta, quota, forecast,
  atingimento, gap e distribuição continuam não publicados. O documento novo
  separa período da meta, janela histórica, data de corte e estados de cobertura.
- **Docs alterados:** `docs/ANALYTICS_MRR_GOALS_FOUNDATION_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas afetadas:** nenhuma.
- **Views/RPCs afetadas:** nenhuma; somente leitura e reconciliação documental.
- **Validação:** busca de contratos/migrations/read models, validação
  documental e `git diff --check` no fechamento do lote.
- **Riscos restantes:** não existe fonte autorizada para valor de meta ou série
  temporal de MRR; um próximo lote precisará de decisão e contrato server-side.
- **Impacto futuro na FAQ:** documentar a origem e a data considerada de cada
  realizado quando a interface de metodologia for criada.

## Metodologia e proveniência dos KPIs — 2026-08-22

- **Tipo:** auditoria documental do registro canônico; sem mudança de runtime,
  banco, contrato executável, integração ou release surface.
- **Fonte canônica:** `docs/ANALYTICS_KPI_REGISTRY_V1.md`, reconciliado com
  `analytics-api.ts`, `analytics-model.ts`, `analytics-kpi-contract.mjs`,
  migrations dos read models e testes locais.
- **Registro:** o documento passou a explicitar campo/data, coorte ou posição,
  timezone, fórmula, unidade, nulo, cobertura, frescor, filtros, estado e
  limitações por domínio. Produto/Desenvolvimento permanece indisponível por
  falta de fonte/read model executável, sem KPI inventado.
- **Docs alterados:** `docs/ANALYTICS_KPI_REGISTRY_V1.md`,
  `docs/PROJECT_STATE.md`, este ledger e `handoffs/current/`.
- **Telas, views/RPCs/migrations:** nenhuma alteração; foram somente lidas como
  evidência local.
- **Validação:** `docs:validate`, auditoria de governança, `review:gates` e
  `git diff --check` serão registrados no handoff após a execução final.
- **Limitações:** não houve chamadas externas, leitura de secrets ou validação
  de cobertura/frescor em ambiente remoto; estados sem contrato executável
  permanecem indisponíveis ou como lacuna explícita.

## Auditoria do domínio Financeiro — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  contrato executável, permissão ou release surface.
- **Fontes canônicas:** `analytics_finance_receivables`,
  `analytics_finance_sync_runs`, `rpc_analytics_finance_snapshot`,
  `rpc_analytics_finance_source_status`, normalizador/cliente OMIE e o contrato
  `docs/specs/analytics-finance-omie-v1.md`.
- **Registro:** OMIE API é a única fonte publicada do Dashboard; planilhas
  permanecem históricas. Recebido, a receber, vencido e aging foram separados,
  com datas, estados, frescor, proveniência e ausência explícitos.
- **Reconciliação adicional:** a documentação oficial do OMIE apresenta
  `ListarMovimentos` em `financas/mf`, com `dDtPagamento`, `nValPago`,
  `nValAberto` e `nValLiquido`; o ConfiOne ainda não possui read model dessa
  fonte. A capacidade é `REQUIRES_NEW_INGESTION`, não `API_LIMITATION`.
- **Risco restante:** o período selecionado filtra vencimento/emissão e não
  `last_received_date`; tenant-aware e histórico `as_of` não estão publicados.
  A especificação que afirma tenant/RLS não foi confirmada pelo contrato
  executável e permanece como intenção documental não reconciliada.
- **Docs alterados:** `docs/ANALYTICS_FINANCE_DOMAIN_AUDIT_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas afetadas:** nenhuma; a UI foi auditada como evidência, sem alteração.
- **Views/RPCs/migrations afetadas:** nenhuma; somente leitura e reconciliação.
- **Validação:** auditoria documental, `docs:validate`, governance, `review:gates`
  quando aplicável e `git diff --check` serão registrados no handoff.
- **Impacto futuro na FAQ:** explicar fonte, campo de data, período, timezone,
  fórmula, cobertura, ausência e limitação de cada indicador sem leitura do
  código.

## Qualidade de chamadas de integrações e atualização dos painéis — 2026-08-21

- **Tipo:** atualização de roadmap e decomposição de qualidade; sem execução de
  sync, alteração de credencial, escrita externa ou mudança de runtime.
- **Task:** `R1-INTEGRATION-CALL-QUALITY-2026-08-21`, P1,
  `BACKLOG/PROPOSED`.
- **Escopo:** verificar a cadeia OMIE Financeiro e integrações do Dashboard,
  separando credencial/configuração, transporte, contrato da chamada,
  paginação, timeout, retry, resposta, normalização, persistência, `sync_run`,
  read model, frescor e chamadas de refresh dos painéis.
- **Dependências:** `FINANCE-DOMAIN-AUDIT-2026-08-21` e
  `KPI-REGISTRY-2026-08-21`. O gate `R1-DASHBOARD-RELEASE-GATE-2026-08-21`
  passa a depender desta verificação.
- **Regra de segurança:** não rotacionar credenciais, não executar escrita
  externa e não usar planilha como fallback silencioso neste lote.

## Governança de pipelines HubSpot por área e operação — 2026-08-21

- **Tipo:** inclusão de item de roadmap e investigação de qualidade de dados;
  sem alteração de pipeline externo, runtime, contrato executável ou filtro em
  produção.
- **Task:** `DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21`, P1,
  `BACKLOG/PROPOSED`.
- **Problema registrado:** o Dashboard retorna valores quando o filtro é
  `Todas as operações`, mas não carrega corretamente ao filtrar `After Sales`.
  A hipótese é falha de vínculo/aplicação do escopo pipeline, área e operação,
  ainda não confirmada.
- **Escopo:** inventário por `pipeline_id` e objeto, mapa canônico para After
  Sales, Conf e Neo Trust, tratamento de sem vínculo/ambíguo, filtro server-side
  e reconciliação `Todas` versus cada operação.
- **Dependências:** `DATA-OPERATION-SCOPE-2026-08-21`,
  `DATA-PIPELINE-STAGE-SCOPE-2026-08-21` e `KPI-REGISTRY-2026-08-21`. O gate
  `R1-DASHBOARD-RELEASE-GATE-2026-08-21` passa a depender desta task.
- **Limite:** não inferir operação pelo nome do pipeline, não criar regra no
  frontend e não executar escrita externa neste lote.

## Continuidade autônoma da frente de autorização — 2026-08-22

- **Tipo:** decisão de governança e ativação de handoff; sem alteração de
  runtime, banco, permissões ou serviços externos.
- **Fonte:** `OD-007` em `docs/engineering/OWNER_DECISIONS.md`.
- **Decisão:** o próximo item elegível foi promovido, e somente ele, para
  `READY/APPROVED`: `AUTH-MODEL-INVENTORY-2026-08-21`.
- **Handoff:** Forge executor, Sentinel reviewer obrigatório, inventário
  factual de autorização como escopo.
- **Limites:** tasks 31 a 37 continuam `BACKLOG/PROPOSED`; não há autorização
  para simplificação estrutural, RLS/RPC/migration, escrita remota, secrets,
  deploy, push ou merge.

## Cobertura de filtro por operação e integridade UTF-8 — 2026-08-21

- **Tipo:** ajuste de escopo do roadmap e inclusão de correção P1; sem mudança
  de runtime ou execução externa.
- **Filtro:** a governança de pipelines deve cobrir Visão Geral, Comercial,
  Customer Success, Suporte e Produto e Desenvolvimento. Financeiro fica fora
  até existir dimensão confiável de área/operação.
- **Task de encoding:** `R1-UTF8-ENCODING-INTEGRITY-2026-08-21`,
  `BACKLOG/PROPOSED`, para localizar e corrigir corrupção de caracteres
  acentuados/especiais entre origem, transporte, banco, read model, JSON,
  headers e renderização.
- **Regra:** não remover acentos, transliterar ou trocar caracteres para ocultar
  o problema; criar regressões com dados em português.

## Auditoria do domínio de Customer Success — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  contrato executável, permissão ou release surface.
- **Fontes canônicas:** `vw_cs_customer_portfolio`,
  `cs_customer_portfolio_assignments`, `rpc_admin_upsert_cs_customer_portfolio`,
  `rpc_analytics_customer_success_kpis_v2()` e as fundações de KPI e renovação.
- **Regra:** carteira, risco operacional, churn, expansão e renovação são
  domínios separados. `health_summary_status` é `unavailable`; o
  `portfolio_health_status` manual não é score calculado. Health Score/Health
  Status nativo do HubSpot é premissa do fluxo-alvo, com configuração e cálculo
  upstream no HubSpot, leitura oficial e futura ingestão/read model no
  ConfiOne, sem recálculo local. Portal, propriedade, scopes, plano, seat,
  permissões e ingestão ainda não foram verificados: estado atual
  `REQUIRES_NEW_INGESTION`, possivelmente `REQUIRES_SCOPE`, nunca
  `API_LIMITATION`. Churn/expansão permanecem `awaiting_history` localmente
  quando falta série suficiente.
- **Descoberta externa:** APIs oficiais de propriedades, objetos, busca,
  atividades e associações foram registradas em
  `docs/ANALYTICS_CS_DOMAIN_AUDIT_V1.md`, sem chamada ao portal ou leitura de
  secrets. A matriz exige registrar endpoint, objeto, propriedade, scopes,
  paginação, rate limits, histórico e classificação de disponibilidade antes
  de qualquer ingestão.
- **Docs alterados:** `docs/ANALYTICS_CS_DOMAIN_AUDIT_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas e objetos executáveis:** nenhum objeto executável foi alterado. A
  documentação registra a UI existente apenas como consumidora da carteira e
  separa a indicação visual local de atenção de um KPI de saúde.
- **Riscos restantes:** faltam decisão de produto e contrato server-side para
  health, eventos/coortes de churn e expansão, janela/owner de renovação e
  vínculo MRR-assinatura.
- **Impacto futuro na FAQ:** explicar fonte, data observada, posição atual,
  estados de cobertura e limitações de cada indicador sem exigir leitura do
  código.

## Auditoria do domínio de Suporte — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  contrato executável, permissão ou release surface.
- **Fontes canônicas:** `public.tickets`, mensagens, eventos, views/RPCs do
  Support Workspace, `rpc_support_ticket_queue_page`, contratos de
  classificação/SLA, fundação de canais e
  `rpc_analytics_support_kpis_v2`.
- **Regra:** o ticket local, a timeline, o tipo de conversa e o canal são
  conceitos distintos. Chat/e-mail/API aparecem como origens classificáveis,
  mas não como integração de resposta direta. A especificação existente de
  Conversations API documenta inboxes, canais, threads, mensagens, atores,
  associação a tickets, `conversations.read` e paginação, sem existir read
  model local ou ingestão executável. O analytics de Suporte é um read model
  HubSpot separado da fila local.
- **Semântica temporal:** a fila local usa posição corrente e ordena por
  `updated_at`/`created_at`; `closed_at` é fechamento formal local. O contrato
  analítico usa bases específicas por KPI, como `hs_created_at`, `resolved_at`,
  `last_activity_at`, `synced_at` e snapshots históricos.
- **Disponibilidade:** tickets, fila, detalhe, timeline, classificação e
  contexto de SLA locais são `AVAILABLE_NOW`; Conversations API exige
  `REQUIRES_SCOPE` para confirmar `conversations.read` e permissões do portal,
  enquanto seu read model local exige `REQUIRES_NEW_INGESTION`. A verificação
  de horas úteis/feriados é `PENDING_LOCAL_CONTRACT_VALIDATION`, não uma
  pendência de scope. Não foi encontrada evidência de `API_LIMITATION`.
- **Docs alterados:** `docs/ANALYTICS_SUPPORT_DOMAIN_AUDIT_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md`, `docs/README.md` e
  os artefatos do handoff corrente.
- **Telas e objetos executáveis:** nenhum objeto executável foi alterado. A UI
  existente foi usada apenas para confirmar que lê contratos backend-first.
- **Riscos restantes:** confirmar a aplicação de horas úteis/feriados no SLA,
  definir eventual ingestão de threads externas e estabelecer retenção e
  cobertura de backlog histórico antes de publicar novos KPIs.
- **Impacto futuro na FAQ:** exibir fonte, campo de data, período, timezone,
  frescor, cobertura e estado de ausência sem exigir leitura do código.

## Fundação de predição comercial explicável — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  permissão ou release surface.
- **Fontes canônicas:** `rpc_analytics_commercial_kpis_by_operation`,
  `rpc_analytics_commercial_kpis_v2`, read models comerciais e
  `docs/ANALYTICS_KPI_REGISTRY_V1.md`.
- **Regra:** `weighted_pipeline_amount` é sinal ponderado da posição aberta;
  conversão, ticket e ciclo são observados na coorte fechada. Não há forecast
  dedicado, histórico suficiente de transições ou cálculo local permitido.
- **Docs alterados:** `docs/ANALYTICS_PREDICTION_FOUNDATION_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas e objetos executáveis:** nenhum.
- **Riscos restantes:** sem contrato server-side e método validado, data,
  probabilidade, receita futura e confiança permanecem indisponíveis.

## Auditoria do domínio Produto e Desenvolvimento — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  contrato executável, permissão ou release surface.
- **Fontes canônicas:** `AnalyticsUnavailablePages`, `rpc_analytics_ceo_snapshot`,
  Engineering Workspace (`engineering_work_items` e views/RPCs), Development
  Control Plane local, roadmap e handoffs.
- **Registro:** a área de Produto/Desenvolvimento permanece sem analytics
  publicado e sem chamada ao GitHub. A fila técnica de Engenharia é real,
  tenant-aware e originada de tickets, mas não é backlog de Produto. Commit,
  `DONE` e dirty count do Control Plane não provam release ou deploy.
- **Disponibilidade:** fila/status/update técnico são `AVAILABLE_NOW` em seu
  próprio workspace; GitHub, releases, pull requests, throughput, lead time,
  incidentes e ambientes exigem escopo e/ou nova ingestão. Não foi comprovada
  `API_LIMITATION`.
- **Docs alterados:** `docs/ANALYTICS_PRODUCT_DEV_DOMAIN_AUDIT_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas e objetos executáveis:** nenhum objeto executável foi alterado. A UI
  de espera foi auditada como proteção contra métricas simuladas.
- **Validação:** governance, auditoria documental, `docs:validate`,
  `review:gates` quando aplicável e `git diff --check` serão registrados no
  handoff.
- **Riscos restantes:** falta decidir a fonte oficial de Produto, confirmar
  scopes/organização/repositórios, separar demanda de Produto de work item de
  suporte e definir histórico de eventos antes de criar indicadores.
- **Impacto futuro na FAQ:** explicar fonte, campo de data, período, timezone,
  frescor, cobertura e estados de ausência para cada indicador antes de expor a
  metodologia na interface.

## Fundação de contratos próximos do vencimento — 2026-08-21

- **Tipo:** descoberta e fundação documental; sem mudança de runtime, banco,
  permissão ou release surface.
- **Fontes canônicas:** `customer_product_subscriptions`,
  `vw_admin_customer_product_subscriptions`, `vw_cs_customer_portfolio` e os
  read models financeiros de MRR.
- **Regra:** `renewal_at` é observado quando preenchido; não há janela de
  vencimento, owner de renovação nem vínculo publicado entre assinatura e MRR.
- **Docs alterados:** `docs/ANALYTICS_CONTRACT_EXPIRY_FOUNDATION_V1.md`,
  `docs/PROJECT_STATE.md`, `docs/DOCUMENTATION_LEDGER.md` e `docs/README.md`.
- **Telas e objetos executáveis:** nenhum.
- **Riscos restantes:** qualquer MRR em risco por renovação futura exigirá
  decisão de produto, chave de reconciliação, permissões e contrato server-side.

## Semântica de conversão comercial — 2026-08-21

- **Tipo:** correção de contrato de métrica, coortes e apresentação; sem release
  surface, integração externa ou migration remota.
- **Fonte canônica:** `rpc_analytics_commercial_kpis_v2`,
  `rpc_analytics_commercial_snapshot`, `vw_analytics_commercial_kpis` e
  `rpc_analytics_ceo_snapshot_legacy`, além de
  `docs/ANALYTICS_METRIC_CATALOG_V1.md`.
- **Regra:** ganhos divididos por negócios fechados na mesma coorte de
  `hs_closed_at`, em pontos percentuais de 0 a 100. Negócios criados, posição
  aberta, reabertos e fechados sem data não entram silenciosamente no
  denominador.
- **Arquivos técnicos:** migration
  `supabase/migrations/20260821150000_analytics_commercial_conversion_semantics_v1.sql`,
  teste `supabase/tests/123_analytics_conversion_semantics.sql`, mapeadores e
  exportação do Analytics.
- **Validação:** pgTAP focado 83/83 e suíte completa 1920/1920; typecheck web
  e contratos, build web e lint passaram; `review:gates` teve 0 regressões;
  `docs:validate` teve 0 bloqueios; `git diff --check` passou. A suíte Node
  ampla ficou em 576/577 por um teste de governança preexistente que ainda não
  aceita o nome operacional Forge.

## Handoff multiagente — reconciliação do protocolo — 2026-08-20

- **Tipo:** governança de engenharia e reconciliação documental; nenhuma mudança de produto, banco, contrato, permissão ou release surface.
- **Fonte canônica:** `handoffs/current/TASK.md`, `IMPLEMENTATION.md`, `REVIEW.md` e `STATUS.md`, com `docs/engineering/REVIEW_PROTOCOL.md` como norma e `.review/` como complemento técnico opcional.
- **Correções:** uma única ponte de colaboração em `AGENTS.md`; Owner definido como responsável pelo próximo passo; escala de findings e vocabulário de vereditos correntes unificados; `.review/state.json` restrito a metadados de automação.
- **Histórico preservado:** o baseline e os vereditos históricos em `.review/` não foram reescritos; a equivalência entre `BLOCKER/MAJOR/MINOR/NIT` e `CRITICAL/HIGH/MEDIUM/LOW` está documentada.
- **Decisões do proprietário:** D-01 classifica o worktree de produto preexistente como `BASELINE_LEGACY / PREEXISTING_WORK`, preservando o Review Cycle 0 e os findings R-01 a R-14 fora de TASK retroativa. D-02 estabelece `IMPLEMENTED != RELEASE_AUTHORIZED`; `/inicio`, `/admin/tenants`, landing pós-login e release surface exigem TASK e autorização próprias.
- **Riscos restantes:** nenhuma superfície preexistente foi publicada ou revertida; a autorização de integração deste lote não autoriza commit de código de produto nem release. Nenhum push, merge, deploy ou escrita remota foi executado.
- **Telas afetadas:** nenhuma.
- **Views/RPCs afetadas:** nenhuma.
- **Impacto futuro na FAQ:** nenhum.

## Handoff de migração Genius e After Sale V1 → V2 — 2026-08-20

- **Tipo:** documentação operacional e handoff de conhecimento; nenhuma mudança de produto, banco, contrato, permissão, integração externa ou release surface.
- **Fonte canônica:** `docs/AFTER_SALE_V1_V2_GENIUS_MIGRATION_HANDOFF.md`, complementada pelo pacote `handoffs/after-sale-migration-claude/` e pelo contrato `docs/CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md`.
- **Conteúdo:** separação entre After Sale V1 → V2 e Genius → V2; precedência de evidências; controle de cliente, loja e origem; de-para de motivos, status, e-mails, integrações e lojas; critérios de validação; mapa de fontes para leitura pelo Cloud.
- **Decisão registrada:** Genius é uma origem distinta. Não herdar automaticamente o mapa de Melissa, Melissa App ou outro cliente. A primeira frente Genius exige aula humana, descoberta somente leitura, Central de Ajuda Genius fornecida pelo responsável e de-para próprio por cliente.
- **Segurança:** não registrar secrets; não alterar origem, Boss ou código durante descoberta; não considerar defaults da V2 ou liberação do Boss como prova de uso; nenhuma escrita externa foi executada.
- **Docs alterados:** `docs/AFTER_SALE_V1_V2_GENIUS_MIGRATION_HANDOFF.md`, `docs/README.md`, `handoffs/after-sale-migration-claude/README.md`, este ledger.
- **Telas afetadas:** nenhuma.
- **Views/RPCs afetadas:** nenhuma.
- **Validação:** revisão de fontes locais, `git diff --check` e verificação de links relativos do novo documento; nenhuma validação de painel externo ou integração real.
- **Riscos restantes:** URL e acesso à Central Genius ainda ausentes; valores históricos exigem reextração ao vivo; o executor externo não está implementado no ConfiOne; o worktree contém alterações preexistentes não relacionadas.
- **Impacto futuro na FAQ:** o novo documento pode ser usado como ponto de entrada para treinamento e handoff, mas não como prova de configuração de cliente.

## Code Review Protocol V1 — infraestrutura de revisão por agente — 2026-08-19

- **Tipo:** processo de engenharia e ferramenta de auditoria; nenhuma mudança de produto, banco, contrato, permissão ou release surface.
- **Fonte canônica:** `docs/CODE_REVIEW_PROTOCOL_V1.md`, com área de trabalho em `.review/` e `.review/README.md`.
- **Implementação:** `scripts/review/quality-gates.mjs` e `scripts/review/collect-review-context.mjs`; scripts `review:gates`, `review:gates:json`, `review:gates:baseline` e `review:context` no `package.json`; `/.review/context/` ignorado no `.gitignore`.
- **Decisão de processo:** o gate compara o estado atual com um débito congelado em `.review/baseline.json` e falha somente em regressão. Um gate que reprova o repositório inteiro no primeiro dia é desligado no segundo; o débito é reduzido por lote autorizado, sem enfraquecer verificação.
- **Decisão de domínio:** objeto backend sem consumidor entra no gate `SURFACE_PENDING_UI` com severidade informativa. É funcionalidade pronta aguardando UI ou release, não código morto. Customer Operations V1 responde por sete das RPCs nessa condição, por decisão registrada em `docs/CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md`.
- **Política de sanitização registrada:** documento desatualizado é atualizado no lote; documento depreciado é arquivado com cabeçalho de status, nunca apagado; funcionalidade desenvolvida e não publicada é preservada e registrada no roadmap.
- **Telas afetadas:** nenhuma.
- **Views/RPCs afetadas:** nenhuma.
- **Docs alterados:** `docs/CODE_REVIEW_PROTOCOL_V1.md` (novo), `docs/README.md`, `docs/PROJECT_STATE.md`, `AGENTS.md`, `.review/README.md`, este ledger.
- **Validação:** `npm run review:gates` com baseline congelado e zero regressões; `npm run review:context` gerando pacote com 151 objetos de banco do worktree corrente, 23 sem cobertura pgTAP; `npm run docs:validate`, `npm run lint`, `npm run web:typecheck`, `npm run contracts:typecheck`, `npm run build` e `npm run test` executados na sequência do lote.
- **Risco restante:** os gates usam análise textual, não execução; menção de objeto em pgTAP não prova cobertura de comportamento, e chamada dinâmica de RPC aparece como sem consumidor. O protocolo declara essas limitações explicitamente.
- **Impacto futuro na FAQ:** nenhum.

## Navegação da Central de Clientes — 2026-08-16

- A Central de Clientes agora pertence visualmente a `Minha área`, fora de Configurações.
- O nome visível da rota `/inicio` é `Meu espaço`; a rota e o identificador `user-reception` foram preservados por compatibilidade.
- Nenhuma permissão, migration, integração externa ou contrato backend foi alterado neste ajuste.

## Importação local do diretório HubSpot — 2026-08-16

- **Tipo:** carga local idempotente de clientes After Sale e correção mínima de ACL de leitura.
- **Relatório:** `docs/reports/HUBSPOT_CUSTOMER_DIRECTORY_IMPORT_2026-08-16.md`.
- **Escopo:** 264 empresas HubSpot com `e_cliente_aftersale_ = Sim`, vinculadas a `tenants` e `customer_account_sources`; sem Omie, lojas, grupos econômicos, projetos ou carteiras CS.
- **Validação:** leitura autenticada de 264 fontes e 264 linhas importadas no diretório, sem duplicidade; migration local `20260816152000_customer_operations_read_acl_fix_v2.sql` aplicada para eliminar o 42501 causado pela revogação indevida de `EXECUTE`.
- **Sincronizador:** o 502 foi rastreado a um 403 na leitura de `hubspot_sync_runs` pelo `service_role`; a migration local `20260816153000_hubspot_orchestrator_service_acl_fix_v1.sql` corrigiu a ACL mínima e o teste `supabase/tests/118_hubspot_orchestrator_service_acl_fix_v1.sql` passou.
- **Resultado:** nova execução local concluiu com `success`, 48 itens `succeeded`, 61.843 registros recebidos e 62.066 promovidos. HubSpot e Omie permaneceram sem escrita externa.

## Customer Relationship Groups V1 — agrupamento interno de clientes

- **Tipo:** contrato de dados, RLS, read models e RPCs administrativas para a Central de Clientes.
- **Relatório:** `docs/reports/CUSTOMER_RELATIONSHIP_GROUPS_V1_2026-08-16.md`.
- **Implementação:** migrations `supabase/migrations/20260816110000_customer_relationship_groups_v1.sql`, `20260816112000_customer_central_release_activation_v1.sql`, `20260816113000_customer_central_screen_capability_v1.sql` e `20260816114000_customer_relationship_groups_scope_fix.sql`, com os testes pgTAP `supabase/tests/115_customer_relationship_groups_v1.sql` e `supabase/tests/116_customer_relationship_groups_scope_fix.sql`.
- **Decisão:** `tenants` continua sendo a conta operacional; grupos internos suportam grupo econômico e guarda-chuva de serviço, sem afirmar relação jurídica ou financeira. Carteira CS permanece no domínio de atribuições de Customer Success e não pode ser criada como grupo.
- **Contratos:** `vw_admin_customer_account_groups_list`, `vw_admin_customer_account_group_detail` e `vw_admin_tenant_group_context`.
- **Integrações:** HubSpot e OMIE/OME permanecem fontes externas; nenhum write ou sincronização foi executado.
- **Validação:** migrations aplicadas localmente sem reset; lint SQL sem erros; pgTAP focado com 24 testes aprovados; web typecheck e smoke Playwright autenticado aprovados.
- **UI:** `CustomerGroupsPanel` permite criar agrupamentos, adicionar contas ou marcas e arquivar membros; não cria dados externos nem presume vínculo jurídico.

## Customer Operations and Migration Domain V1 — backend-only

- **Fonte canônica:** `docs/CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md`.
- **Implementação:** migrations `20260816150000_customer_operations_migration_domain_v1.sql`, `20260816151000_customer_operations_acl_hardening.sql`, `20260816151100_customer_operations_read_acl_fix.sql`, `20260816151200_customer_operations_validation_idempotency.sql`, `20260816151300_customer_operations_scope_and_idempotency_v1.sql`, `20260816151400_customer_operations_lint_cleanup.sql` e `20260816151500_customer_operations_lint_cleanup_v2.sql`; teste `supabase/tests/117_customer_operations_migration_domain_v1.sql`.
- **Escopo:** origens After Sale V1/Genius, lojas, inventário versionado e idempotente, evidências, projetos, migração, elegibilidade, lotes, levas, aprovação, executor contratual, validação e histórico.
- **Superfície:** `apps/web/src/features/tenants/CustomerOperationsPanel.tsx`, acessível pela Central de Clientes como leitura operacional aditiva; não cria carteira CS nem altera agrupamentos.
- **Limites:** sem edição visual de projetos, scraping, credenciais, escrita em V1/Boss/Genius/V2 ou migration remota.
- **Validação:** pgTAP focado do domínio e da ACL com 3 arquivos e 52 testes aprovados. A suíte completa percorre 120 arquivos e 1.859 testes, com uma falha de fixture legada em `110_analytics_operation_scope.sql` causada pela presença do snapshot real local; nenhum teste foi enfraquecido.

## Support Workspace V1 — ativação controlada

- **Tipo:** backend authorization contract plus local QA kickoff.
- **Fonte canônica:** `docs/reports/OPERATIONAL_SUPPORT_FLOW_V1_KICKOFF_2026-08-16.md`.
- **Implementação:** `supabase/migrations/20260816100000_support_screen_capability_grants_v1.sql` e `supabase/tests/114_support_screen_capability_grants_v1.sql`.
- **Decisão:** corrigir a capacidade ausente sem publicar rotas no release surface padrão. O modo `VITE_RELEASE_SURFACE=full` foi usado apenas para validação local autenticada.
- **Evidência:** pgTAP 116 arquivos e 1.788 testes aprovados; matriz de 10 combinações de perfil/rota com autorização correta e read models de suporte em HTTP 200.
- **Smoke versionado:** `scripts/local-qa/support-release-smoke.mjs` e `tests/scripts/support-release-smoke-contract.test.mjs`; o catálogo local é habilitado temporariamente e restaurado no `finally`.
- **Escrita operacional:** `scripts/local-qa/support-operational-write-smoke.mjs` executou o harness Playwright existente em fixture local e confirmou atribuição, status, mensagens, anexo, reload e isolamento por tenant. O harness recebeu apenas espera assíncrona e idempotência de estado já aplicado.
- **Gates de fechamento:** segunda rodada com 262 testes focados, 549 amplos, contracts/web typecheck, build, pgTAP, auth smoke, Playwright geral, Support smoke, secret scan e quality gate aprovados. Lint sem erros com 159 avisos legados; lint SQL sem falha com 19 avisos não bloqueantes.
- **Próxima etapa:** `Support Release Surface Activation V1`, com validação de ações e publicação somente após aceite operacional.

# Registro anterior — Interface High-Density V1 — 2026-08-03

## ACCESS CONTROL V2 — ciclo de vida e evidência de permissões — 2026-08-11

- **Escopo:** `/admin/access`, control plane interno; sem Dashboard, governança de dados, integrações, push, deploy ou migration remota.
- **Entrega:** dependências e `can_delete` no read model de áreas; desativação preserva histórico; exclusão permanente condicionada por RPC e confirmação; permissões efetivas com origem/escopo/conflito; histórico de convites sanitizado; confirmações e rolagem acessível na UI.
- **Arquivos/documentos:** migration `20260811130000_access_control_v2_lifecycle_effective_permissions.sql`, teste pgTAP `113_access_control_v2_lifecycle_effective_permissions.sql`, teste Node `access-control-v2-contract.test.mjs`, `PROJECT_STATE.md`, `AUTH_CONTEXT_STRATEGY.md`, `VIEW_RPC_CONTRACTS.md` e relatório `docs/reports/ACCESS_CONTROL_V2_2026-08-11.md`.
- **Validação:** 11 testes Node focados, `git diff --check` e `npm run documentation:validate:internal-docs` passaram; auditoria documental `changed` terminou sem blockers, com ressalvas históricas; typechecks, build, lint, pgTAP e QA visual aguardam `tsc`/dependências/runtime local.
- **Riscos restantes:** o modelo atual ainda não materializa um catálogo genérico de Resource/Action/Scope; presets nominais e a taxonomia Conteúdo/Conhecimento permanecem decisão de domínio, sem grants implícitos.

## CONFI-ONE-V1 — Blueprint Alignment & Claude Handoff — 2026-08-10

- **Handoff Claude:** Relatório completo gerado em `docs/reports/2026-08-10_handoff-claude-confi-one-v1.md`.
- **Fidelidade Visual:** Ordem estrita de blocos mantida (Header → Summary Rail → Abas → Filtros → Tabela + Paginação).
- **Abas e Seleção:** Linha ativa de 2-3px em Genius Pink (`#FF4FA3`) adicionada globalmente em `.gso-ui-tabs`.
- **Canvas de Conhecimento:** Fundo de `/admin/knowledge` e `/admin/knowledge/new` alinhado ao Canvas Azul Escuro (`#081220`).
- **Limpeza de Artefatos:** Removidas imagens obsoletas e aba legada `Convites / Histórico`.
- **Qualidade:** Typecheck (0 erros), Build Vite (0 erros), 22 rotas validadas em QA Playwright.

## CONFI-ONE-V1 — Surface Sweep, Cockpit Removal & Brand Canonization — 2026-08-09

- **Brand System Canônico:** `docs/specs/CONFI_ONE_BRAND_SYSTEM_V1.md` (58 seções). O documento legados `docs/GENIUS_GLOBAL_SHELL_VISUAL_CONTRACT_V1.md` é mantido como historicamente SUPERSEDED. A cópia duplicada `docs/CONFI_ONE_BRAND_SYSTEM_V1.md` foi removida.
- **Cockpit Gerencial Removido:** `ManagementCockpitPage.tsx` foi removido como código órfão. A navegação deixou de expor a opção e a rota `/admin/cockpit` redireciona via client-side `<Navigate to="/admin/settings/dashboard-sources" replace />`.
- **Fontes do Dashboard Canônica:** O painel `Fontes do Dashboard` (`/admin/settings/dashboard-sources`) é o container administrativo único, incorporando as seções `PipelineRoleSettings`, `StageMappingSettings` e `CompanyReconciliationPanel`.
- **Relatório de Auditoria:** `docs/duplicate-surface-audit.md` e `docs/route-audit.md` registram 22 rotas autenticadas internas com 0 falhas bloqueantes de DOM/tipografia.

## CONFIGURATION-PO-V2 — Lock visual, mapas e evidência — 2026-08-09

- **Precedência:** `docs/specs/ADMIN_CONFIGURATION_VISUAL_CONTRACT_V1.md` recebeu o lock V2 antes da alteração de runtime. Ele cobre Configurações, Usuários e acessos, Central de ajuda, Histórico, Fontes e Integrações; Dashboard Analytics permanece explicitamente fora.
- **Referências e mapas:** seis PNGs aprovados foram versionados em `docs/design/blueprint/Configuration PO/v2/`. As medidas e o uso de componentes reais estão registrados em `docs/reports/2026-08-09_configuration-po-v2-measurement-map.md` e `docs/reports/2026-08-09_configuration-po-v2-component-map.md`.
- **Estado:** execução apenas local, com fixture identificada como QA local. O pacote final, manifestos, hashes e comparações somente serão registrados após o QA V2; não houve push, deploy, sync externo, modificação de secret ou operação remota.

## ADMIN-CONFIG-VISUAL-01 — Contrato, referências e matriz — 2026-08-09

- **Escopo:** shell/sidebar, Usuários e acessos, Histórico de sincronizações, Fontes do Dashboard e Integrações; nenhuma página analítica, contrato, backend, banco, credencial ou sincronização foi alterada nesta etapa documental.
- **Decisão:** `docs/specs/ADMIN_CONFIGURATION_VISUAL_CONTRACT_V1.md` passa a ser a precedência visual localizada. Ele substitui apenas direções conflitantes de 1920×1080 único, submenu que desloca conteúdo, Gênio sobrenatural, cor por domínio, iconografia decorativa e Configurações tratadas como analytics.
- **Referências:** cinco PNGs aprovados, todos 1672×941, foram identificados e versionados em `docs/design/blueprint/Configuration PO/`.
- **Mapa:** `docs/reports/2026-08-09_admin-configuration-blueprint-component-map.md` registra REUSE/ADAPT/NEW/OMIT antes de runtime. A fonte de permissão confirmada é a navegação derivada do catálogo/guard real; nenhum papel ou ação foi inventado.
- **Fechamento local:** implementação e QA real registrados em `docs/reports/2026-08-09_admin-configuration-visual-rebuild-v1.md`. Não houve push, deploy, sync externo, migration remota, reset ou alteração de secret.

## Registro corrente — Dashboard por domínios — 2026-08-03

- **Especificação:** `docs/specs/GENIUS_HIGH_DENSITY_INTERFACE_V1.md` recebeu as
  regras do adendo de navegação, filtros, Produto/Desenvolvimento e estados do
  Gênio.
- **Design system:** `docs/design/GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md` registra
  as sete áreas, a ausência do container global de fontes e a regra de não usar
  voo/magia como estado operacional.
- **Código:** shell, páginas analíticas, estados de espera e componentes de KPI
  foram alinhados sem tocar em contratos de dados ou execução de sincronização.
- **Evidência prevista:** relatório corrente em
  `docs/reports/2026-08-03_dashboard-visual-density-v1-1.md`, complementado
  pelos comandos e manifestos executados no fechamento deste lote.

## Registro corrente — fechamento High-Density — 2026-08-03

- Branch: `codex/high-density-ui-rebuild-20260803`; HEAD deve ser confirmado
  com `git rev-parse --short HEAD`.
- Especificação: `docs/specs/GENIUS_HIGH_DENSITY_INTERFACE_V1.md`.
- Relatório: `docs/reports/2026-08-03_high-density-ui-rebuild.md`.
- Escopo: shell, Dashboard Gerencial, domínios analíticos, Configurações e
  estados visuais; sem alteração de backend, contratos, banco ou credenciais.
- Evidência automatizada: build, typechecks, secret scan, quality gates e
  `git diff --check` aprovados. A reexecução focal de contratos terminou em
  111/114, com três falhas estruturais conhecidas registradas no relatório.
- QA real executado: matriz final com 80 capturas nas oito superfícies, cinco
  viewports e dois temas; reteste direcionado do Financeiro com 10 capturas;
  reteste de Configurações com 24 verificações e manifesto UI-05 com cinco
  estados do Gênio, sem falhas de rede, HTTP inesperado ou overflow. Quatro
  falhas ampliadas preexistentes
  permanecem registradas no relatório.
- A Visão Geral agora expõe `Sincronizar bases` para administrador de plataforma,
  com bloqueio de ciclo concorrente e reuso do orquestrador sequencial. O fluxo
  foi exercitado em QA interceptado em
  `output/high-density-overview-sync-action-20260803/manifest.json`; nenhuma
  sincronização real foi executada.
- O Comercial diferencia quatro KPIs primários de Conversão/Ticket médio como
  indicadores secundários, sem alterar cálculos ou contratos.
- A seção 25 da especificação canônica registra o adendo de densidade cognitiva,
  seus dez eixos e quinze perguntas de revisão visual.
- Correção registrada: leituras de Configurações passaram a ser sob demanda;
  o 403 repetido de `ticket_categories` fora da seção Categorias desapareceu.
- Referências visuais vigentes: `docs/design/blueprint/Dashboard PO/` e
  `docs/design/blueprint/Suporte e conversas/`; a consolidação e as exclusões
  intencionais foram commitadas em `619dfa8` e documentadas em `bb77c67`, sem
  reescrita do histórico.

## Precedência

## Registro corrente

- Branch: `codex/dashboard-visual-density-v1-1-20260803`.
- Base: `c75ec57b22985589a9f705c6bf2bbce908af1b92`.
- Escopo documental: densidade/tipografia/shell/QA visual; sem mudança de
  backend, contratos, métricas, fontes, sincronizações ou credenciais.
- Relatório canônico: `docs/reports/2026-08-03_dashboard-visual-density-v1-1.md`.
- Evidência externa: `C:\Projetos\GSO-artifacts\dashboard-visual-density-v1-1-20260803`.
- Estado QA: 80/80 capturas no `final-head-bcebf1c`, HEAD `bcebf1c`, sem falha de rota, HTTP ≥400,
  console errors, request failures ou overflow horizontal.
- Regressão focada: 26/26. Suíte ampliada Analytics + Settings: 103/105;
  duas falhas fora do escopo visual permanecem registradas como limitação,
  ambas em contratos de Edge Functions/diagnóstico.

## Precedência histórica

O registro abaixo preserva o estado anterior documentado.

# Estado corrente — 2026-08-01, reconciliado pelo Codex

## Carregamento do Dashboard e fila visual — 2026-08-02

- Implementado o aguardo do estado publicado após iniciar sincronização, com
  Gênio animado durante o processamento e timeout honesto.
- Validações: 32 testes focados, typecheck web/contratos, build, secret scan,
  quality gate e QA empacotado com 20 capturas aprovados.
- Evidência: `docs/reports/2026-08-02_dashboard-sync-loading-stabilization.md`.
- Fila registrada: `DASHBOARD-05` (visão gerencial HD da aba CEO) e `DASHBOARD-06`
  (fonte financeira alinhada ao cabeçalho OMIE). Nenhum dos dois itens foi
  implementado neste ciclo.

## Atualização corrente do Dashboard Gerencial API-only — 2026-08-02

- A verdade corrente está em `C:\Projetos\GSO-old`, branch
  `codex/dashboard-management-rebuild-20260802`, HEAD `b47d603`, sem upstream,
  `origin/main...HEAD = 0 58`.
- O ponto de entrada `b121b446` foi preservado em
  `refs/archive/dashboard-rebuild-start-20260802`; o stash existente também
  permanece intacto.
- O Dashboard publicado possui cinco áreas: Resumo Gerencial, Comercial,
  Customer Success, Suporte & Chat e Financeiro. Produto e Desenvolvimento
  permanecem fora da navegação ativa.
- HubSpot e OMIE são as únicas integrações publicadas. Planilhas e conectores
  antigos permanecem somente como histórico, migração, auditoria ou QA; não
  devem ser reativados como fonte, fallback ou contingência.
- Migrations locais forward-only foram aplicadas sem reset. Validações objetivas
  e limitações estão registradas em
  `docs/reports/2026-08-02_dashboard-delta-final.md` e na matriz visual.

## Atualização do lote Dashboard Gerencial API-only — 2026-08-02

- Estado: implementado localmente e validado parcialmente; sem push, deploy, sync externo ou reset.
- Escopo: cinco áreas publicadas, integrações HubSpot/OMIE, histórico separado, scheduler legado desativado localmente e preservação dos artefatos históricos de planilha.
- Evidências: `docs/reports/2026-08-02_dashboard-reconstruction-audit.md`, `docs/reports/visual-audit/screenshots/` e `supabase/tests/089_dashboard_api_only_reconstruction.sql`.
- Validação: build/typecheck/quality aprovados; pgTAP focado 37/37; suite completa parcial por colisão de fixtures no banco persistente sem reset.
- Próximo gate: revisar a matriz visual completa e autorizar credenciais externas antes de qualquer sincronização real.

- checkout canônico: `C:\Projetos\GSO-old`;
- branch `main`, HEAD do commit que contém este bloco, upstream `origin/main`;
- divergência: `origin/main` é ancestral do checkout; confirme a contagem corrente com `git rev-list --left-right --count origin/main...HEAD`;
- um único worktree ativo, stash preservado e 24 refs de arquivo de reconciliação preservadas;
- nenhuma branch remota foi apagada; branches sem upstream e commits locais não publicados permanecem preservados;
- superfície publicada nesta fase: Dashboard, Configurações aprovadas, Central de Ajuda e Knowledge/editor;
- validações do HEAD atual: contracts/web typecheck, build web, 266 testes Node, validadores de governança/qualidade, documentação interna e `git diff --check` passaram;
- fonte de reconciliação: `docs/reports/2026-08-01_git-state-reconciliation-addendum.md`;
- pendências atuais: QA autenticado com capturas, editor legado, grants/DML de integrações, colisão hydrate/pgTAP, Auth local e sync real dependente de credencial autorizada.

# Encerramento formal da RELEASE-01 — 2026-07-24

- desenvolvimento concluído: Central Pública de Ajuda, Dashboard Gerencial do piloto, migração Octadesk, Hub de Integrações e API, taxonomia, assets, normalização editorial, busca, navegação, responsividade, acessibilidade e CTA `/portal`;
- estado: PR ainda não criado por autenticação ausente no GitHub CLI; após criação, ficará `PR criado — aguardando revisão, merge e deploy`; sem merge, deploy ou smoke de produção;
- estado Git: branch `codex/release-pilot-dashboard-help-center-v1`, HEAD `dc10e66`, worktree limpo, remoto sincronizado;
- números finais: 75 artigos, 62 públicos, 13 não públicos; 128 assets, 99 aprovados/públicos e 29 pendentes;
- evidências e validações: `docs/reports/RELEASE_01_DEVELOPMENT_CLOSURE_2026-07-24.md` e `docs/reports/TAXONOMY_01_1_FINAL_2026-07-24.md`;
- backlog independente: KNOWLEDGE-02, restritos, 29 assets pendentes, drift de migration, erro remoto UUID/`true`, merge, deploy e smoke de produção;
- próxima frente: `DASHBOARD-02 — Evolução do Dashboard Gerencial`.

# Context Pack V2 - correção documental e evidências - 2026-07-23

- escopo: correção do Context Pack parcialmente aceito, sem implementação
  funcional.
- correções: `genius-support-os-context-pack-v2.zip` gerado por staging
  explícito, validado por listagem interna e preservado fora do repositório em
  `C:\Projetos\GSO-artifacts\context-pack-20260723\`.
- conteúdo validado: 24 Markdown, 23 screenshots e 1 metadata JSON dentro do
  ZIP V2.
- novos documentos: `22_UI_EVIDENCE_MATRIX.md` e `23_GIT_PROVENANCE.md`.
- evidências: capturas desktop, intermediária e mobile para Central,
  Dashboard e principais rotas internas; capturas V1 ambíguas foram movidas
  para o diretório externo de artefatos do macro-lote.
- limite: nenhuma correção de produto, UX, banco, migration, deploy, push,
  reset, clean, stash ou commit foi executada.

# Context Pack de direção assistida - 2026-07-23

- escopo: primeiro macro-lote do novo protocolo de direção assistida.
- entrega: `docs/context-handoff/` com índice, visão executiva, inventários,
  estado de implementação, rotas, workflows, permissões, tenancy, integrações,
  UX, arquitetura, qualidade, riscos, decisões e backlog proposto.
- evidências visuais: `docs/context-handoff/screenshots/` com 8 imagens de QA
  local reaproveitadas do smoke autenticado recente.
- restrição: nenhuma funcionalidade nova, migration, deploy, push, secret,
  reset, clean ou escrita externa foi executada.
- próximo gate: avaliação do Context Pack pelo chat oficial de direção antes de
  autorizar o próximo macro-lote.

# Smoke autenticado Dashboard e Central - 2026-07-23

- escopo: release local do Dashboard Gerencial e Central de Ajuda publica.
- runtime: `http://127.0.0.1:4173` com Supabase local.
- implementacao: `AnalyticsShell` recebeu `Suspense` interna para o dominio
  ativo, evitando fallback global durante lazy loading das abas.
- QA: `tests/scripts/release-smoke-playwright.mjs` validou `/admin/analytics`,
  `/help/genius`, `/help/genius/articles` e um artigo publico.
- evidencias: `output/playwright/release-smoke-dashboard.png`,
  `release-smoke-help-home.png`, `release-smoke-help-articles.png` e
  `release-smoke-help-article.png`.
- validacao: smoke sem console errors, sem request failures, sem overflow
  horizontal; web/contracts typecheck, testes focados e build aprovados.
- atencao: `supabase:qa:local-support-fixture` ainda precisa de hardening
  separado por lentidao/travamento na etapa Knowledge/Public Help.

# Release urgente — hidratação local da Central de Ajuda — 2026-07-23

- origem: `raw_knowledge/octadesk_export/latest`;
- resultado: 57 artigos importados, 7 categorias, 44 publicados e 13
  bloqueados pelo gate editorial;
- código: `apps/web/src/features/help-center/help-center-navigation.ts` e
  `HelpCenterHomePage.tsx` corrigem a geração de links de categoria;
- validação: `tests/scripts/help-center-navigation.test.mjs` 2/2 e QA browser
  em `/help/genius` sem erros de console;
- limite: apenas banco local, sem publicação remota.

# Revisão de prioridade de release — 2026-07-23

- prazo: Dashboard Gerencial + Central de Ajuda pública até o fim de
  2026-07-24;
- decisão: módulos restantes estão incompletos em funcionalidade e UX, mas
  continuam no roadmap e não serão apagados;
- estratégia: allowlist/feature flag controla a superfície publicada sem
  remover código, dados, migrations ou contratos;
- sequência: fechar o release urgente, executar QA, depois retomar tickets,
  áreas, acessos, carteiras, Clientes B2B, Carteira CS e Produto em lotes
  funcionais e auditáveis.

# Spec de áreas, acessos e carteiras — 2026-07-23

- documento canônico: `docs/ACCESS_AREAS_ROLES_PORTFOLIOS_SPEC_V1.md`;
- decisão: preservar o repositório e reduzir a superfície do Release 1 para
  Dashboard Gerencial + Central de Ajuda pública, sem apagar módulos;
- domínio: áreas definem contexto/defaults, papéis definem grants, memberships
  vinculam pessoas e carteiras são entidades editáveis com histórico;
- engenharia: tokens, catálogos tipados, primitives reutilizáveis, RLS/RPC,
  auditoria e revisão crítica de legibilidade são requisitos de aceite;
- diagnóstico registrado: HTTP 500 em `vw_support_tickets_queue` e
  `rpc_support_ticket_queue_page` ainda exige captura da exceção SQL raiz.

# Contexto read-only do relacionamento HubSpot no cockpit B2B — 2026-07-23

- frontend: `apps/web/src/features/customers/customer-relationship-api.ts`, `customer-relationship-model.ts` e `CustomersPage.tsx`;
- contrato consumido: `rpc_analytics_customer_relationship_contract(integer, integer)`;
- comportamento: totais globais de entidades legais, negócios e grupos econômicos resolvidos, com origem explícita e sem associação automática a contas;
- validação: teste focado 3/3, web typecheck e QA autenticado local;
- pendência: contrato auditável para vincular `tenant_id` a `hubspot_company_id` antes de mostrar negócios no detalhe individual.

# Implementação do contrato real de Carteira CS e redesign B2B — 2026-07-23

- migration: `supabase/migrations/20260723203000_cs_real_portfolio_contract_v1.sql`;
- teste: `supabase/tests/074_cs_real_portfolio_contract.sql`, 12/12;
- backend: `cs_customer_portfolio_assignments`, histórico imutável, gate de gestor CS e `rpc_admin_upsert_cs_customer_portfolio`;
- read model: `vw_cs_customer_portfolio` ampliado com carteira, owner, cluster, modelo, cadência, saúde, prioridade e proveniência;
- frontend: `apps/web/src/features/cs/CsPortfolioPage.tsx`, `apps/web/src/features/customers/CustomersPage.tsx` e `apps/web/src/features/tenants/TenantsPage.tsx` passaram a priorizar tabela/lista principal e detalhe contextual;
- contratos: `packages/contracts/src/ticketing.ts`, `apps/web/src/features/cs/cs-model.ts` e `cs-api.ts` atualizados;
- validação: contracts/web typecheck, web build e Node 68/68;
- limite: migration apenas local; sem promoção de owners QA, deploy, push ou write remoto.

# Auditoria de dados reais e redesign de Clientes B2B/Carteira CS — 2026-07-23

- evidência: `docs/reports/CS_B2B_PORTFOLIO_UX_DATA_AUDIT_2026-07-23.md`;
- fonte analisada em modo somente leitura: `C:\Users\edebu\Downloads\CS Ops _ Carteiras e Clusters -v2.xlsx`, aba `BD_Clientes`, 606 linhas e 42 colunas;
- decisão de domínio: o seed local continua QA; carteira, campos CS e memberships de colaboradores precisam de contratos reais antes de carga produtiva;
- decisão UX: Clientes B2B e Carteira CS terão no máximo duas zonas, sem coluna fixa de ferramentas e sem rail permanente de detalhe; detalhe em rota/workspace/drawer;
- status: diagnóstico e de/para concluídos; implementação de contrato, refatoração visual e QA autenticado são os próximos ciclos;
- limite: nenhum write remoto, promoção de owner QA, migration remota, deploy, push ou descarte do worktree foi executado.

# Ciclo A3 — Importacao CS Ops resiliente e API financeira OMIE

- data: `2026-07-19`
- resumo: corrigido HTTP 546 por limite de CPU/memoria no parser XLSX; criada
  leitura enxuta de `BD_Clientes`, preparada persistencia API OMIE e status de
  fonte/fallback no Dashboard Financeiro.
- documentos: `docs/reports/ANALYTICS_FINANCE_SOURCE_AND_CS_OPS_IMPORT_2026-07-19.md`, `docs/PROJECT_STATE.md`
- validacao: importacao real CS Ops concluida com 606/606 linhas; typecheck,
  build, testes Omie/navegacao e lint local aprovados.
- pendencias: cadastrar a chave Omie no Vault e executar a primeira sincronizacao.

# 2026-07-21 - Integração do handoff visual do mascote Genius

- runtime: `apps/web/src/components/GeniusMascot.tsx` e `apps/web/src/index.css`
- referência: `Recreação do mascote Genius-handoff/` (ignorada pelo Git)
- decisão: manter o SVG versionado como fonte de runtime e mapear superfícies
  para poses `magic`, `shrug`, `celebrate` e `welcome`
- validação: contracts/web typecheck, build, 7 testes Node, validação documental,
  lint Supabase, 1.192 testes pgTAP e smoke visual Playwright aprovados

# Correcoes de release no Dashboard e Central de Ajuda - 2026-07-23

- Dashboard: `matchAnalyticsPeriodPreset` elimina a divergencia da primeira
  renderizacao entre o intervalo do mes atual e a opcao exibida no seletor.
- Central de Ajuda: `buildHelpCenterCategoryHref` evita duplicacao do caminho
  nas URLs dos cards e preserva busca/categoria como query params.
- Testes novos: `tests/scripts/analytics-periods.test.mjs` e
  `tests/scripts/help-center-navigation.test.mjs`.
- Evidencia: build web, contracts typecheck, testes Node (76/76), higiene da
  raiz e diff check aprovados neste lote.
- O HTTP 500 da fila foi diagnosticado e corrigido localmente; a migration e a
  evidencia de performance estao registradas no relatorio especifico abaixo.

# Correcao do timeout da fila de suporte - 2026-07-23

- migration: `20260723183054_support_ticket_queue_single_pass_hardening.sql`;
- causa: duas releituras de `support_visible` em CTEs independentes induziam
  nested loops com muitas linhas removidas por filtro de join;
- resultado local: RPC autenticado HTTP 200, aproximadamente 433 ms, paginas 1
  e 2 com 50 itens e total de 628;
- teste: `tests/scripts/support-queue-view-architecture.test.mjs`;
- relatorio: `docs/reports/SUPPORT_QUEUE_TIMEOUT_ROOT_CAUSE_2026-07-23.md`;
- limite: validacao local apenas; ainda nao houve reset controlado completo,
  migration remota, deploy ou push.

# Discovery HubSpot somente leitura — 2026-08-02

- Discovery autorizado executado sem escrita externa, sincronização ampla ou
  persistência de token, payload, registro individual ou PII.
- Preflight GSO real: `ready`, endpoint alcançável, credencial server-side
  configurada, 35 pipelines não arquivados e `writesExternalData=false`.
- Relatórios persistidos: matriz de capacidades, discovery operacional de CS,
  catálogo de métricas, inventário de pipelines e evidência JSON sanitizada em
  `docs/reports/2026-08-02_hubspot-*.md` e
  `docs/reports/2026-08-02_hubspot-discovery-evidence.json`.
- Resultado parcialmente validado: denominador CS, fonte autoritativa de
  Conversas/Feedback e Chrome autenticado aguardam validação/decisão.

# Revisão do próximo macro-lote visual — decisão do Product Owner — 2026-08-02

- Delta persistido: `docs/reports/2026-08-02_ui-05-specification-delta.md`.
- Especificação única: `docs/specs/UI_05_GENIO_EM_ACAO_V1.md`.
- `UI-05` foi aprovado conceitualmente como micro-lote isolado, sem
  implementação neste ciclo. A copy anterior foi substituída pela copy aprovada.
- `DASHBOARD-05` depende do discovery HubSpot, denominador de CS e catálogo de
  métricas; `DASHBOARD-06` foi separado para backlog técnico de runtime/dados.
- Ordem registrada: discovery, denominadores, catálogo, UI-05, aprovação visual,
  DASHBOARD-05 e depois DASHBOARD-06 em lote próprio.

# DOCUMENTATION_LEDGER.md

## Lote 2026-07-23 - pipelines comerciais, fila paginada e relacionamento B2B

- Migrations: `20260723200000_analytics_commercial_pipeline_catalog_activate_all_v1.sql`,
  `20260723200500_support_ticket_queue_server_pagination_v1.sql` e
  `20260723201000_analytics_customer_relationship_contract_v1.sql`.
- Contratos/frontend: `packages/contracts/src/ticketing.ts`,
  `apps/web/src/features/support/support-api.ts` e
  `apps/web/src/features/support/SupportWorkspacePage.tsx`.
- Decisão: catálogo comercial inicia ativo e segue governado pela configuração;
  fila pagina no backend; grupos econômicos exigem resolução humana; entidades
  legais e deals mantêm proveniência HubSpot.
- Validação: pgTAP 73 arquivos/1.230 testes, typecheck, build e diff check.
- Limite: migrations locais apenas; falta QA autenticado de página 2+ e consumo
  do contrato nas telas B2B/Carteira CS.

## Auditoria e seleção de pipelines Comerciais — 2026-07-23

- migration: `supabase/migrations/20260723173500_analytics_commercial_pipeline_scope_v1.sql`;
- bootstrap local: `supabase/migrations/20260723174000_analytics_commercial_pipeline_catalog_seed_v1.sql`;
- backend: `supabase/functions/_shared/hubspot.ts` e
  `supabase/functions/hubspot-sync/index.ts`;
- frontend: `apps/web/src/features/analytics/AnalyticsCommercialPage.tsx`,
  `analytics-api.ts` e `analytics-model.ts`;
- teste: `supabase/tests/072_analytics_commercial_pipeline_scope.sql`;
- relatório: `docs/reports/COMMERCIAL_PIPELINE_AUDIT_2026-07-23.md`;
- decisão: catálogo oficial é descoberto no HubSpot; fontes novas entram
  inativas, o nome oficial é preservado e o alias continua interno. O filtro da
  aba Comercial é temporário e não altera a configuração salva;
- validação: pgTAP 72 arquivos/1.223 testes, contracts/web typecheck, build e
  testes Node aprovados;
- limite: ativação dos pipelines adicionais e publicação remota permanecem
  decisões/gates separados.

## Performance de suporte e ACL de telas - 2026-07-23

- migrations: `supabase/migrations/20260723151602_optimize_support_ticket_queue_read_model.sql`
  e `supabase/migrations/20260723162000_harden_screen_dependency_function_acl.sql`;
- frontend: `apps/web/src/features/support/support-api.ts` e
  `apps/web/src/features/support/SupportWorkspacePage.tsx`;
- decisao: materializar uma vez o recorte autorizado da fila, limitar a leitura
  inicial a 50 tickets e impedir execução pública das funções auxiliares de
  trigger do catálogo de telas;
- validacao: pgTAP 71 arquivos/1.219 testes, contracts/web typecheck, build,
  testes Node, higiene da raiz, validação documental, lint local e smoke HTTP;
- limite: paginação server-side além dos 50 itens e publicação remota continuam
  no próximo ciclo/gate.

## Governanca de acesso contextual - 2026-07-22

- migration: `supabase/migrations/20260722221746_internal_profile_screen_access_contract_v1.sql`;
- frontend: `apps/web/src/features/admin/InternalAreasAdminPage.tsx`,
  `apps/web/src/features/admin/admin-api.ts` e contratos compartilhados;
- decisao: separar identidade, area, funcao operacional, perfil reutilizavel e
  telas autorizadas; abandonar a ideia de um papel global por departamento;
- validacao: DDL em transacao local com rollback, lint local, typecheck, build,
  teste de navegacao e diff check aprovados;
- limite: migration e RPCs ainda nao foram publicados em ambiente remoto; o
  CRUD completo de presets e a leitura do contexto pelo shell ficam para o
  proximo ciclo.

## Governança Git e release — 2026-07-21

- Política: `docs/GIT_BRANCHING_AND_RELEASE_POLICY.md`.
- Consolidação: commit `0f86cab` e limpeza subsequente `7c7d291` na branch local
  `codex/repository-cleanup-consolidation-20260721`.
- Estado: o baseline `7c7d291` está preservado; o worktree contém o lote W1
  ainda não commitado; branch anterior preservada; nenhum push, merge ou deploy
  executado.

## Limpeza e sanitização do repositório — 2026-07-21

- removido `DIAGNOSTICO.bat`, sem consumidores e com risco de registrar env
  local em log;
- removidos três screenshots históricos sem referência da raiz;
- preservados scripts de QA, migrations, testes, contratos e documentos com
  função de continuidade;
- evidência: `docs/reports/REPOSITORY_CLEANUP_AUDIT_2026-07-21.md`.

## Spec SDD de prontidão e continuidade — 2026-07-21

- spec: `docs/superpowers/specs/2026-07-21-gso-release-readiness-and-next-cycles.md`;
- plano: `docs/superpowers/plans/2026-07-21-gso-release-readiness-and-next-cycles.md`;
- escopo: governança interagente, higiene, Dashboard, HubSpot/OMIE, CS Ops,
  Help Center/Portal, segurança, performance e release pack;
- decisão: auditorias independentes podem rodar em paralelo, mas arquivos
  centrais, migrations compartilhadas e writes externos ficam com o
  coordenador e dependem de gates próprios;
- próximo lote: W1 em modo read-only, seguido por W2/W3;
- riscos: drift de commits/branches em documentos antigos, contagem divergente
  da suíte, cache HubSpot dependente de reidratação e escopo de
  `dashboard_viewer` a consolidar;
- validação do checkpoint: identidade Git confirmada; nenhum serviço remoto ou
  secret alterado; o worktree passou a conter o lote W1 documentado abaixo.
- evidência: `docs/reports/SDD_CONTINUITY_AUDIT_2026-07-21.md`.

## W1 — Verificação automatizada de higiene da raiz — 2026-07-21

- código: `scripts/ci/check-root-artifacts.mjs`;
- testes: `tests/scripts/root-artifacts-hygiene.test.mjs`;
- comando: `npm run repository:check-root`;
- resultado: 10 logs/dumps movidos para `.tmp/logs/2026-07-21--local-environment/`;
  `output/` e o bundle local do mascote continuam em triagem;
- segurança: nenhuma exclusão, write externo, secret ou alteração de runtime;
- validação: teste TDD 3/3, contracts/web typecheck, web build, lint/teste
  Supabase, validação documental, `git diff --check` e smoke HTTP local passaram;
- ambiente: web `4173`, API `54321`, banco `54322`, Studio `54323`; Edge Runtime,
  imgproxy e pooler aparecem parados no CLI e exigem lote separado se funções
  locais precisarem ser exercitadas.

## W3 — HubSpot faseado e recuperação do runtime — 2026-07-21

- diagnóstico: Edge Runtime parado causava HTTP 503; a carga monolítica do
  HubSpot excedia o limite do worker e entregava HTTP 504 ao cliente;
- implementação: escopos `companies`, `commercial` e `cs` com execução
  sequencial na UI, reaproveitamento incremental e teste unitário de escopo;
- validação: OMIE 3.433/3.433; HubSpot 3 etapas em HTTP 200, sem nova execução
  presa em `running`; contracts/web typecheck, build e pgTAP (1.194 testes)
  passaram;
- evidência: `docs/reports/HUBSPOT_SYNC_PHASED_EXECUTION_2026-07-21.md`.

## W2 — QA autenticado do Dashboard — 2026-07-21

- correção: o cabeçalho agrega `companies`, `commercial` e `cs` quando o lote
  faseado está concluído e dentro da janela de coerência; não reporta mais a
  etapa CS isolada como o total do lote;
- validação: 2/2 testes do agrupamento, `web:typecheck`, QA autenticado do
  Financeiro e Comercial; `Mês passado` permaneceu em `2026-06-01`–`2026-06-30`
  ao trocar de aba;
- evidência: snapshots `output/playwright/gso-qa-*-final.md` e
  `docs/reports/HUBSPOT_SYNC_PHASED_EXECUTION_2026-07-21.md`;
- limite: validação apenas local; sem push, deploy, scheduler remoto ou write
  externo.

## W1 — Classificação final dos artefatos locais — 2026-07-21

- corrigido: `output/` e o pacote `Recreação do mascote Genius-handoff/` foram
  classificados explicitamente como diretórios locais ignorados na higiene da
  raiz;
- limite: não houve exclusão de arquivos nem alteração de assets runtime.

## W5 — Central Genius em estado ativo — 2026-07-21

- diagnóstico: QA autenticado encontrou o espaço `genius` em `draft`, portanto
  `/help` não podia encontrar uma Central pública;
- correção: migration idempotente `20260721240000_activate_genius_public_help_space_v1.sql`;
- limite: o pipeline não publica conteúdo automaticamente e não toca ambiente
  remoto; artigos continuam sujeitos ao importador, allowlist e gate editorial.
- execução local: 58 artigos importados, 44 publicados, 13 bloqueados; QA em
  `/help/genius/articles` confirmado com categorias e links navegáveis.

## W6 — ACL do snapshot legado e gateway do scheduler — 2026-07-21

- corrigido: removido `EXECUTE` de `anon`/`authenticated` na RPC legada
  `rpc_analytics_ceo_snapshot_legacy`; mantido somente para `service_role`;
- corrigido: `omie-sync` e `analytics-integration-run` declarados com
  `verify_jwt = false`, mantendo a autorização por segredo/JWT dentro das
  funções;
- teste: pgTAP 069 adicionado; scheduler remoto continua não executado.
- relatórios: `docs/reports/INTEGRATION_SECURITY_PERFORMANCE_AUDIT_2026-07-21.md`
  e `docs/reports/CS_OPS_NEXT_GATE_AUDIT_2026-07-21.md`.
- CS Ops: `source_record_id` duplicado bloqueia o ledger e a criação exige
  rechecagem CNPJ com falha fechada antes do POST.

## 2026-07-18 - Configuração de integrações e dashboard gerencial

- especificação: `docs/spec.md`
- plano vivo: `docs/plan.md`
- plano executável: `docs/superpowers/plans/2026-07-18-integrations-configuration-and-management-dashboard.md`
- auditoria financeira: `docs/reports/OMIE_FINANCE_SOURCE_AUDIT_2026-07-18.md`
- implementação: `managed_integrations`, Vault, Settings, HubSpot token resolver,
  normalizador e cliente/Edge Function Omie read-only.
- validação: `npm run supabase:verify`, `npm run contracts:typecheck`,
  `npm run web:typecheck`, `npm run web:build` e testes Node.
- pendências: credenciais Omie, read model financeiro, importadores de planilhas,
  pipes oficiais e integração GitHub do Produto.

## Objetivo
Registrar, por fase aprovada, o rastro documental minimo necessario para sustentar auditoria interna, continuidade de execucao e geracao futura da FAQ oficial da plataforma.

## Estrutura do ledger
Cada registro deve informar:
- fase
- commit
- branch
- data
- resumo funcional
- docs alterados
- views/RPCs afetadas
- telas afetadas
- riscos restantes
- impacto na FAQ futura

## Registros

### Codex Continuation Handoff — Analytics multi-source
- data: `2026-07-17`
- branch: `codex/ux-ui-rebuild-v2-discovery`
- resumo funcional: registrada a retomada pelo Codex, com inventário documental, auditoria do módulo Analytics/HubSpot, ausência de integração de planilhas e plano para painel interno com fontes normalizadas, frescor, provenance e qualidade verificável.
- documentos:
  - `docs/reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md`
  - `docs/PROJECT_STATE.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/analytics` — planejamento e auditoria; nenhuma nova funcionalidade de produto implementada neste lote.
- contratos afetados:
  - nenhum contrato novo.
- validações:
  - inventário de 326 documentos;
  - auditoria estrutural do módulo Analytics/HubSpot;
  - verificação da ausência de arquivos/adapter de planilha;
  - estado Git preservado.
- riscos restantes:
  - banco local inconsistente com as migrations;
  - ausência de fonte real de planilha e definição final de colunas/métricas;
  - HubSpot real e secrets não configurados.

### Ciclo A0 — Catálogo de métricas do Analytics
- data: `2026-07-17`
- branch: `codex/ux-ui-rebuild-v2-discovery`
- resumo funcional: consolidado o brief do painel gerencial e o contrato observado das métricas Comercial e CS/Suporte existentes, com definições, grão, denominadores, caveats de período/moeda/status e requisitos de provenance para a futura fonte planilha.
- documentos:
  - `docs/ANALYTICS_METRIC_CATALOG_V1.md`
  - `docs/reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/analytics` — nenhuma alteração de runtime neste ciclo.
- contratos afetados:
  - nenhum contrato novo; catálogo derivado de `vw_analytics_commercial_*` e `vw_analytics_cs_*`.
- validações:
  - métricas conferidas diretamente nas migrations `20260717160000_analytics_metrics_views_v1.sql` e no frontend Analytics;
  - `git diff --check`.
- riscos restantes:
  - não há fonte planilha nem dados reais disponíveis;
  - filtros temporais e reconciliação multi-fonte ainda não existem no runtime.

### Ciclo A1 — Fundação de ingestão de planilhas
- data: `2026-07-17`
- branch: `codex/ux-ui-rebuild-v2-discovery`
- resumo funcional: materializada a fundação de staging para fontes CSV/XLSX, preservando hash do arquivo, versão de mapeamento, execução idempotente, linhas brutas, provenance, qualidade, RLS, grants mínimos e auditoria. O contrato não expõe linhas brutas ao cliente autenticado.
- documentos:
  - `docs/ANALYTICS_METRIC_CATALOG_V1.md`
  - `docs/reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- migrations/tests:
  - `supabase/migrations/20260718014903_analytics_spreadsheet_ingestion_foundation_v1.sql`
  - `supabase/tests/050_analytics_spreadsheet_ingestion_foundation.sql`
- telas afetadas:
  - `/admin/analytics` — sem alteração de runtime neste ciclo.
- contratos afetados:
  - novo contrato interno de staging; nenhum read model unificado ou contrato frontend ainda.
- validações:
  - migration gerada pelo CLI oficial do Supabase;
  - teste pgTAP criado com 12 asserções de estrutura, RLS, políticas, idempotência e provenance;
  - aplicação e execução dos testes de banco pendentes por inconsistência do banco local.
- riscos restantes:
  - parser/validação de CSV/XLSX ainda não implementado;
  - schema canônico e precedência com HubSpot ainda precisam de fixture e reconciliação;
  - não executar reset local, migration remota ou uso de dados reais sem autorização explícita.

### Ciclo A1 — Parser de abas diárias do Comercial
- data: `2026-07-18`
- branch: `codex/ux-ui-rebuild-v2-discovery`
- resumo funcional: criado parser puro para transformar linhas extraídas das abas diárias do Comercial em fatos métricos normalizados, com aliases de métricas, datas, observações, provenance, chave idempotente e rejeições honestas.
- documentos:
  - `docs/ANALYTICS_METRIC_CATALOG_V1.md`
  - `docs/reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- código/testes:
  - `scripts/analytics/commercial-daily-sheet-parser.mjs`
  - `tests/scripts/commercial-daily-sheet-parser.test.mjs`
- telas afetadas:
  - nenhuma.
- contratos afetados:
  - contrato interno de fatos comerciais diários; sem alteração de Supabase ou frontend.
- validações:
  - RED confirmado por módulo ausente;
  - GREEN com 2 testes passando via `node --test`;
  - `git diff --check`.
- riscos restantes:
  - adaptador de extração Google Sheets e parser CS ainda pendentes;
  - seed/login local continuam bloqueados pelo schema divergente do banco.

### Project Restart Documentation Playbook
- data: `2026-06-22`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: criado playbook documental reutilizavel para orientar agentes em projetos legados/em andamento antes de destruir implementacoes e recomecar. O documento adapta as boas praticas do Genius Support OS para takeover, auditoria, documentacao canonica, plano de limpeza controlada e rebuild em lotes pequenos.
- documentos:
  - `docs/reports/PROJECT_RESTART_DOCUMENTATION_PLAYBOOK_2026-06-22.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma.
- contratos afetados:
  - nenhum.
- validacoes:
  - `git diff --check` sem erros de whitespace, apenas avisos LF/CRLF do Windows.
  - busca textual no novo playbook para secoes obrigatorias.
  - `npm run documentation:validate:internal-docs` sem documentos bloqueados; alertas existentes em documentos whitelisted permanecem como revisao editorial separada.
  - `git status --short --branch`.
- riscos restantes:
  - o playbook deve ser adaptado por projeto alvo; nomes de dominio, stack e contratos do Genius Support OS nao devem ser copiados automaticamente.
- impacto para FAQ futura:
  - registra a metodologia de documentacao e retomada que pode ser reaproveitada em outros projetos antes de um rebuild governado.

### Product Docs Governed Reader Polish
- data: `2026-06-17`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: recuperado `/admin/product-docs` no ambiente local e polido o leitor governado de documentos internos. A causa raiz da tela vazia era a ausencia de registros em `internal_documents` e `internal_document_versions` apos reset local. O lote adicionou sync local seguro, abriu automaticamente o primeiro documento autorizado, consolidou layout em tres zonas e adicionou indice interno derivado do markdown sanitizado.
- documentos:
  - `docs/reports/PRODUCT_DOCS_GOVERNED_READER_POLISH_2026-06-17.md`
  - `docs/PROJECT_STATE.md`
  - `docs/README.md`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/superpowers/plans/2026-06-17-product-docs-governed-reader-polish.md`
- contratos consumidos:
  - `vw_internal_documents_catalog`
  - `vw_internal_document_detail`
- telas afetadas:
  - `/admin/product-docs`
- boundaries:
  - sem migration;
  - sem tabela nova;
  - sem view ou RPC nova;
  - sem leitura arbitraria de arquivos pelo frontend;
  - sem service role no browser;
  - sem deploy remoto.
- validacoes:
  - `node --test tests/scripts/internal-docs-local-sync.test.mjs tests/scripts/product-docs-ui-contract.test.mjs`;
  - `npm run documentation:validate:internal-docs`;
  - `npm run documentation:sync:internal-docs:local`;
  - `npm run contracts:typecheck`;
  - `npm run web:typecheck`;
  - `node --test tests/scripts/*.test.mjs`;
  - `npm run web:build`;
  - QA browser autenticado local.
- riscos restantes:
  - permissao granular dedicada para `product-docs` segue futura;
  - alertas de validacao documental ainda exigem revisao editorial propria;
  - script local depende do Supabase local estar iniciado.
- impacto para FAQ futura:
  - permite explicar que Documentos do Produto e uma biblioteca interna governada por whitelist, sync e markdown sanitizado, nao um explorador de arquivos do repositorio.

### Final Recovery Handoff and Next Steps
- data: `2026-06-09`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: consolidado o fechamento da retomada pos-formatacao, com estado local/remoto, entregas, validacoes, rotas, usuarios locais de referencia, proximos passos e condicoes de parada.
- documentos:
  - `docs/reports/FINAL_RECOVERY_HANDOFF_AND_NEXT_STEPS_2026-06-09.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/GOAL_EXECUTION_PLAN.md`
- telas afetadas:
  - nenhuma tela nova neste lote documental.
- validacoes:
  - revisao de estado Git;
  - leitura dos relatorios de retomada, baseline, hardening e CS;
  - reconciliacao do roadmap corrente com a entrega ja concluida.
- riscos restantes:
  - piloto staging/producao ainda depende de autorizacao explicita;
  - health, tarefas e comandos de CS continuam bloqueados ate contratos backend.
- impacto para FAQ futura:
  - define o estado oficial de handoff e evita leitura do roadmap antigo como fila linear de tarefas.

### CS Portfolio Read-only UI
- data: `2026-06-09`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: entregue `/cs/portfolio` como cockpit read-only tenant-aware sobre `vw_cs_customer_portfolio`, com gate, redirect, navegação, busca, lista selecionável, detalhe operacional e estados honestos.
- documentos:
  - `docs/reports/CS_PORTFOLIO_READONLY_UI_2026-06-09.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/superpowers/specs/2026-06-09-cs-portfolio-readonly-design.md`
  - `docs/superpowers/plans/2026-06-09-cs-portfolio-readonly.md`
- contrato consumido:
  - `vw_cs_customer_portfolio`
- telas afetadas:
  - `/cs`
  - `/cs/portfolio`
- boundaries:
  - sem mutation;
  - sem billing ou financeiro;
  - sem health score calculado no frontend;
  - sem follow-ups, tarefas ou projetos;
  - isolamento tenant mantido pelo backend.
- validações:
  - testes Node focados `4/4`;
  - contracts e web typecheck;
  - web build;
  - pgTAP focado `12/12`;
  - suíte global com `51` arquivos e `1085` testes;
  - lint de banco;
  - fixture funcional;
  - QA autenticado de admin, CS e usuário sem acesso;
  - desktop e viewport estreito sem overflow horizontal;
  - `npm audit` com zero vulnerabilidades.
- riscos restantes:
  - health segue indisponível até contrato canônico;
  - comandos operacionais de CS permanecem fora do corte.
- impacto para FAQ futura:
  - permite explicar que a carteira CS respeita permissão por tenant, usa dados reais do backend e não apresenta indicadores ou ações ainda inexistentes.

### Dependency Hardening
- data: `2026-06-09`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: removidos os advisories npm de React Router e da dependencia transitiva `ws` com upgrades minimos e auditados.
- documentos:
  - `docs/reports/DEPENDENCY_HARDENING_2026-06-09.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
- dependencias:
  - `react-router-dom@7.15.0`
  - `react-router@7.15.0`
  - `@supabase/supabase-js@2.108.0`
- validacoes:
  - `npm audit --json` com zero vulnerabilidades;
  - `npm run contracts:typecheck`;
  - `npm run web:typecheck`;
  - `npm run web:build`.
- proximo lote: especificar `/cs/portfolio` read-only.

### Post-Recovery Baseline
- data: `2026-06-09`
- branch: `codex/mvp-operational-completion-goal`
- resumo funcional: historico recuperado publicado, fallback literal de credencial removido e ambiente Docker/Supabase restaurado com baseline completa aprovada.
- documentos:
  - `docs/reports/POST_RECOVERY_BASELINE_2026-06-09.md`
  - `docs/reports/PROJECT_TAKEOVER_CHECKPOINT_2026-06-09.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/GOAL_EXECUTION_PLAN.md`
- evidencias:
  - hash recuperado `0e9ff70926b21e604cd87fbbb45590ae61201327` preservado no remoto;
  - hardening de credencial publicado no commit `1902201`;
  - Supabase CLI `2.105.0`;
  - reset, lint, `51` arquivos pgTAP/`1085` testes e `supabase:verify` aprovados;
  - fixture funcional local aprovada em `558` segundos.
- riscos restantes:
  - `supabase_vector` reinicia localmente, sem bloquear os gates;
  - dependencias npm ainda exigem hardening auditado;
  - `/cs/portfolio` ainda nao possui screen spec nem interface.
- proximo lote: corrigir dependencias vulneraveis; depois especificar e implementar `/cs/portfolio` read-only.

### Project Takeover Checkpoint
- data: `2026-06-09`
- branch: `codex/mvp-operational-completion-goal`
- objetivo: consolidar a recuperacao pos-formatacao, registrar riscos atuais e definir a ordem oficial de retomada.
- documentos:
  - `docs/reports/PROJECT_TAKEOVER_CHECKPOINT_2026-06-09.md`
  - `docs/superpowers/plans/2026-06-09-project-stabilization-and-resumption.md`
  - `docs/PROJECT_STATE.md`
  - `docs/GOAL_EXECUTION_PLAN.md`
  - `docs/README.md`
- evidencias:
  - HEAD local `0e9ff70`;
  - 239 commits a frente de `origin/main`;
  - branch recuperada ainda ausente no remoto;
  - contracts typecheck, web typecheck, web build e integridade Git aprovados;
  - Supabase local pendente por ausencia de Docker.
- prioridade:
  - preservar historico remoto;
  - remover material de autenticacao local literal;
  - restaurar baseline Supabase;
  - reconciliar documentacao;
  - somente depois especificar `/cs/portfolio`.
- boundaries:
  - sem push, deploy, migration remota ou alteracao de secrets;
  - sem runtime de produto novo;
  - sem UI CS neste lote documental.
- status posterior: superado pelo baseline registrado em `docs/reports/POST_RECOVERY_BASELINE_2026-06-09.md`.

### CS Portfolio Contract Foundation 2026-06-04
- fase: `CS Portfolio Contract Foundation`
- nome: `CS Portfolio Read Model Backend First`
- commit: registrado no fechamento do sublote
- branch: `codex/mvp-operational-completion-goal`
- data: `2026-06-04`
- resumo funcional: criado o primeiro contrato backend-first de CS Portfolio com `vw_cs_customer_portfolio` e gate `app_private.can_access_cs_customer_portfolio`, usando membership ativa por tenant na area `customer_success`. O corte nao cria rota `/cs`, UI, mutation, health score canonico, billing/financeiro ou role global nova.
- documentos alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/reports/CS_PORTFOLIO_CONTRACT_FOUNDATION_2026-06-04.md`
  - `docs/reports/MVP_OPERATIONAL_COMPLETION_GOAL_REPORT_2026-06-02.md`
- arquivos técnicos alterados:
  - `packages/contracts/src/index.ts`
  - `packages/contracts/src/ticketing.ts`
  - `supabase/migrations/20260604193000_cs_portfolio_contract_foundation.sql`
  - `supabase/tests/004_phase1_2_function_audit.sql`
  - `supabase/tests/048_cs_portfolio_contract_foundation.sql`
- views/RPCs afetadas:
  - criada: `vw_cs_customer_portfolio`
  - criada: `app_private.can_access_cs_customer_portfolio`
  - nenhuma RPC `rpc_cs_*` criada.
- telas afetadas:
  - nenhuma.
- validações:
  - `git status --short`
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:wait:ready`
  - `npm run supabase:lint:db`
  - `npm run supabase:db:reset`
  - `supabase test db --local supabase/tests/048_cs_portfolio_contract_foundation.sql`
  - `npm run supabase:test:db`
  - `npm run documentation:validate:internal-docs`
- riscos restantes:
  - `/cs/portfolio` ainda depende de blueprint, gate de rota e UI read-only propria.
  - health score, follow-ups, tarefas, projetos e plano de acao continuam fora do contrato.
  - se produto exigir role global dedicada de CS, o gate atual precisara evoluir.
- impacto para FAQ futura:
  - permite explicar que CS Portfolio nasce por contrato backend e membership tenant-aware na area Customer Success, sem virar copia do suporte ou dashboard com health inventado.

### CS Workspace Readiness Audit 2026-06-04
- fase: `CS Workspace Readiness Audit`
- nome: `CS Portfolio Contract Readiness`
- commit: registrado no fechamento do sublote
- branch: `codex/mvp-operational-completion-goal`
- data: `2026-06-04`
- resumo funcional: auditoria documental e tecnica confirmou que CS Workspace/Portfolio ainda nao possui contrato executavel proprio (`vw_cs_*`/`rpc_cs_*`), role/gate dedicado, rota `/cs` ou blueprint aprovado. O sublote bloqueia UI CS imediata e recomenda fundacao backend-first antes de runtime.
- documentos alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/reports/CS_WORKSPACE_READINESS_AUDIT_2026-06-04.md`
  - `docs/reports/MVP_OPERATIONAL_COMPLETION_GOAL_REPORT_2026-06-02.md`
- arquivos técnicos alterados:
  - nenhum.
- views/RPCs afetadas:
  - nenhuma view/RPC criada ou alterada.
  - auditadas como ausentes: `vw_cs_customer_portfolio`, `vw_cs_customer_health_summary`, `rpc_cs_*`.
- telas afetadas:
  - nenhuma.
- validações:
  - `git status --short`
  - busca textual em docs, migrations, contratos TS, router e navegacao
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db`
  - `npm run documentation:validate:internal-docs`
- riscos restantes:
  - decisao pendente sobre role propria de CS versus membership de area `customer_success`.
  - decisao pendente sobre health score, follow-ups, tarefas/projetos de CS e boundary com suporte.
  - `/cs/portfolio` permanece bloqueado ate contrato backend real.
- impacto para FAQ futura:
  - permite explicar que CS sera workspace proprio governado por contrato, e nao uma copia da carteira de suporte ou dashboard com indicadores inventados.

### OCP V1-E Support Customer Product Context UI 2026-06-04
- fase: `OCP V1-E Support Customer Product Context UI`
- nome: `Support Customer Profile Read-only Product Context`
- commit: registrado no fechamento do sublote
- branch: `codex/mvp-operational-completion-goal`
- data: `2026-06-04`
- resumo funcional: `/support/customers` e `/support/customers/:tenantId` passaram a consumir `vw_support_customer_product_context` para mostrar produto, plano, status da subscription, datas, features visiveis ao suporte e responsaveis internos no perfil operacional do cliente. A superficie permanece read-only para subscriptions no suporte.
- documentos alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/MVP_OPERATIONAL_COMPLETION_GOAL_REPORT_2026-06-02.md`
- arquivos técnicos alterados:
  - `apps/web/src/contracts/support-contracts.ts`
  - `apps/web/src/features/support/support-api.ts`
  - `apps/web/src/features/support/SupportWorkspacePage.tsx`
- views/RPCs afetadas:
  - consumida em leitura: `vw_support_customer_product_context`
  - nenhuma RPC de subscription consumida pela superficie de suporte.
- telas afetadas:
  - `/support/customers`
  - `/support/customers/:tenantId`
- validações:
  - `git status --short`
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db`
  - smoke autenticado em `/support/customers` e `/support/customers/:tenantId`
- riscos restantes:
  - Customer Account/Profile ainda nao possui fluxo de CS dedicado.
  - suporte nao altera subscription, entitlement ou owner neste corte.
  - billing, preco, invoice, payment, revenue e financeiro permanecem fora do dominio exposto.
- impacto para FAQ futura:
  - permite explicar que o suporte enxerga contexto de produto contratado por read model seguro, sem administrar contrato ou financeiro.

### OCP V1-E Admin Subscriptions Governed Mutations UI 2026-06-04
- fase: `OCP V1-E Admin Subscriptions Governed Mutations UI`
- nome: `Admin Subscription Create Update Archive via Existing RPCs`
- commit: registrado no fechamento do sublote
- branch: `codex/mvp-operational-completion-goal`
- data: `2026-06-04`
- resumo funcional: `/admin/tenants`, aba `Subscriptions`, passou a permitir criação, edição governada e arquivamento de subscriptions usando somente RPCs administrativas V1-E existentes e catálogo comercial por read model. Features comerciais e responsáveis internos permanecem em leitura neste corte.
- documentos alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/MVP_OPERATIONAL_COMPLETION_GOAL_REPORT_2026-06-02.md`
- arquivos técnicos alterados:
  - `apps/web/src/contracts/admin-contracts.ts`
  - `apps/web/src/features/admin/admin-api.ts`
  - `apps/web/src/features/tenants/TenantsPage.tsx`
- views/RPCs afetadas:
  - consumidas em leitura: `vw_admin_commercial_products`
  - consumida em leitura: `vw_admin_commercial_product_detail`
  - consumida em leitura: `vw_admin_customer_product_subscriptions`
  - consumida em leitura: `vw_admin_customer_product_subscription_detail`
  - consumida em escrita: `rpc_admin_create_customer_product_subscription`
  - consumida em escrita: `rpc_admin_update_customer_product_subscription`
  - consumida em escrita: `rpc_admin_archive_customer_product_subscription`
- telas afetadas:
  - `/admin/tenants`, aba `Subscriptions` no detalhe do cliente.
- validações:
  - `git status --short`
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:wait:ready`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db`
  - smoke autenticado em `/admin/tenants` > `Support QA Tenant A Operação Enterprise` > `Subscriptions`
- riscos restantes:
  - mutações de entitlement e owner continuam fora deste sublote.
  - billing, preço, invoice, payment, revenue e financeiro permanecem fora do domínio V1-E atual.
  - integração em Customer Account/Profile e CS Workspace ainda precisa de lote próprio.
- impacto para FAQ futura:
  - permite documentar que a administração de subscriptions ocorre por ações governadas e auditáveis no Admin, sem promessa de billing ou financeiro.

### OCP V1-E Subscriptions Read Model Hardening 2026-06-02
- fase: `OCP V1-E Subscriptions Read Model Hardening`
- nome: `Customer Product Subscriptions Aggregate Count Fix`
- branch: `codex/ocp-v1-e-subscriptions-readmodel-hardening`
- data: `2026-06-02`
- resumo funcional: correção backend do read model administrativo `vw_admin_customer_product_subscriptions` para eliminar multiplicação de `active_entitlement_count` e `active_owner_count` causada por joins simultâneos entre entitlements e owners. O shape público da view foi preservado; a UI read-only em `/admin/tenants` continua consumindo o mesmo contrato.
- documentos alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/reports/OCP_V1_E_SUBSCRIPTIONS_READMODEL_HARDENING_2026-06-02.md`
- arquivos técnicos alterados:
  - `supabase/migrations/20260602170000_ocp_v1_e_subscription_readmodel_hardening.sql`
  - `supabase/tests/047_ocp_v1_e_customer_product_subscriptions_foundation.sql`
- views/RPCs afetadas:
  - corrigida: `vw_admin_customer_product_subscriptions`
  - auditada sem mudança de shape: `vw_admin_customer_product_subscription_detail`
  - nenhuma RPC criada ou alterada.
- telas afetadas:
  - nenhuma tela alterada. `/admin/tenants` mantém a aba `Subscriptions` read-only existente.
- validações:
  - `supabase db reset --local --yes`
  - `supabase test db --local supabase/tests/047_ocp_v1_e_customer_product_subscriptions_foundation.sql`
  - `git diff --check`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db`
  - `npm run web:typecheck`
  - `npm run web:build`
- riscos restantes:
  - sem risco conhecido no contador V1-E após cobertura pgTAP de múltiplas features e owners.
  - CS Workspace, Finance Workspace, billing e UI de mutação continuam fora de escopo.
- impacto para FAQ futura:
  - permite afirmar que os contadores administrativos de features e responsáveis por subscription vêm do backend e não são corrigidos ou inferidos no frontend.

### OCP V1-E Subscriptions Read-only UI 2026-06-02
- fase: `OCP V1-E Subscriptions Read-only UI`
- nome: `Admin Customer Product Subscriptions Read-only Consumption`
- branch: `codex/ocp-v1-e-subscriptions-readonly-ui`
- data: `2026-06-02`
- resumo funcional: primeiro consumo frontend read-only dos read models V1-E em `/admin/tenants`, dentro do cockpit existente de cliente B2B. A aba `Subscriptions` exibe produto, plano, status, datas, features comerciais habilitadas e responsáveis internos sem mutações, sem ação fake, sem billing/financeiro e sem criar workspace novo.
- documentos alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/reports/OCP_V1_E_SUBSCRIPTIONS_READONLY_UI_2026-06-02.md`
- views/RPCs afetadas:
  - consumidas em leitura: `vw_admin_customer_product_subscriptions`
  - consumida em leitura: `vw_admin_customer_product_subscription_detail`
  - nenhuma RPC de escrita consumida pela UI.
- telas afetadas:
  - `/admin/tenants`, aba `Subscriptions` no detalhe do cliente.
- validações:
  - `git status --short`
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - smoke local autenticado com `platform_admin` em `/admin/tenants`
- riscos restantes:
  - contador agregado da view de lista V1-E pode multiplicar entitlements/owners quando ambos existem; a UI evita usar esses contadores como informação principal e prioriza o detalhe da subscription.
  - dados V1-E do smoke foram criados apenas no banco local por RPCs reais para validação visual.
- impacto para FAQ futura:
  - permite explicar onde Admin visualiza produto/plano/features/ownership de uma conta B2B, deixando claro que ainda não há billing, financeiro ou mutação aprovada na UI.

### OCP V1-E Customer Product Subscriptions Foundation 2026-06-02
- fase: `OCP V1-E Customer Product Subscriptions Foundation`
- nome: `OCP V1-E Backend Foundation`
- branch: `codex/ocp-v1-e-subscriptions-foundation`
- resumo funcional: fundação backend local para vincular tenant a produto/plano, registrar entitlements comerciais por assinatura e owners internos por subscription. O lote reaproveita o catálogo comercial V1-C, preserva `customer_account_features` como habilitação operacional separada e não implementa billing, UI, deploy remoto ou dados reais.
- documentos alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/OPERATIONAL_CONTROL_PLANE_V1.md`
  - `docs/README.md`
  - `docs/reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_FOUNDATION_2026-06-02.md`
- views/RPCs afetadas:
  - `vw_admin_customer_product_subscriptions`
  - `vw_admin_customer_product_subscription_detail`
  - `vw_admin_customer_product_feature_entitlements`
  - `vw_admin_customer_product_internal_owners`
  - `vw_support_customer_product_context`
  - `rpc_admin_create_customer_product_subscription`
  - `rpc_admin_update_customer_product_subscription`
  - `rpc_admin_archive_customer_product_subscription`
  - `rpc_admin_set_customer_product_feature_entitlement`
  - `rpc_admin_archive_customer_product_feature_entitlement`
  - `rpc_admin_assign_customer_product_internal_owner`
  - `rpc_admin_archive_customer_product_internal_owner`
- validações:
  - `git status --short`
  - `git diff --check`
  - `npm run contracts:typecheck`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db`
- impacto para FAQ futura:
  - registra o modelo canonico de assinatura por cliente/produto/plano e a separação entre produto contratado, entitlement comercial e habilitação operacional.

### OCP V1-E Customer Product Subscriptions Decision & Execution Planning 2026-06-02
- fase: `OCP V1-E Customer Product Subscriptions Decision & Execution Planning`
- nome: `OCP V1-E Decision Record and Execution Plan`
- branch: `codex/goal-mode-readiness-audit`
- resumo funcional: fechamento documental das decisoes tecnicas recomendadas para destravar o lote backend futuro de Customer Product Subscriptions. A decisao trata `After Sale` como produto/plataforma propria, confirma multiproduto por tenant, separa subscription, entitlement comercial governado e ownership interno por subscription, e define um execution plan sem implementar migration/backend/UI.
- documentos alterados:
  - `docs/product/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_DECISION_RECORD.md`
  - `docs/reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_EXECUTION_PLAN.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- validações:
  - `git status --short`
  - busca textual das decisoes principais nos documentos criados
  - `git diff --check`
- impacto para FAQ futura:
  - registra o modelo canonico futuro para cliente B2B, produto, plano, subscription, entitlement comercial e responsaveis internos, preservando backend como source of truth.

### Codex Goal Mode Governance Setup 2026-06-01
- fase: `Codex Goal Mode Governance Setup`
- nome: `Goal Mode Controlled Autonomy Preparation`
- branch: `codex/goal-mode-readiness-audit`
- resumo funcional: preparação documental para uso controlado de Codex Goal Mode (`/goal`) no Genius Support OS. Foram criados `AGENTS.md` como regra permanente de entrada para agentes Codex e `docs/GOAL_EXECUTION_PLAN.md` como camada de orquestração sobre os documentos canônicos, sem criar roadmap concorrente.
- documentos alterados:
  - `AGENTS.md`
  - `docs/GOAL_EXECUTION_PLAN.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/CODEX_GOAL_MODE_READINESS_AUDIT.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- validações:
  - `git status --short`
  - busca textual de referências canônicas, stop conditions e uso controlado de `/goal`
  - `git diff --check`
- impacto para FAQ futura:
  - estabelece a regra operacional para quando usar `/goal`, quando parar e quais documentos ler antes de macro-lotes autônomos.

### Project Forensic Recovery Audit 2026-05-29
- fase: `Project Forensic Recovery Audit`
- nome: `Project Forensic Recovery Audit 2026-05-29`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-05-29`
- resumo funcional: auditoria forense de retomada do repositório sem feature nova. Foram mapeados estado git, estrutura, rotas frontend, consumo de views/RPCs, migrations, RLS/policies/grants, storage, scripts, docs canônicas e validações disponíveis. O lote registrou drift documental, runtime Supabase local bloqueado por Docker indisponível e worktree visual preexistente ainda aberto.
- docs alterados:
  - `docs/reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- telas afetadas:
  - nenhuma tela runtime alterada por este lote.
- riscos restantes:
  - Docker local indisponível impediu validação runtime de Supabase.
  - worktree visual preexistente possui alterações e deleções ainda não classificadas para fechamento.
  - scripts legados de Knowledge mantêm fallback literal de credencial local e precisam hardening em lote próprio.
- impacto na FAQ futura:
  - estabelece o checkpoint de retomada segura, diferenciando estado real validado, pendências de ambiente e backlog antes de novas features.

### Fase 0 pós-auditoria runtime Supabase
- fase: `Fase 0 pós-auditoria runtime Supabase`
- nome: `Runtime Supabase Gate Recovery 2026-05-29`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-05-29`
- resumo funcional: Docker Desktop foi iniciado, a stack Supabase local subiu e os gates runtime de banco foram executados. A causa raiz da falha de `supabase:verify` era readiness hardcoded para portas antigas; o script passou a derivar API e DB do status local do Supabase.
- docs alterados:
  - `docs/reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos técnicos alterados:
  - `scripts/ci/wait-for-supabase-ready.mjs`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- telas afetadas:
  - nenhuma tela runtime alterada.
- validações:
  - `docker version`
  - `docker ps`
  - `npx supabase status`
  - `npm run supabase:start`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db` com 47 arquivos/979 testes
  - `npm run supabase:verify`
- riscos restantes:
  - container local `supabase_vector` reinicia por falha de coleta de logs Docker, sem bloquear gates de banco.
  - serviços opcionais `imgproxy`, `edge_runtime` e `pooler` aparecem parados no status local.
  - Supabase CLI local informa versão mais nova disponível.
- impacto na FAQ futura:
  - registra que o backend local passou pelos gates de RLS/grants/policies/functions/storage e que a falha anterior era de readiness/porta local, não de contrato de produto.

### Worktree Visual/Blueprint Recovery Closure 2026-05-29
- fase: `Worktree Visual/Blueprint Recovery Closure`
- nome: `Worktree Visual/Blueprint Recovery Closure 2026-05-29`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-05-29`
- resumo funcional: fechamento da frente visual/documental herdada de `codex/p4-true-support-visual-refactor`. As mudanças de Support Workspace foram classificadas como alinhadas aos blueprints P4-F.4D; blueprints foram reorganizados por domínio/estado; screenshots históricos versionados foram restaurados; artefatos locais de limpeza foram removidos.
- docs alterados:
  - `docs/reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md`
  - `docs/reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos técnicos alterados:
  - nenhum arquivo técnico novo neste lote; alterações em `apps/web/src/features/support/*` e `apps/web/src/index.css` foram herdadas e classificadas para manter.
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- telas afetadas:
  - `Support Workspace`: fila, novo ticket, ticket workspace, composer e rail direito, sem alteração de contrato de dados.
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run documentation:validate:internal-docs`
  - `git diff --check`
- riscos restantes:
  - screenshots `p4-f4d-*` citados no relatório visual anterior não estavam no índice Git nem no worktree; precisam ser regenerados em QA visual autenticado se forem exigidos como evidência atual.
  - aprovação pixel-a-pixel contra blueprints ainda depende de revisão humana ou lote dedicado de browser QA.
- impacto na FAQ futura:
  - separa o que é reorganização visual canônica, evidência histórica restaurada e artefato local descartado, evitando que o worktree visual seja confundido com lixo ou feature nova.

### P4-F.4D Authenticated Visual QA 2026-05-29
- fase: `P4-F.4D`
- nome: `P4-F.4D Authenticated Visual QA 2026-05-29`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-05-29`
- resumo funcional: QA visual autenticado do Support Workspace com fixture local populada. Foram gerados screenshots atuais `p4-f4d-*`, métricas de viewport/scroll/overflow e comparação contra os blueprints aprovados de suporte.
- docs alterados:
  - `docs/reports/P4_F4D_AUTHENTICATED_VISUAL_QA_2026-05-29.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- evidências geradas:
  - `docs/reports/visual-audit/screenshots/p4-f4d-support-queue.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-support-queue-new-ticket.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-conversation.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-classification.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-knowledge.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-evidence.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-status.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-related.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-internal-actions.png`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo.
- telas afetadas:
  - `Support Workspace`: fila operacional, novo ticket, conversa, composer, rail direito e paineis de acoes rapidas.
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run documentation:validate:internal-docs`
  - `git diff --check`
- riscos restantes:
  - resultado visual `aprovado com ajustes`; existe P1 no fluxo `Novo ticket` por divergencia estrutural contra o blueprint aprovado.
  - aprovacao pixel-a-pixel depende de revisao humana sobre os PNGs gerados.
- impacto na FAQ futura:
  - cria evidencia visual autenticada atual do P4-F.4D e delimita que a pendencia restante e visual, nao backend ou contrato Supabase.

### P4-F.4D Novo Ticket Visual Alignment 2026-05-31
- fase: `P4-F.4D`
- nome: `P4-F.4D Novo Ticket Visual Alignment`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-05-31`
- resumo funcional: microcorrecao visual do fluxo `Novo ticket` em `/support/queue`. O formulario foi compactado para manter descricao/evidencias acima do footer no viewport de referencia, e o rail lateral passou de orientacoes textuais para resumo operacional/SLA com estados `Indisponivel` quando o contrato nao entrega dado antes da criacao.
- docs alterados:
  - `docs/reports/P4_F4D_AUTHENTICATED_VISUAL_QA_2026-05-29.md`
  - `docs/reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos técnicos alterados:
  - `apps/web/src/features/support/SupportWorkspacePage.tsx`
  - `apps/web/src/index.css`
- evidências geradas:
  - `docs/reports/visual-audit/screenshots/p4-f4d-support-queue-new-ticket-aligned.png`
  - `docs/reports/visual-audit/route-metrics/p4-f4d-support-queue-new-ticket-aligned.metrics.json`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo. A criacao continua por `rpc_create_ticket`.
- telas afetadas:
  - `Support Workspace` em `/support/queue`, apenas modal/fluxo `Novo ticket`.
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run documentation:validate:internal-docs`
  - `git diff --check`
- riscos restantes:
  - revisao humana pixel-a-pixel ainda pode pedir ajuste fino.
  - acoes superiores de rascunho/menu do blueprint seguem P2 aceito por ausencia de contrato atual; nenhuma acao fake foi criada.
- impacto na FAQ futura:
  - fecha a divergencia P1 visual do intake sem mudar contrato, permissao, schema ou fluxo funcional de abertura de ticket.

### P4-F.4D Final Human Pixel Review & Worktree Closure 2026-06-01
- fase: `P4-F.4D`
- nome: `P4-F.4D Final Human Pixel Review & Worktree Closure`
- branch: `codex/project-forensic-recovery-audit`
- data: `2026-06-01`
- resumo funcional: revisao visual final pixel-a-pixel do Support Workspace contra os blueprints aprovados de fila, novo ticket, conversa, classificacao, conhecimento, evidencias, status, relacionados e acionamentos. Resultado final aprovado para fechamento do worktree P4-F.4D, sem P0/P1 remanescente.
- docs alterados:
  - `docs/reports/P4_F4D_AUTHENTICATED_VISUAL_QA_2026-05-29.md`
  - `docs/reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md`
  - `docs/reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- evidências consideradas:
  - `docs/reports/visual-audit/screenshots/p4-f4d-support-queue.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-support-queue-new-ticket-aligned.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-conversation.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-classification.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-knowledge.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-evidence.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-status.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-related.png`
  - `docs/reports/visual-audit/screenshots/p4-f4d-ticket-internal-actions.png`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration, policy ou contrato novo. `rpc_create_ticket` segue preservado.
- telas afetadas:
  - `Support Workspace`: revisao final de fila, intake, conversa, composer, tabs e rails.
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run documentation:validate:internal-docs`
  - `git diff --check`
- riscos restantes:
  - P2 aceitos: truncamento de nomes longos em sidebar/fila/inbox e ausencia de rascunho/menu no `Novo ticket` por falta de contrato atual. Nenhuma acao fake foi criada.
  - QA visual usa fixture local; staging/producao seguem fora do escopo.
- impacto na FAQ futura:
  - registra fechamento visual aprovado do cockpit de suporte sem alterar backend, Supabase, contratos ou regras de negocio.

### Fase P4-F.3 - Support Queue Full Operational Refactor
- fase: `P4-F.3`
- nome: `Support Queue Full Operational Refactor`
- branch: `codex/p4-f3-support-queue-operational-refactor`
- data: `2026-05-25`
- resumo funcional: refatorada visualmente `/support/queue` como cockpit operacional de triagem diaria. A tela passou a usar header compacto, faixa de sumario, filtros consolidados, tabela/lista central dominante e painel de contexto mais compacto. A fila deixou de selecionar automaticamente o primeiro ticket em carregamento inicial e removeu acoes falsas/desabilitadas que competiam com o fluxo real.
- docs alterados:
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P4_SUPPORT_QUEUE_OPERATIONAL_REFACTOR_2026-05-25.md`
  - `docs/reports/visual-audit/screenshots/p4-f3-support-queue-*.png`
  - `docs/reports/visual-audit/route-metrics/p4-f3-support-queue-*-metrics.json`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - `/support/queue`
- riscos restantes:
  - primitives ainda sao locais ao dominio Support e devem ser promovidas somente depois de validacao em mais telas.
  - a tabela ainda usa as colunas do contrato atual; proximos lotes podem ajustar apresentacao sem alterar negocio.
  - PNGs de blueprint pendentes fora do escopo continuam sem stage por este lote.
- impacto na FAQ futura:
  - registra que a fila e superficie de triagem operacional, nao dashboard decorativo nem lista secundaria comprimida.

### Fase P4-F.2 - Support Intake Layout Refactor
- fase: `P4-F.2`
- nome: `Support Intake Layout Refactor + Minimal Operational Primitives`
- branch: `codex/p4-f2-support-intake-layout-refactor`
- data: `2026-05-25`
- resumo funcional: substituido o intake estreito de novo ticket em `/support/queue` por modal operacional amplo. O lote inicia uma base visual operacional mais flexivel para os proximos dominios, criando primitives locais que evitam dependencia automatica de tres colunas, drawer lateral, cards inflados e controles grandes demais.
- docs alterados:
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P4_SUPPORT_INTAKE_LAYOUT_REFACTOR_2026-05-25.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - `/support/queue`
- riscos restantes:
  - as primitives ainda estao no dominio Support e devem ser promovidas para contrato compartilhado somente apos validacao em mais telas operacionais.
  - os proximos lotes devem refatorar fila, ticket workspace, customer 360, Admin, Internal Actions, Engineering, Portal e Public Help conforme objetivo operacional de cada tela.
- impacto na FAQ futura:
  - registra que abertura de ticket e operacao central, nao acao secundaria comprimida em drawer.

### Fase P4-F.1 - Visual System Constraint Audit
- fase: `P4-F.1`
- nome: `Visual System Constraint Audit`
- branch: `codex/p4-f1-visual-system-constraint-audit`
- data: `2026-05-25`
- resumo funcional: auditado o sistema visual do MVP para identificar por que telas operacionais ainda nao seguem fielmente os blueprints aprovados. Foram capturados screenshots e metricas de scroll em rotas Admin, Support, Portal, Internal Actions, Engineering e Public Help. A auditoria concluiu que os principais bloqueios sao primitives genericas infladas, drawers como padrao de acao, cardizacao excessiva, tokens incompletos e tendencia a tres colunas fora do contexto correto.
- docs alterados:
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P4_VISUAL_SYSTEM_CONSTRAINT_AUDIT_2026-05-24.md`
  - `docs/reports/visual-audit/component-constraints.md`
  - `docs/reports/visual-audit/screen-priority-backlog.md`
  - `docs/reports/visual-audit/screenshots/*`
  - `docs/reports/visual-audit/route-metrics/*`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - nenhuma tela runtime alterada; auditoria cobriu Support, Admin, Portal, Internal Actions, Engineering e Public Help.
- riscos restantes:
  - o proximo lote deve corrigir primeiro o intake de novo ticket em `/support/queue`, sem alterar backend.
  - mexer em primitives globais sem migracao incremental pode causar regressao visual em Admin e areas internas.
- impacto na FAQ futura:
  - registra que o MVP deve prometer operacao real e clara, nao layout generico de dashboard, drawer comprimido ou blueprint parcialmente aplicado.

### Fase P4-E.1 - Blueprint Asset Consolidation & Worktree Cleanup
- fase: `P4-E.1`
- nome: `Blueprint Asset Consolidation & Worktree Cleanup`
- branch: `codex/p4-e1-blueprint-asset-cleanup`
- data: `2026-05-24`
- resumo funcional: consolidados os PNGs de blueprint pendentes do Support Workspace. Os blueprints canonicos `fila operacional.png` e `tickets e conversas.png` foram preservados como referencias aprovadas; as variantes temporarias `tickets e conversas NEW*.png` foram removidas por duplicidade, ausencia de referencias documentais e presenca de acoes fora do MVP. O screen spec de tickets passou a apontar para o blueprint canonico sem promessa de canal externo ativo.
- docs alterados:
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/design/screens/SUPPORT_TICKET_WORKSPACE.md`
  - `docs/design/blueprint/suporte/fila operacional.png`
  - `docs/design/blueprint/suporte/tickets e conversas.png`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - nenhuma tela runtime alterada; apenas assets e spec visual do Support Workspace.
- riscos restantes:
  - `tickets e conversas omni.png` permanece preservado como referencia historica, mas deixou de ser fonte canonica do screen spec por sugerir canais externos ativos fora do MVP.
- impacto na FAQ futura:
  - documenta que a referencia visual de suporte do MVP deve representar conversa operacional governada por origem/canal, sem prometer omni/provider externo ativo.

### Fase P4-E - Staging Environment Authorization & Remote Dry Run
- fase: `P4-E`
- nome: `Staging Environment Authorization & Remote Dry Run`
- branch: `codex/p4-e-staging-environment-authorization`
- data: `2026-05-24`
- resumo funcional: preparada a camada de autorizacao para dry run remoto em staging. A auditoria confirmou que nao ha staging explicitamente configurado, project ref staging versionado, URL staging autorizada ou autorizacao humana preenchida; por isso nenhum comando remoto, deploy, db push, migration, query remota, secret, provider ou IA real foi executado. Gates locais e smoke local passaram.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/release/STAGING_ENVIRONMENT_AUTHORIZATION_CHECKLIST_2026-05-24.md`
  - `docs/release/STAGING_REMOTE_DRY_RUN_EVIDENCE_2026-05-24.md`
  - `docs/reports/P4_STAGING_ENVIRONMENT_AUTHORIZATION_2026-05-24.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - nenhuma tela alterada; smoke local validou Admin, Support, Portal, Public Help, Internal Actions e Engineering.
- riscos restantes:
  - staging permanece bloqueado ate autorizacao humana com URL, project ref, credenciais QA, comandos permitidos e confirmacao de que nao e producao.
  - observabilidade remota ainda precisa ser confirmada no ambiente alvo.
  - um PNG de blueprint modificado fora do escopo segue pendente no worktree e nao foi commitado.
- impacto na FAQ futura:
  - documenta a regra de que piloto staging exige autorizacao explicita e comandos nao destrutivos antes de qualquer execucao remota.

### Fase P4-D - Staging Pilot Candidate + Public Copy Safety Pass
- fase: `P4-D`
- nome: `Staging Pilot Candidate + Public Copy Safety Pass`
- branch: `codex/p4-d-staging-pilot-candidate`
- data: `2026-05-24`
- resumo funcional: auditado o ambiente de staging e confirmado que nao ha staging explicitamente configurado no repositorio. Nenhum deploy remoto, db push remoto, migration remota, secret ou dado real foi usado. Os gates locais passaram e a copy publica legada de Avatar/IA em Public Help foi substituida por orientacao baseada em artigos e suporte pelo Portal.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/PRODUCT_VISION.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/release/STAGING_PILOT_CANDIDATE_CHECKLIST_2026-05-24.md`
  - `docs/release/PUBLIC_COPY_SAFETY_REVIEW_2026-05-24.md`
  - `docs/reports/P4_STAGING_PILOT_CANDIDATE_2026-05-24.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - `/help/genius` teve ajuste de copy publica sem redesign e sem criar funcionalidade.
- riscos restantes:
  - staging execution segue bloqueado ate existir ambiente explicitamente configurado e autorizado.
  - observabilidade continua minima/manual.
  - revisao humana final continua obrigatoria antes de cliente real.
- impacto na FAQ futura:
  - documenta que a experiencia publica do MVP promete Central de Ajuda, artigos, tickets e suporte pelo Portal, nao Avatar, chatbot ou IA ativa.

### Fase P4-C - Controlled Pilot Dry Run & Release Candidate Gate
- fase: `P4-C`
- nome: `Controlled Pilot Dry Run & Release Candidate Gate`
- branch: `codex/p4-c-controlled-pilot-dry-run`
- data: `2026-05-24`
- resumo funcional: executado dry run local do piloto MVP usando o pacote de release readiness P4-B. Todos os gates tecnicos passaram, a fixture funcional concluiu duas vezes, o smoke browser validou Admin, Support, Portal, Internal Actions, Engineering e Public Help, e a decisao foi GO para piloto controlado local/staging com evidencias textuais.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/release/PILOT_DRY_RUN_EVIDENCE_2026-05-24.md`
  - `docs/reports/P4_CONTROLLED_PILOT_DRY_RUN_2026-05-24.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - nenhuma tela alterada; o dry run validou `/admin/system`, `/support/queue`, `/support/tickets/:ticketId`, `/portal`, `/portal/tickets/:ticketId`, `/portal/help`, `/internal-actions`, `/engineering`, `/engineering/work-items/:workItemId`, `/help/genius` e artigos publicos.
- riscos restantes:
  - repetir gates no ambiente alvo antes de qualquer piloto staging.
  - risco de copy publica de Avatar AI tratado no P4-D por ajuste cirurgico em Public Help.
  - observabilidade segue minima/manual neste corte.
- impacto na FAQ futura:
  - documenta o criterio objetivo de release candidate e os limites de Go/No-Go para piloto controlado.

### Fase P4-B - MVP Release Readiness & Pilot Control Pack
- fase: `P4-B`
- nome: `MVP Release Readiness & Pilot Control Pack`
- branch: `codex/p4-b-mvp-release-readiness`
- data: `2026-05-24`
- resumo funcional: criado pacote operacional para piloto controlado do MVP, sem feature nova, migration, backend, frontend, fixture, deploy, secrets, provider externo ou IA real. O lote formalizou matriz de regressao, checklist de release, plano de rollback, observabilidade minima, smoke runbook e Go/No-Go para ambiente local/staging.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/PRODUCT_VISION.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/release/MVP_REGRESSION_MATRIX_2026-05-24.md`
  - `docs/release/MVP_RELEASE_CHECKLIST_2026-05-24.md`
  - `docs/release/MVP_ROLLBACK_PLAN_2026-05-24.md`
  - `docs/release/MVP_OBSERVABILITY_MINIMUM_2026-05-24.md`
  - `docs/release/MVP_SMOKE_TEST_RUNBOOK_2026-05-24.md`
  - `docs/reports/P4_MVP_RELEASE_READINESS_2026-05-24.md`
- views/RPCs afetadas:
  - nenhuma view, RPC, tabela, migration ou contrato novo.
- telas afetadas:
  - nenhuma tela alterada; o pacote documenta smoke de Admin, Support, Portal, Internal Actions, Engineering e Public Help.
- riscos restantes:
  - release remoto/staging ainda precisa execucao controlada do runbook e decisao humana Go/No-Go.
  - observabilidade continua minima/manual neste corte.
  - QA exploratorio humano continua recomendado antes de ampliar piloto.
- impacto na FAQ futura:
  - permite explicar quais gates, boundaries e responsabilidades precisam estar satisfeitos antes de piloto MVP.

### Fase P4-A - MVP Operational Closure & End-to-End Workflow Hardening
- fase: `P4-A`
- nome: `MVP Operational Closure & End-to-End Workflow Hardening`
- branch: `codex/p4-a-mvp-operational-closure`
- data: `2026-05-24`
- resumo funcional: validado o fluxo MVP ponta a ponta sem criar feature nova. Cliente cria ticket pelo Portal, suporte recebe e responde, nota interna não vaza, Knowledge público é enviado, área interna recebe/devolve acionamento, engenharia recebe/devolve update, Portal vê apenas conteúdo customer-facing e Admin mostra readiness de canais/AI sem provider ou automação real.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/PRODUCT_VISION.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/CUSTOMER_PORTAL_SECURE_EVIDENCE_UPLOAD_V3.md`
  - `docs/ENGINEERING_WORKSPACE_OPERATIONAL_CORE_V3.md`
  - `docs/INTERNAL_ACTIONS_V1_STATUS_REPORT.md`
  - `docs/AI_NATIVE_OPERATIONAL_READINESS.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P4_MVP_OPERATIONAL_CLOSURE_2026-05-24.md`
- views/RPCs afetadas:
  - nenhuma migration ou contrato novo; validação integrada de contratos existentes de Portal, Support, Knowledge, Internal Actions, Engineering, Channel Governance e AI readiness.
- telas afetadas:
  - `/admin/tenants`
  - `/admin/customer-portal`
  - `/admin/internal-areas`
  - `/admin/knowledge`
  - `/admin/system`
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
  - `/portal`
  - `/portal/tickets/:ticketId`
  - `/portal/help/:articleSlug`
  - `/internal-actions`
  - `/internal-actions/:actionId`
  - `/engineering/work-items/:workItemId`
  - `/help/genius/articles/:articleSlug`
- riscos restantes:
  - fixture funcional é pesada em Windows local e precisa de timeout maior.
  - QA exploratório humano ainda é recomendado antes de release interno amplo.
- impacto na FAQ futura:
  - permite documentar o fluxo MVP real de atendimento B2B de ponta a ponta e os limites de visibilidade do cliente.

### Fase P3-B - AI Readiness Admin Visibility + Functional Fixture Reliability
- fase: `P3-B`
- nome: `AI Readiness Admin Visibility + Functional Fixture Reliability`
- branch: `codex/p3-b-ai-readiness-admin-fixture-reliability`
- data: `2026-05-24`
- resumo funcional: estabilizada a fixture funcional local com timeouts e logs por etapa para evitar espera infinita sem diagnostico; `/admin/system` agora mostra readiness AI-native compacto e honesto por views existentes, mantendo IA real inativa e sem provider/modelo/embedding/job/Copilot/segredo.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/AI_GOVERNANCE.md`
  - `docs/AI_NATIVE_OPERATIONAL_READINESS.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P3_AI_READINESS_ADMIN_VISIBILITY_AND_FIXTURE_RELIABILITY_2026-05-24.md`
- views/RPCs afetadas:
  - `vw_ai_operational_context_readiness`
  - `vw_ai_context_source_policies`
  - `vw_ai_action_policies`
  - nenhuma migration, tabela ou RPC nova.
- telas afetadas:
  - `/admin/system`
- riscos restantes:
  - IA real segue dependente de provider/modelo aprovado, redaction, prompt evaluation, opt-in, kill switch, monitoramento, custo/rate limit e política de retenção.
  - A fixture ainda depende da saúde do Supabase local e Edge Runtime, mas agora falha com etapa identificável.
- impacto na FAQ futura:
  - permite explicar que o Admin mostra readiness de IA governada sem ativar automação, e que fixtures locais têm diagnóstico operacional para QA autenticado.

### Fase P3 - AI-Native Operational Readiness Foundation
- fase: `P3`
- nome: `AI-Native Operational Readiness Foundation`
- branch: `codex/p3-ai-native-operational-readiness-foundation`
- data: `2026-05-24`
- resumo funcional: criada fundacao AI-native, human-governed sem integrar LLM, provider, embedding, chatbot, vector database ou automacao. O backend passa a ter catalogo de fontes, catalogo de acoes, ledger de uso/revisao humana, read models `vw_ai_*` e RPCs de validacao/log/revisao. IA permanece sem poder enviar resposta, publicar artigo, alterar status, criar delivery, criar engenharia/internal action, alterar entitlement/RLS, ler storage path ou ler segredo.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/PRODUCT_VISION.md`
  - `docs/AI_GOVERNANCE.md`
  - `docs/AI_NATIVE_OPERATIONAL_READINESS.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P3_AI_NATIVE_OPERATIONAL_READINESS_2026-05-24.md`
- views/RPCs afetadas:
  - `ai_context_source_policies`
  - `ai_action_policies`
  - `ai_usage_audit_events`
  - `vw_ai_context_source_policies`
  - `vw_ai_action_policies`
  - `vw_ai_operational_context_readiness`
  - `vw_ai_support_ticket_context_readiness`
  - `vw_ai_customer_account_context_readiness`
  - `vw_ai_knowledge_context_readiness`
  - `vw_ai_usage_audit_events`
  - `rpc_ai_validate_context_access`
  - `rpc_ai_log_usage_event`
  - `rpc_ai_register_human_review_decision`
- telas afetadas:
  - nenhuma tela nova; readiness fica contratual/documental nesta fase para evitar placeholder de IA real.
- riscos restantes:
  - IA real ainda exige provider/modelo aprovado, redaction avaliada, prompt evaluation, rate limits, custo, monitoramento, opt-in, kill switch e politica de retencao.
- impacto na FAQ futura:
  - permite explicar que o produto foi preparado para IA governada por fontes, permissao, citacao, auditoria e revisao humana, mas sem automacao ativa.

### Fase P2-C - Communication Channel Governance & Provider Readiness
- fase: `P2-C`
- nome: `Communication Channel Governance & Provider Readiness`
- branch: `codex/p2-c-communication-channel-governance-readiness`
- data: `2026-05-24`
- resumo funcional: criada governanca de readiness de canais por tenant sem provider externo real. `customer_portal` permanece como unico canal ativo do MVP; e-mail, WhatsApp, chat e API ficam futuros/bloqueados sem segredo, token, webhook, job, retry ou envio externo.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P2_COMMUNICATION_CHANNEL_GOVERNANCE_READINESS_2026-05-24.md`
- views/RPCs afetadas:
  - `communication_channel_definitions`
  - `tenant_communication_channel_settings`
  - `vw_admin_communication_channel_readiness`
  - `vw_support_tenant_communication_capabilities`
  - `vw_support_ticket_channel_readiness`
  - `vw_support_ticket_channel_context`
  - `vw_support_ticket_communication_capabilities`
  - `vw_support_ticket_delivery_capabilities`
  - `vw_admin_communication_delivery_summary`
  - `vw_admin_system_audit_events`
  - `rpc_admin_update_tenant_channel_readiness`
  - `rpc_admin_disable_tenant_channel`
  - `rpc_admin_mark_channel_future_ready`
- telas afetadas:
  - `/admin/system`
  - `/support/tickets/:ticketId`
- riscos restantes:
  - provider real ainda exige lote proprio de secrets, webhook, consentimento, templates, retry, idempotencia e observabilidade.
  - configuracao real de provider permanece fora do MVP.
- impacto na FAQ futura:
  - permite explicar que o Portal e o canal real atual e que demais canais estao preparados por contrato, mas ainda nao enviam mensagens externas.

### Fase P2-B - Communication Delivery Readiness & Outbox Foundation
- fase: `P2-B`
- nome: `Communication Delivery Readiness & Outbox Foundation`
- branch: `codex/p2-b-communication-delivery-readiness`
- data: `2026-05-23`
- resumo funcional: criada fundacao auditavel de delivery customer-facing sem provider externo. `ticket_message_deliveries` registra disponibilidade nativa no Portal para mensagens publicas; email, WhatsApp, chat e API permanecem bloqueados como canais futuros sem provider.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P2_COMMUNICATION_DELIVERY_READINESS_2026-05-23.md`
- views/RPCs afetadas:
  - `ticket_message_deliveries`
  - `vw_support_ticket_message_deliveries`
  - `vw_support_ticket_delivery_capabilities`
  - `vw_customer_portal_ticket_delivery_state`
  - `vw_admin_communication_delivery_summary`
  - `vw_support_ticket_timeline`
  - `vw_support_ticket_timeline_recent`
  - `vw_customer_portal_ticket_timeline`
  - `rpc_add_ticket_message`
  - `rpc_customer_add_ticket_message`
  - `rpc_support_get_ticket_timeline`
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `/portal/tickets/:ticketId`
- riscos restantes:
  - provider real, retry, webhooks, reconciliacao e outbox externa seguem fora de escopo.
  - configuracao administrativa de provider nao existe e nao deve ser simulada.
- impacto na FAQ futura:
  - permite explicar que respostas customer-facing ficam disponiveis no Portal hoje, enquanto e-mail/WhatsApp/chat/API exigem contrato de provider futuro.

### Fase P2 - Ticket Intake, Sources & Communication Foundation
- fase: `P2`
- nome: `Ticket Intake, Sources & Communication Foundation`
- branch: `codex/p2-ticket-intake-sources-communication-foundation`
- data: `2026-05-23`
- resumo funcional: consolidada a fundacao de origem, canal e comunicacao de tickets sem integrar canais externos. O backend normaliza source/channel, projeta capacidade de resposta, grava metadata de direcao/canal em mensagens/eventos e bloqueia canais futuros como email/chat/API com motivo operacional. Support e Portal consomem labels seguros por read models.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P2_TICKET_INTAKE_SOURCES_COMMUNICATION_FOUNDATION_2026-05-23.md`
- views/RPCs afetadas:
  - `vw_admin_ticket_channel_definitions`
  - `vw_support_ticket_channel_context`
  - `vw_support_ticket_communication_capabilities`
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_ticket_timeline`
  - `vw_support_ticket_timeline`
  - `vw_support_ticket_timeline_recent`
  - `vw_customer_portal_ticket_list`
  - `vw_customer_portal_ticket_detail`
  - `vw_customer_portal_ticket_timeline`
  - `rpc_create_ticket`
  - `rpc_add_ticket_message`
  - `rpc_add_internal_ticket_note`
  - `rpc_support_get_ticket_timeline`
  - `rpc_customer_create_ticket`
  - `rpc_customer_add_ticket_message`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/portal/tickets`
  - `/portal/tickets/:ticketId`
- riscos restantes:
  - `tickets.source` ainda concentra origem/canal no schema base; tabela dedicada de canais pode ser necessária quando provider externo real existir.
  - email/chat/API continuam preparados e bloqueados, sem delivery, inbox, retry ou integração externa.
- impacto na FAQ futura:
  - permite explicar de onde veio um ticket e por qual canal ele pode receber resposta hoje, diferenciando comunicacao real do portal/suporte manual de canais externos futuros.

### Fase P1 - Customer Account Operations Buildout
- fase: `P1`
- nome: `Customer Account Operations Buildout`
- branch: `codex/p1-customer-account-operations-buildout`
- data: `2026-05-22`
- resumo funcional: fechada a operacao minima de Conta B2B/Customer Account com contratos backend-first, aba `Conta B2B` em `/admin/tenants`, CRUD governado parcial de profile/integracoes/customizacoes/alertas/features, fixture funcional local enriquecida e boundary do Portal preservado.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/CUSTOMER_ACCOUNT_PROFILE_SPEC.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P1_CUSTOMER_ACCOUNT_OPERATIONS_BUILDOUT_2026-05-22.md`
- views/RPCs afetadas:
  - `vw_admin_customer_account_profile_detail`
  - `vw_admin_customer_account_integrations`
  - `vw_admin_customer_account_customizations`
  - `vw_admin_customer_account_alerts`
  - `vw_admin_customer_account_features`
  - `vw_support_customers_list`
  - `vw_support_customer_detail`
  - `rpc_admin_archive_customer_integration`
  - `rpc_admin_archive_customer_customization`
  - `rpc_admin_update_customer_account_alert`
- telas afetadas:
  - `/admin/tenants`
  - `/support/customers`
  - `/support/customers/:tenantId`
  - `/support/tickets/:ticketId`
- riscos restantes:
  - Admin ainda nao possui onboarding governado novo de usuario customer-facing; `/admin/customer-portal` continua usando contratos existentes de role/status.
  - Edicao fina inline de registros existentes pode evoluir em lote menor; o contrato backend ja cobre update/archive.
- impacto na FAQ futura:
  - permite descrever a Conta B2B como fonte operacional interna de produto, plano, stack, customizacoes, alertas e features, separada do Portal Cliente e sem expor dados sensiveis.

### Fase P0-B - Boundary QA + Safe Knowledge Link
- fase: `P0-B`
- nome: `Boundary QA + Safe Knowledge Link`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-22`
- resumo funcional: o envio/copia de link publico de Knowledge no Support Workspace foi endurecido para depender apenas de contrato backend-safe. O picker geral e a view de candidatos publicos agora projetam `can_send_to_customer`, `reason_if_blocked`, `article_status`, `article_visibility` e `public_article_path`; o frontend bloqueia copia/envio quando qualquer requisito falha.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/TICKET_KNOWLEDGE_LINKING_SPEC.md`
  - `docs/KNOWLEDGE_ADMIN_OPERATIONAL_GOVERNANCE_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/P0_BOUNDARY_QA_AND_SAFE_KNOWLEDGE_LINK_2026-05-22.md`
- views/RPCs afetadas:
  - `vw_support_knowledge_article_picker`
  - `vw_support_knowledge_public_link_candidates`
  - nenhuma RPC nova
- telas afetadas:
  - `/support/tickets/:ticketId`
- riscos restantes:
  - QA browser autenticado continua dependente da fixture local e da disponibilidade do servidor de desenvolvimento.
- impacto na FAQ futura:
  - confirma que links enviados pelo suporte podem ser descritos como publicos apenas quando o backend declarar artigo `published/public` e rota publica segura.

### Fase - Support Workspace Stabilization And Extraction
- fase: `support-workspace`
- nome: `Support Workspace Stabilization And Extraction`
- branch: `workspace-atual`
- data: `2026-05-22`
- resumo funcional: o Support Workspace foi estabilizado e parcialmente desmonolitizado sem alterar backend, contratos ou regra de negócio. O lote restaurou `web:typecheck` e `web:build`, corrigiu corte inferior e scroll do rail/context slot, revalidou QA autenticado com `support_manager`, extraiu fila/header/conversa/composer/rail/context slot/painéis avançados/helpers para componentes e libs dedicadas, e deixou `SupportWorkspacePage.tsx` em cerca de 7.2k linhas.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/design/FRONTEND_VISUAL_GOVERNANCE.md`
  - `docs/reports/SUPPORT_WORKSPACE_HANDOFF_2026-05-22.md`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets`
  - `/support/tickets/:ticketId`
- views/RPCs afetadas:
  - nenhuma view criada ou alterada nesta frente
  - nenhuma RPC criada ou alterada nesta frente
  - fixture QA local reutilizada via `npm run supabase:qa:local-support-fixture`
- validacao:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:test:db` no fechamento do bloco de QA local
  - `npm run supabase:lint:db` no fechamento do bloco de QA local
  - QA autenticado com `qa.local.support-manager-a@genius.local`
- riscos restantes:
  - `SupportWorkspacePage.tsx` ainda concentra orquestração demais
  - existe drift visual atual do cockpit, especialmente no header geral, peso do rail e dominância da conversa
  - o fluxo de QA depende de usar ticket atual da fila após reidratar fixture; UUID antigo pode falhar por stale data
- impacto na FAQ futura:
  - consolida a base operacional do cockpit de suporte e a disciplina de validação real com perfil de suporte, sem depender apenas de `platform_admin`

### Fase - Knowledge Manual Article Editor V1
- fase: `knowledge-admin`
- nome: `Knowledge Manual Article Editor V1`
- branch: `workspace-atual`
- data: `2026-05-21`
- resumo funcional: criada a rota dedicada `/admin/knowledge/new` para criação manual de artigos, mantendo `/admin/knowledge` como cockpit/listagem. O editor salva rascunho por RPC administrativa v2, envia para revisão por RPC administrativa v2 e não publica conteúdo.
- docs alterados:
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge`
  - `/admin/knowledge/new`
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - utilizadas RPCs existentes: `rpc_admin_create_knowledge_article_draft_v2`, `rpc_admin_update_knowledge_article_draft_v2`, `rpc_admin_submit_knowledge_article_for_review_v2`
  - leitura administrativa por `vw_admin_knowledge_spaces`, `vw_admin_knowledge_categories_v2` e `vw_admin_knowledge_article_assets`
- riscos restantes:
  - upload binário direto de assets no browser segue indisponível até contrato dedicado de seleção/upload
  - checklist visual local não substitui gate backend de publicação
- impacto na FAQ futura:
  - habilita criação manual governada de conteúdo para a Central de Ajuda, separando cockpit operacional de fluxo editorial dedicado

### Fase - Help Center Octadesk Refactor Foundation
- fase: `knowledge-refactor`
- nome: `Help Center Octadesk Refactor Foundation`
- branch: `workspace-atual`
- data: `2026-05-21`
- resumo funcional: retirada a publicacao bruta dos `43` artigos Octadesk, mantendo `/help/genius` somente com os `6` artigos seed/manuais; criada a taxonomia Genius B2B; criada fundacao governada de assets Knowledge; reprocessados `5` artigos internos com `8` assets pendentes, sem republicacao.
- docs alterados:
  - `docs/reports/HELP_CENTER_REFACTOR_MASTER_PLAN.md`
  - `docs/reports/OCTADESK_ARTICLE_TAXONOMY_REMAP.md`
  - `docs/reports/OCTADESK_ASSET_RENDERING_AUDIT.md`
  - `docs/reports/ADMIN_KNOWLEDGE_CMS_GAP_ANALYSIS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- tooling alterado:
  - `scripts/knowledge/reprocess-octadesk-article-assets.mjs`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/genius/articles/:articleSlug`
- views/RPCs afetadas:
  - `vw_admin_knowledge_article_assets`
  - `vw_public_knowledge_article_assets`
  - `rpc_admin_unpublish_knowledge_article_v2`
  - `rpc_admin_upsert_knowledge_article_asset_v1`
  - `rpc_admin_update_knowledge_article_asset_review_v1`
- validacao:
  - reprocessamento dry-run/apply de `Configuração de Sellers Permitidos`
  - reprocessamento dry-run/apply dos 4 artigos da Onda 0
  - queries SQL de `0` Octadesk em views publicas e `8` assets pendentes
  - validações finais registradas no fechamento do lote
- riscos restantes:
  - assets permanecem `pending` ate aprovacao editorial
  - reprocessamento completo dos demais artigos ainda deve ocorrer por ondas
  - republicacao Octadesk deve aguardar taxonomia, assets aprovados e QA
- impacto na FAQ futura:
  - cria a base tecnica para artigos ricos com imagens governadas e evita repetir a publicacao textual bruta do corpus legado

### Fase - Octadesk Public Help Migration Release
- fase: `knowledge-publication`
- nome: `Octadesk Public Help Migration Release`
- branch: `workspace-atual`
- data: `2026-05-21`
- resumo funcional: ajustada a premissa de produto para tratar o corpus Octadesk como Central de Ajuda publica legada aprovada para migracao, salvo bloqueio tecnico critico automatico. A execucao local publicou `43` artigos como `published/public`, manteve `11` em `draft/restricted` por risco critico e elevou `/help/genius` para `49` artigos publicos no total.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLICATION_EXECUTION_REPORT.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_RELEASE_STATUS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- tooling alterado:
  - `scripts/knowledge/publish-octadesk-public-help.mjs`
- telas afetadas:
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:articleSlug`
  - `/admin/knowledge` permanece como fila operacional para os bloqueados
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - utilizadas RPCs existentes: `rpc_admin_create_knowledge_category_v2`, `rpc_admin_update_knowledge_article_draft_v2`, `rpc_admin_submit_knowledge_article_for_review_v2`, `rpc_admin_mark_knowledge_article_reviewed`, `rpc_admin_publish_knowledge_article_v2`
  - leitura validada em `vw_public_knowledge_articles_list`, `vw_public_knowledge_article_detail` e `rpc_public_search_knowledge_articles`
- validacao:
  - dry-run do script de publicacao Octadesk
  - apply local controlado com actor QA
  - queries SQL de distribuicao `43 published/public` e `11 draft/restricted`
  - queries SQL de `43` artigos Octadesk em views publicas
  - busca publica por `Reenviar`
  - QA browser em `/help/genius`, `/help/genius/articles` e detalhe de artigo publicado
  - `npm run knowledge:curation:backlog`
  - `npm run knowledge:verify:octadesk:space-aware`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:test:db`
- riscos restantes:
  - `11` artigos seguem bloqueados por risco critico automatico e nao devem ser publicados sem saneamento especifico
  - a publicacao foi executada no ambiente local/QA; replicacao para outro ambiente deve repetir dry-run, apply e QA
- impacto na FAQ futura:
  - transforma a Central de Ajuda publica em superficie real com corpus Octadesk migrado e rastreavel, preservando bloqueio dos itens criticos

### Fase - Genius Help Center Operational Readiness
- fase: `knowledge-curation`
- nome: `Genius Help Center Operational Readiness`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: consolidado o fechamento operacional da Central de Ajuda Genius sem publicacao insegura. O Admin Knowledge passa a ser a fila diaria de curadoria do corpus Octadesk, com ondas claras, checklist humano da Onda 0 e relatorio executivo de readiness.
- docs alterados:
  - `docs/reports/GENIUS_HELP_CENTER_READINESS_REPORT.md`
  - `docs/reports/OCTADESK_PUBLICATION_WAVES.md`
  - `docs/reports/OCTADESK_WAVE_0_PUBLICATION_CHECKLIST.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_RELEASE_STATUS.md`
  - `docs/reports/OCTADESK_INTERNAL_KNOWLEDGE_BACKLOG.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge` auditado como fila operacional existente
  - `/help/genius` validado como Central Publica segura
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - nenhuma publicacao executada
- validacao:
  - queries SQL de status/visibility e exposicao publica zero
  - QA Admin Knowledge
  - QA Public Help
  - `npm run knowledge:curation:backlog`
  - `npm run knowledge:verify:octadesk:space-aware`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:test:db`
- riscos restantes:
  - publicacao depende de revisao humana real de assets, checklist e advisory
  - Onda 1 permanece vazia ate haver artigo objetivamente seguro fora do piloto
- impacto na FAQ futura:
  - transforma o corpus importado em operacao diaria governada sem misturar conteudo interno/restrito com a Central Publica

### Fase - Octadesk Publication Final Triage
- fase: `knowledge-curation`
- nome: `Octadesk Publication Final Triage`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: executada a triagem final de publicacao do corpus Octadesk ja importado no Admin Knowledge. Nenhum artigo foi publicado automaticamente; a classificacao final ficou em `0 publish_now_candidate`, `38 needs_human_decision`, `16 restricted_blocked` e `4 obsolete_or_duplicate`.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLICATION_FINAL_TRIAGE.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_RELEASE_STATUS.md`
  - `docs/reports/OCTADESK_INTERNAL_KNOWLEDGE_BACKLOG.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge` continua como superficie de curadoria e uso interno
  - `/help/genius` permanece sem expor o corpus Octadesk
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - nenhuma publicacao executada
- validacao:
  - queries SQL de status/visibility e exposicao publica zero
  - QA Admin Knowledge
  - QA Public Help
  - `npm run knowledge:curation:backlog`
  - `npm run knowledge:verify:octadesk:space-aware`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:test:db`
- riscos restantes:
  - publicacao depende de revisao humana real, assets revisados, advisory `reviewed` e checklist completo
  - artigos com flags de integracao, permissao, Correios, PIX, estorno, erro interno ou endpoint continuam bloqueados para publico
- impacto na FAQ futura:
  - define a fronteira entre conteudo publico seguro, backlog interno e material restrito antes de qualquer onda de publicacao

### Fase - Octadesk Full Corpus Safe Pipeline
- fase: `knowledge-curation`
- nome: `Octadesk Full Corpus Safe Pipeline`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: criada e executada localmente a esteira completa por allowlists para o corpus Octadesk. Foram avaliados `58` artigos, `54` foram processados/importados no Admin Knowledge, `54` advisories foram sincronizados, nenhum artigo foi publicado e a Wave 1 permaneceu vazia por falta de checklist humano real e revisao de assets.
- docs alterados:
  - `docs/reports/OCTADESK_FULL_PUBLIC_HELP_EXECUTION_PLAN.md`
  - `docs/reports/OCTADESK_IMPORT_ALL_DRAFTS_ALLOWLIST.json`
  - `docs/reports/OCTADESK_PUBLICATION_WAVE_1_ALLOWLIST.json`
  - `docs/reports/OCTADESK_REVIEW_REQUIRED_ALLOWLIST.json`
  - `docs/reports/OCTADESK_BLOCKED_ALLOWLIST.json`
  - `docs/reports/OCTADESK_EDITORIAL_REWRITE_BACKLOG.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_PLAN.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- tooling alterado:
  - `scripts/knowledge/import-octadesk-drafts.mjs`
- telas afetadas:
  - `/admin/knowledge` passa a conter o corpus Octadesk importado sem exposicao publica
  - `/help/genius` permanece sem expor artigos Octadesk nao aprovados
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - usadas RPCs existentes de draft/import e advisories
- validacao:
  - `npm run knowledge:curation:backlog`
  - import dry-run/apply com `OCTADESK_IMPORT_ALL_DRAFTS_ALLOWLIST.json`
  - advisory dry-run/apply com `OCTADESK_IMPORT_ALL_DRAFTS_ALLOWLIST.json`
  - validacao SQL de `0` artigos Octadesk publicos
- riscos restantes:
  - publicacao depende de checklist humano, advisory `reviewed` e revisao de assets
  - `26` artigos permanecem `draft/restricted`
  - `20` artigos estao bloqueados para publicacao publica nesta fase
- impacto na FAQ futura:
  - transforma o corpus Octadesk em backlog governado no Admin Knowledge sem abrir exposicao publica indevida

### Fase - Docs GPT Canonical Decision
- fase: `documentation-governance`
- nome: `Docs GPT Canonical Decision`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: consolidada a decisão operacional sobre `docs/GPT/` e o mapa documental canônico. A árvore `docs/GPT/` foi classificada como shadow tree auxiliar e não canônica; `docs/` permanece como fonte única de verdade. O parecer registra critérios de canonização, impactos em checkpoints centrais e backlog de consolidação antes de eventual arquivamento.
- docs alterados:
  - `README.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/REPOSITORY_STRUCTURE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/DOCS_GPT_CANONICAL_DECISION_2026-05-20.md`
- telas afetadas:
  - nenhuma tela de produto alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - leitura cruzada de `docs/reports/REPOSITORY_SANITIZATION_REPORT.md`
  - leitura cruzada do handoff do card `t_c286ae33` (`DOCS P0 · auditoria de documentação interna`)
  - leitura cruzada de `docs/reports/SUPPORT_WORKSPACE_STABILIZATION_PLAN_2026-05-20.md`
  - inventário comparativo entre `docs/` e `docs/GPT/` para medir sobreposição, divergência e itens exclusivos
  - revisão de coerência com `docs/DOCUMENTATION_UPDATE_POLICY.md`
- riscos restantes:
  - `docs/GPT/` ainda existe fisicamente e continua exigindo disciplina para não ser lido como fonte oficial
  - os itens exclusivos da shadow tree ainda precisam de triagem para promover, relocar ou descartar em lote próprio
  - checkpoints centrais continuam grandes e ainda merecem saneamento estrutural adicional
- impacto na FAQ futura:
  - reduz risco de derivar respostas, documentação interna ou FAQ de uma árvore espelho com drift

### Fase - Knowledge Legacy Batch Execution Plan
- fase: `knowledge-curation`
- nome: `Knowledge Legacy Batch Execution Plan`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: o fechamento documental do corpus legado da Knowledge foi convertido em plano operacional por waves separadas (`duplicate`, `obsolete`, `public`, `internal`, `restricted`), com gate global de readiness, dependências de ambiente local, critérios de entrada/saída por lote e métricas mínimas de throughput e risco editorial. Nenhum import, sync, publish ou side effect foi executado nesta fase.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_LEGACY_BATCH_EXECUTION_PLAN.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela de produto alterada
  - `/admin/knowledge` e `/help/genius` seguem apenas como superfícies-alvo de execução futura governada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - leitura cruzada de `docs/reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md`
  - leitura cruzada de `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`
  - leitura cruzada de `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - leitura cruzada de `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - leitura cruzada de `docs/CONTENT_OPERATIONS_GOVERNANCE.md`
  - leitura cruzada de `docs/knowledge/KNOWLEDGE_REMAINING_CORPUS_CLOSURE.md`
  - leitura cruzada de `docs/knowledge/KNOWLEDGE_LEGACY_CORPUS_FINAL_READINESS_PACK.md`
- riscos restantes:
  - os gates humanos de `Produto`, `Suporte/CS` e `Engenharia` continuam pendentes para boa parte das waves
  - a wave `restricted` permanece dependente de novo recorte técnico governado antes de qualquer materialização
  - o plano ainda depende de execução disciplinada por micro-lotes; tratar o corpus inteiro como fila única volta a elevar risco editorial
- impacto na FAQ futura:
  - organiza a transformação do legado em lotes auditáveis e reduz o risco de derivar FAQ pública a partir de conteúdo ainda não gateado


### Fase - Support Workspace Status Flow P0 Spec
- fase: `support-workspace-stabilization`
- nome: `Support Workspace Status Flow P0 Spec`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: a trilha documental do fluxo de status do Support Workspace foi alinhada ao runtime real. O lote consolidou a especificacao P0 do boundary backend-first, confirmou `vw_support_ticket_detail` + `rpc_support_update_ticket_status_v2` + `rpc_close_ticket` + `rpc_reopen_ticket` como superficie vigente e registrou o risco de fallback permissivo do frontend quando `allowed_next_statuses` vier vazio.
- docs alterados:
  - `docs/reports/SUPPORT_WORKSPACE_STATUS_FLOW_P0_SPEC_2026-05-20.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela alterada neste lote documental
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - contratos auditados: `vw_support_ticket_detail`, `rpc_support_update_ticket_status_v2`, `rpc_close_ticket`, `rpc_reopen_ticket`
- validacao:
  - leitura cruzada de `apps/web/src/features/support/support-api.ts`
  - leitura cruzada de `apps/web/src/features/support/SupportWorkspacePage.tsx`
  - leitura cruzada de `apps/web/src/features/support/components/SupportTicketAdvancedContextPanels.tsx`
  - leitura cruzada de `supabase/migrations/20260429225342_phase2_ticketing_core_backend_contracts.sql`
  - leitura cruzada de `supabase/migrations/20260509001100_ticket_classification_and_sla_governance_v3.sql`
  - leitura cruzada de `supabase/tests/005_phase2_ticketing_core.sql`
- riscos restantes:
  - `buildStatusChoices()` ainda usa fallback amplo para `TICKET_STATUSES` quando `allowedNextStatuses` vier vazio, o que pode aparentar permissoes indevidas no frontend apesar do backend bloquear a mutacao
  - ainda e necessario um lote de runtime para endurecer esse fallback e transformar drift contratual em estado honestamente indisponivel
- impacto na FAQ futura:
  - nenhum impacto direto para usuario final; melhora a rastreabilidade tecnica do fluxo interno de suporte e reduz risco de drift entre documentacao e runtime

### Fase - Root Artifact Hygiene Policy
- fase: `repository-governance`
- nome: `Root Artifact Hygiene Policy`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: a contaminação recorrente da raiz por screenshots, dumps, logs e evidências transitórias foi convertida em política operacional explícita. O documento define o que pode permanecer na raiz, destinos corretos por categoria (`docs/reports/`, `docs/design/`, `.tmp/`, quarentena), convenções de naming, retenção e backlog de saneamento futuro sem mover/apagar artefatos nesta fase.
- docs alterados:
  - `docs/ROOT_ARTIFACT_HYGIENE_POLICY.md`
  - `docs/REPOSITORY_STRUCTURE.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela de produto alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - leitura cruzada de `docs/reports/REPOSITORY_SANITIZATION_REPORT.md`
  - leitura cruzada de `docs/DOCUMENTATION_GOVERNANCE_RUNBOOK.md`
  - inventário da raiz via `git status --short` e listagem atual de arquivos soltos
  - classificação local dos artefatos atuais por família, categoria e volume
- riscos restantes:
  - a raiz continua contaminada até uma task futura executar triagem, promoção e remoção controlada dos artefatos existentes
  - scripts e fluxos de QA ainda podem continuar escrevendo fora de `.tmp/` até serem ajustados explicitamente
- impacto na FAQ futura:
  - nenhum impacto direto de produto; melhora governança operacional e reduz drift entre evidência transitória e documentação canônica

### Fase - Octadesk Public Help Pilot Internal Review
- fase: `knowledge-curation`
- nome: `Octadesk Public Help Pilot Internal Review`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: os 4 artigos piloto Octadesk foram submetidos para `review/internal` pela RPC existente `rpc_admin_submit_knowledge_article_for_review_v2`, sem publicacao e sem mudanca de visibilidade publica. Advisories permanecem `pending` e a revisao humana continua obrigatoria antes de qualquer publish.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_HUMAN_REVIEW.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_EDITORIAL_DRAFTS.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_PLAN.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge` passa a listar os 4 como `Em revisão Interno Pendente`
  - `/help/genius` permanece sem expor os 4 artigos
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - RPC existente usada: `rpc_admin_submit_knowledge_article_for_review_v2`
- riscos restantes:
  - checklist humano ainda vazio e obrigatorio
  - assets ainda precisam revisao visual humana
  - `Regra por motivo` ainda exige decisao explicita sobre permanecer interno ou virar candidato publico
- impacto na FAQ futura:
  - move o lote piloto para revisao formal interna sem abrir exposicao publica

### Fase - Supabase Verify Split Proposal
- fase: `qa-governance`
- nome: `Supabase Verify Split Proposal`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: consolidada a proposta operacional para separar `supabase:verify` em três faixas explícitas — `safe smoke`, `integration local` e `destructive reset` — preservando aderência à baseline de validação já auditada e ao mapa operacional Supabase. A fase permaneceu documental, sem alterar scripts e sem executar reset destrutivo.
- docs alterados:
  - `docs/reports/SUPABASE_VERIFY_SPLIT_PROPOSAL_2026-05-20.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela de produto alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - leitura de `package.json`
  - leitura de `scripts/ci/run-supabase-verify.mjs`
  - leitura de `scripts/ci/wait-for-supabase-ready.mjs`
  - leitura de `.github/workflows/supabase-db.yml`
  - revisão cruzada com `docs/reports/VALIDATION_BASELINE_MATRIX_2026-05-20.md`
  - revisão cruzada com `docs/reports/SUPABASE_OPERATIONAL_MAP.md`
- riscos restantes:
  - o split ainda não é executável porque o repositório segue com drift de portas/readiness entre `supabase/config.toml`, `wait-for-supabase-ready.mjs`, `docs/PROJECT_STATE.md` e `apps/web/README.md`
  - `supabase:verify` atual continua destrutivo e suscetível a uso indevido até renomeação/extração dos novos entrypoints
- impacto na FAQ futura:
  - melhora a clareza operacional de validação técnica, reduzindo risco de instruções ambíguas para QA local e CI

### Fase - Documentation Governance Runbook
- fase: `documentation-governance`
- nome: `Documentation Governance Runbook`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: a política documental foi convertida em rotina operacional contínua com checkpoints por lote, papéis por frente, ritual de revisão para `PROJECT_STATE.md`, `DOCUMENTATION_LEDGER.md`, docs de área e `README.md`, além de conexão explícita com validação técnica e com o fechamento de cards no Kanban.
- docs alterados:
  - `docs/DOCUMENTATION_GOVERNANCE_RUNBOOK.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela de produto alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - leitura cruzada de `docs/DOCUMENTATION_UPDATE_POLICY.md`
  - revisão de coerência com `docs/KANBAN_OPERATIONAL_GOVERNANCE.md`
  - revisão de consistência entre `docs/README.md`, `docs/PROJECT_STATE.md` e o novo runbook
- riscos restantes:
  - `PROJECT_STATE.md` e `DOCUMENTATION_LEDGER.md` seguem grandes e ainda pedem saneamento estrutural futuro para manter leitura rápida
  - o runbook depende de disciplina operacional do board; sem enforcement contínuo, o drift documental pode reaparecer
- impacto na FAQ futura:
  - fortalece o processo que mantém documentação oficial confiável antes de qualquer derivação futura para FAQ

### Fase - Kanban Operational Governance Bootstrap
- fase: `operational-governance`
- nome: `Kanban Operational Governance Bootstrap`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: criada a camada operacional duravel de desenvolvimento no Hermes para o Genius Support OS, com board dedicado `genius-support-os`, perfis especializados, backlog inicial com dependencias e automacoes recorrentes read-only para documentacao, monitoramento de board e heartbeat.
- docs alterados:
  - `docs/KANBAN_OPERATIONAL_GOVERNANCE.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela de produto alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - `hermes kanban boards list`
  - `hermes kanban --board genius-support-os assignees`
  - `hermes kanban --board genius-support-os list`
  - `hermes kanban --board genius-support-os stats`
  - `hermes cron list`
- riscos restantes:
  - os perfis novos ainda dependem do mesmo ambiente/modelo herdado do host e devem ser observados nas primeiras execucoes reais
  - o refresh automatico de backlog knowledge e o sync automatico de advisories ficaram fora desta fase por risco de side effects no repositorio e no Supabase local
- impacto na FAQ futura:
  - estabelece o fluxo oficial de organizacao e governanca tecnica do projeto sem alterar runtime de produto

### Fase - Octadesk Public Help Pilot Editorial Drafts
- fase: `knowledge-curation`
- nome: `Octadesk Public Help Pilot Editorial Drafts`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: preparadas versoes editoriais sugeridas para os 4 drafts piloto Octadesk, com linguagem B2B, remocao de contatos operacionais e bloqueio explicito de publicacao automatica. As versoes foram aplicadas localmente via `rpc_admin_update_knowledge_article_draft_v2`; os drafts permanecem `draft/internal`, advisories continuam `pending` e a revisao humana segue obrigatoria.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_EDITORIAL_DRAFTS.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_HUMAN_REVIEW.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_PLAN.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge` segue como fila de curadoria dos 4 drafts
  - `/help/genius` deve permanecer sem exposicao dos drafts
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - uso permitido da RPC existente `rpc_admin_update_knowledge_article_draft_v2`, se aplicada no banco local para atualizar texto de draft mantendo `draft/internal`
- riscos restantes:
  - revisao humana de titulo, resumo, corpo, categoria, links e assets ainda e obrigatoria
  - artigo `Regra por motivo` precisa decisao explicita se sera publico ou permanecera interno
- impacto na FAQ futura:
  - transforma o lote piloto em base editorial revisavel, sem liberar conteudo publico antes do gate humano

### Fase - Octadesk Public Help Pilot Human Review Prep
- fase: `knowledge-curation`
- nome: `Octadesk Public Help Pilot Human Review Prep`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: preparada a fila de curadoria humana dos 4 drafts piloto Octadesk ja importados como `draft/internal`, sem publicar conteudo e sem alterar status editorial. O pacote novo consolida identificacao, `source_path`, `source_hash`, advisory pendente, diagnostico editorial, sugestao de versao publica e checklist humano por artigo.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_HUMAN_REVIEW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/knowledge` auditado como fila de curadoria dos 4 drafts
  - `/help/genius` confirmado como sem exposicao dos drafts
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - auditoria local dos 4 drafts e advisories
  - QA Admin Knowledge
  - QA Public Help
  - `npm run knowledge:curation:backlog`
  - `npm run knowledge:verify:octadesk:space-aware`
  - `npm run web:typecheck`
  - `npm run web:build`
- riscos restantes:
  - revisao humana de texto, categoria, links e assets ainda e obrigatoria
  - nenhum artigo deve ir para `review`, `published` ou `public` sem checklist humano completo
- impacto na FAQ futura:
  - transforma o lote piloto importado em fila revisavel, mantendo bloqueio de publicacao automatica e preservando rastreabilidade de origem

### Fase - Octadesk Public Help Pilot Draft Import
- fase: `knowledge-curation`
- nome: `Octadesk Public Help Pilot Draft Import`
- branch: `workspace-atual`
- data: `2026-05-20`
- resumo funcional: preparado e executado o lote piloto da Central de Ajuda Genius a partir do corpus Octadesk. A allowlist versionada limita o import a 4 artigos, o importador e o sync de advisories suportam `--allowlist`, os artigos foram criados localmente como `draft/internal` e nenhum conteudo foi publicado em `/help/genius`.
- docs alterados:
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_PLAN.md`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_ALLOWLIST.json`
  - `docs/reports/OCTADESK_PUBLIC_HELP_PILOT_REVIEW_PACK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de tooling alterados:
  - `scripts/knowledge/import-octadesk-drafts.mjs`
  - `scripts/knowledge/sync-review-advisories.mjs`
  - `package.json`
- telas afetadas:
  - `/admin/knowledge` passou a exibir os 4 drafts importados no ambiente local
  - `/help/genius` permanece sem exibir os drafts
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- validacao:
  - dry-run de backlog
  - dry-run de import com allowlist
  - dry-run de advisory com allowlist
  - apply local apenas dos 4 drafts da allowlist
  - apply local de advisories apenas dos 4 drafts
  - QA Admin Knowledge
  - QA Public Help
- riscos restantes:
  - os 4 artigos ainda precisam revisao humana, reescrita e revisao dos assets
  - os advisories ficaram pendentes e nao autorizam publicacao
  - nenhum artigo deve ir para `published/public` sem checklist editorial completo
- impacto na FAQ futura:
  - cria um caminho controlado para transformar corpus Octadesk em conteudo governado, por lote pequeno, preservando source tracking e bloqueando publicacao automatica

### Fase - Internal Documents Reader V5
- fase: `runtime-ui`
- nome: `Internal Documents Reader V5`
- branch: `workspace-atual`
- data: `2026-05-18`
- resumo funcional: migrados `/admin/product-docs` e a aba `Documentos oficiais` de `/admin/build-journal` para consumir a fonte real governada de documentos internos oficiais. Product Docs lê catálogo e detalhe pelas views contratuais, preserva busca local e deep link `?doc=<slug>`. Build Journal mantém camada narrativa, abre leitura inline pelo mesmo reader e oferece CTA secundário para Product Docs.
- docs alterados:
  - `docs/INTERNAL_DOCUMENTS_ARCHITECTURE.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
- arquivos de código frontend alterados:
  - `apps/web/src/contracts/admin-contracts.ts`
  - `apps/web/src/features/product-docs/ProductDocsPage.tsx`
  - `apps/web/src/features/product-docs/product-docs-api.ts`
  - `apps/web/src/features/product-docs/ProductDocReaderPanel.tsx`
  - `apps/web/src/features/product-docs/ProductDocMarkdownPreview.tsx`
  - `apps/web/src/features/product-docs/productDocsContent.ts`
  - `apps/web/src/features/build-journal/BuildJournalDocuments.tsx`
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
- telas afetadas:
  - `/admin/product-docs`
  - `/admin/build-journal`, aba `Documentos oficiais`
- views/RPCs afetadas:
  - consome `vw_internal_documents_catalog`
  - consome `vw_internal_document_detail`
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - `ProductDocReaderPanel` renderiza apenas `body_md_sanitized` vindo do backend
  - `productDocsContent.ts` deixou de conter corpos markdown hardcoded e ficou restrito a metadados/trilhas
  - frontend não lê filesystem e não aceita path arbitrário
  - documentos narrativos fora da whitelist ficam pendentes/indisponíveis sem ação fake
- validação:
  - `npm run documentation:validate:internal-docs`
  - `npm run documentation:sync:internal-docs`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
- riscos restantes:
  - QA de permissão negativa real ainda depende de fixture/papel sem acesso dedicado
  - estado de catálogo vazio não foi simulado sem alterar dados locais
  - novos documentos continuam exigindo whitelist + sync antes de aparecer no runtime
- impacto na FAQ futura:
  - consolida Product Docs e Build Journal sobre uma única fonte documental oficial, versionada e sanitizada, reduzindo drift entre markdown real, banco e UI

### Fase - Internal Documents Foundation V3/V4
- fase: `backend-contracts-tooling`
- nome: `Internal Documents Foundation V3/V4`
- branch: `workspace-atual`
- data: `2026-05-18`
- resumo funcional: materializada a base backend-first para documentos internos oficiais. O lote criou tabelas versionadas, constraints, RLS, grants, views contratuais e script de sync dry-run/apply controlado para promover markdowns reais whitelisted ao banco sem leitura runtime de filesystem.
- docs alterados:
  - `docs/INTERNAL_DOCUMENTS_ARCHITECTURE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
- arquivos de backend/tooling alterados:
  - `supabase/migrations/20260518152615_internal_documents_foundation_v3.sql`
  - `supabase/tests/038_internal_documents_foundation.sql`
  - `scripts/documentation/validate-internal-documents.mjs`
  - `scripts/documentation/sync-internal-documents.mjs`
  - `package.json`
- arquivos de código frontend alterados:
  - nenhum
- telas afetadas:
  - nenhuma tela runtime alterada
  - `/admin/product-docs` e `/admin/build-journal` ainda não consomem o contrato real neste lote
- views/RPCs afetadas:
  - nova view `vw_internal_documents_catalog`
  - nova view `vw_internal_document_detail`
  - nenhuma RPC criada
- runtime/UI:
  - sem alteração frontend
  - sem leitor concorrente novo
  - sem leitura de filesystem em runtime
- validação esperada:
  - `npm run documentation:validate:internal-docs`
  - `npm run documentation:sync:internal-docs`
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run web:typecheck`
  - `npm run web:build`
- riscos restantes:
  - apply do sync depende de ambiente server-side com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `INTERNAL_DOCS_SYNC_APPLY=1`
  - Product Docs e Build Journal ainda usam conteúdo frontend estático até V5
  - sanitização ainda é não destrutiva e heurística; omissões formais devem evoluir antes de exposição mais ampla
- impacto na FAQ futura:
  - cria base contratual para que a FAQ e superfícies documentais consumam documentação interna oficial versionada, sanitizada e auditável

### Fase - Internal Documents Whitelist + Dry Run V2
- fase: `tooling-documental`
- nome: `Internal Documents Whitelist + Dry Run V2`
- branch: `workspace-atual`
- data: `2026-05-18`
- resumo funcional: criada a whitelist versionada inicial dos documentos internos oficiais e o script dry-run para validar markdowns reais antes de qualquer banco, migration ou frontend. A whitelist inclui apenas os 12 documentos já aceitos na V1 atual de Product Docs.
- docs alterados:
  - `docs/internal-documents.whitelist.json`
  - `docs/INTERNAL_DOCUMENTS_ARCHITECTURE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de tooling alterados:
  - `scripts/documentation/validate-internal-documents.mjs`
  - `package.json`
- arquivos de código frontend alterados:
  - nenhum
- telas afetadas:
  - nenhuma tela runtime alterada
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - nenhum contrato Supabase criado
- runtime/UI:
  - sem alteração frontend
  - sem leitura runtime de filesystem
- validação:
  - `node scripts/documentation/validate-internal-documents.mjs`
  - `npm run documentation:validate:internal-docs`
- resultado do dry-run:
  - 12 documentos whitelisted lidos
  - 5 válidos
  - 7 com alertas informativos de termos sensíveis
  - 0 bloqueados
  - nenhum arquivo alterado e nada gravado no banco
- riscos restantes:
  - alertas ainda são heurísticos e devem evoluir para sanitização formal na V4
  - não existe banco versionado nem RLS para documentos internos oficiais
  - `productDocsContent.ts` ainda contém corpos documentais hardcoded até a fase de contrato/frontend real
- impacto na FAQ futura:
  - cria a primeira base auditável para promover markdowns reais do repositório para fonte controlada de runtime sem expor arquivos fora da whitelist

### Fase - Internal Documents Architecture V1
- fase: `documental`
- nome: `Internal Documents Architecture V1`
- branch: `workspace-atual`
- data: `2026-05-17`
- resumo funcional: criada a especificação da arquitetura futura para documentos internos oficiais do Genius Support OS. A fase consolidou o diagnóstico de que `/admin/product-docs` ainda usa corpos documentais hardcoded em `productDocsContent.ts` e definiu a direção correta: markdown real whitelisted, dry-run, sanitização, hash, banco versionado, views/RPCs e consumo compartilhado por Product Docs e Build Journal.
- docs alterados:
  - `docs/INTERNAL_DOCUMENTS_ARCHITECTURE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de código alterados:
  - nenhum
- telas afetadas:
  - nenhuma tela runtime alterada
  - superfícies futuras planejadas: `/admin/product-docs` e `/admin/build-journal`
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
  - nenhum contrato Supabase criado
- runtime/UI:
  - sem alteração frontend
  - reader inline do Build Journal permanece apenas como protótipo UX transitório, não como solução final de fonte documental
- riscos restantes:
  - `productDocsContent.ts` ainda contém cópias manuais/sanitizadas dos corpos dos documentos
  - não existe whitelist JSON versionada nem script dry-run/sync
  - não existe banco versionado para documentos internos oficiais
  - migrations, RLS, views/RPCs e frontend por contrato real ainda dependem de fases futuras
- impacto na FAQ futura:
  - cria base de governança para expor documentação oficial interna sem duplicação de corpo documental no frontend e sem leitura runtime de filesystem

### Fase - Build Journal Documents Inline Reader V1
- fase: `runtime-ui`
- nome: `Build Journal Documents Inline Reader V1`
- branch: `workspace-atual`
- data: `2026-05-17`
- resumo funcional: refatorada a integração entre a aba `Documentos oficiais` de `/admin/build-journal` e `/admin/product-docs`. O Diário agora abre documentos whitelisted inline, dentro do contexto narrativo, reutilizando o mesmo reader e a mesma fonte estática controlada do Product Docs. `/admin/product-docs` permanece como leitor oficial completo, com busca local, categorias e deep link `?doc=` preservados.
- docs alterados:
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
- arquivos de código alterados:
  - `apps/web/src/features/product-docs/ProductDocsPage.tsx`
  - `apps/web/src/features/product-docs/ProductDocMarkdownPreview.tsx`
  - `apps/web/src/features/product-docs/ProductDocReaderPanel.tsx`
  - `apps/web/src/features/build-journal/BuildJournalDocuments.tsx`
- telas afetadas:
  - `/admin/build-journal`
  - `/admin/product-docs`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - parser/preview de markdown foi extraído para componente compartilhado, evitando leitor concorrente
  - Product Docs mantém a experiência oficial completa
  - Build Journal mantém a camada narrativa e oferece CTA secundário para abrir o mesmo documento em `/admin/product-docs?doc=...`
  - documentos fora da whitelist continuam pendentes, sem ação fake
- riscos restantes:
  - novos documentos continuam dependendo de decisão editorial para entrar na whitelist controlada
  - QA visual autenticada continua recomendada para validar densidade do reader inline em viewport real
- impacto na FAQ futura:
  - reforça a separação entre narrativa guiada e fonte oficial controlada sem duplicar conteúdo documental

### Fase - Build Journal Official Documents Narrative V1
- fase: `runtime-ui`
- nome: `Build Journal Official Documents Narrative V1`
- branch: `workspace-atual`
- data: `2026-05-17`
- resumo funcional: implementada a aba `Documentos oficiais` em `/admin/build-journal` como camada narrativa sobre as fontes oficiais do Genius Support OS. A tela organiza categorias documentais, explica o papel de cada grupo na construção e conecta somente documentos já whitelisted ao leitor `/admin/product-docs`; itens ainda fora da whitelist aparecem como pendentes, sem ação fake.
- docs alterados:
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de código alterados:
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
  - `apps/web/src/features/build-journal/BuildJournalDocuments.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
- telas afetadas:
  - `/admin/build-journal`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - a aba deixou de ser placeholder e passou a ser uma tela narrativa light/white-tech
  - não há leitura dinâmica de filesystem, file explorer, busca backend ou duplicação do Product Docs
  - links são restritos a IDs reais já aceitos por `/admin/product-docs?doc=...`
- riscos restantes:
  - documentos citados fora da whitelist continuam pendentes até uma rodada própria de Product Docs
  - `Próximos passos` segue como placeholder honesto até receber blueprint própria
- impacto na FAQ futura:
  - melhora a rastreabilidade entre categorias documentais e decisões de construção sem ampliar exposição de arquivos

### Fase - Build Journal Structural Cleanup V1
- fase: `runtime-ui`
- nome: `Build Journal Structural Cleanup V1`
- branch: `workspace-atual`
- data: `2026-05-17`
- resumo funcional: saneado o módulo frontend `/admin/build-journal` após rodadas de recriação visual, sem alterar sidebar, shell administrativo, backend ou Product Docs. A rota permanece única e usa abas internas locais; `Visão geral`, `Linha do tempo`, `Arquitetura` e `IA na Construção` estão implementadas, enquanto `Documentos oficiais` e `Próximos passos` continuam placeholders estáticos honestos.
- docs alterados:
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
- arquivos de código alterados:
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
  - `apps/web/src/features/build-journal/BuildJournalArchitecture.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
- telas afetadas:
  - `/admin/build-journal`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - `TimelineTabs` foi renomeado para `BuildJournalSectionTabs`, mantendo visual e comportamento
  - `SimpleDocumentPanel` passou a conter apenas placeholders reais de `Documentos oficiais` e `Próximos passos`
  - `buildJournalContent.ts` foi reativado como fonte central enxuta para conteúdo estático usado pela implementação atual
  - ações indisponíveis receberam semântica `disabled`/`aria-disabled`, e `Ver mapa da construção` passou a trocar para a aba `Visão geral`
  - `BuildJournalQuoteFooter` permanece como rodapé/citação compartilhado
- riscos restantes:
  - `Documentos oficiais` e `Próximos passos` ainda precisam de telas próprias aprovadas por blueprint antes de deixarem de ser placeholders
  - a rota continua estática no frontend e depende de disciplina editorial para manter alinhamento com os documentos oficiais
- impacto na FAQ futura:
  - reforça a separação entre narrativa do Diário e Product Docs como fonte oficial controlada
  - reduz drift estrutural antes de novas telas documentais

### Fase - Build Journal Immersive Blueprint Fidelity V1
- fase: `runtime-ui`
- nome: `Build Journal Immersive Blueprint Fidelity V1`
- branch: `workspace-atual`
- data: `2026-05-16`
- resumo funcional: recriada `/admin/build-journal` com alta fidelidade à blueprint dark aprovada, substituindo a aparência de dashboard branco genérico por uma superfície editorial imersiva, compacta e desktop-first com hero dark horizontal, jornada em uma visão, mapa da construção, timeline, documentos curados, arquitetura explicada, papel da IA, estado atual e fechamento editorial. `/admin/product-docs` não foi alterado nesta fase.
- docs alterados:
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- arquivos de código alterados:
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
- telas afetadas:
  - `/admin/build-journal`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - a rota ganhou dark mode próprio e premium sem alterar o restante do Admin Console
  - a narrativa agora fica organizada pela composição hero -> jornada -> mapa/timeline/docs -> arquitetura/IA/estado -> decisões/limites/próximos blocos
  - os links de aprofundamento continuam apontando apenas para `/admin/product-docs` e para documentos curados
  - nenhuma interatividade fake, file explorer, parser dinâmico, busca backend ou IA interativa foi adicionada
- riscos restantes:
  - a fidelidade visual final ainda depende de QA autenticada em browser real, porque a automação local pode não compartilhar a mesma sessão administrativa do navegador do usuário
  - a rota continua sustentada por conteúdo estático no frontend e exige disciplina editorial para evitar drift em relação aos markdowns oficiais
  - a área continua sem permissão granular dedicada além do gate administrativo consolidado
- impacto na FAQ futura:
  - melhora muito a leitura institucional e técnica da construção do produto, acelerando onboarding interno sem ampliar exposição sensível nem criar backend novo
- validação final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Build Journal Experience Upgrade V1
- fase: `runtime-ui`
- nome: `Build Journal Experience Upgrade V1`
- branch: `workspace-atual`
- data: `2026-05-16`
- resumo funcional: refatorada a experiência estática de `/admin/build-journal` para leitura guiada com índice sticky, âncoras por seção, trilha `entenda em 5 minutos`, melhor explicação de stack/arquitetura/segurança/IA, decisões expansíveis e domínios por chips; `/admin/product-docs` recebeu `Por onde começar`, trilhas de leitura e copy mais clara, sem alterar whitelist nem modelo estático.
- docs alterados:
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- arquivos de código alterados:
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
  - `apps/web/src/features/product-docs/ProductDocsPage.tsx`
  - `apps/web/src/features/product-docs/productDocsContent.ts`
- telas afetadas:
  - `/admin/build-journal`
  - `/admin/product-docs`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- runtime/UI:
  - o Diário agora opera como narrativa guiada, com melhor separação entre visão executiva, detalhe técnico e próximos blocos recomendados
  - Product Docs continua estático e whitelisted, agora com trilhas de leitura e orientação de entrada
  - nenhuma interatividade fake, busca backend, parser dinâmico ou IA interativa foi adicionada
- riscos restantes:
  - o conteúdo das superfícies continua hardcoded no frontend e exige disciplina editorial para evitar drift em relação aos docs oficiais
  - `build-journal` e `product-docs` continuam dependendo do gate administrativo consolidado, sem permissão granular dedicada
  - QA manual autenticada em browser real continua recomendada após mudanças visuais relevantes
- impacto na FAQ futura:
  - melhora a leitura interna das decisões e contratos do produto, facilitando onboarding e continuidade sem ampliar a exposição documental nem abrir superfícies dinâmicas
- validação final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Build Journal Source Reading Direction Addendum
- fase: `documental`
- nome: `Build Journal Source Reading Direction Addendum`
- branch: `workspace-atual`
- data: `2026-05-16`
- resumo funcional: registrado o adendo da próxima rodada para aproximar `/admin/build-journal` e `/admin/product-docs` dos markdowns-fonte originais aprovados, com leitura aprofundada controlada, trilhas curatoriais e ilustrações estáticas informativas, sem abrir backend dinâmico nem file explorer.
- docs alterados:
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma implementação runtime nesta fase
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- riscos restantes:
  - a futura leitura dos markdowns originais precisa continuar sob whitelist explícita para não virar explorador genérico
  - ilustrações futuras exigem sanitização e fidelidade editorial ao Design System V3
- impacto na FAQ futura:
  - melhora a clareza sobre como os documentos-fonte sustentam a construção do produto e prepara uma camada de aprofundamento interno mais organizada
- validacao final:
  - revisão documental local

### Fase - Genius Cockpit UI Blueprint Skill V1
- fase: `documental`
- nome: `Genius Cockpit UI Blueprint Skill V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-15`
- resumo funcional: criada a skill local versionada `.skills/genius-cockpit-ui-blueprint` para orientar tarefas futuras de UI/UX do Genius Support OS baseadas em blueprint, screenshot, crítica visual, copy operacional e implementação React/Tailwind fiel ao Design System V3 e aos contratos reais.
- docs alterados:
  - `.skills/genius-cockpit-ui-blueprint/SKILL.md`
  - `.skills/genius-cockpit-ui-blueprint/references/blueprint-analysis-checklist.md`
  - `.skills/genius-cockpit-ui-blueprint/references/cockpit-layout-rules.md`
  - `.skills/genius-cockpit-ui-blueprint/references/copy-and-language-rules.md`
  - `.skills/genius-cockpit-ui-blueprint/references/visual-density-and-scroll-rules.md`
  - `.skills/genius-cockpit-ui-blueprint/references/blueprint-to-react-tailwind-rules.md`
  - `.skills/genius-cockpit-ui-blueprint/references/qa-visual-validation-checklist.md`
  - `docs/README.md`
  - `docs/REPOSITORY_STRUCTURE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `README.md`
- telas afetadas:
  - nenhuma tela runtime alterada
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- riscos restantes:
  - a skill depende de disciplina para continuar alinhada ao Design System V3 e às futuras decisões reais de produto
  - a skill não substitui a leitura dos contratos reais da tela antes de qualquer implementação visual
  - futuras superfícies novas podem exigir refinamento adicional das referências quando surgirem novos padrões operacionais
- impacto na FAQ futura:
  - melhora a consistência das futuras execuções de UI do cockpit interno, reduzindo drift visual, jargão técnico e padrões genéricos nas telas operacionais
- validacao final:
  - `python C:\Users\edebu\.codex\skills\.system\skill-creator\scripts\quick_validate.py .skills/genius-cockpit-ui-blueprint`
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Documentation Update Policy V1
- fase: `documental`
- nome: `Documentation Update Policy V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-13`
- resumo funcional: formalizada a política que torna atualização documental parte obrigatória do processo de entrega, integrando regra explícita ao índice de docs, ao checkpoint do projeto e aos checklists de execução/validação.
- docs alterados:
  - `docs/DOCUMENTATION_UPDATE_POLICY.md`
  - `docs/CODEX_EXECUTION_RULES.md`
  - `docs/VALIDATION_CHECKLIST.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma tela runtime alterada
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- riscos restantes:
  - a política reduz drift, mas ainda depende de disciplina de revisão em cada lote
  - futuras automações de enforcement em CI ainda não existem
  - documentos antigos podem exigir alinhamento gradual quando forem tocados por novos lotes
- impacto na FAQ futura:
  - melhora a confiabilidade da trilha documental interna, reduzindo divergência entre código, estado real e narrativa do produto
- validacao final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Internal Documentation Areas Checkpoint V1
- fase: `documental`
- nome: `Internal Documentation Areas Checkpoint V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-13`
- resumo funcional: consolidado o checkpoint documental final das áreas internas `/admin/build-journal` e `/admin/product-docs`, registrando objetivo, diferença conceitual, acesso atual, política de exposição, sanitização, whitelist documental e critérios de evolução futura.
- docs alterados:
  - `docs/INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/build-journal`
  - `/admin/product-docs`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- riscos restantes:
  - `build-journal` e `product-docs` ainda dependem do gate administrativo consolidado, sem permissão granular dedicada
  - novos documentos e prints futuros continuam exigindo revisão editorial e sanitização explícita
  - qualquer expansão para conteúdo dinâmico, anexos, comentários, histórico ou busca backend depende de contrato futuro
  - QA manual autenticada em browser real continua recomendada após mudanças visuais relevantes nessas duas áreas
- impacto na FAQ futura:
  - cria um checkpoint consolidado para explicar internamente a diferença entre processo de construção e fonte oficial controlada, sem transformar a documentação interna em material público ou customer-facing
- validacao final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Product Docs Internal Reader V1
- fase: `runtime-ui`
- nome: `Product Docs Internal Reader V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-13`
- resumo funcional: criada a área interna protegida `Documentos do Produto` em `/admin/product-docs`, dentro do Admin Console e protegida pelo gate administrativo existente, com catálogo estático whitelisted, conteúdo sanitizado, busca local e agrupamento por categoria.
- docs alterados:
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
- arquivos criados:
  - `apps/web/src/features/product-docs/productDocsContent.ts`
  - `apps/web/src/features/product-docs/ProductDocsPage.tsx`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
- arquivos de código alterados:
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/features/admin-shell/AdminSidebar.tsx`
  - `apps/web/src/features/admin-shell/AdminTopbar.tsx`
  - `apps/web/src/features/navigation/UnifiedEnvironmentNavigation.tsx`
- rota afetada:
  - `/admin/product-docs`
- documentos expostos na whitelist:
  - `PRODUCT.md`
  - `DESIGN.md`
  - `docs/PRODUCT_VISION.md`
  - `docs/ARCHITECTURE_RULES.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/ENGINEERING_WORKFLOW.md`
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- telas afetadas:
  - nova rota interna `/admin/product-docs`
  - navegação administrativa do Admin Console
- runtime/UI:
  - tela real com índice por categoria, busca local, leitura sanitizada, status, sensibilidade, origem e estado vazio
  - conteúdo estático versionado no frontend
  - sem parser dinâmico de filesystem, explorador genérico de arquivos, backend próprio, storage, IA ou mocks
- impacto futuro na FAQ:
  - passa a existir referência interna controlada para explicar quais documentos sustentam visão, arquitetura, segurança, operação, design, governança e construção do produto.
  - qualquer expansão para FAQ externa ou customer-facing continua dependendo de sanitização e revisão editorial.
- riscos restantes:
  - permissão específica de `product-docs` ainda não existe; a V1 usa o gate administrativo consolidado do Admin Console
  - documentos novos exigem inclusão explícita na whitelist e revisão de sensibilidade
  - busca backend, leitura dinâmica, comentários, anexos, histórico ou IA exigem contrato futuro antes de implementação
  - se a seleção de documento precisar persistir na URL durante a navegação interna, será necessária estratégia própria de roteamento/estado para não reintroduzir repaint visual da rota
  - QA manual autenticada em browser real continua recomendada após mudanças visuais relevantes
- validação final:
  - `npm run web:typecheck`
  - `npm run web:build`
  - auditoria visual/UX com Impeccable

### Fase - Product Docs Interaction Hardening V1
- fase: `runtime-ui`
- nome: `Product Docs Interaction Hardening V1`
- branch: `workspace-atual`
- data: `2026-05-15`
- resumo funcional: endurecida a interação de seleção em `/admin/product-docs` para evitar flicker/repaint visual ao clicar em itens do índice, preservando o parâmetro `?doc=` apenas como deep-link de entrada controlada.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/PRODUCT_DOCS_INTERNAL_READER_V1.md`
- arquivos de código alterados:
  - `apps/web/src/features/product-docs/ProductDocsPage.tsx`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- telas afetadas:
  - `/admin/product-docs`
- runtime/UI:
  - cliques no índice trocam o documento localmente, sem sincronização contínua da seleção com `searchParams`
  - deep-link `?doc=` continua suportado para abrir a tela já posicionada em um documento whitelisted
- riscos restantes:
  - permissão específica de `product-docs` continua inexistente
  - persistir seleção interna na URL sem reintroduzir repaint da rota continua como decisão técnica futura
  - QA manual autenticada em browser real continua recomendada após mudanças visuais relevantes
- impacto futuro na FAQ:
  - nenhum impacto direto na FAQ; o ajuste reduz ruído visual da leitura interna sem alterar a whitelist nem a política de exposição
- validação final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase - Build Journal Runtime UI V1
- fase: `runtime-ui`
- nome: `Build Journal Runtime UI V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-13`
- resumo funcional: criada a área interna navegável `Diário de Construção` em `/admin/build-journal`, dentro do Admin Console e protegida pelo gate administrativo existente, com conteúdo estático versionado e sanitizado no frontend.
- docs alterados:
  - `docs/README.md`
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de codigo alterados:
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/features/admin-shell/AdminSidebar.tsx`
  - `apps/web/src/features/admin-shell/AdminTopbar.tsx`
  - `apps/web/src/features/navigation/UnifiedEnvironmentNavigation.tsx`
  - `apps/web/src/features/build-journal/buildJournalContent.ts`
  - `apps/web/src/features/build-journal/BuildJournalPage.tsx`
- views/RPCs afetadas:
  - nenhum contrato novo
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- telas afetadas:
  - nova rota interna `/admin/build-journal`
  - navegação administrativa do Admin Console
- runtime/UI:
  - tela real com visão geral, timeline de fases, workflow Humano + ChatGPT + Codex, fluxo documentação-produto, stack, segurança, decisões-chave, limites e estado futuro para prints
  - conteúdo estático versionado no frontend
  - sem parser dinâmico de markdown, backend próprio, storage, IA ou mocks
- impacto futuro na FAQ:
  - passa a existir base navegável interna para explicar método de construção, stack, segurança, colaboração humano/IA/Codex e limites do produto.
  - qualquer uso externo ou customer-facing continua dependendo de sanitização e revisão editorial.
- riscos restantes:
  - permissão específica do Diário ainda não existe; a V1 usa o gate administrativo consolidado do Admin Console
  - prints futuros ainda precisam de processo de sanitização e curadoria antes de aparecerem na tela
  - busca, comentários, anexos, filtros persistidos ou histórico em banco exigem contrato futuro antes de implementação
- validação final:
  - `npm run web:typecheck`
  - `npm run web:build`
  - auditoria visual/UX com Impeccable

### Fase documental - Build Journal Strategy V1
- fase: `documental`
- nome: `Build Journal Strategy V1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-13`
- resumo funcional: criada a fundacao documental da futura area interna `Diario de Construcao`, explicando como o Genius Support OS foi planejado, arquitetado e construido com colaboracao entre humano, ChatGPT e Codex, sem criar feature runtime.
- docs alterados:
  - `docs/BUILD_JOURNAL_STRATEGY.md`
  - `docs/BUILD_JOURNAL_SCREEN_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma view criada ou alterada
  - nenhuma RPC criada ou alterada
- telas afetadas:
  - nenhuma tela runtime criada ou alterada
  - rotas futuras apenas sugeridas: `/admin/build-journal` ou `/system/build-journal`
- runtime/UI:
  - sem alteracao runtime
  - sem mocks
  - sem componente React
- impacto futuro na FAQ:
  - pode alimentar uma FAQ interna sobre metodo de construcao, papeis de Humano + ChatGPT + Codex, arquitetura backend-first, seguranca, stack e limites atuais do produto.
  - nao deve alimentar FAQ publica nem material customer-facing sem sanitizacao e revisao editorial.
- riscos restantes:
  - futura tela depende de decisao de Produto e contrato de acesso antes de implementacao
  - prints futuros precisam ser sanitizados para remover dados reais, secrets, payloads, logs crus e qualquer coordenada sensivel
  - se a futura tela precisar de conteudo dinamico, busca, anexos ou comentarios, sera necessario contrato backend proprio antes da UI
- validacao final:
  - `npm run web:typecheck`
  - `npm run web:build`

### Fase 8.22 - Customer Portal Tenant Context And Switching V3
- fase: `8.22`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-10`
- resumo funcional: o Portal Cliente B2B passou a operar com `active_tenant_id` backend-governed, permitindo troca segura entre tenants customer-facing validos sem `contexts[0]`, sem `localStorage` como source of truth e sem contaminacao do contexto admin.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_V3.md`
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_PREP_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/CUSTOMER_PORTAL_SEARCH_AND_DISCOVERABILITY_V3.md`
  - `docs/CUSTOMER_PORTAL_ACCESS_ADMINISTRATION_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_customer_portal_available_tenants`
  - `vw_customer_portal_active_tenant_context`
  - `vw_customer_portal_auth_context`
  - `vw_customer_portal_profile_context`
  - `rpc_customer_set_active_tenant`
  - `rpc_customer_create_ticket`
  - `rpc_customer_search_knowledge_articles`
- telas afetadas:
  - `/portal`
  - `/portal/tickets`
  - `/portal/tickets/:ticketId`
  - `/portal/help`
  - `/portal/help/:slug`
  - `/admin/customer-portal` em regressao
  - `/admin/access` em regressao
- runtime/UI:
  - novo provider customer-facing governa tenant ativo, lista tenants disponiveis e executa switch com refetch seguro
  - o seletor de tenant aparece apenas quando ha multiplos tenants validos
  - o layout limpa o tenant anterior durante a troca via remount por `tenantId`
- riscos restantes:
  - o comportamento de multi-aba/sessoes concorrentes do tenant ativo ainda nao tem contrato proprio
  - futuras RPCs customer-facing novas precisam continuar aderindo ao gate de tenant ativo
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - passa a explicar como um mesmo usuario customer-facing troca de tenant sem vazar tickets, Knowledge ou busca autenticada entre contas.

### Fase 8.21 - Customer Portal Admin Session Regression Fix And Tenant Context Prep V3
- fase: `8.21`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-10`
- resumo funcional: a regressao de loading persistente em `/admin/customer-portal` foi corrigida ao remover o loop de bootstrap da tela, endurecer timeout do carregamento inicial/detalhes e registrar a preparacao tecnica do futuro tenant switching customer-facing sem auth paralela.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_PREP_V3.md`
  - `docs/CUSTOMER_PORTAL_ACCESS_ADMINISTRATION_V3.md`
  - `docs/CUSTOMER_PORTAL_SEARCH_AND_DISCOVERABILITY_V3.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhum contrato novo de producao
  - regressao backend coberta em `supabase/tests/034_customer_portal_admin_context_regression.sql`
- telas afetadas:
  - `/admin/customer-portal`
  - `/admin/access` em regressao
  - `/admin/knowledge` em regressao
  - `/portal`
  - `/portal/help`
  - `/portal/tickets/:ticketId`
- runtime/UI:
  - o loading de `/admin/customer-portal` agora resolve para `ready`, `contract-unavailable` ou erro real
  - a tela deixou de redisparar em loop as mesmas queries administrativas apos troca de sessao customer -> admin
- riscos restantes:
  - tenant switching customer-facing continua fora deste lote e depende de `active_tenant_id` governado por backend
  - a criacao/convite inicial de novos usuarios customer-facing continua em lote futuro
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote de estabilidade de sessao e preparacao arquitetural, sem expandir superficie customer-facing.

### Fase 8.19 - Customer Portal Access Administration V3
- fase: `8.19`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-10`
- resumo funcional: o Admin Console ganhou administracao operacional do portal cliente B2B em `/admin/customer-portal`, com read models reais para usuarios customer-facing, tenant overview, entitlements de Knowledge e ticket links, alem de acoes governadas por RPC para role/status, grant/archive e link/unlink.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_ACCESS_ADMINISTRATION_V3.md`
  - `docs/CUSTOMER_PORTAL_ACCESS_AND_KNOWLEDGE_ENTITLEMENTS_V3.md`
  - `docs/design/screens/ADMIN_ACCESS.md`
  - `docs/design/screens/ADMIN_KNOWLEDGE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_admin_customer_portal_access_overview`
  - `vw_admin_customer_portal_tenant_access`
  - `vw_admin_customer_portal_users`
  - `vw_admin_customer_portal_user_detail`
  - `vw_admin_knowledge_entitlements`
  - `vw_admin_knowledge_entitlement_detail`
  - `vw_admin_ticket_knowledge_links`
  - `vw_admin_customer_portal_article_candidates`
  - `vw_admin_customer_portal_ticket_candidates`
  - `rpc_admin_grant_knowledge_article_entitlement`
  - `rpc_admin_archive_knowledge_article_entitlement`
  - `rpc_admin_link_knowledge_article_to_ticket`
  - `rpc_admin_unlink_knowledge_article_from_ticket`
  - `rpc_admin_update_tenant_member_role`
  - `rpc_admin_update_tenant_member_status`
- telas afetadas:
  - `/admin/customer-portal`
  - `/admin/access` em regressao
  - `/admin/knowledge` em regressao
  - `/portal`
  - `/portal/help`
  - `/portal/tickets/:ticketId`
- runtime/UI:
  - a tela administrativa nova resume risco por tenant, mostra usuario customer-facing em detalhe e governa apenas contratos reais
  - os cards resumidos do portal deixaram de exibir contagem enganosa de artigos quando o contrato nao existe
- riscos restantes:
  - a criacao de novo membership customer-facing dedicado ainda depende de expansao posterior de UX sobre contratos genericos
  - busca autenticada do portal continua fora do corte
  - tenant switcher customer-facing continua ausente
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - deixa auditavel quem pode acessar o portal cliente e qual artigo autenticado foi liberado por tenant ou por ticket, sem confundir governanca interna com Help público.

### Fase 8.18 - Customer Portal Access And Knowledge Entitlements V3
- fase: `8.18`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: foi criada a camada customer-facing de entitlement para Knowledge autenticada, com artigos publicados autorizados por tenant, artigos vinculados a ticket permitido e rotas próprias `/portal/help` sem alterar o boundary do Help público.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_ACCESS_AND_KNOWLEDGE_ENTITLEMENTS_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/KNOWLEDGE_ADMIN_OPERATIONAL_GOVERNANCE_V3.md`
  - `docs/design/screens/PUBLIC_HELP_CENTER.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_customer_portal_knowledge_articles`
  - `vw_customer_portal_knowledge_article_detail`
  - `vw_customer_portal_ticket_knowledge_links`
  - `rpc_admin_grant_knowledge_article_entitlement`
  - `rpc_admin_archive_knowledge_article_entitlement`
  - `rpc_admin_link_knowledge_article_to_ticket`
  - `rpc_admin_unlink_knowledge_article_from_ticket`
- telas afetadas:
  - `/portal`
  - `/portal/help`
  - `/portal/help/:articleSlug`
  - `/portal/tickets/:ticketId`
  - `/help/genius` em regressao
- runtime/UI:
  - o portal resume artigos autorizados, lista apenas artigos publicados permitidos e abre detalhe autenticado sem expor advisory, checklist editorial, draft body ou metadata interna
  - o Public Help permanece estritamente público e não depende de sessão customer
- riscos restantes:
  - não existe tenant switcher customer-facing; o portal ainda assume o primeiro contexto retornado
  - administração customer-facing de usuários e UI administrativa de entitlement continuam fora do corte
  - busca customer-facing e recomendação contextual continuam bloqueadas por falta de contrato
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - separa com clareza o que é Help Center público do que é conteúdo autenticado do portal cliente, evitando prometer acesso amplo a conteúdo restrito sem entitlement auditável

### Fase 8.15 - Customer Portal Contract Foundation V3
- fase: `8.15`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: foi criada a fundacao contratual customer-facing do portal cliente B2B, com roles de cliente, read models seguros, RPCs minimas, rotas de foundation e boundary clara entre publico, cliente autenticado e operacao interna.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/CUSTOMER_PORTAL_AND_OMNI_FOUNDATION_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_customer_portal_auth_context`
  - `vw_customer_portal_profile_context`
  - `vw_customer_portal_ticket_list`
  - `vw_customer_portal_ticket_detail`
  - `vw_customer_portal_ticket_timeline`
  - `vw_customer_portal_ticket_attachments`
  - `vw_customer_portal_knowledge_articles`
  - `rpc_customer_create_ticket`
  - `rpc_customer_add_ticket_message`
  - `rpc_customer_get_attachment_download_url`
  - `rpc_customer_acknowledge_ticket_update`
- telas afetadas:
  - `/portal`
  - `/portal/tickets`
  - `/portal/tickets/:ticketId`
  - `/login`
- runtime/UI:
  - frontend customer-facing minimo consome apenas contratos reais
  - login permite redirect autenticado para `/portal` sem exigir gate interno admin/support
  - nao foram criados dashboard fake, SLA publico, chat, IA ou Omni Inbox
- riscos restantes:
  - upload de evidencia pelo cliente, administracao customer-facing de usuarios, Omni Inbox real e IA operacional continuam fora do corte
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - define a fronteira segura entre cliente B2B autenticado, Help Center publico e operacao interna antes de prometer portal ou IA

### Fase 8.14 - Buildout Status Checkpoint V3
- fase: `8.14`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: foi consolidado checkpoint geral do buildout funcional apos os blocos de suporte, SLA, evidencias, engenharia, governanca e portal readiness, sem implementar produto novo.
- docs alterados:
  - `docs/BUILDOUT_STATUS_CHECKPOINT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhum contrato criado ou alterado
- telas afetadas:
  - nenhuma tela runtime
- runtime/UI:
  - sem alteracao runtime
- riscos restantes:
  - portal cliente B2B funcional, archive/retencao de evidencias, calendario util real, admin UI de SLA e regressao E2E visual seguem como proximos blocos grandes
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - organiza a narrativa do que ja esta operacional e do que ainda precisa contrato antes de virar promessa de produto

### Fase 8.13 - Customer Portal Readiness Blueprint V3
- fase: `8.13`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: foi criado blueprint tecnico do futuro portal cliente B2B, delimitando visibilidade, auth, tickets proprios, Knowledge publica, evidencias seguras e limites do Customer Account Profile sem implementar portal completo.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_READINESS_BLUEPRINT_V3.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhum contrato criado; foram apenas mapeados contratos futuros `customer_portal_*`
- telas afetadas:
  - nenhuma tela runtime
- runtime/UI:
  - sem alteracao runtime; nenhuma UI fake de portal foi criada
- riscos restantes:
  - auth do cliente B2B, roles customer-facing e exposicao segura de SLA ainda dependem de decisao de Produto
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - define fronteira entre cockpit interno e portal cliente B2B, evitando confundir cliente B2B com shopper final

### Fase 8.12 - Support Operations Usability Completion V3
- fase: `8.12`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: a usabilidade operacional do suporte foi revisada apos intake, classificacao, SLA por tenant, anexos seguros, handoff tecnico e contexto de cliente, com ajuste conservador de copy e sem backend novo.
- docs alterados:
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/SUPPORT_WORKFLOW.md`
- views/RPCs afetadas:
  - nenhum contrato novo; reaproveitados os read models/RPCs ja existentes de suporte
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/engineering` em regressao rapida
- runtime/UI:
  - copy tecnica visivel ao operador foi reduzida em estados de evidencias, handoff e acoes indisponiveis
  - acoes seguem habilitadas apenas quando os contratos existentes permitem
  - thread, composer, anexos, SLA, handoff e customer context foram preservados
- riscos restantes:
  - refinamento profundo de densidade e reorganizacao do rail deve ser feito em lote proprio se a tela ficar saturada com uso real
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - reforca a linguagem operacional que deve ser usada em orientacoes internas de suporte sem expor detalhes de implementacao

### Fase 8.11 - Tenant Support Policy And SLA Automation V3
- fase: `8.11`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: políticas de SLA por tenant, calendário de negócio MVP, fallback global controlado, recalculo backend e sinais internos de SLA foram materializados sem notificação externa, timer fake ou promessa pública automática.
- docs alterados:
  - `docs/TENANT_SUPPORT_POLICY_AND_SLA_AUTOMATION_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/TICKET_CLASSIFICATION_AND_SLA_GOVERNANCE_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_ticket_sla_context`
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_admin_ticket_sla_policies`
  - `rpc_admin_upsert_business_calendar`
  - `rpc_admin_upsert_ticket_sla_policy`
  - `rpc_admin_archive_ticket_sla_policy`
  - `rpc_support_recalculate_ticket_sla`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
- runtime/UI:
  - fila e workspace exibem política de SLA aplicada, origem da política, prazo de primeira resposta/resolução e calendário quando houver read model real
  - tenant sem política própria usa fallback global quando aplicável; ausência real de política aparece como `Sem política definida`
  - frontend segue sem calcular prazo, timer, pausa ou breach
- riscos restantes:
  - cálculo por horário útil real ainda depende de regra de produto/engenharia
  - pausa de SLA por status ainda precisa decisão objetiva
  - notificações/automação de breach e UI administrativa complexa continuam fora do corte
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisão de produto
- validação final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - permite explicar SLA como governança interna auditável por tenant, sem converter prazos operacionais em promessa pública automática

### Fase 8.10 - Ticket Classification And SLA Governance V3
- fase: `8.10`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: classificacao operacional, motivos auditaveis, prioridade/severidade, SLA interno e transicoes de status foram formalizados no backend e conectados ao intake, fila e Ticket Workspace sem regra inventada no frontend.
- docs alterados:
  - `docs/TICKET_CLASSIFICATION_AND_SLA_GOVERNANCE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_TICKET_CREATION_AND_INTAKE_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_ticket_classification_options`
  - `vw_support_ticket_sla_context`
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `rpc_create_ticket`
  - `rpc_support_update_ticket_classification`
  - `rpc_support_update_ticket_priority_severity`
  - `rpc_support_update_ticket_status_v2`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
- runtime/UI:
  - intake aceita categoria e motivo inicial opcionais quando fornecidos pelo backend
  - fila exibe categoria, prioridade/severidade e SLA interno derivado por read model
  - workspace permite classificar ticket, ajustar prioridade/severidade e transicionar status por RPC real
  - SLA permanece governanca interna, sem timer fake e sem promessa publica
- riscos restantes:
  - politicas por tenant e calendario de negocio completo ainda precisam lote proprio
  - notificacoes/automacoes de SLA continuam fora do escopo
  - arquivamento seguro de evidencia segue pendente
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - permite explicar classificacao operacional, prioridade e SLA interno como governanca auditavel do suporte B2B, sem confundir com promessa publica ao cliente

### Fase 8.9 - Secure Ticket Evidence Storage V3
- fase: `8.9`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o storage seguro de evidencias do ticket foi fechado com bucket privado, policies por tenant/ticket, upload governado por intent, metadata sanitizada, download temporario por grant curto e UI conectada no Ticket Workspace sem expor bucket ou path interno.
- docs alterados:
  - `docs/SECURE_TICKET_EVIDENCE_STORAGE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_TICKET_ATTACHMENTS_AND_ESCALATION_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_ticket_attachments`
  - `rpc_support_create_ticket_attachment_upload`
  - `rpc_support_register_ticket_attachment`
  - `rpc_support_get_ticket_attachment_download_url`
  - edge functions `ticket-evidence-upload` e `ticket-evidence-download`
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `/support/queue` em regressao rapida
- runtime/UI:
  - o suporte agora consegue enviar evidencias reais com validacao de tipo/tamanho e refresh imediato da lista sanitizada
  - o download passou a usar URL temporaria curta sem expor coordenada sensivel de storage ao frontend
  - arquivamento/remocao de evidencia segue bloqueado por ausencia de RPC segura dedicada
- riscos restantes:
  - arquivamento seguro de evidencia continua fora do corte
  - antivirus/scan e retencao/expurgo de storage ainda precisam lote proprio
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - consolida a explicacao futura de como evidencias de ticket entram na plataforma com governanca, download temporario e isolamento por tenant, sem vazar estrutura interna de storage

### Fase 8.8 - Engineering Workspace Operational Core V3
- fase: `8.8`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o nucleo operacional do Engineering Workspace foi criado para operar `engineering_work_items` originados de tickets, com fila propria, detalhe tecnico, ownership, status tecnico, updates estruturados, retorno ao suporte, auditoria e isolamento por tenant/papel.
- docs alterados:
  - `docs/ENGINEERING_WORKSPACE_OPERATIONAL_CORE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_engineering_work_items_queue`
  - `vw_engineering_work_item_detail`
  - `vw_engineering_work_item_ticket_links`
  - `vw_engineering_work_item_updates`
  - `vw_support_ticket_engineering_links`
  - `rpc_engineering_assign_work_item`
  - `rpc_engineering_unassign_work_item`
  - `rpc_engineering_update_work_item_status`
  - `rpc_engineering_add_work_item_update`
  - `rpc_engineering_return_work_item_to_support`
  - `rpc_engineering_link_existing_work_item_to_ticket`
- telas afetadas:
  - `/engineering`
  - `/engineering/work-items/:workItemId`
  - `/support/tickets/:ticketId`
  - shell do Support Workspace
- runtime/UI:
  - a engenharia agora possui fila e detalhe operacional dedicados sem virar Jira fake
  - o ticket workspace mostra ultimo retorno tecnico estruturado e link para a demanda tecnica vinculada
  - suporte enxerga vinculo tecnico permitido, mas nao altera work item sem permissao tecnica
- riscos restantes:
  - upload/storage seguro de evidencias continua fora do escopo
  - categoria inicial formal, SLA tecnico e notificacoes externas ainda precisam lote proprio
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - consolida a separacao entre tratativa de suporte e demanda tecnica, permitindo explicar handoff, status tecnico e retorno ao suporte sem expor backlog interno amplo

### Fase 8.4 - Knowledge Admin Operational Governance V3
- fase: `8.4`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: a governanca operacional da Knowledge foi endurecida com gate backend para publicacao publica v2, exigindo advisory publico revisado e checklist humano completo antes de expor qualquer artigo publico.
- docs alterados:
  - `docs/KNOWLEDGE_ADMIN_OPERATIONAL_GOVERNANCE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `rpc_admin_publish_knowledge_article_v2`
  - `rpc_admin_publish_knowledge_article_editorial_revision_v2`
  - `vw_admin_knowledge_article_review_advisories`
  - `vw_public_knowledge_*`
  - `vw_support_knowledge_public_link_candidates`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:slug`
  - `/support/tickets/:ticketId` na aba `Central de ajuda`
- runtime/UI:
  - `/admin/knowledge` bloqueia publicacao publica quando nao ha evidencia humana persistida completa
  - Public Help continua expondo somente conteudo publico publicado pelos read models do backend
  - os `8` candidatos documentais continuam pendentes, nao aprovados, nao publicados e fora do Help Center publico
- riscos restantes:
  - UI especifica de coleta de evidencia humana dos candidatos documentais ainda precisa lote proprio
  - envio/copia governada de artigo ao cliente ainda precisa contrato e auditoria especificos
  - duplicacao/consolidacao editorial avancada segue fora deste corte
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - consolida o caminho seguro para operar publicacao futura da Knowledge sem transformar candidatos documentais, drafts, internos ou restritos em conteudo publico por acidente

### Fase 8.3 - Customer Account Profile Operational Core V3
- fase: `8.3`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o nucleo operacional do Customer Account Profile foi fechado como contexto B2B real para Suporte/CS/Admin, reaproveitando o schema existente, adicionando RPC administrativa de feature flag, fixture QA com cliente sem perfil e consumo seguro no suporte.
- docs alterados:
  - `docs/CUSTOMER_ACCOUNT_PROFILE_OPERATIONAL_CORE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_customer_account_context`
  - `vw_admin_customer_account_profiles`
  - `rpc_admin_set_customer_feature_flag`
  - RPCs administrativas existentes do Customer Account Profile validadas como contrato real
- telas afetadas:
  - `/support/customers`
  - `/support/customers/:tenantId`
  - `/support/tickets/:ticketId`
- runtime/UI:
  - o rail do ticket e as telas de clientes preservam leitura real do perfil operacional e exibem `Indisponivel` quando dado operacional não existe
  - nenhuma edicao do perfil foi habilitada no frontend
- riscos restantes:
  - ownership de escrita para Suporte/CS ainda precisa decisão antes de qualquer UI de edição
  - historico operacional paginado por tenant continua fora do corte MVP
  - UI administrativa para manter perfis, integracoes, customizacoes, alertas e features ainda precisa lote próprio
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - consolida a base operacional para explicar contexto de cliente B2B, integracoes, recursos, alertas e customizacoes sem transformar a plataforma em CRM generico

### Fase 8.2 - Support Ticket Operational Flow V3
- fase: `8.2`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o primeiro bloco operacional real de tickets foi fechado com contrato backend para timeline paginada, view de candidatos seguros de link publico de Knowledge, testes pgTAP dedicados e consumo no workspace de ticket.
- docs alterados:
  - `docs/SUPPORT_TICKET_OPERATIONAL_FLOW_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `rpc_support_get_ticket_timeline`
  - `vw_support_knowledge_public_link_candidates`
  - `vw_support_ticket_timeline`
  - `vw_support_ticket_timeline_recent`
  - RPCs existentes de mensagem, nota interna, status, atribuicao, fechamento e reabertura validadas como contrato real
- telas afetadas:
  - `/support/tickets/:ticketId`
- runtime/UI:
  - o ticket workspace agora permite carregar historico anterior da timeline por RPC real quando `has_more` estiver ativo
  - a UI preserva estados de erro/loading e nao habilita acao sem contrato
- riscos restantes:
  - anexos ainda exigem storage/schema/RPC proprios
  - criacao assistida de ticket no workspace ainda precisa fluxo de entrada e decisao de superficie
  - handoff tecnico precisa entidade intermediaria e nao deve virar campo livre no ticket
  - envio/copia governada de link publico de Knowledge ainda precisa UX e auditoria especificas
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
- impacto na FAQ futura:
  - consolida a base operacional para explicar historico, resposta, nota interna, status, atribuicao e uso seguro de Knowledge dentro do ticket sem depender de IA ou regra no frontend

### Fase 8.1 - Buildout funcional do Genius Support OS V3
- fase: `8.1`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: a trilha de curadoria editorial refinada da Knowledge Base foi pausada e o foco operacional passou para o buildout funcional da plataforma, com auditoria de rotas, lacunas por dominio, backlog faseado e primeiro lote tecnico recomendado.
- docs alterados:
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `apps/web/src/features/support/SupportWorkspaceShell.tsx`
- runtime/UI:
  - removidos contadores estaticos da navegacao do `Support Workspace` para evitar sinal operacional sem contrato backend
- riscos restantes:
  - fluxos reais de ticket ainda dependem de confirmacao/fechamento de contratos backend
  - Customer Account Profile operacional ainda precisa ownership entre Admin, Suporte e CS
  - Public Help continua dependente de publicacao real de artigos no backend
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
  - `npm run web:build`
- impacto na FAQ futura:
  - a Knowledge candidata permanece como corpus inicial; a prioridade imediata deixa de ser refinamento editorial e passa a ser operacao real da plataforma

### Fase 7.40 - Knowledge Human Review Reading Pack V3
- fase: `7.40`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o pacote de leitura humano foi criado para permitir que Produto e Suporte/CS revisem o texto completo dos `8` artigos candidatos da Knowledge Base antes de qualquer aprovação ou publicação.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_HUMAN_REVIEW_READING_PACK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_REVIEW_SUMMARY.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_REVIEW_DISTRIBUTION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_LEGACY_CORPUS_FINAL_READINESS_PACK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - os `8` candidatos continuam pendentes por ausencia de evidencia humana real
  - o pacote de leitura nao aprova nem publica qualquer artigo
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - cria o material revisavel com texto completo necessario para decisao humana, sem depender de frontend ou publicacao previa

### Fase 7.39 - Knowledge Human Review Distribution Pack V3
- fase: `7.39`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o pacote operacional de distribuicao para revisao humana foi criado, com mensagens copiaveis para Produto e Suporte/CS, resumos por artigo, criterios objetivos de validacao, decisao esperada e tabela inicial de resposta para os `8` candidatos publicos.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_HUMAN_REVIEW_DISTRIBUTION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_LEGACY_CORPUS_FINAL_READINESS_PACK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - os `8` candidatos publicos continuam pendentes por ausencia de evidencia humana real
  - respostas genericas, ambiguas ou sem decisao por artigo nao aprovam publicacao
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - transforma a etapa de validacao humana em pacote operacional enviavel, sem alterar status editorial nem iniciar publicacao

### Fase 7.38 - Knowledge Legacy Corpus Final Readiness Pack V3
- fase: `7.38`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o pacote final de prontidao da Knowledge Base legada foi criado, consolidando o estado final dos `58` artigos, a matriz dos `8` candidatos publicos pendentes, o checklist unico de validacao humana, a instrucao operacional para registro de evidencia real e a lista de temas que nao devem ser reabertos agora.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_LEGACY_CORPUS_FINAL_READINESS_PACK.md`
  - `docs/knowledge/KNOWLEDGE_REMAINING_CORPUS_CLOSURE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - os `8` candidatos publicos continuam pendentes por ausencia de evidencia humana real
  - Pix, calculo, integracoes, Correios, contrato, token, sellers e troubleshooting tecnico sensivel continuam fora de nova documentacao publica
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - encerra a etapa documental da curadoria legada e desloca o proximo passo para coleta de aprovacao humana, antes de qualquer lote de publicacao

### Fase 7.35 - Knowledge PrazoPostagem Public Rewrite V3
- fase: `7.35`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: a versão candidata pública segura `Como o prazo de postagem afeta a operação de troca e devolução` foi criada em documentação, com ficha editorial, corpo em markdown, checklist de validação humana e bloqueio explícito de publicação até evidência real, sem alterar conteúdo publicado nem o corpus legado bruto.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_PRAZO_POSTAGEM_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_PRAZO_PENDENCIAS_POSTAGEM_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_LOGISTICA_POSTAGEM_CLUSTER_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o candidato ainda depende de validacao humana de Produto e Suporte/CS
  - detalhes de integracao, contrato, token e procedimento interno continuam explicitamente fora do escopo
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - transforma o primeiro recorte seguro de prazo logístico em candidato público governado, sem contaminar o artigo com trilhas técnicas ou internas

### Fase 7.34 - Knowledge PrazoPendenciasPostagem Subcluster Prep V3
- fase: `7.34`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o subcluster seguro `Prazo e pendências de postagem` foi preparado documentalmente com leitura dos artigos ligados a prazo logístico, pendência de logística reversa, CEP/endereço e revisão cadastral, além da delimitação explícita da fronteira sensível com a regra de não gerar logística reversa, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_PRAZO_PENDENCIAS_POSTAGEM_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_LOGISTICA_POSTAGEM_CLUSTER_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o subcluster ainda depende de reescrita segura para remover navegacao interna literal e acoplamento a backoffice
  - a fronteira com excecoes manuais de logistica reversa continua bloqueada para publicacao direta
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - isola o primeiro recorte de logística com melhor potencial público, sem misturar integração, contrato ou seller

### Fase 7.33 - Knowledge LogisticaPostagem Cluster Prep V3
- fase: `7.33`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o cluster `Logística reversa e postagem` foi preparado documentalmente com leitura dos artigos fonte, separação entre prazo logístico, pendências de postagem, CEP/endereço, exceções de logística reversa e trilhas internas de Correios, contratos, tokens e sellers, além de definição de fronteiras editoriais e de possíveis canônicos futuros, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_LOGISTICA_POSTAGEM_CLUSTER_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o cluster continua dividido entre um recorte público potencial e uma trilha interna de integração e operação logística sensível
  - qualquer futura abertura pública depende de reescrita segura e validação explícita de Produto e Suporte/CS, com Engenharia quando houver transportadora ou integração
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - abre uma nova trilha governada fora de estorno para tratar postagem e logística reversa por recorte seguro, sem misturar integração e contrato com ajuda pública

### Fase 7.32 - Knowledge Estorno Sensitive Clusters Closure V3
- fase: `7.32`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o fechamento documental do cluster `Estornos e reembolsos` foi consolidado em uma visão executiva única, separando os recortes que podem seguir para validação humana, os que exigem revisão técnica ou humana adicional e os que permanecem bloqueados por risco, sem aprovar nem publicar qualquer conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_CLUSTERS_CLOSURE.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - apenas os recortes `Formas de estorno disponíveis na operação` e `Como organizar motivos de troca e devolução na operação` podem seguir para validação humana
  - Pix, cálculo e limites, além de integrações e gateway, continuam bloqueados para público
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - encerra o cluster de estorno com uma régua única de avanço, bloqueio e validação antes de qualquer lote de publicação

### Fase 7.31 - Knowledge IntegracoesGateway Subcluster Prep V3
- fase: `7.31`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o subcluster `Integrações e gateway` foi preparado documentalmente com leitura dos artigos fonte, separação entre permissões VTEX, credenciais, erro de autorização, gateway, dependências externas, Pix integrado e governança de seller, além de definição de fronteiras editoriais e de possíveis canônicos futuros, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_INTEGRACOES_GATEWAY_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o subcluster continua sensivel por tocar credenciais, permissões, gateway, seller e comportamento externo
  - qualquer futura abertura publica depende de recorte novo e validacao explicita de Produto, Engenharia e Suporte/CS
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - impede que integracoes, credenciais e troubleshooting de gateway sejam diluidos indevidamente nos artigos publicos de estorno

### Fase 7.27 - Knowledge RegrasMotivo Subcluster Prep V3
- fase: `7.27`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o subcluster `Regras e políticas por motivo` foi preparado documentalmente com leitura dos artigos fonte, separação entre cadastro de motivos, políticas de estorno, exceções logísticas e efeitos financeiros, além de definição de fronteiras editoriais e possíveis canônicos futuros, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_REGRAS_MOTIVO_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o subcluster continua misturando politica operacional, frete, logistica reversa e forma de estorno
  - qualquer futura abertura publica fora do cadastro de motivos depende de validacao forte de Produto e Suporte/CS
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - separa o que pode virar orientacao pública sobre motivos do que deve continuar como regra operacional interna

### Fase 7.26 - Knowledge Pix Estorno Subcluster Prep V3
- fase: `7.26`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o subcluster `Pix e estorno` foi preparado documentalmente com leitura dos artigos fonte, separação de temas de automação, gateway, permissões, mudança manual de reembolso e troubleshooting, além de definição de fronteiras editoriais e de futuros canônicos possíveis, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_PIX_ESTORNO_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - Pix continua sensivel demais para abertura publica imediata por depender de pagamento, automacao, gateway e validacao financeira
  - qualquer trilha futura de Pix depende de validacao explicita de Produto e Suporte/CS
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - impede que o tema de Pix seja tratado de forma simplista dentro do canônico geral de estorno

### Fase 7.25 - Knowledge ValeCompra Subcluster Prep V3
- fase: `7.25`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o subcluster `Vale-compra e crédito` foi preparado documentalmente com leitura dos cinco artigos fonte, separação de temas internos, definição de fronteiras editoriais e matriz de futuros canônicos possíveis, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_VALE_COMPRA_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o tema mistura reembolso, credito, retencao, seller e automacao financeira, entao continua sensivel demais para abertura publica imediata
  - qualquer trilha futura de vale-compra depende de validacao de Produto e Suporte/CS
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - desloca o tema de vale-compra para um backlog governado proprio, em vez de deixa-lo diluido no cluster geral de estorno

### Fase 7.24 - Knowledge Estorno Sensitive Subclusters Mapping V3
- fase: `7.24`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: os temas sensiveis derivados de `Estornos e reembolsos` foram separados em subclusters documentais com risco, destino editorial e trilha futura propria, evitando que o canônico de formas de estorno absorva Pix, vale-compra, cálculo, limites, políticas financeiras, integrações ou troubleshooting técnico nesta fase.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CANONICAL_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CONSOLIDATION_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - Pix, vale-compra, cálculo e integrações seguem como trilhas de alto risco e não podem entrar em publicação sem revisão técnica forte
  - o canônico de formas de estorno continua pendente de validação humana explícita
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - desloca a evolução editorial de estorno para grupos sensíveis governados, em vez de continuar expandindo artigos isolados

### Fase 7.23 - Knowledge Estorno Canonical Rewrite V3
- fase: `7.23`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a versao candidata reescrita do artigo canonico `Formas de estorno disponíveis na operação` foi criada em documentacao, com ficha editorial, corpo em markdown, checklist de validacao humana e bloqueio explicito de publicacao ate evidencia real, sem alterar conteudo publicado nem o corpus legado bruto.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CANONICAL_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CONSOLIDATION_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o canônico continua dependente de validacao humana explicita
  - Pix, vale-compra e regras financeiras seguem fora do escopo e precisam de trilha separada
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - antecipa a redacao canônica do tema de estorno sem confundir consolidacao editorial com publicacao real

### Fase 7.22 - Knowledge Estorno Consolidation Prep V3
- fase: `7.22`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a duplicidade confirmada do cluster `Formas de Estorno` foi tratada documentalmente com comparacao do corpus real, proposta de artigo canonico, mapa de consolidacao e matriz de decisao editorial, sem aprovar nem publicar qualquer conteudo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CONSOLIDATION_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
- riscos restantes:
  - o canônico de estorno ainda depende de validacao de `Produto` e `Suporte/CS`
  - o tema continua sensivel por tocar meios de estorno, Pix e politica operacional
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - cria a base documental para consolidacao manual do canônico de estorno antes de qualquer lote de reescrita ou publicacao

### Fase 7.21 - Knowledge Legacy Full Corpus Curation Pack V3
- fase: `7.21`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o corpus legado completo exportado do Octadesk foi reorganizado documentalmente em uma matriz unica de `58` artigos, com prioridade, taxonomia publica proposta, subcategoria futura opcional, destino editorial, riscos e trilha consolidada de intake e coleta de aprovacao humana, sem aprovar nem publicar nenhum conteudo.
- docs alterados:
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/reports/LEGACY_CORPUS_EDITORIAL_AUDIT.md`
  - `docs/knowledge/LEGACY_CORPUS_HUMAN_CURATION_SPRINT.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/knowledge/KNOWLEDGE_TAXONOMY_FUTURE_MODEL.md`
  - `docs/knowledge/KNOWLEDGE_P0_APPROVAL_INTAKE_PACK.md`
  - `docs/knowledge/KNOWLEDGE_P0_FINAL_HUMAN_DECISION.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - nenhuma alteracao em `/admin/knowledge`, `/help/genius` ou rotas relacionadas
- riscos restantes:
  - a maior parte do corpus ainda depende de reescrita editorial, consolidacao manual ou revisao tecnica antes de qualquer gate de publicacao
  - integracoes, Correios, sellers e estornos concentram os maiores riscos tecnicos e de exposicao interna
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - substitui a trilha fragmentada por artigo por um backlog unico orientado por grupo, prioridade e taxonomia

### Fase 7.20 - Knowledge P0 Human Evidence Collection Readiness V3
- fase: `7.20`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: foi criado o playbook operacional de coleta de evidencia humana para os quatro artigos `P0`, com mensagens copiaveis para `Produto` e `Suporte/CS`, orientacao de registro da evidencia, checklist de readiness e regra operacional para mensagens informais, sem aprovar nem publicar nenhum conteudo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_P0_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/knowledge/KNOWLEDGE_P0_APPROVAL_INTAKE_PACK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/knowledge/KNOWLEDGE_P0_FINAL_HUMAN_DECISION.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - nenhum workflow automatico novo em `/admin/knowledge`, `/help/genius` ou superfices relacionadas
- riscos restantes:
  - os quatro artigos `P0` continuam pendentes enquanto nao existir evidencia humana explicita registrada
  - mensagens informais continuam invalidas como aprovacao isolada sem transcricao ou resumo no registro oficial
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - reduz friccao operacional para coletar aprovacao humana real
  - separa claramente intake, coleta operacional e registro oficial de evidencia

### Fase 7.19 - Knowledge P0 Approval Intake Pack V3
- fase: `7.19`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: foi criado um pacote documental objetivo para intake de aprovacao humana futura dos quatro artigos `P0`, com checklists separados para `Produto` e `Suporte/CS`, template copiavel de evidencia, perguntas objetivas por artigo e riscos a validar, sem aprovar nem publicar nenhum conteudo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_P0_APPROVAL_INTAKE_PACK.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/knowledge/KNOWLEDGE_P0_FINAL_HUMAN_DECISION.md`
  - `docs/knowledge/KNOWLEDGE_P0_PUBLICATION_PREP.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - nenhum workflow automatico novo em `/admin/knowledge`, `/help/genius` ou superfices relacionadas
- riscos restantes:
  - os quatro artigos `P0` continuam pendentes enquanto nao existir evidencia humana explicita
  - o intake pack organiza a coleta, mas nao substitui o registro oficial nem o gate final
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - prepara a coleta consistente de aprovacao humana antes de qualquer publicacao real
  - reduz ambiguidade na validacao entre `Produto` e `Suporte/CS`

### Fase 7.18 - Knowledge Governance Refinement V3
- fase: `7.18`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a governanca documental da Knowledge Base foi refinada para explicitar tipos de bloqueio, override editorial governado e os limites duros desse override, enquanto a evolucao futura de taxonomia com subcategoria opcional foi registrada como direcao conceitual sem qualquer implementacao tecnica.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/knowledge/KNOWLEDGE_TAXONOMY_FUTURE_MODEL.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - nenhuma simulacao de subcategoria em `/help/genius`, `/admin/knowledge` ou superfices relacionadas
- riscos restantes:
  - os quatro artigos `P0` continuam pendentes e sem aprovacao humana explicita
  - override continua apenas como mecanismo documental governado; nao existe workflow automatico ou enforcement de sistema nesta fase
  - subcategoria continua apenas como direcao futura e exige auditoria completa antes de qualquer implementacao
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - melhora a clareza entre bloqueio temporario, bloqueio com override e bloqueio definitivo
  - registra desde ja a hierarquia futura `categoria > subcategoria opcional > artigo` sem contaminar o MVP atual

### Fase 7.17 - Knowledge Human Approval Evidence Register V3
- fase: `7.17`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: foi criada a estrutura documental oficial para registrar aprovacoes humanas reais de Produto e Suporte/CS, com evidencia minima obrigatoria por aprovador e placeholders por artigo para os quatro `P0` ainda pendentes, sem aprovar nada e sem publicar conteudo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/knowledge/KNOWLEDGE_P0_FINAL_HUMAN_DECISION.md`
  - `docs/knowledge/KNOWLEDGE_P0_PUBLICATION_PREP.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - nenhum artigo foi aprovado e nenhum artigo foi publicado
  - os quatro `P0` continuam pendentes enquanto nao existir evidencia humana explicita no registro
  - `Como informar a SKU durantge a troca` e `Regra por motivo` continuam fora da trilha de aprovacao final por bloqueio tecnico anterior
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - cria a trilha oficial de evidencia humana antes de qualquer publicacao real
  - evita que aprovacoes verbais ou nao rastreadas sejam tratadas como autorizacao editorial

### Fase 7.16 - Knowledge P0 Final Human Decision Gate V3
- fase: `7.16`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o gate humano final dos quatro artigos `P0` preparados foi consolidado em documento proprio, registrando por artigo a pendencia herdada, o estado de Produto e Suporte/CS e a decisao final de elegibilidade sem simular nenhuma aprovacao humana inexistente no repositorio.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_P0_FINAL_HUMAN_DECISION.md`
  - `docs/knowledge/KNOWLEDGE_P0_PUBLICATION_PREP.md`
  - `docs/knowledge/KNOWLEDGE_P0_HUMAN_REVIEW_GATE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - nenhum artigo foi publicado e nenhum artigo foi marcado como aprovado
  - os quatro artigos continuam pendentes de aprovacao humana explicita de Produto e Suporte/CS
  - `Como informar a SKU durantge a troca` e `Regra por motivo` permanecem fora do gate final por bloqueio tecnico anterior
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - formaliza que o pacote editorial esta pronto para avaliacao humana, mas nao autorizado para publicacao
  - impede leitura equivocada de que o simples preparo documental equivaleria a aprovacao final

### Fase 7.15 - Knowledge P0 Publication Prep V3
- fase: `7.15`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: os quatro artigos `P0` marcados como `elegível com ajustes` no gate humano foram consolidados em um pacote documental de pré-publicação com copy final candidata, checklist de aprovação, pendências humanas finais e matriz executiva pronta para decisão humana final, sem publicar nenhum conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_P0_PUBLICATION_PREP.md`
  - `docs/knowledge/KNOWLEDGE_P0_HUMAN_REVIEW_GATE.md`
  - `docs/knowledge/LEGACY_CORPUS_P0_REWRITE_CANDIDATES.md`
  - `docs/knowledge/LEGACY_CORPUS_HUMAN_CURATION_SPRINT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - nenhum artigo foi publicado; os quatro preparados continuam dependentes de aprovacao humana explicita
  - a publicacao futura ainda depende de confirmar nomenclatura atual e aderencia do comportamento descrito no produto
  - `Como informar a SKU durantge a troca` e `Regra por motivo` permanecem fora deste lote por bloqueio tecnico
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - prepara o primeiro pacote editorial realmente pronto para decisao humana final sem misturar essa etapa com publicacao
  - separa com clareza os artigos ja aptos a avaliacao final daqueles que ainda precisam retornar para revisao tecnica

### Fase 7.14 - Knowledge P0 Human Review Gate V3
- fase: `7.14`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a rodada formal de revisão humana dos seis artigos `P0` foi consolidada em um gate documental único, separando elegibilidade com ajustes, revisão técnica obrigatória, dono da próxima validação e bloqueadores por artigo antes de qualquer lote futuro de publicação.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_P0_HUMAN_REVIEW_GATE.md`
  - `docs/knowledge/LEGACY_CORPUS_P0_REWRITE_CANDIDATES.md`
  - `docs/knowledge/LEGACY_CORPUS_HUMAN_CURATION_SPRINT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - nenhum artigo foi publicado; os quatro elegíveis seguem dependentes de revisão humana explícita
  - `Como informar a SKU durantge a troca` e `Regra por motivo` continuam bloqueados por ambiguidade funcional e dependência de validação técnica
  - parte dos textos ainda depende de confirmação de nomenclatura atual para não carregar resíduo de UI legada
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - formaliza o primeiro gate humano de elegibilidade da trilha de curadoria do corpus legado
  - separa claramente o que já pode seguir para preparação de publicação do que ainda deve retornar para revisão técnica

### Fase 7.13 - Legacy Corpus P0 Rewrite Sprint V3
- fase: `7.13`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a primeira leva manual de reescrita do corpus legado foi executada para os seis artigos `P0`, gerando candidatos editoriais em markdown com titulo publico sugerido, categoria, resumo, corpo revisado, riscos, checklist e decisao recomendada, sem publicar nada e sem alterar runtime ou contrato.
- docs alterados:
  - `docs/knowledge/LEGACY_CORPUS_P0_REWRITE_CANDIDATES.md`
  - `docs/knowledge/LEGACY_CORPUS_HUMAN_CURATION_SPRINT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - os candidatos seguem sem publicacao e ainda exigem revisao humana de produto e suporte/CS
  - `Como informar a SKU durantge a troca` e `Regra por motivo` permanecem ambiguos demais para elegibilidade imediata e exigem validacao tecnica
  - os textos ainda dependem de confirmacao final de nomenclatura e aderencia ao fluxo atual do produto
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - registra o primeiro conjunto de versoes candidatas com voz B2B para o backlog legado
  - prepara a camada editorial para uma rodada formal de aprovacao humana sem misturar essa etapa com publicacao

### Fase 7.12 - Legacy Corpus Human Curation Sprint V3
- fase: `7.12`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a auditoria do corpus legado foi desdobrada em uma sprint documental de curadoria humana com matriz dos `58` artigos candidatos, lote inicial seguro para reescrita, proposta manual de consolidacao de duplicidade, taxonomia publica definitiva recomendada e bloqueios explicitos de publicacao.
- docs alterados:
  - `docs/knowledge/LEGACY_CORPUS_HUMAN_CURATION_SPRINT.md`
  - `docs/reports/LEGACY_CORPUS_EDITORIAL_AUDIT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro indireto em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - a sprint continua apenas documental; nenhum artigo foi reescrito, publicado ou consolidado no produto
  - os temas de integracao, Correios, permissoes, estorno automatico, PIX e vale-compra seguem bloqueados para qualquer lote publico sem revisao especifica
  - a duplicidade confirmada de formas de estorno ainda exige decisao humana sobre artigo canonico e arquivamento do duplicado
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - documenta a fronteira entre backlog legado bruto, backlog curado e corpus publico oficial
  - formaliza a taxonomia publica recomendada como base editorial para os proximos lotes humanos
  - registra quais grupos podem entrar primeiro em reescrita e quais grupos permanecem bloqueados por risco

### Fase 7.11 - Legacy Corpus Editorial Cleanup V3
- fase: `7.11`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o corpus legado candidato da Knowledge Base foi auditado diretamente a partir do export preservado em `raw_knowledge/octadesk_export/latest/`, com relatorio editorial consolidado sobre risco, taxonomia publica proposta, clusters de duplicidade, exemplos de reescrita e backlog de curadoria, sem publicar conteudo e sem alterar o runtime.
- docs alterados:
  - `docs/reports/LEGACY_CORPUS_EDITORIAL_AUDIT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto indireto futuro em `/admin/knowledge`, `/help/genius` e `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - a maior parte do corpus ainda exige reescrita humana antes de qualquer nova promocao para a camada publica
  - deduplicacao real continua manual; alem da duplicidade confirmada em estorno, ha clusters tematicos que ainda precisam de consolidacao humana
  - artigos de integracoes, permissoes, Correios, PIX e estorno automatico seguem como material sensivel e nao devem migrar para publico por heuristica
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit documental e fora de qualquer decisao de produto
- impacto na FAQ futura:
  - formaliza que backlog legado e corpus publicado sao trilhas diferentes
  - registra a taxonomia publica proposta como insumo editorial, nao como contrato materializado
  - reforca que publicacao publica continua bloqueada sem curadoria humana e revisao operacional

### Fase 7.10 - Admin Knowledge Editorial Governance V3
- fase: `7.10`
- commit: `1f6b959919b1fb9d4f73f2c7133c226b021df5a6`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o cockpit `/admin/knowledge` passou a comunicar de forma mais explícita a triagem entre backlog legado, curadoria humana, possíveis duplicidades, revisão persistida e governança de visibilidade, mantendo coerência com Help Center público e com a aba `Central de ajuda` do ticket sem criar contrato novo.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/admin/knowledge`
  - validacao regressiva em `/help/genius`
  - validacao regressiva em `/help/genius/articles`
  - validacao regressiva em `/help/genius/articles/:slug`
  - validacao regressiva em `/help/genius/articles/inexistente`
  - validacao regressiva em `/support/tickets/:ticketId` na aba `Central de ajuda`
- riscos restantes:
  - a leitura de duplicidade continua apenas indicativa e depende da origem rastreada/advisory atual; nao existe mecanismo novo de consolidacao automatica
  - titulos e categorias legadas ainda podem carregar linguagem tecnica do dataset historico dentro do cockpit interno, embora a governanca visual agora deixe mais claro que se trata de material de curadoria
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - reforca que backlog legado e curadoria humana continuam separados da camada publica oficial
  - documenta que publicacao publica depende de visibilidade coerente, revisao persistida e decisao humana explicita no cockpit editorial

### Fase 7.9 - Public Knowledge Taxonomy V3
- fase: `7.9`
- commit: `e9119b4a5b285c1f6d2928049cd39a518d3020e7`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a descoberta pública de conhecimento foi refinada para destacar jornadas operacionais usando apenas categorias e artigos já existentes, enquanto o cockpit `/admin/knowledge` passou a reforçar a origem editorial governada da Central de Ajuda e a aba `Central de ajuda` do ticket deixou mais clara a fronteira entre leitura pública aprovada e curadoria interna.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:slug`
  - `/help/genius/articles/inexistente`
  - ajuste visual/editorial em `/admin/knowledge`
  - ajuste visual/editorial na aba `Central de ajuda` em `/support/tickets/:ticketId`
- riscos restantes:
  - a taxonomia publica continua limitada aos dados atuais de categorias e artigos publicados; nenhuma classificacao dinamica nova foi criada sem contrato
  - a camada publica continua sem abertura publica de ticket, feedback persistido ou portal B2B, porque esses fluxos nao possuem contrato/backend nesta fase
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - documenta que a descoberta publica por categoria/jornada continua editorialmente governada pelo cockpit interno de Knowledge
  - reforca que publicado e publico nao sao sinonimos no fluxo interno e que apenas conteudo aprovado chega a camada publica

### Fase 7.8 - Public Support Transition V3
- fase: `7.8`
- commit: `cc4cda76fa8c6a7a95f7c4e762e5af1e7a70db6d`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a camada publica de ajuda foi refinada para orientar contato com suporte sem prometer portal ou abertura publica de ticket, enquanto a aba `Central de ajuda` do Support Workspace reforcou o recorte do que e realmente compartilhavel com o cliente.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:slug`
  - `/help/genius/articles/inexistente`
  - ajuste visual de transicao em `/support/tickets/:ticketId` na aba `Central de ajuda`
  - validacao regressiva: `/support/tickets/:ticketId` na aba `Conversar`, `/support/queue`, `/admin/knowledge`
- riscos restantes:
  - a camada publica continua sem abertura real de ticket, acompanhamento publico ou feedback persistido porque esses fluxos nao possuem contrato/backend nesta fase
  - a experiencia publica continua dependente dos canais oficiais disponibilizados no branding publico; quando nao houver contato projetado pelo backend, a UX permanece apenas com orientacao segura
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - documenta explicitamente que a Central Publica orienta o cliente para canais operacionais reais sem simular funcionalidades publicas inexistentes
  - registra a ponte oficial entre leitura publica e uso interno do Support Workspace como transicao visual, nao como extensao contratual do produto

### Fase 7.7 - Saneamento Visual Help Center
- fase: `7.7`
- commit: `930d58268a1fb6530ce9c00c6a1328ceef032756`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: a Central Pública de Ajuda e as superfícies de transição com Knowledge foram consolidadas como camada pública documental, com header leve, scroll natural, ausência de shell interno, leitura mais clara de artigos e consistência visual com o Support Workspace sem misturar shells.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em Supabase, migrations, views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:slug`
  - ajuste visual de transicao na aba `Central de ajuda` em `/support/tickets/:ticketId`
  - validacao regressiva: `/admin/knowledge`, `/support/tickets/:ticketId`, `/support/queue`
- riscos restantes:
  - a camada publica continua dependente dos contratos atuais de navegacao, artigos publicados e contatos publicos; quando algum dado nao vier do backend, a UI segue em fallback seguro
  - a unificacao entre `Admin Shell` e `Support Workspace Shell` continua apenas como pendencia arquitetural futura e permanece fora desta fase
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - formaliza a Central Pública como superficie documental separada dos cockpits internos, mantendo coerencia visual sem reaproveitar shell administrativo ou operacional
  - documenta que a validacao oficial das rotas publicas considera viewport real, scroll natural da pagina, ausencia de overflow horizontal e bloqueio de qualquer exposicao de conteudo interno ou tecnico
  - registra que a ponte visual com o Support Workspace nao cria contrato novo e apenas reforca o uso seguro dos artigos publicos existentes

### Fase 7.6 - Saneamento Visual Support Workspace V3
- fase: `7.6`
- commit: `fcf78cd5f3289eaec74c8a68fe0d2d0d15b49488`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o Support Workspace foi consolidado para viewport real do navegador com `--app-viewport-height`, removendo scroll global, eliminando o uso da coluna esquerda como solucao de rolagem e reforcando a densidade operacional dos cockpits de fila, ticket e clientes.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers`
  - `/support/customers/:tenantId`
  - validacao regressiva: `/admin/tenants`, `/admin/knowledge`, `/admin/access`, `/admin/system`
- riscos restantes:
  - o lote continua dependente dos contratos atuais de contexto de cliente; onde o backend ainda nao entrega dados ricos, a UI permanece em degradacao segura com `Indisponivel`
  - a unificacao entre `Admin Shell` e `Support Workspace Shell` continua como pendencia arquitetural futura e exige auditoria previa de auth, roles, rotas, RLS, navegacao e estados de acesso antes de qualquer refactor
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - formaliza que o workspace operacional de suporte tambem adota `1920x1080` apenas como referencia visual, nao como altura fisica obrigatoria
  - documenta que a validacao oficial do cockpit Support exige viewport real, ausencia de scroll global e scroll interno apenas em lista/thread/feed/rail quando necessario

### Fase 7.5 - Correcao Visual Admin V3
- fase: `7.5`
- commit: `57fd409260dd9acea310b029e2f46c1ea5a1b5dd`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o cockpit administrativo foi consolidado para viewport real do navegador, com densidade de Full HD por escala visual menor, shell baseado em `--app-viewport-height`, eliminacao de scroll global indevido e remocao de scroll na coluna esquerda das telas administrativas validadas.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhum ajuste em views, RPCs, contracts, fixtures, RLS ou permissoes
- telas afetadas:
  - `/admin/knowledge`
  - `/admin/access`
  - `/admin/system`
  - `/admin/tenants`
- riscos restantes:
  - a unificacao entre `Admin Shell` e `Support Workspace Shell` continua como pendencia arquitetural futura e exige auditoria previa de auth, roles, rotas, RLS, navegacao e estados de acesso antes de qualquer refactor
  - `docs/design/blueprint/Conversas.png` permanece `untracked`, fora do commit visual e fora deste fechamento documental ate decisao explicita
- impacto na FAQ futura:
  - formaliza que `1920x1080` e referencia visual de composicao, nao altura fisica obrigatoria da app
  - documenta o criterio oficial de aceite do cockpit Admin em viewport real, sem scroll global e com scroll interno apenas em lista/feed/rail quando necessario

### Fase 7.4 - Admin Knowledge Editorial Revision
- fase: `7.4`
- commit: `HEAD da branch 7.4`
- branch: `codex/phase7-4-admin-knowledge-editorial-revision`
- data: `2026-05-06`
- resumo funcional: o contrato editorial da Knowledge Base passou a suportar revisão privada de artigo já publicado, com draft editorial isolado, republicação explícita e estabilidade da rota pública até o publish da atualização.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`
  - `rpc_admin_begin_knowledge_article_editorial_revision_v2`
  - `rpc_admin_update_knowledge_article_editorial_revision_v2`
  - `rpc_admin_publish_knowledge_article_editorial_revision_v2`
  - `rpc_admin_discard_knowledge_article_editorial_revision_v2`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/genius/articles/:slug`
- riscos restantes:
  - `published_by` continua ausente no modelo atual; a rastreabilidade de publicação segue por `published_at` e `updated_by_user_id`
  - o contrato ainda trabalha com um draft editorial por artigo publicado; histórico fino de múltiplas revisões concorrentes continua fora do escopo
- impacto na FAQ futura:
  - permite revisar conteúdo público real sem expor rascunho ao cliente
  - sustenta atualização segura do corpus público B2B sem quebrar link já compartilhado

### Fase 7.3 - First Real Public Content Pack
- fase: `7.3`
- commit: `HEAD da branch 7.3`
- branch: `codex/phase7-3-first-public-content-pack`
- data: `2026-05-06`
- resumo funcional: a fixture local canonica passou a publicar o primeiro lote real da Central de Ajuda Genius com categorias publicas B2B, seis artigos operacionais, autoria humana de `ede.oliveira@confi.com.vc` e `public_article_path` validado pelo contrato backend.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - consumo validado em `vw_admin_knowledge_spaces`
  - consumo validado em `vw_admin_knowledge_categories_v2`
  - consumo validado em `vw_admin_knowledge_articles_list_v2`
  - consumo validado em `vw_admin_knowledge_article_detail_v2`
  - consumo validado em `vw_public_knowledge_space_resolver`
  - consumo validado em `vw_public_knowledge_navigation`
  - consumo validado em `vw_public_knowledge_articles_list`
  - consumo validado em `vw_public_knowledge_article_detail`
  - consumo validado em `app_private.vw_knowledge_articles_public_contract`
  - escrita operacional em `rpc_admin_create_knowledge_category_v2`
  - escrita operacional em `rpc_admin_create_knowledge_article_draft_v2`
  - escrita operacional em `rpc_admin_submit_knowledge_article_for_review_v2`
  - escrita operacional em `rpc_admin_publish_knowledge_article_v2`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/genius`
  - `/help/genius/articles/:slug`
- riscos restantes:
  - artigo publicado ainda nao e editavel in-place pelo contrato atual; uma fase futura precisa abrir revisao + republicacao versionada
  - `published_by` nao existe como campo dedicado no modelo atual; a rastreabilidade de publish continua representada por `published_at` + `updated_by_user_id`
- impacto na FAQ futura:
  - cria o primeiro corpus publico oficial e citavel da Central de Ajuda Genius
  - separa claramente conteudo B2B publico de conteudo interno/restrito no baseline local

### Fase 7.2 - Public Link Contract
- fase: `7.2`
- commit: `10bbca7`
- branch: `codex/phase7-2-public-link-contract`
- data: `2026-05-06`
- resumo funcional: o backend passou a materializar `public_article_path` como source of truth para elegibilidade e rota publica segura de artigos usados em Ticket Workspace, Admin Knowledge e Help Center, removendo heuristica fragil do frontend.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `app_private.vw_knowledge_articles_public_contract`
  - `app_private.resolve_public_knowledge_article_path`
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`
  - `vw_support_ticket_knowledge_links`
  - `vw_support_knowledge_article_picker`
  - `vw_customer_portal_ticket_knowledge_links`
- telas afetadas:
  - `/admin/knowledge`
  - `/support/tickets/:ticketId`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - o gate de revisao humana para publish continua sendo de UX; o backend ainda nao bloqueia por `review_status = reviewed`
  - o contrato ainda entrega caminho relativo, nao URL canonica absoluta
- impacto na FAQ futura:
  - torna auditavel quando um artigo publico e de fato elegivel para compartilhamento seguro
  - elimina explicacoes baseadas em inferencia de URL no frontend

### Fase 7.1 - Admin Knowledge Functional Hardening
- fase: `7.1`
- commit: `fe0d900`
- branch: `codex/phase7-1-admin-knowledge-functional-hardening`
- data: `2026-05-06`
- resumo funcional: `/admin/knowledge` passou a usar preview editorial real, degradacao segura sem advisory, bloqueio de publish incoerente com categoria nao publica e mensagens de erro amigaveis, sem alterar backend.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - consumo mantido em `vw_admin_knowledge_spaces`
  - consumo mantido em `vw_admin_knowledge_categories_v2`
  - consumo mantido em `vw_admin_knowledge_articles_list_v2`
  - consumo mantido em `vw_admin_knowledge_article_detail_v2`
  - consumo condicional em `vw_admin_knowledge_article_review_advisories`
  - escrita mantida em `rpc_admin_create_knowledge_category_v2`
  - escrita mantida em `rpc_admin_create_knowledge_article_draft_v2`
  - escrita mantida em `rpc_admin_update_knowledge_article_draft_v2`
  - escrita mantida em `rpc_admin_submit_knowledge_article_for_review_v2`
  - escrita mantida em `rpc_admin_publish_knowledge_article_v2`
  - escrita mantida em `rpc_admin_archive_knowledge_article_v2`
  - escrita condicional em `rpc_admin_update_knowledge_article_review_status`
  - escrita condicional em `rpc_admin_mark_knowledge_article_reviewed`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - `publish` ainda nao e bloqueado pelo backend a partir de `review_status = reviewed`; o gate continua sendo apenas de UX nesta fase
  - a fixture local atual nao garantiu advisory persistido para validar mutacao real de revisao humana ponta a ponta
- impacto na FAQ futura:
  - melhora a rastreabilidade entre estado editorial interno e publicacao visivel na Central Publica
  - documenta que coerencia `public + published + categoria publica` continua sendo pre-requisito real de exposicao publica

### Fase 4.7 - Public Help Center Branding Contract
- fase: `4.7`
- commit: `68a44ea`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: branding publico sanitizado passou a ser exposto no resolver e aplicado com validacao no frontend da Central Publica.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PRODUCT_VISION.md`
- views/RPCs afetadas:
  - `vw_public_knowledge_space_resolver`
- telas afetadas:
  - `/help`
  - `/help/:spaceSlug`
  - `/help/:spaceSlug/articles`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - `seo_defaults.imageUrl` ainda sem consumo pleno no frontend naquele momento
  - busca, IA, chat e portal B2B continuavam bloqueados
- impacto na FAQ futura:
  - habilita responder como a marca publica da Central e derivada sem expor `brand_settings` bruto

### Fase 4.9 - Public Help Center Search Contract
- fase: `4.9`
- commit: `7323421`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: busca publica textual minima entregue com RPC segura e UX basica na Central Publica.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
- views/RPCs afetadas:
  - `rpc_public_search_knowledge_articles`
- telas afetadas:
  - `/help/:spaceSlug`
- riscos restantes:
  - busca ainda sem sinônimos, curadoria editorial de ranking ou IA
  - sem roteamento publico dedicado por dominio
- impacto na FAQ futura:
  - habilita perguntas futuras sobre como localizar artigos publicados dentro de um knowledge space ativo

### Fase 4.9.1 - Public Help Center UX Readability Polish + Documentation Ledger Strategy
- fase: `4.9.1`
- commit: `3b76961`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: polish visual da Central Publica para leitura B2B tecnica e criacao da estrategia oficial de FAQ/ledger documental da plataforma.
- docs alterados:
  - `docs/PLATFORM_FAQ_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido em `vw_public_knowledge_space_resolver`
  - consumo mantido em `vw_public_knowledge_navigation`
  - consumo mantido em `vw_public_knowledge_articles_list`
  - consumo mantido em `vw_public_knowledge_article_detail`
  - consumo mantido em `rpc_public_search_knowledge_articles`
- telas afetadas:
  - `/help`
  - `/help/:spaceSlug`
  - `/help/:spaceSlug/articles`
  - `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - a FAQ oficial ainda nao foi escrita; so a estrategia e o ledger foram formalizados
- impacto na FAQ futura:
  - define o metodo oficial para transformar funcionalidade validada em pergunta/resposta rastreavel
  - cria trilha minima para responder por ambiente, perfil autorizado e fonte documental

### Fase 5.0 - Knowledge Content Curation Pipeline
- fase: `5.0`
- commit: `4e7f0a6`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: auditoria do corpus legado, definicao do plano editorial de curadoria e consolidacao do inventario oficial sem publicar conteudo automaticamente.
- docs alterados:
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - uso documental do dry-run de `scripts/knowledge/import-octadesk-drafts.mjs`
- telas afetadas:
  - nenhuma
- riscos restantes:
  - a curadoria continua dependente de leitura humana artigo a artigo
  - o banco local padrao segue sem o lote legado importado apos `supabase:verify`
  - a classificacao desta fase e conservadora e heuristica, nao decisao editorial final
- impacto na FAQ futura:
  - define a regra de que conhecimento oficial so nasce de conteudo validado e curado
  - separa o que pode virar FAQ publica do que deve permanecer interno ou restrito

### Fase 5.1 - Legacy Knowledge Import Backlog + Controlled Draft Ingestion
- fase: `5.1`
- commit: `d3239ec`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: backlog versionado de curadoria legado criado, import Octadesk validado em dry-run e apply local controlado, e `/admin/knowledge` ajustado para evidenciar origem e hash do legado.
- docs alterados:
  - `docs/reports/KNOWLEDGE_LEGACY_CURATION_BACKLOG.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido em `vw_admin_knowledge_spaces`
  - consumo mantido em `vw_admin_knowledge_categories_v2`
  - consumo mantido em `vw_admin_knowledge_articles_list_v2`
  - consumo mantido em `vw_admin_knowledge_article_detail_v2`
  - uso operacional mantido em `rpc_admin_create_knowledge_article_draft_v2`
  - uso operacional mantido em `rpc_admin_update_knowledge_article_draft_v2`
- telas afetadas:
  - `/admin/knowledge`
- riscos restantes:
  - o lote legado aplicado localmente nao persiste apos `supabase:verify`
  - a classificacao do backlog continua heuristica e depende de revisao humana artigo a artigo
  - todos os artigos legado continuam em `draft`, sem publicacao automatica
- impacto na FAQ futura:
  - cria backlog rastreavel para separar o que pode virar documentacao publica, playbook interno ou conteudo restrito
  - formaliza de onde deve sair a futura FAQ operacional baseada no corpus legado curado

### Fase 5.2 - Knowledge Editorial Review Workflow
- fase: `5.2`
- commit: `0f5ee25`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: workflow visual de revisao editorial reforcado no Admin Console com filtro de duplicidade, destaque cauteloso por visibility e checklist artigo a artigo sem alterar contratos backend.
- docs alterados:
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido em `vw_admin_knowledge_spaces`
  - consumo mantido em `vw_admin_knowledge_categories_v2`
  - consumo mantido em `vw_admin_knowledge_articles_list_v2`
  - consumo mantido em `vw_admin_knowledge_article_detail_v2`
  - escrita mantida em `rpc_admin_update_knowledge_article_draft_v2`
  - escrita mantida em `rpc_admin_submit_knowledge_article_for_review_v2`
  - escrita mantida em `rpc_admin_publish_knowledge_article_v2`
- telas afetadas:
  - `/admin/knowledge`
- riscos restantes:
  - a classificacao sugerida do backlog ainda nao esta projetada nas views/RPCs v2
  - o checklist desta fase e visual e operacional, sem persistencia propria
  - artigos legacy continuam dependentes de revisao humana antes de qualquer publish
- impacto na FAQ futura:
  - melhora a trilha de revisao artigo a artigo antes de transformar conteudo curado em documentacao oficial
  - reforca a separacao entre sinal visual de curadoria e source of truth backend

### Fase 5.3 - Knowledge Review Advisory Contract
- fase: `5.3`
- commit: `907458d`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: advisory persistente de revisao editorial materializado no backend, backlog legado convertido em input versionado seguro e `/admin/knowledge` atualizado para consumir classificacao sugerida, riscos e confirmacoes humanas persistidas.
- docs alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_admin_knowledge_article_review_advisories`
  - `rpc_admin_update_knowledge_article_review_status`
  - `rpc_admin_mark_knowledge_article_reviewed`
- telas afetadas:
  - `/admin/knowledge`
- riscos restantes:
  - o advisory continua sendo apoio editorial e nao substitui decisao humana de publish
  - o lote local de drafts/advisories segue operacional e nao persiste apos `supabase:verify`
  - a navegacao visual autenticada artigo a artigo ainda pode ser repetida manualmente se for exigida evidencia UX mais forte
- impacto na FAQ futura:
  - fortalece a rastreabilidade entre backlog legado, revisao humana e documentacao oficial
  - cria trilha persistente para saber quais artigos ja foram revisados antes de virar FAQ ou help content publico

### Fase 5.4 - Knowledge Review QA + First Publish Candidate Flow
- fase: `5.4`
- commit: `2286fa4`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: fluxo editorial completo validado localmente com import controlado, review advisory persistido, filtro por classificacao sugerida em `/admin/knowledge` e publish controlado de ate 2 artigos candidatos a publico.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - consumo mantido em `vw_admin_knowledge_spaces`
  - consumo mantido em `vw_admin_knowledge_categories_v2`
  - consumo mantido em `vw_admin_knowledge_articles_list_v2`
  - consumo mantido em `vw_admin_knowledge_article_detail_v2`
  - consumo mantido em `vw_admin_knowledge_article_review_advisories`
  - escrita mantida em `rpc_admin_update_knowledge_article_draft_v2`
  - escrita mantida em `rpc_admin_update_knowledge_article_review_status`
  - escrita mantida em `rpc_admin_mark_knowledge_article_reviewed`
  - escrita mantida em `rpc_admin_submit_knowledge_article_for_review_v2`
  - escrita mantida em `rpc_admin_publish_knowledge_article_v2`
  - leitura publica validada em `vw_public_knowledge_articles_list`
  - leitura publica validada em `vw_public_knowledge_article_detail`
  - busca publica validada em `rpc_public_search_knowledge_articles`
- telas afetadas:
  - `/admin/knowledge`
  - `/help/genius`
  - `/help/genius/articles`
  - `/help/genius/articles/:articleSlug`
- riscos restantes:
  - o publish desta fase foi somente local e efemero; novo `supabase:verify` limpa os artigos curados
  - o `knowledge_space` precisa estar `active` para qualquer exposicao publica, o que segue sendo um pre-requisito operacional
  - a navegacao autenticada artigo a artigo no browser continua menos automatizada que o restante do stack
- impacto na FAQ futura:
  - confirma que artigos legacy podem virar documentacao publica apenas apos revisao humana persistida e publish explicito
  - cria os primeiros exemplos concretos de artigo curado apto a alimentar FAQ tecnica B2B no futuro

### Fase 5.5 - Publish Readiness Runbook + Content Operations Governance
- fase: `5.5`
- commit: `66fccdb`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: governanca operacional do publish publico formalizada com runbook de curadoria, checklist de publicacao, criterios de rollback e papeis claros de suporte, CS, engenharia/produto e plataforma.
- docs alterados:
  - `docs/PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md`
  - `docs/CONTENT_OPERATIONS_GOVERNANCE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/KNOWLEDGE_CONTENT_CURATION_PLAN.md`
  - `docs/PLATFORM_FAQ_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - governanca baseada no consumo ja existente de `vw_admin_knowledge_article_review_advisories`
  - governanca baseada no consumo ja existente de `vw_public_knowledge_articles_list`
  - governanca baseada no uso ja existente de `rpc_admin_publish_knowledge_article_v2`
  - governanca baseada no uso ja existente de `rpc_admin_archive_knowledge_article_v2`
- telas afetadas:
  - nenhuma alteracao de frontend
  - governanca aplicavel a `/admin/knowledge`
  - governanca aplicavel a `/help/:spaceSlug`
- riscos restantes:
  - o runbook nao substitui revisao humana nem baseline remoto
  - o publish legado continua dependente de lotes pequenos e curadoria artigo a artigo
  - a FAQ da propria plataforma continua dependente de artigos curados adicionais
- impacto na FAQ futura:
  - define quando um artigo curado esta operacionalmente apto a alimentar FAQ tecnica B2B
  - cria trilha de governanca para responder quem revisa, quem publica e como documentar cada mudanca

### Fase 6.0 - Support Workspace Architecture Spec
- fase: `6.0`
- commit: `0e6c7a5`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-03`
- resumo funcional: spec arquitetural do Support Workspace interno definida sobre o ticketing core existente, com escopo, rotas futuras, UX minima e lacunas mapeadas antes de qualquer UI.
- docs alterados:
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/TICKET_LIFECYCLE.md`
  - `docs/ROADMAP.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - contratos reutilizaveis mapeados:
    - `vw_tickets_list`
    - `vw_ticket_detail`
    - `vw_ticket_timeline`
    - `rpc_create_ticket`
    - `rpc_update_ticket_status`
    - `rpc_assign_ticket`
    - `rpc_add_ticket_message`
    - `rpc_add_internal_ticket_note`
    - `rpc_close_ticket`
    - `rpc_reopen_ticket`
- telas afetadas:
  - nenhuma implementacao de UI nesta fase
  - rotas futuras propostas:
    - `/support`
    - `/support/tickets`
    - `/support/tickets/:id`
    - `/support/customers/:tenantId`
    - `/support/queue`
- riscos restantes:
  - ainda faltam read models especificos de suporte antes da UI
  - visao 360 do cliente B2B, vinculo com KB e vinculo com engenharia continuam sem contrato proprio
  - SLA segue apenas como direcao arquitetural futura
- impacto na FAQ futura:
  - prepara a trilha documental para responder como o suporte interno B2B sera operado
  - separa claramente o workspace interno de suporte da Central Publica e de qualquer experiencia B2C

### Fase 6.1 - Support Workspace Backend Read Models + Authz Review
- fase: `6.1`
- commit: `fbf170c`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: read models especificos do Support Workspace foram materializados no backend, com queue/detail/timeline/customer 360 e authz revista antes de qualquer UI.
- docs alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/TICKET_LIFECYCLE.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_tickets_queue`
  - `vw_support_ticket_detail`
  - `vw_support_ticket_timeline`
  - `vw_support_customer_360`
  - escrita mantida em `rpc_update_ticket_status`
  - escrita mantida em `rpc_assign_ticket`
  - escrita mantida em `rpc_add_ticket_message`
  - escrita mantida em `rpc_add_internal_ticket_note`
  - escrita mantida em `rpc_close_ticket`
  - escrita mantida em `rpc_reopen_ticket`
- telas afetadas:
  - nenhuma implementacao de UI nesta fase
  - superficie alvo futura: `/support`, `/support/tickets`, `/support/tickets/:id`, `/support/customers/:tenantId`, `/support/queue`
- riscos restantes:
  - ainda nao existe role dedicada de CS para operar o workspace sem reaproveitar roles de suporte
  - engenharia continua fora desta superficie, apesar de ainda conseguir operar partes do ticketing core generico
  - SLA, vinculo ticket -> KB e vinculo ticket -> work item de engenharia seguem como lacunas antes da UI
- impacto na FAQ futura:
  - prepara a trilha oficial para explicar como a fila de suporte interno enxerga tenants, tickets e notas internas
  - fixa o boundary de autorizacao do workspace antes da camada visual

### Fase 6.2 - Support Workspace UI Minimum
- fase: `6.2`
- commit: `c32035d`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: primeira UI interna minima do Support Workspace materializada sobre os read models da fase 6.1, com fila dominante, detalhe do ticket, timeline, composers e visao 360 minima do cliente B2B.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/TICKET_LIFECYCLE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - leitura por `vw_support_tickets_queue`
  - leitura por `vw_support_ticket_detail`
  - leitura por `vw_support_ticket_timeline`
  - leitura por `vw_support_customer_360`
  - escrita por `rpc_update_ticket_status`
  - escrita por `rpc_assign_ticket`
  - escrita por `rpc_add_ticket_message`
  - escrita por `rpc_add_internal_ticket_note`
  - escrita por `rpc_close_ticket`
  - escrita por `rpc_reopen_ticket`
- telas afetadas:
  - `/support`
  - `/support/queue`
  - `/support/tickets`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - ainda nao existe vinculo ticket -> artigo de KB na superficie
  - ainda nao existe vinculo ticket -> item de engenharia
  - SLA continua fora da UI e do contrato operacional desta fase
  - a fixture local de tickets e apenas operacional para QA, nao baseline persistente do banco local apos `supabase:verify`
- impacto na FAQ futura:
  - cria a trilha oficial para explicar a operacao minima do suporte interno B2B no produto
  - separa claramente fila, detalhe, timeline e contexto do cliente de qualquer conceito de chat, portal B2B ou help center publico

### Fase 6.2.1 - Support Workspace Operational UX Review
- fase: `6.2.1`
- commit: `59edfc2`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o Support Workspace deixou de herdar a hierarquia visual do Admin Console e passou a operar como cockpit B2B de tickets, com fila dominante, painel de atendimento, composer unificado e contexto compacto do cliente.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/README.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - leitura mantida por `vw_support_tickets_queue`
  - leitura mantida por `vw_support_ticket_detail`
  - leitura mantida por `vw_support_ticket_timeline`
  - leitura mantida por `vw_support_customer_360`
  - escrita mantida por `rpc_update_ticket_status`
  - escrita mantida por `rpc_assign_ticket`
  - escrita mantida por `rpc_add_ticket_message`
  - escrita mantida por `rpc_add_internal_ticket_note`
  - escrita mantida por `rpc_close_ticket`
  - escrita mantida por `rpc_reopen_ticket`
- telas afetadas:
  - `/support`
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - atribuicao ainda depende de `user_id` tecnico, sem diretório proprio nesta superficie
  - ainda nao existe vinculo ticket -> KB
  - ainda nao existe vinculo ticket -> engenharia
  - SLA continua fora do workspace
- impacto na FAQ futura:
  - fixa a leitura oficial do workspace como ferramenta de tratativa operacional B2B
  - ajuda a documentar o fluxo real fila -> ticket -> resposta/nota -> status -> timeline -> contexto do cliente

### Fase 6.2.2 - Domain-Specific UX Correction Gate
- fase: `6.2.2`
- commit: `c7d9eb7`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: suporte e curadoria editorial passaram por simplificacao estrutural por dominio, reduzindo cards, badges, metadados simultaneos e colunas espremidas para priorizar triagem, tratativa e revisao humana real.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - leitura mantida por `vw_support_tickets_queue`
  - leitura mantida por `vw_support_ticket_detail`
  - leitura mantida por `vw_support_ticket_timeline`
  - leitura mantida por `vw_support_customer_360`
  - leitura mantida por `vw_admin_knowledge_articles_list_v2`
  - leitura mantida por `vw_admin_knowledge_article_detail_v2`
  - leitura mantida por `vw_admin_knowledge_article_review_advisories`
  - escrita mantida por `rpc_update_ticket_status`
  - escrita mantida por `rpc_assign_ticket`
  - escrita mantida por `rpc_add_ticket_message`
  - escrita mantida por `rpc_add_internal_ticket_note`
  - escrita mantida por `rpc_close_ticket`
  - escrita mantida por `rpc_reopen_ticket`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
  - `/admin/knowledge`
- riscos restantes:
  - atribuicao continua dependente de `user_id` tecnico em area avancada
  - timeline e customer context ainda dependem do volume e da qualidade dos dados retornados pelos contratos atuais
  - vinculos ticket -> KB, ticket -> engenharia e SLA seguem fora do escopo funcional desta fase
- impacto na FAQ futura:
  - fixa o metodo oficial de simplificacao de superficies operacionais por dominio
  - melhora a base para documentar o fluxo real de triagem e tratativa sem herdar linguagem de dashboard generico

### Fase 6.3 - Support Workspace Agent Directory + Assignment UX
- fase: `6.3`
- commit: `032f76f`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o Support Workspace passou a expor um diretório contratual de agentes atribuíveis por tenant e substituiu o fluxo principal de digitação manual de `user_id` por seletor operacional de agente, mantendo a escrita somente por `rpc_assign_ticket`.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - leitura por `vw_support_assignable_agents`
  - escrita mantida por `rpc_assign_ticket`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - atribuicao ainda preserva `user_id` tecnico apenas como fallback avancado
  - o diretório depende das roles globais atuais (`platform_admin`, `support_agent`, `support_manager`) e ainda nao resolve uma role propria de CS
  - timeline e customer context continuam dependentes de paginacao/recorte quando houver volume real
- impacto na FAQ futura:
  - formaliza como tickets passam a ser atribuídos por operador real sem UUID manual no fluxo principal
  - melhora a futura documentacao de operacao do suporte com passo claro de triagem -> atribuicao -> tratativa

### Fase 6.4 - Support Timeline Volume Guard + Customer Context Pagination
- fase: `6.4`
- commit: `e3acd8c`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o Support Workspace passou a operar com recortes recentes explícitos para timeline e customer context, evitando primeira carga infinita e mantendo a leitura operacional enxuta em volume real.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - leitura por `vw_support_ticket_timeline_recent`
  - leitura por `vw_support_customer_recent_tickets`
  - leitura por `vw_support_customer_recent_events`
  - leitura ajustada em `vw_support_customer_360`
  - escrita mantida por `rpc_update_ticket_status`
  - escrita mantida por `rpc_assign_ticket`
  - escrita mantida por `rpc_add_ticket_message`
  - escrita mantida por `rpc_add_internal_ticket_note`
  - escrita mantida por `rpc_close_ticket`
  - escrita mantida por `rpc_reopen_ticket`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - ainda nao existe RPC paginavel para historico completo sob demanda
  - timeline e customer context ainda vao precisar de segunda camada de navegacao se o volume operacional crescer alem do recorte atual
  - vinculos ticket -> KB, ticket -> engenharia e SLA seguem fora do escopo funcional
- impacto na FAQ futura:
  - documenta que a leitura inicial do suporte usa janelas recentes controladas, nao historico infinito
  - melhora a futura explicacao operacional de como agentes reentram rapidamente no contexto do ticket e do cliente

### Fase 6.4.1 - Support Ticket Conversation UX Pass
- fase: `6.4.1`
- commit: `72dc31e`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: a tratativa do ticket passou a ser orientada por conversa, com composer e interacoes recentes no eixo principal, historico tecnico recolhido e customer context reduzido a apoio operacional.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - leitura mantida por `vw_support_ticket_detail`
  - leitura mantida por `vw_support_ticket_timeline_recent`
  - leitura mantida por `vw_support_customer_360`
  - leitura mantida por `vw_support_customer_recent_tickets`
  - leitura mantida por `vw_support_customer_recent_events`
  - leitura mantida por `vw_support_assignable_agents`
  - escrita mantida por `rpc_update_ticket_status`
  - escrita mantida por `rpc_assign_ticket`
  - escrita mantida por `rpc_add_ticket_message`
  - escrita mantida por `rpc_add_internal_ticket_note`
  - escrita mantida por `rpc_close_ticket`
  - escrita mantida por `rpc_reopen_ticket`
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
  - `/support/queue`
- riscos restantes:
  - fallback tecnico por `user_id` permanece em area avancada
  - historico tecnico completo continua sem RPC paginavel sob demanda
  - customer context ainda depende de recorte adicional se houver crescimento forte de contatos e tickets
- impacto na FAQ futura:
  - melhora a futura documentacao do fluxo real de atendimento do suporte
  - fixa a conversa como superficie principal do ticket e o contexto do cliente como apoio operacional

### Fase 6.5 - Customer Account Profile / B2B CRM Context Spec
- fase: `6.5`
- commit: `4fab672`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: especifica o dominio de perfil operacional do cliente B2B para suporte e CS, separando identificacao, contrato, stack, customizacoes, contatos e observacoes internas sem inflar o produto para um CRM generico.
- docs alterados:
  - `docs/CUSTOMER_ACCOUNT_PROFILE_SPEC.md`
  - `docs/README.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - impacto futuro avaliado sobre `tenants`
  - impacto futuro avaliado sobre `tenant_contacts`
  - impacto futuro avaliado sobre `vw_support_customer_360`
  - impacto futuro avaliado sobre Support Workspace, tickets, Knowledge Base e portal B2B
- telas afetadas:
  - nenhuma implementacao nesta fase
- riscos restantes:
  - ainda nao existe modelo de dados dedicado para contrato, stack e customizacoes do cliente
  - `vw_support_customer_360` continua entregando apenas contexto minimo
  - a futura implementacao precisa separar com rigor leitura interna, leitura do cliente e dados sensiveis
- impacto na FAQ futura:
  - cria a base documental para explicar contexto operacional do cliente B2B por produto, stack e restricoes
  - ajuda a futura FAQ interna de suporte e CS a responder quem e o cliente e como ele opera antes da tratativa

### Fase 6.6 - Customer Account Profile Minimum Data Model Review
- fase: `6.6`
- commit: `0d9dbbd`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: revisa o modelo mínimo implementável para Customer Account Profile, propondo tabelas dedicadas para profile, integrações, features, customizações e alertas, com bloqueios explícitos para dados sensíveis e sem abrir schema ainda.
- docs alterados:
  - `docs/CUSTOMER_ACCOUNT_PROFILE_DATA_MODEL_REVIEW.md`
  - `docs/README.md`
  - `docs/DATA_MODEL_STRATEGY.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - propostas futuras:
    - `vw_support_customer_account_context`
    - `vw_admin_customer_account_profiles`
    - `vw_customer_portal_account_context`
    - `rpc_admin_upsert_customer_account_profile`
    - `rpc_admin_add_customer_integration`
    - `rpc_admin_update_customer_integration`
    - `rpc_admin_add_customer_customization`
    - `rpc_admin_update_customer_customization`
    - `rpc_admin_add_customer_account_alert`
    - `rpc_admin_archive_customer_account_alert`
- telas afetadas:
  - nenhuma implementacao nesta fase
- riscos restantes:
  - `account_tier` e `provider` ainda dependem de decisão futura entre enum rígido e catálogo controlado
  - a primeira implementação precisará evitar que `vw_support_customer_360` vire payload monolítico
  - governança de edição por suporte/CS versus administração ainda precisa virar authz executável
- impacto na FAQ futura:
  - ajuda a estruturar futura documentação interna sobre contexto operacional do cliente
  - prepara base para explicar produto, stack, módulos e alertas sem misturar isso com ticket ou CRM comercial

### Fase 6.7 - Customer Account Profile Migration Design
- fase: `6.7`
- commit: `738e40b`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: desenha a migration do Customer Account Profile antes da materialização do backend, fixando enums, tabelas, constraints, authz, views, RPCs administrativas, auditoria e plano de testes.
- docs alterados:
  - `docs/CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md`
  - `docs/README.md`
  - `docs/DATA_MODEL_STRATEGY.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend nesta fase
  - propostas futuras:
    - `vw_support_customer_account_context`
    - `vw_admin_customer_account_profiles`
    - `rpc_admin_upsert_customer_account_profile`
    - `rpc_admin_add_customer_integration`
    - `rpc_admin_update_customer_integration`
    - `rpc_admin_add_customer_customization`
    - `rpc_admin_update_customer_customization`
    - `rpc_admin_add_customer_account_alert`
    - `rpc_admin_archive_customer_account_alert`
- telas afetadas:
  - nenhuma implementacao nesta fase
- riscos restantes:
  - `account_tier`, `provider` e `source` ainda dependem de governanca de catalogo antes da migration
  - a Fase 6.8 precisa bloquear segredo por schema, RPC e pgTAP sem empurrar essa responsabilidade ao frontend
  - o futuro portal B2B ainda exigira contrato proprio para nao vazar contexto interno por conveniencia
- impacto na FAQ futura:
  - prepara a futura explicacao interna de como o suporte enxerga produto, stack, customizacoes e alertas do cliente B2B
  - fixa a fronteira entre contexto operacional interno e o subconjunto seguro que um portal B2B podera ver no futuro

### Fase 6.8 - Customer Account Profile Backend Materialization
- fase: `6.8`
- commit: `77dc8b0`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o backend mínimo do perfil operacional do cliente B2B foi materializado com enums, tabelas próprias, helpers privados de authz e segurança, views contratuais de leitura e RPCs administrativas auditadas.
- docs alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DATA_MODEL_STRATEGY.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_customer_account_context`
  - `vw_admin_customer_account_profiles`
  - `rpc_admin_upsert_customer_account_profile`
  - `rpc_admin_add_customer_integration`
  - `rpc_admin_update_customer_integration`
  - `rpc_admin_add_customer_customization`
  - `rpc_admin_update_customer_customization`
  - `rpc_admin_add_customer_account_alert`
  - `rpc_admin_archive_customer_account_alert`
- telas afetadas:
  - nenhuma UI nova nesta fase
  - fixture local enriquecida para inspeção geral de `/support/queue`, `/support/tickets/:ticketId`, `/support/customers/:tenantId`, `/admin/knowledge` e `/help/genius`
- riscos restantes:
  - o Support Workspace ainda nao consome todo o contexto novo; a calibracao visual e de payload continua para fase posterior
  - `feature_key`, `provider`, `source` e `account_tier` ainda dependem de governanca operacional de catalogo
  - `ticket -> KB`, `ticket -> engenharia` e SLA seguem fora do dominio materializado
- impacto na FAQ futura:
  - cria a base backend oficial para futura documentacao interna sobre stack, modulos e alertas do cliente B2B
  - separa com mais rigor o que e contexto operacional interno do que podera aparecer no portal B2B no futuro

### Fase 6.9 - Support Workspace Customer Account Context UI
- fase: `6.9`
- commit: `9916b23`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o Support Workspace passou a consumir `vw_support_customer_account_context` para exibir o stack operacional do cliente B2B no ticket e na visao de cliente, mantendo conversa e composer como foco principal da tratativa.
- docs alterados:
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_customer_account_context`
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - o contexto enriquecido ainda depende de governanca de catalogo para `account_tier`, `provider`, `source` e `feature_key`
  - o rail do ticket continua deliberadamente resumido; qualquer expansao futura precisa preservar conversa/composer como foco
  - `ticket -> KB`, `ticket -> engenharia` e SLA seguem fora do escopo
- impacto na FAQ futura:
  - consolida como suporte enxerga produto, stack, customizacoes e alertas do cliente B2B no fluxo real de atendimento

### Fase 6.10 - Internal Workspace Shell + Agent UX System
- fase: `6.10`
- commit: `607204c`
- branch: `codex/phase4-7-public-help-center-branding-contract`
- data: `2026-05-04`
- resumo funcional: o Support Workspace ganhou shell interno colapsavel, fila mais dominante, ticket workspace centrado na conversa e customer context mais sintetico, com mini design system oficial para superficies operacionais internas.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - leitura mantida por `vw_support_tickets_queue`
  - leitura mantida por `vw_support_ticket_detail`
  - leitura mantida por `vw_support_ticket_timeline_recent`
  - leitura mantida por `vw_support_customer_360`
  - leitura mantida por `vw_support_customer_recent_tickets`
  - leitura mantida por `vw_support_customer_recent_events`
  - leitura mantida por `vw_support_customer_account_context`
  - leitura mantida por `vw_support_assignable_agents`
  - escrita mantida por `rpc_update_ticket_status`
  - escrita mantida por `rpc_assign_ticket`
  - escrita mantida por `rpc_add_ticket_message`
  - escrita mantida por `rpc_add_internal_ticket_note`
  - escrita mantida por `rpc_close_ticket`
  - escrita mantida por `rpc_reopen_ticket`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
- riscos restantes:
  - o workspace ainda depende de disciplina de catalogo para `feature_key`, `provider` e `account_tier`
  - o historico tecnico completo continua recolhido e sem RPC paginavel sob demanda
  - ticket -> KB, ticket -> engenharia e SLA seguem fora do escopo
- impacto na FAQ futura:
  - fixa a experiencia oficial do suporte interno como workspace operacional, nao painel administrativo
  - ajuda a documentar como agentes navegam entre fila, ticket, contexto do cliente e conhecimento interno

### Fase 6.11 - Internal UI System Refactor + Operational Design Enforcement
- fase: `6.11`
- commit: `2468dc6`
- branch: `codex/phase6-11-internal-ui-system-refactor`
- data: `2026-05-04`
- resumo funcional: o contrato de UI interna foi endurecido e as principais superficies internas e publicas passaram por limpeza de linguagem, rebaixamento de metadados tecnicos e reforco de hierarquia operacional.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
  - `docs/INTERNAL_UI_ACCEPTANCE_CHECKLIST.md`
  - `docs/UI_REFACTOR_BACKLOG.md`
  - `docs/README.md`
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - consumo mantido nas superficies administrativas, de suporte e da Central Publica ja existentes
- telas afetadas:
  - `/admin/tenants`
  - `/admin/knowledge`
  - `/admin/access`
  - `/admin/system`
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
  - `/help/genius`
  - `/help/genius/articles/:articleSlug`
- riscos restantes:
  - o aceite visual humano continua sendo o gate final para micro-ajustes de conforto diario
  - o Support Workspace ainda pode precisar de recorte adicional no rail se o contexto do cliente crescer
  - edicao do Customer Account Profile, ticket -> KB, ticket -> engenharia, SLA e portal B2B seguem no backlog
- impacto na FAQ futura:
  - fixa a regra de que qualquer superficie interna deve esconder detalhes tecnicos do fluxo principal
  - documenta o criterio oficial de aceite visual e operacional para futuras fases

### Fase 6.12 - Ticket -> Knowledge Base Assistive Linking Spec
- fase: `6.12`
- commit: `69a9b4c`
- branch: `codex/phase6-12-ticket-knowledge-linking-spec`
- data: `2026-05-04`
- resumo funcional: o dominio de vinculo assistivo entre tickets e artigos da Knowledge Base foi especificado com foco em uso operacional do suporte, sem IA, sem automacao e sem misturar tratativa com curadoria editorial.
- docs alterados:
  - `docs/TICKET_KNOWLEDGE_LINKING_SPEC.md`
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao materializada de contrato backend
  - leitura atual mantida no Support Workspace e na Knowledge Base
  - tabela futura candidata: `ticket_knowledge_links`
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro principal em `/support/tickets/:ticketId`
  - impacto futuro secundario em `/admin/knowledge`
- riscos restantes:
  - o dominio ainda precisa de review de modelo minimo antes de qualquer migration
  - permissoes de uso interno vs envio ao cliente vao precisar de enforcement explicito em contrato futuro
  - ticket -> engenharia e SLA continuam fora desta especificacao
- impacto na FAQ futura:
  - cria trilha oficial para registrar quando suporte usa ou envia artigo ao cliente B2B
  - prepara backlog rastreavel de lacunas e atualizacoes de documentacao a partir de tickets reais

### Fase 6.13 - Ticket Knowledge Linking Data Model Review
- fase: `6.13`
- commit: `dee338a`
- branch: `codex/phase6-13-ticket-knowledge-linking-data-model-review`
- data: `2026-05-04`
- resumo funcional: o modelo minimo implementavel do vinculo ticket -> Knowledge Base foi revisado antes de qualquer migration, fixando entidade, enum, regras de integridade e boundary de permissao.
- docs alterados:
  - `docs/TICKET_KNOWLEDGE_LINKING_DATA_MODEL_REVIEW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao materializada de contrato backend
  - views futuras propostas:
    - `vw_support_ticket_knowledge_links`
    - `vw_support_knowledge_article_picker`
    - `vw_customer_portal_ticket_knowledge_links`
  - RPCs futuras propostas:
    - `rpc_support_link_ticket_article`
    - `rpc_support_archive_ticket_article_link`
    - `rpc_support_mark_documentation_gap`
    - `rpc_support_mark_article_needs_update`
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro principal em `/support/tickets/:ticketId`
  - impacto futuro secundario em `/admin/knowledge`
- riscos restantes:
  - o enforcement tenant/space ainda depende da fase de design tecnico e da materializacao backend
  - a elegibilidade de artigo para `sent_to_customer` ainda precisa virar constraint/helper executavel
  - o portal B2B futuro continua exigindo read model proprio para nao herdar referencias internas
- impacto na FAQ futura:
  - prepara a camada auditavel que vai registrar quando um artigo foi usado internamente ou enviado ao cliente
  - separa backlog editorial de tratativa operacional sem misturar KB com comentario solto

### Fase 6.14 - Ticket Knowledge Linking Migration Design
- fase: `6.14`
- commit: `0c44d4f`
- branch: `codex/phase6-14-ticket-knowledge-linking-migration-design`
- data: `2026-05-04`
- resumo funcional: o desenho tecnico pre-migration do vinculo ticket -> Knowledge Base foi fechado com enum, tabela futura, constraints, helpers privados, views, RPCs e plano pgTAP antes de materializar banco.
- docs alterados:
  - `docs/TICKET_KNOWLEDGE_LINKING_MIGRATION_DESIGN.md`
  - `docs/PROJECT_STATE.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - nenhuma alteracao materializada de contrato backend
  - views futuras desenhadas:
    - `vw_support_ticket_knowledge_links`
    - `vw_support_knowledge_article_picker`
    - `vw_customer_portal_ticket_knowledge_links`
  - RPCs futuras desenhadas:
    - `rpc_support_link_ticket_article`
    - `rpc_support_archive_ticket_article_link`
    - `rpc_support_mark_documentation_gap`
    - `rpc_support_mark_article_needs_update`
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro principal em `/support/tickets/:ticketId`
  - impacto futuro secundario em `/admin/knowledge`
- riscos restantes:
  - a validacao tenant/space ainda depende da fase materializada de helpers e pgTAP
  - o helper de sanitizacao de `note` precisa nascer forte para nao abrir vazamento tecnico
  - o portal B2B futuro continua exigindo view dedicada para nao herdar referencias internas
- impacto na FAQ futura:
  - prepara a camada executavel que vai registrar uso interno e envio publico de artigo com rastreabilidade
  - fecha o boundary tecnico para evoluir ticket -> KB sem publicar artigo por acidente

### Fase 6.15 - Ticket Knowledge Linking Backend Materialization
- fase: `6.15`
- commit: `cc4b030`
- branch: `codex/phase6-15-ticket-knowledge-linking-backend`
- data: `2026-05-05`
- resumo funcional: o backend minimo do vinculo ticket -> Knowledge Base foi materializado com enum, tabela append-only, helpers privados, views contratuais, RPCs seguras, pgTAP dedicado e fixture local enriquecida.
- docs alterados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_ticket_knowledge_links`
  - `vw_support_knowledge_article_picker`
  - `vw_customer_portal_ticket_knowledge_links`
  - `rpc_support_link_ticket_article`
  - `rpc_support_archive_ticket_article_link`
  - `rpc_support_mark_documentation_gap`
  - `rpc_support_mark_article_needs_update`
- telas afetadas:
  - nenhuma UI nova nesta fase
  - fixture e QA preparadas para inspecao geral de:
    - `/support/queue`
    - `/support/tickets/:ticketId`
    - `/admin/knowledge`
    - `/help/genius`
- riscos restantes:
  - a primeira UI assistiva de ticket -> KB ainda nao foi aberta
  - o portal B2B futuro continua exigindo contrato proprio para expor apenas `sent_to_customer`
  - a heuristica de sanitizacao de `note` pode precisar de ajuste fino conforme uso real
- impacto na FAQ futura:
  - cria a trilha auditavel para explicar quando um artigo foi usado internamente, enviado ao cliente ou marcado como lacuna de documentacao
  - prepara base executavel para futuras respostas oficiais sobre relacao entre tickets e base de conhecimento

### Fase 6.16 - Ticket Knowledge Assistive UI
- fase: `6.16`
- commit: `7fed25c`
- branch: `codex/phase6-16-ticket-knowledge-assistive-ui`
- data: `2026-05-05`
- resumo funcional: a primeira UI assistiva de ticket -> Knowledge Base foi aberta no Support Workspace com painel recolhivel, busca de artigos permitidos, registro de uso interno/publico e arquivamento logico de vinculos, sem competir com a conversa do ticket.
- docs alterados:
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - `vw_support_ticket_knowledge_links`
  - `vw_support_knowledge_article_picker`
  - `rpc_support_link_ticket_article`
  - `rpc_support_archive_ticket_article_link`
  - `rpc_support_mark_documentation_gap`
  - `rpc_support_mark_article_needs_update`
- telas afetadas:
  - `/support/tickets/:ticketId`
- riscos restantes:
  - a UI ainda nao oferece fluxo de copia segura de link publico por space, porque o contrato atual do picker nao expõe route metadata suficiente
  - o painel pode pedir novo recorte visual se a quantidade de vinculos ativos crescer muito no mesmo ticket
  - o fluxo editorial de criacao/atualizacao de artigo continua corretamente fora da tela de suporte
- impacto na FAQ futura:
  - registra o primeiro uso operacional real da ponte ticket -> KB no workspace de suporte
  - prepara explicacoes futuras sobre referencia interna, envio ao cliente, lacuna de documentacao e revisao de artigo sem depender de IA

### Fase 6.17 - Ticket Knowledge Public Link Contract Review
- fase: `6.17`
- commit: `ad8a4f6`
- branch: `codex/phase6-17-ticket-knowledge-public-link-review`
- data: `2026-05-05`
- resumo funcional: review documental do contrato necessario para que o suporte copie ou envie um link publico seguro de artigo ao cliente sem montar rota fragil no frontend.
- docs alterados:
  - `docs/TICKET_KNOWLEDGE_PUBLIC_LINK_CONTRACT_REVIEW.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/KNOWLEDGE_BASE_STRATEGY.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/README.md`
- views/RPCs afetadas:
  - auditoria de `vw_support_knowledge_article_picker`
  - auditoria de `vw_public_knowledge_space_resolver`
  - auditoria de `vw_public_knowledge_article_detail`
  - auditoria de `rpc_support_link_ticket_article`
  - view futura recomendada:
    - `vw_support_knowledge_public_link_candidates`
- telas afetadas:
  - nenhuma alteracao de UI nesta fase
  - impacto futuro principal em `/support/tickets/:ticketId`
  - impacto futuro secundario em `/help/:spaceSlug/articles/:articleSlug`
- riscos restantes:
  - o contrato ainda nao foi materializado em backend
  - a decisao entre caminho relativo e URL canonica completa ainda fica para a fase materializavel
  - o portal B2B futuro continua exigindo superficie propria para nao herdar referencias internas por conveniencia
- impacto na FAQ futura:
  - prepara a trilha oficial para explicar como o suporte pode compartilhar artigo publico com seguranca
  - reforca que permissao de envio e roteamento publico devem vir do backend, nao de heuristica no frontend

### Fase 6.18 - Contextual Subsidebar UX Pattern
- fase: `6.18`
- commit: `7970fb2`
- branch: `codex/phase6-18-contextual-subsidebar-ux-pattern`
- data: `2026-05-05`
- resumo funcional: o shell interno passou a formalizar sidebar global, subsidebar contextual e area principal de trabalho, com aplicacao real em Support, Admin, Knowledge e validacao da Central Publica local.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
  - `docs/INTERNAL_UI_ACCEPTANCE_CHECKLIST.md`
  - `docs/UI_REFACTOR_BACKLOG.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de contrato backend
  - nenhuma view ou RPC nova materializada
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers/:tenantId`
  - `/admin/knowledge`
  - `/admin/tenants`
  - `/admin/access`
  - `/admin/system`
  - `/help/genius`
  - `/help/genius/articles/visao-geral-da-central-genius`
- riscos restantes:
  - o item global `Customers` no shell de suporte ainda depende de um destino melhor quando nao existe tenant em foco
  - o rail do ticket pode pedir novo recorte se o contexto do cliente crescer muito
  - o polimento fino de densidade e conforto diario continua no backlog oficial
- impacto na FAQ futura:
  - formaliza um contrato de UX para futuras superficies internas sem reintroduzir layout generico do Admin Console
  - cria baseline para decidir quando filtros, ferramentas e contexto pertencem a subsidebar ou a area principal

### Ajuste complementar 6.18 - Ticket workspace guiado por blueprint operacional
- fase: `6.18`
- commit: `8021439`
- branch: `codex/phase6-18-ticket-workspace-blueprint`
- data: `2026-05-05`
- resumo funcional: a tela `/support/tickets/:ticketId` foi refatorada para seguir um blueprint de tratativa operacional, com conversa central, toolbar util na propria superficie e rail direito compacto.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `SupportWorkspaceShell` como ajuste neutro de sidebar
- riscos restantes:
  - o rail do ticket pode pedir novo recorte se o contexto do cliente continuar crescendo
  - a copia segura de link publico de artigo continua dependente do contrato futuro da fase 6.17
- impacto na FAQ futura:
  - consolida o padrao de tratativa como superficie de conversa real, e nao como painel administrativo

### Fase 6.18.3 - Ticket Workspace Blueprint Fidelity Pass
- fase: `6.18.3`
- commit principal: `a02f2db`
- commit corretivo final: `7a22461`
- branch: `codex/phase6-18-3-ticket-workspace-blueprint-fidelity`
- data: `2026-05-05`
- resumo funcional: a tela `/support/tickets/:ticketId` recebeu um passe corretivo de fidelidade visual para se aproximar da blueprint aprovada, com header mais baixo, thread mais densa, composer mais encaixado e rail direito menos pesado.
- docs alterados:
  - `docs/UX_DIRECTION.md`
  - `docs/INTERNAL_WORKSPACE_DESIGN_SYSTEM.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `SupportWorkspaceShell` como refinamento visual da sidebar do suporte
- riscos restantes:
  - a tela ficou mais proxima da blueprint, mas alguns detalhes finos ainda dependem das primitives atuais de pills, inputs e selects
  - a copia segura de link publico de artigo continua dependente do contrato futuro revisado na fase 6.17
- validacao final:
  - CI verde no workflow `Supabase DB`, run `25390082441`
  - correcao de escopo aplicada sem alterar backend, schema, RPCs ou contracts

### Ajuste complementar 7.6.1 - Ticket Workspace queue lifecycle + rail cleanup
- fase: `7.6.1`
- data: `2026-05-16`
- resumo funcional: o Ticket Workspace removeu o card redundante de `Atividade recente` do rail direito e passou a operar a fila viva por ciclo de vida, com `Abertos` como escopo padrao e `Fechados` acessiveis por segmentacao explicita.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
- arquivos de código alterados no lote runtime:
  - `apps/web/src/features/support/SupportWorkspacePage.tsx`
  - `apps/web/src/index.css`
- contratos/read models afetados:
  - nenhuma alteracao de backend
  - reaproveito de `vw_support_tickets_queue`
  - reaproveito do enum `TICKET_STATUSES` em `packages/contracts/src/ticketing.ts`
- telas afetadas:
  - `/support/tickets/:ticketId`
- decisao operacional registrada:
  - a timeline central e a unica fonte visual de historico da tratativa
  - o rail direito fica restrito a contexto, acoes rapidas e SLA
  - tickets encerrados nao aparecem por padrao na fila ativa
- definicao atual do split de lifecycle:
  - abertos: `new`, `triage`, `waiting_customer`, `waiting_support`, `waiting_engineering`, `in_progress`
  - fechados: `resolved`, `closed`, `cancelled`
- validacao final:
  - `npm run web:typecheck`
  - `npm run web:build`
  - browser local com fila em `Abertos`, fila em `Fechados`, ticket fechado selecionado e drawer de classificacao
  - ausencia de scroll global e scroll horizontal nas validacoes registradas
- riscos restantes:
  - `vw_support_tickets_queue` ainda nao expõe `status_group` ou `lifecycle` pronto para filtro server-side
  - se a fila crescer em volume ou semantica, vale abrir lote futuro para contrato dedicado de lifecycle
- impacto na FAQ futura:
  - registra que fidelidade de tratativa deve ser medida por densidade, hierarquia e continuidade operacional, nao so por reorganizacao de cards

### Fase 6.20 - Admin Access Blueprint
- fase: `6.20`
- branch: `codex/phase6-20-admin-access-blueprint`
- data: `2026-05-05`
- resumo funcional: a tela `/admin/access` foi reconstruida para o layout administrativo em 3 colunas da blueprint aprovada, com filtros a esquerda, base central de acesso e rail direito de detalhe ou convite.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/access`
  - `AdminTopbar` como modo compacto do shell desta familia de tela
  - `AdminSidebar` como refinamento visual do shell desta familia de tela
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - a fase preserva apenas as acoes com contrato real; reset de senha e desativacao dedicada continuam fora do contrato atual
  - a tela ainda usa memberships como base operacional de acesso, entao detalhes de MFA e credenciais seguem como `Indisponivel`
- validacao final:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - screenshot final em `.tmp/phase6-20-admin-access/admin-access-final.png`
- impacto na FAQ futura:
  - formaliza a blueprint de Access como control plane operacional, sem voltar para a tela longa de membership da implementacao anterior

### Fase 6.21 - Artigo Publico Blueprint
- fase: `6.21`
- branch: `codex/phase6-21-public-article-blueprint`
- data: `2026-05-05`
- resumo funcional: a rota publica `/help/genius/articles/:slug` foi reconstruida para o shell de leitura em 3 colunas da blueprint aprovada, com topbar clara, breadcrumb, indice lateral, leitura central e rail direito de apoio.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/help/genius/articles/:slug`
  - `HelpCenterSpaceLayout` apenas para tirar a rota de artigo do shell lateral antigo
  - `MarkdownDocument` para gerar anchors navegaveis nas headings
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - o fixture publico atual tem corpo curto, entao o indice lateral pode ficar com poucas secoes enquanto o conteudo real nao crescer
  - o CTA `Abrir ticket` permanece como entrada para autenticacao, porque nao existe fluxo publico contratual de abertura direta nesta fase
- validacao final:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - screenshot final em `.tmp/phase6-21-public-article/public-article-final.png`
- impacto na FAQ futura:
  - formaliza o shell canonico de leitura publica de artigo sem reutilizar a sidebar de navegacao da home da central

### Fase 6.22 - Detalhe do Cliente Blueprint
- fase: `6.22`
- branch: `codex/phase6-22-support-customer-detail-blueprint`
- data: `2026-05-05`
- resumo funcional: a rota `/support/customers/:tenantId` foi reconstruida como cockpit operacional B2B, com header compacto, tabs de contexto, preview navy da conta, resumo operacional central e rail direito de saude, migracao e contexto complementar.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/support/customers/:tenantId`
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - a rota base `/support/customers` segue sem hub proprio nesta fase; o acesso ao detalhe continua a partir de links validos da fixture e do workspace
  - os CTAs do detalhe ficaram limitados a acoes ja existentes no produto, entao a blueprint foi adaptada sem inventar `editar contexto` ou `nova nota`
- validacao final:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - screenshot final em `phase6-22-support-customer-detail-final.png`
- impacto na FAQ futura:
  - fixa o padrao de detalhe de cliente como superficie operacional de suporte B2B, nao como CRUD generico herdado do shell anterior

### Fase 6.23 - Admin System Blueprint
- fase: `6.23`
- branch: `codex/phase6-23-admin-system-blueprint`
- data: `2026-05-05`
- resumo funcional: a rota `/admin/system` foi reconstruida como superficie de observabilidade administrativa, com header proprio, tabs por dominio, KPIs compactos, coluna de monitoramento, lista densa de eventos/checks e rail direito de detalhe operacional.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/system`
  - `AdminTopbar` e `AdminSidebar` apenas para estender o modo compacto da familia Admin a esta rota
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - a tela continua refletindo os contratos atuais de auditoria e memberships; nao cria novos eventos, jobs nem checks que ainda nao existam no produto
  - alguns textos do detalhe operacional sao derivados do feed atual, entao a profundidade diagnostica depende da qualidade dos dados ja emitidos pelo backend
- validacao final:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - screenshot final em `.tmp/phase6-23-admin-system/admin-system-final.png`
- impacto na FAQ futura:
  - formaliza `System` como tela de observabilidade administrativa do Admin Console, em vez de painel generico de cards soltos

### Fase 6.24 - Consistencia Visual do Genius Support OS
- fase: `6.24`
- branch: `codex/phase6-24-visual-completion-batch`
- data: `2026-05-05`
- resumo funcional: lote final de consistencia visual que fechou estados transversais, loading autenticado, rota hub de clientes do suporte e divergencias claras de shell/densidade entre as superficies blueprint ja aprovadas.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/login`
  - `/access-denied`
  - `/support/queue`
  - `/support/tickets/:ticketId`
  - `/support/customers`
  - `/admin/tenants`
  - `SupportWorkspaceShell` e `SupportGate` para consolidar o shell navy e o boot autenticado do suporte
  - `AdminTopbar` e `AdminSidebar` apenas para alinhar `/admin/tenants` ao modo compacto ja aprovado na familia Admin
- telas auditadas sem alteracao estrutural adicional:
  - `/support/customers/:tenantId`
  - `/admin/knowledge`
  - `/admin/access`
  - `/admin/system`
  - `/help/genius`
  - `/help/genius/articles/:slug`
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - `/support/queue` e `/help/genius` ficaram coerentes e estaveis, mas ainda podem receber polimento fino futuro de densidade sem reabrir o shell
  - o ticket blueprint continua dependente do volume real da thread para ocupar mais altura util na dobra; a infraestrutura visual agora esta consistente, mas a fixture atual nao gera uma thread longa
- validacao final:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
  - auditoria visual em `.tmp/phase6-24-audit/`
- impacto na FAQ futura:
  - encerra a fase de virada visual do Genius Support OS com shells, estados e densidade alinhados ao contrato canonicamente versionado em `docs/design/**`
### Fase 7.28 - Knowledge Motivos Public Rewrite V3
- fase: `7.28`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o recorte publico seguro do subcluster de regras por motivo foi reescrito como versao candidata do artigo `Como organizar motivos de troca e devolucao na operacao`, mantendo fora do texto qualquer regra interna, excecao logistica ou politica financeira.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_MOTIVOS_TROCA_DEVOLUCAO_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_REGRAS_MOTIVO_SUBCLUSTER_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/knowledge/KNOWLEDGE_P0_PUBLICATION_PREP.md`
  - `docs/knowledge/KNOWLEDGE_P0_APPROVAL_INTAKE_PACK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - a nomenclatura atual da area de motivos ainda exige validacao de Produto
  - a classificacao entre troca e devolucao precisa ser confirmada no produto atual antes de qualquer exposicao publica
  - qualquer leitura que sugira regra interna por motivo continua fora de escopo e bloqueada
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - abre uma trilha segura de reescrita publica para motivos de troca sem absorver a camada sensivel de regras, frete, logistica e estorno
### Fase 7.29 - Knowledge EstornoTroubleshooting Subcluster Prep V3
- fase: `7.29`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-07`
- resumo funcional: o subcluster `Erros e troubleshooting de estorno` foi preparado documentalmente com leitura dos artigos fonte, separação entre sinais públicos seguros, dependências de integração, permissões VTEX, alteração manual de reembolso e temas que precisam permanecer internos, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_TROUBLESHOOTING_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - o legado continua acoplado a VTEX, credenciais, permissões e suporte de integração
  - ainda não existe recorte validado para troubleshooting público seguro de estorno
  - alteração manual de reembolso continua fora de escopo público
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - separa troubleshooting conceitual de estorno da camada sensível de integração e backoffice, preparando lotes futuros por subcluster em vez de por artigo isolado
### Fase 7.30 - Knowledge EstornoCalculoLimites Subcluster Prep V3
- fase: `7.30`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o subcluster `Cálculo e limites de estorno` foi preparado documentalmente com leitura dos artigos fonte, separação entre cálculo padrão/proporcional, teto de estorno, valor manual automático, política de frete e dependências com motivo e forma de estorno, sem reescrever artigos completos, aprovar ou publicar conteúdo.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_ESTORNO_CALCULO_LIMITES_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_ESTORNO_SENSITIVE_SUBCLUSTERS.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - o subcluster continua excessivamente financeiro para help pública direta
  - valor manual, limite percentual e frete dependem de governança operacional e decisão comercial
  - qualquer futura abertura pública exigirá novo recorte muito mais abstrato e validado
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - mantém cálculo, teto e política financeira fora do canônico de estorno e prepara futuras decisões por subcluster, não por artigo isolado
### Fase 7.36 - Knowledge Logistica Safe Rewrites And Closure V3
- fase: `7.36`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o cluster `Logística reversa e postagem` foi fechado documentalmente com criação de dois novos candidatos públicos seguros, `Como revisar uma pendência de logística reversa na operação` e `O que revisar quando o CEP ou endereço impede a postagem`, além da consolidação executiva do cluster em documento próprio.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_PENDENCIA_LOGISTICA_REVERSA_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_CEP_ENDERECO_POSTAGEM_REWRITE.md`
  - `docs/knowledge/KNOWLEDGE_LOGISTICA_POSTAGEM_CLUSTER_CLOSURE.md`
  - `docs/knowledge/KNOWLEDGE_PRAZO_PENDENCIAS_POSTAGEM_SUBCLUSTER_PREP.md`
  - `docs/knowledge/KNOWLEDGE_LOGISTICA_POSTAGEM_CLUSTER_PREP.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - os tres candidatos seguros ainda dependem de validacao humana de `Produto` e `Suporte/CS`
  - o legado do cluster continua com forte dependência de backoffice, integração Correios, contrato, token e seller
  - qualquer futura abertura pública fora dos três recortes seguros exigirá novo recorte editorial e validação adicional
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - encerra o cluster de logística reversa e postagem com três candidatos públicos seguros mapeados e com fronteira explícita para tudo que deve continuar interno ou bloqueado
### Fase 7.37 - Knowledge Remaining Corpus Closure V3
- fase: `7.37`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: os clusters restantes do corpus legado foram fechados em um único pacote documental, com consolidação executiva de Primeiros passos, Operação de trocas e devoluções, Sellers e operação de loja, Cadastros e configurações operacionais e Integrações gerais, além da matriz final do corpus completo e da lista única dos oito candidatos públicos já prontos.
- docs alterados:
  - `docs/knowledge/KNOWLEDGE_REMAINING_CORPUS_CLOSURE.md`
  - `docs/knowledge/LEGACY_CORPUS_FULL_CURATION_PACK.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_INTAKE.md`
  - `docs/knowledge/KNOWLEDGE_FULL_CORPUS_APPROVAL_COLLECTION_PLAYBOOK.md`
  - `docs/knowledge/KNOWLEDGE_TAXONOMY_FUTURE_MODEL.md`
  - `docs/knowledge/KNOWLEDGE_HUMAN_APPROVAL_REGISTER.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - nenhuma
- views/RPCs afetadas:
  - nenhuma alteracao de backend
  - nenhuma view ou RPC nova
- riscos restantes:
  - os `8` candidatos públicos continuam pendentes por ausência de validação humana real
  - integrações, sellers, contrato, token, permissões e parametrização administrativa seguem fora da trilha pública
  - futuras reescritas remanescentes ainda dependem de novo lote editorial ou revisão técnica específica
- validacao final:
  - `npm run web:typecheck`
- impacto na FAQ futura:
  - encerra a fase de classificação do corpus legado completo e desloca o próximo passo real para validação humana dos candidatos prontos, em vez de continuar abrindo micro-lotes documentais
### Fase 8.5 - Access System Observability Hardening V3
- fase: `8.5`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: governanca operacional de acesso e observabilidade administrativa endurecida com contexto Impeccable (`PRODUCT.md` e `DESIGN.md`), read models dedicados para `/admin/access` e `/admin/system`, audit feed sanitizado e telas conectadas aos contratos reais.
- docs alterados:
  - `PRODUCT.md`
  - `DESIGN.md`
  - `docs/ACCESS_SYSTEM_OBSERVABILITY_HARDENING_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/admin/access`
  - `/admin/system`
- views/RPCs afetadas:
  - `vw_admin_access_users`
  - `vw_admin_access_user_detail`
  - `vw_admin_access_memberships`
  - `vw_admin_system_audit_events`
  - `vw_admin_system_health_checks`
  - `vw_admin_system_operational_summary`
  - `rpc_admin_add_tenant_member`
  - `rpc_admin_update_tenant_member_role`
  - `rpc_admin_update_tenant_member_status`
- riscos restantes:
  - convite formal e reset de senha seguem sem contrato de dominio dedicado
  - observabilidade externa real ainda depende de lote proprio
  - motivo obrigatorio em mutacoes de acesso pode ser adicionado se Produto exigir evidencia granular
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote tecnico de plataforma, sem publicacao ou alteracao de corpus Knowledge
### Fase 8.6 - Support Ticket Creation And Intake V3
- fase: `8.6`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o fluxo real de intake de tickets foi materializado em `/support/queue`, com read models dedicados de tenants e contatos, uso exclusivo de `rpc_create_ticket`, evento inicial e audit trail preservados pelo backend.
- docs alterados:
  - `docs/SUPPORT_TICKET_CREATION_AND_INTAKE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/support/queue`
  - `/support/tickets/:ticketId`
- views/RPCs afetadas:
  - `vw_support_ticket_intake_tenants`
  - `vw_support_ticket_intake_contacts`
  - `rpc_create_ticket`
- riscos restantes:
  - categoria inicial continua sem contrato proprio
  - anexos e handoff tecnico seguem fora deste lote
  - o intake continua restrito ao workspace interno de suporte/admin
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote tecnico de plataforma, sem publicacao de conteudo
### Fase 8.7 - Support Ticket Attachments And Escalation V3
- fase: `8.7`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-08`
- resumo funcional: o ticket workspace passou a ler anexos por metadata sanitizada e a registrar handoff tecnico estruturado para engenharia por contrato real, com dominio proprio de `engineering_work_items`, vinculo auditavel com o ticket, `ticket_events` e `audit_log`.
- docs alterados:
  - `docs/SUPPORT_TICKET_ATTACHMENTS_AND_ESCALATION_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/support/tickets/:ticketId`
  - `/support/queue` (regressao rapida)
- views/RPCs afetadas:
  - `vw_support_ticket_attachments`
  - `vw_support_ticket_engineering_links`
  - `rpc_support_create_engineering_work_item_from_ticket`
  - `rpc_support_link_ticket_to_engineering_work_item`
- riscos restantes:
  - upload real de anexos continua bloqueado ate existir bucket/policies seguras de storage
  - a engenharia ainda nao possui workspace dedicado; o ticket apenas cria e exibe o handoff
  - categoria inicial continua sem contrato proprio
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote tecnico de plataforma, sem publicacao de conteudo

### Fase 8.16 - Customer Portal Secure Evidence Upload V3
- fase: `8.16`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: o portal cliente B2B autenticado passou a enviar evidencias reais por fluxo customer-facing seguro, reaproveitando o bucket privado `ticket-evidence` sem expor bucket, path interno ou URL permanente.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_SECURE_EVIDENCE_UPLOAD_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/SECURE_TICKET_EVIDENCE_STORAGE_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/portal/tickets/:ticketId`
  - `/support/tickets/:ticketId` (regressao/visibilidade de evidencia)
- views/RPCs/functions afetadas:
  - `vw_customer_portal_ticket_attachments`
  - `vw_support_ticket_attachments`
  - `rpc_customer_create_ticket_attachment_upload`
  - `rpc_customer_register_ticket_attachment`
  - `rpc_customer_get_attachment_download_url`
  - `ticket-evidence-upload`
  - `ticket-evidence-download`
- riscos restantes:
  - arquivamento/remocao customer-facing de evidencia segue sem RPC segura
  - retencao/expurgo de storage depende de decisao propria
  - scan real de arquivo continua fora do escopo
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote de portal autenticado, sem publicacao de Knowledge

### Fase 8.17 - Customer Portal Ticket Collaboration V3
- fase: `8.17`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-09`
- resumo funcional: o portal cliente B2B autenticado passou a ter colaboracao customer-facing consolidada com timeline segura, leitura/ack, resposta do cliente, confirmacao de resolucao e solicitacao de reabertura por contratos reais.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_TICKET_COLLABORATION_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/CUSTOMER_PORTAL_SECURE_EVIDENCE_UPLOAD_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- telas afetadas:
  - `/portal/tickets`
  - `/portal/tickets/:ticketId`
  - `/support/tickets/:ticketId` (regressao/reflexo de mensagem e evento customer-facing)
- views/RPCs afetadas:
  - `vw_customer_portal_ticket_detail`
  - `vw_customer_portal_ticket_timeline`
  - `vw_customer_portal_ticket_collaboration_state`
  - `rpc_customer_add_ticket_message`
  - `rpc_customer_acknowledge_ticket_update`
  - `rpc_customer_confirm_ticket_resolved`
  - `rpc_customer_request_ticket_reopen`
- riscos restantes:
  - regra temporal de reabertura ainda depende de decisao de produto
  - notificacao externa continua fora de escopo
  - NPS/satisfacao e chat realtime nao foram implementados
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote de portal autenticado, sem publicacao automatica de Knowledge

### Fase 8.20 - Customer Portal Search And Discoverability V3
- fase: `8.20`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-10`
- resumo funcional: o portal cliente B2B passou a ter busca autenticada dedicada e descoberta segura de Knowledge autorizada, sem IA, sem filtro de seguranca no frontend e sem misturar boundary publica com a autenticada.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_SEARCH_AND_DISCOVERABILITY_V3.md`
  - `docs/CUSTOMER_PORTAL_ACCESS_ADMINISTRATION_V3.md`
  - `docs/CUSTOMER_PORTAL_ACCESS_AND_KNOWLEDGE_ENTITLEMENTS_V3.md`
  - `docs/CUSTOMER_PORTAL_CONTRACT_FOUNDATION_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/design/screens/PUBLIC_HELP_CENTER.md`
- telas afetadas:
  - `/portal`
  - `/portal/help`
  - `/portal/help/:articleSlug`
  - `/portal/tickets/:ticketId`
  - `/help/genius` (regressao rapida de boundary)
  - `/help/genius/articles/:slug` (regressao rapida de boundary)
  - `/admin/customer-portal` (regressao rapida)
- views/RPCs afetadas:
  - `vw_customer_portal_knowledge_articles`
  - `vw_customer_portal_knowledge_article_detail`
  - `vw_customer_portal_ticket_knowledge_links`
  - `rpc_customer_search_knowledge_articles`
- riscos restantes:
  - o portal ainda nao possui tenant switcher customer-facing
  - a busca continua sem ranking inteligente ou recomendacao, por escolha de escopo
  - a regressao rapida de `/admin/customer-portal` no browser local exigiu limpar storage persistente da sessao para validar o login administrativo; a tela permaneceu em loading no browser apos o shell abrir, sem erro de console, fora do escopo funcional deste lote
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
- impacto na FAQ futura:
  - nenhum; lote de descoberta autenticada, sem publicacao automatica e sem IA

### Fase 8.23 - Customer Portal Entitlement Visibility Regression Fix V3
- fase: `8.23`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-10`
- resumo funcional: a inconsistencia de visibilidade de artigo `restricted` no tenant B foi corrigida antes do lote multi-aba; entitlement arquivado e ticket-linked arquivado deixaram de expor artigo no portal autenticado.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_ACCESS_AND_KNOWLEDGE_ENTITLEMENTS_V3.md`
  - `docs/CUSTOMER_PORTAL_SEARCH_AND_DISCOVERABILITY_V3.md`
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de código e teste alterados:
  - `supabase/qa/create-local-support-fixture.mjs`
  - `supabase/tests/031_customer_portal_access_and_knowledge_entitlements.sql`
  - `supabase/tests/033_customer_portal_search_and_discoverability.sql`
- causa raiz:
  - a fixture local declarava `archiveAfterGrant: true`, mas o loop de seed não repassava a flag para `ensureKnowledgeArticleEntitlement(...)`
  - o entitlement permanecia `active`, então as views/RPCs expunham corretamente um artigo que nunca tinha sido arquivado de fato
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
  - validacao browser real em `/portal/help`, `/portal/help/:slug`, `/portal/tickets/:ticketId` e troca de tenant
- riscos restantes:
  - semântica multi-aba do tenant ativo continua pendente para lote próprio
  - novas superfícies customer-facing futuras continuam obrigadas a respeitar `active_tenant_id` backend-governed

### Fase 8.24 - Customer Portal Multi-Tab Session Semantics V3
- fase: `8.24`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-11`
- resumo funcional: o portal cliente formalizou a semantica de sessao multiaba sobre `active_tenant_id` backend-governed, com `context_version`, revalidacao por foco/visibilitychange e bloqueio honesto de abas stale antes de mutacoes sensiveis.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_MULTI_TAB_SESSION_SEMANTICS_V3.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
- arquivos de código e teste alterados:
  - `supabase/migrations/20260511094500_customer_portal_multi_tab_session_semantics_v3.sql`
  - `packages/contracts/src/ticketing.ts`
  - `apps/web/src/features/customer-portal/customer-portal-api.ts`
  - `apps/web/src/features/customer-portal/customer-portal-context.tsx`
  - `apps/web/src/features/customer-portal/CustomerPortalPage.tsx`
  - `supabase/tests/035_customer_portal_tenant_context_and_switching.sql`
- contratos/read models afetados:
  - `vw_customer_portal_active_tenant_context`
  - `rpc_customer_set_active_tenant`
- semantica oficial:
  - trocar tenant em uma aba invalida operacionalmente as demais
  - aba stale limpa o contexto anterior e exige refresh explicito
  - mutacoes customer-facing revalidam contexto antes de operar
  - backend continua como enforcement real
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
  - browser real com duas abas do portal + regressao administrativa
- riscos restantes:
  - sessao expirada/offline prolongado continuam para lote proprio
  - nao existe sincronizacao visual em tempo real sem foco, por decisao de simplicidade e escopo

### Fase 8.25 - Customer Portal Session Expiry And Recovery Semantics V3
- fase: `8.25`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-11`
- resumo funcional: o portal cliente ganhou semantica oficial para expiracao, recuperacao e revogacao de contexto customer-facing, sem manter dados antigos como validos depois de logout, perda de tenant ou falha temporaria de rede.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_SESSION_EXPIRY_AND_RECOVERY_SEMANTICS_V3.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/CUSTOMER_PORTAL_MULTI_TAB_SESSION_SEMANTICS_V3.md`
  - `docs/CUSTOMER_PORTAL_TENANT_CONTEXT_AND_SWITCHING_V3.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
- arquivos de código e teste alterados:
  - `supabase/migrations/20260511113000_customer_portal_session_expiry_and_recovery_semantics_v3.sql`
  - `apps/web/src/app/errors.ts`
  - `apps/web/src/contracts/support-contracts.ts`
  - `apps/web/src/features/customer-portal/customer-portal-api.ts`
  - `apps/web/src/features/customer-portal/customer-portal-context.tsx`
  - `apps/web/src/features/customer-portal/CustomerPortalPage.tsx`
  - `packages/contracts/src/index.ts`
  - `packages/contracts/src/ticketing.ts`
  - `supabase/tests/004_phase1_2_function_audit.sql`
  - `supabase/tests/036_customer_portal_session_expiry_and_recovery_semantics.sql`
- contratos/read models afetados:
  - `rpc_customer_get_portal_session_status`
  - `vw_customer_portal_auth_context`
  - `vw_customer_portal_available_tenants`
  - `vw_customer_portal_active_tenant_context`
- estados oficiais:
  - `initializing`
  - `ready`
  - `stale_context`
  - `session_expired`
  - `access_revoked`
  - `tenant_unavailable`
  - `network_retryable`
  - `fatal_error`
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
  - browser real com customer valido, logout/relogin, customer sem tenant valido e regressao admin
- riscos restantes:
  - refresh token expirado/passive expiry continua dependente do evento real de Supabase Auth no browser
  - nao existe modo offline nem sincronizacao realtime entre abas

### Fase 8.26 - Customer Portal Offline And Network Recovery Hardening V3
- fase: `8.26`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-11`
- resumo funcional: o portal cliente endureceu a recuperacao em falha temporaria de rede, timeout e host indisponivel sem criar modo offline, sem loop de refetch e sem manter dado antigo como se ainda fosse valido.
- docs alterados:
  - `docs/CUSTOMER_PORTAL_OFFLINE_AND_NETWORK_RECOVERY_HARDENING_V3.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/CUSTOMER_PORTAL_SESSION_EXPIRY_AND_RECOVERY_SEMANTICS_V3.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
- arquivos de código alterados:
  - `apps/web/src/app/errors.ts`
  - `apps/web/src/features/customer-portal/customer-portal-api.ts`
  - `apps/web/src/features/customer-portal/customer-portal-context.tsx`
  - `apps/web/src/features/customer-portal/CustomerPortalPage.tsx`
- contratos/read models afetados:
  - nenhum contrato novo
  - reaproveito de `rpc_customer_get_portal_session_status`
  - reaproveito de `vw_customer_portal_auth_context`
  - reaproveito de `vw_customer_portal_available_tenants`
  - reaproveito de `vw_customer_portal_active_tenant_context`
- hardening principal:
  - timeout controlado em bootstrap, leitura, mutacao e upload
  - classificacao centralizada de timeout e `Failed to fetch` como `network_retryable`
  - promocao da falha operacional de leitura para o estado global `network_retryable`
  - retry manual sem concorrencia e sem loop
  - limpeza da superficie local quando a leitura falha por rede
- validacao final:
  - `npm run supabase:db:reset`
  - `npm run supabase:test:db`
  - `npm run supabase:lint:db`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-support-fixture`
  - browser real com customer valido, falha temporaria de backend/rede, retry manual e regressao admin
- riscos restantes:
  - nao existe modo offline
  - host indisponivel por periodo prolongado continua dependendo de retry manual apos retorno do backend
  - observabilidade especifica de outage customer-facing continua para lote proprio

### Fase 8.27 - Internal Actions Backend Foundation V1
- fase: `8.27`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- data: `2026-05-16`
- resumo funcional: o backend ganhou o dominio formal `internal_actions` para subfluxos internos multiárea vinculados a tickets, com catálogo governado de áreas, membership por área, ledger append-only, vínculo seguro de evidências já existentes, views/RPCs dedicadas, `ticket_events` internos e auditoria, sem UI nova, sem bridge com Engenharia e sem alterar `ticket.status`.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de código e teste alterados:
  - `supabase/migrations/20260516120420_internal_actions_foundation_v1.sql`
  - `supabase/tests/037_internal_actions_foundation.sql`
  - `packages/contracts/src/ticketing.ts`
  - `packages/contracts/src/index.ts`
- contratos/read models afetados:
  - `vw_support_ticket_internal_actions`
  - `vw_support_internal_action_detail`
  - `vw_support_internal_action_timeline`
  - `vw_internal_action_queue_by_area`
  - `rpc_support_create_internal_action`
  - `rpc_internal_action_assign`
  - `rpc_internal_action_add_comment`
  - `rpc_internal_action_update_status`
  - `rpc_internal_action_add_evidence_link`
  - `rpc_internal_action_return_to_support`
  - `rpc_support_accept_internal_action_return`
  - `rpc_support_request_internal_action_followup`
  - `rpc_support_close_internal_action`
- boundary materializado:
  - cliente nao enxerga `internal_actions`
  - suporte continua owner do ticket principal
  - area interna nao responde cliente e nao fecha ticket
  - `engineering_work_items` nao foi substituido nem bridgeado neste corte
  - pendencia interna nao altera `ticket.status`
- validacao final:
  - `npm run supabase:verify`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
- riscos restantes:
  - a UI do Support Workspace ainda nao expoe o novo dominio
  - a ponte opcional com `engineering_work_items` continua para fase posterior
  - governanca administrativa de memberships por area ainda depende de superficie propria futura

### Knowledge Article Editor V1 - Edição e assets governados
- data: `2026-05-21`
- resumo funcional: `/admin/knowledge/new` e `/admin/knowledge/:articleId/edit` usam a mesma tela dedicada para criação e edição de artigos, mantendo o cockpit `/admin/knowledge` como listagem/governança.
- código alterado:
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/contracts/admin-contracts.ts`
  - `apps/web/src/features/admin/admin-api.ts`
  - `apps/web/src/features/knowledge/KnowledgeArticleEditorPage.tsx`
  - `apps/web/src/features/knowledge/KnowledgePage.tsx`
- contratos usados:
  - `rpc_admin_create_knowledge_article_draft_v2`
  - `rpc_admin_update_knowledge_article_draft_v2`
  - `rpc_admin_submit_knowledge_article_for_review_v2`
  - `rpc_admin_begin_knowledge_article_editorial_revision_v2`
  - `rpc_admin_update_knowledge_article_editorial_revision_v2`
  - `rpc_admin_upsert_knowledge_article_asset_v1`
  - `vw_admin_knowledge_article_assets`
- limites conhecidos:
  - upload funcional apenas para imagens permitidas pelo bucket `knowledge-assets` (`PNG`, `JPG`, `WEBP`, `GIF`, até 10 MB)
  - remoção definitiva de asset e PDFs exigem contrato adicional antes de liberar no editor
  - a tela não publica artigo e não altera status/visibility em massa

### Knowledge Article Editor V1.1 - Fluxo editorial e imagem inline
- data: `2026-05-21`
- resumo funcional: o editor dedicado de Knowledge foi simplificado para operar status por ações governadas e imagem inline como markdown seguro, sem token cru no corpo visual e sem preview comprimido no rail.
- código alterado:
  - `apps/web/src/features/knowledge/KnowledgeArticleEditorPage.tsx`
- contratos usados:
  - `rpc_admin_create_knowledge_article_draft_v2`
  - `rpc_admin_update_knowledge_article_draft_v2`
  - `rpc_admin_submit_knowledge_article_for_review_v2`
  - `rpc_admin_publish_knowledge_article_v2`
  - `rpc_admin_begin_knowledge_article_editorial_revision_v2`
  - `rpc_admin_update_knowledge_article_editorial_revision_v2`
  - `rpc_admin_publish_knowledge_article_editorial_revision_v2`
  - `rpc_admin_upsert_knowledge_article_asset_v1`
  - `rpc_admin_update_knowledge_article_asset_review_v1`
  - `vw_admin_knowledge_article_assets`
- comportamento validado:
  - `/admin/knowledge/new` cria rascunho, aceita upload/colagem de imagem e insere `![alt](knowledge-asset:<id>)`
  - `/admin/knowledge/:articleId/edit` reabre o mesmo artigo com imagem persistida e preview amplo usando o renderer seguro
  - `draft -> review` acontece por `rpc_admin_submit_knowledge_article_for_review_v2`
  - `/help/genius` não expõe artigo interno/em revisão
- limites conhecidos:
  - PDF/anexo genérico segue bloqueado pelo contrato atual do bucket de assets
  - publicação continua dependente do gate backend e não é automática

### Internal Actions V1 - Consolidação de status e documentação
- data: `2026-05-22`
- resumo funcional: documentação consolidada para refletir o estado real do domínio de Acionamentos Internos V1: backend foundation implementado, contrato seguro de áreas acionáveis implementado e integração mínima do drawer `Acionamentos` no Ticket Workspace já conectada a contratos reais.
- docs alterados:
  - `docs/INTERNAL_ACTIONS_V1_STATUS_REPORT.md`
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- fronteiras registradas:
  - suporte continua owner do ticket principal
  - cliente não vê `internal_actions`
  - `ticket.status` não muda no V1
  - `engineering_work_items` segue separado, sem bridge automática
  - workspace/fila da área acionada ainda não existe
  - governança administrativa de memberships por área ainda não existe
- validação documental:
  - `git diff --check`

### Internal Actions Operational Closure P0-A
- data: `2026-05-22`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- resumo funcional: fechado o fluxo operacional mínimo de Acionamentos Internos ponta a ponta. O suporte segue criando e acompanhando pelo Ticket Workspace; a área acionada ganhou `/internal-actions` e `/internal-actions/:actionId` para fila, detalhe, timeline, assumir para si, registrar update, atualizar andamento permitido e devolver resposta ao suporte; o Admin Console ganhou `/admin/internal-areas` para governar `internal_area_memberships`.
- docs alterados:
  - `docs/PROJECT_STATE.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/SUPPORT_WORKFLOW.md`
  - `docs/SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md`
  - `docs/INTERNAL_ACTIONS_V1_STATUS_REPORT.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- arquivos de código e teste alterados:
  - `supabase/migrations/20260522190000_internal_actions_operational_closure_v1.sql`
  - `supabase/tests/040_internal_actions_operational_closure.sql`
  - `packages/contracts/src/ticketing.ts`
  - `packages/contracts/src/index.ts`
  - `apps/web/src/contracts/support-contracts.ts`
  - `apps/web/src/contracts/admin-contracts.ts`
  - `apps/web/src/features/internal-actions/internal-actions-api.ts`
  - `apps/web/src/features/internal-actions/InternalActionsWorkspacePage.tsx`
  - `apps/web/src/features/admin/admin-api.ts`
  - `apps/web/src/features/admin/InternalAreasAdminPage.tsx`
  - `apps/web/src/app/router.tsx`
  - `apps/web/src/features/navigation/UnifiedEnvironmentNavigation.tsx`
- views/RPCs afetadas:
  - `vw_internal_action_detail_by_area`
  - `vw_internal_action_timeline_by_area`
  - `vw_admin_internal_action_target_areas`
  - `vw_admin_internal_area_memberships`
  - `rpc_internal_action_assign_to_self`
  - `rpc_admin_add_internal_area_membership`
  - `rpc_admin_update_internal_area_membership`
  - `rpc_admin_archive_internal_area_membership`
- boundaries preservados:
  - criar, operar ou devolver acionamento interno não altera `ticket.status`
  - cliente/portal não lê nem escreve `internal_actions`
  - área interna não responde cliente diretamente
  - `engineering_work_items` não foi substituído nem bridgeado automaticamente
  - frontend lê por views/read models e escreve por RPC
- riscos restantes:
  - picker seguro de evidências na superfície da área acionada permanece fora do corte; o suporte continua com o vínculo operacional existente
  - bridge opcional com Engenharia exige decisão própria de produto/arquitetura
  - QA browser autenticado dedicado deve ser ampliado para massa local estável de áreas internas

### Private Routes Authenticated QA P0-C
- data: `2026-05-22`
- branch: `codex/phase7-5-z2-admin-access-system-blueprint`
- resumo funcional: criada fixture funcional autenticada local para reidratar massa persistida de Admin, Support, Internal Actions, Engineering, Customer Portal e Public Help, com usuários QA estáveis e acionamentos internos reais para smoke privado.
- arquivos alterados:
  - `package.json`
  - `supabase/qa/create-local-functional-fixture.mjs`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/PROJECT_STATE.md`
  - `docs/reports/P0_PRIVATE_ROUTES_AUTHENTICATED_QA_2026-05-22.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- validações:
  - `node --check supabase/qa/create-local-functional-fixture.mjs`
  - `npm run supabase:qa:local-functional-fixture`
  - segunda execução de `npm run supabase:qa:local-functional-fixture`
  - smoke browser autenticado em `/admin/*`, `/support/*`, `/internal-actions/*`, `/engineering/*`, `/portal/*` e `/help/genius/*`
- boundaries preservados:
  - Portal Cliente não exibiu nota interna, internal actions, engenharia interna, audit bruto ou storage path
  - Public Help não exibiu internal/restricted/draft por lista ou slug direto
  - usuário sem membership de área interna não viu acionamentos da área
  - internal actions não alteraram `ticket.status`
- riscos restantes:
  - redirect pós-login de usuários não-admin ainda cai em `/access-denied` antes da navegação para a rota correta do papel
  - warning `DEP0190` permanece no script legado de suporte por trecho fora do escopo deste lote

### Customer Account UX + Authenticated QA Pass P1-B
- data: `2026-05-22`
- branch: `codex/p1-b-customer-account-ux-authenticated-qa`
- resumo funcional: executado QA autenticado real do Customer Account em Admin, Support e Portal. A aba `Conta B2B` de `/admin/tenants` passou a expor edição real de integração, customização e alerta existentes por RPC administrativa; o Portal teve copy customer-facing ajustada para não citar áreas internas; e a fixture funcional sanitizou o ticket QA principal para remover termos internos visíveis ao cliente.
- arquivos alterados:
  - `apps/web/src/features/tenants/TenantsPage.tsx`
  - `apps/web/src/features/customer-portal/CustomerPortalPage.tsx`
  - `supabase/qa/create-local-support-fixture.mjs`
  - `supabase/qa/create-local-functional-fixture.mjs`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/PROJECT_STATE.md`
  - `docs/reports/P1_CUSTOMER_ACCOUNT_UX_AUTHENTICATED_QA_2026-05-22.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- validações:
  - `node --check supabase/qa/create-local-support-fixture.mjs`
  - `node --check supabase/qa/create-local-functional-fixture.mjs`
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db` com `43` arquivos e `887` testes
  - duas execuções de `npm run supabase:qa:local-functional-fixture`
  - smoke browser autenticado em `/admin/tenants`, `/support/customers`, `/support/customers/:tenantId`, `/support/tickets/:ticketId`, `/portal`, `/portal/tickets`, `/portal/tickets/:ticketId`, `/portal/help` e slugs autorizados/bloqueados
- boundaries preservados:
  - Admin escreve Customer Account apenas por RPCs administrativas
  - Support consome Customer Account por read models e segue read-only
  - Portal não recebe alertas internos, customizações internas, integrações sensíveis, audit bruto, storage path, internal actions ou engineering work items
  - nenhum CSV, planilha real, dump ou dado real foi usado
- riscos restantes:
  - redirect pós-login por papel ainda precisa lote próprio
  - edição de integração não altera tipo/provedor porque o contrato atual só atualiza status, ambiente e nota segura
  - contatos B2B tipados seguem backlog
  - warning `DEP0190` permanece no script legado de suporte

### Auth Redirect by Role P1-C
- data: `2026-05-22`
- branch: `codex/p1-c-auth-redirect-by-role`
- resumo funcional: corrigido o redirect inicial pós-login por papel/contexto autenticado. O login deixou de cair em `/admin/tenants` como fallback universal e passou a escolher a landing por read models existentes antes de navegar.
- arquivos alterados:
  - `apps/web/src/features/auth/post-login-redirect.ts`
  - `apps/web/src/features/login/LoginPage.tsx`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/PROJECT_STATE.md`
  - `docs/reports/P1_AUTH_REDIRECT_BY_ROLE_2026-05-22.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- contratos consumidos:
  - `vw_admin_auth_context`
  - `vw_customer_portal_auth_context`
  - `vw_internal_action_queue_by_area`
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:qa:local-functional-fixture`
  - smoke browser autenticado em `/login` para `platform_admin`, `support_manager`, `support_agent`, `internal_area_member`, `engineering_member`, `customer_user`, `customer_manager` e `internal_area_non_member`
  - cenários `redirectTo` autorizado e proibido
- boundaries preservados:
  - `/access-denied` segue ativo para acesso real negado
  - redirect não decide permissão por e-mail ou `localStorage`
  - gates de rota continuam responsáveis pelo bloqueio final
  - não houve backend, migration, RLS, contrato novo ou redesign
- riscos restantes:
  - membro de área interna sem nenhum acionamento visível ainda não tem read model dedicado de contexto para landing perfeita
  - warning `DEP0190` permanece no script legado de suporte

### OCP V1-A Internal Areas Contract Consolidation
- data: `2026-06-01`
- branch: `codex/project-forensic-recovery-audit`
- objetivo: consolidar contratos/read models de areas internas e colaboradores como primeiro corte seguro do Operational Control Plane V1.
- arquivos documentais atualizados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/reports/OCP_V1_A_INTERNAL_AREAS_CONTRACT_CONSOLIDATION_2026-06-01.md`
- artefatos tecnicos relacionados:
  - `supabase/migrations/20260601134126_ocp_v1_a_internal_areas_contract_consolidation.sql`
  - `supabase/tests/045_ocp_v1_a_internal_areas_contract_consolidation.sql`
  - `packages/contracts/src/ticketing.ts`
  - `packages/contracts/src/index.ts`
  - `apps/web/src/contracts/admin-contracts.ts`
  - `apps/web/src/contracts/support-contracts.ts`
- contratos criados:
  - `vw_admin_internal_areas`
  - `vw_admin_internal_collaborators`
  - `vw_internal_area_landing_context`
- contratos reaproveitados:
  - `vw_admin_internal_area_memberships`
  - `rpc_admin_add_internal_area_membership`
  - `rpc_admin_update_internal_area_membership`
  - `rpc_admin_archive_internal_area_membership`
- decisao registrada:
  - `internal_action_target_areas` e o catalogo inicial de areas internas do OCP V1-A.
  - `internal_area_memberships` e o membership operacional de colaborador por area.
  - nao houve tabela nova, UI nova, RPC nova, catalogo comercial, CS, Financeiro, Kanban, projeto ou health score.

### OCP V1-B Commercial Product Catalog Planning & Contract Design
- data: `2026-06-01`
- branch: `codex/project-forensic-recovery-audit`
- objetivo: planejar o catalogo comercial do Operational Control Plane V1 sem implementar migration, schema, RPC, tabela, UI ou runtime.
- arquivos documentais atualizados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/reports/OCP_V1_B_COMMERCIAL_PRODUCT_CATALOG_PLANNING_AND_CONTRACT_DESIGN_2026-06-01.md`
- entidades auditadas:
  - `tenants`
  - `customer_account_profiles`
  - `customer_account_features`
  - `customer_account_integrations`
  - `internal_action_target_areas`
  - `internal_area_memberships`
- decisoes registradas:
  - `customer_account_features` nao vira catalogo comercial.
  - `product_line` e `account_tier` nao substituem produtos e planos canonicos.
  - catalogo futuro deve separar produtos, planos, modulos, features comerciais, relacao plano-feature, assinaturas por cliente e ownership por area.
  - `customer_product_subscriptions` deve referenciar `tenants`, sem duplicar cliente.
- boundaries:
  - nenhuma alteracao em `supabase/`;
  - nenhuma migration;
  - nenhuma tabela;
  - nenhuma RPC;
  - nenhuma UI;
  - nenhum CS/Financeiro/Kanban/projeto/health score.

### OCP V1-C Product Catalog Foundation
- data: `2026-06-01`
- branch: `codex/project-forensic-recovery-audit`
- objetivo: criar a fundacao backend do catalogo comercial global do Operational Control Plane V1, sem UI e sem assinatura cliente-produto-plano.
- arquivos documentais atualizados:
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/reports/OCP_V1_C_PRODUCT_CATALOG_FOUNDATION_2026-06-01.md`
- artefatos tecnicos relacionados:
  - `supabase/migrations/20260601163921_ocp_v1_c_product_catalog_foundation.sql`
  - `supabase/tests/004_phase1_2_function_audit.sql`
  - `supabase/tests/046_ocp_v1_c_product_catalog_foundation.sql`
  - `packages/contracts/src/ticketing.ts`
  - `packages/contracts/src/index.ts`
- contratos criados:
  - `vw_admin_commercial_products`
  - `vw_admin_commercial_product_detail`
  - `vw_admin_commercial_product_plans`
  - `vw_admin_product_area_ownerships`
  - `rpc_admin_create_commercial_product`
  - `rpc_admin_update_commercial_product`
  - `rpc_admin_create_commercial_product_plan`
  - `rpc_admin_update_commercial_product_plan`
  - `rpc_admin_create_commercial_product_module`
  - `rpc_admin_update_commercial_product_module`
  - `rpc_admin_create_commercial_product_feature`
  - `rpc_admin_update_commercial_product_feature`
  - `rpc_admin_set_commercial_plan_feature`
  - `rpc_admin_assign_product_area_ownership`
  - `rpc_admin_archive_product_area_ownership`
- decisoes registradas:
  - catalogo comercial global nasce separado de `customer_account_features`.
  - `customer_account_features` permanece feature operacional habilitada por conta.
  - assinatura cliente-produto-plano fica para planejamento V1-D e implementacao posterior.
  - ownership por area referencia `internal_action_target_areas` e nao substitui memberships individuais.
- validacoes executadas:
  - `npm run supabase:db:reset` para reidratar a migration corrigida localmente.
  - `npm run supabase:test:db` com 49 arquivos e 1040 testes.
- boundaries:
  - sem UI;
  - sem subscriptions;
  - sem entitlements comerciais por cliente;
  - sem migrar `customer_account_features`;
  - sem CS/Financeiro/Kanban/projeto/health score;
  - sem colunas financeiras ou preco.

### OCP V1-D Customer Product Subscriptions Planning
- data: `2026-06-01`
- branch: `codex/project-forensic-recovery-audit`
- objetivo: planejar o vinculo cliente-produto-plano e entitlements comerciais futuros sem implementar schema ou UI.
- arquivos documentais atualizados:
  - `docs/PROJECT_STATE.md`
  - `docs/DOCUMENTATION_LEDGER.md`
  - `docs/ROADMAP_BUILDOUT_V3.md`
  - `docs/reports/OCP_V1_D_CUSTOMER_PRODUCT_SUBSCRIPTIONS_PLANNING_2026-06-01.md`
- entidades auditadas:
  - `tenants`
  - `customer_account_profiles`
  - `customer_account_features`
  - catalogo comercial V1-C
- decisoes registradas:
  - subscription futura deve referenciar `tenants`, sem duplicar cliente B2B.
  - plano/features contratados devem referenciar o catalogo V1-C.
  - `customer_account_features` permanece estado operacional por conta.
  - entitlement comercial so deve existir se Produto confirmar que plano nao basta.
- stop condition:
  - nao implementar subscriptions enquanto estiverem pendentes decisoes sobre After Sale, multiproduto, visibilidade por papel, owner de manutencao e semantica add-on/entitlement/override.
- boundaries:
  - nenhuma alteracao em `supabase/`;
  - nenhuma migration;
  - nenhuma tabela;
  - nenhuma RPC;
  - nenhuma UI;
  - nenhuma migracao de `customer_account_features`.

### Internal Area Empty State + Navigation Hardening P1-D
- data: `2026-05-22`
- branch: `codex/p1-d-internal-area-empty-state-navigation`
- resumo funcional: corrigido o caso de membro de área interna com membership ativo e zero acionamentos visíveis. O redirect e a navegação passaram a consumir contexto de área separado da fila, `/internal-actions` mostra empty state honesto para área sem demanda e usuário sem membership continua bloqueado.
- arquivos alterados:
  - `supabase/migrations/20260523154739_internal_action_area_auth_context_v1.sql`
  - `supabase/tests/040_internal_actions_operational_closure.sql`
  - `packages/contracts/src/ticketing.ts`
  - `packages/contracts/src/index.ts`
  - `apps/web/src/contracts/support-contracts.ts`
  - `apps/web/src/features/auth/post-login-redirect.ts`
  - `apps/web/src/features/internal-actions/internal-actions-api.ts`
  - `apps/web/src/features/internal-actions/InternalActionsWorkspacePage.tsx`
  - `apps/web/src/features/navigation/UnifiedEnvironmentNavigation.tsx`
  - `apps/web/src/features/support/SupportWorkspaceShell.tsx`
  - `supabase/qa/create-local-functional-fixture.mjs`
  - `docs/PROJECT_STATE.md`
  - `docs/AUTH_CONTEXT_STRATEGY.md`
  - `docs/VIEW_RPC_CONTRACTS.md`
  - `docs/INTERNAL_ACTIONS_V1_STATUS_REPORT.md`
  - `docs/LOCAL_QA_AUTH.md`
  - `docs/reports/P1_INTERNAL_AREA_EMPTY_STATE_AND_NAVIGATION_2026-05-22.md`
  - `docs/DOCUMENTATION_LEDGER.md`
- contratos afetados:
  - criada `vw_internal_action_area_auth_context`
  - nenhuma RPC nova
- validações:
  - `npm run contracts:typecheck`
  - `npm run web:typecheck`
  - `npm run web:build`
  - `npm run supabase:lint:db`
  - `npm run supabase:test:db` com 43 arquivos e 892 testes
  - `npm run supabase:qa:local-functional-fixture` duas vezes, validando idempotência
  - smoke browser autenticado para area com itens, area sem itens, non-member, support_manager e platform_admin
- boundaries preservados:
  - empty state não mascara ausência de membership
  - suporte sem membership não ganha fila interna
  - cliente/portal não acessa internal actions
  - `ticket.status` não muda automaticamente
  - PNGs de blueprint não entram no lote
- riscos restantes:
  - QA browser autenticado depende de runtime local estável após reidratar fixture
  - warning `DEP0190` permanece no script legado de suporte

### Redesign Minimalista Operacional
- fechamento: `2026-06-10`
- especificação:
  - `docs/superpowers/specs/2026-06-09-minimal-operational-redesign-design.md`
- plano:
  - `docs/superpowers/plans/2026-06-09-minimal-operational-redesign.md`
- relatório:
  - `docs/reports/MINIMAL_OPERATIONAL_REDESIGN_VALIDATION_2026-06-09.md`
- escopo:
  - Login, acesso negado, shell, CS Portfolio, Support Queue, Ticket Workspace, Tenants, Access, System, Knowledge e editor.
- componentes consolidados:
  - `apps/web/src/components/ui.tsx`
  - `apps/web/src/components/states.tsx`
  - `apps/web/src/components/minimal-ui.tsx`
  - `apps/web/src/components/minimal-states.tsx`
  - `apps/web/src/features/navigation/MinimalAppShell.tsx`
  - `apps/web/src/features/navigation/minimal-navigation.ts`
- código morto removido:
  - `AdminSidebar.tsx`
  - `AdminTopbar.tsx`
  - `UnifiedEnvironmentNavigation.tsx`
- validações:
  - 17 testes Node;
  - contracts typecheck;
  - web typecheck;
  - web build;
  - QA Browser desktop e mobile;
  - `git diff --check` sem erro de whitespace.
- boundaries:
  - sem banco, migration, RPC, RLS, deploy, push ou commit.
- Revisao de qualidade do Dashboard Gerencial - 2026-07-20
  - relatorio: `docs/reports/CODE_QUALITY_REVIEW_2026-07-20.md`
  - migration: `supabase/migrations/20260720043252_analytics_ceo_history_v1.sql`
  - teste: `supabase/tests/059_analytics_ceo_history.sql`
  - escopo: historico executivo, comparacao de periodos, seguranca do contrato,
    validacao local, limites de exportacao e gates externos.
- Exportacao visual do Dashboard Gerencial - 2026-07-20
  - relatorio: `docs/reports/ANALYTICS_VISUAL_EXPORT_2026-07-20.md`
  - componentes: `apps/web/src/features/analytics/AnalyticsReportExport.tsx`,
    `apps/web/src/features/analytics/analytics-export.ts`
  - comportamento: selecao de abas e PDF/PNG dedicado, sem shell global.
- Handoff tecnico colaborativo Codex/Claude - 2026-07-20
  - relatorio: `docs/reports/TECHNICAL_HANDOFF_CLAUDE_2026-07-20.md`
  - escopo: estado tecnico, entregas, validacoes, gates de seguranca e
    continuidade executavel pelo Claude sem depender do historico da conversa.
- Continuidade OMIE, CS Ops e acesso restrito - 2026-07-20
  - relatorio: `docs/reports/OMIE_CSOPS_TIMEOUT_ACCESS_CONTINUATION_2026-07-20.md`
  - escopo: HubSpot como fonte operacional de CS, timeout do upstream, acesso
    dashboard_viewer e preservacao do staging historico CS Ops.
- Normalizacao do indice Git e relatorio de continuidade (Claude) - 2026-07-20
  - relatorios: `docs/reports/CLAUDE_CONTINUITY_ASSESSMENT_2026-07-20.md`,
    `docs/reports/HANDOFF_CLAUDE_GIT_NORMALIZATION_2026-07-20.md`
  - escopo: indice congelado de 17/07 e lock obsoleto neutralizados via
    `git reset --mixed HEAD` no host; confirmado que `b7ce25e` contem Analytics,
    47 migrations e 11 testes pgTAP; `.gitignore` higienizado; working tree
    preservado sem apagar arquivos.
- Integracao API OMIE + cockpit financeiro (Claude) - 2026-07-20
  - relatorio: `docs/reports/OMIE_API_INTEGRATION_2026-07-20.md`
  - spec: `docs/DASHBOARD_GERENCIAL_UX_SPEC_V1.md`
  - migrations: `20260720130000_analytics_finance_cockpit_v1.sql`,
    `20260720140000_analytics_finance_cs_reconciliation_v1.sql`
  - escopo: contrato real OMIE corrigido, enriquecimento de clientes, RPC
    financeiro API-first com previsibilidade/aging/devedores/cruzamento CS,
    cockpit financeiro na UI, mascote Genio no carregamento, SPEC do upgrade do
    dashboard. Validado local (sync 3.433 titulos, typecheck/build verdes).
- Central de integracao OMIE<->HubSpot (Claude) - 2026-07-20
  - relatorio: `docs/reports/OMIE_HUBSPOT_INTEGRATION_HUB_2026-07-20.md`
  - migrations: `20260720150000` a `20260720200000` (unmatched clients, matching,
    rollup, agendamento) + `_shared/hubspot.ts` helpers
  - functions: `hubspot-company-create`, `hubspot-property-setup`,
    `hubspot-omie-property-sync`, `analytics-integration-run`
  - escopo: dedup robusta, criacao governada de empresas, propriedades omie_*
    criadas, sync de saida (196/196 empresas), agendamento configuravel + UI.
    Copy do dashboard humanizada. Cron de producao pendente (secret gated).
- Revisao de finalizacao do Dashboard Gerencial - 2026-07-20
  - relatorio: `docs/reports/DASHBOARD_FINALIZATION_REVIEW_2026-07-20.md`
  - escopo: QA autenticado, periodo compartilhado, viewer restrito, sem overflow
    horizontal, abas financeiras/logs, ACL e correcoes de testes.
- Central de Ajuda, conteudo e acesso gerencial - 2026-07-20
  - relatorio: `docs/reports/HELP_CENTER_CONTENT_VIEWER_ACCESS_2026-07-20.md`
  - migrations: `20260720220000_dashboard_viewer_content_settings_access_v1.sql`
    e `20260720221000_access_dashboard_viewer_management_v1.sql`
  - testes: `supabase/tests/063_dashboard_viewer_content_settings_access.sql` e
    `supabase/tests/064_access_dashboard_viewer_management.sql`
  - escopo: acesso editorial e de integracoes por dashboard_viewer, concessao
    administravel na area de Acessos, importacao local de 58 drafts e QA das
    superficies de Central de Ajuda/Knowledge.
- Publicacao da Central de Ajuda e retomada CS Ops - 2026-07-20
  - relatorios: `docs/reports/HELP_CENTER_PUBLICATION_2026-07-20.md` e
    `docs/reports/CS_HUBSPOT_MIGRATION_CONTINUATION_PLAN_2026-07-20.md`
  - escopo: publicacao local controlada de 44 artigos, preservacao de 12
    bloqueios tecnicos e plano de conclusao da migracao CS Ops para HubSpot.
| 2026-07-20 | Central de Ajuda / Octadesk | Reprocessamento de imagens e formatação | 54 artigos selecionados, 129 PNGs auditados, 97 assets públicos governados e QA público/editor concluído | `docs/reports/HELP_CENTER_ASSETS_FORMATTING_2026-07-20.md` |
| 2026-07-20 | Central de Ajuda / contatos | Contatos no rodapé e artigo em revisão | Contatos removidos dos artigos e configurados por espaço; artigo desatualizado retirado do público | `docs/reports/HELP_CENTER_CONTACTS_AND_ARTICLE_REVIEW_2026-07-20.md` |
| 2026-07-21 | CS Ops / HubSpot | Importação e dry-run auditado | 606/606 linhas aceitas; correção do contrato de contagens do ledger; nenhum write externo aplicado | `docs/reports/CS_OPS_MIGRATION_DRY_RUN_2026-07-21.md` |
| 2026-07-21 | OMIE / Financeiro | Sincronização confirmada | Usuário confirmou credencial e sync bem-sucedido; remoto/scheduler continuam gates separados | `docs/reports/OMIE_SYNC_CONFIRMATION_2026-07-21.md` |
| 2026-07-21 | Design system / Mascote Gênio | Correção do avatar de sincronização | Removida transformação SVG que desprendia o braço; loading, vazio, sucesso e avatar preservados; typecheck/build aprovados | `docs/reports/GENIUS_MASCOT_ARM_FIX_2026-07-21.md` |
| 2026-07-21 | Integrações / HubSpot + OMIE | Hardening de sincronização e timeout | HubSpot incremental para empresas/tickets, Deals em carga completa segura, bloqueio de concorrência, status parcial OMIE e observabilidade no Dashboard | `docs/reports/HUBSPOT_OMIE_SYNC_HARDENING_2026-07-21.md` |
| 2026-07-21 | CS Ops / Segurança de migração | Preflight e bloqueio de catálogo vazio | Origem do catálogo, contagens de empresas/responsáveis e bloqueio server-side de aplicação quando o HubSpot retorna zero empresas | `docs/reports/CS_OPS_PREFLIGHT_GUARD_2026-07-21.md` |
| 2026-07-21 | Segurança / Handoff | Revisão de segurança e integridade local | Auditoria de funções privilegiadas, RLS/grants, dashboard_viewer, secrets, CORS e scheduler; grants defensivos explícitos e pgTAP 063 ampliado | `docs/reports/SECURITY_AND_DIFF_REVIEW_2026-07-21.md` |
| 2026-07-22 | UX / Navegação / Segurança | Auditoria do lote de continuidade | Exportação visual sem `document.write`, QA atual da Central pública e gate administrativo, varredura local de secrets/sinks e backlog de hardening | `docs/reports/UX_NAVIGATION_SECURITY_AUDIT_2026-07-22.md` |
# Registro documental — sincronização local 2026-07-22

- Evidência primária: `docs/reports/SYNC_503_RUNTIME_RECOVERY_2026-07-22.md`.
- Resultado: HTTP 503 foi causado pelo Edge Runtime local parado, não por
  credencial ou resposta do OMIE/HubSpot; o container foi reativado e recebeu
  política local de reinício.
- Trilha de código: `analytics-sync-errors.mjs` e
  `analytics-sync-error.test.mjs`.
## Permissoes da configuracao Analytics - 2026-07-22

- Relatorio: `docs/reports/ANALYTICS_CONFIG_VIEWER_PERMISSION_FIX_2026-07-22.md`.
- O backend ja negava corretamente execucao manual para `dashboard_viewer`; a UI foi alinhada para nao oferecer a acao.
- Validacao automatizada: teste de permissao 1/1, typecheck web, build web e diff check aprovados.
## Sincronizacao dual e limite de API - 2026-07-22

- Relatorio: `docs/reports/DUAL_SYNC_SCHEDULE_AND_WORKER_HARDENING_2026-07-22.md`.
- Causa do HTTP 546: limite de CPU do worker durante o fluxo combinado; corrigido com batch update HubSpot e remocao do enriquecimento OMIE duplicado.
- Agenda configuravel separada: OMIE financeiro e HubSpot global.
- Validacao local: OMIE dedicado 3.433/3.433; runner combinado HTTP 200; nenhum write remoto ou deploy.
- Fechamento versionado: commit `5cb4eea` na branch
  `codex/repository-cleanup-consolidation-20260721`.
- Estado atual: OMIE local diario ativo; HubSpot global implementado e desligado
  por padrao para preservar limite de API. O heartbeat agendado precisa apenas
  de reload do inventario do runtime Edge local para ser reconhecido; a
  publicacao remota continua gate externo.
- Os registros anteriores que citam credencial OMIE pendente permanecem como
  historico datado e nao representam o estado atual.
# Registro de governança — autorização contextual aplicada — 2026-07-22

- Fonte: `vw_internal_actor_workspace_context`.
- Consumidores: gate autenticado, pós-login, autorização de rota e shell global.
- Decisão: área + função + perfil/matriz de telas compõem a rotina efetiva; papel global não deve ser a única fonte de visibilidade.
- Evidência: typecheck, build, testes de rota/navegação e QA local em `/admin/internal-areas` aprovados.
- Limite: não houve criação de usuário, deploy, push ou alteração remota.
# Registro de governança — recomendações de telas e dependências — 2026-07-22

- Fonte: `internal_screen_area_defaults`, `internal_screen_dependencies` e `vw_admin_internal_screen_catalog`.
- Regra de UX: área selecionada sugere telas; tela selecionada inclui dependências; dependência usada permanece protegida contra remoção acidental.
- Regra de segurança: triggers mantêm a mesma garantia no banco para grants de perfil e de vínculo.
- Evidência: migration local, teste transacional do trigger, typecheck, build, testes e lint aprovados.
# Registro de governança — reparo da seed de perfis — 2026-07-22

- Causa: perfis persistidos com nomes incompatíveis com a consulta original da seed, resultando em `0 telas`.
- Correção: normalização dos nomes e reaplicação idempotente dos grants por perfil.
- Evidência: banco local confirma cinco perfis com contagens de telas não nulas.
# ACCESS-01 — Control plane interno — 2026-07-27

Fundação aditiva local para contexto interno, capabilities, perfis, convites e allowlist
de superfícies. A UI de `/admin/access` ainda requer separação da governança de memberships
de cliente antes do gate remoto. Evidência: `docs/reports/ACCESS_01_INTERNAL_CONTROL_PLANE_2026-07-27.md`.
## ACCESS-01.1 — Interface e CRUD administrativo interno — 2026-07-27

- Migration: `supabase/migrations/20260727040334_access_01_1_admin_operational_crud.sql`.
- Teste pgTAP: `supabase/tests/085_access_01_1_admin_operational_crud.sql`.
- Teste Node: `tests/scripts/access-01-1-ui-contract.test.mjs`.
- Resultado: `/admin/access` usa quatro tabs (usuários internos, convites, áreas/funções e perfis/permissões); clientes permanecem fora do control plane.
- Gate remoto ainda não executado: push, PR, merge, migration remota, deploy e convite externo permanecem pendentes de autorização.
## ACCESS-01.2 — Convites oficiais e navegação contextual — 2026-07-27

- Relatório: `docs/reports/ACCESS_01_2_INVITES_SAGA_NAVIGATION_2026-07-27.md`.
- Entrega: Edge Function oficial, aceite idempotente, compensação condicionada, rate limit, guarda do último administrador e URLs canônicas do Dashboard.
## DASHBOARD-API-ONLY - Reconstrucao do Dashboard Gerencial - 2026-08-02

- Relatorio: `docs/reports/2026-08-02_dashboard-api-only-audit.md`.
- Entrega: cinco areas ativas, planilhas fora da superficie operacional, Chat explicitamente indisponivel sem contrato confirmado e orquestracao sequencial HubSpot -> OMIE.
- Commits: `9eb9ef2`, `2578366`, `4d96bbb`, `4c6e314`, `22b3346`, `b89fefb`.
- Validacao: build web, typecheck web/contratos, testes focados, quality gate e validador documental; QA autenticado e sync real ainda dependem de ambiente.
- Limite: nenhuma migration foi aplicada e nenhum banco foi resetado.

## DASHBOARD-03 - Visao Geral e Integracoes - 2026-08-02

- Relatorio: `docs/reports/2026-08-02_dashboard-api-only-audit.md`.
- Evidencia visual: `docs/reports/visual-audit/design-qa.md` e capturas autenticadas em `docs/reports/visual-audit/screenshots/`.
- Entrega: pulso HubSpot/OMIE, densidade visual padronizada, configuracao segura de integracoes, cadencia unica do ciclo completo e acoes manuais por fonte.
- Limite: migrations forward-only, sincronizacao real e QA responsivo/dark ainda nao executados.

## SETTINGS-SOURCES-V2 - Configuracoes, Fontes e Historico - 2026-08-02

- Relatorios: `docs/reports/2026-08-02_settings-sources-delta.md`,
  `docs/reports/2026-08-02_settings-ux-friction-audit.md` e
  `docs/reports/2026-08-02_settings-design-report.md`.
- Entrega: shell unico, rotas canonicas, Integracoes somente HubSpot/OMIE,
  APP_KEY/APP_SECRET OMIE, catalogo vivo de pipelines, classificacao por area,
  historico separado e remocao do diagnostico legado.
- Evidencia: typechecks, build, testes Node 21/21, pgTAP focado 15/15, lint SQL,
  secret scan e QA empacotado 18 capturas + 6 checks sem falhas.
- Limites: nenhum sync real, push, deploy, reset, fixture pgTAP ou alteracao nas
  paginas analiticas; denominador de Customer Success permanece pendente.

## DASHBOARD-VISUAL-SYSTEM-V1 - Shell, superfícies e Gênio em ação - 2026-08-03

- Auditoria inicial: `docs/reports/2026-08-03_dashboard-visual-system-v1-audit.md`.
- Branch dedicada: `codex/dashboard-visual-system-v1-20260803`.
- Escopo: reconstrução visual frontend, estados honestos, acessibilidade,
  responsividade, performance localizada, testes focados e QA empacotado.
- Limites: nenhum backend, banco, RPC, view, contrato, métrica, denominador,
  integração, credencial, sincronização real ou dado persistido.
- Precedência: esta entrada e a especificação atualizada de UI-05 corrigem a
  dependência histórica de discovery HubSpot/denominador/catalogo para o lote
  visual; os relatórios históricos permanecem preservados.

## DASHBOARD-VISUAL-DENSITY-V1.1 - Densidade, tipografia e QA empacotado - 2026-08-03

- Evidência adicional: `C:\Projetos\GSO-artifacts\dashboard-visual-density-v1-1-20260803\ui05-final` registra 32 estados estáticos, 32 frames de movimento e 2 reduced-motion do componente real; o harness foi removido antes do build final.

- Relatório: `docs/reports/2026-08-03_dashboard-visual-density-v1-1.md`.
- Branch: `codex/dashboard-visual-density-v1-1-20260803`; base preservada em
  `refs/archive/dashboard-visual-density-v1-1-start-20260803`.
- Entrega: tipografia limitada, overview sem status duplicado, filtros contíguos,
  Financeiro agrupado semanticamente, histórico compacto, formulários de
  integrações sem warning de password fora de form e UI-05 com copy/motion
  preservados.
- Evidência: preview empacotado 80/80, zoom 125/200 em oito superfícies, motion
  real do loading e reduced motion sem animações.
- Limites: sincronização real HubSpot/OMIE não executada; overlay de ciclo real,
  validação de denominador CS e três falhas amplas de Analytics permanecem fora
  deste lote.
## Registro corrente — High-Density Interface V1 — 2026-08-03

- Branch: `codex/high-density-ui-rebuild-20260803`, sem upstream.
- Base preservada: `refs/archive/high-density-ui-rebuild-start-20260803`.
- Bundle externo: `C:\Projetos\GSO-artifacts\high-density-ui-rebuild-20260803`.
- Especificação: `docs/specs/GENIUS_HIGH_DENSITY_INTERFACE_V1.md`.
- Referências vigentes: `docs/design/blueprint/Dashboard PO/` e
  `docs/design/blueprint/Suporte e conversas/`.
- Decisão: Blueprint V2 superado para implementação; nenhuma alteração de
  backend, contrato, dado, integração, credencial, permissão ou sincronismo.
- Estado: documentação concluída; implementação e validação ainda pendentes.

## SECURITY-DEP-01 — Advisory react-router — 2026-08-04

- Relatório: `docs/reports/2026-08-04_react-router-advisory-analysis.md`.
- Branch: `main`. Nenhuma dependência, lockfile, código de aplicação, contrato,
  view, RPC, banco, permissão ou integração foi alterado.
- Escopo: investigação do advisory GHSA-qwww-vcr4-c8h2 em
  `react-router`/`react-router-dom`, faixa afetada `>= 7.12.0 < 8.3.0`,
  instalado `7.18.0`.
- Decisão: não aplicar correção neste lote. A única versão corrigida é
  `react-router@8.3.0` e `react-router-dom` não tem linha 8, o que torna a
  correção uma migração major em 48 arquivos com bump de React.
- Evidência de não exploração: o advisory depende das APIs RSC instáveis;
  o projeto usa apenas o data router client-side, sem `unstable_`, RSC, SSR,
  route `loader`/`action` ou `useFetcher`.
- Riscos restantes: `npm audit --omit=dev` continua reportando 2 altas até a
  migração para a linha 8; nenhum gate de CI executa `npm audit`.
- Impacto futuro na FAQ: nenhum. Não há mudança de comportamento de produto.

## SECURITY-DEP-02 — Migração react-router 8 — 2026-08-04

- Relatório: `docs/reports/2026-08-04_react-router-v8-migration.md`.
- Branch: `codex/react-router-v8-migration-20260804`. Base preservada em
  `refs/archive/react-router-v8-migration-start-20260804`.
- Entrega: `react-router@8.3.0` no lugar de `react-router-dom@7.18.0`,
  `RouterProvider` importado de `react-router/dom`, React e ReactDOM em
  `19.2.8`, 48 arquivos de `apps/web/src` com import migrado.
- Efeito de segurança: advisory GHSA-qwww-vcr4-c8h2 fechado;
  `npm audit --omit=dev` saiu de 2 altas para 0.
- Evidência: lint 0 erros, web/contracts typecheck, build, secret scan,
  quality gate sem blockers e QA real no navegador em 4173/4174 cobrindo
  redirect de raiz, rota pública, navegação por `Link`, `useParams`, gate de
  rota protegida, catch-all e `useSearchParams`.
- Limites: nenhum backend, banco, contrato, view, RPC, permissão, integração ou
  dado alterado; QA autenticado não executado por ausência de credencial
  autorizada; sem push e sem merge.
- Riscos restantes: `eslint.config.js` fora da allowlist da raiz e 256 avisos
  legados de lint.
- Impacto futuro na FAQ: nenhum. Não houve mudança de comportamento de produto.

## QUALITY-LINT-01 — Higiene da raiz e primeiro lote de dívida de lint — 2026-08-04

- Relatório: `docs/reports/2026-08-04_lint-debt-lote-1-e-higiene-raiz.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega: `eslint.config.js` classificado na allowlist de higiene da raiz;
  `no-duplicate-imports` zerado em 10 arquivos; 3 imports mortos removidos.
- Efeito medido: `repository:check-root` de 1 violação para OK; lint de 256 para
  240 avisos, mantendo 0 erros.
- Evidência: check-root, teste de higiene 3/3, lint, web/contracts typecheck,
  build, secret scan, quality gate sem findings e QA no navegador em
  `4173/login` e `4174/help/genius`.
- Decisão registrada: código morto maior, como `LegacyRichTextArticleEditor` e
  handlers de anexo desconectados, não foi apagado. A triagem exige decisão
  humana e está tabelada no relatório.
- Limites: nenhuma regra de ESLint afrouxada, nenhum `eslint-disable`, nenhum
  backend, banco, contrato, permissão ou dado alterado; superfícies autenticadas
  não verificadas no navegador.
- Riscos restantes: 240 avisos, sendo 73 de hooks que exigem QA autenticado.
- Impacto futuro na FAQ: nenhum.

## QUALITY-LINT-02 — Imports mortos e triagem do código morto — 2026-08-04

- Relatório: `docs/reports/2026-08-04_lint-debt-lote-2-imports-mortos-e-triagem.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega: classificação dos 146 avisos de variável não usada em specifier de
  import morto (24), declaração local morta (118) e prop/parâmetro (4); remoção
  apenas dos 24 specifiers, com verificação prévia de que nenhuma declaração
  `import` ficaria vazia.
- Efeito medido: lint de 240 para 216 avisos, mantendo 0 erros.
- Evidência: lint, web typecheck, build, secret scan, quality gate sem findings,
  check-root OK e QA no navegador em `4173/login` e
  `4174/help/genius/articles?page=3`.
- Decisão registrada: os 122 itens restantes não foram apagados. A triagem por
  arquivo, linha, símbolo e natureza está no relatório e exige decisão de
  produto, principalmente nos filtros meio ligados de Conhecimento e na
  superfície legada do editor.
- Limites: nenhuma regra afrouxada, nenhum `eslint-disable`, nenhum aviso de
  hooks tocado, nenhum backend, banco, contrato, permissão ou dado alterado.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-01 — QA autenticado, auditoria no gate e lint lote 3 — 2026-08-04

- Relatório: `docs/reports/2026-08-04_qa-autenticado-audit-no-gate-e-lint-lote-3.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega 1: QA autenticado local destravado com o harness oficial. 5 papéis
  autenticados por API e 10 cenários visuais aprovados em desktop e mobile, com
  capturas em `output/local-qa/`. Runbook validado adicionado a
  `docs/LOCAL_QA_AUTH.md`, incluindo os requisitos de porta 4173 livre e
  `NODE_ENV=development`.
- Entrega 2: auditoria de dependência de produção no quality gate. Novo
  `scripts/ci/check-dependency-advisories.mjs` e script
  `npm run security:audit:prod`, executado nos modos `fast`, `staged` e `full`,
  com 3 testes em `tests/scripts/dependency-advisories.test.mjs`. Indisponibilidade
  é reportada como `INDISPONÍVEL`, nunca como aprovação.
- Entrega 3: remoção de 21 helpers de apresentação órfãos em Conhecimento, editor,
  Portal Admin, Access e navegação. Lint de 216 para 196 avisos.
- Evidência: smoke auth, smoke visual, security audit, testes 3/3, lint,
  typecheck, build, secret scan e quality gate sem findings.
- Limites: Conhecimento, Access e Portal Admin ainda não têm cenário próprio no
  smoke; `local:qa:writes` não foi executado; nenhum backend, banco, contrato,
  permissão ou dado alterado.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-02 — Smoke estendido, hooks públicos e Fast Refresh — 2026-08-04

- Relatório: `docs/reports/2026-08-04_smoke-estendido-hooks-publicos-e-fast-refresh.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega 1: `scripts/local-qa/browser-smoke.mjs` com `extraRoutes` por persona,
  cobrindo `/admin/knowledge` e `/admin/access` para `platform_admin`, com
  captura e bloco `internalRoutes` na saída.
- Entrega 2: Central Pública sem `rules-of-hooks`. `loadSpaces`, `loadSpace`,
  `loadArticle` e `loadSearch` migraram de `useEffectEvent` para `useCallback`,
  com dependências explícitas e comportamento preservado.
- Entrega 3: novo `apps/web/src/features/help-center/public-presentation.ts` com
  os quatro helpers puros que ficavam em `public-ui.tsx`, zerando
  `react-refresh/only-export-components` na área pública.
- Efeito medido: lint de 196 para 187 avisos, sempre com 0 erros.
- Evidência: smoke com 10 cenários e 2 rotas internas, QA manual da Central
  Pública em busca, artigo e diretório, lint, typecheck, build, secret scan e
  quality gate sem findings.
- Achado registrado: `/admin/customer-portal` depende da screen key
  `customer_portal_admin`, ausente na fixture local; superfície fora do QA local.
- Limites: 41 avisos de hooks seguem em superfícies internas; nenhum backend,
  banco, contrato, permissão ou dado alterado.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-03 — Mapa de superfícies, hooks do Access e padrão de carregamento — 2026-08-05

- Relatório: `docs/reports/2026-08-05_mapa-de-superficies-hooks-access-e-padrao-de-carregamento.md`.
- Documento novo: `docs/FRONTEND_DATA_LOADING_PATTERNS.md`, indexado no
  `docs/README.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega 1: `probeRoutes` no harness de smoke, com o mapa de 11 superfícies
  internas da fixture local, e promoção de `/admin/settings` para cobertura com
  asserção. A sondagem roda após o veredito do persona porque rota sem screen key
  produz 401 esperado em `vw_admin_auth_context`.
- Entrega 2: `features/access/AccessPage.tsx` sem `rules-of-hooks`. `loadSurface`
  virou `useCallback` com dependência estável, verificado pelo smoke na rota
  `/admin/access`.
- Entrega 3: padrão canônico de carregamento documentado em três casos, com a
  decisão explícita de congelar 38 avisos de hooks, 35 deles em telas sem QA
  local possível.
- Efeito medido: lint de 187 para 184 avisos, sempre com 0 erros.
- Evidência: lint, typecheck, build, secret scan, quality gate e smoke com 10
  personas, 3 rotas internas asseguradas e 7 sondadas.
- Limites: nenhum backend, banco, contrato, permissão ou dado alterado; sondagem
  cobre apenas a persona `platform_admin`.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-04 — Manifesto de release, cenário do editor e token de recarga — 2026-08-05

- Relatório: `docs/reports/2026-08-05_release-manifest-cenario-do-editor-e-token-de-recarga.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega 1: causa do bloqueio de QA interno confirmada por consulta somente
  leitura ao `internal_screen_catalog`. É `release_enabled = false`, não falta de
  grant. Correção propagada para handoff, `FRONTEND_DATA_LOADING_PATTERNS` e
  comentários do harness.
- Entrega 2: cenário profundo `knowledgeEditorScenario` no smoke, cobrindo a
  montagem do editor de artigo real com dado do banco local.
- Entrega 3: token de recarga no bootstrap de `KnowledgePage.tsx`, primeiro uso do
  Caso 3 do padrão canônico, com o botão de nova tentativa apenas sinalizando.
- Efeito medido: lint de 184 para 183 avisos, sempre com 0 erros.
- Evidência: lint, typecheck, build, secret scan, quality gate e smoke com 10
  personas, 3 rotas internas, 1 cenário profundo e 7 rotas sondadas.
- Limites: cobertura de escrita em Conhecimento continua inexistente; 37 avisos de
  hooks seguem congelados, 35 deles por decisão de release.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-05 — Preview de release local e três camadas de autorização — 2026-08-05

- Relatório: `docs/reports/2026-08-05_preview-de-release-local-e-tres-camadas-de-autorizacao.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Decisão: não publicar telas para viabilizar QA. Em vez disso, pré-visualização
  restrita ao banco local, reversível, fora de `supabase/migrations/`.
- Entrega: `supabase/qa/local-release-preview.mjs` mais scripts `status`,
  `--screens=<lista>` e `disable`, com backup do estado original, asserção de
  ambiente local e bloqueio contra ligar o catálogo inteiro.
- Achado: autorização de tela interna tem três camadas em série, `release_enabled`,
  grant de tela e capability. `platform_admin` já tem grant de tela para todas as
  internas; faltam release e capability. Documentado em
  `FRONTEND_DATA_LOADING_PATTERNS`.
- Limite deliberado: o script não concede capability, por ser o controle mais
  sensível do control plane.
- Evidência: ciclo status/enable/smoke/disable/status com estado final idêntico ao
  inicial; lint, typecheck e secret scan aprovados.
- Limites: telas fora do release seguem sem QA local; cenário de escrita em
  Conhecimento continua pendente; nenhuma migration, contrato, view ou RPC
  alterado.
- Impacto futuro na FAQ: nenhum.

## QUALITY-QA-06 — QA de escrita em Conhecimento e dependências estáveis — 2026-08-05

- Relatório: `docs/reports/2026-08-05_qa-de-escrita-em-conhecimento-e-deps-estaveis.md`.
- Branch: `codex/react-router-v8-migration-20260804`.
- Entrega 1: cenário `knowledge-write` no smoke, autorizado pelo usuário. Escreve
  marcador sanitizado no título pelo editor, valida persistência após reload e
  restaura o valor original, com erros dedicados para falha de persistência e de
  restauração.
- Entrega 2: dependências estáveis em duas telas publicadas.
  `AnalyticsCsPage.tsx` memoiza `period`; `SettingsPage.tsx` memoiza
  `settingsPermissions` e remove a assinatura duplicada de screen keys. Nenhum
  `eslint-disable` usado.
- Efeito medido: lint de 183 para 181 avisos, sempre com 0 erros.
- Evidência: smoke com 10 personas, 3 rotas internas, 2 cenários profundos e 7
  sondadas; lint, typecheck, build e secret scan aprovados.
- Limites: escrita coberta apenas no editor de artigo; 7 avisos de
  `exhaustive-deps` seguem abertos em telas publicadas, listados no relatório;
  nenhum backend, contrato, RPC, view ou permissão alterado.
- Impacto futuro na FAQ: nenhum.

## CONFIG-PO-V2.1-01 — Fidelity delta de Configuration PO — 2026-08-09

- Relatório: `docs/reports/2026-08-09_configuration-po-v2-1-fidelity-delta.md`.
- Branch: `codex/admin-configuration-visual-v1` (em `718b988`).
- Cumpre o bloqueio obrigatório da seção 2 do handoff
  `docs/reports/2026-08-09_handoff-claude-configuration-po-v2-1.md`: delta região a
  região entre o blueprint aprovado `docs/design/blueprint/Configuration PO/v2/` e o
  runtime V2 rejeitado, em 1366×768 tema escuro.
- Baseline reutilizado, sem novas capturas:
  `output/playwright/2026-08-09-configuration-po-v2-final/screenshots/1366x768/`.
- Resultado: 6 de 6 telas reprovadas no gate factual, além do shell. Regiões ausentes
  (9), substituídas (7) e inventadas (2) estão listadas por tela, com o ponto de
  correção no código.
- Decisão registrada: vazio de dados vira estado vazio dentro da região aprovada;
  nunca justifica remover a região. Taxonomia da sidebar classificada como *a
  verificar* porque `features/navigation/minimal-navigation.ts` admite duas variantes
  conforme permissão efetiva.
- Limites: nenhum código, banco, migration, secret, deploy ou push tocado; nenhuma
  suíte executada; CI da PR #34 não consultado; viewports 1440/1024/390 e tema claro
  fora de escopo até o gate de 1366 passar.
- Impacto futuro na FAQ: nenhum.

## ACCESS CONTROL V2 — UX operacional e runtime local em 4173 — 2026-08-11

- **Escopo:** `/admin/access` e launcher local do frontend; sem banco remoto,
  push, deploy ou uso de porta alternativa.
- **Decisão:** lista e detalhe permanecem lado a lado em Estrutura e Perfis;
  tabelas usam densidade reduzida e rolagem interna, enquanto o corpo do shell
  continua rolável para formulários e detalhes completos.
- **Runtime:** `npm run dev` é o launcher oficial e usa exclusivamente
  `http://127.0.0.1:4173`. Ele identifica o processo da porta; reinicia apenas
  a instância marcada como deste worktree e para com diagnóstico quando o
  processo é desconhecido.
- **Docs/código:** `COMO-TESTAR.md`, `apps/web/README.md`,
  `docs/ENVIRONMENT_VARIABLES.md`, `docs/LOCAL_QA_AUTH.md`,
  `docs/PROMPT_RETOMADA_CODEX_2026-08-08.md`, `package.json`,
  `scripts/dev/run-web-dev.mjs` e contratos de QA relacionados.
- **Validação prevista:** typecheck, build, lint, auditoria documental, teste
  contratual e teste controlado do launcher/porta; QA autenticado depende da
  sessão local disponível.

## ACCESS CONTROL V2 — listas compactas, edição contextual e remoção de Convites — 2026-08-11

- **Escopo:** `/admin/access`, somente a superfície de Usuários, Estrutura e
  Perfis; dados e APIs históricas de convite permanecem fora da UI.
- **Decisão UX:** Estrutura e Perfis deixaram de apresentar tabelas largas;
  cada recurso aparece em lista compacta com seleção, estado, contagens úteis e
  ações. Editar área e editar perfil abrem diálogo contextual identificado.
- **Permissões de telas:** os catálogos por perfil e por colaborador foram
  reorganizados em painéis paralelos com grupos compactos e rolagem interna.
- **Documentos atualizados:** `PROJECT_STATE.md`,
  `docs/design/screens/ADMIN_ACCESS.md`,
  `docs/design/screens/ADMIN_ACCESS_BLUEPRINT_SPEC.md`,
  `docs/design/GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`,
  `docs/design/SETTINGS_BLUEPRINT_V4_REFACTOR_SPEC.md` e o relatório de Access
  Control V2.
- **Risco restante:** QA visual autenticado ainda depende da sessão local; não
  houve alteração de banco, contrato, secret, push, deploy ou migration remota.

## KPI Registry V1 — registro canônico de métricas publicadas — 2026-08-21

- **Tipo:** consolidação documental e reconciliação de contratos; nenhuma mudança de produto, banco, fórmula, permissão ou release surface.
- **Fonte canônica:** `docs/ANALYTICS_KPI_REGISTRY_V1.md`, reconciliado com os read models, RPCs, migrations e contratos de apresentação do Analytics.
- **Conteúdo:** definição de negócio, fonte, grão, coorte, campo de data, posição atual, período, timezone, filtros, unidade, fórmula, tratamento de nulos, estados de cobertura e exclusões para Visão Geral, Comercial, Suporte e Customer Success.
- **Decisão:** `created_at`/`createdate` e `closed_at`/`closedate` são semânticas distintas. Posição atual não é coorte do período. Métricas PROPOSED de metodologia e contexto na UI continuam fora deste lote.
- **Docs alterados:** `docs/ANALYTICS_KPI_REGISTRY_V1.md`, `docs/README.md` e este ledger.
- **Telas afetadas:** nenhuma.
- **Views/RPCs afetadas:** nenhuma; apenas referenciadas para rastreabilidade.
- **Validação:** `npm run docs:validate`, auditoria documental da skill, `git diff --check` e inspeção do diff; nenhum arquivo de produto foi incluído.
- **Riscos restantes:** a metodologia ainda não está exposta na interface; a fila mantém `ANALYTICS-METRIC-METHODOLOGY-2026-08-21` e `ANALYTICS-METRIC-CONTEXT-UI-2026-08-21` como `PROPOSED`.
- **Impacto futuro na FAQ:** o registro é a base para uma explicação de usuário por indicador, sem substituir a futura superfície de contexto na UI.

## OD-011 — diversidade e adequação das visualizações do Dashboard — 2026-08-22

- **Escopo:** diretriz de produto incorporada ao gate `R1-DASHBOARD-RELEASE-GATE-2026-08-21`; nenhuma task paralela foi criada.
- **Decisão:** escolher o tipo de visualização pela pergunta operacional e pelo dado, avaliando alternativas a barras, pizzas e KPIs, sem variedade decorativa.
- **Critérios:** título, unidade, período, fonte, cobertura, acessibilidade, responsividade e estados honestos de loading, vazio, erro e stale.
- **Documentos:** `docs/engineering/OWNER_DECISIONS.md`, `handoffs/README.md`, `docs/DASHBOARD_GERENCIAL_UX_SPEC_V1.md` e `docs/PROJECT_STATE.md`.
- **Limites:** somente contratos e dados reais; sem alteração de biblioteca, código de produto, shell global ou integração externa neste registro.
