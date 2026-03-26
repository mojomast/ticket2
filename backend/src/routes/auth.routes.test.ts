/**
 * auth.routes.test.ts
 * Integration tests for auth routes: login, demo-login, logout, /me.
 */

// Set env vars BEFORE any imports
process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ─── Hoist mocks ───
const { mockPrisma, mockCreateToken, mockVerifyToken, mockAuthenticate } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    mockCreateToken: vi.fn(),
    mockVerifyToken: vi.fn(),
    mockAuthenticate: vi.fn(),
  };
});

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../lib/auth.js', () => ({
  createToken: mockCreateToken,
  verifyToken: mockVerifyToken,
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../services/user.service.js', () => ({
  authenticate: mockAuthenticate,
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
import authRoutes from './auth.routes.js';

// Helper: create a test Hono app
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
  app.route('/api/auth', authRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset DEMO_MODE
  delete process.env.DEMO_MODE;
});

// ─── POST /api/auth/login ───
describe('POST /api/auth/login', () => {
  it('returns user data and sets cookie on valid credentials', async () => {
    const app = createTestApp();
    const mockUser = {
      id: 'user-1',
      email: 'admin@valitek.ca',
      firstName: 'Admin',
      lastName: 'Valitek',
      role: 'ADMIN',
      isActive: true,
    };

    mockAuthenticate.mockResolvedValue(mockUser);
    mockCreateToken.mockResolvedValue('jwt-token-123');

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@valitek.ca', password: 'password123' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('admin@valitek.ca');
    expect(body.error).toBeNull();

    // Verify cookie was set
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('valitek-auth=');
  });

  it('returns 401 on invalid credentials', async () => {
    const app = createTestApp();

    mockAuthenticate.mockRejectedValue(AppError.unauthorized('Email ou mot de passe invalide'));

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

// ─── POST /api/auth/demo-login ───
describe('POST /api/auth/demo-login', () => {
  it('works when DEMO_MODE=true', async () => {
    process.env.DEMO_MODE = 'true';
    const app = createTestApp();

    const demoUser = {
      id: 'demo-1',
      email: 'demo-admin@valitek.ca',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ADMIN',
      isDemo: true,
      isActive: true,
    };

    mockPrisma.user.findFirst.mockResolvedValue(demoUser);
    mockCreateToken.mockResolvedValue('demo-jwt-token');

    const res = await app.request('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo-admin@valitek.ca' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('demo-admin@valitek.ca');
    expect(body.data.isDemo).toBe(true);
  });

  it('returns 403 when DEMO_MODE is not true', async () => {
    delete process.env.DEMO_MODE;
    const app = createTestApp();

    const res = await app.request('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@valitek.ca' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });
});

// ─── POST /api/auth/logout ───
describe('POST /api/auth/logout', () => {
  it('clears cookie', async () => {
    const app = createTestApp();

    const res = await app.request('/api/auth/logout', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toBe('Deconnecte');

    // Verify cookie deletion (set-cookie with max-age=0 or expires in the past)
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('valitek-auth=');
  });
});

// ─── GET /api/auth/me ───
describe('GET /api/auth/me', () => {
  it('returns session user when authenticated', async () => {
    const app = createTestApp();

    mockVerifyToken.mockResolvedValue({
      id: 'user-1',
      email: 'admin@valitek.ca',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    });

    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'admin@valitek.ca',
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      permissions: null,
    });

    const res = await app.request('/api/auth/me', {
      method: 'GET',
      headers: { Cookie: 'valitek-auth=valid-jwt-token' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('user-1');
    expect(body.data.role).toBe('ADMIN');
    expect(body.error).toBeNull();
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp();

    const res = await app.request('/api/auth/me', {
      method: 'GET',
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
