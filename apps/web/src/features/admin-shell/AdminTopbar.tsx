import { NavLink } from 'react-router-dom';
import { GhostButton, cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

function AdminQuickNav() {
  const items = [
    { label: 'Tenants', to: '/admin/tenants' },
    { label: 'Knowledge', to: '/admin/knowledge' },
    { label: 'Access', to: '/admin/access' },
    { label: 'System', to: '/admin/system' },
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
      {items.map((item) => (
        <NavLink
          className={({ isActive }) =>
            cx(
              'inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'border-[rgba(22,101,239,0.26)] bg-[rgba(22,101,239,0.1)] text-[color:var(--color-brand-blue)]'
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

function AdminContextPill({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <span
      className={cx(
        'inline-flex min-h-9 items-center rounded-full border px-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em]',
        tone === 'accent'
          ? 'border-[rgba(22,101,239,0.28)] bg-[rgba(22,101,239,0.08)] text-[color:var(--color-brand-blue)]'
          : 'border-[rgba(28,46,86,0.14)] bg-white text-[color:var(--color-brand-navy)]',
      )}
    >
      {label}
    </span>
  );
}

export function AdminTopbar() {
  const { signOut } = useAuthContext();

  return (
    <header className="rounded-[24px] border border-[color:var(--color-border)] bg-white/94 px-6 py-3 shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(28,46,86,0.08)] pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <AdminContextPill label="Development" tone="accent" />
          <AdminContextPill label="Platform_admin" />
        </div>

        <GhostButton
          className="min-h-10 gap-2 border-[rgba(28,46,86,0.12)] px-4 text-[color:var(--color-brand-navy)]"
          onClick={() => void signOut()}
        >
          <span aria-hidden="true" className="text-base leading-none">↪</span>
          Encerrar sessão
        </GhostButton>
      </div>

      <div className="mt-2.5">
        <AdminQuickNav />
      </div>
    </header>
  );
}
