import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Appointment } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDateTime } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';

/** Appointment statuses that allow cancellation */
const CANCELLABLE_STATUSES = ['PLANIFIE', 'CONFIRME'];

type FilterMode = 'all' | 'upcoming' | 'past';

export default function PortalAppointments() {
  const [filter, setFilter] = useState<FilterMode>('upcoming');
  const queryClient = useQueryClient();
  const toast = useToast();

  // ─── Data fetching ───
  const {
    data: appointments = [],
    isLoading,
    isError,
  } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => api.appointments.list(),
  });

  // ─── Cancel mutation ───
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.appointments.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Rendez-vous annulé avec succès.');
    },
    onError: () => {
      toast.error('Impossible d\'annuler le rendez-vous. Veuillez réessayer.');
    },
  });

  // ─── Filtering ───
  const now = new Date();

  const filtered = appointments.filter((apt) => {
    if (filter === 'upcoming') {
      return new Date(apt.scheduledStart) >= now;
    }
    if (filter === 'past') {
      return new Date(apt.scheduledStart) < now;
    }
    return true; // 'all'
  });

  // Sort: upcoming → ascending (nearest first), past → descending (most recent first)
  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.scheduledStart).getTime();
    const dateB = new Date(b.scheduledStart).getTime();
    return filter === 'past' ? dateB - dateA : dateA - dateB;
  });

  const isCancellable = (status: string) => CANCELLABLE_STATUSES.includes(status);

  // ─── Filter tab button helper ───
  const filterButton = (mode: FilterMode, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(mode)}
      className={
        filter === mode
          ? 'px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground'
          : 'px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted'
      }
    >
      {label}
    </button>
  );

  // ─── Render ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Mes rendez-vous</h1>

        {/* Filter toggle */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <HelpTooltip content="Afficher les rendez-vous à venir" side="bottom">
            <span>{filterButton('upcoming', 'À venir')}</span>
          </HelpTooltip>
          <HelpTooltip content="Afficher les rendez-vous passés" side="bottom">
            <span>{filterButton('past', 'Passés')}</span>
          </HelpTooltip>
          <HelpTooltip content="Afficher tous les rendez-vous" side="bottom">
            <span>{filterButton('all', 'Tous')}</span>
          </HelpTooltip>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-2" />
          <p>Chargement des rendez-vous…</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-12 text-destructive">
          <p>Erreur lors du chargement des rendez-vous.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {sorted.length === 0 ? (
            <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
              {filter === 'upcoming' && 'Aucun rendez-vous à venir.'}
              {filter === 'past' && 'Aucun rendez-vous passé.'}
              {filter === 'all' && 'Aucun rendez-vous.'}
            </div>
          ) : (
            <div className="bg-card border rounded-lg divide-y">
              {sorted.map((apt) => (
                <div key={apt.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left: appointment info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/portail/billets/${apt.ticketId}`}
                      className="text-sm font-medium text-primary hover:underline truncate block"
                    >
                      {apt.ticket?.title ?? 'Sans titre'}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.ticket?.ticketNumber && (
                        <span className="mr-2 font-mono">{apt.ticket.ticketNumber}</span>
                      )}
                      {formatDateTime(apt.scheduledStart)} – {formatDateTime(apt.scheduledEnd)}
                    </p>
                    {apt.technician && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Technicien : {apt.technician.firstName} {apt.technician.lastName}
                      </p>
                    )}
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>
                    )}
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <HelpTooltip content="Statut actuel du rendez-vous" side="left">
                      <span><StatusBadge status={apt.status} type="appointment" /></span>
                    </HelpTooltip>

                    {isCancellable(apt.status) && (
                      <HelpTooltip content="Annuler ce rendez-vous — possible seulement avant le début" side="left">
                        <button
                          type="button"
                          onClick={() => cancelMutation.mutate(apt.id)}
                          disabled={cancelMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {cancelMutation.isPending ? 'Annulation…' : 'Annuler'}
                        </button>
                      </HelpTooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary count */}
          {sorted.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {sorted.length} rendez-vous{sorted.length > 1 ? '' : ''}
              {filter !== 'all' && ` (${filter === 'upcoming' ? 'à venir' : 'passés'})`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
