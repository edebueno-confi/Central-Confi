# DATA_DICTIONARY_MVP.md

## tenants
Representa uma empresa cliente ou organização operacional isolada.

Campos mínimos:
- id
- name
- status
- created_at
- updated_at

## profiles
Representa o perfil de usuário autenticado.

## tenant_memberships
Relaciona usuários a tenants e define papéis no contexto daquela organização.

## tenant_contacts
Contatos externos vinculados ao cliente B2B.

## tickets
Registro principal de solicitação de suporte.

Campos mínimos:
- id
- tenant_id
- title
- description
- status
- priority
- source
- requester_contact_id
- assigned_to
- created_by
- created_at
- updated_at

## ticket_messages
Comentários e mensagens dentro do ticket.

## ticket_events
Timeline imutável do ticket.

## knowledge_articles
Artigos da base de conhecimento.

## knowledge_article_revisions
Versionamento de artigos.

## engineering_work_items
Bugs, melhorias ou demandas técnicas derivadas ou não de tickets.

## engineering_ticket_links
Relaciona tickets a demandas técnicas sem acoplar os domínios.

## audit_logs
Registro append-only de ações relevantes do sistema.
