import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import type { NotificationType } from '@prisma/client';
import { getPagination, buildPaginatedResponse } from '../types/index.js';

// ─── Query types ───

interface NotificationQuery {
  page?: number | string;
  limit?: number | string;
}

export async function getNotifications(userId: string, query: NotificationQuery) {
  const { page, limit, skip } = getPagination({
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
  });

  const where: { userId: string } = { userId };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return buildPaginatedResponse(notifications, total, page, limit);
}

export async function markRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw AppError.notFound('Notification introuvable');

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

// ─── Notification Dispatch Helpers ───

interface NotifyOptions {
  userId: string;
  ticketId?: string;
  type: NotificationType;
  title: string;
  message: string;
}

export async function notify(options: NotifyOptions) {
  return prisma.notification.create({
    data: {
      userId: options.userId,
      ticketId: options.ticketId,
      type: options.type,
      title: options.title,
      message: options.message,
    },
  });
}

export async function notifyTicketCreated(ticketId: string, ticketNumber: string, recipientIds: string[]) {
  const notifications = recipientIds.map((userId) => ({
    userId,
    ticketId,
    type: 'TICKET_CREATED' as NotificationType,
    title: 'Nouveau billet',
    message: `Le billet ${ticketNumber} a ete cree`,
  }));
  return prisma.notification.createMany({ data: notifications });
}

export async function notifyStatusChanged(ticketId: string, ticketNumber: string, newStatus: string, recipientIds: string[]) {
  const notifications = recipientIds.map((userId) => ({
    userId,
    ticketId,
    type: 'STATUS_CHANGED' as NotificationType,
    title: 'Statut modifie',
    message: `Le billet ${ticketNumber} est maintenant ${newStatus}`,
  }));
  return prisma.notification.createMany({ data: notifications });
}

export async function notifyQuoteSent(ticketId: string, ticketNumber: string, customerId: string) {
  return notify({
    userId: customerId,
    ticketId,
    type: 'QUOTE_SENT',
    title: 'Devis envoye',
    message: `Un devis a ete soumis pour le billet ${ticketNumber}`,
  });
}

export async function notifyTechnicianAssigned(ticketId: string, ticketNumber: string, technicianId: string) {
  return notify({
    userId: technicianId,
    ticketId,
    type: 'TECHNICIAN_ASSIGNED',
    title: 'Billet assigne',
    message: `Le billet ${ticketNumber} vous a ete assigne`,
  });
}

export async function notifyNewMessage(ticketId: string, ticketNumber: string, recipientIds: string[]) {
  const notifications = recipientIds.map((userId) => ({
    userId,
    ticketId,
    type: 'NEW_MESSAGE' as NotificationType,
    title: 'Nouveau message',
    message: `Nouveau message sur le billet ${ticketNumber}`,
  }));
  return prisma.notification.createMany({ data: notifications });
}
