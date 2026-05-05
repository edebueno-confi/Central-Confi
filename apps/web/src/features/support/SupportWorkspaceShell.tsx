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
    title: 'Fila',
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
          label: 'Queue',
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
          label: 'Customers',
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
        'flex h-full flex-col rounded-[28px] border border-white/50 bg-[linear-gradient(180deg,rgba(17,28,66,0.99),rgba(24,42,97,0.98))] p-3 text-white shadow-[0_24px_54px_rgba(20,31,71,0.22)] transition-[width,padding] duration-200',
        collapsed ? 'w-[92px]' : 'w-[244px]',
      )}
    >
      <div
        className={cx(
          'rounded-[22px] border border-white/10 bg-white/6 px-3 py-3',
          collapsed ? 'flex flex-col items-center gap-2 px-2' : 'flex items-center gap-3',
        )}
      >
        <div className={cx('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}>
          <img alt="Mascote Genius" className="w-11 shrink-0" src={mascotUrl} />
          {!collapsed ? (
            <div className="min-w-0 space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white/58">
                Genius
              </p>
              <h1 className="text-base font-semibold tracking-[-0.04em]">
                Support Workspace
              </h1>
            </div>
          ) : null}
        </div>
        <GhostButton
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cx(
            'min-h-10 shrink-0 border-white/16 bg-white/8 px-3 text-white hover:bg-white/12 hover:text-white',
            collapsed ? 'w-10 px-0' : 'ml-auto',
          )}
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '>' : '<'}
        </GhostButton>
      </div>

      <nav className="mt-5 grid gap-2">
        {navigation.map((item) => {
          const active = item.isActive(location.pathname);

          return (
            <Link
              className={cx(
                'group flex min-h-12 items-center gap-3 rounded-[18px] px-3 py-2 text-sm font-medium transition',
                collapsed ? 'justify-center px-0' : '',
                active
                  ? 'bg-white text-[color:var(--color-brand-navy)] shadow-[0_14px_28px_rgba(12,20,48,0.18)]'
                  : 'text-white/76 hover:bg-white/10 hover:text-white',
              )}
              key={`${item.label}:${item.to}`}
              title={item.label}
              to={item.to}
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/16 bg-current/8 text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
                {item.shortLabel}
              </span>
              {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[22px] border border-white/10 bg-white/8 px-3 py-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/58">
          {collapsed ? 'Sessao' : 'Sessao atual'}
        </p>
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium text-white">
            {collapsed
              ? String(user?.user_metadata?.full_name ?? user?.email ?? 'QA')
                  .split(' ')
                  .slice(0, 2)
                  .join(' ')
              : String(user?.user_metadata?.full_name ?? user?.email ?? 'Operador interno')}
          </p>
          {!collapsed ? (
            <p className="text-xs text-white/66">{user?.email ?? 'Sem email resolvido'}</p>
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
  const copy = describeRoute(location.pathname);

  return (
    <header className="rounded-[24px] border border-[color:var(--color-border)] bg-white/92 px-4 py-4 shadow-[0_14px_28px_rgba(19,33,79,0.08)] backdrop-blur sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
            <StatusPill>agent workspace</StatusPill>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
              {copy.title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--color-muted)]">
              {copy.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GhostButton
            className="min-h-11 border-[rgba(48,127,226,0.18)] text-[color:var(--color-brand-blue)]"
            onClick={() => void signOut()}
          >
            Encerrar sessao
          </GhostButton>
        </div>
      </div>

      <div className="mt-4">
        <SupportQuickNav />
      </div>
    </header>
  );
}

export function SupportWorkspaceShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1920px] gap-4 px-3 py-3 sm:px-5 lg:px-6">
        <div className="hidden shrink-0 lg:block">
          <div className="sticky top-3 h-[calc(100vh-1.5rem)]">
            <SupportSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="space-y-4">
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
