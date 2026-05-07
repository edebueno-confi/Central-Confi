# Genius Support OS — Design System V3

## 1. Finalidade

Este documento é o contrato visual canônico do **Genius Support OS** para implementação no projeto via Codex.

Ele substitui regras visuais antigas quando houver conflito.

A implementação precisa parecer derivada diretamente dos blueprints aprovados, não apenas inspirada neles.

Este documento define:
- identidade visual;
- paleta light e dark;
- viewport canônica;
- arquitetura de scroll;
- grid e proporções;
- tipografia;
- espaçamento;
- comportamento de telas operacionais;
- regras de UX e copy;
- contratos visuais por domínio/tela.

---

## 2. Princípio absoluto

O Genius Support OS é um cockpit operacional B2B.

Não é:
- dashboard genérico;
- CRM genérico;
- tela CRUD empilhada;
- landing page;
- SAC B2C;
- coleção de cards administrativos.

É:
- estação de trabalho para suporte técnico;
- central de operação de tickets;
- cockpit de clientes B2B;
- gestão editorial de base de conhecimento;
- control plane administrativo;
- base futura para Omni Work, chat interno e chat com cliente.

Cada tela deve comunicar a tarefa pelo layout, não por textos explicativos longos.

---

## 3. Hierarquia de decisão

Para qualquer implementação visual, seguir esta ordem:

1. Blueprint PNG aprovado da tela.
2. Screen spec da tela em `docs/design/screens/*.md`.
3. Este Design System.
4. Contratos reais de dados, views, RPCs e permissões.
5. Implementação atual.

A implementação antiga nunca é argumento para manter:
- layout genérico;
- truncamento ruim;
- scroll global indevido;
- componente inflado;
- componente falso;
- texto técnico no front;
- baixa fidelidade ao blueprint.

Se a implementação atual divergir do blueprint, corrigir para o blueprint.

---

## 4. Viewport canônica

### 4.1 Design principal

A interface deve ser desenhada primeiro para:

```text
1920x1080
```

### 4.2 Validação secundária

Validar também em:

```text
1440x900
```

### 4.3 Breakpoint mínimo desktop operacional

```text
1366px
```

### 4.4 Proibições

Não usar `1024px` ou `1280px` como base principal de composição.

Não comprimir:
- rails;
- tabelas;
- filtros;
- lista central;
- cards de detalhe;
- sidebars.

Se a tela parece boa apenas em 1280px, mas apertada ou pobre em 1920px, está errada.

Em Full HD, a tela deve parecer ampla, profissional e operacional.

---

## 5. Arquitetura de scroll

### 5.1 Regra global para cockpits operacionais

Em telas operacionais com sidebar, grid, lista, thread ou rail:

- `body/page` não deve rolar verticalmente;
- sidebar fica fixa;
- header/topbar fica estável;
- rail direito fica fixo quando existir;
- lista/tabela central rola internamente;
- thread/conversa rola internamente;
- rail direito rola internamente somente se exceder a altura;
- filtros rolam internamente apenas quando inevitável;
- composer fica fixo no rodapé da coluna de conversa;
- não pode haver scroll horizontal;
- não pode haver dupla rolagem descontrolada.

### 5.2 Exceções

Páginas públicas/documentais podem rolar naturalmente:
- `/help/genius`
- `/help/genius/articles/:slug`
- `/login`
- `/access-denied`

Mesmo nessas páginas:
- evitar overflow horizontal;
- preservar hierarquia;
- não quebrar visual.

### 5.3 Ordem de correção quando algo não cabe

1. Remover texto desnecessário.
2. Reduzir altura de cards.
3. Reduzir padding e gaps.
4. Reduzir fonte secundária.
5. Mover conteúdo secundário para tabs.
6. Permitir scroll interno no componente correto.
7. Nunca recorrer a scroll global da página como primeira solução.

---

## 6. Paleta oficial

### 6.1 Brand core

| Uso | Hex |
|---|---|
| Navy principal | `#061B54` |
| Navy profundo | `#04133D` |
| Azul principal | `#2F6BFF` |
| Azul hover/ativo | `#1F58E7` |
| Rosa principal | `#F04AAE` |
| Rosa hover | `#D93898` |

### 6.2 Apoio

| Uso | Hex |
|---|---|
| Azul suave | `#EAF2FF` |
| Azul badge | `#D9E9FF` |
| Rosa suave | `#FFE6F3` |
| Rosa badge | `#FFD4EA` |

### 6.3 Interface light

| Uso | Hex |
|---|---|
| Fundo da aplicação | `#F4F7FC` |
| Superfície/card | `#FFFFFF` |
| Borda padrão | `#DCE4F2` |
| Divisor suave | `#E8EEF7` |
| Texto principal | `#162443` |
| Texto secundário | `#6B7892` |
| Texto fraco | `#98A3B8` |
| Texto sobre navy | `#FFFFFF` |

### 6.4 Estados

| Uso | Hex |
|---|---|
| Success | `#22C55E` |
| Success soft | `#EAF9F0` |
| Warning | `#F5B83D` |
| Warning soft | `#FFF4D9` |
| Danger | `#EF4444` |
| Danger soft | `#FDEBEC` |
| Nota interna | `#FFF4D9` |

---

## 7. Dark mode

Dark mode é tema secundário suportado.

Não é nova marca. Não é modo preto puro. Não deve trocar a identidade visual.

### 7.1 Paleta dark

| Uso | Hex |
|---|---|
| Fundo dark | `#071126` |
| Fundo elevado | `#0B1733` |
| Card dark | `#0F1D3A` |
| Card soft dark | `#132445` |
| Card forte dark | `#172C52` |
| Borda dark | `#263A63` |
| Divisor dark | `#1E3157` |
| Sidebar dark | `#04133D` |
| Sidebar deep dark | `#020A22` |
| Azul dark | `#5B86FF` |
| Azul strong dark | `#2F6BFF` |
| Rosa dark | `#FF6CBE` |
| Rosa strong dark | `#F04AAE` |
| Texto principal dark | `#F5F8FF` |
| Texto secundário dark | `#B7C3DD` |
| Texto fraco dark | `#7F8EAD` |
| Success dark | `#4ADE80` |
| Success soft dark | `#0F2F23` |
| Warning dark | `#FACC15` |
| Warning soft dark | `#352A0D` |
| Danger dark | `#F87171` |
| Danger soft dark | `#3B1418` |
| Nota interna dark | `#3A2D10` |
| Borda nota interna dark | `#6B5215` |

### 7.2 Regras dark

- Não usar preto puro como fundo principal.
- Usar navy e azul escuro como base.
- Cards precisam se destacar do fundo.
- Texto precisa manter contraste alto.
- Rosa continua sendo rosa, não roxo.
- Layout, spacing e hierarquia são os mesmos do light mode.
- Não criar design diferente para dark mode.

### 7.3 Toggle de tema

Se existir toggle:
- Label: `Tema`
- Opções: `Claro`, `Escuro`, `Sistema`
- Não expor labels técnicos como `light`, `dark`, `system`.

---

## 8. Uso de cores

### 8.1 Sidebar

- Fundo: navy principal ou profundo.
- Item ativo: azul principal.
- Texto e ícones: branco/azul muito claro.
- Badge: pequeno, com fundo azul ou rosa conforme contexto.
- Não usar roxo.
- Não usar preto puro.

### 8.2 CTAs

- CTA principal: azul principal ou navy.
- CTA secundário: branco com borda suave.
- Ações destrutivas: vermelho/danger.
- Botões desabilitados precisam ter contraste legível.

### 8.3 Rosa Genius

Usar rosa para:
- acentos de marca;
- detalhes editoriais;
- badges especiais;
- destaques pequenos;
- indicadores não críticos.

Não substituir por roxo/lilás.

---

## 9. Tipografia

### 9.1 Escala operacional

| Elemento | Tamanho | Peso |
|---|---:|---:|
| Título de página | 24–32px | 700 |
| Título de card forte | 17–20px | 700 |
| Título de seção | 15–17px | 650–700 |
| Texto de lista/tabela | 13–14px | 500 |
| Texto de mensagem/chat | 13–14px | 500 |
| Metadados | 11–13px | 500 |
| Labels uppercase | 10–11px | 600 |
| Pills/badges | 10–12px | 600 |
| Botões | 13–14px | 600 |

### 9.2 Regras

- Títulos fortes, mas compactos.
- Não usar fonte pesada em tudo.
- Labels em uppercase apenas para metadados curtos.
- Evitar parágrafos longos em telas operacionais.
- Reduzir tipografia secundária antes de criar scroll global.
- A tela deve parecer “zoom out Full HD”, não inflada.

---

## 10. Espaçamento e dimensões

### 10.1 Dimensões base

| Elemento | Valor recomendado |
|---|---:|
| Padding da página | 24–28px |
| Gap entre colunas | 16–20px |
| Gap compacto | 12–16px |
| Padding de card | 16px |
| Padding denso | 12–14px |
| Radius de card | 18–24px |
| Altura de linha de tabela | 56–72px |
| Altura de KPI compacto | 86–96px |
| Sidebar | 240–260px |
| Coluna de filtros | 260–300px |
| Rail direito | 360–440px |

### 10.2 Regras

- Cards não podem colar texto nas bordas.
- Rails não podem ficar espremidos.
- Lista central deve dominar em telas de operação.
- Se houver truncamento feio, redistribuir colunas.
- Evitar cards com 24px+ de padding em telas densas, salvo blueprint.

---

## 11. Shells

### 11.1 Support Workspace

Usado em:
- `/support/queue`
- `/support/tickets/:ticketId`
- `/support/customers`
- `/support/customers/:tenantId`
- futuras telas de chat cliente e Omni Work

Estrutura:
- sidebar fixa navy;
- área principal full height;
- grid operacional;
- rails contextuais;
- tabs quando houver contexto.

Itens:
- Fila
- Tickets
- Clientes
- Conhecimento
- Admin

Regras:
- logout no card/menu de usuário;
- não usar faixa branca superior apenas para logout;
- não exibir `DEVELOPMENT` ou `AGENT WORKSPACE` em UI final;
- sidebar sempre integrada ao layout.

### 11.2 Admin Console

Usado em:
- `/admin/tenants`
- `/admin/knowledge`
- `/admin/access`
- `/admin/system`

Estrutura:
- sidebar fixa navy;
- label Admin Console;
- header compacto;
- grid preferencial de 3 colunas;
- lista/feed central dominante;
- rail direito forte.

Itens:
- Clientes B2B ou Tenants
- Knowledge ou Conhecimento
- Acesso
- Sistema

Regras:
- não usar navegação horizontal improvisada;
- não parecer CRUD simples;
- usar control plane visual.

---

## 12. Componentes

### 12.1 Cards

Devem ter:
- fundo branco/light ou card dark;
- borda sutil;
- radius 18–24px;
- sombra leve;
- padding 12–16px;
- título claro;
- conteúdo justificado pelo espaço ocupado.

Não usar:
- cards enormes sem função;
- cards aninhados excessivos;
- cards decorativos sem dado/ação.

### 12.2 Pills

Usar para:
- status;
- prioridade;
- categoria;
- visibilidade;
- saúde;
- porte;
- revisão;
- publicação.

Regras:
- pequenas;
- legíveis;
- sem saturação excessiva;
- sem truncar informação crítica.

### 12.3 Botões

- Primário: azul/navy.
- Secundário: branco/transparente com borda.
- Destrutivo: danger.
- Sem função real: remover.
- Botões disabled precisam parecer intencionais.

### 12.4 Tabelas/listas

Regras:
- lista central domina a tela;
- linhas densas;
- título legível;
- subtexto compacto;
- status/categoria/autor visíveis;
- linha selecionada destacada;
- sem truncamento feio de campos essenciais.

### 12.5 Rails direitos

Devem conter:
- resumo;
- metadados;
- ações;
- detalhes;
- contexto útil.

Largura:
- 360–440px em Full HD.

Não usar:
- rail fraco/decorativo;
- accordions fechados como estrutura principal;
- rail comprimido;
- ações escondidas demais.

### 12.6 Tabs

Usar quando houver troca real de contexto.

Regras:
- tab ativa com underline ou estado azul;
- não usar tabs decorativas;
- se funcionalidade ainda não existe, mostrar estado vazio útil.

---

## 13. Regras de copy

Idioma:
- Português brasileiro correto.
- Acentuação obrigatória.
- Copy curta e operacional.

Proibido na UI comum:
- Supabase
- RPC
- schema
- views
- backend
- RLS
- fixture
- seed
- contract/contrato técnico
- role global
- platform_admin cru
- environment
- DEVELOPMENT
- stack trace

A tela deve dizer apenas o que o usuário precisa saber no contexto.

Exemplos bons:
- Entrar
- Fila operacional
- Clientes
- Conhecimento
- Acesso
- Sistema
- Enviar resposta
- Salvar nota interna
- Iniciar revisão
- Publicar atualização
- Ver cliente

---

## 14. Estados

### 14.1 Loading

- Loading deve acontecer dentro do shell correto.
- Nunca tela branca solta.
- Nunca texto bruto.
- Usar skeleton/scaffold quando possível.

### 14.2 Empty state

- Curto.
- Útil.
- Dentro do card/seção correspondente.
- Sem parágrafo longo.

### 14.3 Erro

Erro técnico cru não aparece no front.

Exemplo proibido:
`invalid ticket status transition`

Exemplo correto:
`Não foi possível alterar o status. Verifique a etapa atual do ticket e tente novamente.`

### 14.4 Dados ausentes

Quando campo contratado não tiver valor:

```text
Indisponível
```

Não ocultar silenciosamente.

---

## 15. Tela: Ticket Workspace

Rota:
`/support/tickets/:ticketId`

Objetivo:
estação de atendimento B2B.

Estrutura:
- sidebar fixa;
- sem topbar técnica;
- header compacto;
- tabs: Conversar, Conhecimento, Central de ajuda, Mais ações;
- thread central;
- composer fixo;
- rail direito.

Rail direito:
1. Cliente
2. Ações do ticket
3. Conhecimento relacionado
4. Atividade recente

Composer:
- Resposta pública / Nota interna;
- sem seletor duplicado;
- nota interna com fundo amarelo claro;
- botão muda para `Enviar resposta` ou `Salvar nota interna`.

Scroll:
- thread rola internamente;
- composer fixo;
- body não rola.

---

## 16. Tela: Support Queue

Rota:
`/support/queue`

Objetivo:
bancada de triagem operacional.

Estrutura:
- sidebar Support;
- header compacto;
- coluna esquerda com filtros/triagem;
- lista central dominante;
- preview direito.

Lista central:
- status;
- prioridade;
- título;
- cliente;
- responsável;
- última atividade.

Preview direito:
- título;
- status/prioridade;
- cliente;
- contexto;
- ação principal: Atender ticket;
- ação secundária: Ver cliente, se houver contrato.

---

## 17. Tela: Clientes / Hub de Clientes

Rotas:
- `/support/customers`
- `/support/customers/:tenantId`

Objetivo:
cockpit de contas B2B e futura base para CS.

Estrutura:
- tabs: Contas, Contatos, Migrações, Saúde, Carteiras;
- filtros/segmentação;
- lista central de contas;
- rail de preview.

Conceitos futuros:
- grupo econômico;
- marcas/contas;
- carteira CSM;
- porte do cliente;
- saúde da conta;
- migração;
- contato principal.

Não simular grupo econômico sem contrato real.

---

## 18. Tela: Admin Knowledge

Rota:
`/admin/knowledge`

Objetivo:
cockpit editorial da base de conhecimento.

Estrutura:
- sidebar Admin;
- header Knowledge;
- grid 3 colunas:
  1. filtros editoriais;
  2. lista dominante de artigos;
  3. rail editorial.

Lista:
- título;
- categoria;
- autor;
- data;
- status.

Rail:
- título;
- status;
- categoria;
- autor;
- atualizado em;
- visibilidade;
- versão;
- link público;
- ações editoriais.

Ações:
- Iniciar revisão;
- Editar revisão;
- Publicar atualização;
- Descartar revisão;
- Arquivar.

Se necessário, usar tabs no rail:
- Prévia
- Revisão
- Classificação
- Checklist
- Avançado

Não usar accordions fracos como estrutura principal.

---

## 19. Tela: Admin Access

Rota:
`/admin/access`

Objetivo:
control plane de usuários, papéis, convites e permissões.

Estrutura:
- sidebar Admin;
- header compacto;
- tabs: Usuários, Papéis, Convites, Permissões;
- coluna esquerda com filtros;
- lista central;
- rail de detalhe.

Lista:
- usuário/email;
- papel;
- cliente/tenant;
- status;
- último acesso/criado em.

Rail:
- detalhe do usuário/convite/papel;
- ações reais disponíveis;
- nada de UI falsa.

---

## 20. Tela: Admin System

Rota:
`/admin/system`

Objetivo:
observabilidade administrativa.

Estrutura:
- sidebar Admin;
- header System;
- tabs: Saúde, Auditoria, Jobs, Segurança;
- KPIs compactos;
- coluna esquerda de monitoramento;
- feed central dominante;
- rail de detalhe.

KPIs:
- Checks verdes;
- Alertas;
- Eventos recentes;
- Falhas.

Feed:
- tipo;
- severidade;
- origem;
- resumo;
- data;
- situação.

Rail:
- detalhe operacional;
- contexto;
- impacto;
- ação recomendada.

Não parecer dashboard genérico.

---

## 21. Tela: Admin Tenants / Clientes B2B

Rota:
`/admin/tenants`

Objetivo:
control plane de clientes B2B da Genius.

Linguagem:
- preferir Clientes B2B na UI;
- evitar termo técnico tenant quando não necessário.

Estrutura:
- sidebar Admin;
- header compacto;
- coluna esquerda com filtros/ferramentas;
- lista central dominante;
- rail de cliente selecionado.

Lista:
- cliente/conta;
- grupo, se houver contrato;
- status;
- produto/plano;
- responsável;
- última atualização.

Rail:
- resumo da conta;
- contatos;
- produto/plano;
- status/saúde;
- sinais operacionais;
- ações reais.

Grupo econômico:
- se contrato existir, mostrar;
- se não existir, exibir Indisponível ou registrar lacuna;
- não simular por nome/slug.

---

## 22. Tela: Help Center Público

Rotas:
- `/help/genius`
- `/help/genius/articles/:slug`

Objetivo:
central pública de conhecimento.

Regras:
- não usar sidebar interna navy;
- não expor rascunhos;
- não expor conteúdo interno;
- não usar termos técnicos;
- pode rolar como página documental.

---

## 23. Futuros domínios

### 23.1 Omni Work interno

Objetivo:
chat interno entre equipes/setores.

Estrutura futura:
- sidebar Support;
- coluna de canais;
- feed central;
- composer;
- rail de contexto.

Canais exemplo:
- suporte-operação;
- cs-migrações;
- incidentes;
- integrações;
- produto;
- engenharia.

### 23.2 Chat cliente B2B

Objetivo:
substituir gradualmente grupos de WhatsApp.

Estrutura futura:
- inbox à esquerda;
- conversa central;
- composer;
- rail de cliente/tickets/contexto.

### 23.3 CS / carteiras

Objetivo:
evoluir clientes para operação CS.

Conceitos:
- carteira por CSM;
- porte: pequeno, médio, grande;
- grupo econômico;
- marcas/contas;
- saúde da conta;
- risco;
- migração.

Não implementar sem auditoria de backend/contratos.

---

## 24. Processo obrigatório para Codex

Antes de implementar qualquer tela:

1. Ler blueprint PNG.
2. Ler screen spec.
3. Ler este Design System.
4. Auditar a tela atual.
5. Descrever divergências objetivas.
6. Implementar apenas o escopo.
7. Gerar screenshots em 1920x1080.
8. Validar 1440x900 quando solicitado.
9. Confirmar scroll correto.
10. Rodar typecheck/build.
11. Reportar limitações.

Se a tela não parecer derivada do blueprint, não está pronta.

---

## 25. Critérios de aceite

Uma tela só é aprovada se:

- parece derivada diretamente do blueprint;
- usa a paleta oficial;
- respeita Full HD;
- não parece comprimida;
- não parece dashboard genérico;
- sidebar é fixa e consistente;
- rail direito é forte;
- lista/feed/thread central domina;
- não há truncamento feio de campos essenciais;
- não há overflow horizontal;
- não há scroll global indevido em cockpits;
- copy está em PT-BR com acentuação;
- não há termos técnicos internos no front;
- passa typecheck/build;
- possui screenshot validável por humano.

Não basta estar “melhor”.

Precisa estar correta para a operação.
