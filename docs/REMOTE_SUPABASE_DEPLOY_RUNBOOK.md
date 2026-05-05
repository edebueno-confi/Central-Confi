# REMOTE_SUPABASE_DEPLOY_RUNBOOK.md

## Objetivo
Executar a aplicacao remota controlada das migrations oficiais do Genius Support
OS sem abrir frontend, sem usar mocks e sem salvar segredos no repositório.

## Fechamento validado em 2026-04-29

- `db push` remoto aplicado com sucesso para as 4 migrations oficiais:
  - `20260429210127_phase1_identity_tenancy.sql`
  - `20260429212721_phase1_1_hardening.sql`
  - `20260429215122_phase1_2_admin_control_plane.sql`
  - `20260429225342_phase2_ticketing_core_backend_contracts.sql`
- `supabase migration list` permaneceu alinhado entre local e remoto apos o push.
- Bootstrap remoto do primeiro `platform_admin` concluído com sucesso.
- `public.user_global_roles` validado com o `user_id` promovido e role `platform_admin`.
- `audit.audit_logs` validado para o `insert` correspondente em `public.user_global_roles`.
- Segunda tentativa de bootstrap falhou explicitamente, como esperado.
- Nenhuma seed foi executada.
- Nenhum frontend foi criado.
- Nenhum `service_role` foi usado.
- Working tree local permaneceu limpa antes e depois da janela remota validada.

## Escopo deste runbook
- aplicar remotamente as migrations oficiais ja versionadas em `supabase/migrations/`;
- validar o estado remoto antes e depois do deploy;
- preparar o bootstrap remoto seguro do primeiro `platform_admin`, se ainda nao existir;
- documentar rollback e checks pos-deploy.

## Fora de escopo
- criar ou editar schema nesta fase;
- abrir frontend;
- commitar `.env`, tokens, `database URL` ou `service_role`;
- executar o deploy remoto sem aprovacao explicita.

## Pré-requisitos

### Repositório e branch
- branch de deploy em estado limpo;
- commits de Fase 2, 2.1 e 2.2 ja integrados;
- nenhuma alteracao local pendente em SQL ou scripts de bootstrap.

### Validacao local obrigatoria
Executar no repositório antes de qualquer deploy remoto:

```powershell
npm ci
npm run contracts:typecheck
npm run supabase:verify
```

Resultado esperado:
- `contracts:typecheck` OK;
- `supabase:verify` OK;
- `Files=6, Tests=93, Result: PASS`;
- `No schema errors found`.

### Ferramentas
- Node.js e npm funcionais;
- Supabase CLI disponivel via `npx supabase`;
- acesso ao projeto remoto do Supabase;
- acesso ao GitHub do repositório para consultar CI e, se necessario futuramente, configurar secrets de automacao.

## Variáveis necessárias

Definir apenas na sessao atual do shell ou em um secret manager. Nao salvar em
arquivo versionado.

```powershell
$env:SUPABASE_ACCESS_TOKEN = '<token-pessoal-supabase>'
$env:SUPABASE_PROJECT_REF = '<project-ref>'
$env:SUPABASE_DB_PASSWORD = '<senha-do-postgres-remoto>'
```

Variaveis opcionais, somente quando realmente necessarias:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres:<senha>@<host>:5432/postgres'
$env:GENIUS_SUPPORT_OS_PLATFORM_ADMIN_USER_ID = '<uuid-do-primeiro-platform-admin>'
```

## Quais credenciais usar

- `SUPABASE_ACCESS_TOKEN`
  - token pessoal do operador com acesso ao projeto no Supabase;
  - usado para autenticar a CLI com `supabase login --token ...`.
- `SUPABASE_PROJECT_REF`
  - identificador do projeto remoto;
  - encontrado no dashboard do Supabase e na URL do projeto.
- `SUPABASE_DB_PASSWORD`
  - senha do Postgres remoto do projeto;
  - usada por `supabase link`, `migration list` e `db push`.
- `SUPABASE_DB_URL`
  - usar apenas quando o fluxo exigir conexao direta de banco, como o bootstrap remoto do primeiro `platform_admin`;
  - nunca persistir em `.env` versionado.
- `service_role`
  - nao faz parte do caminho normal de deploy das migrations;
  - nao usar como atalho para aplicar schema.
- `GENIUS_SUPPORT_OS_PLATFORM_ADMIN_USER_ID`
  - UUID do usuario que ja existe em `auth.users` e `public.profiles`;
  - so usar se o bootstrap remoto realmente fizer parte da janela aprovada.

## Onde configurar secrets

### Local
- shell da sessao atual;
- secret manager corporativo;
- cofre pessoal aprovado, como 1Password ou equivalente.

### GitHub
Se futuramente a equipe automatizar o deploy remoto, configurar os mesmos nomes
em GitHub Actions `Repository secrets` ou `Environment secrets`. Nao alterar a
workflow atual nesta fase.

## Regra explicita de segredo

Nunca commitar:
- `.env`
- `.env.local`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_URL`
- `service_role`
- qualquer token, segredo ou URL real de banco

## Comandos de validação pré-deploy

### 1. Autenticar a CLI
```powershell
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN
```

### 2. Vincular o diretório ao projeto remoto
```powershell
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF --password $env:SUPABASE_DB_PASSWORD
```

### 3. Conferir o histórico remoto/local de migrations
```powershell
npx supabase migration list --linked --password $env:SUPABASE_DB_PASSWORD
```

### 4. Verificar o que seria aplicado sem alterar o remoto
```powershell
npx supabase db push --linked --dry-run --password $env:SUPABASE_DB_PASSWORD
```

### 5. Opcional: smoke check remoto estrutural antes do deploy
```powershell
npx supabase db query --linked "select current_database(), current_user;" -o table
```

## Comandos de deploy

### Deploy das migrations oficiais
```powershell
npx supabase db push --linked --password $env:SUPABASE_DB_PASSWORD
```

Guardrails:
- nao usar `--include-seed`;
- nao usar `config push` nesta fase;
- nao aplicar migrations fora da branch aprovada;
- se houver divergencia inesperada no `migration list`, interromper e revisar antes de seguir.

### Bootstrap remoto do primeiro `platform_admin`
Executar somente se:
- o deploy das migrations ja terminou com sucesso;
- o usuario alvo ja existe em `auth.users` e `public.profiles`;
- ainda nao existe nenhum `platform_admin`;
- a janela aprovada inclui o bootstrap remoto.

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres:<senha>@<host>:5432/postgres'
npm run supabase:bootstrap:first-admin -- --user-id $env:GENIUS_SUPPORT_OS_PLATFORM_ADMIN_USER_ID --reason "remote bootstrap"
```

Validacoes obrigatorias apos o bootstrap:
- existe exatamente 1 `platform_admin`;
- `public.user_global_roles` contem o `user_id` alvo com role `platform_admin`;
- `audit.audit_logs` registra o `insert` correspondente em `public.user_global_roles`;
- segunda tentativa de bootstrap falha explicitamente;
- nenhuma seed e nenhum `service_role` foram usados.

## Plano de rollback

### Regra principal
Preferir rollback por restauracao de backup ou PITR do projeto remoto. Nao fazer
edicao manual ad hoc no schema para "desfazer no braço".

### Antes do deploy
- registrar o resultado de `supabase migration list`;
- registrar o commit que esta sendo aplicado;
- garantir que existe backup remoto utilizavel ou janela de PITR habilitada no projeto.

### Se o deploy falhar no meio
- interromper imediatamente;
- capturar logs da CLI;
- rodar novamente `supabase migration list --linked --password $env:SUPABASE_DB_PASSWORD`;
- decidir entre:
  - restaurar o backup/PITR para voltar ao estado anterior; ou
  - criar migration corretiva de forward-fix, se a janela e o risco permitirem.

### Se o bootstrap do primeiro admin falhar
- nao abrir policy temporaria;
- revisar `SUPABASE_DB_URL`, `user_id`, existencia do `profile` e status de bootstrap;
- repetir apenas depois da causa raiz estar clara.

## Checklist pós-deploy

- `supabase migration list --linked` alinhado com o diretório local.
- Tabelas de ticketing existem no remoto.
- Views `vw_tickets_list`, `vw_ticket_detail` e `vw_ticket_timeline` existem no remoto.
- RPCs de ticketing existem no remoto.
- `authenticated` continua sem `SELECT` direto nas tabelas base de ticketing.
- Se o bootstrap foi aprovado e executado: existe exatamente um `platform_admin`.
- Se o bootstrap foi aprovado e executado: `user_global_roles` e `audit.audit_logs` precisam refletir o bootstrap validado.
- Se o bootstrap foi aprovado e executado: uma segunda tentativa precisa falhar explicitamente.
- Nenhum segredo foi salvo em arquivo do repositório.
- Frontend continua bloqueado ate a proxima aprovacao.

## Comandos de verificação pós-deploy

### Verificar objetos principais
```powershell
npx supabase db query --linked "select to_regclass('public.tickets') as tickets_table, to_regclass('public.vw_tickets_list') as tickets_view;" -o table
```

### Verificar grants das views oficiais
```powershell
npx supabase db query --linked "select table_name, privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name like 'vw_ticket%';" -o table
```

### Verificar ausencia de grant direto nas tabelas base
```powershell
npx supabase db query --linked "select table_name, privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name in ('tickets', 'ticket_messages', 'ticket_events', 'ticket_assignments', 'ticket_attachments');" -o table
```

## Referências operacionais
- `README.md`
- `docs/PROJECT_STATE.md`
- `docs/VIEW_RPC_CONTRACTS.md`
- `docs/SECURITY_RLS_TEST_PLAN.md`
- `supabase/bootstrap/README.md`
