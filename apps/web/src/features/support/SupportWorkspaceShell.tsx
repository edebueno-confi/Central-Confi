import { NavLink, Outlet, useLocation } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import { GhostButton, StatusPill } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

const navigation = [
  { label: 'Support', to: '/support', shortLabel: 'SUP' },
  { label: 'Queue', to: '/support/queue', shortLabel: 'Q' },
  { label: 'Tickets', to: '/support/tickets', shortLabel: 'TKT' },
];

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/support': {
    title: 'Cockpit de suporte',
    subtitle:
      'Operacao interna de suporte e CS B2B sobre a fila oficial de tickets, sem dashboard generico.',
  },
  '/support/queue': {
    title: 'Fila operacional',
    subtitle:
      'Triagem viva de tickets com leitura rapida de urgencia, contexto e ultima atividade.',
  },
  '/support/tickets': {
    title: 'Tratativa de tickets',
    subtitle:
      'Atendimento, resposta publica, nota interna, status e atribuicao na mesma superficie operacional.',
  },
};

function describeRoute(pathname: string) {
  if (pathname.startsWith('/support/customers/')) {
    return {
      title: 'Customer context',
      subtitle:
        'Contexto operacional do cliente B2B com contatos ativos, tickets recentes e eventos relevantes.',
    };
  }

  if (pathname.startsWith('/support/tickets/')) {
    return {
      title: 'Ticket em tratativa',
      subtitle:
        'Painel de atendimento do ticket com timeline, resposta publica, nota interna e transicoes operacionais.',
    };
  }

  return routeCopy[pathname] ?? routeCopy['/support'];
}

function SupportSidebar() {
  const { user } = useAuthContext();

  return (
    <aside className="flex h-full flex-col rounded-[30px] border border-white/55 bg-[linear-gradient(180deg,rgba(17,28,66,0.99),rgba(25,48,112,0.98))] p-5 text-white shadow-[0_28px_60px_rgba(20,31,71,0.22)]">
      <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
        <div className="flex items-center gap-3">
          <img alt="Mascote Genius" className="w-12" src={mascotUrl} />
          <div className="space-y-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/58">
              Genius
            </p>
            <h1 className="text-lg font-semibold tracking-[-0.04em]">
              Support Workspace
            </h1>
          </div>
        </div>
        <div className="mt-3 rounded-[18px] border border-white/10 bg-white/8 px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/58">
            Operacao
          </p>
          <p className="mt-2 text-sm font-medium text-white">Cockpit operacional B2B</p>
          <p className="mt-1 text-xs leading-5 text-white/66">
            Triagem, atendimento, contexto do cliente e devolutiva tecnico-operacional.
          </p>
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
          Sessao atual
        </p>
        <div className="mt-3 space-y-1">
          <p className="font-medium text-white">
            {String(user?.user_metadata?.full_name ?? user?.email ?? 'Operador interno')}
          </p>
          <p className="text-xs text-white/68">{user?.email ?? 'Sem email resolvido'}</p>
          <p className="pt-2 text-xs leading-5 text-white/60">
            Workspace interno para triagem, contexto do cliente e resposta tecnico-operacional.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SupportTopbar() {
  const location = useLocation();
  const { runtimeConfig, signOut } = useAuthContext();
  const copy = describeRoute(location.pathname);

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border border-[color:var(--color-border)] bg-white/88 px-5 py-4 shadow-[0_16px_34px_rgba(19,33,79,0.09)] backdrop-blur sm:px-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
          <StatusPill>cockpit operacional</StatusPill>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)]">
            {copy.title}
          </h2>
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <GhostButton
          className="border-[rgba(48,127,226,0.18)] text-[color:var(--color-brand-blue)]"
          onClick={() => void signOut()}
        >
          Encerrar sessao
        </GhostButton>
      </div>
    </header>
  );
}

export function SupportWorkspaceShell() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1880px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden w-[256px] shrink-0 xl:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <SupportSidebar />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="space-y-5">
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
