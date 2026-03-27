import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/utils';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

const STATUS_KEYS = [
  'NOUVELLE', 'EN_COURS', 'EN_ATTENTE_APPROBATION', 'APPROUVEE',
  'PLANIFIEE', 'BLOCAGE', 'ANNULEE', 'REFUSEE', 'TERMINEE', 'FACTUREE',
] as const;
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PAGE_LIMIT = 25;

export default function TechTickets() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', { status, page, limit: PAGE_LIMIT }],
    queryFn: () => api.tickets.listPaginated({ status, page, limit: PAGE_LIMIT }),
  });

  const tickets = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Reset to page 1 when status filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tech.tickets.title')}</h1>
      <HelpTooltip content={t('tech.tickets.filterTooltip')} side="bottom">
        <select onChange={(e) => handleStatusChange(e.target.value)} className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="">{t('ticket.allStatuses')}</option>
          {STATUS_KEYS.map((key) => <option key={key} value={key}>{t(`label.status.${key}`)}</option>)}
        </select>
      </HelpTooltip>
      {isLoading ? <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div> : (
        <Card>
          <CardContent className="p-0 divide-y">
            {tickets.map((tk: any) => (
              <Link key={tk.id} to={`/technicien/billets/${tk.id}`} className="p-4 flex justify-between items-center hover:bg-muted/30 block">
                <div>
                  <span className="text-sm font-mono text-muted-foreground mr-2">{tk.ticketNumber}</span>
                  <span className="text-sm font-medium">{tk.title}</span>
                  <p className="text-xs text-muted-foreground mt-1">{tk.customer?.firstName} {tk.customer?.lastName} - {formatDate(tk.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <HelpTooltip content={t('tech.tickets.statusTooltip')} side="left">
                    <span><StatusBadge status={tk.status} /></span>
                  </HelpTooltip>
                  <HelpTooltip content={t('tech.tickets.priorityTooltip')} side="left">
                    <span><StatusBadge status={tk.priority} type="priority" /></span>
                  </HelpTooltip>
                </div>
              </Link>
            ))}
            {tickets.length === 0 && <div className="p-8 text-center text-muted-foreground">{t('ticket.noTickets')}</div>}
          </CardContent>
        </Card>
      )}

      {/* ─── Pagination controls ─── */}
      {!isLoading && totalPages > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {t('common.pageOf', { page: String(page), total: String(totalPages) })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t('common.previous_arrow')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              {t('common.next_arrow')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
