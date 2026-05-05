import { Outlet } from 'react-router-dom';
import { AuthProvider } from './auth-context';

export function AuthBootstrap() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
