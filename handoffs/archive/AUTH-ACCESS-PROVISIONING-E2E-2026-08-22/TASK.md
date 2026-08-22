# TASK

- Task: AUTH-ACCESS-PROVISIONING-E2E-2026-08-22
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex
- Base SHA: 0168a647bd3251364ad643f26f48b2119c5370f3

## Objetivo

Corrigir o caso em que uma identidade ativa possui capabilities efetivas, mas
nenhuma tela operacional resolvida na sessão. Simplificar a liberação pela
superfície existente de Usuários e acessos, preservando as fontes atuais de
autorização e o fallback seguro para Meu espaço.

## Escopo permitido

- migrations de autorização necessárias para tornar o provisionamento atômico;
- `internal-access-user-create` e APIs/UI de Usuários e acessos diretamente
  relacionadas ao fluxo;
- contratos e testes focados diretamente afetados;
- handoffs correntes desta task.

## Fora de escopo

- unificar capabilities, telas, roles, memberships ou RLS em um novo modelo;
- alterar o contrato futuro Nível → Área → Tela → READ/WRITE;
- alterar dados de produção, secrets, integrações externas ou release surface;
- redesign do shell ou remoção do fallback `/inicio`.

## Critérios de aceite

1. Liberação sem perfil aplica somente as telas padrão da área, com dependências
   governadas e auditoria existente.
2. Perfil nomeado sem telas não é tratado como acesso funcional silencioso.
3. Usuário ativo sem área ou sem tela aparece como estado acionável no painel,
   sem ser apresentado como plenamente liberado.
4. Reativação, revogação e fallback para `/inicio` preservam deny by default.
5. Testes focados, typecheck, build e validação de diff passam.
