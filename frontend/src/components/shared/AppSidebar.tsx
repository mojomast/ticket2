import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Ticket,
  Columns3,
  Calendar,
  Users,
  Wrench,
  Settings,
  HardDrive,
  UserCircle,
  LogOut,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { useTranslation } from '../../lib/i18n/hook';
import { cn } from '../../lib/utils';
import { api } from '../../api/client';
import type { UserRole } from '../../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Ticket,
  Columns3,
  Calendar,
  Users,
  Wrench,
  Settings,
  HardDrive,
  UserCircle,
  LogOut,
  ClipboardList,
};

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'nav.dashboard', path: '/admin', icon: 'LayoutDashboard' },
    { label: 'nav.tickets', path: '/admin/billets', icon: 'Ticket' },
    { label: 'nav.kanban', path: '/admin/billets/kanban', icon: 'Columns3' },
    { label: 'nav.workorders', path: '/admin/bons-travail', icon: 'ClipboardList' },
    { label: 'nav.calendar', path: '/admin/calendrier', icon: 'Calendar' },
    { label: 'nav.clients', path: '/admin/clients', icon: 'Users' },
    { label: 'nav.technicians', path: '/admin/techniciens', icon: 'Wrench' },
    { label: 'nav.settings', path: '/admin/parametres', icon: 'Settings' },
    { label: 'nav.profile', path: '/admin/profil', icon: 'UserCircle' },
    { label: 'nav.backups', path: '/admin/sauvegardes', icon: 'HardDrive' },
  ],
  TECHNICIAN: [
    { label: 'nav.dashboard', path: '/technicien', icon: 'LayoutDashboard' },
    { label: 'nav.tickets', path: '/technicien/billets', icon: 'Ticket' },
    { label: 'nav.workorders', path: '/technicien/bons-travail', icon: 'ClipboardList' },
    { label: 'nav.schedule', path: '/technicien/horaire', icon: 'Calendar' },
    { label: 'nav.profile', path: '/technicien/profil', icon: 'UserCircle' },
  ],
  CUSTOMER: [
    { label: 'nav.dashboard', path: '/portail', icon: 'LayoutDashboard' },
    { label: 'nav.tickets', path: '/portail/billets', icon: 'Ticket' },
    { label: 'nav.workorders', path: '/portail/bons-travail', icon: 'ClipboardList' },
    { label: 'nav.appointments', path: '/portail/rendez-vous', icon: 'Calendar' },
    { label: 'nav.profile', path: '/portail/profil', icon: 'UserCircle' },
  ],
};

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // Fetch branding config
  const { data: branding } = useQuery({
    queryKey: ['config', 'branding'],
    queryFn: api.config.branding,
    staleTime: 5 * 60 * 1000,
  });

  const companyName = (branding?.companyName as string) || 'Valitek';
  const logoUrl = branding?.logoUrl as string | undefined;
  const primaryColor = branding?.primaryColor as string | undefined;

  // Apply branding primary color as CSS custom property on the root element
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--branding-primary', primaryColor);
    }
    return () => {
      document.documentElement.style.removeProperty('--branding-primary');
    };
  }, [primaryColor]);

  if (!user) return null;

  const items = NAV_ITEMS[user.role as UserRole] || [];

  return (
    <aside className="w-64 bg-card border-r min-h-screen flex flex-col">
      {/* Logo / Brand */}
      <div className="p-4 border-b">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="h-8 w-auto mb-2 object-contain"
          />
        )}
        <h1 className="text-xl font-bold text-primary">{companyName}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin' && item.path !== '/technicien' && item.path !== '/portail' && location.pathname.startsWith(item.path));
          const Icon = ICON_MAP[item.icon];

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
