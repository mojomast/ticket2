import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type WorkOrder } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { DEVICE_TYPE_LABELS } from '../../lib/constants';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Card } from '../../components/ui/card';

export default function PortalWorkOrders() {
  const { t } = useTranslation();
  const { data: workOrders = [], isLoading, isError } = useQuery({
    queryKey: ['portal-workorders'],
    queryFn: () => api.workorders.list({ limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('portal.wo.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('portal.wo.subtitle')}</p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-600">{t('portal.wo.loadError')}</div>
      ) : (workOrders as WorkOrder[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('portal.wo.noWorkOrders')}</div>
      ) : (
        <div className="space-y-3">
          {(workOrders as WorkOrder[]).map((wo) => (
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
                    {DEVICE_TYPE_LABELS[wo.deviceType] || wo.deviceType}
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
                {wo.status === 'ATTENTE_APPROBATION' && wo.estimatedCost && (
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
    </div>
  );
}
