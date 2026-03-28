/**
 * message.service.test.ts
 * Tests for edit window, internal note filtering, and message CRUD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma using vi.hoisted ───
const { mockPrisma, mockGetTicketAccessContext } = vi.hoisted(() => {
  return {
    mockPrisma: {
      message: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    },
    mockGetTicketAccessContext: vi.fn(),
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('./ticket.service.js', () => ({
  getTicketAccessContext: mockGetTicketAccessContext,
}));

vi.mock('./notification.service.js', () => ({
  notifyNewMessage: vi.fn(),
}));

vi.mock('./email.service.js', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  createMessage,
  updateMessage,
  getMessages,
  deleteMessage,
} from './message.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTicketAccessContext.mockResolvedValue({
    id: 'ticket-1',
    ticketNumber: 'TKT-260301',
    customerId: 'customer-1',
    technicianId: null,
  });
});

// ─── createMessage Tests ───
describe('createMessage', () => {
  it('sets isInternal=false for CUSTOMER role regardless of input', async () => {
    const createdMessage = {
      id: 'msg-1',
      ticketId: 'ticket-1',
      authorId: 'customer-1',
      content: 'Hello',
      isInternal: false,
      author: { id: 'customer-1', firstName: 'Test', lastName: 'User', role: 'CUSTOMER', email: 'test@test.com' },
    };

    mockPrisma.message.create.mockResolvedValue(createdMessage);

    const result = await createMessage(
      'ticket-1',
      { content: 'Hello', isInternal: true }, // customer tries to set isInternal=true
      'customer-1',
      'CUSTOMER'
    );

    expect(result.isInternal).toBe(false);
    // Verify the create call used isInternal: false
    const createCall = mockPrisma.message.create.mock.calls[0][0];
    expect(createCall.data.isInternal).toBe(false);
  });

  it('allows ADMIN to create internal notes', async () => {
    const createdMessage = {
      id: 'msg-2',
      ticketId: 'ticket-1',
      authorId: 'admin-1',
      content: 'Internal note',
      isInternal: true,
      author: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN', email: 'admin@test.com' },
    };

    mockGetTicketAccessContext.mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 'TKT-260301',
      customerId: 'customer-1',
      technicianId: null,
    });
    mockPrisma.message.create.mockResolvedValue(createdMessage);

    await createMessage(
      'ticket-1',
      { content: 'Internal note', isInternal: true },
      'admin-1',
      'ADMIN'
    );

    const createCall = mockPrisma.message.create.mock.calls[0][0];
    expect(createCall.data.isInternal).toBe(true);
  });
});

// ─── updateMessage Tests ───
describe('updateMessage', () => {
  it('throws if author is not the message owner', async () => {
    mockPrisma.message.findFirst.mockResolvedValue({
      id: 'msg-1',
      authorId: 'user-1',
      createdAt: new Date(),
      deletedAt: null,
    });

    await expect(
      updateMessage('msg-1', { content: 'updated' }, 'user-2')
    ).rejects.toThrow('Vous ne pouvez modifier que vos propres messages');
  });

  it('throws if 5-minute edit window has passed', async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);

    mockPrisma.message.findFirst.mockResolvedValue({
      id: 'msg-1',
      authorId: 'user-1',
      createdAt: sixMinutesAgo,
      deletedAt: null,
    });

    await expect(
      updateMessage('msg-1', { content: 'updated' }, 'user-1')
    ).rejects.toThrow(/delai.*modification.*5 minutes/i);
  });

  it('allows update within 5-minute window', async () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const updatedMessage = {
      id: 'msg-1',
      authorId: 'user-1',
      content: 'updated',
      createdAt: oneMinuteAgo,
      author: { id: 'user-1', firstName: 'Test', lastName: 'User', role: 'ADMIN', email: 'test@test.com' },
    };

    mockPrisma.message.findFirst.mockResolvedValue({
      id: 'msg-1',
      authorId: 'user-1',
      createdAt: oneMinuteAgo,
      deletedAt: null,
    });
    mockPrisma.message.update.mockResolvedValue(updatedMessage);

    const result = await updateMessage('msg-1', { content: 'updated' }, 'user-1');
    expect(result.content).toBe('updated');
  });
});

// ─── getMessages Tests ───
describe('getMessages', () => {
  it('filters out internal notes for CUSTOMER role', async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      { id: 'msg-1', content: 'Public msg', isInternal: false },
    ]);
    mockPrisma.message.count.mockResolvedValue(1);

    await getMessages('ticket-1', {}, 'customer-1', 'CUSTOMER');

    // Verify that the where clause includes isInternal: false
    const findManyCall = mockPrisma.message.findMany.mock.calls[0][0];
    expect(findManyCall.where.isInternal).toBe(false);
  });

  it('verifies ticket access before returning messages', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.count.mockResolvedValue(0);

    await getMessages('ticket-1', {}, 'customer-1', 'CUSTOMER');

    expect(mockGetTicketAccessContext).toHaveBeenCalledWith('ticket-1', 'customer-1', 'CUSTOMER');
  });

  it('rejects when ticket access is denied', async () => {
    mockGetTicketAccessContext.mockRejectedValue(new Error('Acces refuse'));

    await expect(getMessages('ticket-1', {}, 'customer-2', 'CUSTOMER')).rejects.toThrow('Acces refuse');
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
  });

  it('does not filter internal notes for ADMIN role', async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.message.count.mockResolvedValue(0);

    await getMessages('ticket-1', {}, 'admin-1', 'ADMIN');

    // isInternal should NOT be set in the where clause
    const findManyCall = mockPrisma.message.findMany.mock.calls[0][0];
    expect(findManyCall.where.isInternal).toBeUndefined();
  });
});

// ─── deleteMessage Tests ───
describe('deleteMessage', () => {
  it('soft-deletes by setting deletedAt', async () => {
    mockPrisma.message.findFirst.mockResolvedValue({
      id: 'msg-1',
      deletedAt: null,
    });
    mockPrisma.message.update.mockResolvedValue({
      id: 'msg-1',
      deletedAt: new Date(),
    });

    const result = await deleteMessage('msg-1');

    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
        data: { deletedAt: expect.any(Date) },
      })
    );
    expect(result.deletedAt).toBeTruthy();
  });

  it('throws NOT_FOUND for already-deleted message', async () => {
    mockPrisma.message.findFirst.mockResolvedValue(null);

    await expect(deleteMessage('nonexistent')).rejects.toThrow('Message introuvable');
  });
});
