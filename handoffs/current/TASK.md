# TASK

Task: `RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25`

State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: `d701181bf2192ff55f9b4191e624a75fc6ec287a`

## Objetivo

Centralizar visualmente a busca global no header para a apresentação interna,
sem alterar a regra de acesso, destinos, permissões ou comportamento de
Ctrl/Cmd+K.

## Allowlist

- `apps/web/src/features/navigation/MinimalAppShell.tsx`
- `apps/web/src/features/navigation/GeniusGlobalSearch.tsx`
- `apps/web/src/index.css`
- `tests/scripts/release-header-global-search-alignment.test.mjs`
- `handoffs/current/TASK.md`
- `handoffs/current/IMPLEMENTATION.md`
- `handoffs/current/REVIEW.md`
- `handoffs/current/STATUS.md`
- `handoffs/archive/RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25/TASK.md`
- `handoffs/archive/RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25/IMPLEMENTATION.md`
- `handoffs/archive/RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25/REVIEW.md`
- `handoffs/archive/RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25/STATUS.md`

Arquivos adicionais exigem atualização explícita deste allowlist.

## Fora de escopo

- alteração de permissões, capabilities, router, destinos, RLS ou backend;
- alteração do conteúdo ou contrato da busca;
- refatoração geral do shell;
- push, merge, deploy ou publicação sem aprovação independente.

## Critérios de aceite

1. A busca fica geometricamente centralizada no header em desktop.
2. O layout continua utilizável em viewport estreita, sem overflow horizontal.
3. Ctrl/Cmd+K, Escape, foco, navegação e filtragem por permissões permanecem
   inalterados.
4. Nenhum menu global ou identidade do usuário é duplicado ou reposicionado.
5. Teste determinístico, typecheck, build, lint, docs:validate,
   review:gates e git diff --check passam.
6. A entrega fica pronta para revisão independente até a janela de deploy.

## Regra de deploy

O prazo de apresentação é um requisito de release, não uma autorização para
pular gates. Se a janela não comportar revisão independente e validação, o
estado deve permanecer NO-GO e o motivo deve ser registrado.

## Resultado

APPROVED pelo Sentinel e finalizado localmente de forma seletiva. A busca foi
centralizada no header sem alteração de permissões, destinos ou contrato.
