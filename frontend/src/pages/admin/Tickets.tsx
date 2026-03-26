import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/utils';
import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/constants';

export default function AdminTickets() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { ...filters, search }],
    queryFn: () => api.tickets.list({ ...filters, search }),
  });

  const tickets = data as any[] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billets</h1>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les priorites</option>
          {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">#</th>
                <th className="text-left p-3 text-sm font-medium">Titre</th>
                <th className="text-left p-3 text-sm font-medium">Client</th>
                <th className="text-left p-3 text-sm font-medium">Technicien</th>
                <th className="text-left p-3 text-sm font-medium">Statut</th>
                <th className="text-left p-3 text-sm font-medium">Priorite</th>
                <th className="text-left p-3 text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket: any) => (
                <tr key={ticket.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/admin/billets/${ticket.id}`} className="text-sm font-mono text-primary hover:underline">
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="p-3 text-sm">{ticket.title}</td>
                  <td className="p-3 text-sm">
                    {ticket.customer?.firstName} {ticket.customer?.lastName}
                  </td>
                  <td className="p-3 text-sm">
                    {ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : '-'}
                  </td>
                  <td className="p-3"><StatusBadge status={ticket.status} /></td>
                  <td className="p-3"><StatusBadge status={ticket.priority} type="priority" /></td>
                  <td className="p-3 text-sm text-muted-foreground">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Aucun billet</div>
          )}
        </div>
      )}
    </div>
  );
}
