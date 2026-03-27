import { Outlet } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import AppSidebar from '../../components/shared/AppSidebar';
import DemoBanner from '../../components/shared/DemoBanner';
import NotificationBell from '../../components/shared/NotificationBell';
import HelpSidebar from '../../components/shared/HelpSidebar';
import { useHelpStore } from '../../stores/help-store';
import { usePageHelp } from '../../hooks/use-page-help';
import { useTranslation } from '../../lib/i18n/hook';

export default function AdminLayout() {
  usePageHelp();
  const toggle = useHelpStore((s) => s.toggle);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <div className="flex">
        <AppSidebar />
        <div className="flex-1">
          <header className="h-12 border-b bg-card flex items-center justify-end px-6 gap-4">
            <button
              onClick={toggle}
              className="rounded-md p-1.5 hover:bg-muted transition-colors"
              aria-label={t('help.openHelp')}
              title={t('help.helpTitle')}
            >
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </button>
            <NotificationBell />
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <HelpSidebar />
    </div>
  );
}
