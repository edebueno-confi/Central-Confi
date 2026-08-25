import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getAnalyticsSourceStatus, triggerSequentialAnalyticsSync, waitForAnalyticsSyncCompletion } from './analytics-api';
import { listEnabledAnalyticsDomains } from './analytics-domains';
import type { AnalyticsSharedPeriod, AnalyticsSharedPipelineExclusions } from './analytics-model';
import type { AnalyticsSourceStatusPayload } from '@genius-support-os/contracts';
import { useAuthContext } from '../auth/auth-context';
import { resolveAnalyticsPeriod } from './analytics-periods';
import { AnalyticsReportExport } from './AnalyticsReportExport';
import { MinimalState } from '../../components/minimal-states';
import { analyticsDomainFromTab, analyticsTabForDomain, normalizeAnalyticsSearch } from './analytics-navigation';
import { isAnalyticsDomainPublishedInRelease } from '../../app/release-surface.mjs';
import { GeniusSyncOverlay, type SyncSource, type SyncVisualState } from '../../components/GeniusSyncOverlay';
import { canManageAnalyticsIntegration } from './analytics-permissions.mjs';
import { areAnalyticsSourcesActive, syncProgressLabel } from './analytics-sync-progress.mjs';
import './high-density.css';

const DOMAINS = listEnabledAnalyticsDomains();

function readSharedPipelineExclusions(): AnalyticsSharedPipelineExclusions {
  try {
    const read = (key: string) => {
      const raw = window.sessionStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
    };
    return { commercial: read('analytics-commercial-pipelines'), support: read('analytics-cs-pipelines') };
  } catch {
    return { commercial: [], support: [] };
  }
}

function terminalSyncState(status: AnalyticsSourceStatusPayload): SyncVisualState {
  const sources = [status.hubspot, status.omie];
  if (sources.some((source) => source.currentRunStatus === 'timed_out')) return 'timed_out';
  if (sources.some((source) => source.currentRunStatus === 'abandoned')) return 'abandoned';
  if (sources.some((source) => source.currentRunStatus === 'failed' || source.status === 'failed')) return 'failed';
  return 'publishing';
}

export function AnalyticsShell() {
  const { gate } = useAuthContext();
  const isPlatformAdmin = gate.actor?.is_platform_admin === true;
  const canSyncSources = canManageAnalyticsIntegration(gate.actor);
  const isDashboardViewer = !isPlatformAdmin && gate.actor?.roles.includes('dashboard_viewer') === true;
  // O dashboard_viewer recebe a mesma leitura dos domínios executivos, sem
  // ganhar ações administrativas. A autorização de rota e os read models
  // continuam sendo a fonte da permissão; aqui só evitamos esconder dados
  // aprovados da navegação.
  const visibleDomains = DOMAINS.filter((domain) => isAnalyticsDomainPublishedInRelease(domain.key));
  const location = useLocation();
  const navigate = useNavigate();
  const urlParams = useMemo(() => normalizeAnalyticsSearch(location.search), [location.search]);
  const activeKey = analyticsDomainFromTab(urlParams.get('tab'));
  const [reloadKey, setReloadKey] = useState(0);
  const [sourceStatus, setSourceStatus] = useState<AnalyticsSourceStatusPayload | null>(null);
  const [sharedPeriod, setSharedPeriod] = useState<AnalyticsSharedPeriod>(() => {
    const fallback = resolveAnalyticsPeriod('month');
    return { ...fallback, from: urlParams.get('from') ?? fallback.from, to: urlParams.get('to') ?? fallback.to };
  });
  const [sharedOperation, setSharedOperation] = useState<string>(() => {
    try {
      return window.localStorage.getItem('analytics-operation-scope') ?? '';
    } catch {
      return '';
    }
  });
  const [sharedExcludedPipelineIds, setSharedExcludedPipelineIds] = useState<AnalyticsSharedPipelineExclusions>(readSharedPipelineExclusions);
  const [reportOpen, setReportOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ source: SyncSource; state: SyncVisualState; detail?: string } | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    const from = urlParams.get('from');
    const to = urlParams.get('to');
    if (from && to) setSharedPeriod((current) => current.from === from && current.to === to ? current : { from, to });
  }, [urlParams]);

  const handleSharedOperationChange = useCallback((operation: string) => {
    setSharedOperation(operation);
    try {
      if (operation) window.localStorage.setItem('analytics-operation-scope', operation);
      else window.localStorage.removeItem('analytics-operation-scope');
    } catch {
      // Preferência de recorte não bloqueia o Dashboard.
    }
  }, []);

  const handleSharedExcludedPipelineIdsChange = useCallback((next: AnalyticsSharedPipelineExclusions) => {
    setSharedExcludedPipelineIds(next);
  }, []);

  const activeDomain = visibleDomains.find((domain) => domain.key === activeKey) ?? visibleDomains[0];
  const refreshSourceStatus = useCallback(async () => {
    try {
      const next = await getAnalyticsSourceStatus();
      setSourceStatus(next);
      return next;
    } catch {
      setSourceStatus(null);
      return null;
    }
  }, []);
  useEffect(() => { refreshSourceStatus(); }, [refreshSourceStatus]);
  const syncSources = useCallback(async () => {
    if (!canSyncSources || syncBusy) return;
    const currentStatus = sourceStatus ?? await refreshSourceStatus();
    if (currentStatus && areAnalyticsSourcesActive(currentStatus, 'full')) {
      setSyncFeedback({ source: 'painel', state: 'abandoned', detail: 'J\u00e1 existe um ciclo em andamento. A execu\u00e7\u00e3o atual continua sendo acompanhada no Hist\u00f3rico.' });
      return;
    }
    setSyncBusy(true);
    setSyncFeedback({ source: 'painel', state: 'preparing', detail: 'HubSpot ser\u00e1 atualizado antes do OMIE, em um \u00fanico ciclo protegido.' });
    try {
      await triggerSequentialAnalyticsSync();
      const completion = await waitForAnalyticsSyncCompletion('full');
      setSourceStatus(completion.status);
      const finalState = completion.timedOut ? 'timed_out' : terminalSyncState(completion.status);
      setSyncFeedback({ source: 'painel', state: finalState, detail: completion.timedOut ? syncProgressLabel('full', true) : undefined });
      setReloadKey((current) => current + 1);
      if (!completion.timedOut && finalState === 'publishing') {
        await refreshSourceStatus();
        setSyncFeedback(null);
      }
    } catch {
      setSyncFeedback({ source: 'painel', state: 'failed', detail: 'N\u00e3o foi poss\u00edvel concluir a atualiza\u00e7\u00e3o. O painel preservou os \u00faltimos dados publicados.' });
    } finally {
      setSyncBusy(false);
    }
  }, [canSyncSources, refreshSourceStatus, sourceStatus, syncBusy]);
  const ActiveComponent = activeDomain?.Component;

  return (
    <div className="gso-screen-frame gso-analytics-shell gso-pilot-shell gso-visual-v1-shell gso-high-density-ui flex h-full min-h-0 flex-col overflow-hidden bg-[color:var(--gso-canvas-bg,#081220)]">
      {syncFeedback ? <GeniusSyncOverlay source={syncFeedback.source} state={syncFeedback.state} hasValidSnapshot={Boolean(sourceStatus?.hubspot.hasValidSnapshot && sourceStatus?.omie.hasValidSnapshot)} detail={syncFeedback.detail} historyHref="/admin/settings/sync-history" /> : null}
      <header className="gso-screen-header gso-workspace-header shrink-0 px-5 py-3 sm:px-6 bg-transparent">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--minimal-text)]">Dashboard Gerencial</h1>
            <p className="truncate text-xs text-[color:var(--minimal-text-secondary)]">Visão executiva integrada a HubSpot, OMIE e fontes operacionais.</p>
            {isDashboardViewer ? <span className="text-[11px] font-medium text-[color:var(--minimal-text-tertiary)]">Visualizador gerencial</span> : null}
          </div>
          <div className="gso-shell-actions flex flex-wrap items-center justify-end gap-3">
            {isPlatformAdmin ? <Link to="/admin/settings/dashboard-sources" className="gso-shell-secondary-action" title="Abrir governança de fontes, pipelines, reconciliação e Integrações">Governança de dados</Link> : null}
            {isPlatformAdmin ? <button type="button" onClick={() => setReportOpen(true)} className="gso-shell-report-action">Exportar</button> : null}
          </div>
        </div>
        <nav className="gso-workspace-tabs gso-analytics-domain-tabs mt-2 flex max-w-full flex-nowrap gap-1 overflow-x-auto pb-1 pr-4" aria-label="Áreas do dashboard">
          {visibleDomains.map((domain) => {
            const isActive = domain.key === activeKey;
            return <button key={domain.key} type="button" onClick={() => { const next = normalizeAnalyticsSearch(location.search); next.set('tab', analyticsTabForDomain(domain.key)); if (domain.key !== 'support') next.delete('pipeline'); navigate({ pathname: '/admin/analytics', search: `?${next.toString()}` }); }} aria-current={isActive ? 'page' : undefined} title={domain.description} className={`gso-workspace-tab flex-none whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--minimal-action)] focus-visible:ring-offset-2 ${isActive ? 'text-[color:var(--minimal-text)]' : 'text-[color:var(--minimal-text-secondary)] hover:text-[color:var(--minimal-text)]'}`}>{domain.label}</button>;
          })}
        </nav>
      </header>
      <div className="gso-analytics-content min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <Suspense fallback={<MinimalState loading title="Carregando área do dashboard" description="Estamos preparando os indicadores deste recorte." />}>
          {ActiveComponent ? <ActiveComponent key={`${activeKey}-${reloadKey}`} sharedPeriod={sharedPeriod} onSharedPeriodChange={setSharedPeriod} sharedOperation={sharedOperation} onSharedOperationChange={handleSharedOperationChange} sharedExcludedPipelineIds={sharedExcludedPipelineIds} onSharedExcludedPipelineIdsChange={handleSharedExcludedPipelineIdsChange} onRetry={() => setReloadKey((current) => current + 1)} isDashboardViewer={isDashboardViewer} sourceStatus={sourceStatus ?? undefined} canSyncSources={activeKey === 'ceo' && canSyncSources && Boolean(sourceStatus)} syncSources={activeKey === 'ceo' ? () => void syncSources() : undefined} syncBusy={syncBusy} /> : null}
        </Suspense>
      </div>
      <AnalyticsReportExport open={reportOpen} period={sharedPeriod} groupCompany={sharedOperation} onClose={() => setReportOpen(false)} />
    </div>
  );
}
