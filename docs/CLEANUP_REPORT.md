# Cleanup Report

> Documento histórico. Este arquivo registra o snapshot da higienização feita
> antes da fundação atual e não descreve a estrutura vigente do repositório.

## Objetivo
Executar uma limpeza controlada do projeto, removendo toda a tentativa de produto/app construída após a fase de extração inicial e preservando exclusivamente o conhecimento bruto já coletado.

## Escopo executado
### Preservado
- `.git`
- `.gitignore`
- `package.json` reescrito em versão mínima e coerente
- `README.md` reescrito como README temporário
- `raw_knowledge/octadesk_export/export-octadesk-kb.mjs`
- `raw_knowledge/octadesk_export/latest/**`

### Removido completamente
- frontend anterior
- componentes UI
- rotas, páginas, dashboards
- auth implementado
- código de backend/app da tentativa anterior
- migrations e schema de Supabase da tentativa anterior
- documentação de produto/arquitetura da tentativa anterior
- testes da tentativa anterior
- assets de branding e UI
- scripts de importação/reindexação/bootstrap do app
- configs de Next.js, ESLint, Playwright, TypeScript e PostCSS
- artefatos gerados (`.next`, `test-results`, `node_modules`, `.tmp`, etc.)

## Arquivos removidos
### Diretórios removidos integralmente
- `.next/`
- `.playwright-mcp/`
- `.tmp/`
- `node_modules/`
- `public/`
- `scripts/`
- `src/`
- `test-results/`
- `octadesk-kb-export/`

### Diretórios esvaziados e recriados como casca limpa
- `docs/`
- `frontend/`
- `supabase/`
- `tests/`

### Arquivos removidos da tentativa anterior
- `AGENTS.md`
- `CLAUDE.md`
- `.env.example`
- `eslint.config.mjs`
- `middleware.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package-lock.json`
- `playwright.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `tsconfig.tsbuildinfo`
- `vitest.config.ts`

## Arquivos preservados
- `.git/`
- `.gitignore`
- `package.json`
- `README.md`
- `docs/README.md`
- `docs/CLEANUP_REPORT.md`
- `frontend/.gitkeep`
- `supabase/.gitkeep`
- `tests/.gitkeep`
- `raw_knowledge/octadesk_export/export-octadesk-kb.mjs`
- `raw_knowledge/octadesk_export/latest/manifest.json`
- `raw_knowledge/octadesk_export/latest/bundle.json`
- `raw_knowledge/octadesk_export/latest/articles-index.json`
- `raw_knowledge/octadesk_export/latest/assets.json`
- `raw_knowledge/octadesk_export/latest/sections.json`
- `raw_knowledge/octadesk_export/latest/SUMMARY.md`
- `raw_knowledge/octadesk_export/latest/categories/**`
- `raw_knowledge/octadesk_export/latest/sections/**`
- `raw_knowledge/octadesk_export/latest/articles/**`
- `raw_knowledge/octadesk_export/latest/assets/**`

## Riscos encontrados
- A extração preservada pode conter conteúdo proprietário e operacional. Ela não deve ser tratada como material público por padrão.
- Alguns assets preservados têm nomes opacos e dependem do mapeamento do `bundle.json`/`assets.json` para interpretação correta.
- O script de extração foi preservado, mas não houve revalidação de execução após a limpeza, porque o objetivo foi higienizar e não reconstruir o ambiente.

## Inconsistências detectadas
- O conhecimento extraído estava originalmente armazenado dentro de `octadesk-kb-export/`, misturado com tentativa de produto. Agora a fonte canônica preservada passou a ser `raw_knowledge/`.
- O `package.json` anterior estava totalmente acoplado ao app descartado. Foi substituído por uma versão mínima, compatível apenas com a fase de extração.
- A documentação anterior descrevia um sistema que foi explicitamente descartado. Ela foi removida para evitar herança conceitual errada.

## Estrutura final do repositório
```text
C:.
|   .gitignore
|   package.json
|   README.md
|
+---docs
|       CLEANUP_REPORT.md
|       README.md
|
+---frontend
|       .gitkeep
|
+---raw_knowledge
|   \---octadesk_export
|       |   export-octadesk-kb.mjs
|       \---latest
|           |   articles-index.json
|           |   assets.json
|           |   bundle.json
|           |   manifest.json
|           |   sections.json
|           |   SUMMARY.md
|           +---articles
|           +---assets
|           +---categories
|           \---sections
|
+---supabase
|       .gitkeep
|
\---tests
        .gitkeep
```

## Estado final
O repositório foi higienizado naquele momento e ficou pronto para recomeçar com
base arquitetural nova, sem carregar a bagunça técnica da tentativa anterior.
