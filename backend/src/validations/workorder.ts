import { z } from 'zod';

// ─── Enums ───

const workOrderStatusEnum = z.enum([
  'RECEPTION', 'DIAGNOSTIC', 'ATTENTE_APPROBATION', 'APPROUVE',
  'ATTENTE_PIECES', 'EN_REPARATION', 'VERIFICATION', 'PRET',
  'REMIS', 'REFUSE', 'ABANDONNE', 'ANNULE',
]);

const deviceTypeEnum = z.enum([
  'LAPTOP', 'DESKTOP', 'TABLETTE', 'TELEPHONE',
  'TOUT_EN_UN', 'IMPRIMANTE', 'SERVEUR', 'RESEAU_EQUIP', 'AUTRE',
]);

const dataBackupConsentEnum = z.enum([
  'CLIENT_FAIT', 'ATELIER_FAIT', 'DECLINE', 'NON_APPLICABLE',
]);

const priorityEnum = z.enum(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE']);

const serviceCategoryEnum = z.enum([
  'REPARATION', 'LOGICIEL', 'RESEAU', 'DONNEES',
  'INSTALLATION', 'MAINTENANCE', 'CONSULTATION', 'FORMATION', 'AUTRE',
]);

// ─── Create Work Order (intake at counter) ───

export const createWorkOrderSchema = z.object({
  // Customer
  customerId: z.string().uuid(),
  customerName: z.string().min(1, 'Le nom du client est requis').max(200),
  customerPhone: z.string().min(1, 'Le telephone est requis').max(30),
  customerEmail: z.string().email().optional().or(z.literal('')),

  // Device
  deviceType: deviceTypeEnum.optional(),
  deviceBrand: z.string().min(1, 'La marque est requise').max(100),
  deviceModel: z.string().min(1, 'Le modele est requis').max(200),
  deviceSerial: z.string().max(100).optional().or(z.literal('')),
  deviceColor: z.string().max(50).optional().or(z.literal('')),
  devicePassword: z.string().max(200).optional().or(z.literal('')),
  deviceOs: z.string().max(100).optional().or(z.literal('')),

  // Condition & accessories
  conditionNotes: z.string().max(2000).optional().or(z.literal('')),
  accessories: z.array(z.string()).optional(),
  conditionChecklist: z.record(z.boolean()).optional(),

  // Problem
  reportedIssue: z.string().min(1, 'La description du probleme est requise').max(5000),
  serviceCategory: serviceCategoryEnum.optional(),

  // Financial
  estimatedCost: z.number().positive().optional(),
  maxAuthorizedSpend: z.number().positive().optional(),
  depositAmount: z.number().min(0).optional(),
  diagnosticFee: z.number().min(0).optional(),

  // Consent
  dataBackupConsent: dataBackupConsentEnum.optional(),
  termsAccepted: z.boolean().optional(),

  // Dates
  estimatedPickupDate: z.string().datetime().optional(),

  // Assignment
  technicianId: z.string().uuid().optional(),
  priority: priorityEnum.optional(),

  // Warranty
  warrantyDays: z.number().int().min(0).max(365).optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

// ─── Update Work Order ───

export const updateWorkOrderSchema = z.object({
  // Device
  deviceType: deviceTypeEnum.optional(),
  deviceBrand: z.string().min(1).max(100).optional(),
  deviceModel: z.string().min(1).max(200).optional(),
  deviceSerial: z.string().max(100).optional().or(z.literal('')),
  deviceColor: z.string().max(50).optional().or(z.literal('')),
  devicePassword: z.string().max(200).optional().or(z.literal('')),
  deviceOs: z.string().max(100).optional().or(z.literal('')),

  // Condition
  conditionNotes: z.string().max(2000).optional().or(z.literal('')),
  accessories: z.array(z.string()).optional(),
  conditionChecklist: z.record(z.boolean()).optional(),

  // Problem & service
  reportedIssue: z.string().min(1).max(5000).optional(),
  serviceCategory: serviceCategoryEnum.optional(),
  diagnosticNotes: z.string().max(5000).optional().or(z.literal('')),
  repairNotes: z.string().max(5000).optional().or(z.literal('')),
  partsUsed: z.array(z.object({
    name: z.string(),
    cost: z.number().min(0),
    type: z.enum(['OEM', 'AFTERMARKET', 'REFURBISHED']).optional(),
  })).optional(),

  // Financial
  estimatedCost: z.number().positive().optional().nullable(),
  finalCost: z.number().min(0).optional().nullable(),
  maxAuthorizedSpend: z.number().positive().optional().nullable(),
  depositAmount: z.number().min(0).optional().nullable(),
  diagnosticFee: z.number().min(0).optional().nullable(),

  // Consent
  dataBackupConsent: dataBackupConsentEnum.optional(),
  termsAccepted: z.boolean().optional(),

  // Dates
  estimatedPickupDate: z.string().datetime().optional().nullable(),

  // Assignment
  technicianId: z.string().uuid().optional().nullable(),
  priority: priorityEnum.optional(),

  // Warranty
  warrantyDays: z.number().int().min(0).max(365).optional().nullable(),
});

export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;

// ─── Change Status ───

export const changeWorkOrderStatusSchema = z.object({
  status: workOrderStatusEnum,
  reason: z.string().max(1000).optional(), // Reason for status change (e.g., cancel reason)
});

export type ChangeWorkOrderStatusInput = z.infer<typeof changeWorkOrderStatusSchema>;

// ─── Send Quote (after diagnostic) ───

export const workOrderQuoteSchema = z.object({
  estimatedCost: z.number().positive('Le cout estime doit etre positif'),
  diagnosticNotes: z.string().min(1, 'Les notes de diagnostic sont requises').max(5000),
  estimatedPickupDate: z.string().datetime().optional(),
});

export type WorkOrderQuoteInput = z.infer<typeof workOrderQuoteSchema>;

// ─── Add Note ───

export const addWorkOrderNoteSchema = z.object({
  content: z.string().min(1, 'Le contenu est requis').max(5000),
  isInternal: z.boolean().optional(),
});

export type AddWorkOrderNoteInput = z.infer<typeof addWorkOrderNoteSchema>;

// ─── List Query ───

export const workOrderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  status: workOrderStatusEnum.optional(),
  priority: priorityEnum.optional(),
  technicianId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'intakeDate', 'estimatedPickupDate', 'priority', 'status']).optional().default('intakeDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type WorkOrderListQuery = z.infer<typeof workOrderListQuerySchema>;
