import type { UserRole, TicketStatus, Priority, ServiceMode, ServiceCategory, CustomerType, AppointmentStatus, NotificationType, WorkOrderStatus, DeviceType, DataBackupConsent } from '@prisma/client';

// Re-export Prisma enums for convenience
export type { UserRole, TicketStatus, Priority, ServiceMode, ServiceCategory, CustomerType, AppointmentStatus, NotificationType, WorkOrderStatus, DeviceType, DataBackupConsent };

// ─── Technician Permissions ───

export interface TechnicianPermissions {
  can_accept_tickets: boolean;
  can_close_tickets: boolean;
  can_send_quotes: boolean;
  can_cancel_appointments: boolean;
  can_view_all_tickets: boolean;
}

export const DEFAULT_TECH_PERMISSIONS: TechnicianPermissions = {
  can_accept_tickets: false,
  can_close_tickets: false,
  can_send_quotes: true,
  can_cancel_appointments: false,
  can_view_all_tickets: false,
};

export function parseTechPermissions(raw: unknown): TechnicianPermissions {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TECH_PERMISSIONS };
  return { ...DEFAULT_TECH_PERMISSIONS, ...(raw as Partial<TechnicianPermissions>) };
}

// ─── Ticket Status State Machine ───

export const ALLOWED_TRANSITIONS: Record<TicketStatus, Array<{ to: TicketStatus; roles: UserRole[] }>> = {
  NOUVELLE: [
    { to: 'EN_ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'PLANIFIEE', roles: ['ADMIN'] },
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN', 'CUSTOMER'] },
  ],
  EN_ATTENTE_APPROBATION: [
    { to: 'APPROUVEE', roles: ['ADMIN', 'CUSTOMER'] },
    { to: 'EN_ATTENTE_REPONSE_CLIENT', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  EN_ATTENTE_REPONSE_CLIENT: [
    { to: 'EN_ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  APPROUVEE: [
    { to: 'PLANIFIEE', roles: ['ADMIN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  PLANIFIEE: [
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  EN_COURS: [
    { to: 'BLOCAGE', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'TERMINEE', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  BLOCAGE: [
    { to: 'EN_COURS', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULEE', roles: ['ADMIN'] },
  ],
  TERMINEE: [
    { to: 'FERMEE', roles: ['ADMIN'] },
  ],
  FERMEE: [],
  ANNULEE: [],
};

// ─── Work Order Status State Machine ───
// Terminal statuses: REMIS, REFUSE, ABANDONNE, ANNULE

export const WO_ALLOWED_TRANSITIONS: Record<WorkOrderStatus, Array<{ to: WorkOrderStatus; roles: UserRole[] }>> = {
  RECEPTION: [
    { to: 'DIAGNOSTIC', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  DIAGNOSTIC: [
    { to: 'ATTENTE_APPROBATION', roles: ['ADMIN', 'TECHNICIAN'] }, // Send quote to customer
    { to: 'APPROUVE', roles: ['ADMIN', 'TECHNICIAN'] },           // Minor repair, skip quote
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },      // Simple fix, start immediately
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  ATTENTE_APPROBATION: [
    { to: 'APPROUVE', roles: ['ADMIN', 'CUSTOMER'] },   // Customer approves
    { to: 'REFUSE', roles: ['ADMIN', 'CUSTOMER'] },     // Customer declines
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  APPROUVE: [
    { to: 'ATTENTE_PIECES', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  ATTENTE_PIECES: [
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] }, // Parts arrived
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  EN_REPARATION: [
    { to: 'ATTENTE_PIECES', roles: ['ADMIN', 'TECHNICIAN'] }, // Need more parts
    { to: 'VERIFICATION', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'PRET', roles: ['ADMIN', 'TECHNICIAN'] },           // Skip QC for simple repairs
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  VERIFICATION: [
    { to: 'EN_REPARATION', roles: ['ADMIN', 'TECHNICIAN'] }, // Failed QC, back to repair
    { to: 'PRET', roles: ['ADMIN', 'TECHNICIAN'] },
    { to: 'ANNULE', roles: ['ADMIN'] },
  ],
  PRET: [
    { to: 'REMIS', roles: ['ADMIN', 'TECHNICIAN'] },          // Customer picked up
    { to: 'ABANDONNE', roles: ['ADMIN'] },                     // Customer never picks up
  ],
  REMIS: [],       // Terminal
  REFUSE: [],      // Terminal
  ABANDONNE: [],   // Terminal
  ANNULE: [],      // Terminal
};

// ─── API Response Types ───

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string; code: string } | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Pagination Helpers ───

export interface PaginationParams {
  page: number;
  limit: number;
}

export function getPagination(params: PaginationParams) {
  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  return {
    data,
    error: null,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
