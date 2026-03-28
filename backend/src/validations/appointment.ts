import { z } from 'zod';

const chronologicalRangeMessage = 'La date de fin doit être après la date de début';

function isChronologicalRange(start: string, end: string) {
  return new Date(end).getTime() > new Date(start).getTime();
}

export const createAppointmentSchema = z.object({
  ticketId: z.string().uuid('ID billet invalide'),
  technicianId: z.string().uuid('ID technicien invalide').optional(),
  scheduledStart: z.string().datetime('Date de debut invalide'),
  scheduledEnd: z.string().datetime('Date de fin invalide'),
  travelBuffer: z.number().int().min(0).max(120).default(0),
  notes: z.string().max(2000).optional(),
}).refine((data) => isChronologicalRange(data.scheduledStart, data.scheduledEnd), {
  message: chronologicalRangeMessage,
  path: ['scheduledEnd'],
});

export const updateAppointmentSchema = z.object({
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  travelBuffer: z.number().int().min(0).max(120).optional(),
  notes: z.string().max(2000).optional(),
  technicianId: z.string().uuid().optional(),
}).refine(
  (data) => !data.scheduledStart || !data.scheduledEnd || isChronologicalRange(data.scheduledStart, data.scheduledEnd),
  {
    message: chronologicalRangeMessage,
    path: ['scheduledEnd'],
  }
);

export const appointmentStatusSchema = z.object({
  status: z.enum(['DEMANDE', 'PLANIFIE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE']),
  cancelReason: z.string().max(500).optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  technicianId: z.string().uuid().optional(),
  duration: z.coerce.number().int().min(15).max(480).default(60),
});

export const appointmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  ticketId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Proposal Schemas ───

export const createProposalSchema = z.object({
  ticketId: z.string().uuid('ID billet invalide'),
  proposedStart: z.string().datetime('Date de debut invalide'),
  proposedEnd: z.string().datetime('Date de fin invalide'),
  message: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional(),
}).refine((data) => isChronologicalRange(data.proposedStart, data.proposedEnd), {
  message: chronologicalRangeMessage,
  path: ['proposedEnd'],
});

export const respondProposalSchema = z.object({
  responseMessage: z.string().max(2000).optional(),
});

export const proposalListQuerySchema = z.object({
  ticketId: z.string().uuid('ID billet invalide'),
  status: z.enum(['PROPOSEE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE']).optional(),
});

export const dayScheduleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  technicianId: z.string().uuid().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type RespondProposalInput = z.infer<typeof respondProposalSchema>;
