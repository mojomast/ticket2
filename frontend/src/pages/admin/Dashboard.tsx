import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type Ticket, type Appointment } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatRelativeTime, formatDateTime } from '../../lib/utils';

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
  const today = useMemo(() => getTodayRange(), []);

  // Fetch all tickets (up to 200) to compute accurate stats
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets', { limit: 200 }],
    queryFn: () => api.tickets.list({ limit: 200 }),
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
      tickets.filter((t) => statuses.includes(t.status)).length;

    return [
      {
        label: 'Nouveaux',
        count: countByGroup(STATUS_GROUPS.nouveaux),
        color: 'text-blue-600',
        icon: '🆕',
      },
      {
        label: 'En cours',
        count: countByGroup(STATUS_GROUPS.enCours),
        color: 'text-purple-600',
        icon: '⚙️',
      },
      {
        label: 'En attente',
        count: countByGroup(STATUS_GROUPS.enAttente),
        color: 'text-yellow-600',
        icon: '⏳',
      },
      {
        label: 'Termines',
        count: countByGroup(STATUS_GROUPS.termines),
        color: 'text-teal-600',
        icon: '✅',
      },
    ];
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">
        Bienvenue, {user?.firstName}
      </h1>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border rounded-lg p-4 flex items-center gap-3"
          >
            <span className="text-2xl" role="img" aria-label={stat.label}>
              {stat.icon}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.count}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Recent Tickets ─── */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Billets recents</h2>
          <Link
            to="/admin/billets"
            className="text-sm text-primary hover:underline"
          >
            Voir tous
          </Link>
        </div>
        <div className="divide-y">
          {recentTickets.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Aucun billet pour le moment.
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
      </div>

      {/* ─── Today's Appointments ─── */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Rendez-vous aujourd&apos;hui</h2>
          <Link
            to="/admin/calendrier"
            className="text-sm text-primary hover:underline"
          >
            Voir tous
          </Link>
        </div>
        <div className="divide-y">
          {appointments.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Aucun rendez-vous aujourd&apos;hui.
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
                    Technicien: {appt.technician.firstName} {appt.technician.lastName}
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
      </div>
    </div>
  );
}
