import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Appointment } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { formatDateTime } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const PAGE_LIMIT = 20;

/** Appointment statuses that allow cancellation */
const CANCELLABLE_STATUSES = ['PLANIFIE', 'CONFIRME'];

type FilterMode = 'all' | 'upcoming' | 'past';

export default function PortalAppointments() {
  const [filter, setFilter] = useState<FilterMode>('upcoming');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  const appointmentQueryParams = useMemo(() => {
    const now = new Date().toISOString();

    return {
      page,
      limit: PAGE_LIMIT,
      sortOrder: filter === 'past' ? 'desc' : 'asc',
      ...(filter === 'upcoming' ? { from: now } : {}),
      ...(filter === 'past' ? { to: now } : {}),
    };
  }, [filter, page]);

  // ─── Data fetching ───
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['appointments', appointmentQueryParams],
    queryFn: () => api.appointments.listPaginated(appointmentQueryParams),
  });

  const appointments: Appointment[] = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalAppointments = data?.pagination?.total ?? 0;

  // ─── Cancel mutation ───
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.appointments.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(t('appointment.cancelSuccess'));
    },
    onError: () => {
      toast.error(t('appointment.cancelError'));
    },
  });

  const sorted = useMemo(() => [...appointments].sort((a, b) => {
    const dateA = new Date(a.scheduledStart).getTime();
    const dateB = new Date(b.scheduledStart).getTime();
    return filter === 'past' ? dateB - dateA : dateA - dateB;
  }), [appointments, filter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const handleFilterChange = (mode: FilterMode) => {
    setFilter(mode);
    setPage(1);
  };

  const isCancellable = (status: string) => CANCELLABLE_STATUSES.includes(status);

  // ─── Filter tab button helper ───
  const filterButton = (mode: FilterMode, label: string) => (
    <Button
      type="button"
      variant={filter === mode ? 'default' : 'ghost'}
      size="sm"
      onClick={() => handleFilterChange(mode)}
    >
      {label}
    </Button>
  );

  // ─── Render ───
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('appointment.myAppointments')}</h1>

        {/* Filter toggle */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <HelpTooltip content={t('portal.appointments.upcomingTooltip')} side="bottom">
            <span>{filterButton('upcoming', t('appointment.upcoming'))}</span>
          </HelpTooltip>
          <HelpTooltip content={t('portal.appointments.pastTooltip')} side="bottom">
            <span>{filterButton('past', t('appointment.past'))}</span>
          </HelpTooltip>
          <HelpTooltip content={t('portal.appointments.allTooltip')} side="bottom">
            <span>{filterButton('all', t('appointment.all'))}</span>
          </HelpTooltip>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-2" />
          <p>{t('appointment.loadingAppointments')}</p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="text-center py-12 text-destructive">
          <p>{t('appointment.loadError')}</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {sorted.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              {filter === 'upcoming' && t('appointment.noUpcoming')}
              {filter === 'past' && t('appointment.noPast')}
              {filter === 'all' && t('appointment.noAppointments')}
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {sorted.map((apt) => (
                <div key={apt.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Left: appointment info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/portail/billets/${apt.ticketId}`}
                      className="text-sm font-medium text-primary hover:underline truncate block"
                    >
                      {apt.ticket?.title ?? t('common.noTitle')}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.ticket?.ticketNumber && (
                        <span className="mr-2 font-mono">{apt.ticket.ticketNumber}</span>
                      )}
                      {formatDateTime(apt.scheduledStart)} – {formatDateTime(apt.scheduledEnd)}
                    </p>
                    {apt.technician && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('appointment.technicianLabel', { name: `${apt.technician.firstName} ${apt.technician.lastName}` })}
                      </p>
                    )}
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>
                    )}
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <HelpTooltip content={t('portal.appointments.statusTooltip')} side="left">
                      <span><StatusBadge status={apt.status} type="appointment" /></span>
                    </HelpTooltip>

                    {isCancellable(apt.status) && (
                      <HelpTooltip content={t('portal.appointments.cancelTooltip')} side="left">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(apt.id)}
                          disabled={cancelMutation.isPending}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          {cancelMutation.isPending ? t('appointment.cancelling') : t('common.cancel')}
                        </Button>
                      </HelpTooltip>
                    )}
                  </div>
                </div>
              ))}
              </CardContent>
            </Card>
          )}

          {/* Summary count */}
          {sorted.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:text-left">
                {filter !== 'all'
                  ? t('appointment.countFiltered', {
                      count: totalAppointments,
                      filter: filter === 'upcoming' ? t('appointment.upcoming').toLowerCase() : t('appointment.past').toLowerCase(),
                    })
                  : t('appointment.count', { count: totalAppointments })}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 sm:justify-end">
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
          )}
        </>
      )}
    </div>
  );
}
