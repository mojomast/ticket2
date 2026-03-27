import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';
import { WS_STATUS_LABELS, WS_STATUS_COLORS } from '../../lib/constants';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PAGE_LIMIT = 25;

export default function TechWorksheets() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['worksheets', { status, page, limit: PAGE_LIMIT }],
    queryFn: () => api.worksheets.list({ status, page, limit: PAGE_LIMIT }),
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
      <h1 className="text-2xl font-bold">{t('worksheet.title')}</h1>

      <select
        onChange={(e) => handleStatusChange(e.target.value)}
        className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">{t('worksheet.allStatuses')}</option>
        {Object.entries(WS_STATUS_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {worksheets.map((ws: any) => (
              <Link
                key={ws.id}
                to={`/technicien/feuilles-travail/${ws.id}`}
                className="p-4 flex justify-between items-center hover:bg-muted/30 block"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {ws.workOrder?.orderNumber}
                    </span>
                    <span className="text-sm font-medium">
                      {ws.workOrder?.customerName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ws.workOrder?.deviceBrand} {ws.workOrder?.deviceModel}
                    {' — '}
                    {formatDate(ws.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${WS_STATUS_COLORS[ws.status]?.bg || 'bg-gray-100'} ${WS_STATUS_COLORS[ws.status]?.text || 'text-gray-700'}`}
                  >
                    {WS_STATUS_LABELS[ws.status] || ws.status}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-right min-w-[5rem]">
                    {Number(ws.grandTotal ?? 0).toFixed(2)}&nbsp;$
                  </span>
                </div>
              </Link>
            ))}
            {worksheets.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {t('worksheet.noWorksheets')}
              </div>
            )}
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
