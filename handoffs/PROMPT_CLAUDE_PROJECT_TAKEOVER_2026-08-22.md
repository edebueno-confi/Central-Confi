# TAKEOVER OPERACIONAL DO CONFIONE PARA CLAUDE

Data do handoff: 2026-08-22
Responsável pela transferência: Codex
Destino: Claude, como coordenador operacional do projeto

## Objetivo

Assuma a continuidade do ConfiOne em `C:\Projetos\ConfiOne` com baixo consumo de tokens, preservando o trabalho existente e mantendo o fluxo de agentes executor, reviewer e coordenador. O produto se chama **ConfiOne**. `Genius Support OS` é apenas nome histórico ou identificador legado.

Este documento é um snapshot operacional. Antes de executar qualquer ação, reconfirme os arquivos canônicos e o estado Git atual. Não trate números deste documento como substitutos da verificação local.

## Estado confirmado no momento da transferência

- Remoto: `https://github.com/edebueno-confi/ConfiOne.git`
- Diretório: `C:\Projetos\ConfiOne`
- Branch de trabalho: `codex/performance-reconciliation-20260822`
- HEAD local: `6c18ebaeaf0a586448ccb36ec551cc224e3b4c36`
- PR: [ConfiOne#45](https://github.com/edebueno-confi/ConfiOne/pull/45)
- PR estado: OPEN, MERGEABLE, CLEAN
- Checks do PR: `verify-database` verde em duas execuções, Vercel Preview verde
- Preview: `https://vercel.com/edebueno-confis-projects/confione/3Y9XrdGaQSQKow7rSeuNXdwry9U9`
- Produção ainda precisa ser confirmada depois do merge em `main`.

### Banco remoto já aplicado

Por autorização explícita do proprietário, as migrations abaixo já foram aplicadas no projeto Supabase `jzmmvfcmruasqmrdmbup`:

- `access_02_provisioning_e2e_v1`, registrado remotamente como `20260822234654`
- `analytics_utf8_and_scope_guard_v1`, registrado remotamente como `20260822234701`

Verificações remotas read-only já realizadas:

- tabela de defaults de telas existe e possui 12 defaults;
- helper `app_private.default_internal_screen_keys(text,text)` existe;
- textos mojibake removidos das funções de Analytics verificadas;
- `rpc_analytics_ceo_snapshot_legacy`, RPC comercial e RPC de Customer Success retornaram JSON sem 500 no smoke remoto;
- Customer Success `Aftersale` retornou escopo disponível com cobertura ticket-empresa de 100% no snapshot consultado.

Não reaplique essas migrations sem conferir o histórico real. Não execute reset, seed destrutivo ou migration remota adicional sem validar escopo e autorização.

## O que foi entregue

### Acesso e liberação

Commit relevante: `ec37f567`.

- Cadastro/liberação interna com defaults de telas.
- Usuário ativo sem telas aparece como acesso incompleto, com ação para aplicar telas padrão.
- Perfil nomeado vazio é rejeitado.
- Deny by default preservado.
- Meu Espaço permanece fallback seguro para usuário autenticado.
- Testes e migration de provisioning E2E incluídos.

### Dashboard, filtros e UTF-8

Commit relevante: `b478ef6a`.

- Visão Geral com operação selecionada usa os read models de Comercial, Suporte e Customer Success, sem inventar snapshot consolidado.
- Financeiro permanece fora da dimensão de operação e é apresentado como indisponível quando o recorte não é aplicável.
- Fallback de texto corrige mojibake no frontend.
- Migration preserva definições atuais das funções e corrige somente textos conhecidos de responsável.
- Escopos canônicos observados: `Aftersale`, `Confi`, `Confi Analytics`, `Neotrust`. Não usar `After Sale` por inferência.

### Handoff e protocolo

Commit relevante: `6c18ebae`.

- Handoff corrente e arquivo de revisão foram reconciliados.
- A revisão formal independente não foi substituída silenciosamente. Nesta frente, a continuidade foi autorizada em `OWNER_AUTHORIZED_SELF_REVIEW` porque o handoff do Sentinel permaneceu em HOLD/inconsistente.
- Isso não autoriza ignorar revisão independente em novos lotes.

## Pendências prioritárias

1. Fazer merge squash do PR 45 somente com `expected_head_sha=6c18ebaeaf0a586448ccb36ec551cc224e3b4c36`.
2. Aguardar o deploy automático de `main` e confirmar a URL de produção.
3. Executar smoke read-only da produção para shell, RPCs e views afetadas.
4. Com sessão autenticada, validar no navegador: Visão Geral, Comercial, Customer Success, Suporte, filtro por operação, console e requests.
5. Confirmar que a UI publicada não chama RPC/view inexistente e que o frontend corresponde ao banco remoto.
6. Registrar o resultado nos handoffs sem apagar findings históricos.
7. Depois da estabilização, continuar a fila de AUTH, Dashboard e Configuration apenas pela ordem canônica da fila.

Limitação conhecida: sem sessão autenticada disponível neste handoff, não declarar fluxo de usuário, RLS servido, tenant isolation ou ausência de erros de console como comprovados somente por build, HTTP 200 ou SQL read-only.

## Modelo operacional de agentes

### Papéis

- **Claude / Coordenador:** lê a fila, decide a próxima ação autorizada, evita promoção em massa, monitora agentes e reporta ao proprietário.
- **Forge / Executor:** implementa somente a task atribuída, atualiza `TASK.md`, `IMPLEMENTATION.md` e `STATUS.md`, executa gates e entrega `READY_FOR_REVIEW`.
- **Sentinel / Reviewer:** revisa independentemente diff, escopo, evidências, segurança, contratos e limitações. Pode registrar `APPROVED`, `CHANGES_REQUESTED` ou `BLOCKED`. Não altera código de produto durante review.
- **Heartbeat do coordenador:** fallback de observação, não substitui mensagens de transição nem aprovação independente.

### Máquina de estados

`READY_FOR_IMPLEMENTATION` → `IMPLEMENTING` → `READY_FOR_REVIEW` → `APPROVED` → `FINALIZE_LOCAL` → `DONE/IDLE`.

Em `CHANGES_REQUESTED`, o Owner volta para Forge e somente os findings registrados são corrigidos. Em `HOLD`, não iniciar nem promover trabalho.

### Arquivos canônicos

Ler diretamente, nesta ordem, antes de decidir:

1. `handoffs/current/STATUS.md`
2. `handoffs/current/TASK.md`
3. `handoffs/current/IMPLEMENTATION.md`
4. `handoffs/current/REVIEW.md`
5. `handoffs/README.md`
6. `docs/engineering/OWNER_DECISIONS.md`
7. `AGENTS.md`
8. `git status --short --branch`

O conteúdo dos arquivos prevalece sobre mensagens antigas ou snapshots do chat. `REVIEW.md` nunca deve ser suavizado para remover finding.

### Troca de mensagens

Ao concluir, Forge deve avisar no chat do Sentinel e no chat do Claude, informando: task, estado, Owner, base SHA, implementation SHA, allowlist, gates, limitações e ação esperada.

Ao revisar, Sentinel deve avisar Forge e Claude com o veredito formal e os findings. Claude não deve converter silêncio em aprovação.

Quando não existir canal direto, a transição deve ser registrada nos quatro handoffs. O heartbeat apenas detecta estado, confirma consistência e promove a próxima task quando todas as pré-condições estiverem satisfeitas.

### Heartbeat econômico

Use um heartbeat de intervalo amplo, por exemplo 30 a 60 minutos, com leitura somente dos artefatos canônicos. Ele deve:

- detectar mudança de estado;
- verificar se Forge ou Sentinel já notificaram a transição;
- não repetir trabalho já processado;
- não iniciar task em HOLD;
- não aprovar backlog em massa;
- promover somente a próxima task existente quando a anterior estiver formalmente concluída;
- registrar bloqueio e próximo responsável quando necessário.

Heartbeat não deve executar deploy, migration remota, push, merge, alteração de secret ou escrita externa. Essas ações exigem autorização e gates explícitos.

## Regras de segurança

- Preservar alterações preexistentes e não usar `git reset`, `git clean`, descarte amplo ou force push.
- Não misturar arquivos sem relação no commit.
- Não expor tokens, cookies, JWTs, secrets, `service_role` ou credenciais.
- Confirmar identidade do projeto Supabase antes de qualquer ação remota.
- Backend, RPCs, views, policies e RLS são a fonte da verdade.
- Não inventar mock, endpoint, regra de permissão ou dado para mascarar ausência de origem.
- Produção somente a partir de `main`, com banco e aplicação coerentes.
- Antes de declarar concluído, executar testes proporcionais, typecheck, build, diff check e smoke do fluxo principal.

## Alterações preexistentes que devem ser preservadas

No último snapshot, o worktree continha mudanças fora deste lote em:

- `apps/web/src/features/support/SupportWorkspacePage.tsx`
- `handoffs/README.md`
- arquivos da migração After Sale em `handoffs/after-sale-migration-claude/genius-sonho-dos-pes/`
- CSV provisório da migração Sonho dos Pés

Antes de qualquer commit, reavalie o `git status`. Não use `git add .`.

## Critério de conclusão do takeover

Claude deve confirmar que leu o estado atual, assumir explicitamente a coordenação, atualizar ou preservar os handoffs sem perder histórico, concluir o merge/deploy somente após os gates, validar produção com as limitações declaradas e entregar ao Ede um resumo com branch, commit, PR, deploy, testes, pendências e riscos.

Não declarar que a aplicação está definitivamente saudável sem validação autenticada de console, rede, RPC/view, autorização e isolamento tenant.
