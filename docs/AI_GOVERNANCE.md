# AI_GOVERNANCE.md

## Princípio
IA é assistente operacional. Nunca é source of truth.

## Base permitida para IA
IA só pode responder com base em conteúdo que seja:
- versionado
- classificado
- com escopo de acesso definido
- auditável
- citável

## Estado atual da Knowledge Base
- A Fase 4 materializou o núcleo editorial e a trilha de origem da Knowledge Base.
- A importação legado Octadesk é apenas `draft` e local-only.
- Não existe indexação em IA nesta fase.
- Não existe Central de Ajuda pública nesta fase.
- Conteúdo legado ainda depende de curadoria humana antes de qualquer exposição.

## IA pode futuramente
- resumir artigos longos
- sugerir artigos relacionados
- apontar duplicidades de conteúdo
- apoiar classificação editorial
- responder perguntas internas com citação explícita de artigos aprovados

## IA não pode
- inventar resposta
- responder sem fonte
- indexar ou usar artigo `draft` sem governança aprovada
- acessar conteúdo fora do escopo de tenant/permissão
- expor playbook interno como se fosse conteúdo público
- usar HTML legado raspado como base de apresentação
- publicar artigo automaticamente

## Regras específicas para conteúdo legado
- `article.json` pode ser usado como metadado bruto.
- `content.txt` é a fonte textual principal para curadoria.
- `content.raw.html` e `content.local.html` servem apenas como referência auxiliar.
- HTML legado não deve alimentar UI final nem resposta citável por padrão.
- Conteúdo legado importado deve preservar:
  - `source_path`
  - `source_hash`

## Requisitos técnicos futuros para IA
- registrar prompt, contexto e fontes utilizadas
- registrar usuário solicitante
- respeitar tenant, role e visibilidade do artigo
- bloquear conteúdo `restricted` fora do escopo autorizado
- permitir auditoria posterior
- permitir desligar artigos específicos da base de IA sem apagar histórico editorial

## Pré-condições antes de abrir IA sobre KB
1. pipeline de curadoria humana aprovado
2. classificação editorial consistente
3. separação clara entre conteúdo público, interno e restrito
4. política de citação e resposta aprovada
5. trilha de auditoria ponta a ponta

## O que continua bloqueado
- indexação em IA na Fase 4
- resposta pública automática
- uso de base legada sem reescrita/curadoria
- mistura entre conteúdo público e playbook interno
