import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const base = new URL('../../apps/web/src/features/analytics/', import.meta.url);
const read = (name) => readFile(new URL(name, base), 'utf8');

const [ceo, comercial, suporte, carteira, financeiro, grid, density] = await Promise.all([
  read('AnalyticsCeoPage.tsx'),
  read('AnalyticsCommercialPage.tsx'),
  read('AnalyticsCsPage.tsx'),
  read('AnalyticsCustomerSuccessPage.tsx'),
  read('AnalyticsFinancePage.tsx'),
  read('AnalyticsKpiBoard.tsx'),
  read('high-density.css'),
]);

/** Índice da primeira ocorrência, ou -1. */
const at = (source, pattern) => source.search(pattern);

const comFiltro = [
  ['Visão Geral', ceo, /gso-hd-filter-bar/],
  ['Comercial', comercial, /<AnalyticsFiltersBar/],
  ['Suporte', suporte, /<AnalyticsFiltersBar/],
];

test('o filtro sempre precede os indicadores que ele governa', () => {
  // Ler um número antes de saber qual recorte ele cobre é o caminho mais curto
  // para uma decisão errada. Em toda aba com filtro, o recorte vem primeiro.
  //
  // A verificação mudou quando os domínios ganharam sub-abas. Antes, comparar a
  // posição no arquivo bastava, porque a ordem do texto era a ordem da tela. Com
  // as sub-abas, o conteúdo é declarado numa constante acima do `return`, e a
  // posição no arquivo deixou de significar posição na tela.
  //
  // O que continua sendo verdade, e é o que se afere agora: dentro do JSX
  // devolvido, o filtro vem antes de tudo que ele governa — seja o painel de
  // indicadores diretamente, seja o conjunto de sub-abas que o contém.
  for (const [nome, source, filtro] of comFiltro) {
    const jsx = source.slice(source.search(/\n {2}return \(|\n {2}return </));
    const posFiltro = at(jsx, filtro);
    const posGovernado = Math.min(
      ...[/<AnalyticsKpiBoard/, /<AnalyticsDomainTabs/]
        .map((padrao) => at(jsx, padrao))
        .filter((pos) => pos > -1),
    );
    assert.ok(posFiltro > -1, `${nome} precisa ter barra de filtros`);
    assert.ok(Number.isFinite(posGovernado), `${nome} precisa exibir indicadores`);
    assert.ok(
      posFiltro < posGovernado,
      `${nome}: o filtro aparece depois do que governa; inverta a ordem`,
    );
    // O painel de indicadores precisa continuar existindo em algum lugar da
    // aba, mesmo que agora dentro de uma sub-aba.
    assert.ok(at(source, /<AnalyticsKpiBoard/) > -1, `${nome} precisa exibir indicadores`);
  }
});

test('a limitação vem depois dos indicadores que ela explica', () => {
  for (const [nome, source] of [['Visão Geral', ceo], ['Comercial', comercial], ['Suporte', suporte], ['Carteira', carteira]]) {
    const posKpis = at(source, /<AnalyticsKpiBoard/);
    const posLimites = at(source, /<AnalyticsBoardLimitations/);
    assert.ok(posLimites > -1, `${nome} precisa declarar as limitações da leitura`);
    assert.ok(posKpis < posLimites, `${nome}: a limitação aparece antes do que explica`);
  }
});

test('toda aba usa o mesmo invólucro de área', () => {
  for (const [nome, source] of [['Visão Geral', ceo], ['Comercial', comercial], ['Suporte', suporte], ['Carteira', carteira], ['Financeiro', financeiro]]) {
    const usaFrame = /AnalyticsHdDomainFrame/.test(source) || /ExecutiveHdCanvas/.test(source);
    assert.ok(usaFrame, `${nome} precisa usar o invólucro padrão de área`);
  }
});

test('a ausência de filtro em Carteira é intencional e está justificada', () => {
  // Todos os indicadores da carteira são posição de hoje, não fluxo de período.
  // Um seletor de datas ali sugeriria um recorte que não existe.
  assert.equal(/<AnalyticsFiltersBar/.test(carteira), false);
  assert.match(carteira, /não há filtro de período/);
});

test('o painel organiza por coorte, não por importância solta', () => {
  // Faixa com título próprio é o que impede posição de hoje e fluxo do período
  // serem lidos como a mesma coisa.
  assert.match(grid, /bands: BoardBand\[\]/);
  assert.match(grid, /A coorte organiza o espaço/);
  assert.match(grid, /A confiabilidade vive dentro do número/);
});

test('o cabeçalho executivo usa somente título e estado da leitura', () => {
  assert.match(density, /@media \(min-width: 761px\)/);
  assert.match(density, /\.gso-high-density-ui \.gso-overview-context \{[\s\S]*grid-template-areas: 'heading source';/);
  assert.doesNotMatch(density, /grid-template-areas: 'heading source action'/);
  assert.doesNotMatch(density, /gso-overview-context__action/);
});
