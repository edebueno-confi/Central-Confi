# PLATFORM_FAQ_STRATEGY.md

## Objetivo
Definir como a futura FAQ oficial do Genius Support OS sera produzida sem chute editorial, sempre a partir do que ja existe no produto, no backend e na documentacao aprovada.

## Premissa
- A FAQ da plataforma nao e material de marketing.
- A FAQ da plataforma nao antecipa funcionalidade futura.
- A FAQ da plataforma nasce apenas de comportamento implementado, validado e documentado.
- Cada resposta futura precisa apontar para uma fonte oficial rastreavel no repositorio.

## Publico-alvo
- `platform_admin`
- suporte interno
- CS
- engenharia e produto
- cliente B2B no futuro, quando houver superficie apropriada

## Ambientes que vao alimentar a FAQ

### Admin Console
- governanca de acesso
- tenants, organizations e knowledge spaces
- auditoria administrativa
- operacao global de plataforma

### Knowledge Base Admin
- curadoria editorial
- criacao e revisao de categorias e artigos
- publicacao, arquivamento e versionamento
- compatibilidade space-aware

### Public Help Center
- leitura publica de documentacao tecnica B2B
- branding publico seguro
- navegacao por categorias e artigos
- busca publica textual simples

### Support Workspace futuro
- operacao de tickets
- triagem, atribuicao e comunicacao tecnico-operacional
- vinculacao entre ticket e conhecimento oficial

### Engineering Workspace futuro
- bugs, incidentes, backlog tecnico e handoff com suporte/CS
- status tecnico de demandas e trilha de decisao

### Customer Portal B2B futuro
- experiencia autenticada do cliente B2B
- consulta de documentacao, chamados e comunicacao operacional

## Regra de geracao
- uma entrada de FAQ so pode nascer de funcionalidade implementada e validada
- toda fase aprovada deve deixar evidencia suficiente para alimentar FAQ futura
- nenhuma resposta pode depender de comportamento nao entregue
- nenhuma resposta pode depender de memoria oral do time
- contratos de views, RPCs, telas aprovadas e docs de checkpoint sao as fontes primarias

## Fontes oficiais permitidas
- documentos estrategicos em `docs/`
- `PROJECT_STATE.md`
- `VIEW_RPC_CONTRACTS.md`
- `KNOWLEDGE_BASE_STRATEGY.md`
- fases e revisoes arquiteturais aprovadas
- read models e RPCs contratuais efetivamente materializados
- telas e rotas ja entregues e validadas
- ledger documental por fase

## Estrutura futura por entrada
Cada entrada futura da FAQ deve registrar no minimo:
- pergunta
- resposta
- ambiente
- perfil autorizado
- funcionalidade relacionada
- fonte documental
- status
- ultima revisao

## Status sugerido por entrada
- `draft`
- `validated`
- `deprecated`
- `blocked`

## Fluxo de manutencao recomendado
1. encerrar a fase com implementacao e validacao
2. atualizar `PROJECT_STATE.md` e documentos de dominio afetados
3. registrar a fase no `DOCUMENTATION_LEDGER.md`
4. extrair perguntas recorrentes a partir da entrega real
5. escrever FAQ somente para o que ja esta `validated`
6. revisar FAQ sempre que contrato, tela ou fluxo mudar

## O que nao pode entrar na FAQ
- feature prometida mas nao entregue
- comportamento dependente de ajuste manual nao documentado
- workaround temporario sem dono
- resposta baseada em HTML legado
- regra de seguranca inferida apenas pelo frontend
- fluxo de IA antes da governanca oficial dessa camada

## Relacao com a Knowledge Base
- a FAQ futura e um recorte orientado a pergunta e resposta
- a Knowledge Base continua sendo o repositório editorial principal
- uma resposta de FAQ deve preferir resumir e apontar para o artigo oficial correspondente
- quando nao houver artigo oficial validado, a FAQ nao deve inventar o conteudo

## Regra para fases futuras
Toda nova fase aprovada deve responder explicitamente:
- que funcionalidade real ela adicionou
- que ambientes foram afetados
- quais views/RPCs/rotas passaram a existir ou mudar
- se o comportamento esta apto a virar pergunta de FAQ
- qual documento oficial passa a ser fonte dessa resposta
