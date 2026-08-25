import { useEffect, useMemo, useState } from 'react';

export interface AnalyticsOperationOption {
  value: string;
  source: 'pending' | 'suggested' | 'confirmed';
}

const sourcePriority: Record<AnalyticsOperationOption['source'], number> = {
  confirmed: 0,
  suggested: 1,
  pending: 2,
};

/**
 * Um mesmo agrupamento pode ser dono de diversos pipelines. O seletor mostra
 * a operacao, nao o pipeline: por isso cada valor aparece uma unica vez.
 * Quando coexistem sugestao e confirmacao para o mesmo nome, a confirmacao
 * prevalece sem alterar o valor que segue para as RPCs de Analytics.
 */
export function dedupeAnalyticsOperationOptions(options: AnalyticsOperationOption[]) {
  const unique = new Map<string, AnalyticsOperationOption>();

  for (const option of options.filter((candidate) => candidate.source === 'confirmed')) {
    const value = option.value.trim().replace(/\s+/g, ' ');
    if (!value || value === 'a_definir') continue;

    const key = value.toLocaleLowerCase('pt-BR');
    const current = unique.get(key);
    if (!current || sourcePriority[option.source] < sourcePriority[current.source]) {
      unique.set(key, { ...option, value });
    }
  }

  return [...unique.values()].sort((left, right) =>
    left.value.localeCompare(right.value, 'pt-BR', { sensitivity: 'base' }),
  );
}

export function AnalyticsOperationScope({ storageKey, options, value, onChange, inline = false }: { storageKey: string; options: AnalyticsOperationOption[]; value: string; onChange: (value: string) => void; inline?: boolean }) {
  const [restored, setRestored] = useState(false);
  const visible = useMemo(() => dedupeAnalyticsOperationOptions(options), [options]);

  useEffect(() => {
    if (restored || visible.length === 0) return;
    const saved = localStorage.getItem(storageKey) ?? '';
    if (saved === '' || visible.some((option) => option.value === saved)) onChange(saved);
    setRestored(true);
  }, [onChange, restored, storageKey, visible]);

  useEffect(() => {
    if (restored) localStorage.setItem(storageKey, value);
  }, [restored, storageKey, value]);

  if (visible.length === 0) return null;
  const selected = visible.find((option) => option.value === value);
  return <label className={`flex flex-col gap-1.5 text-xs font-medium text-[color:var(--minimal-text-secondary)] ${inline ? 'min-w-[8rem] max-w-[11rem] flex-1 basis-36' : 'min-w-[12rem] flex-1 basis-48'}`}>
    Operação
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`${inline ? 'h-8 px-2 text-xs' : 'h-9 px-2.5 text-sm'} rounded-md border border-[color:var(--minimal-border)] bg-[color:var(--minimal-surface)] font-normal text-[color:var(--minimal-text)] outline-none transition focus:border-[color:var(--minimal-text-secondary)] focus:ring-2 focus:ring-[color:var(--minimal-border-strong)]`}>
      <option value="">Todas</option>
      {visible.map((option) => <option key={option.value} value={option.value}>{option.value}{option.source === 'suggested' ? ' (sugerida)' : option.source === 'pending' ? ' (a definir)' : ''}</option>)}
    </select>
    {selected?.source === 'suggested' ? <span className="font-normal text-[10px] text-[color:var(--minimal-text-tertiary)]">Agrupamento sugerido; não altera permissão.</span> : null}
  </label>;
}
