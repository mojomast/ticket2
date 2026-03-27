import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type WorkOrder, type WorkOrderNote } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime, formatCurrency, cn } from '../../lib/utils';
import {
  WO_STATUS_LABELS, DEVICE_TYPE_LABELS,
  SERVICE_CATEGORY_LABELS, WO_TERMINAL_STATUSES,
} from '../../lib/constants';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';

export default function PortalWorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const { t } = useTranslation();

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
      toast.success(t('portal.woDetail.approveSuccess'));
    },
    onError: (err: Error) => toast.error(err.message || t('common.error')),
  });

  const declineMutation = useMutation({
    mutationFn: () => api.workorders.declineQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder', id] });
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      queryClient.invalidateQueries({ queryKey: ['portal-workorders'] });
      toast.success(t('portal.woDetail.declineSuccess'));
    },
    onError: (err: Error) => toast.error(err.message || t('common.error')),
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; isInternal: boolean }) =>
      api.workorders.notes.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder-notes', id] });
      toast.success(t('portal.woDetail.messageSuccess'));
      setNoteContent('');
    },
    onError: (err: Error) => toast.error(err.message || t('portal.woDetail.messageError')),
  });

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addNoteMutation.mutate({ content: noteContent.trim(), isInternal: false });
  }

  if (isLoading) return <div className="text-center py-8">{t('common.loading')}</div>;
  if (isError) return <div className="text-center py-8 text-red-600">{t('portal.wo.loadError')}</div>;
  if (!workOrder) return <div className="text-center py-8">{t('portal.woDetail.notFound')}</div>;

  const wo: WorkOrder = workOrder;
  const pendingApproval = wo.status === 'ATTENTE_APPROBATION';
  const isTerminal = (WO_TERMINAL_STATUSES as readonly string[]).includes(wo.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/portail/bons-travail" className="text-sm text-muted-foreground hover:text-foreground">
          {t('portal.woDetail.back')}
        </Link>
        <h1 className="text-2xl font-bold font-mono">{wo.orderNumber}</h1>
        <HelpTooltip content={t('portal.woDetail.statusTooltip')} side="bottom">
          <span><StatusBadge status={wo.status} type="workorder" /></span>
        </HelpTooltip>
      </div>

      {/* Status explanation */}
      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm">
          <span className="font-medium">{t('portal.woDetail.currentStatus')}</span>{' '}
          {WO_STATUS_LABELS[wo.status] || wo.status}
        </p>
        <HelpTooltip content={t('portal.woDetail.timelineTooltip')} side="bottom">
          <div>
            <StatusTimeline status={wo.status} />
          </div>
        </HelpTooltip>
      </div>

      {/* Quote approval section */}
      {pendingApproval && wo.estimatedCost && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-yellow-900">{t('portal.woDetail.quoteTitle')}</h2>
          <div className="text-sm space-y-2">
            <p><span className="text-yellow-800 font-medium">{t('portal.woDetail.estimatedCost')}</span> {formatCurrency(wo.estimatedCost)}</p>
            {wo.diagnosticNotes && (
              <div>
                <span className="text-yellow-800 font-medium">{t('portal.woDetail.diagnostic')}</span>
                <p className="mt-1 whitespace-pre-wrap text-yellow-900">{wo.diagnosticNotes}</p>
              </div>
            )}
            {wo.estimatedPickupDate && (
              <p><span className="text-yellow-800 font-medium">{t('portal.woDetail.estimatedPickup')}</span> {new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <HelpTooltip content={t('portal.woDetail.approveTooltip')} side="bottom">
              <button
                onClick={() => {
                  if (confirm(t('portal.woDetail.approveConfirm'))) {
                    approveMutation.mutate();
                  }
                }}
                disabled={approveMutation.isPending || declineMutation.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? t('portal.woDetail.approving') : t('portal.woDetail.approveButton')}
              </button>
            </HelpTooltip>
            <HelpTooltip content={t('portal.woDetail.declineTooltip')} side="bottom">
              <button
                onClick={() => {
                  if (confirm(t('portal.woDetail.declineConfirm'))) {
                    declineMutation.mutate();
                  }
                }}
                disabled={approveMutation.isPending || declineMutation.isPending}
                className="flex-1 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {declineMutation.isPending ? t('portal.woDetail.declining') : t('portal.woDetail.declineButton')}
              </button>
            </HelpTooltip>
          </div>
        </div>
      )}

      {/* Device info */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">{t('portal.woDetail.device')}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">{t('portal.woDetail.deviceType')}</span>
            <p>{DEVICE_TYPE_LABELS[wo.deviceType] || wo.deviceType}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t('portal.woDetail.deviceBrandModel')}</span>
            <p>{wo.deviceBrand} {wo.deviceModel}</p>
          </div>
        </div>
      </div>

      {/* Problem */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-2">{t('portal.woDetail.reportedIssue')}</h3>
        <p className="text-sm whitespace-pre-wrap">{wo.reportedIssue}</p>
        {wo.serviceCategory && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('portal.woDetail.categoryLabel', { category: SERVICE_CATEGORY_LABELS[wo.serviceCategory] || wo.serviceCategory })}
          </p>
        )}
      </div>

      {/* Financial info */}
      {(wo.estimatedCost || wo.finalCost || wo.depositAmount) && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-3">{t('portal.woDetail.costs')}</h3>
          <div className="text-sm space-y-1.5">
            {wo.estimatedCost != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('portal.woDetail.quoteLabel')}</span>
                <span>{formatCurrency(wo.estimatedCost)}</span>
              </div>
            )}
            {wo.finalCost != null && (
              <div className="flex justify-between font-medium">
                <span>{t('portal.woDetail.finalCost')}</span>
                <span>{formatCurrency(wo.finalCost)}</span>
              </div>
            )}
            {wo.depositAmount != null && wo.depositAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('portal.woDetail.deposit')}</span>
                <span>{formatCurrency(wo.depositAmount)}</span>
              </div>
            )}
            {wo.diagnosticFee != null && wo.diagnosticFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('portal.woDetail.diagnosticFee')}</span>
                <span>{formatCurrency(wo.diagnosticFee)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">{t('portal.woDetail.dates')}</h3>
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('portal.woDetail.receptionDate')}</span>
            <span>{formatDateTime(wo.intakeDate)}</span>
          </div>
          {wo.estimatedPickupDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('portal.woDetail.estimatedPickupDate')}</span>
              <span>{new Date(wo.estimatedPickupDate).toLocaleDateString('fr-CA')}</span>
            </div>
          )}
          {wo.completedDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('portal.woDetail.completedDate')}</span>
              <span>{formatDateTime(wo.completedDate)}</span>
            </div>
          )}
          {wo.pickupDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('portal.woDetail.pickupDate')}</span>
              <span>{formatDateTime(wo.pickupDate)}</span>
            </div>
          )}
          {wo.warrantyDays != null && wo.warrantyDays > 0 && wo.warrantyStartDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('portal.woDetail.warranty')}</span>
              <span>{t('portal.woDetail.warrantyDays', { days: wo.warrantyDays, date: new Date(wo.warrantyStartDate).toLocaleDateString('fr-CA') })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes (non-internal only) */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-3">{t('portal.woDetail.messages')}</h3>
        {(notes as WorkOrderNote[]).length > 0 ? (
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
        ) : (
          <p className="text-sm text-muted-foreground mb-3">{t('portal.woDetail.noMessages')}</p>
        )}

        {/* Reply form — only visible for non-terminal WOs */}
        {!isTerminal && (
          <form onSubmit={handleAddNote} className="space-y-2 border-t pt-3 mt-3">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={t('portal.woDetail.messagePlaceholder')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addNoteMutation.isPending || !noteContent.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {addNoteMutation.isPending ? t('common.sending') : t('common.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Visual status timeline ───

const STATUS_STEPS = [
  'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
  'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET', 'REMIS',
];

function StatusTimeline({ status }: { status: string }) {
  const { t } = useTranslation();

  // For terminal non-happy-path statuses, show a special badge
  if (['REFUSE', 'ABANDONNE', 'ANNULE'].includes(status)) {
    return (
      <p className="text-xs text-muted-foreground mt-2">
        {t('portal.woDetail.terminalStatus', { status: WO_STATUS_LABELS[status] ?? status })}
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
                {t(`wo.step.${step}`)}
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
