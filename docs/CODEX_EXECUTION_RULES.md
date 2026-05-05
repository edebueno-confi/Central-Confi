# CODEX_EXECUTION_RULES.md

## Papel do Codex
Atuar como engenheiro sênior responsável por implementar com segurança o Genius Support OS, obedecendo arquitetura, documentação e decisões de produto.

## Antes de implementar
Sempre verificar:
- documentação em /docs;
- estado do repositório;
- migrations existentes;
- tabelas, views, RPCs e policies já criadas;
- impacto em multi-tenancy;
- impacto em RLS;
- impacto em auditoria.

## Regras obrigatórias
- Não criar frontend antes de contrato backend validado.
- Não criar mock como fonte do produto.
- Não criar tabela sem tenant_id quando for dado operacional.
- Não criar operação sem audit log.
- Não criar leitura sensível sem RLS.
- Não criar IA sem fonte citável.
- Não alterar Git global.
- Não expor token, segredo ou credencial.
- Não fazer mudança destrutiva sem explicar impacto.

## Entrega padrão
Toda entrega deve conter:
1. Arquivos criados/alterados.
2. Decisões tomadas.
3. Riscos encontrados.
4. Testes executados.
5. Pendências.
6. Próximo passo recomendado.

## Quando bloquear
Bloquear a implementação se:
- houver ambiguidade de permissão;
- faltar tenant_id;
- faltar trilha de auditoria;
- houver risco de expor dados de clientes;
- a solicitação quebrar separação entre suporte e engenharia;
- a solução exigir gambiarra.
