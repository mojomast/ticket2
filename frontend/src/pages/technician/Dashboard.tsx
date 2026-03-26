import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/use-auth';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/shared/StatusBadge';

export default function TechDashboard() {
  const { user } = useAuth();
  const { data: tickets } = useQuery({ queryKey: ['tickets', { limit: 10 }], queryFn: () => api.tickets.list({ limit: 10 }) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bienvenue, {user?.firstName}</h1>
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b"><h2 className="font-semibold">Mes billets</h2></div>
        <div className="divide-y">
          {(tickets as any[])?.map((t: any) => (
            <Link key={t.id} to={`/technicien/billets/${t.id}`} className="p-4 flex justify-between hover:bg-muted/30 block">
              <div>
                <span className="text-sm font-mono text-muted-foreground mr-2">{t.ticketNumber}</span>
                <span className="text-sm">{t.title}</span>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={t.status} />
                <StatusBadge status={t.priority} type="priority" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
