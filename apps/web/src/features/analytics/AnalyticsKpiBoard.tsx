import './analytics-board.css';
import {
  describeKpiBasis,
  describeKpiLimitation,
  describeKpiState,
  formatKpiValue,
  readKpi,
  readKpiMeta,
  type KpiEntry,
  type KpiValueKind,
} from './analytics-kpi-contract.mjs';
import { kpiLabel } from './analytics-vocabulary.mjs';

function formatContextDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

/**
 * Painel de leitura dos indicadores.
 *
 * Substitui a grade de cartões com borda, que o design system classifica como
 * "coleção de cards administrativos" e proíbe. Duas decisões de arquitetura de
 * informação, ambas derivadas de defeitos reais deste painel:
 *
 * **A coorte organiza o espaço.** Posição de hoje e movimento do período ficam
 * em faixas separadas, com título próprio. Foi a mistura silenciosa dessas duas
 * leituras que produziu dois valores diferentes para o mesmo nome.
 *
 * **A confiabilidade vive dentro do número.** Cobertura parcial marca o próprio
 * algarismo e mostra a porcentagem; ausência de fonte ocupa o lugar do valor com
 * a frase do estado. Nenhum selo lateral, nenhum zero fingindo ser medida.
 */
export interface BoardItem {
  key: string;
  kind?: KpiValueKind;
  /** Texto de apoio quando o indicador está íntegro. */
  note?: string;
  /** Marca o indicador como alerta quando o valor é maior que zero. */
  alertWhenPositive?: boolean;
}

export interface BoardBand {
  /** Título da faixa. Deve nomear a coorte, não a área. */
  title: string;
  /** Explica em uma linha o que a faixa cobre. */
  note?: string;
  items: BoardItem[];
  /** Faixas com muitos indicadores de apoio distribuem-se de forma mais densa. */
  dense?: boolean;
}

export function AnalyticsKpiBoard({
  payload,
  bands,
}: {
  payload: unknown;
  bands: BoardBand[];
}) {
  const meta = readKpiMeta(payload);
  return (
    <div className="gso-board">
      {bands.map((band) => (
        <Band key={band.title} band={band} payload={payload} coverage={meta.coveragePercent} />
      ))}
    </div>
  );
}

function Band({
  band,
  payload,
  coverage,
}: {
  band: BoardBand;
  payload: unknown;
  coverage: number | null;
}) {
  const entries = band.items.map((item) => ({ item, entry: readKpi(payload, item.key) }));
  const meta = readKpiMeta(payload);
  // O medidor só aparece quando a faixa tem algo incompleto. Cobertura total não
  // precisa ser anunciada: a ausência do aviso já é a informação.
  const temParcial = entries.some(({ entry }) => entry.state === 'partial');
  const mostrarMedidor = temParcial && coverage !== null && coverage < 100;

  // V-05: quando a faixa inteira cai pelo mesmo motivo — o caso típico de uma
  // leitura que não carregou — repetir a mesma frase em cada indicador não
  // informa, esconde. A ressalva sobe uma vez para o cabeçalho da faixa.
  const limitacoes = entries.map(({ entry }) => describeKpiLimitation(entry));
  const limitacaoDaFaixa = entries.length > 1
    && limitacoes.every((frase) => frase !== '' && frase === limitacoes[0])
    ? limitacoes[0]
    : null;

  return (
    <section className="gso-board-band" aria-label={band.title}>
      <header className="gso-board-band__head">
        <h3 className="gso-board-band__title">{band.title}</h3>
        {band.note ? <p className="gso-board-band__note">{band.note}</p> : null}
        {mostrarMedidor ? (
          <span
            className="gso-board-band__trust"
            title="Parte dos registros ainda não tem todos os campos necessários"
          >
            <span className="gso-board-band__trust-rail">
              <span
                className="gso-board-band__trust-fill"
                style={{ width: `${Math.max(4, Math.min(100, coverage))}%` }}
              />
            </span>
            {Math.round(coverage)}% de cobertura
          </span>
        ) : null}
        {limitacaoDaFaixa ? (
          <p className="gso-board-band__limit" role="status">{limitacaoDaFaixa}</p>
        ) : null}
      </header>

      <div className="gso-board-band__items" data-density={band.dense ? 'support' : undefined}>
        {entries.map(({ item, entry }, index) => (
          <Item
            key={item.key}
            item={item}
            entry={entry}
            priority={index === 0 ? 'lead' : 'support'}
            meta={meta}
            limitacaoNoCabecalho={Boolean(limitacaoDaFaixa)}
          />
        ))}
      </div>
    </section>
  );
}

function Item({
  item,
  entry,
  priority,
  meta,
  limitacaoNoCabecalho = false,
}: {
  item: BoardItem;
  entry: KpiEntry;
  priority: 'lead' | 'support';
  meta: ReturnType<typeof readKpiMeta>;
  /** A faixa já publicou esta ressalva; repetir por indicador seria ruído. */
  limitacaoNoCabecalho?: boolean;
}) {
  const ausente = entry.value === null || entry.value === undefined;
  const alerta = item.alertWhenPositive === true && (entry.value ?? 0) > 0;
  const limitacaoCompleta = describeKpiLimitation(entry);
  const limitacao = limitacaoNoCabecalho ? '' : limitacaoCompleta;
  const coorte = describeKpiBasis(entry);

  return (
    <div className="gso-board-item" data-state={entry.state} data-alert={alerta ? 'true' : undefined} data-priority={priority}>
      <p className={ausente ? 'gso-board-item__value gso-board-item__value--absent' : 'gso-board-item__value'}>
        {formatKpiValue(entry, item.kind ?? 'count')}
      </p>
      <p className="gso-board-item__label">{kpiLabel(item.key)}</p>
      {/* A ordem importa: primeiro o que limita, depois o apoio. Quem lê precisa
          da ressalva antes da explicação. */}
      {limitacao ? <p className="gso-board-item__meta">{limitacao}</p> : null}
      {!limitacao && item.note ? <p className="gso-board-item__meta">{item.note}</p> : null}
      {!limitacao && !item.note && coorte ? <p className="gso-board-item__meta">{coorte}</p> : null}
      <details className="gso-board-item__context">
        <summary>Como interpretar</summary>
        <div className="gso-board-item__context-body">
          <p><strong>Estado:</strong> {describeKpiState(entry).toLowerCase() || 'disponível'}</p>
          {coorte ? <p><strong>Base:</strong> {coorte}</p> : <p><strong>Base:</strong> não informada no contrato.</p>}
          {meta.periodFrom || meta.periodTo ? (
            <p><strong>Período:</strong> {formatContextDate(meta.periodFrom) ?? 'início não informado'} até {formatContextDate(meta.periodTo) ?? 'fim não informado'}.</p>
          ) : null}
          {meta.coveragePercent !== null ? <p><strong>Cobertura:</strong> {Math.round(meta.coveragePercent)}%.</p> : <p><strong>Cobertura:</strong> não informada.</p>}
          {meta.freshnessAt ? <p><strong>Atualização:</strong> {formatContextDate(meta.freshnessAt)}.</p> : <p><strong>Atualização:</strong> não informada.</p>}
          {limitacaoCompleta ? <p><strong>Ressalva:</strong> {limitacaoCompleta}</p> : null}
        </div>
      </details>
    </div>
  );
}

/**
 * Limitações da leitura corrente, recolhidas por padrão. Aberto por omissão
 * viraria ruído permanente numa tela que quase sempre tem alguma ressalva.
 */
export function AnalyticsBoardLimitations({ payload }: { payload: unknown }) {
  const meta = readKpiMeta(payload);
  if (meta.warnings.length === 0) return null;
  return (
    <details className="gso-board-limits">
      <summary className="gso-board-limits__summary">
        O que limita esta leitura · {meta.warnings.length}
      </summary>
      <ul className="gso-board-limits__list">
        {meta.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </details>
  );
}
