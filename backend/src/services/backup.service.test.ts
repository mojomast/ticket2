/**
 * backup.service.test.ts
 * Tests for backup/restore roundtrip, status management, and file operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist mocks ───
const { mockPrisma, mockWriteFile, mockReadFile, mockUnlink, mockMkdir, mockExistsSync } = vi.hoisted(() => {
  return {
    mockWriteFile: vi.fn().mockResolvedValue(undefined),
    mockReadFile: vi.fn(),
    mockUnlink: vi.fn().mockResolvedValue(undefined),
    mockMkdir: vi.fn().mockResolvedValue(undefined),
    mockExistsSync: vi.fn().mockReturnValue(true),
    mockPrisma: {
      backupRecord: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      ticket: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      appointment: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      message: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      notification: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      attachment: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      systemConfig: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      auditLog: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  unlink: mockUnlink,
  mkdir: mockMkdir,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  createBackup,
  restoreBackup,
  listBackups,
} from './backup.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset default mocks
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.ticket.findMany.mockResolvedValue([]);
  mockPrisma.appointment.findMany.mockResolvedValue([]);
  mockPrisma.message.findMany.mockResolvedValue([]);
  mockPrisma.notification.findMany.mockResolvedValue([]);
  mockPrisma.attachment.findMany.mockResolvedValue([]);
  mockPrisma.systemConfig.findMany.mockResolvedValue([]);
  mockPrisma.auditLog.findMany.mockResolvedValue([]);
  mockPrisma.backupRecord.findMany.mockResolvedValue([]);
  mockExistsSync.mockReturnValue(true);
  mockWriteFile.mockResolvedValue(undefined);
});

// ─── createBackup Tests ───
describe('createBackup', () => {
  it('creates a JSON file with all model data', async () => {
    const record = {
      id: 'backup-1',
      fileName: 'backup-full-test.json',
      storagePath: '/app/data/backups/backup-full-test.json',
      status: 'PENDING',
    };
    const completedRecord = { ...record, status: 'COMPLETED', fileSize: 100 };

    mockPrisma.backupRecord.create.mockResolvedValue(record);
    mockPrisma.backupRecord.update.mockResolvedValue(completedRecord);

    const result = await createBackup('admin-1', 'FULL');

    expect(mockWriteFile).toHaveBeenCalledOnce();
    // Verify the JSON data was written
    const writeCallArgs = mockWriteFile.mock.calls[0];
    expect(writeCallArgs[2]).toBe('utf-8');
    const writtenData = JSON.parse(writeCallArgs[1]);
    expect(writtenData).toHaveProperty('user');
    expect(writtenData).toHaveProperty('ticket');
  });

  it('updates record status to COMPLETED on success', async () => {
    const record = { id: 'backup-1', status: 'PENDING' };
    const completedRecord = { id: 'backup-1', status: 'COMPLETED' };

    mockPrisma.backupRecord.create.mockResolvedValue(record);
    mockPrisma.backupRecord.update.mockResolvedValue(completedRecord);

    const result = await createBackup('admin-1');

    // Check the update call set status to COMPLETED
    expect(mockPrisma.backupRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'backup-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      })
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('updates record status to FAILED on error', async () => {
    const record = { id: 'backup-1', status: 'PENDING' };
    mockPrisma.backupRecord.create.mockResolvedValue(record);

    // Make one of the model findMany calls throw
    mockPrisma.user.findMany.mockRejectedValue(new Error('DB connection lost'));
    mockPrisma.backupRecord.update.mockResolvedValue({ id: 'backup-1', status: 'FAILED' });

    await expect(createBackup('admin-1')).rejects.toThrow(/sauvegarde/i);

    // Verify FAILED status update was called
    expect(mockPrisma.backupRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'backup-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'DB connection lost',
        }),
      })
    );
  });
});

// ─── restoreBackup Tests ───
describe('restoreBackup', () => {
  it('throws for non-COMPLETED backups', async () => {
    mockPrisma.backupRecord.findUnique.mockResolvedValue({
      id: 'backup-1',
      status: 'PENDING',
      storagePath: '/app/data/backups/test.json',
    });

    await expect(
      restoreBackup('backup-1', 'admin-1')
    ).rejects.toThrow(/sauvegardes completees/i);
  });

  it('throws for non-existent backup record', async () => {
    mockPrisma.backupRecord.findUnique.mockResolvedValue(null);

    await expect(
      restoreBackup('nonexistent', 'admin-1')
    ).rejects.toThrow(/introuvable/);
  });
});

// ─── listBackups Tests ───
describe('listBackups', () => {
  it('returns paginated results', async () => {
    const backups = [
      { id: 'b1', status: 'COMPLETED' },
      { id: 'b2', status: 'COMPLETED' },
    ];
    mockPrisma.backupRecord.findMany.mockResolvedValue(backups);
    mockPrisma.backupRecord.count.mockResolvedValue(5);

    const result = await listBackups({ page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
    expect(result.error).toBeNull();
  });

  it('defaults pagination values', async () => {
    mockPrisma.backupRecord.findMany.mockResolvedValue([]);
    mockPrisma.backupRecord.count.mockResolvedValue(0);

    const result = await listBackups({});

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
  });
});
