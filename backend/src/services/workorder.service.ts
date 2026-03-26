import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { WO_ALLOWED_TRANSITIONS } from '../types/index.js';
import type { CreateWorkOrderInput, UpdateWorkOrderInput, WorkOrderQuoteInput, AddWorkOrderNoteInput, WorkOrderListQuery } from '../validations/workorder.js';
import type { UserRole, WorkOrderStatus } from '@prisma/client';
import { getPagination, buildPaginatedResponse } from '../types/index.js';
import * as notificationService from './notification.service.js';
import { createAuditLog } from './audit.service.js';

// ─── Prisma Includes ───

const USER_SELECT = {
  id: true, firstName: true, lastName: true, email: true, role: true, phone: true,
};

const WORKORDER_LIST_INCLUDE = {
  customer: { select: USER_SELECT },
  technician: { select: USER_SELECT },
  intakeBy: { select: USER_SELECT },
};

const WORKORDER_DETAIL_INCLUDE = {
  customer: { select: { ...USER_SELECT, customerType: true, companyName: true, address: true } },
  technician: { select: USER_SELECT },
  intakeBy: { select: USER_SELECT },
  notes: {
    where: { workOrder: { deletedAt: null } },
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: USER_SELECT } },
  },
};

// ─── Order Number Generation (with retry loop to handle race conditions) ───

async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `BDT-${yy}${mm}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const latest = await prisma.workOrder.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });

    const seq = latest
      ? parseInt(latest.orderNumber.slice(-3), 10) + 1
      : 1;
    const orderNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    // Check if number already exists (handles race condition)
    const exists = await prisma.workOrder.findUnique({ where: { orderNumber } });
    if (!exists) return orderNumber;
  }

  // Fallback: use timestamp-based number
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}

// ─── CRUD ───

export async function createWorkOrder(data: CreateWorkOrderInput, userId: string, role: UserRole) {
  if (role === 'CUSTOMER') {
    throw AppError.forbidden('Seuls les administrateurs et techniciens peuvent creer des bons de travail');
  }

  // Verify customer exists
  const customer = await prisma.user.findFirst({
    where: { id: data.customerId, role: 'CUSTOMER', deletedAt: null },
  });
  if (!customer) throw AppError.notFound('Client introuvable');

  const orderNumber = await generateOrderNumber();

  const workOrder = await prisma.workOrder.create({
    data: {
      orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || null,
      deviceType: data.deviceType || 'LAPTOP',
      deviceBrand: data.deviceBrand,
      deviceModel: data.deviceModel,
      deviceSerial: data.deviceSerial || null,
      deviceColor: data.deviceColor || null,
      devicePassword: data.devicePassword || null,
      deviceOs: data.deviceOs || null,
      conditionNotes: data.conditionNotes || null,
      accessories: data.accessories || [],
      conditionChecklist: data.conditionChecklist || Prisma.JsonNull,
      reportedIssue: data.reportedIssue,
      serviceCategory: data.serviceCategory || 'REPARATION',
      estimatedCost: data.estimatedCost || null,
      maxAuthorizedSpend: data.maxAuthorizedSpend || null,
      depositAmount: data.depositAmount || null,
      diagnosticFee: data.diagnosticFee || null,
      dataBackupConsent: data.dataBackupConsent || 'NON_APPLICABLE',
      termsAccepted: data.termsAccepted || false,
      termsAcceptedAt: data.termsAccepted ? new Date() : null,
      estimatedPickupDate: data.estimatedPickupDate ? new Date(data.estimatedPickupDate) : null,
      intakeById: userId,
      technicianId: data.technicianId || null,
      priority: data.priority || 'NORMALE',
      warrantyDays: data.warrantyDays ?? null,
    },
    include: WORKORDER_DETAIL_INCLUDE,
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKORDER',
    entityId: workOrder.id,
    action: 'CREATED',
    userId,
    newValue: { orderNumber, customerName: data.customerName, reportedIssue: data.reportedIssue },
  }).catch(() => {});

  return workOrder;
}

export async function getWorkOrders(query: WorkOrderListQuery, userId: string, role: UserRole) {
  const { page, limit, skip } = getPagination({ page: query.page, limit: query.limit });

  const where: any = { deletedAt: null };
  const conditions: any[] = [];

  // Role-based filtering
  if (role === 'CUSTOMER') {
    where.customerId = userId;
  } else if (role === 'TECHNICIAN') {
    // Techs see work orders assigned to them, or unassigned ones (in RECEPTION)
    conditions.push({
      OR: [{ technicianId: userId }, { technicianId: null }],
    });
  }
  // Admin sees all

  // Filters
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.technicianId) where.technicianId = query.technicianId;
  if (query.search) {
    conditions.push({
      OR: [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { deviceBrand: { contains: query.search, mode: 'insensitive' } },
        { deviceModel: { contains: query.search, mode: 'insensitive' } },
        { deviceSerial: { contains: query.search, mode: 'insensitive' } },
        { reportedIssue: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  // Sorting
  const orderBy: any = {};
  if (query.sortBy === 'priority') {
    // Custom priority sort: URGENTE > HAUTE > NORMALE > BASSE
    orderBy.priority = query.sortOrder;
  } else {
    orderBy[query.sortBy || 'intakeDate'] = query.sortOrder || 'desc';
  }

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: WORKORDER_LIST_INCLUDE,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.workOrder.count({ where }),
  ]);

  return buildPaginatedResponse(workOrders, total, page, limit);
}

export async function getWorkOrderById(id: string, userId: string, role: UserRole) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, deletedAt: null },
    include: WORKORDER_DETAIL_INCLUDE,
  });

  if (!wo) throw AppError.notFound('Bon de travail introuvable');

  // Access control
  if (role === 'CUSTOMER' && wo.customerId !== userId) {
    throw AppError.forbidden();
  }

  return wo;
}

export async function updateWorkOrder(id: string, data: UpdateWorkOrderInput, userId: string, role: UserRole) {
  const wo = await getWorkOrderById(id, userId, role);

  // Customers can't update work orders
  if (role === 'CUSTOMER') {
    throw AppError.forbidden('Seuls les administrateurs et techniciens peuvent modifier les bons de travail');
  }

  const updateData: any = {};

  // Copy over simple fields
  const simpleFields = [
    'deviceType', 'deviceBrand', 'deviceModel', 'deviceSerial', 'deviceColor',
    'devicePassword', 'deviceOs', 'conditionNotes', 'accessories', 'conditionChecklist',
    'reportedIssue', 'serviceCategory', 'diagnosticNotes', 'repairNotes', 'partsUsed',
    'estimatedCost', 'finalCost', 'maxAuthorizedSpend', 'depositAmount', 'diagnosticFee',
    'dataBackupConsent', 'termsAccepted', 'priority', 'warrantyDays',
  ];

  for (const field of simpleFields) {
    if ((data as any)[field] !== undefined) {
      updateData[field] = (data as any)[field];
    }
  }

  if (data.termsAccepted && !wo.termsAcceptedAt) {
    updateData.termsAcceptedAt = new Date();
  }

  if (data.estimatedPickupDate !== undefined) {
    updateData.estimatedPickupDate = data.estimatedPickupDate ? new Date(data.estimatedPickupDate) : null;
  }

  if (data.technicianId !== undefined) {
    updateData.technicianId = data.technicianId;
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: updateData,
    include: WORKORDER_DETAIL_INCLUDE,
  });

  return updated;
}

// ─── Status Management ───

export async function changeStatus(id: string, newStatus: WorkOrderStatus, reason: string | undefined, userId: string, role: UserRole) {
  const wo = await getWorkOrderById(id, userId, role);

  // Validate transition
  const transitions = WO_ALLOWED_TRANSITIONS[wo.status as WorkOrderStatus] || [];
  const allowed = transitions.find(t => t.to === newStatus);

  if (!allowed) {
    throw AppError.badRequest(
      `Transition de ${wo.status} vers ${newStatus} non autorisee. ` +
      `Transitions possibles: ${transitions.map(t => t.to).join(', ') || 'aucune'}`
    );
  }

  if (!allowed.roles.includes(role)) {
    throw AppError.forbidden(`Votre role (${role}) ne permet pas cette transition`);
  }

  const updateData: any = { status: newStatus };

  // Auto-set dates based on status
  if (newStatus === 'PRET' || newStatus === 'VERIFICATION') {
    if (!wo.completedDate) updateData.completedDate = new Date();
  }
  if (newStatus === 'REMIS') {
    updateData.pickupDate = new Date();
    // Start warranty on pickup
    if (wo.warrantyDays && wo.warrantyDays > 0) {
      updateData.warrantyStartDate = new Date();
    }
  }
  if (newStatus === 'ABANDONNE') {
    updateData.abandonedDate = new Date();
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: updateData,
    include: WORKORDER_DETAIL_INCLUDE,
  });

  // Add an auto-note for the status change
  await prisma.workOrderNote.create({
    data: {
      workOrderId: id,
      authorId: userId,
      content: `Statut change: ${wo.status} → ${newStatus}${reason ? ` — ${reason}` : ''}`,
      isInternal: true,
    },
  });

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKORDER',
    entityId: id,
    action: 'STATUS_CHANGED',
    userId,
    oldValue: { status: wo.status },
    newValue: { status: newStatus, reason },
  }).catch(() => {});

  // Fire-and-forget: notify relevant parties of status change
  const woRecipients: string[] = [];
  if (wo.customerId) woRecipients.push(wo.customerId);
  if (wo.technicianId && wo.technicianId !== userId) woRecipients.push(wo.technicianId);
  if (woRecipients.length > 0) {
    notificationService.notifyStatusChanged(
      id, updated.orderNumber, newStatus, woRecipients
    ).catch(() => {});
  }

  return updated;
}

// ─── Quote (after diagnostic) ───

export async function sendQuote(id: string, data: WorkOrderQuoteInput, userId: string, role: UserRole) {
  if (role === 'CUSTOMER') {
    throw AppError.forbidden('Seuls les administrateurs et techniciens peuvent envoyer un devis');
  }

  const wo = await getWorkOrderById(id, userId, role);

  if (wo.status !== 'DIAGNOSTIC') {
    throw AppError.badRequest('Le devis ne peut etre envoye qu\'au statut DIAGNOSTIC');
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      estimatedCost: data.estimatedCost,
      diagnosticNotes: data.diagnosticNotes,
      estimatedPickupDate: data.estimatedPickupDate ? new Date(data.estimatedPickupDate) : wo.estimatedPickupDate,
      status: 'ATTENTE_APPROBATION',
    },
    include: WORKORDER_DETAIL_INCLUDE,
  });

  // Add note
  await prisma.workOrderNote.create({
    data: {
      workOrderId: id,
      authorId: userId,
      content: `Devis envoye: ${data.estimatedCost}$ — ${data.diagnosticNotes}`,
      isInternal: false,
    },
  });

  // Fire-and-forget: notify customer that a quote was sent
  if (wo.customerId) {
    notificationService.notifyQuoteSent(id, updated.orderNumber, wo.customerId).catch(() => {});
  }

  // Fire-and-forget audit log
  createAuditLog({
    entityType: 'WORKORDER',
    entityId: id,
    action: 'QUOTE_SENT',
    userId,
    newValue: { estimatedCost: data.estimatedCost, diagnosticNotes: data.diagnosticNotes },
  }).catch(() => {});

  return updated;
}

// ─── Approve / Decline Quote ───

export async function approveQuote(id: string, userId: string, role: UserRole) {
  const wo = await getWorkOrderById(id, userId, role);

  if (wo.status !== 'ATTENTE_APPROBATION') {
    throw AppError.badRequest('Le bon de travail n\'est pas en attente d\'approbation');
  }

  // Customers can only approve their own
  if (role === 'CUSTOMER' && wo.customerId !== userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: 'APPROUVE' },
    include: WORKORDER_DETAIL_INCLUDE,
  });

  await prisma.workOrderNote.create({
    data: {
      workOrderId: id,
      authorId: userId,
      content: 'Devis approuve par le client',
      isInternal: false,
    },
  });

  return updated;
}

export async function declineQuote(id: string, userId: string, role: UserRole) {
  const wo = await getWorkOrderById(id, userId, role);

  if (wo.status !== 'ATTENTE_APPROBATION') {
    throw AppError.badRequest('Le bon de travail n\'est pas en attente d\'approbation');
  }

  if (role === 'CUSTOMER' && wo.customerId !== userId) {
    throw AppError.forbidden();
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: 'REFUSE' },
    include: WORKORDER_DETAIL_INCLUDE,
  });

  await prisma.workOrderNote.create({
    data: {
      workOrderId: id,
      authorId: userId,
      content: 'Devis refuse par le client',
      isInternal: false,
    },
  });

  return updated;
}

// ─── Notes ───

export async function addNote(id: string, data: AddWorkOrderNoteInput, userId: string, role: UserRole) {
  await getWorkOrderById(id, userId, role);

  const note = await prisma.workOrderNote.create({
    data: {
      workOrderId: id,
      authorId: userId,
      content: data.content,
      isInternal: data.isInternal !== undefined ? data.isInternal : true,
    },
    include: { author: { select: USER_SELECT } },
  });

  return note;
}

export async function getNotes(id: string, userId: string, role: UserRole) {
  await getWorkOrderById(id, userId, role);

  const where: any = { workOrderId: id };

  // Customers only see non-internal notes
  if (role === 'CUSTOMER') {
    where.isInternal = false;
  }

  return prisma.workOrderNote.findMany({
    where,
    include: { author: { select: USER_SELECT } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Dashboard Stats ───

export async function getDashboardStats(userId: string, role: UserRole) {
  const baseWhere: any = { deletedAt: null };

  if (role === 'CUSTOMER') {
    baseWhere.customerId = userId;
  } else if (role === 'TECHNICIAN') {
    baseWhere.OR = [
      { technicianId: userId },
      { technicianId: null },
    ];
  }

  const statuses: WorkOrderStatus[] = [
    'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
    'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET',
  ];

  const counts = await Promise.all(
    statuses.map(status =>
      prisma.workOrder.count({ where: { ...baseWhere, status } })
    )
  );

  const statusCounts: Record<string, number> = {};
  statuses.forEach((s, i) => { statusCounts[s] = counts[i]; });

  // Total open (non-terminal)
  const totalOpen = counts.reduce((sum, c) => sum + c, 0);

  // Overdue: estimatedPickupDate < now AND not in terminal status
  const overdue = await prisma.workOrder.count({
    where: {
      ...baseWhere,
      status: { in: statuses },
      estimatedPickupDate: { lt: new Date() },
    },
  });

  return {
    statusCounts,
    totalOpen,
    overdue,
  };
}

// ─── Soft Delete ───

export async function deleteWorkOrder(id: string, userId: string, role: UserRole) {
  if (role !== 'ADMIN') {
    throw AppError.forbidden('Seul un administrateur peut supprimer un bon de travail');
  }

  const wo = await getWorkOrderById(id, userId, role);

  return prisma.workOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: WORKORDER_DETAIL_INCLUDE,
  });
}
