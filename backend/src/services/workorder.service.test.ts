import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { encryptWorkOrderPassword } from '../lib/workorder-password.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    workOrder: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    workOrderNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('./audit.service.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./notification.service.js', () => ({
  notifyStatusChanged: vi.fn().mockResolvedValue(undefined),
  notifyQuoteSent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./email.service.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./sms.service.js', () => ({
  sendSms: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { createWorkOrder, getWorkOrderById, updateWorkOrder } from './workorder.service.js';

describe('workorder.service devicePassword encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'test-auth-secret-for-workorder-passwords-123456';
    delete process.env.WORKORDER_DEVICE_PASSWORD_KEY;
    process.env.NODE_ENV = 'test';

    mockPrisma.user.findFirst.mockResolvedValue({ id: 'customer-1', role: 'CUSTOMER', deletedAt: null });
    mockPrisma.workOrder.findFirst.mockResolvedValue(null);
    mockPrisma.workOrder.findUnique.mockResolvedValue(null);
  });

  it('stores encrypted password but returns plaintext on create', async () => {
    mockPrisma.workOrder.create.mockImplementation(async ({ data }: any) => ({
      id: 'wo-1',
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      status: 'RECEPTION',
      termsAcceptedAt: null,
      warrantyDays: null,
      completedDate: null,
      devicePassword: data.devicePassword,
    }));

    const result = await createWorkOrder({
      customerId: 'customer-1',
      customerName: 'Client Test',
      customerPhone: '555-0100',
      deviceBrand: 'Dell',
      deviceModel: 'Latitude',
      devicePassword: '1234',
      reportedIssue: 'Lent',
    }, 'admin-1', 'ADMIN');

    const createCall = mockPrisma.workOrder.create.mock.calls[0][0];
    expect(createCall.data.devicePassword).toMatch(/^enc:v1:/);
    expect(createCall.data.devicePassword).not.toBe('1234');
    expect(result.devicePassword).toBe('1234');
  });

  it('decrypts encrypted records on read and preserves legacy plaintext', async () => {
    const encryptedPassword = encryptWorkOrderPassword('1234');

    mockPrisma.workOrder.findFirst
      .mockResolvedValueOnce({
        id: 'wo-encrypted',
        customerId: 'customer-1',
        status: 'RECEPTION',
        devicePassword: encryptedPassword,
      })
      .mockResolvedValueOnce({
        id: 'wo-legacy',
        customerId: 'customer-1',
        status: 'RECEPTION',
        devicePassword: 'legacy-plain-password',
      });

    const encryptedRecord = await getWorkOrderById('wo-encrypted', 'admin-1', 'ADMIN');
    const legacyRecord = await getWorkOrderById('wo-legacy', 'admin-1', 'ADMIN');

    expect(encryptedRecord.devicePassword).toBe('1234');
    expect(legacyRecord.devicePassword).toBe('legacy-plain-password');
  });

  it('encrypts updated passwords before persisting', async () => {
    mockPrisma.workOrder.findFirst.mockResolvedValue({
      id: 'wo-1',
      customerId: 'customer-1',
      status: 'RECEPTION',
      termsAcceptedAt: null,
      warrantyDays: null,
      completedDate: null,
      devicePassword: 'legacy-plain-password',
    });
    mockPrisma.workOrder.update.mockImplementation(async ({ data }: any) => ({
      id: 'wo-1',
      customerId: 'customer-1',
      status: 'RECEPTION',
      termsAcceptedAt: null,
      warrantyDays: null,
      completedDate: null,
      devicePassword: data.devicePassword,
    }));

    const result = await updateWorkOrder('wo-1', { devicePassword: 'new-secret' }, 'admin-1', 'ADMIN');

    const updateCall = mockPrisma.workOrder.update.mock.calls[0][0];
    expect(updateCall.data.devicePassword).toMatch(/^enc:v1:/);
    expect(result.devicePassword).toBe('new-secret');
  });

  it('stores money fields as Prisma decimals and preserves zero amounts', async () => {
    mockPrisma.workOrder.create.mockImplementation(async ({ data }: any) => ({
      id: 'wo-1',
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      status: 'RECEPTION',
      termsAcceptedAt: null,
      warrantyDays: null,
      completedDate: null,
      depositAmount: 0,
      diagnosticFee: 0,
      estimatedCost: 199.99,
      maxAuthorizedSpend: 250,
      devicePassword: data.devicePassword,
    }));

    await createWorkOrder({
      customerId: 'customer-1',
      customerName: 'Client Test',
      customerPhone: '555-0100',
      deviceBrand: 'Dell',
      deviceModel: 'Latitude',
      reportedIssue: 'Lent',
      estimatedCost: 199.99,
      maxAuthorizedSpend: 250,
      depositAmount: 0,
      diagnosticFee: 0,
    }, 'admin-1', 'ADMIN');

    const createCall = mockPrisma.workOrder.create.mock.calls[0][0];
    expect(createCall.data.estimatedCost).toBeInstanceOf(Prisma.Decimal);
    expect(createCall.data.maxAuthorizedSpend).toBeInstanceOf(Prisma.Decimal);
    expect(createCall.data.depositAmount).toBeInstanceOf(Prisma.Decimal);
    expect(createCall.data.diagnosticFee).toBeInstanceOf(Prisma.Decimal);
    expect(createCall.data.depositAmount.toString()).toBe('0');
    expect(createCall.data.diagnosticFee.toString()).toBe('0');
  });
});
