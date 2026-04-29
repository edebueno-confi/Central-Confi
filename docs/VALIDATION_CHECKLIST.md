# VALIDATION_CHECKLIST.md

## Antes de aprovar qualquer fase
- O modelo respeita multi-tenancy?
- RLS está ativa nas tabelas expostas?
- Existe teste de isolamento?
- Existe auditoria da ação principal?
- Existe documentação atualizada?
- O frontend está impedido de calcular regra crítica?
- As entidades têm nomes claros?
- O fluxo separa suporte e engenharia?
- IA está limitada a fontes aprovadas?
- Anexos têm controle de acesso?
- Status têm transição controlada?

## Bloqueadores
- Falta de tenant_id em dado operacional.
- Falta de RLS.
- Falta de audit log.
- Mock virando fonte do produto.
- Frontend com regra de negócio.
- IA sem citação de fonte.
- Dados sensíveis em raw_knowledge sem classificação.
