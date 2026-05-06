import { Link, NavLink, useLocation } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const navigation = [
  { label: 'Tenants', to: '/admin/tenants', shortLabel: 'TEN' },
  { label: 'Knowledge', to: '/admin/knowledge', shortLabel: 'KB' },
  { label: 'Access', to: '/admin/access', shortLabel: 'ACC' },
  { label: 'System', to: '/admin/system', shortLabel: 'SYS' },
];

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const { gate } = useAuthContext();
  const compactKnowledgeMode =
    location.pathname === '/admin/tenants' ||
    location.pathname === '/admin/knowledge' ||
    location.pathname === '/admin/access' ||
    location.pathname === '/admin/system';

  return (
    <aside
      className={cx(
        'flex h-full flex-col rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(20,31,71,0.98),rgba(32,60,132,0.96))] text-white shadow-[0_28px_60px_rgba(20,31,71,0.22)] transition-[width,padding] duration-200',
        collapsed ? 'w-[96px] p-3' : 'w-[248px] p-4',
      )}
    >
      {compactKnowledgeMode ? (
        <div className={cx('space-y-4', collapsed ? 'px-1 py-1' : 'px-2 py-1')}>
          <div className="flex items-start justify-between gap-3">
            <div className={cx('flex items-center gap-3', collapsed && 'justify-center')}>
              <img alt="Mascote Genius" className="w-10" src={mascotUrl} />
              {!collapsed ? (
                <div className="space-y-1">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/58">
                    Genius Support OS
                  </p>
                  <p className="text-xl font-semibold leading-6 text-white">Admin Console</p>
                </div>
              ) : null}
            </div>

            <button
              className={cx(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/16 bg-white/8 text-sm font-medium text-white transition hover:bg-white/12',
                collapsed && 'mx-auto',
              )}
              onClick={onToggle}
              type="button"
            >
              {collapsed ? '>>' : '<<'}
            </button>
          </div>

          {!collapsed ? (
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/46">
              Admin Console
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div
            className={cx(
              'flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/6 py-3',
              collapsed ? 'justify-center px-2' : 'px-3',
            )}
          >
            <img alt="Mascote Genius" className="w-14" src={mascotUrl} />
            {!collapsed ? (
              <div className="space-y-1">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/58">
                  Genius
                </p>
                <div>
                  <h1 className="text-lg font-semibold tracking-[-0.04em]">
                    Admin Console
                  </h1>
                  <p className="text-xs text-white/70">Operacao global de pos-venda</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className={cx('mt-3 flex', collapsed ? 'justify-center' : 'justify-end')}>
            <button
              className={cx(
                'inline-flex min-h-10 items-center justify-center rounded-full border border-white/16 bg-white/8 text-sm font-medium text-white transition hover:bg-white/12',
                collapsed ? 'w-full px-0' : 'px-4',
              )}
              onClick={onToggle}
              type="button"
            >
              {collapsed ? '>>' : '<<'}
            </button>
          </div>
        </>
      )}

      <nav className="mt-5 grid gap-2">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              cx(
                'group flex min-h-12 items-center gap-3 rounded-[22px] py-3 text-sm font-medium transition',
                collapsed ? 'justify-center px-0' : 'px-3',
                isActive
                  ? 'bg-white text-[color:var(--color-brand-navy)] shadow-[0_16px_34px_rgba(12,20,48,0.18)]'
                  : 'text-white/74 hover:bg-white/10 hover:text-white',
              )
            }
            title={item.label}
            to={item.to}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/16 bg-current/6 text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
              {item.shortLabel}
            </span>
            {!collapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navigation.map((item) => (
            <Link
              className={cx(
                'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
                location.pathname.startsWith(item.to)
                  ? 'border-white/24 bg-white text-[color:var(--color-brand-navy)]'
                  : 'border-white/16 bg-white/10 text-white',
              )}
              key={`mobile:${item.to}`}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div
        className={cx(
          'mt-auto rounded-[24px] border border-white/10 bg-white/8',
          collapsed ? 'p-3' : 'p-4',
        )}
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/58">
          {collapsed ? 'Sessao' : 'Operador atual'}
        </p>
        <div className="mt-3 space-y-1">
          <p className="font-medium text-white">
            {compactKnowledgeMode
              ? 'Platform Admin'
              : collapsed
                ? String(gate.actor?.profile.full_name ?? 'Platform Admin')
                    .split(' ')
                    .slice(0, 2)
                    .join(' ')
                : (gate.actor?.profile.full_name ?? 'Platform Admin')}
          </p>
          {!collapsed ? (
            <p className="text-xs text-white/68">
              {compactKnowledgeMode ? 'platform_admin' : gate.actor?.profile.email}
            </p>
          ) : null}
          {!collapsed && !compactKnowledgeMode ? (
            <p className="pt-2 text-xs leading-5 text-white/60">
              Controle institucional de tenants, acessos e rastreabilidade da operacao Genius.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
