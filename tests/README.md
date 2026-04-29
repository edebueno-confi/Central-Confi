# Tests

Estratégia inicial de testes do Genius Support OS.

## Trilhas

- `database/`
  - RLS, funções SQL, triggers, auditoria e invariantes.
- `contracts/`
  - DTOs, serialização, parsing e estabilidade dos contratos.
- `e2e/`
  - Fluxos de ticket, base de conhecimento e handoff com engenharia.

## Regra

Sem testes de banco, não existe confiança real em tenancy, permissão ou
auditoria.
