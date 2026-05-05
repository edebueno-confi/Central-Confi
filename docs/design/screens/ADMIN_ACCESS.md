# Admin Access Design Spec

## Tela

`/admin/access`

## Objetivo

Gerenciar usuários, memberships, papéis, permissões e convites da plataforma.

Deve comunicar governança e segurança, não apenas cadastro de usuários.

## Estrutura

### Sidebar Admin

Item ativo: `Access`.

### Topbar

Pills:
- `DEVELOPMENT`
- `PLATFORM_ADMIN`

### Cabeçalho

Título: `Access`.

Subtítulo:
- Governança de acesso, papéis, convites e memberships.

### Tabs

Usar:
- Usuários, ativo.
- Memberships.
- Convites.
- Papéis.

### KPIs

- Usuários ativos.
- Convites pendentes.
- Admins.
- Sem tenant.

## Layout principal

Grid em 3 colunas.

### Coluna esquerda: governança

Card `Controle de acesso`.

Conteúdo:
- Listas rápidas:
  - Admins.
  - Convites pendentes.
  - Sem tenant.
  - Inativos.
- Filtros:
  - Papel.
  - Tenant.
  - Status.
  - Último acesso.
- Botão `Convidar usuário`.

### Centro: usuários

Lista densa.

Cada linha:
- Nome.
- E-mail.
- Papel global ou tenant role.
- Tenant/membership.
- Status.
- Último acesso.
- Menu kebab.

Linha selecionada destacada.

### Rail direito: usuário selecionado

Título: `Usuário selecionado`.

Conteúdo:
- Card navy com nome/e-mail.
- Status.
- Papel.
- Tenant.
- Último acesso.
- CTAs:
  - `Gerenciar acesso`.
  - `Reenviar convite`, quando aplicável.
- Cards:
  - Memberships.
  - Permissões efetivas.
  - Atividade recente.
  - Alertas de segurança.

## Regras visuais

- Segurança deve ser clara.
- Usar pills para papéis e status.
- Estados sensíveis devem ter destaque moderado, não alarmista.

## Proibições

- Ocultar usuário sem tenant.
- Usar linguagem técnica de backend.
- Criar ações não suportadas por contrato.

## Critérios de aceite

- Tela permite entender quem tem acesso a quê.
- Papéis e memberships ficam evidentes.
- Ações perigosas são visualmente controladas.
