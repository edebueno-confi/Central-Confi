import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cx } from '../../components/ui';
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
    <div className="min-h-dvh bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_44%,#f2f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="flex w-full gap-4 px-0 py-0 xl:min-h-dvh xl:px-4 xl:py-4">
        <div className="hidden shrink-0 xl:block">
          <div
            className={cx(
              'sticky top-4 relative h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] transition-[width] duration-200',
              sidebarCollapsed ? 'w-[88px]' : 'w-[242px]',
            )}
          >
            <AdminSidebar collapsed={sidebarCollapsed} />
            <button
              className="absolute -right-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(28,46,86,0.12)] bg-white text-base font-medium text-[color:var(--color-brand-navy)] shadow-[0_14px_30px_rgba(19,33,79,0.12)] transition hover:bg-[color:var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/20"
              onClick={() => setSidebarCollapsed((current) => !current)}
              type="button"
            >
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 px-3 py-3 sm:px-5 sm:py-5 xl:px-0 xl:py-0">
          <div
            className={cx(
              'flex w-full max-w-none flex-col gap-3',
              sidebarCollapsed ? 'xl:pr-1' : '',
            )}
          >
            <AdminTopbar />
            <main className="min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
