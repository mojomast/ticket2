import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type WorkOrder } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

const PAGE_LIMIT = 20;

export default function PortalWorkOrders() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-workorders', { page, limit: PAGE_LIMIT }],
    queryFn: () => api.workorders.listPaginated({ page, limit: PAGE_LIMIT }),
  });

  const workOrders: WorkOrder[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('portal.wo.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('portal.wo.subtitle')}</p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-600">{t('portal.wo.loadError')}</div>
      ) : workOrders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('portal.wo.noWorkOrders')}</div>
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => (
            <Link
              key={wo.id}
              to={`/portail/bons-travail/${wo.id}`}
              className="block"
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-primary">{wo.orderNumber}</span>
                  <HelpTooltip content={t('portal.wo.statusTooltip')} side="left">
                    <span><StatusBadge status={wo.status} type="workorder" /></span>
                  </HelpTooltip>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t(`label.deviceType.${wo.deviceType}`) || wo.deviceType}
                  </span>
                  {' — '}
                  <span>{wo.deviceBrand} {wo.deviceModel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wo.reportedIssue}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{t('portal.wo.reception', { date: new Date(wo.intakeDate).toLocaleDateString('fr-CA') })}</span>
                  {wo.estimatedPickupDate && (
                    <span>{t('portal.wo.estimatedPickup', { date: new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA') })}</span>
                  )}
                </div>
                {wo.status === 'ATTENTE_APPROBATION' && wo.estimatedCost != null && (
                  <HelpTooltip content={t('portal.wo.pendingApprovalTooltip')} side="bottom">
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs text-yellow-800">
                      {t('portal.wo.pendingApproval', { amount: wo.estimatedCost.toFixed(2) })}
                    </div>
                  </HelpTooltip>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

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
