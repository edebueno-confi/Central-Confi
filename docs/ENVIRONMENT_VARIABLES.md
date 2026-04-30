# ENVIRONMENT_VARIABLES.md

## Objetivo

Definir a governança de variáveis de ambiente do Genius Support OS sem vazar
segredos, sem versionar `.env` real e sem misturar variáveis públicas com
credenciais operacionais.

## Modelo operacional

- Codex opera tecnicamente GitHub, Vercel e Supabase.
- O usuário aprova mudanças de risco, deploys em produção e uso de segredos.
- Nenhuma credencial real entra no repositório.
- O único arquivo versionável de ambiente é `.env.example`.
- Qualquer valor com prefixo `NEXT_PUBLIC_` é tratado como público por desenho.

## Regras obrigatórias

- Nunca commitar `.env`, `.env.local`, `.env.production` ou equivalentes.
- Nunca colocar segredo em variável `NEXT_PUBLIC_*`.
- Nunca expor `service_role` em browser, logs, preview público ou PR.
- Secrets de automação ficam em GitHub Secrets.
- Secrets de runtime do app ficam no Vercel por ambiente.
- Secrets internos do Supabase ficam em Supabase Secrets apenas quando houver
  função/serviço dentro do Supabase que realmente precise deles.

## Ambientes

- `Local`: shell não versionado do operador técnico.
- `Development`: runtime local e, no futuro, ambiente Development do Vercel.
- `Preview`: deploy efêmero por branch/PR no Vercel.
- `Production`: ambiente oficial do produto no Vercel.
- `GitHub Actions`: automação de CI/CD com GitHub Secrets.
- `Supabase Secrets`: secret store do Supabase para funções internas, se
  aprovadas no futuro.

## Matriz de variáveis

| Nome | Finalidade | Classe | Ambientes | Destino | `NEXT_PUBLIC` | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Autenticar CLI do Supabase para operações controladas de deploy | Sensível | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Atual |
| `SUPABASE_PROJECT_REF` | Identificar o projeto remoto do Supabase | Interna | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Atual |
| `SUPABASE_DB_PASSWORD` | Autenticar operações remotas de banco via CLI | Sensível | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Atual |
| `SUPABASE_DB_URL` | Conexão direta para bootstrap controlado e operações pontuais aprovadas | Sensível | Local, GitHub Actions excepcional | Local não versionado, GitHub Secrets apenas se automação aprovada | Não | Atual, uso restrito |
| `GENIUS_SUPPORT_OS_PLATFORM_ADMIN_USER_ID` | Identificar o usuário alvo do bootstrap do primeiro admin global | Interna | Local, GitHub Actions excepcional | Local não versionado, GitHub Secrets apenas se automação aprovada | Não | Atual, uso pontual |
| `VERCEL_TOKEN` | Permitir ao Codex operar deploys e projetos no Vercel via CLI/API | Sensível | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Reservada |
| `VERCEL_ORG_ID` | Identificar a organização do Vercel nas automações | Interna | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Reservada |
| `VERCEL_PROJECT_ID` | Identificar o projeto do Genius Support OS no Vercel | Interna | Local, GitHub Actions | Local não versionado, GitHub Secrets | Não | Reservada |
| `NEXT_PUBLIC_APP_ENV` | Informar ao app se está em Development, Preview ou Production | Pública | Development, Preview, Production | Vercel por ambiente | Sim | Reservada |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase consumida pelo app | Pública | Development, Preview, Production | Vercel por ambiente, `.env.example` | Sim | Reservada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do Supabase para autenticação client-side | Pública | Development, Preview, Production | Vercel por ambiente, `.env.example` | Sim | Reservada |
| `APP_BASE_URL` | URL base canônica do app para redirects, callbacks e links absolutos | Interna | Development, Preview, Production | Vercel por ambiente, `.env.example` | Não | Reservada |
| `SUPABASE_SERVICE_ROLE_KEY` | Credencial privilegiada para automações server-side excepcionais | Sensível | Somente fluxo explicitamente aprovado | GitHub Secrets ou Supabase Secrets; nunca browser | Não | Proibida por padrão |

## Política por destino

### Local

- Usar apenas shell atual, secret manager ou cofre aprovado.
- Não salvar segredos em arquivos dentro do repositório.
- Limpar variáveis sensíveis ao fim de operações críticas quando aplicável.

### Vercel

- Configurar variáveis separadamente para `Development`, `Preview` e
  `Production`.
- `Preview` não deve herdar segredo de produção sem aprovação explícita.
- Valores públicos podem existir no Vercel, mas continuam proibidos no Git.

### GitHub Secrets

- Usar `Repository secrets` ou `Environment secrets`.
- Secrets de produção devem preferir `Environment secrets` com proteção de
  aprovação.
- Nunca ecoar valores em workflows; usar mascaramento de output.

### Supabase Secrets

- Reservado para Edge Functions ou serviços internos aprovados.
- Não usar como substituto informal de Vercel ou GitHub Secrets.
- Não criar secret novo sem justificar o caso de uso no repositório.

## Convenções de nomenclatura

- Variáveis públicas do app usam `NEXT_PUBLIC_*`.
- Variáveis operacionais usam nome explícito do provedor: `SUPABASE_*`,
  `VERCEL_*`, `GITHUB_*`.
- Evitar nomes genéricos como `TOKEN`, `SECRET` ou `URL`.

## Variáveis proibidas no browser

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`

## Processo de mudança

1. Definir a necessidade da variável e o destino correto.
2. Registrar a variável neste documento.
3. Atualizar `.env.example` apenas com placeholder vazio.
4. Configurar o valor real fora do repositório.
5. Validar que nenhum log, PR ou workflow imprimiu o valor.

## Estado atual

- O Supabase remoto já recebeu as migrations oficiais e o primeiro
  `platform_admin`.
- O frontend continua bloqueado nesta fase.
- As variáveis reservadas para Vercel existem apenas como governança; ainda não
  devem ser consumidas por código de UI.
