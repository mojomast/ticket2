import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Appointment } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDateTime } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';

/** Format a Date to YYYY-MM-DD for API queries */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Shift a date by `days` and return a new Date */
function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Human-readable label for the selected date */
function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('fr-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function TechSchedule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  // ── Date filtering ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateFrom = toDateString(selectedDate);
  const dateTo = toDateString(addDays(selectedDate, 1)); // exclusive end-of-day

  // ── Fetch appointments for the selected date ────────────────────
  const { data, isLoading, isError } = useQuery<Appointment[]>({
    queryKey: ['appointments', dateFrom],
    queryFn: () =>
      api.appointments.list({ from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T00:00:00Z`, limit: 100 }),
  });
  const appointments: Appointment[] = data ?? [];

  // ── Status change mutation ──────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      cancelReason,
    }: {
      id: string;
      status: string;
      cancelReason?: string;
    }) => api.appointments.changeStatus(id, status, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Impossible de changer le statut');
    },
  });

  const canCancel = !!user?.permissions?.can_cancel_appointments;

  // ── Helpers to determine allowed transitions ────────────────────
  function canStart(status: string): boolean {
    return status === 'PLANIFIE' || status === 'CONFIRME';
  }

  function canComplete(status: string): boolean {
    return status === 'EN_COURS';
  }

  function canCancelAppointment(status: string): boolean {
    return canCancel && status !== 'TERMINE' && status !== 'ANNULE';
  }

  // ── Date navigation handlers ────────────────────────────────────
  function goToPreviousDay() {
    setSelectedDate((prev) => addDays(prev, -1));
  }

  function goToNextDay() {
    setSelectedDate((prev) => addDays(prev, 1));
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function handleDatePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value + 'T00:00:00'));
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mon horaire</h1>

      {/* Date navigation bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={goToPreviousDay}
          className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          aria-label="Jour précédent"
        >
          ← Préc.
        </button>

        <button
          onClick={goToToday}
          className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Aujourd&apos;hui
        </button>

        <button
          onClick={goToNextDay}
          className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          aria-label="Jour suivant"
        >
          Suiv. →
        </button>

        <input
          type="date"
          value={dateFrom}
          onChange={handleDatePick}
          className="rounded-md border px-2 py-1.5 text-sm bg-background"
        />

        <span className="ml-2 text-sm font-medium capitalize">
          {formatDateLabel(selectedDate)}
        </span>
      </div>

      {/* Appointment list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement…
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">
          Erreur lors du chargement des rendez-vous.
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
          Aucun rendez-vous pour cette journée
        </div>
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/technicien/billets/${apt.ticketId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {apt.ticket?.title ?? 'Sans titre'}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(apt.scheduledStart)} –{' '}
                  {formatDateTime(apt.scheduledEnd)}
                </p>
                {apt.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {apt.notes}
                  </p>
                )}
              </div>

              {/* Status badge */}
              <StatusBadge status={apt.status} type="appointment" />

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Start */}
                {canStart(apt.status) && (
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        id: apt.id,
                        status: 'EN_COURS',
                      })
                    }
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Démarrer
                  </button>
                )}

                {/* Complete */}
                {canComplete(apt.status) && (
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        id: apt.id,
                        status: 'TERMINE',
                      })
                    }
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Terminer
                  </button>
                )}

                {/* Cancel (permission-gated) */}
                {canCancelAppointment(apt.status) && (
                  <button
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({
                        id: apt.id,
                        status: 'ANNULE',
                      })
                    }
                    className="inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
