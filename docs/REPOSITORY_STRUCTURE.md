# REPOSITORY_STRUCTURE.md

## Objetivo

Definir a estrutura canônica do repositório para manter separação entre produto,
documentação, blueprint de backend e material legado.

## Estrutura atual esperada

```text
C:\Trabalho
|   package.json
|   README.md
|   .gitignore
|
+---.github
|   \---ISSUE_TEMPLATE
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

## Responsabilidades por pasta

- `.github/`
  - templates e automações leves de colaboração;
  - nunca deve carregar regra de produto.
- `apps/web/`
  - futura aplicação React;
  - permanece bloqueada até backend, auth, RLS e contratos estáveis.
- `docs/`
  - fonte oficial de documentação viva;
  - `PROJECT_STATE.md` representa o estado real.
- `packages/contracts/`
  - DTOs, schemas e contratos compartilhados;
  - sem regra de negócio executável.
- `packages/tooling/`
  - tooling, convenções e configs compartilhadas.
- `raw_knowledge/`
  - material bruto legado;
  - não pode ser tratado como base de produto pronta.
- `supabase/blueprints/`
  - desenho pré-migration;
  - serve para consolidação antes da geração de migrations oficiais.
- `supabase/migrations/`
  - só deve nascer após `supabase init`;
  - passa a ser a fonte oficial versionada do banco.
- `tests/database/`
  - RLS, auth context, triggers, audit logs e invariantes.
- `tests/contracts/`
  - compatibilidade de payloads e read models.
- `tests/e2e/`
  - fluxos ponta a ponta, somente após contratos estáveis.

## Regras estruturais

- Não criar UI antes de migrations oficiais, auth e RLS mínimas.
- Não espalhar regra crítica entre frontend e scripts soltos.
- Não usar `raw_knowledge/` como verdade canônica sem curadoria.
- Não tratar `supabase/blueprints/` como substituto de migrations oficiais.
