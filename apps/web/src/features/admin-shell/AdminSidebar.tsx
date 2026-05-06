import { NavLink } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { cx } from '../../components/ui';

const navigation = [
  { label: 'Tenants', to: '/admin/tenants', shortLabel: 'TE' },
  { label: 'Knowledge', to: '/admin/knowledge', shortLabel: 'KN' },
  { label: 'Access', to: '/admin/access', shortLabel: 'AC' },
  { label: 'System', to: '/admin/system', shortLabel: 'SY' },
];

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
        collapsed ? 'w-[96px] p-3.5' : 'w-[238px] p-5',
      )}
    >
      <div className={cx('flex items-start justify-between gap-3', collapsed && 'justify-center')}>
        <div className={cx('flex items-start gap-3', collapsed && 'justify-center')}>
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.04)] ring-1 ring-white/10">
            <img alt="Genius Support OS" className="w-8" src={mascotUrl} />
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
                'inline-flex h-9 w-9 items-center justify-center rounded-full border text-[0.68rem] font-semibold uppercase tracking-[0.18em]',
                'border-white/14 bg-white/6',
              )}
            >
              {item.shortLabel}
            </span>
            {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
            {!collapsed ? (
              <span className="ml-auto text-base leading-none text-current/85">›</span>
            ) : null}
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
