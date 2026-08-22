# REVIEW

- Task: `AUTH-ACCESS-PROVISIONING-E2E-2026-08-22`
- Reviewer: Sentinel (Codex Independent Reviewer)
- Review mode: SENTINEL_REQUIRED
- Estado revisado: READY_FOR_REVIEW
- Base SHA: `0168a647bd3251364ad643f26f48b2119c5370f3`
- Implementation SHA: `UNCOMMITTED_WORKTREE`
- Decisão: **APPROVED**
- Data da revisão: 2026-08-22

## Funcionalidade avaliada

Provisionamento de acesso interno ponta a ponta: atribuição sem perfil com
telas padrão governadas, rejeição de perfil sem grants de tela e painel que
diferencia capabilities efetivas de telas resolvidas.

## Evidências independentes

- `node --test tests/scripts/access-provisioning-e2e.test.mjs`: PASS, 3/3.
- A migration `20260822200000` cria defaults com chaves estrangeiras para a
  área e catálogo de telas, adiciona dependências via resolver privado e
  materializa grants de membership na mesma função transacional.
- Perfil nomeado sem grants é rejeitado explicitamente; área sem defaults
  também falha, sem transformar ausência em acesso silenciosamente incompleto.
- A UI exibe telas resolvidas, estado de acesso ativo mas incompleto e ação
  explícita para aplicar telas padrão, sem substituir o backend como fonte de
  autorização.
- Teste pgTAP registrado: 12/12. Gates registrados: focused 288/288,
  `web:typecheck` PASS, `web:build` PASS com 945 módulos, `docs:validate` PASS,
  `review:gates` PASS sem regressões e `git diff --check` PASS.

## Segurança e escopo

- A migration preserva capabilities, roles, memberships, perfis e RLS
  existentes; não cria modelo paralelo de autorização.
- A função de provisionamento exige ator ativo e capability
  `access.users.manage`, e os grants de tabela/funções mantêm acesso para
  `authenticated` e `service_role`, sem execução por `anon`.
- O fallback para Meu espaço e o deny by default não foram substituídos por
  regra de frontend.
- A allowlist observada separa alterações preexistentes de UTF-8 e da frente
  After Sale, que não foram misturadas ao lote.

## Limitações

- A aplicação normal da migration local permanece bloqueada por drift histórico
  preexistente; dry-run e validação comportamental local foram registrados como
  aprovados, sem reset ou reparo destrutivo.
- Não houve migration remota, deploy, alteração de secrets ou escrita externa.
- QA browser autenticado não foi executado nesta revisão; typecheck, build e
  testes estruturais não equivalem a validação visual ponta a ponta.

## Veredito

**APPROVED** no escopo do lote. Forge pode finalizar localmente conforme a
allowlist aprovada. Esta aprovação não autoriza migration remota, deploy,
push, merge, alteração de secrets ou promoção de release.

## Ganho para o produto e o SaaS

O painel deixa de apresentar usuários ativos sem telas como plenamente
liberados, e o provisionamento sem perfil passa a entregar uma superfície
operacional mínima e auditável. Isso reduz acessos incompletos, chamados de
suporte e risco de liberar capability sem rota funcional.
