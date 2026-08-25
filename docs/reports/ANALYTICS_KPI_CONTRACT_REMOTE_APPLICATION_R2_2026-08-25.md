# Aplicação remota R2 do contrato KPI

Estado final: `APPLIED_ONCE_AND_POST_VALIDATED`.

## Escopo

Esta task separa a aplicação remota do contrato KPI do preflight read-only
anterior. O alvo permitido é exclusivamente `ConfiOne /
jzmmvfcmruasqmrdmbup`. A migration candidata é
`20260824210000_analytics_kpi_contract_parity_v1`.

## Migration e contrato

- arquivo: `supabase/migrations/20260824210000_analytics_kpi_contract_parity_v1.sql`;
- SHA-256: `463F2E978D7F62EEF82A18D9F8D071043965BF7D8A7105CF17D9A6BE5ADAEC52`;
- a migration possui envelope explícito `BEGIN`/`COMMIT`; o `NOTIFY` ocorre
  antes do commit e pertence à mesma transação;
- adiciona wrappers filtrados e `by_operation` de seis argumentos para
  Comercial e Suporte;
- preserva as assinaturas legadas de quatro argumentos;
- mantém `SECURITY DEFINER`, `search_path` vazio, ACLs restritas e predicado
  server-side de operação/exclusões.

## Guardrails

Antes da aplicação, a identidade, a ausência da migration e o catálogo dos
helpers devem ser reconfirmados. O mesmo preflight imediato também consulta
`to_regprocedure` para os wrappers legados de quatro argumentos e para os
quatro alvos de seis argumentos. Para cada função existente, coleta assinatura,
owner, `SECURITY DEFINER`, `search_path`, ACL/grants e fingerprint de
`pg_get_functiondef`. Os dois legados devem existir; os quatro alvos devem
estar ausentes. Qualquer divergência bloqueia antes de `CREATE OR REPLACE`.
O valor esperado de `proconfig` é a representação PostgreSQL
`search_path=""`, não `search_path=`. A função avaliadora também rejeita
fingerprint ausente, owner diferente, `SECURITY DEFINER` falso, ACL anônima ou
ausência de `authenticated`/`service_role`, ainda que as contagens estejam
corretas.

O SQL read-only reproduzível está em
`scripts/local-qa/analytics-kpi-contract-remote-application-preflight.mjs`.
A escrita, se aprovada pelo Sentinel, será uma
única chamada de `mcp__codex_apps__supabase_apply_migration`. Não haverá SQL
manual, retry ou segunda tentativa em resposta ambígua, timeout, falha ou
parcialidade. Nesses casos o estado será `OWNER_DECISION_REQUIRED`.

Após sucesso inequívoco, somente leituras de histórico, catálogo, ACL/RLS,
predicados e probes são permitidas. Smoke autenticado, equivalência numérica
servida, RLS/cross-tenant e performance real serão marcados como
`NÃO COMPROVADOS` se não houver evidência válida.

## Estado observado antes da task

O preflight remoto anterior foi aprovado em modo read-only: helpers presentes,
contrato ausente, wrappers ausentes e `REMOTE_PREFLIGHT_NO_GO` com
`failClosed=true`. Nenhuma escrita é presumida por documentação; a pós-leitura
deverá confirmar o resultado real.

## Resultado da aplicação

- Identidade reconfirmada: `ConfiOne / jzmmvfcmruasqmrdmbup`,
  `ACTIVE_HEALTHY`.
- Preflight imediato read-only: `GO`, dois legados presentes, quatro alvos
  ausentes e segurança/ACL dos legados válidas.
- Migration aplicada uma única vez pela ferramenta versionada aprovada.
- Histórico remoto registrou `20260824210000_analytics_kpi_contract_parity_v1`
  sob a versão `20260825144746`.
- Pós-validação read-only: quatro wrappers presentes, owner `postgres`,
  `SECURITY DEFINER`, `search_path=""`, EXECUTE ausente para `anon` e
  presente para `authenticated`/`service_role`; predicados de operação
  confirmados.
- Uma consulta read-only inicial falhou por alias SQL fora de escopo e foi
  corrigida sem qualquer retry de migration ou escrita adicional.
- Smoke autenticado, equivalência numérica servida, RLS/cross-tenant e
  performance real não foram comprovados.

## Resposta aos findings F-R2-REMOTE-001/002

- `F-R2-REMOTE-001`: respondido com `BEGIN`/`COMMIT` explícitos na migration;
  timeout, falha, resposta ambígua ou parcialidade da ferramenta continuam sem
  retry e exigem `OWNER_DECISION_REQUIRED`.
- `F-R2-REMOTE-002`: respondido com preflight imediato executável que exige os
  legados presentes, os alvos ausentes e valida segurança/ACL/fingerprint antes
  da aplicação. A decisão não depende mais apenas de contagem.
- `F-R2-REMOTE-003`: corrigido usando a representação `search_path=""` de
  PostgreSQL no SQL e no avaliador.
- `F-R2-REMOTE-004`: corrigido; a função avaliadora agora inspeciona cada linha
  de catálogo e rejeita fingerprint ou grant divergente.
