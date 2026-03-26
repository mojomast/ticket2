/**
 * user.service.test.ts
 * Tests for password hashing, soft delete, authentication, and default permissions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mocks ───
const { mockHashPassword, mockVerifyPassword, mockPrisma } = vi.hoisted(() => {
  return {
    mockHashPassword: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

vi.mock('../lib/auth.js', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  createUser,
  deleteUser,
  authenticate,
} from './user.service.js';
import { DEFAULT_TECH_PERMISSIONS } from '../types/index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createUser Tests ───
describe('createUser', () => {
  it('hashes password before storing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // no duplicate
    mockHashPassword.mockResolvedValue('$argon2id$hashed');
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'CUSTOMER',
    });

    await createUser({
      email: 'test@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'CUSTOMER',
    });

    expect(mockHashPassword).toHaveBeenCalledWith('password123');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: '$argon2id$hashed',
        }),
      })
    );
  });

  it('throws CONFLICT for duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      createUser({
        email: 'existing@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CUSTOMER',
      })
    ).rejects.toThrow(/email existe deja/);
  });

  it('adds DEFAULT_TECH_PERMISSIONS for TECHNICIAN role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('$argon2id$hashed');
    mockPrisma.user.create.mockResolvedValue({
      id: 'tech-1',
      email: 'tech@test.com',
      firstName: 'Tech',
      lastName: 'User',
      role: 'TECHNICIAN',
      permissions: DEFAULT_TECH_PERMISSIONS,
    });

    await createUser({
      email: 'tech@test.com',
      password: 'password123',
      firstName: 'Tech',
      lastName: 'User',
      role: 'TECHNICIAN',
    });

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.permissions).toEqual(
      JSON.parse(JSON.stringify(DEFAULT_TECH_PERMISSIONS))
    );
  });

  it('does not add permissions for CUSTOMER role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('$argon2id$hashed');
    mockPrisma.user.create.mockResolvedValue({
      id: 'cust-1',
      email: 'customer@test.com',
      role: 'CUSTOMER',
    });

    await createUser({
      email: 'customer@test.com',
      password: 'password123',
      firstName: 'Cust',
      lastName: 'User',
      role: 'CUSTOMER',
    });

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.permissions).toBeUndefined();
  });
});

// ─── deleteUser Tests ───
describe('deleteUser', () => {
  it('sets deletedAt and isActive=false (soft delete)', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      isActive: true,
      deletedAt: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      isActive: false,
      deletedAt: new Date(),
    });

    const result = await deleteUser('user-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
      })
    );
    expect(result.isActive).toBe(false);
    expect((result as any).deletedAt).toBeTruthy();
  });
});

// ─── authenticate Tests ───
describe('authenticate', () => {
  it('throws UNAUTHORIZED for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      passwordHash: '$argon2id$hash',
      isActive: true,
      deletedAt: null,
    });
    mockVerifyPassword.mockResolvedValue(false);

    await expect(
      authenticate('test@test.com', 'wrong-password')
    ).rejects.toThrow(/Email ou mot de passe invalide/);
  });

  it('throws UNAUTHORIZED for inactive user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      passwordHash: '$argon2id$hash',
      isActive: false,
    });

    await expect(
      authenticate('test@test.com', 'password123')
    ).rejects.toThrow(/Email ou mot de passe invalide/);
  });

  it('throws UNAUTHORIZED for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authenticate('nonexistent@test.com', 'password123')
    ).rejects.toThrow(/Email ou mot de passe invalide/);
  });

  it('returns user without password hash on success', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$argon2id$hash',
      isActive: true,
      role: 'ADMIN',
    });
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticate('test@test.com', 'correct-password');

    expect(result.email).toBe('test@test.com');
    expect((result as any).passwordHash).toBeUndefined();
  });
});
