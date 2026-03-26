import { Outlet } from 'react-router-dom';
import AppSidebar from '../../components/shared/AppSidebar';
import DemoBanner from '../../components/shared/DemoBanner';
import NotificationBell from '../../components/shared/NotificationBell';

export default function PortalLayout() {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <div className="flex">
        <AppSidebar />
        <div className="flex-1">
          <header className="h-12 border-b bg-card flex items-center justify-end px-6 gap-4">
            <NotificationBell />
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
