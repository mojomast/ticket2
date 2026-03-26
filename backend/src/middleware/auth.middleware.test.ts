/**
 * auth.middleware.test.ts
 * Tests for token verification and role guards using a mini Hono app.
 */

// Set env vars BEFORE any imports that might trigger auth.ts module load
process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ─── Hoist mocks ───
const { mockPrisma, mockVerifyToken } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findFirst: vi.fn(),
      },
    },
    mockVerifyToken: vi.fn(),
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../lib/auth.js', () => ({
  verifyToken: mockVerifyToken,
  createToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { requireAuth, requireRole } from './auth.middleware.js';
import { AppError } from '../lib/errors.js';

// Helper: create a mini Hono test app with error handling
function createTestApp() {
  const app = new Hono();

  // Add error handler to convert AppError to JSON responses
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: { message: err.message, code: err.code } }, err.status as any);
    }
    return c.json({ error: { message: 'Internal error' } }, 500);
  });

  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── requireAuth Tests ───
describe('requireAuth', () => {
  it('rejects request without cookie (throws 401)', async () => {
    const app = createTestApp();
    app.use('/*', requireAuth);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', { method: 'GET' });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects request with invalid token (throws 401)', async () => {
    const app = createTestApp();
    app.use('/*', requireAuth);
    app.get('/test', (c) => c.json({ ok: true }));

    mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

    const res = await app.request('/test', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=invalid-token' },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts valid token and sets session', async () => {
    const app = createTestApp();
    app.use('/*', requireAuth);
    app.get('/test', (c) => {
      const session = c.get('session');
      return c.json({ user: session.user });
    });

    mockVerifyToken.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    });

    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'admin@test.com',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      permissions: null,
    });

    const res = await app.request('/test', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-token' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('user-1');
    expect(body.user.role).toBe('ADMIN');
  });

  it('rejects when user not found in database (throws 401)', async () => {
    const app = createTestApp();
    app.use('/*', requireAuth);
    app.get('/test', (c) => c.json({ ok: true }));

    mockVerifyToken.mockResolvedValue({
      id: 'deleted-user',
      email: 'deleted@test.com',
      role: 'ADMIN',
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const res = await app.request('/test', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-token' },
    });

    expect(res.status).toBe(401);
  });
});

// ─── requireRole Tests ───
describe('requireRole', () => {
  // Helper to create an app with auth + role middleware
  function createRoleApp(...roles: Array<'ADMIN' | 'TECHNICIAN' | 'CUSTOMER'>) {
    const app = createTestApp();

    // Simulate authenticated user by setting session before role check
    app.use('/*', async (c, next) => {
      // Read role from a custom header for testing
      const role = c.req.header('X-Test-Role') || 'CUSTOMER';
      c.set('session', {
        user: {
          id: 'user-1',
          email: 'test@test.com',
          role: role as any,
          firstName: 'Test',
          lastName: 'User',
          permissions: null,
        },
      });
      await next();
    });
    app.use('/*', requireRole(...roles));
    app.get('/test', (c) => c.json({ ok: true }));

    return app;
  }

  it('rejects non-admin users for ADMIN-only route (throws 403)', async () => {
    const app = createRoleApp('ADMIN');

    const res = await app.request('/test', {
      method: 'GET',
      headers: { 'X-Test-Role': 'CUSTOMER' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('accepts ADMIN users for ADMIN-only route', async () => {
    const app = createRoleApp('ADMIN');

    const res = await app.request('/test', {
      method: 'GET',
      headers: { 'X-Test-Role': 'ADMIN' },
    });

    expect(res.status).toBe(200);
  });

  it('accepts both ADMIN and TECHNICIAN for multi-role route', async () => {
    const app = createRoleApp('ADMIN', 'TECHNICIAN');

    const adminRes = await app.request('/test', {
      method: 'GET',
      headers: { 'X-Test-Role': 'ADMIN' },
    });
    expect(adminRes.status).toBe(200);

    const techRes = await app.request('/test', {
      method: 'GET',
      headers: { 'X-Test-Role': 'TECHNICIAN' },
    });
    expect(techRes.status).toBe(200);
  });

  it('rejects CUSTOMER for ADMIN+TECHNICIAN route', async () => {
    const app = createRoleApp('ADMIN', 'TECHNICIAN');

    const res = await app.request('/test', {
      method: 'GET',
      headers: { 'X-Test-Role': 'CUSTOMER' },
    });

    expect(res.status).toBe(403);
  });
});
