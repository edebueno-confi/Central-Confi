# REVIEW

- Task: LOCAL-PARITY-MIGRATION-BASELINE-2026-08-23
- Reviewer: Sentinel (Codex Independent Reviewer)
- Review mode: SENTINEL_REQUIRED
- Base SHA: 22a60a0ed73dbdd8e865ff1c39ed39def3fe6003
- Estado revisado: READY_FOR_REVIEW em IMPLEMENTATION.md e STATUS.md
- Decisão: CHANGES_REQUESTED

## Resumo

A auditoria read-only apresenta bons limites de segurança: não expõe valores de
secrets, não executa sync, não aplica migrations e distingue 200/401 de prova de
integração. Porém, o lote ainda não tem handoff coerente nem matriz auditável o
suficiente para servir como baseline confiável. A aprovação da fila não equivale
ao veredito desta revisão.

## Findings

### F-LP-001 — HIGH — handoff corrente contraditório

Evidência: `handoffs/current/TASK.md:4-5` permanece `State=IMPLEMENTING` e
`Owner=Forge`, enquanto `handoffs/current/IMPLEMENTATION.md:4-5` e
`handoffs/current/STATUS.md:4-5` registram `READY_FOR_REVIEW` e `Owner=Sentinel`.

Impacto: a máquina de estados não identifica de forma determinística quem pode
agir em seguida e o lote não pode ser finalizado com rastreabilidade confiável.

Correção esperada: Forge deve reconciliar TASK, IMPLEMENTATION e STATUS para o
estado real de entrega, preservando `Reviewer active=Sentinel`, a base SHA e o
modo `SENTINEL_REQUIRED`. Não alterar o escopo para mascarar a divergência.

### F-LP-002 — HIGH — contaminação ou classificação incompleta da allowlist

Evidência: `git status --short` mostra alterações em
`docs/PROJECT_STATE.md`, `docs/README.md` e `handoffs/README.md`, além dos
artefatos allowlisted. A TASK autoriza somente o plano, o relatório e os quatro
handoffs. O relatório afirma em `LOCAL_ANALYTICS_PARITY_BASELINE_2026-08-23.md:29`
que nenhum arquivo fora da allowlist foi alterado.

Impacto: o lote pode incorporar documentação ou fila de outra frente; a
afirmação de escopo fica incompatível com o diff real. A alteração preexistente
em `handoffs/README.md` foi preservada conforme solicitado, mas deve ser
explicitamente separada do lote. Os demais arquivos fora da allowlist também
precisam ser classificados como preexistentes ou removidos do stage futuro.

Correção esperada: registrar a contaminação real, separar o que é preexistente,
e garantir que qualquer commit posterior contenha somente os arquivos
allowlisted do lote. Não descartar alterações preexistentes.

### F-LP-003 — MEDIUM — estado do Edge Runtime sem janela temporal coerente

Evidência: o plano afirma em `docs/CONFI_ONE_ANALYTICS_LOCAL_PARITY_AND_DASHBOARD_PLAN_V1.md:36`
que o runtime local das Edge Functions foi iniciado em `127.0.0.1:54321`,
enquanto o relatório afirma em `LOCAL_ANALYTICS_PARITY_BASELINE_2026-08-23.md:71`
que nenhum container de Edge Runtime apareceu no `docker ps` e classifica o
runtime como não comprovado. Na revisão, `docker ps` observou o container
`supabase_edge_runtime_genius-support-os` ativo e GET local da função retornou
401.

Impacto: sem timestamp e comando associados, não é possível distinguir estados
de momentos diferentes. O 401 prova somente a barreira de autenticação; não
prova execução funcional da função nem sync.

Correção esperada: registrar horário/comando de cada observação e reconciliar o
plano com o relatório. Manter explicitamente: banco/REST/Auth ativos quando
observados, Edge Runtime ativo somente como estado de processo, e execução
funcional, replay e integração externa como não comprovados.

### F-LP-004 — MEDIUM — matriz de migrations, RPCs, grants e search_path insuficiente

Evidência: o relatório apresenta contagens e afirma que “parte dos RPCs” possui
EXECUTE para `anon` e `authenticated`, mas não fornece tabela por objeto com
assinatura, migration de origem, presença no histórico, `security definer`,
`search_path`, grants por papel e comando/resultado sanitizado.

Impacto: o baseline não é reproduzível nem suficiente para a próxima revisão de
drift, isolamento e segurança. Uma afirmação agregada pode ocultar um RPC
exposto indevidamente ou uma assinatura aplicada fora do histórico.

Correção esperada: adicionar matriz objeto a objeto, incluindo as quatro
migrations posteriores, views/RPCs relevantes, assinatura de cinco/seis
argumentos, grants por role, `prosecdef`, `proconfig/search_path`, fonte da
definição e classificação fato/hipótese/lacuna.

## Gates independentes

- `npm run docs:validate`: PASS, 0 bloqueados, 3 válidos e 9 alertas históricos.
- `git diff --check`: PASS para arquivos rastreados; arquivos novos não são
  cobertos integralmente por esse comando enquanto permanecem não rastreados.
- `docker ps`: runtime local observado read-only.
- GET local de `analytics-sequential-sync`: HTTP 401 sem autenticação.
- Não houve leitura de valores de secrets, chamada a HubSpot/OMIE, escrita
  externa, aplicação de migration, reset, alteração de banco ou configuração
  executável.

## Decisão e próximo responsável

`CHANGES_REQUESTED`. Owner devolvido a Forge para reconciliar os quatro findings
documentais e devolver `READY_FOR_REVIEW`. A alteração preexistente em
`handoffs/README.md` deve permanecer preservada e fora do lote. Não finalizar,
fazer commit, aplicar migration, executar sync, fazer push, merge ou deploy antes
de nova revisão formal.

## Re-review formal Sentinel — 2026-08-23

- Reviewer: Sentinel (Codex Independent Reviewer)
- Task: LOCAL-PARITY-MIGRATION-BASELINE-2026-08-23
- Base SHA: 22a60a0ed73dbdd8e865ff1c39ed39def3fe6003
- Estado revisado: READY_FOR_REVIEW
- Implementation: UNCOMMITTED_WORKTREE
- Decisão: APPROVED

### Findings reavaliados

- F-LP-001 resolvido: TASK, IMPLEMENTATION e STATUS estão alinhados em
  `READY_FOR_REVIEW`, Owner Sentinel, Role REVIEWER e
  `Agent coordination=REVIEW_ACTIVE`.
- F-LP-002 resolvido: a allowlist efetiva foi delimitada ao relatório e aos
  três handoffs de execução; REVIEW.md permanece preservado pelo reviewer. O
  plano, `docs/README.md`, `docs/PROJECT_STATE.md` e `handoffs/README.md` estão
  explicitamente classificados como preexistentes e fora de qualquer commit do
  lote. A alteração preexistente em `handoffs/README.md` deve continuar sendo
  preservada.
- F-LP-003 resolvido: o relatório registra a observação datada do Edge Runtime,
  REST/Auth=200 e função=401 na mesma janela operacional. A classificação
  permanece correta: processo/reachability/barreira HTTP observados, mas
  execução funcional, replay, sync e integração externa não comprovados.
- F-LP-004 resolvido: foi adicionada matriz por objeto para migrations
  posteriores, RPCs de cinco/seis argumentos, funções de escopo, `prosecdef`,
  `search_path`, grants por role, fonte, comando, resultado e classificação.

### Validação independente e limites

- `npm run docs:validate`: PASS, 0 bloqueados, 3 válidos e 9 alertas históricos.
- `git diff --check`: PASS; a finalização deve repetir o check após stage
  seletivo para incluir também os arquivos novos do lote.
- O relatório preserva os fatos locais: 297 migrations no filesystem versus
  294 no histórico, 0 `tenant_memberships`, ausência de fixtures completas,
  Edge Runtime observado somente na janela registrada e função de sync em 401
  sem autenticação.
- O relatório não transforma catálogo local em prova de RLS, isolamento por
  tenant ou acesso efetivo. Grants administrativos suspeitos e lacunas de RLS
  permanecem riscos P0 para a próxima task, não foram corrigidos por este lote.
- Não houve leitura de valores de secrets, chamada a HubSpot/OMIE, migration,
  sync, escrita em banco, alteração executável, produção, push, merge ou deploy.

### Decisão

`APPROVED` somente para `FINALIZE_LOCAL` documental seletivo. Forge pode criar
commit local exclusivo apenas com o relatório e os três handoffs allowlisted,
preservando os arquivos preexistentes fora do lote. Esta aprovação não autoriza
a próxima implementação, migration local/remota, sync, produção, push, merge,
deploy ou release.
