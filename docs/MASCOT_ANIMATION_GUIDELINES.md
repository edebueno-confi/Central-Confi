# MASCOT_ANIMATION_GUIDELINES.md

## Objetivo

O mascote da Genius deve representar a presença da IA no Genius Support OS.

Ele não deve ser apenas decorativo. Deve comunicar estado, contexto e ação.

## Papel no produto

O mascote será usado em:

- Central de Ajuda pública
- Busca inteligente
- Assistente IA
- Empty states
- Loading contextual
- Confirmações leves
- Alertas operacionais

## Princípios

1. Animação sutil
   Nada infantil, exagerado ou "cartunesco" demais.

2. Movimento funcional
   Cada animação deve indicar um estado real do sistema.

3. Performance primeiro
   Preferir SVG animado com CSS/Framer Motion. Evitar Lottie pesado no MVP.

4. Acessibilidade
   Respeitar `prefers-reduced-motion`.

5. Identidade Genius
   Preservar forma, cores e reconhecimento do mascote.

## Estados oficiais

### idle
Estado padrão.
- flutuação vertical leve
- brilho discreto
- loop lento

### thinking
Quando a IA está processando.
- pulso suave
- glow controlado
- pequena rotação ou oscilação

### answering
Quando a IA está retornando resposta.
- ondas suaves
- brilho progressivo
- movimento contínuo curto

### success
Quando uma ação dá certo.
- bounce curto
- brilho rápido
- retorno ao idle

### alert
Quando há atenção necessária.
- ping discreto
- sem vermelho agressivo por padrão
- movimento curto e objetivo

### error
Quando algo falha.
- pequena inclinação
- opacidade/glow reduzido
- sem dramatização

## Proibições

- animação constante chamativa
- mascote atrapalhando leitura
- movimento sem significado
- bloquear interface enquanto anima
- usar como "enfeite" em toda tela
- animar com excesso em tabela, ticket ou painel denso

## Regra de produto

O mascote só aparece quando ajuda a experiência. Em telas operacionais densas, ele deve ficar no assistente lateral ou em estados vazios, nunca disputando atenção com tickets.
