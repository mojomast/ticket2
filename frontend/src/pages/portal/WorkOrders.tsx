import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type WorkOrder } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { DEVICE_TYPE_LABELS } from '../../lib/constants';

export default function PortalWorkOrders() {
  const { data: workOrders = [], isLoading, isError } = useQuery({
    queryKey: ['portal-workorders'],
    queryFn: () => api.workorders.list({ limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mes bons de travail</h1>
      <p className="text-sm text-muted-foreground">Appareils en réparation en atelier</p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-600">Erreur lors du chargement. Veuillez réessayer.</div>
      ) : (workOrders as WorkOrder[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Aucun bon de travail</div>
      ) : (
        <div className="space-y-3">
          {(workOrders as WorkOrder[]).map((wo) => (
            <Link
              key={wo.id}
              to={`/portail/bons-travail/${wo.id}`}
              className="block bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-primary">{wo.orderNumber}</span>
                <StatusBadge status={wo.status} type="workorder" />
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
                <span>Réception: {new Date(wo.intakeDate).toLocaleDateString('fr-CA')}</span>
                {wo.estimatedPickupDate && (
                  <span>Ramassage prévu: {new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}</span>
                )}
              </div>
              {wo.status === 'ATTENTE_APPROBATION' && wo.estimatedCost && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs text-yellow-800">
                  Devis en attente d'approbation: {wo.estimatedCost.toFixed(2)} $
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
