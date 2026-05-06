# Support Ticket Workspace Design Spec

## Tela

`/support/tickets/:ticketId`

## Objetivo

Transformar a tratativa de ticket em uma estação operacional de atendimento B2B, com foco em conversa, contexto, resposta e ações rápidas.

Esta tela deve parecer cockpit de atendimento profissional. Não deve parecer dashboard administrativo, lista de cards, nem adaptação de componentes antigos.

## Hierarquia de referência

Para esta tela, a prioridade obrigatória é:

1. `docs/design/blueprint/tickets.png`
2. Este screen spec
3. `docs/design/GENIUS_SUPPORT_OS_DESIGN_SYSTEM.md`
4. Contratos de dados existentes
5. Implementação antiga

Se houver conflito entre documentação e blueprint, seguir a blueprint e registrar a divergência no relatório final.

## Princípio crítico

A visão principal `Conversar` deve caber em uma viewport desktop wide sem scroll vertical da página.

É proibido:
- dupla rolagem;
- scroll horizontal;
- scroll interno precoce na textarea;
- header técnico;
- card superior morto;
- componentes sem função;
- rail direito espremido.

---

## Estrutura obrigatória

### Grid geral

A tela deve usar toda a largura do dispositivo.

Composição:
- sidebar fixa à esquerda;
- coluna central com header, tabs, thread e composer;
- rail direito visível com cards informativos.

Regras:
- sidebar encostada ao canto esquerdo;
- sem margem externa grande;
- gap entre sidebar e conteúdo: 12px a 16px;
- gap entre coluna central e rail: 12px a 16px;
- rail direito: 320px a 360px em desktop wide;
- coluna central cede espaço para o rail não quebrar.

Proibido:
- header central invadir o rail;
- rail sobrepor header;
- container centralizado estreito;
- espaço morto lateral.

---

## Sidebar

A sidebar deve seguir a blueprint com alta fidelidade.

Requisitos:
- navy profunda;
- largura compacta, mas suficiente para logo, labels e usuário;
- encostada ao canto esquerdo da viewport;
- logo Genius Support Workspace no topo;
- botão de colapso translúcido, integrado e com ícone visível;
- itens:
  - Fila
  - Tickets, ativo
  - Clientes
  - Knowledge
  - Admin
- item ativo azul, integrado, sem parecer chip inflado;
- ícones e labels alinhados;
- badge de contagem pequeno e alinhado;
- espaçamento vertical compacto;
- card/menu do usuário no rodapé;
- ação `Encerrar sessão` deve ficar no card/menu do usuário, com texto legível.

Proibido:
- botão de colapso como bola branca;
- ícone invisível;
- botão `Encerrar sessão` ilegível;
- card branco superior apenas para logout;
- sidebar com margem externa grande.

---

## Topbar e logout

Esta tela não deve exibir topbar técnica.

Remover:
- `DEVELOPMENT`;
- `SUPPORT WORKSPACE`;
- `AGENT WORKSPACE`;
- environment badges;
- faixa branca superior com apenas `Encerrar sessão`;
- termos técnicos de arquitetura.

`Encerrar sessão` deve ficar no card/menu do usuário no rodapé da sidebar.

---

## Header do ticket

O header deve ser compacto e alinhado apenas à coluna central.

Conteúdo:
- status pill;
- prioridade/severidade;
- ID curto;
- título do ticket;
- cliente;
- solicitante;
- responsável;
- última atualização.

Regras visuais:
- padding interno: 12px a 16px;
- altura controlada;
- título em escala compacta;
- labels em uppercase pequenos;
- metadados em linha densa;
- não colar texto nas bordas;
- não ocupar largura do rail direito;
- não duplicar informação se já estiver no rail.

Proibido:
- header alto;
- card gigante;
- bloco com excesso de respiro vertical;
- texto colado;
- header sobreposto ao rail;
- pills duplicadas sem necessidade.

---

## Tabs superiores

Tabs obrigatórias:
- Conversar;
- Conhecimento;
- Central de ajuda;
- Mais ações.

Regras:
- underline azul discreto na tab ativa;
- altura compacta;
- tabs não podem ser decoração;
- cada tab deve renderizar conteúdo real ou estado vazio útil.

Comportamento esperado:
- Conversar: thread + composer.
- Conhecimento: artigos vinculados, busca/sugestões ou estado vazio útil.
- Central de ajuda: conteúdo público relacionado ou estado vazio útil.
- Mais ações: ações secundárias reais do ticket ou estado vazio útil.

Proibido:
- clique morto;
- tab que não muda nada;
- ação inventada sem contrato.

---

## Thread central

A thread é o eixo da tela.

Regras:
- cliente à esquerda;
- agente à direita;
- nota interna integrada ao fluxo;
- timestamps discretos;
- avatares pequenos;
- separador de data sutil;
- bubbles compactas;
- anexos como pills compactas;
- altura flexível para ocupar o espaço disponível entre header/tabs e composer.

Nota interna:
- fundo amarelo/âmbar claro;
- label `NOTA INTERNA`;
- deve parecer parte da conversa operacional, não card solto.

Proibido:
- lista espaçada;
- cards administrativos;
- espaço vazio excessivo;
- thread empurrando composer para fora da viewport.

---

## Composer

O composer deve ficar integrado ao rodapé da thread e caber na viewport.

Conteúdo:
- alternância `Resposta pública` e `Nota interna`;
- área de texto dominante;
- botão primário contextual.

Regras:
- remover seletor duplicado `Público` / `Interno`;
- o modo é definido pela alternância `Resposta pública` / `Nota interna`;
- no modo Resposta pública, botão: `Enviar resposta`;
- no modo Nota interna, botão: `Salvar nota interna`;
- textarea deve ocupar quase toda a largura útil;
- textarea deve ocupar a área principal do composer;
- sem scrollbar interna precoce;
- toolbar inferior só pode existir com função real.

Nota interna:
- quando o modo ativo for `Nota interna`, o fundo do composer/textarea deve ser amarelo claro;
- quando o modo ativo for `Resposta pública`, fundo branco;
- a diferença visual deve ser evidente e legível.

Proibido:
- composer gigante separado;
- composer espremido;
- textarea pequena no canto;
- select redundante;
- botões decorativos;
- ícones sem função real.

---

## Rail direito

O rail direito deve ser largo o suficiente para evitar quebras ruins e deve seguir a blueprint.

Largura recomendada:
- 320px a 360px em desktop wide.

Ordem obrigatória dos cards:
1. Cliente
2. Ações do ticket
3. Conhecimento relacionado
4. Atividade recente

### Card Cliente

Deve ficar no topo do rail.

Conteúdo:
- nome do cliente;
- status/plano/sinais;
- plataforma;
- produto;
- porte/tier;
- contato principal;
- e-mail;
- CTA `Ver detalhes do cliente`.

Regras:
- informações principais visíveis;
- não esconder em accordion;
- padding interno suficiente;
- evitar quebra de linha ruim.

### Card Ações do ticket

Conteúdo:
- responsável;
- salvar alterações;
- atribuir a mim;
- desatribuir;
- status;
- salvar andamento.

Regras:
- botões compactos;
- fonte menor quando necessário;
- sem duplicar pills do header se isso prejudicar clareza;
- não sobrepor header;
- não estourar largura.

### Card Conhecimento relacionado

Conteúdo:
- artigo vinculado ou estado vazio útil;
- botão para abrir aba Conhecimento quando aplicável.

### Card Atividade recente

Conteúdo:
- lista compacta de eventos relevantes;
- timestamps discretos.

Proibido:
- rail estreito demais;
- accordions fechados como estrutura principal;
- card Cliente abaixo de Ações;
- conteúdo crítico escondido;
- rail criando scroll próprio desnecessário;
- sobreposição com header.

---

## Regras de scroll

Na tab `Conversar`, a tela deve caber sem scroll vertical da página em desktop wide.

Prioridade para eliminar scroll:
1. remover header/topbar morto;
2. compactar header do ticket;
3. reduzir gaps verticais;
4. aumentar rail para evitar quebras;
5. compactar tipografia;
6. mover conteúdo secundário para tabs;
7. reduzir altura de mensagens/metadados sem comprometer leitura.

Proibido:
- dupla rolagem;
- scroll horizontal;
- página com scroll vertical por erro de composição;
- textarea com scroll interno precoce.

---

## Tipografia e espaçamento

Ajustar a escala para ficar próxima da blueprint:

- título do ticket: compacto, peso médio/alto, sem exagero;
- labels: 10px a 11px, uppercase, letter spacing leve;
- metadados: 11px a 12px;
- mensagens: 12px a 13px;
- botões do rail: 12px a 13px;
- pills: 10px a 11px.

Espaçamento:
- padding interno de cards: 12px a 16px;
- gap entre cards do rail: 10px a 12px;
- gap entre coluna central e rail: 12px a 16px;
- padding do header: 12px a 16px.

---

## Estados de erro

Erro técnico cru não pode aparecer no front.

Exemplo proibido:
`invalid ticket status transition: waiting_customer -> triage`

Mostrar mensagem amigável:
`Não foi possível alterar o status. Verifique a etapa atual do ticket e tente novamente.`

Erros técnicos podem ir para console/log, não para UI de agente.

---

## Critérios de aceite

A tela só pode ser considerada pronta se:

- lembrar claramente a blueprint `tickets.png`;
- não tiver topbar técnica;
- não tiver card superior branco morto;
- sidebar estiver encostada à esquerda e refinada;
- botão de colapso tiver ícone visível;
- botão Encerrar sessão estiver legível no usuário/sidebar;
- header não invadir o rail;
- rail direito tiver 320px a 360px;
- rail mostrar Cliente antes de Ações;
- Cliente, Ações, Conhecimento e Atividade estiverem visíveis como cards;
- composer tiver textarea ampla;
- seletor duplicado Público/Interno tiver sido removido;
- Nota interna tiver fundo amarelo claro;
- não houver botões falsos no composer;
- não houver dupla rolagem;
- não houver scroll vertical da página na tab Conversar em desktop wide;
- não houver scroll horizontal;
- não houver erro técnico cru no front;
- backend/schema/RPC/contracts/fixtures permanecerem intactos.
