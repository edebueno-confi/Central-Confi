# AI_GOVERNANCE.md

## Princípio
IA é assistente operacional, não fonte da verdade.

## IA pode
- Resumir tickets longos.
- Sugerir artigos relacionados.
- Sugerir próximos passos.
- Detectar possíveis duplicidades.
- Transformar ticket em bug estruturado.
- Responder perguntas internas com base citável.

## IA não pode
- Inventar resposta.
- Responder sem fonte.
- Prometer prazo técnico.
- Alterar status sozinha.
- Criar devolutiva final sem revisão humana quando houver impacto sensível.
- Expor dados entre tenants.

## Fonte permitida
Somente conteúdo:
- aprovado;
- versionado;
- classificado;
- com escopo de acesso definido;
- citável.

## Requisitos técnicos
- Registrar prompt, contexto e fontes usadas.
- Registrar usuário solicitante.
- Respeitar tenant e permissão.
- Permitir auditoria posterior.

## MVP de IA
Começar com busca assistida e resumo. Não criar automação decisória no MVP.
