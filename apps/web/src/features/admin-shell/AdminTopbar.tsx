import { useLocation } from 'react-router-dom';
import { GhostButton, StatusPill } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/admin/tenants': {
    title: 'Tenants',
    subtitle: 'Clientes B2B, status operacional e contexto de pos-venda em uma unica superficie.',
  },
  '/admin/access': {
    title: 'Access',
    subtitle: 'Governanca minima de memberships para a operacao Genius.',
  },
  '/admin/system': {
    title: 'System',
    subtitle: 'Rastreabilidade administrativa do backbone de trocas e devolucoes.',
  },
};

export function AdminTopbar() {
  const location = useLocation();
  const { runtimeConfig, signOut } = useAuthContext();
  const copy = routeCopy[location.pathname] ?? routeCopy['/admin/tenants'];

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-[color:var(--color-border)] bg-white/84 px-5 py-4 shadow-[var(--shadow-panel)] backdrop-blur sm:px-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
          <StatusPill>platform_admin</StatusPill>
          <StatusPill>pos-venda</StatusPill>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {copy.title}
          </h2>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <GhostButton
          className="border-[rgba(48,127,226,0.18)] text-[color:var(--color-brand-blue)]"
          onClick={() => void signOut()}
        >
          Encerrar sessao
        </GhostButton>
      </div>
    </header>
  );
}
