import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Notification } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { formatRelativeTime } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from './HelpTooltip';

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications with 30-second polling
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list({ limit: 20 }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Count unread notifications
  const unreadCount = notifications.filter((n: Notification) => !n.readAt).length;

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Impossible de marquer la notification comme lue');
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications marquées comme lues');
    },
    onError: () => {
      toast.error('Impossible de marquer toutes les notifications comme lues');
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if not authenticated
  if (!isAuthenticated) return null;

  function handleNotificationClick(notification: Notification) {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
  }

  function handleMarkAllRead() {
    markAllReadMutation.mutate();
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell icon button */}
      <HelpTooltip content={unreadCount > 0 ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'} side="bottom">
        <button
          onClick={() => setOpen(!open)}
          className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </HelpTooltip>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
          {/* Header */}
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <HelpTooltip key={notification.id} content={!notification.readAt ? 'Cliquer pour marquer comme lu' : 'Notification déjà lue'} side="left">
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors ${
                      !notification.readAt ? 'bg-accent/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Unread indicator dot */}
                      {!notification.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className={`flex-1 ${notification.readAt ? 'pl-4' : ''}`}>
                        <p className="text-sm font-medium leading-tight">{notification.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                </HelpTooltip>
              ))
            )}
          </div>

          {/* Footer: Mark all as read */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="border-t px-4 py-2">
              <HelpTooltip content="Marquer toutes les notifications comme lues" side="bottom">
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {markAllReadMutation.isPending
                    ? 'Chargement...'
                    : 'Tout marquer comme lu'}
                </button>
              </HelpTooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
