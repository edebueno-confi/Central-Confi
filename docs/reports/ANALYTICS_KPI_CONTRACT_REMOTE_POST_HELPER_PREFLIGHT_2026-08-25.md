# Preflight remoto pós-helper do contrato KPI

Estado: `REMOTE_PREFLIGHT_NO_GO`, `failClosed=true`, `application=NOT_RUN`.

## Alvo e método

Projeto explicitamente confirmado: `ConfiOne /
jzmmvfcmruasqmrdmbup`, `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.111`, região
`us-east-1`.

Foram usadas apenas leituras por `supabase_get_project`,
`supabase_list_migrations`, `supabase_execute_sql` com `SELECT` e
`supabase_get_advisors` de performance. Não foram lidos secrets nem executada
qualquer escrita remota.

## Resultado

- A migration dos helpers aparece uma única vez no histórico, na versão
  gerada pela ferramenta `20260825125051`, com o nome
  `20260825123000_analytics_kpi_remote_prerequisites_v1`.
- A migration de contrato `20260824210000_analytics_kpi_contract_parity_v1`
  não aparece no histórico.
- Os quatro helpers existem: `kpi_entry`, `kpi_ratio`,
  `set_analytics_operation_scope` e
  `analytics_pipeline_operation_eligible`.
- Os helpers têm owner `postgres`, `search_path` vazio, fingerprints esperados
  e nenhum `EXECUTE` para `anon`, `authenticated` ou `service_role`.
- `can_read_analytics()` continua com owner e segurança esperados e execução
  apenas para os perfis autorizados.
- Probes: `kpi_ratio(1,4)=25`; numerador negativo ou maior que o denominador
  retorna `NULL`; `kpi_entry(NULL,...)` retorna `unavailable` e valor `NULL`.
- Os wrappers de seis argumentos de Comercial e Suporte continuam ausentes:
  `rpc_analytics_commercial_kpis_v2_filtered`,
  `rpc_analytics_support_kpis_v2_filtered`,
  `rpc_analytics_commercial_kpis_by_operation` e
  `rpc_analytics_support_kpis_by_operation`.
- Smoke HTTP autenticado permanece `NOT_PROVEN` por ausência de sessão válida.

## Veredito operacional

Os helpers não são mais o bloqueio. O contrato KPI ainda não pode ser aplicado
porque os wrappers que o frontend exige não existem no remoto. O preflight
permanece fail-closed para evitar um rollout que deixaria Comercial e Suporte
em estados inconsistentes.

Próximo passo: revisão independente; depois, se aprovado, preparar a aplicação
única e versionada da migration de contrato, com nova reconfirmação do alvo,
pré-leitura de catálogo, pós-leitura e smoke autenticado quando possível.
