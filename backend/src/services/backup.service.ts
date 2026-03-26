import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/data/backups';

// All models to backup/export (order doesn't matter for export)
const MODELS = [
  'user', 'ticket', 'appointment', 'appointmentProposal', 'message',
  'notification', 'attachment', 'systemConfig', 'auditLog', 'backupRecord',
  'workOrder', 'workOrderNote',
] as const;

// Delete order: child → parent (respect FK constraints)
// Appointment has FK to AppointmentProposal (proposalId), so delete appointment first
const DELETE_ORDER = [
  'workOrderNote',       // depends on WorkOrder, User
  'workOrder',           // depends on User
  'notification',        // depends on User, Ticket
  'attachment',          // depends on Ticket, Message, User
  'message',             // depends on Ticket, User
  'appointment',         // depends on Ticket, User, AppointmentProposal
  'appointmentProposal', // depends on Ticket, User
  'ticket',              // depends on User
  'auditLog',            // no FK enforced but references userId
  'systemConfig',        // standalone
  'backupRecord',        // standalone
  'user',                // delete LAST — everything depends on User
] as const;

// Insert order: parent → child (respect FK constraints)
// AppointmentProposal must come before Appointment (Appointment.proposalId FK)
const INSERT_ORDER = [
  'user', 'systemConfig', 'ticket', 'appointmentProposal', 'appointment',
  'message', 'attachment', 'notification', 'workOrder', 'workOrderNote',
  'auditLog', 'backupRecord',
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

  // Fetch the current admin user so we can preserve their session
  const currentAdmin = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentAdmin) {
    throw AppError.badRequest('Utilisateur courant introuvable');
  }

  try {
    await prisma.$transaction(async (tx) => {
      // ── Phase 1: Delete all existing data in child → parent order ──
      for (const model of DELETE_ORDER) {
        const prismaModel = (tx as any)[model];
        if (!prismaModel) continue;

        if (model === 'user') {
          // Keep the currently logged-in admin alive to preserve their session
          await prismaModel.deleteMany({ where: { id: { not: userId } } });
        } else {
          await prismaModel.deleteMany();
        }
      }

      // ── Phase 2: Insert backup data in parent → child order ──
      for (const model of INSERT_ORDER) {
        if (!data[model] || !Array.isArray(data[model]) || data[model].length === 0) continue;
        const prismaModel = (tx as any)[model];
        if (!prismaModel) continue;

        if (model === 'user') {
          // The current admin already exists — upsert them if they're in the backup,
          // then insert the rest. This avoids a unique constraint violation.
          const backupUsers = data[model] as any[];
          const otherUsers = backupUsers.filter((u: any) => u.id !== userId);
          const currentAdminBackup = backupUsers.find((u: any) => u.id === userId);

          // Update the current admin with backup data if present
          if (currentAdminBackup) {
            await prismaModel.update({
              where: { id: userId },
              data: {
                ...currentAdminBackup,
                // Keep their role as ADMIN to preserve session
                role: currentAdmin.role,
              },
            });
          }

          // Insert remaining users via createMany (skip duplicates)
          if (otherUsers.length > 0) {
            await prismaModel.createMany({
              data: otherUsers,
              skipDuplicates: true,
            });
          }
        } else {
          // Use createMany for bulk insert (more efficient, fewer round-trips)
          try {
            await prismaModel.createMany({
              data: data[model],
              skipDuplicates: true,
            });
          } catch (err: any) {
            // Some models may have fields incompatible with createMany (e.g., relations).
            // Fall back to individual creates and log failures.
            logger.warn({ model, error: err.message }, `createMany failed for ${model}, falling back to individual inserts`);
            for (const record of data[model]) {
              try {
                await prismaModel.create({ data: record });
              } catch (innerErr: any) {
                logger.error(
                  { model, recordId: record.id, error: innerErr.message },
                  `Failed to restore record in ${model}`
                );
              }
            }
          }
        }
      }
    }, {
      // Increase timeout for large restores (5 minutes)
      timeout: 300_000,
    });
  } catch (err: any) {
    logger.error({ backupId: id, error: err.message }, 'Backup restore failed');
    throw AppError.badRequest(`Erreur lors de la restauration: ${err.message}`);
  }

  await prisma.backupRecord.update({
    where: { id },
    data: { status: 'RESTORED', restoredAt: new Date(), restoredBy: userId },
  });

  return getBackupById(id);
}
