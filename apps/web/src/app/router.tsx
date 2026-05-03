import { lazy, type ReactNode, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoadingState } from '../components/states';
import { AuthBootstrap } from '../features/auth/AuthBootstrap';
import { AdminGate } from '../features/auth/AdminGate';

const AdminConsoleShell = lazy(async () => {
  const module = await import('../features/admin-shell/AdminConsoleShell');
  return { default: module.AdminConsoleShell };
});

const LoginPage = lazy(async () => {
  const module = await import('../features/login/LoginPage');
  return { default: module.LoginPage };
});

const AccessDeniedPage = lazy(async () => {
  const module = await import('../features/auth/AccessDeniedPage');
  return { default: module.AccessDeniedPage };
});

const TenantsPage = lazy(async () => {
  const module = await import('../features/tenants/TenantsPage');
  return { default: module.TenantsPage };
});

const KnowledgePage = lazy(async () => {
  const module = await import('../features/knowledge/KnowledgePage');
  return { default: module.KnowledgePage };
});

const HelpCenterPage = lazy(async () => {
  const module = await import('../features/help-center/HelpCenterPage');
  return { default: module.HelpCenterPage };
});

const HelpCenterSpaceLayout = lazy(async () => {
  const module = await import('../features/help-center/HelpCenterPage');
  return { default: module.HelpCenterSpaceLayout };
});

const HelpCenterHomePage = lazy(async () => {
  const module = await import('../features/help-center/HelpCenterHomePage');
  return { default: module.HelpCenterHomePage };
});

const HelpCenterArticlesPage = lazy(async () => {
  const module = await import('../features/help-center/HelpCenterArticlesPage');
  return { default: module.HelpCenterArticlesPage };
});

const HelpCenterArticlePage = lazy(async () => {
  const module = await import('../features/help-center/HelpCenterArticlePage');
  return { default: module.HelpCenterArticlePage };
});

const AccessPage = lazy(async () => {
  const module = await import('../features/access/AccessPage');
  return { default: module.AccessPage };
});

const SystemPage = lazy(async () => {
  const module = await import('../features/system/SystemPage');
  return { default: module.SystemPage };
});

function RouteLoading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <LoadingState
        title="Carregando superficie"
        description="O frontend esta resolvendo a rota solicitada antes de abrir a proxima camada do console."
      />
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AuthBootstrap />,
    children: [
      {
        path: '/',
        element: <Navigate replace to="/admin" />,
      },
      {
        path: '/login',
        element: withSuspense(<LoginPage />),
      },
      {
        path: '/help',
        element: withSuspense(<HelpCenterPage />),
      },
      {
        path: '/help/:spaceSlug',
        element: withSuspense(<HelpCenterSpaceLayout />),
        children: [
          {
            index: true,
            element: withSuspense(<HelpCenterHomePage />),
          },
          {
            path: 'articles',
            element: withSuspense(<HelpCenterArticlesPage />),
          },
          {
            path: 'articles/:articleSlug',
            element: withSuspense(<HelpCenterArticlePage />),
          },
        ],
      },
      {
        path: '/access-denied',
        element: withSuspense(<AccessDeniedPage />),
      },
      {
        path: '/admin',
        element: (
          <AdminGate>{withSuspense(<AdminConsoleShell />)}</AdminGate>
        ),
        children: [
          {
            index: true,
            element: <Navigate replace to="/admin/tenants" />,
          },
          {
            path: 'tenants',
            element: withSuspense(<TenantsPage />),
          },
          {
            path: 'knowledge',
            element: withSuspense(<KnowledgePage />),
          },
          {
            path: 'access',
            element: withSuspense(<AccessPage />),
          },
          {
            path: 'system',
            element: withSuspense(<SystemPage />),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate replace to="/admin" />,
      },
    ],
  },
]);
