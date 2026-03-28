import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockCreateAuditLog } = vi.hoisted(() => ({
  mockPrisma: {
    worksheet: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  mockCreateAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('./audit.service.js', () => ({
  createAuditLog: mockCreateAuditLog,
}));

vi.mock('./notification.service.js', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./knowledgebase.service.js', () => ({
  createArticle: vi.fn(),
  linkArticle: vi.fn(),
}));

vi.mock('./email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { saveCustomerSignature } from './worksheet.service.js';

describe('worksheet.service saveCustomerSignature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a customer signature for an authorized work order customer and writes an audit log', async () => {
    mockPrisma.worksheet.findFirst.mockResolvedValue({
      id: 'ws-1',
      status: 'SOUMISE',
      custSignature: null,
      workOrder: { id: 'wo-1', orderNumber: 'WO-001', customerId: 'customer-1' },
      ticket: null,
    });
    mockPrisma.worksheet.update.mockResolvedValue({ id: 'ws-1', custSignature: 'data:image/png;base64,abc' });

    await saveCustomerSignature(
      'ws-1',
      { signatureData: 'data:image/png;base64,abc' },
      'customer-1',
      '203.0.113.10',
      'Vitest Agent',
    );

    expect(mockPrisma.worksheet.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ws-1' },
      data: expect.objectContaining({
        custSignature: 'data:image/png;base64,abc',
        custSignedAt: expect.any(Date),
      }),
    }));

    expect(mockCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'WORKSHEET',
      entityId: 'ws-1',
      action: 'CUSTOMER_SIGNATURE_SUBMITTED',
      userId: 'customer-1',
      newValue: expect.objectContaining({
        workOrderId: 'wo-1',
        workOrderNumber: 'WO-001',
        ipAddress: '203.0.113.10',
        userAgent: 'Vitest Agent',
      }),
    }));
  });

  it('rejects customers who do not own the worksheet', async () => {
    mockPrisma.worksheet.findFirst.mockResolvedValue({
      id: 'ws-1',
      status: 'SOUMISE',
      custSignature: null,
      workOrder: { id: 'wo-1', orderNumber: 'WO-001', customerId: 'customer-2' },
      ticket: null,
    });

    await expect(
      saveCustomerSignature('ws-1', { signatureData: 'data:image/png;base64,abc' }, 'customer-1'),
    ).rejects.toThrow('Accès refusé');

    expect(mockPrisma.worksheet.update).not.toHaveBeenCalled();
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('rejects signatures for draft worksheets', async () => {
    mockPrisma.worksheet.findFirst.mockResolvedValue({
      id: 'ws-1',
      status: 'BROUILLON',
      custSignature: null,
      workOrder: { id: 'wo-1', orderNumber: 'WO-001', customerId: 'customer-1' },
      ticket: null,
    });

    await expect(
      saveCustomerSignature('ws-1', { signatureData: 'data:image/png;base64,abc' }, 'customer-1'),
    ).rejects.toThrow('Cette feuille de travail n’est pas disponible pour signature client');

    expect(mockPrisma.worksheet.update).not.toHaveBeenCalled();
  });
});
