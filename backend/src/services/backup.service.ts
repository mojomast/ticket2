import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/data/backups';
const MODELS = [
  'user', 'ticket', 'appointment', 'message', 'notification',
  'attachment', 'systemConfig', 'auditLog', 'backupRecord',
] as const;

async function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true });
  }
}

export async function listBackups(query: any) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.status) where.status = query.status;

  const [backups, total] = await Promise.all([
    prisma.backupRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.backupRecord.count({ where }),
  ]);

  return { data: backups, error: null, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getBackupById(id: string) {
  const backup = await prisma.backupRecord.findUnique({ where: { id } });
  if (!backup) throw AppError.notFound('Sauvegarde introuvable');
  return backup;
}

export async function createBackup(userId: string, type: string = 'FULL', tables?: string[]) {
  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup-${type.toLowerCase()}-${timestamp}.json`;
  const storagePath = join(BACKUP_DIR, fileName);

  const record = await prisma.backupRecord.create({
    data: {
      fileName,
      fileSize: 0,
      storagePath,
      type: type as any,
      status: 'PENDING',
      tables: tables || MODELS,
      recordCount: {},
      createdBy: userId,
    },
  });

  try {
    const data: Record<string, unknown[]> = {};
    const recordCount: Record<string, number> = {};
    const modelsToBackup = tables || MODELS;

    for (const model of modelsToBackup) {
      const prismaModel = (prisma as any)[model];
      if (!prismaModel) continue;
      const records = await prismaModel.findMany();
      data[model] = records;
      recordCount[model] = records.length;
    }

    const jsonData = JSON.stringify(data, null, 2);
    await writeFile(storagePath, jsonData, 'utf-8');

    const updated = await prisma.backupRecord.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        fileSize: Buffer.byteLength(jsonData),
        recordCount,
      },
    });

    return updated;
  } catch (err: any) {
    await prisma.backupRecord.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    throw AppError.badRequest(`Erreur lors de la sauvegarde: ${err.message}`);
  }
}

export async function deleteBackup(id: string) {
  const backup = await getBackupById(id);

  try {
    if (existsSync(backup.storagePath)) {
      await unlink(backup.storagePath);
    }
  } catch {
    // File may already be deleted
  }

  return prisma.backupRecord.delete({ where: { id } });
}

export async function downloadBackup(id: string) {
  const backup = await getBackupById(id);

  if (!existsSync(backup.storagePath)) {
    throw AppError.notFound('Fichier de sauvegarde introuvable');
  }

  const content = await readFile(backup.storagePath, 'utf-8');
  return { content, fileName: backup.fileName };
}

export async function restoreBackup(id: string, userId: string) {
  const backup = await getBackupById(id);

  if (backup.status !== 'COMPLETED') {
    throw AppError.badRequest('Seules les sauvegardes completees peuvent etre restaurees');
  }

  if (!existsSync(backup.storagePath)) {
    throw AppError.notFound('Fichier de sauvegarde introuvable');
  }

  const content = await readFile(backup.storagePath, 'utf-8');
  const data = JSON.parse(content);

  // Delete existing data in reverse dependency order
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.systemConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Restore data
  for (const model of MODELS) {
    if (!data[model] || !Array.isArray(data[model])) continue;
    const prismaModel = (prisma as any)[model];
    if (!prismaModel) continue;

    for (const record of data[model]) {
      try {
        await prismaModel.create({ data: record });
      } catch {
        // Skip records that fail (e.g., FK constraints during partial restore)
      }
    }
  }

  await prisma.backupRecord.update({
    where: { id },
    data: { status: 'RESTORED', restoredAt: new Date(), restoredBy: userId },
  });

  return getBackupById(id);
}
