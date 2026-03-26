import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/shared/StatusBadge';

export default function PortalDashboard() {
  const { user } = useAuth();
  const { data: tickets } = useQuery({ queryKey: ['tickets', { limit: 5 }], queryFn: () => api.tickets.list({ limit: 5 }) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bienvenue, {user?.firstName}</h1>
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex justify-between">
          <h2 className="font-semibold">Mes billets recents</h2>
          <Link to="/portail/billets" className="text-sm text-primary hover:underline">Voir tout</Link>
        </div>
        <div className="divide-y">
          {(tickets as any[])?.map((t: any) => (
            <Link key={t.id} to={`/portail/billets/${t.id}`} className="p-4 flex justify-between hover:bg-muted/30 block">
              <div>
                <span className="text-sm font-mono text-muted-foreground mr-2">{t.ticketNumber}</span>
                <span className="text-sm">{t.title}</span>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
          {(!tickets || (tickets as any[]).length === 0) && (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucun billet</div>
          )}
        </div>
      </div>
    </div>
  );
}
