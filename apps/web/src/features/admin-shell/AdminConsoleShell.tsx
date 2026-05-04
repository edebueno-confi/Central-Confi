import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

const SIDEBAR_STORAGE_KEY = 'admin-console-shell-collapsed';

function usePersistedSidebarState() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    setCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

export function AdminConsoleShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedSidebarState();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1880px] gap-4 px-3 py-3 sm:px-5 lg:px-6">
        <div className="hidden shrink-0 xl:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <AdminSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="space-y-4">
            <AdminTopbar
              onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
              sidebarCollapsed={sidebarCollapsed}
            />
            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
