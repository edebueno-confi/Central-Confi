# Supabase

O backend do Genius Support OS será materializado aqui.

## Estado atual

Ainda não existe projeto Supabase inicializado neste repositório. Por isso,
`blueprints/` guarda apenas desenho de schema e contratos de banco, sem virar
`migrations/` oficiais ainda.

## Regra de evolução

1. Validar o blueprint.
2. Inicializar Supabase local/remoto.
3. Gerar migrations oficiais.
4. Cobrir RLS, triggers e funções com testes de banco.

## Estrutura esperada

- `blueprints/`: rascunhos executáveis de modelagem.
- `migrations/`: migrations oficiais geradas pelo fluxo do Supabase CLI.
- `seed/`: apenas dados operacionais mínimos e nunca mocks de produto.
