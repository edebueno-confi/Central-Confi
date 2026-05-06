import { NavLink, useLocation } from 'react-router-dom';
import { GhostButton, StatusPill, cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/admin/tenants': {
    title: 'Clientes',
    subtitle: 'Acompanhe contas, status e contatos.',
  },
  '/admin/knowledge': {
    title: 'Conhecimento',
    subtitle: 'Gerencie artigos, revisão e publicação.',
  },
  '/admin/access': {
    title: 'Acesso',
    subtitle: 'Gerencie usuários, convites e permissões.',
  },
  '/admin/system': {
    title: 'Sistema',
    subtitle: 'Acompanhe eventos e alertas administrativos.',
  },
};

function AdminQuickNav() {
  const location = useLocation();

  const items = [
    { label: 'Clientes', to: '/admin/tenants' },
    { label: 'Conhecimento', to: '/admin/knowledge' },
    { label: 'Acesso', to: '/admin/access' },
    { label: 'Sistema', to: '/admin/system' },
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cx(
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'border-[rgba(48,127,226,0.24)] bg-[rgba(48,127,226,0.1)] text-[color:var(--color-brand-blue)]'
                : 'border-[color:var(--color-border)] bg-white text-[color:var(--color-ink)]',
            )
          }
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminTopbar({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const location = useLocation();
  const { signOut } = useAuthContext();
  const copy = routeCopy[location.pathname] ?? routeCopy['/admin/tenants'];
  const compactMode =
    location.pathname === '/admin/tenants' ||
    location.pathname === '/admin/knowledge' ||
    location.pathname === '/admin/access' ||
    location.pathname === '/admin/system';
  const showQuickNav = true;

  if (compactMode) {
    return (
      <header className="rounded-[28px] border border-[color:var(--color-border)] bg-white/84 px-5 py-4 shadow-[var(--shadow-panel)] backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[rgba(48,127,226,0.24)] bg-[rgba(48,127,226,0.08)] px-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-blue)]">
              Área administrativa
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <GhostButton
              className="border-[rgba(48,127,226,0.18)] text-[color:var(--color-brand-blue)]"
              onClick={() => void signOut()}
            >
              Encerrar sessão
            </GhostButton>
          </div>
        </div>

        {showQuickNav ? (
          <div className="mt-4">
            <AdminQuickNav />
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="rounded-[28px] border border-[color:var(--color-border)] bg-white/84 px-5 py-4 shadow-[var(--shadow-panel)] backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="accent">Área administrativa</StatusPill>
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
            className="hidden min-h-11 px-4 xl:inline-flex"
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          </GhostButton>
          <GhostButton
            className="border-[rgba(48,127,226,0.18)] text-[color:var(--color-brand-blue)]"
            onClick={() => void signOut()}
          >
            Encerrar sessão
          </GhostButton>
        </div>
      </div>

      <div className="mt-4">
        <AdminQuickNav />
      </div>
    </header>
  );
}
