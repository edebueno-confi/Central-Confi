# Preflight remoto dos pré-requisitos KPI

Estado: `READY_FOR_REVIEW`.

Janela UTC da auditoria: `2026-08-25T12:22:00Z` a
`2026-08-25T12:25:00Z` (aproximada pelo ciclo de ferramentas).

Projeto alvo explicitamente confirmado: `jzmmvfcmruasqmrdmbup`. Este lote é
somente leitura e precede qualquer aplicação das migrations versionadas
`20260825123000_analytics_kpi_remote_prerequisites_v1.sql` e
`20260824210000_analytics_kpi_contract_parity_v1.sql`.

## Resultado read-only

- Identidade: ConfiOne, `jzmmvfcmruasqmrdmbup`, `ACTIVE_HEALTHY`, PostgreSQL
  17.6.1.111, us-east-1.
- Histórico: 299 migrations; 20260825123000 e 20260824210000 ausentes.
- `analytics_source_config` tem as sete colunas necessárias, 38 linhas, 30
  classificadas/confirmadas e 3 chaves ativas ambíguas.
- `can_read_analytics()` compatível: owner postgres, SECURITY DEFINER,
  search_path vazio, EXECUTE para authenticated/service_role e não para anon.
- Os quatro helpers já existem e suas definições/ACLs são compatíveis com o
  candidato; não há EXECUTE para anon, authenticated ou service_role nos
  helpers de aplicação.
- Semântica observada: `kpi_ratio(1,4)=25`, casos inválidos NULL e
  `kpi_entry(NULL,'test')` indisponível.
- Wrappers novos de Comercial/Suporte e filtered auditados ausentes; wrappers
  antigos de operação de quatro argumentos presentes.
- Smoke HTTP autenticado: `NOT_PROVEN`, sem sessão válida disponível.

Veredito técnico: `REMOTE_PREFLIGHT_NO_GO`, `failClosed=true`, application
`NOT_RUN`. O remoto está parcialmente preparado, mas o contrato KPI versionado
ainda não está aplicado. Nenhuma migration ou SQL de escrita pertenceu a este
lote.

## Método reprodutível

- `supabase_get_project({id})`: identidade, status, região e versão do PostgreSQL.
- `supabase_list_migrations({project_id})`: histórico e presença das versões
  candidatas.
- `supabase_execute_sql({project_id, query})`, somente `SELECT`: existência e
  colunas de `analytics_source_config`; catálogos `pg_proc`, owners,
  `prosecdef`, `proconfig`, ACL e `has_function_privilege`; definições
  sanitizadas dos quatro helpers; semântica read-only de `kpi_ratio`,
  `kpi_entry` e elegibilidade.
- `supabase_get_advisors({project_id, type:'performance'})`: leitura de
  avisos existentes; não foram aplicadas remediações. Os avisos gerais não
  foram promovidos a finding deste lote por estarem fora do escopo KPI.

Nenhuma chamada de aplicação de migration, SQL DDL/DML, alteração de ACL,
reset, repair, secret, push, merge ou deploy foi executada.
