# DATA_MODEL_STRATEGY.md

## Estratégia
Modelar o banco por domínios operacionais, com isolamento por tenant, auditoria append-only e contratos claros de leitura/escrita.

## Domínios iniciais
- Identity and Access.
- Tenant Management.
- Customer Management.
- Ticketing.
- Knowledge Management.
- Engineering Intake.
- Audit and Compliance.
- AI Sources.

## Entidades principais
- profiles
- user_global_roles
- tenants
- tenant_memberships
- tenant_contacts
- tickets
- ticket_messages
- ticket_events
- ticket_attachments
- knowledge_spaces
- knowledge_categories
- knowledge_articles
- knowledge_article_revisions
- engineering_work_items
- engineering_ticket_links
- audit_logs
- ai_sources
- ai_chunks

## Campos obrigatórios em tabelas operacionais
- id
- tenant_id
- created_at
- updated_at
- created_by
- updated_by

## Histórico
Nunca sobrescrever histórico relevante. Mudanças de status, prioridade, responsável e SLA devem gerar evento.

## Exclusão
Preferir soft delete, arquivamento ou status. Não apagar fisicamente dados operacionais sem política explícita.
