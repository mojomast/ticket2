import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Ticket, type AppointmentProposal } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import MessageThread from '../../components/shared/MessageThread';
import AttachmentSection from '../../components/shared/AttachmentSection';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/use-auth';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import {
  SERVICE_CATEGORY_LABELS,
  STATUS_LABELS,
  SERVICE_MODE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from '../../lib/constants';
import HelpTooltip from '../../components/shared/HelpTooltip';

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
        statusLabel: APPOINTMENT_STATUS_LABELS[a.status] || a.status,
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
        Agenda du jour ({appointments.filter((a: any) => a.status !== 'ANNULE').length} rendez-vous)
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
            Aucun rendez-vous ce jour
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
      toast.success('Billet accepté');
    },
    onError: () => toast.error("Erreur lors de l'acceptation du billet"),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.tickets.changeStatus(id!, status),
    onSuccess: () => {
      invalidateTicket();
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
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
      toast.success('Devis envoyé');
    },
    onError: () => toast.error("Erreur lors de l'envoi du devis"),
  });

  const addBlockerMutation = useMutation({
    mutationFn: (reason: string) => api.tickets.addBlocker(id!, reason),
    onSuccess: () => {
      invalidateTicket();
      setShowBlockerForm(false);
      setBlockerReason('');
      toast.success('Blocage ajouté');
    },
    onError: () => toast.error("Erreur lors de l'ajout du blocage"),
  });

  const removeBlockerMutation = useMutation({
    mutationFn: () => api.tickets.removeBlocker(id!),
    onSuccess: () => {
      invalidateTicket();
      toast.success('Blocage retiré');
    },
    onError: () => toast.error('Erreur lors du retrait du blocage'),
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
      toast.success('Rendez-vous planifié');
    },
    onError: () => toast.error('Erreur lors de la planification du rendez-vous'),
  });

  const cancelApptMutation = useMutation({
    mutationFn: (apptId: string) => api.appointments.cancel(apptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success('Rendez-vous annulé');
    },
    onError: () => toast.error("Erreur lors de l'annulation du rendez-vous"),
  });

  const apptStatusMutation = useMutation({
    mutationFn: ({ apptId, status }: { apptId: string; status: string }) =>
      api.appointments.changeStatus(apptId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success('Statut du rendez-vous mis à jour');
    },
    onError: () => toast.error('Erreur lors du changement de statut du rendez-vous'),
  });

  // ─── Proposal mutations ───
  const acceptProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMessage }: { proposalId: string; responseMessage?: string }) =>
      api.appointments.proposals.accept(proposalId, responseMessage),
    onSuccess: () => {
      invalidateProposals();
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      invalidateTicket();
      toast.success('Proposition acceptée — rendez-vous créé');
    },
    onError: () => toast.error("Erreur lors de l'acceptation de la proposition"),
  });

  const rejectProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMessage }: { proposalId: string; responseMessage?: string }) =>
      api.appointments.proposals.reject(proposalId, responseMessage),
    onSuccess: () => {
      invalidateProposals();
      setRejectingProposalId(null);
      setRejectMessage('');
      toast.success('Proposition refusée');
    },
    onError: () => toast.error('Erreur lors du refus de la proposition'),
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
      toast.success('Contre-proposition envoyée');
    },
    onError: () => toast.error("Erreur lors de l'envoi de la contre-proposition"),
  });

  // ─── Loading / Not found ───
  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (!ticket) return <div className="text-center py-8">Billet introuvable</div>;

  const t: Ticket = ticket;

  // Determine available status transitions for the current status
  // Filter TERMINEE → FERMEE: only if tech has can_close_tickets permission
  const rawAllowed = TECH_STATUS_TRANSITIONS[t.status] ?? [];
  const canCloseTickets = !!user?.permissions?.can_close_tickets;
  const canAcceptTickets = !!user?.permissions?.can_accept_tickets;
  const allowedStatuses = rawAllowed.filter((s) => {
    if (s === 'FERMEE' && !canCloseTickets) return false;
    return true;
  });
  const canSendQuotes = !!user?.permissions?.can_send_quotes;
  const isAssignedToMe = !!t.technicianId && t.technicianId === user?.id;
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
    counterProposeMutation.isPending;

  const canScheduleAppointment =
    isAssignedToMe && SCHEDULABLE_STATUSES.includes(t.status);

  // ─── Handlers ───
  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(quotedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }
    if (!quoteDescription.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }
    if (!quoteDuration.trim()) {
      toast.error('Veuillez entrer une durée estimée');
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
      toast.error('Veuillez entrer une raison de blocage');
      return;
    }
    addBlockerMutation.mutate(blockerReason.trim());
  };

  const handleApptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptSelectedSlot) {
      toast.error('Veuillez sélectionner un créneau horaire');
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
      toast.error('Veuillez sélectionner un créneau horaire');
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
          &larr; Retour
        </Link>
        <h1 className="text-2xl font-bold">{t.ticketNumber}</h1>
        <StatusBadge status={t.status} />
        <StatusBadge status={t.priority} type="priority" />

        {/* Accept button — only when no technician assigned and tech has can_accept_tickets permission */}
        {!t.technicianId && canAcceptTickets && (
          <HelpTooltip content="Prendre en charge ce billet et devenir le technicien assigné" side="bottom">
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={isMutating}
              className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
            >
              {acceptMutation.isPending ? 'Acceptation...' : 'Accepter'}
            </button>
          </HelpTooltip>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left column (2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="font-semibold mb-2">{t.title}</h2>
            <p className="text-sm whitespace-pre-wrap">{t.description}</p>
          </div>

          {/* Existing quote display */}
          {t.quotedPrice != null && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Devis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Prix:</span>{' '}
                  <span className="font-medium">{formatCurrency(t.quotedPrice)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Durée:</span>{' '}
                  <span className="font-medium">{t.quoteDuration ?? '—'}</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-muted-foreground">Description:</span>{' '}
                  <span>{t.quoteDescription ?? '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Blocker display */}
          {t.blockerReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-red-800">Blocage</h3>
                {isAssignedToMe && (
                  <HelpTooltip content="Retirer le blocage et permettre au billet de progresser" side="left">
                    <button
                      onClick={() => removeBlockerMutation.mutate()}
                      disabled={isMutating}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                      {removeBlockerMutation.isPending ? 'Retrait...' : 'Retirer le blocage'}
                    </button>
                  </HelpTooltip>
                )}
              </div>
              <p className="text-sm text-red-700">{t.blockerReason}</p>
            </div>
          )}

          {/* ─── Appointment Proposals Section ─── */}
          {proposals.length > 0 && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">Propositions de rendez-vous</h3>

              {/* Pending proposals first — these require action */}
              {pendingProposals.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    {pendingProposals.length} proposition{pendingProposals.length > 1 ? 's' : ''} en attente de réponse
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
                          Proposé par {proposal.proposedBy?.firstName} {proposal.proposedBy?.lastName}
                          {proposal.proposedBy?.role === 'CUSTOMER' && ' (client)'}
                        </span>
                      </div>

                      {proposal.message && (
                        <p className="text-sm text-muted-foreground italic">« {proposal.message} »</p>
                      )}

                      {proposal.parent && (
                        <p className="text-xs text-muted-foreground">
                          En réponse à une proposition du {new Date(proposal.parent.proposedStart).toLocaleDateString('fr-CA')}{' '}
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
                          <HelpTooltip content="Accepter cette proposition et créer le rendez-vous" side="bottom">
                            <button
                              onClick={() => acceptProposalMutation.mutate({ proposalId: proposal.id })}
                              disabled={isMutating}
                              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              {acceptProposalMutation.isPending ? 'Acceptation...' : 'Accepter'}
                            </button>
                          </HelpTooltip>
                          <HelpTooltip content="Refuser cette proposition avec un message optionnel" side="bottom">
                            <button
                              onClick={() => setRejectingProposalId(proposal.id)}
                              disabled={isMutating}
                              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                              Refuser
                            </button>
                          </HelpTooltip>
                          <HelpTooltip content="Proposer un autre créneau horaire au client" side="bottom">
                            <button
                              onClick={() => {
                                setCounterProposingId(proposal.id);
                                setCounterDate('');
                                setCounterSlot(null);
                                setCounterMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Contre-proposer
                            </button>
                          </HelpTooltip>
                        </div>
                      )}

                      {/* Reject form inline */}
                      {rejectingProposalId === proposal.id && (
                        <div className="border-t pt-3 space-y-2">
                          <label className="block text-xs text-muted-foreground">Message de refus (optionnel)</label>
                          <textarea
                            value={rejectMessage}
                            onChange={(e) => setRejectMessage(e.target.value)}
                            placeholder="Raison du refus..."
                            rows={2}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <HelpTooltip content="Confirmer le refus de cette proposition" side="bottom">
                              <button
                                onClick={() =>
                                  rejectProposalMutation.mutate({
                                    proposalId: proposal.id,
                                    ...(rejectMessage.trim() ? { responseMessage: rejectMessage.trim() } : {}),
                                  })
                                }
                                disabled={isMutating}
                                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                              >
                                {rejectProposalMutation.isPending ? 'Refus...' : 'Confirmer le refus'}
                              </button>
                            </HelpTooltip>
                            <button
                              onClick={() => {
                                setRejectingProposalId(null);
                                setRejectMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs px-3 py-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Counter-propose form inline */}
                      {counterProposingId === proposal.id && (
                        <form onSubmit={handleCounterPropose} className="border-t pt-3 space-y-3">
                          <p className="text-xs font-medium">Contre-proposition</p>

                          {/* Date picker */}
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Date</label>
                            <input
                              type="date"
                              value={counterDate}
                              onChange={(e) => {
                                setCounterDate(e.target.value);
                                setCounterSlot(null);
                              }}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                              <label className="block text-xs text-muted-foreground mb-2">Créneaux disponibles</label>
                              {counterAvailabilitySlots.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {counterAvailabilitySlots.map((slot: any, idx: number) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={!slot.available}
                                      onClick={() => setCounterSlot({ start: slot.start, end: slot.end })}
                                      className={`text-xs px-2 py-2 rounded-md border transition-colors ${
                                        !slot.available
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                          : counterSlot?.start === slot.start
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-foreground border-input hover:bg-accent'
                                      }`}
                                    >
                                      {formatSlotTime(slot.start)}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Aucun créneau disponible pour cette date.</p>
                              )}
                            </div>
                          )}

                          {/* Message */}
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Message (optionnel)</label>
                            <textarea
                              value={counterMessage}
                              onChange={(e) => setCounterMessage(e.target.value)}
                              placeholder="Message pour le client..."
                              rows={2}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                            />
                          </div>

                          {/* Submit / Cancel */}
                          <div className="flex gap-2">
                            <HelpTooltip content="Envoyer votre contre-proposition au client" side="bottom">
                              <button
                                type="submit"
                                disabled={isMutating || !counterSlot}
                                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {counterProposeMutation.isPending ? 'Envoi...' : 'Envoyer la contre-proposition'}
                              </button>
                            </HelpTooltip>
                            <button
                              type="button"
                              onClick={() => {
                                setCounterProposingId(null);
                                setCounterDate('');
                                setCounterSlot(null);
                                setCounterMessage('');
                              }}
                              disabled={isMutating}
                              className="text-xs px-3 py-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50"
                            >
                              Annuler
                            </button>
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
                    <p className="text-xs font-medium text-muted-foreground mt-2">Historique</p>
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
                          Par {proposal.proposedBy?.firstName} {proposal.proposedBy?.lastName}
                        </span>
                      </div>
                      {proposal.message && (
                        <p className="text-xs text-muted-foreground italic">« {proposal.message} »</p>
                      )}
                      {proposal.responseMessage && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Réponse:</span> {proposal.responseMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Appointments Section ─── */}
          {canScheduleAppointment && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Rendez-vous</h3>
                {!showApptForm && (
                  <HelpTooltip content="Planifier un nouveau rendez-vous pour ce billet" side="left">
                    <button
                      onClick={() => setShowApptForm(true)}
                      className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                    >
                      Planifier un rendez-vous
                    </button>
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
                            <HelpTooltip content="Démarrer l'intervention pour ce rendez-vous" side="top">
                              <button
                                onClick={() => apptStatusMutation.mutate({ apptId: appt.id, status: 'EN_COURS' })}
                                disabled={isMutating}
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50"
                              >
                                Démarrer
                              </button>
                            </HelpTooltip>
                          )}
                          {appt.status === 'EN_COURS' && (
                            <HelpTooltip content="Marquer l'intervention comme terminée" side="top">
                              <button
                                onClick={() => apptStatusMutation.mutate({ apptId: appt.id, status: 'TERMINE' })}
                                disabled={isMutating}
                                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                              >
                                Terminer
                              </button>
                            </HelpTooltip>
                          )}
                          <HelpTooltip content="Annuler ce rendez-vous" side="top">
                            <button
                              onClick={() => cancelApptMutation.mutate(appt.id)}
                              disabled={isMutating}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                            >
                              {cancelApptMutation.isPending ? 'Annulation...' : 'Annuler'}
                            </button>
                          </HelpTooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rendez-vous planifié.</p>
              )}

              {/* New appointment form */}
              {showApptForm && (
                <form onSubmit={handleApptSubmit} className="border-t pt-4 space-y-4">
                  <h4 className="text-sm font-medium">Nouveau rendez-vous</h4>

                  {/* Date picker */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date</label>
                    <input
                      type="date"
                      value={apptDate}
                      onChange={(e) => {
                        setApptDate(e.target.value);
                        setApptSelectedSlot(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      <label className="block text-xs text-muted-foreground mb-2">Créneaux disponibles</label>
                      {availabilitySlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availabilitySlots.map((slot: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setApptSelectedSlot({ start: slot.start, end: slot.end })}
                              className={`text-xs px-2 py-2 rounded-md border transition-colors ${
                                !slot.available
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                  : apptSelectedSlot?.start === slot.start
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-input hover:bg-accent'
                              }`}
                            >
                              {formatSlotTime(slot.start)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun créneau disponible pour cette date.</p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Notes (optionnel)</label>
                    <textarea
                      value={apptNotes}
                      onChange={(e) => setApptNotes(e.target.value)}
                      placeholder="Notes pour le rendez-vous..."
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Submit / Cancel */}
                  <div className="flex gap-2">
                    <HelpTooltip content="Confirmer et planifier ce rendez-vous" side="top">
                      <button
                        type="submit"
                        disabled={isMutating || !apptSelectedSlot}
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                      >
                        {createApptMutation.isPending ? 'Planification...' : 'Planifier'}
                      </button>
                    </HelpTooltip>
                    <button
                      type="button"
                      onClick={() => {
                        setShowApptForm(false);
                        setApptDate('');
                        setApptSelectedSlot(null);
                        setApptNotes('');
                      }}
                      disabled={isMutating}
                      className="px-3 py-2 border border-input rounded-md text-sm hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ─── Attachments Section ─── */}
          <AttachmentSection ticketId={id!} canUpload={true} isAdmin={false} />

          {/* Messages */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Messages</h3>
            <MessageThread ticketId={id!} />
          </div>
        </div>

        {/* ─── Right column (1/3) ─── */}
        <div className="space-y-4">
          {/* Ticket details */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Détails</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">Catégorie:</span>{' '}
                {SERVICE_CATEGORY_LABELS[t.serviceCategory] || t.serviceCategory}
              </div>
              <div>
                <span className="text-muted-foreground">Mode:</span>{' '}
                {SERVICE_MODE_LABELS[t.serviceMode] || t.serviceMode}
              </div>
              <div>
                <span className="text-muted-foreground">Créé:</span> {formatDateTime(t.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">Modifié:</span> {formatDateTime(t.updatedAt)}
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Client</h3>
            <p className="text-sm">{t.customer?.firstName} {t.customer?.lastName}</p>
            <p className="text-xs text-muted-foreground">{t.customer?.email}</p>
            {t.customer?.phone && (
              <p className="text-xs text-muted-foreground">{t.customer.phone}</p>
            )}
            {t.customer?.companyName && (
              <p className="text-xs text-muted-foreground">{t.customer.companyName}</p>
            )}
          </div>

          {/* Status change — only for assigned technician with valid transitions */}
          {isAssignedToMe && allowedStatuses.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Changer le statut</h3>
              <HelpTooltip content="Sélectionner le prochain statut selon le flux de travail autorisé" side="left">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      statusMutation.mutate(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={isMutating}
                  defaultValue=""
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="" disabled>
                    {statusMutation.isPending ? 'Mise à jour...' : 'Sélectionner...'}
                  </option>
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] || status}
                    </option>
                  ))}
                </select>
              </HelpTooltip>
            </div>
          )}

          {/* Send Quote form — only if technician has can_send_quotes permission */}
          {isAssignedToMe && canSendQuotes && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Devis</h3>
                {!showQuoteForm && (
                  <HelpTooltip content="Créer ou modifier un devis pour le client" side="left">
                    <button
                      onClick={() => setShowQuoteForm(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      {t.quotedPrice != null ? 'Modifier' : 'Envoyer un devis'}
                    </button>
                  </HelpTooltip>
                )}
              </div>
              {showQuoteForm && (
                <form onSubmit={handleQuoteSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Prix ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                      placeholder="150.00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <textarea
                      value={quoteDescription}
                      onChange={(e) => setQuoteDescription(e.target.value)}
                      placeholder="Description des travaux..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Durée estimée</label>
                    <input
                      type="text"
                      value={quoteDuration}
                      onChange={(e) => setQuoteDuration(e.target.value)}
                      placeholder="2 heures"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <HelpTooltip content="Envoyer le devis au client pour approbation" side="top">
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                      >
                        {quoteMutation.isPending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </HelpTooltip>
                    <button
                      type="button"
                      onClick={() => setShowQuoteForm(false)}
                      disabled={isMutating}
                      className="px-3 py-2 border border-input rounded-md text-sm hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Add/Remove Blocker */}
          {isAssignedToMe && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Blocage</h3>
                {!t.blockerReason && !showBlockerForm && (
                  <HelpTooltip content="Signaler un obstacle empêchant la résolution du billet" side="left">
                    <button
                      onClick={() => setShowBlockerForm(true)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Signaler un blocage
                    </button>
                  </HelpTooltip>
                )}
                {t.blockerReason && !showBlockerForm && (
                  <HelpTooltip content="Retirer le blocage actif sur ce billet" side="left">
                    <button
                      onClick={() => removeBlockerMutation.mutate()}
                      disabled={isMutating}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      {removeBlockerMutation.isPending ? 'Retrait...' : 'Retirer'}
                    </button>
                  </HelpTooltip>
                )}
              </div>
              {t.blockerReason && (
                <p className="text-xs text-muted-foreground">
                  Blocage actif — voir ci-dessus pour les détails.
                </p>
              )}
              {showBlockerForm && (
                <form onSubmit={handleAddBlocker} className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Raison du blocage</label>
                    <textarea
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      placeholder="Décrivez la raison du blocage..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <HelpTooltip content="Ajouter ce blocage au billet — le statut passera à BLOCAGE" side="top">
                      <button
                        type="submit"
                        disabled={isMutating}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
                      >
                        {addBlockerMutation.isPending ? 'Ajout...' : 'Ajouter'}
                      </button>
                    </HelpTooltip>
                    <button
                      type="button"
                      onClick={() => setShowBlockerForm(false)}
                      disabled={isMutating}
                      className="px-3 py-2 border border-input rounded-md text-sm hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
