import { useEffect, useMemo, useRef, useState } from 'react';

export interface AnalyticsPipelineOption {
  id: string;
  pipelineId: string;
  label: string;
  hubspotLabel?: string | null;
  count: number;
  /** Operacao do grupo dona do pipeline (Confi, Neotrust, Aftersale...). */
  groupCompany?: string | null;
}

interface Props {
  storageKey: string;
  pipelines: AnalyticsPipelineOption[];
  excludedPipelineIds: string[];
  onChange: (next: string[]) => void;
  inline?: boolean;
  /**
   * Operacao selecionada no recorte. Quando preenchida, a lista mostra apenas
   * os pipelines daquela operacao — e a contagem de pipelines sem operacao
   * definida e exibida explicitamente, para que nenhum dado suma em silencio.
   */
  operation?: string;
}

export function AnalyticsPipelineCombobox({ storageKey, pipelines, excludedPipelineIds, onChange, inline = false, operation = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const allIncluded = excludedPipelineIds.length === 0;

  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  const isUndefinedOperation = (value: string | null | undefined) => !value || value === 'a_definir';

  // Cascata Operacao -> Pipeline. Sem operacao selecionada, tudo aparece.
  const inScope = useMemo(
    () => (operation ? pipelines.filter((pipeline) => normalize(pipeline.groupCompany ?? '') === normalize(operation)) : pipelines),
    [operation, pipelines],
  );
  const withoutOperation = useMemo(
    () => (operation ? pipelines.filter((pipeline) => isUndefinedOperation(pipeline.groupCompany)).length : 0),
    [operation, pipelines],
  );

  const filtered = useMemo(() => inScope.filter((pipeline) => `${pipeline.label} ${pipeline.hubspotLabel ?? ''} ${pipeline.pipelineId}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [inScope, query]);
  const hasDistinctOfficialName = (pipeline: AnalyticsPipelineOption) => Boolean(pipeline.hubspotLabel && normalize(pipeline.hubspotLabel) !== normalize(pipeline.label));
  const selected = inScope.filter((pipeline) => !excludedPipelineIds.includes(pipeline.pipelineId));

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      try { onChange(JSON.parse(saved) as string[]); } catch { sessionStorage.removeItem(storageKey); }
    }
  // Restore only when the configured pipeline list becomes available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, pipelines.length]);

  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(excludedPipelineIds)); }, [storageKey, excludedPipelineIds]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  const setAll = () => onChange([]);
  // "Ocultar todos" exclui apenas o que esta no recorte atual; pipelines de
  // outras operacoes nao sao afetados pela acao.
  const hideAll = () => onChange([...new Set([...excludedPipelineIds, ...inScope.map((pipeline) => pipeline.pipelineId)])]);
  const noneIncluded = inScope.length > 0 && selected.length === 0;
  const toggle = (id: string) => onChange(excludedPipelineIds.includes(id) ? excludedPipelineIds.filter((value) => value !== id) : [...excludedPipelineIds, id]);
  const label = noneIncluded
    ? 'Nenhum pipeline'
    : allIncluded ? 'Todos os pipelines' : selected.length === 1 ? selected[0].label : `${selected.length} pipelines selecionados`;

  return <div ref={rootRef} className={inline ? 'relative min-w-[14rem] max-w-[22rem] flex-[1.5] basis-56' : 'relative min-w-0'} data-testid="analytics-pipeline-combobox">
    <label className={`${inline ? 'mb-1.5' : 'mb-1'} block text-xs font-medium text-[color:var(--minimal-text-secondary)]`} htmlFor={`${storageKey}-trigger`}>Pipelines</label>
    <button id={`${storageKey}-trigger`} type="button" aria-haspopup="listbox" aria-controls={`${storageKey}-options`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`flex ${inline ? 'h-8' : 'min-h-10'} w-full items-center justify-between gap-2 rounded-lg border border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface)] px-2.5 py-1.5 text-left text-sm text-[color:var(--minimal-text)] hover:border-[color:var(--minimal-border-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--minimal-action)]`}>
      <span className="min-w-0 truncate">{label}</span><span aria-hidden="true" className="text-[color:var(--minimal-text-tertiary)]">⌄</span>
    </button>
    {open ? <div id={`${storageKey}-options`} role="listbox" aria-label="Pipelines do Dashboard" className="absolute z-30 mt-2 max-h-80 w-full min-w-[14rem] overflow-auto rounded-lg border border-[color:var(--minimal-border-strong)] bg-[color:var(--minimal-surface)] p-1.5 shadow-lg">
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pipeline" aria-label="Buscar pipeline" className="mb-1.5 w-full rounded-md border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface)] px-2 py-1.5 text-xs text-[color:var(--minimal-text)] outline-none focus:ring-2 focus:ring-[color:var(--minimal-action)]" />
      <div className="mb-1 flex items-center gap-1.5">
        <button type="button" onClick={setAll} disabled={allIncluded} className="flex-1 rounded-md border border-[color:var(--minimal-border-strong)] px-2 py-1 text-[11px] font-medium text-[color:var(--minimal-text)] transition hover:bg-[color:var(--minimal-surface-muted)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--minimal-action)]">Selecionar todos</button>
        <button type="button" onClick={hideAll} disabled={noneIncluded || inScope.length === 0} className="flex-1 rounded-md border border-[color:var(--minimal-border-strong)] px-2 py-1 text-[11px] font-medium text-[color:var(--minimal-text)] transition hover:bg-[color:var(--minimal-surface-muted)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--minimal-action)]">Ocultar todos</button>
      </div>
      {operation ? <p className="mb-1.5 px-0.5 text-[10px] leading-4 text-[color:var(--minimal-text-tertiary)]">Recorte da operação <strong className="font-semibold">{operation}</strong>: {inScope.length} pipeline{inScope.length === 1 ? '' : 's'}.{withoutOperation > 0 ? ` ${withoutOperation} pipeline${withoutOperation === 1 ? '' : 's'} sem operação definida ficam fora deste recorte.` : ''}</p> : null}
      <button type="button" role="option" aria-selected={allIncluded} onClick={setAll} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${allIncluded ? 'bg-[color:var(--minimal-surface-muted)] font-medium text-[color:var(--minimal-text)]' : 'text-[color:var(--minimal-text-secondary)]'}`}><span>Todos os pipelines</span><span>{inScope.reduce((sum, item) => sum + item.count, 0).toLocaleString('pt-BR')}</span></button>
      {filtered.map((pipeline) => { const included = !excludedPipelineIds.includes(pipeline.pipelineId); return <button key={pipeline.id} type="button" role="option" aria-selected={included} onClick={() => toggle(pipeline.pipelineId)} className={`mt-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${included ? 'bg-[color:var(--minimal-surface-muted)] text-[color:var(--minimal-text)]' : 'text-[color:var(--minimal-text-tertiary)]'}`}><span className="min-w-0 truncate"><span className="block truncate font-medium">{pipeline.label}</span>{hasDistinctOfficialName(pipeline) ? <span className="block truncate text-[10px] opacity-70">{pipeline.hubspotLabel}</span> : null}</span><span className="shrink-0 tabular-nums">{pipeline.count.toLocaleString('pt-BR')}</span></button>; })}
      {filtered.length === 0 ? <p className="px-2.5 py-3 text-xs text-[color:var(--minimal-text-tertiary)]">Nenhum pipeline encontrado.</p> : null}
    </div> : null}
  </div>;
}
