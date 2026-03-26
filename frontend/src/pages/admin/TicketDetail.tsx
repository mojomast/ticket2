import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Ticket, type User, type AppointmentProposal } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import MessageThread from '../../components/shared/MessageThread';
import HelpTooltip from '../../components/shared/HelpTooltip';
import { useToast } from '../../hooks/use-toast';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import {
  STATUS_LABELS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MODE_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from '../../lib/constants';

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
  const { data: daySchedule, isLoading } = useQuery({
    queryKey: ['daySchedule', date, technicianId],
    queryFn: () => api.appointments.daySchedule(date, technicianId),
    enabled: !!date && !!technicianId,
  });

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Chargement de l&apos;horaire du jour...
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
                  [{APPOINTMENT_STATUS_LABELS[occ.status] || occ.status}]
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
        Horaire du technicien — {date}
        {appts.length === 0 && (
          <span className="ml-2 text-green-600">(Journée libre)</span>
        )}
      </p>
      <div className="border rounded-md bg-background overflow-hidden max-h-[400px] overflow-y-auto">
        {rows}
      </div>
      {appts.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {appts.filter((a: any) => a.status !== 'ANNULE').length} rendez-vous planifié(s) ce jour
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
  const toast = useToast();
  const queryClient = useQueryClient();

  // ─── Local state for counter-propose and reject response ───
  const [counterProposeFor, setCounterProposeFor] = useState<string | null>(null);
  const [counterDate, setCounterDate] = useState('');
  const [counterStart, setCounterStart] = useState('');
  const [counterEnd, setCounterEnd] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
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
      toast.success('Proposition acceptée — rendez-vous créé automatiquement');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'acceptation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, responseMessage }: { id: string; responseMessage?: string }) =>
      api.appointments.proposals.reject(id, responseMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', ticketId] });
      toast.success('Proposition refusée');
      setRejectFor(null);
      setRejectMessage('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du refus');
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
      toast.success('Contre-proposition envoyée');
      setCounterProposeFor(null);
      setCounterDate('');
      setCounterStart('');
      setCounterEnd('');
      setCounterMessage('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la contre-proposition');
    },
  });

  function handleCounterSubmit(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!counterDate || !counterStart || !counterEnd) {
      toast.error('Veuillez remplir la date, l\'heure de début et de fin');
      return;
    }
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
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-semibold mb-2">Propositions de rendez-vous</h3>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <h3 className="font-semibold">Propositions de rendez-vous</h3>

      {proposalList.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune proposition de rendez-vous pour ce billet.
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
                  Par {proposal.proposedBy.firstName} {proposal.proposedBy.lastName}
                  {' '}({proposal.proposedBy.role === 'CUSTOMER' ? 'Client' : proposal.proposedBy.role === 'ADMIN' ? 'Admin' : 'Tech'})
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
                  Réponse: &laquo; {proposal.responseMessage} &raquo;
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
                  En réponse à la proposition du{' '}
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
                      {' le '}
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
                  <HelpTooltip content="Accepter cette proposition — un rendez-vous sera créé automatiquement" side="top">
                    <button
                      onClick={() => acceptMutation.mutate({ id: proposal.id })}
                      disabled={acceptMutation.isPending}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {acceptMutation.isPending ? 'Acceptation...' : 'Accepter'}
                    </button>
                  </HelpTooltip>

                  {/* Reject button / form toggle */}
                  {rejectFor === proposal.id ? (
                    <form
                      onSubmit={(e) => handleRejectSubmit(e, proposal.id)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <input
                        type="text"
                        value={rejectMessage}
                        onChange={(e) => setRejectMessage(e.target.value)}
                        placeholder="Raison du refus (optionnel)..."
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={rejectMutation.isPending}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {rejectMutation.isPending ? '...' : 'Confirmer refus'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectFor(null);
                          setRejectMessage('');
                        }}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <HelpTooltip content="Refuser cette proposition de rendez-vous" side="top">
                      <button
                        onClick={() => {
                          setRejectFor(proposal.id);
                          setCounterProposeFor(null);
                        }}
                        className="rounded-md border border-red-300 bg-background px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Refuser
                      </button>
                    </HelpTooltip>
                  )}

                  {/* Counter-propose button / form toggle */}
                  {counterProposeFor === proposal.id ? (
                    <form
                      onSubmit={(e) => handleCounterSubmit(e, proposal.id)}
                      className="w-full mt-2 border rounded-md p-3 bg-muted/30 space-y-2"
                    >
                      <p className="text-xs font-semibold">Contre-proposition</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Date</label>
                          <input
                            type="date"
                            value={counterDate}
                            onChange={(e) => setCounterDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            required
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Début</label>
                          <input
                            type="time"
                            value={counterStart}
                            onChange={(e) => setCounterStart(e.target.value)}
                            required
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-0.5">Fin</label>
                          <input
                            type="time"
                            value={counterEnd}
                            onChange={(e) => setCounterEnd(e.target.value)}
                            required
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">Message (optionnel)</label>
                        <input
                          type="text"
                          value={counterMessage}
                          onChange={(e) => setCounterMessage(e.target.value)}
                          placeholder="Proposition alternative..."
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                      </div>

                      {/* Show inline day calendar when a counter-propose date is selected */}
                      {counterDate && technicianId && (
                        <InlineDayCalendar date={counterDate} technicianId={technicianId} />
                      )}

                      <div className="flex gap-2">
                        <HelpTooltip content="Envoyer cette contre-proposition au client" side="top">
                          <button
                            type="submit"
                            disabled={counterProposeMutation.isPending}
                            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {counterProposeMutation.isPending ? 'Envoi...' : 'Envoyer la contre-proposition'}
                          </button>
                        </HelpTooltip>
                        <button
                          type="button"
                          onClick={() => {
                            setCounterProposeFor(null);
                            setCounterDate('');
                            setCounterStart('');
                            setCounterEnd('');
                            setCounterMessage('');
                          }}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <HelpTooltip content="Proposer un autre créneau horaire en réponse" side="top">
                      <button
                        onClick={() => {
                          setCounterProposeFor(proposal.id);
                          setRejectFor(null);
                        }}
                        className="rounded-md border border-primary/50 bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-accent"
                      >
                        Contre-proposer
                      </button>
                    </HelpTooltip>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function AdminTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  // ─── Quote form state ───
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteDuration, setQuoteDuration] = useState('');

  // ─── Blocker form state ───
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');

  // ─── Appointment form state ───
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');

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
      toast.success('Technicien assigné avec succès');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'assignation du technicien');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => api.tickets.changeStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Statut mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du changement de statut');
    },
  });

  const quoteMutation = useMutation({
    mutationFn: (data: { quotedPrice: number; quoteDescription: string; quoteDuration: string }) =>
      api.tickets.sendQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Devis envoyé avec succès');
      setShowQuoteForm(false);
      setQuotedPrice('');
      setQuoteDescription('');
      setQuoteDuration('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'envoi du devis');
    },
  });

  const addBlockerMutation = useMutation({
    mutationFn: (reason: string) => api.tickets.addBlocker(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Blocage ajouté');
      setShowBlockerForm(false);
      setBlockerReason('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'ajout du blocage');
    },
  });

  const removeBlockerMutation = useMutation({
    mutationFn: () => api.tickets.removeBlocker(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Blocage retiré');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du retrait du blocage');
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
      toast.success('Rendez-vous planifié avec succès');
      setShowAppointmentForm(false);
      setSelectedDate('');
      setSelectedSlot(null);
      setAppointmentNotes('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la planification du rendez-vous');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => api.appointments.cancel(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Rendez-vous annulé');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'annulation du rendez-vous');
    },
  });

  const changeAppointmentStatusMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: string }) =>
      api.appointments.changeStatus(appointmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', id] });
      toast.success('Statut du rendez-vous mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du changement de statut');
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
    const price = parseFloat(quotedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Le prix doit être un nombre positif');
      return;
    }
    if (!quoteDescription.trim()) {
      toast.error('La description du devis est requise');
      return;
    }
    if (!quoteDuration.trim()) {
      toast.error('La durée estimée est requise');
      return;
    }
    quoteMutation.mutate({
      quotedPrice: price,
      quoteDescription: quoteDescription.trim(),
      quoteDuration: quoteDuration.trim(),
    });
  }

  function handleAddBlocker(e: React.FormEvent) {
    e.preventDefault();
    if (!blockerReason.trim()) {
      toast.error('La raison du blocage est requise');
      return;
    }
    addBlockerMutation.mutate(blockerReason.trim());
  }

  function handleAppointmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Veuillez sélectionner un créneau horaire');
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

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (!ticket) return <div className="text-center py-8">Billet introuvable</div>;

  const t: Ticket = ticket;
  const allowedNextStatuses = ADMIN_TRANSITIONS[t.status] || [];
  const canSendQuote = QUOTABLE_STATUSES.includes(t.status);
  const canSchedule = SCHEDULABLE_STATUSES.includes(t.status);
  const hasBlocker = !!t.blockerReason;
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
        <HelpTooltip content="Retourner à la liste des billets" side="bottom">
          <Link
            to="/admin/billets"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Retour
          </Link>
        </HelpTooltip>
        <h1 className="text-2xl font-bold">{t.ticketNumber}</h1>
        <HelpTooltip content="Statut actuel du billet dans son cycle de vie" side="bottom">
          <span><StatusBadge status={t.status} /></span>
        </HelpTooltip>
        <HelpTooltip content="Niveau de priorité attribué à ce billet" side="bottom">
          <span><StatusBadge status={t.priority} type="priority" /></span>
        </HelpTooltip>
      </div>

      {/* ─── 3-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket description */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="font-semibold mb-2">{t.title}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {t.description}
            </p>
          </div>

          {/* Quote info (if exists) */}
          {t.quotedPrice && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Devis</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Prix:</span>{' '}
                  {formatCurrency(t.quotedPrice)}
                </div>
                <div>
                  <span className="text-muted-foreground">Durée:</span>{' '}
                  {t.quoteDuration}
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>{' '}
                  {t.quoteDescription}
                </div>
              </div>
            </div>
          )}

          {/* Blocker banner */}
          {t.blockerReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-1">Blocage</h3>
              <p className="text-sm text-red-700">{t.blockerReason}</p>
            </div>
          )}

          {/* ─── Appointment Proposals Section ─── */}
          <ProposalsSection ticketId={id!} technicianId={t.technicianId} />

          {/* ─── Appointments Section ─── */}
          {canSchedule && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Rendez-vous</h3>
                {!showAppointmentForm && (
                  <HelpTooltip content="Planifier un nouveau rendez-vous pour ce billet avec un technicien" side="left">
                    <button
                      onClick={() => setShowAppointmentForm(true)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Planifier un rendez-vous
                    </button>
                  </HelpTooltip>
                )}
              </div>

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
                          Technicien: {apt.technician.firstName} {apt.technician.lastName}
                        </p>
                      )}

                      {apt.notes && (
                        <p className="text-xs text-muted-foreground italic">{apt.notes}</p>
                      )}

                      {/* Actions: status change + cancel */}
                      {apt.status !== 'ANNULE' && apt.status !== 'TERMINE' && (
                        <div className="flex items-center gap-2 pt-1">
                          <HelpTooltip content="Changer le statut de ce rendez-vous" side="top">
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
                              className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
                            >
                              <option value="">Changer le statut...</option>
                              {apt.status === 'PLANIFIE' && (
                                <option value="CONFIRME">Confirmer</option>
                              )}
                              {(apt.status === 'PLANIFIE' || apt.status === 'CONFIRME') && (
                                <option value="EN_COURS">Démarrer</option>
                              )}
                              {apt.status === 'EN_COURS' && (
                                <option value="TERMINE">Terminer</option>
                              )}
                            </select>
                          </HelpTooltip>
                          <HelpTooltip content="Annuler ce rendez-vous" side="top">
                            <button
                              onClick={() => cancelAppointmentMutation.mutate(apt.id)}
                              disabled={cancelAppointmentMutation.isPending}
                              className="rounded-md border border-red-300 bg-background px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancelAppointmentMutation.isPending ? 'Annulation...' : 'Annuler'}
                            </button>
                          </HelpTooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun rendez-vous planifié pour ce billet.
                </p>
              )}

              {/* New appointment form */}
              {showAppointmentForm && (
                <form
                  onSubmit={handleAppointmentSubmit}
                  className="border rounded-md p-4 space-y-4 bg-muted/30"
                >
                  <h4 className="text-sm font-semibold">Nouveau rendez-vous</h4>

                  {/* Date picker */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlot(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    />
                  </div>

                  {/* ─── Inline Day Calendar (shows technician's schedule for selected date) ─── */}
                  {selectedDate && t.technicianId && (
                    <InlineDayCalendar date={selectedDate} technicianId={t.technicianId} />
                  )}

                  {/* Availability slots grid */}
                  {selectedDate && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-2">
                        Créneaux disponibles
                      </label>
                      {!t.technicianId ? (
                        <p className="text-xs text-amber-600">
                          Veuillez d&apos;abord assigner un technicien pour voir les disponibilités.
                        </p>
                      ) : !availabilitySlots ? (
                        <p className="text-xs text-muted-foreground">Chargement des créneaux...</p>
                      ) : (availabilitySlots as any[]).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Aucun créneau disponible pour cette date.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {(availabilitySlots as any[]).map((slot: any, idx: number) => {
                            const isSelected =
                              selectedSlot?.start === slot.start &&
                              selectedSlot?.end === slot.end;
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={!slot.available}
                                onClick={() =>
                                  setSelectedSlot({ start: slot.start, end: slot.end })
                                }
                                className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                                  !slot.available
                                    ? 'border-muted bg-muted text-muted-foreground/50 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-input bg-background hover:bg-accent cursor-pointer'
                                }`}
                              >
                                {formatSlotTime(slot.start)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected slot display */}
                  {selectedSlot && (
                    <p className="text-xs text-muted-foreground">
                      Créneau sélectionné:{' '}
                      <span className="font-medium text-foreground">
                        {formatSlotTime(selectedSlot.start)} – {formatSlotTime(selectedSlot.end)}
                      </span>
                    </p>
                  )}

                  {/* Notes textarea */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="Notes pour le rendez-vous..."
                      rows={2}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                    />
                  </div>

                  {/* Submit / Cancel buttons */}
                  <div className="flex gap-2">
                    <HelpTooltip content="Valider et créer le rendez-vous au créneau sélectionné" side="top">
                      <button
                        type="submit"
                        disabled={createAppointmentMutation.isPending || !selectedSlot}
                        className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {createAppointmentMutation.isPending
                          ? 'Planification...'
                          : 'Confirmer le rendez-vous'}
                      </button>
                    </HelpTooltip>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAppointmentForm(false);
                        setSelectedDate('');
                        setSelectedSlot(null);
                        setAppointmentNotes('');
                      }}
                      disabled={createAppointmentMutation.isPending}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Messages</h3>
            <MessageThread ticketId={id!} />
          </div>
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-4">
          {/* Details card */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Détails</h3>
            <div className="text-sm space-y-2">
              <HelpTooltip content="Type de service demandé par le client" side="left">
                <div>
                  <span className="text-muted-foreground">Catégorie:</span>{' '}
                  {SERVICE_CATEGORY_LABELS[t.serviceCategory] || t.serviceCategory}
                </div>
              </HelpTooltip>
              <HelpTooltip content="Mode d'intervention : sur site, à distance ou dépôt en atelier" side="left">
                <div>
                  <span className="text-muted-foreground">Mode:</span>{' '}
                  {SERVICE_MODE_LABELS[t.serviceMode] || t.serviceMode}
                </div>
              </HelpTooltip>
              <div>
                <span className="text-muted-foreground">Créé:</span>{' '}
                {formatDateTime(t.createdAt)}
              </div>
              <div>
                <span className="text-muted-foreground">Modifié:</span>{' '}
                {formatDateTime(t.updatedAt)}
              </div>
            </div>
          </div>

          {/* Client card */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Client</h3>
            <p className="text-sm">
              {t.customer?.firstName} {t.customer?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{t.customer?.email}</p>
          </div>

          {/* Technician card — always allow (re)assignment */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Technicien</h3>
            {t.technician && (
              <p className="text-sm mb-1">
                {t.technician.firstName} {t.technician.lastName}
              </p>
            )}
            <HelpTooltip content="Assigner ou réassigner un technicien à ce billet" side="left">
              <select
                value=""
                onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
                disabled={assignMutation.isPending}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="">
                  {t.technician ? 'Réassigner...' : 'Assigner...'}
                </option>
                {(technicians as User[] | undefined)?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                  </option>
                ))}
              </select>
            </HelpTooltip>
          </div>

          {/* ─── Status Change ─── */}
          {allowedNextStatuses.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Changer le statut</h3>
              <HelpTooltip content="Faire avancer le billet vers l'étape suivante de son cycle de vie" side="left">
                <select
                  value=""
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusMutation.isPending}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
                >
                  <option value="">Sélectionner un statut...</option>
                  {allowedNextStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] || status}
                    </option>
                  ))}
                </select>
              </HelpTooltip>
              {statusMutation.isPending && (
                <p className="text-xs text-muted-foreground">Mise à jour...</p>
              )}
            </div>
          )}

          {/* ─── Send Quote ─── */}
          {canSendQuote && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Envoyer un devis</h3>
                {!showQuoteForm && (
                  <HelpTooltip content="Créer ou modifier le devis à envoyer au client pour approbation" side="left">
                    <button
                      onClick={() => setShowQuoteForm(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      {t.quotedPrice ? 'Modifier' : 'Créer'}
                    </button>
                  </HelpTooltip>
                )}
              </div>

              {showQuoteForm && (
                <form onSubmit={handleQuoteSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Prix ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Description du devis
                    </label>
                    <textarea
                      value={quoteDescription}
                      onChange={(e) => setQuoteDescription(e.target.value)}
                      placeholder="Détails du travail à effectuer..."
                      required
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Durée estimée
                    </label>
                    <input
                      type="text"
                      value={quoteDuration}
                      onChange={(e) => setQuoteDuration(e.target.value)}
                      placeholder="ex: 2 heures, 1 jour..."
                      required
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <HelpTooltip content="Envoyer ce devis au client — il recevra une notification pour l'approuver" side="top">
                      <button
                        type="submit"
                        disabled={quoteMutation.isPending}
                        className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {quoteMutation.isPending ? 'Envoi...' : 'Envoyer le devis'}
                      </button>
                    </HelpTooltip>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuoteForm(false);
                        setQuotedPrice('');
                        setQuoteDescription('');
                        setQuoteDuration('');
                      }}
                      disabled={quoteMutation.isPending}
                      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ─── Blocker Management ─── */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Gestion des blocages</h3>

            {hasBlocker ? (
              <div className="space-y-2">
                <div className="rounded-md bg-red-50 border border-red-200 p-2">
                  <p className="text-xs text-red-700">{t.blockerReason}</p>
                </div>
                <HelpTooltip content="Retirer le blocage et permettre la reprise du travail sur ce billet" side="left">
                  <button
                    onClick={() => removeBlockerMutation.mutate()}
                    disabled={removeBlockerMutation.isPending || anyMutationPending}
                    className="w-full rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {removeBlockerMutation.isPending
                      ? 'Retrait...'
                      : 'Retirer le blocage'}
                  </button>
                </HelpTooltip>
              </div>
            ) : (
              <div className="space-y-2">
                {!showBlockerForm ? (
                  <HelpTooltip content="Signaler un blocage qui empêche l'avancement du billet" side="left">
                    <button
                      onClick={() => setShowBlockerForm(true)}
                      className="w-full rounded-md border border-red-300 bg-background px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Ajouter un blocage
                    </button>
                  </HelpTooltip>
                ) : (
                  <form onSubmit={handleAddBlocker} className="space-y-2">
                    <textarea
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                      placeholder="Raison du blocage..."
                      required
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <HelpTooltip content="Confirmer le blocage — le billet passera en statut Blocage" side="top">
                        <button
                          type="submit"
                          disabled={addBlockerMutation.isPending}
                          className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {addBlockerMutation.isPending
                            ? 'Ajout...'
                            : 'Confirmer le blocage'}
                        </button>
                      </HelpTooltip>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBlockerForm(false);
                          setBlockerReason('');
                        }}
                        disabled={addBlockerMutation.isPending}
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
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
    </div>
  );
}
