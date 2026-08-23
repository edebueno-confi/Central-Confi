# TASK

- Task: ANALYTICS-OVERVIEW-OPERATION-FILTER-REGRESSION-2026-08-23
- State: READY_FOR_REVIEW
- Owner: Sentinel
- Role: REVIEWER
- Reviewer active: Sentinel
- Review mode: SENTINEL_REQUIRED
- Coordinator: Codex Orchestrator
- Approval: APPROVED para implementação e validação local somente; sem ações remotas
- Base SHA: 7bdaeec0689fb26a7e17aae4a63f1ea4ae7c6801
- Agent coordination: REVIEW_ACTIVE
- Hold reason: revisão independente obrigatória; não promover outra task enquanto este lote estiver em revisão

## Objetivo

Corrigir a regressão reproduzida na Visão Geral: com a operação `Aftersale`, as abas Comercial e Suporte carregam dados, mas a Visão Geral transforma todos os indicadores operacionais em `Indisponível`.

## Escopo

- investigar a composição operacional da Visão Geral e suas chamadas de read model;
- impedir que uma falha secundária mascare domínios válidos;
- alinhar o caminho de evolução ao contrato local comprovado, sem inventar assinatura;
- adicionar regressões para baseline consolidado, Aftersale na Visão Geral, Comercial e Suporte;
- validar localmente com navegador, testes e gates aplicáveis.

## Fora de escopo

Não restaurar a migration órfã, não reparar histórico, não aplicar migration local/remota, não alterar banco, grants, RLS, secrets, HubSpot, OMIE, produção, push, merge, deploy ou release surface.

## Aceite

1. O filtro Aftersale na Visão Geral não converte dados válidos de Comercial/Suporte em indisponibilidade por falha de uma leitura secundária.
2. Falhas de um domínio aparecem isoladamente e não apagam os demais.
3. O contrato da série temporal é validado contra código, migrations e testes locais.
4. Os testes preservam estados honestos para dados sem dimensão operacional.

## Entrega

Implementação concluída localmente. A revisão independente do Sentinel é o próximo passo; não iniciar task concorrente antes do veredito.
