# Processo seguro de migrations Supabase V1

## Objetivo

Impedir que uma migration seja aplicada antes de provar compatibilidade,
segurança, isolamento e performance. Este documento transforma a ocorrência
da task 60 em uma regra operacional permanente.

O histórico técnico não é apagado. Um finding histórico continua sendo
evidência imutável; o que muda é o processo para impedir sua repetição.

## Regra de bloqueio

Nenhuma migration pode ser aplicada em banco local canônico, staging ou remoto
quando qualquer etapa abaixo estiver ausente, inconsistente ou sem evidência:

1. identidade exata do alvo e do projeto;
2. backup ou PITR utilizável antes de escrita;
3. paridade de histórico e schema;
4. proveniência estática das migrations, inclusive `DO`/`EXECUTE`;
5. preflight semântico com o contrato real;
6. replay em shadow descartável;
7. ACL, grants, `search_path`, `SECURITY DEFINER`, RLS e policies;
8. prova cross-tenant com pelo menos dois contextos de tenant/usuário;
9. plano de lock, timeout, concorrência e rollback/forward-fix;
10. validação pós-aplicação e revisão independente.

O resultado global é `NO_GO` se o histórico contiver uma exceção sem prova
retroativa. `candidate_go` e `historical_no_go` são estados diferentes e não
podem ser convertidos em um único `GO`.

## Fluxo obrigatório

### Fase 0 — Identidade e autorização

- Confirmar repositório, branch, commit e allowlist.
- Confirmar o container local ou o `project-ref` remoto por identidade exata.
- Não considerar localhost, URL ou conexão como prova suficiente do alvo.
- Confirmar autorização registrada para o ambiente e para o tipo de escrita.
- Não ler, pedir ou persistir secrets no repositório.

### Fase 1 — Auditoria somente leitura

Registrar, sem escrever no banco:

- lista local/remota de migrations e divergências;
- objetos, definições, owners, ACLs e grants;
- `search_path`, funções `SECURITY DEFINER` e privilégios de execução;
- RLS, `FORCE ROW LEVEL SECURITY` e policies completas;
- índices e consultas críticas do contrato;
- baseline de performance e locks relevantes.

Uma lista `299/299` ou equivalente prova apenas o histórico observado. Ela não
prova preflight, proveniência, equivalência semântica, RLS ou performance.

### Fase 2 — Preflight estático e semântico

- Analisar SQL literal, comentários aninhados, strings PostgreSQL e comandos
  dinâmicos de forma conservadora.
- Comparar o contrato completo da função/RPC, não apenas nomes ou contagens.
- Comparar definição, owner/ACL, grants, `search_path`, `SECURITY DEFINER`,
  RLS e policies.
- Manter o gate fail-closed quando a origem ou a equivalência não puder ser
  provada.

### Fase 3 — Shadow replay

- Criar um alvo descartável e comprovadamente diferente do banco canônico.
- Aplicar apenas o candidato autorizado no shadow.
- Reproduzir o contrato real, incluindo séries, coortes, estados e RPCs.
- Provar isolamento com dois tenants e dois contextos autenticados.
- Verificar performance com volume representativo, planos e limites de tempo.
- Remover o shadow ao final e preservar o relatório.

`SHADOW_REPLAY_GO` autoriza somente o candidato no shadow. Não autoriza o banco
principal, o remoto, produção, reset, rebuild ou release.

### Fase 4 — Aprovação e aplicação controlada

Antes da escrita, o handoff precisa conter:

- base SHA, implementation SHA e allowlist;
- alvo exato e ambiente;
- backup/PITR confirmado;
- evidência do preflight e do shadow;
- plano de lock, timeout e observabilidade;
- critérios de parada e rollback/forward-fix;
- limitações não comprovadas;
- aprovação independente do Sentinel.

Sem isso, o estado permanece `OWNER_DECISION_REQUIRED` ou `NO_GO`.

### Fase 5 — Pós-aplicação

Executar no mesmo alvo:

- lista de migrations e schema parity;
- smoke dos contratos e RPCs reais;
- testes de autorização, RLS e cross-tenant;
- verificação de ACL/grants e ausência de acesso direto indevido;
- consultas de performance e locks;
- validação de logs, auditoria e estado do serviço.

Qualquer divergência interrompe a promoção seguinte. Não corrigir no braço com
SQL ad hoc; preferir migration corretiva versionada, backup/PITR ou restauração
controlada.

## Guardrails de performance e segurança

- Índices devem acompanhar colunas usadas em RLS e filtros críticos; em filtros
  compostos, validar ordem de igualdade antes de faixa.
- Políticas RLS devem usar contexto de tenant no banco, `FORCE RLS` quando o
  modelo exigir e funções auxiliares privadas com `search_path` explícito.
- Funções `SECURITY DEFINER` devem validar identidade, ficar fora do schema
  exposto quando possível e ter `EXECUTE` revogado de papéis não necessários.
- Transações de migration e comandos de aplicação devem ser curtos; não manter
  locks durante chamadas externas.
- Usar timeout e ordem consistente de locks; deadlock ou espera inesperada é
  condição de parada.

## Tratamento da task 60

- O finding histórico permanece preservado como `historical_no_go`.
- O candidato de remediação e o rebuild local foram validados em shadow/local
  dentro do escopo aprovado.
- O banco remoto nunca foi auditado nem alterado; seu estado é desconhecido.
- Portanto, não há autorização implícita para reescrever, resetar ou aplicar
  migrations no remoto.
- Uma futura janela remota deve começar pela Fase 0 e pela Fase 1 deste
  documento, com projeto identificado e autorização própria registrada.

## Checklist copiável

```text
[ ] alvo exato confirmado
[ ] autorização e allowlist registradas
[ ] backup/PITR confirmado
[ ] migration history/schema parity auditados
[ ] proveniência estática comprovada
[ ] preflight semântico PASS
[ ] candidate_go separado de historical_no_go
[ ] shadow descartável reproduziu contrato real
[ ] ACL/grants/search_path/SECURITY DEFINER conferidos
[ ] RLS/FORCE RLS/policies conferidos
[ ] cross-tenant provado com dois contextos
[ ] performance, locks e timeouts validados
[ ] plano de parada e rollback/forward-fix definido
[ ] pós-aplicação validada no mesmo alvo
[ ] revisão independente do Sentinel registrada
```

## Referências

- `docs/engineering/OWNER_DECISIONS.md`, OD-017, OD-019 e OD-020.
- `docs/reports/LOCAL_MIGRATION_SEMANTIC_PREFLIGHT_2026-08-24.md`.
- `docs/reports/LOCAL_MIGRATION_HISTORY_REBUILD_2026-08-24.md`.
- `docs/REMOTE_SUPABASE_DEPLOY_RUNBOOK.md`.
- Skill Supabase Postgres Best Practices: RLS, privilégios, índices,
  transações curtas e prevenção de deadlocks.
