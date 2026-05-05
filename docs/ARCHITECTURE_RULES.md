# ARCHITECTURE_RULES.md

## Regra máxima
O backend é a única fonte da verdade. O frontend não calcula regra de negócio, SLA, permissão, status, prioridade, elegibilidade ou visibilidade.

## Camadas

### Frontend
Responsável por:
- renderizar telas;
- consumir views/read models;
- chamar RPCs/commands;
- exibir estados retornados pelo backend;
- nunca inferir permissão ou regra operacional.

### Backend
Responsável por:
- regras de negócio;
- validações;
- transições de status;
- SLA;
- permissões;
- auditoria;
- criação de eventos;
- contratos de leitura e escrita.

### Banco
PostgreSQL/Supabase deve concentrar:
- RLS;
- constraints;
- triggers de auditoria;
- functions/RPCs;
- views contratuais;
- logs append-only.

## Multi-tenancy
Todo dado operacional deve estar vinculado a `tenant_id` ou equivalente explícito. Nunca assumir tenant por contexto visual ou frontend.

## Separação de domínios
- Suporte não é engenharia.
- Ticket não é bug.
- Comentário não é evento.
- Artigo público não é playbook interno.
- Cliente empresa não é usuário interno.
- Contato do cliente não é membro da operação.

## Proibições
- Mock como base de produto.
- Permissão apenas por frontend.
- Status livre sem controle.
- IA respondendo sem fonte.
- Anexo sem controle de acesso.
- Exclusão física de histórico operacional.
- Acoplamento direto entre ticket e backlog técnico sem entidade intermediária.

## Padrão esperado
Toda funcionalidade deve nascer com:
- contrato de dados;
- regra de permissão;
- trilha de auditoria;
- evento de histórico;
- teste mínimo de acesso;
- documentação atualizada.
