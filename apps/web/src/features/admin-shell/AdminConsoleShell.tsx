import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

export function AdminConsoleShell() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_42%,#f3f6fb_100%)] text-[color:var(--color-ink)]">
      <div className="mx-auto flex max-w-[1880px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden w-[256px] shrink-0 xl:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <AdminSidebar />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="space-y-5">
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
