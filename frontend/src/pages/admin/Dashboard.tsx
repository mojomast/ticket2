import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type Ticket, type Appointment } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { formatRelativeTime, formatDateTime } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n/hook';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

// ─── Status groupings for stat cards ───

const STATUS_GROUPS = {
  nouveaux: ['NOUVELLE'],
  enCours: ['EN_COURS'],
  enAttente: ['EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT'],
  termines: ['TERMINEE', 'FERMEE'],
} as const;

interface StatCard {
  label: string;
  count: number;
  color: string;
  icon: string;
  tooltip: string;
}

function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000); // +1 day
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const today = useMemo(() => getTodayRange(), []);

  // Fetch all tickets (up to 100) to compute accurate stats
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets', { limit: 100 }],
    queryFn: () => api.tickets.list({ limit: 100 }),
  });

  // Fetch today's appointments
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', { from: today.start, to: today.end }],
    queryFn: () =>
      api.appointments.list({ from: today.start, to: today.end }),
  });

  // Recent 10 tickets for the list, sorted by most recent first
  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [tickets]);

  // Compute stat counts from all tickets
  const stats: StatCard[] = useMemo(() => {
    const countByGroup = (statuses: readonly string[]) =>
      tickets.filter((tk) => statuses.includes(tk.status)).length;

    return [
      {
        label: t('admin.dashboard.new'),
        count: countByGroup(STATUS_GROUPS.nouveaux),
        color: 'text-blue-600',
        icon: '🆕',
        tooltip: t('admin.dashboard.newTooltip'),
      },
      {
        label: t('admin.dashboard.inProgress'),
        count: countByGroup(STATUS_GROUPS.enCours),
        color: 'text-purple-600',
        icon: '⚙️',
        tooltip: t('admin.dashboard.inProgressTooltip'),
      },
      {
        label: t('admin.dashboard.waiting'),
        count: countByGroup(STATUS_GROUPS.enAttente),
        color: 'text-yellow-600',
        icon: '⏳',
        tooltip: t('admin.dashboard.waitingTooltip'),
      },
      {
        label: t('admin.dashboard.completed'),
        count: countByGroup(STATUS_GROUPS.termines),
        color: 'text-teal-600',
        icon: '✅',
        tooltip: t('admin.dashboard.completedTooltip'),
      },
    ];
  }, [tickets, t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">
        {t('dashboard.welcome', { name: user?.firstName ?? '' })}
      </h1>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <HelpTooltip key={stat.label} content={stat.tooltip} side="bottom">
            <Card className="p-4 flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label={stat.label}>
                {stat.icon}
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.count}
                </p>
              </div>
            </Card>
          </HelpTooltip>
        ))}
      </div>

      {/* ─── Recent Tickets ─── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
          <CardTitle className="text-base">{t('ticket.recentTickets')}</CardTitle>
          <HelpTooltip content={t('admin.tickets.viewAllTooltip')} side="left">
            <Link
              to="/admin/billets"
              className="text-sm text-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          </HelpTooltip>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentTickets.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                {t('ticket.noTicketsMoment')}
              </p>
            )}
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/admin/billets/${ticket.id}`}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors block"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-mono text-muted-foreground mr-2">
                    {ticket.ticketNumber}
                  </span>
                  <span className="text-sm font-medium">{ticket.title}</span>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {ticket.customer.firstName} {ticket.customer.lastName}
                    {ticket.customer.companyName && ` — ${ticket.customer.companyName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <StatusBadge status={ticket.status} />
                  <StatusBadge status={ticket.priority} type="priority" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(ticket.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Today's Appointments ─── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
          <CardTitle className="text-base">{t('appointment.today')}</CardTitle>
          <HelpTooltip content={t('admin.tickets.calendarTooltip')} side="left">
            <Link
              to="/admin/calendrier"
              className="text-sm text-primary hover:underline"
            >
              {t('common.viewAll')}
            </Link>
          </HelpTooltip>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {appointments.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                {t('appointment.noAppointmentsToday')}
              </p>
            )}
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/billets/${appt.ticketId}`}
                    className="text-sm font-mono text-primary hover:underline mr-2"
                  >
                    {appt.ticket.ticketNumber}
                  </Link>
                  <span className="text-sm font-medium">
                    {appt.ticket.title}
                  </span>
                  {appt.technician && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('appointment.technicianLabel', { name: `${appt.technician.firstName} ${appt.technician.lastName}` })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <StatusBadge status={appt.status} type="appointment" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(appt.scheduledStart)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
