import { z } from 'zod';

// ─── Enums ───

const worksheetStatusEnum = z.enum([
  'BROUILLON', 'SOUMISE', 'REVISEE', 'APPROUVEE', 'FACTUREE', 'ANNULEE',
]);

const laborTypeEnum = z.enum([
  'DIAGNOSTIC', 'REPARATION', 'INSTALLATION', 'CONSULTATION', 'GARANTIE', 'REPRISE',
]);

const worksheetNoteTypeEnum = z.enum([
  'INTERNE', 'VISIBLE_CLIENT', 'DIAGNOSTIC_FINDING', 'PROCEDURE',
]);

const followUpTypeEnum = z.enum([
  'VERIFICATION_GARANTIE', 'RAPPEL_CLIENT', 'REVERIFICATION', 'ARRIVEE_PIECES', 'SUIVI_DEVIS',
]);

// ─── Create Worksheet ───

export const createWorksheetSchema = z.object({
  workOrderId: z.string().uuid('L\'identifiant du bon de travail doit être un UUID valide'),
});

export type CreateWorksheetInput = z.infer<typeof createWorksheetSchema>;

// ─── Update Worksheet ───

export const updateWorksheetSchema = z.object({
  summary: z.string().max(10000, 'Le résumé ne peut pas dépasser 10 000 caractères').optional(),
});

export type UpdateWorksheetInput = z.infer<typeof updateWorksheetSchema>;

// ─── Change Worksheet Status ───

export const worksheetStatusSchema = z.object({
  status: worksheetStatusEnum,
  reason: z.string().max(1000).optional(),
});

export type WorksheetStatusInput = z.infer<typeof worksheetStatusSchema>;

// ─── List Query ───

export const worksheetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100, 'La limite ne peut pas dépasser 100').optional().default(50),
  status: worksheetStatusEnum.optional(),
  technicianId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type WorksheetListQuery = z.infer<typeof worksheetListQuerySchema>;

// ─── Create Labor Entry ───

export const createLaborEntrySchema = z.object({
  laborType: laborTypeEnum,
  description: z.string().max(2000, 'La description ne peut pas dépasser 2 000 caractères').optional(),
  startTime: z.string().datetime('L\'heure de début doit être une date-heure valide'),
  endTime: z.string().datetime('L\'heure de fin doit être une date-heure valide').optional(),
  breakMinutes: z.number().int().min(0, 'Les minutes de pause ne peuvent pas être négatives').optional().default(0),
  hourlyRate: z.number().positive('Le taux horaire doit être positif'),
});

export type CreateLaborEntryInput = z.infer<typeof createLaborEntrySchema>;

// ─── Update Labor Entry ───

export const updateLaborEntrySchema = z.object({
  laborType: laborTypeEnum.optional(),
  description: z.string().max(2000, 'La description ne peut pas dépasser 2 000 caractères').optional(),
  startTime: z.string().datetime('L\'heure de début doit être une date-heure valide').optional(),
  endTime: z.string().datetime('L\'heure de fin doit être une date-heure valide').optional().nullable(),
  breakMinutes: z.number().int().min(0, 'Les minutes de pause ne peuvent pas être négatives').optional(),
  hourlyRate: z.number().positive('Le taux horaire doit être positif').optional(),
});

export type UpdateLaborEntryInput = z.infer<typeof updateLaborEntrySchema>;

// ─── Create Part ───

export const createPartSchema = z.object({
  partName: z.string().min(1, 'Le nom de la pièce est requis').max(200, 'Le nom de la pièce ne peut pas dépasser 200 caractères'),
  partNumber: z.string().max(100, 'Le numéro de pièce ne peut pas dépasser 100 caractères').optional(),
  supplier: z.string().max(200, 'Le fournisseur ne peut pas dépasser 200 caractères').optional(),
  supplierCost: z.number().min(0, 'Le coût fournisseur ne peut pas être négatif'),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1').optional().default(1),
  unitPrice: z.number().positive('Le prix unitaire doit être positif'),
  warrantyMonths: z.number().int().min(0, 'La garantie ne peut pas être négative').optional(),
  warrantyNotes: z.string().max(1000, 'Les notes de garantie ne peuvent pas dépasser 1 000 caractères').optional(),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;

// ─── Update Part ───

export const updatePartSchema = z.object({
  partName: z.string().min(1, 'Le nom de la pièce est requis').max(200, 'Le nom de la pièce ne peut pas dépasser 200 caractères').optional(),
  partNumber: z.string().max(100, 'Le numéro de pièce ne peut pas dépasser 100 caractères').optional(),
  supplier: z.string().max(200, 'Le fournisseur ne peut pas dépasser 200 caractères').optional(),
  supplierCost: z.number().min(0, 'Le coût fournisseur ne peut pas être négatif').optional(),
  quantity: z.number().int().min(1, 'La quantité doit être au moins 1').optional(),
  unitPrice: z.number().positive('Le prix unitaire doit être positif').optional(),
  warrantyMonths: z.number().int().min(0, 'La garantie ne peut pas être négative').optional(),
  warrantyNotes: z.string().max(1000, 'Les notes de garantie ne peuvent pas dépasser 1 000 caractères').optional(),
});

export type UpdatePartInput = z.infer<typeof updatePartSchema>;

// ─── Create Travel Entry ───

export const createTravelEntrySchema = z.object({
  departureAddress: z.string().max(500, 'L\'adresse de départ ne peut pas dépasser 500 caractères').optional(),
  arrivalAddress: z.string().max(500, 'L\'adresse d\'arrivée ne peut pas dépasser 500 caractères').optional(),
  distanceKm: z.number().positive('La distance doit être positive'),
  travelTimeMinutes: z.number().int().min(0, 'Le temps de déplacement ne peut pas être négatif').optional(),
  ratePerKm: z.number().positive('Le taux par km doit être positif'),
  travelDate: z.string().datetime('La date de déplacement doit être une date-heure valide').optional(),
  notes: z.string().max(2000, 'Les notes ne peuvent pas dépasser 2 000 caractères').optional(),
});

export type CreateTravelEntryInput = z.infer<typeof createTravelEntrySchema>;

// ─── Update Travel Entry ───

export const updateTravelEntrySchema = z.object({
  departureAddress: z.string().max(500, 'L\'adresse de départ ne peut pas dépasser 500 caractères').optional(),
  arrivalAddress: z.string().max(500, 'L\'adresse d\'arrivée ne peut pas dépasser 500 caractères').optional(),
  distanceKm: z.number().positive('La distance doit être positive').optional(),
  travelTimeMinutes: z.number().int().min(0, 'Le temps de déplacement ne peut pas être négatif').optional(),
  ratePerKm: z.number().positive('Le taux par km doit être positif').optional(),
  travelDate: z.string().datetime('La date de déplacement doit être une date-heure valide').optional(),
  notes: z.string().max(2000, 'Les notes ne peuvent pas dépasser 2 000 caractères').optional(),
});

export type UpdateTravelEntryInput = z.infer<typeof updateTravelEntrySchema>;

// ─── Create Worksheet Note ───

export const createWorksheetNoteSchema = z.object({
  noteType: worksheetNoteTypeEnum,
  content: z.string().min(1, 'Le contenu est requis').max(10000, 'Le contenu ne peut pas dépasser 10 000 caractères'),
});

export type CreateWorksheetNoteInput = z.infer<typeof createWorksheetNoteSchema>;

// ─── Create Follow-Up ───

export const createFollowUpSchema = z.object({
  followUpType: followUpTypeEnum,
  scheduledDate: z.string().datetime('La date prévue doit être une date-heure valide'),
  notes: z.string().max(5000, 'Les notes ne peuvent pas dépasser 5 000 caractères').optional(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

// ─── Update Follow-Up ───

export const updateFollowUpSchema = z.object({
  followUpType: followUpTypeEnum.optional(),
  scheduledDate: z.string().datetime('La date prévue doit être une date-heure valide').optional(),
  notes: z.string().max(5000, 'Les notes ne peuvent pas dépasser 5 000 caractères').optional(),
  completed: z.boolean().optional(),
});

export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;

// ─── Save Signature ───

export const saveSignatureSchema = z.object({
  type: z.enum(['tech', 'customer']),
  signatureData: z.string().min(1, 'Les données de signature sont requises')
    .refine(
      (val) => val.startsWith('data:image/'),
      'Les données de signature doivent être un URI data base64 valide (data:image/...)',
    ),
});

export type SaveSignatureInput = z.infer<typeof saveSignatureSchema>;
