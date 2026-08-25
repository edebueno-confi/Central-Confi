# Preflight em shadow dos helpers e contrato KPI

Estado: `READY_FOR_REVIEW`.

Este lote valida duas migrations candidatas em um PostgreSQL descartável e
namespaced:

1. `20260825123000_analytics_kpi_remote_prerequisites_v1.sql`;
2. `20260824210000_analytics_kpi_contract_parity_v1.sql`.

O shadow não copia dados do banco canônico. O bootstrap usa apenas fixtures
determinísticas e o container é removido ao final. O container canônico
`supabase_db_genius-support-os` e o projeto remoto `jzmmvfcmruasqmrdmbup` estão
fora do escopo.

O preflight deve permanecer `NO_GO` e `failClosed=true` quando o Docker, a
identidade do alvo, as migrations, os helpers, os wrappers, os filtros de
operação ou os probes read-only falharem. O shadow não provisiona PostgREST,
portanto a equivalência servida, RLS/cross-tenant real, smoke autenticado,
performance real e produção continuam `NÃO COMPROVADOS` mesmo com
`SHADOW_REPLAY_GO`.

## Evidência

Execução de 2026-08-25T12:15:02Z:

- container: `confione_shadow_kpi_prerequisites_20260825_29224`;
- imagem: `public.ecr.aws/supabase/postgres:17.6.1.158`;
- resultado: `SHADOW_REPLAY_GO`, `failClosed=true`;
- migrations aplicadas somente no shadow, em ordem helper → contrato;
- quatro helpers e wrappers Comercial/Suporte presentes;
- grants `anon` para helpers e wrappers ausentes;
- `kpi_ratio(1,4)=25`, casos inválidos retornam `NULL`;
- smoke sob role `authenticated`: Comercial 2/1/2 e Suporte 2/1/3
  para selecionado/excluído/Todas;
- container removido ao final; canônico e remoto não acessados.

O teste determinístico foi `4/4 PASS`, `node --check` e `git diff --check`
passaram. PostgREST servido, smoke autenticado via HTTP, equivalência remota,
RLS/cross-tenant servido, performance real e produção permanecem
`NÃO COMPROVADOS`. A aplicação remota exige revisão independente posterior e
não é autorizada por este relatório.
