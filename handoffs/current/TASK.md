# TASK

Task: `ANALYTICS-KPI-REMOTE-PREREQUISITES-REMOTE-PREFLIGHT-2026-08-25`

State: IDLE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: eea38cc8

## Objetivo

Pacote finalizado e arquivado após aprovação independente. O próximo passo
deve ser uma task versionada separada para aplicação remota dos helpers.

Executar auditoria remota read-only no projeto Supabase explicitamente
reconfirmado `jzmmvfcmruasqmrdmbup`, verificando os quatro helpers e as
dependências do contrato KPI antes de qualquer aplicação versionada.

## Escopo allowlisted

- `docs/reports/ANALYTICS_KPI_REMOTE_PREREQUISITES_REMOTE_PREFLIGHT_2026-08-25.md`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`
- `handoffs/README.md` somente a linha 95 da fila canônica

## Fora de escopo

- aplicação de migration, SQL remoto de escrita, DDL ou alteração de ACL;
- reset, repair, rebuild, secrets, push, merge e deploy;
- smoke HTTP autenticado sem sessão válida disponível.

## Critérios de aceite

1. Identidade e status do projeto são confirmados antes das consultas.
2. Histórico, relações, funções, assinaturas, owner, segurança, `search_path`,
   ACL e grants são registrados com consultas read-only sanitizadas.
3. Divergência, falha, ausência de smoke ou resultado parcial mantém
   `NO_GO`/`failClosed=true` e impede aplicação.

## Entrega read-only

Identidade confirmada: projeto `ConfiOne`, ref `jzmmvfcmruasqmrdmbup`,
`ACTIVE_HEALTHY`, PostgreSQL 17.6.1.111, us-east-1. O histórico contém 299
migrations e não contém 20260825123000 ou 20260824210000.

Os quatro helpers estão presentes e compatíveis com o candidato: owner
postgres, `SECURITY DEFINER` quando aplicável, `search_path` vazio e nenhum
EXECUTE para anon. Os wrappers novos de seis argumentos e os wrappers filtered
auditados não estão presentes. Source config tem 38 linhas, 30 classificadas/
confirmadas e 3 chaves ativas ambíguas.

Resultado: `REMOTE_PREFLIGHT_NO_GO`, `failClosed=true`, application `NOT_RUN`.
Smoke HTTP autenticado não foi executado por ausência de sessão válida.
