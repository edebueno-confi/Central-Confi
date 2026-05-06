import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ErrorState, ContractUnavailableState, LoadingState, SessionExpiredState } from '../../components/states';
import { AppButton, GhostButton } from '../../components/ui';
import { useAuthContext } from './auth-context';

export function AdminGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const {
    phase,
    gate,
    sessionExpired,
    configError,
    refreshGate,
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
            'Este ambiente ainda não recebeu as configurações mínimas de acesso.'
          }
        />
      </div>
    );
  }

  if (sessionExpired) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <SessionExpiredState
          action={
            <>
              <AppButton
                onClick={() => {
                  clearSessionExpired();
                  void signOut();
                }}
              >
                Voltar ao login
              </AppButton>
              <GhostButton
                onClick={() => {
                  clearSessionExpired();
                  void refreshGate();
                }}
              >
                Tentar novamente
              </GhostButton>
            </>
          }
        />
      </div>
    );
  }

  if (phase === 'booting' || (phase === 'authenticated' && gate.phase === 'loading')) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <LoadingState />
      </div>
    );
  }

  if (phase === 'anonymous') {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate replace to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} />;
  }

  if (gate.phase === 'contract-unavailable') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ContractUnavailableState
          contractName="validação de acesso administrativo"
          action={
            <GhostButton onClick={() => void refreshGate()}>
              Tentar novamente
            </GhostButton>
          }
        />
      </div>
    );
  }

  if (gate.phase === 'error') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
        <ErrorState
          description={
            gate.message ??
            'Não foi possível validar o acesso administrativo deste usuário.'
          }
          action={
            <>
              <AppButton onClick={() => void refreshGate()}>Tentar novamente</AppButton>
              <GhostButton onClick={() => void signOut()}>Encerrar sessão</GhostButton>
            </>
          }
        />
      </div>
    );
  }

  if (gate.phase === 'denied') {
    return (
      <Navigate
        replace
        to="/access-denied"
        state={{ reason: gate.denialReason }}
      />
    );
  }

  if (phase === 'authenticated' && gate.phase === 'ready') {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <LoadingState />
    </div>
  );
}
