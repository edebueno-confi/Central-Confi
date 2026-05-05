# Admin System Design Spec

## Tela

`/admin/system`

## Objetivo

Consolidar saúde operacional, auditoria, checks, status e eventos internos do sistema.

Deve ser uma tela de observabilidade administrativa, não dashboard decorativo.

## Estrutura

### Sidebar Admin

Item ativo: `System`.

### Topbar

Pills:
- `DEVELOPMENT`
- `PLATFORM_ADMIN`

### Cabeçalho

Título: `System`.

Subtítulo:
- Auditoria, saúde do sistema e eventos operacionais.

### Tabs

Usar:
- Saúde, ativo.
- Auditoria.
- Jobs.
- Segurança.

### KPIs

- Checks verdes.
- Alertas.
- Eventos recentes.
- Falhas.

## Layout principal

Grid em 3 colunas.

### Coluna esquerda: filtros/checks

Card `Monitoramento`.

Conteúdo:
- Listas rápidas:
  - Saúde geral.
  - Auditoria.
  - Falhas recentes.
  - Segurança.
- Filtros:
  - Tipo.
  - Severidade.
  - Período.
  - Serviço.
- Botão `Recarregar`.

### Centro: eventos/checks

Lista densa de checks e eventos.

Cada linha:
- Tipo.
- Severidade.
- Serviço.
- Mensagem curta.
- Timestamp.
- Status.
- Menu kebab.

Linha selecionada destacada.

### Rail direito: evento selecionado

Título: `Detalhe operacional`.

Conteúdo:
- Card navy com status do evento.
- Serviço.
- Severidade.
- Timestamp.
- Resumo.
- Cards:
  - Contexto.
  - Impacto.
  - Ações recomendadas.
  - Histórico relacionado.

## Proibições

- Expor secrets.
- Expor dados sensíveis.
- Transformar em dashboard de vanity metrics.
- Usar copy técnica demais para usuários não técnicos, exceto quando o ator é platform_admin.

## Critérios de aceite

- Platform admin entende rapidamente a saúde do sistema.
- Eventos são rastreáveis.
- Auditoria é navegável.
