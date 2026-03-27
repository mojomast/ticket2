export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiError';
  }
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();

  if (json.error) {
    throw new ApiError(json.error.message, json.error.code, res.status);
  }

  return json.data;
}

/** Like request(), but returns the full paginated envelope (data + pagination metadata). */
async function requestPaginated<T>(path: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();

  if (json.error) {
    throw new ApiError(json.error.message, json.error.code, res.status);
  }

  return {
    data: json.data,
    pagination: json.pagination,
  };
}

function qs(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

// ─── Typed API Functions ───

export interface LoginInput {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'CUSTOMER';
  phone?: string | null;
  customerType?: string | null;
  companyName?: string | null;
  address?: string | null;
  isActive: boolean;
  isDemo: boolean;
  permissions?: Record<string, boolean> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  serviceMode: string;
  serviceCategory: string;
  quotedPrice?: number | null;
  quoteDescription?: string | null;
  quoteDuration?: string | null;
  blockerReason?: string | null;
  customerId: string;
  technicianId?: string | null;
  customer: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'phone' | 'customerType' | 'companyName'>;
  technician?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'phone' | 'customerType' | 'companyName'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  ticketId: string;
  technicianId?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  travelBuffer: number;
  status: string;
  notes?: string | null;
  cancelReason?: string | null;
  proposalId?: string | null;
  ticket: { id: string; ticketNumber: string; title: string; status: string };
  technician?: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentProposal {
  id: string;
  ticketId: string;
  proposedById: string;
  proposedStart: string;
  proposedEnd: string;
  message?: string | null;
  status: string;
  responseMessage?: string | null;
  respondedById?: string | null;
  respondedAt?: string | null;
  parentId?: string | null;
  ticket: { id: string; ticketNumber: string; title: string; status: string };
  proposedBy: { id: string; firstName: string; lastName: string; email: string; role: string };
  respondedBy?: { id: string; firstName: string; lastName: string; email: string; role: string } | null;
  parent?: { id: string; proposedStart: string; proposedEnd: string; status: string } | null;
  replies?: Array<{
    id: string;
    proposedStart: string;
    proposedEnd: string;
    message?: string | null;
    status: string;
    proposedBy: { id: string; firstName: string; lastName: string; role: string };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  author: { id: string; firstName: string; lastName: string; role: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  ticketId?: string | null;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DemoPersona {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customerType?: string | null;
  companyName?: string | null;
}

// ─── Work Order Types ───

export interface WorkOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;

  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;

  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial?: string | null;
  deviceColor?: string | null;
  devicePassword?: string | null;
  deviceOs?: string | null;

  conditionNotes?: string | null;
  accessories?: string[];
  conditionChecklist?: Record<string, boolean> | null;

  reportedIssue: string;
  serviceCategory: string;
  diagnosticNotes?: string | null;
  repairNotes?: string | null;
  partsUsed?: Array<{ name: string; cost: number; type?: string }> | null;

  estimatedCost?: number | null;
  finalCost?: number | null;
  maxAuthorizedSpend?: number | null;
  depositAmount?: number | null;
  diagnosticFee?: number | null;

  dataBackupConsent: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string | null;

  intakeDate: string;
  estimatedPickupDate?: string | null;
  completedDate?: string | null;
  pickupDate?: string | null;
  abandonedDate?: string | null;

  intakeById: string;
  technicianId?: string | null;

  warrantyDays?: number | null;
  warrantyStartDate?: string | null;

  customer: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'phone'>;
  technician?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'phone'> | null;
  intakeBy: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
  notes?: WorkOrderNote[];

  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderNote {
  id: string;
  workOrderId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderStats {
  statusCounts: Record<string, number>;
  totalOpen: number;
  overdue: number;
}

// ─── Attachment Types ───

export interface Attachment {
  id: string;
  ticketId: string;
  messageId?: string | null;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploader: Pick<User, 'id' | 'firstName' | 'lastName' | 'role' | 'email'>;
  createdAt: string;
}

// ─── Knowledge Base Types ───

export interface KbArticleAuthor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[] | null;
  visibility: string;
  authorId: string;
  author: KbArticleAuthor;
  links?: KbArticleLink[];
  createdAt: string;
  updatedAt: string;
}

export interface KbArticleLink {
  id: string;
  articleId: string;
  entityType: string;
  entityId: string;
  linkedById: string;
  article?: KbArticle;
  linkedBy?: KbArticleAuthor;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorId: string;
  content: string;
  isPinned: boolean;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

// ─── Worksheet Types ───

export interface WorksheetUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface WorksheetListItem {
  id: string;
  status: string;
  totalLabor: number;
  totalParts: number;
  totalTravel: number;
  grandTotal: number;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  technician: WorksheetUser;
  workOrder?: {
    id: string;
    orderNumber: string;
    customerName: string;
    deviceBrand?: string;
    deviceModel?: string;
  };
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface LaborEntry {
  id: string;
  worksheetId: string;
  laborType: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  breakMinutes: number;
  hourlyRate: number;
  billableHours: number | null;
  lineTotal: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartUsed {
  id: string;
  worksheetId: string;
  partName: string;
  partNumber: string | null;
  supplier: string | null;
  supplierCost: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  warrantyMonths: number | null;
  warrantyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TravelEntry {
  id: string;
  worksheetId: string;
  departureAddress: string | null;
  arrivalAddress: string | null;
  distanceKm: number;
  travelTimeMinutes: number | null;
  ratePerKm: number;
  lineTotal: number;
  travelDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorksheetNote {
  id: string;
  worksheetId: string;
  authorId: string;
  noteType: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: WorksheetUser;
}

export interface FollowUp {
  id: string;
  worksheetId: string;
  followUpType: string;
  scheduledDate: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  completedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleFollowUp {
  id: string;
  followUpType: string;
  scheduledDate: string;
  notes: string | null;
  completed: boolean;
  worksheet: {
    id: string;
    workOrder?: { id: string; orderNumber: string; customerName: string } | null;
    ticket?: { id: string; ticketNumber: string; title: string } | null;
    technician: { id: string; firstName: string; lastName: string };
  };
}

export interface Worksheet extends WorksheetListItem {
  workOrderId?: string | null;
  ticketId?: string | null;
  technicianId: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  billedAt: string | null;
  techSignature: string | null;
  techSignedAt: string | null;
  custSignature: string | null;
  custSignedAt: string | null;
  deletedAt: string | null;
  reviewedBy: WorksheetUser | null;
  approvedBy: WorksheetUser | null;
  workOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string | null;
    reportedIssue?: string;
    deviceType?: string;
    deviceBrand?: string;
    deviceModel?: string;
    deviceSerial?: string | null;
  };
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    customerId: string;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
  };
  laborEntries: LaborEntry[];
  parts: PartUsed[];
  travelEntries: TravelEntry[];
  notes: WorksheetNote[];
  followUps: FollowUp[];
}

export const api = {
  auth: {
    login: (data: LoginInput) =>
      request<User>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    demoLogin: (email: string) =>
      request<User>('/api/auth/demo-login', { method: 'POST', body: JSON.stringify({ email }) }),
    logout: () =>
      request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<User>('/api/auth/me'),
  },

  tickets: {
    list: (params?: Record<string, unknown>) =>
      request<Ticket[]>(`/api/tickets${params ? `?${qs(params)}` : ''}`),
    listPaginated: (params?: Record<string, unknown>) =>
      requestPaginated<Ticket>(`/api/tickets${params ? `?${qs(params)}` : ''}`),
    get: (id: string) => request<Ticket>(`/api/tickets/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Ticket>('/api/tickets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Ticket>(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    changeStatus: (id: string, status: string) =>
      request<Ticket>(`/api/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    assign: (id: string, technicianId: string) =>
      request<Ticket>(`/api/tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ technicianId }) }),
    sendQuote: (id: string, data: { quotedPrice: number; quoteDescription: string; quoteDuration: string }) =>
      request<Ticket>(`/api/tickets/${id}/quote`, { method: 'POST', body: JSON.stringify(data) }),
    approveQuote: (id: string) =>
      request<Ticket>(`/api/tickets/${id}/approve-quote`, { method: 'POST' }),
    declineQuote: (id: string) =>
      request<Ticket>(`/api/tickets/${id}/decline-quote`, { method: 'POST' }),
    addBlocker: (id: string, reason: string) =>
      request<Ticket>(`/api/tickets/${id}/blocker`, { method: 'POST', body: JSON.stringify({ reason }) }),
    removeBlocker: (id: string) =>
      request<Ticket>(`/api/tickets/${id}/blocker`, { method: 'DELETE' }),
    accept: (id: string) =>
      request<Ticket>(`/api/tickets/${id}/accept`, { method: 'POST' }),
  },

  messages: {
    list: (ticketId: string, params?: Record<string, unknown>) =>
      request<Message[]>(`/api/tickets/${ticketId}/messages${params ? `?${qs(params)}` : ''}`),
    create: (ticketId: string, data: { content: string; isInternal?: boolean }) =>
      request<Message>(`/api/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, content: string) =>
      request<Message>(`/api/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
    delete: (id: string) =>
      request<void>(`/api/messages/${id}`, { method: 'DELETE' }),
  },

  appointments: {
    list: (params?: Record<string, unknown>) =>
      request<Appointment[]>(`/api/appointments${params ? `?${qs(params)}` : ''}`),
    get: (id: string) => request<Appointment>(`/api/appointments/${id}`),
    create: (data: Record<string, unknown>) =>
      request<Appointment>('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Appointment>(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      request<Appointment>(`/api/appointments/${id}`, { method: 'DELETE' }),
    changeStatus: (id: string, status: string, cancelReason?: string) =>
      request<Appointment>(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancelReason }),
      }),
    availability: (date: string, technicianId?: string, duration?: number) =>
      request<Array<{ start: string; end: string; available: boolean }>>(
        `/api/appointments/availability?${qs({ date, technicianId, duration })}`
      ),
    daySchedule: (date: string, technicianId?: string) =>
      request<Appointment[]>(
        `/api/appointments/day-schedule?${qs({ date, technicianId })}`
      ),
    proposals: {
      list: (ticketId: string, status?: string) =>
        request<AppointmentProposal[]>(
          `/api/appointments/proposals?${qs({ ticketId, status })}`
        ),
      create: (data: { ticketId: string; proposedStart: string; proposedEnd: string; message?: string; parentId?: string }) =>
        request<AppointmentProposal>('/api/appointments/proposals', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      accept: (id: string, responseMessage?: string) =>
        request<{ proposal: AppointmentProposal; appointment: Appointment }>(
          `/api/appointments/proposals/${id}/accept`,
          { method: 'PATCH', body: JSON.stringify({ responseMessage }) }
        ),
      reject: (id: string, responseMessage?: string) =>
        request<AppointmentProposal>(
          `/api/appointments/proposals/${id}/reject`,
          { method: 'PATCH', body: JSON.stringify({ responseMessage }) }
        ),
      cancel: (id: string) =>
        request<AppointmentProposal>(`/api/appointments/proposals/${id}`, {
          method: 'DELETE',
        }),
    },
  },

  notifications: {
    list: (params?: Record<string, unknown>) =>
      request<Notification[]>(`/api/notifications${params ? `?${qs(params)}` : ''}`),
    markRead: (id: string) =>
      request<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request<void>('/api/notifications/read-all', { method: 'POST' }),
  },

  admin: {
    users: {
      list: (params?: Record<string, unknown>) =>
        request<User[]>(`/api/admin/users${params ? `?${qs(params)}` : ''}`),
      listPaginated: (params?: Record<string, unknown>) =>
        requestPaginated<User>(`/api/admin/users${params ? `?${qs(params)}` : ''}`),
      get: (id: string) => request<User>(`/api/admin/users/${id}`),
      create: (data: Record<string, unknown>) =>
        request<User>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<User>(`/api/admin/users/${id}`, { method: 'DELETE' }),
      updatePermissions: (id: string, permissions: Record<string, boolean>) =>
        request<User>(`/api/admin/users/${id}/permissions`, { method: 'PATCH', body: JSON.stringify(permissions) }),
    },
    config: {
      list: () => request<Array<{ key: string; value: unknown }>>('/api/admin/config'),
      get: (key: string) => request<{ key: string; value: unknown }>(`/api/admin/config/${key}`),
      set: (key: string, value: unknown) =>
        request<{ key: string; value: unknown }>(`/api/admin/config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
      updateBranding: (data: Record<string, unknown>) =>
        request<unknown>('/api/admin/config/branding', { method: 'PUT', body: JSON.stringify(data) }),
    },
    backups: {
      list: (params?: Record<string, unknown>) =>
        request<unknown[]>(`/api/admin/backups${params ? `?${qs(params)}` : ''}`),
      create: (type?: string, tables?: string[]) =>
        request<unknown>('/api/admin/backups', { method: 'POST', body: JSON.stringify({ type, tables }) }),
      get: (id: string) => request<unknown>(`/api/admin/backups/${id}`),
      delete: (id: string) =>
        request<void>(`/api/admin/backups/${id}`, { method: 'DELETE' }),
      download: (id: string) => `/api/admin/backups/${id}/download`,
      restore: (id: string) =>
        request<unknown>(`/api/admin/backups/${id}/restore`, { method: 'POST' }),
    },
  },

  technicians: {
    list: () => request<User[]>('/api/technicians'),
  },

  users: {
    profile: () => request<User>('/api/users/profile'),
    updateProfile: (data: Record<string, unknown>) =>
      request<User>('/api/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      request<{ message: string }>('/api/users/profile/password', { method: 'POST', body: JSON.stringify(data) }),
  },

  demo: {
    personas: () => request<DemoPersona[]>('/api/demo/personas'),
    reset: () => request<{ message: string }>('/api/demo/reset', { method: 'POST' }),
  },

  serviceRequest: {
    create: (data: any) => request<Ticket>('/api/service-request', { method: 'POST', body: JSON.stringify(data) }),
  },

  attachments: {
    upload: async (ticketId: string, file: File): Promise<Attachment> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new ApiError(
          json.error?.message || 'Erreur lors du téléversement',
          json.error?.code || 'UPLOAD_ERROR',
          res.status,
        );
      }
      return json.data;
    },
    list: (ticketId: string) =>
      request<Attachment[]>(`/api/tickets/${ticketId}/attachments`),
    delete: (id: string) =>
      request<{ message: string }>(`/api/attachments/${id}`, { method: 'DELETE' }),
    downloadUrl: (id: string) => `${BASE_URL}/api/attachments/${id}/download`,
    viewUrl: (id: string) => `${BASE_URL}/api/attachments/${id}/view`,
  },

  config: {
    branding: () => request<Record<string, unknown>>('/api/config/branding'),
    get: (key: string) => request<{ key: string; value: unknown }>(`/api/config/${key}`),
  },

  workorders: {
    list: (params?: Record<string, unknown>) =>
      request<WorkOrder[]>(`/api/workorders${params ? `?${qs(params)}` : ''}`),
    get: (id: string) => request<WorkOrder>(`/api/workorders/${id}`),
    create: (data: Record<string, unknown>) =>
      request<WorkOrder>('/api/workorders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<WorkOrder>(`/api/workorders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<WorkOrder>(`/api/workorders/${id}`, { method: 'DELETE' }),
    changeStatus: (id: string, status: string, reason?: string) =>
      request<WorkOrder>(`/api/workorders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    sendQuote: (id: string, data: { estimatedCost: number; diagnosticNotes: string; estimatedPickupDate?: string }) =>
      request<WorkOrder>(`/api/workorders/${id}/quote`, { method: 'POST', body: JSON.stringify(data) }),
    approveQuote: (id: string) =>
      request<WorkOrder>(`/api/workorders/${id}/approve-quote`, { method: 'POST' }),
    declineQuote: (id: string) =>
      request<WorkOrder>(`/api/workorders/${id}/decline-quote`, { method: 'POST' }),
    stats: () => request<WorkOrderStats>('/api/workorders/stats'),
    notes: {
      list: (workOrderId: string) =>
        request<WorkOrderNote[]>(`/api/workorders/${workOrderId}/notes`),
      create: (workOrderId: string, data: { content: string; isInternal?: boolean }) =>
        request<WorkOrderNote>(`/api/workorders/${workOrderId}/notes`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
  },

  kb: {
    articles: {
      list: (params?: Record<string, unknown>) =>
        requestPaginated<KbArticle>(`/api/kb/articles${params ? `?${qs(params)}` : ''}`),
      get: (id: string) => request<KbArticle>(`/api/kb/articles/${id}`),
      getBySlug: (slug: string) => request<KbArticle>(`/api/kb/articles/by-slug/${slug}`),
      create: (data: { title: string; content: string; category?: string; tags?: string[]; visibility?: string }) =>
        request<KbArticle>('/api/kb/articles', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { title?: string; content?: string; category?: string; tags?: string[]; visibility?: string }) =>
        request<KbArticle>(`/api/kb/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<{ success: boolean }>(`/api/kb/articles/${id}`, { method: 'DELETE' }),
      links: (id: string, params?: Record<string, unknown>) =>
        requestPaginated<KbArticleLink>(`/api/kb/articles/${id}/links${params ? `?${qs(params)}` : ''}`),
    },
    links: {
      forEntity: (entityType: string, entityId: string) =>
        request<KbArticleLink[]>(`/api/kb/links?${qs({ entityType, entityId })}`),
      create: (data: { articleId: string; entityType: string; entityId: string }) =>
        request<KbArticleLink>('/api/kb/links', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<{ success: boolean }>(`/api/kb/links/${id}`, { method: 'DELETE' }),
    },
  },

  customerNotes: {
    list: (params: { customerId: string; page?: number; limit?: number }) =>
      requestPaginated<CustomerNote>(`/api/customer-notes?${qs(params)}`),
    create: (data: { customerId: string; content: string; isPinned?: boolean }) =>
      request<CustomerNote>('/api/customer-notes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { content?: string; isPinned?: boolean }) =>
      request<CustomerNote>(`/api/customer-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    togglePin: (id: string) =>
      request<CustomerNote>(`/api/customer-notes/${id}/toggle-pin`, { method: 'PATCH' }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/customer-notes/${id}`, { method: 'DELETE' }),
  },

  worksheets: {
    list: (params?: Record<string, unknown>) =>
      requestPaginated<WorksheetListItem>(`/api/worksheets${params ? `?${qs(params)}` : ''}`),
    get: (id: string) => request<Worksheet>(`/api/worksheets/${id}`),
    create: (data: { workOrderId?: string; ticketId?: string }) =>
      request<Worksheet>('/api/worksheets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { summary?: string }) =>
      request<Worksheet>(`/api/worksheets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/worksheets/${id}`, { method: 'DELETE' }),
    changeStatus: (id: string, status: string, reason?: string) =>
      request<Worksheet>(`/api/worksheets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    pdfUrl: (id: string) => `${BASE_URL}/api/worksheets/${id}/pdf`,

    // Labor entries
    labor: {
      create: (worksheetId: string, data: Record<string, unknown>) =>
        request<LaborEntry>(`/api/worksheets/${worksheetId}/labor`, { method: 'POST', body: JSON.stringify(data) }),
      update: (worksheetId: string, entryId: string, data: Record<string, unknown>) =>
        request<LaborEntry>(`/api/worksheets/${worksheetId}/labor/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (worksheetId: string, entryId: string) =>
        request<{ success: boolean }>(`/api/worksheets/${worksheetId}/labor/${entryId}`, { method: 'DELETE' }),
      stopTimer: (worksheetId: string, entryId: string) =>
        request<LaborEntry>(`/api/worksheets/${worksheetId}/labor/${entryId}/stop`, { method: 'POST' }),
    },

    // Parts
    parts: {
      create: (worksheetId: string, data: Record<string, unknown>) =>
        request<PartUsed>(`/api/worksheets/${worksheetId}/parts`, { method: 'POST', body: JSON.stringify(data) }),
      update: (worksheetId: string, partId: string, data: Record<string, unknown>) =>
        request<PartUsed>(`/api/worksheets/${worksheetId}/parts/${partId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (worksheetId: string, partId: string) =>
        request<{ success: boolean }>(`/api/worksheets/${worksheetId}/parts/${partId}`, { method: 'DELETE' }),
    },

    // Travel entries
    travel: {
      create: (worksheetId: string, data: Record<string, unknown>) =>
        request<TravelEntry>(`/api/worksheets/${worksheetId}/travel`, { method: 'POST', body: JSON.stringify(data) }),
      update: (worksheetId: string, entryId: string, data: Record<string, unknown>) =>
        request<TravelEntry>(`/api/worksheets/${worksheetId}/travel/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (worksheetId: string, entryId: string) =>
        request<{ success: boolean }>(`/api/worksheets/${worksheetId}/travel/${entryId}`, { method: 'DELETE' }),
    },

    // Notes
    notes: {
      create: (worksheetId: string, data: { noteType: string; content: string }) =>
        request<WorksheetNote>(`/api/worksheets/${worksheetId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
      delete: (worksheetId: string, noteId: string) =>
        request<{ success: boolean }>(`/api/worksheets/${worksheetId}/notes/${noteId}`, { method: 'DELETE' }),
      toKb: (worksheetId: string, noteId: string) =>
        request<KbArticle>(`/api/worksheets/${worksheetId}/notes/${noteId}/to-kb`, { method: 'POST' }),
    },

    // Follow-ups
    followUps: {
      create: (worksheetId: string, data: Record<string, unknown>) =>
        request<FollowUp>(`/api/worksheets/${worksheetId}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),
      update: (worksheetId: string, followUpId: string, data: Record<string, unknown>) =>
        request<FollowUp>(`/api/worksheets/${worksheetId}/follow-ups/${followUpId}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (worksheetId: string, followUpId: string) =>
        request<{ success: boolean }>(`/api/worksheets/${worksheetId}/follow-ups/${followUpId}`, { method: 'DELETE' }),
      schedule: (params: { from: string; to: string }) =>
        request<ScheduleFollowUp[]>(`/api/worksheets/follow-ups/schedule?${qs(params)}`),
    },

    // Signatures
    saveSignature: (worksheetId: string, type: 'tech' | 'customer', signatureData: string) =>
      request<Worksheet>(`/api/worksheets/${worksheetId}/signature`, {
        method: 'POST',
        body: JSON.stringify({ type, signatureData }),
      }),
  },
};
