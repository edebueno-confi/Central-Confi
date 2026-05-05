# BRANCHING_STRATEGY.md

## Objetivo

Definir um fluxo de branches simples, auditável e compatível com operação
assistida por Codex, sem abrir múltiplas linhas de verdade desnecessárias.

## Decisão principal

O Genius Support OS adota fluxo centrado em `main` com branches curtas. `develop`
não é branch obrigatória neste momento.

## Branches oficiais

### `main`

- Fonte oficial de produção.
- Deve permanecer estável e protegida.
- Recebe apenas merge aprovado e com CI verde.
- Não deve receber push direto de trabalho cotidiano.

### `develop`

- Opcional.
- Não criar por padrão nesta fase.
- Só passa a existir se houver necessidade real de separar várias frentes longas
  de integração antes de produção.

### `feature/*`

- Branch de trabalho orientada a funcionalidade ou domínio.
- Boa para iniciativas nomeadas por negócio, por exemplo:
  - `feature/ticketing-sla`
  - `feature/knowledge-base-read-model`

### `codex/*`

- Branch padrão para execução conduzida por Codex.
- Boa para fases, refactors, hardening, docs e infraestrutura.
- Exemplos:
  - `codex/phase1-2-admin-control-plane`
  - `codex/environment-governance`

### `hotfix/*`

- Branch curta e urgente aberta a partir de `main`.
- Usada para incidente ou regressão de produção.
- Deve seguir o caminho mais curto possível até voltar a `main`.

## Regras de uso

- Branches devem ser curtas e focadas.
- Uma branch deve ter um objetivo técnico claro.
- Não misturar refactor amplo, schema change e UI sem necessidade real.
- Se banco e documentação forem acoplados, podem viajar na mesma branch.
- Se a mudança for grande, quebrar em commits bisectáveis.

## Fluxo recomendado

1. Abrir branch a partir de `main`.
2. Implementar e validar localmente.
3. Atualizar documentação operacional quando o estado real mudar.
4. Subir a branch.
5. Passar por CI.
6. Fazer merge aprovado em `main`.

## Merge

- Preferência padrão: `squash merge` para manter `main` limpa.
- Exceção: usar merge que preserve commits quando a sequência for
  intencionalmente bisectável e fizer sentido manter o histórico técnico.
- Nunca usar `force push` em `main`.

## Convenções de nomenclatura

- usar minúsculas
- separar termos com hífen
- refletir domínio ou fase real
- evitar nomes vagos como `test`, `fixes`, `misc`

## Proteções recomendadas

### `main`

- exigir PR
- exigir CI verde
- bloquear force push
- bloquear delete sem aprovação administrativa

### `hotfix/*`

- permitir prioridade operacional
- manter revisão curta, mas ainda rastreável

## Papel operacional

- Codex cria, mantém, valida e publica branches técnicas.
- O usuário aprova merges e deploys sensíveis.
- O dashboard não substitui o histórico de Git como trilha oficial de decisão.

## Estado atual

- A branch operacional ativa mais recente segue o padrão `codex/*`.
- Não existe necessidade concreta de `develop` nesta fase.
- O próximo passo natural continua sendo manter branches curtas até a abertura
  da fase de app web.
