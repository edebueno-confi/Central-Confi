# PUBLIC_HELP_CENTER_PUBLISH_RUNBOOK.md

## Objetivo
Definir o procedimento operacional seguro para curar, revisar e publicar artigos na Central Publica do Genius Support OS sem automacao em massa e sem abrir risco de exposicao indevida.

## Escopo
- curadoria editorial de artigos da Knowledge Base
- validacao local controlada do fluxo `draft -> review -> published`
- exposicao publica tecnica B2B em `/help/:spaceSlug`
- rollback operacional por `archive`, nunca por mutacao silenciosa

## Regras duras
- nao publicar em massa
- nao promover artigo por heuristica
- nao publicar `restricted`, `internal`, `obsolete` ou `duplicate`
- nao publicar HTML legado como corpo principal
- nao usar IA para decidir `visibility`, `status` ou readiness
- nao executar publish remoto sem evidencia local e sem checklist concluido
- nao assumir que `published` basta; o `knowledge_space` precisa estar `active`

## Pre-requisitos para publicar
- `knowledge_space` alvo definido com clareza
- artigo em `draft` ou `review`, nunca sem trilha editorial
- advisory persistente sincronizado para o lote legado
- `platform_admin` ou perfil administrativo autorizado para operar as RPCs
- `title`, `summary` e `body_md` revisados manualmente
- categoria final coerente com `visibility = public`
- ausencia de segredo, credencial, token, payload sensivel, endpoint interno, PIX, estorno, Correios sensivel ou permissao critica
- evidencias locais de que a Central Publica so expora o que for `published + public`

## Preparacao do ambiente local
1. Subir o stack local do Supabase.
2. Garantir readiness do ambiente.
3. Resetar o banco local para baseline conhecido.
4. Reidratar a fixture administrativa local.

Comandos oficiais:
```bash
npm run supabase:start
npm run supabase:wait:ready
npm run supabase:db:reset
npm run supabase:qa:local-admin-fixture
```

## Como importar drafts legado
1. Gerar ou atualizar o backlog oficial.
2. Executar `dry-run` do import.
3. Executar `apply` local controlado no `knowledge_space` correto.
4. Confirmar que todos os artigos entraram como `draft`.

Comandos oficiais:
```bash
npm run knowledge:curation:backlog
npm run knowledge:import:octadesk:local -- --space-slug genius
npm run knowledge:import:octadesk:local -- --apply --space-slug genius --actor-user-id <uuid>
```

Regras do import:
- exigir sempre `--space-slug` ou `--knowledge-space-id`
- status inicial sempre `draft`
- `visibility` inicial sempre conservadora
- preservar `source_path` e `source_hash`
- nunca publicar durante o import

## Como sincronizar advisories
1. Rodar primeiro o backlog versionado.
2. Sincronizar os advisories no mesmo `knowledge_space`.
3. Confirmar que nenhum review humano existente foi sobrescrito.

Comandos oficiais:
```bash
npm run knowledge:curation:backlog
npm run knowledge:review:advisories:local -- --space-slug genius
npm run knowledge:review:advisories:local -- --apply --space-slug genius --actor-user-id <uuid>
```

## Como identificar candidatos `public`
Filtros obrigatorios em `/admin/knowledge`:
- `suggested_classification = public`
- excluir artigos com `duplicate_group_key`
- excluir artigos com `risk_flags` sensiveis
- priorizar `draft`
- revisar `visibility` atual antes de qualquer promote

Sinais para rejeicao imediata:
- menciona credenciais, tokens ou chaves
- inclui endpoints, payloads ou detalhes internos de API
- aborda PIX, estorno, Correios, sellers, antifraude ou permissao critica
- depende de conhecimento interno do time para fazer sentido
- conserva linguagem legado/B2C inadequada para documentacao tecnica B2B

## Como revisar `title`, `summary` e `body_md`
### Titulo
- deixar acionavel e objetivo
- usar verbo + objetivo + contexto
- evitar naming legado confuso

### Resumo
- explicar o resultado da leitura
- manter 1 a 2 frases
- nao repetir o titulo

### Corpo em Markdown
- reescrever em Markdown seguro
- abrir com contexto e quando usar
- listar passos reais
- explicitar validacao esperada
- adicionar limites, excecoes ou riscos
- remover referencias a HTML legado, scripts visuais antigos ou instrucoes incompletas

## Como validar `visibility` e `status`
### `visibility`
- `public` apenas para uso seguro da plataforma por cliente B2B ou usuario autorizado
- `internal` para playbook operacional ou conteudo ainda nao pronto
- `restricted` para qualquer item sensivel

### `status`
- `draft` para trabalho editorial em andamento
- `review` para leitura humana concluida e aguardando validacao final
- `published` apenas apos checklist completo e validacao publica
- `archived` para rollback ou retirada controlada

## Como ativar o `knowledge_space`
Pre-condicao:
- nunca ativar space sem readiness editorial minima
- garantir que os artigos publicados daquele space sao deliberados

Checklist de ativacao:
- branding publico minimo coerente
- categoria publica valida
- pelo menos um artigo `published + public` intencional
- confirmacao de que o space nao esta expondo legado indevido

Observacao:
- enquanto o `knowledge_space` estiver `draft`, os read models publicos devem continuar bloqueando a exposicao
- ativacao de `knowledge_space` e ato operacional separado de publish de artigo

## Como validar exposicao publica
Superficies minimas:
- `/help`
- `/help/:spaceSlug`
- `/help/:spaceSlug/articles`
- `/help/:spaceSlug/articles/:articleSlug`

Checklist:
1. rota responde sem `config-error`
2. o artigo publicado aparece na lista
3. a busca encontra o artigo publicado
4. o detalhe do artigo renderiza `body_md` em Markdown seguro
5. drafts e artigos nao publicos nao aparecem

Validacoes tecnicas recomendadas:
```bash
npm run contracts:typecheck
npm run web:typecheck
npm run web:build
npm run supabase:verify
```

## Checklist antes de publicar
- advisory sincronizado e consistente
- `suggested_classification = public`
- sem `risk_flags` bloqueantes
- `title` revisado
- `summary` revisado
- `body_md` revisado
- categoria final correta
- `visibility = public` validada manualmente
- nenhuma exposicao de segredo, endpoint interno ou operacao sensivel
- `review_status` persistido
- artigo promovido para `review`
- `knowledge_space` pronto para exposicao publica

## Checklist pos-publicacao
- artigo aparece em `vw_public_knowledge_articles_list`
- artigo aparece em `vw_public_knowledge_article_detail`
- busca publica retorna o artigo quando aplicavel
- Central Publica nao passou a expor outros artigos inadvertidamente
- registrar a fase ou lote no `DOCUMENTATION_LEDGER.md` quando houver mudanca relevante de baseline documental

## Criterios para rollback ou `archive`
Usar `archive` quando:
- o artigo publicado contem erro funcional relevante
- a visibilidade foi classificada de forma incorreta
- foi detectado dado sensivel apos publish
- a categoria publica ficou inadequada
- o fluxo do produto mudou e tornou o artigo obsoleto

Fluxo recomendado:
1. arquivar o artigo por RPC administrativa
2. registrar motivo em nota editorial interna
3. revisar backlog ou advisory se o erro vier da classificacao original
4. atualizar o ledger se houver impacto de baseline ou FAQ

## O que nunca deve ser publicado
- `restricted`
- `internal`
- `obsolete`
- `duplicate`
- HTML legado bruto
- instrucoes que dependam de credencial real
- detalhes tecnicos internos nao aprovados para a camada publica

## Evidencia minima esperada para publish real
- validacao local concluida
- checklist editorial concluido
- checklist publico concluido
- rastreabilidade documental atualizada
- decisao humana explicita de publish

## O que este runbook nao faz
- nao automatiza publish em lote
- nao substitui revisao humana
- nao autoriza deploy remoto
- nao transforma QA local em baseline de producao
