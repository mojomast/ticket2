import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Ticket } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

/** Active (non-terminal) ticket statuses */
const ACTIVE_STATUSES = [
  'NOUVELLE', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT',
  'APPROUVEE', 'PLANIFIEE', 'EN_COURS', 'BLOCAGE',
];

/** Statuses where we're waiting on the customer */
const AWAITING_RESPONSE = ['EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT'];

export default function PortalDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch customer tickets (up to 50)
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets', { limit: 50 }],
    queryFn: () => api.tickets.list({ limit: 50 }),
  });

  // Fetch customer work orders stats
  const { data: workOrderStats } = useQuery({
    queryKey: ['workorders-stats'],
    queryFn: () => api.workorders.stats(),
  });

  // Stats
  const activeTickets = tickets.filter((tk) => ACTIVE_STATUSES.includes(tk.status));
  const awaitingCount = tickets.filter((tk) => AWAITING_RESPONSE.includes(tk.status)).length;
  const activeWoCount = (workOrderStats as any)?.activeCount ?? 0;

  // Recent tickets
  const recentTickets = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [tickets],
  );

  const stats = [
    {
      label: t('portal.dashboard.activeTickets'),
      count: activeTickets.length,
      color: 'text-blue-600',
      icon: '📋',
      tooltip: t('portal.dashboard.activeTooltip'),
    },
    {
      label: t('portal.dashboard.waiting'),
      count: awaitingCount,
      color: 'text-yellow-600',
      icon: '⏳',
      tooltip: t('portal.dashboard.waitingTooltip'),
    },
    {
      label: t('portal.dashboard.activeWorkOrders'),
      count: activeWoCount,
      color: 'text-teal-600',
      icon: '🔧',
      tooltip: t('portal.dashboard.activeWoTooltip'),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.welcome', { name: user?.firstName ?? '' })}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <HelpTooltip key={stat.label} content={stat.tooltip} side="bottom">
            <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label={stat.label}>
                {stat.icon}
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
            </div>
          </HelpTooltip>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex justify-between">
          <h2 className="font-semibold">{t('ticket.myRecentTickets')}</h2>
          <HelpTooltip content={t('portal.dashboard.viewAllTooltip')} side="left">
            <Link to="/portail/billets" className="text-sm text-primary hover:underline">
              {t('common.viewAllFull')}
            </Link>
          </HelpTooltip>
        </div>
        <div className="divide-y">
          {recentTickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {t('ticket.noTicketsCreate')}
            </div>
          ) : (
            recentTickets.map((tk) => (
              <Link
                key={tk.id}
                to={`/portail/billets/${tk.id}`}
                className="p-4 flex justify-between hover:bg-muted/30 block"
              >
                <div>
                  <span className="text-sm font-mono text-muted-foreground mr-2">
                    {tk.ticketNumber}
                  </span>
                  <span className="text-sm">{tk.title}</span>
                </div>
                <HelpTooltip content={t('portal.dashboard.statusTooltip')} side="left">
                  <span>
                    <StatusBadge status={tk.status} />
                  </span>
                </HelpTooltip>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
