# Admin Tenants Blueprint Spec

## Tela

`/admin/tenants`

## Propósito

Superfície administrativa para operar a base de clientes B2B da Genius.

A palavra técnica `tenant` não deve dominar a interface. Na UI final, a linguagem principal é:
- Clientes B2B
- Conta
- Responsável
- Status
- Contexto operacional

## Fonte de verdade visual

Prioridade:
1. `docs/design/blueprint/Tenants.png`
2. Shell Admin Console já aprovada em `/admin/knowledge`, `/admin/access` e `/admin/system`
3. `docs/design/GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`

Se a implementação parecer um dashboard genérico ou um CRUD adaptado, está fora do contrato.

## Viewport canônica

- Primária: `1920x1080`
- Validação desktop adicional: `1440x900`
- Breakpoint mínimo operacional: `1366px`

Não comprimir a composição principal para caber em `1024px`.

## Shell

### Sidebar

- largura fixa entre `240px` e `260px`
- navy profundo
- branding `Genius Support OS`
- subtítulo `Admin Console`
- item ativo com pill azul forte
- logout no card do usuário no rodapé
- botão de recolher/expandir fora da massa principal da sidebar

### Topo da página

- sem faixa branca decorativa separada
- sem pills técnicas `Development` / `Platform_admin`
- o cabeçalho da própria tela deve ocupar o topo útil

## Composição principal

Grid de 3 colunas reais.

### Larguras de referência em desktop wide

- coluna esquerda: `260px` a `300px`
- coluna central: `minmax(0, 1fr)` dominante
- rail direito: `380px` a `440px`
- gap entre colunas: `16px` a `20px`

Em `1920x1080`, a tela precisa parecer ampla. O centro deve dominar, mas o rail precisa continuar útil.

## Regras de scroll

- a página principal não deve depender de rolagem vertical para a operação normal em `1920x1080`
- a coluna esquerda não deve rolar
- a coluna central pode rolar internamente quando a lista exceder a altura
- o rail direito pode ter scroll interno próprio quando a atividade ou os detalhes excederem a viewport
- não pode haver overflow horizontal

## Cabeçalho da tela

### Conteúdo

- título: `Clientes B2B`
- subtítulo curto, operacional
- CTA principal no canto direito: `+ Novo cliente`

### Estilo

- card branco com radius amplo
- padding `16px` a `20px`
- sem copy longa

## Coluna esquerda

### Objetivo

Apoiar a operação sem disputar protagonismo com a lista central.

### Blocos obrigatórios

1. `Ferramentas`
2. `Resumo da base`
3. `Ações rápidas`
4. `Filtros`

### Regras visuais

- cards compactos
- padding interno `16px`
- gap entre blocos `12px`
- tipografia menor que a do centro
- alturas contidas

### Resumo da base

Indicadores em grade 2x2:
- Clientes
- Ativos
- Suspensos
- Contatos

Regras:
- tiles baixas
- helper text curto
- nenhuma quebra feia

### Ações rápidas

Botões:
- compactos
- mais desenhados que “botões de formulário”
- alturas contidas
- sem ocupar altura demais

### Filtros

Filtros mínimos:
- Status
- Memberships
- Última atualização

Observação:
- filtro por grupo econômico só entra quando houver contrato real

## Coluna central

### Objetivo

Ser a superfície dominante da tela.

### Estrutura

- título `Base de clientes`
- contador do recorte atual
- busca
- ordenação
- lista principal
- rodapé simples de paginação/contagem

### Lista de clientes

Cada item precisa comunicar:
- nome da conta
- razão social
- status
- memberships
- grupo econômico, se houver contrato real
- se não houver, usar `Grupo: Indisponível`
- contato principal
- plano/produto, quando o contrato permitir
- última atualização

### Regras visuais

- cards densos
- hierarquia forte no nome
- metadados em linhas curtas
- sem truncamento grotesco
- seleção com highlight azul claro
- centro deve usar o espaço restante sem parecer espremido

## Rail direito

### Objetivo

Ser um painel operacional forte, não decorativo.

### Conteúdo base

- label `Cliente selecionado`
- título `Contexto operacional`
- avatar/monograma
- status
- memberships
- nome da conta
- razão social
- contato principal
- CTA contextual
- tabs:
  - Resumo
  - Membros
  - Status
  - Atividade

### Tab Resumo

Deve conter:
- métricas rápidas
- informações da conta
- saúde e risco
- ações reais disponíveis
- contatos vinculados

### Tab Membros

- memberships do cliente
- role
- status
- identificadores úteis

### Tab Status

- edição do status contratualmente suportado
- feedback amigável

### Tab Atividade

- feed vertical
- o rail pode rolar internamente aqui

## Grupo econômico

Estado atual do produto:
- a tela deve estar preparada para exibir `Grupo`
- hoje o contrato real ainda não materializa `account_group` / `holding` / hierarquia explícita para a UI

Regra:
- não simular agrupamento no front
- quando o contrato não existir, usar `Indisponível`
- deixar a composição preparada para futura leitura por grupo

## Tipografia

- labels pequenas, uppercase quando fizer sentido
- títulos compactos e fortes
- metadados entre `0.78rem` e `0.92rem`
- evitar peso excessivo

## Espaçamento

- padding interno de cards: `16px`
- gap entre cards: `12px` a `16px`
- evitar texto colado nas bordas

## Critérios de aceite

- parece derivado diretamente do blueprint `Tenants.png`
- a composição funciona como cockpit em `1920x1080`
- a coluna central domina
- o rail direito tem largura e leitura úteis
- a coluna esquerda apoia sem crescer demais
- a página não parece comprimida
- não existe truncamento ruim nos elementos principais
- o rail direito pode rolar internamente quando necessário
