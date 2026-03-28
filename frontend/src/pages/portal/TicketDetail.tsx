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
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useTranslation } from '../../lib/i18n/hook';
// Proposal status labels/colors used by StatusBadge (type="proposal")

// Statuses where a customer can book an appointment
const BOOKABLE_STATUSES = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];
const CANCELLABLE_APPOINTMENT_STATUSES = ['PLANIFIE', 'CONFIRME'];

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
  const { t } = useTranslation();

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
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [proposalToCancel, setProposalToCancel] = useState<string | null>(null);

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
      toast.success(t('portal.ticketDetail.approveSuccess'));
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.tickets.declineQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('portal.ticketDetail.declineSuccess'));
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
      toast.success(t('portal.ticketDetail.bookSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.bookError'));
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => api.appointments.cancel(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success(t('portal.ticketDetail.apptCancelled'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.apptCancelError'));
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
      toast.success(t('portal.ticketDetail.proposeSent'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.proposeError'));
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
      toast.success(t('portal.ticketDetail.acceptSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.acceptError'));
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: ({ proposalId, responseMsg }: { proposalId: string; responseMsg?: string }) =>
      api.appointments.proposals.reject(proposalId, responseMsg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      setRespondingTo(null);
      setResponseMessage('');
      toast.success(t('portal.ticketDetail.rejectSuccess'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.rejectError'));
    },
  });

  const cancelProposalMutation = useMutation({
    mutationFn: (proposalId: string) => api.appointments.proposals.cancel(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', 'ticket', id] });
      toast.success(t('portal.ticketDetail.proposalCancelled'));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('portal.ticketDetail.proposalCancelError'));
    },
  });

  if (isLoading) return <div className="text-center py-8">{t('portal.ticketDetail.loading')}</div>;
  if (!ticket) return <div className="text-center py-8">{t('portal.ticketDetail.notFound')}</div>;
  // Renamed from `t` to `tk` to avoid shadowing the translation function
  const tk = ticket as any;

  const canBook = BOOKABLE_STATUSES.includes(tk.status);
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
      toast.error(t('portal.ticketDetail.selectSlotRequired'));
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
      toast.error(t('portal.ticketDetail.selectSlotRequired'));
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
  const canCancelAppointment = (status: string) => CANCELLABLE_APPOINTMENT_STATUSES.includes(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/portail/billets" className="text-sm text-muted-foreground hover:text-foreground">{t('portal.ticketDetail.back')}</Link>
        <h1 className="text-2xl font-bold">{tk.ticketNumber}</h1>
        <HelpTooltip content={t('portal.ticketDetail.statusTooltip')} side="bottom">
          <span><StatusBadge status={tk.status} /></span>
        </HelpTooltip>
      </div>

      {/* Ticket details */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-2">{tk.title}</h2>
          <p className="text-sm whitespace-pre-wrap">{tk.description}</p>
        </CardContent>
      </Card>

      {/* Quote approval */}
      {tk.quotedPrice && tk.status === 'EN_ATTENTE_APPROBATION' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold mb-2">{t('portal.ticketDetail.quoteTitle')}</h3>
          <p className="text-sm mb-1">{t('portal.ticketDetail.quotePrice', { price: formatCurrency(tk.quotedPrice) })}</p>
          <p className="text-sm mb-1">{t('portal.ticketDetail.quoteDuration', { duration: tk.quoteDuration })}</p>
          <p className="text-sm mb-4">{tk.quoteDescription}</p>
          <div className="flex gap-2">
            <HelpTooltip content={t('portal.ticketDetail.approveTooltip')} side="bottom">
              <Button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || declineMutation.isPending}
              >
                {approveMutation.isPending ? t('common.loadingEllipsis') : t('portal.ticketDetail.approve')}
              </Button>
            </HelpTooltip>
            <HelpTooltip content={t('portal.ticketDetail.declineTooltip')} side="bottom">
              <Button
                variant="destructive"
                onClick={() => declineMutation.mutate()}
                disabled={approveMutation.isPending || declineMutation.isPending}
              >
                {declineMutation.isPending ? t('common.loadingEllipsis') : t('portal.ticketDetail.decline')}
              </Button>
            </HelpTooltip>
          </div>
        </div>
      )}

      {/* ─── Active Appointments ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('portal.ticketDetail.activeAppointments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAppointments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('portal.ticketDetail.noActiveAppointments')}
            </div>
          ) : (
            <div className="space-y-3">
              {activeAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between border rounded-md p-3 bg-background">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDateTime(apt.scheduledStart)} — {formatSlotTime(apt.scheduledEnd)}
                    </p>
                    {apt.technician && (
                      <p className="text-xs text-muted-foreground">
                        {t('portal.ticketDetail.techLabel')} {apt.technician.firstName} {apt.technician.lastName}
                      </p>
                    )}
                    {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                    <StatusBadge status={apt.status} type="appointment" />
                  </div>
                  {canCancelAppointment(apt.status) && (
                    <HelpTooltip content={t('portal.ticketDetail.cancelApptTooltip')} side="left">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setAppointmentToCancel(apt.id)}
                        disabled={cancelAppointmentMutation.isPending}
                      >
                        {cancelAppointmentMutation.isPending ? t('common.loadingEllipsis') : t('portal.ticketDetail.cancelAppt')}
                      </Button>
                    </HelpTooltip>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Past Appointments ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">{t('portal.ticketDetail.pastAppointments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {pastAppointments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('portal.ticketDetail.noPastAppointments')}
            </div>
          ) : (
            <div className="space-y-2">
              {pastAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between border rounded-md p-3 bg-background opacity-60">
                  <div>
                    <p className="text-sm">
                      {formatDateTime(apt.scheduledStart)} — {formatSlotTime(apt.scheduledEnd)}
                    </p>
                    <StatusBadge status={apt.status} type="appointment" />
                    {apt.cancelReason && (
                      <p className="text-xs text-red-600 mt-1">{t('portal.ticketDetail.cancelReason', { reason: apt.cancelReason })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Proposals Section ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('portal.ticketDetail.proposals')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {myProposals.length === 0 && counterProposals.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('portal.ticketDetail.noProposals')}
            </div>
          ) : (
            <>

          {/* My proposals */}
          {myProposals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('portal.ticketDetail.myProposals')}</h4>
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
                            <span className="font-medium">{t('portal.ticketDetail.proposalResponse')}</span>{' '}
                            <span className="text-muted-foreground">{proposal.responseMessage}</span>
                          </p>
                        )}
                        {proposal.respondedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('portal.ticketDetail.proposalRespondedBy', { name: `${proposal.respondedBy.firstName} ${proposal.respondedBy.lastName}` })}
                          </p>
                        )}
                      </div>
                      {proposal.status === 'PROPOSEE' && (
                        <HelpTooltip content={t('portal.ticketDetail.cancelProposalTooltip')} side="left">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setProposalToCancel(proposal.id)}
                            disabled={cancelProposalMutation.isPending}
                            className="shrink-0"
                          >
                            {cancelProposalMutation.isPending ? t('common.loadingEllipsis') : t('portal.ticketDetail.cancelProposal')}
                          </Button>
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
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('portal.ticketDetail.counterProposals')}</h4>
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
                          {t('portal.ticketDetail.proposedBy', { name: `${proposal.proposedBy.firstName} ${proposal.proposedBy.lastName}` })}
                        </p>
                        {proposal.message && (
                          <p className="text-xs text-muted-foreground mt-1">{proposal.message}</p>
                        )}
                        {proposal.responseMessage && (
                          <p className="text-xs mt-1">
                            <span className="font-medium">{t('portal.ticketDetail.yourResponse')}</span>{' '}
                            <span className="text-muted-foreground">{proposal.responseMessage}</span>
                          </p>
                        )}
                      </div>
                      {proposal.status === 'PROPOSEE' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          {respondingTo === proposal.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={responseMessage}
                                onChange={(e) => setResponseMessage(e.target.value)}
                                placeholder={t('portal.ticketDetail.respondPlaceholder')}
                                rows={2}
                                className="w-48 text-xs resize-none"
                              />
                              <div className="flex gap-1">
                                <HelpTooltip content={t('portal.ticketDetail.confirmAcceptTooltip')} side="bottom">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      acceptProposalMutation.mutate({
                                        proposalId: proposal.id,
                                        responseMsg: responseMessage.trim() || undefined,
                                      })
                                    }
                                    disabled={acceptProposalMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-xs"
                                  >
                                    {t('portal.ticketDetail.confirmAccept')}
                                  </Button>
                                </HelpTooltip>
                                <HelpTooltip content={t('portal.ticketDetail.rejectTooltip')} side="bottom">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      rejectProposalMutation.mutate({
                                        proposalId: proposal.id,
                                        responseMsg: responseMessage.trim() || undefined,
                                      })
                                    }
                                    disabled={rejectProposalMutation.isPending}
                                    className="text-xs"
                                  >
                                    {t('portal.ticketDetail.reject')}
                                  </Button>
                                </HelpTooltip>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRespondingTo(null);
                                    setResponseMessage('');
                                  }}
                                  className="text-xs"
                                >
                                  {t('portal.ticketDetail.backButton')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <HelpTooltip content={t('portal.ticketDetail.acceptProposalTooltip')} side="left">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRespondingTo(proposal.id);
                                    setResponseMessage('');
                                  }}
                                  className="text-green-700 bg-green-100 hover:bg-green-200 border-green-200 text-xs"
                                >
                                  {t('portal.ticketDetail.acceptProposal')}
                                </Button>
                              </HelpTooltip>
                              <HelpTooltip content={t('portal.ticketDetail.rejectProposalTooltip')} side="left">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRespondingTo(proposal.id);
                                    setResponseMessage('');
                                  }}
                                  className="text-red-700 bg-red-100 hover:bg-red-200 border-red-200 text-xs"
                                >
                                  {t('portal.ticketDetail.rejectProposal')}
                                </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Appointment Booking / Proposal Section ─── */}
      {canBook && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t('portal.ticketDetail.bookTitle')}</h3>
              {!showBooking && (
                <HelpTooltip content={t('portal.ticketDetail.chooseSlotTooltip')} side="left">
                  <Button
                    onClick={() => setShowBooking(true)}
                  >
                    {t('portal.ticketDetail.chooseSlot')}
                  </Button>
                </HelpTooltip>
              )}
            </div>

          {showBooking && (
            <div className="space-y-4">
              {/* Tab selector: propose vs direct booking */}
              <div className="flex border-b border-input">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBookingTab('propose');
                    setSelectedSlot(null);
                  }}
                  className={`rounded-none border-b-2 transition-colors ${
                    bookingTab === 'propose'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('portal.ticketDetail.tabPropose')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBookingTab('direct');
                    setSelectedSlot(null);
                  }}
                  className={`rounded-none border-b-2 transition-colors ${
                    bookingTab === 'direct'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('portal.ticketDetail.tabDirect')}
                </Button>
              </div>

              {/* Tab description */}
              <p className="text-xs text-muted-foreground">
                {bookingTab === 'propose'
                  ? t('portal.ticketDetail.tabProposeDesc')
                  : t('portal.ticketDetail.tabDirectDesc')}
              </p>

              {/* Date picker */}
              <div>
                <Label className="mb-1">{t('portal.ticketDetail.dateLabel')}</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Slots grid */}
              <div>
                <Label className="mb-2">
                  {t('portal.ticketDetail.slotsLabel')}
                  {slotsLoading && <span className="text-muted-foreground ml-2 font-normal">{t('portal.ticketDetail.slotsLoading')}</span>}
                </Label>

                {!slotsLoading && availableSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('portal.ticketDetail.slotsEmpty')}
                  </p>
                )}

                {!slotsLoading && availableSlots.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.map((slot: any) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <Button
                          key={slot.start}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {formatSlotTime(slot.start)}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected slot summary */}
              {selectedSlot && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm font-medium text-blue-800">
                    {t('portal.ticketDetail.selectedSlot', { time: `${formatSlotTime(selectedSlot.start)} — ${formatSlotTime(selectedSlot.end)}` })}
                  </p>
                </div>
              )}

              {/* Notes / Message */}
              {bookingTab === 'propose' ? (
                <div>
                  <Label className="mb-1">{t('portal.ticketDetail.messageLabel')}</Label>
                  <Textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder={t('portal.ticketDetail.messagePlaceholder')}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              ) : (
                <div>
                  <Label className="mb-1">{t('portal.ticketDetail.notesLabel')}</Label>
                  <Textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder={t('portal.ticketDetail.notesPlaceholder')}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {bookingTab === 'propose' ? (
                  <HelpTooltip content={t('portal.ticketDetail.proposeTooltip')} side="top">
                    <Button
                      onClick={handleProposeSlot}
                      disabled={!selectedSlot || createProposalMutation.isPending}
                    >
                      {createProposalMutation.isPending ? t('portal.ticketDetail.proposeSending') : t('portal.ticketDetail.proposeSlot')}
                    </Button>
                  </HelpTooltip>
                ) : (
                  <HelpTooltip content={t('portal.ticketDetail.bookTooltip')} side="top">
                    <Button
                      onClick={handleBookSlot}
                      disabled={!selectedSlot || bookAppointmentMutation.isPending}
                    >
                      {bookAppointmentMutation.isPending ? t('portal.ticketDetail.bookSending') : t('portal.ticketDetail.bookSlot')}
                    </Button>
                  </HelpTooltip>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBooking(false);
                    setSelectedSlot(null);
                    setBookingNotes('');
                    setProposalMessage('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* ─── Attachments Section ─── */}
      <AttachmentSection ticketId={id!} canUpload={true} isAdmin={false} />

      <ConfirmDialog
        open={!!appointmentToCancel}
        onOpenChange={(open) => {
          if (!open) setAppointmentToCancel(null);
        }}
        title={t('appointment.cancelConfirmTitle')}
        description={t('appointment.cancelConfirmDescription')}
        confirmLabel={t('portal.ticketDetail.cancelAppt')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (appointmentToCancel) {
            cancelAppointmentMutation.mutate(appointmentToCancel);
          }
        }}
      />

      <ConfirmDialog
        open={!!proposalToCancel}
        onOpenChange={(open) => {
          if (!open) setProposalToCancel(null);
        }}
        title={t('portal.ticketDetail.cancelProposalConfirmTitle')}
        description={t('portal.ticketDetail.cancelProposalConfirmDescription')}
        confirmLabel={t('portal.ticketDetail.cancelProposal')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (proposalToCancel) {
            cancelProposalMutation.mutate(proposalToCancel);
          }
        }}
      />

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('portal.ticketDetail.messages')}</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread ticketId={id!} />
        </CardContent>
      </Card>
    </div>
  );
}
