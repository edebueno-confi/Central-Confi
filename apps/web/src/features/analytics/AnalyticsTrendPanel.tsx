import { useEffect, useMemo, useRef, useState } from 'react';
import { MinimalState } from '../../components/minimal-states';
import { getAnalyticsTimeseries, type TimeseriesDomain, type TimeseriesGrain } from './analytics-api';
import { describeCohorts, grainLabel, readTimeseries } from './analytics-timeseries-contract.mjs';
import { AnalyticsLoadingState, ChartCard } from './analytics-ui';
import { buildAnalyticsQueryKey, normalizeAnalyticsPipelineIds } from './analytics-query-key';
import {
  CommercialTrendChart,
  FinanceTrendChart,
  SupportTrendChart,
  type CommercialTrendPoint,
  type FinanceTrendPoint,
  type SupportTrendPoint,
} from './charts/AnalyticsTrendCharts';

/**
 * Painel de evolução, compartilhado pelas sub-abas dos domínios.
 *
 * Uma única implementação para os três domínios porque a estrutura da resposta é
 * a mesma e o que muda é apenas a leitura visual. Duplicar isso por aba seria
 * repetir o erro que produziu indicadores com nomes diferentes para a mesma
 * medida.
 *
 * A janela da evolução é independente do filtro de recorte das abas de posição —
 * ver `defaultTimeseriesWindow`. Isso é dito na tela para que ninguém compare o
 * total do gráfico com o indicador de cima e conclua que um dos dois está errado.
 */

const GRAOS: TimeseriesGrain[] = ['month', 'week', 'day'];
const EMPTY_EXCLUDED_PIPELINE_IDS: string[] = [];

/** União dos formatos de ponto; cada domínio estreita para o seu. */
type TrendPoint = SupportTrendPoint | CommercialTrendPoint | FinanceTrendPoint;

/** Medidas que provam que a série tem sinal, por domínio. */
const MEDIDAS: Record<TimeseriesDomain, string[]> = {
  support: ['opened', 'resolved'],
  commercial: ['created', 'won', 'lost'],
  finance: ['received', 'expected'],
};

/** Medidas cuja coorte é exibida no rodapé, na ordem de leitura. */
const COORTES: Record<TimeseriesDomain, string[]> = {
  support: ['opened', 'resolved', 'balance'],
  commercial: ['created', 'won', 'win_rate'],
  finance: ['received', 'expected', 'overdue'],
};

const TITULOS: Record<TimeseriesDomain, { title: string; description: string }> = {
  support: {
    title: 'Fila ao longo do tempo',
    description:
      'Barras mostram quantos atendimentos entraram e quantos foram encerrados em cada período. A linha mostra o acumulado: subindo, a fila está crescendo.',
  },
  commercial: {
    title: 'Ganhos, perdas e taxa de conversão',
    description:
      'Barras contam negócios encerrados em cada período. A linha, no eixo da direita, é a taxa de ganho do próprio período.',
  },
  finance: {
    title: 'Recebimento ao longo do tempo',
    description:
      'A área é o previsto pelo vencimento dos títulos em aberto. As barras mostram o que entrou e o quanto já venceu sem baixa.',
  },
};

export function AnalyticsTrendPanel({ domain, groupCompany = null, excludedPipelineIds = EMPTY_EXCLUDED_PIPELINE_IDS }: { domain: TimeseriesDomain; groupCompany?: string | null; excludedPipelineIds?: string[] }) {
  const [grain, setGrain] = useState<TimeseriesGrain>('month');
  const [payload, setPayload] = useState<unknown>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const latestRequest = useRef(0);
  const excludedPipelineKey = useMemo(
    () => normalizeAnalyticsPipelineIds(excludedPipelineIds).join('\u001f'),
    [excludedPipelineIds],
  );
  const effectiveExcludedPipelineIds = useMemo(
    () => (excludedPipelineKey ? excludedPipelineKey.split('\u001f') : EMPTY_EXCLUDED_PIPELINE_IDS),
    [excludedPipelineKey],
  );
  const queryKey = buildAnalyticsQueryKey({
    domain,
    operation: groupCompany,
    excludedPipelineIds: effectiveExcludedPipelineIds,
    grain,
  });

  useEffect(() => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    let cancelled = false;
    setPhase('loading');
    setPayload(null);
    void getAnalyticsTimeseries(domain, grain, undefined, groupCompany, effectiveExcludedPipelineIds)
      .then((data) => {
        if (cancelled || requestId !== latestRequest.current) return;
        setPayload(data);
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled || requestId !== latestRequest.current) return;
        setPayload(null);
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
    // queryKey contém domínio, operação, pipelines e granularidade. A janela
    // própria da série é resolvida pelo contrato da API e não pelo filtro da posição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const copy = TITULOS[domain];

  if (phase === 'loading') {
    return (
      <ChartCard title={copy.title} description={copy.description}>
        <AnalyticsLoadingState title="Carregando a evolução" description="O Gênio está reunindo o histórico do período." />
      </ChartCard>
    );
  }

  if (phase === 'error') {
    return (
      <ChartCard title={copy.title} description={copy.description}>
        <MinimalState
          tone="critical"
          title="Não foi possível carregar a evolução"
          description="O histórico deste tema está indisponível no momento."
        />
      </ChartCard>
    );
  }

  const reading = readTimeseries<TrendPoint>(payload, MEDIDAS[domain]);
  const cohorts = describeCohorts(reading.legend, COORTES[domain]);

  return (
    <ChartCard title={copy.title} description={copy.description}>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Granularidade da evolução">
        {GRAOS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGrain(option)}
            aria-pressed={option === grain}
            className={`min-h-8 touch-manipulation rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--minimal-focus)] ${
              option === grain
                ? 'border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text)]'
                : 'border-[color:var(--minimal-border)] text-[color:var(--minimal-text-tertiary)] hover:text-[color:var(--minimal-text-secondary)]'
            }`}
          >
            {grainLabel(option)}
          </button>
        ))}
      </div>

      {reading.available ? (
        <>
          {domain === 'support' ? <SupportTrendChart data={reading.points as SupportTrendPoint[]} /> : null}
          {domain === 'commercial' ? <CommercialTrendChart data={reading.points as CommercialTrendPoint[]} /> : null}
          {domain === 'finance' ? <FinanceTrendChart data={reading.points as FinanceTrendPoint[]} /> : null}
          {cohorts.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-[color:var(--minimal-border)] pt-2 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">
              {cohorts.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[11px] leading-4 text-[color:var(--minimal-text-tertiary)]">
            A evolução usa uma janela própria, mais longa que o recorte selecionado nos indicadores acima, para que a
            tendência tenha pontos suficientes.
          </p>
        </>
      ) : (
        <MinimalState
          title="Sem evolução para mostrar"
          description={reading.reason ?? 'Ainda não há histórico suficiente para desenhar uma evolução confiável deste tema.'}
        />
      )}
    </ChartCard>
  );
}
