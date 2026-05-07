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
  const { gate, signOut, user } = useAuthContext();

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
          label: 'Conhecimento',
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
        'flex h-full flex-col rounded-[22px] bg-[linear-gradient(180deg,#06173f_0%,#082058_52%,#0b2a68_100%)] px-2 py-2 text-white shadow-[0_18px_36px_rgba(9,20,56,0.2)] transition-[width,padding] duration-200',
        collapsed ? 'w-[76px]' : 'w-[206px]',
      )}
    >
      <div
        className={cx(
          'flex items-start gap-2 px-1.5',
          collapsed ? 'justify-center' : '',
        )}
      >
        <div className={cx('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
          <img alt="Mascote Genius" className="w-8 shrink-0" src={mascotUrl} />
          {!collapsed ? (
            <div className="min-w-0 pt-0.5">
              <p className="text-[0.54rem] font-semibold uppercase tracking-[0.2em] text-white/44">
                Genius
              </p>
              <h1 className="text-[0.84rem] font-semibold leading-tight tracking-[-0.03em]">
                Suporte
              </h1>
            </div>
          ) : null}
        </div>
        <button
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cx(
            'mt-0.5 inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border border-white/18 bg-[rgba(255,255,255,0.14)] px-2 text-white shadow-none transition hover:bg-[rgba(255,255,255,0.2)]',
            collapsed ? 'w-8 px-0' : 'ml-auto',
          )}
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          type="button"
        >
          <svg
            aria-hidden="true"
            className={cx('h-3.5 w-3.5', !collapsed && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <nav className="mt-5 grid gap-1">
        {navigation.map((item) => {
          const active = item.isActive(location.pathname);
          const badgeLabel = item.label === 'Fila' ? '8' : item.label === 'Tickets' ? '12' : '';

          return (
            <Link
              className={cx(
                'group flex min-h-[44px] items-center gap-2 rounded-[12px] px-2.5 py-1 text-[0.84rem] font-medium transition',
                collapsed ? 'justify-center px-0' : '',
                active
                  ? 'bg-[linear-gradient(135deg,rgba(31,103,255,0.92),rgba(47,126,255,0.92))] text-white shadow-[0_8px_16px_rgba(18,81,213,0.22)]'
                  : 'text-white/74 hover:bg-white/9 hover:text-white',
              )}
              key={`${item.label}:${item.to}`}
              title={item.label}
              to={item.to}
            >
              <span
                className={cx(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border',
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
                    'ml-auto inline-flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[9px] font-semibold',
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

      <div className="mt-auto px-0.5">
        <div className={cx('rounded-[14px] border border-white/10 bg-white/7 px-2 py-1.5', collapsed ? 'flex justify-center' : 'space-y-2')}>
          <div className={cx('flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
          <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f4b1c8,#ffffff)] text-[11px] font-semibold text-[color:var(--color-brand-navy)]">
            {String(user?.user_metadata?.full_name ?? user?.email ?? 'QA')
              .split(' ')
              .slice(0, 2)
              .map((chunk) => chunk[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white">
                {String(user?.user_metadata?.full_name ?? user?.email ?? 'Operador interno')}
              </p>
              <p className="truncate text-[0.64rem] text-white/58">
                {gate.actor?.roles.includes('support_manager') ? 'Responsável' : 'Agente'}
              </p>
            </div>
          ) : null}
          </div>
          {!collapsed ? (
            <button
              className="flex w-full items-center justify-between rounded-[12px] border border-white/14 bg-white/8 px-2.5 py-1.5 text-left text-[11px] font-medium text-white/88 transition hover:bg-white/12 hover:text-white"
              onClick={() => void signOut()}
              type="button"
            >
              <span>Encerrar sessão</span>
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M15 16.5 19.5 12 15 7.5" />
                <path d="M19 12H9" />
              </svg>
            </button>
          ) : (
            <GhostButton
              aria-label="Encerrar sessão"
              className="min-h-8 w-8 border-white/10 bg-white/5 px-0 text-white/82 hover:bg-white/10 hover:text-white"
              onClick={() => void signOut()}
              title="Encerrar sessão"
            >
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M15 16.5 19.5 12 15 7.5" />
                <path d="M19 12H9" />
                <path d="M12 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5A1.75 1.75 0 0 0 6.75 19H12" />
              </svg>
            </GhostButton>
          )}
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
    { label: 'Conhecimento', to: '/admin/knowledge' },
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
  return (
    <header className={cx(compact ? 'py-0' : 'py-0')}>
      <div className={cx(compact ? 'lg:hidden' : 'lg:hidden')}>
        <SupportQuickNav />
      </div>
    </header>
  );
}

export function SupportWorkspaceShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();
  const location = useLocation();
  const isOperationalSupportRoute = /^\/support(\/|$)/.test(location.pathname);

  return (
    <div
      className={cx(
        'bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]',
        isOperationalSupportRoute ? 'h-dvh overflow-hidden' : 'min-h-screen',
      )}
    >
      <div
        className={cx(
          'flex w-full gap-3 px-1.5 sm:px-2.5 lg:px-2',
          isOperationalSupportRoute ? 'h-full py-2 pl-0 pr-2 sm:pl-0 lg:pl-0' : 'py-3',
        )}
      >
        <div className="hidden shrink-0 lg:block">
          <div
            className={cx(
              'sticky h-[calc(100dvh-1.5rem)]',
              isOperationalSupportRoute ? 'top-2 h-[calc(100dvh-1rem)]' : 'top-3',
            )}
          >
            <SupportSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
          </div>
        </div>

        <div className={cx('min-w-0 flex-1', isOperationalSupportRoute && 'min-h-0')}>
          <div
            className={cx(
              isOperationalSupportRoute ? 'flex h-full min-h-0 flex-col gap-1' : 'space-y-3',
            )}
          >
            <SupportTopbar compact={isOperationalSupportRoute} />
            <main
              className={cx(
                'min-w-0',
                isOperationalSupportRoute && 'min-h-0 flex-1 overflow-hidden',
              )}
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
