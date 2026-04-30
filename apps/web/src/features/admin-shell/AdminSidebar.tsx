import { NavLink } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { useAuthContext } from '../auth/auth-context';

const navigation = [
  { label: 'Tenants', to: '/admin/tenants', shortLabel: 'TEN' },
  { label: 'Knowledge', to: '/admin/knowledge', shortLabel: 'KB' },
  { label: 'Access', to: '/admin/access', shortLabel: 'ACC' },
  { label: 'System', to: '/admin/system', shortLabel: 'SYS' },
];

export function AdminSidebar() {
  const { gate } = useAuthContext();

  return (
    <aside className="flex h-full flex-col rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(20,31,71,0.98),rgba(32,60,132,0.96))] p-5 text-white shadow-[0_28px_60px_rgba(20,31,71,0.22)]">
      <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/6 px-3 py-3">
        <img alt="Mascote Genius" className="w-14" src={mascotUrl} />
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
      </div>

      <nav className="mt-8 grid gap-2">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-medium transition',
                isActive
                  ? 'bg-white text-[color:var(--color-brand-navy)] shadow-[0_16px_34px_rgba(12,20,48,0.18)]'
                  : 'text-white/74 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
            to={item.to}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/16 bg-current/6 text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
              {item.shortLabel}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[24px] border border-white/10 bg-white/8 p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/58">
          Operador atual
        </p>
        <div className="mt-3 space-y-1">
          <p className="font-medium text-white">
            {gate.actor?.profile.full_name ?? 'Platform Admin'}
          </p>
          <p className="text-xs text-white/68">{gate.actor?.profile.email}</p>
          <p className="pt-2 text-xs leading-5 text-white/60">
            Controle institucional de tenants, acessos e rastreabilidade da operacao Genius.
          </p>
        </div>
      </div>
    </aside>
  );
}
