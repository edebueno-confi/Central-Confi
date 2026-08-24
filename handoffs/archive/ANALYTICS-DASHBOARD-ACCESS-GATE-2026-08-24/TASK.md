# TASK

- Task: ANALYTICS-DASHBOARD-ACCESS-GATE-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Agent coordination: REVIEW_ACTIVE
- Base SHA: 50d4040b

## Entrega deste lote

- Allowlist efetiva: `apps/web/src/features/navigation/minimal-navigation.ts`,
  `tests/scripts/auth-resolution-guards-navigation.test.mjs`,
  `tests/scripts/shell-navigation-auth-integration.test.mjs`,
  `docs/reports/ANALYTICS_DASHBOARD_ACCESS_GATE_2026-08-24.md` e os três
  handoffs correntes desta task.
- Fora do lote: `REVIEW.md`, auth-api, auth-context, router, release manifest,
  backend, banco, migrations, secrets e integrações.
- Resultado: divergência reproduzida e corrigida; revisão independente pendente.

## Hold

- Hold owner: Forge
- Motivo: diagnóstico local read-only da coerência sessão/backend/menu/guard.
- Escopo: somente auth/navigation, testes diretamente relacionados e relatório da task.
- Condição de retomada: após a reprodução, os gates e a entrega READY_FOR_REVIEW ao Sentinel.

## Objetivo

Garantir que o Dashboard Gerencial seja acessível por usuários autorizados e
negado por usuários sem autorização, sem criar um segundo motor de permissões.
O lote deve auditar e, se necessário, corrigir a coerência entre sessão,
`vw_admin_auth_context`, manifest de release, menu, guard de rota, `dashboard_viewer`
e `platform_admin`, preservando o backend como fonte da verdade.

## Critérios de aceitação

- `platform_admin` abre `/admin/analytics` mesmo sem grant de tela materializado.
- `dashboard_viewer` abre somente `/admin/analytics` e as abas publicadas do Dashboard.
- Usuário autenticado sem papel/workspace não abre o Dashboard e não perde a sessão.
- Menu, redirect, guard de rota e página usam a mesma decisão efetiva, sem inferência por e-mail, texto ou localStorage.
- Sessão expirada, contexto indisponível e acesso revogado não entram em loop nem exibem dados antigos.
- A validação local autenticada registra status, rota, console, rede e limitações sem expor credenciais.

## Fora de escopo

- alteração remota, migration, SQL de escrita, grant, policy, reset, rebuild, secrets, push, merge, deploy ou release;
- mudança do modelo de autorização ou criação de nova capability;
- correções de KPIs, filtros reativos ou botão Aplicar, que serão lote posterior.

## Allowlist esperada

- `apps/web/src/features/auth/**` somente se a falha for reproduzida;
- `apps/web/src/features/navigation/**` somente se houver divergência comprovada;
- testes de acesso autenticado e relatório da task;
- `handoffs/current/TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`.

## Dependências

- auditoria remota read-only finalizada em `50d4040b`;
- fixtures locais existentes, sem criar ou persistir credenciais novas;
- revisão independente obrigatória do Sentinel antes de qualquer finalização local.
