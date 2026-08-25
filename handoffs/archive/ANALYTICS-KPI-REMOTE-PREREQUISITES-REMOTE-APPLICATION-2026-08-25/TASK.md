# TASK

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-REMOTE-APPLICATION-2026-08-25`

State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: 48f8f5bb

Finalization: APPROVED pelo Sentinel e concluída localmente em lote seletivo;
application=REPAIRED_AND_VALIDATED. Não iniciar nova execução neste handoff.

## Objetivo

Aplicar uma única vez, no projeto Supabase explicitamente reconfirmado
`jzmmvfcmruasqmrdmbup`, somente a migration versionada dos helpers KPI:
`20260825123000_analytics_kpi_remote_prerequisites_v1.sql`.

## Escopo allowlisted

- `supabase/migrations/20260825123000_analytics_kpi_remote_prerequisites_v1.sql`
- `scripts/local-qa/analytics-kpi-remote-prerequisites-shadow-preflight.mjs`
- `tests/scripts/analytics-kpi-remote-prerequisites-shadow-preflight.test.mjs`
- `docs/reports/ANALYTICS_KPI_REMOTE_PREREQUISITES_REMOTE_APPLICATION_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`
- `handoffs/README.md` somente a linha 96 da fila canônica

## Fora de escopo

- migration `20260824210000_analytics_kpi_contract_parity_v1.sql`;
- SQL manual, DDL/DML fora da ferramenta versionada ou alteração de ACL fora
  da própria migration;
- reset, rebuild, secrets, push, merge, deploy ou retry após falha;
- aplicação se a identidade, versão, atomicidade ou estado pós-aplicação divergir;
- smoke autenticado sem sessão válida disponível, sem ler credenciais.

## Critérios de aceite

1. Identidade `ConfiOne / jzmmvfcmruasqmrdmbup` e estado saudável são
   reconfirmados imediatamente antes da escrita.
2. A versão `20260825123000` está ausente antes da chamada.
3. A única ferramenta de aplicação é
   `mcp__codex_apps__supabase_apply_migration`, com `project_id`, `name` e
   `query` explícitos. A migration contém envelope PostgreSQL `BEGIN`/`COMMIT`.
4. O repair oficial foi executado uma única vez sobre a duplicata
   `20260825125305`, preservando `20260825125051`; a pós-leitura confirma
   exatamente uma entrada, sem retry, segunda chamada ou SQL manual.
5. Após sucesso inequívoco, leituras read-only confirmam histórico, funções,
   owners, `SECURITY DEFINER`, `search_path`, grants e semântica dos helpers.
6. O relatório separa aplicação realizada de smoke autenticado não comprovado.

## Preflight imediatamente anterior

Na mesma janela da escrita, repetir no projeto alvo: `to_regprocedure`,
`pg_proc`, assinatura, retorno, owner, `prosecdef`, `proconfig`, ACLs,
privilégios para `anon`/`authenticated`/`service_role`, fingerprint de
`pg_get_functiondef` e probes read-only de `kpi_ratio`, `kpi_entry` e
`analytics_pipeline_operation_eligible`. Exatamente quatro helpers compatíveis
devem ser encontrados; qualquer divergência aborta antes de
`CREATE OR REPLACE`/`REVOKE`.

## Estado inicial conhecido

O preflight 95 foi aprovado como `REMOTE_PREFLIGHT_NO_GO`: os quatro helpers
já existem no remoto e são compatíveis, mas a versão não está no histórico;
os wrappers KPI novos continuam ausentes; existem três configurações de
operação ambíguas; smoke HTTP autenticado permanece `NOT_PROVEN`.

## Resposta aos findings

- F-REMOTE-PREREQ-APP-001: atomicidade de transporte não será presumida. A
  segurança vem do envelope transacional da migration e do fail-closed para
  qualquer incerteza da chamada; sucesso só é aceito com pós-leitura coerente.
- F-REMOTE-PREREQ-APP-002: preflight catalogal e semântico será repetido
  imediatamente antes da aplicação.
- F-REMOTE-PREREQ-APP-003: TASK, IMPLEMENTATION e relatório usam
  exclusivamente `mcp__codex_apps__supabase_apply_migration`; não há CLI
  alternativo, workdir secundário ou ferramenta concorrente neste lote.
