# IMPLEMENTATION_PLAN.md

## Status resumido em 2026-04-29

- Fase 0: concluída.
- Fase 1: concluída localmente.
- Fase 2: concluída localmente.
- Fase 2.1: concluída localmente.
- Fase 2.2: concluída localmente.
- Pendência principal: aplicar as migrations no ambiente remoto oficial com
  runbook controlado e, somente depois, avaliar bootstrap remoto do primeiro
  `platform_admin`.

## Fase 0: Fundação

Objetivo:
- consolidar a documentação oficial;
- manter o frontend bloqueado;
- preparar o backend e a estrutura para SaaS multi-tenant.

Escopo:
- estrutura do repositório;
- documentação estratégica;
- blueprint de banco;
- definição de auth, tenancy, auditoria e contratos;
- plano de testes de RLS.

Gate de saída:
- documentação consolidada;
- blueprint alinhado ao produto;
- plano de Fase 1 aprovado.

Status atual:
- concluída.

## Fase 1: Identidade e tenancy

Objetivo:
- inicializar a base oficial do Supabase;
- materializar auth, tenants e memberships com migrations reais;
- estabelecer isolamento multi-tenant e trilha de auditoria mínima.

Entregáveis obrigatórios:
- `supabase/config.toml` inicializado;
- pasta `supabase/migrations/` com migrations oficiais;
- schemas `public`, `app_private` e `audit` criados por migration;
- tabelas `profiles`, `user_global_roles`, `tenants`, `tenant_memberships` e `tenant_contacts`;
- enums oficiais de papéis, status e tenancy;
- funções auxiliares de contexto e autorização;
- políticas RLS mínimas para identidade e tenancy;
- estratégia de sincronização entre `auth.users` e `profiles`;
- triggers mínimos de `updated_at` e `audit_logs`;
- testes de banco cobrindo isolamento e acesso.

Plano detalhado:

1. Inicialização do ambiente
- Rodar `supabase init`.
- Versionar `config.toml`.
- Criar a primeira migration oficial a partir do blueprint consolidado.

2. Fundação de identidade
- Criar `profiles` como espelho operacional do usuário autenticado.
- Definir papéis globais internos.
- Definir estratégia de bootstrap do primeiro admin.

3. Fundação de tenancy
- Criar `tenants`.
- Criar `tenant_memberships`.
- Criar `tenant_contacts`.
- Formalizar estados e regras mínimas de vínculo.

4. Contexto de autorização
- Implementar funções de contexto em `app_private`.
- Validar leitura do usuário atual, papéis globais e membership por tenant.
- Proibir decisão de acesso apenas no cliente.

5. Auditoria mínima
- Criar `audit.audit_logs`.
- Criar trigger base append-only para inserts e updates relevantes de tenancy.
- Garantir que ações administrativas sensíveis sejam auditáveis.

6. RLS mínima
- Policies para `profiles`, `tenants`, `tenant_memberships` e `tenant_contacts`.
- Isolamento entre tenants.
- Leitura administrativa apenas por papéis internos permitidos.

7. Testes mínimos obrigatórios
- Usuário do tenant A não acessa tenant B.
- Contato externo não acessa dados internos indevidos.
- Admin interno acessa apenas pelos caminhos permitidos.
- Criação e alteração relevante geram audit log.

Gate de saída:
- migrations oficiais executáveis;
- RLS mínima passando em testes;
- frontend ainda bloqueado;
- nenhum dado mockado como base de produto.

Status atual:
- concluída localmente e pronta para aplicação remota controlada.

## Fase 2: Ticketing Core

Objetivo:
- materializar o domínio de tickets antes de qualquer frontend;
- fechar os caminhos oficiais de leitura e escrita do app;
- garantir histórico, auditoria e isolamento por tenant.

Entregáveis obrigatórios:
- migration oficial de ticketing core;
- tabelas `tickets`, `ticket_messages`, `ticket_events`,
  `ticket_assignments` e `ticket_attachments`;
- views `vw_tickets_list`, `vw_ticket_detail` e `vw_ticket_timeline`;
- RPCs `rpc_create_ticket`, `rpc_update_ticket_status`, `rpc_assign_ticket`,
  `rpc_add_ticket_message`, `rpc_add_internal_ticket_note`, `rpc_close_ticket`
  e `rpc_reopen_ticket`;
- bloqueio de `SELECT` direto nas tabelas base para `authenticated`;
- testes pgTAP de core de ticketing.

Gate de saída:
- schema de tickets executável por migration;
- máquina de estados validada;
- auditoria de eventos e mutações validada;
- frontend ainda bloqueado.

Status atual:
- concluída localmente.

## Fase 2.1: Typed Contracts + View Security Audit

Objetivo:
- materializar contratos TypeScript do backend;
- auditar estruturalmente as views oficiais antes de qualquer consumo por app.

Entregáveis obrigatórios:
- pacote `packages/contracts` com enums, DTOs de views e payloads/responses de RPCs;
- `contracts:typecheck` verde;
- auditoria documental das views oficiais;
- suíte pgTAP dedicada para grants, filtros e visibilidade.

Gate de saída:
- contratos tipados alinhados ao backend;
- views auditadas sem vazamento cross-tenant;
- nota interna invisível para perfil externo;
- qualquer alteração insegura de grants quebra teste.

Status atual:
- concluída localmente.

## Fase 2.2: Documentation Sync + Remote Deploy Runbook

Objetivo:
- eliminar drift documental antes de qualquer deploy remoto;
- documentar o procedimento remoto seguro de aplicação das migrations.

Entregáveis obrigatórios:
- `README.md`, `supabase/README.md` e `docs/IMPLEMENTATION_PLAN.md` sincronizados;
- `docs/PROJECT_STATE.md` atualizado com o estado real validado;
- `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md` criado;
- confirmação de que nenhum segredo foi salvo no repositório.

Gate de saída:
- documentação alinhada com Fase 2 e 2.1;
- runbook remoto pronto para execução controlada futura;
- nenhum deploy remoto executado nesta fase.

Status atual:
- concluída localmente.

## Próxima etapa operacional: Deploy remoto controlado do banco

Objetivo:
- aplicar remotamente as migrations oficiais ja validadas localmente;
- manter frontend bloqueado;
- preparar o bootstrap remoto do primeiro `platform_admin` sem policy aberta.

Pré-condições:
- aprovacao explicita da janela remota;
- credenciais carregadas fora do repositório;
- `npm run contracts:typecheck` OK;
- `npm run supabase:verify` OK;
- uso obrigatório do runbook em `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.

Saída esperada:
- migrations remotas alinhadas ao histórico local;
- grants e views oficiais preservados;
- bootstrap remoto executado apenas se aprovado e necessário.

## Fase 3: Base de conhecimento interna

Objetivo:
- transformar a base oficial em domínio versionado, auditável e citável.

Escopo inicial:
- categorias;
- artigos;
- revisões;
- playbooks;
- troubleshooting;
- vínculo artigo ↔ ticket.

## Fase 4: Portal do cliente

Objetivo:
- expor ao cliente apenas os contratos seguros e estados autorizados.

Escopo inicial:
- login;
- abrir chamado;
- acompanhar status;
- ver histórico;
- enviar comentários e anexos.

## Fase 5: Engenharia

Objetivo:
- desacoplar suporte e engenharia sem perder rastreabilidade.

Escopo inicial:
- work items;
- bugs;
- melhorias;
- vínculo ticket ↔ demanda técnica;
- devolutiva para suporte.

## Fase 6: IA operacional

Objetivo:
- habilitar IA somente sobre base oficial, auditável e versionada.

Escopo inicial:
- busca semântica na base oficial;
- resumo de tickets;
- sugestão de artigos;
- detecção de duplicidade;
- geração assistida de bug estruturado.
