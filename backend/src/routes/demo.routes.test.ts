process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const { mockPrisma, mockVerifyToken, mockExecSync } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    followUp: { deleteMany: vi.fn() },
    worksheetNote: { deleteMany: vi.fn() },
    travelEntry: { deleteMany: vi.fn() },
    partUsed: { deleteMany: vi.fn() },
    laborEntry: { deleteMany: vi.fn() },
    worksheet: { deleteMany: vi.fn() },
    kbArticleLink: { deleteMany: vi.fn() },
    kbArticle: { deleteMany: vi.fn() },
    customerNote: { deleteMany: vi.fn() },
    workOrderNote: { deleteMany: vi.fn() },
    workOrder: { deleteMany: vi.fn() },
    appointmentProposal: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    attachment: { deleteMany: vi.fn() },
    message: { deleteMany: vi.fn() },
    appointment: { deleteMany: vi.fn() },
    ticket: { deleteMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    systemConfig: { deleteMany: vi.fn() },
    backupRecord: { deleteMany: vi.fn() },
    user: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  mockVerifyToken: vi.fn(),
  mockExecSync: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: mockPrisma }));

vi.mock('../lib/auth.js', () => ({
  verifyToken: mockVerifyToken,
  createToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AppError } from '../lib/errors.js';
import demoRoutes from './demo.routes.js';

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
  app.route('/api/demo', demoRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEMO_MODE = 'true';

  mockPrisma.$transaction.mockResolvedValue(undefined);
  mockPrisma.user.findFirst.mockResolvedValue({
    id: 'admin-1',
    email: 'demo-admin@valitek.ca',
    role: 'ADMIN',
    firstName: 'Demo',
    lastName: 'Admin',
    permissions: null,
    isActive: true,
    deletedAt: null,
  });
  mockVerifyToken.mockResolvedValue({
    id: 'admin-1',
    email: 'demo-admin@valitek.ca',
    role: 'ADMIN',
    firstName: 'Demo',
    lastName: 'Admin',
  });
});

describe('POST /api/demo/reset', () => {
  it('clears the auth cookie after reset succeeds', async () => {
    const app = createTestApp();

    const res = await app.request('/api/demo/reset', {
      method: 'POST',
      headers: { Cookie: 'valitek-auth=demo-token' },
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('valitek-auth=');
    expect(setCookie?.toLowerCase()).toContain('max-age=0');
  });
});
