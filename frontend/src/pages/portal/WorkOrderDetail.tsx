import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type WorkOrder, type WorkOrderNote } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime, formatCurrency, cn } from '../../lib/utils';
import {
  WO_STATUS_LABELS, DEVICE_TYPE_LABELS,
  SERVICE_CATEGORY_LABELS,
} from '../../lib/constants';

export default function PortalWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: workOrder, isLoading, isError } = useQuery({
    queryKey: ['workorder', id],
    queryFn: () => api.workorders.get(id!),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['workorder-notes', id],
    queryFn: () => api.workorders.notes.list(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.workorders.approveQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['portal-workorders'] });
      toast.success('Devis approuvé');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  const declineMutation = useMutation({
    mutationFn: () => api.workorders.declineQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['portal-workorders'] });
      toast.success('Devis refusé');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (isError) return <div className="text-center py-8 text-red-600">Erreur lors du chargement. Veuillez réessayer.</div>;
  if (!workOrder) return <div className="text-center py-8">Bon de travail introuvable</div>;

  const wo: WorkOrder = workOrder;
  const pendingApproval = wo.status === 'ATTENTE_APPROBATION';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/portail/bons-travail" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-bold font-mono">{wo.orderNumber}</h1>
        <StatusBadge status={wo.status} type="workorder" />
      </div>

      {/* Status explanation */}
      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm">
          <span className="font-medium">Statut actuel:</span>{' '}
          {WO_STATUS_LABELS[wo.status] || wo.status}
        </p>
        <StatusTimeline status={wo.status} />
      </div>

      {/* Quote approval section */}
      {pendingApproval && wo.estimatedCost && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-yellow-900">Devis à approuver</h2>
          <div className="text-sm space-y-2">
            <p><span className="text-yellow-800 font-medium">Coût estimé:</span> {formatCurrency(wo.estimatedCost)}</p>
            {wo.diagnosticNotes && (
              <div>
                <span className="text-yellow-800 font-medium">Diagnostic:</span>
                <p className="mt-1 whitespace-pre-wrap text-yellow-900">{wo.diagnosticNotes}</p>
              </div>
            )}
            {wo.estimatedPickupDate && (
              <p><span className="text-yellow-800 font-medium">Ramassage prévu:</span> {new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                if (confirm('Approuver le devis et autoriser les réparations?')) {
                  approveMutation.mutate();
                }
              }}
              disabled={approveMutation.isPending || declineMutation.isPending}
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Approbation...' : 'Approuver le devis'}
            </button>
            <button
              onClick={() => {
                if (confirm('Refuser le devis? Votre appareil sera retourné sans réparation.')) {
                  declineMutation.mutate();
                }
              }}
              disabled={approveMutation.isPending || declineMutation.isPending}
              className="flex-1 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {declineMutation.isPending ? 'Refus...' : 'Refuser le devis'}
            </button>
          </div>
        </div>
      )}

      {/* Device info */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">Appareil</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Type</span>
            <p>{DEVICE_TYPE_LABELS[wo.deviceType] || wo.deviceType}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Marque / Modèle</span>
            <p>{wo.deviceBrand} {wo.deviceModel}</p>
          </div>
        </div>
      </div>

      {/* Problem */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-2">Problème rapporté</h3>
        <p className="text-sm whitespace-pre-wrap">{wo.reportedIssue}</p>
        {wo.serviceCategory && (
          <p className="text-xs text-muted-foreground mt-2">
            Catégorie: {SERVICE_CATEGORY_LABELS[wo.serviceCategory] || wo.serviceCategory}
          </p>
        )}
      </div>

      {/* Financial info */}
      {(wo.estimatedCost || wo.finalCost || wo.depositAmount) && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-3">Coûts</h3>
          <div className="text-sm space-y-1.5">
            {wo.estimatedCost != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Devis</span>
                <span>{formatCurrency(wo.estimatedCost)}</span>
              </div>
            )}
            {wo.finalCost != null && (
              <div className="flex justify-between font-medium">
                <span>Coût final</span>
                <span>{formatCurrency(wo.finalCost)}</span>
              </div>
            )}
            {wo.depositAmount != null && wo.depositAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dépôt versé</span>
                <span>{formatCurrency(wo.depositAmount)}</span>
              </div>
            )}
            {wo.diagnosticFee != null && wo.diagnosticFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frais de diagnostic</span>
                <span>{formatCurrency(wo.diagnosticFee)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">Dates</h3>
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Réception</span>
            <span>{formatDateTime(wo.intakeDate)}</span>
          </div>
          {wo.estimatedPickupDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ramassage prévu</span>
              <span>{new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}</span>
            </div>
          )}
          {wo.completedDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Réparation terminée</span>
              <span>{formatDateTime(wo.completedDate)}</span>
            </div>
          )}
          {wo.pickupDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remis</span>
              <span>{formatDateTime(wo.pickupDate)}</span>
            </div>
          )}
          {wo.warrantyDays != null && wo.warrantyDays > 0 && wo.warrantyStartDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Garantie</span>
              <span>{wo.warrantyDays} jours (depuis {new Date(wo.warrantyStartDate).toLocaleDateString('fr-CA')})</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes (non-internal only) */}
      {(notes as WorkOrderNote[]).length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-3">Messages</h3>
          <div className="space-y-3">
            {(notes as WorkOrderNote[]).map((note) => (
              <div key={note.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">
                    {note.author.firstName} {note.author.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Visual status timeline ───

const STATUS_STEPS = [
  'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
  'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET', 'REMIS',
];

const STATUS_STEP_LABELS: Record<string, string> = {
  RECEPTION: 'Réception',
  DIAGNOSTIC: 'Diagnostic',
  ATTENTE_APPROBATION: 'Approbation',
  APPROUVE: 'Approuvé',
  ATTENTE_PIECES: 'Att. pièces',
  EN_REPARATION: 'Réparation',
  VERIFICATION: 'Vérification',
  PRET: 'Prêt',
  REMIS: 'Remis',
};

function StatusTimeline({ status }: { status: string }) {
  // For terminal non-happy-path statuses, show a special badge
  if (['REFUSE', 'ABANDONNE', 'ANNULE'].includes(status)) {
    return (
      <p className="text-xs text-muted-foreground mt-2">
        Ce bon de travail est terminé avec le statut: <strong>{WO_STATUS_LABELS[status]}</strong>
      </p>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto">
      {STATUS_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = step === status;

        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-3 h-3 rounded-full border-2',
                isCompleted ? 'bg-primary border-primary' :
                isCurrent ? 'bg-primary/30 border-primary' :
                'bg-muted border-muted-foreground/30'
              )} />
              <span className={cn(
                'text-[9px] mt-1 whitespace-nowrap',
                isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'
              )}>
                {STATUS_STEP_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={cn(
                'w-4 h-0.5 mb-3',
                isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
