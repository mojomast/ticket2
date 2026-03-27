import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { ALLOWED_TRANSITIONS, parseTechPermissions, getPagination, buildPaginatedResponse } from '../types/index.js';
import type { UserRole, TicketStatus } from '@prisma/client';
import type { CreateTicketInput, UpdateTicketInput, TicketListQuery, ServiceRequestInput } from '../validations/ticket.js';
import { createAuditLog } from './audit.service.js';
import * as notificationService from './notification.service.js';
import { sendEmail } from './email.service.js';
import { sendSms } from './sms.service.js';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';

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

// ─── Ticket Number Generation (with retry loop to handle race conditions) ───
async function generateTicketNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `TKT-${yy}${mm}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await prisma.ticket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    const seq = last
      ? parseInt(last.ticketNumber.slice(-3), 10) + 1
      : 1;
    const ticketNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    // Check if number already exists (handles race condition)
    const exists = await prisma.ticket.findUnique({ where: { ticketNumber } });
    if (!exists) return ticketNumber;
  }

  // Fallback: use timestamp-based number
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: ticket.id,
    action: 'CREATED',
    userId,
    newValue: { ticketNumber, title: data.title, priority: data.priority || 'NORMALE' },
  }).catch(() => {});

  // Fire-and-forget: notify admins about new ticket
  prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true, deletedAt: null },
    select: { id: true, email: true },
  }).then((admins) => {
    const recipientIds = admins.map(a => a.id).filter(id => id !== userId);
    if (recipientIds.length > 0) {
      notificationService.notifyTicketCreated(ticket.id, ticketNumber, recipientIds).catch(() => {});
    }
    // Email admins about new ticket
    for (const admin of admins) {
      if (admin.email) {
        sendEmail({
          to: admin.email,
          subject: `Nouveau billet ${ticketNumber}`,
          body: `Un nouveau billet a été créé:\n\nNuméro: ${ticketNumber}\nTitre: ${data.title}\nPriorité: ${data.priority || 'NORMALE'}`,
        }).catch(err => logger.error({ err }, 'Failed to send ticket created email to admin'));
      }
    }
  }).catch(() => {});

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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: id,
    action: 'STATUS_CHANGED',
    userId,
    oldValue: { status: ticket.status },
    newValue: { status: newStatus },
  }).catch(() => {});

  // Fire-and-forget: notify customer and technician of status change
  const statusRecipients: string[] = [];
  if (ticket.customerId && ticket.customerId !== userId) statusRecipients.push(ticket.customerId);
  if (ticket.technicianId && ticket.technicianId !== userId) statusRecipients.push(ticket.technicianId);
  if (statusRecipients.length > 0) {
    notificationService.notifyStatusChanged(
      id, ticket.ticketNumber, newStatus, statusRecipients
    ).catch(() => {});
  }

  // Fire-and-forget: email customer and technician about status change
  if (ticket.customerId && ticket.customerId !== userId) {
    prisma.user.findUnique({ where: { id: ticket.customerId }, select: { email: true, firstName: true } })
      .then(customer => {
        if (customer?.email) {
          sendEmail({
            to: customer.email,
            subject: `Billet ${ticket.ticketNumber} — statut mis à jour`,
            body: `Bonjour ${customer.firstName},\n\nLe statut de votre billet ${ticket.ticketNumber} a été mis à jour: ${newStatus}`,
          }).catch(err => logger.error({ err }, 'Failed to send status change email to customer'));
        }
      }).catch(() => {});
  }
  if (ticket.technicianId && ticket.technicianId !== userId) {
    prisma.user.findUnique({ where: { id: ticket.technicianId }, select: { email: true, firstName: true } })
      .then(tech => {
        if (tech?.email) {
          sendEmail({
            to: tech.email,
            subject: `Billet ${ticket.ticketNumber} — statut mis à jour`,
            body: `Bonjour ${tech.firstName},\n\nLe billet ${ticket.ticketNumber} qui vous est assigné a changé de statut: ${newStatus}`,
          }).catch(err => logger.error({ err }, 'Failed to send status change email to technician'));
        }
      }).catch(() => {});
  }

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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: id,
    action: 'TECHNICIAN_ASSIGNED',
    userId: adminId,
    oldValue: { technicianId: ticket.technicianId },
    newValue: { technicianId },
  }).catch(() => {});

  // Fire-and-forget: notify technician they've been assigned
  notificationService.notifyTechnicianAssigned(id, ticket.ticketNumber, technicianId).catch(() => {});

  // Fire-and-forget: email technician about assignment
  if (technician.email) {
    sendEmail({
      to: technician.email,
      subject: `Billet ${ticket.ticketNumber} vous a été assigné`,
      body: `Bonjour ${technician.firstName},\n\nLe billet ${ticket.ticketNumber} (${ticket.title}) vous a été assigné.\n\nVeuillez vous connecter pour consulter les détails.`,
    }).catch(err => logger.error({ err }, 'Failed to send technician assigned email'));
  }

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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: id,
    action: 'QUOTE_SENT',
    userId,
    newValue: { price, description, duration },
  }).catch(() => {});

  // Fire-and-forget: notify customer that a quote was sent
  if (ticket.customerId) {
    notificationService.notifyQuoteSent(id, ticket.ticketNumber, ticket.customerId).catch(() => {});

    // Email and SMS the customer about the quote
    prisma.user.findUnique({ where: { id: ticket.customerId }, select: { email: true, phone: true, firstName: true } })
      .then(customer => {
        if (customer?.email) {
          sendEmail({
            to: customer.email,
            subject: `Devis pour le billet ${ticket.ticketNumber}`,
            body: `Bonjour ${customer.firstName},\n\nUn devis a été soumis pour votre billet ${ticket.ticketNumber}:\n\nMontant: ${price}$\nDescription: ${description}\nDurée estimée: ${duration}\n\nVeuillez vous connecter pour approuver ou refuser ce devis.`,
          }).catch(err => logger.error({ err }, 'Failed to send quote email to customer'));
        }
        if (customer?.phone) {
          sendSms({
            to: customer.phone,
            message: `Valitek — Un devis de ${price}$ a été soumis pour votre billet ${ticket.ticketNumber}. Connectez-vous pour l'approuver.`,
          }).catch(err => logger.error({ err }, 'Failed to send quote SMS to customer'));
        }
      }).catch(() => {});
  }

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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: id,
    action: 'QUOTE_APPROVED',
    userId,
    oldValue: { status: 'EN_ATTENTE_APPROBATION' },
    newValue: { status: 'APPROUVEE' },
  }).catch(() => {});

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

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: id,
    action: 'QUOTE_DECLINED',
    userId,
    oldValue: { status: 'EN_ATTENTE_APPROBATION', quotedPrice: ticket.quotedPrice },
    newValue: { status: 'EN_ATTENTE_REPONSE_CLIENT' },
  }).catch(() => {});

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

// ─── Public Service Request (no auth) ───
export async function createServiceRequest(data: ServiceRequestInput) {
  // Wrap user lookup/creation + ticket creation in a transaction to prevent
  // race conditions (e.g. two concurrent requests for the same email creating
  // duplicate users or orphaned records).
  const { ticket, customer } = await prisma.$transaction(async (tx) => {
    // Find or create customer by email
    let cust = await tx.user.findFirst({
      where: { email: data.customerEmail, deletedAt: null },
    });

    if (!cust) {
      // Generate a random password hash placeholder (customer can reset later)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      cust = await tx.user.create({
        data: {
          email: data.customerEmail,
          passwordHash: randomPassword, // Not a real hash — user must reset password
          firstName: data.customerFirstName,
          lastName: data.customerLastName,
          phone: data.customerPhone || null,
          role: 'CUSTOMER',
          customerType: 'RESIDENTIAL',
          isActive: true,
        },
      });
    }

    const ticketNumber = await generateTicketNumber();

    const tkt = await tx.ticket.create({
      data: {
        ticketNumber,
        title: data.title,
        description: data.description,
        priority: data.priority || 'NORMALE',
        serviceMode: data.serviceMode || 'EN_CUBICULE',
        serviceCategory: data.serviceCategory || 'REPARATION',
        customerId: cust.id,
      },
      include: TICKET_INCLUDE,
    });

    return { ticket: tkt, customer: cust };
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'TICKET',
    entityId: ticket.id,
    action: 'CREATED',
    userId: customer.id,
    newValue: { ticketNumber: ticket.ticketNumber, title: data.title, source: 'service-request' },
  }).catch(() => {});

  // Fire-and-forget: notify admins about new ticket
  prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true, deletedAt: null },
    select: { id: true, email: true },
  }).then((admins) => {
    const recipientIds = admins.map(a => a.id);
    if (recipientIds.length > 0) {
      notificationService.notifyTicketCreated(ticket.id, ticket.ticketNumber, recipientIds).catch(() => {});
    }
    // Email admins about new service request
    for (const admin of admins) {
      if (admin.email) {
        sendEmail({
          to: admin.email,
          subject: `Nouvelle demande de service ${ticket.ticketNumber}`,
          body: `Une nouvelle demande de service a été soumise:\n\nNuméro: ${ticket.ticketNumber}\nTitre: ${data.title}\nClient: ${data.customerFirstName} ${data.customerLastName} (${data.customerEmail})`,
        }).catch(err => logger.error({ err }, 'Failed to send service request email to admin'));
      }
    }
  }).catch(() => {});

  // Fire-and-forget: send confirmation email to customer
  sendEmail({
    to: data.customerEmail,
    subject: `Confirmation — Demande de service ${ticket.ticketNumber}`,
    body: `Bonjour ${data.customerFirstName},\n\nVotre demande de service a bien été reçue.\n\nNuméro de billet: ${ticket.ticketNumber}\nTitre: ${data.title}\n\nNous vous contacterons sous peu. Merci de votre confiance!`,
  }).catch(err => logger.error({ err }, 'Failed to send service request confirmation email'));

  return ticket;
}
