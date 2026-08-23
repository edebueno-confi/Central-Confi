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
  assert.match(executive, /Promise\.allSettled\(\[/);
  assert.match(executive, /setOperationLoadFailed\(operationLoad\.failed\)/);
  assert.match(executive, /setOperationLoadPartial\(operationLoad\.failed && operationLoad\.loaded\)/);
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

// V-06: encontrado na validação autenticada do build local em 2026-08-23. Com
// operação selecionada, "Receita recorrente", "Clientes ativos", "Recebido no
// período", "A receber em atraso", "Recorrência com atraso" e "Retenção
// líquida" exibiam "Não foi possível confirmar este indicador nesta leitura.
// Atualize para tentar de novo." Esses indicadores não têm dimensão operacional
// publicada: nenhuma atualização faria o número aparecer. A mensagem convidava
// o usuário a insistir por um valor que nunca viria.
test('indicadores sem dimensão operacional são mascarados mesmo sem payload base', () => {
  const mascara = executive.slice(executive.indexOf('function maskUnscopedOperationKpis'));
  const corpo = mascara.slice(0, mascara.indexOf('\n}\n') + 3);

  // A máscara precisa garantir a entrada, e não apenas reescrever a existente.
  assert.match(corpo, /for \(const key of UNSCOPED_OPERATION_KPI_KEYS\)/);
  assert.match(corpo, /if \(!kpis\[key\]\) kpis\[key\] = \{ state: 'unavailable', value: null, reason: 'operation_dimension_unavailable' \}/);
});

test('a lista de indicadores sem dimensão operacional continua completa', () => {
  const lista = executive.slice(
    executive.indexOf('const UNSCOPED_OPERATION_KPI_KEYS'),
    executive.indexOf('const UNSCOPED_OPERATION_KPI_KEYS') + 260,
  );

  for (const key of ['mrr_total', 'active_customers', 'received_amount', 'overdue_receivables', 'mrr_overdue', 'nrr']) {
    assert.match(lista, new RegExp(`'${key}'`), `${key} precisa continuar mascarado sob recorte`);
  }
});
