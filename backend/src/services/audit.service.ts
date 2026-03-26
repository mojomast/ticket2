import { prisma } from '../lib/prisma.js';

interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export async function createAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      oldValue: entry.oldValue as any,
      newValue: entry.newValue as any,
    },
  });
}

export async function getAuditLogs(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
}
