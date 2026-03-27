import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Ticket, type AppointmentProposal } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import MessageThread from '../../components/shared/MessageThread';
import AttachmentSection from '../../components/shared/AttachmentSection';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';
import { formatDateTime, formatCurrency } from '../../lib/utils';
// COLOR maps still from constants; LABEL maps now use t()

import HelpTooltip from '../../components/shared/HelpTooltip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useTranslation } from '../../lib/i18n/hook';

// Technician-allowed status transitions (from → to[])
const TECH_STATUS_TRANSITIONS: Record<string, string[]> = {
  NOUVELLE: ['EN_COURS', 'EN_ATTENTE_APPROBATION'],
  APPROUVEE: ['EN_COURS'],
  PLANIFIEE: ['EN_COURS'],
  EN_COURS: ['BLOCAGE', 'TERMINEE'],
  BLOCAGE: ['EN_COURS'],
  EN_ATTENTE_REPONSE_CLIENT: ['EN_ATTENTE_APPROBATION'],
  TERMINEE: ['FERMEE'],
};

const SCHEDULABLE_STATUSES = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];

function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

// ─── Day Calendar Colors per appointment status ───
const DAY_CALENDAR_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PLANIFIE: { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
  CONFIRME: { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900' },
  EN_COURS: { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900' },
  TERMINE: { bg: 'bg-gray-200', border: 'border-gray-400', text: 'text-gray-700' },
  ANNULE: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  DEMANDE: { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' },
};

/** Build 30-minute time slots from 08:00 to 18:00 for the day calendar */
function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('18:00');
  return slots;
}

/** Convert an ISO datetime string to a decimal hour (e.g. 09:30 → 9.5) */
function isoToDecimalHour(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

const TIME_SLOTS = buildTimeSlots();

// ─────────────────────────────────────────────────────────
// InlineDayCalendar — shows all tech appointments for a day
// ─────────────────────────────────────────────────────────
function InlineDayCalendar({ appointments }: { appointments: any[] }) {
  const { t: tr } = useTranslation();
  const DAY_START = 8;
  const DAY_END = 18;
  const TOTAL_SLOTS = (DAY_END - DAY_START) * 2; // 20 half-hour slots
  const ROW_HEIGHT = 28; // px per 30-min slot

  // Filter out cancelled, map to positioned blocks
  const blocks = appointments
    .filter((a: any) => a.status !== 'ANNULE')
    .map((a: any) => {
      const startH = isoToDecimalHour(a.scheduledStart);
      const endH = isoToDecimalHour(a.scheduledEnd);
      const clampedStart = Math.max(startH, DAY_START);
      const clampedEnd = Math.min(endH, DAY_END);
      if (clampedEnd <= clampedStart) return null;

      const topSlot = (clampedStart - DAY_START) * 2;
      const spanSlots = (clampedEnd - clampedStart) * 2;
      const colors = DAY_CALENDAR_COLORS[a.status] || DAY_CALENDAR_COLORS.PLANIFIE;

      return {
        id: a.id,
        top: topSlot * ROW_HEIGHT,
        height: spanSlots * ROW_HEIGHT,
        label: `${a.ticket?.ticketNumber || 'RDV'} — ${a.ticket?.title || ''}`,
        time: `${formatSlotTime(a.scheduledStart)} – ${formatSlotTime(a.scheduledEnd)}`,
        statusLabel: tr(`label.appointmentStatus.${a.status}`) || a.status,
        ...colors,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      top: number;
      height: number;
      label: string;
      time: string;
      statusLabel: string;
      bg: string;
      border: string;
      text: string;
    }>;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {tr('tech.ticketDetail.dayCalendarTitle', { count: appointments.filter((a: any) => a.status !== 'ANNULE').length })}
      </p>
      <div
        className="relative border rounded-md bg-muted/30 overflow-hidden"
        style={{ height: TOTAL_SLOTS * ROW_HEIGHT + 1 }}
      >
        {/* Time labels + horizontal lines */}
        {TIME_SLOTS.map((label, idx) => (
          <div
            key={label}
            className="absolute left-0 right-0 flex items-start"
            style={{ top: idx * ROW_HEIGHT }}
          >
            <span className="text-[10px] text-muted-foreground w-12 shrink-0 pl-1 -mt-0.5 select-none">
              {label}
            </span>
            <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
          </div>
        ))}

        {/* Appointment blocks */}
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`absolute left-12 right-1 rounded-md border px-1.5 py-0.5 overflow-hidden ${block.bg} ${block.border} ${block.text}`}
            style={{ top: block.top + 1, height: block.height - 2 }}
            title={`${block.label}\n${block.time}\n${block.statusLabel}`}
          >
            <p className="text-[10px] font-semibold truncate leading-tight">{block.label}</p>
            {block.height > ROW_HEIGHT && (
              <p className="text-[10px] truncate leading-tight opacity-80">
                {block.time} · {block.statusLabel}
              </p>
            )}
          </div>
        ))}

        {/* Empty state */}
        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {tr('tech.ticketDetail.dayCalendarEmpty')}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function TechTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ─── Quote form state ───
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');

  // ─── Blocker form state ───
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');

  // ─── Appointment form state ───
  const [showApptForm, setShowApptForm] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptSelectedSlot, setApptSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [apptNotes, setApptNotes] = useState('');

  // ─── Proposal interaction state ───
  const [rejectingProposalId, setRejectingProposalId] = useState<string | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');
  const [counterProposingId, setCounterProposingId] = useState<string | null>(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterSlot, setCounterSlot] = useState<{ start: string; end: string } | null>(null);
  const [counterMessage, setCounterMessage] = useState('');

  // ─── Ticket query ───
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.get(id!),
    enabled: !!id,
  });

  const invalidateTicket = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', id] });
  };

  const invalidateProposals = () => {
    queryClient.invalidateQueries({ queryKey: ['proposals', id] });
  };

  // ─── Proposals query ───
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => api.appointments.proposals.list(id!),
    enabled: !!id,
  });

  // ─── Appointments query ───
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', id],
    queryFn: () => api.appointments.list({ ticketId: id }),
    enabled: !!id,
  });

  // ─── Availability slots query (for appointment form) ───
  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ['availability', apptDate, user?.id],
    queryFn: () => api.appointments.availability(apptDate, user?.id),
    enabled: !!apptDate && !!user?.id,
  });

  // ─── Day schedule query (for inline day calendar in appointment form) ───
  const { data: daySchedule = [] } = useQuery({
    queryKey: ['daySchedule', apptDate, user?.id],
    queryFn: () => api.appointments.daySchedule(apptDate, user?.id),
    enabled: !!apptDate && !!user?.id,
  });

  // ─── Counter-proposal availability & day schedule ───
  const { data: counterAvailabilitySlots = [] } = useQuery({
    queryKey: ['availability', counterDate, user?.id],
    queryFn: () => api.appointments.availability(counterDate, user?.id),
    enabled: !!counterDate && !!user?.id && !!counterProposingId,
  });

  const { data: counterDaySchedule = [] } = useQuery({
    queryKey: ['daySchedule', counterDate, user?.id],
    queryFn: () => api.appointments.daySchedule(counterDate, user?.id),
    enabled: !!counterDate && !!user?.id && !!counterProposingId,
  });

  // ─── Mutations ───
  const acceptMutation = useMutation({
    mutationFn: () => api.tickets.accept(id!),
    onSuccess: () => {
      invalidateTicket();
      toast.success(t('tech.ticketDetail.acceptSuccess'));
    },
    onError: () => toast.error(t('tech.ticketDetail.acceptError')),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.tickets.changeStatus(id!, status),
    onSuccess: () => {
      invalidateTicket();
      toast.success(t('tech.ticketDetail.statusUpdated'));
    },
    onError: () => toast.error(t('tech.ticketDetail.statusError')),
  });

  const quoteMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; quoteDescription: string; quoteDuration: string }) =>
      api.tickets.sendQuote(id!, data),
    onSuccess: () => {
      invalidateTicket();
      setShowQuoteForm(false);
      setQuotedPrice('');
      setQuoteDescription('');
      setQuoteDuration('');
      toast.success(t('tech.ticketDetail.quoteSuccess'));
    },
    onError: () => toast.error(t('tech.ticketDetail.quoteError')),
  });

  const addBlockerMutation = useMutation({
    mutationFn: (reason: string) => api.tickets.addBlocker(id!, reason),
    onSuccess: () => {
      invalidateTicket();
      setShowBlockerForm(false);
      setBlockerReason('');
      toast.success(t('tech.ticketDetail.blockerAdded'));
    },
    onError: () => toast.error(t('tech.ticketDetail.blockerAddError')),
  });

  const removeBlockerMutation = useMutation({
    mutationFn: () => api.tickets.removeBlocker(id!),
    onSuccess: () => {
      invalidateTicket();
      toast.success(t('tech.ticketDetail.blockerRemoved'));
    },
    onError: () => toast.error(t('tech.ticketDetail.blockerRemoveError')),
  });

  // ─── Appointment mutations ───
  const createApptMutation = useMutation({
    mutationFn: (data: { ticketId: string; technicianId: string; scheduledStart: string; scheduledEnd: string; notes?: string }) =>
      api.appointments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      invalidateTicket();
      setShowApptForm(false);
      setApptDate('');
      setApptSelectedSlot(null);
      setApptNotes('');
      toast.success(t('tech.ticketDetail.apptCreated'));
    },
    onError: () => toast.error(t('tech.ticketDetail.apptCreateError')),
  });

  const cancelApptMutation = useMutation({
    mutationFn: (apptId: string) => api.appointments.cancel(apptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success(t('tech.ticketDetail.apptCancelled'));
    },
    onError: () => toast.error(t('tech.ticketDetail.apptCancelError')),
  });

  const apptStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: string; status: string }) =>
      api.appointments.changeStatus(apptId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success(t('tech.ticketDetail.apptStatusUpdated'));
    },
    onError: () => toast.error(t('tech.ticketDetail.apptStatusError')),
  });

  // ─── Proposal mutations ───
  const acceptProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMessage }: { proposalId: string; responseMessage?: string }) =>
      api.appointments.proposals.accept(proposalId, responseMessage),
    onSuccess: () => {
      invalidateProposals();
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      invalidateTicket();
      toast.success(t('tech.ticketDetail.acceptProposalSuccess'));
    },
    onError: () => toast.error(t('tech.ticketDetail.acceptProposalError')),
  });

  const rejectProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMessage }: { proposalId: string; responseMessage?: string }) =>
      api.appointments.proposals.reject(proposalId, responseMessage),
    onSuccess: () => {
      invalidateProposals();
      setRejectingProposalId(null);
      setRejectMessage('');
      toast.success(t('tech.ticketDetail.rejectSuccess'));
    },
    onError: () => toast.error(t('tech.ticketDetail.rejectError')),
  });

  const counterProposeMutation = useMutation({
    mutationFn: (data: { ticketId: string; proposedStart: string; proposedEnd: string; message?: string; parentId?: string }) =>
      api.appointments.proposals.create(data),
    onSuccess: () => {
      invalidateProposals();
      setCounterProposingId(null);
      setCounterDate('');
      setCounterSlot(null);
      setCounterMessage('');
      toast.success(t('tech.ticketDetail.counterSuccess'));
    },
    onError: () => toast.error(t('tech.ticketDetail.counterError')),
  });

  // ─── Worksheet mutation ───
  const createWorksheetMutation = useMutation({
    mutationFn: () => api.worksheets.create({ ticketId: id }),
    onSuccess: (ws) => {
      toast.success(t('worksheet.created'));
      navigate(`/technicien/feuilles-travail/${ws.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ─── Loading / Not found ───
  if (isLoading) return <div className="text-center py-8">{t('tech.ticketDetail.loading')}</div>;
  if (!ticket) return <div className="text-center py-8">{t('tech.ticketDetail.notFound')}</div>;

  const tk: Ticket = ticket;

  // Determine available status transitions for the current status
  // Filter TERMINEE → FERMEE: only if tech has can_close_tickets permission
  const rawAllowed = TECH_STATUS_TRANSITIONS[tk.status] ?? [];
  const canCloseTickets = !!user?.permissions?.can_close_tickets;
  const canAcceptTickets = !!user?.permissions?.can_accept_tickets;
  const allowedStatuses = rawAllowed.filter((s) => {
    if (s === 'FERMEE' && !canCloseTickets) return false;
    return true;
  });
  const canSendQuotes = !!user?.permissions?.can_send_quotes;
  const isAssignedToMe = !!tk.technicianId && tk.technicianId === user?.id;
  const isMutating =
    acceptMutation.isPending ||
    statusMutation.isPending ||
    quoteMutation.isPending ||
    addBlockerMutation.isPending ||
    removeBlockerMutation.isPending ||
    createApptMutation.isPending ||
    cancelApptMutation.isPending ||
    apptStatusMutation.isPending ||
    acceptProposalMutation.isPending ||
    rejectProposalMutation.isPending ||
    counterProposeMutation.isPending ||
    createWorksheetMutation.isPending;

  const canScheduleAppointment =
    isAssignedToMe && SCHEDULABLE_STATUSES.includes(tk.status);

  // ─── Handlers ───
  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(quotedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error(t('tech.ticketDetail.quotePriceError'));
      return;
    }
    if (!quoteDescription.trim()) {
      toast.error(t('tech.ticketDetail.quoteDescRequired'));
      return;
    }
    if (!quoteDuration.trim()) {
      toast.error(t('tech.ticketDetail.quoteDurationRequired'));
      return;
    }
    quoteMutation.mutate({
      quotedPrice: price,
      quoteDescription: quoteDescription.trim(),
      quoteDuration: quoteDuration.trim(),
    });
  };

  const handleAddBlocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerReason.trim()) {
      toast.error(t('tech.ticketDetail.blockerReasonRequired'));
      return;
    }
    addBlockerMutation.mutate(blockerReason.trim());
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptSelectedSlot) {
      toast.error(t('tech.ticketDetail.selectSlotRequired'));
      return;
    }
    createApptMutation.mutate({
      ticketId: id!,
      technicianId: user?.id ?? '',
      scheduledStart: apptSelectedSlot.start,
      scheduledEnd: apptSelectedSlot.end,
      ...(apptNotes.trim() ? { notes: apptNotes.trim() } : {}),
    });
  };

  const handleCounterPropose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterSlot) {
      toast.error(t('tech.ticketDetail.selectSlotRequired'));
      return;
    }
    counterProposeMutation.mutate({
      ticketId: id!,
      proposedStart: counterSlot.start,
      proposedEnd: counterSlot.end,
      ...(counterMessage.trim() ? { message: counterMessage.trim() } : {}),
      ...(counterProposingId ? { parentId: counterProposingId } : {}),
    });
  };

  // Separate pending proposals from others for display priority
  const pendingProposals = proposals.filter((p: AppointmentProposal) => p.status === 'PROPOSEE');
  const otherProposals = proposals.filter((p: AppointmentProposal) => p.status !== 'PROPOSEE');

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/technicien/billets" className="text-sm text-muted-foreground hover:text-foreground">
          {t('tech.ticketDetail.back')}
        </Link>
        <h1 className="text-2xl font-bold">{tk.ticketNumber}</h1>
        <StatusBadge status={tk.status} />
        <StatusBadge status={tk.priority} type="priority" />

        {/* Accept button — only when no technician assigned and tech has can_accept_tickets permission */}
        {!tk.technicianId && canAcceptTickets && (
          <HelpTooltip content={t('tech.ticketDetail.acceptTooltip')} side="bottom">
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={isMutating}
              className="ml-auto"
            >
              {acceptMutation.isPending ? t('tech.ticketDetail.accepting') : t('tech.ticketDetail.accept')}
            </Button>
          </HelpTooltip>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left column (2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-2">{tk.title}</h2>
              <p className="text-sm whitespace-pre-wrap">{tk.description}</p>
            </CardContent>
          </Card>

          {/* Existing quote display */}
          {tk.quotedPrice != null && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">{t('tech.ticketDetail.quoteTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('tech.ticketDetail.quotePrice')}</span>{' '}
                  <span className="font-medium">{formatCurrency(tk.quotedPrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('tech.ticketDetail.quoteDuration')}</span>{' '}
                  <span className="font-medium">{tk.quoteDuration ?? '—'}</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-muted-foreground">{t('tech.ticketDetail.quoteDesc')}</span>{' '}
                  <span>{tk.quoteDescription ?? '—'}</span>
                </div>
              </div>
              </CardContent>
            </Card>
          )}
          {/* Blocker display */}
                {tk.blockerReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-red-800">{t('tech.ticketDetail.blockerTitle')}</h3>
                {isAssignedToMe && (
                  <HelpTooltip content={t('tech.ticketDetail.removeBlockerTooltip')} side="left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBlockerMutation.mutate()}
                      disabled={isMutating}
                      className="text-xs text-red-700 hover:bg-red-200"
                    >
                      {removeBlockerMutation.isPending ? t('tech.ticketDetail.removingBlocker') : t('tech.ticketDetail.removeBlocker')}
                    </Button>
                  </HelpTooltip>
                )}
              </div>
              <p className="text-sm text-red-700">{tk.blockerReason}</p>
            </div>
          )}

          {/* ─── Appointment Proposals Section ─── */}
          {proposals.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">{t('tech.ticketDetail.proposals')}</h3>

              {/* Pending proposals first — these require action */}
              {pendingProposals.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    {t('tech.ticketDetail.pendingCount', { count: pendingProposals.length })}
                  </p>
                  {pendingProposals.map((proposal: AppointmentProposal) => (
                    <div key={proposal.id} className="border border-amber-200 bg-amber-50/50 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={proposal.status} type="proposal" />
                          <span className="text-sm font-medium">
                            {new Date(proposal.proposedStart).toLocaleDateString('fr-CA')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatSlotTime(proposal.proposedStart)} – {formatSlotTime(proposal.proposedEnd)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t('tech.ticketDetail.proposedBy', { name: `${proposal.proposedBy?.firstName} ${proposal.proposedBy?.lastName}` })}
                          {proposal.proposedBy?.role === 'CUSTOMER' && t('tech.ticketDetail.proposedByClient')}
                        </span>
                      </div>

                      {proposal.message && (
                        <p className="text-sm text-muted-foreground italic">« {proposal.message} »</p>
                      )}

                      {proposal.parent && (
                        <p className="text-xs text-muted-foreground">
                          {t('tech.ticketDetail.proposalReplyTo', { date: new Date(proposal.parent.proposedStart).toLocaleDateString('fr-CA') })}{' '}
                          {formatSlotTime(proposal.parent.proposedStart)} – {formatSlotTime(proposal.parent.proposedEnd)}
                        </p>
                      )}

                      {/* Replies / conversation thread */}
                      {proposal.replies && proposal.replies.length > 0 && (
                        <div className="border-l-2 border-muted pl-3 space-y-1">
                          {proposal.replies.map((reply: any) => (
                            <div key={reply.id} className="text-xs">
                              <span className="font-medium">
                                {reply.proposedBy?.firstName} {reply.proposedBy?.lastName}
                              </span>
                              {' — '}
                              <span>
                                {new Date(reply.proposedStart).toLocaleDateString('fr-CA')}{' '}
                                {formatSlotTime(reply.proposedStart)} – {formatSlotTime(reply.proposedEnd)}
                              </span>
                              <StatusBadge status={reply.status} type="proposal" className="ml-1" />
                              {reply.message && (
                                <p className="text-muted-foreground italic ml-2">« {reply.message} »</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      {rejectingProposalId !== proposal.id && counterProposingId !== proposal.id && (
                        <div className="flex gap-2 pt-1">
                          <HelpTooltip content={t('tech.ticketDetail.acceptProposalTooltip')} side="bottom">
                            <Button
                              size="sm"
                              onClick={() => acceptProposalMutation.mutate({ proposalId: proposal.id })}
                              disabled={isMutating}
                              className="text-xs bg-green-600 hover:bg-green-700"
                            >
                              {acceptProposalMutation.isPending ? t('tech.ticketDetail.accepting') : t('tech.ticketDetail.accept')}
                            </Button>
                          </HelpTooltip>
                          <HelpTooltip content={t('tech.ticketDetail.rejectTooltip')} side="bottom">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectingProposalId(proposal.id)}
                              disabled={isMutating}
                              className="text-xs"
                            >
                              {t('tech.ticketDetail.reject')}
                            </Button>
                          </HelpTooltip>
                          <HelpTooltip content={t('tech.ticketDetail.counterProposeTooltip')} side="bottom">
                            <Button
                              size="sm"
                              onClick={() => {
                                setCounterProposingId(proposal.id);
                                setCounterDate('');
                                setCounterSlot(null);
                                setCounterMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700"
                            >
                              {t('tech.ticketDetail.counterPropose')}
                            </Button>
                          </HelpTooltip>
                        </div>
                      )}

                      {/* Reject form inline */}
                      {rejectingProposalId === proposal.id && (
                        <div className="border-t pt-3 space-y-2">
                          <Label className="text-xs text-muted-foreground">{t('tech.ticketDetail.rejectLabel')}</Label>
                          <Textarea
                            value={rejectMessage}
                            onChange={(e) => setRejectMessage(e.target.value)}
                            placeholder={t('tech.ticketDetail.rejectPlaceholder')}
                            rows={2}
                            className="resize-none"
                          />
                          <div className="flex gap-2">
                            <HelpTooltip content={t('tech.ticketDetail.rejectConfirmTooltip')} side="bottom">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  rejectProposalMutation.mutate({
                                    proposalId: proposal.id,
                                    ...(rejectMessage.trim() ? { responseMessage: rejectMessage.trim() } : {}),
                                  })
                                }
                                disabled={isMutating}
                                className="text-xs"
                              >
                                {rejectProposalMutation.isPending ? t('tech.ticketDetail.rejecting') : t('tech.ticketDetail.rejectConfirm')}
                              </Button>
                            </HelpTooltip>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingProposalId(null);
                                setRejectMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs"
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Counter-propose form inline */}
                      {counterProposingId === proposal.id && (
                        <form onSubmit={handleCounterPropose} className="border-t pt-3 space-y-3">
                          <p className="text-xs font-medium">{t('tech.ticketDetail.counterProposeTitle')}</p>

                          {/* Date picker */}
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.counterDate')}</Label>
                            <input
                              type="date"
                              value={counterDate}
                              onChange={(e) => {
                                setCounterDate(e.target.value);
                                setCounterSlot(null);
                              }}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              required
                            />
                          </div>

                          {/* Counter-proposal day calendar */}
                          {counterDate && counterDaySchedule.length > 0 && (
                            <InlineDayCalendar appointments={counterDaySchedule as any[]} />
                          )}

                          {/* Counter-proposal slots */}
                          {counterDate && (
                            <div>
                              <Label className="text-xs text-muted-foreground mb-2">{t('tech.ticketDetail.counterSlots')}</Label>
                              {counterAvailabilitySlots.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {counterAvailabilitySlots.map((slot: any, idx: number) => (
                                    <Button
                                      key={idx}
                                      type="button"
                                      size="sm"
                                      variant={
                                        !slot.available
                                          ? 'ghost'
                                          : counterSlot?.start === slot.start
                                            ? 'default'
                                            : 'outline'
                                      }
                                      disabled={!slot.available}
                                      onClick={() => setCounterSlot({ start: slot.start, end: slot.end })}
                                      className={`text-xs ${
                                        !slot.available
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                          : ''
                                      }`}
                                    >
                                      {formatSlotTime(slot.start)}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">{t('tech.ticketDetail.counterSlotsEmpty')}</p>
                              )}
                            </div>
                          )}

                          {/* Message */}
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.counterMessage')}</Label>
                            <Textarea
                              value={counterMessage}
                              onChange={(e) => setCounterMessage(e.target.value)}
                              placeholder={t('tech.ticketDetail.counterMessagePlaceholder')}
                              rows={2}
                              className="resize-none"
                            />
                          </div>

                          {/* Submit / Cancel */}
                          <div className="flex gap-2">
                            <HelpTooltip content={t('tech.ticketDetail.counterSendTooltip')} side="bottom">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={isMutating || !counterSlot}
                                className="text-xs bg-indigo-600 hover:bg-indigo-700"
                              >
                                {counterProposeMutation.isPending ? t('tech.ticketDetail.counterSending') : t('tech.ticketDetail.counterSendButton')}
                              </Button>
                            </HelpTooltip>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCounterProposingId(null);
                                setCounterDate('');
                                setCounterSlot(null);
                                setCounterMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs"
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resolved proposals (accepted, rejected, cancelled) */}
              {otherProposals.length > 0 && (
                <div className="space-y-2">
                  {pendingProposals.length > 0 && (
                    <p className="text-xs font-medium text-muted-foreground mt-2">{t('tech.ticketDetail.proposalHistory')}</p>
                  )}
                  {otherProposals.map((proposal: AppointmentProposal) => (
                    <div key={proposal.id} className="border rounded-md p-3 space-y-1 opacity-75">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={proposal.status} type="proposal" />
                          <span className="text-sm font-medium">
                            {new Date(proposal.proposedStart).toLocaleDateString('fr-CA')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatSlotTime(proposal.proposedStart)} – {formatSlotTime(proposal.proposedEnd)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t('tech.ticketDetail.proposalBy', { name: `${proposal.proposedBy?.firstName} ${proposal.proposedBy?.lastName}` })}
                        </span>
                      </div>
                      {proposal.message && (
                        <p className="text-xs text-muted-foreground italic">« {proposal.message} »</p>
                      )}
                      {proposal.responseMessage && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{t('tech.ticketDetail.proposalResponse')}</span> {proposal.responseMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>
          )}
          {/* ─── Appointments Section ─── */}
          {canScheduleAppointment && (
            <Card>
              <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('tech.ticketDetail.appointments')}</h3>
                {!showApptForm && (
                  <HelpTooltip content={t('tech.ticketDetail.scheduleTooltip')} side="left">
                    <Button
                      size="sm"
                      onClick={() => setShowApptForm(true)}
                    >
                      {t('tech.ticketDetail.scheduleButton')}
                    </Button>
                  </HelpTooltip>
                )}
              </div>

              {/* Existing appointments list */}
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appt: any) => (
                    <div key={appt.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={appt.status} type="appointment" />
                          <span className="text-sm font-medium">
                            {new Date(appt.scheduledStart).toLocaleDateString('fr-CA')}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatSlotTime(appt.scheduledStart)} – {formatSlotTime(appt.scheduledEnd)}
                        </span>
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-muted-foreground">{appt.notes}</p>
                      )}
                      {/* Action buttons for active appointments */}
                      {appt.status !== 'ANNULE' && appt.status !== 'TERMINE' && (
                        <div className="flex gap-2 pt-1">
                          {(appt.status === 'PLANIFIE' || appt.status === 'CONFIRME') && (
                            <HelpTooltip content={t('tech.ticketDetail.startTooltip')} side="top">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => apptStatusMutation.mutate({ apptId: appt.id, status: 'EN_COURS' })}
                                disabled={isMutating}
                                className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              >
                                {t('tech.ticketDetail.startButton')}
                              </Button>
                            </HelpTooltip>
                          )}
                          {appt.status === 'EN_COURS' && (
                            <HelpTooltip content={t('tech.ticketDetail.completeTooltip')} side="top">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => apptStatusMutation.mutate({ apptId: appt.id, status: 'TERMINE' })}
                                disabled={isMutating}
                                className="text-xs bg-green-100 text-green-800 hover:bg-green-200"
                              >
                                {t('tech.ticketDetail.completeButton')}
                              </Button>
                            </HelpTooltip>
                          )}
                          <HelpTooltip content={t('tech.ticketDetail.cancelApptTooltip')} side="top">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => cancelApptMutation.mutate(appt.id)}
                              disabled={isMutating}
                              className="text-xs bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              {cancelApptMutation.isPending ? t('tech.ticketDetail.cancelling') : t('tech.ticketDetail.cancelAppt')}
                            </Button>
                          </HelpTooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('tech.ticketDetail.noAppointments')}</p>
              )}

              {/* New appointment form */}
              {showApptForm && (
                <form onSubmit={handleApptSubmit} className="border-t pt-4 space-y-4">
                  <h4 className="text-sm font-medium">{t('tech.ticketDetail.newAppointment')}</h4>

                  {/* Date picker */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.dateLabel')}</Label>
                    <input
                      type="date"
                      value={apptDate}
                      onChange={(e) => {
                        setApptDate(e.target.value);
                        setApptSelectedSlot(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    />
                  </div>

                  {/* Inline day calendar — shows existing appointments for the selected day */}
                  {apptDate && daySchedule.length > 0 && (
                    <InlineDayCalendar appointments={daySchedule as any[]} />
                  )}

                  {/* Availability slots grid */}
                  {apptDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2">{t('tech.ticketDetail.slotsLabel')}</Label>
                      {availabilitySlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availabilitySlots.map((slot: any, idx: number) => (
                            <Button
                              key={idx}
                              type="button"
                              size="sm"
                              variant={
                                !slot.available
                                  ? 'ghost'
                                  : apptSelectedSlot?.start === slot.start
                                    ? 'default'
                                    : 'outline'
                              }
                              disabled={!slot.available}
                              onClick={() => setApptSelectedSlot({ start: slot.start, end: slot.end })}
                              className={`text-xs ${
                                !slot.available
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                  : ''
                              }`}
                            >
                              {formatSlotTime(slot.start)}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t('tech.ticketDetail.slotsEmpty')}</p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.notesLabel')}</Label>
                    <Textarea
                      value={apptNotes}
                      onChange={(e) => setApptNotes(e.target.value)}
                      placeholder={t('tech.ticketDetail.notesPlaceholder')}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Submit / Cancel */}
                  <div className="flex gap-2">
                    <HelpTooltip content={t('tech.ticketDetail.confirmApptTooltip')} side="top">
                      <Button
                        type="submit"
                        disabled={isMutating || !apptSelectedSlot}
                        className="flex-1"
                      >
                        {createApptMutation.isPending ? t('tech.ticketDetail.scheduling') : t('tech.ticketDetail.scheduleConfirm')}
                      </Button>
                    </HelpTooltip>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowApptForm(false);
                        setApptDate('');
                        setApptSelectedSlot(null);
                        setApptNotes('');
                      }}
                      disabled={isMutating}
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
          <AttachmentSection ticketId={id!} canUpload={true} isAdmin={false} />

          {/* Messages */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">{t('tech.ticketDetail.messages')}</h3>
              <MessageThread ticketId={id!} />
            </CardContent>
          </Card>
        </div>

        {/* ─── Right column (1/3) ─── */}
        <div className="space-y-4">
          {/* Ticket details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tech.ticketDetail.details')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">{t('tech.ticketDetail.categoryLabel')}</span>{' '}
                {t(`label.serviceCategory.${tk.serviceCategory}`) || tk.serviceCategory}
              </div>
              <div>
                <span className="text-muted-foreground">{t('tech.ticketDetail.modeLabel')}</span>{' '}
                {t(`label.serviceMode.${tk.serviceMode}`) || tk.serviceMode}
              </div>
              <div>
                <span className="text-muted-foreground">{t('tech.ticketDetail.createdLabel')}</span> {formatDateTime(tk.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">{t('tech.ticketDetail.updatedLabel')}</span> {formatDateTime(tk.updatedAt)}
              </div>
            </CardContent>
          </Card>

          {/* Client info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('tech.ticketDetail.clientTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm">{tk.customer?.firstName} {tk.customer?.lastName}</p>
              <p className="text-xs text-muted-foreground">{tk.customer?.email}</p>
              {tk.customer?.phone && (
                <p className="text-xs text-muted-foreground">{tk.customer.phone}</p>
              )}
              {tk.customer?.companyName && (
                <p className="text-xs text-muted-foreground">{tk.customer.companyName}</p>
              )}
            </CardContent>
          </Card>

          {/* Status change — only for assigned technician with valid transitions */}
          {isAssignedToMe && allowedStatuses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t('tech.ticketDetail.changeStatus')}</CardTitle>
              </CardHeader>
              <CardContent>
                <HelpTooltip content={t('tech.ticketDetail.changeStatusTooltip')} side="left">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        statusMutation.mutate(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    disabled={isMutating}
                    defaultValue=""
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {statusMutation.isPending ? t('tech.ticketDetail.updatingStatus') : t('tech.ticketDetail.selectStatus')}
                    </option>
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {t(`label.status.${status}`) || status}
                      </option>
                    ))}
                  </select>
                </HelpTooltip>
              </CardContent>
            </Card>
          )}

          {/* Start Worksheet — create a new worksheet from this ticket */}
          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                onClick={() => createWorksheetMutation.mutate()}
                disabled={createWorksheetMutation.isPending}
              >
                {createWorksheetMutation.isPending ? t('common.loading') : t('worksheet.startWorksheet')}
              </Button>
            </CardContent>
          </Card>

          {/* Send Quote form — only if technician has can_send_quotes permission */}
          {isAssignedToMe && canSendQuotes && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('tech.ticketDetail.quoteTitle')}</CardTitle>
                  {!showQuoteForm && (
                    <HelpTooltip content={t('tech.ticketDetail.quoteCreateTooltip')} side="left">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowQuoteForm(true)}
                        className="text-xs p-0 h-auto"
                      >
                        {tk.quotedPrice != null ? t('tech.ticketDetail.quoteModify') : t('tech.ticketDetail.quoteSendButton')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              </CardHeader>
              {showQuoteForm && (
                <CardContent>
                  <form onSubmit={handleQuoteSubmit} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.quotePriceLabel')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quotedPrice}
                        onChange={(e) => setQuotedPrice(e.target.value)}
                        placeholder="150.00"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.quoteDescLabel')}</Label>
                      <Textarea
                        value={quoteDescription}
                        onChange={(e) => setQuoteDescription(e.target.value)}
                        placeholder={t('tech.ticketDetail.quoteDescPlaceholder')}
                        rows={3}
                        className="resize-none"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.quoteDurationLabel')}</Label>
                      <Input
                        type="text"
                        value={quoteDuration}
                        onChange={(e) => setQuoteDuration(e.target.value)}
                        placeholder={t('tech.ticketDetail.quoteDurationPlaceholder')}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <HelpTooltip content={t('tech.ticketDetail.quoteSendTooltip')} side="top">
                        <Button
                          type="submit"
                          disabled={isMutating}
                          className="flex-1"
                        >
                          {quoteMutation.isPending ? t('tech.ticketDetail.quoteSending') : t('tech.ticketDetail.quoteSend')}
                        </Button>
                      </HelpTooltip>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowQuoteForm(false)}
                        disabled={isMutating}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>
          )}

          {/* Add/Remove Blocker */}
          {isAssignedToMe && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('tech.ticketDetail.blockerCardTitle')}</CardTitle>
                  {!tk.blockerReason && !showBlockerForm && (
                    <HelpTooltip content={t('tech.ticketDetail.reportBlockerTooltip')} side="left">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowBlockerForm(true)}
                        className="text-xs text-red-600 p-0 h-auto"
                      >
                        {t('tech.ticketDetail.reportBlocker')}
                      </Button>
                    </HelpTooltip>
                  )}
                  {tk.blockerReason && !showBlockerForm && (
                    <HelpTooltip content={t('tech.ticketDetail.removeBlockerLinkTooltip')} side="left">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => removeBlockerMutation.mutate()}
                        disabled={isMutating}
                        className="text-xs text-red-600 p-0 h-auto"
                      >
                        {removeBlockerMutation.isPending ? t('tech.ticketDetail.removingBlocker') : t('tech.ticketDetail.removeBlockerLink')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              </CardHeader>
              <CardContent>
          {tk.blockerReason && (
                  <p className="text-xs text-muted-foreground">
                    {t('tech.ticketDetail.blockerActive')}
                  </p>
                )}
                {showBlockerForm && (
                  <form onSubmit={handleAddBlocker} className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">{t('tech.ticketDetail.blockerReasonLabel')}</Label>
                      <Textarea
                        value={blockerReason}
                        onChange={(e) => setBlockerReason(e.target.value)}
                        placeholder={t('tech.ticketDetail.blockerReasonPlaceholder')}
                        rows={3}
                        className="resize-none"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <HelpTooltip content={t('tech.ticketDetail.addBlockerTooltip')} side="top">
                        <Button
                          type="submit"
                          variant="destructive"
                          disabled={isMutating}
                          className="flex-1"
                        >
                          {addBlockerMutation.isPending ? t('tech.ticketDetail.addingBlocker') : t('tech.ticketDetail.addBlocker')}
                        </Button>
                      </HelpTooltip>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBlockerForm(false)}
                        disabled={isMutating}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
