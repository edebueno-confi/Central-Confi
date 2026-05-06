import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import mascotUrl from '../../../assets/brand/genius-mascot.svg';
import {
  ErrorState,
  LoadingState,
  StateFrame,
} from '../../components/states';
import { AppButton, GhostButton, StatusPill, cx } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

function SupportGateBootShell() {
  const navItems = ['Fila', 'Tickets', 'Clientes', 'Conhecimento', 'Admin'];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1800px] gap-4 px-3 py-3 sm:px-4 lg:px-5">
        <aside className="hidden w-[250px] shrink-0 rounded-[28px] bg-[linear-gradient(180deg,#06173f_0%,#0a1e53_52%,#10265f_100%)] px-3 py-4 text-white shadow-[0_26px_58px_rgba(9,20,56,0.24)] lg:flex lg:flex-col">
          <div className="flex items-start gap-3 px-2">
            <div className="flex min-w-0 items-center gap-3">
              <img alt="Mascote Genius" className="w-11 shrink-0" src={mascotUrl} />
              <div className="min-w-0 pt-1">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/48">
                  Genius
                </p>
                <h1 className="text-[0.96rem] font-semibold tracking-[-0.04em] leading-tight">
                  Suporte
                </h1>
              </div>
            </div>
            <div className="ml-auto mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white">
              {'<'}
            </div>
          </div>

          <nav className="mt-8 grid gap-2">
            {navItems.map((item, index) => (
              <div
                className={cx(
                  'flex min-h-[56px] items-center gap-3 rounded-[16px] px-3 py-2.5 text-[0.96rem] font-medium',
                  index === 0
                    ? 'bg-[linear-gradient(135deg,#1f67ff,#2f7eff)] text-white shadow-[0_16px_30px_rgba(18,81,213,0.35)]'
                    : 'text-white/78',
                )}
                key={item}
              >
                <span
                  className={cx(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border text-[0.72rem] font-semibold uppercase tracking-[0.14em]',
                    index === 0
                      ? 'border-white/14 bg-white/12 text-white'
                      : 'border-white/12 bg-white/6 text-white/88',
                  )}
                >
                  {item[0]}
                </span>
                <span>{item}</span>
                {index === 0 ? (
                  <span className="ml-auto inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-white/14 px-2 text-xs font-semibold text-white">
                    8
                  </span>
                ) : item === 'Tickets' ? (
                  <span className="ml-auto inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-white/10 px-2 text-xs font-semibold text-white/88">
                    12
                  </span>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="mt-auto px-1">
            <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/7 px-3 py-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f4b1c8,#ffffff)] text-sm font-semibold text-[color:var(--color-brand-navy)]">
                QA
              </div>
              <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Sessão local</p>
                <p className="truncate text-[0.72rem] text-white/62">Aguardando validação</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <header className="rounded-[22px] border border-[color:var(--color-border)] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(19,33,79,0.08)] backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="accent">Acesso interno</StatusPill>
                <StatusPill>Suporte</StatusPill>
              </div>
              <GhostButton className="min-h-10 border-[rgba(48,127,226,0.18)] px-4 text-[color:var(--color-brand-blue)]">
                  Encerrar sessão
              </GhostButton>
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[292px_minmax(0,1fr)]">
            <section className="rounded-[26px] border border-[color:var(--color-border)] bg-white/92 px-5 py-5 shadow-[0_18px_36px_rgba(19,33,79,0.08)]">
              <div className="space-y-3">
                <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                <div className="h-12 animate-pulse rounded-[22px] bg-slate-200" />
                <div className="h-12 animate-pulse rounded-[22px] bg-slate-200" />
                <div className="h-12 animate-pulse rounded-[22px] bg-slate-200" />
              </div>
            </section>

            <section className="rounded-[28px] border border-[color:var(--color-border)] bg-white/92 px-5 py-5 shadow-[0_18px_36px_rgba(19,33,79,0.08)]">
              <LoadingState
                title="Preparando o suporte"
          description="Estamos liberando a fila, os tickets e o contexto do suporte para continuar a operação."
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SupportGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const {
    phase,
    sessionExpired,
    configError,
    signOut,
    clearSessionExpired,
  } = useAuthContext();

  if (phase === 'config-error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ErrorState
          title="Configuração de acesso indisponível"
          description={
            configError ??
            'Este ambiente ainda não recebeu as configurações mínimas para abrir o suporte.'
          }
        />
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <StateFrame
          title="Sessão expirada"
          description="Sua sessão perdeu validade durante a operação. Entre novamente para continuar no suporte."
          eyebrow="auth"
          tone="critical"
          actions={
            <>
              <AppButton
                onClick={() => {
                  clearSessionExpired();
                  void signOut();
                }}
              >
                Voltar ao login
              </AppButton>
              <GhostButton onClick={() => clearSessionExpired()}>
                Fechar aviso
              </GhostButton>
            </>
          }
        />
      </div>
    );
  }

  if (phase === 'booting') {
    return <SupportGateBootShell />;
  }

  if (phase === 'anonymous') {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} />;
  }

  return <>{children}</>;
}
