import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { GhostButton, cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const SIDEBAR_STORAGE_KEY = 'support-workspace-shell-collapsed';

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

function SupportNavIcon({
  icon,
  active,
}: {
  icon: 'queue' | 'tickets' | 'customers' | 'knowledge' | 'admin';
  active: boolean;
}) {
  const iconClassName = cx(
    'h-[18px] w-[18px] shrink-0',
    active ? 'text-white' : 'text-white/82 group-hover:text-white',
  );

  switch (icon) {
    case 'queue':
      return (
        <svg aria-hidden="true" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <rect height="14" rx="2.4" width="14" x="5" y="5" />
          <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" />
        </svg>
      );
    case 'tickets':
      return (
        <svg aria-hidden="true" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M8 6h8a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1a2.5 2.5 0 0 0 0-5V8a2 2 0 0 1 2-2Z" />
          <path d="M12 8v8" strokeDasharray="2.4 2.4" strokeLinecap="round" />
        </svg>
      );
    case 'customers':
      return (
        <svg aria-hidden="true" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M6.5 18.2a5.9 5.9 0 0 1 11 0" strokeLinecap="round" />
        </svg>
      );
    case 'knowledge':
      return (
        <svg aria-hidden="true" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M7 5.8h8.4A2.6 2.6 0 0 1 18 8.4V18H9.5A2.5 2.5 0 0 0 7 20.5V5.8Z" />
          <path d="M7 18V5.8H5.8A1.8 1.8 0 0 0 4 7.6V18a2.5 2.5 0 0 1 2.5-2.5H18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'admin':
      return (
        <svg aria-hidden="true" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M12 4.5 18.5 8v8L12 19.5 5.5 16V8L12 4.5Z" />
          <path d="M12 9v6M9 12h6" strokeLinecap="round" />
        </svg>
      );
  }
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

  const navigation = useMemo(
    () =>
      [
        {
          label: 'Fila',
          icon: 'queue' as const,
          to: '/support/queue',
          isActive: (pathname: string) => pathname === '/support' || pathname === '/support/queue',
        },
        {
          label: 'Tickets',
          icon: 'tickets' as const,
          to: '/support/tickets',
          isActive: (pathname: string) => pathname.startsWith('/support/tickets'),
        },
        {
          label: 'Clientes',
          icon: 'customers' as const,
          to: '/support/customers',
          isActive: (pathname: string) => pathname.startsWith('/support/customers'),
        },
        {
          label: 'Knowledge',
          icon: 'knowledge' as const,
          to: '/admin/knowledge',
          isActive: (pathname: string) => pathname.startsWith('/admin/knowledge'),
        },
        ...(gate.actor?.is_platform_admin
          ? [
              {
                label: 'Admin',
                icon: 'admin' as const,
                to: '/admin/tenants',
                isActive: (pathname: string) => pathname.startsWith('/admin/'),
              },
            ]
          : []),
      ] satisfies Array<{
        label: string;
        icon: 'queue' | 'tickets' | 'customers' | 'knowledge' | 'admin';
        to: string;
        isActive: (pathname: string) => boolean;
      }>,
    [gate.actor?.is_platform_admin],
  );

  return (
    <aside
      className={cx(
        'flex h-full flex-col rounded-[26px] bg-[linear-gradient(180deg,#06173f_0%,#0a1e53_52%,#10265f_100%)] px-2.5 py-3 text-white shadow-[0_24px_52px_rgba(9,20,56,0.24)] transition-[width,padding] duration-200',
        collapsed ? 'w-[82px]' : 'w-[238px]',
      )}
    >
      <div
        className={cx(
          'flex items-start gap-2 px-2',
          collapsed ? 'justify-center' : '',
        )}
      >
        <div className={cx('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
          <img alt="Mascote Genius" className="w-10 shrink-0" src={mascotUrl} />
          {!collapsed ? (
            <div className="min-w-0 pt-0.5">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-white/46">
                Genius
              </p>
              <h1 className="text-[0.94rem] font-semibold tracking-[-0.04em] leading-tight">
                Support Workspace
              </h1>
            </div>
          ) : null}
        </div>
        <GhostButton
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cx(
            'mt-0.5 min-h-9 shrink-0 border-white/8 bg-white/10 px-2.5 text-white/88 hover:bg-white/14 hover:text-white',
            collapsed ? 'w-9 px-0' : 'ml-auto',
          )}
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? '>' : '<'}
        </GhostButton>
      </div>

      <nav className="mt-7 grid gap-1.5">
        {navigation.map((item) => {
          const active = item.isActive(location.pathname);
          const badgeLabel = item.label === 'Fila' ? '8' : item.label === 'Tickets' ? '12' : '';

          return (
            <Link
              className={cx(
                'group flex min-h-[54px] items-center gap-2.5 rounded-[16px] px-3 py-2 text-[0.95rem] font-medium transition',
                collapsed ? 'justify-center px-0' : '',
                active
                  ? 'bg-[linear-gradient(135deg,#1f67ff,#2f7eff)] text-white shadow-[0_14px_26px_rgba(18,81,213,0.32)]'
                  : 'text-white/76 hover:bg-white/10 hover:text-white',
              )}
              key={`${item.label}:${item.to}`}
              title={item.label}
              to={item.to}
            >
              <span
                className={cx(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border',
                  active
                    ? 'border-white/12 bg-white/14 text-white'
                    : 'border-white/10 bg-white/6 text-white/88',
                )}
              >
                <SupportNavIcon active={active} icon={item.icon} />
              </span>
              {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
              {!collapsed && badgeLabel ? (
                <span
                  className={cx(
                    'ml-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    active ? 'bg-white/16 text-white' : 'bg-white/10 text-white/82',
                  )}
                >
                  {badgeLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-1">
        <div className={cx('flex items-center rounded-[16px] border border-white/10 bg-white/8 px-2.5 py-2.5', collapsed ? 'justify-center' : 'gap-2.5')}>
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f4b1c8,#ffffff)] text-[13px] font-semibold text-[color:var(--color-brand-navy)]">
            {String(user?.user_metadata?.full_name ?? user?.email ?? 'QA')
              .split(' ')
              .slice(0, 2)
              .map((chunk) => chunk[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {String(user?.user_metadata?.full_name ?? user?.email ?? 'Operador interno')}
              </p>
              <p className="truncate text-[0.68rem] text-white/58">
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

  const items = [
    { label: 'Fila', to: '/support/queue' },
    { label: 'Tickets', to: '/support/tickets' },
    { label: 'Clientes', to: '/support/customers' },
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

function SupportTopbar({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { signOut } = useAuthContext();

  return (
    <header
      className={cx(
        compact
          ? 'px-1 py-0'
          : 'rounded-[22px] border border-[color:var(--color-border)] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(19,33,79,0.08)] backdrop-blur sm:px-5',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        <div className="flex flex-wrap gap-2">
          <GhostButton
            className={cx(
              'border-[rgba(48,127,226,0.18)] px-4 text-[color:var(--color-brand-blue)]',
              compact ? 'min-h-9 bg-white/88 text-[13px] shadow-[0_10px_20px_rgba(19,33,79,0.06)]' : 'min-h-10',
            )}
            onClick={() => void signOut()}
          >
            Encerrar sessao
          </GhostButton>
        </div>
      </div>
      <div className={cx(compact ? 'mt-2 lg:hidden' : 'mt-3')}>
        <SupportQuickNav />
      </div>
    </header>
  );
}

export function SupportWorkspaceShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();
  const location = useLocation();
  const isTicketRoute = /^\/support\/tickets\/[^/]+/.test(location.pathname);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1760px] gap-3 px-3 py-3 sm:px-4 lg:px-4">
        <div className="hidden shrink-0 lg:block">
          <div className="sticky top-3 h-[calc(100vh-1.5rem)]">
            <SupportSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cx(isTicketRoute ? 'space-y-2.5' : 'space-y-4')}>
            <SupportTopbar compact={isTicketRoute} />
            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
