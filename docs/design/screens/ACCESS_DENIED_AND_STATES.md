# Access Denied and System States Design Spec

## Telas

`/access-denied`
Estados de loading, vazio, erro e recurso inexistente.

## Objetivo

Garantir que estados auxiliares pareçam parte do produto, sem tela branca, texto bruto ou layout colapsado.

## Access denied

### Layout

Pode usar a estética do login:
- Fundo claro.
- Card central.
- Ícone de bloqueio.
- Título: `Acesso não autorizado`.
- Texto claro:
  - O usuário não tem permissão para acessar este ambiente.
- Ações:
  - `Voltar para o início`
  - `Encerrar sessão`

### Proibições

- Mostrar erro técnico bruto.
- Mostrar role global, RPC, Supabase, backend.
- Tela branca sem shell quando usuário já está autenticado.

## Loading autenticado

Quando dentro de um workspace:
- Manter shell visível.
- Sidebar visível.
- Topbar visível.
- Usar skeletons no conteúdo.
- Nunca usar loading branco genérico solto.

## Empty states

Devem ser úteis.

Exemplos:
- Fila vazia:
  - Título claro.
  - Texto explicando ausência de tickets.
  - Botão de recarregar.
- Sem artigos:
  - Explicar que não há conteúdo publicado.
- Sem cliente:
  - Explicar que nenhum cliente corresponde ao filtro.

## Error states

Devem conter:
- Título humano.
- Descrição objetiva.
- Ação recomendada.
- Código técnico discreto, quando necessário.

## Recurso inexistente

Exemplo ticket inválido:
- Manter shell.
- Exibir card compacto.
- CTA para voltar à fila.
- Não quebrar layout.

## Critérios de aceite

- Nenhum estado renderiza texto solto.
- Nenhum estado perde CSS.
- Nenhum loading remove shell após login.
- Mensagem é clara e não técnica demais.
