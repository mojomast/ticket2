/**
 * ticket.routes.test.ts
 * Integration tests for ticket routes with mocked prisma and auth.
 */

// Set env vars BEFORE any imports
process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ─── Hoist mocks ───
const { mockPrisma, mockVerifyToken } = vi.hoisted(() => {
  return {
    mockPrisma: {
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
      },
    },
    mockVerifyToken: vi.fn(),
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../lib/auth.js', () => ({
  createToken: vi.fn(),
  verifyToken: mockVerifyToken,
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import ticketRoutes from './ticket.routes.js';

// Simulated authenticated admin user
const adminUser = {
  id: 'admin-1',
  email: 'admin@valitek.ca',
  role: 'ADMIN' as const,
  firstName: 'Admin',
  lastName: 'User',
  permissions: null,
};

// Helper: create test app with auth middleware + ticket routes
function createTestApp() {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { data: null, error: { message: err.message, code: err.code } },
        err.status as any
      );
    }
    return c.json(
      { data: null, error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' } },
      500
    );
  });

  // Apply auth middleware - only use wildcard to avoid double-auth
  app.use('/api/tickets/*', requireAuth);
  app.route('/api/tickets', ticketRoutes);

  return app;
}

// Setup: mock auth for every request
function setupAuth(user = adminUser) {
  mockVerifyToken.mockResolvedValue({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });
  mockPrisma.user.findFirst.mockResolvedValue(user);
  mockPrisma.user.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/tickets ───
describe('GET /api/tickets', () => {
  it('returns paginated list', async () => {
    setupAuth();
    const app = createTestApp();

    const tickets = [
      { id: 'tk-1', ticketNumber: 'TKT-260301', title: 'Issue 1', status: 'NOUVELLE' },
      { id: 'tk-2', ticketNumber: 'TKT-260302', title: 'Issue 2', status: 'EN_COURS' },
    ];

    mockPrisma.ticket.findMany.mockResolvedValue(tickets);
    mockPrisma.ticket.count.mockResolvedValue(2);

    const res = await app.request('/api/tickets?page=1&limit=20', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-jwt' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.total).toBe(2);
  });

  it('returns 401 without auth', async () => {
    const app = createTestApp();

    const res = await app.request('/api/tickets?page=1&limit=20', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/tickets ───
describe('POST /api/tickets', () => {
  it('creates a ticket', async () => {
    setupAuth();
    const app = createTestApp();

    const createdTicket = {
      id: 'tk-new',
      ticketNumber: 'TKT-260301',
      title: 'Nouveau billet',
      description: 'Description du probleme',
      status: 'NOUVELLE',
      priority: 'NORMALE',
      customer: adminUser,
      technician: null,
    };

    // Mock for generateTicketNumber (ticket.findFirst returns null = no existing ticket)
    mockPrisma.ticket.findFirst.mockResolvedValue(null);
    mockPrisma.ticket.findUnique.mockResolvedValue(null);
    // Mock for createTicket
    mockPrisma.ticket.create.mockResolvedValue(createdTicket);
    // First user.findFirst call is auth middleware; second validates the customer lookup.
    mockPrisma.user.findFirst
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'client@example.com',
        role: 'CUSTOMER',
        firstName: 'Client',
        lastName: 'Test',
        permissions: null,
        isActive: true,
        deletedAt: null,
      });

    const res = await app.request('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'valitek-auth=valid-jwt',
      },
      body: JSON.stringify({
        title: 'Nouveau billet',
        description: 'Description du probleme',
        // Use a proper UUID format to pass Zod validation
        customerId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.ticketNumber).toBe('TKT-260301');
    expect(body.error).toBeNull();
  });
});

// ─── PATCH /api/tickets/:id/status ───
describe('PATCH /api/tickets/:id/status', () => {
  it('validates status transitions - rejects FERMEE to NOUVELLE', async () => {
    setupAuth();
    const app = createTestApp();

    // Ticket is currently FERMEE (terminal state)
    mockPrisma.ticket.findFirst.mockResolvedValue({
      id: 'tk-1',
      status: 'FERMEE',
      deletedAt: null,
    });

    const res = await app.request('/api/tickets/tk-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'valitek-auth=valid-jwt',
      },
      body: JSON.stringify({ status: 'NOUVELLE' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('Transition');
  });

  it('allows valid status transition', async () => {
    setupAuth();
    const app = createTestApp();

    const ticket = { id: 'tk-1', status: 'NOUVELLE', deletedAt: null };
    const updatedTicket = { ...ticket, status: 'EN_COURS', customer: adminUser, technician: null };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticket);
    mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

    const res = await app.request('/api/tickets/tk-1/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'valitek-auth=valid-jwt',
      },
      body: JSON.stringify({ status: 'EN_COURS' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('EN_COURS');
  });
});

// ─── GET /api/tickets/:id ───
describe('GET /api/tickets/:id', () => {
  it('returns ticket detail', async () => {
    setupAuth();
    const app = createTestApp();

    const ticketDetail = {
      id: 'tk-1',
      ticketNumber: 'TKT-260301',
      title: 'Test Ticket',
      status: 'NOUVELLE',
      customerId: 'customer-1',
      technicianId: null,
      customer: { id: 'customer-1', firstName: 'Client', lastName: 'Test' },
      technician: null,
      appointments: [],
      _count: { messages: 0, attachments: 0 },
      deletedAt: null,
    };

    mockPrisma.ticket.findFirst.mockResolvedValue(ticketDetail);

    const res = await app.request('/api/tickets/tk-1', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-jwt' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('tk-1');
    expect(body.data.ticketNumber).toBe('TKT-260301');
    expect(body.error).toBeNull();
  });

  it('returns 404 for non-existent ticket', async () => {
    setupAuth();
    const app = createTestApp();

    mockPrisma.ticket.findFirst.mockResolvedValue(null);

    const res = await app.request('/api/tickets/nonexistent', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-jwt' },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
