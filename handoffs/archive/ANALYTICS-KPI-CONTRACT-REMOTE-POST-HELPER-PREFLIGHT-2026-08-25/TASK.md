# TASK

Task: `ANALYTICS-KPI-CONTRACT-REMOTE-POST-HELPER-PREFLIGHT-2026-08-25`

State: READY_FOR_REVIEW
Owner: Sentinel
Role: REVIEWER
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: REVIEW_ACTIVE
Base SHA: 4e63c069

## Objetivo

Revalidar, somente por leitura, o projeto Supabase `ConfiOne /
jzmmvfcmruasqmrdmbup` depois da aplicação dos quatro helpers KPI e antes de
qualquer aplicação da migration de contrato
`20260824210000_analytics_kpi_contract_parity_v1.sql`.

## Allowlist

- `docs/reports/ANALYTICS_KPI_CONTRACT_REMOTE_POST_HELPER_PREFLIGHT_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`
- `handoffs/README.md` somente a linha 97 da fila

## Fora de escopo

- aplicação da migration de contrato KPI;
- SQL de escrita, DDL/DML manual, ACL, reset, repair ou retry;
- smoke autenticado sem sessão válida;
- push, merge, deploy, secrets ou produção.

## Critérios de aceite

1. Identidade e saúde do projeto são confirmadas.
2. O histórico contém a migration dos helpers uma única vez e não contém o
   contrato KPI.
3. Os quatro helpers existem com assinaturas, owner, `SECURITY DEFINER`,
   `search_path`, fingerprints e ACLs compatíveis.
4. Probes read-only confirmam ratio válido, entradas inválidas e
   indisponibilidade honesta.
5. Os wrappers de seis argumentos são inventariados explicitamente; se
   ausentes, o resultado é `REMOTE_PREFLIGHT_NO_GO` e a aplicação não roda.
6. O relatório separa dependências resolvidas de contrato ainda ausente.
