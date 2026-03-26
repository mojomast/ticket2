import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { UserRole } from '@prisma/client';
import type { CreateMessageInput, UpdateMessageInput } from '../validations/message.js';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import * as notificationService from './notification.service.js';

const MESSAGE_INCLUDE = {
  author: {
    select: { id: true, firstName: true, lastName: true, role: true, email: true },
  },
};

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function getMessages(ticketId: string, query: any, userId: string, role: UserRole) {
  const { page, limit, skip } = getPagination({ page: query.page || 1, limit: query.limit || 50 });

  const where: any = { ticketId, deletedAt: null };

  // Customers cannot see internal notes
  if (role === 'CUSTOMER') {
    where.isInternal = false;
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  return buildPaginatedResponse(messages, total, page, limit);
}

export async function createMessage(ticketId: string, data: CreateMessageInput, userId: string, role: UserRole) {
  // Verify ticket exists and user has access
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null },
  });
  if (!ticket) throw AppError.notFound('Billet introuvable');

  if (role === 'CUSTOMER' && ticket.customerId !== userId) {
    throw AppError.forbidden();
  }

  // Customers cannot create internal notes
  const isInternal = role === 'CUSTOMER' ? false : data.isInternal;

  const message = await prisma.message.create({
    data: {
      ticketId,
      authorId: userId,
      content: data.content,
      isInternal,
    },
    include: MESSAGE_INCLUDE,
  });

  // Fire-and-forget: notify other parties about new message (skip internal notes for customers)
  if (!isInternal) {
    const recipientIds: string[] = [];
    if (ticket.customerId && ticket.customerId !== userId) recipientIds.push(ticket.customerId);
    if (ticket.technicianId && ticket.technicianId !== userId) recipientIds.push(ticket.technicianId);
    if (recipientIds.length > 0) {
      notificationService.notifyNewMessage(ticketId, ticket.ticketNumber, recipientIds).catch(() => {});
    }
  } else if (ticket.technicianId && ticket.technicianId !== userId) {
    // Internal notes: only notify the technician (not the customer)
    notificationService.notifyNewMessage(ticketId, ticket.ticketNumber, [ticket.technicianId]).catch(() => {});
  }

  return message;
}

export async function updateMessage(id: string, data: UpdateMessageInput, userId: string) {
  const message = await prisma.message.findFirst({
    where: { id, deletedAt: null },
  });
  if (!message) throw AppError.notFound('Message introuvable');

  if (message.authorId !== userId) {
    throw AppError.forbidden('Vous ne pouvez modifier que vos propres messages');
  }

  // Check edit window
  const elapsed = Date.now() - message.createdAt.getTime();
  if (elapsed > EDIT_WINDOW_MS) {
    throw AppError.badRequest('Le delai de modification de 5 minutes est depasse');
  }

  return prisma.message.update({
    where: { id },
    data: { content: data.content },
    include: MESSAGE_INCLUDE,
  });
}

export async function deleteMessage(id: string) {
  const message = await prisma.message.findFirst({
    where: { id, deletedAt: null },
  });
  if (!message) throw AppError.notFound('Message introuvable');

  return prisma.message.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
