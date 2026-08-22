# Reconciliação de migrations de produção do ConfiOne

## Resultado

O projeto Supabase `jzmmvfcmruasqmrdmbup` estava no checkpoint
`20260813160823`, enquanto o código local possuía 25 migrations posteriores.
Isso explicava os erros observados no navegador: a view
`vw_admin_tenant_group_context` e o RPC
`rpc_analytics_customer_success_kpis_by_operation(text)` não existiam no
ambiente remoto.

As 25 migrations pendentes foram aplicadas em ordem no projeto correto. A
aplicação parou uma vez em um guard excessivamente literal da migration de
séries temporais. O guard foi corrigido para comparar whitespace equivalente,
e a migration temporal foi ajustada para reconhecer a implementação remota
que já continha o escopo operacional. A sequência foi então concluída.

## Verificação pós-aplicação

- Histórico remoto: 307 migrations aplicadas.
- View `vw_admin_tenant_group_context`: presente; `authenticated` possui
  `SELECT`.
- RPC `rpc_analytics_customer_success_kpis_by_operation(text)`: presente;
  `authenticated` possui `EXECUTE`.
- RPC `rpc_analytics_ceo_snapshot(date,date)`: payload com Comercial, Suporte e
  Financeiro.
- RPC `rpc_analytics_ceo_history(date,date)`: payload com `current` e
  `previous`.
- RPC `rpc_analytics_executive_kpis_v2(date,date)`: 16 KPIs retornados.
- RPC `rpc_analytics_timeseries_by_operation(...)`: série válida retornada.
- Índices executivos e financeiros: quatro índices presentes.
- Tempo observado no smoke autenticado: snapshot 1,085 s; KPIs executivos
  2,754 s.

## Limitações

O smoke remoto foi feito por SQL autenticado com uma identidade
`platform_admin`, sem expor o identificador na aplicação. Também foi executado
QA browser autenticado somente no ambiente local, na rota
`/admin/analytics?tab=support`, cobrindo renderização, console, page errors,
rede e colisões de chave React. Isso não comprova QA browser autenticado na
produção nem performance sob carga real. Não foi feita sincronização
HubSpot/OMIE, alteração de dados de negócio ou alteração de secrets.

O frontend já integrado no commit `1adb1f7` reduz chamadas duplicadas do painel:
com operação selecionada, não chama o resumo executivo global; o histórico
complementar só é consultado após sucesso da leitura principal.
