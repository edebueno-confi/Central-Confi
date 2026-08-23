import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Regressões da aba Visão Geral levantadas em 2026-08-23 a partir de captura de
// produção do proprietário: com a operação Aftersale selecionada, os onze
// indicadores exibiam "Indisponível" e a frase "Este indicador tem uma
// limitação de origem registrada pela equipe responsável", enquanto o banco
// publicava `open_pipeline_amount = 744077.50` com estado `available` para o
// mesmo recorte e período. A tela afirmava uma limitação de origem inexistente.

const executive = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsCeoPage.tsx', import.meta.url), 'utf8');
const board = await readFile(new URL('../../apps/web/src/features/analytics/AnalyticsKpiBoard.tsx', import.meta.url), 'utf8');

test('a Visão Geral distingue falha de carregamento de ausência de dado', () => {
  assert.match(executive, /operationLoadFailed/);
  assert.match(executive, /setOperationLoadFailed\(true\)/);
  assert.match(executive, /setOperationLoadFailed\(false\)/);
  assert.match(executive, /Não foi possível carregar os indicadores da operação/);
});

test('a falha de carregamento oferece ação de repetir a leitura', () => {
  assert.match(executive, /operationRetryToken/);
  assert.match(executive, /onRetryOperation/);
  assert.match(executive, /Tentar de novo/);
  // Sem o token nas dependências o efeito nunca refaz a leitura, porque o memo
  // de filtros é estável por valor: o botão existiria e não faria nada.
  assert.match(executive, /\[stableFilters, groupCompany, sourceStatus, operationRetryToken\]/);
});

test('a explicação do recorte não usa jargão técnico com o executivo', () => {
  const linha = executive.slice(executive.indexOf('Operação <strong>{groupCompany}</strong>'));
  const trecho = linha.slice(0, 600);

  assert.doesNotMatch(trecho, /server-side/i);
  assert.doesNotMatch(trecho, /read models/i);
  assert.doesNotMatch(trecho, /ticket-empresa/i);
  assert.match(trecho, /Comercial e Suporte estão filtrados/);
});

test('a ressalva comum da faixa não é repetida em cada indicador', () => {
  assert.match(board, /limitacaoDaFaixa/);
  assert.match(board, /limitacaoNoCabecalho/);
  // O detalhe "Como interpretar" continua trazendo a ressalva completa mesmo
  // quando a face do card a omite.
  assert.match(board, /Ressalva:<\/strong> \{limitacaoCompleta\}/);
});
