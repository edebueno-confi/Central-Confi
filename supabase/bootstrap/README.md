# Bootstrap do primeiro `platform_admin`

## Objetivo
Promover com segurança o primeiro administrador global sem usar seed demo, sem deixar segredo no repositório e sem criar bypass permanente para usuários autenticados.

## Princípios
- O bootstrap acontece uma única vez.
- O alvo precisa existir previamente em `auth.users` e `public.profiles`.
- O fluxo usa conexão de banco privilegiada, nunca policy aberta para `authenticated`.
- O segredo da conexão remota fica fora do repositório, via variável de ambiente.
- Depois que existir 1 `platform_admin`, o bootstrap volta a falhar por desenho.

## Pré-requisitos
- O usuário alvo já foi criado no Supabase Auth.
- Você possui o `user_id` UUID desse usuário.
- Para remoto, defina `SUPABASE_DB_URL` no ambiente atual.

## Fluxo local
```powershell
npm run supabase:bootstrap:first-admin -- --local --user-id 00000000-0000-0000-0000-000000000000
```

## Fluxo remoto
```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres:<senha>@<host>:5432/postgres'
npm run supabase:bootstrap:first-admin -- --user-id 00000000-0000-0000-0000-000000000000
```

## Observações operacionais
- O script usa `app_private.platform_admin_bootstrap_status()` para validar se o bootstrap já foi concluído.
- A promoção real ocorre na função privada `app_private.bootstrap_first_platform_admin(...)`.
- A função não é concedida para `anon`, `authenticated` ou `service_role`.
- Se o bootstrap já tiver sido executado, o processo falha explicitamente.
- O log de auditoria é gerado pelo trigger normal de `user_global_roles`.

## Limitações atuais
- O fluxo depende de conexão direta de banco (`--local` ou `SUPABASE_DB_URL`).
- O script exige `user_id` UUID; ele não resolve usuário por email para evitar ambiguidade operacional nesta fase.
