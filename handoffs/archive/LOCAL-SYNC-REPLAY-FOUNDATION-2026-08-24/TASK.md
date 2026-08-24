# TASK

- Task: LOCAL-SYNC-REPLAY-FOUNDATION-2026-08-24
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Approval: APPROVED por autorização explícita do proprietário em 2026-08-24
- Base SHA: da271d9e5579d8687edfb692a4d6e90e5d457062
- Agent coordination: REVIEW_ACTIVE

## Objetivo

Criar uma fundação reproduzível para validar localmente o ciclo de dados sem
depender de cadastros fake sem proveniência: usuários, tenants, memberships,
dados operacionais HubSpot/OMIE e seus read models.

## Escopo permitido

- fixtures sanitizadas e namespaced para o banco local;
- replay idempotente usando contratos e comandos locais existentes;
- testes focused para repetição, isolamento, cobertura e estados de fonte;
- verificação local dos read models, filtros por operação e painéis;
- scripts/documentação necessários dentro de `supabase/qa`, `scripts/local-qa`,
  `tests/scripts`, `package.json` e relatório da task.

## Fora de escopo

Não chamar HubSpot ou OMIE, ler secrets, alterar produção/remoto, criar
migration, alterar RLS/RPC/contratos, resetar o banco, apagar dados fora do
namespace da fixture, fazer SQL destrutivo, push, merge ou deploy.

## Critérios de aceite

1. Fixture é identificada, sanitizada, idempotente e limitada ao banco local.
2. Replay pode ser executado duas vezes sem duplicação ou corrupção.
3. Usuários, tenants e memberships são reais para o contrato local e não
   apenas mocks do frontend.
4. HubSpot e OMIE são representados por payloads/referências locais, sem
   chamada externa ou segredo.
5. Read models, estados de fonte e filtros conseguem ser comprovados com
   evidência reproduzível.
6. Testes focused, docs validate e diff check passam.
7. Sentinel revisa independentemente antes da finalização local.
