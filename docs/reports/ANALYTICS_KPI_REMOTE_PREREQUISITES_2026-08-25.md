# Pré-requisitos remotos do contrato KPI

Estado: `READY_FOR_REVIEW` | candidato local, remoto intocado

## Motivo

O preflight remoto da task
`ANALYTICS-KPI-CONTRACT-REMOTE-APPLICATION-2026-08-25` encontrou quatro
helpers ausentes no projeto `jzmmvfcmruasqmrdmbup`:

- `app_private.analytics_pipeline_operation_eligible(text,text,text,text)`;
- `app_private.kpi_entry(numeric,text,text,text)`;
- `app_private.kpi_ratio(numeric,numeric)`;
- `app_private.set_analytics_operation_scope(text)`.

Sem esses objetos, a migration de overloads KPI não pode ser aplicada com
segurança. Esta task cria somente uma migration candidata versionada e seus
testes estáticos. Não aplica migration no remoto.

## Candidato

`supabase/migrations/20260825123000_analytics_kpi_remote_prerequisites_v1.sql`

O candidato:

- verifica previamente a existência e as colunas de
  `public.analytics_source_config` e de `app_private.can_read_analytics()`;
- cria somente os quatro helpers necessários;
- usa `SECURITY DEFINER` e `search_path = ''` nos helpers que acessam contexto
  ou dados protegidos;
- revoga `EXECUTE` de `public`, `anon` e `authenticated`, sem abrir grants
  diretos a usuários;
- mantém a elegibilidade de pipeline server-side, inclusive operação
  confirmada, área classificada e exclusão de variantes ambíguas;
- não contém DML, `DROP`, `TRUNCATE`, `NOTIFY` ou alteração de tabelas.

Após a primeira revisão, o candidato foi corrigido para:

- preservar a semântica vigente de `kpi_ratio`, retornando `NULL` para
  numerador ausente/negativo, numerador maior que o denominador e denominador
  nulo/não positivo;
- exigir por catálogo que `can_read_analytics()` seja owned por `postgres`,
  `SECURITY DEFINER`, tenha `search_path=""`, execute para
  `authenticated`/`service_role` e não execute para `anon`.

## Critério de promoção

Após testes locais e revisão independente, o candidato poderá ser validado em
shadow descartável. Só depois de shadow, preflight remoto e smoke autenticado
aprovados poderá existir task separada para aplicação remota. O remoto permanece
intocado nesta entrega.

## Limitações

Ainda não há prova de equivalência numérica, RLS/cross-tenant servido,
performance real ou smoke autenticado remoto. Nenhum segredo foi lido ou
registrado.

## Gates após a correção

Rechecagem local em `2026-08-25T09:06:24.2960883-03:00`:

- `node --test tests/scripts/analytics-kpi-remote-prerequisites.test.mjs`:
  `5/5 PASS`;
- `npm run docs:validate`: `PASS`, 0 bloqueios;
- `npm run review:gates`: `PASS`, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: `PASS`.

O candidato permanece não aplicado. A revisão independente seguinte deve
confirmar os contratos no alvo remoto antes de qualquer shadow ou aplicação.
