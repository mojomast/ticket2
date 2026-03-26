import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type Ticket, type Appointment } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';

/** Active (non-terminal) ticket statuses */
const ACTIVE_STATUSES = [
  'NOUVELLE', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT',
  'APPROUVEE', 'PLANIFIEE', 'EN_COURS', 'BLOCAGE',
];

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function TechDashboard() {
  const { user } = useAuth();
  const today = useMemo(() => getTodayRange(), []);

  // Fetch assigned tickets (up to 100)
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets', { limit: 100 }],
    queryFn: () => api.tickets.list({ limit: 100 }),
  });

  // Fetch today's appointments
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', { from: today.start, to: today.end }],
    queryFn: () => api.appointments.list({ from: today.start, to: today.end }),
  });

  // Fetch active work orders
  const { data: workOrderStats } = useQuery({
    queryKey: ['workorders-stats'],
    queryFn: () => api.workorders.stats(),
  });

  // Stats
  const activeTickets = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const enCoursCount = tickets.filter((t) => t.status === 'EN_COURS').length;
  const todayAppointments = appointments.length;
  const activeWoCount = (workOrderStats as any)?.activeCount ?? 0;

  // Recent tickets
  const recentTickets = useMemo(
    () =>
      [...tickets]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10),
    [tickets],
  );

  const stats = [
    {
      label: 'Tickets assignés',
      count: activeTickets.length,
      color: 'text-blue-600',
      icon: '📋',
      tooltip: 'Nombre de billets actifs qui vous sont assignés',
    },
    {
      label: 'En cours',
      count: enCoursCount,
      color: 'text-purple-600',
      icon: '⚙️',
      tooltip: 'Billets actuellement en cours de traitement',
    },
    {
      label: "RDV aujourd'hui",
      count: todayAppointments,
      color: 'text-indigo-600',
      icon: '📅',
      tooltip: 'Rendez-vous planifiés pour aujourd\'hui',
    },
    {
      label: 'Bons de travail actifs',
      count: activeWoCount,
      color: 'text-teal-600',
      icon: '🔧',
      tooltip: 'Bons de travail en cours (non terminés)',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bienvenue, {user?.firstName}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Ticket List */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Mes billets</h2>
          <HelpTooltip content="Voir la liste complète de vos billets" side="left">
            <Link to="/technicien/billets" className="text-sm text-primary hover:underline">
              Voir tout
            </Link>
          </HelpTooltip>
        </div>
        <div className="divide-y">
          {recentTickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucun billet assigné
            </div>
          ) : (
            recentTickets.map((t) => (
              <Link
                key={t.id}
                to={`/technicien/billets/${t.id}`}
                className="p-4 flex justify-between hover:bg-muted/30 block"
              >
                <div>
                  <span className="text-sm font-mono text-muted-foreground mr-2">
                    {t.ticketNumber}
                  </span>
                  <span className="text-sm">{t.title}</span>
                </div>
                <div className="flex gap-2">
                  <HelpTooltip content="Statut actuel du billet" side="left">
                    <span>
                      <StatusBadge status={t.status} />
                    </span>
                  </HelpTooltip>
                  <HelpTooltip content="Niveau de priorité du billet" side="left">
                    <span>
                      <StatusBadge status={t.priority} type="priority" />
                    </span>
                  </HelpTooltip>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
