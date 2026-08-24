# REVIEW

## Revisão formal independente

- Task: `LOCAL-SYNC-REPLAY-FOUNDATION-2026-08-24`
- Reviewer: Sentinel (Codex Independent Reviewer)
- Base SHA: `da271d9e5579d8687edfb692a4d6e90e5d457062`
- Implementation SHA: `UNCOMMITTED_WORKTREE`
- Estado revisado: `READY_FOR_REVIEW`
- Review mode: `SENTINEL_REQUIRED`
- Decisão: `CHANGES_REQUESTED`
- Data: `2026-08-24`

### Funcionalidade revisada e ganho pretendido

O lote cria uma fixture namespaced e um replay local idempotente para validar
read models, filtros por operação e payloads locais HubSpot/OMIE sem chamadas
externas. O ganho pretendido é permitir QA reproduzível do ciclo de dados sem
usar cadastros fake no frontend ou credenciais de provedores.

### Evidências verificadas

- `buildFixture` usa namespace determinístico, UUIDs estáveis e IDs namespaced
  para tenants, empresas, deal, ticket e payload OMIE.
- `buildReplaySql` usa transação e `INSERT ... ON CONFLICT DO UPDATE` para
  todas as identidades; não contém `DELETE`, `TRUNCATE` ou `DROP`.
- O replay lê usuários locais já existentes e não provisiona Auth, senha,
  role global ou credencial.
- Os pipelines `qa-local-commercial` e `qa-local-cs` são verificados como
  inativos, e a verificação server-side exige que os payloads não apareçam
  nos snapshots por operação.
- O teste puro não encontrou `fetch`, secrets ou URLs de provedores externos.

### Finding

#### F-SYNC-001 — HIGH — Alvo do container de escrita não é fixado nem validado

- Requisito: a TASK limita o replay ao banco local correto e proíbe escrita
  fora desse alvo.
- Evidência: `local-sync-replay.mjs` valida `API_URL` e `DB_URL` como
  localhost, mas `runSqlBatch` em `scripts/local-qa/sql.mjs` escolhe o
  container por `process.env.LOCAL_QA_DB_CONTAINER ??
  'supabase_db_genius-support-os'` e executa `docker exec` nesse nome. Não há
  validação de que o valor customizado corresponda ao container esperado.
- Impacto: uma variável de ambiente pode direcionar a transação de fixture a
  outro container/banco local, mesmo com as URLs do Supabase esperado válidas.
  Isso quebra a garantia de identidade do alvo e pode contaminar dados fora do
  namespace pretendido.
- Correção esperada: rejeitar qualquer `LOCAL_QA_DB_CONTAINER` diferente de
  `supabase_db_genius-support-os`, ou eliminar o override para este replay.
  Adicionar regressão determinística que confirme o bloqueio de container
  divergente. O replay deve continuar sem qualquer ação remota ou fora do
  banco local autorizado.

### Validações independentes

- `node --test tests/scripts/local-sync-replay.test.mjs`: **4/4 PASS**;
- `npm run docs:validate`: **PASS**, 0 bloqueios;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: **PASS**;
- O comando de replay não foi executado novamente nesta revisão porque ele
  realiza escrita no banco local. A evidência de duas execuções consecutivas
  permanece registrada no `IMPLEMENTATION.md`/relatório e não substitui a
  correção do controle de alvo acima.

### Limitações preservadas

Não foram comprovados HubSpot/OMIE externos, scheduler, produção, browser
autenticado, RLS/cross-tenant servido, performance ou promoção de snapshot.
Não houve chamada externa, leitura de secret, escrita remota, migration,
reset, rollback, push, merge ou deploy durante esta revisão.

**Veredito: CHANGES_REQUESTED.**

## Re-review formal independente

- Reviewer: Sentinel (Codex Independent Reviewer)
- Estado revisado: `READY_FOR_REVIEW`
- Base SHA: `da271d9e5579d8687edfb692a4d6e90e5d457062`
- Re-review: `2026-08-24`

### Resposta ao finding

- **F-SYNC-001: RESOLVIDO.** `sql.mjs` agora fixa
  `supabase_db_genius-support-os` como único container aceito. Variável
  ausente ou igual ao valor canônico é aceita; qualquer override divergente
  falha com `LOCAL_QA_DB_CONTAINER_INVALID` antes do `docker exec`.
- O teste focused do replay cobre deterministamente os três casos: valor
  ausente, valor canônico e container divergente.

### Validações independentes

- `node --test tests/scripts/local-sync-replay.test.mjs`: **5/5 PASS**;
- `npm run docs:validate`: **PASS**, 0 bloqueios;
- `npm run review:gates`: **PASS**, 0 regressões bloqueantes e 47 itens do
  baseline resolvidos;
- `git diff --check`: **PASS**.
- O replay não foi executado novamente nesta revisão porque realiza escrita no
  banco local. As duas execuções históricas permanecem registradas no
  handoff, e a correção revisada impede redirecionamento do container.

### Decisão do re-review

`APPROVED`. O lote agora atende ao controle de identidade do banco local,
mantém a fixture namespaced e idempotente e não amplia autorização para
HubSpot/OMIE, produção, remoto, secrets, migrations, reset, rollback, push,
merge ou deploy.

Esta aprovação autoriza somente a finalização local seletiva desta task,
preservando alterações preexistentes e sem promoção automática de outra task.
