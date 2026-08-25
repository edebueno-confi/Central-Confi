import { useEffect, useRef } from 'react';

type HelpRow = {
  metric: string;
  source: string;
  fields: string;
  formula: string;
  scope: string;
};

type HelpSection = {
  title: string;
  description: string;
  rows: HelpRow[];
};

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Visão Geral',
    description: 'Resumo executivo. Posição atual e movimento do período são leituras diferentes e não devem ser somados.',
    rows: [
      { metric: 'Em negociação', source: 'HubSpot Deals via rpc_analytics_ceo_snapshot e RPCs comerciais', fields: 'pipeline, dealstage, amount_in_home_currency, hs_created_at', formula: 'Soma do valor de negócios não fechados na posição atual', scope: 'Todas; por operação somente onde o pipeline está classificado' },
      { metric: 'Negócios ganhos / conversão', source: 'HubSpot Deals e hubspot_pipeline_stages', fields: 'is_won, is_closed, hs_closed_at, amount_home', formula: 'Ganhos fechados no período; ganhos / negócios encerrados no mesmo período', scope: 'Período selecionado e operação publicada' },
      { metric: 'Atendimentos abertos / criados', source: 'HubSpot Tickets via RPCs de Suporte', fields: 'hs_pipeline, hs_pipeline_stage, hs_created_at', formula: 'Posição aberta agora; contagem criada dentro do período', scope: 'Período e operação por pipeline de ticket' },
      { metric: 'MRR, clientes ativos e recebíveis', source: 'Read models de empresas, OMIE e contrato executivo', fields: 'Regra de cliente ativo, MRR, data de pagamento, saldo e vencimento', formula: 'Definida no contrato server-side; ausência de dimensão operacional permanece indisponível', scope: 'Consolidado atualmente; não inferir After Sale por nome ou pipeline' },
    ],
  },
  {
    title: 'Comercial',
    description: 'A posição usa o estado atual do funil. A evolução só pode usar eventos temporais realmente armazenados.',
    rows: [
      { metric: 'Pipeline aberto', source: 'hubspot_deals + analytics_source_config', fields: 'pipeline_id, dealstage, amount_home, owner_id', formula: 'Soma de amount_home onde o estágio não está fechado', scope: 'Operação, pipeline, etapa e responsável, quando publicados' },
      { metric: 'Funil por etapa', source: 'hubspot_deals + hubspot_pipeline_stages', fields: 'stage_id, stage_label, display_order, is_closed, is_won', formula: 'Contagem e valor aberto agrupados por etapa', scope: 'O mesmo período não altera posição aberta; ganhos/perdas alteram com a coorte de fechamento' },
      { metric: 'Ganhos, perdas e taxa', source: 'HubSpot Deals', fields: 'hs_closed_at, is_won, amount_home', formula: 'Ganhos e perdas fechados no período; win rate = ganhos / negócios fechados', scope: 'Período e operação server-side' },
      { metric: 'Performance por responsável', source: 'HubSpot Deals + hubspot_owners', fields: 'hubspot_owner_id, amount_home, hs_created_at, hs_closed_at', formula: 'Negócios, ganhos, perdas, receita e ciclo agrupados por owner', scope: 'Só publicar histórico se houver série temporal comprovada' },
    ],
  },
  {
    title: 'Suporte',
    description: 'A leitura acompanha tickets. Campos vazios não são tratados como sucesso, zero ou atendimento resolvido.',
    rows: [
      { metric: 'Fila aberta', source: 'hubspot_tickets + hubspot_pipeline_stages', fields: 'hs_pipeline, hs_pipeline_stage, hs_ticket_priority, hubspot_owner_id', formula: 'Contagem de tickets em estágio não fechado', scope: 'Operação, pipeline, etapa, prioridade e responsável' },
      { metric: 'Criados no período', source: 'HubSpot Tickets', fields: 'hs_created_at', formula: 'Contagem de tickets cuja criação está no intervalo selecionado', scope: 'Período e operação por pipeline' },
      { metric: 'SLA e resolução', source: 'HubSpot Tickets + analytics_ticket_resolution_history', fields: 'closed_date, status de SLA e histórico de resolução', formula: 'Somente quando o campo/status tiver cobertura; sem preenchimento não há inferência', scope: 'Cobertura parcial ou indisponível é exibida como estado' },
    ],
  },
  {
    title: 'Customer Success',
    description: 'A carteira depende de empresa e associações reais. Evolução permanece indisponível sem snapshots temporais válidos.',
    rows: [
      { metric: 'Clientes ativos / MRR', source: 'hubspot_companies, vínculos OMIE e rpc_analytics_customer_success_kpis_v2', fields: 'regra de cliente ativo, MRR, tax_id e associações', formula: 'Contagem e soma da carteira elegível segundo o contrato', scope: 'Não atribuir empresa por nome, deal ou proximidade textual' },
      { metric: 'Tickets da carteira', source: 'HubSpot Tickets associados a Companies', fields: 'associação ticket→empresa, hs_pipeline, hs_pipeline_stage', formula: 'Empresas ativas com tickets abertos ou críticos', scope: 'Parcial/indisponível quando a associação não cobre o universo' },
      { metric: 'Evolução, churn, NRR e GRR', source: 'Histórico de estados de clientes', fields: 'snapshots e transições temporais', formula: 'Não calculado a partir de snapshot único', scope: 'Aguardando histórico real' },
    ],
  },
  {
    title: 'Financeiro',
    description: 'A fonte publicada é o read model OMIE. O filtro por operação não deve aparecer como funcional antes de existir dimensão operacional financeira.',
    rows: [
      { metric: 'Recebido', source: 'analytics_finance_receivables via rpc_analytics_finance_snapshot', fields: 'dDtPagamento/campo normalizado de pagamento, nValPago quando reconciliado', formula: 'Soma de valores recebidos associados à data de pagamento', scope: 'Consolidado; After Sale exige contrato explícito' },
      { metric: 'A receber e vencido', source: 'Read model OMIE', fields: 'nValAberto, vencimento e bucket de aging', formula: 'Saldo aberto e parcela vencida segundo posição e aging', scope: 'Consolidado; não usar campo HubSpot como substituto' },
      { metric: 'Conciliação', source: 'OMIE + HubSpot', fields: 'CNPJ normalizado e status de cliente', formula: 'Reconciliação por identidade auditável, nunca por nome aproximado como regra', scope: 'Exceções permanecem visíveis' },
    ],
  },
];

export function AnalyticsDashboardHelp({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement) previousActiveElement.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 sm:p-8" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} data-analytics-help-dialog="true" className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[color:var(--minimal-border-strong)] bg-[color:var(--gso-canvas-bg,#081220)] p-5 text-[color:var(--minimal-text)] shadow-2xl sm:max-h-[calc(100vh-4rem)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="analytics-help-title">
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--minimal-border)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--minimal-action)]">Central de Ajuda interna</p>
            <h2 id="analytics-help-title" className="mt-1 text-xl font-semibold">Como o Dashboard calcula e filtra os dados</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--minimal-text-secondary)]">A interface lê contratos server-side. Esta central explica fonte, campos, fórmula, coorte, operação e limites. Quando a origem não comprova um recorte, o estado correto é Indisponível.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-lg border border-[color:var(--minimal-border-strong)] px-3 py-1.5 text-sm font-medium text-[color:var(--minimal-text-secondary)] hover:text-[color:var(--minimal-text)]" aria-label="Fechar Central de Ajuda">Fechar</button>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] p-4">
            <h3 className="font-semibold">Como ler os filtros</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[color:var(--minimal-text-secondary)]">
              <li><strong className="text-[color:var(--minimal-text)]">Período:</strong> altera coortes de criação, fechamento ou pagamento. A posição atual continua sendo uma fotografia do estado presente.</li>
              <li><strong className="text-[color:var(--minimal-text)]">Operação:</strong> hoje é publicada por classificação server-side de pipeline. Não é inferida pelo nome da empresa.</li>
              <li><strong className="text-[color:var(--minimal-text)]">Respostas antigas:</strong> são descartadas ao trocar filtros; o painel limpa o snapshot e entra em carregamento.</li>
            </ul>
          </article>
          <article className="rounded-xl border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] p-4">
            <h3 className="font-semibold">Por que alguns números ficam indisponíveis?</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--minimal-text-secondary)]">MRR, clientes ativos, recebíveis por operação e evolução de Customer Success exigem dimensões e histórico que o contrato atual ainda não publica em todos os recortes. O Dashboard não substitui essa ausência por zero nem por dado consolidado de outra operação.</p>
          </article>
        </div>

        <div className="mt-6 space-y-5">
          {HELP_SECTIONS.map((section) => (
            <section key={section.title} aria-labelledby={`analytics-help-${section.title}`}>
              <h3 id={`analytics-help-${section.title}`} className="text-base font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-[color:var(--minimal-text-secondary)]">{section.description}</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--minimal-border)]">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text-tertiary)]"><tr><th className="p-3">Indicador</th><th className="p-3">Fonte</th><th className="p-3">Campos</th><th className="p-3">Fórmula / definição</th><th className="p-3">Recorte</th></tr></thead>
                  <tbody>{section.rows.map((row) => <tr key={`${section.title}-${row.metric}`} className="border-t border-[color:var(--minimal-border)] align-top"><td className="p-3 font-medium">{row.metric}</td><td className="p-3 text-[color:var(--minimal-text-secondary)]">{row.source}</td><td className="p-3 text-[color:var(--minimal-text-secondary)]">{row.fields}</td><td className="p-3 text-[color:var(--minimal-text-secondary)]">{row.formula}</td><td className="p-3 text-[color:var(--minimal-text-secondary)]">{row.scope}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface-muted)] p-4" aria-labelledby="analytics-help-operation-model">
          <h3 id="analytics-help-operation-model" className="font-semibold">Próximo modelo de pertencimento operacional</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--minimal-text-secondary)]">A auditoria read-only encontrou empresas ligadas a mais de uma unidade e campos por operação no HubSpot. A recomendação é usar uma entrada multi-select governada, se aprovada pelo negócio, e derivar dela um read model local normalizado de pertencimento, status, MRR, origem, data e confiança. O Dashboard só deve usar essa dimensão depois de validar preenchimento, histórico, associações e RLS. Não houve criação nem preenchimento automático nesta versão.</p>
        </section>
        <section className="mt-4 rounded-xl border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface-muted)] p-4" aria-labelledby="analytics-help-future-insights">
          <h3 id="analytics-help-future-insights" className="font-semibold">Reuniões e predição</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--minimal-text-secondary)]">Reuniões e previsão de metas ainda não são indicadores publicados. Antes de exibir esses insights, o backend precisa comprovar eventos de reunião, associações, pipeline aberto, conversão, ciclo e valor médio. O cálculo deve permanecer no backend, com premissas e estado explícitos.</p>
        </section>
      </section>
    </div>
  );
}
