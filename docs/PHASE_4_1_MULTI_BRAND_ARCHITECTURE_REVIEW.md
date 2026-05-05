# PHASE_4_1_MULTI_BRAND_ARCHITECTURE_REVIEW.md

## Objetivo
Avaliar a arquitetura atual do Genius Support OS e definir a proposta alvo para suportar multiplas centrais de ajuda publicas, com um unico ambiente administrativo, sem implementar ainda schema, frontend, Central Publica ou IA.

Premissa de produto considerada nesta revisao:
- Genius Support OS e uma plataforma de operacao CX B2B tecnica para SaaS de logistica reversa.
- As centrais publicas futuras sao superficies tecnicas de documentacao e autoatendimento para clientes B2B e usuarios da plataforma.
- Esta arquitetura nao foi pensada para SAC B2C nem para atender shopper final.

## Escopo desta fase
- revisar o modelo atual e seus limites;
- propor o modelo alvo multi-brand e multi-help-center;
- definir impacto em RLS, views, RPCs, import legado, tickets, auditoria e futuras camadas publicas;
- propor plano faseado de migracao sem quebrar contratos existentes.

## Invariantes desta revisao
- nao criar migration nesta fase;
- nao alterar schema nesta fase;
- nao alterar frontend nesta fase;
- nao abrir Central Publica nesta fase;
- nao iniciar IA sobre Knowledge Base nesta fase;
- nao quebrar os contratos atuais de views e RPCs;
- preservar isolamento, governanca e auditoria.

## Resumo executivo
O desenho atual da Knowledge Base esta seguro para um corpus interno unico, com opcao de conteudo global (`tenant_id = null`) e conteudo tenant-scoped. Ele ainda nao esta pronto para multiplas centrais publicas porque o particionamento editorial hoje depende apenas de `tenant_id` e isso nao resolve, sozinho, o eixo de marca/help center.

O eixo novo que falta e `knowledge_space`. Ele deve virar a unidade de:
- publicacao publica;
- dominio/host;
- branding;
- navegacao editorial;
- segregacao de slugs de categorias e artigos;
- governanca futura da IA por superficie publica tecnica.

Recomendacao tecnica final:
- introduzir `organizations` como camada de governanca;
- manter `tenants` como unidade operacional de tickets e isolamento atual;
- introduzir `knowledge_spaces` como unidade editorial e publica;
- tratar `knowledge_space_domains` e `brand_settings` como extensoes obrigatorias da camada publica futura;
- fazer a migracao de forma aditiva, com wrappers/contratos v2, sem reescrever a Fase 4 em place.

## Leitura do modelo atual

### `tenants`
Estado atual:
- `tenants` representa empresa cliente ou organizacao operacional isolada.
- `tickets`, `tenant_memberships` e `tenant_contacts` dependem diretamente de `tenant_id`.
- o isolamento atual do produto esta ancorado nesse conceito.

Forca:
- o eixo operacional esta claro e endurecido por RLS, RPCs e auditoria.

Limite para multi-brand:
- `tenant` hoje nao representa explicitamente uma superficie publica de help center.
- usar `tenant` como unico eixo de marca acopla duas coisas diferentes:
  - isolamento operacional de conta/cliente;
  - superficie editorial/publica de produto/marca.

### `knowledge_categories`
Estado atual:
- possui `tenant_id` opcional;
- `parent_category_id`;
- unicidade por `(tenant_id, parent_category_id, slug)`.

Forca:
- permite categorias globais e tenant-scoped;
- atende o estado interno atual da Fase 4.

Limite para multi-brand:
- nao existe `knowledge_space_id`;
- dois help centers diferentes dentro do mesmo tenant nao conseguem repetir a mesma arvore raiz sem disputar o mesmo namespace de slug;
- categoria ainda nao carrega contexto de dominio, marca ou superficie publica.

### `knowledge_articles`
Estado atual:
- possui `tenant_id` opcional e `category_id`;
- unicidade por `(tenant_id, slug)`;
- publicacao controlada por `visibility` + `status`.

Forca:
- dominio editorial, versionamento e trilha de origem ja existem;
- o estado atual de `draft -> review -> published -> archived` esta bom para evoluir.

Limite para multi-brand:
- slug do artigo ainda nao e particionado por help center;
- nao existe resolucao por dominio ou `space_slug`;
- o artigo nao sabe em qual Central Publica ele deve aparecer;
- o caso atual de artigos globais (`tenant_id = null`) mistura todo o corpus legado em um namespace unico, inadequado para mais de uma marca.

### `knowledge_article_revisions`
Estado atual:
- depende apenas de `article_id`;
- append-only;
- preserva snapshot editorial.

Forca:
- o desenho pode ser reaproveitado quase integralmente.

Limite para multi-brand:
- o contexto de superficie publica fica implicito no artigo pai;
- para auditoria e IA futuras, sera importante o artigo pai ja estar associado a um `knowledge_space_id`.

### `knowledge_article_sources`
Estado atual:
- depende apenas de `article_id` e `revision_id`;
- preserva `source_path` e `source_hash`.

Forca:
- rastreabilidade do legado esta correta.

Limite para multi-brand:
- o import ainda nao sabe para qual help center a origem foi destinada;
- o mesmo `source_hash` pode precisar existir em espacos diferentes sem ser tratado como colisao global.

### `tickets`
Estado atual:
- o ticket pertence a exatamente um `tenant`;
- nao existe contexto de `knowledge_space` ou help center de origem.

Forca:
- o dominio de ticketing esta coerente com o modelo operacional atual.

Limite para multi-brand:
- quando existir Central Publica, o sistema ainda nao sabera de qual marca/help center o ticket nasceu;
- isso afeta analytics, roteamento, sugestao de artigo e IA futura.

### Admin Console
Estado atual:
- o console administrativo atual opera `tenants`, `access` e `system`;
- nao existe tela de Knowledge Base ainda;
- os contratos de KB hoje sao apenas backend/admin views e RPCs.

Forca:
- como a UI de KB ainda nao existe, o custo de evoluir a camada contratual agora e baixo.

Limite para multi-brand:
- as futuras views administrativas de KB ainda nao expoem `organization`, `knowledge_space`, dominio ou branding;
- se a UI nascer em cima do eixo `tenant`, ela ja nascera conceitualmente acoplada ao lugar errado.

### RLS e helpers
Estado atual:
- `app_private.can_manage_knowledge_base()` e global para `platform_admin`;
- `app_private.can_read_knowledge_article(target_tenant_id, target_visibility, target_status)` decide por tenant + visibilidade + status.

Forca:
- a leitura atual ja separa `public`, `internal` e `restricted`;
- o bloqueio de artigo nao publicado esta correto.

Limite para multi-brand:
- o helper nao diferencia dois help centers diferentes da mesma marca/tenant;
- o helper nao sabe resolver dominio, `space_slug` nem status de uma superficie publica;
- `knowledge_categories` ainda nao tem superficie publica segura propria.

### Views e RPCs atuais
Estado atual:
- `vw_admin_knowledge_categories`;
- `vw_admin_knowledge_articles_list`;
- `vw_admin_knowledge_article_detail`;
- `rpc_admin_create_knowledge_category`;
- `rpc_admin_create_knowledge_article_draft`;
- `rpc_admin_update_knowledge_article_draft`;
- `rpc_admin_submit_knowledge_article_for_review`;
- `rpc_admin_publish_knowledge_article`;
- `rpc_admin_archive_knowledge_article`.

Forca:
- o contrato administrativo atual esta limpo e seguro para uso interno.

Limite para multi-brand:
- nenhum contrato atual carrega `knowledge_space`;
- nenhuma RPC resolve destino por space;
- nenhuma view publica futura foi desenhada ainda;
- o script legado atual escreve tudo no namespace global (`tenant_id = null`).

## Premissa que precisa ser corrigida
O modelo atual define `tenant` como empresa cliente ou organizacao operacional isolada. Por isso, nao recomendo tratar `tenant` como o unico pai conceitual de uma Central Publica.

Se a arquitetura futura fizer `brand = tenant = help center`, o sistema vai misturar:
- governanca operacional de cliente/conta;
- identidade de marca;
- roteamento publico;
- ownership editorial.

Isso e uma simplificacao perigosa. O desenho mais estavel e:
- `organization` como camada de governanca;
- `tenant` como camada operacional;
- `knowledge_space` como camada editorial/publica.

Se, por decisao de negocio, um space tambem precisar ter um tenant dono, isso pode existir como `owner_tenant_id`, mas o eixo da Central Publica deve continuar sendo `knowledge_space`.

## Arquitetura alvo recomendada

### Entidades novas

#### `organizations`
Recomendacao:
- sim, obrigatoria na arquitetura alvo.

Motivo:
- agrupa multiplos tenants sob uma governanca comum;
- evita assumir que Genius e After Sale sao o mesmo tenant;
- permite que o mesmo Admin Console opere multiplas marcas de forma institucional, sem promover `platform_admin` global para sempre como unico modelo possivel.

#### `organization_memberships`
Recomendacao:
- sim, recomendada;
- urgencia media, nao precisa ser a primeira entrega se a operacao continuar apenas com `platform_admin`.

Motivo:
- `tenant_memberships` foi desenhada para operacao por conta/cliente;
- governanca editorial multi-brand e outro eixo;
- quando surgirem editores ou gestores por marca, o sistema vai precisar de um membership acima do tenant.

#### `knowledge_spaces`
Recomendacao:
- sim, obrigatoria;
- e a principal entidade nova desta evolucao.

Motivo:
- cada Central Publica precisa de uma unidade propria de slug, status, branding, dominio e navegacao;
- um tenant pode ter mais de um help center;
- um mesmo organization pode operar varios spaces sob um mesmo console.

#### `knowledge_space_domains`
Recomendacao:
- sim, recomendada desde a primeira fase implementavel da arquitetura multi-brand.

Motivo:
- os cenarios `help.geniusreturns.com.br`, `help.aftersale.com.br` e `/help/:space_slug` exigem uma camada de resolucao explicita;
- dominio e roteamento nao devem ficar hardcoded no frontend.

#### `brand_settings`
Recomendacao:
- sim, recomendada;
- modelo inicial 1:1 com `knowledge_space`.

Motivo:
- branding, nome publico, favicon, temas, SEO e contatos institucionais nao pertencem ao artigo nem a categoria;
- separar branding do conteudo evita vazamento de regra publica para o corpo editorial.

### Regras estruturais do `knowledge_space`
- `knowledge_spaces.slug` deve ser unico globalmente na plataforma.
- essa unicidade e necessaria para suportar `/help/:space_slug` sem ambiguidade.
- `knowledge_space_domains` deve ter unicidade por `(host, path_prefix)` para evitar dois spaces disputando a mesma rota publica.
- categorias e artigos devem ter unicidade scoped pelo `knowledge_space_id`, nunca mais apenas por `tenant_id`.
- o status do space deve ser independente do status do artigo. Um artigo pode estar publicado e ainda assim o space continuar fechado ao publico ate o go-live daquela central.

## Relacao recomendada entre entidades

### Modelo canonico recomendado
1. `organization` contem multiplos `tenants`.
2. `organization` tambem contem multiplos `knowledge_spaces`.
3. `knowledge_space` pode opcionalmente apontar para um `owner_tenant_id` quando houver um tenant operacional dominante para aquele help center.
4. `knowledge_space` contem multiplos `knowledge_categories`.
5. `knowledge_space` contem multiplos `knowledge_articles`.
6. `knowledge_article_revisions` e `knowledge_article_sources` continuam filhos do artigo.
7. `knowledge_space` contem multiplos `knowledge_space_domains`.
8. `knowledge_space` possui um `brand_settings` proprio.

### Por que nao recomendo `tenant` como pai unico do `knowledge_space`
Porque o tenant atual ja e a unidade de empresa cliente/operacao isolada. Se o help center publico for pendurado apenas nele, o sistema perde uma camada semantica propria de marca e produto.

### Compromisso com a relacao pedida
Se for importante manter a regra "tenant pode ter uma ou mais knowledge_spaces", o desenho pode suportar isso por `owner_tenant_id`, sem abrir mao de `organization` como raiz de governanca.

## ERD textual

```text
organizations
  - id
  - slug
  - display_name
  - status

organization_memberships
  - id
  - organization_id -> organizations.id
  - user_id -> profiles.id
  - role
  - status

tenants
  - id
  - organization_id -> organizations.id
  - slug
  - display_name
  - status
  - data_region

knowledge_spaces
  - id
  - organization_id -> organizations.id
  - owner_tenant_id -> tenants.id (nullable)
  - slug
  - display_name
  - status
  - is_primary
  - default_locale

knowledge_space_domains
  - id
  - knowledge_space_id -> knowledge_spaces.id
  - host
  - path_prefix
  - is_primary
  - status

brand_settings
  - id
  - knowledge_space_id -> knowledge_spaces.id
  - brand_name
  - logo_asset_url
  - theme_tokens jsonb
  - seo_defaults jsonb
  - support_contacts jsonb

knowledge_categories
  - id
  - knowledge_space_id -> knowledge_spaces.id
  - parent_category_id -> knowledge_categories.id
  - visibility
  - name
  - slug

knowledge_articles
  - id
  - knowledge_space_id -> knowledge_spaces.id
  - category_id -> knowledge_categories.id
  - visibility
  - status
  - title
  - slug
  - body_md
  - source_path
  - source_hash

knowledge_article_revisions
  - id
  - article_id -> knowledge_articles.id
  - revision_number
  - status_snapshot
  - visibility

knowledge_article_sources
  - id
  - article_id -> knowledge_articles.id
  - revision_id -> knowledge_article_revisions.id
  - source_kind
  - source_path
  - source_hash

tickets
  - id
  - tenant_id -> tenants.id
  - future_origin_knowledge_space_id -> knowledge_spaces.id (nullable, futura fase)
```

## Impacto nas migrations existentes

### Fase 1 (`phase1_identity_tenancy`)
Impacto:
- adicionar `organizations`;
- adicionar `organization_memberships`;
- adicionar `organization_id` em `tenants`.

Recomendacao:
- migracao aditiva;
- `tenants.organization_id` nasce nullable para backfill controlado;
- so depois vira obrigatorio.

### Fase 4 (`phase4_knowledge_base_core`)
Impacto:
- adicionar `knowledge_spaces`;
- adicionar `knowledge_space_domains`;
- adicionar `brand_settings`;
- adicionar `knowledge_space_id` em `knowledge_categories` e `knowledge_articles`.

Recomendacao:
- nao reescrever nem editar a migration oficial da Fase 4;
- criar uma nova migration incremental da Fase 4.2 ou 5.0;
- `knowledge_space_id` nasce nullable para backfill;
- o sistema convive temporariamente com `tenant_id` legado e `knowledge_space_id` novo;
- `knowledge_space_id` vira a chave autoritativa da KB apenas depois do backfill e dos contratos v2.

### Risco de alterar unicidade em place
Hoje existe:
- categorias: `(tenant_id, parent_category_id, slug)`;
- artigos: `(tenant_id, slug)`.

No modelo alvo, a unicidade precisa virar:
- categorias: `(knowledge_space_id, parent_category_id, slug)`;
- artigos: `(knowledge_space_id, slug)`.

Fazer isso diretamente, sem fase de convivio, e o maior risco de refactor desta evolucao.

## Impacto por area

### RLS
Estado atual:
- a leitura do artigo depende de tenant + visibility + status.

Mudanca necessaria:
- a leitura deve depender de `knowledge_space_id` e do estado do space;
- o backend precisa de helpers novos, por exemplo:
  - `can_manage_organization(...)`
  - `can_manage_knowledge_space(...)`
  - `can_read_knowledge_article_in_space(...)`

Recomendacao:
- manter `platform_admin` como bypass global no inicio;
- introduzir permissao por `organization_memberships` apenas quando houver delegacao real;
- nao abrir tabelas base de KB diretamente para publico;
- publicar apenas views publicas endurecidas.

### Views administrativas
Mudanca necessaria:
- views de KB precisam expor `organization`, `knowledge_space`, dominio e branding.

Recomendacao:
- manter as views atuais como compatibilidade;
- adicionar views novas:
  - `vw_admin_organizations_list`
  - `vw_admin_organization_detail`
  - `vw_admin_knowledge_spaces`
  - `vw_admin_knowledge_categories_v2`
  - `vw_admin_knowledge_articles_list_v2`
  - `vw_admin_knowledge_article_detail_v2`

### RPCs administrativas
Mudanca necessaria:
- as RPCs precisam aceitar destino por `knowledge_space_id`.

Recomendacao:
- nao quebrar as RPCs atuais;
- criar RPCs v2 space-aware;
- manter as RPCs atuais como wrappers para o space padrao enquanto a UI nao migra.

### Futuras views publicas
Mudanca necessaria:
- o produto precisara de read models publicos especificos para help center.

Recomendacao:
- criar views futuras dedicadas, por exemplo:
  - `vw_public_knowledge_space_resolver`
  - `vw_public_knowledge_navigation`
  - `vw_public_knowledge_articles_list`
  - `vw_public_knowledge_article_detail`
- essas views devem expor somente:
  - `status = published`;
  - `visibility = public`;
  - `knowledge_space.status = active`;
  - dominio ou `space_slug` resolvido.

### Import legado Octadesk
Estado atual:
- o script atual cria categorias e artigos globais (`tenant_id = null`);
- nao existe parametro de destino por help center.

Mudanca necessaria:
- toda importacao precisa saber em qual `knowledge_space` o conteudo vai cair.

Recomendacao:
- evoluir o script para exigir `--space-slug` ou `--knowledge-space-id`;
- preservar `source_path` e `source_hash` por artigo;
- tratar duplicidade por espaco, nao por corpus global inteiro;
- nao assumir que o legado Genius deve cair no mesmo space do After Sale.

### Tickets
Estado atual:
- tickets so conhecem `tenant_id`.

Mudanca futura:
- quando o help center publico existir, o ticket deve preservar o contexto do space de origem.

Recomendacao:
- nao mudar tickets agora;
- planejar campo futuro como `origin_knowledge_space_id` ou tabela de contexto separada;
- isso deve entrar antes de abrir ticket a partir da Central Publica.

### Permissoes
Estado atual:
- KB administrativa e operada por `platform_admin`.

Mudanca futura:
- se houver delegacao por marca, o sistema precisa de papeis de organizacao ou de space.

Recomendacao:
- nao reaproveitar `tenant_memberships` para governanca editorial multi-brand;
- manter `platform_admin` no primeiro rollout;
- introduzir `organization_memberships` quando a operacao pedir editores por marca.

### Auditoria
Estado atual:
- `audit.audit_logs` resolve `tenant_id` quando a entidade carrega esse campo.

Mudanca necessaria:
- em multi-brand, a trilha precisa saber tambem qual `organization` e qual `knowledge_space` foram afetados.

Recomendacao:
- adicionar `organization_id` e `knowledge_space_id` em `audit.audit_logs` na fase de implementacao;
- enquanto isso nao existir, a compatibilidade pode usar `metadata`, mas isso nao deve ser o estado final.

### Public Help Center
Estado atual:
- ainda bloqueado.

Mudanca necessaria:
- o public resolver nao pode depender de tabela base nem de condicao no frontend.
- a camada publica futura deve servir documentacao tecnica B2B e nao fluxos de SAC ao consumidor final.

Recomendacao:
- dominio, `space_slug`, branding e navegacao devem ser resolvidos por backend/view;
- o frontend publico deve apenas renderizar a superficie devolvida.

### IA futura
Estado atual:
- bloqueada.

Mudanca futura:
- indexacao, retrieval e citacao precisam ser space-aware.

Recomendacao:
- chunks e indices devem carregar:
  - `organization_id`;
  - `knowledge_space_id`;
  - `article_id`;
  - `revision_id`;
  - `visibility`;
  - `status`.
- a IA nao deve misturar corpus entre marcas por default.

## Riscos principais de refactor

### Risco 1: usar `tenant` como unico eixo de marca
Impacto:
- mistura conta operacional com identidade publica;
- gera acoplamento ruim entre KB, tickets e dominio.

### Risco 2: alterar constraints da Fase 4 sem camada de convivio
Impacto:
- quebra import legado;
- quebra testes pgTAP;
- aumenta risco de drift entre dado antigo e contrato novo.

### Risco 3: mover o corpus legado global sem dono claro
Impacto:
- o acervo atual importado foi preparado como global;
- no modelo alvo, cada artigo precisa ter destino editorial explicito.

Decisao necessaria antes da implementacao:
- definir qual organization/space recebe o corpus legado Genius atual.

### Risco 4: abrir help center publico antes de public views e auditoria space-aware
Impacto:
- risco de vazamento;
- pouca rastreabilidade por marca;
- dificuldade de governanca futura da IA.

## Plano faseado de implementacao

### Fase 4.1
Entrega desta revisao:
- proposta tecnica;
- ERD textual;
- impacto;
- plano faseado;
- recomendacao final.

### Fase 4.2
Fundacao multi-brand no backend:
- criar `organizations`;
- criar `organization_memberships`;
- criar `knowledge_spaces`;
- criar `knowledge_space_domains`;
- criar `brand_settings`;
- adicionar chaves de transicao sem quebrar contratos existentes.

### Fase 4.3
Backfill e compatibilidade:
- criar um space padrao para cada corpus atual;
- associar KB existente aos novos spaces;
- introduzir views e RPCs v2 space-aware;
- manter wrappers de compatibilidade para o contrato atual.

### Fase 4.4
Camada administrativa nova:
- read models de organizations e spaces;
- filtros editoriais por marca, dominio e status;
- ainda sem abrir Central Publica.

### Fase 4.5
Camada publica:
- resolver dominio e `space_slug`;
- views publicas endurecidas;
- navegacao publica e detalhe de artigo.

### Fase 4.6
Alinhamento de tickets e IA:
- preservar contexto de `knowledge_space` em tickets;
- tornar recomendacao, busca e IA segmentadas por space.

## O que pode ser feito agora
- aprovar o modelo canonico com `knowledge_space` como eixo editorial/publico;
- aprovar `organization` como raiz de governanca;
- decidir se `knowledge_space` tera `owner_tenant_id` no primeiro corte ou apenas em fase posterior;
- decidir qual sera o primeiro space oficial do corpus legado Genius;
- reservar `space_slug` e dominios esperados:
  - `genius`
  - `aftersale`
  - hosts dedicados futuros.

## O que deve esperar
- criacao de migration;
- ajuste de RLS em producao;
- views publicas;
- frontend administrativo de KB;
- frontend da Central Publica;
- abertura de IA sobre KB;
- ticketing space-aware.

## Recomendacao tecnica final
Nao recomendo evoluir a plataforma para multi-brand tentando reutilizar `tenant` como unico eixo de help center. O sistema atual usa `tenant` como unidade operacional de cliente/organizacao isolada. O eixo correto para multiplas centrais publicas e `knowledge_space`.

Nesse contexto, "help center" deve ser lido como documentacao publica tecnica B2B por marca/produto, e nao como central de atendimento ao shopper final.

Portanto, a arquitetura alvo deve ser:
- `organization` para governanca;
- `tenant` para operacao;
- `knowledge_space` para superficie editorial/publica;
- `knowledge_space_domains` para resolucao de host/rota;
- `brand_settings` para identidade visual e institucional.

Implementacao recomendada:
- aditiva;
- sem alterar a Fase 4 em place;
- com backfill controlado;
- com contratos v2;
- mantendo a baseline atual verde ate a migracao completa.
