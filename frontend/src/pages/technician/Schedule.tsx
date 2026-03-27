import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Appointment, type ScheduleFollowUp } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import { APPOINTMENT_STATUS_COLORS } from '../../lib/constants';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
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
  Calendar,
  CalendarDays,
  Clock,
  LayoutGrid,
  ClipboardCheck,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'day';

// ── Helpers ──────────────────────────────────────────────────────────

/** Format a Date to YYYY-MM-DD for API queries */
function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Format time as HH:mm */
function formatTime(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'HH:mm');
}

/** Get status dot color for calendar cells */
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

/** Get a lighter bg color for appointment blocks */
function getStatusBlockColor(status: string): string {
  const c = APPOINTMENT_STATUS_COLORS[status];
  return c ? `${c.bg} ${c.text}` : 'bg-gray-100 text-gray-800';
}

/** Get a display label for a follow-up's reference (WO# or ticket#) */
function getFollowUpRef(fu: ScheduleFollowUp): string {
  if (fu.worksheet.workOrder) return fu.worksheet.workOrder.orderNumber;
  if (fu.worksheet.ticket) return fu.worksheet.ticket.ticketNumber;
  return fu.worksheet.id.slice(0, 8);
}

// ── Component ────────────────────────────────────────────────────────

export default function TechSchedule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  // ── State ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Compute date range for API query ────────────────────────────
  const { dateFrom, dateTo } = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        // Extend to full calendar grid (Mon–Sun rows)
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

  // ── Fetch follow-ups ────────────────────────────────────────────
  const { data: followUpData } = useQuery<ScheduleFollowUp[]>({
    queryKey: ['schedule-followups', dateFrom, dateTo],
    queryFn: () =>
      api.worksheets.followUps.schedule({
        from: `${dateFrom}T00:00:00Z`,
        to: `${dateTo}T00:00:00Z`,
      }),
  });
  const followUps: ScheduleFollowUp[] = followUpData ?? [];

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
      toast.success(t('tech.schedule.statusUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('tech.schedule.statusError'));
    },
  });

  const canCancel = !!user?.permissions?.can_cancel_appointments;

  // ── Status transition helpers ───────────────────────────────────
  function canStart(status: string): boolean {
    return status === 'PLANIFIE' || status === 'CONFIRME';
  }
  function canComplete(status: string): boolean {
    return status === 'EN_COURS';
  }
  function canCancelAppointment(status: string): boolean {
    return canCancel && status !== 'TERMINE' && status !== 'ANNULE';
  }

  // ── Navigation ──────────────────────────────────────────────────
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

  /** Click a day cell in month/week view → drill into day view */
  function drillToDay(date: Date) {
    setSelectedDate(date);
    setViewMode('day');
  }

  // ── Get appointments for a specific day ─────────────────────────
  function getAppointmentsForDay(day: Date): Appointment[] {
    return appointments.filter((apt) =>
      isSameDay(parseISO(apt.scheduledStart), day)
    );
  }

  // ── Get follow-ups for a specific day ───────────────────────────
  function getFollowUpsForDay(day: Date): ScheduleFollowUp[] {
    return followUps.filter((fu) =>
      isSameDay(parseISO(fu.scheduledDate), day)
    );
  }

  // ── Navigation label ────────────────────────────────────────────
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

  // ── Prev/Next label for tooltip ─────────────────────────────────
  function getPrevTooltip(): string {
    switch (viewMode) {
      case 'month': return t('tech.schedule.prevMonth');
      case 'week': return t('tech.schedule.prevWeek');
      case 'day': return t('tech.schedule.prevDayTooltip');
    }
  }
  function getNextTooltip(): string {
    switch (viewMode) {
      case 'month': return t('tech.schedule.nextMonth');
      case 'week': return t('tech.schedule.nextWeek');
      case 'day': return t('tech.schedule.nextDayTooltip');
    }
  }

  // Hours for week/day timeline (8am - 18pm)
  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('tech.schedule.title')}</h1>

      {/* ── Toolbar: View switcher + Navigation ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode tabs */}
        <div className="inline-flex rounded-md border bg-muted p-0.5">
          <Button
            variant={viewMode === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('month')}
            className="gap-1"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            {t('tech.schedule.viewMonth')}
          </Button>
          <Button
            variant={viewMode === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('week')}
            className="gap-1"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t('tech.schedule.viewWeek')}
          </Button>
          <Button
            variant={viewMode === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
            className="gap-1"
          >
            <Clock className="h-3.5 w-3.5" />
            {t('tech.schedule.viewDay')}
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation */}
        <HelpTooltip content={getPrevTooltip()} side="bottom">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrev}
            aria-label={getPrevTooltip()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </HelpTooltip>

        <HelpTooltip content={t('tech.schedule.todayTooltip')} side="bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            {t('tech.schedule.today')}
          </Button>
        </HelpTooltip>

        <HelpTooltip content={getNextTooltip()} side="bottom">
          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            aria-label={getNextTooltip()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </HelpTooltip>

        <HelpTooltip content={t('tech.schedule.datePickTooltip')} side="bottom">
          <input
            type="date"
            value={toDateString(selectedDate)}
            onChange={handleDatePick}
            className="flex h-9 rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </HelpTooltip>

        {/* Current period label */}
        <span className="ml-2 text-sm font-medium capitalize">
          {getNavLabel()}
        </span>
      </div>

      {/* ── Main content ── */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loadingEllipsis')}
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-destructive">
          {t('tech.schedule.loadError')}
        </div>
      ) : (
        <>
          {viewMode === 'month' && (
            <MonthView
              selectedDate={selectedDate}
              appointments={appointments}
              followUps={followUps}
              getAppointmentsForDay={getAppointmentsForDay}
              getFollowUpsForDay={getFollowUpsForDay}
              drillToDay={drillToDay}
              t={t}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              appointments={appointments}
              followUps={followUps}
              getAppointmentsForDay={getAppointmentsForDay}
              getFollowUpsForDay={getFollowUpsForDay}
              drillToDay={drillToDay}
              hours={HOURS}
              t={t}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              selectedDate={selectedDate}
              appointments={appointments}
              followUps={followUps}
              getAppointmentsForDay={getAppointmentsForDay}
              getFollowUpsForDay={getFollowUpsForDay}
              hours={HOURS}
              statusMutation={statusMutation}
              canStart={canStart}
              canComplete={canComplete}
              canCancelAppointment={canCancelAppointment}
              t={t}
            />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Month View ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function MonthView({
  selectedDate,
  appointments: _appointments,
  followUps: _followUps,
  getAppointmentsForDay,
  getFollowUpsForDay,
  drillToDay,
  t,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  followUps: ScheduleFollowUp[];
  getAppointmentsForDay: (d: Date) => Appointment[];
  getFollowUpsForDay: (d: Date) => ScheduleFollowUp[];
  drillToDay: (d: Date) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Day-of-week headers (Mon-Sun)
  const dayHeaders = [
    t('tech.schedule.mon'),
    t('tech.schedule.tue'),
    t('tech.schedule.wed'),
    t('tech.schedule.thu'),
    t('tech.schedule.fri'),
    t('tech.schedule.sat'),
    t('tech.schedule.sun'),
  ];

  return (
    <Card className="overflow-hidden">
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
          const dayFollowUps = getFollowUpsForDay(day);
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
              {/* Day number */}
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
              >
                {format(day, 'd')}
              </span>

              {/* Appointment dots / mini list */}
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

              {/* Follow-up dots (orange) */}
              {dayFollowUps.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayFollowUps.slice(0, 2).map((fu) => (
                    <div
                      key={fu.id}
                      className="flex items-center gap-1 truncate"
                    >
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-orange-400" />
                      <span className="text-[10px] leading-tight truncate text-orange-700">
                        {t(`label.followUpType.${fu.followUpType}`) ?? fu.followUpType}
                      </span>
                    </div>
                  ))}
                  {dayFollowUps.length > 2 && (
                    <span className="text-[10px] text-orange-500">
                      +{dayFollowUps.length - 2}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Week View ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function WeekView({
  selectedDate,
  appointments: _appointments,
  followUps: _followUps,
  getAppointmentsForDay,
  getFollowUpsForDay,
  drillToDay,
  hours,
  t,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  followUps: ScheduleFollowUp[];
  getAppointmentsForDay: (d: Date) => Appointment[];
  getFollowUpsForDay: (d: Date) => ScheduleFollowUp[];
  drillToDay: (d: Date) => void;
  hours: number[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  return (
    <Card className="overflow-hidden">
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
                  today
                    ? 'bg-primary text-primary-foreground'
                    : ''
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
              const dayFollowUps = getFollowUpsForDay(day);

              // Show appointments that start in this hour
              const hourAppts = dayAppts.filter((apt) => {
                const h = getHours(parseISO(apt.scheduledStart));
                return h === hour;
              });

              // Show follow-ups that are scheduled in this hour
              const hourFollowUps = dayFollowUps.filter((fu) => {
                const h = getHours(parseISO(fu.scheduledDate));
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
                    <Link
                      key={apt.id}
                      to={`/technicien/billets/${apt.ticketId}`}
                      className={`block rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 hover:opacity-80 transition-opacity ${getStatusBlockColor(
                        apt.status
                      )}`}
                      title={`${formatTime(apt.scheduledStart)}–${formatTime(
                        apt.scheduledEnd
                      )} ${apt.ticket?.title ?? ''}`}
                    >
                      <span className="font-medium">
                        {formatTime(apt.scheduledStart)}
                      </span>{' '}
                      <span className="truncate">
                        {apt.ticket?.title ?? t('common.noTitle')}
                      </span>
                    </Link>
                  ))}

                  {/* Follow-up blocks (orange style) */}
                  {hourFollowUps.map((fu) => (
                    <Link
                      key={fu.id}
                      to={`/technicien/feuilles-travail/${fu.worksheet.id}`}
                      className="block rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 hover:opacity-80 transition-opacity bg-orange-100 text-orange-800"
                      title={`${formatTime(fu.scheduledDate)} ${t('tech.schedule.followUp')} — ${getFollowUpRef(fu)}`}
                    >
                      <span className="font-medium">
                        {formatTime(fu.scheduledDate)}
                      </span>{' '}
                      <span className="truncate">
                        {t(`label.followUpType.${fu.followUpType}`) ?? fu.followUpType}
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Day View ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function DayView({
  selectedDate,
  appointments: _appointments,
  followUps: _followUps,
  getAppointmentsForDay,
  getFollowUpsForDay,
  hours,
  statusMutation,
  canStart,
  canComplete,
  canCancelAppointment,
  t,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  followUps: ScheduleFollowUp[];
  getAppointmentsForDay: (d: Date) => Appointment[];
  getFollowUpsForDay: (d: Date) => ScheduleFollowUp[];
  hours: number[];
  statusMutation: {
    mutate: (vars: { id: string; status: string; cancelReason?: string }) => void;
    isPending: boolean;
  };
  canStart: (s: string) => boolean;
  canComplete: (s: string) => boolean;
  canCancelAppointment: (s: string) => boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const dayAppts = getAppointmentsForDay(selectedDate);
  const dayFollowUps = getFollowUpsForDay(selectedDate);

  // Sort appointments by start time
  const sorted = useMemo(
    () =>
      [...dayAppts].sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime()
      ),
    [dayAppts]
  );

  // Group appointments by hour for the timeline
  const appointmentsByHour = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    for (const apt of sorted) {
      const h = getHours(parseISO(apt.scheduledStart));
      if (!map[h]) map[h] = [];
      map[h].push(apt);
    }
    return map;
  }, [sorted]);

  // Group follow-ups by hour for the timeline
  const followUpsByHour = useMemo(() => {
    const map: Record<number, ScheduleFollowUp[]> = {};
    for (const fu of dayFollowUps) {
      const h = getHours(parseISO(fu.scheduledDate));
      if (!map[h]) map[h] = [];
      map[h].push(fu);
    }
    return map;
  }, [dayFollowUps]);

  const hasItems = sorted.length > 0 || dayFollowUps.length > 0;

  if (!hasItems) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        {t('appointment.noAppointmentsToday')}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Summary bar */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {sorted.length} {t('tech.schedule.appointmentsCount')}
        </span>
        {dayFollowUps.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">,</span>
            <span className="text-sm text-orange-600 font-medium">
              {t('tech.schedule.followUpsCount', { count: dayFollowUps.length })}
            </span>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className="divide-y">
        {hours.map((hour) => {
          const hourAppts = appointmentsByHour[hour] || [];
          const hourFollowUps = followUpsByHour[hour] || [];
          const hasContent = hourAppts.length > 0 || hourFollowUps.length > 0;

          return (
            <div
              key={hour}
              className={`flex min-h-[48px] ${hasContent ? '' : 'opacity-40'}`}
            >
              {/* Hour label */}
              <div className="w-16 flex-shrink-0 border-r px-2 py-2 text-right text-xs text-muted-foreground">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Appointments + follow-ups in this hour */}
              <div className="flex-1 p-1 space-y-1">
                {hourAppts.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    apt={apt}
                    statusMutation={statusMutation}
                    canStart={canStart}
                    canComplete={canComplete}
                    canCancelAppointment={canCancelAppointment}
                    t={t}
                  />
                ))}

                {/* Follow-up cards (orange style) */}
                {hourFollowUps.map((fu) => (
                  <FollowUpCard key={fu.id} followUp={fu} t={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Appointment Card (used in Day view) ───────────────────────────
// ═══════════════════════════════════════════════════════════════════

function AppointmentCard({
  apt,
  statusMutation,
  canStart,
  canComplete,
  canCancelAppointment,
  t,
}: {
  apt: Appointment;
  statusMutation: {
    mutate: (vars: { id: string; status: string; cancelReason?: string }) => void;
    isPending: boolean;
  };
  canStart: (s: string) => boolean;
  canComplete: (s: string) => boolean;
  canCancelAppointment: (s: string) => boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const startH = getHours(parseISO(apt.scheduledStart));
  const startM = getMinutes(parseISO(apt.scheduledStart));
  const endH = getHours(parseISO(apt.scheduledEnd));
  const endM = getMinutes(parseISO(apt.scheduledEnd));
  const durationMin = (endH * 60 + endM) - (startH * 60 + startM);

  return (
    <div
      className={`rounded-md border px-3 py-2 ${getStatusBlockColor(apt.status)}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/technicien/billets/${apt.ticketId}`}
            className="text-sm font-medium hover:underline"
          >
            {apt.ticket?.title ?? t('common.noTitle')}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(apt.scheduledStart)} – {formatTime(apt.scheduledEnd)}
              <span className="text-muted-foreground">
                ({durationMin} min)
              </span>
            </span>
          </div>
          {apt.notes && (
            <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>
          )}
        </div>

        {/* Status badge */}
        <HelpTooltip content={t('tech.schedule.statusTooltip')} side="left">
          <span>
            <StatusBadge status={apt.status} type="appointment" />
          </span>
        </HelpTooltip>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canStart(apt.status) && (
            <HelpTooltip content={t('tech.schedule.startTooltip')} side="top">
              <Button
                size="sm"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ id: apt.id, status: 'EN_COURS' })
                }
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                {t('tech.schedule.start')}
              </Button>
            </HelpTooltip>
          )}

          {canComplete(apt.status) && (
            <HelpTooltip
              content={t('tech.schedule.completeTooltip')}
              side="top"
            >
              <Button
                size="sm"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ id: apt.id, status: 'TERMINE' })
                }
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                {t('tech.schedule.complete')}
              </Button>
            </HelpTooltip>
          )}

          {canCancelAppointment(apt.status) && (
            <HelpTooltip
              content={t('tech.schedule.cancelTooltip')}
              side="top"
            >
              <Button
                size="sm"
                variant="destructive"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({ id: apt.id, status: 'ANNULE' })
                }
                className="text-xs"
              >
                {t('common.cancel')}
              </Button>
            </HelpTooltip>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Follow-Up Card (used in Day view) ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function FollowUpCard({
  followUp,
  t,
}: {
  followUp: ScheduleFollowUp;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const typeLabel = t(`label.followUpType.${followUp.followUpType}`) ?? followUp.followUpType;
  const ref = getFollowUpRef(followUp);
  const customerName = followUp.worksheet.workOrder?.customerName
    ?? (followUp.worksheet.ticket?.title || null);

  return (
    <div className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
            <span className="text-sm font-medium text-orange-800">
              {t('tech.schedule.followUp')} — {typeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs flex items-center gap-1 text-orange-700">
              <Clock className="h-3 w-3" />
              {formatTime(followUp.scheduledDate)}
            </span>
            <span className="text-xs text-orange-600">
              {ref}
            </span>
            {customerName && (
              <span className="text-xs text-muted-foreground truncate">
                — {customerName}
              </span>
            )}
          </div>
          {followUp.notes && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {followUp.notes}
            </p>
          )}
        </div>

        {/* Link to worksheet */}
        <Link
          to={`/technicien/feuilles-travail/${followUp.worksheet.id}`}
          className="flex-shrink-0"
        >
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {t('tech.schedule.viewWorksheet')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
