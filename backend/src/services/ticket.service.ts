import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { ALLOWED_TRANSITIONS, parseTechPermissions, getPagination, buildPaginatedResponse } from '../types/index.js';
import type { UserRole, TicketStatus } from '@prisma/client';
import type { CreateTicketInput, UpdateTicketInput, TicketListQuery } from '../validations/ticket.js';

// ─── Shared Prisma includes ───
const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, phone: true, customerType: true, companyName: true,
};

const TICKET_INCLUDE = {
  customer: { select: USER_SELECT },
  technician: { select: USER_SELECT },
};

const TICKET_DETAIL_INCLUDE = {
  ...TICKET_INCLUDE,
  appointments: {
    where: { deletedAt: null },
    orderBy: { scheduledStart: 'desc' as const },
    include: { technician: { select: USER_SELECT } },
  },
  _count: { select: { messages: true, attachments: true } },
};

// ─── Ticket Number Generation ───
async function generateTicketNumber(): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `TKT-${yy}${mm}`;

  const lastTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true },
  });

  const seq = lastTicket
    ? parseInt(lastTicket.ticketNumber.slice(-2), 10) + 1
    : 1;

  return `${prefix}${seq.toString().padStart(2, '0')}`;
}

// ─── CRUD ───
export async function createTicket(data: CreateTicketInput, userId: string, role: UserRole) {
  const customerId = role === 'CUSTOMER' ? userId : data.customerId;
  if (!customerId) throw AppError.badRequest('customerId est requis');

  if (role !== 'CUSTOMER') {
    const customer = await prisma.user.findFirst({
      where: { id: customerId, role: 'CUSTOMER', isActive: true, deletedAt: null },
    });
    if (!customer) throw AppError.notFound('Client introuvable');
  }

  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      title: data.title,
      description: data.description,
      priority: data.priority || 'NORMALE',
      serviceMode: data.serviceMode || 'EN_CUBICULE',
      serviceCategory: data.serviceCategory || 'REPARATION',
      customerId,
    },
    include: TICKET_INCLUDE,
  });

  return ticket;
}

export async function getTickets(query: TicketListQuery, userId: string, role: UserRole) {
  const { page, limit, skip } = getPagination({ page: query.page, limit: query.limit });

  const where: any = { deletedAt: null };

  // Role-based filtering
  if (role === 'CUSTOMER') {
    where.customerId = userId;
  } else if (role === 'TECHNICIAN') {
    const perms = parseTechPermissions(
      (await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } }))?.permissions
    );
    if (!perms.can_view_all_tickets) {
      where.technicianId = userId;
    }
  }

  // Additional filters
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.technicianId) where.technicianId = query.technicianId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { ticketNumber: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDE,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  return buildPaginatedResponse(tickets, total, page, limit);
}

export async function getTicketById(id: string, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
    include: TICKET_DETAIL_INCLUDE,
  });

  if (!ticket) throw AppError.notFound('Billet introuvable');

  // Access control
  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden();
  }
  if (role === 'TECHNICIAN') {
    const perms = parseTechPermissions(
      (await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } }))?.permissions
    );
    if (!perms.can_view_all_tickets && ticket.technicianId !== userId) {
      throw AppError.forbidden();
    }
  }

  return ticket;
}

export async function updateTicket(id: string, data: UpdateTicketInput, userId: string, role: UserRole) {
  const ticket = await getTicketById(id, userId, role);

  const updated = await prisma.ticket.update({
    where: { id },
    data,
    include: TICKET_INCLUDE,
  });

  return updated;
}

// ─── Status Machine ───
export async function changeStatus(id: string, newStatus: TicketStatus, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
  });

  if (!ticket) throw AppError.notFound('Billet introuvable');

  const transitions = ALLOWED_TRANSITIONS[ticket.status];
  const transition = transitions.find((t) => t.to === newStatus);

  if (!transition) {
    throw AppError.badRequest(`Transition de ${ticket.status} vers ${newStatus} non autorisee`);
  }

  // Check role-based transition permission
  let allowed = transition.roles.includes(role);

  // Special case: TECHNICIAN with can_close_tickets can close TERMINEE -> FERMEE
  if (!allowed && role === 'TECHNICIAN' && ticket.status === 'TERMINEE' && newStatus === 'FERMEE') {
    const perms = parseTechPermissions(
      (await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } }))?.permissions
    );
    allowed = perms.can_close_tickets;
  }

  if (!allowed) {
    throw AppError.forbidden('Vous n\'avez pas la permission pour cette transition');
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: newStatus },
    include: TICKET_INCLUDE,
  });

  return updated;
}

export async function assignTechnician(id: string, technicianId: string, adminId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable');

  const technician = await prisma.user.findFirst({
    where: { id: technicianId, role: 'TECHNICIAN', isActive: true, deletedAt: null },
  });
  if (!technician) throw AppError.notFound('Technicien introuvable');

  const updated = await prisma.ticket.update({
    where: { id },
    data: { technicianId },
    include: TICKET_INCLUDE,
  });

  return updated;
}

export async function acceptTicket(id: string, technicianId: string) {
  const perms = parseTechPermissions(
    (await prisma.user.findUnique({ where: { id: technicianId }, select: { permissions: true } }))?.permissions
  );

  if (!perms.can_accept_tickets) {
    throw AppError.forbidden('Vous n\'avez pas la permission d\'accepter des billets');
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null, technicianId: null },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable ou deja assigne');

  const updated = await prisma.ticket.update({
    where: { id },
    data: { technicianId },
    include: TICKET_INCLUDE,
  });

  return updated;
}

// ─── Quote Workflow ───
export async function sendQuote(id: string, price: number, description: string, duration: string, userId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable');

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      quotedPrice: price,
      quoteDescription: description,
      quoteDuration: duration,
      status: 'EN_ATTENTE_APPROBATION',
    },
    include: TICKET_INCLUDE,
  });

  return updated;
}

export async function approveQuote(id: string, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null, status: 'EN_ATTENTE_APPROBATION' },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable ou statut invalide');

  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: 'APPROUVEE' },
    include: TICKET_INCLUDE,
  });

  return updated;
}

export async function declineQuote(id: string, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null, status: 'EN_ATTENTE_APPROBATION' },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable ou statut invalide');

  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      status: 'EN_ATTENTE_REPONSE_CLIENT',
      quotedPrice: null,
      quoteDescription: null,
      quoteDuration: null,
    },
    include: TICKET_INCLUDE,
  });

  return updated;
}

// ─── Blocker Workflow ───
export async function addBlocker(id: string, reason: string, userId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null, status: 'EN_COURS' },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable ou statut invalide');

  const updated = await prisma.ticket.update({
    where: { id },
    data: { blockerReason: reason, status: 'BLOCAGE' },
    include: TICKET_INCLUDE,
  });

  return updated;
}

export async function removeBlocker(id: string, userId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, deletedAt: null, status: 'BLOCAGE' },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable ou pas en blocage');

  const updated = await prisma.ticket.update({
    where: { id },
    data: { blockerReason: null, status: 'EN_COURS' },
    include: TICKET_INCLUDE,
  });

  return updated;
}
