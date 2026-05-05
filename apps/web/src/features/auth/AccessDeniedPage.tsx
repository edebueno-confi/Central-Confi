import { Navigate, useLocation } from 'react-router-dom';
import { AccessDeniedState } from '../../components/states';
import { AppButton, GhostButton } from '../../components/ui';
import { useAuthContext } from './auth-context';

function describeReason(reason: unknown) {
  if (reason === 'missing-profile') {
    return 'A sessao existe, mas o backend nao encontrou um profile valido para este usuario.';
  }

  if (reason === 'inactive-profile') {
    return 'Seu profile existe, mas esta inativo. O shell permanece bloqueado sem vazar dados administrativos.';
  }

  if (reason === 'missing-platform-admin') {
    return 'Seu usuario autenticado nao possui a role global platform_admin.';
  }

  if (reason === 'backend-permission') {
    return 'O backend negou a leitura desta superficie administrativa. O shell permanece bloqueado sem expor dados operacionais.';
  }

  return 'Seu usuario autenticado nao tem permissao para operar este Admin Console.';
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
            <GhostButton onClick={() => window.history.back()}>Voltar</GhostButton>
          </>
        }
      />
    </div>
  );
}
