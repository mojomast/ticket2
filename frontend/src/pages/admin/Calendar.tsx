import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Appointment, Ticket, User } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import type { AppointmentStatus } from '../../types';

// ─── French labels for appointment statuses ───

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  DEMANDE: 'Demande',
  PLANIFIE: 'Planifié',
  CONFIRME: 'Confirmé',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

const ALL_STATUSES: AppointmentStatus[] = [
  'DEMANDE',
  'PLANIFIE',
  'CONFIRME',
  'EN_COURS',
  'TERMINE',
  'ANNULE',
];

// ─── Helpers ───

/** Format an ISO datetime string to just HH:MM for day view display */
function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

/** Shift a YYYY-MM-DD date string by N days */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

/** Convert an ISO datetime string to the format expected by <input type="datetime-local"> */
function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Format an ISO datetime to just HH:MM for slot display */
function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Format YYYY-MM-DD to a human-readable French-Canadian date */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// ─── Creation form data shape ───

interface AppointmentFormData {
  ticketId: string;
  technicianId: string;
  scheduledStart: string;
  scheduledEnd: string;
  travelBuffer: number;
  notes: string;
}

const EMPTY_FORM: AppointmentFormData = {
  ticketId: '',
  technicianId: '',
  scheduledStart: '',
  scheduledEnd: '',
  travelBuffer: 30,
  notes: '',
};

// ─── Main Component ───

export default function AdminCalendar() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  // Date navigation state
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]!
  );

  // Creation form visibility & data
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>({ ...EMPTY_FORM });

  // ─── Queries ───

  const {
    data: appointments,
    isLoading: loadingAppointments,
    error: appointmentsError,
  } = useQuery({
    queryKey: ['appointments', { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` }],
    queryFn: () =>
      api.appointments.list({
        from: `${date}T00:00:00Z`,
        to: `${date}T23:59:59Z`,
        limit: 50,
      }),
  });

  const { data: tickets } = useQuery({
    queryKey: ['tickets', 'open-for-calendar'],
    queryFn: () => api.tickets.list({ limit: 200 }),
    enabled: showForm,
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.technicians.list(),
    enabled: showForm,
  });

  const { data: availabilitySlots, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', form.technicianId, date],
    queryFn: () => api.appointments.availability(date, form.technicianId),
    enabled: !!form.technicianId && showForm,
  });

  // ─── Mutations ───

  const createMutation = useMutation({
    mutationFn: (data: AppointmentFormData) =>
      api.appointments.create({
        ticketId: data.ticketId,
        technicianId: data.technicianId || undefined,
        scheduledStart: new Date(data.scheduledStart).toISOString(),
        scheduledEnd: new Date(data.scheduledEnd).toISOString(),
        travelBuffer: data.travelBuffer,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      toast.success(t('admin.calendar.createdSuccess'));
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (err: Error) => {
      toast.error(t('admin.calendar.createError', { message: err.message }));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.appointments.changeStatus(id, status),
    onSuccess: () => {
      toast.success(t('admin.calendar.statusUpdated'));
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: Error) => {
      toast.error(t('admin.calendar.statusError', { message: err.message }));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.appointments.cancel(id),
    onSuccess: () => {
      toast.success(t('admin.calendar.cancelled'));
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: Error) => {
      toast.error(t('admin.calendar.cancelError', { message: err.message }));
    },
  });

  // ─── Handlers ───

  function handlePrevDay() {
    setDate((prev) => shiftDate(prev, -1));
  }

  function handleNextDay() {
    setDate((prev) => shiftDate(prev, 1));
  }

  function handleToday() {
    setDate(new Date().toISOString().split('T')[0]!);
  }

  function handleDateInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setDate(e.target.value);
    }
  }

  function handleFormChange(
    field: keyof AppointmentFormData,
    value: string | number
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ticketId || !form.scheduledStart || !form.scheduledEnd) {
      toast.error(t('admin.calendar.requiredFields'));
      return;
    }
    createMutation.mutate(form);
  }

  function handleStatusChange(appointmentId: string, newStatus: string) {
    if (newStatus === 'ANNULE') {
      cancelMutation.mutate(appointmentId);
    } else {
      statusMutation.mutate({ id: appointmentId, status: newStatus });
    }
  }

  function handleCancel(appointmentId: string) {
    cancelMutation.mutate(appointmentId);
  }

  function handleSlotClick(slot: { start: string; end: string; available: boolean }) {
    if (!slot.available) return;
    setForm((prev) => ({
      ...prev,
      scheduledStart: toDatetimeLocal(slot.start),
      scheduledEnd: toDatetimeLocal(slot.end),
    }));
  }

  // Filter open tickets for the dropdown (exclude FERMEE, ANNULEE, TERMINEE)
  const openTickets: Ticket[] = (tickets ?? []).filter(
    (t) => !['FERMEE', 'ANNULEE', 'TERMINEE'].includes(t.status)
  );

  // ─── Render ───

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.calendar.title')}</h1>
        <HelpTooltip content={t('admin.calendar.newAppointmentTooltip')} side="left">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            {showForm ? t('admin.calendar.closeForm') : t('admin.calendar.newAppointment')}
          </button>
        </HelpTooltip>
      </div>

      {/* Date navigation bar */}
      <div className="flex flex-wrap items-center gap-2">
        <HelpTooltip content={t('admin.calendar.prevDayTooltip')} side="bottom">
          <button
            type="button"
            onClick={handlePrevDay}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={t('admin.calendar.prevDayAriaLabel')}
          >
            {t('admin.calendar.prevDay')}
          </button>
        </HelpTooltip>
        <HelpTooltip content={t('admin.calendar.todayTooltip')} side="bottom">
          <button
            type="button"
            onClick={handleToday}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t('admin.calendar.today')}
          </button>
        </HelpTooltip>
        <HelpTooltip content={t('admin.calendar.nextDayTooltip')} side="bottom">
          <button
            type="button"
            onClick={handleNextDay}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label={t('admin.calendar.nextDayAriaLabel')}
          >
            {t('admin.calendar.nextDay')}
          </button>
        </HelpTooltip>
        <HelpTooltip content={t('admin.calendar.datePickTooltip')} side="bottom">
          <input
            type="date"
            value={date}
            onChange={handleDateInput}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </HelpTooltip>
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {formatDateLabel(date)}
        </span>
      </div>

      {/* ─── Creation Form ─── */}
      {showForm && (
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">{t('admin.calendar.formTitle')}</h2>
          <form onSubmit={handleSubmitForm} className="grid gap-4 sm:grid-cols-2">
            {/* Ticket select */}
            <div className="space-y-1">
              <label htmlFor="apt-ticket" className="text-sm font-medium">
                {t('admin.calendar.ticketLabel')} <span className="text-destructive">{t('admin.calendar.ticketRequired')}</span>
              </label>
              <HelpTooltip content={t('admin.calendar.selectTicketTooltip')} side="bottom">
                <select
                  id="apt-ticket"
                  value={form.ticketId}
                  onChange={(e) => handleFormChange('ticketId', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">{t('admin.calendar.selectTicket')}</option>
                  {openTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketNumber} — {t.title}
                    </option>
                  ))}
                </select>
              </HelpTooltip>
            </div>

            {/* Technician select */}
            <div className="space-y-1">
              <label htmlFor="apt-tech" className="text-sm font-medium">
                {t('admin.calendar.technicianLabel')}
              </label>
              <HelpTooltip content={t('admin.calendar.techTooltip')} side="bottom">
                <select
                  id="apt-tech"
                  value={form.technicianId}
                  onChange={(e) => handleFormChange('technicianId', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('admin.calendar.techNone')}</option>
                  {(technicians ?? []).map((tech: User) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              </HelpTooltip>
            </div>

            {/* Availability slots */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">{t('admin.calendar.slotsLabel')}</label>
              {!form.technicianId ? (
                <p className="text-xs text-muted-foreground italic">
                  {t('admin.calendar.slotsSelectTech')}
                </p>
              ) : loadingAvailability ? (
                <p className="text-xs text-muted-foreground animate-pulse">
                  {t('admin.calendar.slotsLoading')}
                </p>
              ) : availabilitySlots && availabilitySlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availabilitySlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => handleSlotClick(slot)}
                      disabled={!slot.available}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        slot.available
                          ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer border border-green-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 border border-gray-200'
                      }`}
                      title={
                        slot.available
                          ? t('admin.calendar.slotAvailable')
                          : t('admin.calendar.slotUnavailable')
                      }
                    >
                      {formatSlotTime(slot.start)} – {formatSlotTime(slot.end)}
                    </button>
                  ))}
                </div>
              ) : availabilitySlots && availabilitySlots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {t('admin.calendar.slotsNone')}
                </p>
              ) : null}
            </div>

            {/* Scheduled start */}
            <div className="space-y-1">
              <label htmlFor="apt-start" className="text-sm font-medium">
                {t('admin.calendar.startLabel')} <span className="text-destructive">*</span>
              </label>
              <input
                id="apt-start"
                type="datetime-local"
                value={form.scheduledStart}
                onChange={(e) => handleFormChange('scheduledStart', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Scheduled end */}
            <div className="space-y-1">
              <label htmlFor="apt-end" className="text-sm font-medium">
                {t('admin.calendar.endLabel')} <span className="text-destructive">*</span>
              </label>
              <input
                id="apt-end"
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={(e) => handleFormChange('scheduledEnd', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            {/* Travel buffer */}
            <div className="space-y-1">
              <label htmlFor="apt-buffer" className="text-sm font-medium">
                {t('admin.calendar.travelBuffer')}
              </label>
              <input
                id="apt-buffer"
                type="number"
                min={0}
                value={form.travelBuffer}
                onChange={(e) =>
                  handleFormChange('travelBuffer', parseInt(e.target.value, 10) || 0)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="apt-notes" className="text-sm font-medium">
                {t('admin.calendar.notesLabel')}
              </label>
              <textarea
                id="apt-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                placeholder={t('admin.calendar.notesPlaceholder')}
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 flex gap-2">
              <HelpTooltip content={t('admin.calendar.submitTooltip')} side="top">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? t('admin.calendar.creating') : t('admin.calendar.createButton')}
                </button>
              </HelpTooltip>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm({ ...EMPTY_FORM });
                }}
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Appointments List ─── */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('admin.calendar.appointmentsFor', { date: formatDateLabel(date) })}
          </p>
          {loadingAppointments && (
            <span className="text-xs text-muted-foreground animate-pulse">
              {t('common.loadingEllipsis')}
            </span>
          )}
        </div>

        {appointmentsError && (
          <div className="p-4 text-sm text-destructive">
            {t('appointment.loadError')}{' '}
            {(appointmentsError as Error).message}
          </div>
        )}

        <div className="divide-y">
          {(appointments ?? []).map((apt: Appointment) => (
            <div
              key={apt.id}
              className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Left: appointment info */}
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {apt.ticket?.title || t('common.noTitle')}
                  {apt.ticket?.ticketNumber && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      #{apt.ticket.ticketNumber}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(apt.scheduledStart)} – {formatTime(apt.scheduledEnd)}
                  {apt.travelBuffer > 0 && (
                    <span className="ml-2">
                      {t('admin.calendar.travelDisplay', { minutes: apt.travelBuffer })}
                    </span>
                  )}
                </p>
                {apt.technician && (
                  <p className="text-xs text-muted-foreground">
                    {t('appointment.technicianLabel', { name: `${apt.technician.firstName} ${apt.technician.lastName}` })}
                  </p>
                )}
                {apt.notes && (
                  <p className="text-xs text-muted-foreground italic truncate">
                    {apt.notes}
                  </p>
                )}
              </div>

              {/* Right: status badge + actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusBadge status={apt.status} type="appointment" />

                {/* Status change dropdown */}
                {apt.status !== 'ANNULE' && apt.status !== 'TERMINE' && (
                  <HelpTooltip content={t('admin.calendar.changeStatusTooltip')} side="top">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusChange(apt.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      disabled={
                        statusMutation.isPending || cancelMutation.isPending
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      aria-label={t('admin.calendar.changeStatusLabel')}
                    >
                      <option value="">{t('admin.calendar.changeStatusOption')}</option>
                      {ALL_STATUSES.filter((s) => s !== apt.status).map((s) => (
                        <option key={s} value={s}>
                          {APPOINTMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </HelpTooltip>
                )}

                {/* Cancel button (distinct from dropdown for quick access) */}
                {apt.status !== 'ANNULE' && apt.status !== 'TERMINE' && (
                  <HelpTooltip content={t('admin.calendar.cancelTooltip')} side="top">
                    <button
                      type="button"
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancelMutation.isPending}
                      className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                      title={t('admin.calendar.cancelTitle')}
                    >
                      {t('common.cancel')}
                    </button>
                  </HelpTooltip>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loadingAppointments &&
            !appointmentsError &&
            (appointments ?? []).length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {t('appointment.noAppointmentsToday')}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
