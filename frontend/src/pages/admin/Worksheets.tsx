import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';
import { WS_STATUS_COLORS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PAGE_LIMIT = 25;
const WS_STATUS_KEYS = ['BROUILLON', 'SOUMISE', 'REVISEE', 'APPROUVEE', 'FACTUREE', 'ANNULEE'] as const;

export default function AdminWorksheets() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['worksheets', { status, page, limit: PAGE_LIMIT, search }],
    queryFn: () => api.worksheets.list({ status, page, limit: PAGE_LIMIT, search }),
  });

  const worksheets = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Reset to page 1 when status filter changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('worksheet.adminTitle')}</h1>

      {/* ─── Filters: search + status ─── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder={t('common.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
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

      {/* ─── Table ─── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">{t('worksheet.woNumber')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.client')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.technician')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.device')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.status')}</th>
                    <th className="text-right p-3 font-medium">{t('worksheet.total')}</th>
                    <th className="text-left p-3 font-medium">{t('worksheet.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {worksheets.map((ws: any) => (
                    <tr key={ws.id} className="hover:bg-muted/30">
                      {/* WO# / Ticket# / Standalone */}
                      <td className="p-3">
                        <Link
                          to={`/admin/feuilles-travail/${ws.id}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {ws.workOrder?.orderNumber || ws.ticket?.ticketNumber || t('worksheet.unscheduledCall')}
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="p-3">
                        {ws.workOrder?.customerName || (ws.ticket?.customer ? `${ws.ticket.customer.firstName} ${ws.ticket.customer.lastName}` : '—')}
                      </td>

                      {/* Technician */}
                      <td className="p-3">
                        {ws.technician
                          ? `${ws.technician.firstName} ${ws.technician.lastName}`
                          : '—'}
                      </td>

                      {/* Device / Ticket title */}
                      <td className="p-3 text-muted-foreground">
                        {ws.workOrder
                          ? `${ws.workOrder.deviceBrand ?? ''} ${ws.workOrder.deviceModel ?? ''}`
                          : ws.ticket?.title ?? '—'}
                      </td>

                      {/* Status badge */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${WS_STATUS_COLORS[ws.status]?.bg || 'bg-gray-100'} ${WS_STATUS_COLORS[ws.status]?.text || 'text-gray-700'}`}
                        >
                          {t(`label.wsStatus.${ws.status}`) || ws.status}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="p-3 text-right tabular-nums">
                        {Number(ws.grandTotal ?? 0).toFixed(2)}&nbsp;$
                      </td>

                      {/* Date */}
                      <td className="p-3 text-muted-foreground">
                        {formatDate(ws.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {worksheets.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {t('worksheet.noWorksheets')}
              </div>
            )}
          </CardContent>
        </Card>
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
