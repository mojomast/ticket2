import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/utils';
import { STATUS_LABELS } from '../../lib/constants';
import HelpTooltip from '../../components/shared/HelpTooltip';

export default function TechTickets() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['tickets', { status }], queryFn: () => api.tickets.list({ status }) });
  const tickets = (data as any[]) || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Billets</h1>
      <HelpTooltip content="Filtrer les billets par statut pour affiner la liste" side="bottom">
        <select onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </HelpTooltip>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">Chargement...</div> : (
        <div className="bg-card border rounded-lg divide-y">
          {tickets.map((t: any) => (
            <Link key={t.id} to={`/technicien/billets/${t.id}`} className="p-4 flex justify-between items-center hover:bg-muted/30 block">
              <div>
                <span className="text-sm font-mono text-muted-foreground mr-2">{t.ticketNumber}</span>
                <span className="text-sm font-medium">{t.title}</span>
                <p className="text-xs text-muted-foreground mt-1">{t.customer?.firstName} {t.customer?.lastName} - {formatDate(t.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <HelpTooltip content="Statut actuel du billet" side="left">
                  <span><StatusBadge status={t.status} /></span>
                </HelpTooltip>
                <HelpTooltip content="Niveau de priorité" side="left">
                  <span><StatusBadge status={t.priority} type="priority" /></span>
                </HelpTooltip>
              </div>
            </Link>
          ))}
          {tickets.length === 0 && <div className="p-8 text-center text-muted-foreground">Aucun billet</div>}
        </div>
      )}
    </div>
  );
}
