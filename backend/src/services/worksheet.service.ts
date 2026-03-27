import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import type { UserRole, WorksheetStatus } from '@prisma/client';
import type {
  CreateWorksheetInput,
  UpdateWorksheetInput,
  WorksheetListQuery,
  CreateLaborEntryInput,
  UpdateLaborEntryInput,
  CreatePartInput,
  UpdatePartInput,
  CreateTravelEntryInput,
  UpdateTravelEntryInput,
  CreateWorksheetNoteInput,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  SaveSignatureInput,
} from '../validations/worksheet.js';
import * as notificationService from './notification.service.js';
import * as kbService from './knowledgebase.service.js';
import { createAuditLog } from './audit.service.js';
import { sendEmail } from './email.service.js';
import { logger } from '../lib/logger.js';

// ─── Prisma Includes ───

const USER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, role: true,
};

const WORKSHEET_LIST_INCLUDE = {
  technician: { select: USER_SELECT },
  workOrder: {
    select: {
      orderNumber: true,
      status: true,
      customerName: true,
      deviceBrand: true,
      deviceModel: true,
    },
  },
};

const WORKSHEET_DETAIL_INCLUDE = {
  technician: { select: USER_SELECT },
  reviewedBy: { select: USER_SELECT },
  approvedBy: { select: USER_SELECT },
  workOrder: {
    include: {
      customer: {
        select: { ...USER_SELECT, customerType: true, companyName: true, address: true, phone: true },
      },
    },
  },
  laborEntries: { orderBy: { createdAt: 'asc' as const } },
  parts: { orderBy: { createdAt: 'asc' as const } },
  travelEntries: { orderBy: { createdAt: 'asc' as const } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: USER_SELECT } },
  },
  followUps: { orderBy: { scheduledDate: 'asc' as const } },
};

// ─── Worksheet Status State Machine ───

const WS_ALLOWED_TRANSITIONS: Record<WorksheetStatus, Array<{ to: WorksheetStatus; roles: UserRole[] }>> = {
  BROUILLON: [
    { to: 'SOUMISE', roles: ['TECHNICIAN', 'ADMIN'] },
    { to: 'ANNULEE', roles: ['ADMIN', 'TECHNICIAN'] },
  ],
  SOUMISE: [
    { to: 'REVISEE', roles: ['ADMIN'] },
    { to: 'APPROUVEE', roles: ['ADMIN'] },
  ],
  REVISEE: [
    { to: 'SOUMISE', roles: ['TECHNICIAN'] },
    { to: 'APPROUVEE', roles: ['ADMIN'] },
  ],
  APPROUVEE: [
    { to: 'FACTUREE', roles: ['ADMIN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  FACTUREE: [],
  ANNULEE: [],
};

// ─── Internal: Recalculate Totals ───

async function recalculateTotals(worksheetId: string): Promise<void> {
  const [laborAgg, partsAgg, travelAgg] = await Promise.all([
    prisma.laborEntry.aggregate({
      where: { worksheetId },
      _sum: { lineTotal: true },
    }),
    prisma.partUsed.aggregate({
      where: { worksheetId },
      _sum: { lineTotal: true },
    }),
    prisma.travelEntry.aggregate({
      where: { worksheetId },
      _sum: { lineTotal: true },
    }),
  ]);

  const totalLabor = laborAgg._sum.lineTotal ?? 0;
  const totalParts = partsAgg._sum.lineTotal ?? 0;
  const totalTravel = travelAgg._sum.lineTotal ?? 0;
  const grandTotal = totalLabor + totalParts + totalTravel;

  await prisma.worksheet.update({
    where: { id: worksheetId },
    data: { totalLabor, totalParts, totalTravel, grandTotal },
  });
}

// ─── Internal: Calculate Labor billableHours & lineTotal ───

function calculateLaborLine(startTime: Date, endTime: Date | null, breakMinutes: number, hourlyRate: number) {
  if (!endTime) {
    return { billableHours: null, lineTotal: null };
  }
  const totalMs = endTime.getTime() - startTime.getTime();
  const totalHours = totalMs / (1000 * 60 * 60);
  const breakHours = breakMinutes / 60;
  const billableHours = Math.max(0, parseFloat((totalHours - breakHours).toFixed(4)));
  const lineTotal = parseFloat((billableHours * hourlyRate).toFixed(2));
  return { billableHours, lineTotal };
}

// ─── Internal: Verify worksheet exists & is not deleted ───

async function findWorksheetOrThrow(id: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id, deletedAt: null },
    include: WORKSHEET_DETAIL_INCLUDE,
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');
  return ws;
}

// ─── Internal: Verify worksheet is in BROUILLON status ───

async function requireDraftStatus(worksheetId: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    select: { id: true, status: true, technicianId: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');
  if (ws.status !== 'BROUILLON') {
    throw AppError.badRequest('Cette action n\'est permise que sur une feuille de travail en brouillon');
  }
  return ws;
}

// ─── Internal: Get high-value threshold from SystemConfig ───

async function getHighValueThreshold(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'worksheet_alert_threshold' },
    });
    if (config?.value && typeof config.value === 'object') {
      const v = config.value as Record<string, unknown>;
      const threshold = v.threshold ?? v.value;
      if (typeof threshold === 'number') return threshold;
    }
    if (typeof config?.value === 'number') return config.value as number;
  } catch {
    // Fall through to default
  }
  return 500;
}

// ═══════════════════════════════════════════════════════
//  CRUD
// ═══════════════════════════════════════════════════════

export async function createWorksheet(data: CreateWorksheetInput, technicianId: string, role: UserRole) {
  if (role === 'CUSTOMER') {
    throw AppError.forbidden('Seuls les administrateurs et techniciens peuvent creer une feuille de travail');
  }

  // Verify work order exists and is not deleted
  const workOrder = await prisma.workOrder.findFirst({
    where: { id: data.workOrderId, deletedAt: null },
    select: { id: true, orderNumber: true },
  });
  if (!workOrder) throw AppError.notFound('Bon de travail introuvable');

  const worksheet = await prisma.worksheet.create({
    data: {
      workOrderId: data.workOrderId,
      technicianId,
      status: 'BROUILLON',
    },
    include: WORKSHEET_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheet.id,
    action: 'CREATED',
    userId: technicianId,
    newValue: { workOrderId: data.workOrderId, orderNumber: workOrder.orderNumber },
  }).catch(() => {});

  return worksheet;
}

export async function getWorksheetById(id: string, userId: string, role: UserRole) {
  const ws = await findWorksheetOrThrow(id);

  // Access control: CUSTOMER can only view worksheets for their own work orders
  if (role === 'CUSTOMER' && ws.workOrder.customerId !== userId) {
    throw AppError.forbidden('Acces refuse');
  }

  return ws;
}

export async function listWorksheets(query: WorksheetListQuery, userId: string, role: UserRole) {
  const { page, limit, skip } = getPagination({ page: query.page, limit: query.limit });

  const where: any = { deletedAt: null };
  const conditions: any[] = [];

  // Role-based filtering
  if (role === 'TECHNICIAN') {
    where.technicianId = userId;
  } else if (role === 'CUSTOMER') {
    where.workOrder = { customerId: userId, deletedAt: null };
  }
  // ADMIN sees all

  // Filters
  if (query.status) where.status = query.status;
  if (query.technicianId) where.technicianId = query.technicianId;
  if (query.workOrderId) where.workOrderId = query.workOrderId;
  if (query.search) {
    conditions.push({
      OR: [
        { workOrder: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
        { workOrder: { customerName: { contains: query.search, mode: 'insensitive' } } },
      ],
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  // Sorting
  const orderBy: any = {};
  orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

  const [worksheets, total] = await Promise.all([
    prisma.worksheet.findMany({
      where,
      include: WORKSHEET_LIST_INCLUDE,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.worksheet.count({ where }),
  ]);

  return buildPaginatedResponse(worksheets, total, page, limit);
}

export async function updateWorksheet(id: string, data: UpdateWorksheetInput, userId: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  if (ws.status !== 'BROUILLON') {
    throw AppError.badRequest('La feuille de travail ne peut etre modifiee qu\'en statut brouillon');
  }

  const updated = await prisma.worksheet.update({
    where: { id },
    data: { summary: data.summary },
    include: WORKSHEET_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: id,
    action: 'UPDATED',
    userId,
    newValue: { summary: data.summary },
  }).catch(() => {});

  return updated;
}

export async function deleteWorksheet(id: string, userId: string, role: UserRole) {
  if (role !== 'ADMIN') {
    throw AppError.forbidden('Seul un administrateur peut supprimer une feuille de travail');
  }

  const ws = await prisma.worksheet.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  if (ws.status !== 'BROUILLON') {
    throw AppError.badRequest('Seule une feuille de travail en brouillon peut etre supprimee');
  }

  const deleted = await prisma.worksheet.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: WORKSHEET_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: id,
    action: 'DELETED',
    userId,
  }).catch(() => {});

  return deleted;
}

// ═══════════════════════════════════════════════════════
//  STATUS WORKFLOW
// ═══════════════════════════════════════════════════════

export async function changeStatus(
  id: string,
  newStatus: WorksheetStatus,
  reason: string | undefined,
  userId: string,
  role: UserRole,
) {
  const ws = await findWorksheetOrThrow(id);

  // Validate transition
  const transitions = WS_ALLOWED_TRANSITIONS[ws.status as WorksheetStatus] || [];
  const allowed = transitions.find(t => t.to === newStatus);

  if (!allowed) {
    throw AppError.badRequest(
      `Transition de ${ws.status} vers ${newStatus} non autorisee. ` +
      `Transitions possibles: ${transitions.map(t => t.to).join(', ') || 'aucune'}`,
    );
  }

  if (!allowed.roles.includes(role)) {
    throw AppError.forbidden(`Votre role (${role}) ne permet pas cette transition`);
  }

  const updateData: any = { status: newStatus };

  // Auto-set timestamps based on target status
  if (newStatus === 'SOUMISE') {
    updateData.submittedAt = new Date();
    // Recalculate totals before submission
    await recalculateTotals(id);
  }
  if (newStatus === 'REVISEE') {
    updateData.reviewedAt = new Date();
    updateData.reviewedById = userId;
  }
  if (newStatus === 'APPROUVEE') {
    updateData.approvedAt = new Date();
    updateData.approvedById = userId;
  }
  if (newStatus === 'FACTUREE') {
    updateData.billedAt = new Date();
  }

  const updated = await prisma.worksheet.update({
    where: { id },
    data: updateData,
    include: WORKSHEET_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: id,
    action: 'STATUS_CHANGED',
    userId,
    oldValue: { status: ws.status },
    newValue: { status: newStatus, reason },
  }).catch(() => {});

  // ─── On Submission: notify admins + email + high-value check ───
  if (newStatus === 'SOUMISE') {
    // Notify all admins about submission
    prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    }).then(admins => {
      const adminIds = admins.map(a => a.id);
      if (adminIds.length > 0) {
        const notifications = adminIds.map(adminId => ({
          userId: adminId,
          type: 'WORKSHEET_SUBMITTED' as const,
          title: 'Feuille de travail soumise',
          message: `La feuille de travail pour le bon ${updated.workOrder.orderNumber} a ete soumise pour revision`,
        }));
        prisma.notification.createMany({ data: notifications }).catch(() => {});
      }

      // Email admins
      for (const admin of admins) {
        if (admin.email) {
          sendEmail({
            to: admin.email,
            subject: `Feuille de travail soumise — ${updated.workOrder.orderNumber}`,
            body: `Bonjour ${admin.firstName},\n\nUne feuille de travail pour le bon de travail ${updated.workOrder.orderNumber} a été soumise et attend votre révision.\n\nMontant total: ${updated.grandTotal}$`,
          }).catch(err => logger.error({ err }, 'Failed to send worksheet submission email'));
        }
      }
    }).catch(() => {});

    // High-value threshold check
    getHighValueThreshold().then(threshold => {
      if (updated.grandTotal > threshold) {
        // Notify all admins about high-value worksheet
        prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true, deletedAt: null },
          select: { id: true },
        }).then(admins => {
          const notifications = admins.map(a => ({
            userId: a.id,
            type: 'WORKSHEET_HIGH_VALUE' as const,
            title: 'Feuille de travail à valeur élevée',
            message: `La feuille de travail pour le bon ${updated.workOrder.orderNumber} dépasse le seuil (${updated.grandTotal}$ > ${threshold}$)`,
          }));
          if (notifications.length > 0) {
            prisma.notification.createMany({ data: notifications }).catch(() => {});
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  // ─── On Approval: notify technician ───
  if (newStatus === 'APPROUVEE') {
    notificationService.notify({
      userId: ws.technicianId,
      type: 'WORKSHEET_APPROVED',
      title: 'Feuille de travail approuvee',
      message: `Votre feuille de travail pour le bon ${updated.workOrder.orderNumber} a ete approuvee`,
    }).catch(() => {});
  }

  return updated;
}

// ═══════════════════════════════════════════════════════
//  LABOR ENTRIES
// ═══════════════════════════════════════════════════════

export async function addLaborEntry(worksheetId: string, data: CreateLaborEntryInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const startTime = new Date(data.startTime);
  const endTime = data.endTime ? new Date(data.endTime) : null;
  const breakMinutes = data.breakMinutes ?? 0;
  const { billableHours, lineTotal } = calculateLaborLine(startTime, endTime, breakMinutes, data.hourlyRate);

  const entry = await prisma.laborEntry.create({
    data: {
      worksheetId,
      laborType: data.laborType,
      description: data.description ?? null,
      startTime,
      endTime,
      breakMinutes,
      hourlyRate: data.hourlyRate,
      billableHours,
      lineTotal,
    },
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'LABOR_ADDED',
    userId,
    newValue: { entryId: entry.id, laborType: data.laborType, billableHours, lineTotal },
  }).catch(() => {});

  return entry;
}

export async function updateLaborEntry(worksheetId: string, entryId: string, data: UpdateLaborEntryInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.laborEntry.findFirst({
    where: { id: entryId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Entree de main-d\'oeuvre introuvable');

  const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const endTime = data.endTime !== undefined
    ? (data.endTime ? new Date(data.endTime) : null)
    : existing.endTime;
  const breakMinutes = data.breakMinutes ?? existing.breakMinutes;
  const hourlyRate = data.hourlyRate ?? existing.hourlyRate;
  const { billableHours, lineTotal } = calculateLaborLine(startTime, endTime, breakMinutes, hourlyRate);

  const updatePayload: any = { billableHours, lineTotal };
  if (data.laborType !== undefined) updatePayload.laborType = data.laborType;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.startTime !== undefined) updatePayload.startTime = startTime;
  if (data.endTime !== undefined) updatePayload.endTime = endTime;
  if (data.breakMinutes !== undefined) updatePayload.breakMinutes = breakMinutes;
  if (data.hourlyRate !== undefined) updatePayload.hourlyRate = hourlyRate;

  const updated = await prisma.laborEntry.update({
    where: { id: entryId },
    data: updatePayload,
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'LABOR_UPDATED',
    userId,
    oldValue: { entryId, billableHours: existing.billableHours, lineTotal: existing.lineTotal },
    newValue: { entryId, billableHours: updated.billableHours, lineTotal: updated.lineTotal },
  }).catch(() => {});

  return updated;
}

export async function deleteLaborEntry(worksheetId: string, entryId: string, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.laborEntry.findFirst({
    where: { id: entryId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Entree de main-d\'oeuvre introuvable');

  await prisma.laborEntry.delete({ where: { id: entryId } });
  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'LABOR_DELETED',
    userId,
    oldValue: { entryId, laborType: existing.laborType, lineTotal: existing.lineTotal },
  }).catch(() => {});
}

export async function stopTimer(worksheetId: string, entryId: string, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.laborEntry.findFirst({
    where: { id: entryId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Entree de main-d\'oeuvre introuvable');

  if (existing.endTime) {
    throw AppError.badRequest('Le chronometre est deja arrete');
  }

  const endTime = new Date();
  const { billableHours, lineTotal } = calculateLaborLine(existing.startTime, endTime, existing.breakMinutes, existing.hourlyRate);

  const updated = await prisma.laborEntry.update({
    where: { id: entryId },
    data: { endTime, billableHours, lineTotal },
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'TIMER_STOPPED',
    userId,
    newValue: { entryId, endTime, billableHours, lineTotal },
  }).catch(() => {});

  return updated;
}

// ═══════════════════════════════════════════════════════
//  PARTS
// ═══════════════════════════════════════════════════════

export async function addPart(worksheetId: string, data: CreatePartInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const quantity = data.quantity ?? 1;
  const lineTotal = parseFloat((quantity * data.unitPrice).toFixed(2));

  const part = await prisma.partUsed.create({
    data: {
      worksheetId,
      partName: data.partName,
      partNumber: data.partNumber ?? null,
      supplier: data.supplier ?? null,
      supplierCost: data.supplierCost,
      quantity,
      unitPrice: data.unitPrice,
      lineTotal,
      warrantyMonths: data.warrantyMonths ?? null,
      warrantyNotes: data.warrantyNotes ?? null,
    },
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'PART_ADDED',
    userId,
    newValue: { partId: part.id, partName: data.partName, lineTotal },
  }).catch(() => {});

  return part;
}

export async function updatePart(worksheetId: string, partId: string, data: UpdatePartInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.partUsed.findFirst({
    where: { id: partId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Piece introuvable');

  const quantity = data.quantity ?? existing.quantity;
  const unitPrice = data.unitPrice ?? existing.unitPrice;
  const lineTotal = parseFloat((quantity * unitPrice).toFixed(2));

  const updatePayload: any = { lineTotal };
  if (data.partName !== undefined) updatePayload.partName = data.partName;
  if (data.partNumber !== undefined) updatePayload.partNumber = data.partNumber;
  if (data.supplier !== undefined) updatePayload.supplier = data.supplier;
  if (data.supplierCost !== undefined) updatePayload.supplierCost = data.supplierCost;
  if (data.quantity !== undefined) updatePayload.quantity = quantity;
  if (data.unitPrice !== undefined) updatePayload.unitPrice = unitPrice;
  if (data.warrantyMonths !== undefined) updatePayload.warrantyMonths = data.warrantyMonths;
  if (data.warrantyNotes !== undefined) updatePayload.warrantyNotes = data.warrantyNotes;

  const updated = await prisma.partUsed.update({
    where: { id: partId },
    data: updatePayload,
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'PART_UPDATED',
    userId,
    oldValue: { partId, lineTotal: existing.lineTotal },
    newValue: { partId, lineTotal: updated.lineTotal },
  }).catch(() => {});

  return updated;
}

export async function deletePart(worksheetId: string, partId: string, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.partUsed.findFirst({
    where: { id: partId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Piece introuvable');

  await prisma.partUsed.delete({ where: { id: partId } });
  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'PART_DELETED',
    userId,
    oldValue: { partId, partName: existing.partName, lineTotal: existing.lineTotal },
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════
//  TRAVEL ENTRIES
// ═══════════════════════════════════════════════════════

export async function addTravelEntry(worksheetId: string, data: CreateTravelEntryInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const lineTotal = parseFloat((data.distanceKm * data.ratePerKm).toFixed(2));

  const entry = await prisma.travelEntry.create({
    data: {
      worksheetId,
      departureAddress: data.departureAddress ?? null,
      arrivalAddress: data.arrivalAddress ?? null,
      distanceKm: data.distanceKm,
      travelTimeMinutes: data.travelTimeMinutes ?? null,
      ratePerKm: data.ratePerKm,
      lineTotal,
      travelDate: data.travelDate ? new Date(data.travelDate) : new Date(),
      notes: data.notes ?? null,
    },
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'TRAVEL_ADDED',
    userId,
    newValue: { entryId: entry.id, distanceKm: data.distanceKm, lineTotal },
  }).catch(() => {});

  return entry;
}

export async function updateTravelEntry(worksheetId: string, entryId: string, data: UpdateTravelEntryInput, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.travelEntry.findFirst({
    where: { id: entryId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Entree de deplacement introuvable');

  const distanceKm = data.distanceKm ?? existing.distanceKm;
  const ratePerKm = data.ratePerKm ?? existing.ratePerKm;
  const lineTotal = parseFloat((distanceKm * ratePerKm).toFixed(2));

  const updatePayload: any = { lineTotal };
  if (data.departureAddress !== undefined) updatePayload.departureAddress = data.departureAddress;
  if (data.arrivalAddress !== undefined) updatePayload.arrivalAddress = data.arrivalAddress;
  if (data.distanceKm !== undefined) updatePayload.distanceKm = distanceKm;
  if (data.travelTimeMinutes !== undefined) updatePayload.travelTimeMinutes = data.travelTimeMinutes;
  if (data.ratePerKm !== undefined) updatePayload.ratePerKm = ratePerKm;
  if (data.travelDate !== undefined) updatePayload.travelDate = data.travelDate ? new Date(data.travelDate) : existing.travelDate;
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  const updated = await prisma.travelEntry.update({
    where: { id: entryId },
    data: updatePayload,
  });

  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'TRAVEL_UPDATED',
    userId,
    oldValue: { entryId, lineTotal: existing.lineTotal },
    newValue: { entryId, lineTotal: updated.lineTotal },
  }).catch(() => {});

  return updated;
}

export async function deleteTravelEntry(worksheetId: string, entryId: string, userId: string) {
  await requireDraftStatus(worksheetId);

  const existing = await prisma.travelEntry.findFirst({
    where: { id: entryId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Entree de deplacement introuvable');

  await prisma.travelEntry.delete({ where: { id: entryId } });
  await recalculateTotals(worksheetId);

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'TRAVEL_DELETED',
    userId,
    oldValue: { entryId, distanceKm: existing.distanceKm, lineTotal: existing.lineTotal },
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════
//  NOTES
// ═══════════════════════════════════════════════════════

export async function addNote(worksheetId: string, data: CreateWorksheetNoteInput, userId: string, role: UserRole) {
  const ws = await prisma.worksheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  // Notes can be added when BROUILLON (tech filling in) or SOUMISE (admin adding review notes)
  if (ws.status !== 'BROUILLON' && ws.status !== 'SOUMISE') {
    throw AppError.badRequest('Les notes ne peuvent etre ajoutees qu\'en statut brouillon ou soumise');
  }

  // Only ADMIN can add notes when status is SOUMISE
  if (ws.status === 'SOUMISE' && role !== 'ADMIN') {
    throw AppError.forbidden('Seul un administrateur peut ajouter des notes sur une feuille soumise');
  }

  const note = await prisma.worksheetNote.create({
    data: {
      worksheetId,
      authorId: userId,
      noteType: data.noteType,
      content: data.content,
    },
    include: { author: { select: USER_SELECT } },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'NOTE_ADDED',
    userId,
    newValue: { noteId: note.id, noteType: data.noteType },
  }).catch(() => {});

  return note;
}

export async function deleteNote(worksheetId: string, noteId: string, userId: string, role: UserRole) {
  const note = await prisma.worksheetNote.findFirst({
    where: { id: noteId, worksheetId },
  });
  if (!note) throw AppError.notFound('Note introuvable');

  // Only the author or ADMIN can delete a note
  if (note.authorId !== userId && role !== 'ADMIN') {
    throw AppError.forbidden('Seul l\'auteur ou un administrateur peut supprimer cette note');
  }

  await prisma.worksheetNote.delete({ where: { id: noteId } });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'NOTE_DELETED',
    userId,
    oldValue: { noteId, noteType: note.noteType },
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════
//  FOLLOW-UPS
// ═══════════════════════════════════════════════════════

export async function createFollowUp(worksheetId: string, data: CreateFollowUpInput, userId: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    select: { id: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  const followUp = await prisma.followUp.create({
    data: {
      worksheetId,
      followUpType: data.followUpType,
      scheduledDate: new Date(data.scheduledDate),
      notes: data.notes ?? null,
    },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'FOLLOWUP_CREATED',
    userId,
    newValue: { followUpId: followUp.id, followUpType: data.followUpType, scheduledDate: data.scheduledDate },
  }).catch(() => {});

  return followUp;
}

export async function updateFollowUp(worksheetId: string, followUpId: string, data: UpdateFollowUpInput, userId: string) {
  const existing = await prisma.followUp.findFirst({
    where: { id: followUpId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Suivi introuvable');

  const updatePayload: any = {};
  if (data.followUpType !== undefined) updatePayload.followUpType = data.followUpType;
  if (data.scheduledDate !== undefined) updatePayload.scheduledDate = new Date(data.scheduledDate);
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.completed !== undefined) {
    updatePayload.completed = data.completed;
    updatePayload.completedAt = data.completed ? new Date() : null;
    updatePayload.completedById = data.completed ? userId : null;
  }

  const updated = await prisma.followUp.update({
    where: { id: followUpId },
    data: updatePayload,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: existing.worksheetId,
    action: 'FOLLOWUP_UPDATED',
    userId,
    oldValue: { followUpId, completed: existing.completed },
    newValue: { followUpId, completed: updated.completed },
  }).catch(() => {});

  return updated;
}

export async function deleteFollowUp(worksheetId: string, followUpId: string, userId: string) {
  const existing = await prisma.followUp.findFirst({
    where: { id: followUpId, worksheetId },
  });
  if (!existing) throw AppError.notFound('Suivi introuvable');

  await prisma.followUp.delete({ where: { id: followUpId } });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'FOLLOWUP_DELETED',
    userId,
    oldValue: { followUpId, followUpType: existing.followUpType },
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════
//  SIGNATURE
// ═══════════════════════════════════════════════════════

export async function saveSignature(worksheetId: string, data: SaveSignatureInput, userId: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    select: { id: true },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  const updatePayload: any = {};
  if (data.type === 'tech') {
    updatePayload.techSignature = data.signatureData;
    updatePayload.techSignedAt = new Date();
  } else {
    updatePayload.custSignature = data.signatureData;
    updatePayload.custSignedAt = new Date();
  }

  const updated = await prisma.worksheet.update({
    where: { id: worksheetId },
    data: updatePayload,
    include: WORKSHEET_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'SIGNATURE_SAVED',
    userId,
    newValue: { type: data.type, signedAt: updatePayload.techSignedAt || updatePayload.custSignedAt },
  }).catch(() => {});

  return updated;
}

// ═══════════════════════════════════════════════════════
//  KB INTEGRATION
// ═══════════════════════════════════════════════════════

export async function createKbFromNote(worksheetId: string, noteId: string, userId: string) {
  const ws = await prisma.worksheet.findFirst({
    where: { id: worksheetId, deletedAt: null },
    include: {
      workOrder: { select: { id: true, orderNumber: true, deviceBrand: true, deviceModel: true, reportedIssue: true } },
    },
  });
  if (!ws) throw AppError.notFound('Feuille de travail introuvable');

  const note = await prisma.worksheetNote.findFirst({
    where: { id: noteId, worksheetId },
  });
  if (!note) throw AppError.notFound('Note introuvable');

  // Only DIAGNOSTIC_FINDING or PROCEDURE notes can become KB articles
  if (note.noteType !== 'DIAGNOSTIC_FINDING' && note.noteType !== 'PROCEDURE') {
    throw AppError.badRequest('Seules les notes de type diagnostic ou procedure peuvent etre converties en article KB');
  }

  // Auto-generate title from WO info
  const wo = ws.workOrder;
  const categoryLabel = note.noteType === 'DIAGNOSTIC_FINDING' ? 'Diagnostic' : 'Procedure';
  const title = `${categoryLabel} — ${wo.deviceBrand} ${wo.deviceModel} — ${wo.reportedIssue}`.substring(0, 200);

  // Map note type to KB category
  const kbCategory = note.noteType === 'DIAGNOSTIC_FINDING' ? 'MATERIEL' : 'PROCEDURE';

  // Create the KB article via the KB service
  const article = await kbService.createArticle(
    {
      title,
      content: note.content,
      category: kbCategory,
      tags: [wo.deviceBrand, wo.deviceModel, wo.orderNumber],
      visibility: 'INTERNAL',
    },
    userId,
  );

  // Link the article to the work order
  await kbService.linkArticle(
    {
      articleId: article.id,
      entityType: 'WORKORDER',
      entityId: wo.id,
    },
    userId,
  );

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKSHEET',
    entityId: worksheetId,
    action: 'KB_ARTICLE_CREATED',
    userId,
    newValue: { articleId: article.id, noteId, title },
  }).catch(() => {});

  return article;
}
