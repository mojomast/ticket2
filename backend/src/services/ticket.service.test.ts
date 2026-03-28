/**
 * ticket.service.test.ts
 * Tests for ALLOWED_TRANSITIONS state machine, pagination helpers, and ticket CRUD logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  parseTechPermissions,
  DEFAULT_TECH_PERMISSIONS,
  getPagination,
  buildPaginatedResponse,
} from '../types/index.js';

// ─── Mock Prisma using vi.hoisted ───
const { mockPrisma, mockHashPassword } = vi.hoisted(() => {
  return {
    mockPrisma: {
      $transaction: vi.fn(),
      ticket: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
    },
    mockHashPassword: vi.fn(),
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../lib/auth.js', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: vi.fn(),
  createToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('./audit.service.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./notification.service.js', () => ({
  notifyTicketCreated: vi.fn().mockResolvedValue(undefined),
  notifyStatusChanged: vi.fn().mockResolvedValue(undefined),
  notifyTechnicianAssigned: vi.fn().mockResolvedValue(undefined),
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

// Import service functions AFTER mocking
import {
  createTicket,
  changeStatus,
  createServiceRequest,
  getTickets,
} from './ticket.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.ticket.findUnique.mockResolvedValue(null);
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation(async (callback: any) => callback({
    user: {
      findFirst: mockPrisma.user.findFirst,
      create: mockPrisma.user.create,
    },
    ticket: {
      create: mockPrisma.ticket.create,
    },
  }));
});

// ─── ALLOWED_TRANSITIONS Tests ───
describe('ALLOWED_TRANSITIONS', () => {
  it('has correct structure - FERMEE is a terminal state with empty array', () => {
    expect(ALLOWED_TRANSITIONS.FERMEE).toEqual([]);
  });

  it('has correct structure - ANNULEE is a terminal state with empty array', () => {
    expect(ALLOWED_TRANSITIONS.ANNULEE).toEqual([]);
  });

  it('NOUVELLE can transition to EN_ATTENTE_APPROBATION, PLANIFIEE, EN_COURS, ANNULEE', () => {
    const targets = ALLOWED_TRANSITIONS.NOUVELLE.map((t) => t.to);
    expect(targets).toContain('EN_ATTENTE_APPROBATION');
    expect(targets).toContain('PLANIFIEE');
    expect(targets).toContain('EN_COURS');
    expect(targets).toContain('ANNULEE');
  });

  it('FERMEE has no transitions', () => {
    expect(ALLOWED_TRANSITIONS.FERMEE).toHaveLength(0);
  });

  it('ANNULEE has no transitions', () => {
    expect(ALLOWED_TRANSITIONS.ANNULEE).toHaveLength(0);
  });

  it('all roles in transitions are valid UserRole values', () => {
    const validRoles = ['ADMIN', 'TECHNICIAN', 'CUSTOMER'];
    for (const [_status, transitions] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const transition of transitions) {
        for (const role of transition.roles) {
          expect(validRoles).toContain(role);
        }
      }
    }
  });
});

// ─── parseTechPermissions Tests ───
describe('parseTechPermissions', () => {
  it('returns defaults for null input', () => {
    expect(parseTechPermissions(null)).toEqual(DEFAULT_TECH_PERMISSIONS);
  });

  it('returns defaults for undefined input', () => {
    expect(parseTechPermissions(undefined)).toEqual(DEFAULT_TECH_PERMISSIONS);
  });

  it('merges partial input with defaults', () => {
    const result = parseTechPermissions({ can_accept_tickets: true });
    expect(result).toEqual({
      ...DEFAULT_TECH_PERMISSIONS,
      can_accept_tickets: true,
    });
  });

  it('returns defaults for non-object input', () => {
    expect(parseTechPermissions('string')).toEqual(DEFAULT_TECH_PERMISSIONS);
    expect(parseTechPermissions(42)).toEqual(DEFAULT_TECH_PERMISSIONS);
  });
});

// ─── getPagination Tests ───
describe('getPagination', () => {
  it('returns correct skip/page/limit for page 1', () => {
    const result = getPagination({ page: 1, limit: 20 });
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('returns correct skip for page 3', () => {
    const result = getPagination({ page: 3, limit: 10 });
    expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('clamps page to minimum of 1', () => {
    const result = getPagination({ page: -5, limit: 10 });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('clamps limit to maximum of 100', () => {
    const result = getPagination({ page: 1, limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('clamps limit to minimum of 1', () => {
    const result = getPagination({ page: 1, limit: -10 });
    expect(result.limit).toBe(1);
  });
});

// ─── buildPaginatedResponse Tests ───
describe('buildPaginatedResponse', () => {
  it('builds correct response shape', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = buildPaginatedResponse(data, 50, 1, 20);
    expect(result).toEqual({
      data,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    });
  });

  it('calculates totalPages correctly for exact division', () => {
    const result = buildPaginatedResponse([], 100, 1, 10);
    expect(result.pagination.totalPages).toBe(10);
  });

  it('calculates totalPages correctly for remainder', () => {
    const result = buildPaginatedResponse([], 21, 1, 10);
    expect(result.pagination.totalPages).toBe(3);
  });

  it('returns 0 totalPages for empty result', () => {
    const result = buildPaginatedResponse([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(0);
  });
});

// ─── createTicket Tests ───
describe('createTicket', () => {
  it('creates a ticket with generated number', async () => {
    const mockTicket = {
      id: 'ticket-1',
      ticketNumber: 'TKT-260301',
      title: 'Test',
      status: 'NOUVELLE',
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(null); // no existing ticket for number gen
    mockPrisma.ticket.create.mockResolvedValue(mockTicket);

    const result = await createTicket(
      { title: 'Test', description: 'Desc' },
      'user-1',
      'CUSTOMER'
    );

    expect(result).toEqual(mockTicket);
    expect(mockPrisma.ticket.create).toHaveBeenCalledOnce();
    // Verify ticket number was generated (starts with TKT-)
    const createCall = mockPrisma.ticket.create.mock.calls[0][0];
    expect(createCall.data.ticketNumber).toMatch(/^TKT-\d{7}$/);
  });
});

describe('getTickets', () => {
  it('prevents customerId query overrides for customers', async () => {
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getTickets({ customerId: 'other-customer', page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }, 'customer-1', 'CUSTOMER');

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customerId: 'customer-1' }),
      })
    );
  });

  it('prevents technicianId query overrides for restricted technicians', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ permissions: null });
    mockPrisma.ticket.findMany.mockResolvedValue([]);
    mockPrisma.ticket.count.mockResolvedValue(0);

    await getTickets({ technicianId: 'other-tech', page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' }, 'tech-1', 'TECHNICIAN');

    expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ technicianId: 'tech-1' }),
      })
    );
  });
});

describe('createServiceRequest', () => {
  it('hashes generated passwords for newly created customers', async () => {
    mockHashPassword.mockResolvedValue('$argon2id$hashed-random-password');
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'customer-1',
      email: 'customer@test.com',
      firstName: 'Test',
      lastName: 'Customer',
    });
    mockPrisma.ticket.create.mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 'TKT-260301',
      customerId: 'customer-1',
    });
    mockPrisma.ticket.findFirst.mockResolvedValueOnce(null);

    await createServiceRequest({
      customerFirstName: 'Test',
      customerLastName: 'Customer',
      customerEmail: 'customer@test.com',
      customerPhone: '555-0100',
      title: 'Need help',
      description: 'Printer is offline',
      priority: 'NORMALE',
      serviceMode: 'EN_CUBICULE',
      serviceCategory: 'REPARATION',
    });

    expect(mockHashPassword).toHaveBeenCalledOnce();
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: '$argon2id$hashed-random-password',
        }),
      })
    );
  });
});

// ─── changeStatus Tests ───
describe('changeStatus', () => {
  it('rejects invalid transitions (e.g., FERMEE -> NOUVELLE)', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue({
      id: 'ticket-1',
      status: 'FERMEE',
      deletedAt: null,
    });

    await expect(
      changeStatus('ticket-1', 'NOUVELLE', 'user-1', 'ADMIN')
    ).rejects.toThrow('Transition de FERMEE vers NOUVELLE non autorisee');
  });

  it('allows valid transitions (e.g., NOUVELLE -> EN_COURS for ADMIN)', async () => {
    const existingTicket = { id: 'ticket-1', status: 'NOUVELLE', deletedAt: null };
    const updatedTicket = { ...existingTicket, status: 'EN_COURS' };

    mockPrisma.ticket.findFirst.mockResolvedValue(existingTicket);
    mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

    const result = await changeStatus('ticket-1', 'EN_COURS', 'user-1', 'ADMIN');
    expect(result.status).toBe('EN_COURS');
    expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ticket-1' },
        data: { status: 'EN_COURS' },
      })
    );
  });

  it('rejects unauthorized role transitions', async () => {
    // CUSTOMER cannot transition NOUVELLE -> PLANIFIEE (only ADMIN can)
    mockPrisma.ticket.findFirst.mockResolvedValue({
      id: 'ticket-1',
      status: 'NOUVELLE',
      deletedAt: null,
    });

    await expect(
      changeStatus('ticket-1', 'PLANIFIEE', 'user-1', 'CUSTOMER')
    ).rejects.toThrow(/permission/);
  });

  it('throws not found for missing ticket', async () => {
    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    await expect(
      changeStatus('nonexistent', 'EN_COURS', 'user-1', 'ADMIN')
    ).rejects.toThrow('Billet introuvable');
  });
});
