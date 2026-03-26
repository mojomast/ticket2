import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useHelpStore } from '../stores/help-store';

/**
 * Route-to-pageKey mapping table.
 * Order matters: more-specific routes must come before less-specific ones
 * so that prefix matching picks the right key.
 */
const ROUTE_MAP: Array<{ pattern: RegExp; key: string }> = [
  // Admin routes
  { pattern: /^\/admin\/billets\/kanban$/, key: 'admin-kanban' },
  { pattern: /^\/admin\/billets\/[^/]+$/, key: 'admin-ticket-detail' },
  { pattern: /^\/admin\/billets$/, key: 'admin-tickets' },
  { pattern: /^\/admin\/calendrier$/, key: 'admin-calendar' },
  { pattern: /^\/admin\/clients$/, key: 'admin-clients' },
  { pattern: /^\/admin\/parametres$/, key: 'admin-settings' },
  { pattern: /^\/admin\/sauvegardes$/, key: 'admin-backups' },
  { pattern: /^\/admin\/techniciens$/, key: 'admin-technicians' },
  { pattern: /^\/admin\/bons-travail\/nouveau$/, key: 'admin-workorder-intake' },
  { pattern: /^\/admin\/bons-travail\/[^/]+$/, key: 'admin-workorder-detail' },
  { pattern: /^\/admin\/bons-travail$/, key: 'admin-workorders' },
  { pattern: /^\/admin\/profil$/, key: 'admin-profile' },
  { pattern: /^\/admin$/, key: 'admin-dashboard' },

  // Customer portal routes
  { pattern: /^\/portail\/billets\/[^/]+$/, key: 'customer-ticket-detail' },
  { pattern: /^\/portail\/billets$/, key: 'customer-tickets' },
  { pattern: /^\/portail\/rendez-vous$/, key: 'customer-appointments' },
  { pattern: /^\/portail\/bons-travail\/[^/]+$/, key: 'customer-workorder-detail' },
  { pattern: /^\/portail\/bons-travail$/, key: 'customer-workorders' },
  { pattern: /^\/portail\/profil$/, key: 'customer-profile' },
  { pattern: /^\/portail$/, key: 'customer-dashboard' },

  // Technician routes
  { pattern: /^\/technicien\/billets\/[^/]+$/, key: 'tech-ticket-detail' },
  { pattern: /^\/technicien\/billets$/, key: 'tech-tickets' },
  { pattern: /^\/technicien\/horaire$/, key: 'tech-schedule' },
  { pattern: /^\/technicien\/bons-travail\/nouveau$/, key: 'tech-workorder-intake' },
  { pattern: /^\/technicien\/bons-travail\/[^/]+$/, key: 'tech-workorder-detail' },
  { pattern: /^\/technicien\/bons-travail$/, key: 'tech-workorders' },
  { pattern: /^\/technicien\/profil$/, key: 'tech-profile' },
  { pattern: /^\/technicien$/, key: 'tech-dashboard' },

  // Public routes
  { pattern: /^\/login$/, key: 'login' },
  { pattern: /^\/demande$/, key: 'service-request' },
  { pattern: /^\/$/, key: 'landing' },
];

/**
 * Derives the help page key from the current pathname.
 */
function derivePageKey(pathname: string): string {
  for (const { pattern, key } of ROUTE_MAP) {
    if (pattern.test(pathname)) {
      return key;
    }
  }
  return 'unknown';
}

/**
 * Hook that syncs the current route to the help store's pageKey
 * and sets up keyboard shortcuts (? and F1) to toggle help.
 *
 * Returns convenience accessors for help state.
 */
export function usePageHelp() {
  const location = useLocation();
  const isOpen = useHelpStore((s) => s.isOpen);
  const toggle = useHelpStore((s) => s.toggle);
  const open = useHelpStore((s) => s.open);
  const close = useHelpStore((s) => s.close);

  const pageKey = useMemo(() => derivePageKey(location.pathname), [location.pathname]);

  // Sync pageKey to the store whenever route changes
  useEffect(() => {
    useHelpStore.getState().setPageKey(pageKey);
  }, [pageKey]);

  // Keyboard shortcuts: ? (when not focused on input) and F1
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // F1 — always toggle help, prevent browser default
      if (e.key === 'F1') {
        e.preventDefault();
        useHelpStore.getState().toggle();
        return;
      }

      // ? — only when not typing in an input, textarea, or contenteditable
      if (e.key === '?') {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isEditable =
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target.isContentEditable;

        if (!isEditable) {
          e.preventDefault();
          useHelpStore.getState().toggle();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { pageKey, isOpen, toggle, open, close };
}
