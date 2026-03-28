process.env.AUTH_SECRET = 'test-secret-for-vitest-at-least-32-chars!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockConfig } = vi.hoisted(() => ({
  mockPrisma: {
    notification: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
  mockConfig: {
    NOTIFICATION_RETENTION_ENABLED: true,
    NOTIFICATION_RETENTION_READ_DAYS: 30,
    NOTIFICATION_RETENTION_UNREAD_DAYS: 180,
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../lib/config.js', () => ({
  config: mockConfig,
}));

import {
  cleanupExpiredNotifications,
  getNotificationRetentionPolicy,
} from './notification.service.js';

describe('notification retention cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-28T12:00:00.000Z'));
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    mockConfig.NOTIFICATION_RETENTION_ENABLED = true;
    mockConfig.NOTIFICATION_RETENTION_READ_DAYS = 30;
    mockConfig.NOTIFICATION_RETENTION_UNREAD_DAYS = 180;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns configured retention policy', () => {
    mockConfig.NOTIFICATION_RETENTION_READ_DAYS = 14;
    mockConfig.NOTIFICATION_RETENTION_UNREAD_DAYS = 90;

    expect(getNotificationRetentionPolicy()).toEqual({
      enabled: true,
      readDays: 14,
      unreadDays: 90,
    });
  });

  it('deletes old read and unread notifications with separate thresholds', async () => {
    mockPrisma.notification.deleteMany
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 2 });

    const result = await cleanupExpiredNotifications({
      enabled: true,
      readDays: 30,
      unreadDays: 180,
    });

    expect(mockPrisma.notification.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        readAt: {
          not: null,
          lt: new Date('2026-02-26T12:00:00.000Z'),
        },
      },
    });
    expect(mockPrisma.notification.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        readAt: null,
        createdAt: {
          lt: new Date('2025-09-29T12:00:00.000Z'),
        },
      },
    });
    expect(result).toMatchObject({
      enabled: true,
      readDeleted: 4,
      unreadDeleted: 2,
      totalDeleted: 6,
    });
  });

  it('skips deletion when retention cleanup is disabled', async () => {
    const result = await cleanupExpiredNotifications({
      enabled: false,
      readDays: 30,
      unreadDays: 180,
    });

    expect(mockPrisma.notification.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      enabled: false,
      readDeleted: 0,
      unreadDeleted: 0,
      totalDeleted: 0,
      thresholds: null,
    });
  });
});
