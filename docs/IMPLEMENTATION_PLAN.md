# IMPLEMENTATION_PLAN.md

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

## Fase 2: Tickets
- Criar ticket.
- Listar tickets.
- Detalhar ticket.
- Comentários.
- Eventos.
- Anexos.
- Responsável.
- Status controlado.

## Fase 3: Base de conhecimento interna
- Categorias.
- Artigos.
- Revisões.
- Playbooks.
- Troubleshooting.
- Vincular artigo ao ticket.

## Fase 4: Portal do cliente
- Login.
- Abrir chamado.
- Acompanhar status.
- Ver histórico.
- Enviar comentários e anexos.

## Fase 5: Engenharia
- Work items.
- Bugs.
- Melhorias.
- Vínculo ticket ↔ demanda técnica.
- Devolutiva para suporte.

## Fase 6: IA operacional
- Busca semântica na base oficial.
- Resumo de tickets.
- Sugestão de artigos.
- Detecção de duplicidade.
- Geração assistida de bug estruturado.
