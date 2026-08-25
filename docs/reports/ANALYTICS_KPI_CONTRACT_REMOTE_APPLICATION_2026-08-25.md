# Aplicação remota do contrato de KPI do Dashboard

Estado: `READY_FOR_REVIEW` | `NO_GO` remoto

## Diagnóstico remoto

Projeto: `jzmmvfcmruasqmrdmbup` (`ConfiOne`), `ACTIVE_HEALTHY`, PostgreSQL
`17.6.1.111`. A migration local aprovada
`20260824210000_analytics_kpi_contract_parity_v1` ainda não consta no histórico
remoto.

O catálogo remoto atual serve:

- Comercial: `date, date, text, text`;
- Suporte: `date, date, text, text`.

O frontend local já usa filtros avançados que exigem os overloads de seis
argumentos. A migration candidata cria esses overloads, preserva os legados e
restringe execução a `authenticated` e `service_role`.

## Preflight remoto fail-closed

Em 25/08/2026, foi executado somente um `SELECT` de catálogo no projeto
`jzmmvfcmruasqmrdmbup`. A consulta inventariou presença, assinatura,
`SECURITY DEFINER`, `search_path`, owner e grants das dependências, além das
relações e colunas referenciadas pela migration.

Resultado reproduzível:

- `app_private.can_read_analytics()` existe, é `SECURITY DEFINER`, tem
  `search_path=""` e grants de execução para `authenticated` e `service_role`;
- `app_private.analytics_pipeline_operation_eligible(text,text,text,text)` não
  existe;
- `app_private.kpi_entry(numeric,text,text,text)` não existe;
- `app_private.kpi_ratio(numeric,numeric)` não existe;
- `app_private.set_analytics_operation_scope(text)` não existe;
- as sete relações públicas referenciadas existem e todas as colunas exigidas
  foram encontradas;
- como quatro helpers obrigatórios estão ausentes, a migration candidata não
  pode ser aplicada com segurança e o smoke autenticado dos overloads não foi
  executado. O estado é `NO_GO` e `failClosed=true`.

Esse resultado responde ao finding F-KPI-REMOTE-001: a ausência das dependências
seria detectada antes da escrita, em vez de deixar funções parcialmente
catalogadas ou quebradas em runtime. A validação autenticada permanece
`NOT_PROVEN` até que o remoto tenha esses helpers por migrations versionadas e
seja disponibilizada uma sessão autenticada autorizada para o smoke.

## Plano de aplicação

Depois de APPROVED pelo Sentinel, reconfirmar o projeto, a ausência da versão e
as dependências. Aplicar uma única vez somente se o preflight e o smoke
autenticado passarem. A aplicação deverá ocorrer pela ferramenta versionada,
única porta autorizada para DDL, em uma unidade transacional: qualquer erro,
timeout, divergência de histórico ou estado parcial encerra o fluxo sem retry e
registra `OWNER_DECISION_REQUIRED`. Depois, executar somente SELECTs para
validar funções, grants e preservação das assinaturas legadas.

Nesta execução o preflight falhou antes da escrita; portanto, não houve tentativa
de aplicação e não há estado parcial a reconciliar.

## Limitações

Este lote ainda não prova paridade numérica servida, RLS/cross-tenant,
performance real, browser autenticado ou produção. Financeiro permanece fora
do contrato operacional. Qualquer divergência exige abortar sem retry e
`OWNER_DECISION_REQUIRED`. O próximo lote deve versionar primeiro os helpers
ausentes ou fornecer uma migration remota já aplicada que os crie, sempre com
revisão independente. Não se deve copiar helpers manualmente para o remoto nem
criar uma migration KPI que mascare a ausência de dependências.
