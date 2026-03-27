import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Appointment, type Ticket, type User } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from '../../lib/i18n/hook';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS } from '../../lib/constants';
import type { AppointmentStatus } from '../../types';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addWeeks,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  eachDayOfInterval,
  getHours,
  getMinutes,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  LayoutGrid,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'day';

const ALL_STATUSES: AppointmentStatus[] = [
  'DEMANDE',
  'PLANIFIE',
  'CONFIRME',
  'EN_COURS',
  'TERMINE',
  'ANNULE',
];

// ── Helpers ──────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function formatTime(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'HH:mm');
}

function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    DEMANDE: 'bg-amber-400',
    PLANIFIE: 'bg-blue-400',
    CONFIRME: 'bg-green-400',
    EN_COURS: 'bg-purple-500',
    TERMINE: 'bg-gray-400',
    ANNULE: 'bg-red-400',
  };
  return colors[status] || 'bg-gray-400';
}

function getStatusBlockColor(status: string): string {
  const c = APPOINTMENT_STATUS_COLORS[status];
  return c ? `${c.bg} ${c.text}` : 'bg-gray-100 text-gray-800';
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

function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Creation form data shape ─────────────────────────────────────────

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

// ── Hours for week/day timeline (8am–18pm) ───────────────────────────
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

// ═════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export default function AdminCalendar() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();

  // ── State ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AppointmentFormData>({ ...EMPTY_FORM });

  // ── Compute date range for API query ────────────────────────────
  const { dateFrom, dateTo } = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return {
          dateFrom: toDateString(gridStart),
          dateTo: toDateString(addDays(gridEnd, 1)),
        };
      }
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return {
          dateFrom: toDateString(weekStart),
          dateTo: toDateString(addDays(weekEnd, 1)),
        };
      }
      case 'day':
      default:
        return {
          dateFrom: toDateString(selectedDate),
          dateTo: toDateString(addDays(selectedDate, 1)),
        };
    }
  }, [viewMode, selectedDate]);

  // The date string for creation form queries (availability etc.)
  const formDateStr = toDateString(selectedDate);

  // ── Fetch appointments ──────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<Appointment[]>({
    queryKey: ['appointments', dateFrom, dateTo],
    queryFn: () =>
      api.appointments.list({
        from: `${dateFrom}T00:00:00Z`,
        to: `${dateTo}T00:00:00Z`,
        limit: 100,
      }),
  });
  const appointments: Appointment[] = data ?? [];

  // ── Form-specific queries (only when form is open) ──────────────
  const { data: tickets } = useQuery({
    queryKey: ['tickets', 'open-for-calendar'],
    queryFn: () => api.tickets.list({ limit: 100 }),
    enabled: showForm,
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.technicians.list(),
    enabled: showForm,
  });

  const { data: availabilitySlots, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', form.technicianId, formDateStr],
    queryFn: () => api.appointments.availability(formDateStr, form.technicianId),
    enabled: !!form.technicianId && showForm,
  });

  // ── Mutations ───────────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────

  function goToPrev() {
    setSelectedDate((prev) => {
      switch (viewMode) {
        case 'month': return addMonths(prev, -1);
        case 'week': return addWeeks(prev, -1);
        case 'day': return addDays(prev, -1);
      }
    });
  }

  function goToNext() {
    setSelectedDate((prev) => {
      switch (viewMode) {
        case 'month': return addMonths(prev, 1);
        case 'week': return addWeeks(prev, 1);
        case 'day': return addDays(prev, 1);
      }
    });
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function handleDatePick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value + 'T00:00:00'));
    }
  }

  function drillToDay(date: Date) {
    setSelectedDate(date);
    setViewMode('day');
  }

  function getAppointmentsForDay(day: Date): Appointment[] {
    return appointments.filter((apt) =>
      isSameDay(parseISO(apt.scheduledStart), day)
    );
  }

  function getNavLabel(): string {
    switch (viewMode) {
      case 'month':
        return format(selectedDate, 'LLLL yyyy', { locale: fr });
      case 'week': {
        const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(ws, 'd', { locale: fr })} – ${format(we, 'd LLLL yyyy', { locale: fr })}`;
      }
      case 'day':
        return format(selectedDate, 'EEEE d LLLL yyyy', { locale: fr });
    }
  }

  function getPrevTooltip(): string {
    switch (viewMode) {
      case 'month': return t('admin.calendar.prevMonth');
      case 'week': return t('admin.calendar.prevWeek');
      case 'day': return t('admin.calendar.prevDayTooltip');
    }
  }

  function getNextTooltip(): string {
    switch (viewMode) {
      case 'month': return t('admin.calendar.nextMonth');
      case 'week': return t('admin.calendar.nextWeek');
      case 'day': return t('admin.calendar.nextDayTooltip');
    }
  }

  // Form handlers
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

  // Filter open tickets for dropdown — NOTE: renamed (tk) to avoid shadowing t()
  const openTickets: Ticket[] = (tickets ?? []).filter(
    (tk) => !['FERMEE', 'ANNULEE', 'TERMINEE'].includes(tk.status)
  );

  // ── Render ──────────────────────────────────────────────────────
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

      {/* ── Toolbar: View switcher + Navigation ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode tabs */}
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          <button
            onClick={() => setViewMode('month')}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t('admin.calendar.viewMonth')}
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t('admin.calendar.viewWeek')}
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {t('admin.calendar.viewDay')}
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation */}
        <HelpTooltip content={getPrevTooltip()} side="bottom">
          <button
            onClick={goToPrev}
            className="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent"
            aria-label={getPrevTooltip()}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </HelpTooltip>

        <HelpTooltip content={t('admin.calendar.todayTooltip')} side="bottom">
          <button
            onClick={goToToday}
            className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {t('admin.calendar.today')}
          </button>
        </HelpTooltip>

        <HelpTooltip content={getNextTooltip()} side="bottom">
          <button
            onClick={goToNext}
            className="inline-flex items-center justify-center rounded-md border p-1.5 hover:bg-accent"
            aria-label={getNextTooltip()}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </HelpTooltip>

        <HelpTooltip content={t('admin.calendar.datePickTooltip')} side="bottom">
          <input
            type="date"
            value={toDateString(selectedDate)}
            onChange={handleDatePick}
            className="rounded-md border px-2 py-1.5 text-sm bg-background"
          />
        </HelpTooltip>

        {/* Current period label */}
        <span className="ml-2 text-sm font-medium capitalize">
          {getNavLabel()}
        </span>
      </div>

      {/* ── Creation Form ── */}
      {showForm && (
        <CreationForm
          form={form}
          onFormChange={handleFormChange}
          onSubmit={handleSubmitForm}
          onSlotClick={handleSlotClick}
          onClose={() => {
            setShowForm(false);
            setForm({ ...EMPTY_FORM });
          }}
          openTickets={openTickets}
          technicians={technicians ?? []}
          availabilitySlots={availabilitySlots}
          loadingAvailability={loadingAvailability}
          isPending={createMutation.isPending}
          t={t}
        />
      )}

      {/* ── Main calendar content ── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loadingEllipsis')}
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">
          {t('admin.calendar.loadError')}
        </div>
      ) : (
        <>
          {viewMode === 'month' && (
            <MonthView
              selectedDate={selectedDate}
              getAppointmentsForDay={getAppointmentsForDay}
              drillToDay={drillToDay}
              t={t}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              getAppointmentsForDay={getAppointmentsForDay}
              drillToDay={drillToDay}
              hours={HOURS}
              t={t}
            />
          )}
          {viewMode === 'day' && (
            <AdminDayView
              selectedDate={selectedDate}
              getAppointmentsForDay={getAppointmentsForDay}
              hours={HOURS}
              statusMutation={statusMutation}
              cancelMutation={cancelMutation}
              handleStatusChange={handleStatusChange}
              handleCancel={handleCancel}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── Creation Form (extracted for clarity) ─────────────────────────
// ═════════════════════════════════════════════════════════════════════

function CreationForm({
  form,
  onFormChange,
  onSubmit,
  onSlotClick,
  onClose,
  openTickets,
  technicians,
  availabilitySlots,
  loadingAvailability,
  isPending,
  t,
}: {
  form: AppointmentFormData;
  onFormChange: (field: keyof AppointmentFormData, value: string | number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSlotClick: (slot: { start: string; end: string; available: boolean }) => void;
  onClose: () => void;
  openTickets: Ticket[];
  technicians: User[];
  availabilitySlots: { start: string; end: string; available: boolean }[] | undefined;
  loadingAvailability: boolean;
  isPending: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">{t('admin.calendar.formTitle')}</h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {/* Ticket select */}
        <div className="space-y-1">
          <label htmlFor="apt-ticket" className="text-sm font-medium">
            {t('admin.calendar.ticketLabel')} <span className="text-destructive">{t('admin.calendar.ticketRequired')}</span>
          </label>
          <HelpTooltip content={t('admin.calendar.selectTicketTooltip')} side="bottom">
            <select
              id="apt-ticket"
              value={form.ticketId}
              onChange={(e) => onFormChange('ticketId', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">{t('admin.calendar.selectTicket')}</option>
              {openTickets.map((tk) => (
                <option key={tk.id} value={tk.id}>
                  {tk.ticketNumber} — {tk.title}
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
              onChange={(e) => onFormChange('technicianId', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('admin.calendar.techNone')}</option>
              {technicians.map((tech) => (
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
                  onClick={() => onSlotClick(slot)}
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
            onChange={(e) => onFormChange('scheduledStart', e.target.value)}
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
            onChange={(e) => onFormChange('scheduledEnd', e.target.value)}
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
              onFormChange('travelBuffer', parseInt(e.target.value, 10) || 0)
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
            onChange={(e) => onFormChange('notes', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            placeholder={t('admin.calendar.notesPlaceholder')}
          />
        </div>

        {/* Submit */}
        <div className="sm:col-span-2 flex gap-2">
          <HelpTooltip content={t('admin.calendar.submitTooltip')} side="top">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? t('admin.calendar.creating') : t('admin.calendar.createButton')}
            </button>
          </HelpTooltip>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── Month View ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

function MonthView({
  selectedDate,
  getAppointmentsForDay,
  drillToDay,
  t,
}: {
  selectedDate: Date;
  getAppointmentsForDay: (d: Date) => Appointment[];
  drillToDay: (d: Date) => void;
  t: (key: string) => string;
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dayHeaders = [
    t('admin.calendar.mon'),
    t('admin.calendar.tue'),
    t('admin.calendar.wed'),
    t('admin.calendar.thu'),
    t('admin.calendar.fri'),
    t('admin.calendar.sat'),
    t('admin.calendar.sun'),
  ];

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {dayHeaders.map((dh) => (
          <div
            key={dh}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            {dh}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppts = getAppointmentsForDay(day);
          const inMonth = isSameMonth(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => drillToDay(day)}
              className={`relative min-h-[80px] border-b border-r p-1.5 text-left transition-colors hover:bg-accent/50 ${
                !inMonth ? 'bg-muted/30 text-muted-foreground' : ''
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  today ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                {format(day, 'd')}
              </span>

              {dayAppts.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayAppts.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-1 truncate"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(
                          apt.status
                        )}`}
                      />
                      <span className="text-[10px] leading-tight truncate">
                        {formatTime(apt.scheduledStart)}
                        {apt.technician && (
                          <span className="ml-0.5 text-muted-foreground">
                            {apt.technician.firstName[0]}.{apt.technician.lastName[0]}.
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayAppts.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── Week View ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

function WeekView({
  selectedDate,
  getAppointmentsForDay,
  drillToDay,
  hours,
  t,
}: {
  selectedDate: Date;
  getAppointmentsForDay: (d: Date) => Appointment[];
  drillToDay: (d: Date) => void;
  hours: number[];
  t: (key: string) => string;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header row with day labels */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div className="border-r" />
        {weekDays.map((day) => {
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => drillToDay(day)}
              className={`px-1 py-2 text-center border-r hover:bg-accent/50 transition-colors ${
                today ? 'bg-primary/5' : ''
              }`}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  today ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                {format(day, 'd')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[60px]"
          >
            {/* Hour label */}
            <div className="border-r px-2 py-1 text-right text-xs text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* Day columns */}
            {weekDays.map((day) => {
              const dayAppts = getAppointmentsForDay(day);
              const hourAppts = dayAppts.filter((apt) => {
                const h = getHours(parseISO(apt.scheduledStart));
                return h === hour;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={`border-r px-0.5 py-0.5 ${
                    isToday(day) ? 'bg-primary/5' : ''
                  }`}
                >
                  {hourAppts.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => drillToDay(day)}
                      className={`block rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 hover:opacity-80 transition-opacity cursor-pointer ${getStatusBlockColor(
                        apt.status
                      )}`}
                      title={`${formatTime(apt.scheduledStart)}–${formatTime(
                        apt.scheduledEnd
                      )} ${apt.ticket?.title ?? ''} ${
                        apt.technician
                          ? `(${apt.technician.firstName} ${apt.technician.lastName})`
                          : ''
                      }`}
                    >
                      <span className="font-medium">
                        {formatTime(apt.scheduledStart)}
                      </span>{' '}
                      <span className="truncate">
                        {apt.ticket?.title ?? t('common.noTitle')}
                      </span>
                      {apt.technician && (
                        <span className="block text-[9px] opacity-70 truncate">
                          {apt.technician.firstName} {apt.technician.lastName[0]}.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── Admin Day View ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

function AdminDayView({
  selectedDate,
  getAppointmentsForDay,
  hours,
  statusMutation,
  cancelMutation,
  handleStatusChange,
  handleCancel,
  t,
}: {
  selectedDate: Date;
  getAppointmentsForDay: (d: Date) => Appointment[];
  hours: number[];
  statusMutation: { isPending: boolean };
  cancelMutation: { isPending: boolean };
  handleStatusChange: (id: string, status: string) => void;
  handleCancel: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const dayAppts = getAppointmentsForDay(selectedDate);

  const sorted = useMemo(
    () =>
      [...dayAppts].sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
      ),
    [dayAppts]
  );

  const appointmentsByHour = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    for (const apt of sorted) {
      const h = getHours(parseISO(apt.scheduledStart));
      if (!map[h]) map[h] = [];
      map[h].push(apt);
    }
    return map;
  }, [sorted]);

  const hasAppointments = sorted.length > 0;

  if (!hasAppointments) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        {t('appointment.noAppointmentsToday')}
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Summary bar */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <span className="text-sm text-muted-foreground">
          {sorted.length} {t('admin.calendar.appointmentsCount')}
        </span>
      </div>

      {/* Timeline */}
      <div className="divide-y">
        {hours.map((hour) => {
          const hourAppts = appointmentsByHour[hour] || [];
          const hasAppts = hourAppts.length > 0;

          return (
            <div
              key={hour}
              className={`flex min-h-[48px] ${hasAppts ? '' : 'opacity-40'}`}
            >
              {/* Hour label */}
              <div className="w-16 flex-shrink-0 border-r px-2 py-2 text-right text-xs text-muted-foreground">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Appointments in this hour */}
              <div className="flex-1 p-1 space-y-1">
                {hourAppts.map((apt) => (
                  <AdminAppointmentCard
                    key={apt.id}
                    apt={apt}
                    statusMutation={statusMutation}
                    cancelMutation={cancelMutation}
                    handleStatusChange={handleStatusChange}
                    handleCancel={handleCancel}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ── Admin Appointment Card (used in Day view) ─────────────────────
// ═════════════════════════════════════════════════════════════════════

function AdminAppointmentCard({
  apt,
  statusMutation,
  cancelMutation,
  handleStatusChange,
  handleCancel,
  t,
}: {
  apt: Appointment;
  statusMutation: { isPending: boolean };
  cancelMutation: { isPending: boolean };
  handleStatusChange: (id: string, status: string) => void;
  handleCancel: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const startH = getHours(parseISO(apt.scheduledStart));
  const startM = getMinutes(parseISO(apt.scheduledStart));
  const endH = getHours(parseISO(apt.scheduledEnd));
  const endM = getMinutes(parseISO(apt.scheduledEnd));
  const durationMin = (endH * 60 + endM) - (startH * 60 + startM);

  return (
    <div className={`rounded-md border px-3 py-2 ${getStatusBlockColor(apt.status)}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {apt.ticket?.title || t('common.noTitle')}
            {apt.ticket?.ticketNumber && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                #{apt.ticket.ticketNumber}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(apt.scheduledStart)} – {formatTime(apt.scheduledEnd)}
              <span className="text-muted-foreground">
                ({durationMin} min)
              </span>
            </span>
            {apt.travelBuffer > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('admin.calendar.travelDisplay', { minutes: apt.travelBuffer })}
              </span>
            )}
          </div>
          {apt.technician && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('appointment.technicianLabel', {
                name: `${apt.technician.firstName} ${apt.technician.lastName}`,
              })}
            </p>
          )}
          {apt.notes && (
            <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
              {apt.notes}
            </p>
          )}
        </div>

        {/* Status badge + actions */}
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
                disabled={statusMutation.isPending || cancelMutation.isPending}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                aria-label={t('admin.calendar.changeStatusLabel')}
              >
                <option value="">{t('admin.calendar.changeStatusOption')}</option>
                {ALL_STATUSES.filter((s) => s !== apt.status).map((s) => (
                  <option key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </HelpTooltip>
          )}

          {/* Cancel button */}
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
    </div>
  );
}
