# Genius Support OS Design System

## 1. Propósito do documento

Este documento é o contrato canônico de design visual do **Genius Support OS**.

Ele deve orientar qualquer refatoração de interface feita por Codex, Lovable, Antigravity ou outro agente de implementação.

As imagens blueprint aprovadas são referências visuais obrigatórias. Este documento define as regras textuais globais de layout, densidade, composição, comportamento e aparência.

Regra principal:

> A implementação precisa parecer imediatamente derivada da blueprint aprovada, não apenas “inspirada” por ela.

---

## 2. Hierarquia de decisão

Para qualquer refatoração visual, a prioridade é:

1. Blueprint PNG aprovada da tela.
2. Screen spec da tela.
3. Este Design System.
4. Contratos de dados existentes.
5. Implementação antiga.

A implementação antiga nunca deve justificar layout genérico, espaçamento excessivo, dupla rolagem, componentes falsos ou comportamento visual inferior.

Quando o screen spec contradizer a blueprint, o agente deve seguir a blueprint e registrar a divergência no relatório final.

---

## 3. Princípios de produto

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

Exemplos:
- Tela de ticket deve parecer estação de atendimento.
- Tela de fila deve parecer bancada de triagem.
- Tela de cliente deve parecer cockpit de conta B2B.
- Tela de admin deve parecer control plane operacional.
- Central pública deve parecer help center confiável e aprovado.

---

## 4. Linguagem visual geral

### 4.1 Personalidade visual

A interface deve transmitir:
- produto SaaS enterprise;
- operação técnica;
- clareza;
- confiança;
- densidade útil;
- baixo ruído;
- acabamento premium;
- uso diário por equipe interna.

### 4.2 Cores

Base visual:
- fundo geral claro, entre branco, cinza frio e azul muito suave;
- sidebar navy profunda;
- azul vivo para ações primárias;
- branco para superfícies principais;
- cinza azulado para bordas, divisores e textos secundários;
- amarelo suave para estados de espera, atenção e nota interna;
- verde suave para estados saudáveis/ativos;
- vermelho suave para risco, erro ou criticidade;
- roxo/pink apenas como acento controlado.

Evitar:
- cores saturadas em excesso;
- múltiplas cores competindo;
- fundos escuros fora da sidebar, exceto cards de preview destacados;
- gradientes chamativos sem função.

### 4.3 Tipografia

A tipografia deve ser moderna, limpa e funcional.

Regras:
- títulos fortes, mas compactos;
- labels em caixa alta apenas para pequenos marcadores, eyebrows e metadados;
- textos secundários em cinza azulado;
- evitar blocos longos em telas operacionais;
- preferir microcopy objetiva;
- não usar copy técnica de implementação em telas de usuário.

Escala recomendada para telas operacionais:
- page title: 20px a 24px, peso 650 a 700;
- section title: 14px a 16px, peso 600;
- labels/metadados: 10px a 12px, peso 600, letter spacing leve;
- body: 12px a 14px;
- pills: 10px a 12px;
- botões compactos: 12px a 14px.

Proibido em interface de usuário comum:
- Supabase Auth;
- backend;
- views;
- RPCs;
- schema;
- role global;
- contratos internos;
- environment;
- DEVELOPMENT;
- dev;
- platform_admin cru;
- termos técnicos que exponham arquitetura.

Exceção:
- telas explicitamente técnicas para platform_admin podem mostrar detalhes operacionais técnicos quando forem necessários para diagnóstico, nunca como decoração.

---

## 5. Regras de densidade

A UI deve ter densidade operacional.

Não usar:
- cards gigantes sem necessidade;
- headers altos demais;
- espaços vazios extensos;
- listas com espaçamento exagerado;
- composer separado como bloco inflado;
- painel lateral verboso;
- duplicação de títulos e headers;
- dupla rolagem;
- toolbars decorativas;
- componentes sem função.

Usar:
- headers compactos;
- cards com padding moderado;
- listas densas;
- metadados em linhas curtas;
- painéis laterais contextuais;
- abas para troca de contexto;
- hierarquia clara sem inflar a tela.

Referência de densidade:
- ferramenta de trabalho usada o dia todo;
- visual limpo, mas não vazio;
- cada bloco precisa justificar o espaço ocupado.

---

## 6. Regras de viewport e scroll

### 6.1 Regra geral

Em telas operacionais de atendimento e administração, a viewport desktop deve ser tratada como cockpit.

Viewport canônica de desenho:
- Full HD: `1920x1080`

Faixa aceitável de validação desktop:
- `1440x900` até `1920x1080`

Breakpoint mínimo para desktop operacional:
- `1366px`

Não otimizar a composição principal para `1024px` ou `1280px`.

A tela deve usar a largura útil real do desktop wide.

Evitar:
- container central estreito demais;
- margem lateral externa grande;
- header que ocupa largura indevida;
- scroll da página combinado com scroll interno.

Em cockpits operacionais:
- `body/page` não deve rolar verticalmente;
- sidebar deve permanecer fixa;
- header/topbar deve permanecer estável;
- rail direito deve permanecer fixo quando existir;
- a área central deve ocupar a altura útil da viewport.

### 6.2 Scroll

É proibido:
- dupla rolagem;
- rolagem vertical da página na visão principal de atendimento;
- scrollbar interna precoce em textarea;
- scroll horizontal indevido.

Se conteúdo real exceder a viewport:
1. compactar tipografia;
2. reduzir padding e gaps;
3. mover conteúdo secundário para tabs;
4. manter um único scroll controlado apenas no container correto.

Ordem correta de rolagem em telas operacionais:
- lista/tabela central: `overflow-y-auto`;
- thread/conversa: `overflow-y-auto`;
- rail direito: `overflow-y-auto`;
- filtros: `overflow-y-auto` apenas quando necessário;
- composer: fixo, nunca empurrando a página.

Exceções:
- páginas públicas;
- artigos/documentação;
- login e estados institucionais.

Nessas superfícies, a página pode rolar normalmente se isso fizer parte da leitura.

---

## 7. Layout base do Support Workspace

### 7.1 Estrutura geral

O Support Workspace usa:
- sidebar fixa à esquerda;
- fundo claro no workspace;
- conteúdo operacional em grid;
- painéis contextuais à direita;
- tabs quando houver troca de contexto.

### 7.2 Sidebar do Support Workspace

A sidebar deve ser navy profunda, refinada, compacta e encostada ao canto esquerdo da viewport.

Itens canônicos:
- Fila;
- Tickets;
- Clientes;
- Knowledge;
- Admin.

Regras:
- item ativo com fundo azul vivo integrado ao menu, sem pílula inflada;
- ícones simples e consistentes;
- logo no topo;
- card/menu de usuário no rodapé;
- botão de colapso translúcido, integrado à sidebar, com ícone legível;
- badge pequeno e alinhado;
- densidade vertical compacta;
- não parecer menu improvisado;
- não renderizar texto solto durante loading.

### 7.3 Topbar do Support Workspace

A topbar técnica com badges como `DEVELOPMENT` ou `AGENT WORKSPACE` não deve aparecer no Ticket Workspace.

O botão `Encerrar sessão` deve ficar no card/menu do usuário na base da sidebar, não em uma faixa branca superior.

Evitar:
- múltiplas barras de topo;
- headers redundantes;
- card branco superior com apenas uma ação de sessão;
- botões de ação fora de contexto.

---

## 8. Componentes canônicos

### 8.1 Cards

Cards devem ter:
- fundo branco;
- borda sutil;
- raio moderado;
- sombra leve;
- padding controlado.

Referência:
- padding interno padrão: 16px;
- gap entre cards: 12px a 16px em telas de alta densidade;
- evitar 24px+ em ticket workspace, salvo se a blueprint exigir.

### 8.2 Rails direitos

Rails direitos devem ser:
- contextuais;
- densos;
- úteis para decisão;
- organizados em cards empilhados;
- suficientemente largos para evitar quebras ruins.

Para Ticket Workspace:
- largura recomendada: 320px a 360px em desktop wide;
- não comprimir tanto a ponto de quebrar labels e botões;
- não usar accordions fechados como estrutura principal.

### 8.3 Botões

Regras:
- texto sempre legível;
- não usar botão desabilitado com contraste ilegível;
- não criar botões fora do contrato da tela;
- botões sem funcionalidade real devem ser removidos.

---

## 9. Ticket Workspace

A tela de ticket é uma estação de atendimento.

Ela deve ser centrada em thread/chat profissional e caber como cockpit operacional.

### 9.1 Estrutura obrigatória

- sidebar navy encostada à esquerda;
- sem topbar técnica;
- header compacto do ticket;
- tabs: Conversar, Conhecimento, Central de ajuda, Mais ações;
- thread central;
- composer integrado;
- rail direito contextual.

### 9.2 Grid de ticket

Composição desktop:
- sidebar fixa à esquerda;
- coluna central de conversa;
- rail direito com 320px a 360px;
- gaps entre áreas: 12px a 16px;
- sem margem externa ampla.

A coluna central deve ceder largura suficiente para o rail direito não quebrar.

### 9.3 Header do ticket

Deve ser compacto e alinhado à coluna central, não ocupar largura que pertença ao rail direito.

Conteúdo:
- status;
- prioridade;
- short id;
- título;
- cliente;
- solicitante;
- responsável;
- última atualização.

Não pode:
- dominar a página;
- colar texto sem padding;
- duplicar pills sem necessidade;
- virar card de largura total por cima do rail.

### 9.4 Thread

Regras:
- cliente à esquerda;
- agente à direita;
- nota interna com visual próprio;
- timestamps discretos;
- bolhas compactas;
- anexos em pills;
- sem aparência de lista de cards administrativos;
- usar altura flexível para preencher o espaço entre header e composer.

### 9.5 Composer

Deve conter:
- abas ou toggle: Resposta pública / Nota interna;
- área de texto dominante;
- botão primário contextual.

Regras:
- remover seletor duplicado Público/Interno;
- modo é definido por Resposta pública / Nota interna;
- botão deve mudar conforme modo:
  - `Enviar resposta`;
  - `Salvar nota interna`;
- textarea ocupa a maior parte do composer;
- sem scrollbar interna precoce;
- botões inferiores só podem existir se tiverem funcionalidade real.

Nota interna:
- fundo amarelo claro no composer/textarea;
- contraste legível;
- deve sinalizar claramente conteúdo interno.

### 9.6 Rail direito do ticket

Ordem obrigatória:
1. Cliente;
2. Ações do ticket;
3. Conhecimento relacionado;
4. Atividade recente.

Card Cliente:
- informações principais visíveis;
- CTA: `Ver detalhes do cliente`;
- não esconder conteúdo principal em accordion.

Card Ações do ticket:
- responsável;
- salvar alterações;
- atribuir/desatribuir;
- status;
- salvar andamento.

Proibido:
- `Abrir ERP`;
- `Abrir cliente` na toolbar superior;
- accordions fechados como estrutura principal;
- rail estreito demais;
- sobrepor header.

---

## 10. Estados de erro

Erro técnico cru não pode aparecer no front.

Exemplo proibido:
`invalid ticket status transition: waiting_customer -> triage`

Mostrar mensagem amigável:
`Não foi possível alterar o status. Verifique a etapa atual do ticket e tente novamente.`

Erros técnicos podem ir para console/log, não para UI de agente.

---

## 11. Critérios de aceite visual

Uma tela só pode ser considerada aprovada se:
- lembrar imediatamente a blueprint aprovada;
- respeitar composição e densidade;
- não parecer adaptação da tela antiga;
- não tiver texto bruto solto;
- não tiver scroll horizontal indevido;
- não tiver dupla rolagem;
- não expuser termos técnicos internos;
- passar typecheck/build;
- tiver screenshot final validável por humano.

Não basta estar mais bonita.

Tem que estar correta para a função operacional do domínio.
