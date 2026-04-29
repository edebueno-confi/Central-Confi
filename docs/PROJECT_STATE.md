# PROJECT_STATE.md

## Produto
Genius Support OS

## Objetivo
Construir uma plataforma interna para centralizar suporte ao cliente, base de conhecimento, tickets, comunicação entre suporte e tecnologia, gestão de bugs, melhorias, SLAs, auditoria e IA operacional.

## Contexto operacional
A empresa opera o Genius Return, SaaS de automação de logística reversa para e-commerce. A operação atual sofre com suporte descentralizado, conhecimento espalhado, ausência de histórico confiável, demandas técnicas perdidas, baixa visibilidade para clientes e dependência excessiva de pessoas específicas.

## Decisão central
O sistema deve ser construído como SaaS profissional desde o início, mesmo sendo inicialmente interno.

## Fonte de verdade documental

Documentos prioritários:
- `PRODUCT_VISION.md`
- `ARCHITECTURE_RULES.md`
- `DATA_MODEL_STRATEGY.md`
- `AUTH_CONTEXT_STRATEGY.md`
- `AUDIT_LOGGING_STRATEGY.md`
- `IMPLEMENTATION_PLAN.md`
- `SECURITY_RLS_TEST_PLAN.md`
- `VIEW_RPC_CONTRACTS.md`

Documentos históricos:
- `CLEANUP_REPORT.md`

## Princípios vigentes
- Backend é source of truth.
- Frontend apenas renderiza dados e envia comandos.
- Multi-tenant obrigatório desde o início.
- Permissões, auth, RLS, auditoria e logs são fundação, não etapa posterior.
- IA só pode responder com base oficial, versionada e citável.
- Tickets, suporte, cliente, engenharia e conhecimento são domínios separados.
- Nenhum dado operacional relevante deve ser perdido.
- Documentação deve ser viva e versionada no repositório.

## Estado real do repositório em 2026-04-29

### Existe
- Repositório base com `apps/`, `packages/`, `supabase/`, `tests/`, `docs/` e `raw_knowledge/`.
- Placeholder em `apps/web/`, sem UI implementada.
- Blueprint histórico em `supabase/blueprints/001_foundation.sql`, marcado como não executável.
- Documentação estratégica oficial em `docs/`.
- Projeto Supabase inicializado via CLI com `supabase/config.toml`.
- Portas locais do Supabase remapeadas para `55321-55327` para coexistir com outro stack local já em execução.
- Migration oficial `supabase/migrations/20260429210127_phase1_identity_tenancy.sql`.
- Migration oficial de hardening `supabase/migrations/20260429212721_phase1_1_hardening.sql`.
- Migration oficial de control plane e function hardening `supabase/migrations/20260429215122_phase1_2_admin_control_plane.sql`.
- Migration oficial de ticketing core e contratos backend `supabase/migrations/20260429225342_phase2_ticketing_core_backend_contracts.sql`.
- Teste local de banco em `supabase/tests/001_phase1_identity_tenancy_rls.sql`.
- Teste local de hardening em `supabase/tests/002_phase1_1_hardening.sql`.
- Teste local de control plane administrativo em `supabase/tests/003_phase1_2_admin_control_plane.sql`.
- Teste local de auditoria estrutural de functions em `supabase/tests/004_phase1_2_function_audit.sql`.
- Teste local de ticketing core em `supabase/tests/005_phase2_ticketing_core.sql`.
- Seed separado em `supabase/seeds/` e desabilitado por padrão.
- Fluxo de bootstrap seguro do primeiro `platform_admin` em `supabase/bootstrap/`.
- Núcleo Fase 1 implementado com `profiles`, `user_global_roles`, `tenants`, `tenant_memberships`, `tenant_contacts` e `audit.audit_logs`.
- Triggers reais de `updated_at`, auditoria append-only e sync de `auth.users -> profiles`.
- Policies RLS reais para identidade, tenancy e leitura restrita de auditoria.
- Control plane administrativo mínimo materializado em RPCs seguras no schema `public`.
- `authenticated` não possui DML direto em `tenants`, `tenant_memberships`, `tenant_contacts` e `user_global_roles`; essas mutações passam por RPCs auditadas.
- Funções auditadas com `SECURITY DEFINER` endurecido, `search_path` explícito e ACLs revisadas.
- Núcleo operacional de tickets implementado localmente com `tickets`, `ticket_messages`, `ticket_events`, `ticket_assignments` e `ticket_attachments`.
- Views contratuais de leitura materializadas em `vw_tickets_list`, `vw_ticket_detail` e `vw_ticket_timeline`.
- RPCs contratuais de escrita materializadas em `rpc_create_ticket`, `rpc_update_ticket_status`, `rpc_assign_ticket`, `rpc_add_ticket_message`, `rpc_add_internal_ticket_note`, `rpc_close_ticket` e `rpc_reopen_ticket`.
- `authenticated` não possui `SELECT`, `INSERT`, `UPDATE` nem `DELETE` direto nas tabelas base de ticketing; o app lê via views e escreve via RPCs.
- Pipeline CI para banco em `.github/workflows/supabase-db.yml`.
- CI remota validada no GitHub pela workflow `Supabase DB`, run `25136285480`, branch `codex/phase1-2-admin-control-plane`, conclusão `success`.
- Base bruta preservada em `raw_knowledge/octadesk_export/latest/`.

### Não existe ainda
- Contratos tipados materializados em `packages/contracts/`.
- Frontend React, TypeScript e Tailwind iniciado.
- Views/read models contratuais para knowledge base e engenharia.
- Aplicação de migrations em ambiente remoto oficial.
- Execução remota validada do bootstrap do primeiro `platform_admin`.

## Situação por fase

- Fase 0: concluída.
  - Estrutura base existe.
  - Documentação oficial existe.
  - Blueprint existe.
  - Supabase oficial local foi inicializado.
- Fase 1: concluída localmente e pronta para aplicação controlada em ambiente remoto.
  - Identity + Tenancy materializados em migration real.
  - RLS mínima validada com pgTAP.
  - Auditoria append-only validada localmente.
  - Hardening 1.1 entregue com anti-escalation, bootstrap seguro e CI de banco.
  - Hardening 1.2 entregue com control plane administrativo via RPC, DML direto revogado para o app nas tabelas administrativas e auditoria estrutural de funções.
  - Frontend continua bloqueado.
  - Ainda faltam aplicação remota das migrations e bootstrap remoto controlado do primeiro `platform_admin`.
- Fase 2: ticketing core concluído localmente e ainda não aplicado no ambiente remoto.
  - Schema de tickets materializado por migration oficial.
  - Views contratuais e RPCs de ticketing materializadas.
  - Máquina de estados, diferenciação entre mensagens públicas e notas internas e auditoria automática validadas com pgTAP.
  - Leitura direta das tabelas-base de ticketing bloqueada para `authenticated`.
  - Ainda faltam contratos tipados em `packages/contracts/`, aplicação remota controlada e qualquer consumo por frontend.

## Ajustes de auditoria concluídos
- Documentação redundante herdada removida da rota principal.
- Índice de `docs/` realinhado para a documentação oficial.
- Blueprint SQL alinhado com os termos e fases do produto.
- Estrutura do repositório consolidada em documento próprio.

## Bloqueios vigentes
- Não iniciar telas.
- Não iniciar telas de tickets antes dos contratos tipados do backend.
- Não tratar blueprint histórico como implementação pronta.
- Não ingerir `raw_knowledge` sem classificação de sensibilidade.
- Não permitir mutação administrativa por acesso direto às tabelas do control plane.
- Não permitir leitura direta do app nas tabelas base de ticketing.

## Próxima prioridade
Materializar `packages/contracts/` a partir das views e RPCs já implementadas,
aplicar as migrations em ambiente remoto oficial com aprovação explícita e só
então abrir qualquer camada de frontend para tickets.
