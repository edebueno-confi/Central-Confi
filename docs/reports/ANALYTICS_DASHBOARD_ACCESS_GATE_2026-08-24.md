# ANALYTICS DASHBOARD ACCESS GATE

## Resultado

O diagnóstico local read-only reproduziu uma divergência entre o guard e a
navegação do primeiro release para `dashboard_viewer`. O guard permitia
`/admin/analytics`, mas o menu não exibia a rota quando o papel ainda não tinha
`screen_keys` materializadas. A correção foi limitada à navegação já existente
e não criou capability, contrato, grant ou rota.

## Evidência local

Timestamp da rechecagem: `2026-08-24T19:53:00.0679364-03:00`.

Comando read-only reproduzível:

```text
node --test tests/scripts/auth-resolution-guards-navigation.test.mjs
```

Antes da correção, a composição equivalente retornava:

```json
{"routeAllowed":true,"destinations":["/inicio"]}
```

O resultado comprovava a divergência: acesso por guard, mas ausência do item
de menu. A sessão, o backend e o catálogo de `screen_keys` não foram alterados.

A autenticação browser não foi executada neste lote. Os arquivos locais de
credencial/fixture esperados não estavam disponíveis e o script autenticado
existente executa `create-local-dashboard-viewer-fixture.mjs`, que cria dados e
persiste credenciais. Esse caminho foi deliberadamente não executado. Portanto,
browser autenticado, RPC servido, RLS/cross-tenant e dados reais permanecem
`NÃO COMPROVADOS`.

## Correção

Em `minimal-navigation.ts`, a decisão de publicação do item `analytics` agora
aceita o papel `dashboard_viewer` recebido pelo `AdminConsoleShell`, além de
`platform_admin` e do `screen_key` já existente. O papel continua limitado ao
Dashboard; configurações, conhecimento, acessos e Central de Clientes não são
adicionados por essa regra.

Regressões adicionadas:

- `auth-resolution-guards-navigation.test.mjs`: viewer com zero `screen_keys`
  abre `/admin/analytics` pelo guard e recebe somente `/inicio` e o Dashboard
  no menu;
- `shell-navigation-auth-integration.test.mjs`: composição first-release
  confirma o mesmo conjunto e nega configurações/conhecimento ao viewer;
- administrador continua com a superfície publicada completa no menu e no
  guard.

## Allowlist efetiva

- `apps/web/src/features/navigation/minimal-navigation.ts`;
- `tests/scripts/auth-resolution-guards-navigation.test.mjs`;
- `tests/scripts/shell-navigation-auth-integration.test.mjs`;
- `docs/reports/ANALYTICS_DASHBOARD_ACCESS_GATE_2026-08-24.md`;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`.

Não foram alterados `auth-api.ts`, `auth-context.tsx`, guards, router, release
manifest, backend, banco, migrations, secrets ou integrações. `REVIEW.md` foi
preservado.

## Gates

- testes direcionados: `node --test ...auth-resolution... ...shell...` = 11/11 PASS;
- `npm run test:focused` = 323/323 PASS;
- `npm run web:typecheck` = PASS;
- `npm run web:build` = PASS, 944 módulos transformados;
- `npm run lint` = PASS, 0 erros e 158 warnings preexistentes;
- `npm run docs:validate` = PASS, 0 bloqueios;
- `npm run review:gates` = PASS, 0 regressões bloqueantes, 47 itens do baseline resolvidos;
- `git diff --check` = PASS.

## Limitações e próximo passo

O resultado comprova a coerência estática entre papel recebido pelo shell,
menu e guard. Não comprova uma sessão autenticada servida pelo browser, dados
do Dashboard, RLS/cross-tenant, performance real ou produção. O próximo passo
é revisão independente do Sentinel. Não executar fixture de escrita, migration,
ação remota ou deploy como parte deste lote.
