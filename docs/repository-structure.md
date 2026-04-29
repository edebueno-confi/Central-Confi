# Estrutura do Repositorio

## Estrutura canônica

```text
C:\Trabalho
|   package.json
|   README.md
|
+---apps
|   \---web
|
+---docs
|
+---packages
|   +---contracts
|   \---tooling
|
+---raw_knowledge
|
+---supabase
|   \---blueprints
|
\---tests
    +---contracts
    +---database
    \---e2e
```

## Responsabilidades

- `apps/web/`
  - Aplicacao React.
  - Sem regra de negocio persistente.
  - Sem permissao definida em cliente.
- `packages/contracts/`
  - DTOs, schemas de validacao, tipos de RPC e read models.
  - Sem logica de dominio mutante.
- `packages/tooling/`
  - Configs compartilhadas, helpers de build e padroes do workspace.
- `supabase/blueprints/`
  - SQL de desenho e modelagem antes de virar migration oficial.
- `supabase/migrations/`
  - Sera criado apenas quando o projeto Supabase local/remoto for inicializado.
- `tests/database/`
  - Testes de RLS, funcoes SQL, triggers e invariantes.
- `tests/contracts/`
  - Testes de contratos e serializacao de payloads.
- `tests/e2e/`
  - Fluxos ponta a ponta depois da liberacao da UI.
- `raw_knowledge/`
  - Material legado privado para ingestao futura.

## O que evitar

- Colocar regra de negocio em componentes React.
- Duplicar tipos de dominio entre frontend e SQL sem contrato canônico.
- Misturar scripts operacionais com código de produto sem fronteira clara.
- Tratar `raw_knowledge/` como base pronta de produto sem curadoria e versionamento.
