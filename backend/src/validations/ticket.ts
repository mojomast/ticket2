import { z } from 'zod';

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().min(1, 'La description est requise').max(5000),
  priority: z.enum(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE']).optional(),
  serviceMode: z.enum(['SUR_ROUTE', 'EN_CUBICULE']).optional(),
  serviceCategory: z.enum([
    'REPARATION', 'LOGICIEL', 'RESEAU', 'DONNEES',
    'INSTALLATION', 'MAINTENANCE', 'CONSULTATION', 'FORMATION', 'AUTRE',
  ]).optional(),
  customerId: z.string().uuid().optional(), // Admin can create for a customer
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  priority: z.enum(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE']).optional(),
  serviceMode: z.enum(['SUR_ROUTE', 'EN_CUBICULE']).optional(),
  serviceCategory: z.enum([
    'REPARATION', 'LOGICIEL', 'RESEAU', 'DONNEES',
    'INSTALLATION', 'MAINTENANCE', 'CONSULTATION', 'FORMATION', 'AUTRE',
  ]).optional(),
});

export const changeStatusSchema = z.object({
  status: z.enum([
    'NOUVELLE', 'EN_ATTENTE_APPROBATION', 'EN_ATTENTE_REPONSE_CLIENT',
    'APPROUVEE', 'PLANIFIEE', 'EN_COURS', 'BLOCAGE',
    'TERMINEE', 'FERMEE', 'ANNULEE',
  ]),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid('ID technicien invalide'),
});

export const sendQuoteSchema = z.object({
  quotedPrice: z.number().positive('Le prix doit etre positif'),
  quoteDescription: z.string().min(1, 'La description du devis est requise').max(2000),
  quoteDuration: z.string().min(1, 'La duree estimee est requise').max(100),
});

export const blockerSchema = z.object({
  reason: z.string().min(1, 'La raison du blocage est requise').max(2000),
});

export const ticketListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Public Service Request (no auth required) ───
export const serviceRequestSchema = z.object({
  customerFirstName: z.string().min(1, 'Le prenom est requis').max(100),
  customerLastName: z.string().min(1, 'Le nom est requis').max(100),
  customerEmail: z.string().email('Courriel invalide').max(255),
  customerPhone: z.string().max(30).optional(),
  title: z.string().min(1, 'Le titre est requis').max(200),
  description: z.string().min(1, 'La description est requise').max(5000),
  priority: z.enum(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE']).default('NORMALE'),
  serviceMode: z.enum(['SUR_ROUTE', 'EN_CUBICULE']).optional(),
  serviceCategory: z.enum([
    'REPARATION', 'LOGICIEL', 'RESEAU', 'DONNEES',
    'INSTALLATION', 'MAINTENANCE', 'CONSULTATION', 'FORMATION', 'AUTRE',
  ]).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
