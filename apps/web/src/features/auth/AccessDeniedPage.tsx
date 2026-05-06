import { Navigate, useLocation } from 'react-router-dom';
import { AccessDeniedState } from '../../components/states';
import { AppButton, GhostButton } from '../../components/ui';
import { useAuthContext } from './auth-context';

function describeReason(reason: unknown) {
  if (reason === 'missing-profile') {
    return 'Sua conta foi autenticada, mas ainda nao tem acesso liberado para esta area.';
  }

  if (reason === 'inactive-profile') {
    return 'Sua conta existe, mas esta inativa neste momento. Fale com quem administra o acesso para voltar a operar.';
  }

  if (reason === 'missing-platform-admin') {
    return 'Sua conta nao tem permissao para abrir esta area do workspace.';
  }

  if (reason === 'backend-permission') {
    return 'Esta area nao esta liberada para a sua conta agora. Se voce acredita que deveria entrar, revise seu acesso com a equipe responsavel.';
  }

  return 'Sua conta nao tem permissao para abrir esta area agora.';
}

export function AccessDeniedPage() {
  const location = useLocation();
  const { phase, sessionExpired, signOut } = useAuthContext();

  if (phase === 'anonymous' && !sessionExpired) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <AccessDeniedState
        description={describeReason((location.state as { reason?: unknown } | null)?.reason)}
        action={
          <>
            <AppButton onClick={() => void signOut()}>Encerrar sessao</AppButton>
            <GhostButton onClick={() => window.history.back()}>Voltar para o inicio</GhostButton>
          </>
        }
      />
    </div>
  );
}
