# DEPLOYMENT_STRATEGY.md

## Objetivo

Definir como o Genius Support OS evolui entre local, preview e produção com
controle de risco, aprovação explícita e sem drift manual entre GitHub, Vercel
e Supabase.

## Princípio operacional

- Codex é o operador técnico de GitHub, Vercel e Supabase.
- O usuário é aprovador de mudanças sensíveis e de produção.
- Produção não recebe alteração manual ad hoc como caminho normal.
- Banco, app e documentação precisam permanecer coerentes.

## Topologia de ambientes

### Local

- Desenvolvimento técnico e validação de banco.
- Usa `npm run contracts:typecheck` e `npm run supabase:verify`.
- Não é fonte oficial de verdade; apenas ambiente de trabalho.

### Preview

- Ambiente Vercel efêmero por branch/PR.
- Serve para validar integração, navegação, auth e regressão antes de produção.
- Enquanto o frontend estiver bloqueado, Preview fica documentado, mas inativo.

### Production

- `main` é a única fonte de deploy de produção do app.
- Deploy de produção exige merge aprovado, CI verde e janela operacional limpa.
- Banco remoto só muda por fluxo controlado e documentado.

### Supabase remoto

- O estado remoto não é considerado alinhado por inferência documental. Cada
  release precisa consultar o histórico e executar o smoke autenticado dos
  contratos antes da promoção do frontend.
- O bootstrap do primeiro `platform_admin` só pode ser considerado concluído
  quando houver evidência do ambiente remoto correto na janela de release.
- Continua sendo tratado como infraestrutura crítica, separada do deploy web.

## Estratégia de deploy por camada

### Banco

Fluxo:
1. Validar localmente com `contracts:typecheck` e `supabase:verify`.
2. Atualizar documentação operacional se o estado mudou.
3. Executar dry-run remoto aprovado.
4. Executar `db push` real somente após aprovação explícita.
5. Validar migration list, objetos principais e controles de segurança.
6. Registrar o fechamento em documentação viva.

Regras:
- Nunca usar `seed` no caminho normal de produção.
- Nunca usar `service_role` como atalho de deploy.
- Nunca corrigir schema manualmente pelo dashboard como rotina.

### App web

Fluxo controlado do app web:
1. Branch abre Preview no Vercel.
2. PR recebe validação de CI e revisão.
3. O workflow manual `Supabase Release Gate` valida o commit, reconcilia e aplica as migrations remotas e executa o smoke test dos contratos.
4. Somente depois do gate verde o mesmo commit pode ser promovido para Production.
5. Smoke test pós-deploy valida rotas, auth e consumo de contratos.

Regras:
- Preview por branch/PR.
- Production somente via commit aprovado, com o banco remoto reconciliado pelo gate e checks obrigatórios verdes.
- Nenhum deploy direto de branch local para Production.
- Não promover manualmente um Preview de branch para Production; o deploy de produção deve sempre nascer da `main`.

### Automação e proteção da `main`

- O projeto Vercel `genius-support-os` está vinculado ao GitHub com `main` como `productionBranch`.
- A `main` exige pull request e o check obrigatório e atualizado `verify-database` antes do merge, inclusive para administradores.
- O check executa typecheck de contratos e frontend, build web, reset/testes pgTAP e lint do schema local.
- O workflow `Supabase Release Gate` é manual, protegido pelo Environment `production` e é o único caminho autorizado para aplicar migrations remotas antes da promoção do frontend.
- Antes de qualquer `link` ou `db push`, o workflow exige todos os secrets do
  Environment e valida que `SUPABASE_URL` corresponde exatamente ao
  `SUPABASE_PROJECT_REF`; divergência interrompe a execução.
- A integração automática de Production do Vercel deve permanecer desativada ou configurada para promoção posterior ao gate. Caso contrário, um push pode publicar o frontend antes do banco, recriando o drift que este procedimento elimina.
- Branches `codex/*` e demais branches continuam em Preview; elas não entram no fluxo de produção até serem integradas à `main`.

### Documentação

- Mudanças operacionais devem ser commitadas junto do estado real entregue.
- Runbooks e checkpoints precisam refletir o último estado validado.

## Relação entre GitHub, Vercel e Supabase

- GitHub é a origem de código, revisão e automação.
- Vercel hospeda apenas o app web e seus previews.
- Supabase hospeda auth, banco, RLS, storage e funções internas.
- Deploy do app não substitui deploy de banco.
- O deploy de banco e a promoção do frontend são etapas do mesmo release, com o banco primeiro e smoke test entre elas.

## Rollback

### App web

- Usar rollback do Vercel para a última versão saudável.
- Em paralelo, reverter ou corrigir o commit de origem no GitHub.

### Banco

- Preferir forward-fix quando o problema for pequeno e controlado.
- Usar PITR/backup quando houver risco de integridade ou permissão.
- Não fazer rollback manual improvisado em tabelas, views ou grants.

## Validação pós-deploy

### Banco

- migration list local/remoto alinhada
- objetos principais existentes
- grants e RLS permanecem corretos
- bootstrap administrativo continua one-shot

### App

- rota principal responde
- autenticação funciona
- variáveis por ambiente corretas
- nenhuma chamada depende de mock
- logs e observabilidade sem erro crítico

## Gates obrigatórios de produção

- mudança integrada por pull request no fluxo autorizado
- working tree limpa
- branch remota atualizada
- check `verify-database` verde e atualizado no commit que será usado
- documentação operacional sincronizada
- nenhum segredo novo commitado

## Checklist de segurança

- não imprimir segredo em terminal, CI ou PR
- não commitar `.env`
- não expor `service_role`
- não usar segredo em `NEXT_PUBLIC_*`
- mascarar outputs de workflows
- não copiar credencial para documentação

## Estado atual

- Deploy remoto do Supabase: não comprovado no estado corrente; exige o
  `Supabase Release Gate` e smoke autenticado no projeto correto
- Bootstrap do primeiro `platform_admin`: histórico/documental, não usar como
  prova do estado atual sem validação do ambiente alvo
- Preview Vercel: ativo por branch/PR
- Production Vercel: promoção controlada após o `Supabase Release Gate`; deploy automático por push não é considerado seguro para releases com migrations
