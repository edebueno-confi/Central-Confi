import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { GhostButton, StatusPill, cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const SIDEBAR_STORAGE_KEY = 'support-workspace-shell-collapsed';

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/support': {
    title: 'Workspace de atendimento',
    subtitle:
      'Fila, tratativa e contexto operacional do cliente B2B na mesma superficie interna.',
  },
  '/support/queue': {
    title: 'Fila operacional',
    subtitle: 'Triagem rapida com fila dominante e preview curto do ticket em foco.',
  },
  '/support/tickets': {
    title: 'Tickets',
    subtitle:
      'Tratativa diaria com conversa central, operacao lateral utilitaria e contexto sob demanda.',
  },
};

function describeRoute(pathname: string) {
  if (pathname.startsWith('/support/customers/')) {
    return {
      title: 'Clientes',
      subtitle:
        'Contexto operacional do cliente B2B com stack, tickets recentes e contatos uteis para a tratativa.',
    };
  }

  if (pathname.startsWith('/support/tickets/')) {
    return {
      title: 'Tratativa do ticket',
      subtitle:
        'Conversa primeiro, operacao essencial no rail e historico tecnico fora do fluxo principal.',
    };
  }

  return routeCopy[pathname] ?? routeCopy['/support'];
}

function usePersistedSidebarState() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

function SupportSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const { gate, user } = useAuthContext();

  const customerPath = location.pathname.startsWith('/support/customers/')
    ? location.pathname
    : '/support/queue';

  const navigation = useMemo(
    () =>
      [
        {
          label: 'Fila',
          shortLabel: 'Q',
          to: '/support/queue',
          isActive: (pathname: string) => pathname === '/support' || pathname === '/support/queue',
        },
        {
          label: 'Tickets',
          shortLabel: 'T',
          to: '/support/tickets',
          isActive: (pathname: string) => pathname.startsWith('/support/tickets'),
        },
        {
          label: 'Clientes',
          shortLabel: 'C',
          to: customerPath,
          isActive: (pathname: string) => pathname.startsWith('/support/customers/'),
        },
        {
          label: 'Knowledge',
          shortLabel: 'K',
          to: '/admin/knowledge',
          isActive: (pathname: string) => pathname.startsWith('/admin/knowledge'),
        },
        ...(gate.actor?.is_platform_admin
          ? [
              {
                label: 'Admin',
                shortLabel: 'A',
                to: '/admin/tenants',
                isActive: (pathname: string) => pathname.startsWith('/admin/'),
              },
            ]
          : []),
      ] satisfies Array<{
        label: string;
        shortLabel: string;
        to: string;
        isActive: (pathname: string) => boolean;
      }>,
    [customerPath, gate.actor?.is_platform_admin],
  );

  return (
    <aside
      className={cx(
        'flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,#06173f_0%,#0a1e53_52%,#10265f_100%)] px-3 py-4 text-white shadow-[0_26px_58px_rgba(9,20,56,0.24)] transition-[width,padding] duration-200',
        collapsed ? 'w-[86px]' : 'w-[236px]',
      )}
    >
      <div
        className={cx(
          'flex items-start gap-3 px-2',
          collapsed ? 'justify-center' : '',
        )}
      >
        <div className={cx('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}>
          <img alt="Mascote Genius" className="w-10 shrink-0" src={mascotUrl} />
          {!collapsed ? (
            <div className="min-w-0 pt-1">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/48">
                Genius
              </p>
              <h1 className="text-[0.96rem] font-semibold tracking-[-0.04em] leading-tight">
                Support Workspace
              </h1>
            </div>
          ) : null}
        </div>
        <GhostButton
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cx(
            'mt-0.5 min-h-10 shrink-0 border-white/10 bg-white/8 px-3 text-white hover:bg-white/12 hover:text-white',
            collapsed ? 'w-10 px-0' : 'ml-auto',
          )}
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '>' : '<'}
        </GhostButton>
      </div>

      <nav className="mt-8 grid gap-2">
        {navigation.map((item) => {
          const active = item.isActive(location.pathname);

          return (
            <Link
              className={cx(
                'group flex min-h-13 items-center gap-3 rounded-[14px] px-3 py-2.5 text-[0.96rem] font-medium transition',
                collapsed ? 'justify-center px-0' : '',
                active
                  ? 'bg-[linear-gradient(135deg,#1f67ff,#2f7eff)] text-white shadow-[0_16px_30px_rgba(18,81,213,0.35)]'
                  : 'text-white/78 hover:bg-white/10 hover:text-white',
              )}
              key={`${item.label}:${item.to}`}
              title={item.label}
              to={item.to}
            >
              <span
                className={cx(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[0.72rem] font-semibold uppercase tracking-[0.14em]',
                  active
                    ? 'border-white/14 bg-white/12 text-white'
                    : 'border-white/12 bg-white/6 text-white/88',
                )}
              >
                {item.shortLabel}
              </span>
              {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
              {!collapsed && active ? (
                <span className="ml-auto inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-white/14 px-2 text-xs font-semibold text-white">
                  •
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-1">
        <div
          className={cx(
            'flex items-center rounded-[18px] border border-white/10 bg-white/7 px-3 py-3',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f4b1c8,#ffffff)] text-sm font-semibold text-[color:var(--color-brand-navy)]">
            {String(user?.user_metadata?.full_name ?? user?.email ?? 'QA')
              .split(' ')
              .slice(0, 2)
              .map((chunk) => chunk[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {String(user?.user_metadata?.full_name ?? user?.email ?? 'Operador interno')}
              </p>
              <p className="truncate text-[0.72rem] text-white/62">
                {gate.actor?.roles.includes('support_manager') ? 'Manager' : 'Agente'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function SupportQuickNav() {
  const location = useLocation();
  const { gate } = useAuthContext();
  const customerPath = location.pathname.startsWith('/support/customers/')
    ? location.pathname
    : '/support/queue';

  const items = [
    { label: 'Queue', to: '/support/queue' },
    { label: 'Tickets', to: '/support/tickets' },
    { label: 'Customers', to: customerPath },
    { label: 'Knowledge', to: '/admin/knowledge' },
    ...(gate.actor?.is_platform_admin ? [{ label: 'Admin', to: '/admin/tenants' }] : []),
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
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
          key={`${item.label}:${item.to}`}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SupportTopbar() {
  const location = useLocation();
  const { runtimeConfig, signOut } = useAuthContext();
  const isTicketRoute = location.pathname.startsWith('/support/tickets/');

  if (isTicketRoute) {
    return (
      <div className="lg:hidden">
        <header className="rounded-[22px] border border-[color:var(--color-border)] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(19,33,79,0.08)] backdrop-blur sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
              <StatusPill>agent workspace</StatusPill>
            </div>
            <GhostButton
              className="min-h-10 border-[rgba(48,127,226,0.18)] px-4 text-[color:var(--color-brand-blue)]"
              onClick={() => void signOut()}
            >
              Encerrar sessao
            </GhostButton>
          </div>

          <div className="mt-3">
            <SupportQuickNav />
          </div>
        </header>
      </div>
    );
  }

  return (
    <header className="rounded-[22px] border border-[color:var(--color-border)] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(19,33,79,0.08)] backdrop-blur sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
          <StatusPill>agent workspace</StatusPill>
        </div>

        <div className="flex flex-wrap gap-2">
          <GhostButton
            className="min-h-10 border-[rgba(48,127,226,0.18)] px-4 text-[color:var(--color-brand-blue)]"
            onClick={() => void signOut()}
          >
            Encerrar sessao
          </GhostButton>
        </div>
      </div>

      <div className="mt-3">
        <SupportQuickNav />
      </div>
    </header>
  );
}

export function SupportWorkspaceShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1800px] gap-4 px-3 py-3 sm:px-4 lg:px-5">
        <div className="hidden shrink-0 lg:block">
          <div className="sticky top-3 h-[calc(100vh-1.5rem)]">
            <SupportSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cx('space-y-4', location.pathname.startsWith('/support/tickets/') && 'lg:space-y-0')}>
            <SupportTopbar />
            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
