# Plano Tecnico por Fases

## Fase 0 - Fundacao

Objetivo: fechar arquitetura, modelo de dados, tenancy e contratos iniciais.

Entregáveis:

- estrutura canônica do repositório;
- blueprint SQL inicial;
- documentos de arquitetura, acesso e roadmap;
- inventário do legado útil em `raw_knowledge/`.

Gate:

- nenhuma UI de produto antes da aprovação do modelo e da matriz de acesso.

## Fase 1 - Base Supabase

Objetivo: inicializar projeto Supabase, migrations reais, auth e RLS base.

Entregáveis:

- `supabase/config.toml`;
- migrations oficiais;
- funções de autorização;
- triggers de `updated_at` e auditoria;
- testes de banco e policies.

Gate:

- CRUD crítico só segue adiante com RLS testada.

## Fase 2 - Contratos e Read Models

Objetivo: definir contratos estáveis entre backend e frontend.

Entregáveis:

- RPCs/funções de domínio;
- views de leitura com escopo correto;
- pacotes de contratos tipados;
- testes de serialização e compatibilidade.

Gate:

- frontend só consome contratos versionados.

## Fase 3 - Operação de Tickets

Objetivo: liberar o núcleo operacional de suporte.

Entregáveis:

- tickets, mensagens, timeline e anexos;
- filas e atribuição;
- classificação por prioridade, status e canal;
- observabilidade mínima do fluxo.

Gate:

- fluxo completo auditável do ticket até resolução.

## Fase 4 - Base de Conhecimento

Objetivo: migrar e curar conhecimento legado sem contaminar o produto com dado cru.

Entregáveis:

- pipeline de ingestão de `raw_knowledge/`;
- curadoria editorial;
- versionamento de artigos;
- publicação interna e por tenant.

Gate:

- conteúdo legado só entra no produto depois de mapeamento, saneamento e revisão.

## Fase 5 - Ponte Suporte-Engenharia

Objetivo: rastrear bugs e melhorias com fronteira clara entre operação e execução técnica.

Entregáveis:

- work items técnicos;
- vínculo entre tickets e demandas;
- regras de handoff, bloqueio e retorno;
- dashboards operacionais mínimos.

Gate:

- sem acoplamento estrutural entre ticket e backlog técnico.

## Fase 6 - IA Assistiva e Busca Semântica

Objetivo: adicionar IA sem comprometer confiabilidade.

Entregáveis:

- índice vetorial por revisão publicada;
- busca híbrida e recuperação com citação;
- trilha de origem e confiança da resposta;
- retentativa assíncrona de embeddings.

Gate:

- IA só responde com base em conteúdo indexado e citável.
