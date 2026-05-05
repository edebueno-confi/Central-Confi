# CUSTOMER_ACCOUNT_PROFILE_SPEC.md

## Objetivo
Definir o dominio de perfil operacional do cliente B2B dentro do Genius Support OS para que suporte e CS tenham contexto real durante a tratativa de tickets, sem inflar o produto para um CRM genérico e sem abrir schema ou frontend nesta fase.

## Premissas
- o Genius Support OS atende operacao B2B de SaaS de logistica reversa
- o sujeito modelado aqui e o cliente B2B contratado, nunca o shopper final
- backend continua sendo source of truth
- o perfil do cliente existe para apoiar suporte, CS, governanca e portal B2B futuro
- `tenant` continua sendo a unidade operacional principal
- nao assumir que Genius Returns e After Sale sao sempre o mesmo tenant; o portfolio deve permitir um ou mais produtos por cliente conforme o contrato real

## Problema que o spec resolve
Hoje o Support Workspace conhece apenas o contexto minimo do ticket:
- tenant
- contatos ativos
- tickets recentes
- eventos recentes

Isso e suficiente para reentrar em um atendimento, mas nao para responder com seguranca perguntas como:
- qual produto este cliente usa
- qual plataforma de e-commerce ele opera
- que integracoes estao ativas
- que regras especiais ou excecoes operacionais existem
- quem e o contato tecnico correto
- que restricao comercial ou operacional o suporte precisa respeitar

## Escopo do perfil operacional do cliente
O Customer Account Profile deve representar seis blocos canonicos.

### 1. Identificacao operacional do cliente
Campos e conceitos necessarios:
- `tenant`
- razao social
- nome comercial
- status operacional
- locale e regiao, quando relevantes para a operacao
- ambiente/plataforma contratada
- produtos ativos:
  - Genius Returns
  - After Sale
  - produtos futuros

Funcao no suporte:
- identificar rapidamente quem esta sendo atendido
- evitar erro de produto, tenant ou ambiente
- separar cliente ativo, suspenso, onboarding e legado

### 2. Contrato e plano
Campos e conceitos necessarios:
- plano contratado
- escopo operacional
- modulos habilitados
- funcionalidades extras
- limites relevantes para suporte
- observacoes comerciais uteis para atendimento

Exemplos de limites relevantes:
- volume contratado
- recursos premium
- canais habilitados
- regras especiais de atendimento

Funcao no suporte:
- impedir que o agente oriente o cliente como se ele tivesse um modulo nao contratado
- contextualizar escopo e expectativa do atendimento

### 3. Stack do cliente
Campos e conceitos necessarios:
- plataforma de e-commerce
  - VTEX
  - Wake
  - Shopify
  - Magento
  - outra
- ERP principal
- OMS principal
- gateways e meios de estorno, quando aplicavel
- integracoes logisticas:
  - Correios
  - Intelipost
  - transportadoras
- APIs proprias
- integracoes customizadas
- transportadoras habilitadas

Funcao no suporte:
- dar contexto tecnico antes da resposta
- evitar troubleshooting cego
- acelerar escalonamento para engenharia quando a causa depende da stack

### 4. Customizacoes e excecoes operacionais
Campos e conceitos necessarios:
- regras especiais
- fluxos customizados
- excecoes operacionais
- integracoes sob medida
- alertas de suporte

Funcao no suporte:
- registrar o que foge do fluxo padrao do produto
- preservar conhecimento operacional que hoje se perde em conversa informal
- proteger o time contra respostas padrao em clientes customizados

### 5. Contatos
Campos e conceitos necessarios:
- contato operacional
- contato tecnico ou TI
- contato financeiro
- contato de CS
- canais preferenciais
- prioridade por tipo de assunto, quando houver

Funcao no suporte:
- saber quem deve receber cada tipo de devolutiva
- separar assunto tecnico de financeiro ou operacional
- reduzir handoff errado

### 6. Observacoes internas
Campos e conceitos necessarios:
- riscos conhecidos
- restricoes de atendimento
- historico relevante
- links e documentos uteis
- alertas operacionais

Funcao no suporte:
- preservar contexto interno sensivel sem expor ao cliente
- registrar instrucoes que impactam atendimento, mas nao pertencem ao ticket isolado

## Fronteiras do dominio

### O que pertence ao cadastro do cliente
Deve ficar no perfil do cliente:
- identificacao operacional
- portfolio de produtos ativos
- status operacional do tenant
- classificacoes estruturais do cliente

Nao deve ficar no ticket:
- nome comercial
- stack base
- contatos persistentes
- customizacoes permanentes

### O que pertence ao contrato ou plano
Deve ficar em camada propria de contrato:
- plano
- modulos habilitados
- escopo contratado
- funcionalidades extras
- limites operacionais relevantes
- observacoes comerciais uteis ao suporte

Nao deve ficar misturado com:
- stack tecnica
- contatos
- observacoes internas livres

### O que pertence a integracoes
Deve ficar em camada propria de stack e integracoes:
- plataforma de e-commerce
- ERP
- OMS
- gateways
- APIs proprias
- transportadoras e conectores logisticos

Nao deve ficar no bloco comercial:
- porque suporte precisa consultar isso tecnicamente, mesmo sem olhar o contrato inteiro

### O que pertence a customizacoes
Deve ficar em camada propria de excecoes:
- regras especiais
- fluxos sob medida
- integracoes customizadas
- alertas operacionais

Nao deve ficar espalhado em notas de ticket:
- porque o ticket e historico transacional, nao cadastro persistente

### O que pertence apenas ao ticket
Deve continuar no ticket:
- problema atual
- impacto atual
- conversa
- notas internas do caso
- transicoes de status
- atribuicao
- evidencias e anexos do atendimento

## O que deve aparecer no ticket
Na tratativa do ticket, o agente precisa ver primeiro:
- nome comercial ou nome operacional do cliente
- produto ativo relacionado ao ticket
- stack principal resumida
- responsavel atual
- contatos ativos mais relevantes
- alertas de customizacao ou restricao operacional

Deve aparecer como apoio, nao como painel dominante:
- tickets recentes do cliente
- eventos recentes
- observacoes internas resumidas

## O que deve ficar oculto ou avancado
Deve ficar recolhido por padrao:
- detalhes completos de contrato
- lista longa de integracoes secundarias
- observacoes internas extensas
- links e documentos historicos
- detalhes tecnicos sensiveis de API ou credenciais

## Editabilidade por papel

### Suporte e CS podem editar
Somente dados operacionais de baixo risco, se a governanca futura permitir:
- contatos operacionais
- observacoes operacionais internas
- alertas de suporte
- classificacoes nao sensiveis de atendimento

### Exige permissao administrativa
Deve exigir camada administrativa ou fluxo governado:
- portfolio de produtos ativos
- modulos e plano contratado
- stack oficial do cliente
- customizacoes estruturais
- status operacional do tenant
- flags sensiveis que alteram leitura ou comportamento do suporte

### Nunca deve aparecer em area publica
Dados sensiveis que precisam continuar internos:
- credenciais
- segredos
- tokens
- endpoints internos
- detalhes de integracao que exponham superficie sensivel
- observacoes internas
- restricoes comerciais sigilosas
- alertas de risco

## Impacto nos dominios e contratos atuais

### `tenants`
Impacto esperado:
- `tenants` segue sendo ancora operacional do cliente
- o spec sugere que parte da identificacao operacional continue perto de `tenant`
- nao e suficiente usar apenas `tenants` para stack, contrato ou customizacao

### `tenant_contacts`
Impacto esperado:
- `tenant_contacts` cobre parte do bloco de contatos
- ainda nao cobre tipologia completa de contatos B2B para suporte, TI, financeiro e CS
- falta distinguir melhor finalidade e prioridade de contato

### `vw_support_customer_360`
Impacto esperado:
- hoje entrega contexto minimo
- no futuro deve evoluir para resumo contratual e operacional, sem trazer payload infinito
- nao deve virar view monolitica que mistura tudo em um unico read model pesado

### Support Workspace
Impacto esperado:
- o rail do ticket deve consumir um resumo curto do Customer Account Profile
- `/support/customers/:tenantId` deve virar a superficie de leitura aprofundada desse perfil
- suporte nao pode depender de memoria informal do cliente

### Customer Portal B2B futuro
Impacto esperado:
- parte do perfil podera ser visivel ao proprio cliente
- contatos, stack publica relevante e modulos contratados podem ganhar superficie controlada
- observacoes internas e riscos nunca migram para o portal

### Tickets
Impacto esperado:
- ticket continua transacional
- ticket pode referenciar fatias do perfil do cliente, mas nao substitui esse cadastro
- o perfil ajuda a qualificar triagem, resposta e escalonamento

### Permissoes e RLS
Impacto esperado:
- parte do perfil precisara de visibilidade por tenant
- parte do perfil sera interna a suporte/CS
- parte do perfil sera administrativa
- o desenho futuro precisa separar claramente leitura publica, leitura autenticada do cliente e leitura interna

### Auditoria
Impacto esperado:
- alteracoes de stack, modulos, customizacoes e observacoes internas relevantes devem ser auditadas
- o perfil do cliente nao pode virar campo livre sem trilha de alteracao

### Knowledge Base
Impacto esperado:
- artigos e runbooks futuros podem apontar para perfis de stack e customizacao
- vinculo ticket -> KB continua fora desta fase, mas o profile fornece base contextual para esse vinculo futuro

## Lacunas atuais
- nao existe entidade dedicada para contrato e plano do cliente
- nao existe entidade dedicada para stack operacional do cliente
- nao existe entidade dedicada para customizacoes e excecoes
- `tenant_contacts` ainda e raso para o uso operacional desejado
- `vw_support_customer_360` ainda opera como resumo minimo, nao como perfil operacional completo
- o Support Workspace ainda nao tem resumo estruturado de produto ativo, plano ou stack

## Proposta faseada de implementacao

### Fase 6.5
- produzir e aprovar este spec
- alinhar fronteiras do dominio antes de qualquer schema change

### Fase 6.6
- revisar modelo de dados minimo para:
  - perfil operacional do cliente
  - contrato/plano
  - stack e integracoes
  - customizacoes e alertas
- definir o que nasce como tabela dedicada e o que continua em estruturas existentes

### Fase 6.7
- propor contratos de leitura administrativos e de suporte:
  - resumo curto para ticket
  - perfil operacional completo para `/support/customers/:tenantId`
- definir boundaries de authz e RLS

### Fase 6.8
- implementar backend minimo
- read models
- escrita via RPC
- auditoria

### Fase 6.9
- evoluir UI do Support Workspace e, depois, o portal B2B futuro com base nesse perfil

## Direcao de MVP
Para nao inflar o MVP, o primeiro corte futuro deve focar em:
- produto ativo
- plano resumido
- plataforma de e-commerce
- integracoes principais
- customizacoes de alto impacto
- contatos por finalidade
- observacoes internas curtas e auditadas

Tudo que for analitico, comercial demais ou volumoso deve ficar fora do primeiro corte.

## Fora de escopo desta fase
- migration
- schema
- read models novos
- RPCs novas
- frontend
- CRM generico
- modelagem de shopper final
