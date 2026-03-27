import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Ticket, type User, type AppointmentProposal } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import MessageThread from '../../components/shared/MessageThread';
import AttachmentSection from '../../components/shared/AttachmentSection';
import HelpTooltip from '../../components/shared/HelpTooltip';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { useTranslation } from '../../lib/i18n/hook';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

// ─── Admin Status Transitions (mirrors backend ALLOWED_TRANSITIONS for ADMIN role) ───

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  NOUVELLE: ['EN_ATTENTE_APPROBATION', 'PLANIFIEE', 'EN_COURS', 'ANNULEE'],
  EN_ATTENTE_APPROBATION: ['APPROUVEE', 'EN_ATTENTE_REPONSE_CLIENT', 'ANNULEE'],
  EN_ATTENTE_REPONSE_CLIENT: ['EN_ATTENTE_APPROBATION', 'ANNULEE'],
  APPROUVEE: ['PLANIFIEE', 'ANNULEE'],
  PLANIFIEE: ['EN_COURS', 'ANNULEE'],
  EN_COURS: ['BLOCAGE', 'TERMINEE', 'ANNULEE'],
  BLOCAGE: ['EN_COURS', 'ANNULEE'],
  TERMINEE: ['FERMEE'],
  FERMEE: [],
  ANNULEE: [],
};

// Statuses where admin can send a quote
const QUOTABLE_STATUSES = ['NOUVELLE', 'APPROUVEE', 'EN_COURS'];

// Statuses where appointment scheduling is available
const SCHEDULABLE_STATUSES = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];

function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

// ─── Day Calendar Constants ───

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES; // 20 slots

/** Convert an ISO date string to a slot index (0-based from 08:00) */
function timeToSlotIndex(isoString: string): number {
  const d = new Date(isoString);
  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  const startMinutes = DAY_START_HOUR * 60;
  return Math.max(0, Math.floor((totalMinutes - startMinutes) / SLOT_MINUTES));
}

/** Build the time label for a slot index (e.g. "08:00", "08:30") */
function slotIndexToLabel(index: number): string {
  const totalMinutes = DAY_START_HOUR * 60 + index * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Appointment status → Tailwind color for the day calendar block */
function appointmentBlockColor(status: string): string {
  switch (status) {
    case 'PLANIFIE':
      return 'bg-blue-200 border-blue-400 text-blue-900';
    case 'CONFIRME':
      return 'bg-emerald-200 border-emerald-400 text-emerald-900';
    case 'EN_COURS':
      return 'bg-purple-200 border-purple-400 text-purple-900';
    case 'TERMINE':
      return 'bg-gray-200 border-gray-400 text-gray-700';
    case 'ANNULE':
      return 'bg-red-100 border-red-300 text-red-600 line-through';
    default:
      return 'bg-yellow-200 border-yellow-400 text-yellow-900';
  }
}

// ─── Inline Day Calendar Component ───

function InlineDayCalendar({
  date,
  technicianId,
}: {
  date: string;
  technicianId: string;
}) {
  const { t } = useTranslation();
  const { data: daySchedule, isLoading } = useQuery({
    queryKey: ['daySchedule', date, technicianId],
    queryFn: () => api.appointments.daySchedule(date, technicianId),
    enabled: !!date && !!technicianId,
  });

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        {t('admin.ticketDetail.dayScheduleLoading')}
      </p>
    );
  }

  const appts = (daySchedule as any[]) || [];

  // Build a map: slot index → appointment(s) that occupy it
  // Each appointment gets a startSlot and endSlot
  interface SlotOccupant {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    startSlot: number;
    endSlot: number;
    startLabel: string;
    endLabel: string;
  }

  const occupants: SlotOccupant[] = appts
    .filter((apt: any) => apt.status !== 'ANNULE')
    .map((apt: any) => {
      const startSlot = timeToSlotIndex(apt.scheduledStart);
      const endSlot = Math.min(
        timeToSlotIndex(apt.scheduledEnd),
        TOTAL_SLOTS
      );
      return {
        id: apt.id,
        ticketNumber: apt.ticket?.ticketNumber || '—',
        title: apt.ticket?.title || '',
        status: apt.status,
        startSlot,
        endSlot: Math.max(endSlot, startSlot + 1), // ensure at least 1 slot
        startLabel: formatSlotTime(apt.scheduledStart),
        endLabel: formatSlotTime(apt.scheduledEnd),
      };
    });

  // Build a set of occupied slot indices for highlighting
  const occupiedSlots = new Set<number>();
  for (const occ of occupants) {
    for (let i = occ.startSlot; i < occ.endSlot; i++) {
      occupiedSlots.add(i);
    }
  }

  // Render timeline rows
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const label = slotIndexToLabel(i);
    const isOccupied = occupiedSlots.has(i);

    // Check if any occupant starts at this slot
    const starting = occupants.filter((o) => o.startSlot === i);

    rows.push(
      <div key={i} className="flex items-stretch min-h-[28px]">
        {/* Time label */}
        <div className="w-12 flex-shrink-0 text-[10px] text-muted-foreground text-right pr-2 pt-0.5 select-none">
          {label}
        </div>
        {/* Slot bar */}
        <div
          className={`flex-1 border-t border-border relative ${
            isOccupied ? '' : 'bg-green-50/50'
          }`}
        >
          {starting.map((occ) => {
            const spanSlots = occ.endSlot - occ.startSlot;
            return (
              <div
                key={occ.id}
                className={`absolute left-0 right-0 z-10 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-tight overflow-hidden ${appointmentBlockColor(
                  occ.status
                )}`}
                style={{
                  top: 0,
                  height: `${spanSlots * 28}px`,
                }}
                title={`${occ.ticketNumber} — ${occ.title}`}
              >
                <span className="font-semibold">{occ.ticketNumber}</span>
                {' '}
                <span className="opacity-80 truncate">
                  {occ.title.length > 30 ? occ.title.slice(0, 30) + '…' : occ.title}
                </span>
                <br />
                <span className="opacity-70">
                  {occ.startLabel}–{occ.endLabel}
                </span>
                {' '}
                <span className="opacity-60">
                  [{t(`label.appointmentStatus.${occ.status}`) || occ.status}]
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {t('admin.ticketDetail.dayScheduleTitle', { date })}
        {appts.length === 0 && (
          <span className="ml-2 text-green-600">{t('admin.ticketDetail.dayFree')}</span>
        )}
      </p>
      <div className="border rounded-md bg-background overflow-hidden max-h-[400px] overflow-y-auto">
        {rows}
      </div>
      {appts.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {t('admin.ticketDetail.appointmentCount', { count: appts.filter((a: any) => a.status !== 'ANNULE').length })}
        </p>
      )}
    </div>
  );
}

// ─── Appointment Proposals Section Component ───

function ProposalsSection({
  ticketId,
  technicianId,
}: {
  ticketId: string;
  technicianId?: string | null;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  // ─── Local state for counter-propose and reject response ───
  const [counterProposeFor, setCounterProposeFor] = useState<string | null>(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterStart, setCounterStart] = useState('');
  const [counterEnd, setCounterEnd] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [counterErrors, setCounterErrors] = useState<Record<string, string>>({});
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');

  // ─── Query proposals for this ticket ───
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', ticketId],
    queryFn: () => api.appointments.proposals.list(ticketId),
    enabled: !!ticketId,
  });

  // ─── Mutations ───
  const acceptMutation = useMutation({
    mutationFn: ({ id, responseMessage }: { id: string; responseMessage?: string }) =>
      api.appointments.proposals.accept(id, responseMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast.success(t('admin.ticketDetail.acceptSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.acceptError'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, responseMessage }: { id: string; responseMessage?: string }) =>
      api.appointments.proposals.reject(id, responseMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', ticketId] });
      toast.success(t('admin.ticketDetail.rejectSuccess'));
      setRejectFor(null);
      setRejectMessage('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.rejectError'));
    },
  });

  const counterProposeMutation = useMutation({
    mutationFn: (data: {
      ticketId: string;
      proposedStart: string;
      proposedEnd: string;
      message?: string;
      parentId?: string;
    }) => api.appointments.proposals.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', ticketId] });
      toast.success(t('admin.ticketDetail.counterSuccess'));
      setCounterProposeFor(null);
      setCounterDate('');
      setCounterStart('');
      setCounterEnd('');
      setCounterMessage('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.counterError'));
    },
  });

  function handleCounterSubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!counterDate) errs.counterDate = t('validation.dateRequired');
    if (!counterStart) errs.counterStart = t('validation.required');
    if (!counterEnd) errs.counterEnd = t('validation.required');
    setCounterErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const proposedStart = `${counterDate}T${counterStart}:00`;
    const proposedEnd = `${counterDate}T${counterEnd}:00`;
    counterProposeMutation.mutate({
      ticketId,
      proposedStart,
      proposedEnd,
      message: counterMessage.trim() || undefined,
      parentId,
    });
  }

  function handleRejectSubmit(e: React.FormEvent, proposalId: string) {
    e.preventDefault();
    rejectMutation.mutate({
      id: proposalId,
      responseMessage: rejectMessage.trim() || undefined,
    });
  }

  const proposalList = (proposals as AppointmentProposal[]) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.ticketDetail.proposals')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.ticketDetail.proposals')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

      {proposalList.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('admin.ticketDetail.proposalsEmpty')}
        </p>
      ) : (
        <div className="space-y-3">
          {proposalList.map((proposal) => (
            <div
              key={proposal.id}
              className="border rounded-md p-3 space-y-2"
            >
              {/* Header: status badge + time + who proposed */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={proposal.status} type="proposal" />
                  <span className="text-sm font-medium">
                    {formatSlotTime(proposal.proposedStart)} – {formatSlotTime(proposal.proposedEnd)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(proposal.proposedStart).toLocaleDateString('fr-CA')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t('admin.ticketDetail.proposalBy', {
                    name: `${proposal.proposedBy.firstName} ${proposal.proposedBy.lastName}`,
                    role: proposal.proposedBy.role === 'CUSTOMER' ? t('admin.ticketDetail.proposalRoleCustomer') : proposal.proposedBy.role === 'ADMIN' ? t('admin.ticketDetail.proposalRoleAdmin') : t('admin.ticketDetail.proposalRoleTech'),
                  })}
                </span>
              </div>

              {/* Message from proposer */}
              {proposal.message && (
                <p className="text-xs text-muted-foreground italic">
                  &laquo; {proposal.message} &raquo;
                </p>
              )}

              {/* Response message (if already responded) */}
              {proposal.responseMessage && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.ticketDetail.proposalResponse')} &laquo; {proposal.responseMessage} &raquo;
                  {proposal.respondedBy && (
                    <span className="ml-1">
                      — {proposal.respondedBy.firstName} {proposal.respondedBy.lastName}
                    </span>
                  )}
                </p>
              )}

              {/* Parent reference (if this is a reply) */}
              {proposal.parent && (
                <p className="text-[10px] text-muted-foreground">
                  {t('admin.ticketDetail.proposalReplyTo')}{' '}
                  {new Date(proposal.parent.proposedStart).toLocaleDateString('fr-CA')}{' '}
                  {formatSlotTime(proposal.parent.proposedStart)}–{formatSlotTime(proposal.parent.proposedEnd)}
                </p>
              )}

              {/* Replies (child proposals) */}
              {proposal.replies && proposal.replies.length > 0 && (
                <div className="ml-4 border-l-2 border-muted pl-3 space-y-1">
                  {proposal.replies.map((reply) => (
                    <div key={reply.id} className="text-xs text-muted-foreground">
                      <StatusBadge status={reply.status} type="proposal" className="mr-1" />
                      {formatSlotTime(reply.proposedStart)}–{formatSlotTime(reply.proposedEnd)}
                      {t('admin.ticketDetail.appointmentLe')}
                      {new Date(reply.proposedStart).toLocaleDateString('fr-CA')}
                      {' — '}
                      {reply.proposedBy.firstName} {reply.proposedBy.lastName}
                      {reply.message && (
                        <span className="italic ml-1">&laquo; {reply.message} &raquo;</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions: only for pending proposals */}
              {proposal.status === 'PROPOSEE' && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {/* Accept button */}
                  <HelpTooltip content={t('admin.ticketDetail.acceptTooltip')} side="top">
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate({ id: proposal.id })}
                      disabled={acceptMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {acceptMutation.isPending ? t('admin.ticketDetail.accepting') : t('admin.ticketDetail.accept')}
                    </Button>
                  </HelpTooltip>

                  {/* Reject button / form toggle */}
                  {rejectFor === proposal.id ? (
                    <form
                      onSubmit={(e) => handleRejectSubmit(e, proposal.id)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Input
                        type="text"
                        value={rejectMessage}
                        onChange={(e) => setRejectMessage(e.target.value)}
                        placeholder={t('admin.ticketDetail.rejectReasonPlaceholder')}
                        className="flex-1 h-8 text-xs"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="destructive"
                        disabled={rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? '...' : t('admin.ticketDetail.rejectConfirm')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectFor(null);
                          setRejectMessage('');
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </form>
                  ) : (
                    <HelpTooltip content={t('admin.ticketDetail.rejectTooltip')} side="top">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectFor(proposal.id);
                          setCounterProposeFor(null);
                        }}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {t('admin.ticketDetail.reject')}
                      </Button>
                    </HelpTooltip>
                  )}

                  {/* Counter-propose button / form toggle */}
                  {counterProposeFor === proposal.id ? (
                    <form
                      onSubmit={(e) => handleCounterSubmit(e, proposal.id)}
                      className="w-full mt-2 border rounded-md p-3 bg-muted/30 space-y-2"
                    >
                      <p className="text-xs font-semibold">{t('admin.ticketDetail.counterProposeTitle')}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t('admin.ticketDetail.counterDate')}</Label>
                          <input
                            type="date"
                            value={counterDate}
                            onChange={(e) => { setCounterDate(e.target.value); setCounterErrors((prev) => { const { counterDate: _, ...rest } = prev; return rest; }); }}
                            min={new Date().toISOString().split('T')[0]}
                            className={`flex h-8 w-full rounded-md border ${counterErrors.counterDate ? 'border-destructive' : 'border-input'} bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                          />
                          {counterErrors.counterDate && <p className="text-xs text-destructive mt-0.5">{counterErrors.counterDate}</p>}
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t('admin.ticketDetail.counterStart')}</Label>
                          <Input
                            type="time"
                            value={counterStart}
                            onChange={(e) => { setCounterStart(e.target.value); setCounterErrors((prev) => { const { counterStart: _, ...rest } = prev; return rest; }); }}
                            className={`h-8 text-xs ${counterErrors.counterStart ? 'border-destructive' : ''}`}
                          />
                          {counterErrors.counterStart && <p className="text-xs text-destructive mt-0.5">{counterErrors.counterStart}</p>}
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{t('admin.ticketDetail.counterEnd')}</Label>
                          <Input
                            type="time"
                            value={counterEnd}
                            onChange={(e) => { setCounterEnd(e.target.value); setCounterErrors((prev) => { const { counterEnd: _, ...rest } = prev; return rest; }); }}
                            className={`h-8 text-xs ${counterErrors.counterEnd ? 'border-destructive' : ''}`}
                          />
                          {counterErrors.counterEnd && <p className="text-xs text-destructive mt-0.5">{counterErrors.counterEnd}</p>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">{t('admin.ticketDetail.counterMessage')}</Label>
                        <Input
                          type="text"
                          value={counterMessage}
                          onChange={(e) => setCounterMessage(e.target.value)}
                          placeholder={t('admin.ticketDetail.counterMessagePlaceholder')}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Show inline day calendar when a counter-propose date is selected */}
                      {counterDate && technicianId && (
                        <InlineDayCalendar date={counterDate} technicianId={technicianId} />
                      )}

                      <div className="flex gap-2">
                        <HelpTooltip content={t('admin.ticketDetail.counterSendTooltip')} side="top">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={counterProposeMutation.isPending}
                          >
                            {counterProposeMutation.isPending ? t('admin.ticketDetail.counterSending') : t('admin.ticketDetail.counterSendButton')}
                          </Button>
                        </HelpTooltip>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCounterProposeFor(null);
                            setCounterDate('');
                            setCounterStart('');
                            setCounterEnd('');
                            setCounterMessage('');
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <HelpTooltip content={t('admin.ticketDetail.counterProposeTooltip')} side="top">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCounterProposeFor(proposal.id);
                          setRejectFor(null);
                        }}
                        className="border-primary/50 text-primary"
                      >
                        {t('admin.ticketDetail.counterPropose')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // ─── Quote form state ───
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});

  // ─── Blocker form state ───
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');
  const [blockerErrors, setBlockerErrors] = useState<Record<string, string>>({});

  // ─── Appointment form state ───
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // ─── Queries ───

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.get(id!),
    enabled: !!id,
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: api.technicians.list,
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments', id],
    queryFn: () => api.appointments.list({ ticketId: id }),
    enabled: !!id,
  });

  const { data: availabilitySlots } = useQuery({
    queryKey: ['availability', selectedDate, (ticket as Ticket)?.technicianId],
    queryFn: () => api.appointments.availability(selectedDate, (ticket as Ticket)?.technicianId ?? undefined),
    enabled: !!selectedDate && !!(ticket as Ticket)?.technicianId,
  });

  // ─── Mutations ───

  const assignMutation = useMutation({
    mutationFn: (techId: string) => api.tickets.assign(id!, techId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.techAssigned'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.techAssignError'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => api.tickets.changeStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.statusUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.statusError'));
    },
  });

  const quoteMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; quoteDescription: string; quoteDuration: string }) =>
      api.tickets.sendQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.quoteSuccess'));
      setShowQuoteForm(false);
      setQuotedPrice('');
      setQuoteDescription('');
      setQuoteDuration('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.quoteError'));
    },
  });

  const addBlockerMutation = useMutation({
    mutationFn: (reason: string) => api.tickets.addBlocker(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.blockerAdded'));
      setShowBlockerForm(false);
      setBlockerReason('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.blockerAddError'));
    },
  });

  const removeBlockerMutation = useMutation({
    mutationFn: () => api.tickets.removeBlocker(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.blockerRemoved'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.blockerRemoveError'));
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: {
      ticketId: string;
      technicianId?: string;
      scheduledStart: string;
      scheduledEnd: string;
      notes?: string;
    }) => api.appointments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.apptCreated'));
      setShowAppointmentForm(false);
      setSelectedDate('');
      setSelectedSlot(null);
      setAppointmentNotes('');
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.apptCreateError'));
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => api.appointments.cancel(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('admin.ticketDetail.apptCancelled'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.apptCancelError'));
    },
  });

  const changeAppointmentStatusMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: string }) =>
      api.appointments.changeStatus(appointmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success(t('admin.ticketDetail.apptStatusUpdated'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('admin.ticketDetail.apptStatusError'));
    },
  });

  // ─── Handlers ───

  function handleStatusChange(newStatus: string) {
    if (newStatus) {
      statusMutation.mutate(newStatus);
    }
  }

  function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const price = parseFloat(quotedPrice);
    if (isNaN(price) || price <= 0) errs.quotedPrice = t('admin.ticketDetail.quotePriceError');
    if (!quoteDescription.trim()) errs.quoteDescription = t('admin.ticketDetail.quoteDescRequired');
    if (!quoteDuration.trim()) errs.quoteDuration = t('admin.ticketDetail.quoteDurationRequired');
    setQuoteErrors(errs);
    if (Object.keys(errs).length > 0) return;
    quoteMutation.mutate({
      quotedPrice: price,
      quoteDescription: quoteDescription.trim(),
      quoteDuration: quoteDuration.trim(),
    });
  }

  function handleAddBlocker(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!blockerReason.trim()) errs.blockerReason = t('admin.ticketDetail.blockerReasonRequired');
    setBlockerErrors(errs);
    if (Object.keys(errs).length > 0) return;
    addBlockerMutation.mutate(blockerReason.trim());
  }

  function handleAppointmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error(t('admin.ticketDetail.selectSlotRequired'));
      return;
    }
    createAppointmentMutation.mutate({
      ticketId: id!,
      technicianId: (ticket as Ticket)?.technicianId ?? undefined,
      scheduledStart: selectedSlot.start,
      scheduledEnd: selectedSlot.end,
      notes: appointmentNotes.trim() || undefined,
    });
  }

  // ─── Render ───

  if (isLoading) return <div className="text-center py-8">{t('admin.ticketDetail.loading')}</div>;
  if (!ticket) return <div className="text-center py-8">{t('admin.ticketDetail.notFound')}</div>;

  const tk: Ticket = ticket;
  const allowedNextStatuses = ADMIN_TRANSITIONS[tk.status] || [];
  const canSendQuote = QUOTABLE_STATUSES.includes(tk.status);
  const canSchedule = SCHEDULABLE_STATUSES.includes(tk.status);
  const hasBlocker = !!tk.blockerReason;
  const anyMutationPending =
    assignMutation.isPending ||
    statusMutation.isPending ||
    quoteMutation.isPending ||
    addBlockerMutation.isPending ||
    removeBlockerMutation.isPending ||
    createAppointmentMutation.isPending ||
    cancelAppointmentMutation.isPending ||
    changeAppointmentStatusMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4">
        <HelpTooltip content={t('admin.ticketDetail.backTooltip')} side="bottom">
          <Link
            to="/admin/billets"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('admin.ticketDetail.back')}
          </Link>
        </HelpTooltip>
        <h1 className="text-2xl font-bold">{tk.ticketNumber}</h1>
        <HelpTooltip content={t('admin.ticketDetail.statusTooltip')} side="bottom">
          <span><StatusBadge status={tk.status} /></span>
        </HelpTooltip>
        <HelpTooltip content={t('admin.ticketDetail.priorityTooltip')} side="bottom">
          <span><StatusBadge status={tk.priority} type="priority" /></span>
        </HelpTooltip>
      </div>

      {/* ─── 3-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket description */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-2">{tk.title}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {tk.description}
              </p>
            </CardContent>
          </Card>

          {/* Quote info (if exists) */}
          {tk.quotedPrice && (
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.ticketDetail.quoteTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('admin.ticketDetail.quotePrice')}</span>{' '}
                    {formatCurrency(tk.quotedPrice)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('admin.ticketDetail.quoteDuration')}</span>{' '}
                    {tk.quoteDuration}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('admin.ticketDetail.quoteDesc')}</span>{' '}
                    {tk.quoteDescription}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blocker banner */}
          {tk.blockerReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-1">{t('admin.ticketDetail.blockerTitle')}</h3>
              <p className="text-sm text-red-700">{tk.blockerReason}</p>
            </div>
          )}

          {/* ─── Appointment Proposals Section ─── */}
          <ProposalsSection ticketId={id!} technicianId={tk.technicianId} />

          {/* ─── Appointments Section ─── */}
          {canSchedule && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('admin.ticketDetail.appointments')}</CardTitle>
                  {!showAppointmentForm && (
                    <HelpTooltip content={t('admin.ticketDetail.scheduleTooltip')} side="left">
                      <Button
                        size="sm"
                        onClick={() => setShowAppointmentForm(true)}
                      >
                        {t('admin.ticketDetail.scheduleButton')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

              {/* Existing appointments list */}
              {(appointments as any[])?.length > 0 ? (
                <div className="space-y-3">
                  {(appointments as any[]).map((apt: any) => (
                    <div
                      key={apt.id}
                      className="border rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={apt.status} type="appointment" />
                          <span className="text-sm font-medium">
                            {formatSlotTime(apt.scheduledStart)} – {formatSlotTime(apt.scheduledEnd)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(apt.scheduledStart).toLocaleDateString('fr-CA')}
                        </span>
                      </div>

                      {apt.technician && (
                        <p className="text-xs text-muted-foreground">
                          {t('admin.ticketDetail.techLabel')} {apt.technician.firstName} {apt.technician.lastName}
                        </p>
                      )}

                      {apt.notes && (
                        <p className="text-xs text-muted-foreground italic">{apt.notes}</p>
                      )}

                      {/* Actions: status change + cancel */}
                      {apt.status !== 'ANNULE' && apt.status !== 'TERMINE' && (
                        <div className="flex items-center gap-2 pt-1">
                          <HelpTooltip content={t('admin.ticketDetail.changeApptStatus')} side="top">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  changeAppointmentStatusMutation.mutate({
                                    appointmentId: apt.id,
                                    status: e.target.value,
                                  });
                                }
                              }}
                              disabled={changeAppointmentStatusMutation.isPending}
                              className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                            >
                              <option value="">{t('admin.ticketDetail.changeApptStatusOption')}</option>
                              {apt.status === 'PLANIFIE' && (
                                <option value="CONFIRME">{t('admin.ticketDetail.confirm')}</option>
                              )}
                              {(apt.status === 'PLANIFIE' || apt.status === 'CONFIRME') && (
                                <option value="EN_COURS">{t('admin.ticketDetail.start')}</option>
                              )}
                              {apt.status === 'EN_COURS' && (
                                <option value="TERMINE">{t('admin.ticketDetail.complete')}</option>
                              )}
                            </select>
                          </HelpTooltip>
                          <HelpTooltip content={t('admin.ticketDetail.cancelApptTooltip')} side="top">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAppointmentToCancel(apt.id)}
                              disabled={cancelAppointmentMutation.isPending}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              {cancelAppointmentMutation.isPending ? t('admin.ticketDetail.cancelling') : t('admin.ticketDetail.cancelAppt')}
                            </Button>
                          </HelpTooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('admin.ticketDetail.noAppointments')}
                </p>
              )}

              {/* New appointment form */}
              {showAppointmentForm && (
                <form
                  onSubmit={handleAppointmentSubmit}
                  className="border rounded-md p-4 space-y-4 bg-muted/30"
                >
                  <h4 className="text-sm font-semibold">{t('admin.ticketDetail.newAppointment')}</h4>

                  {/* Date picker */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('admin.ticketDetail.dateLabel')}
                    </Label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlot(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>

                  {/* ─── Inline Day Calendar (shows technician's schedule for selected date) ─── */}
                  {selectedDate && tk.technicianId && (
                    <InlineDayCalendar date={selectedDate} technicianId={tk.technicianId} />
                  )}

                  {/* Availability slots grid */}
                  {selectedDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2">
                        {t('admin.ticketDetail.slotsLabel')}
                      </Label>
                      {!tk.technicianId ? (
                        <p className="text-xs text-amber-600">
                          {t('admin.ticketDetail.assignTechFirst')}
                        </p>
                      ) : !availabilitySlots ? (
                        <p className="text-xs text-muted-foreground">{t('admin.ticketDetail.slotsLoading')}</p>
                      ) : (availabilitySlots as any[]).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('admin.ticketDetail.slotsEmpty')}
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {(availabilitySlots as any[]).map((slot: any, idx: number) => {
                            const isSelected =
                              selectedSlot?.start === slot.start &&
                              selectedSlot?.end === slot.end;
                            return (
                              <Button
                                key={idx}
                                type="button"
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                disabled={!slot.available}
                                onClick={() =>
                                  setSelectedSlot({ start: slot.start, end: slot.end })
                                }
                                className={
                                  !slot.available
                                    ? 'border-muted bg-muted text-muted-foreground/50 cursor-not-allowed'
                                    : undefined
                                }
                              >
                                {formatSlotTime(slot.start)}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected slot display */}
                  {selectedSlot && (
                    <p className="text-xs text-muted-foreground">
                      {t('admin.ticketDetail.selectedSlot')}{' '}
                      <span className="font-medium text-foreground">
                        {formatSlotTime(selectedSlot.start)} – {formatSlotTime(selectedSlot.end)}
                      </span>
                    </p>
                  )}

                  {/* Notes textarea */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t('admin.ticketDetail.notesLabel')}
                    </Label>
                    <Textarea
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder={t('admin.ticketDetail.notesPlaceholder')}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Submit / Cancel buttons */}
                  <div className="flex gap-2">
                    <HelpTooltip content={t('admin.ticketDetail.confirmApptTooltip')} side="top">
                      <Button
                        type="submit"
                        disabled={createAppointmentMutation.isPending || !selectedSlot}
                        className="flex-1"
                      >
                        {createAppointmentMutation.isPending
                          ? t('admin.ticketDetail.scheduling')
                          : t('admin.ticketDetail.confirmAppt')}
                      </Button>
                    </HelpTooltip>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAppointmentForm(false);
                        setSelectedDate('');
                        setSelectedSlot(null);
                        setAppointmentNotes('');
                      }}
                      disabled={createAppointmentMutation.isPending}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
              )}
              </CardContent>
            </Card>
          )}

          {/* ─── Attachments Section ─── */}
          <AttachmentSection ticketId={id!} canUpload={true} isAdmin={true} />

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.ticketDetail.messages')}</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageThread ticketId={id!} />
            </CardContent>
          </Card>
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('admin.ticketDetail.details')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <HelpTooltip content={t('admin.ticketDetail.categoryTooltip')} side="left">
                <div>
                  <span className="text-muted-foreground">{t('admin.ticketDetail.categoryLabel')}</span>{' '}
                  {t(`label.serviceCategory.${tk.serviceCategory}`) || tk.serviceCategory}
                </div>
              </HelpTooltip>
              <HelpTooltip content={t('admin.ticketDetail.modeTooltip')} side="left">
                <div>
                  <span className="text-muted-foreground">{t('admin.ticketDetail.modeLabel')}</span>{' '}
                  {t(`label.serviceMode.${tk.serviceMode}`) || tk.serviceMode}
                </div>
              </HelpTooltip>
              <div>
                <span className="text-muted-foreground">{t('admin.ticketDetail.createdLabel')}</span>{' '}
                {formatDateTime(tk.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">{t('admin.ticketDetail.updatedLabel')}</span>{' '}
                {formatDateTime(tk.updatedAt)}
              </div>
            </CardContent>
          </Card>

          {/* Client card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('admin.ticketDetail.clientTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {tk.customer?.firstName} {tk.customer?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{tk.customer?.email}</p>
            </CardContent>
          </Card>

          {/* Technician card — always allow (re)assignment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('admin.ticketDetail.techTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tk.technician && (
                <p className="text-sm mb-1">
                  {tk.technician.firstName} {tk.technician.lastName}
                </p>
              )}
              <HelpTooltip content={t('admin.ticketDetail.assignTooltip')} side="left">
                <select
                  value=""
                  onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
                  disabled={assignMutation.isPending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">
                    {tk.technician ? t('admin.ticketDetail.reassign') : t('admin.ticketDetail.assign')}
                  </option>
                  {(technicians as User[] | undefined)?.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              </HelpTooltip>
            </CardContent>
          </Card>

          {/* ─── Status Change ─── */}
          {allowedNextStatuses.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('admin.ticketDetail.changeStatus')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <HelpTooltip content={t('admin.ticketDetail.changeStatusTooltip')} side="left">
                  <select
                    value=""
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusMutation.isPending}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">{t('admin.ticketDetail.selectStatus')}</option>
                    {allowedNextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {t(`label.status.${status}`) || status}
                      </option>
                    ))}
                  </select>
                </HelpTooltip>
                {statusMutation.isPending && (
                  <p className="text-xs text-muted-foreground">{t('admin.ticketDetail.updating')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── Send Quote ─── */}
          {canSendQuote && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('admin.ticketDetail.sendQuote')}</CardTitle>
                  {!showQuoteForm && (
                    <HelpTooltip content={t('admin.ticketDetail.quoteCreateTooltip')} side="left">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowQuoteForm(true)}
                        className="h-auto p-0 text-xs"
                      >
                        {tk.quotedPrice ? t('admin.ticketDetail.quoteModify') : t('admin.ticketDetail.quoteCreate')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              </CardHeader>
              {showQuoteForm && (
                <CardContent>
                  <form onSubmit={handleQuoteSubmit} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('admin.ticketDetail.quotePriceLabel')}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quotedPrice}
                        onChange={(e) => { setQuotedPrice(e.target.value); setQuoteErrors((prev) => { const { quotedPrice: _, ...rest } = prev; return rest; }); }}
                        placeholder="0.00"
                        className={quoteErrors.quotedPrice ? 'border-destructive' : ''}
                      />
                      {quoteErrors.quotedPrice && <p className="text-sm text-destructive mt-1">{quoteErrors.quotedPrice}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('admin.ticketDetail.quoteDescLabel')}
                      </Label>
                      <Textarea
                        value={quoteDescription}
                        onChange={(e) => { setQuoteDescription(e.target.value); setQuoteErrors((prev) => { const { quoteDescription: _, ...rest } = prev; return rest; }); }}
                        placeholder={t('admin.ticketDetail.quoteDescPlaceholder')}
                        rows={3}
                        className={`resize-none ${quoteErrors.quoteDescription ? 'border-destructive' : ''}`}
                      />
                      {quoteErrors.quoteDescription && <p className="text-sm text-destructive mt-1">{quoteErrors.quoteDescription}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('admin.ticketDetail.quoteDurationLabel')}
                      </Label>
                      <Input
                        type="text"
                        value={quoteDuration}
                        onChange={(e) => { setQuoteDuration(e.target.value); setQuoteErrors((prev) => { const { quoteDuration: _, ...rest } = prev; return rest; }); }}
                        placeholder={t('admin.ticketDetail.quoteDurationPlaceholder')}
                        className={quoteErrors.quoteDuration ? 'border-destructive' : ''}
                      />
                      {quoteErrors.quoteDuration && <p className="text-sm text-destructive mt-1">{quoteErrors.quoteDuration}</p>}
                    </div>
                    <div className="flex gap-2">
                      <HelpTooltip content={t('admin.ticketDetail.quoteSendTooltip')} side="top">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={quoteMutation.isPending}
                          className="flex-1"
                        >
                          {quoteMutation.isPending ? t('admin.ticketDetail.quoteSending') : t('admin.ticketDetail.quoteSendButton')}
                        </Button>
                      </HelpTooltip>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowQuoteForm(false);
                          setQuotedPrice('');
                          setQuoteDescription('');
                          setQuoteDuration('');
                        }}
                        disabled={quoteMutation.isPending}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>
          )}

          {/* ─── Blocker Management ─── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('admin.ticketDetail.blockerManagement')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasBlocker ? (
                <div className="space-y-2">
                  <div className="rounded-md bg-red-50 border border-red-200 p-2">
                    <p className="text-xs text-red-700">{tk.blockerReason}</p>
                  </div>
                  <HelpTooltip content={t('admin.ticketDetail.removeBlockerTooltip')} side="left">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeBlockerMutation.mutate()}
                      disabled={removeBlockerMutation.isPending || anyMutationPending}
                      className="w-full"
                    >
                      {removeBlockerMutation.isPending
                        ? t('admin.ticketDetail.removingBlocker')
                        : t('admin.ticketDetail.removeBlocker')}
                    </Button>
                  </HelpTooltip>
                </div>
              ) : (
                <div className="space-y-2">
                  {!showBlockerForm ? (
                    <HelpTooltip content={t('admin.ticketDetail.addBlockerTooltip')} side="left">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBlockerForm(true)}
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {t('admin.ticketDetail.addBlocker')}
                      </Button>
                    </HelpTooltip>
                  ) : (
                    <form onSubmit={handleAddBlocker} className="space-y-2">
                      <Textarea
                        value={blockerReason}
                        onChange={(e) => { setBlockerReason(e.target.value); setBlockerErrors((prev) => { const { blockerReason: _, ...rest } = prev; return rest; }); }}
                        placeholder={t('admin.ticketDetail.blockerPlaceholder')}
                        rows={3}
                        className={`resize-none ${blockerErrors.blockerReason ? 'border-destructive' : ''}`}
                      />
                      {blockerErrors.blockerReason && <p className="text-sm text-destructive mt-1">{blockerErrors.blockerReason}</p>}
                      <div className="flex gap-2">
                        <HelpTooltip content={t('admin.ticketDetail.confirmBlockerTooltip')} side="top">
                          <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={addBlockerMutation.isPending}
                            className="flex-1"
                          >
                            {addBlockerMutation.isPending
                              ? t('admin.ticketDetail.addingBlocker')
                              : t('admin.ticketDetail.confirmBlocker')}
                          </Button>
                        </HelpTooltip>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowBlockerForm(false);
                            setBlockerReason('');
                          }}
                          disabled={addBlockerMutation.isPending}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!appointmentToCancel}
        onOpenChange={(open) => {
          if (!open) setAppointmentToCancel(null);
        }}
        title={t('appointment.cancelConfirmTitle')}
        description={t('appointment.cancelConfirmDescription')}
        confirmLabel={t('admin.ticketDetail.cancelAppt')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (appointmentToCancel) {
            cancelAppointmentMutation.mutate(appointmentToCancel);
          }
        }}
      />
    </div>
  );
}
