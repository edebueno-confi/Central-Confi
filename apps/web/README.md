# apps/web

Aplicação Vite + React do Genius Support OS.

## Execução local

O frontend local lê variáveis públicas do Vite a partir de `apps/web/.env.local`.
O arquivo não deve ser commitado.

Template mínimo:

```env
VITE_APP_ENV=local
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=<anon-key-local-ou-do-ambiente>
APP_BASE_URL=http://127.0.0.1:4173
```

Comando oficial a partir da raiz do repositório:

```bash
npm run web:dev
```

O wrapper da raiz valida a presença de `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` antes de subir o Vite. Se o arquivo não existir em
`apps/web/.env.local` nem as variáveis estiverem exportadas no shell atual, o
comando falha cedo com instrução objetiva.
