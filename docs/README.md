# Docs

## Ordem de produto vigente

- [Roadmap e ordem canônica de releases](./ROADMAP_BUILDOUT_V3.md#current-product-execution-order) — Release 1 agora, Release 2 depois e histórico preservado com classificação explícita.
- [Decisões do proprietário](./engineering/OWNER_DECISIONS.md#od-011--diversidade-e-adequação-das-visualizações-do-dashboard) — ordem de releases, painel visual de desenvolvimento e diretriz de diversidade das visualizações do Dashboard.

- [Engenharia e governança](./engineering/PROJECT.md) — índice inicial da camada normativa para Codex e Claude.
- [Protocolo de revisão multiagente](./engineering/REVIEW_PROTOCOL.md) — papéis, precedência, estados e artefatos.
- [CODE_REVIEW_PROTOCOL_V1.md](./CODE_REVIEW_PROTOCOL_V1.md) — contrato de revisão entre agente implementador e agente revisor, quality gates e política de severidade.
- [`.review/README.md`](../.review/README.md) — área de trabalho do revisor: pedidos, vereditos, baseline de débito e estado do ciclo.

- [Handoff temporário do ConfiOne para o Claude, 2026-08-19](../handoffs/CLAUDE_PROJECT_TAKEOVER_2026-08-19.md)
- [Prompt de takeover temporário do ConfiOne, 2026-08-19](../handoffs/PROMPT_CLAUDE_PROJECT_TAKEOVER_2026-08-19.md)

- [CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md](./CUSTOMER_OPERATIONS_MIGRATION_DOMAIN_V1.md)
- [Handoff de migração Genius e After Sale V1 → V2](./AFTER_SALE_V1_V2_GENIUS_MIGRATION_HANDOFF.md) — ponto de entrada para leitura pelo Cloud, com fontes, regras de proveniência, de-para, segurança e pendências.
- [Importação local do diretório HubSpot](./reports/HUBSPOT_CUSTOMER_DIRECTORY_IMPORT_2026-08-16.md)
- [Auditoria do domínio Customer Success V1](./ANALYTICS_CS_DOMAIN_AUDIT_V1.md) — fontes locais, descoberta oficial das APIs HubSpot e lacunas de health score, churn, expansão e renovação.
- [Auditoria do domínio de Suporte V1](./ANALYTICS_SUPPORT_DOMAIN_AUDIT_V1.md) — fila, tickets, conversas, chat, SLA, aging, prioridade, tenant e semântica de datas.
- [Auditoria do domínio Produto e Desenvolvimento V1](./ANALYTICS_PRODUCT_DEV_DOMAIN_AUDIT_V1.md) — separa a espera por GitHub, a operação técnica de Engenharia e as métricas que ainda exigem fonte, ingestão e histórico.

- [VIEW_RPC_CONTRACTS.md](./VIEW_RPC_CONTRACTS.md) — contratos de agrupamento interno da Central de Clientes (`customer_account_groups`).
- [Customer Relationship Groups V1](./reports/CUSTOMER_RELATIONSHIP_GROUPS_V1_2026-08-16.md) — decisão de domínio, implementação e validação da Central de Clientes.
- [Blueprints visuais oficiais da Central de Clientes V1](./design/screens/ADMIN_TENANTS.md#blueprints-visuais-oficiais-da-central-de-clientes-v1) — visão da carteira e workspace dedicado do cliente.

- [Operational Support Flow V1 kickoff](./reports/OPERATIONAL_SUPPORT_FLOW_V1_KICKOFF_2026-08-16.md) — contrato de autorização corrigido e ativação local controlada do Support Workspace.

- [Handoff Recharts 3 e reconciliação da suíte](./reports/2026-08-11_recharts-suite-reconciliation-handoff.md) — migração concluída e falhas amplas classificadas para a próxima publicação.

## Decisão visual vigente — Administração e Configurações

- [Contrato Visual de Administração e Configurações V1](./specs/ADMIN_CONFIGURATION_VISUAL_CONTRACT_V1.md) — precedência local para shell, Usuários, Histórico, Fontes e Integrações a partir de 2026-08-09.
- [Mapa de componentes do Blueprint V1](./reports/2026-08-09_admin-configuration-blueprint-component-map.md) — matriz REUSE/ADAPT/NEW/OMIT e evidência das referências aprovadas.
- [Avaliação de prontidão do Development Control Plane Visual](./reports/DEVELOPMENT_CONTROL_PLANE_VISUAL_READINESS_ASSESSMENT_2026-08-21.md) — MVP local, lacunas, segurança e recomendação para V1 online read-only.
- [Briefing do modelo de trabalho com agentes](./reports/CONFIONE_AGENT_OPERATING_MODEL_PRESENTATION_BRIEF_2026-08-22.md) — material conceitual para apresentar à diretoria Codex, Forge, Sentinel, Cloud/Claude, handoffs, eventos e heartbeats.

## Branches e release

- [context-handoff/00_CONTEXT_PACK_INDEX.md](./context-handoff/00_CONTEXT_PACK_INDEX.md)
- [ACCESS_AREAS_ROLES_PORTFOLIOS_SPEC_V1.md](./ACCESS_AREAS_ROLES_PORTFOLIOS_SPEC_V1.md)
- [ACCESS_CONTROL_V2_2026-08-11.md](./reports/ACCESS_CONTROL_V2_2026-08-11.md) — ciclo de vida, dependências e evidência de permissões efetivas do control plane.
- [AUTHORIZATION_ADMIN_ACCESS_SIMPLIFICATION_PLAN_V1.md](./specs/AUTHORIZATION_ADMIN_ACCESS_SIMPLIFICATION_PLAN_V1.md) — decisão, evidência, decomposição e critérios para cadastro, liberação e autorização de usuários; planejamento sem implementação.
- [AUTHORIZATION_MODEL_INVENTORY_V1.md](./specs/AUTHORIZATION_MODEL_INVENTORY_V1.md) — inventário factual do fluxo atual de autenticação, contexto, autorização, menu, router, backend, estados e lacunas; task `AUTH-MODEL-INVENTORY-2026-08-21`.
- [GIT_BRANCHING_AND_RELEASE_POLICY.md](./GIT_BRANCHING_AND_RELEASE_POLICY.md)
- [reports/REPOSITORY_CLEANUP_AUDIT_2026-07-21.md](./reports/REPOSITORY_CLEANUP_AUDIT_2026-07-21.md)
- [reports/SDD_CONTINUITY_AUDIT_2026-07-21.md](./reports/SDD_CONTINUITY_AUDIT_2026-07-21.md)
- [superpowers/specs/2026-07-21-gso-release-readiness-and-next-cycles.md](./superpowers/specs/2026-07-21-gso-release-readiness-and-next-cycles.md)
- [superpowers/plans/2026-07-21-gso-release-readiness-and-next-cycles.md](./superpowers/plans/2026-07-21-gso-release-readiness-and-next-cycles.md)

Fonte oficial da documentação do ConfiOne.

## Regra de leitura

- Os documentos estratégicos em caixa alta são a fonte prioritária de verdade.
- `PROJECT_STATE.md` descreve o estado real atual do repositório.
- `CLEANUP_REPORT.md` é histórico e não descreve mais a estrutura corrente.
- `docs/GPT/` é área auxiliar não canônica; qualquer decisão sobre sua leitura,
  consolidação ou arquivamento deve seguir `reports/DOCS_GPT_CANONICAL_DECISION_2026-05-20.md`.

## Visão e estado

- [PROJECT_STATE.md](./PROJECT_STATE.md)
- [reports/2026-08-01_repository-and-release-surface-audit.md](./reports/2026-08-01_repository-and-release-surface-audit.md)
- [reports/2026-08-01_git-state-reconciliation-addendum.md](./reports/2026-08-01_git-state-reconciliation-addendum.md)
- [reports/2026-08-01_analytics-contracts-and-local-auth-delta.md](./reports/2026-08-01_analytics-contracts-and-local-auth-delta.md)
- [reports/DESIGN_QA_ANALYTICS_COCKPIT_2026-08-01.md](./reports/DESIGN_QA_ANALYTICS_COCKPIT_2026-08-01.md)
- [reports/2026-08-01_dashboard-metrics-and-integrations-discovery.md](./reports/2026-08-01_dashboard-metrics-and-integrations-discovery.md)
- [reports/2026-08-01_ambiente_local_pgtap_e_sync_hubspot.md](./reports/2026-08-01_ambiente_local_pgtap_e_sync_hubspot.md)
- [reports/HUBSPOT_OMIE_SYNC_HARDENING_2026-07-21.md](./reports/HUBSPOT_OMIE_SYNC_HARDENING_2026-07-21.md)
- [reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md](./reports/CODEX_CONTINUATION_HANDOFF_2026-07-17.md)
- [ANALYTICS_METRIC_CATALOG_V1.md](./ANALYTICS_METRIC_CATALOG_V1.md)
- [ANALYTICS_KPI_REGISTRY_V1.md](./ANALYTICS_KPI_REGISTRY_V1.md) — registro de KPIs e escopos; a validação pipeline → área → operação está na task `DATA-PIPELINE-OPERATION-GOVERNANCE-2026-08-21` e a integridade de caracteres na `R1-UTF8-ENCODING-INTEGRITY-2026-08-21`.
- [engineering/SUPABASE_MIGRATION_SAFETY_PROCESS_V1.md](./engineering/SUPABASE_MIGRATION_SAFETY_PROCESS_V1.md) — processo fail-closed para identidade, preflight, shadow, RLS, performance, locks, backup e pós-validação de migrations.
- [reports/REMOTE_SUPABASE_SECURITY_RLS_PERFORMANCE_AUDIT_2026-08-24.md](./reports/REMOTE_SUPABASE_SECURITY_RLS_PERFORMANCE_AUDIT_2026-08-24.md) — auditoria remota somente leitura do projeto `jzmmvfcmruasqmrdmbup`, com findings de segurança, RLS e performance.
- [reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md](./reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md) — preflight semântico, remediação candidata em shadow e trava histórica `NO_GO` da task 60.
- [ANALYTICS_PIPELINE_OPERATION_GOVERNANCE_V1.md](./ANALYTICS_PIPELINE_OPERATION_GOVERNANCE_V1.md) — mapa canônico pipeline → área → operação, estados de ausência/ambiguidade, filtros server-side e reconciliação por operação.
- [ANALYTICS_MRR_GOALS_FOUNDATION_V1.md](./ANALYTICS_MRR_GOALS_FOUNDATION_V1.md)
- [ANALYTICS_FINANCE_DOMAIN_AUDIT_V1.md](./ANALYTICS_FINANCE_DOMAIN_AUDIT_V1.md) — fonte OMIE, datas, posição atual, recebido, vencido, aging, cobertura e limitações do Financeiro; vinculado à task `R1-INTEGRATION-CALL-QUALITY-2026-08-21` para qualidade das chamadas e refresh dos painéis.
- [DASHBOARD_GERENCIAL_UX_SPEC_V1.md](./DASHBOARD_GERENCIAL_UX_SPEC_V1.md) — contrato visual histórico do Dashboard, atualizado com o critério de escolha de visualizações por pergunta operacional.
- [ANALYTICS_PREDICTION_FOUNDATION_V1.md](./ANALYTICS_PREDICTION_FOUNDATION_V1.md)
- [ANALYTICS_CONTRACT_EXPIRY_FOUNDATION_V1.md](./ANALYTICS_CONTRACT_EXPIRY_FOUNDATION_V1.md)
- [ANALYTICS_CS_DOMAIN_AUDIT_V1.md](./ANALYTICS_CS_DOMAIN_AUDIT_V1.md)
- [reports/PROJECT_RESTART_DOCUMENTATION_PLAYBOOK_2026-06-22.md](./reports/PROJECT_RESTART_DOCUMENTATION_PLAYBOOK_2026-06-22.md)
- [reports/FINAL_RECOVERY_HANDOFF_AND_NEXT_STEPS_2026-06-09.md](./reports/FINAL_RECOVERY_HANDOFF_AND_NEXT_STEPS_2026-06-09.md)
- [reports/MINIMAL_OPERATIONAL_REDESIGN_VALIDATION_2026-06-09.md](./reports/MINIMAL_OPERATIONAL_REDESIGN_VALIDATION_2026-06-09.md)
- [superpowers/specs/2026-06-09-minimal-operational-redesign-design.md](./superpowers/specs/2026-06-09-minimal-operational-redesign-design.md)
- [superpowers/plans/2026-06-09-minimal-operational-redesign.md](./superpowers/plans/2026-06-09-minimal-operational-redesign.md)
- [reports/CS_PORTFOLIO_READONLY_UI_2026-06-09.md](./reports/CS_PORTFOLIO_READONLY_UI_2026-06-09.md)
- [reports/DEPENDENCY_HARDENING_2026-06-09.md](./reports/DEPENDENCY_HARDENING_2026-06-09.md)
- [reports/POST_RECOVERY_BASELINE_2026-06-09.md](./reports/POST_RECOVERY_BASELINE_2026-06-09.md)
- [reports/PROJECT_TAKEOVER_CHECKPOINT_2026-06-09.md](./reports/PROJECT_TAKEOVER_CHECKPOINT_2026-06-09.md)
- [reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md](./reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md)
- [reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md](./reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md)
- [PRODUCT_VISION.md](./PRODUCT_VISION.md)
- [UX_DIRECTION.md](./UX_DIRECTION.md)
- [INTERNAL_WORKSPACE_DESIGN_SYSTEM.md](./INTERNAL_WORKSPACE_DESIGN_SYSTEM.md)
- [INTERNAL_UI_ACCEPTANCE_CHECKLIST.md](./INTERNAL_UI_ACCEPTANCE_CHECKLIST.md)
- [UI_REFACTOR_BACKLOG.md](./UI_REFACTOR_BACKLOG.md)
- [ROADMAP.md](./ROADMAP.md)
- [MVP_30_DAYS.md](./MVP_30_DAYS.md)
- [DOCUMENTATION_LEDGER.md](./DOCUMENTATION_LEDGER.md)
- [PLATFORM_FAQ_STRATEGY.md](./PLATFORM_FAQ_STRATEGY.md)
- [PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md](./PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md)
- [CONTENT_OPERATIONS_GOVERNANCE.md](./CONTENT_OPERATIONS_GOVERNANCE.md)

## Arquitetura e backend

- [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md)
- [FRONTEND_DATA_LOADING_PATTERNS.md](./FRONTEND_DATA_LOADING_PATTERNS.md)
- [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md)
- [DATA_MODEL_STRATEGY.md](./DATA_MODEL_STRATEGY.md)
- [PHASE_4_1_MULTI_BRAND_ARCHITECTURE_REVIEW.md](./PHASE_4_1_MULTI_BRAND_ARCHITECTURE_REVIEW.md)
- [DATA_DICTIONARY_MVP.md](./DATA_DICTIONARY_MVP.md)
- [AUTH_CONTEXT_STRATEGY.md](./AUTH_CONTEXT_STRATEGY.md)
- [AUDIT_LOGGING_STRATEGY.md](./AUDIT_LOGGING_STRATEGY.md)
- [VIEW_RPC_CONTRACTS.md](./VIEW_RPC_CONTRACTS.md)
- [SECURITY_RLS_TEST_PLAN.md](./SECURITY_RLS_TEST_PLAN.md)
- [SLA_STRATEGY.md](./SLA_STRATEGY.md)
- [AI_GOVERNANCE.md](./AI_GOVERNANCE.md)

## Fluxos de domínio

- [SUPPORT_WORKFLOW.md](./SUPPORT_WORKFLOW.md)
- [SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md](./SUPPORT_WORKSPACE_ARCHITECTURE_SPEC.md)
- [INTERNAL_ACTIONS_V1_STATUS_REPORT.md](./INTERNAL_ACTIONS_V1_STATUS_REPORT.md)
- [INTERNAL_WORKSPACE_DESIGN_SYSTEM.md](./INTERNAL_WORKSPACE_DESIGN_SYSTEM.md)
- [INTERNAL_UI_ACCEPTANCE_CHECKLIST.md](./INTERNAL_UI_ACCEPTANCE_CHECKLIST.md)
- [UI_REFACTOR_BACKLOG.md](./UI_REFACTOR_BACKLOG.md)
- [CUSTOMER_ACCOUNT_PROFILE_SPEC.md](./CUSTOMER_ACCOUNT_PROFILE_SPEC.md)
- [CUSTOMER_ACCOUNT_PROFILE_DATA_MODEL_REVIEW.md](./CUSTOMER_ACCOUNT_PROFILE_DATA_MODEL_REVIEW.md)
- [CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md](./CUSTOMER_ACCOUNT_PROFILE_MIGRATION_DESIGN.md)
- [TICKET_KNOWLEDGE_LINKING_SPEC.md](./TICKET_KNOWLEDGE_LINKING_SPEC.md)
- [TICKET_KNOWLEDGE_LINKING_DATA_MODEL_REVIEW.md](./TICKET_KNOWLEDGE_LINKING_DATA_MODEL_REVIEW.md)
- [TICKET_KNOWLEDGE_LINKING_MIGRATION_DESIGN.md](./TICKET_KNOWLEDGE_LINKING_MIGRATION_DESIGN.md)
- [TICKET_KNOWLEDGE_PUBLIC_LINK_CONTRACT_REVIEW.md](./TICKET_KNOWLEDGE_PUBLIC_LINK_CONTRACT_REVIEW.md)
- [TICKET_LIFECYCLE.md](./TICKET_LIFECYCLE.md)
- [ENGINEERING_WORKFLOW.md](./ENGINEERING_WORKFLOW.md)
- [KNOWLEDGE_BASE_STRATEGY.md](./KNOWLEDGE_BASE_STRATEGY.md)
- [KNOWLEDGE_CONTENT_CURATION_PLAN.md](./KNOWLEDGE_CONTENT_CURATION_PLAN.md)
- [PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md](./PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md)
- [CONTENT_OPERATIONS_GOVERNANCE.md](./CONTENT_OPERATIONS_GOVERNANCE.md)
- [reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md](./reports/KNOWLEDGE_LEGACY_INVENTORY_REPORT.md)
- [knowledge/KNOWLEDGE_LEGACY_BATCH_EXECUTION_PLAN.md](./knowledge/KNOWLEDGE_LEGACY_BATCH_EXECUTION_PLAN.md)

## Governança documental

- [BUILD_JOURNAL_STRATEGY.md](./BUILD_JOURNAL_STRATEGY.md)
- [BUILD_JOURNAL_SCREEN_SPEC.md](./BUILD_JOURNAL_SCREEN_SPEC.md)
- [PRODUCT_DOCS_INTERNAL_READER_V1.md](./PRODUCT_DOCS_INTERNAL_READER_V1.md)
- [INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md](./INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md)
- [superpowers/plans/2026-06-09-project-stabilization-and-resumption.md](./superpowers/plans/2026-06-09-project-stabilization-and-resumption.md)
- [KANBAN_OPERATIONAL_GOVERNANCE.md](./KANBAN_OPERATIONAL_GOVERNANCE.md)
- [DOCUMENTATION_UPDATE_POLICY.md](./DOCUMENTATION_UPDATE_POLICY.md)
- [DOCUMENTATION_GOVERNANCE_RUNBOOK.md](./DOCUMENTATION_GOVERNANCE_RUNBOOK.md)
- [DOCUMENTATION_LEDGER.md](./DOCUMENTATION_LEDGER.md)
- [reports/DOCS_GPT_CANONICAL_DECISION_2026-05-20.md](./reports/DOCS_GPT_CANONICAL_DECISION_2026-05-20.md)
- [PLATFORM_FAQ_STRATEGY.md](./PLATFORM_FAQ_STRATEGY.md)
- [PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md](./PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md)
- [CONTENT_OPERATIONS_GOVERNANCE.md](./CONTENT_OPERATIONS_GOVERNANCE.md)
- [INTERNAL_UI_ACCEPTANCE_CHECKLIST.md](./INTERNAL_UI_ACCEPTANCE_CHECKLIST.md)
- [UI_REFACTOR_BACKLOG.md](./UI_REFACTOR_BACKLOG.md)


## Diário de Construção

- [BUILD_JOURNAL_STRATEGY.md](./BUILD_JOURNAL_STRATEGY.md)
- [BUILD_JOURNAL_SCREEN_SPEC.md](./BUILD_JOURNAL_SCREEN_SPEC.md)

Área interna para explicar como o ConfiOne foi planejado, arquitetado e construído com colaboração entre humano, ChatGPT e Codex. A experiência runtime atual usa conteúdo estático versionado no frontend, em composição dark compacta e desktop-first, sem criar backend, migrations, RPCs, tabelas ou RLS nova.

Na fase `Build Journal Immersive Blueprint Fidelity V1`, a rota foi redesenhada com hero dark horizontal, paisagem abstrata, faixa `A jornada em uma visão`, mapa da construção, timeline por fases, documentos-fonte curados, arquitetura explicada, papel da IA, estado atual e fechamento editorial, sempre preservando shell real, gate administrativo existente, ausência de backend novo e ausência de alteração em Product Docs nesta rodada.

Direção já registrada para a próxima rodada: conectar a narrativa do Diário aos markdowns-fonte originais aprovados, com aprofundamento curado e ilustrações estáticas sanitizadas.

## Documentos do Produto

- [product/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_DECISION_RECORD.md](./product/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_DECISION_RECORD.md)
- [PRODUCT_DOCS_INTERNAL_READER_V1.md](./PRODUCT_DOCS_INTERNAL_READER_V1.md)
- [INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md](./INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md)
- [PRODUCT.md](../PRODUCT.md)
- [DESIGN.md](../DESIGN.md)

Área interna em `/admin/product-docs` para consulta controlada dos documentos estratégicos whitelisted que definem visão, arquitetura, segurança, operação, design, governança e construção do ConfiOne. A experiência atual consome o catálogo e o detalhe oficiais por contratos reais de documentos internos, com `Por onde começar`, trilhas de leitura, rail de governança e índice interno derivado do markdown sanitizado, sem parser de filesystem ou leitura arbitrária de arquivos.

Direção já registrada para a próxima rodada: evoluir a biblioteca para leitura mais profunda e navegação documental mais rica, mantendo whitelist explícita, curadoria, sanitização e ausência de leitura arbitrária do repositório.

## Áreas internas de documentação

- [INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md](./INTERNAL_DOCUMENTATION_AREAS_CHECKPOINT_V1.md)

Checkpoint consolidado das duas áreas internas documentais já implementadas no Admin Console, registrando diferença entre `Diário de Construção` e `Documentos do Produto`, modelo atual de acesso, política de exposição, sanitização e critérios de evolução futura.

## Política de atualização documental

- [DOCUMENTATION_UPDATE_POLICY.md](./DOCUMENTATION_UPDATE_POLICY.md)
- [DOCUMENTATION_GOVERNANCE_RUNBOOK.md](./DOCUMENTATION_GOVERNANCE_RUNBOOK.md)
- [CODEX_EXECUTION_RULES.md](./CODEX_EXECUTION_RULES.md)
- [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)

Política operacional que torna atualização documental parte obrigatória do processo de entrega. Define quando atualizar `PROJECT_STATE.md`, `DOCUMENTATION_LEDGER.md`, documento específico da área e `README.md`, além de incluir checklist mínimo de revisão antes de encerrar cada lote relevante.

O runbook de governança documental traduz a política em cadência, checkpoints por lote, ritual de revisão e conexão explícita com validação técnica e com o board Kanban.

A política de higiene da raiz traduz a auditoria estrutural em regra prática para screenshots, dumps, logs, evidências transitórias e quarentena, evitando que a raiz volte a virar depósito operacional.

## Skills locais do Codex

- [../.skills/genius-cockpit-ui-blueprint/SKILL.md](../.skills/genius-cockpit-ui-blueprint/SKILL.md)

Skill local versionada para tarefas de UI/UX do ConfiOne baseadas em blueprint, screenshot, polish visual, copy operacional e tradução fiel para React/Tailwind com aderência ao Design System V3 e aos contratos reais do produto.

## Planejamento e execução

- [KANBAN_OPERATIONAL_GOVERNANCE.md](./KANBAN_OPERATIONAL_GOVERNANCE.md)
- [GOAL_EXECUTION_PLAN.md](./GOAL_EXECUTION_PLAN.md)
- [reports/FINAL_RECOVERY_HANDOFF_AND_NEXT_STEPS_2026-06-09.md](./reports/FINAL_RECOVERY_HANDOFF_AND_NEXT_STEPS_2026-06-09.md)
- [superpowers/specs/2026-06-09-cs-portfolio-readonly-design.md](./superpowers/specs/2026-06-09-cs-portfolio-readonly-design.md)
- [superpowers/plans/2026-06-09-cs-portfolio-readonly.md](./superpowers/plans/2026-06-09-cs-portfolio-readonly.md)
- [reports/CS_PORTFOLIO_READONLY_UI_2026-06-09.md](./reports/CS_PORTFOLIO_READONLY_UI_2026-06-09.md)
- [reports/CS_PORTFOLIO_CONTRACT_FOUNDATION_2026-06-04.md](./reports/CS_PORTFOLIO_CONTRACT_FOUNDATION_2026-06-04.md)
- [reports/CS_WORKSPACE_READINESS_AUDIT_2026-06-04.md](./reports/CS_WORKSPACE_READINESS_AUDIT_2026-06-04.md)
- [reports/OCP_V1_E_SUBSCRIPTIONS_READMODEL_HARDENING_2026-06-02.md](./reports/OCP_V1_E_SUBSCRIPTIONS_READMODEL_HARDENING_2026-06-02.md)
- [reports/OCP_V1_E_SUBSCRIPTIONS_READONLY_UI_2026-06-02.md](./reports/OCP_V1_E_SUBSCRIPTIONS_READONLY_UI_2026-06-02.md)
- [reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_FOUNDATION_2026-06-02.md](./reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_FOUNDATION_2026-06-02.md)
- [reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_EXECUTION_PLAN.md](./reports/OCP_V1_E_CUSTOMER_PRODUCT_SUBSCRIPTIONS_EXECUTION_PLAN.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- [VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)
- [reports/VALIDATION_BASELINE_MATRIX_2026-05-20.md](./reports/VALIDATION_BASELINE_MATRIX_2026-05-20.md)
- [reports/SUPABASE_VERIFY_SPLIT_PROPOSAL_2026-05-20.md](./reports/SUPABASE_VERIFY_SPLIT_PROPOSAL_2026-05-20.md)
- [CODEX_EXECUTION_RULES.md](./CODEX_EXECUTION_RULES.md)

## Histórico

- [CLEANUP_REPORT.md](./CLEANUP_REPORT.md)
- [reports/REPOSITORY_SANITIZATION_REPORT.md](./reports/REPOSITORY_SANITIZATION_REPORT.md)
- [reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md](./reports/PROJECT_FORENSIC_RECOVERY_AUDIT_2026-05-29.md)
- [reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md](./reports/WORKTREE_VISUAL_BLUEPRINT_RECOVERY_CLOSURE_2026-05-29.md)
- [specs/GENIUS_HIGH_DENSITY_INTERFACE_V1.md](./specs/GENIUS_HIGH_DENSITY_INTERFACE_V1.md)
