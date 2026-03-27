import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type AppointmentProposal } from '../../api/client';
import StatusBadge from '../../components/shared/StatusBadge';
import MessageThread from '../../components/shared/MessageThread';
import AttachmentSection from '../../components/shared/AttachmentSection';
import { useAuth } from '../../hooks/use-auth';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import HelpTooltip from '../../components/shared/HelpTooltip';
// Proposal status labels/colors used by StatusBadge (type="proposal")

// Statuses where a customer can book an appointment
const BOOKABLE_STATUSES = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];

function formatSlotTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

type BookingTab = 'propose' | 'direct';

export default function PortalTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // ─── Appointment booking state ───
  const [showBooking, setShowBooking] = useState(false);
  const [bookingTab, setBookingTab] = useState<BookingTab>('propose');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]!;
  });
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');

  // ─── Proposal response state ───
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  // ─── Queries ───
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.get(id!),
    enabled: !!id,
  });

  const { data: existingAppointments } = useQuery({
    queryKey: ['appointments', 'ticket', id],
    queryFn: () => api.appointments.list({ ticketId: id }),
    enabled: !!id,
  });

  const { data: proposals } = useQuery({
    queryKey: ['proposals', 'ticket', id],
    queryFn: () => api.appointments.proposals.list(id!),
    enabled: !!id,
  });

  const { data: slots, isFetching: slotsLoading } = useQuery({
    queryKey: ['availability', selectedDate],
    queryFn: () => api.appointments.availability(selectedDate),
    enabled: showBooking && !!selectedDate,
  });

  // ─── Mutations ───
  const approveMutation = useMutation({
    mutationFn: () => api.tickets.approveQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Devis approuve');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.tickets.declineQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Devis refuse');
    },
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: (data: { ticketId: string; scheduledStart: string; scheduledEnd: string; notes?: string }) =>
      api.appointments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'ticket', id] });
      setShowBooking(false);
      setSelectedSlot(null);
      setBookingNotes('');
      toast.success('Rendez-vous reserve avec succes!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la reservation');
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => api.appointments.cancel(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Rendez-vous annule');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'annulation');
    },
  });

  // ─── Proposal Mutations ───
  const createProposalMutation = useMutation({
    mutationFn: (data: { ticketId: string; proposedStart: string; proposedEnd: string; message?: string }) =>
      api.appointments.proposals.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      setShowBooking(false);
      setSelectedSlot(null);
      setProposalMessage('');
      toast.success('Proposition envoyee!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'envoi de la proposition');
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMsg }: { proposalId: string; responseMsg?: string }) =>
      api.appointments.proposals.accept(proposalId, responseMsg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setRespondingTo(null);
      setResponseMessage('');
      toast.success('Proposition acceptee! Le rendez-vous a ete cree.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'acceptation');
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMsg }: { proposalId: string; responseMsg?: string }) =>
      api.appointments.proposals.reject(proposalId, responseMsg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      setRespondingTo(null);
      setResponseMessage('');
      toast.success('Proposition refusee.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors du refus');
    },
  });

  const cancelProposalMutation = useMutation({
    mutationFn: (proposalId: string) => api.appointments.proposals.cancel(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      toast.success('Proposition annulee.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'annulation');
    },
  });

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (!ticket) return <div className="text-center py-8">Billet introuvable</div>;
  const t = ticket as any;

  const canBook = BOOKABLE_STATUSES.includes(t.status);
  const activeAppointments = ((existingAppointments as any[]) || []).filter(
    (a: any) => a.status !== 'ANNULE' && a.status !== 'TERMINE'
  );
  const pastAppointments = ((existingAppointments as any[]) || []).filter(
    (a: any) => a.status === 'ANNULE' || a.status === 'TERMINE'
  );

  // Split proposals into mine vs counter-proposals from admin/tech
  const allProposals = ((proposals as any[]) || []) as AppointmentProposal[];
  const myProposals = allProposals.filter(
    (p) => user && p.proposedById === user.id
  );
  const counterProposals = allProposals.filter(
    (p) => user && p.proposedById !== user.id
  );

  const handleBookSlot = () => {
    if (!selectedSlot) {
      toast.error('Veuillez selectionner un creneau');
      return;
    }
    bookAppointmentMutation.mutate({
      ticketId: id!,
      scheduledStart: selectedSlot.start,
      scheduledEnd: selectedSlot.end,
      notes: bookingNotes.trim() || undefined,
    });
  };

  const handleProposeSlot = () => {
    if (!selectedSlot) {
      toast.error('Veuillez selectionner un creneau');
      return;
    }
    createProposalMutation.mutate({
      ticketId: id!,
      proposedStart: selectedSlot.start,
      proposedEnd: selectedSlot.end,
      message: proposalMessage.trim() || undefined,
    });
  };

  const availableSlots = (slots || []).filter((s: any) => s.available);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/portail/billets" className="text-sm text-muted-foreground hover:text-foreground">&larr; Retour</Link>
        <h1 className="text-2xl font-bold">{t.ticketNumber}</h1>
        <HelpTooltip content="Statut actuel de votre demande" side="bottom">
          <span><StatusBadge status={t.status} /></span>
        </HelpTooltip>
      </div>

      {/* Ticket details */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="font-semibold mb-2">{t.title}</h2>
        <p className="text-sm whitespace-pre-wrap">{t.description}</p>
      </div>

      {/* Quote approval */}
      {t.quotedPrice && t.status === 'EN_ATTENTE_APPROBATION' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Devis en attente d'approbation</h3>
          <p className="text-sm mb-1">Prix: {formatCurrency(t.quotedPrice)}</p>
          <p className="text-sm mb-1">Duree: {t.quoteDuration}</p>
          <p className="text-sm mb-4">{t.quoteDescription}</p>
          <div className="flex gap-2">
            <HelpTooltip content="Accepter le devis et autoriser les travaux" side="bottom">
              <button onClick={() => approveMutation.mutate()} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">Approuver</button>
            </HelpTooltip>
            <HelpTooltip content="Refuser le devis — le billet sera mis à jour" side="bottom">
              <button onClick={() => declineMutation.mutate()} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Refuser</button>
            </HelpTooltip>
          </div>
        </div>
      )}

      {/* ─── Active Appointments ─── */}
      {activeAppointments.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Rendez-vous actifs</h3>
          <div className="space-y-3">
            {activeAppointments.map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between border rounded-md p-3 bg-background">
                <div>
                  <p className="text-sm font-medium">
                    {formatDateTime(apt.scheduledStart)} — {formatSlotTime(apt.scheduledEnd)}
                  </p>
                  {apt.technician && (
                    <p className="text-xs text-muted-foreground">
                      Technicien: {apt.technician.firstName} {apt.technician.lastName}
                    </p>
                  )}
                  {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                  <StatusBadge status={apt.status} type="appointment" />
                </div>
                <HelpTooltip content="Annuler ce rendez-vous" side="left">
                  <button
                    onClick={() => cancelAppointmentMutation.mutate(apt.id)}
                    disabled={cancelAppointmentMutation.isPending}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </HelpTooltip>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Past Appointments ─── */}
      {pastAppointments.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-4 text-muted-foreground">Rendez-vous passes</h3>
          <div className="space-y-2">
            {pastAppointments.map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between border rounded-md p-3 bg-background opacity-60">
                <div>
                  <p className="text-sm">
                    {formatDateTime(apt.scheduledStart)} — {formatSlotTime(apt.scheduledEnd)}
                  </p>
                  <StatusBadge status={apt.status} type="appointment" />
                  {apt.cancelReason && (
                    <p className="text-xs text-red-600 mt-1">Raison: {apt.cancelReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Proposals Section ─── */}
      {(myProposals.length > 0 || counterProposals.length > 0) && (
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h3 className="font-semibold">Propositions de rendez-vous</h3>

          {/* My proposals */}
          {myProposals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Mes propositions</h4>
              <div className="space-y-3">
                {myProposals.map((proposal) => (
                  <div key={proposal.id} className="border rounded-md p-3 bg-background">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={proposal.status} type="proposal" />
                          <span className="text-sm font-medium">
                            {formatDateTime(proposal.proposedStart)} — {formatSlotTime(proposal.proposedEnd)}
                          </span>
                        </div>
                        {proposal.message && (
                          <p className="text-xs text-muted-foreground mt-1">{proposal.message}</p>
                        )}
                        {proposal.responseMessage && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">Reponse:</span>{' '}
                            <span className="text-muted-foreground">{proposal.responseMessage}</span>
                          </p>
                        )}
                        {proposal.respondedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Repondu par: {proposal.respondedBy.firstName} {proposal.respondedBy.lastName}
                          </p>
                        )}
                      </div>
                      {proposal.status === 'PROPOSEE' && (
                        <HelpTooltip content="Annuler cette proposition en attente" side="left">
                          <button
                            onClick={() => cancelProposalMutation.mutate(proposal.id)}
                            disabled={cancelProposalMutation.isPending}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 shrink-0"
                          >
                            Annuler
                          </button>
                        </HelpTooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counter-proposals from admin/tech */}
          {counterProposals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Contre-propositions</h4>
              <div className="space-y-3">
                {counterProposals.map((proposal) => (
                  <div key={proposal.id} className="border rounded-md p-3 bg-background">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={proposal.status} type="proposal" />
                          <span className="text-sm font-medium">
                            {formatDateTime(proposal.proposedStart)} — {formatSlotTime(proposal.proposedEnd)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Propose par: {proposal.proposedBy.firstName} {proposal.proposedBy.lastName}
                        </p>
                        {proposal.message && (
                          <p className="text-xs text-muted-foreground mt-1">{proposal.message}</p>
                        )}
                        {proposal.responseMessage && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">Votre reponse:</span>{' '}
                            <span className="text-muted-foreground">{proposal.responseMessage}</span>
                          </p>
                        )}
                      </div>
                      {proposal.status === 'PROPOSEE' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          {respondingTo === proposal.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                placeholder="Message (optionnel)..."
                                rows={2}
                                className="w-48 rounded-md border border-input bg-background px-2 py-1 text-xs resize-none"
                              />
                              <div className="flex gap-1">
                                <HelpTooltip content="Confirmer l'acceptation de cette contre-proposition" side="bottom">
                                  <button
                                    onClick={() =>
                                      acceptProposalMutation.mutate({
                                        proposalId: proposal.id,
                                        responseMsg: responseMessage.trim() || undefined,
                                      })
                                    }
                                    disabled={acceptProposalMutation.isPending}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                  >
                                    Confirmer
                                  </button>
                                </HelpTooltip>
                                <HelpTooltip content="Refuser cette contre-proposition" side="bottom">
                                  <button
                                    onClick={() =>
                                      rejectProposalMutation.mutate({
                                        proposalId: proposal.id,
                                        responseMsg: responseMessage.trim() || undefined,
                                      })
                                    }
                                    disabled={rejectProposalMutation.isPending}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Refuser
                                  </button>
                                </HelpTooltip>
                                <button
                                  onClick={() => {
                                    setRespondingTo(null);
                                    setResponseMessage('');
                                  }}
                                  className="px-2 py-1 text-xs border border-input rounded-md hover:bg-accent"
                                >
                                  Retour
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <HelpTooltip content="Accepter cette contre-proposition et créer un rendez-vous" side="left">
                                <button
                                  onClick={() => {
                                    setRespondingTo(proposal.id);
                                    setResponseMessage('');
                                  }}
                                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                                >
                                  Accepter
                                </button>
                              </HelpTooltip>
                              <HelpTooltip content="Refuser cette contre-proposition" side="left">
                                <button
                                  onClick={() => {
                                    setRespondingTo(proposal.id);
                                    setResponseMessage('');
                                  }}
                                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                >
                                  Refuser
                                </button>
                              </HelpTooltip>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Appointment Booking / Proposal Section ─── */}
      {canBook && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Prendre un rendez-vous</h3>
            {!showBooking && (
              <HelpTooltip content="Ouvrir le sélecteur de créneaux pour prendre rendez-vous" side="left">
                <button
                  onClick={() => setShowBooking(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                >
                  Choisir un creneau
                </button>
              </HelpTooltip>
            )}
          </div>

          {showBooking && (
            <div className="space-y-4">
              {/* Tab selector: propose vs direct booking */}
              <div className="flex border-b border-input">
                <button
                  onClick={() => {
                    setBookingTab('propose');
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    bookingTab === 'propose'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Proposer un creneau
                </button>
                <button
                  onClick={() => {
                    setBookingTab('direct');
                    setSelectedSlot(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    bookingTab === 'direct'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Reserver directement
                </button>
              </div>

              {/* Tab description */}
              <p className="text-xs text-muted-foreground">
                {bookingTab === 'propose'
                  ? 'Proposez un creneau au technicien. Il pourra accepter, refuser ou faire une contre-proposition.'
                  : 'Reservez directement un creneau disponible sans passer par la negociation.'}
              </p>

              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium mb-1">Date souhaitee</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {/* Slots grid */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Creneaux disponibles
                  {slotsLoading && <span className="text-muted-foreground ml-2">Chargement...</span>}
                </label>

                {!slotsLoading && availableSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun creneau disponible pour cette date. Essayez une autre date.
                  </p>
                )}

                {!slotsLoading && availableSlots.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.map((slot: any) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-input hover:bg-accent'
                          }`}
                        >
                          {formatSlotTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected slot summary */}
              {selectedSlot && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm font-medium text-blue-800">
                    Creneau selectionne: {formatSlotTime(selectedSlot.start)} — {formatSlotTime(selectedSlot.end)}
                  </p>
                </div>
              )}

              {/* Notes / Message */}
              {bookingTab === 'propose' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
                  <textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="Ajoutez un message pour le technicien..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Informations complementaires..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {bookingTab === 'propose' ? (
                  <HelpTooltip content="Envoyer cette proposition de créneau au technicien" side="top">
                    <button
                      onClick={handleProposeSlot}
                      disabled={!selectedSlot || createProposalMutation.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {createProposalMutation.isPending ? 'Envoi...' : 'Proposer ce creneau'}
                    </button>
                  </HelpTooltip>
                ) : (
                  <HelpTooltip content="Réserver directement ce créneau sans négociation" side="top">
                    <button
                      onClick={handleBookSlot}
                      disabled={!selectedSlot || bookAppointmentMutation.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      {bookAppointmentMutation.isPending ? 'Reservation...' : 'Reserver ce creneau'}
                    </button>
                  </HelpTooltip>
                )}
                <button
                  onClick={() => {
                    setShowBooking(false);
                    setSelectedSlot(null);
                    setBookingNotes('');
                    setProposalMessage('');
                  }}
                  className="px-4 py-2 border border-input rounded-md text-sm hover:bg-accent"
                >
                  Annuler
                </button>
              </div>
            </div>
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
  );
}
