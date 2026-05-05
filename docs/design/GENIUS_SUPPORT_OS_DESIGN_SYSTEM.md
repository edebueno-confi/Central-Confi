# Genius Support OS Design System

## 1. Propósito do documento

Este documento é o contrato canônico de design visual do **Genius Support OS**.

Ele deve orientar qualquer refatoração de interface feita por Codex, Lovable, Antigravity ou outro agente de implementação.

As imagens blueprint aprovadas são referências visuais importantes, mas este documento define as regras textuais obrigatórias de layout, densidade, composição, comportamento e aparência.

A regra principal é simples:

> A implementação precisa parecer imediatamente derivada da blueprint aprovada, não apenas “inspirada” por ela.

---

## 2. Princípios de produto

O Genius Support OS é uma plataforma interna de operação CX B2B técnica para SaaS de logística reversa.

Não é:

- SAC B2C.
- Dashboard genérico.
- Landing page.
- CRM visual genérico.
- Central de cards administrativos reaproveitados.

É uma ferramenta operacional para:

- suporte técnico;
- CS;
- tickets;
- base de conhecimento;
- governança;
- contexto de clientes B2B;
- triagem e priorização;
- operação interna entre clientes, suporte e desenvolvimento.

Cada tela deve ser desenhada a partir da tarefa real do usuário.

Exemplo:

- Tela de ticket deve parecer estação de atendimento.
- Tela de fila deve parecer bancada de triagem.
- Tela de cliente deve parecer cockpit de conta B2B.
- Tela de admin deve parecer control plane operacional.
- Central pública deve parecer help center confiável e aprovado.

---

## 3. Linguagem visual geral

### 3.1 Personalidade visual

A interface deve transmitir:

- produto SaaS enterprise;
- operação técnica;
- clareza;
- confiança;
- densidade útil;
- baixo ruído;
- acabamento premium;
- uso diário por equipe interna.

### 3.2 Cores

Base visual:

- fundo geral claro, entre branco, cinza frio e azul muito suave;
- sidebar navy profunda;
- azul vivo para ações primárias;
- branco para superfícies principais;
- cinza azulado para bordas, divisores e textos secundários;
- amarelo suave para estados de espera ou atenção;
- verde suave para estados saudáveis/ativos;
- vermelho suave para risco, erro ou criticidade;
- roxo/pink apenas como acento controlado em ambiente ou marca.

Evitar:

- cores saturadas em excesso;
- múltiplas cores competindo;
- fundos escuros fora da sidebar, exceto cards de preview destacados;
- gradientes chamativos sem função.

### 3.3 Tipografia

A tipografia deve ser moderna, limpa e funcional.

Regras:

- títulos fortes, mas compactos;
- labels em caixa alta apenas para pequenos marcadores, eyebrows e metadados;
- textos secundários em cinza azulado;
- evitar blocos longos em telas operacionais;
- preferir microcopy objetiva;
- não usar copy técnica de implementação em telas de usuário.

Proibido em interface de usuário:

- Supabase Auth;
- backend;
- views;
- RPCs;
- schema;
- role global;
- contratos internos;
- termos técnicos que exponham arquitetura.

---

## 4. Regras de densidade

A UI deve ter densidade operacional.

Não usar:

- cards gigantes sem necessidade;
- headers altos demais;
- espaços vazios extensos;
- listas com espaçamento exagerado;
- composer separado como um bloco inflado;
- painel lateral verboso;
- duplicação de títulos e headers.

Usar:

- headers compactos;
- cards com padding moderado;
- listas densas;
- metadados em linhas curtas;
- painéis laterais estreitos e contextuais;
- abas para troca de contexto;
- hierarquia clara sem inflar a tela.

Referência de densidade:

- ferramenta de trabalho usada o dia todo;
- visual limpo, mas não vazio;
- cada bloco precisa justificar espaço ocupado.

---

## 5. Layout base do Support Workspace

### 5.1 Estrutura geral

O Support Workspace usa:

- sidebar fixa à esquerda;
- fundo claro no workspace;
- topbar compacta;
- conteúdo operacional em grid;
- painéis contextuais à direita quando necessário;
- tabs quando houver troca de contexto.

### 5.2 Sidebar do Support Workspace

A sidebar deve ser navy profunda, refinada e compacta.

Itens canônicos:

- Fila;
- Tickets;
- Clientes;
- Knowledge;
- Admin.

Regras:

- item ativo com fundo azul vivo;
- ícones simples e consistentes;
- logo no topo;
- card de usuário no rodapé;
- não ocupar largura excessiva;
- não parecer menu improvisado;
- não renderizar texto solto durante loading.

### 5.3 Topbar

A topbar deve conter:

- pill `DEVELOPMENT`, quando ambiente local/dev;
- pill `AGENT WORKSPACE`;
- botão `Encerrar sessão` no canto direito.

Evitar:

- múltiplas barras de topo;
- headers redundantes;
- botões de ação fora de contexto.

---

## 6. Layout base do Admin Console

O Admin Console é um control plane para platform admin.

### 6.1 Sidebar

A sidebar também deve ser navy, mas com identidade de Admin Console.

Itens canônicos:

- Tenants;
- Knowledge;
- Access;
- System.

### 6.2 Header

Deve conter:

- pill `DEVELOPMENT`;
- pill `PLATFORM_ADMIN`;
- título da área;
- subtítulo operacional;
- ações compactas no canto direito.

### 6.3 Grid preferencial

O layout padrão do Admin Console deve usar 3 colunas:

1. ferramentas/filtros/resumo;
2. lista/base principal;
3. painel contextual do item selecionado.

A coluna direita deve ser útil e densa, não decorativa.

---

## 7. Layout base da Central Pública

A Central Pública não deve usar a sidebar navy interna.

Ela deve parecer help center público, mas alinhado ao produto.

Estrutura:

- coluna esquerda clara com cards contextuais;
- hero central com busca;
- painel lateral informativo;
- cards de categorias;
- artigos publicados;
- linguagem simples e pública.

Regras:

- mostrar apenas conteúdo público e aprovado;
- não expor material interno;
- não usar termos de backend;
- visual confiável, leve e organizado.

---

## 8. Tabs

Tabs são obrigatórias quando houver troca de contexto dentro da mesma entidade ou área.

Não criar outra tela quando a troca for contextual.

Exemplos canônicos:

### Ticket

- Conversar;
- Conhecimento;
- Central de ajuda;
- Mais ações.

### Clientes

- Contas;
- Contatos;
- Migrações;
- Saúde.

### Tenant/Admin

- Resumo;
- Membros;
- Status;
- Atividade.

### Central Pública

- Visão geral;
- Artigos;
- Categorias.

Regras:

- aba ativa com underline azul;
- tabs compactas;
- não usar tabs como decoração;
- cada tab precisa mudar contexto real.

---

## 9. Componentes canônicos

### 9.1 Cards

Cards devem ter:

- fundo branco;
- borda sutil;
- raio moderado;
- sombra leve;
- padding controlado.

Evitar:

- cards enormes;
- cards aninhados sem necessidade;
- excesso de bordas fortes;
- muitos cards para informação simples.

### 9.2 Pills

Usar pills para:

- status;
- prioridade;
- severidade;
- plano;
- ambiente;
- contadores compactos.

Pills devem ser pequenas, legíveis e consistentes.

### 9.3 Botões

Botão primário:

- azul vivo;
- usado para ação principal da seção.

Botão secundário:

- branco ou transparente;
- borda sutil;
- texto navy/azul.

Proibido criar botões fora do contrato da tela.

### 9.4 Rails direitos

Rails direitos devem ser:

- estreitos;
- contextuais;
- densos;
- úteis para decisão;
- organizados em seções empilhadas.

Não devem parecer dashboard lateral genérico.

### 9.5 List rows

Listas devem ser densas e escaneáveis.

Cada linha deve conter:

- título forte;
- status/pill;
- metadados essenciais;
- última atividade;
- ação contextual discreta.

Linha selecionada:

- fundo azul muito claro;
- borda ou indicador azul;
- sem exagero visual.

### 9.6 Empty states

Estados vazios devem estar dentro do shell correto.

Nunca renderizar:

- tela branca solta;
- texto bruto;
- loading genérico fora do layout;
- erro sem contexto.

### 9.7 Loading states

Loading deve preservar:

- sidebar;
- topbar;
- estrutura geral da tela;
- skeletons ou scaffolds coerentes.

---

## 10. Ticket Workspace

A tela de ticket é uma estação de atendimento.

Ela deve ser centrada em thread/chat profissional.

### 10.1 Estrutura obrigatória

- sidebar navy;
- topbar compacta;
- header compacto do ticket;
- tabs: Conversar, Conhecimento, Central de ajuda, Mais ações;
- thread central;
- composer integrado;
- rail direito contextual.

### 10.2 Header do ticket

Deve ser compacto.

Conteúdo:

- status;
- prioridade;
- short id;
- título;
- cliente;
- solicitante;
- responsável;
- última atualização.

Não pode dominar a página.

### 10.3 Thread

A thread deve parecer conversa real.

Regras:

- cliente à esquerda;
- agente à direita;
- nota interna com visual próprio;
- timestamps discretos;
- bolhas compactas;
- anexos em pills;
- sem aparência de lista de cards administrativos.

### 10.4 Composer

O composer deve ser acoplado ao fim da conversa.

Deve conter:

- abas ou toggle: Resposta pública / Nota interna;
- área de texto;
- ícones de ação;
- seletor de visibilidade;
- botão Enviar resposta.

Não deve parecer card gigante separado.

### 10.5 Rail direito do ticket

Seções:

- Ações do ticket;
- Cliente;
- Conhecimento relacionado;
- Atividade recente.

Regras:

- CTA de cliente apenas no card Cliente;
- não adicionar `Abrir ERP`;
- não adicionar `Abrir cliente` na toolbar superior;
- rail deve ser compacto.

---

## 11. Fila operacional

A tela de fila é bancada de triagem.

Estrutura:

- tabs de contexto no topo;
- KPIs compactos;
- coluna esquerda com triagem e filtros;
- lista central de tickets;
- preview lateral do ticket selecionado.

Objetivo:

- decidir rapidamente qual atendimento puxar;
- priorizar urgência, responsável e estado;
- evitar entrar em ticket sem contexto.

Não deve parecer apenas lista genérica.

---

## 12. Clientes

A tela de clientes é cockpit de contas B2B.

Estrutura:

- tabs: Contas, Contatos, Migrações, Saúde;
- KPIs de base;
- segmentação/filtros à esquerda;
- lista central de contas prioritárias;
- preview contextual à direita.

O cliente selecionado deve exibir:

- plataforma;
- produto;
- responsável;
- saúde/risco;
- contato principal;
- sinais da conta;
- ações operacionais.

---

## 13. Admin Tenants

A tela de Tenants é control plane de clientes B2B.

Estrutura:

- sidebar Admin Console;
- ferramentas de tenants à esquerda;
- base de tenants no centro;
- tenant selecionado à direita;
- tabs internas no detalhe: Resumo, Membros, Status, Atividade.

Não deve parecer apenas CRUD.

Deve permitir:

- localizar tenant;
- verificar status;
- entender memberships;
- abrir contexto operacional;
- revisar atividade recente.

---

## 14. Help Center Público

A central pública é uma camada aprovada de conhecimento externo.

Estrutura:

- coluna esquerda clara;
- hero com headline e busca;
- painel explicativo;
- navegação por artigos/categorias;
- últimos publicados.

Não usar sidebar interna navy.

Não expor:

- rascunhos;
- conteúdo interno;
- termos técnicos de implementação;
- dados sensíveis.

---

## 15. Regras de campos indisponíveis

Quando valores retornarem `null`, vazios ou não disponíveis, a UI deve exibir:

> Indisponível

Nunca ocultar o campo silenciosamente quando ele fizer parte do contrato visual.

Exemplos:

- responsável;
- contato;
- telefone;
- plano;
- última atividade;
- status derivado.

---

## 16. Proibições visuais globais

É proibido:

- transformar a tela em dashboard genérico;
- reaproveitar cards antigos sem adaptar à função da tela;
- criar tela branca/loading solto;
- esconder campos contratados;
- criar ações fora do contrato visual;
- usar textos técnicos de backend em tela de usuário;
- inflar headers;
- usar composer gigante separado;
- transformar thread em lista espaçada;
- adicionar `Abrir ERP`;
- adicionar `Abrir cliente` na toolbar superior do ticket;
- deixar sidebar ou shell quebrados durante boot;
- considerar HTTP 200 como sucesso visual.

---

## 17. Processo obrigatório para implementação

Antes de refatorar qualquer tela, o agente deve:

1. Ler este documento.
2. Ler o screen spec da tela, se existir.
3. Verificar a blueprint PNG aprovada da tela.
4. Auditar a tela atual.
5. Identificar diferenças visuais objetivas.
6. Implementar apenas a tela solicitada.
7. Não alterar backend, schema, migrations, RPCs, contracts ou fixtures sem autorização explícita.
8. Preservar contratos de dados existentes.
9. Gerar screenshot final.
10. Reportar limitações visuais restantes.

---

## 18. Critérios de aceite visual

Uma tela só pode ser considerada aprovada se:

- lembrar imediatamente a blueprint aprovada;
- respeitar composição e densidade;
- não parecer apenas uma adaptação da tela antiga;
- usar os componentes canônicos;
- preservar o shell correto;
- não tiver texto bruto solto;
- não tiver scroll horizontal indevido;
- não tiver loading quebrado;
- não expuser termos técnicos internos;
- passar typecheck/build;
- tiver screenshot final validável por humano.

Não basta estar mais bonita.

Tem que estar correta para a função operacional do domínio.

---

## 19. Ordem recomendada de redesign por tela

Telas já com direção visual aprovada:

- Login;
- Support Ticket Workspace;
- Support Queue;
- Support Clientes;
- Help Center Público;
- Admin Tenants.

Próximas telas recomendadas:

1. Support Customer Detail;
2. Knowledge interno do suporte;
3. Admin Knowledge;
4. Admin Access;
5. Admin System;
6. Artigo público;
7. Lista pública de artigos;
8. Access denied;
9. Estados vazios/loading/erro.

---

## 20. Regra final

Sempre que houver conflito entre:

- tela antiga;
- componente reaproveitado;
- interpretação livre do agente;
- blueprint aprovada;
- este documento;

A prioridade é:

1. este documento;
2. screen spec da tela;
3. blueprint PNG aprovada;
4. contratos de dados existentes;
5. implementação antiga.

A implementação antiga nunca deve ser usada como justificativa para manter layout genérico, espaçamento excessivo ou comportamento visual inferior.
