import { NavLink } from 'react-router-dom';
import { cx } from '../../components/ui';

const navigation = [
  { label: 'Tenants', to: '/admin/tenants', icon: 'tenants' },
  { label: 'Knowledge', to: '/admin/knowledge', icon: 'knowledge' },
  { label: 'Access', to: '/admin/access', icon: 'access' },
  { label: 'System', to: '/admin/system', icon: 'system' },
] as const;

function BrandMark() {
  return (
    <svg fill="none" height="28" viewBox="0 0 28 28" width="28">
      <path
        d="M14 2.75 23.5 8.25V19.75L14 25.25 4.5 19.75V8.25L14 2.75Z"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="1.4"
      />
      <path
        d="M14 7 18.75 9.75V18.25L14 21 9.25 18.25V9.75L14 7Z"
        fill="rgba(78,137,255,0.18)"
        stroke="rgba(121,176,255,0.98)"
        strokeWidth="1.2"
      />
      <path
        d="M14 7V21M9.25 9.75 18.75 18.25M18.75 9.75 9.25 18.25"
        stroke="rgba(255,255,255,0.92)"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function SidebarIcon({
  kind,
}: {
  kind: 'tenants' | 'knowledge' | 'access' | 'system';
}) {
  if (kind === 'tenants') {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 20 20">
        <path d="M3.5 16V6.5L10 3l6.5 3.5V16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M7 16V11.25h6V16M3.5 9.5H16.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === 'knowledge') {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 20 20">
        <path d="M4 5.5c1.5-1 3.1-1.5 4.8-1.5 1.6 0 3 .4 4.2 1.2v10.3c-1.2-.8-2.6-1.2-4.2-1.2-1.7 0-3.3.5-4.8 1.5V5.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <path d="M16 5.5c-1.5-1-3.1-1.5-4.8-1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }

  if (kind === 'access') {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 20 20">
        <path d="M6.5 9V6.75A3.5 3.5 0 0 1 10 3.25a3.5 3.5 0 0 1 3.5 3.5V9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <rect height="8.5" rx="2" stroke="currentColor" strokeWidth="1.6" width="10" x="5" y="9" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 20 20">
      <path d="M10 3.25 11.4 5.6l2.72.57-.92 2.62 1.55 2.3-2.3 1.56.57 2.72-2.62-.92L8 17.37l-1.56-2.3-2.72.57.92-2.62L3.1 10.72l2.3-1.56-.57-2.72 2.62.92L10 3.25Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M10 7.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cx(
        'relative flex h-full flex-col rounded-[26px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#091734_0%,#0b1d45_56%,#0e2558_100%)] text-white shadow-[0_30px_58px_rgba(9,23,52,0.26)] transition-[width,padding] duration-200',
        collapsed ? 'w-[96px] p-3.5' : 'w-[242px] p-5',
      )}
    >
      <div className={cx('flex items-start justify-between gap-3', collapsed && 'justify-center')}>
        <div className={cx('flex items-start gap-3', collapsed && 'justify-center')}>
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.04)] ring-1 ring-white/10">
            <BrandMark />
          </div>
          {!collapsed ? (
            <div className="space-y-2 pt-0.5">
              <div className="space-y-0.5">
                <p className="text-[0.92rem] font-semibold leading-5 text-white">Genius</p>
                <p className="text-[0.92rem] font-semibold leading-5 text-white">Support OS</p>
              </div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/56">
                Admin Console
              </p>
            </div>
          ) : null}
        </div>

        <button
          className={cx(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/10 text-base font-medium text-white transition hover:bg-white/16',
            collapsed && 'absolute right-3 top-3',
          )}
          onClick={onToggle}
          type="button"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="mt-6 grid gap-2.5">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              cx(
                'group flex min-h-12 items-center gap-3 rounded-[18px] py-3 text-sm font-medium transition',
                collapsed ? 'justify-center px-0' : 'px-3.5',
                isActive
                  ? 'bg-[linear-gradient(135deg,#1a4fd6,#1665ef)] text-white shadow-[0_14px_32px_rgba(22,101,239,0.34)]'
                  : 'text-white/76 hover:bg-white/8 hover:text-white',
              )
            }
            title={item.label}
            to={item.to}
          >
            <span
              className={cx(
                'inline-flex h-9 w-9 items-center justify-center rounded-full border',
                'border-white/14 bg-white/6',
              )}
            >
              <SidebarIcon kind={item.icon} />
            </span>
            {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div
        className={cx(
          'mt-auto rounded-[22px] border border-white/10 bg-white/8',
          collapsed ? 'p-3' : 'px-4 py-3.5',
        )}
      >
        <div className={cx('flex items-center gap-3', collapsed && 'justify-center')}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.95)] text-sm font-semibold text-[color:var(--color-brand-navy)]">
            PA
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">Platform Admin</p>
              <p className="truncate text-xs text-white/62">platform_admin</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
