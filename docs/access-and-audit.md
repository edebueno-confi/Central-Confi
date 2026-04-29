# Acesso, Tenancy e Auditoria

## Autenticacao e autorizacao

- Autenticacao via Supabase Auth.
- Autorizacao via tabelas de papel e memberships no Postgres.
- Politicas RLS obrigatorias em todo objeto exposto.
- O frontend nunca decide acesso por conta propria.

## Estrategia de papéis

### Papéis globais internos

- `platform_admin`
- `support_lead`
- `support_agent`
- `engineering_manager`
- `engineer`
- `knowledge_manager`
- `audit_reviewer`

### Papéis por tenant

- `tenant_admin`
- `tenant_manager`
- `tenant_requester`
- `tenant_viewer`

## Regras obrigatórias

- Não usar `user_metadata` para decisões de autorização.
- Claims em JWT podem ajudar em UX, mas a validação final deve consultar o
  banco.
- Toda tabela em schema exposto precisa de RLS habilitada.
- Updates relevantes precisam de policy de `SELECT` correspondente.
- Views expostas ao cliente devem respeitar RLS.
- Chaves `service_role` nunca podem aparecer em cliente público.

## Tenancy

- O `tenant_id` é a fronteira principal de isolamento.
- Papéis globais internos podem atravessar tenants via funções de autorização
  explícitas.
- Usuário cliente enxerga apenas dados do próprio tenant e apenas conforme seu
  membership.
- Conhecimento pode ser `internal` ou `tenant`, mas nunca implicitamente
  compartilhado.

## Storage

- Buckets privados por padrão.
- Path recomendado: `tenant/<tenant-id>/<entity>/<entity-id>/<filename>`.
- Upload com overwrite só deve existir se as policies cobrirem `INSERT`,
  `SELECT` e `UPDATE`.
- Anexos sensíveis devem registrar classificação no metadado transacional.

## Auditoria

### Dois níveis de trilha

- `ticket_events`
  - timeline operacional para produto e leitura humana.
- `audit.audit_logs`
  - trilha forense append-only para compliance e investigação.

## Eventos mínimos auditáveis

- criação, triagem, atribuição, mudança de status e encerramento de ticket;
- criação, publicação e arquivamento de artigo;
- criação e mudança de status de work item técnico;
- alteração de membership, papéis e acesso;
- upload, download assinado e exclusão de anexo sensível;
- qualquer operação administrativa com bypass operacional.

## Referências externas validadas

Esta base considera a orientação atual do Supabase para:

- RLS obrigatório em schemas expostos e cuidado com `security_invoker` em views;
- Storage controlado por RLS com permissões adicionais para `upsert`;
- cuidado com validade residual de JWT ao remover usuários;
- hardening de produto com RBAC, roles e proteção de `service_role`.
