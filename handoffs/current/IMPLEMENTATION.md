# IMPLEMENTATION

Task: `RELEASE-HEADER-GLOBAL-SEARCH-ALIGNMENT-2026-08-25`
State: DONE
Owner: Forge
Role: EXECUTOR
Reviewer active: Sentinel
Review mode: SENTINEL_REQUIRED
Agent coordination: IDLE
Base SHA: `d701181bf2192ff55f9b4191e624a75fc6ec287a`
Implementation SHA: `PENDING_LOCAL_COMMIT`

## Plano de implementação

Corrigir o layout do topbar com a menor alteração possível, usando a estrutura
existente e preservando o componente GeniusGlobalSearch. Validar visualmente o
header em desktop e viewport estreita, sem mudar contratos de acesso.

## Evidência a registrar

- arquivos alterados e diff allowlisted;
- teste direcionado com ausência de overflow e centralização;
- typecheck e build;
- lint;
- docs:validate e review:gates;
- git diff --check;
- limite real da QA visual/autenticada.

## Gates da correção dos findings

- `node --test tests/scripts/release-header-global-search-alignment.test.mjs`:
  2/2 PASS;
- `node --check tests/scripts/release-header-global-search-alignment.test.mjs`:
  PASS;
- `npm run web:typecheck`: PASS;
- `npm run web:build`: PASS, 946 módulos;
- `npm run lint`: PASS, 0 erros e 157 warnings legados;
- `npm run docs:validate`: PASS, 0 bloqueios;
- `npm run review:gates`: PASS, 0 regressões bloqueantes e 47 itens do baseline
  resolvidos;
- `git diff --check`: PASS.

A QA visual/browser autenticada não foi executada nesta correção. O teste
direcionado cobre invariantes determinísticas do layout e do comportamento
existente da busca, mas não substitui medição computada em navegador.

## Ação esperada ao concluir

Sentinel aprovou o lote para finalização local seletiva. A aprovação não cobre
autenticação, backend, banco, RLS, produção ou outros arquivos do worktree.
