import { NavLink } from 'react-router-dom';
import { cx } from '../../components/ui';

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

export function AdminTopbar() {
  return (
    <header className="xl:hidden">
      <div>
        <AdminQuickNav />
      </div>
    </header>
  );
}
