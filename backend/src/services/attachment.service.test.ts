import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockGetTicketAccessContext } = vi.hoisted(() => {
  return {
    mockPrisma: {
      attachment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
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

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn(),
}));

import { getAttachmentForUser, getAttachmentsByTicket, deleteAttachment } from './attachment.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTicketAccessContext.mockResolvedValue({
    id: 'ticket-1',
    ticketNumber: 'TKT-260301',
    customerId: 'customer-1',
    technicianId: null,
  });
});

describe('attachment.service authorization', () => {
  it('checks ticket access before returning an attachment by id', async () => {
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att-1',
      ticketId: 'ticket-1',
      storagePath: 'file-1.pdf',
    });

    await getAttachmentForUser('att-1', 'customer-1', 'CUSTOMER');

    expect(mockGetTicketAccessContext).toHaveBeenCalledWith('ticket-1', 'customer-1', 'CUSTOMER');
  });

  it('checks ticket access before listing attachments', async () => {
    mockPrisma.attachment.findMany.mockResolvedValue([]);

    await getAttachmentsByTicket('ticket-1', 'customer-1', 'CUSTOMER');

    expect(mockGetTicketAccessContext).toHaveBeenCalledWith('ticket-1', 'customer-1', 'CUSTOMER');
  });

  it('rejects delete when user lacks ticket access before uploader check', async () => {
    mockPrisma.attachment.findUnique.mockResolvedValue({
      id: 'att-1',
      ticketId: 'ticket-1',
      uploadedBy: 'customer-1',
      storagePath: 'file-1.pdf',
    });
    mockGetTicketAccessContext.mockRejectedValue(new Error('Acces refuse'));

    await expect(deleteAttachment('att-1', 'customer-2', 'CUSTOMER')).rejects.toThrow('Acces refuse');
    expect(mockPrisma.attachment.delete).not.toHaveBeenCalled();
  });
});
