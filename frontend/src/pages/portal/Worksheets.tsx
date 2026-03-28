import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type WorksheetListItem } from '../../api/client';
import { formatDate } from '../../lib/utils';
import { WS_STATUS_COLORS, WS_STATUS_KEYS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

const PAGE_LIMIT = 25;

export default function PortalWorksheets() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['worksheets', { status, page, limit: PAGE_LIMIT }],
    queryFn: () => api.worksheets.list({ status, page, limit: PAGE_LIMIT }),
  });

  const worksheets: WorksheetListItem[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Reset to page 1 when status filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  /** Derive a readable reference label for a worksheet */
  function referenceLabel(ws: WorksheetListItem): string {
    if (ws.workOrder?.orderNumber) return ws.workOrder.orderNumber;
    if (ws.ticket?.ticketNumber) return ws.ticket.ticketNumber;
    return t('worksheet.unscheduledCall');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.worksheets')}</h1>
      <p className="text-sm text-muted-foreground">{t('worksheet.portalSubtitle')}</p>

      {/* ─── Status filter ─── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">{t('worksheet.allStatuses')}</option>
          {WS_STATUS_KEYS.map((key) => (
            <option key={key} value={key}>{t(`label.wsStatus.${key}`)}</option>
          ))}
        </select>
      </div>

      {/* ─── Worksheet list ─── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : worksheets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('worksheet.noWorksheets')}</div>
      ) : (
        <div className="space-y-3">
          {worksheets.map((ws) => {
            const statusColors = WS_STATUS_COLORS[ws.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

            return (
              <Link
                key={ws.id}
                to={`/portail/feuilles-travail/${ws.id}`}
                className="block"
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-primary">
                      {referenceLabel(ws)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                    >
                      {t(`label.wsStatus.${ws.status}`) || ws.status}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {t('worksheet.technician')}: {ws.technician.firstName} {ws.technician.lastName}
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{formatDate(ws.createdAt)}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {(ws.grandTotal ?? 0).toFixed(2)} $
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── Pagination controls ─── */}
      {!isLoading && totalPages > 1 && (
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
