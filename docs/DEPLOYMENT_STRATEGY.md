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

- Já recebeu as 4 migrations oficiais aprovadas.
- Já recebeu o bootstrap do primeiro `platform_admin`.
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

Fluxo esperado quando a fase de frontend for liberada:
1. Branch abre Preview no Vercel.
2. PR recebe validação de CI e revisão.
3. Merge aprovado em `main` dispara Production.
4. Smoke test pós-deploy valida rotas, auth e consumo de contratos.

Regras:
- Preview por branch/PR.
- Production somente via merge aprovado.
- Nenhum deploy direto de branch local para Production.

### Documentação

- Mudanças operacionais devem ser commitadas junto do estado real entregue.
- Runbooks e checkpoints precisam refletir o último estado validado.

## Relação entre GitHub, Vercel e Supabase

- GitHub é a origem de código, revisão e automação.
- Vercel hospeda apenas o app web e seus previews.
- Supabase hospeda auth, banco, RLS, storage e funções internas.
- Deploy do app não substitui deploy de banco.
- Deploy de banco não deve ser acoplado a push de frontend.

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

- aprovação explícita do usuário
- working tree limpa
- branch remota atualizada
- CI verde no commit que será usado
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

- Deploy remoto do Supabase: concluído
- Bootstrap do primeiro `platform_admin`: concluído
- Preview Vercel: ainda não ativo porque o frontend continua bloqueado
- Production Vercel: ainda não aplicável nesta fase
