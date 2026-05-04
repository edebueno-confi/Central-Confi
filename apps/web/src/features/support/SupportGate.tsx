import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  ErrorState,
  LoadingState,
  StateFrame,
} from '../../components/states';
import { AppButton, GhostButton } from '../../components/ui';
import { useAuthContext } from '../auth/auth-context';

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
          title="Configuracao do frontend indisponivel"
          description={
            configError ??
            'O app ainda nao recebeu as variaveis publicas minimas do Supabase.'
          }
        />
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <StateFrame
          title="Sessao expirada"
          description="Sua sessao perdeu validade durante a operacao. Faça login novamente para continuar no Support Workspace."
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
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <LoadingState
          title="Validando sessao do suporte"
          description="O frontend esta aguardando a sessao Supabase antes de liberar o Support Workspace."
        />
      </div>
    );
  }

  if (phase === 'anonymous') {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} />;
  }

  return <>{children}</>;
}
