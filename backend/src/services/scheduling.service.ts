import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { CreateAppointmentInput, UpdateAppointmentInput, CreateProposalInput, RespondProposalInput } from '../validations/appointment.js';
import type { AppointmentStatus, UserRole, TicketStatus } from '@prisma/client';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import { sendEmail } from './email.service.js';
import { sendSms } from './sms.service.js';
import { logger } from '../lib/logger.js';

const APPOINTMENT_INCLUDE = {
  ticket: { select: { id: true, ticketNumber: true, title: true, status: true } },
  technician: { select: { id: true, firstName: true, lastName: true, email: true } },
};

const PROPOSAL_INCLUDE = {
  ticket: { select: { id: true, ticketNumber: true, title: true, status: true } },
  proposedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  respondedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  parent: { select: { id: true, proposedStart: true, proposedEnd: true, status: true } },
  replies: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      proposedStart: true,
      proposedEnd: true,
      message: true,
      status: true,
      proposedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      createdAt: true,
    },
  },
};

// Statuses that allow appointment creation
const APPOINTABLE_STATUSES: TicketStatus[] = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];

// Statuses that allow proposal creation (slightly broader - includes APPROUVEE before scheduling)
const PROPOSABLE_STATUSES: TicketStatus[] = ['APPROUVEE', 'PLANIFIEE', 'EN_COURS'];

// ─── Appointment CRUD ───

export async function createAppointment(data: CreateAppointmentInput, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: data.ticketId, deletedAt: null },
    include: { customer: { select: { id: true } } },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable');

  // Validate ticket is in an appointable status
  if (!APPOINTABLE_STATUSES.includes(ticket.status as TicketStatus)) {
    throw AppError.badRequest(
      `Impossible de créer un rendez-vous pour un billet au statut ${ticket.status}. ` +
      `Statuts autorisés: ${APPOINTABLE_STATUSES.join(', ')}`
    );
  }

  // Validate ownership: customers can only create appointments for their own tickets
  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden('Vous ne pouvez créer un rendez-vous que pour vos propres billets');
  }

  const techId = data.technicianId || ticket.technicianId;

  // Check for conflicts
  if (techId) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        technicianId: techId,
        deletedAt: null,
        status: { notIn: ['ANNULE', 'TERMINE'] },
        AND: [
          { scheduledStart: { lt: new Date(data.scheduledEnd) } },
          { scheduledEnd: { gt: new Date(data.scheduledStart) } },
        ],
      },
    });
    if (conflict) throw AppError.conflict('Le technicien a deja un rendez-vous a cette heure');
  }

  const appointment = await prisma.appointment.create({
    data: {
      ticketId: data.ticketId,
      technicianId: techId,
      scheduledStart: new Date(data.scheduledStart),
      scheduledEnd: new Date(data.scheduledEnd),
      travelBuffer: data.travelBuffer || 0,
      notes: data.notes,
    },
    include: APPOINTMENT_INCLUDE,
  });

  // Auto-transition ticket to PLANIFIEE if currently APPROUVEE
  if (ticket.status === 'APPROUVEE') {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'PLANIFIEE' },
    });
  }

  // Fire-and-forget: email and SMS customer about the confirmed appointment
  if (ticket.customerId) {
    const scheduledDate = new Date(data.scheduledStart).toLocaleDateString('fr-CA');
    const scheduledTime = new Date(data.scheduledStart).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

    prisma.user.findUnique({ where: { id: ticket.customerId }, select: { email: true, phone: true, firstName: true } })
      .then(customer => {
        if (customer?.email) {
          sendEmail({
            to: customer.email,
            subject: `Rendez-vous confirmé — Billet ${ticket.ticketNumber}`,
            body: `Bonjour ${customer.firstName},\n\nUn rendez-vous a été planifié pour votre billet ${ticket.ticketNumber}.\n\nDate: ${scheduledDate}\nHeure: ${scheduledTime}\n\nMerci!`,
          }).catch(err => logger.error({ err }, 'Failed to send appointment created email'));
        }
        if (customer?.phone) {
          sendSms({
            to: customer.phone,
            message: `Valitek — Rendez-vous planifié pour le ${scheduledDate} à ${scheduledTime} (billet ${ticket.ticketNumber}).`,
          }).catch(err => logger.error({ err }, 'Failed to send appointment created SMS'));
        }
      }).catch(() => {});
  }

  return appointment;
}

export async function getAppointments(query: any, userId: string, role: UserRole) {
  const { page, limit, skip } = getPagination({ page: query.page || 1, limit: query.limit || 20 });

  const where: any = { deletedAt: null };

  if (role === 'CUSTOMER') {
    where.ticket = { customerId: userId, deletedAt: null };
  } else if (role === 'TECHNICIAN') {
    where.technicianId = userId;
  }

  if (query.ticketId) where.ticketId = query.ticketId;
  if (query.technicianId) where.technicianId = query.technicianId;
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.scheduledStart = {};
    if (query.from) where.scheduledStart.gte = new Date(query.from);
    if (query.to) where.scheduledStart.lte = new Date(query.to);
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: { scheduledStart: 'asc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return buildPaginatedResponse(appointments, total, page, limit);
}

export async function getAppointmentById(id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    include: APPOINTMENT_INCLUDE,
  });
  if (!appointment) throw AppError.notFound('Rendez-vous introuvable');
  return appointment;
}

export async function updateAppointment(id: string, data: UpdateAppointmentInput) {
  const appointment = await getAppointmentById(id);

  const updateData: any = {};
  if (data.scheduledStart) updateData.scheduledStart = new Date(data.scheduledStart);
  if (data.scheduledEnd) updateData.scheduledEnd = new Date(data.scheduledEnd);
  if (data.travelBuffer !== undefined) updateData.travelBuffer = data.travelBuffer;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.technicianId) updateData.technicianId = data.technicianId;

  return prisma.appointment.update({
    where: { id },
    data: updateData,
    include: APPOINTMENT_INCLUDE,
  });
}

export async function cancelAppointment(id: string, userId?: string, role?: UserRole, reason?: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...APPOINTMENT_INCLUDE,
      ticket: { select: { id: true, ticketNumber: true, title: true, status: true, customerId: true } },
    },
  });
  if (!appointment) throw AppError.notFound('Rendez-vous introuvable');

  // Customers can only cancel appointments on their own tickets
  if (role === 'CUSTOMER' && appointment.ticket.customerId !== userId) {
    throw AppError.forbidden('Vous ne pouvez annuler que vos propres rendez-vous');
  }

  return prisma.appointment.update({
    where: { id },
    data: { status: 'ANNULE', cancelReason: reason || null },
    include: APPOINTMENT_INCLUDE,
  });
}

export async function changeAppointmentStatus(id: string, status: AppointmentStatus, cancelReason?: string) {
  const appointment = await getAppointmentById(id);

  const data: any = { status };
  if (status === 'ANNULE' && cancelReason) {
    data.cancelReason = cancelReason;
  }

  return prisma.appointment.update({
    where: { id },
    data,
    include: APPOINTMENT_INCLUDE,
  });
}

export async function getAvailability(date: string, technicianId?: string, duration: number = 60) {
  const dayStart = new Date(`${date}T08:00:00`);
  const dayEnd = new Date(`${date}T18:00:00`);

  const where: any = {
    deletedAt: null,
    status: { notIn: ['ANNULE', 'TERMINE'] },
    scheduledStart: { gte: dayStart, lte: dayEnd },
  };
  if (technicianId) where.technicianId = technicianId;

  const existingAppointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledStart: 'asc' },
    select: { scheduledStart: true, scheduledEnd: true, travelBuffer: true, technicianId: true },
  });

  // Generate available slots (every 30 min from 8:00 to 18:00)
  const slots: Array<{ start: string; end: string; available: boolean }> = [];
  const slotInterval = 30; // minutes
  const current = new Date(dayStart);

  while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + duration * 60000);

    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledStart).getTime() - (apt.travelBuffer * 60000);
      const aptEnd = new Date(apt.scheduledEnd).getTime();
      return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart;
    });

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !hasConflict,
    });

    current.setMinutes(current.getMinutes() + slotInterval);
  }

  return slots;
}

// ─── Day Schedule (for inline calendar view) ───

export async function getDaySchedule(date: string, technicianId?: string) {
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const where: any = {
    deletedAt: null,
    status: { notIn: ['ANNULE'] },
    scheduledStart: { gte: dayStart, lte: dayEnd },
  };
  if (technicianId) where.technicianId = technicianId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      ticket: { select: { id: true, ticketNumber: true, title: true, status: true } },
      technician: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledStart: 'asc' },
  });

  return appointments;
}

// ─── Proposal CRUD ───

export async function createProposal(data: CreateProposalInput, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: data.ticketId, deletedAt: null },
    include: { customer: { select: { id: true } } },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable');

  // Validate ticket status allows proposals
  if (!PROPOSABLE_STATUSES.includes(ticket.status as TicketStatus)) {
    throw AppError.badRequest(
      `Impossible de proposer un rendez-vous pour un billet au statut ${ticket.status}. ` +
      `Statuts autorisés: ${PROPOSABLE_STATUSES.join(', ')}`
    );
  }

  // Customer can only propose for own tickets
  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden('Vous ne pouvez proposer un rendez-vous que pour vos propres billets');
  }

  // If this is a counter-proposal, validate parent exists and is in PROPOSEE status
  if (data.parentId) {
    const parent = await prisma.appointmentProposal.findFirst({
      where: { id: data.parentId, deletedAt: null },
    });
    if (!parent) throw AppError.notFound('Proposition parente introuvable');
    if (parent.ticketId !== data.ticketId) {
      throw AppError.badRequest('La proposition parente doit concerner le même billet');
    }
  }

  const proposal = await prisma.appointmentProposal.create({
    data: {
      ticketId: data.ticketId,
      proposedById: userId,
      proposedStart: new Date(data.proposedStart),
      proposedEnd: new Date(data.proposedEnd),
      message: data.message || null,
      parentId: data.parentId || null,
    },
    include: PROPOSAL_INCLUDE,
  });

  return proposal;
}

export async function getProposals(ticketId: string, status?: string, userId?: string, role?: UserRole) {
  const where: any = { ticketId, deletedAt: null };
  if (status) where.status = status;

  // Customers only see proposals for their own tickets
  if (role === 'CUSTOMER') {
    where.ticket = { customerId: userId, deletedAt: null };
  }

  const proposals = await prisma.appointmentProposal.findMany({
    where,
    include: PROPOSAL_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  return proposals;
}

export async function acceptProposal(proposalId: string, data: RespondProposalInput, userId: string, role: UserRole) {
  const proposal = await prisma.appointmentProposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: {
      ticket: { select: { id: true, ticketNumber: true, title: true, status: true, customerId: true, technicianId: true } },
    },
  });
  if (!proposal) throw AppError.notFound('Proposition introuvable');
  if (proposal.status !== 'PROPOSEE') {
    throw AppError.badRequest('Cette proposition a déjà été traitée');
  }

  // Validate who can accept:
  // - If customer proposed, admin/tech can accept
  // - If admin/tech proposed (counter-proposal), customer can accept
  if (role === 'CUSTOMER' && proposal.proposedById === userId) {
    throw AppError.forbidden('Vous ne pouvez pas accepter votre propre proposition');
  }
  if ((role === 'ADMIN' || role === 'TECHNICIAN') && proposal.proposedById === userId) {
    throw AppError.forbidden('Vous ne pouvez pas accepter votre propre proposition');
  }

  // Customer can only accept proposals on their own tickets
  if (role === 'CUSTOMER' && proposal.ticket.customerId !== userId) {
    throw AppError.forbidden('Vous ne pouvez accepter que les propositions concernant vos propres billets');
  }

  const techId = proposal.ticket.technicianId;

  // Check for tech conflicts before accepting
  if (techId) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        technicianId: techId,
        deletedAt: null,
        status: { notIn: ['ANNULE', 'TERMINE'] },
        AND: [
          { scheduledStart: { lt: proposal.proposedEnd } },
          { scheduledEnd: { gt: proposal.proposedStart } },
        ],
      },
    });
    if (conflict) {
      throw AppError.conflict('Le technicien a déjà un rendez-vous à cette heure. Veuillez contre-proposer un autre créneau.');
    }
  }

  // Transaction: update proposal + create appointment + update ticket status
  const result = await prisma.$transaction(async (tx) => {
    // Mark proposal as accepted
    const updatedProposal = await tx.appointmentProposal.update({
      where: { id: proposalId },
      data: {
        status: 'ACCEPTEE',
        respondedById: userId,
        respondedAt: new Date(),
        responseMessage: data.responseMessage || null,
      },
      include: PROPOSAL_INCLUDE,
    });

    // Cancel any other pending proposals for this ticket
    await tx.appointmentProposal.updateMany({
      where: {
        ticketId: proposal.ticketId,
        id: { not: proposalId },
        status: 'PROPOSEE',
        deletedAt: null,
      },
      data: { status: 'ANNULEE' },
    });

    // Create the actual appointment from the proposal
    const appointment = await tx.appointment.create({
      data: {
        ticketId: proposal.ticketId,
        technicianId: techId,
        scheduledStart: proposal.proposedStart,
        scheduledEnd: proposal.proposedEnd,
        proposalId: proposalId,
        notes: proposal.message || undefined,
      },
      include: APPOINTMENT_INCLUDE,
    });

    // Auto-transition ticket to PLANIFIEE if currently APPROUVEE
    if (proposal.ticket.status === 'APPROUVEE') {
      await tx.ticket.update({
        where: { id: proposal.ticketId },
        data: { status: 'PLANIFIEE' },
      });
    }

    return { proposal: updatedProposal, appointment };
  });

  // Fire-and-forget: SMS and email the customer that their appointment is confirmed
  if (proposal.ticket.customerId) {
    const scheduledDate = proposal.proposedStart.toLocaleDateString('fr-CA');
    const scheduledTime = proposal.proposedStart.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

    prisma.user.findUnique({ where: { id: proposal.ticket.customerId }, select: { email: true, phone: true, firstName: true } })
      .then(customer => {
        if (customer?.email) {
          sendEmail({
            to: customer.email,
            subject: `Rendez-vous confirmé — Billet ${proposal.ticket.ticketNumber}`,
            body: `Bonjour ${customer.firstName},\n\nVotre rendez-vous pour le billet ${proposal.ticket.ticketNumber} a été confirmé.\n\nDate: ${scheduledDate}\nHeure: ${scheduledTime}\n\nMerci!`,
          }).catch(err => logger.error({ err }, 'Failed to send appointment confirmed email'));
        }
        if (customer?.phone) {
          sendSms({
            to: customer.phone,
            message: `Valitek — Rendez-vous confirmé pour le ${scheduledDate} à ${scheduledTime} (billet ${proposal.ticket.ticketNumber}).`,
          }).catch(err => logger.error({ err }, 'Failed to send appointment confirmed SMS'));
        }
      }).catch(() => {});
  }

  return result;
}

export async function rejectProposal(proposalId: string, data: RespondProposalInput, userId: string, role: UserRole) {
  const proposal = await prisma.appointmentProposal.findFirst({
    where: { id: proposalId, deletedAt: null },
    include: {
      ticket: { select: { id: true, customerId: true } },
    },
  });
  if (!proposal) throw AppError.notFound('Proposition introuvable');
  if (proposal.status !== 'PROPOSEE') {
    throw AppError.badRequest('Cette proposition a déjà été traitée');
  }

  // Can't reject your own proposal (use cancel instead)
  if (proposal.proposedById === userId) {
    throw AppError.forbidden('Utilisez l\'annulation pour retirer votre propre proposition');
  }

  // Customer can only reject proposals on their own tickets
  if (role === 'CUSTOMER' && proposal.ticket.customerId !== userId) {
    throw AppError.forbidden('Vous ne pouvez rejeter que les propositions concernant vos propres billets');
  }

  const updatedProposal = await prisma.appointmentProposal.update({
    where: { id: proposalId },
    data: {
      status: 'REFUSEE',
      respondedById: userId,
      respondedAt: new Date(),
      responseMessage: data.responseMessage || null,
    },
    include: PROPOSAL_INCLUDE,
  });

  return updatedProposal;
}

export async function cancelProposal(proposalId: string, userId: string) {
  const proposal = await prisma.appointmentProposal.findFirst({
    where: { id: proposalId, deletedAt: null },
  });
  if (!proposal) throw AppError.notFound('Proposition introuvable');
  if (proposal.status !== 'PROPOSEE') {
    throw AppError.badRequest('Cette proposition a déjà été traitée');
  }

  // Only the author can cancel their own proposal
  if (proposal.proposedById !== userId) {
    throw AppError.forbidden('Seul l\'auteur peut annuler sa propre proposition');
  }

  return prisma.appointmentProposal.update({
    where: { id: proposalId },
    data: { status: 'ANNULEE' },
    include: PROPOSAL_INCLUDE,
  });
}
