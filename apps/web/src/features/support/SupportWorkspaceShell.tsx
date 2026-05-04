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
    title: 'Support Workspace',
    subtitle:
      'Camada operacional interna para suporte e CS B2B, sustentada apenas pelos read models oficiais de ticketing.',
  },
  '/support/queue': {
    title: 'Queue',
    subtitle:
      'Fila dominante de tickets com filtros de operacao, contexto do cliente e detalhe acionavel sem virar dashboard pesado.',
  },
  '/support/tickets': {
    title: 'Tickets',
    subtitle:
      'Leitura contratual dos tickets em uma superficie unica para atendimento, notas internas e transicoes de status.',
  },
};

function describeRoute(pathname: string) {
  if (pathname.startsWith('/support/customers/')) {
    return {
      title: 'Customer 360',
      subtitle:
        'Contexto minimo do cliente B2B com contatos ativos, tickets recentes e eventos relevantes para suporte.',
    };
  }

  if (pathname.startsWith('/support/tickets/')) {
    return {
      title: 'Ticket Detail',
      subtitle:
        'Painel operacional do ticket com timeline, resposta publica, nota interna, atribuicao e transicao de status.',
    };
  }

  return routeCopy[pathname] ?? routeCopy['/support'];
}

function SupportSidebar() {
  const { user } = useAuthContext();

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
              Support Workspace
            </h1>
            <p className="text-xs text-white/70">
              Operacao B2B tecnica de suporte e CS
            </p>
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
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-[color:var(--color-border)] bg-white/84 px-5 py-4 shadow-[var(--shadow-panel)] backdrop-blur sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="accent">{runtimeConfig?.appEnv ?? 'development'}</StatusPill>
          <StatusPill>support workspace</StatusPill>
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
